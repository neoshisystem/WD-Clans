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

  for (const token of ['snapshotNav', 'Snapshot قبلی', 'Snapshot بعدی', 'changesForSnapshot', 'eventLabel', 'theme-toggle', "localStorage.getItem('ucs-theme')"]) {
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
test('Product UI shows full confirmed Global Player history across Clan contexts', () => {
  const app = read('site/app.js');
  assert.ok(app.includes('const scopedObs = observations;'));
  assert.ok(app.includes('const scopedMemberships = memberships;'));
  assert.ok(app.includes('full cross-Clan observation history'));
  assert.ok(app.includes('if (!snapshot) continue;'));
  assert.match(app,/Snapshot History/);
});

test('Dedicated Clan pages expose no cross-Clan selector and preserve Clan context', () => {
  const app = read('site/app.js');
  for (const page of ['clan.html','archive.html','players.html','player.html','member-history.html']) {
    const html = read('site/' + page);
    assert.match(html,/id="topbar-tools"/);
    assert.doesNotMatch(html,/id="global-clan"/);
    assert.doesNotMatch(html,/id="clan-select"/);
    assert.doesNotMatch(html,/href="\.\/index\.html"/);
  }
  assert.ok(app.includes("new Set(['clan-viewer','archive','players','player','member-history'])"));
  assert.ok(app.includes("document.querySelectorAll('.brand')"));
});

test('Global dashboard owns the only Clan selector and dedicated pages fail closed without Clan context', () => {
  const app = read('site/app.js');
  const index = read('site/index.html');
  assert.match(index,/id="global-clan"/);
  assert.ok(app.includes("document.getElementById('global-clan') || document.getElementById('topbar-tools')"));
  assert.ok(app.includes("const activeClanId = scopedPage ? validClanId : null;"));
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


test('Global dashboard CSS selectors are syntactically repaired for Clan directory layout', () => {
  const css = read('site/styles.css');
  assert.equal(css.includes('.clan-card,.clan-card:hover,'), false);
  assert.equal(css.includes('.clan-card h2,{'), false);
  assert.equal(css.includes('.dashboard-grid,}'), false);
  assert.match(css,/\.clan-card\{display:block/);
  assert.match(css,/\.dashboard-grid\{grid-template-columns:1fr\}/);
  assert.match(css,/\.clan-card-stats span\{display:block/);
});
test('Observation profile follows all continuity-linked snapshots without creating Global Identity', () => {
 const app = read('site/app.js');
 assert.ok(app.includes('function observationHistoryFor(observationId)'));
 assert.ok(app.includes("item.status === 'VALID' && item.baseline_observation_id && item.current_observation_id"));
 assert.ok(app.includes('observations = observationHistoryFor(observationId);'));
});

test('Empty Iranian Army [PU] clan is represented without members', () => {
 const canonical = JSON.parse(read('data/canonical.json'));
 const staticData = JSON.parse(read('site/data/ucs-vertical-slice.json'));
 const canonicalClan = canonical.clans.find(c => c.clan_id === 'CLAN-IRANIAN-ARMY-PU');
 const staticClan = staticData.read_model.clans.find(c => c.clan_id === 'CLAN-IRANIAN-ARMY-PU');
 assert.equal(canonicalClan?.display_name, 'Iranian Army [PU]');
 assert.equal(staticClan?.display_name, 'Iranian Army [PU]');
 assert.equal(staticClan?.snapshot_count, 0);
 assert.deepEqual(staticClan?.current_member_refs, []);
 assert.deepEqual(staticClan?.observed_global_player_ids, []);
});

test('Real Persian UNITY S13 is represented in Canonical and static Read Model', () => {
 const canonical = JSON.parse(read('data/canonical.json'));
 const staticData = JSON.parse(read('site/data/ucs-vertical-slice.json'));
 const clan = canonical.clans.find(c => c.clan_id === 'CLAN-PERSIAN-UNITY');
 const snapshot = canonical.snapshots.find(s => s.snapshot_id === 'S13' && s.clan_id === 'CLAN-PERSIAN-UNITY');
 const observations = canonical.observations.filter(o => o.snapshot_id === 'S13');
 assert.equal(clan?.display_name,'Persian UNITY');
 assert.equal(snapshot?.sequence,1);
 assert.equal(snapshot?.official_timestamp_utc,'2026-09-26T19:30:00.000Z');
 assert.equal(snapshot?.member_count,48);
 assert.equal(observations.length,48);
 assert.equal(observations.every(o => o.identity_resolution_status === 'UNRESOLVED' && !o.global_player_id),true);
 assert.equal(staticData.read_model.clans.find(c => c.clan_id === 'CLAN-PERSIAN-UNITY')?.latest_snapshot_id,'S15');
 assert.equal(staticData.read_model.snapshots.find(s => s.snapshot_id === 'S13')?.members.length,48);
 assert.equal(staticData.read_model.delta_results.some(d => d.current_observation_id?.startsWith('S13::')),false);
});
test('Global dashboard horizontal overflow is clipped at the document boundary', () => {
 const css = read('site/styles.css');
 assert.match(css,/html\{overflow-x:clip;\}/);
 assert.match(css,/body\{overflow-x:clip;\}/);
 assert.match(css,/\.global-clan,\.topbar-tools/);
});
test('Agent handoff documentation exists', () => {
 assert.ok(fs.existsSync(path.join(ROOT,'AGENTS.md')));
 assert.ok(fs.existsSync(path.join(ROOT,'docs','UCS_AGENT_OPERATIONS.md')));
 assert.ok(fs.existsSync(path.join(ROOT,'docs','UCS_SHIFT_REPORT_2026-09-27.md')));
});


test('Real snapshot viewer preserves source-native Last Online and lifetime medal badges', () => {
 const canonical = JSON.parse(read('data/canonical.json'));
 const staticData = JSON.parse(read('site/data/ucs-vertical-slice.json'));
 const snapshot = staticData.read_model.snapshots.find(s => s.snapshot_id === 'S13');
 assert.equal(snapshot?.members.length,48);
 const first = snapshot.members.find(m => m.observation_id === 'S13::R001');
 assert.equal(first?.last_online_display, '1m');
 assert.deepEqual(first?.lifetime_medals, { bronze: 2, gold: 2, silver: 4 });
 const source = canonical.observations.find(o => o.observation_id === 'S13::R001');
 assert.equal(source?.last_online_display, '1m');
 assert.match(read('site/app.js'),/last_online_display/);
 assert.match(read('site/app.js'),/🥇/);
 assert.match(read('site/app.js'),/🥈/);
 assert.match(read('site/app.js'),/🥉/);
});


test('Generated static artifacts carry source-native Last Online for real S13', () => {
 const staticData = JSON.parse(read('site/data/ucs-vertical-slice.json'));
 const first = staticData.read_model.snapshots.find(s => s.snapshot_id === 'S13')?.members.find(m => m.observation_id === 'S13::R001');
 assert.equal(first?.last_online_display, '1m');
 assert.match(read('site/data/ucs-vertical-slice.js'),/last_online_display/);
});


test('Leaderboard Grid preserves PERSIA-grade table interaction and viewport context', () => {
 const app = read('site/app.js');
 const css = read('site/styles.css');
 for (const token of ['leaderboard-table','deltaMedals','deltaKills','previousScrollLeft','previousScrollTop','scrollTo({ top: previousScrollTop','lastOnlineFor','lifetimeMedalsFor','weaponsFor']) {
   assert.ok(app.includes(token),'missing Grid hardening behavior: '+token);
 }
 for (const token of ['.table-wrap{overflow:auto','.table-wrap th{position:sticky','.table-wrap th .sort-button{display:flex','.summary-table{min-width:0!important','.profile-history-table{min-width:1320px!important']) {
   assert.ok(css.includes(token),'missing Grid hardening style: '+token);
 }
});

test('Leaderboard simple Grid exposes full UCS observation and supported delta fields', () => {
 const app = read('site/app.js');
 for (const token of ['مدال لیگ جاری','تغییر مدال کلن','مدال کل کلن','مدال افتخار','مجموع کیل 💀','افزایش کیل 💀','لول سلاح‌ها','آخرین آنلاین']) {
   assert.ok(app.includes(token),'missing Grid field: '+token);
 }
});

test('Membership change entries preserve Clan context and are linkable', () => {
 const app = read('site/app.js');
 assert.ok(app.includes('item.href ?'));
 assert.ok(app.includes("encodeURIComponent(event.global_player_id)"));
 assert.ok(app.includes("encodeURIComponent(event.observation_id)"));
});

test('Player Snapshot History explicitly includes Clan Name and richer UCS fields', () => {
 const app = read('site/app.js');
 for (const token of ['Snapshot History','Clan Name','Δ Clan Medals','Total Clan Medals','Gold / Silver / Bronze','Total Kills','Δ Kills','Weapons','Last Online']) {
   assert.ok(app.includes(token),'missing profile history field: '+token);
 }
});

test('Scoped pages visibly expose reusable active Clan identity', () => {
 const app = read('site/app.js');
 assert.ok(app.includes('clan-context-badge'));
 assert.ok(app.includes('activeClan.display_name'));
});


test('Player Profile surfaces supported period and cumulative performance without inventing data', () => {
 const app = read('site/app.js');
 for (const token of ['function playerPerformance','عملکرد این دوره و تجمعی','مدال کلن · لیگ جاری','کیل · لیگ جاری','مدال کلن · تجمعی','کیل · تجمعی','جمع Deltaهای معتبر ثبت‌شده']) {
   assert.ok(app.includes(token),'missing profile performance surface: '+token);
 }
});

test('Common quantity formatter uses en-US thousands separators and preserves identifiers/missing values', () => {
 const vm = require('node:vm');
 const app = read('site/app.js');
 const start = app.indexOf('const formatNumber =');
 const end = app.indexOf('const iranSnapshotDateTimeFormatter =', start);
 assert.ok(start >= 0 && end > start);
 const snippet = app.slice(start, end);
 const context = { result: null };
 vm.createContext(context);
 vm.runInContext(snippet + "result = {plain: formatNumber('1621864'), kills: formatNumber('5609361'), medals: formatNumber('25300553'), positive: signed(1191), negative: signed(-1250), zero: signed(0), missing: formatNumber(null), snapshot: formatNumber('S13'), globalId: formatNumber('GP-001')};", context);
 assert.equal(JSON.stringify(context.result), JSON.stringify({
   plain: '1,621,864',
   kills: '5,609,361',
   medals: '25,300,553',
   positive: '+1,191',
   negative: '-1,250',
   zero: '0',
   missing: '—',
   snapshot: 'S13',
   globalId: 'GP-001'
 }));
});

test('Numeric stat helpers format lifetime medals, weapon levels and visible metric counts', () => {
 const app = read('site/app.js');
 assert.match(app,/formatNumber\(medals\.gold\)/);
 assert.match(app,/formatNumber\(medals\.silver\)/);
 assert.match(app,/formatNumber\(medals\.bronze\)/);
 assert.match(app,/formatNumber\(weapons\['25mm'\]\)/);
 assert.match(app,/formatNumber\(weapons\.hydra\)/);
 assert.match(app,/formatNumber\(weapons\.hellfire\)/);
 assert.match(app,/formatNumber\(count\) \+ ' رکورد معتبر'/);
 assert.match(app,/formatNumber\(performance\.currentLeagueMedalCount\)/);
 assert.match(app,/formatNumber\(performance\.currentLeagueKillCount\)/);
 assert.match(app,/formatNumber\(snapshot\.member_count\)/);
 assert.match(app,/formatNumber\(snapshot\.capacity\)/);
});
test('All primary UI surfaces route quantitative values through the common formatter', () => {
 const app = read('site/app.js');
 for (const token of [
   "formatNumber(model.clans.length)",
   "formatNumber(activeSnapshot.member_count)",
   "formatNumber(rows.length)",
   "formatNumber(snapshot.member_count)",
   "formatNumber(list.length)",
   "formatNumber(scopedObs.length)",
   "formatNumber(memberships.length)",
   "formatNumber(events.length)"
 ]) assert.ok(app.includes(token), 'missing formatted quantity: ' + token);
 assert.match(app,/function globalDashboard\(\)[\s\S]*formatNumber/);
 assert.match(app,/function leaderboard\(\)[\s\S]*formatNumber/);
 assert.match(app,/function archive\(\)[\s\S]*formatNumber/);
 assert.match(app,/function playerDirectory\(\)[\s\S]*formatNumber/);
 assert.match(app,/function playerProfile\(\)[\s\S]*formatNumber/);
 assert.match(app,/function membershipHistory\(\)[\s\S]*formatNumber/);
});

test('Technical identifiers remain presentation-opaque while quantities are formatted', () => {
 const app = read('site/app.js');
 for (const token of [
   "esc(activeSnapshot.snapshot_id)",
   "esc(snapshot.snapshot_id)",
   "encodeURIComponent(activeClanId)",
   "encodeURIComponent(member.observation_id)",
   "esc(globalId || latest.observation_id)"
 ]) assert.ok(app.includes(token), 'identifier handling missing: ' + token);
 assert.doesNotMatch(app,/formatNumber\(activeSnapshot\.snapshot_id\)/);
 assert.doesNotMatch(app,/formatNumber\(snapshot\.snapshot_id\)/);
});
test('Common Snapshot formatter renders Persian calendar + Iran local time from authoritative UTC', () => {
 const vm = require('node:vm');
 const app = read('site/app.js');
 const start = app.indexOf("const iranSnapshotDateTimeFormatter =");
 const end = app.indexOf("const base = (file, query = '') =>", start);
 assert.ok(start >= 0 && end > start);
 const snippet = app.slice(start, end);
 const context = { Intl, Date, result: null };
 vm.createContext(context);
 vm.runInContext(snippet + "result = formatSnapshotDateTime('2026-09-26T19:30:00.000Z');", context);
 assert.equal(context.result, '۴ مهر ۱۴۰۵، ساعت ۲۳:۰۰');
 assert.doesNotMatch(app, /esc\(s\.official_timestamp_utc\)/);
 assert.doesNotMatch(app, /esc\(snapshot\.official_timestamp_utc\)/);
});

test('Clan-scoped identity is visually prominent through one reusable header pattern', () => {
 const app = read('site/app.js');
 const css = read('site/styles.css');
 assert.match(app,/clan-context-identity/);
 assert.match(app,/activeClan\.display_name/);
 assert.match(css,/\.hero--clan/);
 assert.match(css,/\.clan-context-identity strong/);
 assert.match(css,/font-size:clamp\(1\.9rem,5vw,3rem\)/);
});

test('Snapshot performance clearly separates current Snapshot Delta from cumulative historical Delta', () => {
 const app = read('site/app.js');
 const css = read('site/styles.css');
 for (const token of ['performanceAggregate','این Snapshot · Δ مدال کلن','این Snapshot · Δ کیل','تجمعی تاریخی تا این Snapshot · مدال کلن','تجمعی تاریخی تا این Snapshot · کیل']) assert.ok(app.includes(token),'missing performance distinction: '+token);
 assert.match(css,/\.compact-insight--cumulative/);
 assert.match(css,/\.aggregate--performance/);
});

test('Player Snapshot History preserves Clan Name and uses localized Snapshot time', () => {
 const app = read('site/app.js');
 assert.match(app,/Snapshot History/);
 assert.match(app,/Clan Name/);
 assert.match(app,/formatSnapshotDateTime\(item\.observed_at_utc\)/);
 assert.match(app,/formatSnapshotDateTime\(membership\.started_at_utc\)/);
});

test('site/app.js remains syntactically valid as a browser script', () => {
  const app = read('site/app.js');
  assert.doesNotThrow(() => new Function(app));
});

test('Derived Snapshot continuity is exposed to the browser without weakening Canonical identity rules', () => {
 const app = read('site/app.js');
 for (const token of ['snapshot_delta_results','snapshot_membership_changes','allDeltaResults']) {
   assert.ok(app.includes(token),'missing derived continuity integration: '+token);
 }
 assert.match(app,/ورودی و خروجی اعضا از رویدادهای Membership ثبت‌شده و مقایسهٔ خودکار/);
});

test('Real Persian UNITY S14 continuity respects the hard monotonic identity contract', () => {
 const staticData = JSON.parse(read('site/data/ucs-vertical-slice.json'));
 const deltas = staticData.read_model.snapshot_delta_results.filter(d => d.current_observation_id.startsWith('S14::'));
 const changes = staticData.read_model.snapshot_membership_changes.filter(c => c.snapshot_id === 'S14');
 assert.equal(deltas.length,78);
 assert.equal(deltas.filter(d => d.metric_key === 'total_kills').length,39);
 assert.equal(deltas.filter(d => d.metric_key === 'current_league_clan_medals').length,39);
 assert.equal(deltas.filter(d => d.status === 'VALID').length,78);
 assert.equal(deltas.some(d => Number.isFinite(d.delta) && d.delta < 0), false);
 assert.equal(deltas.some(d => d.continuity?.assessment_state === 'IDENTITY_CONTRADICTION'), false);
 assert.equal(changes.filter(c => c.change_type === 'JOIN').length,11);
 assert.equal(changes.filter(c => c.change_type === 'LEAVE').length,9);
 assert.equal(changes.filter(c => c.reason === 'monotonic_identity_contradiction').length,3);
});

test('Real Persian UNITY S15 checkpoint preserves separate Current League and Profile Clan Medal scopes', () => {
 const canonical = JSON.parse(read('data/canonical.json'));
 const snapshot = canonical.snapshots.find(s => s.snapshot_id === 'S15' && s.clan_id === 'CLAN-PERSIAN-UNITY');
 const observations = canonical.observations.filter(o => o.snapshot_id === 'S15').sort((a,b) => a.rank - b.rank);
 assert.ok(snapshot);
 assert.equal(snapshot.sequence,3);
 assert.equal(snapshot.official_timestamp_utc,'2026-09-28T19:30:00.000Z');
 assert.equal(snapshot.member_count,50);
 assert.equal(observations.length,50);
 assert.equal(observations.every(o => o.identity_resolution_status === 'UNRESOLVED' && !o.global_player_id),true);
 assert.equal(canonical.resolution_cases.filter(o => o.observation_id.startsWith('S15::')).length,50);
 assert.equal(canonical.delta_results.filter(o => o.current_observation_id?.startsWith('S15::')).length,0);
 const byRank = Object.fromEntries(observations.map(o => [o.rank, o]));
 assert.equal(byRank[29].current_league_clan_medals,113266);
 assert.equal(byRank[29].profile_total_clan_medal_count,701188);
 assert.equal(byRank[20].current_league_clan_medals,159305);
 assert.equal(byRank[20].profile_total_clan_medal_count,171384);
 assert.equal(byRank[44].current_league_clan_medals,54869);
 assert.equal(byRank[44].profile_total_clan_medal_count,1174900);
});
