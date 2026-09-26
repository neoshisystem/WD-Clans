'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  emptyCanonicalModel,
  validateCanonicalModel
} = require('../src/canonical');
const {
  stableStringify,
  ProjectionEngine
} = require('../src/projection');
const {
  RawExtractionSourceAdapter,
  validateRawExtraction
} = require('../src/source-adapter');
const {
  InMemoryEvidenceRegistry,
  validateSnapshotInputAgainstRegistry
} = require('../src/evidence-registry');
const {
  prepareSnapshotTransaction
} = require('../src/pipeline');
const {
  InMemoryAtomicPersistenceAdapter
} = require('../src/persistence');
const {
  buildStaticDataBundle,
  serializeStaticDataBundle,
  hashStaticDataBundle
} = require('../src/static-data');

const FIXTURE = path.join(
  __dirname,
  '..',
  'examples',
  'pilots',
  'persia-s12',
  'raw-extraction.json'
);

const AUTHORITY_CONTEXT = {
  project_id: 'UCS',
  clan_id: 'PERSIA',
  snapshot: {
    snapshot_id: 'S12',
    sequence: 12,
    official_timestamp_utc: '2026-09-25T12:30:00Z',
    member_count: 50,
    capacity: 50
  },
  league: {
    league_id: 'PILOT::LEAGUE::2026-09-24',
    name: null,
    sequence: 1,
    status: 'ACTIVE',
    starts_at_utc: '2026-09-24T00:00:00Z',
    ends_at_utc: '2026-10-01T00:00:00Z'
  }
};

const S12_EVIDENCE_IDS = [
  'PERSIA-S12-RANKING-HTML',
  'PERSIA-S12-PROFILE-JSON'
];

const MISSING_PROFILE_RANKS = [37, 41, 44];

function readRaw() {
  const raw = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(validateRawExtraction(raw).valid, true);
  return raw;
}

function registryFromRaw(raw) {
  return new InMemoryEvidenceRegistry({
    artifacts: raw.source.artifacts
  });
}

function seedReviewCanonical() {
  const model = emptyCanonicalModel();
  const historicalEvidence = {
    evidence_artifact_id: 'PERSIA-S11-TEST-HISTORY',
    artifact_type: 'test-historical-observation',
    content_hash: {
      algorithm: 'sha256',
      value: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
    },
    source_location: 'test://ucs/persia-s11/history',
    received_at_utc: null,
    immutable: true
  };

  model.clans.push({
    clan_id: 'PERSIA',
    display_name: 'PERSIA',
    status: 'ACTIVE',
    provenance: { evidence_refs: [historicalEvidence.evidence_artifact_id] }
  });

  model.leagues.push({
    league_id: AUTHORITY_CONTEXT.league.league_id,
    name: null,
    starts_at_utc: AUTHORITY_CONTEXT.league.starts_at_utc,
    ends_at_utc: AUTHORITY_CONTEXT.league.ends_at_utc,
    sequence: AUTHORITY_CONTEXT.league.sequence,
    status: 'ACTIVE',
    completed_at_utc: null,
    provenance: { evidence_refs: [historicalEvidence.evidence_artifact_id] }
  });

  const clanLeagueId =
    'CLANLEAGUE::PERSIA::' + AUTHORITY_CONTEXT.league.league_id;

  model.clan_leagues.push({
    clan_league_id: clanLeagueId,
    clan_id: 'PERSIA',
    league_id: AUTHORITY_CONTEXT.league.league_id,
    status: 'ACTIVE',
    final_snapshot_id: null,
    opening_snapshot_id: 'S11-TEST',
    provenance: { evidence_refs: [historicalEvidence.evidence_artifact_id] }
  });

  model.snapshots.push({
    snapshot_id: 'S11-TEST',
    clan_id: 'PERSIA',
    league_id: AUTHORITY_CONTEXT.league.league_id,
    clan_league_id: clanLeagueId,
    sequence: 11,
    official_timestamp_utc: '2026-09-25T11:30:00Z',
    member_count: 1,
    capacity: 50,
    provenance: { evidence_refs: [historicalEvidence.evidence_artifact_id] }
  });

  model.observations.push({
    observation_id: 'S11-TEST::HIST-001',
    snapshot_id: 'S11-TEST',
    clan_id: 'PERSIA',
    source_member_key: 'PERSIA-S11-TEST-HIST-001',
    source_identity: {
      source_system: 'PERSIA',
      source_identity_id: 'PERSIA-S11-TEST-001'
    },
    global_player_id: null,
    membership_episode_id: null,
    identity_resolution_status: 'UNRESOLVED',
    display_name: 'Historical Test Observation',
    rank: 50,
    stage: 40,
    role: null,
    weapons: null,
    total_kills: null,
    lifetime_medals: null,
    current_league_clan_medals: 100,
    profile_total_clan_medal_count: null,
    last_online_utc: null,
    provenance: {
      evidence_refs: [historicalEvidence.evidence_artifact_id],
      field_provenance: {
        role: {
          status: 'UNKNOWN',
          evidence_refs: [historicalEvidence.evidence_artifact_id]
        },
        last_online_utc: {
          status: 'NOT_VISIBLE',
          evidence_refs: [historicalEvidence.evidence_artifact_id]
        }
      }
    }
  });

  model.evidence_artifacts.push(historicalEvidence);
  validateCanonicalModel(model);
  return model;
}

function prepareS12() {
  const raw = readRaw();
  const registry = registryFromRaw(raw);
  const input = new RawExtractionSourceAdapter().toSnapshotInput(
    raw,
    AUTHORITY_CONTEXT
  );
  assert.equal(validateSnapshotInputAgainstRegistry(registry, input).valid, true);

  const plan = prepareSnapshotTransaction(input, {
    evidenceRegistry: registry
  });

  return { raw, input, plan };
}

function executeReviewStatePath() {
  const { raw, input, plan } = prepareS12();
  const persistence = new InMemoryAtomicPersistenceAdapter(
    seedReviewCanonical()
  );

  const withoutReviewPermission = persistence.commit(
    plan.persistence.transaction
  );
  assert.equal(withoutReviewPermission.result, 'REVIEW_REQUIRED');
  assert.equal(withoutReviewPermission.committed, false);
  assert.equal(withoutReviewPermission.state_changed, false);

  const firstCommit = persistence.commit(plan.persistence.transaction, {
    allowReviewPersistence: true
  });
  assert.equal(firstCommit.result, 'REVIEW_REQUIRED');
  assert.equal(firstCommit.committed, true);
  assert.equal(firstCommit.state_changed, true);

  const canonical = persistence.read();
  validateCanonicalModel(canonical);

  const projection = new ProjectionEngine().projectAll(canonical);
  const staticBundle = buildStaticDataBundle(canonical);

  return {
    raw,
    input,
    plan,
    firstCommit,
    canonical,
    projection,
    staticBundle,
    serializedStatic: serializeStaticDataBundle(staticBundle),
    staticHash: hashStaticDataBundle(staticBundle)
  };
}

test('PERSIA S12 Review-State E2E: real input commits safely through Canonical → Projection → Static', () => {
  const execution = executeReviewStatePath();
  const {
    raw,
    input,
    plan,
    canonical,
    projection,
    staticBundle,
    serializedStatic,
    staticHash
  } = execution;

  assert.equal(plan.transaction_status, 'REVIEW_REQUIRED');
  assert.equal(plan.persistence.transaction.transaction_status, 'REVIEW_REQUIRED');
  assert.equal(
    plan.persistence.transaction.domain_scope.creates_global_player_id,
    false
  );
  assert.deepEqual(
    plan.persistence.transaction.domain_scope.confirmed_global_player_ids,
    []
  );

  assert.equal(input.snapshot.snapshot_id, 'S12');
  assert.equal(input.snapshot.member_count, 50);
  assert.equal(input.members.length, 50);

  assert.equal(canonical.snapshots.length, 2);
  assert.equal(canonical.observations.length, 51);
  assert.equal(canonical.global_player_identities.length, 0);
  assert.equal(canonical.membership_episodes.length, 0);
  assert.equal(canonical.membership_events.length, 0);
  assert.equal(canonical.resolution_cases.length, 50);
  assert.ok(
    canonical.observations
      .filter(observation => observation.snapshot_id === 'S12')
      .every(observation =>
        observation.global_player_id === null &&
        observation.identity_resolution_status === 'UNRESOLVED'
      )
  );
  assert.ok(
    canonical.resolution_cases.every(
      resolution =>
        resolution.status === 'UNRESOLVED' &&
        resolution.matched_global_player_id === null
    )
  );

  const historicalObservation = canonical.observations.find(
    observation => observation.observation_id === 'S11-TEST::HIST-001'
  );
  assert.equal(historicalObservation.display_name, 'Historical Test Observation');
  assert.equal(
    canonical.evidence_artifacts.find(
      artifact => artifact.evidence_artifact_id === 'PERSIA-S11-TEST-HISTORY'
    ).immutable,
    true
  );

  assert.deepEqual(
    canonical.evidence_artifacts
      .map(artifact => artifact.evidence_artifact_id)
      .sort(),
    [...S12_EVIDENCE_IDS, 'PERSIA-S11-TEST-HISTORY'].sort()
  );

  for (const rank of MISSING_PROFILE_RANKS) {
    const member = canonical.observations.find(
      observation =>
        observation.snapshot_id === 'S12' && observation.rank === rank
    );
    assert.equal(member.role, null);
    assert.equal(member.weapons, null);
    assert.equal(member.total_kills, null);
    assert.equal(member.lifetime_medals, null);
    assert.equal(member.profile_total_clan_medal_count, null);
    assert.equal(member.last_online_utc, null);
  }

  const s12Projection = projection.snapshots.find(
    snapshot => snapshot.snapshot_id === 'S12'
  );
  assert.equal(s12Projection.members.length, 50);
  assert.ok(
    s12Projection.members.every(member =>
      member.global_player_id === null &&
      member.identity_resolution_status === 'UNRESOLVED'
    )
  );
  assert.deepEqual(
    projection.global_players,
    []
  );

  assert.deepEqual(
    staticBundle.provenance.evidence_refs,
    [...S12_EVIDENCE_IDS, 'PERSIA-S11-TEST-HISTORY'].sort()
  );
  assert.equal(
    staticBundle.read_model.snapshots.find(
      snapshot => snapshot.snapshot_id === 'S12'
    ).members.length,
    50
  );
  assert.equal(typeof serializedStatic, 'string');
  assert.match(serializedStatic, /"static_data_version":"0.1"/);
  assert.match(staticHash, /^[a-f0-9]{64}$/);

  const rawMissing = raw.members
    .filter(member => MISSING_PROFILE_RANKS.includes(member.fields.rank.raw_value))
    .map(member => member.fields.rank.raw_value)
    .sort((a, b) => a - b);
  assert.deepEqual(rawMissing, MISSING_PROFILE_RANKS);

  for (const rank of MISSING_PROFILE_RANKS) {
    const member = s12Projection.members.find(item => item.rank === rank);
    assert.equal(member.role, null);
    assert.equal(member.weapons, null);
    assert.equal(member.total_kills, null);
    assert.equal(member.lifetime_medals, null);
    assert.equal(member.profile_total_clan_medal_count, null);
    assert.equal(member.last_online_utc, null);
  }

  for (const evidenceId of S12_EVIDENCE_IDS) {
    assert.ok(staticBundle.provenance.evidence_refs.includes(evidenceId));
  }

  assert.equal(canonical.global_player_identities.length, 0);
});

test('PERSIA S12 Review-State E2E: repeated execution is deterministic and persistence is idempotent', () => {
  const first = executeReviewStatePath();
  const second = executeReviewStatePath();

  assert.equal(stableStringify(first.plan), stableStringify(second.plan));
  assert.equal(
    stableStringify(first.plan.persistence.transaction),
    stableStringify(second.plan.persistence.transaction)
  );
  assert.equal(stableStringify(first.canonical), stableStringify(second.canonical));
  assert.equal(
    stableStringify(first.projection),
    stableStringify(second.projection)
  );
  assert.equal(
    stableStringify(first.staticBundle),
    stableStringify(second.staticBundle)
  );
  assert.equal(first.serializedStatic, second.serializedStatic);
  assert.equal(first.staticHash, second.staticHash);

  const replayAdapter = new InMemoryAtomicPersistenceAdapter(first.canonical);
  const replay = replayAdapter.commit(
    first.plan.persistence.transaction,
    { allowReviewPersistence: true }
  );
  assert.equal(replay.result, 'IDEMPOTENT_REPLAY');
  assert.equal(replay.committed, false);
  assert.equal(replay.state_changed, false);
});
