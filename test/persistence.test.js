
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  emptyCanonicalModel,
  validateCanonicalModel
} = require('../src/canonical');
const {
  InMemoryAtomicPersistenceAdapter,
  sha256
} = require('../src/persistence');
const { prepareSnapshotTransaction } = require('../src/pipeline');

function snapshotInput(overrides = {}) {
  return {
    project_id: 'UCS',
    clan_id: 'CLAN-A',
    schema_version: '0.1',
    snapshot: {
      snapshot_id: 'S-ATOMIC-001',
      sequence: 1,
      official_timestamp_utc: '2026-09-26T12:00:00Z',
      member_count: 1,
      capacity: 50
    },
    league: {
      league_id: 'LEAGUE-2026-09-24',
      name: null,
      sequence: 1,
      starts_at_utc: '2026-09-24T00:00:00.000Z',
      ends_at_utc: '2026-10-01T00:00:00.000Z',
      status: 'ACTIVE'
    },
    source: {
      artifact_id: 'EV-ATOMIC-001',
      artifact_type: 'test-fixture',
      content_hash: { algorithm: 'sha256', value: 'atomic-fixture-hash-001' }
    },
    members: [{
      source_member_key: 'ROW-001',
      rank: 1,
      display_name: 'Player A',
      role: 'Member',
      stage: 10,
      weapons: { '25mm': 4, hydra: 3 },
      total_kills: 10000,
      lifetime_medals: { bronze: 2 },
      current_league_clan_medals: 100,
      profile_total_clan_medal_count: 100,
      evidence_refs: []
    }],
    ...overrides
  };
}

function seedWithPlayer(includeOther = false) {
  const model = emptyCanonicalModel();
  model.global_player_identities.push({
    global_player_id: 'GP-SEED-001',
    status: 'ACTIVE',
    provenance: { evidence_refs: [] }
  });
  if (includeOther) {
  model.global_player_identities.push({
    global_player_id: 'GP-OTHER-002',
    status: 'ACTIVE',
    provenance: { evidence_refs: [] }
  });
  }
  return model;
}

function confirmedTransaction(inputOverrides = {}) {
  const input = snapshotInput(inputOverrides);
  const plan = prepareSnapshotTransaction(input, {
    identityDecisionsBySourceKey: {
      'ROW-001': {
        status: 'CONFIRMED',
        global_player_id: 'GP-SEED-001',
        evidence_refs: [input.source.artifact_id],
        authority_ref: 'AUTH-TEST-001',
        decided_at_utc: '2026-09-26T12:00:00Z',
        reason: 'test confirmation'
      }
    }
  });
  assert.equal(plan.transaction_status, 'READY_FOR_PERSISTENCE');
  return { input, plan, transaction: plan.persistence.transaction };
}

function secondTransaction(baseTransaction, snapshotId, kills = 11000) {
  const tx = structuredClone(baseTransaction);
  tx.transaction_id = 'TX::UCS|SNAPSHOT|CLAN-A|' + snapshotId;
  tx.idempotency_key = 'UCS|SNAPSHOT|CLAN-A|' + snapshotId;
  tx.domain_scope.snapshot_id = snapshotId;
  tx.canonical_patch.snapshots[0].snapshot_id = snapshotId;
  tx.canonical_patch.observations[0].snapshot_id = snapshotId;
  tx.canonical_patch.observations[0].observation_id = snapshotId + '::ROW-001';
  tx.canonical_patch.resolution_cases = [];
  tx.canonical_patch.clan_leagues = [];
  tx.canonical_patch.clans = [];
  tx.canonical_patch.leagues = [];
  tx.canonical_patch.observations[0].rank = 1;
  tx.canonical_patch.snapshots[0].sequence = 2;
  tx.canonical_patch.observations[0].total_kills = kills;
  tx.plan_hash = sha256(tx.canonical_patch);
  return tx;
}

test('1. Successful atomic commit persists the complete Snapshot write set', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter(seedWithPlayer());
  const result = adapter.commit(transaction);
  assert.equal(result.result, 'COMMITTED');
  const state = adapter.read();
  assert.equal(state.snapshots.length, 1);
  assert.equal(state.observations.length, 1);
  assert.equal(state.evidence_artifacts.length, 1);
  assert.equal(state.leagues.length, 1);
  assert.equal(state.clan_leagues.length, 1);
  assert.equal(validateCanonicalModel(state).valid, true);
});

test('2. Simulated failure produces rollback', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  const before = adapter.read();
  const result = adapter.commit(transaction, { failureInjection: { throw_after_writes: 2 } });
  assert.equal(result.result, 'FAILED_ROLLED_BACK');
  assert.deepEqual(adapter.read(), before);
});

test('3. No partial state remains after rollback', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction, { failureInjection: { throw_after_writes: 1 } });
  const state = adapter.read();
  assert.equal(state.global_player_identities.length, 1);
  assert.equal(state.leagues.length, 0);
  assert.equal(state.snapshots.length, 0);
  assert.equal(state.observations.length, 0);
  assert.equal(state.evidence_artifacts.length, 0);
});

test('4. Exact transaction replay is idempotent', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  const first = adapter.commit(transaction);
  const second = adapter.commit(transaction);
  assert.equal(first.result, 'COMMITTED');
  assert.equal(second.result, 'IDEMPOTENT_REPLAY');
  assert.equal(adapter.version(), 1);
  assert.equal(adapter.read().snapshots.length, 1);
});

test('5. Conflicting replay under the same idempotency key is detected', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const conflicting = structuredClone(transaction);
  conflicting.plan_hash = sha256({ different: true });
  const result = adapter.commit(conflicting);
  assert.equal(result.result, 'CONFLICT');
  assert.match(result.reason, /different_plan/);
});

test('6. Identical duplicate Snapshot is deterministic and idempotent', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const replayWithoutLedger = new InMemoryAtomicPersistenceAdapter(adapter.read());
  const replay = replayWithoutLedger.commit(transaction);
  assert.equal(replay.result, 'IDEMPOTENT_REPLAY');
});

test('7. Duplicate Snapshot with different content is a conflict', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const conflicting = structuredClone(transaction);
  conflicting.canonical_patch.observations[0].total_kills = 11000;
  conflicting.plan_hash = sha256(conflicting.canonical_patch);
  const result = adapter.commit(conflicting);
  assert.equal(result.result, 'CONFLICT');
  assert.equal(result.state_changed, false);
});

test('8. Historical Observation is preserved', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const before = adapter.read();
  const second = secondTransaction(transaction, 'S-ATOMIC-002');
  const result = adapter.commit(second);
  assert.equal(result.result, 'COMMITTED');
  const after = adapter.read();
  assert.deepEqual(after.observations[0], before.observations[0]);
  assert.equal(after.observations.length, 2);
});

test('9. Membership history is preserved', () => {
  const model = seedWithPlayer();
  model.clans.push({ clan_id: 'CLAN-A', display_name: 'A', status: 'ACTIVE' });
  model.clans.push({ clan_id: 'CLAN-B', display_name: 'B', status: 'ACTIVE' });
  model.leagues.push({
    league_id: 'L-OLD',
    starts_at_utc: '2026-09-17T00:00:00Z',
    ends_at_utc: '2026-09-24T00:00:00Z',
    sequence: 1,
    status: 'COMPLETED',
    completed_at_utc: '2026-09-24T00:00:00Z'
  });
  model.clan_leagues.push(
    { clan_league_id: 'CLANLEAGUE::CLAN-A::L-OLD', clan_id: 'CLAN-A', league_id: 'L-OLD', status: 'COMPLETED', final_snapshot_id: null, opening_snapshot_id: 'S-OLD-A' },
    { clan_league_id: 'CLANLEAGUE::CLAN-B::L-OLD', clan_id: 'CLAN-B', league_id: 'L-OLD', status: 'COMPLETED', final_snapshot_id: null, opening_snapshot_id: 'S-OLD-B' }
  );
  model.snapshots.push(
    { snapshot_id: 'S-OLD-A', clan_id: 'CLAN-A', league_id: 'L-OLD', clan_league_id: 'CLANLEAGUE::CLAN-A::L-OLD', sequence: 1, official_timestamp_utc: '2026-09-20T12:00:00Z', member_count: 0, capacity: 50 },
    { snapshot_id: 'S-OLD-B', clan_id: 'CLAN-B', league_id: 'L-OLD', clan_league_id: 'CLANLEAGUE::CLAN-B::L-OLD', sequence: 1, official_timestamp_utc: '2026-09-20T13:00:00Z', member_count: 0, capacity: 50 }
  );
  model.membership_events.push(
    { membership_event_id: 'MEV-A', event_type: 'LEAVE', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-A', membership_episode_id: 'ME-A1', effective_at_utc: '2026-09-21T00:00:00Z', observed_snapshot_id: null, evidence_refs: [], authority_ref: 'AUTH-A' },
    { membership_event_id: 'MEV-B', event_type: 'LEAVE', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-B', membership_episode_id: 'ME-B1', effective_at_utc: '2026-09-22T00:00:00Z', observed_snapshot_id: null, evidence_refs: [], authority_ref: 'AUTH-B' }
  );
  model.membership_episodes.push(
    { membership_episode_id: 'ME-A1', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-A', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'S-OLD-A', ended_at_utc: '2026-09-21T00:00:00Z', ended_by_event_id: 'MEV-A' },
    { membership_episode_id: 'ME-B1', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-B', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'S-OLD-B', ended_at_utc: '2026-09-22T00:00:00Z', ended_by_event_id: 'MEV-B' }
  );
  validateCanonicalModel(model);
  const before = adapterSnapshot(model);
  const adapter = new InMemoryAtomicPersistenceAdapter(model);
  const { transaction } = confirmedTransaction({
    clan_id: 'CLAN-C',
    snapshot: {
      snapshot_id: 'S-MEM-HISTORY',
      sequence: 1,
      official_timestamp_utc: '2026-09-26T12:00:00Z',
      member_count: 1,
      capacity: 50
    }
  });
  const result = adapter.commit(transaction);
  assert.equal(result.result, 'COMMITTED');
  const after = adapter.read();
  assert.deepEqual(after.membership_episodes, before.membership_episodes);
  assert.deepEqual(after.membership_events, before.membership_events);
});

function adapterSnapshot(model) {
  return {
    membership_episodes: structuredClone(model.membership_episodes),
    membership_events: structuredClone(model.membership_events)
  };
}

test('10. Clan A -> Clan B -> Clan A remains intact', () => {
  const model = seedWithPlayer();
  model.clans.push({ clan_id: 'CLAN-A', display_name: 'A', status: 'ACTIVE' });
  model.clans.push({ clan_id: 'CLAN-B', display_name: 'B', status: 'ACTIVE' });
  model.leagues.push({
    league_id: 'L-OLD',
    starts_at_utc: '2026-09-17T00:00:00Z',
    ends_at_utc: '2026-09-24T00:00:00Z',
    sequence: 1,
    status: 'COMPLETED',
    completed_at_utc: '2026-09-24T00:00:00Z'
  });
  const pairs = [['CLAN-A', 'S-A1'], ['CLAN-B', 'S-B1'], ['CLAN-A', 'S-A2']];
  pairs.forEach(([clanId, snapshotId], index) => {
    const clanLeagueId = 'CLANLEAGUE::' + clanId + '::L-OLD';
    if (!model.clan_leagues.some((item) => item.clan_league_id === clanLeagueId)) {
      model.clan_leagues.push({
        clan_league_id: clanLeagueId,
        clan_id: clanId,
        league_id: 'L-OLD',
        status: 'COMPLETED',
        final_snapshot_id: null,
        opening_snapshot_id: snapshotId
      });
    }
    model.snapshots.push({
      snapshot_id: snapshotId,
      clan_id: clanId,
      league_id: 'L-OLD',
      clan_league_id: clanLeagueId,
      sequence: index + 1,
      official_timestamp_utc: '2026-09-2' + (index + 1) + 'T12:00:00Z',
      member_count: 0,
      capacity: 50
    });
  });
  model.membership_episodes.push(
    { membership_episode_id: 'ME-A1', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-A', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'S-A1', ended_at_utc: '2026-09-21T00:00:00Z', ended_by_event_id: 'EVT-AB' },
    { membership_episode_id: 'ME-B1', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-B', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'S-B1', ended_at_utc: '2026-09-22T00:00:00Z', ended_by_event_id: 'EVT-BA' },
    { membership_episode_id: 'ME-A2', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-A', sequence: 2, status: 'ACTIVE', started_from_snapshot_id: 'S-A2', ended_at_utc: null, ended_by_event_id: null }
  );
  model.membership_events.push(
    { membership_event_id: 'EVT-AB', event_type: 'TRANSFER', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-B', membership_episode_id: 'ME-B1', effective_at_utc: '2026-09-21T00:00:00Z', observed_snapshot_id: 'S-B1', from_clan_id: 'CLAN-A', to_clan_id: 'CLAN-B', evidence_refs: [], authority_ref: 'AUTH-AB' },
    { membership_event_id: 'EVT-BA', event_type: 'TRANSFER', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-A', membership_episode_id: 'ME-A2', effective_at_utc: '2026-09-22T00:00:00Z', observed_snapshot_id: 'S-A2', from_clan_id: 'CLAN-B', to_clan_id: 'CLAN-A', evidence_refs: [], authority_ref: 'AUTH-BA' }
  );
  validateCanonicalModel(model);
  assert.deepEqual(model.membership_episodes.map((e) => e.clan_id), ['CLAN-A', 'CLAN-B', 'CLAN-A']);
  assert.equal(new Set(model.membership_episodes.map((e) => e.membership_episode_id)).size, 3);
});

test('11. Leave -> Return creates a new Membership Episode', () => {
  const model = seedWithPlayer();
  model.clans.push({ clan_id: 'CLAN-RET', display_name: 'Return Clan', status: 'ACTIVE' });
  model.leagues.push({
    league_id: 'L-RET',
    starts_at_utc: '2026-09-24T00:00:00Z',
    ends_at_utc: '2026-10-01T00:00:00Z',
    sequence: 1,
    status: 'ACTIVE',
    completed_at_utc: null
  });
  model.clan_leagues.push({
    clan_league_id: 'CLANLEAGUE::CLAN-RET::L-RET',
    clan_id: 'CLAN-RET',
    league_id: 'L-RET',
    status: 'ACTIVE',
    final_snapshot_id: null,
    opening_snapshot_id: 'S-RET-1'
  });
  model.snapshots.push({
    snapshot_id: 'S-RET-1',
    clan_id: 'CLAN-RET',
    league_id: 'L-RET',
    clan_league_id: 'CLANLEAGUE::CLAN-RET::L-RET',
    sequence: 1,
    official_timestamp_utc: '2026-09-25T12:00:00Z',
    member_count: 0,
    capacity: 50
  });
  model.membership_events.push({
    membership_event_id: 'EV-RET-LEAVE',
    event_type: 'LEAVE',
    global_player_id: 'GP-SEED-001',
    clan_id: 'CLAN-RET',
    membership_episode_id: 'ME-RET-1',
    effective_at_utc: '2026-09-26T12:00:00Z',
    observed_snapshot_id: null,
    evidence_refs: [],
    authority_ref: 'AUTH-LEAVE'
  });
  model.membership_episodes.push(
    { membership_episode_id: 'ME-RET-1', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-RET', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'S-RET-1', ended_at_utc: '2026-09-26T12:00:00Z', ended_by_event_id: 'EV-RET-LEAVE' },
    { membership_episode_id: 'ME-RET-2', global_player_id: 'GP-SEED-001', clan_id: 'CLAN-RET', sequence: 2, status: 'ACTIVE', started_from_snapshot_id: 'S-RET-1', ended_at_utc: null, ended_by_event_id: null }
  );
  validateCanonicalModel(model);
  assert.equal(model.membership_episodes[0].status, 'ENDED');
  assert.equal(model.membership_episodes[1].sequence, 2);
});

test('12. Ambiguous identity is persistable only as review, without false Global Identity binding', () => {
  const input = snapshotInput();
  const plan = prepareSnapshotTransaction(input, {
    candidatesBySourceKey: {
      'ROW-001': [
        { global_player_id: 'GP-SEED-001', observation: { stage: 10, total_kills: 10000, weapons: { '25mm': 4 } } },
        { global_player_id: 'GP-OTHER-002', observation: { stage: 10, total_kills: 10001, weapons: { '25mm': 4 } } }
      ]
    }
  });
  assert.equal(plan.transaction_status, 'REVIEW_REQUIRED');
  const adapter = new InMemoryAtomicPersistenceAdapter(seedWithPlayer(true));
  const result = adapter.commit(plan.persistence.transaction, { allowReviewPersistence: true });
  assert.equal(result.result, 'REVIEW_REQUIRED');
  const state = adapter.read();
  assert.equal(state.global_player_identities.length, 2);
  assert.equal(state.observations[0].global_player_id, null);
  assert.equal(state.observations[0].identity_resolution_status, 'AMBIGUOUS');
  assert.equal(state.resolution_cases[0].candidate_global_player_ids.length, 2);
});

test('13. Lifetime metric anomaly cannot overwrite prior Observation', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const anomaly = secondTransaction(transaction, 'S-ATOMIC-003', 9990);
  const result = adapter.commit(anomaly);
  assert.equal(result.result, 'COMMITTED');
  const state = adapter.read();
  assert.equal(
    state.observations.find((o) => o.observation_id === 'S-ATOMIC-001::ROW-001').total_kills,
    10000
  );
  assert.equal(
    state.observations.find((o) => o.observation_id === 'S-ATOMIC-003::ROW-001').total_kills,
    9990
  );
});

test('14. League and ClanLeague consistency is preserved', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const state = adapter.read();
  assert.equal(state.clan_leagues[0].league_id, state.leagues[0].league_id);
  assert.equal(state.clan_leagues[0].clan_id, state.clans[0].clan_id);
  assert.equal(state.snapshots[0].clan_league_id, state.clan_leagues[0].clan_league_id);
});

test('15. Late Snapshot does not modify League start', () => {
  const { input, transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const state = adapter.read();
  assert.equal(state.leagues[0].starts_at_utc, input.league.starts_at_utc);
  assert.ok(new Date(state.snapshots[0].official_timestamp_utc) > new Date(state.leagues[0].starts_at_utc));
});

test('16. Expected-version mismatch is a conflict with no state change', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  const first = adapter.commit(transaction);
  assert.equal(first.result, 'COMMITTED');
  const next = secondTransaction(transaction, 'S-ATOMIC-004');
  next.expected_version = 0;
  const before = adapter.read();
  const result = adapter.commit(next);
  assert.equal(result.result, 'CONFLICT');
  assert.equal(result.reason, 'expected_version_mismatch');
  assert.deepEqual(adapter.read(), before);
});

test('17. Missing Global Identity is detected as a conflict before commit', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  const before = adapter.read();
  const result = adapter.commit(transaction);
  assert.equal(result.result, 'CONFLICT');
  assert.match(result.reason, /confirmed_global_player_identity_missing/);
  assert.deepEqual(adapter.read(), before);
});

test('18. Missing final Snapshot remains representable', () => {
  const { transaction } = confirmedTransaction();
  const adapter = new InMemoryAtomicPersistenceAdapter();
  adapter.commit(transaction);
  const state = adapter.read();
  assert.equal(state.clan_leagues[0].final_snapshot_id, null);
  assert.equal(state.leagues[0].completed_at_utc, null);
});
