'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

test('Product UI parity surface: preserves the established viewer interaction model', () => {
  const app = read('site/app.js');
  const index = read('site/index.html');

  for (const token of ['نمایش ساده', 'نمایش خلاصه', 'نمایش گرافیکی', 'data-sort', 'search-input', 'snapshot-select', 'clan-select']) {
    assert.ok(app.includes(token), 'missing UI capability: ' + token);
  }

  for (const page of ['archive.html', 'players.html', 'player.html', 'member-history.html']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'site', page)));
  }

  assert.equal(index.includes('./data/ucs-vertical-slice.js'), true);
  assert.equal(app.includes('fetch('), false);
  assert.equal(app.includes('WebSocket'), false);
  assert.equal(app.includes('http://'), false);
  assert.equal(app.includes('https://'), false);
});

test('Product UI is multi-clan by read-model design, not clan-specific branching', () => {
  const app = read('site/app.js');
  assert.ok(app.includes('model.clans'));
  assert.ok(app.includes('params.get(\'clan\')'));
  assert.ok(app.includes('s.clan_id === activeClanId'));
  assert.equal(app.includes('PERSIA'), false);
});
test('Product UI adds restrained Snapshot navigation, archive activity and safe theme switching', () => {
  const app = read('site/app.js');
  const css = read('site/styles.css');

  for (const token of ['snapshotNav', 'Snapshot قبلی', 'Snapshot بعدی', 'activityForSnapshot', 'eventLabel', 'theme-toggle', "localStorage.getItem('ucs-theme')"]) {
    assert.ok(app.includes(token), 'missing UI enhancement: ' + token);
  }
  for (const token of ['.snapshot-nav', '.changes', '.change-pill', '.theme-toggle', 'html[data-theme="light"]']) {
    assert.ok(css.includes(token), 'missing UI style: ' + token);
  }
  assert.doesNotMatch(app, /RawExtraction|SnapshotInput/);
  assert.equal(app.includes('fetch('), false);
});

test('Product UI has a global dashboard plus a shared Clan Workspace route', () => {
  const app = read('site/app.js');
  const index = read('site/index.html');
  const workspace = read('site/clan.html');
  assert.match(index,/data-page="global-dashboard"/);
  assert.match(workspace,/data-page="clan-workspace"/);
  for (const token of ['function globalDashboard()','function clanWorkspace()','model.clans','params.get(\'clan\')','bindNavContext']) {
    assert.ok(app.includes(token),'missing scalable multi-clan surface: '+token);
  }
  assert.doesNotMatch(app,/CLAN-UCS-DEMO|UCS Demo Clan|PERSIA|GOLDENCROWN/);
});
test('Product UI keeps scoped navigation and blocks cross-Clan profile fallback', () => {
  const app = read('site/app.js');
  for (const token of ['scopedObs','scopedMemberships','activeClanId','بازیکن در این Clan پیدا نشد']) assert.ok(app.includes(token));
});
