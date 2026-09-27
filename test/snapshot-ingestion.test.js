'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  ingestSnapshot,
  writeJsonAtomic
} = require('../scripts/ingest-snapshot');

const RAW_S12 = path.join(__dirname, '..', 'examples/pilots/persia-s12/raw-extraction.json');
const BASE_STATE = path.join(__dirname, '..', 'data/canonical.json');

function tempPath(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ucs-ingest-'));
  return path.join(dir, name);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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

  assert.equal(result.result, 'COMMITTED');
  assert.equal(result.persisted, true);
  assert.equal(result.state.snapshots.some((snapshot) => snapshot.snapshot_id === 'S12'), true);
  assert.equal(result.state.observations.filter((observation) => observation.snapshot_id === 'S12').length, 50);
  assert.equal(result.state.global_player_identities.length, 1);
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

  assert.equal(first.result, 'COMMITTED');
  assert.equal(second.result, 'IDEMPOTENT_REPLAY');
  assert.equal(second.state.observations.length, first.state.observations.length);
  assert.equal(second.state.snapshots.length, first.state.snapshots.length);
});
