'use strict';

const { validateCanonicalModel } = require('./canonical');

const PROJECTION_VERSION = '0.1';

function clone(value) {
  return structuredClone(value);
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function uniqueSorted(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined && value !== ''))].sort();
}

function compareText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function compareTime(left, right) {
  const a = Date.parse(left);
  const b = Date.parse(right);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  return compareText(left, right);
}

function compareByTimeThen(...fields) {
  return (left, right) => {
    for (const field of fields) {
      const leftValue = left?.[field];
      const rightValue = right?.[field];
      let result;
      if (field.endsWith('_utc') || field === 'effective_at_utc' || field === 'official_timestamp_utc') {
        result = compareTime(leftValue, rightValue);
      } else if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        result = leftValue - rightValue;
      } else {
        result = compareText(leftValue, rightValue);
      }
      if (result !== 0) return result;
    }
    return 0;
  };
}

function collectEvidenceRefs(record) {
  return Array.isArray(record?.provenance?.evidence_refs)
    ? record.provenance.evidence_refs
    : [];
}

function cloneOptional(value) {
  return value === undefined ? undefined : clone(value);
}

function indexBy(records, key) {
  return new Map(records.map((record) => [record[key], record]));
}

function observationsForPlayer(state, playerId) {
  const snapshots = indexBy(state.snapshots, 'snapshot_id');
  return state.observations
    .filter((observation) =>
      observation.global_player_id === playerId &&
      observation.identity_resolution_status === 'CONFIRMED'
    )
    .slice()
    .sort((a, b) => {
      const leftSnapshot = snapshots.get(a.snapshot_id);
      const rightSnapshot = snapshots.get(b.snapshot_id);
      const timeResult = compareTime(
        leftSnapshot?.official_timestamp_utc,
        rightSnapshot?.official_timestamp_utc
      );
      if (timeResult !== 0) return timeResult;
      const sequenceResult = (leftSnapshot?.sequence ?? 0) - (rightSnapshot?.sequence ?? 0);
      if (sequenceResult !== 0) return sequenceResult;
      return compareText(a.observation_id, b.observation_id);
    });
}

function observationProjection(observation, snapshot, clan) {
  return {
    observation_id: observation.observation_id,
    snapshot_id: observation.snapshot_id,
    clan_id: observation.clan_id,
    league_id: snapshot?.league_id ?? null,
    observed_at_utc: snapshot?.official_timestamp_utc ?? null,
    membership_episode_id: observation.membership_episode_id ?? null,
    global_player_id: observation.global_player_id ?? null,
    identity_resolution_status: observation.identity_resolution_status,
    display_name: observation.display_name,
    rank: observation.rank,
    stage: observation.stage,
    role: observation.role ?? null,
    weapons: cloneOptional(observation.weapons),
    total_kills: observation.total_kills,
    lifetime_medals: cloneOptional(observation.lifetime_medals),
    current_league_clan_medals: observation.current_league_clan_medals,
    profile_total_clan_medal_count: observation.profile_total_clan_medal_count,
    last_online_utc: observation.last_online_utc ?? null,
    provenance: {
      canonical_ref: observation.observation_id,
      evidence_refs: uniqueSorted(collectEvidenceRefs(observation)),
      ...(Object.prototype.hasOwnProperty.call(observation.provenance || {}, 'field_provenance')
        ? { field_provenance: cloneOptional(observation.provenance.field_provenance) }
        : {})
    },
    clan_display_name: clan?.display_name ?? null
  };
}

function membershipProjection(episode, snapshotMap, clanMap) {
  const startSnapshot = snapshotMap.get(episode.started_from_snapshot_id);
  return {
    membership_episode_id: episode.membership_episode_id,
    global_player_id: episode.global_player_id,
    clan_id: episode.clan_id,
    clan_display_name: clanMap.get(episode.clan_id)?.display_name ?? null,
    sequence: episode.sequence,
    status: episode.status,
    started_from_snapshot_id: episode.started_from_snapshot_id,
    started_at_utc: startSnapshot?.official_timestamp_utc ?? null,
    ended_at_utc: episode.ended_at_utc ?? null,
    ended_by_event_id: episode.ended_by_event_id ?? null,
    provenance: {
      canonical_ref: episode.membership_episode_id,
      evidence_refs: uniqueSorted(collectEvidenceRefs(episode))
    }
  };
}

function eventProjection(event) {
  return {
    membership_event_id: event.membership_event_id,
    event_type: event.event_type,
    global_player_id: event.global_player_id,
    clan_id: event.clan_id,
    membership_episode_id: event.membership_episode_id ?? null,
    effective_at_utc: event.effective_at_utc,
    observed_snapshot_id: event.observed_snapshot_id ?? null,
    from_clan_id: event.from_clan_id ?? null,
    to_clan_id: event.to_clan_id ?? null,
    evidence_refs: uniqueSorted(event.evidence_refs || []),
    authority_ref: event.authority_ref ?? null,
    precision: event.precision ?? null,
    provenance: {
      canonical_ref: event.membership_event_id,
      evidence_refs: uniqueSorted(event.evidence_refs || [])
    }
  };
}

function assertCanonicalState(state) {
  validateCanonicalModel(state);
  return state;
}

class ProjectionEngine {
  constructor(options = {}) {
    this.projection_version = options.projection_version || PROJECTION_VERSION;
  }

  projectGlobalPlayers(state) {
    assertCanonicalState(state);

    const snapshots = indexBy(state.snapshots, 'snapshot_id');
    const clans = indexBy(state.clans, 'clan_id');
    const episodesByPlayer = new Map();
    const eventsByPlayer = new Map();

    for (const episode of state.membership_episodes) {
      if (!episodesByPlayer.has(episode.global_player_id)) episodesByPlayer.set(episode.global_player_id, []);
      episodesByPlayer.get(episode.global_player_id).push(episode);
    }
    for (const event of state.membership_events) {
      if (!eventsByPlayer.has(event.global_player_id)) eventsByPlayer.set(event.global_player_id, []);
      eventsByPlayer.get(event.global_player_id).push(event);
    }

    return state.global_player_identities
      .slice()
      .sort((a, b) => compareText(a.global_player_id, b.global_player_id))
      .map((identity) => {
        const observations = observationsForPlayer(state, identity.global_player_id);
        const episodes = (episodesByPlayer.get(identity.global_player_id) || [])
          .slice()
          .sort((a, b) => {
            const startA = snapshots.get(a.started_from_snapshot_id)?.official_timestamp_utc;
            const startB = snapshots.get(b.started_from_snapshot_id)?.official_timestamp_utc;
            const timeResult = compareTime(startA, startB);
            if (timeResult !== 0) return timeResult;
            const clanResult = compareText(a.clan_id, b.clan_id);
            if (clanResult !== 0) return clanResult;
            return compareText(a.membership_episode_id, b.membership_episode_id);
          });

        const events = (eventsByPlayer.get(identity.global_player_id) || [])
          .slice()
          .sort(compareByTimeThen('effective_at_utc', 'membership_event_id'));

        const latestObservation = observations[observations.length - 1] || null;
        const latestSnapshot = latestObservation
          ? snapshots.get(latestObservation.snapshot_id)
          : null;

        const aliases = uniqueSorted(observations.map((observation) => observation.display_name));
        const observationEvidence = observations.flatMap((observation) => collectEvidenceRefs(observation));
        const membershipEvidence = episodes.flatMap((episode) => collectEvidenceRefs(episode));
        const eventEvidence = events.flatMap((event) => event.evidence_refs || []);
        const evidenceRefs = uniqueSorted([
          ...collectEvidenceRefs(identity),
          ...observationEvidence,
          ...membershipEvidence,
          ...eventEvidence
        ]);

        return {
          global_player_id: identity.global_player_id,
          identity_status: identity.status,
          display_name: latestObservation?.display_name ?? null,
          aliases,
          membership_count: episodes.length,
          memberships: episodes.map((episode) => membershipProjection(episode, snapshots, clans)),
          latest_observation_id: latestObservation?.observation_id ?? null,
          latest_snapshot_id: latestObservation?.snapshot_id ?? null,
          latest_observed_at_utc: latestSnapshot?.official_timestamp_utc ?? null,
          latest_metrics: latestObservation
            ? {
                stage: latestObservation.stage,
                weapons: cloneOptional(latestObservation.weapons),
                total_kills: latestObservation.total_kills,
                lifetime_medals: cloneOptional(latestObservation.lifetime_medals),
                current_league_clan_medals: latestObservation.current_league_clan_medals,
                profile_total_clan_medal_count: latestObservation.profile_total_clan_medal_count,
                last_online_utc: latestObservation.last_online_utc ?? null
              }
            : null,
          observation_count: observations.length,
          observation_refs: observations.map((observation) => observation.observation_id),
          membership_event_refs: events.map((event) => event.membership_event_id),
          provenance: {
            canonical_refs: uniqueSorted([
              identity.global_player_id,
              ...observations.map((observation) => observation.observation_id),
              ...episodes.map((episode) => episode.membership_episode_id),
              ...events.map((event) => event.membership_event_id)
            ]),
            evidence_refs: evidenceRefs
          }
        };
      });
  }

  projectClans(state) {
    assertCanonicalState(state);

    const observationsByClan = new Map();
    const episodesByClan = new Map();

    for (const episode of state.membership_episodes) {
      if (!episodesByClan.has(episode.clan_id)) episodesByClan.set(episode.clan_id, []);
      episodesByClan.get(episode.clan_id).push(episode);
    }
    for (const observation of state.observations) {
      if (!observationsByClan.has(observation.clan_id)) observationsByClan.set(observation.clan_id, []);
      observationsByClan.get(observation.clan_id).push(observation);
    }

    return state.clans
      .slice()
      .sort((a, b) => compareText(a.clan_id, b.clan_id))
      .map((clan) => {
        const clanSnapshots = state.snapshots
          .filter((snapshot) => snapshot.clan_id === clan.clan_id)
          .slice()
          .sort(compareByTimeThen('official_timestamp_utc', 'sequence', 'snapshot_id'));

        const activeMemberships = (episodesByClan.get(clan.clan_id) || [])
          .filter((episode) => episode.status === 'ACTIVE')
          .slice()
          .sort((a, b) => compareText(a.membership_episode_id, b.membership_episode_id));

        const unresolvedObservationIds = (observationsByClan.get(clan.clan_id) || [])
          .filter((observation) => observation.identity_resolution_status !== 'CONFIRMED')
          .map((observation) => observation.observation_id)
          .sort(compareText);

        const observedGlobalPlayerIds = uniqueSorted(
          (observationsByClan.get(clan.clan_id) || [])
            .filter((observation) =>
              observation.identity_resolution_status === 'CONFIRMED' &&
              Boolean(observation.global_player_id)
            )
            .map((observation) => observation.global_player_id)
        );

        const latestSnapshot = clanSnapshots[clanSnapshots.length - 1] || null;
        const evidenceRefs = uniqueSorted([
          ...collectEvidenceRefs(clan),
          ...clanSnapshots.flatMap(collectEvidenceRefs)
        ]);

        return {
          clan_id: clan.clan_id,
          display_name: clan.display_name ?? null,
          status: clan.status,
          current_member_refs: activeMemberships.map((episode) => ({
            global_player_id: episode.global_player_id,
            membership_episode_id: episode.membership_episode_id
          })),
          observed_global_player_ids: observedGlobalPlayerIds,
          latest_snapshot_id: latestSnapshot?.snapshot_id ?? null,
          latest_snapshot_at_utc: latestSnapshot?.official_timestamp_utc ?? null,
          snapshot_count: clanSnapshots.length,
          snapshot_refs: clanSnapshots.map((snapshot) => snapshot.snapshot_id),
          unresolved_observation_refs: unresolvedObservationIds,
          provenance: {
            canonical_refs: uniqueSorted([
              clan.clan_id,
              ...clanSnapshots.map((snapshot) => snapshot.snapshot_id),
              ...activeMemberships.map((episode) => episode.membership_episode_id)
            ]),
            evidence_refs: evidenceRefs
          }
        };
      });
  }

  projectSnapshots(state) {
    assertCanonicalState(state);

    const clans = indexBy(state.clans, 'clan_id');
    const observationsBySnapshot = new Map();

    for (const observation of state.observations) {
      if (!observationsBySnapshot.has(observation.snapshot_id)) observationsBySnapshot.set(observation.snapshot_id, []);
      observationsBySnapshot.get(observation.snapshot_id).push(observation);
    }

    return state.snapshots
      .slice()
      .sort(compareByTimeThen('official_timestamp_utc', 'clan_id', 'sequence', 'snapshot_id'))
      .map((snapshot) => {
        const observations = (observationsBySnapshot.get(snapshot.snapshot_id) || [])
          .slice()
          .sort((a, b) => {
            const rankResult = a.rank - b.rank;
            if (rankResult !== 0) return rankResult;
            return compareText(a.observation_id, b.observation_id);
          });

        const evidenceRefs = uniqueSorted([
          ...collectEvidenceRefs(snapshot),
          ...observations.flatMap(collectEvidenceRefs)
        ]);

        return {
          snapshot_id: snapshot.snapshot_id,
          clan_id: snapshot.clan_id,
          clan_display_name: clans.get(snapshot.clan_id)?.display_name ?? null,
          league_id: snapshot.league_id,
          official_timestamp_utc: snapshot.official_timestamp_utc,
          member_count: snapshot.member_count,
          capacity: snapshot.capacity,
          member_observation_refs: observations.map((observation) => observation.observation_id),
          members: observations.map((observation) =>
            observationProjection(observation, snapshot, clans.get(observation.clan_id))
          ),
          provenance: {
            canonical_refs: uniqueSorted([
              snapshot.snapshot_id,
              ...observations.map((observation) => observation.observation_id)
            ]),
            evidence_refs: evidenceRefs
          }
        };
      });
  }

  projectPlayerHistory(state) {
    assertCanonicalState(state);

    const snapshots = indexBy(state.snapshots, 'snapshot_id');
    const clans = indexBy(state.clans, 'clan_id');
    const episodesByPlayer = new Map();
    const eventsByPlayer = new Map();

    for (const episode of state.membership_episodes) {
      if (!episodesByPlayer.has(episode.global_player_id)) episodesByPlayer.set(episode.global_player_id, []);
      episodesByPlayer.get(episode.global_player_id).push(episode);
    }
    for (const event of state.membership_events) {
      if (!eventsByPlayer.has(event.global_player_id)) eventsByPlayer.set(event.global_player_id, []);
      eventsByPlayer.get(event.global_player_id).push(event);
    }

    return uniqueSorted(state.global_player_identities.map((identity) => identity.global_player_id))
      .map((playerId) => {
        const observations = observationsForPlayer(state, playerId);
        const episodes = (episodesByPlayer.get(playerId) || [])
          .slice()
          .sort((a, b) => {
            const timeResult = compareTime(
              snapshots.get(a.started_from_snapshot_id)?.official_timestamp_utc,
              snapshots.get(b.started_from_snapshot_id)?.official_timestamp_utc
            );
            if (timeResult !== 0) return timeResult;
            return compareText(a.membership_episode_id, b.membership_episode_id);
          });

        const events = (eventsByPlayer.get(playerId) || [])
          .slice()
          .sort(compareByTimeThen('effective_at_utc', 'membership_event_id'));

        return {
          global_player_id: playerId,
          observations: observations.map((observation) =>
            observationProjection(
              observation,
              snapshots.get(observation.snapshot_id),
              clans.get(observation.clan_id)
            )
          ),
          memberships: episodes.map((episode) => membershipProjection(episode, snapshots, clans)),
          membership_events: events.map(eventProjection),
          snapshot_refs: uniqueSorted(observations.map((observation) => observation.snapshot_id)),
          provenance: {
            canonical_refs: uniqueSorted([
              playerId,
              ...observations.map((observation) => observation.observation_id),
              ...episodes.map((episode) => episode.membership_episode_id),
              ...events.map((event) => event.membership_event_id)
            ]),
            evidence_refs: uniqueSorted([
              ...observations.flatMap(collectEvidenceRefs),
              ...episodes.flatMap(collectEvidenceRefs),
              ...events.flatMap((event) => event.evidence_refs || [])
            ])
          }
        };
      });
  }

  projectActivity(state) {
    assertCanonicalState(state);

    return state.membership_events
      .slice()
      .sort(compareByTimeThen('effective_at_utc', 'membership_event_id'))
      .map(eventProjection);
  }

  projectAll(state) {
    assertCanonicalState(state);
    return {
      projection_version: this.projection_version,
      global_players: this.projectGlobalPlayers(state),
      clans: this.projectClans(state),
      snapshots: this.projectSnapshots(state),
      player_history: this.projectPlayerHistory(state),
      activity: this.projectActivity(state)
    };
  }

  stableStringify(value) {
    return stableStringify(value);
  }
}

const ReadModelProjector = ProjectionEngine;

module.exports = {
  PROJECTION_VERSION,
  ProjectionEngine,
  ReadModelProjector,
  stableStringify
};
