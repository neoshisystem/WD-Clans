'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

const { validateCanonicalModel } = require('../src/canonical');
const { stableStringify } = require('../src/projection');
const { buildStaticDataBundle, serializeBrowserBundle } = require('../src/static-data');
const { generateStaticVerticalSlice } = require('../scripts/generate-static-vertical-slice');

const ROOT = path.resolve(__dirname, '..');
const CANONICAL_PATH = path.join(ROOT, 'examples/vertical-slice/canonical.json');
const STATIC_JSON_PATH = path.join(ROOT, 'site/data/ucs-vertical-slice.json');
const STATIC_BROWSER_PATH = path.join(ROOT, 'site/data/ucs-vertical-slice.js');
const PUBLIC_CANONICAL_PATH = path.join(ROOT, 'data/canonical.json');
const INDEX_PATH = path.join(ROOT, 'site/index.html');
const APP_PATH = path.join(ROOT, 'site/app.js');

function readCanonical() {
  return JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
}

class FakeNode {
  constructor(id = null) {
    this.id = id;
    this.textContent = '';
    this.hidden = false;
    this.className = '';
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }
}

function browserFixture(deltaResults) {
  return {
    static_data_version: '0.1',
    source: { type: 'canonical', schema_version: '0.1' },
    read_model: {
      projection_version: '0.1',
      global_players: [
        { global_player_id: 'GP-S12-KILL-001', display_name: 'Delta Kill' },
        { global_player_id: 'GP-S12-MEDAL-002', display_name: 'Delta Medal' }
      ],
      clans: [],
      snapshots: [],
      player_history: [],
      activity: [],
      delta_results: deltaResults
    },
    provenance: {
      canonical_refs: deltaResults.map((delta) => delta.delta_id),
      evidence_refs: ['PERSIA-S12-RANKING-HTML']
    }
  };
}

function runBrowserApp(bundle) {
  const nodeIds = [
    'clan-name', 'snapshot-meta', 'snapshot-id', 'member-count',
    'projection-version', 'evidence-count', 'canonical-ref-count',
    'evidence-ref-list', 'static-version', 'role-value',
    'last-online-status', 'members-body', 'delta-results-body',
    'delta-empty-state', 'bundle-hash'
  ];
  const nodes = new Map(nodeIds.map((id) => [id, new FakeNode(id)]));
  const document = {
    getElementById(id) {
      return nodes.get(id) || null;
    },
    createElement() {
      return new FakeNode();
    }
  };
  const sandbox = {
    globalThis: { UCS_STATIC_DATA: bundle },
    document
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(APP_PATH, 'utf8'), sandbox);
  return nodes;
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
      canonicalPath: PUBLIC_CANONICAL_PATH,
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


test('Delta UI consumer: consumes only projected Read Model data', () => {
  const app = fs.readFileSync(APP_PATH, 'utf8');
  assert.match(app, /model\.delta_results/);
  assert.match(app, /deltaMapForSnapshot/);
  assert.match(app, /d\.medals\?\.delta/);
  assert.match(app, /d\.kills\?\.delta/);
  assert.doesNotMatch(app, /previousByGlobalPlayerId|RawExtraction|SnapshotInput|identityDecisionsBySourceKey|canonicalState/);
  assert.equal(app.includes('fetch('), false);
});

test('Delta projection contract: synthetic S12 deltas remain available to the Static Bundle', () => {
  const canonical = structuredClone(readCanonical());
  const baseline = structuredClone(canonical.observations[0]);
  baseline.observation_id = 'VS-S00::M-001';
  baseline.snapshot_id = 'VS-S00';
  baseline.total_kills = 11154;
  baseline.current_league_clan_medals = 420;
  baseline.membership_episode_id = null;

  const snapshot = structuredClone(canonical.snapshots[0]);
  snapshot.snapshot_id = 'VS-S00';
  snapshot.sequence = 1;
  snapshot.official_timestamp_utc = '2026-09-25T00:00:00.000Z';
  canonical.snapshots.unshift(snapshot);
  canonical.observations.unshift(baseline);
  canonical.snapshots[1].sequence = 2;
  canonical.clan_leagues[0].opening_snapshot_id = 'VS-S00';
  canonical.membership_episodes[0].started_from_snapshot_id = 'VS-S00';
  canonical.observations[1].total_kills = 12345;
  canonical.observations[1].current_league_clan_medals = 6344;
  canonical.delta_results = [
    {
      delta_id: 'D-S12-KILL',
      current_observation_id: 'VS-S01::M-001',
      global_player_id: 'GP-SYN-001',
      baseline_observation_id: 'VS-S00::M-001',
      baseline_type: 'PREVIOUS_VALID_OBSERVATION',
      metric_key: 'total_kills',
      scope: 'PLAYER_LIFETIME',
      clan_id: null,
      league_id: null,
      membership_episode_id: null,
      delta: 1191,
      status: 'VALID',
      reason: null
    },
    {
      delta_id: 'D-S12-MEDAL',
      current_observation_id: 'VS-S01::M-001',
      global_player_id: 'GP-SYN-001',
      baseline_observation_id: 'VS-S00::M-001',
      baseline_type: 'PREVIOUS_VALID_OBSERVATION',
      metric_key: 'current_league_clan_medals',
      scope: 'LEAGUE',
      clan_id: 'CLAN-UCS-DEMO',
      league_id: 'LEAGUE-UCS-DEMO-2026W39',
      membership_episode_id: null,
      delta: 5924,
      status: 'VALID',
      reason: null
    }
  ];

  validateCanonicalModel(canonical);
  const bundle = buildStaticDataBundle(canonical);
  const lifetime = bundle.read_model.delta_results.find((delta) => delta.metric_key === 'total_kills');
  const league = bundle.read_model.delta_results.find((delta) => delta.metric_key === 'current_league_clan_medals');

  assert.equal(lifetime.delta, 1191);
  assert.equal(league.delta, 5924);
});


test('Real Persian UNITY S14 checkpoint is represented in Canonical and static projection', () => {
  const canonical = JSON.parse(fs.readFileSync(PUBLIC_CANONICAL_PATH, 'utf8'));
  const snapshot = canonical.snapshots.find((item) => item.snapshot_id === 'S14' && item.clan_id === 'CLAN-PERSIAN-UNITY');
  assert.ok(snapshot);
  assert.equal(snapshot.member_count, 50);
  assert.equal(snapshot.sequence, 2);
  assert.equal(snapshot.official_timestamp_utc, '2026-09-27T19:30:00.000Z');
  assert.equal(canonical.resolution_cases.filter((item) => item.observation_id.startsWith('S14::')).length, 50);
  assert.equal(canonical.observations.filter((item) => item.snapshot_id === 'S14').length, 50);
  assert.equal(canonical.observations.filter((item) => item.snapshot_id === 'S14' && item.identity_resolution_status === 'CONFIRMED').length, 35);
  assert.equal(canonical.observations.filter((item) => item.snapshot_id === 'S14' && item.identity_resolution_status === 'UNRESOLVED').length, 15);
  assert.equal(canonical.delta_results.filter((item) => item.current_observation_id?.startsWith('S14::')).length, 0);

  const bundle = buildStaticDataBundle(canonical);
  const projected = bundle.read_model.snapshots.find((item) => item.snapshot_id === 'S14');
  assert.ok(projected);
  assert.equal(projected.members.length, 50);
  const first = projected.members[0];
  assert.equal(first.last_online_display, '4m');
  assert.deepEqual(first.lifetime_medals, { bronze: 2, gold: 2, silver: 4 });
  assert.deepEqual(first.weapons, { '25mm': 1301, hellfire: 72, hydra: 450 });
  assert.equal(first.total_kills, 291112);
  assert.equal(first.current_league_clan_medals, 345257);
});


test('Real Iranian Army SA02: confirmed Global-ID renames are not projected as membership changes', () => {
  const canonical = JSON.parse(fs.readFileSync(PUBLIC_CANONICAL_PATH, 'utf8'));
  const bundle = buildStaticDataBundle(canonical);
  const changes = bundle.read_model.snapshot_membership_changes
    .filter((change) => change.snapshot_id === 'SA02' && change.clan_id === 'CLAN-IRANIAN-ARMY-PU');

  assert.equal(changes.length, 6);

  const joined = changes
    .filter((change) => change.change_type === 'JOIN')
    .map((change) => change.observation_id)
    .sort();
  const left = changes
    .filter((change) => change.change_type === 'LEAVE')
    .map((change) => change.observation_id)
    .sort();

  assert.deepEqual(joined, [
    'SA02::SA02-R45',
    'SA02::SA02-R48',
    'SA02::SA02-R49'
  ]);
  assert.deepEqual(left, [
    'SA01::SA01-R19',
    'SA01::SA01-R24',
    'SA01::SA01-R42'
  ]);

  const falseRenameIds = [
    'SA02::SA02-R09',
    'SA02::SA02-R10',
    'SA02::SA02-R11',
    'SA02::SA02-R17',
    'SA02::SA02-R20',
    'SA02::SA02-R21',
    'SA02::SA02-R23',
    'SA02::SA02-R32',
    'SA01::SA01-R09',
    'SA01::SA01-R11',
    'SA01::SA01-R12',
    'SA01::SA01-R16',
    'SA01::SA01-R20',
    'SA01::SA01-R24',
    'SA01::SA01-R26',
    'SA01::SA01-R30',
    'SA01::SA01-R35'
  ];
  assert.equal(
    changes.some((change) => falseRenameIds.includes(change.observation_id)),
    false
  );
});
