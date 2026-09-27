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


test('Delta UI consumer: reads projected deltas faithfully without recalculation', () => {
  const deltas = [
    {
      delta_id: 'D-S12-KILL',
      current_observation_id: 'S12::PERSIA-S12-RANK-01',
      global_player_id: 'GP-S12-KILL-001',
      baseline_observation_id: 'S11-DELTA-OLD::PERSIA-S12-PREV-KILL',
      baseline_type: 'PREVIOUS_VALID_OBSERVATION',
      metric_key: 'total_kills',
      scope: 'PLAYER_LIFETIME',
      clan_id: null,
      league_id: null,
      membership_episode_id: null,
      delta: 1191,
      status: 'VALID',
      reason: null,
      provenance: {
        canonical_ref: 'D-S12-KILL',
        evidence_refs: ['PERSIA-S12-RANKING-HTML']
      }
    },
    {
      delta_id: 'D-S12-MEDAL',
      current_observation_id: 'S12::PERSIA-S12-RANK-02',
      global_player_id: 'GP-S12-MEDAL-002',
      baseline_observation_id: 'S12-DELTA-PREV::PERSIA-S12-PREV-MEDAL',
      baseline_type: 'PREVIOUS_VALID_OBSERVATION',
      metric_key: 'current_league_clan_medals',
      scope: 'LEAGUE',
      clan_id: 'PERSIA',
      league_id: 'PILOT::LEAGUE::2026-09-24',
      membership_episode_id: null,
      delta: 5924,
      status: 'VALID',
      reason: null,
      provenance: {
        canonical_ref: 'D-S12-MEDAL',
        evidence_refs: ['PERSIA-S12-RANKING-HTML']
      }
    },
    {
      delta_id: 'D-S12-ANOMALY',
      current_observation_id: 'S12::PERSIA-S12-RANK-01',
      global_player_id: 'GP-S12-KILL-001',
      baseline_observation_id: 'S11-DELTA-OLD::PERSIA-S12-PREV-KILL',
      baseline_type: 'PREVIOUS_VALID_OBSERVATION',
      metric_key: 'total_kills',
      scope: 'PLAYER_LIFETIME',
      clan_id: null,
      league_id: null,
      membership_episode_id: null,
      delta: -10,
      status: 'ANOMALY',
      reason: 'monotonic_metric_decreased',
      provenance: {
        canonical_ref: 'D-S12-ANOMALY',
        evidence_refs: ['PERSIA-S12-RANKING-HTML']
      }
    },
    {
      delta_id: 'D-S12-NOBASELINE',
      current_observation_id: 'S12::PERSIA-S12-RANK-01',
      global_player_id: 'GP-S12-KILL-001',
      baseline_observation_id: null,
      baseline_type: 'NONE',
      metric_key: 'total_kills',
      scope: 'PLAYER_LIFETIME',
      clan_id: null,
      league_id: null,
      membership_episode_id: null,
      delta: null,
      status: 'BASELINE_UNAVAILABLE',
      reason: 'previous_valid_observation_missing',
      provenance: {
        canonical_ref: 'D-S12-NOBASELINE',
        evidence_refs: ['PERSIA-S12-RANKING-HTML']
      }
    },
    {
      delta_id: 'D-S12-NEW-LEAGUE',
      current_observation_id: 'S12::PERSIA-S12-RANK-02',
      global_player_id: 'GP-S12-MEDAL-002',
      baseline_observation_id: null,
      baseline_type: 'NEW_LEAGUE_ZERO',
      metric_key: 'current_league_clan_medals',
      scope: 'LEAGUE',
      clan_id: 'PERSIA',
      league_id: 'PILOT::LEAGUE::2026-09-24',
      membership_episode_id: null,
      delta: 500,
      status: 'VALID',
      reason: 'new_league_baseline_zero',
      provenance: {
        canonical_ref: 'D-S12-NEW-LEAGUE',
        evidence_refs: ['PERSIA-S12-RANKING-HTML']
      }
    }
  ];

  const bundle = browserFixture(deltas);
  const before = JSON.stringify(bundle);
  const nodes = runBrowserApp(bundle);
  const rows = nodes.get('delta-results-body').children;

  assert.equal(rows.length, deltas.length);
  assert.equal(rows[0].children[2].textContent, 'Delta Kill · GP-S12-KILL-001');
  assert.equal(rows[0].children[3].textContent, '+1191');
  assert.equal(rows[0].children[4].textContent, 'VALID');

  assert.equal(rows[1].children[3].textContent, '+5924');
  assert.equal(rows[1].children[4].textContent, 'VALID');
  assert.equal(rows[1].children[5].textContent, 'PREVIOUS_VALID_OBSERVATION');

  assert.equal(rows[2].children[3].textContent, '-10');
  assert.equal(rows[2].children[4].textContent, 'ANOMALY');
  assert.equal(rows[2].children[8].textContent, 'monotonic_metric_decreased');

  assert.equal(rows[3].children[3].textContent, '—');
  assert.equal(rows[3].children[4].textContent, 'BASELINE_UNAVAILABLE');
  assert.equal(rows[3].children[5].textContent, 'NONE');

  assert.equal(rows[4].children[3].textContent, '+500');
  assert.equal(rows[4].children[4].textContent, 'VALID');
  assert.equal(rows[4].children[5].textContent, 'NEW_LEAGUE_ZERO');

  assert.equal(nodes.get('delta-empty-state').hidden, true);
  assert.equal(JSON.stringify(bundle), before);
});

test('Delta UI consumer: preserves projected ordering and does not depend on Canonical or source inputs', () => {
  const deltas = [
    {
      delta_id: 'D-2',
      current_observation_id: 'OBS-2',
      global_player_id: 'GP-S12-KILL-001',
      baseline_observation_id: null,
      baseline_type: 'NONE',
      metric_key: 'total_kills',
      scope: 'PLAYER_LIFETIME',
      clan_id: null,
      league_id: null,
      membership_episode_id: null,
      delta: null,
      status: 'BASELINE_UNAVAILABLE',
      reason: 'previous_valid_observation_missing',
      provenance: { canonical_ref: 'D-2', evidence_refs: [] }
    },
    {
      delta_id: 'D-1',
      current_observation_id: 'OBS-1',
      global_player_id: 'GP-S12-MEDAL-002',
      baseline_observation_id: null,
      baseline_type: 'NEW_LEAGUE_ZERO',
      metric_key: 'current_league_clan_medals',
      scope: 'LEAGUE',
      clan_id: 'PERSIA',
      league_id: 'L1',
      membership_episode_id: null,
      delta: 7,
      status: 'VALID',
      reason: 'new_league_baseline_zero',
      provenance: { canonical_ref: 'D-1', evidence_refs: [] }
    }
  ];
  const app = fs.readFileSync(APP_PATH, 'utf8');
  assert.doesNotMatch(app, /RawExtraction|SnapshotInput|previousByGlobalPlayerId|identityDecisionsBySourceKey|canonicalState/);

  const nodes = runBrowserApp(browserFixture(deltas));
  assert.equal(nodes.get('delta-results-body').children[0].children[0].textContent, 'PLAYER_LIFETIME');
  assert.equal(nodes.get('delta-results-body').children[1].children[0].textContent, 'LEAGUE');
});

test('Delta UI consumer: empty Static delta_results is safe and neutral', () => {
  const bundle = browserFixture([]);
  const nodes = runBrowserApp(bundle);

  assert.equal(nodes.get('delta-results-body').children.length, 0);
  assert.equal(nodes.get('delta-empty-state').hidden, false);
  assert.equal(nodes.get('delta-empty-state').textContent, 'No projected Delta records are present in this Static Data Bundle.');
  assert.notEqual(nodes.get('delta-empty-state').textContent, '0');
});


test('Delta integration: Canonical to Projection to Static Data to Browser consumer is continuous and preserves S12 deltas', () => {
  const canonical = structuredClone(readCanonical());
  const baselineSnapshot = {
    snapshot_id: 'VS-S00',
    clan_id: 'CLAN-UCS-DEMO',
    league_id: 'LEAGUE-UCS-DEMO-2026W39',
    clan_league_id: 'CLANLEAGUE::CLAN-UCS-DEMO::LEAGUE-UCS-DEMO-2026W39',
    sequence: 1,
    official_timestamp_utc: '2026-09-25T00:00:00.000Z',
    member_count: 1,
    capacity: 50,
    provenance: {
      evidence_refs: ['EV-SYN-001']
    }
  };
  const currentSnapshot = canonical.snapshots[0];
  currentSnapshot.sequence = 2;
  canonical.clan_leagues[0].opening_snapshot_id = 'VS-S00';
  canonical.membership_episodes[0].started_from_snapshot_id = 'VS-S00';

  canonical.snapshots.unshift(baselineSnapshot);
  canonical.observations.unshift({
    observation_id: 'VS-S00::M-001',
    snapshot_id: 'VS-S00',
    clan_id: 'CLAN-UCS-DEMO',
    source_member_key: 'M-001',
    source_identity: {
      source_system: 'UCS_SYNTHETIC',
      source_identity_id: 'M-001'
    },
    global_player_id: 'GP-SYN-001',
    membership_episode_id: null,
    identity_resolution_status: 'CONFIRMED',
    display_name: 'Demo Operator',
    rank: 1,
    stage: 12,
    role: null,
    weapons: {
      '25mm': 4,
      hydra: 3,
      hellfire: 2
    },
    total_kills: 11154,
    lifetime_medals: {
      bronze: 2,
      silver: 1,
      gold: 0
    },
    current_league_clan_medals: 420,
    profile_total_clan_medal_count: 420,
    last_online_utc: null,
    provenance: {
      evidence_refs: ['EV-SYN-001'],
      field_provenance: {
        last_online_utc: {
          status: 'NOT_VISIBLE',
          evidence_refs: ['EV-SYN-001']
        },
        role: {
          status: 'UNKNOWN',
          evidence_refs: ['EV-SYN-001']
        }
      }
    }
  });

  const currentObservation = canonical.observations.find(
    (observation) => observation.observation_id === 'VS-S01::M-001'
  );
  currentObservation.current_league_clan_medals = 6344;

  canonical.delta_results = [
    {
      delta_id: 'D-S12-PLAYER-LIFETIME-001',
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
      delta_id: 'D-S12-LEAGUE-001',
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

  assert.equal(validateCanonicalModel(canonical).valid, true);
  const before = stableStringify(canonical);

  const staticBundle = buildStaticDataBundle(canonical);
  assert.equal(stableStringify(canonical), before);
  assert.equal(staticBundle.read_model.delta_results.length, 2);

  const lifetime = staticBundle.read_model.delta_results.find(
    (delta) => delta.scope === 'PLAYER_LIFETIME' && delta.metric_key === 'total_kills'
  );
  const league = staticBundle.read_model.delta_results.find(
    (delta) => delta.scope === 'LEAGUE' && delta.metric_key === 'current_league_clan_medals'
  );

  assert.equal(lifetime.delta, 1191);
  assert.equal(lifetime.status, 'VALID');
  assert.equal(league.delta, 5924);
  assert.equal(league.status, 'VALID');

  const browserSource = serializeBrowserBundle(staticBundle);
  const browserSandbox = { globalThis: {} };
  vm.createContext(browserSandbox);
  vm.runInContext(browserSource, browserSandbox);

  const browserBundle = browserSandbox.globalThis.UCS_STATIC_DATA;
  assert.deepEqual(browserBundle.read_model.delta_results, staticBundle.read_model.delta_results);
  assert.deepEqual(browserBundle.provenance, staticBundle.provenance);

  const nodes = runBrowserApp(browserBundle);
  const rows = nodes.get('delta-results-body').children;

  assert.equal(rows.length, 2);

  const renderedLifetime = rows.find(
    (row) => row.children[0].textContent === 'PLAYER_LIFETIME'
  );
  const renderedLeague = rows.find(
    (row) => row.children[0].textContent === 'LEAGUE'
  );

  assert.ok(renderedLifetime);
  assert.equal(renderedLifetime.children[1].textContent, 'total_kills');
  assert.equal(renderedLifetime.children[3].textContent, '+1191');
  assert.equal(renderedLifetime.children[4].textContent, 'VALID');

  assert.ok(renderedLeague);
  assert.equal(renderedLeague.children[1].textContent, 'current_league_clan_medals');
  assert.equal(renderedLeague.children[3].textContent, '+5924');
  assert.equal(renderedLeague.children[4].textContent, 'VALID');

  assert.equal(nodes.get('delta-empty-state').hidden, true);
});

test('Delta UI consumer: absent delta_results property is safe, neutral, and non-fabricating', () => {
  const bundle = browserFixture([]);
  delete bundle.read_model.delta_results;

  const before = JSON.stringify(bundle);
  const nodes = runBrowserApp(bundle);

  assert.equal(Object.prototype.hasOwnProperty.call(bundle.read_model, 'delta_results'), false);
  assert.equal(nodes.get('delta-results-body').children.length, 0);
  assert.equal(nodes.get('delta-empty-state').hidden, false);
  assert.equal(
    nodes.get('delta-empty-state').textContent,
    'No projected Delta records are present in this Static Data Bundle.'
  );
  assert.notEqual(nodes.get('delta-empty-state').textContent, '0');
  assert.equal(JSON.stringify(bundle), before);
});
