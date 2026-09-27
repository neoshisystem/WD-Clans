'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function read(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8');
}

test('Product UI parity surface: preserves the established PERSIA interaction model', () => {
  const app = read('site/app.js');
  const index = read('site/index.html');

  for (const token of ['نمایش ساده', 'نمایش خلاصه', 'نمایش گرافیکی', 'data-sort', 'search-input', 'snapshot-select', 'clan-select']) {
    assert.ok(app.includes(token), 'missing UI capability: ' + token);
  }

  for (const page of ['archive.html', 'players.html', 'player.html', 'member-history.html']) {
    assert.ok(fs.existsSync(path.join(ROOT, 'site', page)));
  }

  assert.match(index, /site\/data\/ucs-vertical-slice\.js/);
  assert.equal(app.includes('fetch('), false);
  assert.equal(app.includes('WebSocket'), false);
  assert.equal(app.includes('http://'), false);
  assert.equal(app.includes('https://'), false);
});

test('Product UI is multi-clan by read-model design, not PERSIA-specific branching', () => {
  const app = read('site/app.js');
  assert.ok(app.includes('model.clans'));
  assert.ok(app.includes('params.get(\'clan\')'));
  assert.ok(app.includes('s.clan_id === activeClanId'));
  assert.equal(app.includes('PERSIA'), false);
});