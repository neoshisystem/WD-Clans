'use strict';

const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { DB_PATH, initDatabase } = require('./sqlite-db');

const HTTP_PORT = parseInt(process.env.PORT || '80', 10);
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT || '443', 10);
const HOST = process.env.HOST || '0.0.0.0';
const SITE_DIR = path.join(__dirname, '..', 'site');

const SSL_DIR = path.join(__dirname, '..', 'ssl');
const SSL_KEY = path.join(SSL_DIR, 'privkey.pem');
const SSL_CERT = path.join(SSL_DIR, 'fullchain.pem');

const ADMIN_CONFIG_PATH = path.join(__dirname, '..', 'data', 'admin_config.json');

function getAdminSecret() {
  if (fs.existsSync(ADMIN_CONFIG_PATH)) {
    try {
      const cfg = JSON.parse(fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8'));
      if (cfg && cfg.admin_key) return cfg.admin_key;
    } catch (_) {}
  }
  return process.env.WD_ADMIN_KEY || 'vandad2026';
}

function setAdminSecret(newKey) {
  const dir = path.dirname(ADMIN_CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(ADMIN_CONFIG_PATH, JSON.stringify({ admin_key: newKey, updated_at: new Date().toISOString() }, null, 2), 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const db = initDatabase(DB_PATH);
const CANONICAL_PATH = path.join(__dirname, '..', 'data', 'canonical.json');
let generateStaticVerticalSlice = null;
try {
  generateStaticVerticalSlice = require('../scripts/generate-static-vertical-slice').generateStaticVerticalSlice;
} catch (_) {}

function syncCanonicalAndRebuild() {
  try {
    if (!fs.existsSync(CANONICAL_PATH) || !generateStaticVerticalSlice) return;
    const canon = JSON.parse(fs.readFileSync(CANONICAL_PATH, 'utf8'));
    const dbClans = db.prepare('SELECT * FROM clans').all();

    canon.clans = dbClans.map(c => {
      let prov = {};
      try { prov = c.provenance ? JSON.parse(c.provenance) : {}; } catch(_) {}
      return {
        clan_id: c.clan_id,
        display_name: c.display_name,
        tag: c.tag || undefined,
        status: c.status || 'ACTIVE',
        provenance: prov
      };
    });

    fs.writeFileSync(CANONICAL_PATH, JSON.stringify(canon, null, 2), 'utf8');
    generateStaticVerticalSlice();
    console.log('[UCS Server] Synced clans to canonical.json and regenerated static bundle.');
  } catch (err) {
    console.error('[UCS Server] Error syncing canonical:', err);
  }
}


function jsonResponse(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function verifyAdmin(req, parsedUrl) {
  const currentSecret = getAdminSecret();
  const authHeader = req.headers['authorization'] || '';
  const keyHeader = req.headers['x-admin-key'] || '';
  const queryKey = parsedUrl.searchParams.get('key') || '';

  if (keyHeader === currentSecret || queryKey === currentSecret) return true;
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7).trim() === currentSecret) return true;
  return false;
}

function handleStatic(req, res, pathname) {
  let relative = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(relative).replace(/^(\.\.[\\/])+/, '');
  const filePath = path.join(SITE_DIR, safePath);

  if (!filePath.startsWith(SITE_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

async function appHandler(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-key'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // --------------------------------------------------------------------------
  // PUBLIC API ROUTES
  // --------------------------------------------------------------------------
  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/status') {
      const clansCount = db.prepare('SELECT count(*) as c FROM clans').get().c;
      const snapshotsCount = db.prepare('SELECT count(*) as c FROM snapshots').get().c;
      const playersCount = db.prepare('SELECT count(*) as c FROM global_players').get().c;
      const observationsCount = db.prepare('SELECT count(*) as c FROM observations').get().c;
      const lastSnapshot = db.prepare('SELECT snapshot_id, clan_id, official_timestamp_utc, member_count FROM snapshots ORDER BY official_timestamp_utc DESC LIMIT 1').get();

      return jsonResponse(res, 200, {
        status: 'online',
        system: 'Unified Clan System (UCS) War Drone Engine',
        database: 'SQLite (Isolated local WAL)',
        counts: {
          clans: clansCount,
          snapshots: snapshotsCount,
          players: playersCount,
          observations: observationsCount
        },
        last_snapshot: lastSnapshot || null
      });
    }

    if (pathname === '/api/clans') {
      const clans = db.prepare(`
        SELECT c.*,
               COALESCE((SELECT member_count FROM snapshots WHERE clan_id = c.clan_id ORDER BY official_timestamp_utc DESC LIMIT 1), 0) as member_count,
               COALESCE((SELECT snapshot_id FROM snapshots WHERE clan_id = c.clan_id ORDER BY official_timestamp_utc DESC LIMIT 1), null) as latest_snapshot_id
        FROM clans c
        ORDER BY c.display_name ASC
      `).all();
      return jsonResponse(res, 200, { clans });
    }

    // Search players across all clans or by query
    if (pathname === '/api/players/search') {
      const q = parsedUrl.searchParams.get('q') || '';
      const limit = Math.min(parseInt(parsedUrl.searchParams.get('limit') || '50', 10), 100);
      const queryParam = `%${q.trim()}%`;

      const results = db.prepare(`
        SELECT o.observation_id, o.snapshot_id, o.clan_id, c.display_name as clan_name,
               o.rank, o.display_name, o.role, o.stage, o.total_kills, o.weapons,
               o.current_league_clan_medals, o.global_player_id
        FROM observations o
        LEFT JOIN clans c ON o.clan_id = c.clan_id
        WHERE o.display_name LIKE ? OR o.global_player_id LIKE ?
        GROUP BY o.global_player_id, o.display_name
        ORDER BY o.total_kills DESC
        LIMIT ?
      `).all(queryParam, queryParam, limit);

      return jsonResponse(res, 200, { query: q, count: results.length, players: results });
    }

    const clanMatch = pathname.match(/^\/api\/clans\/([^\/]+)$/);
    if (clanMatch) {
      const clanId = decodeURIComponent(clanMatch[1]);
      const clan = db.prepare('SELECT * FROM clans WHERE clan_id = ?').get(clanId);
      if (!clan) return jsonResponse(res, 404, { error: 'Clan not found' });
      const snapshots = db.prepare('SELECT * FROM snapshots WHERE clan_id = ? ORDER BY official_timestamp_utc DESC').all(clanId);
      return jsonResponse(res, 200, { clan, snapshots });
    }

    const snapshotMatch = pathname.match(/^\/api\/snapshots\/([^\/]+)$/);
    if (snapshotMatch) {
      const snapshotId = decodeURIComponent(snapshotMatch[1]);
      const snapshot = db.prepare('SELECT * FROM snapshots WHERE snapshot_id = ?').get(snapshotId);
      if (!snapshot) return jsonResponse(res, 404, { error: 'Snapshot not found' });
      const observations = db.prepare('SELECT * FROM observations WHERE snapshot_id = ? ORDER BY rank ASC').all(snapshotId);
      return jsonResponse(res, 200, { snapshot, observations });
    }

    const playerMatch = pathname.match(/^\/api\/players\/([^\/]+)$/);
    if (playerMatch) {
      const playerId = decodeURIComponent(playerMatch[1]);
      const player = db.prepare('SELECT * FROM global_players WHERE global_player_id = ?').get(playerId);
      if (!player) return jsonResponse(res, 404, { error: 'Player not found' });
      const episodes = db.prepare('SELECT * FROM membership_episodes WHERE global_player_id = ? ORDER BY sequence ASC').all(playerId);
      const observations = db.prepare('SELECT * FROM observations WHERE global_player_id = ? ORDER BY last_online_utc DESC').all(playerId);
      return jsonResponse(res, 200, { player, episodes, observations });
    }

    // ------------------------------------------------------------------------
    // ADMIN API ROUTES (Protected by Dynamic Admin Key)
    // ------------------------------------------------------------------------
    if (pathname.startsWith('/api/admin/')) {
      // Auth verification endpoint
      if (pathname === '/api/admin/auth' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        if (body.key === getAdminSecret()) {
          return jsonResponse(res, 200, { ok: true, message: 'Authenticated successfully' });
        }
        return jsonResponse(res, 401, { ok: false, error: 'رمز عبور مدیریت نادرست است.' });
      }

      // Check admin key for all other /api/admin/ routes
      if (!verifyAdmin(req, parsedUrl)) {
        return jsonResponse(res, 401, { error: 'دسترسی غیرمجاز. کلید مدیریت نامعتبر است.' });
      }

      // 1. Change Admin Password
      if (pathname === '/api/admin/change-password' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const currentKey = (body.current_key || '').trim();
        const newKey = (body.new_key || '').trim();

        if (currentKey !== getAdminSecret()) {
          return jsonResponse(res, 400, { ok: false, error: 'رمز عبور فعلی نامعتبر است.' });
        }
        if (!newKey || newKey.length < 6) {
          return jsonResponse(res, 400, { ok: false, error: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
        }

        try {
          setAdminSecret(newKey);
          return jsonResponse(res, 200, { ok: true, message: 'رمز عبور مدیریت با موفقیت به‌روزرسانی شد.' });
        } catch (err) {
          return jsonResponse(res, 500, { ok: false, error: 'خطا در ذخیره رمز عبور جدید: ' + err.message });
        }
      }

      // 2. Admin System Diagnostics & DB Stats
      if (pathname === '/api/admin/diagnostics') {
        let dbStat = {};
        try {
          const st = fs.statSync(DB_PATH);
          dbStat.size_bytes = st.size;
          dbStat.size_mb = (st.size / (1024 * 1024)).toFixed(2);
        } catch (_) {}

        const counts = {
          clans: db.prepare('SELECT count(*) as c FROM clans').get().c,
          snapshots: db.prepare('SELECT count(*) as c FROM snapshots').get().c,
          players: db.prepare('SELECT count(*) as c FROM global_players').get().c,
          observations: db.prepare('SELECT count(*) as c FROM observations').get().c,
          deltas: db.prepare('SELECT count(*) as c FROM delta_results').get().c,
          events: db.prepare('SELECT count(*) as c FROM membership_events').get().c,
          bot_users: db.prepare('SELECT count(*) as c FROM bot_users').get().c,
          pending_zips: db.prepare("SELECT count(*) as c FROM pending_packages WHERE status = 'pending'").get().c
        };

        return jsonResponse(res, 200, {
          ok: true,
          db: dbStat,
          counts,
          uptime_seconds: process.uptime(),
          memory: process.memoryUsage(),
          node_version: process.version
        });
      }

      // 3. Database Maintenance (VACUUM, WAL Checkpoint, Backup)
      if (pathname === '/api/admin/db-maintenance' && req.method === 'POST') {
        const body = await parseJsonBody(req);
        const action = (body.action || '').toLowerCase();

        try {
          if (action === 'vacuum') {
            db.exec('VACUUM;');
            return jsonResponse(res, 200, { ok: true, message: 'دستور VACUUM با موفقیت اجرا شد و پایگاه‌داده فشرده‌سازی گردید.' });
          } else if (action === 'checkpoint') {
            db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
            return jsonResponse(res, 200, { ok: true, message: 'وال با موفقیت Checkpoint و همگام‌سازی شد.' });
          } else if (action === 'backup') {
            const backupDir = path.join(__dirname, '..', 'data', 'backups');
            if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
            const backupFile = path.join(backupDir, `ucs.db.backup.${Date.now()}`);
            fs.copyFileSync(DB_PATH, backupFile);
            return jsonResponse(res, 200, { ok: true, message: `پشتیبان پایگاه داده در مسیر ${path.basename(backupFile)} ایجاد گردید.` });
          }
          return jsonResponse(res, 400, { ok: false, error: 'عملیات درخواستی نامعتبر است (vacuum, checkpoint, backup).' });
        } catch (err) {
          return jsonResponse(res, 500, { ok: false, error: 'خطا در اجرای عملیات دیتابیس: ' + err.message });
        }
      }

      // 4. Admin Clans List & Add
      if (pathname === '/api/admin/clans') {
        if (req.method === 'GET') {
          const clans = db.prepare(`
            SELECT c.*,
                   COALESCE((SELECT member_count FROM snapshots WHERE clan_id = c.clan_id ORDER BY official_timestamp_utc DESC LIMIT 1), 0) as member_count,
                   (SELECT count(*) FROM snapshots WHERE clan_id = c.clan_id) as snapshot_count
            FROM clans c
            ORDER BY c.display_name ASC
          `).all();
          return jsonResponse(res, 200, { clans });
        }

        if (req.method === 'POST') {
          const body = await parseJsonBody(req);
          const clanId = (body.clan_id || '').trim();
          const displayName = (body.display_name || '').trim();
          const tag = (body.tag || '').trim();
          const status = (body.status || 'ACTIVE').trim().toUpperCase();

          if (!clanId || !displayName) {
            return jsonResponse(res, 400, { error: 'شناسه کلن (clan_id) و نام نمایشی (display_name) الزامی است.' });
          }

          try {
            db.prepare(`
              INSERT INTO clans (clan_id, display_name, tag, status, provenance)
              VALUES (?, ?, ?, ?, ?)
            `).run(clanId, displayName, tag || null, status, JSON.stringify({ source: 'admin_panel', created_at: new Date().toISOString() }));
            syncCanonicalAndRebuild();
            return jsonResponse(res, 201, { ok: true, message: 'کلن جدید با موفقیت ایجاد شد و در سایت مستقر گردید.' });
          } catch (err) {
            return jsonResponse(res, 400, { error: 'خطا در ثبت کلن: ' + err.message });
          }
        }
      }

      // 5. Admin Clan Edit & Delete
      const adminClanMatch = pathname.match(/^\/api\/admin\/clans\/([^\/]+)$/);
      if (adminClanMatch) {
        const clanId = decodeURIComponent(adminClanMatch[1]);

        if (req.method === 'PUT') {
          const body = await parseJsonBody(req);
          const displayName = (body.display_name || '').trim();
          const tag = (body.tag || '').trim();
          const status = (body.status || 'ACTIVE').trim().toUpperCase();

          if (!displayName) {
            return jsonResponse(res, 400, { error: 'نام نمایشی کلن الزامی است.' });
          }

          db.prepare(`
            UPDATE clans SET display_name = ?, tag = ?, status = ? WHERE clan_id = ?
          `).run(displayName, tag || null, status, clanId);

          syncCanonicalAndRebuild();
          return jsonResponse(res, 200, { ok: true, message: 'اطلاعات کلن به‌روزرسانی شد.' });
        }

        if (req.method === 'DELETE') {
          db.prepare(`UPDATE clans SET status = 'ARCHIVED' WHERE clan_id = ?`).run(clanId);
          syncCanonicalAndRebuild();
          return jsonResponse(res, 200, { ok: true, message: 'کلن به حالت بایگانی (ARCHIVED) منتقل شد.' });
        }
      }

      // 6. Admin Telegram Users Management
      if (pathname === '/api/admin/users') {
        const users = db.prepare('SELECT * FROM bot_users ORDER BY rowid DESC').all();
        return jsonResponse(res, 200, { users });
      }

      const adminUserStatusMatch = pathname.match(/^\/api\/admin\/users\/([^\/]+)\/status$/);
      if (adminUserStatusMatch && req.method === 'POST') {
        const userId = parseInt(adminUserStatusMatch[1], 10);
        const body = await parseJsonBody(req);
        const newStatus = (body.status || 'approved').toLowerCase();
        const newRole = body.role ? body.role.toLowerCase() : undefined;

        if (newRole) {
          db.prepare(`
            UPDATE bot_users SET status = ?, role = ?, reviewed_at_utc = datetime('now') WHERE user_id = ?
          `).run(newStatus, newRole, userId);
        } else {
          db.prepare(`
            UPDATE bot_users SET status = ?, reviewed_at_utc = datetime('now') WHERE user_id = ?
          `).run(newStatus, userId);
        }

        return jsonResponse(res, 200, { ok: true, message: 'وضعیت کاربر با موفقیت تغییر یافت.' });
      }

      // 7. Admin Pending ZIP Packages & Actions
      if (pathname === '/api/admin/packages') {
        const packages = db.prepare('SELECT * FROM pending_packages ORDER BY rowid DESC').all();
        return jsonResponse(res, 200, { packages });
      }

      const adminPkgActionMatch = pathname.match(/^\/api\/admin\/packages\/([^\/]+)\/action$/);
      if (adminPkgActionMatch && req.method === 'POST') {
        const pkgId = decodeURIComponent(adminPkgActionMatch[1]);
        const body = await parseJsonBody(req);
        const action = (body.action || '').toLowerCase();

        const pkg = db.prepare('SELECT * FROM pending_packages WHERE package_id = ?').get(pkgId);
        if (!pkg) {
          return jsonResponse(res, 404, { ok: false, error: 'پکیج یافت نشد.' });
        }

        if (action === 'approve') {
          try {
            // Run zip processor
            const pyCmd = `python3 /root/projects/WD-Clans/bot/zip_processor.py "${pkg.file_path}" "${pkg.clan_id}"`;
            const procOut = execSync(pyCmd, { encoding: 'utf-8', timeout: 120000 });
            db.prepare("UPDATE pending_packages SET status = 'approved', reviewed_at_utc = datetime('now') WHERE package_id = ?").run(pkgId);
            return jsonResponse(res, 200, { ok: true, message: 'پکیج با موفقیت پردازش و در دیتابیس ثبت شد.', output: procOut.slice(-500) });
          } catch (err) {
            return jsonResponse(res, 500, { ok: false, error: 'خطا در پردازش پکیج: ' + err.message });
          }
        } else if (action === 'reject') {
          db.prepare("UPDATE pending_packages SET status = 'rejected', reviewed_at_utc = datetime('now') WHERE package_id = ?").run(pkgId);
          if (fs.existsSync(pkg.file_path)) {
            try { fs.unlinkSync(pkg.file_path); } catch (_) {}
          }
          return jsonResponse(res, 200, { ok: true, message: 'پکیج رد و فایل مربوطه حذف شد.' });
        }
        return jsonResponse(res, 400, { ok: false, error: 'عملیات نامعتبر است.' });
      }

      return jsonResponse(res, 404, { error: 'Admin API endpoint not found' });
    }

    return jsonResponse(res, 404, { error: 'API endpoint not found' });
  }

  // Fallback to static files
  handleStatic(req, res, pathname);
}

// Start HTTP server
const httpServer = http.createServer((req, res) => {
  appHandler(req, res).catch(err => {
    console.error('Unhandled app error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  });
});

httpServer.listen(HTTP_PORT, HOST, () => {
  console.log(`UCS War Drone HTTP Server running on http://${HOST}:${HTTP_PORT}`);
});

// Start HTTPS server if SSL certificate exists
if (fs.existsSync(SSL_KEY) && fs.existsSync(SSL_CERT)) {
  try {
    const sslOptions = {
      key: fs.readFileSync(SSL_KEY),
      cert: fs.readFileSync(SSL_CERT)
    };
    const httpsServer = https.createServer(sslOptions, (req, res) => {
      appHandler(req, res).catch(err => {
        console.error('Unhandled HTTPS app error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      });
    });
    httpsServer.listen(HTTPS_PORT, HOST, () => {
      console.log(`UCS War Drone HTTPS Server running on https://${HOST}:${HTTPS_PORT}`);
    });
  } catch (sslErr) {
    console.error('Failed to start HTTPS server:', sslErr.message);
  }
} else {
  console.log('SSL certificate not found, HTTPS disabled');
}

module.exports = { appHandler };
