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

test('Product UI separates Global/Admin Dashboard from dedicated Clan Leaderboard entrypoint', () => {
  const app = read('site/app.js');
  const index = read('site/index.html');
  const clan = read('site/clan.html');

  assert.match(index,/data-page="global-dashboard"/);
  assert.match(index,/id="global-clan"/);
  assert.doesNotMatch(index,/Clan Workspace/);

  assert.match(clan,/data-page="clan-viewer"/);
  assert.match(clan,/data-route="leaderboard"/);
  assert.doesNotMatch(clan,/data-route="dashboard"/);
  assert.doesNotMatch(clan,/Clan Workspace/);

  for (const token of ['function globalDashboard()', "case 'clan-viewer': leaderboard(); break;", "page === 'global-dashboard' ? clanSelector() : ''", "base('clan.html','?clan=' + encodeURIComponent(activeClanId))", 'bindNavContext']) {
    assert.ok(app.includes(token),'missing scoped UI architecture: '+token);
  }
  assert.equal(app.includes("function clanWorkspace()"), false);
  assert.equal(app.includes("case 'clan-workspace'"), false);
  assert.doesNotMatch(app,/CLAN-UCS-DEMO|UCS Demo Clan|PERSIA|GOLDENCROWN/);
});
test('Product UI keeps scoped navigation and blocks cross-Clan profile fallback', () => {
  const app = read('site/app.js');
  for (const token of ['scopedObs','scopedMemberships','activeClanId','بازیکن در این Clan پیدا نشد']) assert.ok(app.includes(token));
});

test('Dedicated Clan pages expose no cross-Clan selector and preserve Clan context', () => {
  const app = read('site/app.js');
  for (const page of ['clan.html','archive.html','players.html','player.html','member-history.html']) {
    const html = read('site/' + page);
    assert.match(html,/id="global-clan"/);
    assert.doesNotMatch(html,/id="clan-select"/);
  }
  assert.ok(app.includes("new Set(['clan-viewer','archive','players','player','member-history'])"));
  assert.match(app,/document\\.querySelectorAll\\('\\.brand'\\)/);
});

test('Leaderboard includes compact performance deltas and per-Snapshot membership changes', () => {
  const app = read('site/app.js');
  const css = read('site/styles.css');
  for (const token of ['snapshotPerformance','compactPerformanceHtml','Δ مدال کلن','Δ کیل','membershipChangesForSnapshot','membershipChangesHtml','تغییرات اعضا']) {
    assert.ok(app.includes(token),'missing leaderboard enhancement: '+token);
  }
  for (const token of ['.compact-insights','.compact-insight','.membership-changes','.membership-change-grid']) {
    assert.ok(css.includes(token),'missing leaderboard enhancement style: '+token);
  }
});
