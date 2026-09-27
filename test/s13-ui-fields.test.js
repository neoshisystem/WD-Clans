'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('S13 UI field surface includes Last Online, lifetime medals, and weapon levels', () => {
  const canonical = JSON.parse(fs.readFileSync('data/canonical.json', 'utf8'));
  const observations = canonical.observations.filter((item) => item.snapshot_id === 'S13');
  assert.equal(observations.length, 48);
  assert.ok(observations.every((item) => item.last_online_display));
  assert.ok(observations.every((item) => item.lifetime_medals));
  assert.ok(observations.every((item) => item.weapons));
  const app = fs.readFileSync('site/app.js', 'utf8');
  assert.ok(app.includes('lastOnlineFor'));
  assert.ok(app.includes('weaponsFor'));
  assert.ok(app.includes('نشان‌ها'));
});
