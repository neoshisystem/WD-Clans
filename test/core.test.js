'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  leagueWindowForTimestamp,
  bindSnapshotToLeague,
  leagueStatusAt,
  resolveIdentity,
  classifyMembership,
  resolveAbsenceToLeave,
  validateTransferResolution,
  monotonicDelta,
  currentLeagueClanMedalDelta,
  membershipEpisodeClanMedalContribution,
  validateLifetimeMetrics
} = require('../src');

function observation(overrides = {}) {
  return {
    stage: 10,
    weapons: { '25mm': 4, hydra: 3, hellfire: 2 },
    total_kills: 10000,
    lifetime_medals: { bronze: 2, silver: 1, gold: 0 },
    current_league_clan_medals: 500,
    profile_total_clan_medal_count: 1200,
    ...overrides
  };
}

test('League binding handles a late first Snapshot and fixed weekly boundary', () => {
  const late = '2026-09-26T12:00:00Z'; // Saturday
  const window = leagueWindowForTimestamp(late);
  assert.equal(window.starts_at_utc, '2026-09-24T00:00:00.000Z');
  assert.equal(window.ends_at_utc, '2026-10-01T00:00:00.000Z');

  const binding = bindSnapshotToLeague(late, {
    league_id: 'LEAGUE-2026-09-24',
    starts_at_utc: window.starts_at_utc,
    ends_at_utc: window.ends_at_utc
  });
  assert.equal(binding.league_id, 'LEAGUE-2026-09-24');

  const statusBeforeEnd = leagueStatusAt({
    league_id: 'LEAGUE-2026-09-24',
    starts_at_utc: window.starts_at_utc,
    ends_at_utc: window.ends_at_utc
  }, '2026-09-30T23:59:59Z');
  const statusAfterEnd = leagueStatusAt({
    league_id: 'LEAGUE-2026-09-24',
    starts_at_utc: window.starts_at_utc,
    ends_at_utc: window.ends_at_utc
  }, '2026-10-01T00:00:00Z');
  assert.equal(statusBeforeEnd, 'ACTIVE');
  assert.equal(statusAfterEnd, 'COMPLETED');
});

test('Normal continuous membership preserves identity and computes lifetime/league deltas', () => {
  const previous = observation();
  const current = observation({
    stage: 11,
    weapons: { '25mm': 5, hydra: 3, hellfire: 2 },
    total_kills: 10850,
    lifetime_medals: { bronze: 3, silver: 1, gold: 1 },
    current_league_clan_medals: 800,
    profile_total_clan_medal_count: 1500
  });

  assert.equal(classifyMembership({
    currentObserved: true,
    priorEpisodeExists: true,
    priorObservationObserved: true,
    priorEpisodeEnded: false
  }), 'CONTINUE');

  assert.equal(resolveIdentity({ observation: current, candidates: [] }).status, 'CANDIDATE');

  assert.equal(monotonicDelta(current.total_kills, previous.total_kills, 'total_kills').delta, 850);
  assert.equal(currentLeagueClanMedalDelta({
    current: current.current_league_clan_medals,
    previous: previous.current_league_clan_medals,
    sameLeague: true
  }).delta, 300);

  const lifetime = validateLifetimeMetrics(previous, current);
  assert.equal(lifetime.total_kills.status, 'VALID');
  assert.equal(lifetime.stage.delta, 1);
  assert.equal(lifetime.weapons['25mm'].delta, 1);
  assert.equal(lifetime.lifetime_medals.bronze.delta, 1);
});

test('Clan transfer keeps Global Identity but isolates clan membership', () => {
  const resolved = resolveIdentity({
    observation: observation(),
    candidates: [{ observation: observation({ total_kills: 10010 }) }],
    resolutionDecision: {
      status: 'CONFIRMED',
      global_player_id: 'GP-TEST-001',
      authority_ref: 'AUTH-TEST-001',
      evidence_refs: ['EV-TEST-001'],
      decided_at_utc: '2026-09-25T12:00:00Z',
      reason: 'explicit test decision'
    }
  });
  assert.equal(resolved.status, 'CONFIRMED');
  assert.equal(resolved.global_player_id, 'GP-TEST-001');

  const transfer = validateTransferResolution({
    globalPlayerId: resolved.global_player_id,
    fromClanId: 'CLAN-A',
    toClanId: 'CLAN-B',
    evidenceRefs: ['EV-TRANSFER-001']
  });
  assert.equal(transfer.status, 'POSSIBLE_TRANSFER');

  assert.equal(classifyMembership({
    currentObserved: false,
    priorEpisodeExists: true,
    priorObservationObserved: true,
    priorEpisodeEnded: false
  }), 'NOT_OBSERVED');

  assert.equal(classifyMembership({
    currentObserved: true,
    priorEpisodeExists: false,
    priorObservationObserved: false,
    priorEpisodeEnded: false
  }), 'JOIN');
});

test('Leave -> Return creates a new episode and resets episode-scoped Clan Medal total', () => {
  const absence = classifyMembership({
    currentObserved: false,
    priorEpisodeExists: true,
    priorObservationObserved: true,
    priorEpisodeEnded: false
  });
  assert.equal(absence, 'NOT_OBSERVED');

  assert.throws(
    () => resolveAbsenceToLeave({ event: 'LEAVE' }),
    /requires authority_ref or evidence_refs/
  );

  const leave = resolveAbsenceToLeave({
    event: 'LEAVE',
    evidenceRefs: ['EV-LEAVE-001']
  });
  assert.equal(leave.status, 'LEAVE');

  const returned = classifyMembership({
    currentObserved: true,
    priorEpisodeExists: true,
    priorObservationObserved: false,
    priorEpisodeEnded: true
  });
  assert.equal(returned, 'RETURN');

  const contribution = membershipEpisodeClanMedalContribution({
    current: 250,
    previous: 2100,
    sameEpisode: false,
    sameLeague: false
  });
  assert.equal(contribution.delta, 250);
  assert.equal(contribution.reason, 'new_membership_episode_from_zero');
});

test('Missing opening Snapshot does not block lifetime Kill Delta across League boundary', () => {
  const result = monotonicDelta(10850, 10000, 'total_kills');
  assert.deepEqual(result, {
    status: 'VALID',
    metric: 'total_kills',
    delta: 850,
    reason: null
  });

  const newLeagueMedals = currentLeagueClanMedalDelta({
    current: 120,
    previous: 950,
    sameLeague: false
  });
  assert.equal(newLeagueMedals.status, 'VALID');
  assert.equal(newLeagueMedals.delta, 120);
  assert.equal(newLeagueMedals.reason, 'new_league_baseline_zero');

  const profileEpisode = membershipEpisodeClanMedalContribution({
    current: 120,
    previous: 1750,
    sameEpisode: true,
    sameLeague: false
  });
  assert.equal(profileEpisode.status, 'VALID');
  assert.equal(profileEpisode.delta, 120);
});

test('Monotonic lifetime decrease is an anomaly, not an automatic reset', () => {
  const anomaly = monotonicDelta(9990, 10000, 'total_kills');
  assert.equal(anomaly.status, 'ANOMALY');
  assert.equal(anomaly.delta, -10);
  assert.equal(anomaly.reason, 'monotonic_metric_decreased');
});


test('Snapshot transaction plan blocks unresolved identity without side effects', () => {
  const { prepareSnapshotTransaction } = require('../src');
  const window = leagueWindowForTimestamp('2026-09-26T12:00:00Z');
  const input = {
    project_id: 'UCS',
    clan_id: 'CLAN-A',
    schema_version: '0.1',
    snapshot: {
      snapshot_id: 'S-TEST-001',
      sequence: 1,
      official_timestamp_utc: '2026-09-26T12:00:00Z',
      member_count: 1,
      capacity: 50
    },
    league: {
      league_id: 'LEAGUE-2026-09-24',
      starts_at_utc: window.starts_at_utc,
      ends_at_utc: window.ends_at_utc
    },
    source: {
      artifact_id: 'EV-TEST-SNAPSHOT-001',
      artifact_type: 'test-fixture',
      content_hash: { algorithm: 'sha256', value: 'test-hash' }
    },
    members: [{
      source_member_key: 'ROW-001',
      rank: 1,
      display_name: 'Player A',
      role: 'Member',
      stage: 10,
      weapons: { '25mm': 4 },
      total_kills: 10000,
      lifetime_medals: { bronze: 2 },
      current_league_clan_medals: 100,
      profile_total_clan_medal_count: 100
    }]
  };

  const plan = prepareSnapshotTransaction(input);
  assert.equal(plan.transaction_status, 'REVIEW_REQUIRED');
  assert.equal(plan.persistence.side_effects_executed, false);
  assert.equal(plan.members[0].identity_resolution.status, 'UNRESOLVED');
  assert.equal(plan.review_reasons[0].reason, 'identity_resolution_not_confirmed');
});
