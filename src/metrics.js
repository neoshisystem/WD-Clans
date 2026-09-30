'use strict';

const METRIC_STATUSES = Object.freeze([
  'VALID',
  'BASELINE_UNAVAILABLE',
  'ANOMALY',
  'UNKNOWN'
]);

function monotonicDelta(current, previous, metricName) {
  if (!Number.isFinite(current)) return { status: 'UNKNOWN', metric: metricName, delta: null, reason: 'current_value_invalid' };
  if (!Number.isFinite(previous)) return { status: 'BASELINE_UNAVAILABLE', metric: metricName, delta: null, reason: 'previous_valid_observation_missing' };
  const delta = current - previous;
  if (delta < 0) return { status: 'ANOMALY', metric: metricName, delta: null, reason: 'monotonic_metric_decreased' };
  return { status: 'VALID', metric: metricName, delta, reason: null };
}

function monotonicContinuityViolations(previous = {}, current = {}) {
  const violations = [];
  const compare = (field, previousValue, currentValue) => {
    if (Number.isFinite(previousValue) && Number.isFinite(currentValue) && currentValue < previousValue) {
      violations.push({ field, previous: previousValue, current: currentValue, decrease: previousValue - currentValue });
    }
  };
  compare('stage', previous.stage, current.stage);
  compare('total_kills', previous.total_kills, current.total_kills);
  for (const key of [...new Set([...Object.keys(previous.weapons || {}), ...Object.keys(current.weapons || {})])].sort()) {
    compare('weapon:' + key, previous.weapons?.[key], current.weapons?.[key]);
  }
  for (const key of [...new Set([...Object.keys(previous.lifetime_medals || {}), ...Object.keys(current.lifetime_medals || {})])].sort()) {
    compare('lifetime_medal:' + key, previous.lifetime_medals?.[key], current.lifetime_medals?.[key]);
  }
  return violations;
}

function currentLeagueClanMedalDelta({ current, previous = null, sameLeague }) {
  if (!Number.isFinite(current)) return { status: 'UNKNOWN', metric: 'current_league_clan_medals', delta: null, reason: 'current_value_invalid' };
  if (!sameLeague || previous === null) {
    return { status: 'VALID', metric: 'current_league_clan_medals', delta: current, reason: 'new_league_baseline_zero' };
  }
  return monotonicDelta(current, previous, 'current_league_clan_medals');
}

function membershipEpisodeClanMedalContribution({ current, previous = null, sameEpisode, sameLeague }) {
  if (!Number.isFinite(current)) return { status: 'UNKNOWN', metric: 'profile_total_clan_medal_count', delta: null, reason: 'current_value_invalid' };
  if (!sameEpisode || previous === null || !sameLeague) {
    return { status: 'VALID', metric: 'profile_total_clan_medal_count', delta: current, reason: sameEpisode ? 'new_league_earned_from_zero' : 'new_membership_episode_from_zero' };
  }
  return monotonicDelta(current, previous, 'profile_total_clan_medal_count');
}

function validateLifetimeMetrics(previous, current) {
  const results = {
    total_kills: monotonicDelta(current.total_kills, previous?.total_kills, 'total_kills'),
    stage: monotonicDelta(current.stage, previous?.stage, 'stage')
  };

  const previousWeapons = previous?.weapons || {};
  const currentWeapons = current?.weapons || {};
  const weaponKeys = [...new Set([...Object.keys(previousWeapons), ...Object.keys(currentWeapons)])].sort();
  results.weapons = Object.fromEntries(
    weaponKeys.map((key) => [key, monotonicDelta(currentWeapons[key], previousWeapons[key], `weapon:${key}`)])
  );

  const previousMedals = previous?.lifetime_medals || {};
  const currentMedals = current?.lifetime_medals || {};
  const medalKeys = [...new Set([...Object.keys(previousMedals), ...Object.keys(currentMedals)])].sort();
  results.lifetime_medals = Object.fromEntries(
    medalKeys.map((key) => [key, monotonicDelta(currentMedals[key], previousMedals[key], `lifetime_medal:${key}`)])
  );

  return results;
}

module.exports = {
  METRIC_STATUSES,
  monotonicDelta,
  currentLeagueClanMedalDelta,
  membershipEpisodeClanMedalContribution,
  validateLifetimeMetrics,
  monotonicContinuityViolations
};
