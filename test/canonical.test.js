'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  emptyCanonicalModel,
  validateCanonicalModel,
  assertHistoryPreserved,
  buildDeltaResult
} = require('../src/canonical');
const {
  leagueWindowForTimestamp
} = require('../src/league');
const {
  validateLifetimeMetrics,
  currentLeagueClanMedalDelta,
  membershipEpisodeClanMedalContribution
} = require('../src/metrics');

function baseModel() {
  const model = emptyCanonicalModel();

  model.clans.push(
    { clan_id: 'CLAN-A', display_name: 'Clan A', status: 'ACTIVE' },
    { clan_id: 'CLAN-B', display_name: 'Clan B', status: 'ACTIVE' }
  );

  model.evidence_artifacts.push(
    { evidence_artifact_id: 'EV-1', artifact_type: 'fixture', content_hash: { algorithm: 'sha256', value: 'ev1' }, immutable: true },
    { evidence_artifact_id: 'EV-2', artifact_type: 'fixture', content_hash: { algorithm: 'sha256', value: 'ev2' }, immutable: true }
  );

  model.global_player_identities.push(
    { global_player_id: 'GP-1', status: 'ACTIVE' },
    { global_player_id: 'GP-2', status: 'ACTIVE' }
  );

  const l1 = leagueWindowForTimestamp('2026-09-20T12:00:00Z');
  const l2 = leagueWindowForTimestamp('2026-09-28T12:00:00Z');

  model.leagues.push(
    {
      league_id: 'L-1',
      name: null,
      starts_at_utc: l1.starts_at_utc,
      ends_at_utc: l1.ends_at_utc,
      sequence: 1,
      status: 'COMPLETED',
      completed_at_utc: l1.ends_at_utc,
      final_snapshot_id: null
    },
    {
      league_id: 'L-2',
      name: null,
      starts_at_utc: l2.starts_at_utc,
      ends_at_utc: l2.ends_at_utc,
      sequence: 2,
      status: 'ACTIVE',
      completed_at_utc: null,
      final_snapshot_id: null
    }
  );

  model.clan_leagues.push(
    { clan_league_id: 'CLAN-A-L1', clan_id: 'CLAN-A', league_id: 'L-1', status: 'COMPLETED', final_snapshot_id: null, opening_snapshot_id: 'SA-1' },
    { clan_league_id: 'CLAN-A-L2', clan_id: 'CLAN-A', league_id: 'L-2', status: 'ACTIVE', final_snapshot_id: null, opening_snapshot_id: null },
    { clan_league_id: 'CLAN-B-L2', clan_id: 'CLAN-B', league_id: 'L-2', status: 'ACTIVE', final_snapshot_id: null, opening_snapshot_id: null }
  );

  model.snapshots.push(
    { snapshot_id: 'SA-1', clan_id: 'CLAN-A', league_id: 'L-1', clan_league_id: 'CLAN-A-L1', sequence: 1, official_timestamp_utc: '2026-09-20T12:00:00Z', member_count: 2, capacity: 50, provenance: { evidence_refs: ['EV-1'] } },
    { snapshot_id: 'SA-2', clan_id: 'CLAN-A', league_id: 'L-1', clan_league_id: 'CLAN-A-L1', sequence: 2, official_timestamp_utc: '2026-09-22T12:00:00Z', member_count: 2, capacity: 50, provenance: { evidence_refs: ['EV-1'] } },
    { snapshot_id: 'SB-1', clan_id: 'CLAN-B', league_id: 'L-2', clan_league_id: 'CLAN-B-L2', sequence: 1, official_timestamp_utc: '2026-09-26T12:00:00Z', member_count: 1, capacity: 50, provenance: { evidence_refs: ['EV-2'] } },
    { snapshot_id: 'SA-3', clan_id: 'CLAN-A', league_id: 'L-2', clan_league_id: 'CLAN-A-L2', sequence: 3, official_timestamp_utc: '2026-09-28T12:00:00Z', member_count: 2, capacity: 50, provenance: { evidence_refs: ['EV-1'] } }
  );

  function obs(id, snapshotId, clanId, sourceKey, playerId, overrides = {}) {
    return {
      observation_id: id,
      snapshot_id: snapshotId,
      clan_id: clanId,
      source_member_key: sourceKey,
      source_identity: { source_system: clanId === 'CLAN-B' ? 'GOLDENCROWN' : 'PERSIA', source_identity_id: sourceKey },
      global_player_id: playerId,
      membership_episode_id: null,
      identity_resolution_status: playerId ? 'CONFIRMED' : 'UNRESOLVED',
      display_name: playerId === 'GP-2' ? 'Player Two' : 'Player One',
      rank: 1,
      stage: 10,
      role: 'Member',
      weapons: { '25mm': 4, hydra: 3, hellfire: 2 },
      total_kills: 10000,
      lifetime_medals: { bronze: 2, silver: 1, gold: 0, platinum: 0 },
      current_league_clan_medals: 500,
      profile_total_clan_medal_count: 1200,
      last_online_utc: null,
      provenance: { evidence_refs: [clanId === 'CLAN-B' ? 'EV-2' : 'EV-1'] },
      ...overrides
    };
  }

  model.observations.push(
    obs('O-A1-P1', 'SA-1', 'CLAN-A', 'A1-P1', 'GP-1', { rank: 1 }),
    obs('O-A1-P2', 'SA-1', 'CLAN-A', 'A1-P2', 'GP-2', { rank: 2 }),
    obs('O-A2-P1', 'SA-2', 'CLAN-A', 'A2-P1', 'GP-1', { rank: 1, stage: 11, total_kills: 10850, current_league_clan_medals: 800, profile_total_clan_medal_count: 1500 }),
    obs('O-A2-P2', 'SA-2', 'CLAN-A', 'A2-P2', 'GP-2', { rank: 2, total_kills: 10100, profile_total_clan_medal_count: 1400 }),
    obs('O-B1-P1', 'SB-1', 'CLAN-B', 'B1-P1', 'GP-1', { rank: 1, stage: 11, total_kills: 11000, current_league_clan_medals: 120, profile_total_clan_medal_count: 120 }),
    obs('O-A3-P1', 'SA-3', 'CLAN-A', 'A3-P1', 'GP-1', { rank: 1, stage: 12, total_kills: 11250, current_league_clan_medals: 260, profile_total_clan_medal_count: 260 }),
    use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  emptyCanonicalModel,
  validateCanonicalModel,
  assertHistoryPreserved,
  buildDeltaResult
} = require('../src/canonical');
const {
  leagueWindowForTimestamp
} = require('../src/league');
const {
  validateLifetimeMetrics,
  currentLeagueClanMedalDelta,
  membershipEpisodeClanMedalContribution
} = require('../src/metrics');

function baseModel() {
  const model = emptyCanonicalModel();

  model.clans.push(
    { clan_id: 'CLAN-A', display_name: 'Clan A', status: 'ACTIVE' },
    { clan_id: 'CLAN-B', display_name: 'Clan B', status: 'ACTIVE' }
  );

  model.evidence_artifacts.push(
    { evidence_artifact_id: 'EV-1', artifact_type: 'fixture', content_hash: { algorithm: 'sha256', value: 'ev1' }, immutable: true },
    { evidence_artifact_id: 'EV-2', artifact_type: 'fixture', content_hash: { algorithm: 'sha256', value: 'ev2' }, immutable: true }
  );

  model.global_player_identities.push(
    { global_player_id: 'GP-1', status: 'ACTIVE' },
    { global_player_id: 'GP-2', status: 'ACTIVE' }
  );

  const l1 = leagueWindowForTimestamp('2026-09-20T12:00:00Z');
  const l2 = leagueWindowForTimestamp('2026-09-28T12:00:00Z');

  model.leagues.push(
    {
      league_id: 'L-1',
      name: null,
      starts_at_utc: l1.starts_at_utc,
      ends_at_utc: l1.ends_at_utc,
      sequence: 1,
      status: 'COMPLETED',
      completed_at_utc: l1.ends_at_utc,
      final_snapshot_id: null
    },
    {
      league_id: 'L-2',
      name: null,
      starts_at_utc: l2.starts_at_utc,
      ends_at_utc: l2.ends_at_utc,
      sequence: 2,
      status: 'ACTIVE',
      completed_at_utc: null,
      final_snapshot_id: null
    }
  );

  model.clan_leagues.push(
    { clan_league_id: 'CLAN-A-L1', clan_id: 'CLAN-A', league_id: 'L-1', status: 'COMPLETED', final_snapshot_id: null, opening_snapshot_id: 'SA-1' },
    { clan_league_id: 'CLAN-A-L2', clan_id: 'CLAN-A', league_id: 'L-2', status: 'ACTIVE', final_snapshot_id: null, opening_snapshot_id: null },
    { clan_league_id: 'CLAN-B-L2', clan_id: 'CLAN-B', league_id: 'L-2', status: 'ACTIVE', final_snapshot_id: null, opening_snapshot_id: null }
  );

  model.snapshots.push(
    { snapshot_id: 'SA-1', clan_id: 'CLAN-A', league_id: 'L-1', clan_league_id: 'CLAN-A-L1', sequence: 1, official_timestamp_utc: '2026-09-20T12:00:00Z', member_count: 2, capacity: 50, provenance: { evidence_refs: ['EV-1'] } },
    { snapshot_id: 'SA-2', clan_id: 'CLAN-A', league_id: 'L-1', clan_league_id: 'CLAN-A-L1', sequence: 2, official_timestamp_utc: '2026-09-22T12:00:00Z', member_count: 2, capacity: 50, provenance: { evidence_refs: ['EV-1'] } },
    { snapshot_id: 'SB-1', clan_id: 'CLAN-B', league_id: 'L-2', clan_league_id: 'CLAN-B-L2', sequence: 1, official_timestamp_utc: '2026-09-26T12:00:00Z', member_count: 1, capacity: 50, provenance: { evidence_refs: ['EV-2'] } },
    { snapshot_id: 'SA-3', clan_id: 'CLAN-A', league_id: 'L-2', clan_league_id: 'CLAN-A-L2', sequence: 3, official_timestamp_utc: '2026-09-28T12:00:00Z', member_count: 2, capacity: 50, provenance: { evidence_refs: ['EV-1'] } }
  );

  function obs(id, snapshotId, clanId, sourceKey, playerId, overrides = {}) {
    return {
      observation_id: id,
      snapshot_id: snapshotId,
      clan_id: clanId,
      source_member_key: sourceKey,
      source_identity: { source_system: clanId === 'CLAN-B' ? 'GOLDENCROWN' : 'PERSIA', source_identity_id: sourceKey },
      global_player_id: playerId,
      membership_episode_id: null,
      identity_resolution_status: playerId ? 'CONFIRMED' : 'UNRESOLVED',
      display_name: playerId === 'GP-2' ? 'Player Two' : 'Player One',
      rank: 1,
      stage: 10,
      role: 'Member',
      weapons: { '25mm': 4, hydra: 3, hellfire: 2 },
      total_kills: 10000,
      lifetime_medals: { bronze: 2, silver: 1, gold: 0, platinum: 0 },
      current_league_clan_medals: 500,
      profile_total_clan_medal_count: 1200,
      last_online_utc: null,
      provenance: { evidence_refs: [clanId === 'CLAN-B' ? 'EV-2' : 'EV-1'] },
      ...overrides
    };
  }

  model.observations.push(
    obs('O-A1-P1', 'SA-1', 'CLAN-A', 'A1-P1', 'GP-1', { rank: 1 }),
    obs('O-A1-P2', 'SA-1', 'CLAN-A', 'A1-P2', 'GP-2', { rank: 2 }),
    obs('O-A2-P1', 'SA-2', 'CLAN-A', 'A2-P1', 'GP-1', { rank: 1, stage: 11, total_kills: 10850, current_league_clan_medals: 800, profile_total_clan_medal_count: 1500 }),
    obs('O-A2-P2', 'SA-2', 'CLAN-A', 'A2-P2', 'GP-2', { rank: 2, total_kills: 10100, profile_total_clan_medal_count: 1400 }),
    obs('O-B1-P1', 'SB-1', 'CLAN-B', 'B1-P1', 'GP-1', { rank: 1, stage: 11, total_kills: 11000, current_league_clan_medals: 120, profile_total_clan_medal_count: 120 }),
    obs('O-A3-P1', 'SA-3', 'CLAN-A', 'A3-P1', 'GP-1', { rank: 1, stage: 12, total_kills: 11250, current_league_clan_medals: 260, profile_total_clan_medal_count: 260 }),
    obs('O-A3-P2', 'SA-3', 'CLAN-A', 'A3-P2', 'GP-2', { rank: 2, total_kills: 10300, current_league_clan_medals: 250, profile_total_clan_medal_count: 250 })
  );

  model.membership_episodes.push(
    { membership_episode_id: 'ME-GP1-A1', global_player_id: 'GP-1', clan_id: 'CLAN-A', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'SA-1', ended_at_utc: '2026-09-26T12:00:00Z', ended_by_event_id: 'MEV-TRANSFER-AB' },
    { membership_episode_id: 'ME-GP1-B1', global_player_id: 'GP-1', clan_id: 'CLAN-B', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'SB-1', ended_at_utc: '2026-09-28T12:00:00Z', ended_by_event_id: 'MEV-TRANSFER-BA' },
    { membership_episode_id: 'ME-GP1-A2', global_player_id: 'GP-1', clan_id: 'CLAN-A', sequence: 2, status: 'ACTIVE', started_from_snapshot_id: 'SA-3', ended_at_utc: null, ended_by_event_id: null },
    { membership_episode_id: 'ME-GP2-A1', global_player_id: 'GP-2', clan_id: 'CLAN-A', sequence: 1, status: 'ENDED', started_from_snapshot_id: 'SA-1', ended_at_utc: '2026-09-27T12:00:00Z', ended_by_event_id: 'MEV-LEAVE-GP2' },
    { membership_episode_id: 'ME-GP2-A2', global_player_id: 'GP-2', clan_id: 'CLAN-A', sequence: 2, status: 'ACTIVE', started_from_snapshot_id: 'SA-3', ended_at_utc: null, ended_by_event_id: null }
  );

  model.membership_events.push(
    { membership_event_id: 'MEV-JOIN-GP1', event_type: 'JOIN', global_player_id: 'GP-1', clan_id: 'CLAN-A', membership_episode_id: 'ME-GP1-A1', effective_at_utc: '2026-09-20T12:00:00Z', observed_snapshot_id: 'SA-1', evidence_refs: ['EV-1'], authority_ref: null, precision: 'snapshot' },
    { membership_event_id: 'MEV-TRANSFER-AB', event_type: 'TRANSFER', global_player_id: 'GP-1', clan_id: 'CLAN-B', membership_episode_id: 'ME-GP1-B1', effective_at_utc: '2026-09-26T12:00:00Z', observed_snapshot_id: 'SB-1', from_clan_id: 'CLAN-A', to_clan_id: 'CLAN-B', evidence_refs: ['EV-2'], authority_ref: null, precision: 'between_snapshots' },
    { membership_event_id: 'MEV-TRANSFER-BA', event_type: 'TRANSFER', global_player_id: 'GP-1', clan_id: 'CLAN-A', membership_episode_id: 'ME-GP1-A2', effective_at_utc: '2026-09-28T12:00:00Z', observed_snapshot_id: 'SA-3', from_clan_id: 'CLAN-B', to_clan_id: 'CLAN-A', evidence_refs: ['EV-1'], authority_ref: null, precision: 'snapshot' },
    { membership_event_id: 'MEV-JOIN-GP2', event_type: 'JOIN', global_player_id: 'GP-2', clan_id: 'CLAN-A', membership_episode_id: 'ME-GP2-A1', effective_at_utc: '2026-09-20T12:00:00Z', observed_snapshot_id: 'SA-1', evidence_refs: ['EV-1'], authority_ref: null, precision: 'snapshot' },
    { membership_event_id: 'MEV-LEAVE-GP2', event_type: 'LEAVE', global_player_id: 'GP-2', clan_id: 'CLAN-A', membership_episode_id: 'ME-GP2-A1', effective_at_utc: '2026-09-27T12:00:00Z', observed_snapshot_id: null, evidence_refs: ['EV-1'], authority_ref: null, precision: 'between_snapshots' },
    { membership_event_id: 'MEV-RETURN-GP2', event_type: 'RETURN', global_player_id: 'GP-2', clan_id: 'CLAN-A', membership_episode_id: 'ME-GP2-A2', effective_at_utc: '2026-09-28T12:00:00Z', observed_snapshot_id: 'SA-3', evidence_refs: ['EV-1'], authority_ref: null, precision: 'snapshot' }
  );

  model.resolution_cases.push({
    resolution_case_id: 'RC-P1',
    observation_id: 'O-A1-P1',
    status: 'CONFIRMED',
    candidate_global_player_ids: ['GP-1'],
    matched_global_player_id: 'GP-1',
    signals: { stage: true, total_kills: true, weapons: true },
    evidence_refs: ['EV-1'],
    authority_ref: null,
    process_ref: 'fixture-resolution',
    decided_at_utc: '2026-09-20T12:00:00Z',
    reason: 'fixture evidence'
  });

  return model;
}

test('Canonical model validates a continuous history', () => {
  const result = validateCanonicalModel(baseModel());
  assert.equal(result.valid, true);
});

test('Clan A -> Clan B keeps one Global Identity and separate episodes', () => {
  const model = baseModel();
  const result = validateCanonicalModel(model);
  assert.equal(result.valid, true);
  assert.equal(model.membership_episodes.filter((e) => e.global_player_id === 'GP-1').length, 3);
  assert.deepEqual(
    model.membership_episodes.filter((e) => e.global_player_id === 'GP-1').map((e) => e.clan_id),
    ['CLAN-A', 'CLAN-B', 'CLAN-A']
  );
});

test('Clan A -> Clan B -> Clan A preserves historical observations', () => {
  const model = baseModel();
  const observations = model.observations.filter((o) => o.global_player_id === 'GP-1');
  assert.deepEqual(observations.map((o) => o.clan_id), ['CLAN-A', 'CLAN-A', 'CLAN-B', 'CLAN-A']);
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Leave -> League boundary -> Return starts a new membership episode', () => {
  const model = baseModel();
  const prior = model.membership_episodes.find((e) => e.membership_episode_id === 'ME-GP2-A1');
  const returned = model.membership_episodes.find((e) => e.membership_episode_id === 'ME-GP2-A2');
  assert.equal(prior.status, 'ENDED');
  assert.equal(returned.sequence, 2);
  assert.equal(model.observations.find((o) => o.observation_id === 'O-A3-P2').profile_total_clan_medal_count, 250);
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Missing opening Snapshot does not move League start', () => {
  const model = baseModel();
  const league = model.leagues.find((l) => l.league_id === 'L-2');
  const late = model.snapshots.find((s) => s.snapshot_id === 'SB-1');
  assert.equal(late.clan_league_id, 'CLAN-B-L2');
  assert.equal(league.starts_at_utc, '2026-09-24T00:00:00.000Z');
  assert.ok(new Date(late.official_timestamp_utc).getTime() > new Date(league.starts_at_utc).getTime());
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Missing final Snapshot is distinct from completed League', () => {
  const model = baseModel();
  const league = model.leagues.find((l) => l.league_id === 'L-1');
  assert.equal(league.status, 'COMPLETED');
  assert.equal(league.completed_at_utc, league.ends_at_utc);
  assert.equal(league.final_snapshot_id, null);
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Late first Snapshot still binds inside the active League window', () => {
  const model = baseModel();
  const late = model.snapshots.find((s) => s.snapshot_id === 'SB-1');
  const league = model.leagues.find((l) => l.league_id === 'L-2');
  assert.ok(new Date(late.official_timestamp_utc) < new Date(league.ends_at_utc));
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Ambiguous identity is represented without a global player binding', () => {
  const model = baseModel();
  const observation = model.observations.find((o) => o.observation_id === 'O-B1-P1');
  observation.identity_resolution_status = 'AMBIGUOUS';
  observation.global_player_id = null;
  model.resolution_cases.push({
    resolution_case_id: 'RC-AMB',
    observation_id: observation.observation_id,
    status: 'AMBIGUOUS',
    candidate_global_player_ids: ['GP-1', 'GP-2'],
    matched_global_player_id: null,
    signals: { stage: 'match', total_kills: 'uncertain', weapons: 'match' },
    evidence_refs: ['EV-2'],
    authority_ref: null,
    process_ref: 'fixture-ambiguous',
    decided_at_utc: null,
    reason: null
  });
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Unresolved identity remains unbound and auditable', () => {
  const model = baseModel();
  const observation = model.observations.find((o) => o.observation_id === 'O-A3-P1');
  observation.identity_resolution_status = 'UNRESOLVED';
  observation.global_player_id = null;
  model.resolution_cases.push({
    resolution_case_id: 'RC-UNRES',
    observation_id: observation.observation_id,
    status: 'UNRESOLVED',
    candidate_global_player_ids: [],
    matched_global_player_id: null,
    signals: {},
    evidence_refs: [],
    authority_ref: null,
    process_ref: 'fixture-unresolved',
    decided_at_utc: null,
    reason: 'insufficient evidence'
  });
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Negative lifetime metric is stored as ANOMALY rather than corrected', () => {
  const previous = modelObservation(10000);
  const current = modelObservation(9990);
  const metrics = validateLifetimeMetrics(previous, current);
  assert.equal(metrics.total_kills.status, 'ANOMALY');

  const model = baseModel();
  model.delta_results.push(buildDeltaResult({
    deltaId: 'D-KILL-ANOMALY',
    currentObservationId: 'O-A2-P1',
    globalPlayerId: 'GP-1',
    metricKey: 'total_kills',
    scope: 'PLAYER_LIFETIME',
    baselineObservationId: 'O-A1-P1',
    baselineType: 'PREVIOUS_VALID_OBSERVATION',
    delta: -10,
    status: 'ANOMALY',
    reason: 'monotonic_metric_decreased'
  }));
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('League-scoped Current League Clan Medals use a League baseline', () => {
  const delta = currentLeagueClanMedalDelta({
    current: 120,
    previous: 950,
    sameLeague: false
  });
  assert.equal(delta.delta, 120);
  assert.equal(delta.reason, 'new_league_baseline_zero');

  const record = buildDeltaResult({
    deltaId: 'D-LCM-1',
    currentObservationId: 'O-B1-P1',
    globalPlayerId: 'GP-1',
    metricKey: 'current_league_clan_medals',
    scope: 'LEAGUE',
    clanId: 'CLAN-B',
    leagueId: 'L-2',
    baselineObservationId: null,
    baselineType: 'NEW_LEAGUE_ZERO',
    delta: delta.delta,
    status: delta.status,
    reason: delta.reason
  });

  const model = baseModel();
  model.delta_results.push(record);
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Membership Episode Clan Medal reset is a lifecycle baseline', () => {
  const delta = membershipEpisodeClanMedalContribution({
    current: 250,
    previous: 2100,
    sameEpisode: false,
    sameLeague: false
  });
  assert.equal(delta.delta, 250);
  assert.equal(delta.reason, 'new_membership_episode_from_zero');

  const model = baseModel();
  model.delta_results.push(buildDeltaResult({
    deltaId: 'D-MEP-RESET',
    currentObservationId: 'O-A3-P2',
    globalPlayerId: 'GP-2',
    metricKey: 'profile_total_clan_medal_count',
    scope: 'MEMBERSHIP_EPISODE',
    clanId: 'CLAN-A',
    membershipEpisodeId: 'ME-GP2-A2',
    baselineObservationId: null,
    baselineType: 'NEW_MEMBERSHIP_EPISODE_ZERO',
    delta: 250,
    status: 'VALID',
    reason: 'new_membership_episode_from_zero'
  }));
  assert.equal(validateCanonicalModel(model).valid, true);
});

test('Lifetime metrics survive Clan transfer', () => {
  const model = baseModel();
  const a = model.observations.find((o) => o.observation_id === 'O-A2-P1');
  const b = model.observations.find((o) => o.observation_id === 'O-B1-P1');
  const transferDelta = validateLifetimeMetrics(a, b);
  assert.equal(b.global_player_id, 'GP-1');
  assert.equal(transferDelta.total_kills.status, 'VALID');
  assert.equal(transferDelta.stage.status, 'VALID');
  assert.equal(transferDelta.stage.delta, 0);
});

test('Historical records remain unchanged after transfer additions', () => {
  const before = baseModel();
  const after = structuredClone(before);
  after.observations.push({
    observation_id: 'O-B1-NEW',
    snapshot_id: 'SB-1',
    clan_id: 'CLAN-B',
    source_member_key: 'B1-NEW',
    global_player_id: null,
    identity_resolution_status: 'UNRESOLVED',
    display_name: 'Future Candidate',
    rank: 2,
    stage: 9,
    role: 'Member',
    weapons: { '25mm': 2 },
    total_kills: 9000,
    lifetime_medals: { bronze: 0 },
    current_league_clan_medals: 50,
    profile_total_clan_medal_count: 50,
    provenance: { evidence_refs: ['EV-2'] }
  });
  assert.equal(assertHistoryPreserved(before, after), true);
});

test('Future Lifetime Medal Types remain extensible', () => {
  const model = baseModel();
  const observation = model.observations[0];
  observation.lifetime_medals.platinum_plus = 3;
  assert.equal(validateCanonicalModel(model).valid, true);
});

function modelObservation(totalKills) {
  return {
    stage: 10,
    weapons: { '25mm': 4 },
    total_kills: totalKills,
    lifetime_medals: { bronze: 2 }
  };
}
