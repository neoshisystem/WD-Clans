'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const { validateCanonicalModel } = require('../src/canonical');
const { stableStringify } = require('../src/projection');
const { buildStaticDataBundle } = require('../src/static-data');
const { generateStaticVerticalSlice } = require('../scripts/generate-static-vertical-slice');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_PATH = path.join(ROOT, 'examples/vertical-slice/canonical.json');
const STATIC_JSON_PATH = path.join(ROOT, 'site/data/ucs-vertical-slice.json');
const STATIC_BROWSER_PATH = path.join(ROOT, 'site/data/ucs-vertical-slice.js');
const INDEX_PATH = path.join(ROOT, 'site/index.html');
const APP_PATH = path.join(ROOT, 'site/app.js');

function readCanonical() {
  return JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
}

test('Vertical Slice 1: synthetic Canonical fixture validates and has no legacy clan data', () => {
  const canonical = readCanonical();
  assert.equal(validateCanonicalModel(canonical).valid, true);
  assert.equal(canonical.observations[0].source_identity.source_system, 'UCS_SYNTHETIC');
  assert.equal(canonical.global_player_identities[0].global_player_id, 'GP-SYN-001');
  assert.ok(!JSON.stringify(canonical).includes('PERSIA'));
  assert.ok(!JSON.stringify(canonical).includes('GOLDENCROWN'));
});

test('Vertical Slice 2: Canonical to Projection to Static bundle is deterministic and non-mutating', () => {
  const canonical = readCanonical();
  const before = stableStringify(canonical);

  const first = buildStaticDataBundle(canonical);
  const second = buildStaticDataBundle(canonical);

  assert.equal(stableStringify(first), stableStringify(second));
  assert.equal(stableStringify(canonical), before);
});

test('Vertical Slice 3: changed Canonical data changes the Static output', () => {
  const canonical = readCanonical();
  const changed = structuredClone(canonical);
  changed.observations[0].display_name = 'Demo Operator Revised';
  changed.observations[0].current_league_clan_medals = 421;

  const after = buildStaticDataBundle(changed);

  assert.equal(after.read_model.snapshots[0].members[0].display_name, 'Demo Operator Revised');
  assert.equal(after.read_model.snapshots[0].members[0].current_league_clan_medals, 421);
  assert.notEqual(stableStringify(buildStaticDataBundle(canonical)), stableStringify(after));
});

test('Vertical Slice 4: missing/null values and field provenance survive', () => {
  const bundle = buildStaticDataBundle(readCanonical());
  const member = bundle.read_model.snapshots[0].members[0];

  assert.equal(member.role, null);
  assert.equal(member.last_online_utc, null);
  assert.equal(member.provenance.field_provenance.role.status, 'UNKNOWN');
  assert.equal(member.provenance.field_provenance.last_online_utc.status, 'NOT_VISIBLE');
  assert.deepEqual(bundle.provenance.evidence_refs, ['EV-SYN-001']);
});

test('Vertical Slice 5: committed static artifacts equal regenerated output', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ucs-static-slice-'));
  const jsonPath = path.join(tempDir, 'bundle.json');
  const browserPath = path.join(tempDir, 'bundle.js');

  try {
    const generated = generateStaticVerticalSlice({
      canonicalPath: CANONICAL_PATH,
      jsonPath,
      browserPath
    });

    assert.equal(fs.readFileSync(STATIC_JSON_PATH, 'utf8'), generated.json);
    assert.equal(fs.readFileSync(STATIC_BROWSER_PATH, 'utf8'), generated.browser);

    const committedJson = JSON.parse(fs.readFileSync(STATIC_JSON_PATH, 'utf8'));
    const sandbox = { globalThis: {} };
    vm.createContext(sandbox);
    vm.runInContext(fs.readFileSync(STATIC_BROWSER_PATH, 'utf8'), sandbox);
    assert.equal(
      JSON.stringify(sandbox.globalThis.UCS_STATIC_DATA),
      JSON.stringify(committedJson)
    );
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('Vertical Slice 6: UI consumes the local static bundle without runtime services', () => {
  const index = fs.readFileSync(INDEX_PATH, 'utf8');
  const app = fs.readFileSync(APP_PATH, 'utf8');

  assert.match(index, /<script src="\.\/data\/ucs-vertical-slice\.js"><\/script>/);
  assert.match(index, /<script src="\.\/app\.js"><\/script>/);
  assert.match(app, /globalThis\.UCS_STATIC_DATA/);

  for (const content of [index, app]) {
    assert.equal(content.includes('http://'), false);
    assert.equal(content.includes('https://'), false);
    assert.equal(content.includes('fetch('), false);
    assert.equal(content.includes('WebSocket'), false);
    assert.equal(content.includes('require('), false);
  }
});
