'use strict';

const LEAGUE_START_WEEKDAY_UTC = 4; // Thursday
const LEAGUE_START_HOUR_UTC = 0;
const LEAGUE_START_MINUTE_UTC = 0;
const LEAGUE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function assertDate(value, field) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    throw new Error(`${field} must be a valid ISO timestamp`);
  }
  return date;
}

function startOfLeagueWindow(officialTimestampUtc) {
  const date = assertDate(officialTimestampUtc, 'official_timestamp_utc');
  const daysBack = (date.getUTCDay() - LEAGUE_START_WEEKDAY_UTC + 7) % 7;
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysBack,
    LEAGUE_START_HOUR_UTC,
    LEAGUE_START_MINUTE_UTC,
    0,
    0
  ));
  if (date.getTime() < start.getTime()) {
    start.setUTCDate(start.getUTCDate() - 7);
  }
  return start;
}

function leagueWindowForTimestamp(officialTimestampUtc) {
  const start = startOfLeagueWindow(officialTimestampUtc);
  const end = new Date(start.getTime() + LEAGUE_DURATION_MS);
  return {
    starts_at_utc: start.toISOString(),
    ends_at_utc: end.toISOString()
  };
}

function validateLeagueWindow(league) {
  if (!league || typeof league !== 'object') throw new Error('league is required');
  if (!league.league_id) throw new Error('league.league_id is required');
  const start = assertDate(league.starts_at_utc, 'league.starts_at_utc');
  const end = assertDate(league.ends_at_utc, 'league.ends_at_utc');
  if (start.getUTCDay() !== LEAGUE_START_WEEKDAY_UTC ||
      start.getUTCHours() !== 0 ||
      start.getUTCMinutes() !== 0 ||
      start.getUTCSeconds() !== 0 ||
      start.getUTCMilliseconds() !== 0) {
    throw new Error('league.starts_at_utc must be Thursday 00:00:00 UTC');
  }
  if (end.getTime() - start.getTime() !== LEAGUE_DURATION_MS) {
    throw new Error('league must be exactly 7 days');
  }
}

function bindSnapshotToLeague(officialTimestampUtc, league) {
  validateLeagueWindow(league);
  const expected = leagueWindowForTimestamp(officialTimestampUtc);
  if (expected.starts_at_utc !== new Date(league.starts_at_utc).toISOString() ||
      expected.ends_at_utc !== new Date(league.ends_at_utc).toISOString()) {
    throw new Error('snapshot timestamp does not bind to the supplied League window');
  }
  return {
    league_id: league.league_id,
    starts_at_utc: expected.starts_at_utc,
    ends_at_utc: expected.ends_at_utc,
    snapshot_timestamp_utc: new Date(officialTimestampUtc).toISOString()
  };
}

function leagueStatusAt(league, nowUtc) {
  validateLeagueWindow(league);
  const now = assertDate(nowUtc, 'now_utc').getTime();
  const start = new Date(league.starts_at_utc).getTime();
  const end = new Date(league.ends_at_utc).getTime();
  if (now < start) return 'SCHEDULED';
  if (now < end) return 'ACTIVE';
  return 'COMPLETED';
}

module.exports = {
  leagueWindowForTimestamp,
  validateLeagueWindow,
  bindSnapshotToLeague,
  leagueStatusAt
};
