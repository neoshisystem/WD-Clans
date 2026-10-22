// UCS SA02 import validation refresh 2026-10-03
'use strict';
// UCS SA01: static bundle deployment follows the Canonical-generated Read Model.

// Dedicated Clan viewer: direct leaderboard context; Global/Admin stays isolated.
// Snapshot continuity and Delta summaries are derived from adjacent same-Clan Read Model observations.

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
  const signedHtml = (value) => {
    if (value === null || value === undefined || value === '') return '<span class="delta-zero">—</span>';
    const n = Number(value);
    if (!Number.isFinite(n)) return '<span class="delta-zero">' + esc(display(value)) + '</span>';
    if (n > 0) return '<span class="delta-pos">+' + formatNumber(n) + '</span>';
    if (n < 0) return '<span class="delta-neg">' + formatNumber(n) + '</span>';
    return '<span class="delta-zero">0</span>';
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
      '<section class="panel">' +
        '<div class="section-head"><div><span class="badge">مقایسه کلن‌ها</span><h2>جدول جامع رتبه‌بندی و وضعیت کلن‌های War Drone</h2></div><span class="count">' + formatNumber(clans.length) + ' کلن فعال</span></div>' +
        '<div class="table-wrap"><table><thead><tr>' +
          '<th># ردیف</th>' +
          '<th>نام کلن</th>' +
          '<th>تگ</th>' +
          '<th>تعداد اعضا</th>' +
          '<th>مجموع کیل‌های ثبت‌شده 💀</th>' +
          '<th>آخرین Snapshot</th>' +
          '<th>وضعیت</th>' +
          '<th>عملیات</th>' +
        '</tr></thead><tbody>' +
        clans.map((c, i) => {
          const snap = latestSnapshotFor(c);
          let cKills = 0;
          if (snap && Array.isArray(snap.members)) {
            snap.members.forEach(m => { cKills += Number(m.total_kills) || 0; });
          }
          const link = base('clan.html', '?clan=' + encodeURIComponent(c.clan_id));
          return '<tr>' +
            '<td><span class="tbl-rank">' + formatNumber(i + 1) + '</span></td>' +
            '<td><a class="tbl-name" href="' + link + '"><strong>🛡️ ' + esc(c.display_name || c.clan_id) + '</strong></a></td>' +
            '<td><span class="badge">' + esc(c.tag || '—') + '</span></td>' +
            '<td><strong>' + (snap ? formatNumber(snap.member_count) : '0') + ' نفر</strong></td>' +
            '<td><strong style="color:var(--cyan);">' + (cKills ? formatNumber(cKills) : '—') + '</strong></td>' +
            '<td><small>' + (snap ? esc(formatSnapshotDateTime(snap.official_timestamp_utc)) : '—') + '</small></td>' +
            '<td><span class="badge" style="color:var(--green);border-color:var(--green);">' + esc(c.status || 'ACTIVE') + '</span></td>' +
            '<td><a class="btn" style="padding:4px 10px;font-size:0.75rem;" href="' + link + '">لیدربورد 🏰</a></td>' +
            '</tr>';
        }).join('') +
        '</tbody></table></div>' +
      '</section>' +
      '<section class="panel">' +
        '<div class="section-head"><div><span class="badge">دانش بازی</span><h2>راهنمای مکانیک‌های تخصصی War Drone</h2></div></div>' +
        '<div class="overview-grid">' +
          '<div class="overview-card"><span>🔥 رویداد فرنزی (Clan Frenzy)</span><strong>مدت ۴۵ دقیقه</strong><small>با شارژ نوار فرنزی (کیل زدن اعضا یا مصرف ۷۰۰ طلا)، دشمنان طلایی ظاهر می‌شوند که کیل زدن آنها منبع اصلی کسب مدال کلن است.</small></div>' +
          '<div class="overview-card"><span>💥 تسلیحات سه‌گانه (Arsenal)</span><strong>توپ / هیدرا / هل‌فایر</strong><small>توپ ۲۵mm برای پیاده‌نظام و خمپاره‌ها، راکت هیدرا ۷۰ برای گروه‌های خودرویی و موشک هل‌فایر برای اهداف سنگین و تانک‌ها طراحی شده‌اند.</small></div>' +
          '<div class="overview-card"><span>🎖️ مدال‌های لیگ و افتخار</span><strong>Current League vs Honors</strong><small>مدال‌های لیگ جاری رتبه دوره‌ای کلن را ارتقا می‌دهند و مدال‌های طلا، نقره و برنز نشان‌دهنده افتخارات تاریخی بازیکن هستند.</small></div>' +
          '<div class="overview-card"><span>🎯 استیج‌های فارم کلنی</span><strong>Stage Selection</strong><small>تجربه تجربی نشان داده مراحل ۵، ۸، ۹ و ۱۰ بازدهی بسیار بالایی در فرنزی دارند و پیشروی هوشمند نیازمند هماهنگی سطح سلاح‌هاست.</small></div>' +
        '</div>' +
      '</section>' +
      '<section class="section-block"><div class="section-head"><div><span class="badge">CLAN DIRECTORY</span><h2>کارت‌های کلن</h2></div><span class="count">' + formatNumber(clans.length) + ' Clan</span></div>' +
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
        const r = Number(member.rank);
        const rankCls = r === 1 ? 'tbl-rank rank-1' : (r === 2 ? 'tbl-rank rank-2' : (r === 3 ? 'tbl-rank rank-3' : 'tbl-rank'));
        const roleStr = String(member.role || '').toLowerCase();
        const roleCls = roleStr.includes('leader') && !roleStr.includes('co') ? 'tbl-role leader' : (roleStr.includes('co-leader') ? 'tbl-role coleader' : (roleStr.includes('elder') ? 'tbl-role elder' : 'tbl-role'));
        const initial = String(member.display_name || '—').slice(0, 1);
        const wep = weaponsFor(member);
        return '<tr>' +
          '<td><span class="' + rankCls + '">' + (r <= 3 ? (r === 1 ? '🥇 ' : (r === 2 ? '🥈 ' : '🥉 ')) : '') + esc(valueFor(member, 'rank')) + '</span></td>' +
          '<td><div class="tbl-player"><span class="tbl-avatar">' + esc(initial) + '</span><a class="tbl-name" href="' + playerLink(member) + '">' + esc(valueFor(member, 'display_name')) + '</a></div></td>' +
          '<td><span class="' + roleCls + '">' + esc(valueFor(member, 'role')) + '</span></td>' +
          '<td><strong>' + esc(valueFor(member, 'stage')) + '</strong></td>' +
          '<td><strong style="color:var(--gold);">' + esc(valueFor(member, 'current_league_clan_medals')) + '</strong></td>' +
          '<td>' + signedHtml(d.medals?.delta) + '</td>' +
          '<td>' + esc(valueFor(member, 'profile_total_clan_medal_count')) + '</td>' +
          '<td><span class="medal-inline">' + esc(lifetimeMedalsFor(member)) + '</span></td>' +
          '<td><strong>' + esc(valueFor(member, 'total_kills')) + '</strong></td>' +
          '<td>' + signedHtml(d.kills?.delta) + '</td>' +
          '<td>' + (wep && wep !== '—' ? ('<span class="tbl-weapons">' + esc(wep) + '</span>') : '—') + '</td>' +
          '<td><small style="color:var(--muted);">' + esc(lastOnlineFor(member)) + '</small></td>' +
          '</tr>';
      }).join('');
      const graphic = rows.map((member) => {
        const d = deltas.get(member.observation_id) || {};
        const isTop = Number(member.rank) <= 3;
        const deltaMedalNum = Number(d.medals?.delta) || 0;
        const deltaKillNum = Number(d.kills?.delta) || 0;
        const medalDeltaClass = deltaMedalNum > 0 ? 'delta' : (deltaMedalNum < 0 ? 'delta negative' : '');
        const killDeltaClass = deltaKillNum > 0 ? 'delta' : (deltaKillNum < 0 ? 'delta negative' : '');

        return '<article class="member' + (isTop ? ' top-tier' : '') + '" data-name="' + esc(member.display_name) + '">' +
          '<div class="member-head">' +
            '<div class="member-id">' +
              '<span class="rank">' + esc(valueFor(member, 'rank')) + '</span>' +
              '<div>' +
                '<h3><a href="' + playerLink(member) + '">' + esc(valueFor(member, 'display_name')) + '</a></h3>' +
                '<span class="role">' + esc(valueFor(member, 'role') || 'عضو') + '</span>' +
              '</div>' +
            '</div>' +
            '<span class="movement same">-</span>' +
          '</div>' +
          '<div class="member-grid">' +
            '<div class="stat"><span>استیج</span><strong>' + formatNumber(member.stage) + '</strong></div>' +
            '<div class="stat medal"><span>مدال لیگ جاری</span><strong>' + formatNumber(member.current_league_clan_medals) + '</strong></div>' +
            '<div class="stat ' + medalDeltaClass + '"><span>تغییرات مدال لیگ</span><strong>' + esc(signed(d.medals?.delta)) + '</strong></div>' +
            '<div class="stat"><span>مدال کل کلن</span><strong>' + formatNumber(member.profile_total_clan_medal_count) + '</strong></div>' +
            '<div class="stat"><span>مجموع کیل 💀</span><strong>' + formatNumber(member.total_kills) + '</strong></div>' +
            '<div class="stat ' + killDeltaClass + '"><span>افزایش کیل 💀</span><strong>' + esc(signed(d.kills?.delta)) + '</strong></div>' +
            '<div class="stat weapons"><span>لول سلاح‌ها (25mm / هیدرا / هل‌فایر)</span><strong>' + esc(weaponsFor(member)) + '</strong></div>' +
            '<div class="stat last-online"><span>آخرین آنلاین</span><strong>' + esc(lastOnlineFor(member)) + '</strong></div>' +
          '</div>' +
        '</article>';
      }).join('');

      root.querySelector('#result-count').textContent = formatNumber(rows.length) + ' نتیجه';
      root.querySelector('#results').innerHTML = mode === 'summary'
        ? '<div class="table-wrap"><table class="summary-table"><thead><tr><th>' + sortButton('rank','رتبه') + '</th><th>' + sortButton('name','بازیکن') + '</th><th>' + sortButton('deltaMedals','Δ مدال') + '</th><th>' + sortButton('deltaKills','Δ کیل') + '</th><th>' + sortButton('league','مدال کلن') + '</th><th>' + sortButton('kills','جمع کیل') + '</th></tr></thead><tbody>' + summary + '</tbody></table></div>'
        : mode === 'graphic'
          ? '<div class="members" id="members">' + graphic + '</div>'
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
      root.querySelectorAll('[data-mode]').forEach((button) => {
        button.classList.toggle('active', button.dataset.mode === mode);
        button.onclick = () => {
          mode = button.dataset.mode;
          root.querySelectorAll('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
          render();
        };
      });
      const nextTable = root.querySelector('.table-wrap');
      if (nextTable) nextTable.scrollLeft = previousScrollLeft;
      if (typeof window !== 'undefined') window.scrollTo({ top: previousScrollTop, behavior: 'auto' });
    };

    const snapshotIndex = clanSnapshots.findIndex((snapshot) => snapshot.snapshot_id === activeSnapshot.snapshot_id);
    const olderSnapshot = snapshotIndex >= 0 && snapshotIndex < clanSnapshots.length - 1 ? clanSnapshots[snapshotIndex + 1] : null;
    const newerSnapshot = snapshotIndex > 0 ? clanSnapshots[snapshotIndex - 1] : null;
    let totalKills = 0;
    let topMedalGainer = null;
    let topMedalGainVal = -Infinity;
    let topKiller = null;
    let topKillVal = -Infinity;

    for (const m of activeSnapshot.members) {
      const k = Number(m.total_kills) || 0;
      totalKills += k;
      if (k > topKillVal) {
        topKillVal = k;
        topKiller = m;
      }
      const d = deltas.get(m.observation_id) || {};
      const deltaM = Number(d.medals?.delta) || 0;
      if (deltaM > topMedalGainVal) {
        topMedalGainVal = deltaM;
        topMedalGainer = m;
      }
    }

    const topMedalText = topMedalGainer ? (esc(topMedalGainer.display_name) + ' · +' + formatNumber(topMedalGainVal)) : '—';
    const topKillerText = topKiller ? (esc(topKiller.display_name) + ' · ' + formatNumber(topKillVal)) : '—';

    const overviewHtml = '<div class="overview-grid">' +
      '<div class="overview-card"><span class="label">ظرفیت فعلی کلن</span><strong>' + formatNumber(activeSnapshot.member_count) + ' از ' + formatNumber(activeSnapshot.capacity || 50) + ' نفر</strong></div>' +
      '<div class="overview-card"><span class="label">مجموع کیل‌های ثبت‌شده 💀</span><strong>' + formatNumber(totalKills) + '</strong></div>' +
      '<div class="overview-card highlight"><span class="label">پیشتاز افزایش مدال لیگ جاری</span><strong>' + topMedalText + '</strong></div>' +
      '<div class="overview-card highlight"><span class="label">بیشترین کیل ثبت‌شده</span><strong>' + topKillerText + '</strong></div>' +
    '</div>';

    const snapshotNav = '<div class="snapshot-nav">' +
      '<a class="btn" href="' + (olderSnapshot ? base('clan.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(olderSnapshot.snapshot_id) + '&mode=' + encodeURIComponent(mode)) : '#') + '" ' + (olderSnapshot ? '' : 'aria-disabled="true"') + '>← Snapshot قبلی</a>' +
      '<a class="btn" href="' + base('archive.html','?clan=' + encodeURIComponent(activeClanId)) + '">آرشیو</a>' +
      '<a class="btn" href="' + (newerSnapshot ? base('clan.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(newerSnapshot.snapshot_id) + '&mode=' + encodeURIComponent(mode)) : '#') + '" ' + (newerSnapshot ? '' : 'aria-disabled="true"') + '>Snapshot بعدی →</a>' +
      '</div>';

    root.innerHTML = header('جدول جامع عملکرد و تغییرات اعضای کلن', 'UCS · LEADERBOARD', 'ساختار Viewer بر پایهٔ الگوی تثبیت‌شدهٔ پروژه نگه داشته شده است؛ داده‌ها از Read Model خوانده می‌شوند.') + overviewHtml +
      '<section class="panel"><div class="toolbar">' +
      '<label class="field"><span>Snapshot</span><select id="snapshot-select">' + clanSnapshots.map((s) => '<option value="' + esc(s.snapshot_id) + '" ' + (s.snapshot_id === activeSnapshot.snapshot_id ? 'selected' : '') + '>' + esc(s.snapshot_id) + ' · ' + esc(formatSnapshotDateTime(s.official_timestamp_utc)) + '</option>').join('') + '</select></label>' +
      '<label class="field search-field"><span>جستجو</span><input id="search-input" type="search" placeholder="نام بازیکن، سمت یا مقدار..."></label>' +
      '<div class="switch view-switch"><button data-mode="simple" class="' + (mode === 'simple' ? 'active' : '') + '">نمایش ساده</button><button data-mode="summary" class="' + (mode === 'summary' ? 'active' : '') + '">نمایش خلاصه</button><button data-mode="graphic" class="' + (mode === 'graphic' ? 'active' : '') + '">نمایش گرافیکی</button></div>' +
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
      '<section class="panel">' +
        '<div class="section-head"><div><span class="badge">اسنپ‌شات‌ها</span><h2>جدول جامع دوره‌ها و آرشیو کلن</h2></div><span class="count">' + formatNumber(snapshots.length) + ' دوره ثبت‌شده</span></div>' +
        '<div class="table-wrap"><table class="snapshots-table"><thead><tr>' +
          '<th># دوره</th>' +
          '<th>شناسه Snapshot</th>' +
          '<th>زمان رسمی</th>' +
          '<th>تعداد اعضا</th>' +
          '<th>مجموع کیل‌ها</th>' +
          '<th>مجموع مدال‌ها</th>' +
          '<th>تغییرات عضویت</th>' +
          '<th>عملیات</th>' +
        '</tr></thead><tbody>' +
        snapshots.map((s, idx) => {
          const agg = aggregate(s.snapshot_id);
          const changes = changesForSnapshot(s.snapshot_id);
          const actCount = changes.joined.length + changes.left.length + changes.other.length;
          const href = base('clan.html','?clan=' + encodeURIComponent(activeClanId) + '&snapshot=' + encodeURIComponent(s.snapshot_id));
          return '<tr>' +
            '<td><span class="tbl-rank">' + formatNumber(snapshots.length - idx) + '</span></td>' +
            '<td><code>' + esc(s.snapshot_id) + '</code></td>' +
            '<td>' + esc(formatSnapshotDateTime(s.official_timestamp_utc)) + '</td>' +
            '<td><strong>' + formatNumber(s.member_count) + ' نفر</strong></td>' +
            '<td><strong>' + (agg.totalKills ? formatNumber(agg.totalKills) : '—') + '</strong></td>' +
            '<td><strong style="color:var(--gold);">' + (agg.totalMedals ? formatNumber(agg.totalMedals) : '—') + '</strong></td>' +
            '<td>' + (actCount ? ('<span class="delta-pos">' + formatNumber(actCount) + ' تغییر</span>') : '<span class="delta-zero">بدون تغییر</span>') + '</td>' +
            '<td><a class="btn" style="padding:4px 10px;font-size:0.75rem;" href="' + href + '">مشاهده لیدربورد 📊</a></td>' +
            '</tr>';
        }).join('') +
        '</tbody></table></div>' +
      '</section>' +
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

    let dirMode = 'table'; // Comprehensive Table is FIRST priority!

    root.innerHTML = header('اعضای کلن', 'UCS · PLAYER DIRECTORY', 'فهرست جامع بازیکنان به همراه شناسه یکتا، لول سلاح‌ها، استیج و سوابق فعالیت در کلن.') +
      '<section class="panel">' +
        '<div class="toolbar-wrap">' +
          '<label class="field search-field" style="flex:1;max-width:400px;"><span>جستجو</span><input id="player-search" type="search" placeholder="نام بازیکن، شناسه یا استیج..."></label>' +
          '<div class="view-switch" id="dir-switch">' +
            '<button data-dirmode="table" class="active">📋 جدول جامع اعضا (پیش‌فرض)</button>' +
            '<button data-dirmode="cards">🪪 نمای کارتی</button>' +
          '</div>' +
        '</div>' +
        '<div class="count" id="player-count"></div>' +
        '<div id="player-content"></div>' +
      '</section>';

    const render = () => {
      const q = (root.querySelector('#player-search')?.value || '').trim().toLocaleLowerCase('fa');
      const list = entries.filter((entry) => {
        const text = [
          entry.global?.display_name,
          entry.global?.global_player_id,
          entry.observation?.display_name,
          entry.observation?.observation_id,
          entry.observation?.stage,
          entry.observation?.clan_display_name
        ].join(' ').toLocaleLowerCase('fa');
        return text.includes(q);
      });

      root.querySelector('#player-count').textContent = formatNumber(list.length) + ' عضو ثبت‌شده';

      if (!list.length) {
        root.querySelector('#player-content').innerHTML = '<div class="empty">هیچ عضوی با این مشخصات یافت نشد.</div>';
        return;
      }

      if (dirMode === 'table') {
        const rowsHtml = list.map((entry, idx) => {
          const playerId = entry.global?.global_player_id;
          const href = playerId
            ? base('player.html','?id=' + encodeURIComponent(playerId) + '&clan=' + encodeURIComponent(activeClanId || ''))
            : base('player.html','?observation=' + encodeURIComponent(entry.observation?.observation_id || '') + '&clan=' + encodeURIComponent(activeClanId || ''));
          const label = entry.global?.display_name || entry.observation?.display_name || '—';
          const initial = String(label).slice(0, 1);
          const stageVal = entry.global?.latest_metrics?.stage ?? entry.observation?.stage;
          const medalVal = entry.global?.latest_metrics?.current_league_clan_medals ?? entry.observation?.current_league_clan_medals;
          const killsVal = entry.observation?.total_kills ?? entry.global?.latest_metrics?.total_kills;
          const wepVal = weaponsFor(entry.observation || {});
          const clanName = entry.observation?.clan_display_name || activeClan?.display_name || '—';
          const r = entry.observation?.rank;
          const rankCls = r === 1 ? 'tbl-rank rank-1' : (r === 2 ? 'tbl-rank rank-2' : (r === 3 ? 'tbl-rank rank-3' : 'tbl-rank'));

          return '<tr>' +
            '<td><span class="' + rankCls + '">' + (r ? '#' + formatNumber(r) : formatNumber(idx + 1)) + '</span></td>' +
            '<td><div class="tbl-player"><span class="tbl-avatar">' + esc(initial) + '</span><a class="tbl-name" href="' + href + '">' + esc(label) + '</a></div></td>' +
            '<td><code style="font-size:0.78rem;color:var(--muted);">' + (playerId ? esc(playerId) : 'UNRESOLVED') + '</code></td>' +
            '<td>' + esc(clanName) + '</td>' +
            '<td><strong>' + formatNumber(stageVal) + '</strong></td>' +
            '<td><strong style="color:var(--gold);">' + formatNumber(medalVal) + '</strong></td>' +
            '<td><strong>' + (killsVal ? formatNumber(killsVal) : '—') + '</strong></td>' +
            '<td>' + (wepVal && wepVal !== '—' ? ('<span class="tbl-weapons">' + esc(wepVal) + '</span>') : '—') + '</td>' +
            '<td><span class="badge" style="font-size:0.7rem;padding:2px 7px;">' + (playerId ? 'تاییدشده' : 'تک‌مشاهده') + '</span></td>' +
            '<td><a class="btn" style="padding:4px 10px;font-size:0.75rem;" href="' + href + '">کارنامه 👤</a></td>' +
            '</tr>';
        }).join('');

        root.querySelector('#player-content').innerHTML =
          '<div class="table-wrap"><table class="directory-table"><thead><tr>' +
          '<th># ردیف</th>' +
          '<th>نام بازیکن</th>' +
          '<th>شناسه یکتای UCS</th>' +
          '<th>کلن عضو</th>' +
          '<th>استیج</th>' +
          '<th>مدال کلن</th>' +
          '<th>مجموع کیل 💀</th>' +
          '<th>لول سلاح‌ها</th>' +
          '<th>وضعیت هویت</th>' +
          '<th>عملیات</th>' +
          '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
      } else {
        const cardsHtml = list.map((entry) => {
          const playerId = entry.global?.global_player_id;
          const href = playerId
            ? base('player.html','?id=' + encodeURIComponent(playerId) + '&clan=' + encodeURIComponent(activeClanId || ''))
            : base('player.html','?observation=' + encodeURIComponent(entry.observation?.observation_id || '') + '&clan=' + encodeURIComponent(activeClanId || ''));
          const label = entry.global?.display_name || entry.observation?.display_name || '—';
          const stageVal = entry.global?.latest_metrics?.stage ?? entry.observation?.stage;
          const medalVal = entry.global?.latest_metrics?.current_league_clan_medals ?? entry.observation?.current_league_clan_medals;
          const killsVal = entry.observation?.total_kills;
          const wepVal = weaponsFor(entry.observation || {});
          return '<a class="player-card" href="' + href + '">' +
            '<div class="player-card-head">' +
              '<span class="rank">' + (entry.observation?.rank ? ('#' + esc(entry.observation.rank)) : '👤') + '</span>' +
              '<div>' +
                '<h3>' + esc(label) + '</h3>' +
                '<span class="role">' + (playerId ? esc(playerId) : 'Identity: UNRESOLVED') + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="member-grid" style="margin-top:10px;">' +
              '<div class="stat"><span>استیج</span><strong>' + formatNumber(stageVal) + '</strong></div>' +
              '<div class="stat medal"><span>مدال کلن</span><strong>' + formatNumber(medalVal) + '</strong></div>' +
              (killsVal ? ('<div class="stat"><span>مجموع کیل 💀</span><strong>' + formatNumber(killsVal) + '</strong></div>') : '') +
              (wepVal && wepVal !== '—' ? ('<div class="stat weapons"><span>سلاح‌ها</span><strong>' + esc(wepVal) + '</strong></div>') : '') +
            '</div>' +
          '</a>';
        }).join('');
        root.querySelector('#player-content').innerHTML = '<div class="player-grid">' + cardsHtml + '</div>';
      }

      root.querySelectorAll('[data-dirmode]').forEach((btn) => {
        btn.onclick = () => {
          dirMode = btn.dataset.dirmode;
          root.querySelectorAll('[data-dirmode]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          render();
        };
      });
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
      if (!snapshot) continue;
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
  function observationHistoryFor(observationId) {
    const allMembers = model.snapshots.flatMap((snapshot) => snapshot.members || []);
    const membersById = new Map(allMembers.map((member) => [member.observation_id, member]));
    if (!membersById.has(observationId)) return [];

    const edges = (Array.isArray(model.snapshot_delta_results) ? model.snapshot_delta_results : [])
      .filter((item) => item.status === 'VALID' && item.baseline_observation_id && item.current_observation_id)
      .filter((item) => {
        const current = membersById.get(item.current_observation_id);
        const baseline = membersById.get(item.baseline_observation_id);
        return current && baseline && current.clan_id === baseline.clan_id;
      })
      .map((item) => [item.baseline_observation_id, item.current_observation_id]);

    const connected = new Set([observationId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const [left, right] of edges) {
        if (!connected.has(left) && !connected.has(right)) continue;
        if (!connected.has(left)) { connected.add(left); changed = true; }
        if (!connected.has(right)) { connected.add(right); changed = true; }
      }
    }

    return [...connected]
      .map((id) => membersById.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const left = model.snapshots.find((snapshot) => snapshot.snapshot_id === a.snapshot_id);
        const right = model.snapshots.find((snapshot) => snapshot.snapshot_id === b.snapshot_id);
        const leftTime = String(left?.official_timestamp_utc || '');
        const rightTime = String(right?.official_timestamp_utc || '');
        return leftTime.localeCompare(rightTime) || String(a.observation_id).localeCompare(String(b.observation_id));
      });
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
      observations = observationHistoryFor(observationId);
      const seed = observations.find((item) => item.observation_id === observationId) || observations[0] || null;
      if (seed) { displayName = seed.display_name; status = seed.identity_resolution_status; }
    }

    if (!displayName) {
      root.innerHTML = header('Player Profile', 'UCS · PLAYER PROFILE') + '<div class="empty">بازیکن یا Observation موردنظر پیدا نشد.</div>';
      return;
    }

    // A confirmed Global Player profile owns its full cross-Clan observation history. Clan context remains navigation context, not a history filter.
    const scopedObs = observations;
    const scopedMemberships = memberships;
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

    let histMode = 'table'; // Comprehensive Table is FIRST priority!

    root.innerHTML = header('تاریخچه عضویت و جابه‌جایی','UCS · MEMBERSHIP HISTORY',activeClanId ? 'نمایش فقط Membership و رویدادهای مرتبط با Clan انتخاب‌شده.' : 'نمای Global برای بررسی تاریخچهٔ عضویت و جابه‌جایی بین تمام Clanها.') +
      (players.length
        ? '<section class="panel">' +
            '<div class="toolbar-wrap">' +
              '<span class="count">' + formatNumber(players.length) + ' سابقه جابه‌جایی و عضویت ثبت‌شده</span>' +
              '<div class="view-switch" id="hist-switch">' +
                '<button data-histmode="table" class="active">📋 جدول جامع تاریخچه (پیش‌فرض)</button>' +
                '<button data-histmode="cards">🪪 نمای کارتی</button>' +
              '</div>' +
            '</div>' +
            '<div id="hist-content"></div>' +
          '</section>'
        : '<section class="panel empty"><h2>' + (activeClanId ? 'برای این Clan تاریخچهٔ Membership ثبت‌شده‌ای وجود ندارد.' : 'هنوز جابه‌جایی Global تأییدشده‌ای ثبت نشده است.') + '</h2><p>Observationهای unresolved همچنان قابل مشاهده‌اند، اما به‌عنوان Player مشترک بین Clanها ادغام نمی‌شوند.</p></section>');

    if (!players.length) return;

    const render = () => {
      if (histMode === 'table') {
        const rowsHtml = players.map(({player, memberships, events}, idx) => {
          const href = base('player.html','?id=' + encodeURIComponent(player.global_player_id) + (activeClanId ? '&clan=' + encodeURIComponent(activeClanId) : ''));
          const initial = String(player.display_name || '—').slice(0, 1);
          const clanList = memberships.map(m => m.clan_display_name || m.clan_id).join(' ➔ ') || '—';
          return '<tr>' +
            '<td><span class="tbl-rank">' + formatNumber(idx + 1) + '</span></td>' +
            '<td><div class="tbl-player"><span class="tbl-avatar">' + esc(initial) + '</span><a class="tbl-name" href="' + href + '">' + esc(player.display_name) + '</a></div></td>' +
            '<td><code style="font-size:0.78rem;color:var(--muted);">' + esc(player.global_player_id) + '</code></td>' +
            '<td><strong>' + esc(clanList) + '</strong></td>' +
            '<td>' + formatNumber(memberships.length) + ' کلن</td>' +
            '<td>' + formatNumber(events.length) + ' رویداد</td>' +
            '<td><span class="badge" style="font-size:0.7rem;padding:2px 7px;">' + esc(player.identity_status || 'VERIFIED') + '</span></td>' +
            '<td><a class="btn" style="padding:4px 10px;font-size:0.75rem;" href="' + href + '">سوابق کامل 📜</a></td>' +
            '</tr>';
        }).join('');

        root.querySelector('#hist-content').innerHTML =
          '<div class="table-wrap"><table class="events-table"><thead><tr>' +
          '<th># ردیف</th>' +
          '<th>نام بازیکن</th>' +
          '<th>شناسه گلوبال یکتا</th>' +
          '<th>مسیر و کلن‌های عضویت</th>' +
          '<th>تعداد دوره‌ها</th>' +
          '<th>تعداد رویدادها</th>' +
          '<th>وضعیت هویت</th>' +
          '<th>عملیات</th>' +
          '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
      } else {
        const cardsHtml = players.map(({player,memberships,events}) => '<a class="player-card" href="' + base('player.html','?id=' + encodeURIComponent(player.global_player_id) + (activeClanId ? '&clan=' + encodeURIComponent(activeClanId) : '')) + '"><div class="player-card-head"><span class="player-avatar">' + esc(String(player.display_name || '—').slice(0,1)) + '</span><div><h3>' + esc(player.display_name) + '</h3><span class="muted">' + esc(player.global_player_id) + '</span></div></div><div class="player-mini"><span>Membership <b>' + formatNumber(memberships.length) + '</b></span><span>رویدادها <b>' + formatNumber(events.length) + '</b></span></div></a>').join('');
        root.querySelector('#hist-content').innerHTML = '<div class="player-grid">' + cardsHtml + '</div>';
      }

      root.querySelectorAll('[data-histmode]').forEach((btn) => {
        btn.onclick = () => {
          histMode = btn.dataset.histmode;
          root.querySelectorAll('[data-histmode]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          render();
        };
      });
    };

    render();
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