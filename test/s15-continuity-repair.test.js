'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { ProjectionEngine } = require('../src/projection');
const { validateCanonicalModel } = require('../src/canonical');

const ROOT = require('node:path').resolve(__dirname, '..');
const CANONICAL_PATH = require('node:path').join(ROOT, 'data', 'canonical.json');
const STATIC_PATH = require('node:path').join(ROOT, 'site', 'data', 'ucs-vertical-slice.json');

const EXPECTED = {
  'S15-R01':'S14-R02','S15-R02':'S14-R01','S15-R03':'S14-R03','S15-R04':'S14-R04','S15-R05':'S14-R07',
  'S15-R06':'S14-R05','S15-R07':'S14-R08','S15-R08':'S14-R06','S15-R09':'S14-R10','S15-R10':'S14-R11',
  'S15-R11':'S14-R14','S15-R12':'S14-R09','S15-R13':'S14-R18','S15-R14':'S14-R13','S15-R15':'S14-R22',
  'S15-R16':'S14-R12','S15-R17':'S14-R15','S15-R18':'S14-R19','S15-R19':'S14-R20','S15-R20':'S14-R17',
  'S15-R21':'S14-R25','S15-R22':'S14-R21','S15-R23':'S14-R16','S15-R24':'S14-R23','S15-R25':'S14-R27',
  'S15-R26':'S14-R24','S15-R27':'S14-R26','S15-R28':'S14-R30','S15-R29':'S14-R29','S15-R30':'S14-R28',
  'S15-R31':'S14-R45','S15-R32':'S14-R33','S15-R33':'S14-R31','S15-R34':'S14-R32','S15-R35':'S14-R34',
  'S15-R36':'S14-R35','S15-R37':'S14-R37','S15-R38':'S14-R47','S15-R39':'S14-R42','S15-R40':'S14-R36',
  'S15-R41':'S14-R41','S15-R42':'S14-R43','S15-R43':'S14-R38','S15-R44':'S14-R39','S15-R45':'S14-R40',
  'S15-R46':'S14-R46','S15-R47':'S14-R44','S15-R48':'S14-R49','S15-R49':'S14-R48','S15-R50':'S14-R50'
};

test('S15 fingerprint continuity repair keeps identity unresolved and maps all 50 observations', () => {
  const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
  validateCanonicalModel(canonical);

  const s15Cases = canonical.resolution_cases.filter((item) => item.observation_id.startsWith('S15::'));
  assert.equal(s15Cases.length, 50);
  assert.equal(s15Cases.every((item) => item.status === 'UNRESOLVED'), true);
  assert.equal(canonical.global_player_identities.length, 2);
  assert.equal(canonical.membership_events.length, 0);
  assert.equal(canonical.membership_episodes.length, 2);
  assert.equal(canonical.delta_results.filter((item) => item.current_observation_id?.startsWith('S15::')).length, 0);

  for (const resolution of s15Cases) {
    const expectedPriorKey = EXPECTED[canonical.observations.find((o) => o.observation_id === resolution.observation_id).source_member_key];
    assert.equal(resolution.signals?.continuity?.assessment_state, 'CONTINUOUS_CANDIDATE');
    assert.equal(resolution.signals?.continuity?.prior_source_member_key, expectedPriorKey);
    assert.equal(resolution.signals?.continuity?.prior_observation_id, 'S14::R' + String(Number(expectedPriorKey.slice(5))).padStart(3, '0'));
    assert.ok(Array.isArray(resolution.signals.continuity.contradictions));
  }
});

test('S15 fingerprint continuity repair produces 50 matched pairs, no derived roster changes, and 100 derived metric records', () => {
  const canonical = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
  const projected = new ProjectionEngine().projectAll(canonical);

  const deltas = projected.snapshot_delta_results.filter((item) => item.current_observation_id.startsWith('S15::'));
  const changes = projected.snapshot_membership_changes.filter((item) => item.snapshot_id === 'S15');

  assert.equal(deltas.length, 100);
  assert.equal(deltas.filter((item) => item.metric_key === 'total_kills').length, 50);
  assert.equal(deltas.filter((item) => item.metric_key === 'current_league_clan_medals').length, 50);
  assert.equal(changes.length, 0);

  assert.equal(deltas.filter((item) => item.status === 'ANOMALY').length, 1);
  assert.equal(deltas.filter((item) => item.metric_key === 'total_kills' && item.status === 'ANOMALY').length, 1);
  assert.equal(deltas.filter((item) => item.metric_key === 'current_league_clan_medals' && item.status === 'ANOMALY').length, 0);
  assert.equal(deltas.filter((item) => item.metric_key === 'total_kills' && item.status === 'VALID').reduce((sum, item) => sum + item.delta, 0), 142263);
  assert.equal(deltas.filter((item) => item.metric_key === 'current_league_clan_medals' && item.status === 'VALID').length, 50);
  assert.equal(deltas.filter((item) => item.metric_key === 'current_league_clan_medals' && item.status === 'VALID').reduce((sum, item) => sum + item.delta, 0), 2258332);

  const lifekillsAnomaly = deltas.find((item) => item.metric_key === 'total_kills' && item.status === 'ANOMALY');
  assert.equal(lifekillsAnomaly.current_observation_id, 'S15::R045');
  assert.equal(lifekillsAnomaly.delta, -300);
  assert.equal(lifekillsAnomaly.baseline_observation_id, 'S14::R040');

  const staticData = JSON.parse(fs.readFileSync(STATIC_PATH, 'utf8'));
  const staticDeltas = staticData.read_model.snapshot_delta_results.filter((item) => item.current_observation_id.startsWith('S15::'));
  const staticChanges = staticData.read_model.snapshot_membership_changes.filter((item) => item.snapshot_id === 'S15');
  assert.equal(staticDeltas.length, 100);
  assert.equal(staticChanges.length, 0);
});

// Historical S14 field-scope repair assertions are covered by test/s14-field-scope-repair.test.js.
