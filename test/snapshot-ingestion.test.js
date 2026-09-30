'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ingestSnapshot,
  writeJsonAtomic,
  archiveRawExtraction
} = require('../scripts/ingest-snapshot');

const RAW_S12 = path.join(__dirname, '..', 'examples/pilots/persia-s12/raw-extraction.json');
const RAW_VALID = path.join(__dirname, 'fixtures/raw-extraction.valid.json');
const BASE_STATE = path.join(__dirname, '..', 'data/canonical.json');

function tempPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ucs-ingest-'));
  return path.join(dir, name);
}

test('Raw Snapshot archive is immutable and idempotent', () => {
  const archiveRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ucs-snapshot-archive-'));
  const raw = readJson(RAW_S12);
  const authority = s12Context();
  const first = archiveRawExtraction({ rawExtraction: raw, authorityContext: authority, archiveRoot });
  assert.equal(first.result, 'ARCHIVED');
  assert.equal(fs.readFileSync(first.path, 'utf8'), JSON.stringify(raw, null, 2) + '\n');

  const second = archiveRawExtraction({ rawExtraction: raw, authorityContext: authority, archiveRoot });
  assert.equal(second.result, 'IDEMPOTENT');

  const altered = structuredClone(raw);
  altered.members[0].display_name = 'Archive Conflict';
  assert.throws(
    () => archiveRawExtraction({ rawExtraction: altered, authorityContext: authority, archiveRoot }),
    (error) => error.code === 'SNAPSHOT_ARCHIVE_CONFLICT'
  );

  fs.rmSync(archiveRoot, { recursive: true, force: true });
});

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}


function secondClanRaw() {
  const raw = readJson(RAW_VALID);
  raw.extraction_id = 'FIX-SECOND-CLAN-001';
  raw.source.primary_artifact_id = 'ART-SECOND-001';
  raw.source.artifacts[0] = {
    artifact_id: 'ART-SECOND-001',
    artifact_type: 'synthetic-second-clan-snapshot',
    source_location: 'synthetic://ucs/second-clan',
    content_hash: { algorithm: 'sha256', value: 'b'.repeat(64) }
  };
  raw.members[0].evidence_refs = ['ART-SECOND-001'];
  for (const capture of Object.values(raw.members[0].fields)) {
    const captures = Array.isArray(capture) ? capture : [capture];
    for (const item of captures) item.evidence_refs = ['ART-SECOND-001'];
  }
  raw.members[0].fields.display_name.raw_value = 'Demo Operator';
  raw.members[0].fields.stage.raw_value = '12';
  raw.members[0].fields.weapons.raw_value = { '25mm': '4', hydra: '3', hellfire: '2' };
  raw.members[0].fields.total_kills.raw_value = '12345';
  raw.members[0].fields.lifetime_medals.raw_value = { bronze: '2', silver: '1', gold: '0' };
  raw.members[0].fields.current_league_clan_medals.raw_value = '500';
  raw.members[0].fields.profile_total_clan_medal_count.raw_value = '500';
  return raw;
}

function secondClanContext() {
  return {
    project_id: 'UCS',
    clan_id: 'CLAN-SECOND',
    clan_display_name: 'Second Clan',
    snapshot: {
      snapshot_id: 'SECOND-S01',
      sequence: 1,
      official_timestamp_utc: '2026-09-27T00:00:00Z',
      member_count: 1,
      capacity: 50
    },
    league: {
      league_id: 'LEAGUE-UCS-DEMO-2026W39',
      name: 'UCS Demo League',
      starts_at_utc: '2026-09-24T00:00:00Z',
      ends_at_utc: '2026-10-01T00:00:00Z',
      sequence: 39,
      status: 'ACTIVE'
    },
    identity_decisions_by_source_key: {
      'ROW-001': {
        status: 'CONFIRMED',
        global_player_id: 'GP-SYN-001',
        authority_ref: 'AUTH-TEST-SECOND-CLAN',
        evidence_refs: ['ART-SECOND-001'],
        decided_at_utc: '2026-09-27T00:00:00Z',
        reason: 'explicit cross-clan fixture identity decision'
      }
    }
  };
}
function s12Context() {
  return {
    project_id: 'UCS',
    clan_id: 'PERSIA',
    clan_display_name: 'PERSIA',
    snapshot: {
      snapshot_id: 'S12',
      sequence: 12,
      official_timestamp_utc: '2026-09-25T12:30:00Z',
      member_count: 50,
      capacity: 50
    },
    league: {
      league_id: 'PILOT::LEAGUE::2026-09-24',
      name: 'Current League',
      starts_at_utc: '2026-09-24T00:00:00Z',
      ends_at_utc: '2026-10-01T00:00:00Z',
      sequence: 1,
      status: 'ACTIVE'
    },
    identity_decisions_by_source_key: {}
  };
}

test('Snapshot ingestion blocks REVIEW_REQUIRED without writing state', () => {
  const statePath = tempPath('canonical.json');
  writeJsonAtomic(statePath, readJson(BASE_STATE));
  const before = fs.readFileSync(statePath, 'utf8');

  const result = ingestSnapshot({
    rawExtraction: readJson(RAW_S12),
    authorityContext: s12Context(),
    state: readJson(statePath),
    allowReviewPersistence: false,
    clanDisplayName: 'PERSIA'
  });

  assert.equal(result.result, 'REVIEW_REQUIRED');
  assert.equal(result.persisted, false);
  assert.equal(fs.readFileSync(statePath, 'utf8'), before);
  assert.equal(result.review_reasons.length, 50);
});

test('Snapshot ingestion can explicitly persist a real unresolved Snapshot as review-state', () => {
  const result = ingestSnapshot({
    rawExtraction: readJson(RAW_S12),
    authorityContext: s12Context(),
    state: readJson(BASE_STATE),
    allowReviewPersistence: true,
    clanDisplayName: 'PERSIA'
  });

  assert.equal(result.result, 'REVIEW_REQUIRED');
  assert.equal(result.persisted, true);
  assert.equal(result.state.snapshots.some((snapshot) => snapshot.snapshot_id === 'S12'), true);
  assert.equal(result.state.observations.filter((observation) => observation.snapshot_id === 'S12').length, 50);
  assert.equal(result.state.global_player_identities.length, readJson(BASE_STATE).global_player_identities.length);
  assert.equal(result.state.observations.filter((observation) => observation.snapshot_id === 'S12' && observation.global_player_id === null).length, 50);
  assert.equal(result.state.clans.some((clan) => clan.clan_id === 'PERSIA' && clan.display_name === 'PERSIA'), true);
});

test('Snapshot ingestion is idempotent for the same Snapshot identity', () => {
  const first = ingestSnapshot({
    rawExtraction: readJson(RAW_S12),
    authorityContext: s12Context(),
    state: readJson(BASE_STATE),
    allowReviewPersistence: true,
    clanDisplayName: 'PERSIA'
  });
  const second = ingestSnapshot({
    rawExtraction: readJson(RAW_S12),
    authorityContext: s12Context(),
    state: first.state,
    allowReviewPersistence: true,
    clanDisplayName: 'PERSIA'
  });

  assert.equal(first.result, 'REVIEW_REQUIRED');
  assert.equal(second.result, 'IDEMPOTENT_REPLAY');
  assert.equal(second.state.observations.length, first.state.observations.length);
  assert.equal(second.state.snapshots.length, first.state.snapshots.length);
});

test('Snapshot ingestion adds an additional Clan without creating a duplicate Global Player', () => {
  const state = readJson(BASE_STATE);
  const result = ingestSnapshot({
    rawExtraction: secondClanRaw(),
    authorityContext: secondClanContext(),
    state,
    allowReviewPersistence: false,
    clanDisplayName: 'Second Clan'
  });

  assert.equal(result.result, 'COMMITTED');
  assert.equal(result.state.clans.length, state.clans.length + 1);
  assert.equal(result.state.global_player_identities.length, state.global_player_identities.length);
  assert.equal(result.state.snapshots.some((snapshot) => snapshot.snapshot_id === 'SECOND-S01' && snapshot.clan_id === 'CLAN-SECOND'), true);

  const observation = result.state.observations.find((item) => item.observation_id === 'SECOND-S01::ROW-001');
  assert.ok(observation);
  assert.equal(observation.identity_resolution_status, 'CONFIRMED');
  assert.equal(observation.global_player_id, 'GP-SYN-001');
  assert.match(observation.membership_episode_id, /^ME::GP-SYN-001::CLAN-SECOND::1$/);

  const episode = result.state.membership_episodes.find((item) => item.membership_episode_id === observation.membership_episode_id);
  assert.ok(episode);
  assert.equal(episode.clan_id, 'CLAN-SECOND');
  assert.equal(episode.status, 'ACTIVE');

  const event = result.state.membership_events.find((item) => item.membership_episode_id === observation.membership_episode_id);
  assert.ok(event);
  assert.equal(event.event_type, 'JOIN');
});
