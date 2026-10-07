'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');

test('Iranian Army [PU] SA03 is complete, semantically mapped, and identity-safe', () => {
  const canonical = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/canonical.json'), 'utf8'));
  const staticData = JSON.parse(fs.readFileSync(path.join(ROOT, 'site/data/ucs-vertical-slice.json'), 'utf8'));
  const observations = canonical.observations.filter(o => o.snapshot_id === 'SA03');
  const snapshot = canonical.snapshots.find(s => s.snapshot_id === 'SA03');
  assert.equal(snapshot?.member_count, 50);
  assert.equal(observations.length, 50);
  assert.equal(observations.filter(o => o.identity_resolution_status === 'CONFIRMED').length, 48);
  assert.equal(observations.filter(o => o.identity_resolution_status === 'UNRESOLVED').length, 2);
  assert.deepEqual(observations.find(o => o.display_name === 'ehsan')?.weapons, { '25mm': 1342, hydra: 461, hellfire: 74 });
  assert.equal(observations.find(o => o.display_name === 'Falcon')?.identity_resolution_status, 'UNRESOLVED');
  assert.equal(observations.find(o => o.display_name === 'mohammad')?.identity_resolution_status, 'UNRESOLVED');
  assert.equal(canonical.delta_results.filter(d => d.current_observation_id?.startsWith('SA03::')).length, 86);
  assert.equal(canonical.delta_results.filter(d => d.current_observation_id?.startsWith('SA03::') && d.delta < 0).length, 0);
  const sa03 = staticData.read_model.snapshots.find(s => s.snapshot_id === 'SA03');
  assert.equal(sa03?.members.length, 50);
  assert.equal(sa03?.members.filter(m => m.identity_resolution_status === 'CONFIRMED').length, 48);
});
