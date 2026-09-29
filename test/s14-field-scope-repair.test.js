'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RAW_PATH = path.join(ROOT, 'data', 'real-snapshots', 'persian-unity', 'S14.raw.json');
const CANONICAL_PATH = path.join(ROOT, 'data', 'canonical.json');

const EXPECTED_RANKING_CURRENT = Object.freeze({
  'S14-R09': 168142,
  'S14-R17': 145714,
  'S14-R21': 128106,
  'S14-R26': 98989,
  'S14-R29': 92869,
  'S14-R32': 80131,
  'S14-R33': 74083,
  'S14-R34': 67748,
  'S14-R38': 56408,
  'S14-R39': 52869,
  'S14-R40': 52555,
  'S14-R41': 52345,
  'S14-R42': 49585,
  'S14-R43': 48308,
  'S14-R45': 46539,
  'S14-R47': 18202,
  'S14-R48': 8462
});

test('S14 Current League remains sourced from Ranking, not Profile Total', () => {
  const raw = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
  const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));

  const rawMembers = raw.members.filter((m) => m.snapshot_id === undefined || String(m.source_member_key).startsWith('S14-R'));
  const s14 = canonical.observations.filter((o) => o.snapshot_id === 'S14');

  assert.equal(rawMembers.length, 50);
  assert.equal(s14.length, 50);

  const rawByKey = new Map(rawMembers.map((m) => [m.source_member_key, m]));
  const canonicalByKey = new Map(s14.map((o) => [o.source_member_key, o]));

  for (const [key, expected] of Object.entries(EXPECTED_RANKING_CURRENT)) {
    const rawMember = rawByKey.get(key);
    const observation = canonicalByKey.get(key);
    assert.ok(rawMember, 'missing raw member ' + key);
    assert.ok(observation, 'missing canonical observation ' + key);
    assert.equal(rawMember.current_league_clan_medals, expected, key + ' raw Ranking value');
    assert.equal(observation.current_league_clan_medals, expected, key + ' canonical Ranking value');
    assert.equal(rawMember.profile_total_clan_medal_count, observation.profile_total_clan_medal_count, key + ' Profile Total preserved');
    assert.notEqual(expected, observation.profile_total_clan_medal_count, key + ' must remain distinct from Profile Total');
  }

  const unequal = s14.filter((o) => o.current_league_clan_medals !== o.profile_total_clan_medal_count);
  assert.equal(unequal.length, 17);

  for (const observation of s14) {
    const rawMember = rawByKey.get(observation.source_member_key);
    assert.ok(rawMember, 'raw member missing for ' + observation.source_member_key);
    assert.equal(observation.profile_total_clan_medal_count, rawMember.profile_total_clan_medal_count);
    assert.equal(observation.total_kills, rawMember.total_kills);
    assert.equal(observation.current_league_clan_medals, rawMember.current_league_clan_medals);
    assert.deepEqual(
      observation.provenance?.evidence_refs,
      ['EV-REAL-PERSIAN-UNITY-S14'],
      observation.observation_id + ' evidence provenance'
    );
  }

  const amin = canonicalByKey.get('S14-R40');
  assert.equal(amin.current_league_clan_medals, 52555);
  assert.equal(amin.profile_total_clan_medal_count, 407548);
  assert.equal(amin.total_kills, 91455);
});
