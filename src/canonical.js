'use strict';

const { bindSnapshotToLeague } = require('./league');

const CANONICAL_SCHEMA_VERSION = '0.1';
const RESOLUTION_STATUSES = Object.freeze([
  'CONFIRMED', 'AMBIGUOUS', 'UNRESOLVED', 'CONTRADICTION', 'UNKNOWN'
]);
const MEMBERSHIP_EVENT_TYPES = Object.freeze([
  'JOIN', 'LEAVE', 'RETURN', 'TRANSFER', 'UNKNOWN_CHANGE', 'NOT_OBSERVED'
]);

function emptyCanonicalModel() {
  return {
    schema_version: CANONICAL_SCHEMA_VERSION,
    clans: [],
    leagues: [],
    clan_leagues: [],
    snapshots: [],
    observations: [],
    global_player_identities: [],
    membership_episodes: [],
    membership_events: [],
    evidence_artifacts: [],
    resolution_cases: [],
    delta_results: []
  };
}

function uniqueIds(items, field, label) {
  const seen = new Set();
  for (const item of items) {
    const id = item && item[field];
    if (!id) throw new Error(label + ' missing ' + field);
    if (seen.has(id)) throw new Error('duplicate ' + label + ' id: ' + id);
    seen.add(id);
  }
  return seen;
}

function byId(items, field) {
  return new Map(items.map((item) => [item[field], item]));
}

function requireRef(map, id, label) {
  if (!id || !map.has(id)) throw new Error(label + ' reference not found: ' + id);
}

function validateMetricScope(delta) {
  if (!['PLAYER_LIFETIME', 'LEAGUE', 'MEMBERSHIP_EPISODE'].includes(delta.scope)) {
    throw new Error('unsupported delta scope: ' + delta.scope);
  }
  if (delta.scope === 'PLAYER_LIFETIME') {
    if (!delta.global_player_id) throw new Error('lifetime delta requires global_player_id');
    if (delta.clan_id !== null && delta.clan_id !== undefined) throw new Error('lifetime delta cannot be clan-scoped');
    if (delta.league_id !== null && delta.league_id !== undefined) throw new Error('lifetime delta cannot be league-scoped');
    if (delta.membership_episode_id !== null && delta.membership_episode_id !== undefined) throw new Error('lifetime delta cannot be membership-episode-scoped');
  }
  if (delta.scope === 'LEAGUE') {
    if (!delta.global_player_id) throw new Error('league delta requires global_player_id');
    if (!delta.clan_id || !delta.league_id) throw new Error('league delta requires clan_id and league_id');
    if (delta.membership_episode_id !== null && delta.membership_episode_id !== undefined) throw new Error('league delta cannot bind directly to membership_episode_id');
  }
  if (delta.scope === 'MEMBERSHIP_EPISODE') {
    if (!delta.global_player_id) throw new Error('membership delta requires global_player_id');
    if (!delta.clan_id || !delta.membership_episode_id) throw new Error('membership delta requires clan_id and membership_episode_id');
  }
}

function validateCanonicalModel(model) {
  if (!model || typeof model !== 'object') throw new Error('canonical model must be an object');
  if (model.schema_version !== CANONICAL_SCHEMA_VERSION) throw new Error('unsupported canonical schema_version: ' + model.schema_version);
  const collections = [
    ['clans', 'clan', 'clan_id'],
    ['leagues', 'league', 'league_id'],
    ['clan_leagues', 'clan-league', 'clan_league_id'],
    ['snapshots', 'snapshot', 'snapshot_id'],
    ['observations', 'observation', 'observation_id'],
    ['global_player_identities', 'global player identity', 'global_player_id'],
    ['membership_episodes', 'membership episode', 'membership_episode_id'],
    ['membership_events', 'membership event', 'membership_event_id'],
    ['evidence_artifacts', 'evidence artifact', 'evidence_artifact_id'],
    ['resolution_cases', 'resolution case', 'resolution_case_id'],
    ['delta_results', 'delta', 'delta_id']
  ];
  for (const entry of collections) {
    if (!Array.isArray(model[entry[0]])) throw new Error(entry[0] + ' must be an array');
  }
  const clans = byId(model.clans, 'clan_id');
  const leagues = byId(model.leagues, 'league_id');
  const clanLeagues = byId(model.clan_leagues, 'clan_league_id');
  const snapshots = byId(model.snapshots, 'snapshot_id');
  const observations = byId(model.observations, 'observation_id');
  const players = byId(model.global_player_identities, 'global_player_id');
  const episodes = byId(model.membership_episodes, 'membership_episode_id');
  const events = byId(model.membership_events, 'membership_event_id');
  const evidence = byId(model.evidence_artifacts, 'evidence_artifact_id');
  for (const entry of collections) uniqueIds(model[entry[0]], entry[2], entry[1]);

  for (const league of model.leagues) {
    bindSnapshotToLeague(league.starts_at_utc, league);
    if (league.status === 'COMPLETED' && league.completed_at_utc !== league.ends_at_utc) {
      throw new Error('completed league must complete at its game boundary: ' + league.league_id);
    }
    if (league.final_snapshot_id !== null && league.final_snapshot_id !== undefined) {
      requireRef(snapshots, league.final_snapshot_id, 'league.final_snapshot_id');
      const finalSnapshot = snapshots.get(league.final_snapshot_id);
      if (finalSnapshot.league_id !== league.league_id) throw new Error('final snapshot belongs to another league: ' + league.final_snapshot_id);
      if (new Date(finalSnapshot.official_timestamp_utc).getTime() >= new Date(league.ends_at_utc).getTime()) {
        throw new Error('final snapshot must occur before League end: ' + finalSnapshot.snapshot_id);
      }
    }
  }

  for (const clanLeague of model.clan_leagues) {
    requireRef(clans, clanLeague.clan_id, 'clan_league.clan_id');
    requireRef(leagues, clanLeague.league_id, 'clan_league.league_id');
    if (clanLeague.final_snapshot_id !== null && clanLeague.final_snapshot_id !== undefined) {
      requireRef(snapshots, clanLeague.final_snapshot_id, 'clan_league.final_snapshot_id');
      const finalSnapshot = snapshots.get(clanLeague.final_snapshot_id);
      if (finalSnapshot.clan_league_id !== clanLeague.clan_league_id) {
        throw new Error('final snapshot belongs to another ClanLeague: ' + clanLeague.final_snapshot_id);
      }
    }
    if (clanLeague.opening_snapshot_id !== null && clanLeague.opening_snapshot_id !== undefined) {
      requireRef(snapshots, clanLeague.opening_snapshot_id, 'clan_league.opening_snapshot_id');
      const openingSnapshot = snapshots.get(clanLeague.opening_snapshot_id);
      if (openingSnapshot.clan_league_id !== clanLeague.clan_league_id) {
        throw new Error('opening snapshot belongs to another ClanLeague: ' + clanLeague.opening_snapshot_id);
      }
    }
  }

  for (const snapshot of model.snapshots) {
    requireRef(clans, snapshot.clan_id, 'snapshot.clan_id');
    requireRef(leagues, snapshot.league_id, 'snapshot.league_id');
    requireRef(clanLeagues, snapshot.clan_league_id, 'snapshot.clan_league_id');
    const clanLeague = clanLeagues.get(snapshot.clan_league_id);
    if (clanLeague.clan_id !== snapshot.clan_id || clanLeague.league_id !== snapshot.league_id) {
      throw new Error('snapshot ClanLeague binding does not match clan/league: ' + snapshot.snapshot_id);
    }
    bindSnapshotToLeague(snapshot.official_timestamp_utc, leagues.get(snapshot.league_id));
    if (snapshot.member_count > snapshot.capacity) throw new Error('snapshot member_count exceeds capacity: ' + snapshot.snapshot_id);
  }

  const sourceKeyBySnapshot = new Map();
  const observationCountBySnapshot = new Map();
  for (const observation of model.observations) {
    requireRef(snapshots, observation.snapshot_id, 'observation.snapshot_id');
    requireRef(clans, observation.clan_id, 'observation.clan_id');
    if (snapshots.get(observation.snapshot_id).clan_id !== observation.clan_id) throw new Error('observation clan does not match snapshot: ' + observation.observation_id);
    const snapshotCount = (observationCountBySnapshot.get(observation.snapshot_id) || 0) + 1;
    observationCountBySnapshot.set(observation.snapshot_id, snapshotCount);
    const snapshotKey = observation.snapshot_id + '::' + observation.source_member_key;
    if (sourceKeyBySnapshot.has(snapshotKey)) throw new Error('duplicate source_member_key within snapshot: ' + observation.source_member_key);
    sourceKeyBySnapshot.set(snapshotKey, observation.observation_id);
    if (!RESOLUTION_STATUSES.includes(observation.identity_resolution_status)) throw new Error('invalid observation identity status: ' + observation.identity_resolution_status);
    if (observation.identity_resolution_status === 'CONFIRMED') {
      requireRef(players, observation.global_player_id, 'observation.global_player_id');
    } else if (observation.global_player_id !== null && observation.global_player_id !== undefined) {
      throw new Error('non-confirmed observation cannot bind global_player_id: ' + observation.observation_id);
    }
    if (observation.membership_episode_id !== null && observation.membership_episode_id !== undefined) {
      requireRef(episodes, observation.membership_episode_id, 'observation membership episode');
    }
    if (observation.source_identity !== null && observation.source_identity !== undefined) {
      if (!observation.source_identity.source_system || !observation.source_identity.source_identity_id) {
        throw new Error('observation source_identity is incomplete: ' + observation.observation_id);
      }
    }
    for (const evidenceRef of (observation.provenance && observation.provenance.evidence_refs) || []) requireRef(evidence, evidenceRef, 'observation provenance evidence');
  }

  for (const snapshot of model.snapshots) {
    const observedCount = observationCountBySnapshot.get(snapshot.snapshot_id) || 0;
    if (observedCount !== snapshot.member_count) {
      throw new Error('snapshot observation count does not match member_count: ' + snapshot.snapshot_id);
    }
  }

  for (const episode of model.membership_episodes) {
    requireRef(players, episode.global_player_id, 'membership episode player');
    requireRef(clans, episode.clan_id, 'membership episode clan');
    requireRef(snapshots, episode.started_from_snapshot_id, 'membership episode start snapshot');
    if (snapshots.get(episode.started_from_snapshot_id).clan_id !== episode.clan_id) throw new Error('membership episode start snapshot is from another clan: ' + episode.membership_episode_id);
    const startSnapshot = snapshots.get(episode.started_from_snapshot_id);
    if (episode.status === 'ACTIVE' && (episode.ended_at_utc !== null && episode.ended_at_utc !== undefined)) {
      throw new Error('active membership episode cannot have ended_at_utc: ' + episode.membership_episode_id);
    }
    if (episode.ended_at_utc && new Date(episode.ended_at_utc).getTime() < new Date(startSnapshot.official_timestamp_utc).getTime()) {
      throw new Error('membership episode ended before it started: ' + episode.membership_episode_id);
    }
    if (episode.status === 'ACTIVE' && episode.ended_by_event_id) {
      throw new Error('active membership episode cannot have ended_by_event_id: ' + episode.membership_episode_id);
    }
    if (episode.status === 'ENDED' && !episode.ended_by_event_id) throw new Error('ended membership episode requires ended_by_event_id: ' + episode.membership_episode_id);
    if (episode.ended_by_event_id) requireRef(events, episode.ended_by_event_id, 'membership episode end event');
  }
  const episodePairSequence = new Set();
  const activeEpisodePair = new Set();
  for (const episode of model.membership_episodes) {
    if (episode.status === 'ACTIVE') {
      const activeKey = episode.global_player_id + '::' + episode.clan_id;
      if (activeEpisodePair.has(activeKey)) throw new Error('multiple active membership episodes for player/clan: ' + activeKey);
      activeEpisodePair.add(activeKey);
    }
    const key = episode.global_player_id + '::' + episode.clan_id + '::' + episode.sequence;
    if (episodePairSequence.has(key)) throw new Error('duplicate membership episode sequence: ' + key);
    episodePairSequence.add(key);
  }

  for (const event of model.membership_events) {
    requireRef(players, event.global_player_id, 'membership event player');
    requireRef(clans, event.clan_id, 'membership event clan');
    if (!MEMBERSHIP_EVENT_TYPES.includes(event.event_type)) throw new Error('invalid membership event type: ' + event.event_type);
    if (event.membership_episode_id !== null && event.membership_episode_id !== undefined) requireRef(episodes, event.membership_episode_id, 'membership event episode');
    for (const evidenceRef of event.evidence_refs || []) requireRef(evidence, evidenceRef, 'membership event evidence');
    if (event.event_type === 'LEAVE' || event.event_type === 'TRANSFER') {
      if (!(event.authority_ref || (event.evidence_refs && event.evidence_refs.length))) throw new Error(event.event_type + ' requires evidence_refs or authority_ref');
    }
    if (event.event_type === 'TRANSFER') {
      if (!event.from_clan_id || !event.to_clan_id || event.from_clan_id === event.to_clan_id) throw new Error('TRANSFER requires distinct from_clan_id and to_clan_id');
      requireRef(clans, event.from_clan_id, 'transfer from clan');
      requireRef(clans, event.to_clan_id, 'transfer to clan');
    }
  }

  for (const artifact of model.evidence_artifacts) {
    if (artifact.immutable !== true) throw new Error('evidence artifact must be immutable: ' + artifact.evidence_artifact_id);
    if (!artifact.content_hash || !artifact.content_hash.algorithm || !artifact.content_hash.value) throw new Error('evidence artifact requires content_hash: ' + artifact.evidence_artifact_id);
  }

  for (const resolution of model.resolution_cases) {
    requireRef(observations, resolution.observation_id, 'resolution observation');
    if (!RESOLUTION_STATUSES.includes(resolution.status)) throw new Error('invalid resolution status: ' + resolution.status);
    for (const playerId of resolution.candidate_global_player_ids || []) requireRef(players, playerId, 'resolution candidate');
    for (const evidenceRef of resolution.evidence_refs || []) requireRef(evidence, evidenceRef, 'resolution evidence');
    if (resolution.matched_global_player_id !== null && resolution.matched_global_player_id !== undefined) requireRef(players, resolution.matched_global_player_id, 'resolution matched player');
    if (resolution.status === 'CONFIRMED') {
      if (!resolution.matched_global_player_id) throw new Error('CONFIRMED resolution requires matched_global_player_id');
      if (!(resolution.authority_ref || resolution.process_ref || (resolution.evidence_refs && resolution.evidence_refs.length))) throw new Error('CONFIRMED resolution requires audit reference');
    }
  }

  for (const delta of model.delta_results) {
    requireRef(observations, delta.current_observation_id, 'delta current observation');
    if (delta.baseline_observation_id !== null && delta.baseline_observation_id !== undefined) requireRef(observations, delta.baseline_observation_id, 'delta baseline observation');
    if (delta.global_player_id) requireRef(players, delta.global_player_id, 'delta global_player_id');
    if (delta.clan_id) requireRef(clans, delta.clan_id, 'delta clan_id');
    if (delta.league_id) requireRef(leagues, delta.league_id, 'delta league_id');
    if (delta.membership_episode_id) requireRef(episodes, delta.membership_episode_id, 'delta membership_episode_id');
    validateMetricScope(delta);
    if (delta.status === 'VALID') {
      const zeroBaseline = delta.baseline_type === 'NEW_LEAGUE_ZERO' || delta.baseline_type === 'NEW_MEMBERSHIP_EPISODE_ZERO';
      if (delta.baseline_observation_id === null && !zeroBaseline && delta.baseline_type !== 'NONE') throw new Error('VALID delta without baseline reference: ' + delta.delta_id);
      if (!zeroBaseline && delta.delta === null) throw new Error('VALID delta without numeric delta: ' + delta.delta_id);
    }
  }

  return {
    valid: true,
    schema_version: model.schema_version,
    counts: Object.fromEntries(collections.map((entry) => [entry[0], model[entry[0]].length]))
  };
}

function assertHistoryPreserved(before, after) {
  const beforeObs = byId(before.observations, 'observation_id');
  const afterObs = byId(after.observations, 'observation_id');
  const beforeEpisodes = byId(before.membership_episodes, 'membership_episode_id');
  const afterEpisodes = byId(after.membership_episodes, 'membership_episode_id');
  const beforeEvidence = byId(before.evidence_artifacts, 'evidence_artifact_id');
  const afterEvidence = byId(after.evidence_artifacts, 'evidence_artifact_id');
  for (const [id, record] of beforeObs) {
    if (!afterObs.has(id)) throw new Error('historical observation removed: ' + id);
    if (JSON.stringify(record) !== JSON.stringify(afterObs.get(id))) throw new Error('historical observation overwritten: ' + id);
  }
  for (const [id, record] of beforeEpisodes) {
    if (!afterEpisodes.has(id)) throw new Error('historical membership episode removed: ' + id);
    if (JSON.stringify(record) !== JSON.stringify(afterEpisodes.get(id))) throw new Error('historical membership episode overwritten: ' + id);
  }
  for (const [id, record] of beforeEvidence) {
    if (!afterEvidence.has(id)) throw new Error('evidence artifact overwritten or removed: ' + id);
    if (JSON.stringify(record) !== JSON.stringify(afterEvidence.get(id))) throw new Error('evidence artifact overwritten: ' + id);
  }
  return true;
}

function buildDeltaResult({ deltaId, currentObservationId, globalPlayerId, metricKey, scope, clanId = null, leagueId = null, membershipEpisodeId = null, baselineObservationId = null, baselineType = 'UNKNOWN', delta = null, status = 'UNKNOWN', reason = null }) {
  return {
    delta_id: deltaId,
    current_observation_id: currentObservationId,
    global_player_id: globalPlayerId == null ? null : globalPlayerId,
    baseline_observation_id: baselineObservationId,
    baseline_type: baselineType,
    metric_key: metricKey,
    scope,
    clan_id: clanId,
    league_id: leagueId,
    membership_episode_id: membershipEpisodeId,
    delta,
    status,
    reason
  };
}

module.exports = {
  CANONICAL_SCHEMA_VERSION,
  RESOLUTION_STATUSES,
  MEMBERSHIP_EVENT_TYPES,
  emptyCanonicalModel,
  validateCanonicalModel,
  assertHistoryPreserved,
  buildDeltaResult
};