'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  emptyCanonicalModel,
  validateCanonicalModel
} = require('../src/canonical');
const {
  RawExtractionSourceAdapter
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
  ProjectionEngine,
  stableStringify
} = require('../src/projection');
const {
  buildStaticDataBundle,
  serializeStaticDataBundle,
  hashStaticDataBundle
} = require('../src/static-data');

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

const CURRENT_LEAGUE_ID = AUTHORITY_CONTEXT.league.league_id;
const OLD_LEAGUE_ID = 'PILOT::LEAGUE::2026-09-17';
const HISTORY_EVIDENCE_ID = 'PERSIA-DELTA-TEST-HISTORY';

function readRawAndInput() {
  const fs = require('node:fs');
  const path = require('node:path');
  const raw = JSON.parse(fs.readFileSync(
    path.join(
      __dirname,
      '..',
      'examples',
      'pilots',
      'persia-s12',
      'raw-extraction.json'
    ),
    'utf8'
  ));

  const registry = new InMemoryEvidenceRegistry({
    artifacts: raw.source.artifacts
  });

  const input = new RawExtractionSourceAdapter().toSnapshotInput(
    raw,
    AUTHORITY_CONTEXT
  );

  assert.equal(validateSnapshotInputAgainstRegistry(registry, input).valid, true);

  return { raw, input, registry };
}

function seedDeltaCanonical() {
  const model = emptyCanonicalModel();

  model.clans.push({
    clan_id: 'PERSIA',
    display_name: 'PERSIA',
    status: 'ACTIVE',
    provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
  });

  model.leagues.push({
    league_id: OLD_LEAGUE_ID,
    name: null,
    starts_at_utc: '2026-09-17T00:00:00Z',
    ends_at_utc: '2026-09-24T00:00:00Z',
    sequence: 0,
    status: 'COMPLETED',
    completed_at_utc: '2026-09-24T00:00:00Z',
    provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
  });

  model.leagues.push({
    league_id: CURRENT_LEAGUE_ID,
    name: null,
    starts_at_utc: AUTHORITY_CONTEXT.league.starts_at_utc,
    ends_at_utc: AUTHORITY_CONTEXT.league.ends_at_utc,
    sequence: 1,
    status: 'ACTIVE',
    completed_at_utc: null,
    provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
  });

  const oldClanLeagueId = 'CLANLEAGUE::PERSIA::' + OLD_LEAGUE_ID;
  const currentClanLeagueId = 'CLANLEAGUE::PERSIA::' + CURRENT_LEAGUE_ID;

  model.clan_leagues.push({
    clan_league_id: oldClanLeagueId,
    clan_id: 'PERSIA',
    league_id: OLD_LEAGUE_ID,
    status: 'COMPLETED',
    final_snapshot_id: null,
    opening_snapshot_id: 'S11-DELTA-OLD',
    provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
  });

  model.clan_leagues.push({
    clan_league_id: currentClanLeagueId,
    clan_id: 'PERSIA',
    league_id: CURRENT_LEAGUE_ID,
    status: 'ACTIVE',
    final_snapshot_id: null,
    opening_snapshot_id: 'S12-DELTA-PREV',
    provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
  });

  model.snapshots.push({
    snapshot_id: 'S11-DELTA-OLD',
    clan_id: 'PERSIA',
    league_id: OLD_LEAGUE_ID,
    clan_league_id: oldClanLeagueId,
    sequence: 10,
    official_timestamp_utc: '2026-09-23T12:00:00Z',
    member_count: 1,
    capacity: 50,
    provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
  });

  model.snapshots.push({
    snapshot_id: 'S12-DELTA-PREV',
    clan_id: 'PERSIA',
    league_id: CURRENT_LEAGUE_ID,
    clan_league_id: currentClanLeagueId,
    sequence: 11,
    official_timestamp_utc: '2026-09-25T11:30:00Z',
    member_count: 1,
    capacity: 50,
    provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
  });

  model.global_player_identities.push(
    {
      global_player_id: 'GP-S12-KILL-001',
      status: 'ACTIVE',
      provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
    },
    {
      global_player_id: 'GP-S12-MEDAL-002',
      status: 'ACTIVE',
      provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
    },
    {
      global_player_id: 'GP-S12-NOBASELINE-003',
      status: 'ACTIVE',
      provenance: { evidence_refs: [HISTORY_EVIDENCE_ID] }
    }
  );

  model.observations.push({
    observation_id: 'S11-DELTA-OLD::PERSIA-S12-PREV-KILL',
    snapshot_id: 'S11-DELTA-OLD',
    clan_id: 'PERSIA',
    source_member_key: 'PERSIA-S12-PREV-KILL',
    source_identity: {
      source_system: 'PERSIA',
      source_identity_id: 'PERSIA-PREV-KILL'
    },
    global_player_id: 'GP-S12-KILL-001',
    membership_episode_id: null,
    identity_resolution_status: 'CONFIRMED',
    display_name: 'Delta Kill Baseline',
    rank: 1,
    stage: 60,
    role: 'Member',
    weapons: { '25mm': 7, hydra: 7 },
    total_kills: 275000,
    lifetime_medals: { bronze: 2, silver: 4, gold: 2 },
    current_league_clan_medals: 100000,
    profile_total_clan_medal_count: 100000,
    last_online_utc: null,
    provenance: {
      evidence_refs: [HISTORY_EVIDENCE_ID]
    }
  });

  model.observations.push({
    observation_id: 'S12-DELTA-PREV::PERSIA-S12-PREV-MEDAL',
    snapshot_id: 'S12-DELTA-PREV',
    clan_id: 'PERSIA',
    source_member_key: 'PERSIA-S12-PREV-MEDAL',
    source_identity: {
      source_system: 'PERSIA',
      source_identity_id: 'PERSIA-PREV-MEDAL'
    },
    global_player_id: 'GP-S12-MEDAL-002',
    membership_episode_id: null,
    identity_resolution_status: 'CONFIRMED',
    display_name: 'Delta Medal Baseline',
    rank: 2,
    stage: 61,
    role: 'Member',
    weapons: { '25mm': 7, hydra: 7 },
    total_kills: 315000,
    lifetime_medals: { bronze: 3, silver: 4, gold: 2 },
    current_league_clan_medals: 130000,
    profile_total_clan_medal_count: 130000,
    last_online_utc: null,
    provenance: {
      evidence_refs: [HISTORY_EVIDENCE_ID]
    }
  });

  model.evidence_artifacts.push({
    evidence_artifact_id: HISTORY_EVIDENCE_ID,
    artifact_type: 'test-historical-baseline',
    content_hash: {
      algorithm: 'sha256',
      value: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
    },
    source_location: 'test://ucs/delta/history',
    received_at_utc: null,
    immutable: true
  });

  validateCanonicalModel(model);
  return model;
}

function prepareS12({
  confirmed = [],
  previousByGlobalPlayerId = {},
  membershipBySourceKey = {},
  globalPlayerIds = []
} = {}) {
  const { raw, input, registry } = readRawAndInput();

  const decisionsBySourceKey = {};
  for (const item of confirmed) {
    decisionsBySourceKey[item.sourceMemberKey] = {
      status: 'CONFIRMED',
      global_player_id: item.globalPlayerId,
      candidate_global_player_ids: [item.globalPlayerId],
      signals: {
        source: 'external-test-review',
        matched_on: item.matchedOn || ['explicit-external-confirmation']
      },
      evidence_refs: ['PERSIA-S12-RANKING-HTML'],
      authority_ref: 'AUTH-DELTA-TEST-001',
      process_ref: 'external-review-test-v1',
      decided_at_utc: '2026-09-27T00:00:00Z',
      reason: 'test-only external confirmation'
    };
  }

  const plan = prepareSnapshotTransaction(input, {
    evidenceRegistry: registry,
    identityDecisionsBySourceKey: decisionsBySourceKey,
    previousByGlobalPlayerId,
    membershipBySourceKey
  });

  const canonicalSeed = seedDeltaCanonical();

  for (const globalPlayerId of globalPlayerIds) {
    assert.ok(
      canonicalSeed.global_player_identities.some(
        (player) => player.global_player_id === globalPlayerId
      )
    );
  }

  return { raw, input, plan, canonicalSeed };
}

function confirmedPlayers() {
  return [
    {
      sourceMemberKey: 'PERSIA-S12-RANK-01',
      globalPlayerId: 'GP-S12-KILL-001',
      matchedOn: ['stage', 'total_kills', 'weapons']
    },
    {
      sourceMemberKey: 'PERSIA-S12-RANK-02',
      globalPlayerId: 'GP-S12-MEDAL-002',
      matchedOn: ['stage', 'total_kills', 'weapons']
    }
  ];
}

function previousContext() {
  const seed = seedDeltaCanonical();
  return {
    'GP-S12-KILL-001': seed.observations.find(
      (observation) => observation.global_player_id === 'GP-S12-KILL-001'
    ),
    'GP-S12-MEDAL-002': seed.observations.find(
      (observation) => observation.global_player_id === 'GP-S12-MEDAL-002'
    )
  };
}

function executeCommittedS12(options = {}) {
  const { plan, canonicalSeed } = prepareS12({
    confirmed: confirmedPlayers(),
    previousByGlobalPlayerId: options.previousByGlobalPlayerId || previousContext(),
    membershipBySourceKey: options.membershipBySourceKey || {
      'PERSIA-S12-RANK-01': { same_league: false },
      'PERSIA-S12-RANK-02': { same_league: true }
    }
  });

  const adapter = new InMemoryAtomicPersistenceAdapter(canonicalSeed);
  const result = adapter.commit(plan.persistence.transaction, {
    allowReviewPersistence: true
  });

  assert.equal(result.committed, true);
  return {
    plan,
    result,
    canonical: adapter.read()
  };
}

test('Delta materialization: confirmed real S12 identities produce lifetime and league deltas', () => {
  const { plan, result, canonical } = executeCommittedS12();
  const deltas = plan.persistence.transaction.canonical_patch.delta_results;

  assert.equal(plan.transaction_status, 'REVIEW_REQUIRED');
  assert.equal(result.result, 'REVIEW_REQUIRED');
  assert.equal(deltas.length, 4);

  const kill = deltas.find(
    (delta) =>
      delta.scope === 'PLAYER_LIFETIME' &&
      delta.global_player_id === 'GP-S12-KILL-001'
  );
  assert.deepEqual(kill, {
    delta_id: 'DELTA::PLAYER_LIFETIME::total_kills::S12::PERSIA-S12-RANK-01',
    current_observation_id: 'S12::PERSIA-S12-RANK-01',
    global_player_id: 'GP-S12-KILL-001',
    baseline_observation_id: 'S11-DELTA-OLD::PERSIA-S12-PREV-KILL',
    baseline_type: 'PREVIOUS_VALID_OBSERVATION',
    metric_key: 'total_kills',
    scope: 'PLAYER_LIFETIME',
    clan_id: null,
    league_id: null,
    membership_episode_id: null,
    delta: 1191,
    status: 'VALID',
    reason: null
  });

  const league = deltas.find(
    (delta) =>
      delta.scope === 'LEAGUE' &&
      delta.global_player_id === 'GP-S12-MEDAL-002'
  );
  assert.deepEqual(league, {
    delta_id: 'DELTA::LEAGUE::current_league_clan_medals::S12::PERSIA-S12-RANK-02',
    current_observation_id: 'S12::PERSIA-S12-RANK-02',
    global_player_id: 'GP-S12-MEDAL-002',
    baseline_observation_id: 'S12-DELTA-PREV::PERSIA-S12-PREV-MEDAL',
    baseline_type: 'PREVIOUS_VALID_OBSERVATION',
    metric_key: 'current_league_clan_medals',
    scope: 'LEAGUE',
    clan_id: 'PERSIA',
    league_id: CURRENT_LEAGUE_ID,
    membership_episode_id: null,
    delta: 5924,
    status: 'VALID',
    reason: null
  });

  assert.equal(canonical.delta_results.length, 4);
  assert.equal(canonical.global_player_identities.length, 3);
  assert.equal(
    canonical.observations.find(
      (observation) => observation.observation_id === 'S12::PERSIA-S12-RANK-01'
    ).global_player_id,
    'GP-S12-KILL-001'
  );
  assert.equal(
    canonical.observations.find(
      (observation) => observation.observation_id === 'S12::PERSIA-S12-RANK-02'
    ).global_player_id,
    'GP-S12-MEDAL-002'
  );
  assert.equal(validateCanonicalModel(canonical).valid, true);
});

test('Delta materialization: missing lifetime baseline is explicit and not fabricated', () => {
  const { plan } = prepareS12({
    confirmed: [{
      sourceMemberKey: 'PERSIA-S12-RANK-03',
      globalPlayerId: 'GP-S12-NOBASELINE-003'
    }]
  });

  const delta = plan.persistence.transaction.canonical_patch.delta_results.find(
    (item) =>
      item.scope === 'PLAYER_LIFETIME' &&
      item.global_player_id === 'GP-S12-NOBASELINE-003'
  );

  assert.ok(delta);
  assert.equal(delta.status, 'BASELINE_UNAVAILABLE');
  assert.equal(delta.delta, null);
  assert.equal(delta.baseline_observation_id, null);
  assert.equal(delta.baseline_type, 'NONE');
  assert.equal(delta.reason, 'previous_valid_observation_missing');
});

test('Delta materialization: new League Current League Clan Medal baseline is zero', () => {
  const { plan } = prepareS12({
    confirmed: [{
      sourceMemberKey: 'PERSIA-S12-RANK-01',
      globalPlayerId: 'GP-S12-KILL-001'
    }],
    previousByGlobalPlayerId: previousContext(),
    membershipBySourceKey: {
      'PERSIA-S12-RANK-01': { same_league: false }
    }
  });

  const delta = plan.persistence.transaction.canonical_patch.delta_results.find(
    (item) =>
      item.scope === 'LEAGUE' &&
      item.global_player_id === 'GP-S12-KILL-001'
  );

  assert.deepEqual(delta, {
    delta_id: 'DELTA::LEAGUE::current_league_clan_medals::S12::PERSIA-S12-RANK-01',
    current_observation_id: 'S12::PERSIA-S12-RANK-01',
    global_player_id: 'GP-S12-KILL-001',
    baseline_observation_id: null,
    baseline_type: 'NEW_LEAGUE_ZERO',
    metric_key: 'current_league_clan_medals',
    scope: 'LEAGUE',
    clan_id: 'PERSIA',
    league_id: CURRENT_LEAGUE_ID,
    membership_episode_id: null,
    delta: 140313,
    status: 'VALID',
    reason: 'new_league_baseline_zero'
  });
});

test('Delta materialization: monotonic Total Kills decrease blocks the confirmed identity match', () => {
  const previous = previousContext();
  previous['GP-S12-KILL-001'] = {
    ...previous['GP-S12-KILL-001'],
    total_kills: 276201
  };

  const { plan } = prepareS12({
    confirmed: [{
      sourceMemberKey: 'PERSIA-S12-RANK-01',
      globalPlayerId: 'GP-S12-KILL-001'
    }],
    previousByGlobalPlayerId: previous
  });

  const member = plan.members.find((item) => item.source_member_key === 'PERSIA-S12-RANK-01');
  assert.ok(member);
  assert.equal(member.identity_resolution.status, 'CONTRADICTION');
  assert.equal(member.identity_resolution.global_player_id, null);
  assert.ok(plan.review_reasons.some((item) =>
    item.source_member_key === 'PERSIA-S12-RANK-01' &&
    item.reason === 'identity_resolution_not_confirmed'
  ));
  assert.ok(plan.review_reasons.some((item) =>
    item.source_member_key === 'PERSIA-S12-RANK-01' &&
    item.reason === 'monotonic_continuity_contradiction'
  ));
  assert.equal(
    plan.persistence.transaction.canonical_patch.delta_results.some(
      (item) => item.current_observation_id === 'S12::PERSIA-S12-RANK-01'
    ),
    false
  );
});

test('Delta materialization: unresolved S12 observations receive no identity-bound deltas', () => {
  const { plan } = prepareS12({
    confirmed: []
  });

  assert.equal(plan.persistence.transaction.canonical_patch.delta_results.length, 0);
});

test('Delta materialization: missing confirmed Global Player reference fails closed', () => {
  const { plan, canonicalSeed } = prepareS12({
    confirmed: [{
      sourceMemberKey: 'PERSIA-S12-RANK-01',
      globalPlayerId: 'GP-MISSING-001'
    }]
  });

  const adapter = new InMemoryAtomicPersistenceAdapter(canonicalSeed);
  const before = adapter.read();
  const result = adapter.commit(plan.persistence.transaction);

  assert.equal(result.result, 'CONFLICT');
  assert.equal(result.committed, false);
  assert.equal(result.state_changed, false);
  assert.match(
    result.reason,
    /confirmed_global_player_identity_missing:GP-MISSING-001/
  );
  assert.deepEqual(adapter.read(), before);
});

test('Delta materialization: Canonical → Projection → Static remains valid', () => {
  const { canonical } = executeCommittedS12();

  const projection = new ProjectionEngine().projectAll(canonical);
  const staticBundle = buildStaticDataBundle(canonical);

  assert.equal(validateCanonicalModel(canonical).valid, true);
  assert.equal(projection.global_players.length, 3);
  assert.equal(
    projection.snapshots.find((snapshot) => snapshot.snapshot_id === 'S12').members.length,
    50
  );
  assert.equal(staticBundle.read_model.snapshots.find(
    (snapshot) => snapshot.snapshot_id === 'S12'
  ).members.length, 50);
  assert.match(
    serializeStaticDataBundle(staticBundle),
    /"static_data_version":"0.1"/
  );
  assert.match(hashStaticDataBundle(staticBundle), /^[a-f0-9]{64}$/);
});

test('Delta materialization: repeated planning is deterministic', () => {
  const previous = previousContext();
  const context = {
    confirmed: confirmedPlayers(),
    previousByGlobalPlayerId: previous,
    membershipBySourceKey: {
      'PERSIA-S12-RANK-01': { same_league: false },
      'PERSIA-S12-RANK-02': { same_league: true }
    }
  };

  const first = prepareS12(context).plan.persistence.transaction;
  const second = prepareS12(context).plan.persistence.transaction;

  assert.deepEqual(second, first);
  assert.equal(second.plan_hash, first.plan_hash);
  assert.deepEqual(
    second.canonical_patch.delta_results,
    first.canonical_patch.delta_results
  );
});

test('Delta materialization: identical persistence replay is idempotent with no duplicate deltas', () => {
  const first = executeCommittedS12();
  const seed = seedDeltaCanonical();
  const adapter = new InMemoryAtomicPersistenceAdapter(seed);

  const firstCommit = adapter.commit(first.plan.persistence.transaction, {
    allowReviewPersistence: true
  });
  const replay = adapter.commit(first.plan.persistence.transaction, {
    allowReviewPersistence: true
  });

  assert.equal(firstCommit.result, 'REVIEW_REQUIRED');
  assert.equal(firstCommit.committed, true);
  assert.equal(replay.result, 'IDEMPOTENT_REPLAY');
  assert.equal(replay.committed, false);
  assert.equal(replay.state_changed, false);
  assert.equal(adapter.read().delta_results.length, 4);
  assert.equal(adapter.read().global_player_identities.length, 3);
});

test('Delta materialization: only PLAYER_LIFETIME and LEAGUE scopes are persisted', () => {
  const { plan } = executeCommittedS12();
  const scopes = new Set(
    plan.persistence.transaction.canonical_patch.delta_results.map(
      (delta) => delta.scope
    )
  );

  assert.deepEqual([...scopes].sort(), ['LEAGUE', 'PLAYER_LIFETIME']);
  assert.equal(
    plan.persistence.transaction.canonical_patch.delta_results.some(
      (delta) => delta.scope === 'MEMBERSHIP_EPISODE'
    ),
    false
  );
});



test('Delta projection: Canonical delta_results are exposed unchanged', () => {
  const { canonical } = executeCommittedS12();
  const before = stableStringify(canonical);
  const projection = new ProjectionEngine().projectAll(canonical);

  assert.equal(projection.delta_results.length, canonical.delta_results.length);

  for (const delta of canonical.delta_results) {
    const projected = projection.delta_results.find(
      (item) => item.delta_id === delta.delta_id
    );
    assert.ok(projected);
    assert.deepEqual(
      Object.fromEntries(
        [
          'delta_id',
          'current_observation_id',
          'global_player_id',
          'baseline_observation_id',
          'baseline_type',
          'metric_key',
          'scope',
          'clan_id',
          'league_id',
          'membership_episode_id',
          'delta',
          'status',
          'reason'
        ].map((key) => [key, projected[key]])
      ),
      delta
    );
  }

  assert.equal(stableStringify(canonical), before);
});

test('Delta projection: S12 Total Kills and League values are preserved exactly', () => {
  const { canonical } = executeCommittedS12();
  const projected = new ProjectionEngine().projectDeltaResults(canonical);

  const kill = projected.find(
    (delta) =>
      delta.scope === 'PLAYER_LIFETIME' &&
      delta.metric_key === 'total_kills' &&
      delta.global_player_id === 'GP-S12-KILL-001'
  );
  const league = projected.find(
    (delta) =>
      delta.scope === 'LEAGUE' &&
      delta.metric_key === 'current_league_clan_medals' &&
      delta.global_player_id === 'GP-S12-MEDAL-002'
  );

  assert.equal(kill.delta, 1191);
  assert.equal(kill.status, 'VALID');
  assert.equal(kill.baseline_observation_id, 'S11-DELTA-OLD::PERSIA-S12-PREV-KILL');

  assert.equal(league.delta, 5924);
  assert.equal(league.status, 'VALID');
  assert.equal(league.baseline_observation_id, 'S12-DELTA-PREV::PERSIA-S12-PREV-MEDAL');
});

test('Delta projection: edge states, baseline metadata and anomaly reason are preserved', () => {
  const { canonical } = executeCommittedS12();
  canonical.delta_results.push(
    {
      delta_id: 'D-EDGE-BASELINE-UNAVAILABLE',
      current_observation_id: 'S12::PERSIA-S12-RANK-01',
      global_player_id: 'GP-S12-KILL-001',
      baseline_observation_id: null,
      baseline_type: 'NONE',
      metric_key: 'total_kills',
      scope: 'PLAYER_LIFETIME',
      clan_id: null,
      league_id: null,
      membership_episode_id: null,
      delta: null,
      status: 'BASELINE_UNAVAILABLE',
      reason: 'previous_valid_observation_missing'
    },
    {
      delta_id: 'D-EDGE-ANOMALY',
      current_observation_id: 'S12::PERSIA-S12-RANK-01',
      global_player_id: 'GP-S12-KILL-001',
      baseline_observation_id: 'S11-DELTA-OLD::PERSIA-S12-PREV-KILL',
      baseline_type: 'PREVIOUS_VALID_OBSERVATION',
      metric_key: 'total_kills',
      scope: 'PLAYER_LIFETIME',
      clan_id: null,
      league_id: null,
      membership_episode_id: null,
      delta: null,
      status: 'ANOMALY',
      reason: 'monotonic_metric_decreased'
    }
  );
  validateCanonicalModel(canonical);

  const projected = new ProjectionEngine().projectDeltaResults(canonical);
  const baselineUnavailable = projected.find(
    (delta) => delta.delta_id === 'D-EDGE-BASELINE-UNAVAILABLE'
  );
  const anomaly = projected.find(
    (delta) => delta.delta_id === 'D-EDGE-ANOMALY'
  );
  const newLeague = projected.find(
    (delta) => delta.baseline_type === 'NEW_LEAGUE_ZERO'
  );

  assert.equal(baselineUnavailable.status, 'BASELINE_UNAVAILABLE');
  assert.equal(baselineUnavailable.delta, null);
  assert.equal(baselineUnavailable.baseline_observation_id, null);

  assert.equal(anomaly.status, 'ANOMALY');
  assert.equal(anomaly.delta, null);
  assert.equal(anomaly.reason, 'monotonic_metric_decreased');
  assert.equal(
    anomaly.baseline_observation_id,
    'S11-DELTA-OLD::PERSIA-S12-PREV-KILL'
  );

  assert.ok(newLeague);
  assert.equal(newLeague.status, 'VALID');
  assert.equal(newLeague.baseline_type, 'NEW_LEAGUE_ZERO');
});

test('Delta projection: provenance is derived only from referenced Canonical observations', () => {
  const { canonical } = executeCommittedS12();
  const kill = new ProjectionEngine().projectDeltaResults(canonical).find(
    (delta) =>
      delta.scope === 'PLAYER_LIFETIME' &&
      delta.metric_key === 'total_kills' &&
      delta.global_player_id === 'GP-S12-KILL-001'
  );

  assert.equal(kill.provenance.canonical_ref, kill.delta_id);
  assert.deepEqual(
    kill.provenance.evidence_refs.sort(),
    ['PERSIA-DELTA-TEST-HISTORY', 'PERSIA-S12-PROFILE-JSON', 'PERSIA-S12-RANKING-HTML'].sort()
  );

  assert.ok(
    canonical.observations
      .find((observation) => observation.observation_id === kill.current_observation_id)
      .provenance.evidence_refs.includes('PERSIA-S12-RANKING-HTML')
  );
  assert.ok(
    canonical.observations
      .find((observation) => observation.observation_id === kill.baseline_observation_id)
      .provenance.evidence_refs.includes('PERSIA-DELTA-TEST-HISTORY')
  );
});

test('Delta projection: unsupported Membership-Episode scope is not exposed by this bounded Read Model', () => {
  const { canonical } = executeCommittedS12();
  canonical.delta_results.push({
    delta_id: 'D-UNSUPPORTED-MEMBERSHIP',
    current_observation_id: 'S12::PERSIA-S12-RANK-01',
    global_player_id: 'GP-S12-KILL-001',
    baseline_observation_id: null,
    baseline_type: 'NEW_MEMBERSHIP_EPISODE_ZERO',
    metric_key: 'profile_total_clan_medal_count',
    scope: 'MEMBERSHIP_EPISODE',
    clan_id: 'PERSIA',
    league_id: null,
    membership_episode_id: 'MISSING-EPISODE',
    delta: 1,
    status: 'VALID',
    reason: null
  });
  canonical.membership_episodes = [
    {
      membership_episode_id: 'MISSING-EPISODE',
      global_player_id: 'GP-S12-KILL-001',
      clan_id: 'PERSIA',
      sequence: 1,
      status: 'ACTIVE',
      started_from_snapshot_id: 'S12',
      ended_at_utc: null,
      ended_by_event_id: null,
      provenance: { evidence_refs: ['PERSIA-S12-RANKING-HTML'] }
    }
  ];
  validateCanonicalModel(canonical);

  const projected = new ProjectionEngine().projectDeltaResults(canonical);

  assert.equal(
    projected.some((delta) => delta.delta_id === 'D-UNSUPPORTED-MEMBERSHIP'),
    false
  );
});

test('Delta projection: projection is deterministic and does not mutate Canonical', () => {
  const { canonical } = executeCommittedS12();
  const before = stableStringify(canonical);
  const projector = new ProjectionEngine();

  const first = stableStringify(projector.projectAll(canonical));
  const second = stableStringify(projector.projectAll(structuredClone(canonical)));

  assert.equal(first, second);
  assert.equal(stableStringify(canonical), before);
  assert.deepEqual(
    canonical.global_player_identities.map((item) => item.global_player_id),
    ['GP-S12-KILL-001', 'GP-S12-MEDAL-002', 'GP-S12-NOBASELINE-003']
  );
});

test('Delta projection: Static Data contains projected Deltas with deterministic serialization', () => {
  const { canonical } = executeCommittedS12();
  const first = buildStaticDataBundle(canonical);
  const second = buildStaticDataBundle(structuredClone(canonical));

  assert.deepEqual(first.read_model.delta_results, second.read_model.delta_results);
  assert.deepEqual(
    first.read_model.delta_results.map((delta) => delta.delta_id),
    ['DELTA::LEAGUE::current_league_clan_medals::S12::PERSIA-S12-RANK-01',
     'DELTA::LEAGUE::current_league_clan_medals::S12::PERSIA-S12-RANK-02',
     'DELTA::PLAYER_LIFETIME::total_kills::S12::PERSIA-S12-RANK-01',
     'DELTA::PLAYER_LIFETIME::total_kills::S12::PERSIA-S12-RANK-02']
  );
  assert.equal(
    first.read_model.delta_results.find(
      (delta) => delta.global_player_id === 'GP-S12-MEDAL-002' && delta.scope === 'LEAGUE'
    ).delta,
    5924
  );

  const serializedFirst = serializeStaticDataBundle(first);
  const serializedSecond = serializeStaticDataBundle(second);
  assert.equal(serializedFirst, serializedSecond);
  assert.equal(hashStaticDataBundle(first), hashStaticDataBundle(second));
  assert.ok(first.provenance.canonical_refs.includes(
    'DELTA::PLAYER_LIFETIME::total_kills::S12::PERSIA-S12-RANK-01'
  ));
});
