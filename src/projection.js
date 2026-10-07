'use strict';

const { validateCanonicalModel } = require('./canonical');
const { monotonicContinuityViolations } = require('./metrics');

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
    last_online_display: observation.last_online_display ?? null,
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

function deltaProjection(delta, observationsById) {
  const currentObservation = observationsById.get(delta.current_observation_id);
  const baselineObservation = delta.baseline_observation_id
    ? observationsById.get(delta.baseline_observation_id)
    : null;

  const evidenceRefs = uniqueSorted([
    ...collectEvidenceRefs(currentObservation),
    ...collectEvidenceRefs(baselineObservation)
  ]);

  return {
    delta_id: delta.delta_id,
    current_observation_id: delta.current_observation_id,
    global_player_id: delta.global_player_id ?? null,
    baseline_observation_id: delta.baseline_observation_id ?? null,
    baseline_type: delta.baseline_type,
    metric_key: delta.metric_key,
    scope: delta.scope,
    clan_id: delta.clan_id ?? null,
    league_id: delta.league_id ?? null,
    membership_episode_id: delta.membership_episode_id ?? null,
    delta: delta.delta ?? null,
    status: delta.status,
    reason: delta.reason ?? null,
    provenance: {
      canonical_ref: delta.delta_id,
      evidence_refs: evidenceRefs
    }
  };
}

const OBSERVATION_CONTINUITY_SCORE_THRESHOLD = 5;
const OBSERVATION_FINGERPRINT_FIELDS = Object.freeze(['25mm', 'hydra', 'hellfire']);

function observationContinuityScore(previousObservation, currentObservation) {
  let score = 4;
  const basis = ['display_name_exact'];
  if (previousObservation.stage === currentObservation.stage) { score += 2; basis.push('stage_exact'); }
  else if (Number.isFinite(previousObservation.stage) && Number.isFinite(currentObservation.stage) && Math.abs(previousObservation.stage - currentObservation.stage) === 1) { score += 1; basis.push('stage_adjacent'); }
  for (const field of OBSERVATION_FINGERPRINT_FIELDS) {
    const left = previousObservation.weapons?.[field]; const right = currentObservation.weapons?.[field];
    if (Number.isFinite(left) && Number.isFinite(right) && left === right) { score += 1; basis.push('weapon_' + field + '_exact'); }
  }
  return { score, basis };
}

function explicitContinuityCases(previousSnapshot, currentSnapshot, state) {
  const byCurrent = new Map();
  const blockedPairs = [];
  for (const resolution of state.resolution_cases) {
    const continuity = resolution?.signals?.continuity;
    if (continuity?.assessment_state !== 'CONTINUOUS_CANDIDATE') continue;
    const currentObservation = state.observations.find((observation) => observation.observation_id === resolution.observation_id);
    const previousObservation = state.observations.find((observation) => observation.observation_id === continuity.prior_observation_id);
    if (!currentObservation || !previousObservation) continue;
    if (currentObservation.snapshot_id !== currentSnapshot.snapshot_id) continue;
    if (previousObservation.snapshot_id !== previousSnapshot.snapshot_id) continue;
    if (currentObservation.clan_id !== currentSnapshot.clan_id || previousObservation.clan_id !== previousSnapshot.clan_id) continue;
    const violations = monotonicContinuityViolations(previousObservation, currentObservation);
    if (violations.length) {
      blockedPairs.push({ current_observation_id: currentObservation.observation_id, previous_observation_id: previousObservation.observation_id, reason: 'monotonic_identity_contradiction', violations });
      continue;
    }
    if (byCurrent.has(currentObservation.observation_id)) {
      throw new Error('duplicate explicit continuity assessment for observation: ' + currentObservation.observation_id);
    }
    byCurrent.set(currentObservation.observation_id, { currentObservation, previousObservation, continuity });
  }
  return { byCurrent, blockedPairs };
}

function pairObservationContinuity(previousSnapshot, currentSnapshot, state) {
  const previous = state.observations.filter((o) => o.snapshot_id === previousSnapshot.snapshot_id).slice().sort((a,b) => compareText(a.observation_id,b.observation_id));
  const current = state.observations.filter((o) => o.snapshot_id === currentSnapshot.snapshot_id).slice().sort((a,b) => compareText(a.observation_id,b.observation_id));
  const explicitResult = explicitContinuityCases(previousSnapshot, currentSnapshot, state);
  const explicit = explicitResult.byCurrent;
  const blockedPairs = [...explicitResult.blockedPairs];
  const matchedCurrent = new Set(explicit.keys());
  const matchedPrevious = new Set([...explicit.values()].map((item) => item.previousObservation.observation_id));
  const pairs = [...explicit.values()].map((item) => ({
    ...item,
    score: null,
    basis: [],
    match_method: 'FINGERPRINT_REVIEW_CASE'
  }));
  const candidates = [];

  for (const currentObservation of current) {
    if (matchedCurrent.has(currentObservation.observation_id)) continue;
    const rawMatches = previous
      .filter((previousObservation) =>
        !matchedPrevious.has(previousObservation.observation_id) &&
        previousObservation.display_name === currentObservation.display_name
      )
      .map((previousObservation) => ({
        currentObservation,
        previousObservation,
        ...observationContinuityScore(previousObservation,currentObservation),
        monotonicViolations: monotonicContinuityViolations(previousObservation, currentObservation)
      }));
    const matches = rawMatches
      .filter((candidate) => {
        if (candidate.monotonicViolations.length) {
          blockedPairs.push({
            current_observation_id: candidate.currentObservation.observation_id,
            previous_observation_id: candidate.previousObservation.observation_id,
            reason: 'monotonic_identity_contradiction',
            violations: candidate.monotonicViolations
          });
          return false;
        }
        return candidate.score >= OBSERVATION_CONTINUITY_SCORE_THRESHOLD;
      })
      .sort((a,b) => b.score-a.score || compareText(a.previousObservation.observation_id,b.previousObservation.observation_id));
    if (!matches.length) continue;
    if (matches[1] && matches[1].score === matches[0].score) continue;
    candidates.push(matches[0]);
  }

  candidates.sort((a,b) => b.score-a.score || compareText(a.currentObservation.observation_id,b.currentObservation.observation_id) || compareText(a.previousObservation.observation_id,b.previousObservation.observation_id));
  for (const candidate of candidates) {
    const currentId = candidate.currentObservation.observation_id;
    const previousId = candidate.previousObservation.observation_id;
    if (matchedCurrent.has(currentId) || matchedPrevious.has(previousId)) continue;
    matchedCurrent.add(currentId);
    matchedPrevious.add(previousId);
    pairs.push(candidate);
  }
  return {
    pairs,
    unmatchedCurrent: current.filter((o) => !matchedCurrent.has(o.observation_id)),
    unmatchedPrevious: previous.filter((o) => !matchedPrevious.has(o.observation_id)),
    blockedPairs
  };
}

function snapshotMetricDelta(currentValue, previousValue, metricKey, sameLeague) {
  if (!Number.isFinite(currentValue)) return { status: 'UNKNOWN', delta: null, reason: 'current_value_invalid' };
  if (!Number.isFinite(previousValue)) return { status: 'BASELINE_UNAVAILABLE', delta: null, reason: 'previous_valid_observation_missing' };
  if (metricKey === 'current_league_clan_medals' && !sameLeague) return { status: 'VALID', delta: currentValue, reason: 'new_league_baseline_zero' };
  const delta = currentValue - previousValue;
  if (delta < 0) return { status: 'ANOMALY', delta: null, reason: 'monotonic_metric_decreased' };
  return { status: 'VALID', delta, reason: null };
}

function projectSnapshotMembershipChanges(state) {
  assertCanonicalState(state);
  const snapshots = state.snapshots.slice().sort(compareByTimeThen('official_timestamp_utc','clan_id','sequence','snapshot_id'));
  const previousByClan = new Map(); const results = [];
  for (const snapshot of snapshots) {
    const previousSnapshot = previousByClan.get(snapshot.clan_id);
    if (previousSnapshot) {
      // Confirmed Global Player identity is authoritative for same-Clan adjacent-Snapshot
      // membership comparison. A display-name/emoji change alone is not a membership change.
      const previousObservations = state.observations
        .filter((observation) => observation.snapshot_id === previousSnapshot.snapshot_id)
        .slice();
      const currentObservations = state.observations
        .filter((observation) => observation.snapshot_id === snapshot.snapshot_id)
        .slice();
      const previousByGlobalPlayerId = new Map(
        previousObservations
          .filter((observation) =>
            observation.identity_resolution_status === 'CONFIRMED' &&
            Boolean(observation.global_player_id)
          )
          .map((observation) => [observation.global_player_id, observation])
      );
      const matchedCurrentIds = new Set();
      const matchedPreviousIds = new Set();

      for (const currentObservation of currentObservations) {
        if (currentObservation.identity_resolution_status !== 'CONFIRMED' || !currentObservation.global_player_id) continue;
        const previousObservation = previousByGlobalPlayerId.get(currentObservation.global_player_id);
        if (!previousObservation) continue;
        const violations = monotonicContinuityViolations(previousObservation, currentObservation);
        if (violations.length) continue;
        matchedCurrentIds.add(currentObservation.observation_id);
        matchedPreviousIds.add(previousObservation.observation_id);
      }

      // Canonical Membership Events are authoritative for actual membership changes.
      // A confirmed cross-clan TRANSFER/JOIN/RETURN must not also become heuristic JOIN noise.
      const explicitCurrentIds = new Set(
        state.membership_events
          .filter((event) =>
            event.observed_snapshot_id === snapshot.snapshot_id &&
            event.clan_id === snapshot.clan_id &&
            ['JOIN', 'RETURN', 'TRANSFER'].includes(event.event_type)
          )
          .map((event) => event.global_player_id)
          .filter(Boolean)
      );
      const explicitPreviousIds = new Set(
        state.membership_events
          .filter((event) =>
            event.observed_snapshot_id === snapshot.snapshot_id &&
            event.clan_id === snapshot.clan_id &&
            ['LEAVE', 'TRANSFER'].includes(event.event_type) &&
            event.from_clan_id === snapshot.clan_id
          )
          .map((event) => event.global_player_id)
          .filter(Boolean)
      );

      // Remaining observations may be examined by the Fingerprint path, but its output
      // is review evidence only. It must never manufacture JOIN/LEAVE semantics from
      // sampling gaps. Presence in one Snapshot without an explicit Membership Event is
      // UNKNOWN_CHANGE; absence from the next Snapshot is NOT_OBSERVED, not LEAVE.
      const remainingState = {
        ...state,
        observations: state.observations.filter((observation) =>
          !matchedCurrentIds.has(observation.observation_id) &&
          !matchedPreviousIds.has(observation.observation_id) &&
          !explicitCurrentIds.has(observation.global_player_id) &&
          !explicitPreviousIds.has(observation.global_player_id)
        )
      };
      const continuity = pairObservationContinuity(previousSnapshot, snapshot, remainingState);
      const blockedPairs = continuity.blockedPairs;
      const handledBlockedCurrent = new Set();
      const handledBlockedPrevious = new Set();

      for (const pair of blockedPairs) {
        const currentObservation = currentObservations.find((observation) => observation.observation_id === pair.current_observation_id);
        const previousObservation = previousObservations.find((observation) => observation.observation_id === pair.previous_observation_id);
        if (!currentObservation || !previousObservation) continue;
        handledBlockedCurrent.add(pair.current_observation_id);
        handledBlockedPrevious.add(pair.previous_observation_id);
        results.push({
          change_id:'OBS-MEMORY::'+snapshot.snapshot_id+'::UNKNOWN_CHANGE::'+pair.current_observation_id+'::'+pair.previous_observation_id,
          change_type:'UNKNOWN_CHANGE', snapshot_id:snapshot.snapshot_id, clan_id:snapshot.clan_id,
          clan_display_name:state.clans.find((c)=>c.clan_id===snapshot.clan_id)?.display_name??null,
          display_name:currentObservation.display_name, observation_id:currentObservation.observation_id,
          current_observation_id:currentObservation.observation_id, previous_observation_id:previousObservation.observation_id,
          match_method:'DISPLAY_NAME_FINGERPRINT', reason:'monotonic_identity_contradiction',
          provenance:{ canonical_refs:uniqueSorted([previousSnapshot.snapshot_id,snapshot.snapshot_id,previousObservation.observation_id,currentObservation.observation_id]), evidence_refs:uniqueSorted([...collectEvidenceRefs(previousSnapshot),...collectEvidenceRefs(snapshot),...collectEvidenceRefs(previousObservation),...collectEvidenceRefs(currentObservation)]) }
        });
      }

      // An unmatched current observation indicates insufficient continuity evidence,
      // not a confirmed JOIN. Keep it visible as UNKNOWN_CHANGE unless an explicit
      // canonical membership event already exists for the same Global Player.
      for (const observation of continuity.unmatchedCurrent) {
        if (handledBlockedCurrent.has(observation.observation_id)) continue;
        if (explicitCurrentIds.has(observation.global_player_id)) continue;
        results.push({
          change_id:'OBS-MEMORY::'+snapshot.snapshot_id+'::UNKNOWN_CHANGE::'+observation.observation_id,
          change_type:'UNKNOWN_CHANGE', snapshot_id:snapshot.snapshot_id, clan_id:snapshot.clan_id,
          clan_display_name:state.clans.find((c)=>c.clan_id===snapshot.clan_id)?.display_name??null, display_name:observation.display_name, observation_id:observation.observation_id,
          current_observation_id:observation.observation_id, previous_observation_id:null, match_method:'DISPLAY_NAME_FINGERPRINT', reason:'no_deterministic_prior_snapshot_match',
          provenance:{ canonical_refs:uniqueSorted([snapshot.snapshot_id,observation.observation_id]), evidence_refs:uniqueSorted([...collectEvidenceRefs(snapshot),...collectEvidenceRefs(observation)]) }
        });
      }

      // An unmatched previous observation means only that the player was not observed
      // in the current Snapshot. It is deliberately not emitted as LEAVE.
      // Explicit LEAVE/TRANSFER events remain available through canonical Membership Events.
      for (const observation of continuity.unmatchedPrevious) {
        if (handledBlockedPrevious.has(observation.observation_id)) continue;
        if (explicitPreviousIds.has(observation.global_player_id)) continue;
      }
    }
    previousByClan.set(snapshot.clan_id,snapshot);
  }
  return results.sort((a,b)=>compareText(a.snapshot_id,b.snapshot_id)||compareText(a.change_type,b.change_type)||compareText(a.observation_id,b.observation_id));
}

function projectSnapshotDeltaResults(state) {
  assertCanonicalState(state);
  const snapshots = state.snapshots.slice().sort(compareByTimeThen('official_timestamp_utc','clan_id','sequence','snapshot_id'));
  const previousByClan = new Map(); const results = [];
  for (const snapshot of snapshots) {
    const previousSnapshot = previousByClan.get(snapshot.clan_id);
    if (previousSnapshot) {
      const continuity = pairObservationContinuity(previousSnapshot,snapshot,state);
      const sameLeague = previousSnapshot.league_id === snapshot.league_id;
      for (const pair of continuity.pairs) {
        const currentObservation = pair.currentObservation; const previousObservation = pair.previousObservation;
        const continuityMeta = pair.continuity || { match_method:'DISPLAY_NAME_FINGERPRINT', match_score:pair.score, match_basis:pair.basis };
        const evidenceRefs = uniqueSorted([...collectEvidenceRefs(previousObservation),...collectEvidenceRefs(currentObservation)]);
        for (const [metricKey,scope,currentValue,previousValue] of [['total_kills','PLAYER_LIFETIME',currentObservation.total_kills,previousObservation.total_kills],['current_league_clan_medals','LEAGUE',currentObservation.current_league_clan_medals,previousObservation.current_league_clan_medals]]) {
          const metric = snapshotMetricDelta(currentValue,previousValue,metricKey,sameLeague);
          results.push({
            delta_id:'OBS-DELTA::'+currentObservation.observation_id+'::'+scope+'::'+metricKey, current_observation_id:currentObservation.observation_id, global_player_id:null,
            baseline_observation_id:previousObservation.observation_id, baseline_type:'PREVIOUS_SNAPSHOT_OBSERVATION', metric_key:metricKey, scope, clan_id:snapshot.clan_id, league_id:snapshot.league_id, membership_episode_id:null,
            delta:metric.delta, status:metric.status, reason:metric.reason, continuity:continuityMeta,
            provenance:{ canonical_refs:uniqueSorted([previousSnapshot.snapshot_id,snapshot.snapshot_id,previousObservation.observation_id,currentObservation.observation_id]), evidence_refs:evidenceRefs }
          });
        }
      }
    }
    previousByClan.set(snapshot.clan_id,snapshot);
  }
  return results.sort((a,b)=>compareText(a.current_observation_id,b.current_observation_id)||compareText(a.scope,b.scope)||compareText(a.metric_key,b.metric_key));
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
                last_online_display: latestObservation.last_online_display ?? null,
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
          members: observations.map((observation) => ({
            ...observationProjection(observation, snapshot, clans.get(observation.clan_id)),
            // Preserve the source-native relative Last Online exactly as observed; UTC remains separate.
            last_online_display: observation.last_online_display ?? null
          })),
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

  projectDeltaResults(state) {
    assertCanonicalState(state);

    const observationsById = indexBy(state.observations, 'observation_id');

    return state.delta_results
      .filter((delta) =>
        (delta.scope === 'PLAYER_LIFETIME' && delta.metric_key === 'total_kills') ||
        (delta.scope === 'LEAGUE' && delta.metric_key === 'current_league_clan_medals')
      )
      .slice()
      .sort((left, right) => {
        const scopeResult = compareText(left.scope, right.scope);
        if (scopeResult !== 0) return scopeResult;

        const metricResult = compareText(left.metric_key, right.metric_key);
        if (metricResult !== 0) return metricResult;

        const observationResult = compareText(
          left.current_observation_id,
          right.current_observation_id
        );
        if (observationResult !== 0) return observationResult;

        return compareText(left.delta_id, right.delta_id);
      })
      .map((delta) => deltaProjection(delta, observationsById));
  }

  projectAll(state) {
    assertCanonicalState(state);
    return {
      projection_version: this.projection_version,
      global_players: this.projectGlobalPlayers(state),
      clans: this.projectClans(state),
      snapshots: this.projectSnapshots(state),
      player_history: this.projectPlayerHistory(state),
      activity: this.projectActivity(state),
      delta_results: this.projectDeltaResults(state),
      snapshot_delta_results: projectSnapshotDeltaResults(state),
      snapshot_membership_changes: projectSnapshotMembershipChanges(state)
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
