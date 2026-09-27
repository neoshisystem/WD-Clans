'use strict';

(function () {
  const bundle = globalThis.UCS_STATIC_DATA;
  const root = document.getElementById('app');
  if (!bundle?.read_model || !root) return;

  const model = bundle.read_model;
  const params = new URLSearchParams(location.search);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const display = (value) => value === null || value === undefined || value === '' ? '—' : String(value);
  const number = (value) => value === null || value === undefined || value === '' ? null : Number(value);
  const signed = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return display(value);
    return n > 0 ? '+' + n.toLocaleString('en-US') : n.toLocaleString('en-US');
  };
  const base = (file, query = '') => './' + file + query;
  const activeClanId = params.get('clan') && model.clans.some((c) => c.clan_id === params.get('clan')) ? params.get('clan') : (model.clans[0]?.clan_id || null);
  const activeClan = model.clans.find((c) => c.clan_id === activeClanId) || null;
  const clanSnapshots = model.snapshots.filter((s) => s.clan_id === activeClanId).slice().sort((a, b) => b.official_timestamp_utc.localeCompare(a.official_timestamp_utc));
  const requestedSnapshot = params.get('snapshot');
  const activeSnapshot = clanSnapshots.find((s) => s.snapshot_id === requestedSnapshot) || clanSnapshots[0] || null;

  function clanSelector() {
    const clans = model.clans.slice().sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || '')));
    if (!clans.length) return '';
    return '<label class="clan-select"><span>کلن</span><select id="clan-select">' +
      clans.map((clan) => '<option value="' + esc(clan.clan_id) + '" ' + (clan.clan_id === activeClanId ? 'selected' : '') + '>' + esc(clan.display_name || clan.clan_id) + '</option>').join('') +
      '</select></label>';
  }

  document.getElementById('global-clan').innerHTML = clanSelector();
  document.getElementById('global-clan').querySelector('#clan-select')?.addEventListener('change', (event) => {
    const next = new URL(location.href);
    next.searchParams.set('clan', event.target.value);
    next.searchParams.delete('snapshot');
    location.href = next.toString();
  });

  function header(title, kicker, lead = '') {
    return '<section class="hero"><span class="badge">' + esc(kicker) + '</span><h1>' + esc(title) + '</h1>' +
      (lead ? '<p>' + esc(lead) + '</p>' : '') +
      '<div class="meta-row">' +
      (activeClan ? '<span>کلن: <b>' + esc(activeClan.display_name || activeClan.clan_id) + '</b></span>' : '<span>کلنی ثبت نشده است.</span>') +
      (activeSnapshot ? '<span>Snapshot: <b>' + esc(activeSnapshot.snapshot_id) + '</b></span>' : '') +
      '</div></section>';
  }

  function deltaMapForSnapshot(snapshotId) {
    const map = new Map();
    for (const delta of Array.isArray(model.delta_results) ? model.delta_results : []) {
      if (delta.current_observation_id?.startsWith(snapshotId + '::')) {
        const key = delta.current_observation_id;
        const current = map.get(key) || {};
        if (delta.scope === 'PLAYER_LIFETIME' && delta.metric_key === 'total_kills') current.kills = delta;
        if (delta.scope === 'LEAGUE' && delta.metric_key === 'current_league_clan_medals') current.medals = delta;
        map.set(key, current);
      }
    }
    return map;
  }

  function valueFor(member, field) {
    return display(member[field]);
  }

  function leaderboard() {
    if (!activeClan || !activeSnapshot) {
      root.innerHTML = header('Leaderboard', 'UCS · LEADERBOARD', 'برای نمایش جدول، حداقل یک Clan و یک Snapshot معتبر لازم است.');
      return;
    }

    const initialRows = activeSnapshot.members.slice().sort((a, b) => (number(a.rank) ?? 999999) - (number(b.rank) ?? 999999));
    const deltas = deltaMapForSnapshot(activeSnapshot.snapshot_id);
    let mode = params.get('mode') || 'simple';
    let sortKey = null;
    let sortDir = 1;
    let query = '';

    const render = () => {
      const normalized = query.trim().toLocaleLowerCase('fa');
      let rows = initialRows.filter((member) => [
        member.rank, member.display_name, member.role, member.stage, member.current_league_clan_medals,
        member.total_kills, member.profile_total_clan_medal_count, member.last_online_utc
      ].join(' ').toLocaleLowerCase('fa').includes(normalized));

      const sortValue = (member, key) => {
        if (key === 'rank' || key === 'stage' || key === 'league' || key === 'kills' || key === 'deltaMedals' || key === 'deltaKills') {
          return {
            rank: number(member.rank),
            stage: number(member.stage),
            league: number(member.current_league_clan_medals),
            kills: number(member.total_kills),
            deltaMedals: number(deltas.get(member.observation_id)?.medals?.delta),
            deltaKills: number(deltas.get(member.observation_id)?.kills?.delta)
          }[key];
        }
        return String(member.display_name || '').toLocaleLowerCase('fa');
      };
      if (sortKey) {
        rows = rows.slice().sort((a, b) => {
          const x = sortValue(a, sortKey), y = sortValue(b, sortKey);
          if (x === y) return String(a.display_name || '').localeCompare(String(b.display_name || ''));
          if (x === null || x === undefined || Number.isNaN(x)) return 1;
          if (y === null || y === undefined || Number.isNaN(y)) return -1;
          return (x < y ? -1 : 1) * sortDir;
        });
      }

      const sortButton = (key, label) => '<button class="sort-button" data-sort="' + key + '"><span>' + label + '</span><b>' + (sortKey === key ? (sortDir > 0 ? '↑' : '↓') : '↕') + '</b></button>';
      const playerLink = (member) => {
        const id = member.global_player_id;
        if (id) return base('player.html', '?id=' + encodeURIComponent(id) + '&clan=' + encodeURIComponent(activeClanId));
        return base('player.html', '?observation=' + encodeURIComponent(member.observation_id) + '&clan=' + encodeURIComponent(activeClanId));
      };
      const summary = rows.map((member) => {
        const d = deltas.get(member.observation_id) || {};
        return '<tr>' +
          '<td>' + esc(valueFor(member, 'rank')) + '</td>' +
          '<td><span class="summary-player"><b>' + esc(valueFor(member, 'stage')) + '</b><a href="' + playerLink(member) + '">' + esc(valueFor(member, 'display_name')) + '</a></span></td>' +
          '<td>' + esc(signed(d.medals?.delta)) + '</td>' +
          '<td>' + esc(signed(d.kills?.delta)) + '</td>' +
          '<td>' + esc(valueFor(member, 'current_league_clan_medals')) + '</td>' +
          '<td>' + esc(valueFor(member, 'total_kills')) + '</td>' +
          '</tr>';
      }).join('');
      const simple = rows.map((member) => '<tr>' +
        '<td>' + esc(valueFor(member, 'rank')) + '</td>' +
        '<td><a href="' + playerLink(member) + '">' + esc(valueFor(member, 'display_name')) + '</a></td>' +
        '<td>' + esc(valueFor(member, 'role')) + '</td>' +
        '<td>' + esc(valueFor(member, 'stage')) + '</td>' +
        '<td>' + esc(valueFor(member, 'current_league_clan_medals')) + '</td>' +
        '<td>' + esc(valueFor(member, 'total_kills')) + '</td>' +
        '<td>' + esc(valueFor(member, 'profile_total_clan_medal_count')) + '</td>' +
        '<td>' + esc(valueFor(member, 'last_online_utc')) + '</td>' +
        '</tr>').join('');
      const graphic = rows.map((member) => {
        const d = deltas.get(member.observation_id) || {};
        return '<article class="member-card"><header><div><span class="rank">' + esc(valueFor(member, 'rank')) + '</span><h3>' + esc(valueFor(member, 'display_name')) + '</h3><small>' + esc(valueFor(member, 'role')) + '</small></div><a class="link-arrow" href="' + playerLink(member) + '">←</a></header><div class="stats-grid">' +
          [['استیج',member.stage],['مدال لیگ',member.current_league_clan_medals],['Δ مدال',d.medals?.delta],['جمع کیل',member.total_kills],['Δ کیل',d.kills?.delta],['آخرین آنلاین',member.last_online_utc]].map(([label, value]) => '<div class="stat"><span>' + label + '</span><strong>' + esc(label.startsWith('Δ') ? signed(value) : display(value)) + '</strong></div>').join('') +
          '</div></article>';
      }).join('');

      root.querySelector('#result-count').textContent = rows.length + ' نتیجه';
      root.querySelector('#results').innerHTML = mode === 'summary'
        ? '<div class="table-wrap"><table class="summary-table"><thead><tr><th>' + sortButton('rank','رتبه') + '</th><th>' + sortButton('name','بازیکن') + '</th><th>' + sortButton('deltaMedals','Δ مدال') + '</th><th>' + sortButton('deltaKills','Δ کیل') + '</th><th>' + sortButton('league','مدال کلن') + '</th><th>' + sortButton('kills','جمع کیل') + '</th></tr></thead><tbody>' + summary + '</tbody></table></div>'
        : mode === 'graphic'
          ? '<div class="member-grid">' + graphic + '</div>'
          : '<div class="table-wrap"><table><thead><tr><th>' + sortButton('rank','رتبه') + '</th><th>' + sortButton('name','نام کاربری') + '</th><th>سمت</th><th>' + sortButton('stage','استیج') + '</th><th>' + sortButton('league','مدال لیگ') + '</th><th>' + sortButton('kills','مجموع کیل') + '</th><th>مدال کل کلن</th><th>Last Online</th></tr></thead><tbody>' + simple + '</tbody></table></div>';

      root.querySelectorAll('[data-sort]').forEach((button) => button.onclick = () => {
        const next = button.dataset.sort;
        if (sortKey === next) sortDir *= -1; else { sortKey = next; sortDir = 1; }
        render();
      });
      root.querySelectorAll('[data-mode]').forEach((button) => button.onclick = () => { mode = button.dataset.mode; render(); });
    };

    root.innerHTML = header('جدول جامع عملکرد و تغییرات اعضای کلن', 'UCS · LEADERBOARD', 'ساختار Viewer بر پایهٔ همان الگوی تثبیت‌شدهٔ PERSIA نگه داشته شده است؛ داده‌ها از Read Model خوانده می‌شوند.') +
      '<section class="panel"><div class="toolbar">' +
      '<label class="field"><span>Snapshot</span><select id="snapshot-select">' + clanSnapshots.map((s) => '<option value="' + esc(s.snapshot_id) + '" ' + (s.snapshot_id === activeSnapshot.snapshot_id ? 'selected' : '') + '>' + esc(s.snapshot_id) + ' · ' + esc(s.official_timestamp_utc) + '</option>').join('') + '</select></label>' +
      '<label class="field search-field"><span>جستجو</span><input id="search-input" type="search" placeholder="نام بازیکن، سمت یا مقدار..."></label>' +
      '<div class="view-switch"><button data-mode="simple">نمایش ساده</button><button data-mode="summary">نمایش خلاصه</button><button data-mode="graphic">نمایش گرافیکی</button></div>' +
      '</div><div class="kpi-row"><div><span>اعضا</span><b>' + activeSnapshot.member_count + '</b></div><div><span>Snapshot</span><b>' + esc(activeSnapshot.snapshot_id) + '</b></div><div><span>Evidence</span><b>' + (bundle.provenance?.evidence_refs?.length || 0) + '</b></div><div><span>Projection</span><b>' + esc(model.projection_version) + '</b></div></div><div class="count" id="result-count"></div><div id="results"></div></section>';
    root.querySelector('#snapshot-select').onchange = (event) => {
      const next = new URL(location.href);
      next.searchParams.set('snapshot', event.target.value);
      location.href = next.toString();
    };
    root.querySelector('#search-input').oninput = (event) => { query = event.target.value; render(); };
    render();
  }

  function archive() {
    const snapshots = clanSnapshots;
    const deltaResults = Array.isArray(model.delta_results) ? model.delta_results : [];
    const aggregate = (snapshotId) => {
      let medals = 0, kills = 0, medalCount = 0, killCount = 0;
      for (const delta of deltaResults) {
        if (!delta.current_observation_id?.startsWith(snapshotId + '::') || delta.status !== 'VALID') continue;
        if (delta.scope === 'LEAGUE' && delta.metric_key === 'current_league_clan_medals' && Number.isFinite(Number(delta.delta))) { medals += Number(delta.delta); medalCount += 1; }
        if (delta.scope === 'PLAYER_LIFETIME' && delta.metric_key === 'total_kills' && Number.isFinite(Number(delta.delta))) { kills += Number(delta.delta); killCount += 1; }
      }
      return { medals: medalCount ? signed(medals) : '— / baseline', kills: killCount ? signed(kills) : '— / baseline' };
    };
    root.innerHTML = header('آرشیو دوره‌های کلن', 'UCS · SNAPSHOT ARCHIVE', 'هر Snapshot یک رکورد مستقل است و در آرشیو نگهداری می‌شود؛ نسخه‌های جدید جایگزین نسخه‌های قبلی نمی‌شوند.') +
      '<div class="report-list">' + snapshots.map((snapshot, index) => {
        const agg = aggregate(snapshot.snapshot_id);
        return '<article class="report-card"><div class="report-index">' + (snapshots.length - index) + '</div><div class="report-main"><div class="report-head"><h2><a href="' + base('index.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(snapshot.snapshot_id)) + '">' + esc(snapshot.snapshot_id) + ' · ' + esc(snapshot.official_timestamp_utc) + '</a></h2><span class="status">' + (index === 0 ? 'آخرین Snapshot' : 'آرشیو') + '</span></div><p>' + esc(snapshot.member_count) + ' / ' + esc(snapshot.capacity) + ' عضو · مستقل و قابل بازسازی</p><div class="aggregate"><div><span>جمع تغییر مدال کلن</span><b>' + agg.medals + '</b></div><div><span>جمع افزایش کیل</span><b>' + agg.kills + '</b></div></div></div><a class="link-arrow" href="' + base('index.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(snapshot.snapshot_id)) + '">←</a></article>';
      }).join('') + (snapshots.length ? '' : '<div class="empty">Snapshotی برای این Clan ثبت نشده است.</div>') + '</div>';
  }

  function playerDirectory() {
    const observations = activeSnapshot?.members || [];
    const players = model.global_players.filter((player) => !activeClanId || player.memberships?.some((m) => m.clan_id === activeClanId));
    const entries = players.length
      ? players.map((player) => ({ global: player, observation: model.player_history.find((h) => h.global_player_id === player.global_player_id)?.observations?.slice(-1)[0] || null }))
      : observations.map((observation) => ({ global: null, observation }));

    root.innerHTML = header('اعضای کلن', 'UCS · PLAYER DIRECTORY', 'نام نمایشی اطلاعات جاری بازی است. شناسهٔ Global فقط وقتی نمایش داده می‌شود که Identity در Canonical تأیید شده باشد.') +
      '<section class="panel"><div class="toolbar"><label class="field search-field"><span>جستجو</span><input id="player-search" type="search" placeholder="نام بازیکن یا شناسه..."></label><span class="count" id="player-count"></span></div><div class="player-grid" id="player-grid"></div></section>';

    const render = () => {
      const q = root.querySelector('#player-search').value.trim().toLocaleLowerCase('fa');
      const list = entries.filter((entry) => {
        const text = [entry.global?.display_name, entry.global?.global_player_id, entry.observation?.display_name, entry.observation?.observation_id].join(' ').toLocaleLowerCase('fa');
        return text.includes(q);
      });
      root.querySelector('#player-count').textContent = list.length + ' نتیجه';
      root.querySelector('#player-grid').innerHTML = list.map((entry) => {
        const playerId = entry.global?.global_player_id;
        const href = playerId
          ? base('player.html','?id=' + encodeURIComponent(playerId) + '&clan=' + encodeURIComponent(activeClanId || ''))
          : base('player.html','?observation=' + encodeURIComponent(entry.observation?.observation_id || '') + '&clan=' + encodeURIComponent(activeClanId || ''));
        const label = entry.global?.display_name || entry.observation?.display_name || '—';
        return '<a class="player-card" href="' + href + '"><div class="player-card-head"><span class="player-avatar">' + esc(String(label).slice(0,1)) + '</span><div><h3>' + esc(label) + '</h3><span class="muted">' + (playerId ? esc(playerId) : 'Identity: UNRESOLVED') + '</span></div></div><div class="player-mini"><span>Stage <b>' + esc(display(entry.global?.latest_metrics?.stage ?? entry.observation?.stage)) + '</b></span><span>Clan Medal <b>' + esc(display(entry.global?.latest_metrics?.current_league_clan_medals ?? entry.observation?.current_league_clan_medals)) + '</b></span></div></a>';
      }).join('') || '<div class="empty">بازیکنی برای این محدوده وجود ندارد.</div>';
    };
    root.querySelector('#player-search').oninput = render;
    render();
  }

  function playerProfile() {
    const globalId = params.get('id');
    const observationId = params.get('observation');
    const player = model.global_players.find((item) => item.global_player_id === globalId);
    let observations = [];
    let displayName = null;
    let status = null;
    let memberships = [];

    if (player) {
      const history = model.player_history.find((item) => item.global_player_id === globalId);
      observations = history?.observations || [];
      memberships = history?.memberships || player.memberships || [];
      displayName = player.display_name;
      status = player.identity_status;
    } else if (observationId) {
      for (const snapshot of model.snapshots) {
        const match = snapshot.members.find((member) => member.observation_id === observationId);
        if (match) { observations.push(match); displayName = match.display_name; status = match.identity_resolution_status; }
      }
    }

    if (!displayName) {
      root.innerHTML = header('Player Profile', 'UCS · PLAYER PROFILE') + '<div class="empty">بازیکن یا Observation موردنظر پیدا نشد.</div>';
      return;
    }

    const scopedObs = observations.filter((item) => !activeClanId || item.clan_id === activeClanId);
    const latest = scopedObs[scopedObs.length - 1] || observations[observations.length - 1];
    root.innerHTML = header(displayName, 'UCS · PLAYER PROFILE', 'تاریخچهٔ Observationها مستقل باقی می‌ماند و از Snapshotهای ثبت‌شده خوانده می‌شود.') +
      '<section class="profile-grid"><article class="panel profile-hero"><span class="badge">' + esc(status || 'UNKNOWN') + '</span><h2>' + esc(displayName) + '</h2><div class="profile-id">' + esc(globalId || latest.observation_id) + '</div><div class="kpi-row"><div><span>Stage</span><b>' + esc(display(latest.stage)) + '</b></div><div><span>Total Kills</span><b>' + esc(display(latest.total_kills)) + '</b></div><div><span>Clan Medals</span><b>' + esc(display(latest.current_league_clan_medals)) + '</b></div></div></article>' +
      '<article class="panel"><span class="badge">عضویت</span><h2>Membership History</h2>' + (memberships.length ? '<div class="timeline">' + memberships.map((membership) => '<div class="timeline-item"><b>' + esc(membership.clan_display_name || membership.clan_id) + '</b><span>' + esc(display(membership.status)) + ' · ' + esc(display(membership.started_at_utc)) + '</span></div>').join('') + '</div>' : '<p class="muted">برای این Observation هنوز Membership Global تأییدشده‌ای وجود ندارد.</p>') + '</article></section>' +
      '<section class="panel"><div class="section-head"><div><span class="badge">OBSERVATIONS</span><h2>Snapshot History</h2></div><span class="count">' + scopedObs.length + ' رکورد</span></div><div class="table-wrap"><table><thead><tr><th>Snapshot</th><th>Clan</th><th>Rank</th><th>Stage</th><th>League Medals</th><th>Total Kills</th><th>Last Online</th></tr></thead><tbody>' + scopedObs.map((item) => '<tr><td>' + esc(item.snapshot_id) + '</td><td>' + esc(item.clan_display_name || item.clan_id) + '</td><td>' + esc(display(item.rank)) + '</td><td>' + esc(display(item.stage)) + '</td><td>' + esc(display(item.current_league_clan_medals)) + '</td><td>' + esc(display(item.total_kills)) + '</td><td>' + esc(display(item.last_online_utc)) + '</td></tr>').join('') + '</tbody></table></div></section>';
  }

  function membershipHistory() {
    const players = model.global_players.filter((p) => (p.memberships || []).length > 1 || (p.membership_event_refs || []).length > 0);
    root.innerHTML = header('تاریخچه عضویت و جابه‌جایی', 'UCS · MEMBERSHIP HISTORY', 'جابجایی بین Clanها فقط بر پایهٔ Membership و Global Identity تأییدشده نمایش داده می‌شود.') +
      (players.length
        ? '<section class="panel"><div class="player-grid">' + players.map((player) => '<a class="player-card" href="' + base('player.html','?id=' + encodeURIComponent(player.global_player_id)) + '"><div class="player-card-head"><span class="player-avatar">' + esc(String(player.display_name || '—').slice(0,1)) + '</span><div><h3>' + esc(player.display_name) + '</h3><span class="muted">' + esc(player.global_player_id) + '</span></div></div><div class="player-mini"><span>Clanها <b>' + player.memberships.length + '</b></span><span>رویدادها <b>' + (player.membership_event_refs?.length || 0) + '</b></span></div></a>').join('') + '</div></section>'
        : '<section class="panel empty"><h2>هنوز جابه‌جایی Global تأییدشده‌ای ثبت نشده است.</h2><p>Observationهای unresolved همچنان قابل مشاهده‌اند، اما به‌عنوان Player مشترک بین Clanها ادغام نمی‌شوند.</p></section>');
  }

  switch (document.body.dataset.page) {
    case 'leaderboard': leaderboard(); break;
    case 'archive': archive(); break;
    case 'players': playerDirectory(); break;
    case 'player': playerProfile(); break;
    case 'member-history': membershipHistory(); break;
    default: leaderboard();
  }
})();