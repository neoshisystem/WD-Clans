'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { RawExtractionSourceAdapter } = require('../src/source-adapter');
const { InMemoryEvidenceRegistry, validateRawExtractionAgainstRegistry, validateSnapshotInputAgainstRegistry } = require('../src/evidence-registry');
const { prepareSnapshotTransaction } = require('../src/pipeline');
const { InMemoryAtomicPersistenceAdapter } = require('../src/persistence');
const { validateCanonicalModel } = require('../src/canonical');
const { generateStaticVerticalSlice } = require('./generate-static-vertical-slice');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_STATE_PATH = path.join(ROOT, 'data/canonical.json');
const DEFAULT_SNAPSHOT_ARCHIVE_ROOT = path.join(ROOT, 'Snapshot');

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function writeJsonAtomic(filePath, value) {
  const target = path.resolve(filePath);
  const directory = path.dirname(target);
  fs.mkdirSync(directory, { recursive: true });
  const temporary = target + '.tmp-' + process.pid;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', 'utf8');
  fs.renameSync(temporary, target);
}

function previousByGlobalPlayerId(state) {
  const snapshots = new Map(state.snapshots.map((snapshot) => [snapshot.snapshot_id, snapshot]));
  const sorted = state.observations
    .filter((observation) =>
      observation.identity_resolution_status === 'CONFIRMED' &&
      observation.global_player_id
    )
    .slice()
    .sort((left, right) => {
      const leftTime = snapshots.get(left.snapshot_id)?.official_timestamp_utc || '';
      const rightTime = snapshots.get(right.snapshot_id)?.official_timestamp_utc || '';
      if (leftTime !== rightTime) return leftTime.localeCompare(rightTime);
      return left.observation_id.localeCompare(right.observation_id);
    });

  const latest = {};
  for (const observation of sorted) {
    latest[observation.global_player_id] = observation;
  }
  return latest;
}

function membershipContextForInput(state, rawInput, decisionMap) {
  const snapshots = new Map(state.snapshots.map((snapshot) => [snapshot.snapshot_id, snapshot]));
  const observations = state.observations;
  const episodes = state.membership_episodes;

  const out = {};
  for (const member of rawInput.members) {
    const decision = decisionMap?.[member.source_member_key];
    const globalPlayerId = decision?.status === 'CONFIRMED' ? decision.global_player_id : null;
    if (!globalPlayerId) continue;

    const previous = observations
      .filter((observation) =>
        observation.global_player_id === globalPlayerId &&
        observation.identity_resolution_status === 'CONFIRMED'
      )
      .slice()
      .sort((left, right) => {
        const lt = snapshots.get(left.snapshot_id)?.official_timestamp_utc || '';
        const rt = snapshots.get(right.snapshot_id)?.official_timestamp_utc || '';
        if (lt !== rt) return rt.localeCompare(lt);
        return right.observation_id.localeCompare(left.observation_id);
      })[0] || null;

    const sameClanEpisodes = episodes.filter((episode) =>
      episode.global_player_id === globalPlayerId &&
      episode.clan_id === rawInput.clan_id
    );
    const activeSameClan = sameClanEpisodes.find((episode) => episode.status === 'ACTIVE') || null;
    const previousMembershipEpisodeId = previous?.membership_episode_id || null;

    out[member.source_member_key] = {
      prior_episode_exists: sameClanEpisodes.length > 0,
      prior_episode_ended: sameClanEpisodes.length > 0 && !activeSameClan,
      same_episode: Boolean(
        activeSameClan &&
        previousMembershipEpisodeId &&
        activeSameClan.membership_episode_id === previousMembershipEpisodeId
      ),
      same_league: Boolean(
        previous &&
        snapshots.get(previous.snapshot_id)?.league_id === rawInput.league.league_id
      )
    };
  }
  return out;
}

function safePathSegment(value, label) {
  const segment = String(value || '').trim();
  if (!segment || segment === '.' || segment === '..' || segment.includes('/') || segment.includes('\\') || segment.includes('\0')) {
    throw new Error(label + ' is not a safe archive path segment');
  }
  return segment;
}

function archiveRawExtraction({ rawExtraction, authorityContext, archiveRoot = DEFAULT_SNAPSHOT_ARCHIVE_ROOT }) {
  const clanSegment = safePathSegment(authorityContext?.clan_display_name || authorityContext?.clan_id, 'clan_display_name');
  const snapshotSegment = safePathSegment(authorityContext?.snapshot?.snapshot_id, 'snapshot_id');
  const directory = path.resolve(archiveRoot, clanSegment);
  const target = path.join(directory, snapshotSegment + '.raw.json');
  const content = JSON.stringify(rawExtraction, null, 2) + '\n';
  if (fs.existsSync(target)) {
    if (fs.readFileSync(target, 'utf8') !== content) {
      const error = new Error('raw Snapshot archive already exists with different content: ' + target);
      error.code = 'SNAPSHOT_ARCHIVE_CONFLICT';
      throw error;
    }
    return { result: 'IDEMPOTENT', path: target };
  }
  fs.mkdirSync(directory, { recursive: true });
  const temporary = target + '.tmp-' + process.pid;
  fs.writeFileSync(temporary, content, 'utf8');
  fs.renameSync(temporary, target);
  return { result: 'ARCHIVED', path: target };
}

function parseArgs(argv) {
  const args = { state: DEFAULT_STATE_PATH, allowReview: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--raw') args.raw = argv[++index];
    else if (value === '--context') args.context = argv[++index];
    else if (value === '--state') args.state = argv[++index];
    else if (value === '--allow-review') args.allowReview = true;
    else if (value === '--help') args.help = true;
    else throw new Error('unknown argument: ' + value);
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/ingest-snapshot.js --raw <raw-extraction.json> --context <authority-context.json> [--state <canonical.json>] [--allow-review]',
    '',
    'The Authority context is explicit. Snapshot/League/Clan identity is never inferred from the RawExtraction.',
    'REVIEW_REQUIRED is not persisted unless --allow-review is supplied.'
  ].join('\n');
}

function ingestSnapshot({
  rawExtraction,
  authorityContext,
  state,
  allowReviewPersistence = false,
  clanDisplayName = null
}) {
  validateCanonicalModel(state);

  const registry = new InMemoryEvidenceRegistry();
  for (const artifact of rawExtraction.source.artifacts || []) {
    const result = registry.registerArtifact(artifact);
    if (!['REGISTERED', 'IDEMPOTENT'].includes(result.result)) {
      throw new Error('Evidence registration failed: ' + (result.message || result.reason));
    }
  }

  const rawCheck = validateRawExtractionAgainstRegistry(registry, rawExtraction);
  if (!rawCheck.valid) throw new Error('RawExtraction evidence validation failed: ' + rawCheck.message);

  const adapter = new RawExtractionSourceAdapter();
  const snapshotInput = adapter.toSnapshotInput(rawExtraction, authorityContext);

  const snapshotCheck = validateSnapshotInputAgainstRegistry(registry, snapshotInput);
  if (!snapshotCheck.valid) throw new Error('SnapshotInput evidence validation failed: ' + snapshotCheck.message);

  const decisions = authorityContext.identity_decisions_by_source_key || {};
  const context = {
    evidenceRegistry: registry,
    previousByGlobalPlayerId: previousByGlobalPlayerId(state),
    membershipBySourceKey: membershipContextForInput(state, snapshotInput, decisions),
    identityDecisionsBySourceKey: decisions,
    currentState: state
  };

  const prepared = prepareSnapshotTransaction(snapshotInput, context);

  if (prepared.transaction_status === 'REVIEW_REQUIRED' && !allowReviewPersistence) {
    return {
      result: 'REVIEW_REQUIRED',
      persisted: false,
      snapshot_id: snapshotInput.snapshot.snapshot_id,
      clan_id: snapshotInput.clan_id,
      review_reasons: prepared.review_reasons,
      state
    };
  }

  if (clanDisplayName) {
    const clanPatch = prepared.persistence.transaction.canonical_patch.clans.find(
      (clan) => clan.clan_id === snapshotInput.clan_id
    );
    if (clanPatch && !state.clans.some((clan) => clan.clan_id === snapshotInput.clan_id)) {
      clanPatch.display_name = clanDisplayName;
    }
  }

  const adapterState = new InMemoryAtomicPersistenceAdapter(state);
  const commit = adapterState.commit(
    prepared.persistence.transaction,
    { allowReviewPersistence }
  );

  if (!['COMMITTED', 'IDEMPOTENT_REPLAY', 'REVIEW_REQUIRED'].includes(commit.result)) {
    throw new Error('Snapshot persistence failed: ' + JSON.stringify(commit));
  }
  if (commit.result === 'REVIEW_REQUIRED' && !commit.committed) {
    return {
      result: commit.result,
      persisted: false,
      snapshot_id: snapshotInput.snapshot.snapshot_id,
      clan_id: snapshotInput.clan_id,
      review_reasons: prepared.review_reasons,
      commit,
      state
    };
  }

  const nextState = adapterState.read();
  validateCanonicalModel(nextState);
  return {
    result: commit.result,
    persisted: Boolean(commit.committed),
    snapshot_id: snapshotInput.snapshot.snapshot_id,
    clan_id: snapshotInput.clan_id,
    review_reasons: prepared.review_reasons,
    commit,
    state: nextState
  };
}

if (require.main === module) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.help || !args.raw || !args.context) {
      console.log(usage());
      process.exitCode = args.help ? 0 : 1;
    } else {
      const rawExtraction = loadJson(args.raw);
      const authorityContext = loadJson(args.context);
      const state = loadJson(args.state);
      archiveRawExtraction({ rawExtraction, authorityContext });
      const result = ingestSnapshot({
        rawExtraction,
        authorityContext,
        state,
        allowReviewPersistence: args.allowReview,
        clanDisplayName: authorityContext.clan_display_name || null
      });

      if (result.persisted) {
        writeJsonAtomic(args.state, result.state);
        generateStaticVerticalSlice();
      }

      const summary = {
        result: result.result,
        persisted: result.persisted,
        snapshot_id: result.snapshot_id,
        clan_id: result.clan_id,
        review_reason_count: result.review_reasons?.length || 0,
        state_counts: Object.fromEntries(
          Object.entries(result.state).map(([key, value]) => [key, Array.isArray(value) ? value.length : undefined])
            .filter(([, value]) => value !== undefined)
        )
      };
      console.log(JSON.stringify(summary, null, 2));

      if (result.result === 'REVIEW_REQUIRED' && !args.allowReview) {
        process.exitCode = 2;
      }
    }
  } catch (error) {
    console.error('SNAPSHOT INGESTION FAILED: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  DEFAULT_STATE_PATH,
  loadJson,
  writeJsonAtomic,
  previousByGlobalPlayerId,
  membershipContextForInput,
  ingestSnapshot,
  archiveRawExtraction,
  DEFAULT_SNAPSHOT_ARCHIVE_ROOT
};
