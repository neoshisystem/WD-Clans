'use strict';

// Dedicated Clan viewer: direct leaderboard context; Global/Admin stays isolated.

(function () {
  const bundle = globalThis.UCS_STATIC_DATA;
  const root = document.getElementById('app');
  if (!bundle?.read_model || !root) return;

  const model = bundle.read_model;
  const params = new URLSearchParams(location.search);
  const page = document.body.dataset.page || 'leaderboard';
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const display = (value) => value === null || value === undefined || value === '' ? '—' : String(value);
  const number = (value) => value === null || value === undefined || value === '' ? null : Number(value);
  // Single presentation formatter for all user-facing quantities; identifiers/dates use their own renderers.
  const formatNumber = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return n.toLocaleString('en-US');
  };
  const signed = (value) => {
    if (value === null || value === undefined || value === '') return '—';
    const n = Number(value);
    if (!Number.isFinite(n)) return display(value);
    return n > 0 ? '+' + formatNumber(n) : formatNumber(n);
  };
  const iranSnapshotDateTimeFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    timeZone: 'Asia/Tehran',
    calendar: 'persian',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });
  const formatSnapshotDateTime = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    const parts = Object.fromEntries(
      iranSnapshotDateTimeFormatter.formatToParts(date)
        .filter((part) => ['day','month','year','hour','minute'].includes(part.type))
        .map((part) => [part.type, part.value])
    );
    return parts.day && parts.month && parts.year && parts.hour && parts.minute
      ? parts.day + ' ' + parts.month + ' ' + parts.year + '، ساعت ' + parts.hour + ':' + parts.minute
      : '—';
  };
  const base = (file, query = '') => './' + file + query;
  const validClanId = params.get('clan') && model.clans.some((c) => c.clan_id === params.get('clan')) ? params.get('clan') : null;
  const scopedPage = new Set(['clan-viewer','archive','players','player','member-history']).has(page);
  // Scoped pages fail closed without an explicit Clan context; the Global/Admin dashboard is the only cross-Clan entrypoint.
  const activeClanId = scopedPage ? validClanId : null;
  const activeClan = model.clans.find((c) => c.clan_id === activeClanId) || null;
  const clanSnapshots = model.snapshots.filter((s) => s.clan_id === activeClanId).slice().sort((a, b) => b.official_timestamp_utc.localeCompare(a.official_timestamp_utc));
  const requestedSnapshot = params.get('snapshot');
  const activeSnapshot = clanSnapshots.find((s) => s.snapshot_id === requestedSnapshot) || clanSnapshots[0] || null;

  function clanSelector() {
    const clans = model.clans.slice().sort((a, b) => String(a.display_name || '').localeCompare(String(b.display_name || '')));
    if (!clans.length) return '';
    const allOption = page === 'global-dashboard' && !validClanId
      ? '<option value="__all__" ' + (!activeClanId ? 'selected' : '') + '>همه کلن‌ها</option>'
      : '';
    return '<label class="clan-select"><span>کلن</span><select id="clan-select">' +
      allOption +
      clans.map((clan) => '<option value="' + esc(clan.clan_id) + '" ' + (clan.clan_id === activeClanId ? 'selected' : '') + '>' + esc(clan.display_name || clan.clan_id) + '</option>').join('') +
      '</select></label>';
  }

  let savedTheme = 'dark';
  try { savedTheme = localStorage.getItem('ucs-theme') || 'dark'; } catch (_) {}
  document.documentElement.dataset.theme = savedTheme;
  const topbarControl = document.getElementById('global-clan') || document.getElementById('topbar-tools');
  if (topbarControl) {
    topbarControl.innerHTML = (page === 'global-dashboard' ? clanSelector() : '') +
      '<button class="theme-toggle" id="theme-toggle" type="button" aria-label="تغییر پوسته">' +
      (savedTheme === 'dark' ? '☀️' : '🌙') + '</button>';
    topbarControl.querySelector('#clan-select')?.addEventListener('change', (event) => {
      const clanId = event.target.value;
      const next = new URL('./clan.html', location.href);
      if (clanId === '__all__') next.searchParams.delete('clan');
      else next.searchParams.set('clan', clanId);
      next.searchParams.delete('snapshot');
      location.href = next.toString();
    });
    topbarControl.querySelector('#theme-toggle')?.addEventListener('click', () => {
      const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nextTheme;
      try { localStorage.setItem('ucs-theme', nextTheme); } catch (_) {}
      const button = topbarControl.querySelector('#theme-toggle');
      if (button) button.textContent = nextTheme === 'dark' ? '☀️' : '🌙';
    });
  }

  function header(title, kicker, lead = '') {
    const meta = page === 'global-dashboard' && !activeClan
      ? '<span>حالت: <b>Global / Admin</b></span><span>کلن‌ها: <b>' + formatNumber(model.clans.length) + '</b></span>'
      : (activeClan ? '<span>کلن: <b>' + esc(activeClan.display_name || activeClan.clan_id) + '</b></span>' : '<span>کلنی ثبت نشده است.</span>') +
        (activeSnapshot ? '<span>Snapshot: <b>' + esc(activeSnapshot.snapshot_id) + '</b></span><span>زمان: <b>' + esc(formatSnapshotDateTime(activeSnapshot.official_timestamp_utc)) + '</b></span>' : '');
    const clanIdentity = activeClan
      ? '<div class="clan-context-identity"><span class="badge clan-context-badge">CLAN</span><strong>' + esc(activeClan.display_name || activeClan.clan_id) + '</strong></div>'
      : '';
    return '<section class="hero' + (activeClan ? ' hero--clan' : '') + '">' + clanIdentity +
      '<div class="hero-kickers"><span class="badge">' + esc(kicker) + '</span></div><h1>' + esc(title) + '</h1>' +
      (lead ? '<p>' + esc(lead) + '</p>' : '') +
      '<div class="meta-row">' + meta + '</div></section>';
  }
  function globalDashboard() {
    const clans = model.clans.slice().sort((a,b) => String(a.display_name || a.clan_id).localeCompare(String(b.display_name || b.clan_id)));
    const latestSnapshotFor = (clan) => model.snapshots.filter((snapshot) => snapshot.clan_id === clan.clan_id).slice().sort((a,b) => b.official_timestamp_utc.localeCompare(a.official_timestamp_utc))[0] || null;
    const uniqueObservedPlayers = new Set(clans.flatMap((clan) => clan.observed_global_player_ids || []));
    root.innerHTML = header('داشبورد مرکزی سیستم Unified Clan System','UCS · GLOBAL / ADMIN DASHBOARD','نمای واحد مدیریت برای مشاهده و ورود سریع به تمام Clanها. هر Clan با Context مستقل خودش در همین Viewer قابل مشاهده است و اضافه‌شدن Clan جدید نیازمند تغییر UI نیست.') +
      '<section class="panel"><div class="kpi-row dashboard-kpi">' +
      '<div><span>تعداد کلن‌ها</span><b>' + formatNumber(clans.length) + '</b></div>' +
      '<div><span>Snapshotهای ثبت‌شده</span><b>' + formatNumber(model.snapshots.length) + '</b></div>' +
      '<div><span>Global Identityهای تاییدشده</span><b>' + formatNumber(uniqueObservedPlayers.size) + '</b></div>' +
      '<div><span>اعضای آخرین Snapshotها</span><b>' + formatNumber(clans.reduce((sum,clan) => sum + (latestSnapshotFor(clan)?.member_count || 0),0)) + '</b></div>' +
      '</div></section>' +
      '<section class="section-block"><div class="section-head"><div><span class="badge">CLAN DIRECTORY</span><h2>کلن‌ها</h2></div><span class="count">' + formatNumber(clans.length) + ' Clan</span></div>' +
      '<div class="dashboard-grid">' + clans.map((clan) => {
        const snapshot = latestSnapshotFor(clan);
        const unresolved = (clan.unresolved_observation_refs || []).length;
        return '<a class="clan-card" href="' + base('clan.html','?clan=' + encodeURIComponent(clan.clan_id)) + '">' +
          '<div class="clan-card-head"><div><span class="eyebrow">CLAN LEADERBOARD</span><h2>' + esc(clan.display_name || clan.clan_id) + '</h2><span class="muted">' + esc(clan.clan_id) + '</span></div><span class="link-arrow">←</span></div>' +
          '<div class="clan-card-stats"><div><span>آخرین Snapshot</span><b>' + esc(snapshot?.snapshot_id || '—') + '</b></div><div><span>اعضا</span><b>' + formatNumber(snapshot?.member_count) + '</b></div><div><span>آرشیو</span><b>' + formatNumber(clan.snapshot_count ?? 0) + '</b></div><div><span>Unresolved</span><b>' + formatNumber(unresolved) + '</b></div></div>' +
          '<div class="clan-card-footer"><span>' + esc(formatSnapshotDateTime(snapshot?.official_timestamp_utc) === '—' ? 'تاریخ ثبت نشده' : formatSnapshotDateTime(snapshot?.official_timestamp_utc)) + '</span><b>ورود به Leaderboard</b></div>' +
        '</a>';
      }).join('') + '</div></section>';
  }

  const allDeltaResults = () => [
    ...(Array.isArray(model.delta_results) ? model.delta_results : []),
    ...(Array.isArray(model.snapshot_delta_results) ? model.snapshot_delta_results : [])
  ];

  function deltaMapForSnapshot(snapshotId) {
    const map = new Map();
    for (const delta of allDeltaResults()) {
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

  const QUANTITY_FIELDS = new Set(['rank','stage','current_league_clan_medals','profile_total_clan_medal_count','total_kills']);
  function valueFor(member, field) {
    return QUANTITY_FIELDS.has(field) ? formatNumber(member[field]) : display(member[field]);
  }
  const lastOnlineFor = (member) => display(member.last_online_display ?? member.last_online_utc);
  const lifetimeMedalsFor = (member) => {
    const medals = member.lifetime_medals || {};
    return '🥇 طلا ' + formatNumber(medals.gold) + ' · 🥈 نقره ' + formatNumber(medals.silver) + ' · 🥉 برنز ' + formatNumber(medals.bronze);
  };
  const weaponsFor = (member) => {
    const weapons = member.weapons || {};
    return '25mm ' + formatNumber(weapons['25mm']) + ' · Hydra ' + formatNumber(weapons.hydra) + ' · Hellfire ' + formatNumber(weapons.hellfire);
  };


  function membershipChangesForSnapshot(snapshotId) {
    const playerById = new Map((model.global_players || []).map((player) => [player.global_player_id, player]));
    const canonicalEvents = (Array.isArray(model.activity) ? model.activity : [])
      .filter((event) => event.observed_snapshot_id === snapshotId && (!event.clan_id || event.clan_id === activeClanId))
      .map((event) => ({
        event,
        event_type: event.event_type,
        display_name: playerById.get(event.global_player_id)?.display_name || event.display_name || event.global_player_id || event.observation_id || '—',
        observation_id: event.observation_id || null,
        href: event.global_player_id
          ? base('player.html', '?id=' + encodeURIComponent(event.global_player_id) + '&clan=' + encodeURIComponent(activeClanId))
          : event.observation_id
            ? base('player.html', '?observation=' + encodeURIComponent(event.observation_id) + '&clan=' + encodeURIComponent(activeClanId))
            : null
      }));
    const derivedChanges = (Array.isArray(model.snapshot_membership_changes) ? model.snapshot_membership_changes : [])
      .filter((change) => change.snapshot_id === snapshotId && change.clan_id === activeClanId)
      .map((change) => ({
        event: change,
        event_type: change.change_type,
        display_name: change.display_name || change.observation_id || '—',
        observation_id: change.observation_id || null,
        href: change.observation_id
          ? base('player.html', '?observation=' + encodeURIComponent(change.observation_id) + '&clan=' + encodeURIComponent(activeClanId))
          : null
      }));
    const events = [...canonicalEvents, ...derivedChanges];
    return {
      joined: events.filter((item) => item.event_type === 'JOIN' || item.event_type === 'RETURN' || (item.event_type === 'TRANSFER' && item.event.to_clan_id === activeClanId)),
      left: events.filter((item) => item.event_type === 'LEAVE' || (item.event_type === 'TRANSFER' && item.event.from_clan_id === activeClanId)),
      other: events.filter((item) => item.event_type === 'UNKNOWN_CHANGE' || item.event_type === 'NOT_OBSERVED')
    };
  }

  function performanceAggregate(snapshotIds) {
    const ids = new Set(snapshotIds);
    let medals = 0, kills = 0, medalCount = 0, killCount = 0;
    for (const delta of allDeltaResults()) {
      if (delta.status !== 'VALID' || !Number.isFinite(Number(delta.delta))) continue;
      const snapshotId = String(delta.current_observation_id || '').split('::')[0];
      if (!ids.has(snapshotId)) continue;
      const snapshot = model.snapshots.find((item) => item.snapshot_id === snapshotId);
      if (activeClanId && snapshot?.clan_id !== activeClanId) continue;
      if (delta.scope === 'LEAGUE' && delta.metric_key === 'current_league_clan_medals') {
        medals += Number(delta.delta);
        medalCount += 1;
      }
      if (delta.scope === 'PLAYER_LIFETIME' && delta.metric_key === 'total_kills') {
        kills += Number(delta.delta);
        killCount += 1;
      }
    }
    return { medals, kills, medalCount, killCount };
  }

  function snapshotPerformance(snapshotId) {
    const snapshotIndex = clanSnapshots.findIndex((snapshot) => snapshot.snapshot_id === snapshotId);
    const current = performanceAggregate([snapshotId]);
    const cumulativeIds = snapshotIndex >= 0
      ? clanSnapshots.slice(snapshotIndex).map((snapshot) => snapshot.snapshot_id)
      : [snapshotId];
    return { current, cumulative: performanceAggregate(cumulativeIds) };
  }

  function performanceValue(aggregate, fallback) {
    return aggregate.count ? signed(aggregate.value) : fallback;
  }

  function compactPerformanceHtml(snapshotId) {
    const performance = snapshotPerformance(snapshotId);
    const currentMedals = performanceValue({ value: performance.current.medals, count: performance.current.medalCount }, '— / baseline');
    const currentKills = performanceValue({ value: performance.current.kills, count: performance.current.killCount }, '— / baseline');
    const cumulativeMedals = performanceValue({ value: performance.cumulative.medals, count: performance.cumulative.medalCount }, '—');
    const cumulativeKills = performanceValue({ value: performance.cumulative.kills, count: performance.cumulative.killCount }, '—');
    const basis = (count) => count ? formatNumber(count) + ' رکورد معتبر' : 'بدون Delta معتبر';
    return '<section class="compact-insights" aria-label="خلاصه عملکرد Snapshot">' +
      '<div class="compact-insight"><span>این Snapshot · Δ مدال کلن</span><b>' + esc(currentMedals) + '</b><small>' + esc(basis(performance.current.medalCount)) + '</small></div>' +
      '<div class="compact-insight"><span>این Snapshot · Δ کیل</span><b>' + esc(currentKills) + '</b><small>' + esc(basis(performance.current.killCount)) + '</small></div>' +
      '<div class="compact-insight compact-insight--cumulative"><span>تجمعی تاریخی تا این Snapshot · مدال کلن</span><b>' + esc(cumulativeMedals) + '</b><small>' + esc(basis(performance.cumulative.medalCount)) + '</small></div>' +
      '<div class="compact-insight compact-insight--cumulative"><span>تجمعی تاریخی تا این Snapshot · کیل</span><b>' + esc(cumulativeKills) + '</b><small>' + esc(basis(performance.cumulative.killCount)) + '</small></div>' +
      '</section>';
  }

  function membershipChangesHtml(snapshot) {
    const snapshotIndex = clanSnapshots.findIndex((item) => item.snapshot_id === snapshot.snapshot_id);
    const previousSnapshot = snapshotIndex >= 0 && snapshotIndex < clanSnapshots.length - 1 ? clanSnapshots[snapshotIndex + 1] : null;
    const changes = membershipChangesForSnapshot(snapshot.snapshot_id);
    const total = changes.joined.length + changes.left.length + changes.other.length;
    const group = (title, items, className) => items.length
      ? '<div class="membership-change-group ' + className + '"><div class="membership-change-heading"><span>' + title + '</span><b>' + formatNumber(items.length) + '</b></div><div class="change-list">' + items.map((item) => item.href ? '<a class="change-pill" href="' + item.href + '">' + esc(item.display_name) + '</a>' : '<span class="change-pill">' + esc(item.display_name) + '</span>').join('') + '</div></div>'
      : '';
    const body = total
      ? group('🟢 اعضای جدید', changes.joined, 'membership-change-group--joined') +
        group('🔴 خروج / حذف', changes.left, 'membership-change-group--left') +
        group('◻ تغییر نامشخص', changes.other, 'membership-change-group--other')
      : '<div class="membership-change-empty">' + (previousSnapshot ? 'تغییر عضویت ثبت‌شده‌ای برای این Snapshot وجود ندارد.' : 'این Snapshot ثبت اولیهٔ این Clan است و مبنای مقایسهٔ قبلی ندارد.') + '</div>';
    return '<section class="membership-changes panel"><div class="section-head"><div><span class="badge">عضویت</span><h2>تغییرات اعضا</h2></div><span class="count">' + formatNumber(total) + ' تغییر</span></div><p class="membership-change-note">ورودی و خروجی اعضا از رویدادهای Membership ثبت‌شده و مقایسهٔ خودکار Snapshotهای متوالی همین Clan نمایش داده می‌شود.</p><div class="membership-change-grid">' + body + '</div></section>';
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
      const previousTable = root.querySelector('.table-wrap');
      const previousScrollLeft = previousTable ? previousTable.scrollLeft : 0;
      const previousScrollTop = typeof window !== 'undefined' ? window.scrollY : 0;
      const normalized = query.trim().toLocaleLowerCase('fa');
      let rows = initialRows.filter((member) => [
        member.rank, member.display_name, member.role, member.stage, member.current_league_clan_medals,
        member.total_kills, member.profile_total_clan_medal_count, member.last_online_display, member.last_online_utc
      ].join(' ').toLocaleLowerCase('fa').includes(normalized));

      const sortValue = (member, key) => {
        const delta = deltas.get(member.observation_id) || {};
        if (['rank','name','role','stage','league','deltaMedals','clanMedals','kills','deltaKills','honors','weapons','lastOnline'].includes(key)) {
          const values = {
            rank: number(member.rank),
            name: String(member.display_name || '').toLocaleLowerCase('fa'),
            role: String(member.role || '').toLocaleLowerCase('fa'),
            stage: number(member.stage),
            league: number(member.current_league_clan_medals),
            deltaMedals: number(delta.medals?.delta),
            clanMedals: number(member.profile_total_clan_medal_count),
            kills: number(member.total_kills),
            deltaKills: number(delta.kills?.delta),
            honors: lifetimeMedalsFor(member),
            weapons: weaponsFor(member),
            lastOnline: lastOnlineFor(member).toLocaleLowerCase('fa')
          };
          return values[key];
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
      const simple = rows.map((member) => {
        const d = deltas.get(member.observation_id) || {};
        return '<tr>' +
          '<td class="rank-cell">' + esc(valueFor(member, 'rank')) + '</td>' +
          '<td><a href="' + playerLink(member) + '">' + esc(valueFor(member, 'display_name')) + '</a></td>' +
          '<td>' + esc(valueFor(member, 'role')) + '</td>' +
          '<td>' + esc(valueFor(member, 'stage')) + '</td>' +
          '<td>' + esc(valueFor(member, 'current_league_clan_medals')) + '</td>' +
          '<td>' + esc(signed(d.medals?.delta)) + '</td>' +
          '<td>' + esc(valueFor(member, 'profile_total_clan_medal_count')) + '</td>' +
          '<td><span class="medal-inline">' + esc(lifetimeMedalsFor(member)) + '</span></td>' +
          '<td>' + esc(valueFor(member, 'total_kills')) + '</td>' +
          '<td>' + esc(signed(d.kills?.delta)) + '</td>' +
          '<td>' + esc(weaponsFor(member)) + '</td>' +
          '<td>' + esc(lastOnlineFor(member)) + '</td>' +
          '</tr>';
      }).join('');
      const graphic = rows.map((member) => {
        const d = deltas.get(member.observation_id) || {};
        return '<article class="member-card"><header><div><span class="rank">' + esc(valueFor(member, 'rank')) + '</span><h3>' + esc(valueFor(member, 'display_name')) + '</h3><small>' + esc(valueFor(member, 'role')) + '</small></div><a class="link-arrow" href="' + playerLink(member) + '">←</a></header><div class="stats-grid">' +
          [['استیج',member.stage],['مدال لیگ',member.current_league_clan_medals],['Δ مدال',d.medals?.delta],['جمع کیل',member.total_kills],['Δ کیل',d.kills?.delta],['نشان‌ها',lifetimeMedalsFor(member)],['سلاح‌ها',weaponsFor(member)],['آخرین آنلاین',lastOnlineFor(member)]].map(([label, value]) => '<div class="stat"><span>' + label + '</span><strong>' + esc(label.startsWith('Δ') ? signed(value) : (['استیج','مدال لیگ','جمع کیل'].includes(label) ? formatNumber(value) : display(value))) + '</strong></div>').join('') +
          '</div></article>';
      }).join('');

      root.querySelector('#result-count').textContent = formatNumber(rows.length) + ' نتیجه';
      root.querySelector('#results').innerHTML = mode === 'summary'
        ? '<div class="table-wrap"><table class="summary-table"><thead><tr><th>' + sortButton('rank','رتبه') + '</th><th>' + sortButton('name','بازیکن') + '</th><th>' + sortButton('deltaMedals','Δ مدال') + '</th><th>' + sortButton('deltaKills','Δ کیل') + '</th><th>' + sortButton('league','مدال کلن') + '</th><th>' + sortButton('kills','جمع کیل') + '</th></tr></thead><tbody>' + summary + '</tbody></table></div>'
        : mode === 'graphic'
          ? '<div class="member-grid">' + graphic + '</div>'
          : '<div class="table-wrap"><table class="leaderboard-table"><thead><tr>' +
            '<th>' + sortButton('rank','رتبه') + '</th>' +
            '<th>' + sortButton('name','نام کاربری') + '</th>' +
            '<th>' + sortButton('role','سمت') + '</th>' +
            '<th>' + sortButton('stage','استیج') + '</th>' +
            '<th>' + sortButton('league','مدال لیگ جاری') + '</th>' +
            '<th>' + sortButton('deltaMedals','تغییر مدال کلن') + '</th>' +
            '<th>' + sortButton('clanMedals','مدال کل کلن') + '</th>' +
            '<th>' + sortButton('honors','مدال افتخار') + '</th>' +
            '<th>' + sortButton('kills','مجموع کیل 💀') + '</th>' +
            '<th>' + sortButton('deltaKills','افزایش کیل 💀') + '</th>' +
            '<th>' + sortButton('weapons','لول سلاح‌ها') + '</th>' +
            '<th>' + sortButton('lastOnline','آخرین آنلاین') + '</th>' +
            '</tr></thead><tbody>' + simple + '</tbody></table></div>';

      root.querySelectorAll('[data-sort]').forEach((button) => button.onclick = () => {
        const next = button.dataset.sort;
        if (sortKey === next) sortDir *= -1; else { sortKey = next; sortDir = 1; }
        render();
      });
      root.querySelectorAll('[data-mode]').forEach((button) => button.onclick = () => { mode = button.dataset.mode; render(); });
      const nextTable = root.querySelector('.table-wrap');
      if (nextTable) nextTable.scrollLeft = previousScrollLeft;
      if (typeof window !== 'undefined') window.scrollTo({ top: previousScrollTop, behavior: 'auto' });
    };

    const snapshotIndex = clanSnapshots.findIndex((snapshot) => snapshot.snapshot_id === activeSnapshot.snapshot_id);
    const olderSnapshot = snapshotIndex >= 0 && snapshotIndex < clanSnapshots.length - 1 ? clanSnapshots[snapshotIndex + 1] : null;
    const newerSnapshot = snapshotIndex > 0 ? clanSnapshots[snapshotIndex - 1] : null;
    const snapshotNav = '<div class="snapshot-nav">' +
      '<a class="btn" href="' + (olderSnapshot ? base('clan.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(olderSnapshot.snapshot_id) + '&mode=' + encodeURIComponent(mode)) : '#') + '" ' + (olderSnapshot ? '' : 'aria-disabled="true"') + '>← Snapshot قبلی</a>' +
      '<a class="btn" href="' + base('archive.html','?clan=' + encodeURIComponent(activeClanId)) + '">آرشیو</a>' +
      '<a class="btn" href="' + (newerSnapshot ? base('clan.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(newerSnapshot.snapshot_id) + '&mode=' + encodeURIComponent(mode)) : '#') + '" ' + (newerSnapshot ? '' : 'aria-disabled="true"') + '>Snapshot بعدی →</a>' +
      '</div>';

    root.innerHTML = header('جدول جامع عملکرد و تغییرات اعضای کلن', 'UCS · LEADERBOARD', 'ساختار Viewer بر پایهٔ الگوی تثبیت‌شدهٔ پروژه نگه داشته شده است؛ داده‌ها از Read Model خوانده می‌شوند.') +
      '<section class="panel"><div class="toolbar">' +
      '<label class="field"><span>Snapshot</span><select id="snapshot-select">' + clanSnapshots.map((s) => '<option value="' + esc(s.snapshot_id) + '" ' + (s.snapshot_id === activeSnapshot.snapshot_id ? 'selected' : '') + '>' + esc(s.snapshot_id) + ' · ' + esc(formatSnapshotDateTime(s.official_timestamp_utc)) + '</option>').join('') + '</select></label>' +
      '<label class="field search-field"><span>جستجو</span><input id="search-input" type="search" placeholder="نام بازیکن، سمت یا مقدار..."></label>' +
      '<div class="view-switch"><button data-mode="simple">نمایش ساده</button><button data-mode="summary">نمایش خلاصه</button><button data-mode="graphic">نمایش گرافیکی</button></div>' +
      '</div><div class="kpi-row"><div><span>اعضا</span><b>' + formatNumber(activeSnapshot.member_count) + '</b></div><div><span>Snapshot</span><b>' + esc(activeSnapshot.snapshot_id) + '</b></div><div><span>Evidence</span><b>' + formatNumber(bundle.provenance?.evidence_refs?.length || 0) + '</b></div><div><span>Projection</span><b>' + esc(model.projection_version) + '</b></div></div>' + snapshotNav + '<div class="count" id="result-count"></div><div id="results"></div></section>' + compactPerformanceHtml(activeSnapshot.snapshot_id) + membershipChangesHtml(activeSnapshot);
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
    const aggregate = (snapshotId) => snapshotPerformance(snapshotId);
    const playerById = new Map((model.global_players || []).map((player) => [player.global_player_id, player]));
    const eventLabel = {
      JOIN: 'عضو جدید',
      RETURN: 'بازگشت',
      LEAVE: 'خروج / حذف',
      TRANSFER: 'جابه‌جایی',
      UNKNOWN_CHANGE: 'تغییر نامشخص',
      NOT_OBSERVED: 'مشاهده نشد'
    };
    const changesForSnapshot = (snapshotId) => membershipChangesForSnapshot(snapshotId);

    root.innerHTML = header('آرشیو دوره‌های کلن', 'UCS · SNAPSHOT ARCHIVE', 'هر Snapshot یک رکورد مستقل است و در آرشیو نگهداری می‌شود؛ نسخه‌های جدید جایگزین نسخه‌های قبلی نمی‌شوند.') +
      '<div class="report-list">' + snapshots.map((snapshot, index) => {
        const agg = aggregate(snapshot.snapshot_id);
        const changes = changesForSnapshot(snapshot.snapshot_id);
        const activity = [...changes.joined, ...changes.left, ...changes.other];
        const changesHtml = activity.length
          ? '<div class="changes"><div class="changes-heading"><span>تغییر عضویت</span><b>' + formatNumber(activity.length) + '</b></div><div class="change-list">' +
            activity.map((item) => {
              const label = item.display_name || '—';
              const eventType = item.event_type || item.event?.event_type || 'UNKNOWN_CHANGE';
              const href = item.href || null;
              return href ? '<a class="change-pill" href="' + href + '"><b>' + esc(eventLabel[eventType] || eventType) + '</b> ' + esc(label) + '</a>' : '<span class="change-pill"><b>' + esc(eventLabel[eventType] || eventType) + '</b> ' + esc(label) + '</span>';
            }).join('') +
            '</div></div>'
          : '<div class="changes"><div class="changes-heading"><span>تغییر عضویت</span><b>' + formatNumber(0) + '</b></div><div class="change-empty">تغییر عضویت مشاهده‌شده‌ای برای این Snapshot وجود ندارد.</div></div>';
        return '<article class="report-card"><div class="report-index">' + formatNumber(snapshots.length - index) + '</div><div class="report-main"><div class="report-head"><h2><a href="' + base('clan.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(snapshot.snapshot_id)) + '">' + esc(snapshot.snapshot_id) + ' · ' + esc(formatSnapshotDateTime(snapshot.official_timestamp_utc)) + '</a></h2><span class="status">' + (index === 0 ? 'آخرین Snapshot' : 'آرشیو') + '</span></div><p>' + formatNumber(snapshot.member_count) + ' / ' + formatNumber(snapshot.capacity) + ' عضو · مستقل و قابل بازسازی</p>' + changesHtml + '<div class="aggregate aggregate--performance">' +
          '<div><span>این Snapshot · Δ مدال کلن</span><b>' + esc(performanceValue({ value: agg.current.medals, count: agg.current.medalCount }, '— / baseline')) + '</b><small>' + esc(agg.current.medalCount ? formatNumber(agg.current.medalCount) + ' رکورد معتبر' : 'بدون Delta معتبر') + '</small></div>' +
          '<div><span>این Snapshot · Δ کیل</span><b>' + esc(performanceValue({ value: agg.current.kills, count: agg.current.killCount }, '— / baseline')) + '</b><small>' + esc(agg.current.killCount ? formatNumber(agg.current.killCount) + ' رکورد معتبر' : 'بدون Delta معتبر') + '</small></div>' +
          '<div><span>تجمعی تاریخی · مدال کلن</span><b>' + esc(performanceValue({ value: agg.cumulative.medals, count: agg.cumulative.medalCount }, '—')) + '</b><small>' + esc(agg.cumulative.medalCount ? formatNumber(agg.cumulative.medalCount) + ' رکورد معتبر' : 'بدون Delta معتبر') + '</small></div>' +
          '<div><span>تجمعی تاریخی · کیل</span><b>' + esc(performanceValue({ value: agg.cumulative.kills, count: agg.cumulative.killCount }, '—')) + '</b><small>' + esc(agg.cumulative.killCount ? formatNumber(agg.cumulative.killCount) + ' رکورد معتبر' : 'بدون Delta معتبر') + '</small></div>' +
        '</div></div><a class="link-arrow" href="' + base('clan.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(snapshot.snapshot_id)) + '">←</a></article>';
      }).join('') + (snapshots.length ? '' : '<div class="empty">Snapshotی برای این Clan ثبت نشده است.</div>') + '</div>';
  }

  function playerDirectory() {
    const observations = activeSnapshot?.members || [];
    const players = model.global_players.filter((player) => !activeClanId || player.memberships?.some((m) => m.clan_id === activeClanId));
    const entries = players.length
      ? players.map((player) => {
          const history = model.player_history.find((h) => h.global_player_id === player.global_player_id);
          const scoped = (history?.observations || []).filter((observation) => !activeClanId || observation.clan_id === activeClanId);
          const observation = scoped.slice().sort((a,b) => String(a.observed_at_utc || '').localeCompare(String(b.observed_at_utc || ''))).slice(-1)[0] || null;
          return { global: player, observation };
        }).filter((entry) => !activeClanId || entry.observation)
      : observations.map((observation) => ({ global: null, observation }));

    root.innerHTML = header('اعضای کلن', 'UCS · PLAYER DIRECTORY', 'نام نمایشی اطلاعات جاری بازی است. شناسهٔ Global فقط وقتی نمایش داده می‌شود که Identity در Canonical تأیید شده باشد.') +
      '<section class="panel"><div class="toolbar"><label class="field search-field"><span>جستجو</span><input id="player-search" type="search" placeholder="نام بازیکن یا شناسه..."></label><span class="count" id="player-count"></span></div><div class="player-grid" id="player-grid"></div></section>';

    const render = () => {
      const q = root.querySelector('#player-search').value.trim().toLocaleLowerCase('fa');
      const list = entries.filter((entry) => {
        const text = [entry.global?.display_name, entry.global?.global_player_id, entry.observation?.display_name, entry.observation?.observation_id].join(' ').toLocaleLowerCase('fa');
        return text.includes(q);
      });
      root.querySelector('#player-count').textContent = formatNumber(list.length) + ' نتیجه';
      root.querySelector('#player-grid').innerHTML = list.map((entry) => {
        const playerId = entry.global?.global_player_id;
        const href = playerId
          ? base('player.html','?id=' + encodeURIComponent(playerId) + '&clan=' + encodeURIComponent(activeClanId || ''))
          : base('player.html','?observation=' + encodeURIComponent(entry.observation?.observation_id || '') + '&clan=' + encodeURIComponent(activeClanId || ''));
        const label = entry.global?.display_name || entry.observation?.display_name || '—';
        return '<a class="player-card" href="' + href + '"><div class="player-card-head"><span class="player-avatar">' + esc(String(label).slice(0,1)) + '</span><div><h3>' + esc(label) + '</h3><span class="muted">' + (playerId ? esc(playerId) : 'Identity: UNRESOLVED') + '</span></div></div><div class="player-mini"><span>Stage <b>' + esc(formatNumber(entry.global?.latest_metrics?.stage ?? entry.observation?.stage)) + '</b></span><span>Clan Medal <b>' + esc(formatNumber(entry.global?.latest_metrics?.current_league_clan_medals ?? entry.observation?.current_league_clan_medals)) + '</b></span></div></a>';
      }).join('') || '<div class="empty">بازیکنی برای این محدوده وجود ندارد.</div>';
    };
    root.querySelector('#player-search').oninput = render;
    render();
  }

  function playerPerformance(globalId) {
    const result = { currentLeagueMedals: null, currentLeagueKills: null, cumulativeMedals: null, cumulativeKills: null, currentLeagueMedalCount: 0, currentLeagueKillCount: 0, cumulativeMedalCount: 0, cumulativeKillCount: 0 };
    if (!globalId) return result;
    const currentLeagueId = activeSnapshot?.league_id || null;
    for (const delta of Array.isArray(model.delta_results) ? model.delta_results : []) {
      if (delta.global_player_id !== globalId || delta.status !== 'VALID' || !Number.isFinite(Number(delta.delta))) continue;
      const snapshotId = String(delta.current_observation_id || '').split('::')[0];
      const snapshot = model.snapshots.find((item) => item.snapshot_id === snapshotId);
      if (!snapshot || (activeClanId && snapshot.clan_id !== activeClanId)) continue;
      const value = Number(delta.delta);
      if (delta.scope === 'LEAGUE' && delta.metric_key === 'current_league_clan_medals') {
        result.cumulativeMedals = (result.cumulativeMedals || 0) + value;
        result.cumulativeMedalCount += 1;
        if (currentLeagueId && snapshot.league_id === currentLeagueId) { result.currentLeagueMedals = (result.currentLeagueMedals || 0) + value; result.currentLeagueMedalCount += 1; }
      }
      if (delta.scope === 'PLAYER_LIFETIME' && delta.metric_key === 'total_kills') {
        result.cumulativeKills = (result.cumulativeKills || 0) + value;
        result.cumulativeKillCount += 1;
        if (currentLeagueId && snapshot.league_id === currentLeagueId) { result.currentLeagueKills = (result.currentLeagueKills || 0) + value; result.currentLeagueKillCount += 1; }
      }
    }
    return result;
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
    const scopedMemberships = memberships.filter((item) => !activeClanId || item.clan_id === activeClanId);
    const latest = scopedObs.slice().sort((a,b) => String(a.observed_at_utc || '').localeCompare(String(b.observed_at_utc || ''))).slice(-1)[0] || null;
    const performance = playerPerformance(globalId);
    if (activeClanId && !latest) {
      root.innerHTML = header('Player Profile','UCS · PLAYER PROFILE','این Global Identity در Context انتخاب‌شدهٔ Clan Observation معتبر ندارد.') +
        '<section class="panel empty"><h2>بازیکن در این Clan پیدا نشد.</h2><p>برای جلوگیری از نمایش دادهٔ Clan دیگر، Profile فقط Observationهای همین Context را نشان می‌دهد.</p><a class="btn" href="' + base('players.html','?clan=' + encodeURIComponent(activeClanId)) + '">بازگشت به اعضای کلن</a></section>';
      return;
    }
    root.innerHTML = header(displayName, 'UCS · PLAYER PROFILE', 'تاریخچهٔ Observationها مستقل باقی می‌ماند و از Snapshotهای ثبت‌شده خوانده می‌شود.') +
      '<section class="panel profile-performance"><div class="section-head"><div><span class="badge">عملکرد</span><h2>عملکرد این دوره و تجمعی</h2></div></div><div class="profile-performance-grid"><div class="profile-performance-card"><span>مدال کلن · لیگ جاری</span><b>' + esc(performance.currentLeagueMedalCount ? signed(performance.currentLeagueMedals) : '— / baseline') + '</b><small>' + esc(formatNumber(performance.currentLeagueMedalCount) + ' رکورد معتبر') + '</small></div><div class="profile-performance-card"><span>کیل · لیگ جاری</span><b>' + esc(performance.currentLeagueKillCount ? signed(performance.currentLeagueKills) : '— / baseline') + '</b><small>' + esc(formatNumber(performance.currentLeagueKillCount) + ' رکورد معتبر') + '</small></div><div class="profile-performance-card"><span>مدال کلن · تجمعی</span><b>' + esc(performance.cumulativeMedalCount ? signed(performance.cumulativeMedals) : '—') + '</b><small>جمع Deltaهای معتبر ثبت‌شده</small></div><div class="profile-performance-card"><span>کیل · تجمعی</span><b>' + esc(performance.cumulativeKillCount ? signed(performance.cumulativeKills) : '—') + '</b><small>جمع Deltaهای معتبر ثبت‌شده</small></div></div></section>' +
      '<section class="profile-grid"><article class="panel profile-hero"><span class="badge">' + esc(status || 'UNKNOWN') + '</span><h2>' + esc(displayName) + '</h2><div class="profile-id">' + esc(globalId || latest.observation_id) + '</div><div class="kpi-row"><div><span>Stage</span><b>' + esc(formatNumber(latest.stage)) + '</b></div><div><span>Total Kills</span><b>' + esc(formatNumber(latest.total_kills)) + '</b></div><div><span>Clan Medals</span><b>' + esc(formatNumber(latest.current_league_clan_medals)) + '</b></div><div><span>Profile Total Clan Medals</span><b>' + esc(formatNumber(latest.profile_total_clan_medal_count)) + '</b></div></div><div class="detail-strip"><div><span>نشان‌ها</span><b>' + esc(lifetimeMedalsFor(latest)) + '</b></div><div><span>سلاح‌ها</span><b>' + esc(weaponsFor(latest)) + '</b></div><div><span>Last Online</span><b>' + esc(lastOnlineFor(latest)) + '</b></div></div></article>' +
      '<article class="panel"><span class="badge">عضویت</span><h2>Membership History</h2>' + (scopedMemberships.length ? '<div class="timeline">' + scopedMemberships.map((membership) => '<div class="timeline-item"><b>' + esc(membership.clan_display_name || membership.clan_id) + '</b><span>' + esc(display(membership.status)) + ' · ' + esc(formatSnapshotDateTime(membership.started_at_utc)) + '</span></div>').join('') + '</div>' : '<p class="muted">برای این Observation هنوز Membership Global تأییدشده‌ای وجود ندارد.</p>') + '</article></section>' +
      '<section class="panel"><div class="section-head"><div><span class="badge">OBSERVATIONS</span><h2>Snapshot History</h2></div><span class="count">' + formatNumber(scopedObs.length) + ' رکورد</span></div><div class="table-wrap"><table class="player-history-table"><thead><tr><th>Snapshot</th><th>زمان Snapshot</th><th>Clan Name</th><th>Rank</th><th>Stage</th><th>League Medals</th><th>Δ Clan Medals</th><th>Total Clan Medals</th><th>Gold / Silver / Bronze</th><th>Total Kills</th><th>Δ Kills</th><th>Weapons</th><th>Last Online</th></tr></thead><tbody>' + scopedObs.slice().sort((a,b) => String(b.observed_at_utc || '').localeCompare(String(a.observed_at_utc || ''))).map((item) => { const d = deltaMapForSnapshot(item.snapshot_id).get(item.observation_id) || {}; return '<tr><td>' + esc(item.snapshot_id) + '</td><td>' + esc(formatSnapshotDateTime(item.observed_at_utc)) + '</td><td>' + esc(item.clan_display_name || item.clan_id) + '</td><td>' + esc(formatNumber(item.rank)) + '</td><td>' + esc(formatNumber(item.stage)) + '</td><td>' + esc(formatNumber(item.current_league_clan_medals)) + '</td><td>' + esc(signed(d.medals?.delta)) + '</td><td>' + esc(formatNumber(item.profile_total_clan_medal_count)) + '</td><td>' + esc(lifetimeMedalsFor(item)) + '</td><td>' + esc(formatNumber(item.total_kills)) + '</td><td>' + esc(signed(d.kills?.delta)) + '</td><td>' + esc(weaponsFor(item)) + '</td><td>' + esc(lastOnlineFor(item)) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  }

  function membershipHistory() {
    const activity = Array.isArray(model.activity) ? model.activity : [];
    const players = model.global_players.map((player) => {
      const memberships = (player.memberships || []).filter((m) => !activeClanId || m.clan_id === activeClanId);
      const events = activity.filter((event) => event.global_player_id === player.global_player_id && (!activeClanId || event.clan_id === activeClanId));
      return { player, memberships, events };
    }).filter((entry) => activeClanId ? (entry.memberships.length > 0 || entry.events.length > 0) : (entry.memberships.length > 1 || entry.events.length > 0));
    root.innerHTML = header('تاریخچه عضویت و جابه‌جایی','UCS · MEMBERSHIP HISTORY',activeClanId ? 'نمایش فقط Membership و رویدادهای مرتبط با Clan انتخاب‌شده.' : 'نمای Global برای بررسی تاریخچهٔ عضویت و جابه‌جایی بین تمام Clanها.') +
      (players.length
        ? '<section class="panel"><div class="player-grid">' + players.map(({player,memberships,events}) => '<a class="player-card" href="' + base('player.html','?id=' + encodeURIComponent(player.global_player_id) + (activeClanId ? '&clan=' + encodeURIComponent(activeClanId) : '')) + '"><div class="player-card-head"><span class="player-avatar">' + esc(String(player.display_name || '—').slice(0,1)) + '</span><div><h3>' + esc(player.display_name) + '</h3><span class="muted">' + esc(player.global_player_id) + '</span></div></div><div class="player-mini"><span>Membership <b>' + formatNumber(memberships.length) + '</b></span><span>رویدادها <b>' + formatNumber(events.length) + '</b></span></div></a>').join('') + '</div></section>'
        : '<section class="panel empty"><h2>' + (activeClanId ? 'برای این Clan تاریخچهٔ Membership ثبت‌شده‌ای وجود ندارد.' : 'هنوز جابه‌جایی Global تأییدشده‌ای ثبت نشده است.') + '</h2><p>Observationهای unresolved همچنان قابل مشاهده‌اند، اما به‌عنوان Player مشترک بین Clanها ادغام نمی‌شوند.</p></section>');
  }

  function bindNavContext() {
    document.querySelectorAll('.nav a').forEach((link) => {
      const href = (link.getAttribute('href') || '').split('?')[0];
      if (!href) return;
      if (activeClanId && href === './index.html') {
        link.href = base('clan.html','?clan=' + encodeURIComponent(activeClanId));
        return;
      }
      if (activeClanId && (href === './players.html' || href === './archive.html' || href === './player.html' || href === './member-history.html' || href === './clan.html')) {
        link.href = href + '?clan=' + encodeURIComponent(activeClanId);
      }
    });
    if (activeClanId) {
      document.querySelectorAll('.brand').forEach((link) => {
        link.href = base('clan.html','?clan=' + encodeURIComponent(activeClanId));
      });
    }
  }

  bindNavContext();

  switch (page) {
    case 'global-dashboard':
      globalDashboard();
      break;
    case 'clan-viewer': leaderboard(); break;
    case 'leaderboard': leaderboard(); break;
    case 'archive': archive(); break;
    case 'players': playerDirectory(); break;
    case 'player': playerProfile(); break;
    case 'member-history': membershipHistory(); break;
    default: leaderboard();
  }
})();