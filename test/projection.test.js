'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  emptyCanonicalModel,
  validateCanonicalModel
} = require('../src/canonical');
const {
  ProjectionEngine,
  stableStringify
} = require('../src/projection');

const HASH_A = 'a'.repeat(64);
const HASH_B = 'b'.repeat(64);

function artifact(id, hash = HASH_A) {
  return {
    evidence_artifact_id: id,
    artifact_type: 'screenshot',
    content_hash: { algorithm: 'sha256', value: hash },
    source_location: id + '.png',
    received_at_utc: null,
    immutable: true
  };
}

function provenance(refs) {
  return { evidence_refs: refs };
}

function buildCanonical() {
  const model = emptyCanonicalModel();

  model.clans = [
    { clan_id: 'CLAN-B', display_name: 'Clan B', status: 'ACTIVE', provenance: provenance(['E-B']) },
    { clan_id: 'CLAN-A', display_name: 'Clan A', status: 'ACTIVE', provenance: provenance(['E-A']) }
  ];

  model.leagues = [
    {
      league_id: 'L2',
      name: 'League 2',
      starts_at_utc: '2026-10-01T00:00:00Z',
      ends_at_utc: '2026-10-08T00:00:00Z',
      sequence: 2,
      status: 'ACTIVE',
      completed_at_utc: null,
      provenance: provenance(['E-B'])
    },
    {
      league_id: 'L1',
      name: 'League 1',
      starts_at_utc: '2026-09-24T00:00:00Z',
      ends_at_utc: '2026-10-01T00:00:00Z',
      sequence: 1,
      status: 'COMPLETED',
      completed_at_utc: '2026-10-01T00:00:00Z',
      provenance: provenance(['E-A'])
    }
  ];

  model.clan_leagues = [
    {
      clan_league_id: 'CLANLEAGUE::CLAN-B::L2',
      clan_id: 'CLAN-B',
      league_id: 'L2',
      status: 'ACTIVE',
      final_snapshot_id: null,
      opening_snapshot_id: 'S-B2',
      provenance: provenance(['E-B'])
    },
    {
      clan_league_id: 'CLANLEAGUE::CLAN-A::L1',
      clan_id: 'CLAN-A',
      league_id: 'L1',
      status: 'COMPLETED',
      final_snapshot_id: null,
      opening_snapshot_id: 'S-A1',
      provenance: provenance(['E-A'])
    },
    {
      clan_league_id: 'CLANLEAGUE::CLAN-B::L1',
      clan_id: 'CLAN-B',
      league_id: 'L1',
      status: 'COMPLETED',
      final_snapshot_id: null,
      opening_snapshot_id: 'S-B1',
      provenance: provenance(['E-B'])
    }
  ];

  model.snapshots = [
    {
      snapshot_id: 'S-B2',
      clan_id: 'CLAN-B',
      league_id: 'L2',
      clan_league_id: 'CLANLEAGUE::CLAN-B::L2',
      sequence: 2,
      official_timestamp_utc: '2026-10-02T12:00:00Z',
      member_count: 2,
      capacity: 50,
      provenance: provenance(['E-B'])
    },
    {
      snapshot_id: 'S-A2',
      clan_id: 'CLAN-A',
      league_id: 'L1',
      clan_league_id: 'CLANLEAGUE::CLAN-A::L1',
      sequence: 2,
      official_timestamp_utc: '2026-09-29T12:00:00Z',
      member_count: 1,
      capacity: 50,
      provenance: provenance(['E-A'])
    },
    {
      snapshot_id: 'S-A1',
      clan_id: 'CLAN-A',
      league_id: 'L1',
      clan_league_id: 'CLANLEAGUE::CLAN-A::L1',
      sequence: 1,
      official_timestamp_utc: '2026-09-25T12:00:00Z',
      member_count: 1,
      capacity: 50,
      provenance: provenance(['E-A'])
    },
    {
      snapshot_id: 'S-B1',
      clan_id: 'CLAN-B',
      league_id: 'L1',
      clan_league_id: 'CLANLEAGUE::CLAN-B::L1',
      sequence: 1,
      official_timestamp_utc: '2026-09-27T12:00:00Z',
      member_count: 1,
      capacity: 50,
      provenance: provenance(['E-B'])
    }
  ];

  model.evidence_artifacts = [artifact('E-B', HASH_B), artifact('E-A', HASH_A)];

  model.global_player_identities = [
    { global_player_id: 'GP-002', status: 'ACTIVE', provenance: provenance(['E-B']) },
    { global_player_id: 'GP-001', status: 'ACTIVE', provenance: provenance(['E-A']) }
  ];

  model.membership_episodes = [
    {
      membership_episode_id: 'ME-B1',
      global_player_id: 'GP-001',
      clan_id: 'CLAN-B',
      sequence: 1,
      status: 'ENDED',
      started_from_snapshot_id: 'S-B1',
      ended_at_utc: '2026-09-30T12:00:00Z',
      ended_by_event_id: 'EV-AB',
      provenance: provenance(['E-B'])
    },
    {
      membership_episode_id: 'ME-A1',
      global_player_id: 'GP-001',
      clan_id: 'CLAN-A',
      sequence: 1,
      status: 'ENDED',
      started_from_snapshot_id: 'S-A1',
      ended_at_utc: '2026-09-26T12:00:00Z',
      ended_by_event_id: 'EV-A-LEAVE',
      provenance: provenance(['E-A'])
    },
    {
      membership_episode_id: 'ME-B2',
      global_player_id: 'GP-001',
      clan_id: 'CLAN-B',
      sequence: 2,
      status: 'ACTIVE',
      started_from_snapshot_id: 'S-B2',
      ended_at_utc: null,
      ended_by_event_id: null,
      provenance: provenance(['E-B'])
    }
  ];

  model.membership_events = [
    {
      membership_event_id: 'EV-A-LEAVE',
      event_type: 'LEAVE',
      global_player_id: 'GP-001',
      clan_id: 'CLAN-A',
      membership_episode_id: 'ME-A1',
      effective_at_utc: '2026-09-26T12:00:00Z',
      observed_snapshot_id: null,
      from_clan_id: null,
      to_clan_id: null,
      evidence_refs: ['E-A'],
      authority_ref: 'AUTH-A',
      precision: 'DAY'
    },
    {
      membership_event_id: 'EV-AB',
      event_type: 'TRANSFER',
      global_player_id: 'GP-001',
      clan_id: 'CLAN-B',
      membership_episode_id: 'ME-B1',
      effective_at_utc: '2026-09-30T12:00:00Z',
      observed_snapshot_id: 'S-B1',
      from_clan_id: 'CLAN-A',
      to_clan_id: 'CLAN-B',
      evidence_refs: ['E-A', 'E-B'],
      authority_ref: 'AUTH-AB',
      precision: null
    }
  ];

  model.resolution_cases = [
    {
      resolution_case_id: 'RC-AMB-1',
      observation_id: 'S-B2::ROW-AMB',
      status: 'AMBIGUOUS',
      candidate_global_player_ids: ['GP-001', 'GP-002'],
      matched_global_player_id: null,
      signals: {},
      evidence_refs: ['E-A', 'E-B'],
      authority_ref: null,
      process_ref: 'test',
      decided_at_utc: null,
      reason: 'ambiguous'
    }
  ];

  model.observations = [
    {
      observation_id: 'S-A1::ROW-001',
      snapshot_id: 'S-A1',
      clan_id: 'CLAN-A',
      source_member_key: 'ROW-001',
      source_identity: { source_system: 'TEST', source_identity_id: 'SRC-001' },
      global_player_id: 'GP-001',
      membership_episode_id: 'ME-A1',
      identity_resolution_status: 'CONFIRMED',
      display_name: 'Alpha',
      rank: 2,
      stage: 10,
      role: null,
      weapons: { '25mm': 4, hydra: 3 },
      total_kills: 10000,
      lifetime_medals: { gold: 5 },
      current_league_clan_medals: 10,
      profile_total_clan_medal_count: 10,
      last_online_utc: null,
      provenance: {
        evidence_refs: ['E-A'],
        field_provenance: {
          total_kills: { status: 'OBSERVED', evidence_refs: ['E-A'] }
        }
      }
    },
    {
      observation_id: 'S-A2::ROW-001',
      snapshot_id: 'S-A2',
      clan_id: 'CLAN-A',
      source_member_key: 'ROW-001',
      source_identity: { source_system: 'TEST', source_identity_id: 'SRC-001' },
      global_player_id: 'GP-001',
      membership_episode_id: 'ME-A1',
      identity_resolution_status: 'CONFIRMED',
      display_name: 'Alpha Prime',
      rank: 1,
      stage: 11,
      role: 'Member',
      weapons: { '25mm': 5, hydra: 4 },
      total_kills: 10200,
      lifetime_medals: { gold: 6 },
      current_league_clan_medals: 30,
      profile_total_clan_medal_count: 30,
      last_online_utc: '2026-09-29T11:00:00Z',
      provenance: {
        evidence_refs: ['E-A'],
        field_provenance: {
          total_kills: { status: 'OBSERVED', evidence_refs: ['E-A'] }
        }
      }
    },
    {
      observation_id: 'S-B1::ROW-001',
      snapshot_id: 'S-B1',
      clan_id: 'CLAN-B',
      source_member_key: 'ROW-001',
      source_identity: { source_system: 'TEST', source_identity_id: 'SRC-001' },
      global_player_id: 'GP-001',
      membership_episode_id: 'ME-B1',
      identity_resolution_status: 'CONFIRMED',
      display_name: 'Alpha Prime',
      rank: 3,
      stage: 11,
      role: 'Member',
      weapons: { '25mm': 5, hydra: 4 },
      total_kills: 10300,
      lifetime_medals: { gold: 6 },
      current_league_clan_medals: 5,
      profile_total_clan_medal_count: 5,
      last_online_utc: '2026-09-27T11:00:00Z',
      provenance: {
        evidence_refs: ['E-B'],
        field_provenance: {
          current_league_clan_medals: { status: 'OBSERVED', evidence_refs: ['E-B'] }
        }
      }
    },
    {
      observation_id: 'S-B2::ROW-001',
      snapshot_id: 'S-B2',
      clan_id: 'CLAN-B',
      source_member_key: 'ROW-001',
      global_player_id: 'GP-001',
      membership_episode_id: 'ME-B2',
      identity_resolution_status: 'CONFIRMED',
      display_name: 'Alpha Prime',
      rank: 1,
      stage: 12,
      role: 'Leader',
      weapons: { '25mm': 6, hydra: 5 },
      total_kills: 10500,
      lifetime_medals: { gold: 7 },
      current_league_clan_medals: 7,
      profile_total_clan_medal_count: 7,
      last_online_utc: '2026-10-02T11:00:00Z',
      provenance: {
        evidence_refs: ['E-B'],
        field_provenance: {
          current_league_clan_medals: { status: 'CONFLICTING', evidence_refs: ['E-B', 'E-A'] },
          last_online_utc: { status: 'UNKNOWN', evidence_refs: ['E-B'] }
        }
      }
    },
    {
      observation_id: 'S-B2::ROW-AMB',
      snapshot_id: 'S-B2',
      clan_id: 'CLAN-B',
      source_member_key: 'ROW-AMB',
      global_player_id: null,
      membership_episode_id: null,
      identity_resolution_status: 'AMBIGUOUS',
      display_name: 'Mystery',
      rank: 2,
      stage: 9,
      role: null,
      weapons: { '25mm': 2 },
      total_kills: 9000,
      lifetime_medals: { gold: 3 },
      current_league_clan_medals: 4,
      profile_total_clan_medal_count: 4,
      last_online_utc: null,
      provenance: { evidence_refs: ['E-B'] }
    }
  ];

  validateCanonicalModel(model);
  return model;
}

function shuffledState(state) {
  const copy = structuredClone(state);
  copy.clans.reverse();
  copy.leagues.reverse();
  copy.clan_leagues.reverse();
  copy.snapshots.reverse();
  copy.observations.reverse();
  copy.global_player_identities.reverse();
  copy.membership_episodes.reverse();
  copy.membership_events.reverse();
  copy.evidence_artifacts.reverse();
  copy.resolution_cases.reverse();
  copy.delta_results.reverse();
  return copy;
}

test('1. Canonical -> Global Player Read Model', () => {
  const result = new ProjectionEngine().projectGlobalPlayers(buildCanonical());
  assert.deepEqual(result.map((player) => player.global_player_id), ['GP-001', 'GP-002']);
  const gp1 = result[0];
  assert.equal(gp1.display_name, 'Alpha Prime');
  assert.equal(gp1.latest_observation_id, 'S-B2::ROW-001');
  assert.equal(gp1.latest_metrics.total_kills, 10500);
  assert.deepEqual(gp1.aliases, ['Alpha', 'Alpha Prime']);
});

test('2. Canonical -> Clan Read Model', () => {
  const result = new ProjectionEngine().projectClans(buildCanonical());
  assert.deepEqual(result.map((clan) => clan.clan_id), ['CLAN-A', 'CLAN-B']);
  const clanB = result[1];
  assert.equal(clanB.latest_snapshot_id, 'S-B2');
  assert.deepEqual(clanB.current_member_refs, [{ global_player_id: 'GP-001', membership_episode_id: 'ME-B2' }]);
});

test('3. Canonical -> Snapshot Read Model', () => {
  const result = new ProjectionEngine().projectSnapshots(buildCanonical());
  assert.deepEqual(result.map((snapshot) => snapshot.snapshot_id), ['S-A1', 'S-B1', 'S-A2', 'S-B2']);
  assert.deepEqual(result.find((s) => s.snapshot_id === 'S-B2').member_observation_refs, [
    'S-B2::ROW-001',
    'S-B2::ROW-AMB'
  ]);
});

test('4. Canonical -> Player History', () => {
  const result = new ProjectionEngine().projectPlayerHistory(buildCanonical());
  const gp1 = result[0];
  assert.deepEqual(gp1.snapshot_refs, ['S-A1', 'S-A2', 'S-B1', 'S-B2']);
  assert.deepEqual(gp1.memberships.map((item) => item.membership_episode_id), ['ME-A1', 'ME-B1', 'ME-B2']);
});

test('5. Canonical -> Activity/Membership Timeline', () => {
  const result = new ProjectionEngine().projectActivity(buildCanonical());
  assert.deepEqual(result.map((event) => event.membership_event_id), ['EV-A-LEAVE', 'EV-AB']);
  assert.deepEqual(result[1].evidence_refs, ['E-A', 'E-B']);
});

test('6. Same Canonical State -> identical Projection', () => {
  const model = buildCanonical();
  const projector = new ProjectionEngine();
  assert.equal(stableStringify(projector.projectAll(model)), stableStringify(projector.projectAll(structuredClone(model))));
});

test('7. Different insertion order -> identical Projection', () => {
  const model = buildCanonical();
  const projector = new ProjectionEngine();
  assert.equal(stableStringify(projector.projectAll(model)), stableStringify(projector.projectAll(shuffledState(model))));
});

test('8. Stable sorting with ties', () => {
  const model = buildCanonical();
  const firstTie = structuredClone(model.snapshots.find((item) => item.snapshot_id === 'S-B1'));
  firstTie.snapshot_id = 'S-B0';
  firstTie.sequence = 3;
  firstTie.official_timestamp_utc = '2026-09-29T12:00:00Z';
  firstTie.member_count = 0;
  firstTie.opening_snapshot_id = null;
  firstTie.clan_league_id = 'CLANLEAGUE::CLAN-B::L1';
  firstTie.provenance = provenance(['E-B']);
  model.snapshots.push(firstTie);
  validateCanonicalModel(model);
  const snapshots = new ProjectionEngine().projectSnapshots(model);
  const sameTime = snapshots.filter((item) => item.official_timestamp_utc === '2026-09-29T12:00:00Z');
  assert.deepEqual(sameTime.map((item) => item.snapshot_id), ['S-A2', 'S-B0']);
});

test('9. Missing field remains missing', () => {
  const model = buildCanonical();
  const projected = new ProjectionEngine().projectSnapshots(model)
    .find((item) => item.snapshot_id === 'S-A1')
    .members[0];
  assert.equal(projected.last_online_utc, null);
  assert.notEqual(projected.last_online_utc, 0);
  assert.equal(projected.role, null);
});

test('10. Zero remains zero', () => {
  const model = buildCanonical();
  model.observations.find((item) => item.observation_id === 'S-A1::ROW-001').current_league_clan_medals = 0;
  validateCanonicalModel(model);
  const projected = new ProjectionEngine().projectSnapshots(model)
    .find((item) => item.snapshot_id === 'S-A1')
    .members[0];
  assert.equal(projected.current_league_clan_medals, 0);
});

test('11. Projection does not mutate Canonical State', () => {
  const model = buildCanonical();
  const before = stableStringify(model);
  new ProjectionEngine().projectAll(model);
  assert.equal(stableStringify(model), before);
});

test('12. Projection does not create Global Player IDs', () => {
  const model = buildCanonical();
  const beforeIds = model.global_player_identities.map((item) => item.global_player_id).sort();
  new ProjectionEngine().projectAll(model);
  assert.deepEqual(model.global_player_identities.map((item) => item.global_player_id).sort(), beforeIds);
});

test('13. Projection does not resolve ambiguous identity', () => {
  const ambiguous = new ProjectionEngine().projectSnapshots(buildCanonical())
    .find((item) => item.snapshot_id === 'S-B2')
    .members.find((item) => item.observation_id === 'S-B2::ROW-AMB');
  assert.equal(ambiguous.identity_resolution_status, 'AMBIGUOUS');
  assert.equal(ambiguous.global_player_id, null);
});

test('14. Projection does not invent membership events', () => {
  const model = buildCanonical();
  const before = model.membership_events.map((item) => item.membership_event_id);
  const result = new ProjectionEngine().projectActivity(model);
  assert.deepEqual(result.map((item) => item.membership_event_id), before.sort());
  assert.equal(model.membership_events.length, before.length);
});

test('15. Projection preserves provenance references', () => {
  const gp1 = new ProjectionEngine().projectGlobalPlayers(buildCanonical())[0];
  assert.deepEqual(gp1.provenance.evidence_refs, ['E-A', 'E-B']);
  assert.ok(gp1.provenance.canonical_refs.includes('S-B2::ROW-001'));
});

test('16. Field-level provenance preserves multiple evidence refs and status', () => {
  const member = new ProjectionEngine().projectSnapshots(buildCanonical())
    .find((item) => item.snapshot_id === 'S-B2')
    .members.find((item) => item.observation_id === 'S-B2::ROW-001');

  assert.deepEqual(member.provenance.evidence_refs, ['E-B']);
  assert.deepEqual(member.provenance.field_provenance.current_league_clan_medals, {
    status: 'CONFLICTING',
    evidence_refs: ['E-B', 'E-A']
  });
  assert.deepEqual(member.provenance.field_provenance.last_online_utc, {
    status: 'UNKNOWN',
    evidence_refs: ['E-B']
  });
});

test('17. Field-level provenance preserves missing/null field values', () => {
  const model = buildCanonical();
  const canonicalObservation = model.observations.find((item) => item.observation_id === 'S-B2::ROW-001');
  canonicalObservation.last_online_utc = null;
  validateCanonicalModel(model);

  const projected = new ProjectionEngine().projectSnapshots(model)
    .find((item) => item.snapshot_id === 'S-B2')
    .members.find((item) => item.observation_id === 'S-B2::ROW-001');

  assert.equal(projected.last_online_utc, null);
  assert.deepEqual(projected.provenance.field_provenance.last_online_utc, {
    status: 'UNKNOWN',
    evidence_refs: ['E-B']
  });
  assert.notEqual(projected.last_online_utc, 0);
  assert.notEqual(projected.last_online_utc, '');
  assert.notEqual(projected.last_online_utc, false);
});

test('18. Field-level provenance is deterministic across repeated projection', () => {
  const model = buildCanonical();
  const projector = new ProjectionEngine();
  const first = stableStringify(projector.projectAll(model));
  const second = stableStringify(projector.projectAll(model));
  assert.equal(first, second);
});

test('19. Field-level provenance projection does not mutate Canonical', () => {
  const model = buildCanonical();
  const before = stableStringify(model);
  new ProjectionEngine().projectAll(model);
  assert.equal(stableStringify(model), before);
});

test('20. Previous Read Model mutation of field provenance does not affect later projection', () => {
  const model = buildCanonical();
  const projector = new ProjectionEngine();
  const first = projector.projectAll(model);
  const firstMember = first.snapshots
    .find((item) => item.snapshot_id === 'S-B2')
    .members.find((item) => item.observation_id === 'S-B2::ROW-001');

  firstMember.provenance.field_provenance.current_league_clan_medals.evidence_refs.push('E-FAKE');
  firstMember.provenance.field_provenance.last_online_utc.status = 'CONFLICTING';

  assert.deepEqual(
    model.observations.find((item) => item.observation_id === 'S-B2::ROW-001')
      .provenance.field_provenance.current_league_clan_medals,
    { status: 'CONFLICTING', evidence_refs: ['E-B', 'E-A'] }
  );
  assert.deepEqual(
    projector.projectAll(model).snapshots
      .find((item) => item.snapshot_id === 'S-B2')
      .members.find((item) => item.observation_id === 'S-B2::ROW-001')
      .provenance.field_provenance.last_online_utc,
    { status: 'UNKNOWN', evidence_refs: ['E-B'] }
  );
});

test('21. Provenance completeness keeps observation-level and field-level refs', () => {
  const member = new ProjectionEngine().projectSnapshots(buildCanonical())
    .find((item) => item.snapshot_id === 'S-B2')
    .members.find((item) => item.observation_id === 'S-B2::ROW-001');

  assert.deepEqual(member.provenance, {
    canonical_ref: 'S-B2::ROW-001',
    evidence_refs: ['E-B'],
    field_provenance: {
      current_league_clan_medals: { status: 'CONFLICTING', evidence_refs: ['E-B', 'E-A'] },
      last_online_utc: { status: 'UNKNOWN', evidence_refs: ['E-B'] }
    }
  });
});

test('22. Evidence references remain traceable', () => {
  const snapshot = new ProjectionEngine().projectSnapshots(buildCanonical())
    .find((item) => item.snapshot_id === 'S-B2');
  assert.deepEqual(snapshot.provenance.evidence_refs, ['E-B']);
  assert.equal(snapshot.provenance.canonical_refs.includes('S-B2::ROW-001'), true);
});

test('23. Multi-clan Global Player history remains separated by membership', () => {
  const gp1 = new ProjectionEngine().projectGlobalPlayers(buildCanonical())[0];
  assert.deepEqual(
    gp1.memberships.map((membership) => [membership.clan_id, membership.membership_episode_id]),
    [['CLAN-A', 'ME-A1'], ['CLAN-B', 'ME-B1'], ['CLAN-B', 'ME-B2']]
  );
});

test('24. League-scoped metrics are not accidentally aggregated as lifetime metrics', () => {
  const history = new ProjectionEngine().projectPlayerHistory(buildCanonical())
    .find((item) => item.global_player_id === 'GP-001');
  assert.deepEqual(history.observations.map((item) => item.current_league_clan_medals), [10, 5, 30, 7]);
  assert.equal(history.observations[history.observations.length - 1].total_kills, 10500);
});

test('25. Membership-episode metrics are not accidentally aggregated across episodes', () => {
  const history = new ProjectionEngine().projectPlayerHistory(buildCanonical())
    .find((item) => item.global_player_id === 'GP-001');
  assert.deepEqual(
    history.observations.map((item) => [item.membership_episode_id, item.profile_total_clan_medal_count]),
    [['ME-A1', 10], ['ME-B1', 5], ['ME-A1', 30], ['ME-B2', 7]]
  );
});

test('26. Re-running projection produces identical output', () => {
  const model = buildCanonical();
  const projector = new ProjectionEngine();
  const outputs = Array.from({ length: 5 }, () => stableStringify(projector.projectAll(model)));
  assert.equal(new Set(outputs).size, 1);
});

test('27. Previous generated Read Model does not affect new output', () => {
  const model = buildCanonical();
  const projector = new ProjectionEngine();
  const first = projector.projectAll(model);
  first.global_players[0].display_name = 'MUTATED';
  first.snapshots[0].members[0].total_kills = 1;
  const second = projector.projectAll(model);
  assert.equal(second.global_players[0].display_name, 'Alpha Prime');
  assert.equal(second.snapshots[0].members[0].total_kills, 10000);
});

test('28. Projection does not read RawExtraction directly', () => {
  const source = require('node:fs').readFileSync(require.resolve('../src/projection'), 'utf8');
  assert.doesNotMatch(source, /RawExtraction|rawExtraction|raw-extraction/);
});

test('29. Projection does not read SnapshotInput directly', () => {
  const source = require('node:fs').readFileSync(require.resolve('../src/projection'), 'utf8');
  assert.doesNotMatch(source, /SnapshotInput|snapshotInput|snapshot-input/);
});

test('30. Projection cannot mutate Canonical State through returned references', () => {
  const model = buildCanonical();
  const result = new ProjectionEngine().projectAll(model);
  result.global_players[0].latest_metrics.weapons['25mm'] = 999;
  result.snapshots[0].members[0].provenance.evidence_refs.push('E-FAKE');
  assert.equal(model.observations.find((item) => item.observation_id === 'S-A1::ROW-001').weapons['25mm'], 4);
  assert.deepEqual(model.observations.find((item) => item.observation_id === 'S-A1::ROW-001').provenance.evidence_refs, ['E-A']);
});

test('31. Existing canonical delta results are not recomputed', () => {
  const model = buildCanonical();
  model.delta_results = [{
    delta_id: 'D1',
    current_observation_id: 'S-B2::ROW-001',
    global_player_id: 'GP-001',
    baseline_observation_id: 'S-B1::ROW-001',
    baseline_type: 'PREVIOUS_VALID_OBSERVATION',
    metric_key: 'total_kills',
    scope: 'PLAYER_LIFETIME',
    clan_id: null,
    league_id: null,
    membership_episode_id: null,
    delta: 200,
    status: 'VALID',
    reason: null
  }];
  validateCanonicalModel(model);
  new ProjectionEngine().projectAll(model);
  assert.equal(model.delta_results.length, 1);
  assert.equal(model.delta_results[0].delta, 200);
});

test('32. Projection is independent of wall-clock time', () => {
  const model = buildCanonical();
  const projector = new ProjectionEngine();
  const originalNow = Date.now;
  try {
    Date.now = () => 9999999999999;
    const first = stableStringify(projector.projectAll(model));
    Date.now = () => 1111111111111;
    const second = stableStringify(projector.projectAll(model));
    assert.equal(first, second);
  } finally {
    Date.now = originalNow;
  }
});

test('33. projection hash is deterministic and distinct from record identity', () => {
  const output = new ProjectionEngine().projectAll(buildCanonical());
  const crypto = require('node:crypto');
  const hash1 = crypto.createHash('sha256').update(stableStringify(output)).digest('hex');
  const hash2 = crypto.createHash('sha256').update(stableStringify(output)).digest('hex');
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, output.global_players[0].global_player_id);
});

test('34. projection version is implementation metadata, not Canonical State', () => {
  const model = buildCanonical();
  const before = stableStringify(model);
  const output = new ProjectionEngine({ projection_version: 'test-0.1' }).projectAll(model);
  assert.equal(output.projection_version, 'test-0.1');
  assert.equal(stableStringify(model), before);
});
