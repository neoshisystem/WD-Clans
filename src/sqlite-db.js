'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.UCS_DB_PATH || path.join(__dirname, '..', 'data', 'ucs.db');

function initDatabase(dbPath = DB_PATH) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS clans (
      clan_id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      status TEXT,
      provenance TEXT
    );

    CREATE TABLE IF NOT EXISTS leagues (
      league_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sequence INTEGER,
      starts_at_utc TEXT,
      ends_at_utc TEXT,
      completed_at_utc TEXT,
      status TEXT,
      provenance TEXT
    );

    CREATE TABLE IF NOT EXISTS clan_leagues (
      clan_league_id TEXT PRIMARY KEY,
      clan_id TEXT NOT NULL,
      league_id TEXT NOT NULL,
      opening_snapshot_id TEXT,
      final_snapshot_id TEXT,
      status TEXT,
      provenance TEXT,
      FOREIGN KEY(clan_id) REFERENCES clans(clan_id),
      FOREIGN KEY(league_id) REFERENCES leagues(league_id)
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      snapshot_id TEXT PRIMARY KEY,
      clan_id TEXT NOT NULL,
      league_id TEXT NOT NULL,
      clan_league_id TEXT,
      sequence INTEGER,
      official_timestamp_utc TEXT NOT NULL,
      member_count INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      provenance TEXT,
      FOREIGN KEY(clan_id) REFERENCES clans(clan_id),
      FOREIGN KEY(league_id) REFERENCES leagues(league_id)
    );

    CREATE TABLE IF NOT EXISTS global_players (
      global_player_id TEXT PRIMARY KEY,
      status TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS membership_episodes (
      membership_episode_id TEXT PRIMARY KEY,
      global_player_id TEXT NOT NULL,
      clan_id TEXT NOT NULL,
      sequence INTEGER,
      started_from_snapshot_id TEXT,
      ended_at_utc TEXT,
      ended_by_event_id TEXT,
      status TEXT,
      provenance TEXT,
      FOREIGN KEY(global_player_id) REFERENCES global_players(global_player_id),
      FOREIGN KEY(clan_id) REFERENCES clans(clan_id)
    );

    CREATE TABLE IF NOT EXISTS observations (
      observation_id TEXT PRIMARY KEY,
      snapshot_id TEXT NOT NULL,
      clan_id TEXT NOT NULL,
      rank INTEGER NOT NULL,
      display_name TEXT NOT NULL,
      role TEXT,
      stage INTEGER,
      total_kills INTEGER,
      weapons TEXT,
      lifetime_medals TEXT,
      current_league_clan_medals INTEGER,
      profile_total_clan_medal_count INTEGER,
      last_online_utc TEXT,
      source_member_key TEXT,
      source_identity TEXT,
      global_player_id TEXT,
      identity_resolution_status TEXT,
      membership_episode_id TEXT,
      provenance TEXT,
      FOREIGN KEY(snapshot_id) REFERENCES snapshots(snapshot_id),
      FOREIGN KEY(clan_id) REFERENCES clans(clan_id)
    );

    CREATE TABLE IF NOT EXISTS delta_results (
      delta_id TEXT PRIMARY KEY,
      current_observation_id TEXT NOT NULL,
      baseline_observation_id TEXT,
      global_player_id TEXT,
      metric_key TEXT NOT NULL,
      scope TEXT NOT NULL,
      clan_id TEXT,
      league_id TEXT,
      membership_episode_id TEXT,
      delta INTEGER,
      baseline_type TEXT,
      status TEXT,
      reason TEXT,
      FOREIGN KEY(current_observation_id) REFERENCES observations(observation_id)
    );

    CREATE TABLE IF NOT EXISTS membership_events (
      membership_event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      global_player_id TEXT,
      clan_id TEXT,
      membership_episode_id TEXT,
      effective_at_utc TEXT,
      observed_snapshot_id TEXT,
      from_clan_id TEXT,
      to_clan_id TEXT,
      evidence_refs TEXT,
      authority_ref TEXT,
      precision TEXT
    );
  `);

  return db;
}

function importCanonicalJson(canonicalPath, dbPath = DB_PATH) {
  const db = initDatabase(dbPath);
  const data = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));

  const insertClan = db.prepare('INSERT OR REPLACE INTO clans (clan_id, display_name, status, provenance) VALUES (?, ?, ?, ?)');
  const insertLeague = db.prepare('INSERT OR REPLACE INTO leagues (league_id, name, sequence, starts_at_utc, ends_at_utc, completed_at_utc, status, provenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const insertClanLeague = db.prepare('INSERT OR REPLACE INTO clan_leagues (clan_league_id, clan_id, league_id, opening_snapshot_id, final_snapshot_id, status, provenance) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertSnapshot = db.prepare('INSERT OR REPLACE INTO snapshots (snapshot_id, clan_id, league_id, clan_league_id, sequence, official_timestamp_utc, member_count, capacity, provenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertPlayer = db.prepare('INSERT OR REPLACE INTO global_players (global_player_id, status) VALUES (?, ?)');
  const insertEpisode = db.prepare('INSERT OR REPLACE INTO membership_episodes (membership_episode_id, global_player_id, clan_id, sequence, started_from_snapshot_id, ended_at_utc, ended_by_event_id, status, provenance) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertObs = db.prepare(`INSERT OR REPLACE INTO observations (
    observation_id, snapshot_id, clan_id, rank, display_name, role, stage, total_kills,
    weapons, lifetime_medals, current_league_clan_medals, profile_total_clan_medal_count,
    last_online_utc, source_member_key, source_identity, global_player_id, identity_resolution_status,
    membership_episode_id, provenance
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertDelta = db.prepare('INSERT OR REPLACE INTO delta_results (delta_id, current_observation_id, baseline_observation_id, global_player_id, metric_key, scope, clan_id, league_id, membership_episode_id, delta, baseline_type, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertEvent = db.prepare('INSERT OR REPLACE INTO membership_events (membership_event_id, event_type, global_player_id, clan_id, membership_episode_id, effective_at_utc, observed_snapshot_id, from_clan_id, to_clan_id, evidence_refs, authority_ref, precision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  db.exec('BEGIN TRANSACTION;');
  try {
    for (const c of data.clans || []) {
      insertClan.run(c.clan_id, c.display_name, c.status || null, JSON.stringify(c.provenance || {}));
    }
    for (const l of data.leagues || []) {
      insertLeague.run(l.league_id, l.name, l.sequence ?? null, l.starts_at_utc || null, l.ends_at_utc || null, l.completed_at_utc || null, l.status || null, JSON.stringify(l.provenance || {}));
    }
    for (const cl of data.clan_leagues || []) {
      insertClanLeague.run(cl.clan_league_id, cl.clan_id, cl.league_id, cl.opening_snapshot_id || null, cl.final_snapshot_id || null, cl.status || null, JSON.stringify(cl.provenance || {}));
    }
    for (const s of data.snapshots || []) {
      insertSnapshot.run(s.snapshot_id, s.clan_id, s.league_id, s.clan_league_id || null, s.sequence ?? null, s.official_timestamp_utc, s.member_count, s.capacity, JSON.stringify(s.provenance || {}));
    }
    for (const p of data.global_player_identities || []) {
      insertPlayer.run(p.global_player_id, p.status);
    }
    for (const ep of data.membership_episodes || []) {
      insertEpisode.run(ep.membership_episode_id, ep.global_player_id, ep.clan_id, ep.sequence ?? null, ep.started_from_snapshot_id || null, ep.ended_at_utc || null, ep.ended_by_event_id || null, ep.status || null, JSON.stringify(ep.provenance || {}));
    }
    for (const o of data.observations || []) {
      insertObs.run(
        o.observation_id, o.snapshot_id, o.clan_id, o.rank, o.display_name, o.role || null,
        o.stage ?? null, o.total_kills ?? null, JSON.stringify(o.weapons || {}), JSON.stringify(o.lifetime_medals || {}),
        o.current_league_clan_medals ?? null, o.profile_total_clan_medal_count ?? null, o.last_online_utc || null,
        o.source_member_key || null, JSON.stringify(o.source_identity || {}), o.global_player_id || null,
        o.identity_resolution_status || null, o.membership_episode_id || null, JSON.stringify(o.provenance || {})
      );
    }
    for (const d of data.delta_results || []) {
      insertDelta.run(
        d.delta_id, d.current_observation_id, d.baseline_observation_id || null, d.global_player_id || null,
        d.metric_key, d.scope, d.clan_id || null, d.league_id || null, d.membership_episode_id || null,
        d.delta ?? null, d.baseline_type || null, d.status || null, d.reason || null
      );
    }
    for (const ev of data.membership_events || []) {
      insertEvent.run(
        ev.membership_event_id, ev.event_type, ev.global_player_id || null, ev.clan_id || null,
        ev.membership_episode_id || null, ev.effective_at_utc || null, ev.observed_snapshot_id || null,
        ev.from_clan_id || null, ev.to_clan_id || null, JSON.stringify(ev.evidence_refs || []),
        ev.authority_ref || null, ev.precision || null
      );
    }
    db.exec('COMMIT;');
    console.log('Successfully imported canonical data into SQLite database:', dbPath);
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

module.exports = {
  DB_PATH,
  initDatabase,
  importCanonicalJson
};

if (require.main === module) {
  const canonicalPath = process.argv[2] || path.join(__dirname, '..', 'data', 'canonical.json');
  importCanonicalJson(canonicalPath);
}
