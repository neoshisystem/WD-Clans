'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const rawDir = path.join(ROOT, 'data', 'real-snapshots', 'persian-unity');
const readJson = name => JSON.parse(fs.readFileSync(path.join(rawDir,name),'utf8'));

test('Real Snapshot RawExtraction schema is uniform and replay-safe', () => {
  for (const name of ['S13.raw.json','S14.raw.json','S15.raw.json']) {
    const raw = readJson(name);
    assert.equal(raw.schema_version, 'UCS-RAW-SNAPSHOT/0.2');
    assert.match(raw.source_artifact.content_hash.value, /^[0-9a-f]{64}$/);
    assert.match(raw.source_artifact.inventory_hash, /^[0-9a-f]{64}$/);
    assert.ok(raw.recheck.source_archive_is_replayable);
    assert.equal(raw.members.every(m => Object.hasOwn(m, 'weapon_levels')), true);
    assert.equal(raw.members.every(m => !Object.hasOwn(m, 'weapons')), true);
    assert.equal(raw.members.every(m => m.identity_resolution_status === 'UNRESOLVED' && !m.global_player_id), true);
  }
});
test('S13 recheck restores source values that were previously mistranscribed', () => {
  const raw=readJson('S13.raw.json'); const byRank=Object.fromEntries(raw.members.map(m=>[m.rank,m]));
  assert.equal(byRank[7].display_name,'ALI🇮🇷'); assert.equal(byRank[7].total_kills,113174);
  assert.equal(byRank[10].profile_total_clan_medal_count,625530); assert.equal(byRank[13].profile_total_clan_medal_count,122107);
  assert.equal(byRank[15].total_kills,137464); assert.equal(byRank[21].total_kills,93835);
  assert.equal(byRank[29].total_kills,91547); assert.equal(byRank[33].total_kills,98416);
  assert.equal(byRank[34].profile_total_clan_medal_count,1170922); assert.equal(byRank[38].profile_total_clan_medal_count,341313);
  assert.equal(byRank[44].profile_total_clan_medal_count,756498); assert.equal(byRank[47].display_name,'ErFaN.m279');
});

test('Canonical and RawExtraction agree on all source-backed S13-S15 values', () => {
  const canonical = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'canonical.json'), 'utf8'));
  const fields = [
    ['rank', 'rank'],
    ['display_name', 'display_name'],
    ['stage', 'stage'],
    ['current_league_clan_medals', 'current_league_clan_medals'],
    ['total_kills', 'total_kills'],
    ['profile_total_clan_medal_count', 'profile_total_clan_medal_count'],
    ['lifetime_medals', 'lifetime_medals'],
    ['weapons', 'weapon_levels']
  ];
  for (const snapshotId of ['S13','S14','S15']) {
    const raw = readJson(`${snapshotId}.raw.json`);
    const observations = canonical.observations.filter(o => o.snapshot_id === snapshotId);
    assert.equal(observations.length, raw.members.length);
    for (const observation of observations) {
      const member = raw.members.find(m => m.source_member_key === observation.source_member_key);
      assert.ok(member, `${snapshotId}/${observation.source_member_key} missing RawExtraction member`);
      for (const [canonicalField, rawField] of fields) {
        assert.deepEqual(
          observation[canonicalField],
          member[rawField],
          `${snapshotId}/${observation.source_member_key} field mismatch: ${canonicalField}`
        );
      }
    }
  }
});
