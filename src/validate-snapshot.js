'use strict';

const fs = require('fs');
const { bindSnapshotToLeague } = require('./league');

function fail(message) {
  console.error(`SNAPSHOT INPUT INVALID: ${message}`);
  process.exitCode = 1;
}

function validate(input) {
  if (!input || typeof input !== 'object') throw new Error('input must be an object');
  if (input.project_id !== 'UCS') throw new Error('project_id must be UCS');
  if (input.schema_version !== '0.1') throw new Error('schema_version must be 0.1');
  if (!input.clan_id) throw new Error('clan_id is required');
  const snapshot = input.snapshot;
  if (!snapshot) throw new Error('snapshot is required');
  if (!snapshot.snapshot_id) throw new Error('snapshot.snapshot_id is required');
  if (!Number.isInteger(snapshot.sequence) || snapshot.sequence < 1) throw new Error('snapshot.sequence must be >= 1');
  if (!Number.isInteger(snapshot.member_count) || snapshot.member_count < 0) throw new Error('snapshot.member_count must be >= 0');
  if (!Number.isInteger(snapshot.capacity) || snapshot.capacity < 0) throw new Error('snapshot.capacity must be >= 0');
  if (snapshot.member_count > snapshot.capacity) throw new Error('member_count cannot exceed capacity');
  const members = input.members;
  if (!Array.isArray(members)) throw new Error('members[] is required');
  if (members.length !== snapshot.member_count) throw new Error('members.length must equal snapshot.member_count');

  const ranks = new Set();
  for (const member of members) {
    if (!member.source_member_key) throw new Error('each member requires source_member_key');
    if (!Number.isInteger(member.rank) || member.rank < 1) throw new Error(`${member.display_name || 'member'} has invalid rank`);
    if (ranks.has(member.rank)) throw new Error(`duplicate rank: ${member.rank}`);
    ranks.add(member.rank);
    if (!member.display_name) throw new Error('display_name is required');
    for (const field of ['stage', 'total_kills', 'current_league_clan_medals', 'profile_total_clan_medal_count']) {
      if (!Number.isInteger(member[field]) || member[field] < 0) throw new Error(`${field} must be a non-negative integer`);
    }
    if (!member.weapons || typeof member.weapons !== 'object') throw new Error('weapons is required');
    if (!member.lifetime_medals || typeof member.lifetime_medals !== 'object') throw new Error('lifetime_medals is required');
  }

  if (!input.league) throw new Error('league is required');
  bindSnapshotToLeague(snapshot.official_timestamp_utc, input.league);

  if (!input.source?.artifact_id) throw new Error('source.artifact_id is required');
  if (!input.source?.content_hash?.algorithm || !input.source?.content_hash?.value) throw new Error('source.content_hash is required');

  return {
    valid: true,
    project_id: input.project_id,
    clan_id: input.clan_id,
    snapshot_id: snapshot.snapshot_id,
    league_id: input.league.league_id
  };
}

if (require.main === module) {
  try {
    const file = process.argv[2];
    if (!file) throw new Error('usage: node src/validate-snapshot.js <input.json>');
    const input = JSON.parse(fs.readFileSync(file, 'utf8'));
    console.log(JSON.stringify(validate(input), null, 2));
  } catch (error) {
    fail(error.message);
  }
}

module.exports = { validate };
