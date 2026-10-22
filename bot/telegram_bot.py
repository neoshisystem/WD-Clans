#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
War Drone Autonomous Telegram Bot (WD-Clans Bot)
- Role-based Admin approval & Whitelist guard (Admin ID: 101258148)
- Interactive Clan Navigation: Clans List -> Members List (Paginated) -> Detailed Player Career Dossier
- Advanced Partial Name Search with Interactive Matching Buttons
- Top Players Leaderboard per Clan (Kills & League Medals)
- Direct Web Admin Management Integration
- ZIP Ingestion Admin Approval Quarantine
- Individual Screenshot AI Vision Scouting
"""

import os
import sys
import json
import time
import tempfile
import sqlite3
import urllib.request
import urllib.error
from datetime import datetime, timezone

from ai_extractor import extract_from_image, check_monotonic_continuity, format_persian_report
from player_history import (
    lookup_player_career,
    format_career_report_persian,
    search_players,
    get_clan_top_players,
    DB_PATH
)
from zip_processor import process_zip_package

ADMIN_ID = 101258148
CONFIG_PATH = os.environ.get("WD_BOT_CONFIG", "/root/projects/WD-Clans/bot/bot_config.json")
STAGING_DIR = "/root/projects/WD-Clans/data/pending_zips"
os.makedirs(STAGING_DIR, exist_ok=True)

USER_STATES = {}

def get_db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con

def init_tables():
    con = get_db()
    cur = con.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS bot_users (
        user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        status TEXT DEFAULT 'pending',
        role TEXT DEFAULT 'member',
        clan_id TEXT,
        requested_at_utc TEXT,
        reviewed_at_utc TEXT
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS pending_packages (
        package_id TEXT PRIMARY KEY,
        user_id INTEGER,
        username TEXT,
        file_path TEXT,
        file_name TEXT,
        clan_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at_utc TEXT,
        reviewed_at_utc TEXT
    )
    """)
    # Seed Admin
    cur.execute("""
    INSERT INTO bot_users (user_id, username, first_name, status, role, requested_at_utc, reviewed_at_utc)
    VALUES (?, 'Admin', 'Admin', 'approved', 'admin', datetime('now'), datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET status='approved', role='admin'
    """, (ADMIN_ID,))
    con.commit()
    con.close()

def check_user_access(user_id, username=None, first_name=None):
    if user_id == ADMIN_ID:
        return {"status": "approved", "role": "admin"}

    con = get_db()
    cur = con.cursor()
    row = cur.execute("SELECT * FROM bot_users WHERE user_id = ?", (user_id,)).fetchone()
    now_str = datetime.now(timezone.utc).isoformat()

    if not row:
        cur.execute("""
        INSERT INTO bot_users (user_id, username, first_name, status, role, requested_at_utc)
        VALUES (?, ?, ?, 'pending', 'member', ?)
        """, (user_id, username or '', first_name or '', now_str))
        con.commit()
        con.close()
        return {"status": "pending", "role": "member", "is_new": True}

    con.close()
    return {"status": row["status"], "role": row["role"], "is_new": False}

def update_user_status(user_id, new_status, role=None):
    con = get_db()
    cur = con.cursor()
    now_str = datetime.now(timezone.utc).isoformat()
    if role:
        cur.execute("""
        UPDATE bot_users SET status = ?, role = ?, reviewed_at_utc = ? WHERE user_id = ?
        """, (new_status, role, now_str, user_id))
    else:
        cur.execute("""
        UPDATE bot_users SET status = ?, reviewed_at_utc = ? WHERE user_id = ?
        """, (new_status, now_str, user_id))
    con.commit()
    con.close()

def load_bot_token():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH) as f:
                cfg = json.load(f)
                if cfg.get("bot_token"):
                    return cfg["bot_token"]
        except Exception:
            pass
    if os.environ.get("WD_TELEGRAM_BOT_TOKEN"):
        return os.environ.get("WD_TELEGRAM_BOT_TOKEN")
    return None

def telegram_api(token, method, data=None):
    url = f"https://api.telegram.org/bot{token}/{method}"
    headers = {"Content-Type": "application/json"} if data else {}
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8") if data else None,
        headers=headers
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def send_message(token, chat_id, text, reply_markup=None, parse_mode="Markdown"):
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        return telegram_api(token, "sendMessage", payload)
    except urllib.error.HTTPError as e:
        payload.pop("parse_mode", None)
        return telegram_api(token, "sendMessage", payload)

def edit_message_text(token, chat_id, message_id, text, reply_markup=None, parse_mode="Markdown"):
    payload = {
        "chat_id": chat_id,
        "message_id": message_id,
        "text": text,
        "parse_mode": parse_mode
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    try:
        return telegram_api(token, "editMessageText", payload)
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8", errors="ignore")
        if "message is not modified" in err_msg:
            return None
        payload.pop("parse_mode", None)
        try:
            return telegram_api(token, "editMessageText", payload)
        except Exception:
            pass
        return None

def send_answer_callback(token, callback_query_id, text=None):
    payload = {"callback_query_id": callback_query_id}
    if text:
        payload["text"] = text
    return telegram_api(token, "answerCallbackQuery", payload)

def download_file(token, file_id, dest_path):
    info = telegram_api(token, "getFile", {"file_id": file_id})
    file_path = info["result"]["file_path"]
    file_url = f"https://api.telegram.org/file/bot{token}/{file_path}"
    urllib.request.urlretrieve(file_url, dest_path)

def get_main_keyboard(is_admin=False):
    if is_admin:
        keyboard = [
            [{"text": "🔍 استعلام با اسکرین‌شات"}, {"text": "🔎 جستجوی متنی بازیکن"}],
            [{"text": "🏰 لیست کلن‌ها"}, {"text": "🏆 برترین‌های هر کلن"}],
            [{"text": "📊 آمار و وضعیت دیتابیس"}, {"text": "👥 مدیریت کاربران ربات"}],
            [{"text": "⚙️ پنل ادمین تحت وب"}, {"text": "🌐 لینک داشبورد وب"}],
            [{"text": "❓ راهنمای استفاده"}]
        ]
    else:
        keyboard = [
            [{"text": "🔍 استعلام با اسکرین‌شات"}, {"text": "🔎 جستجوی متنی بازیکن"}],
            [{"text": "🏰 لیست کلن‌ها"}, {"text": "🏆 برترین‌های هر کلن"}],
            [{"text": "🌐 لینک داشبورد وب"}, {"text": "❓ راهنمای استفاده"}]
        ]
    return {
        "keyboard": keyboard,
        "resize_keyboard": True,
        "is_persistent": True
    }

def render_clans_list():
    con = get_db()
    clans = con.execute("""
        SELECT c.clan_id, c.display_name, c.tag,
               COALESCE((SELECT member_count FROM snapshots WHERE clan_id = c.clan_id ORDER BY official_timestamp_utc DESC LIMIT 1), 0) as members
        FROM clans c
        ORDER BY c.display_name ASC
    """).fetchall()
    con.close()

    text = (
        "🏰 **لیست کلن‌های تحت پوشش سامانه War Drone**\n\n"
        "جهت مشاهده رنکینگ و اعضای هر کلن، روی کلن مورد نظر بزنید:"
    )

    keyboard = []
    for c in clans:
        tag_str = f" [{c['tag']}]" if c['tag'] else ""
        btn_text = f"🛡️ {c['display_name']}{tag_str} ({c['members']} عضو)"
        cb_data = f"c_{c['clan_id']}_0"
        keyboard.append([{"text": btn_text, "callback_data": cb_data}])

    keyboard.append([{"text": "🌐 مشاهده کلن‌ها در وب", "url": "https://wd.hst-vip.com"}])
    return text, {"inline_keyboard": keyboard}

def render_top_clans_selector():
    con = get_db()
    clans = con.execute("""
        SELECT c.clan_id, c.display_name, c.tag
        FROM clans c
        WHERE c.clan_id IN (SELECT DISTINCT clan_id FROM snapshots)
        ORDER BY c.display_name ASC
    """).fetchall()
    con.close()

    text = "🏆 **مشاهده برترین‌های کلن (Top Players)**\n\nلطفاً کلن مورد نظر را انتخاب نمایید:"
    keyboard = []
    for c in clans:
        tag_str = f" [{c['tag']}]" if c['tag'] else ""
        keyboard.append([{"text": f"⚔️ {c['display_name']}{tag_str}", "callback_data": f"top_{c['clan_id']}"}])

    return text, {"inline_keyboard": keyboard}

def render_clan_top_report(clan_id):
    top_kills = get_clan_top_players(clan_id, metric="kills", limit=8)
    top_medals = get_clan_top_players(clan_id, metric="medals", limit=8)

    con = get_db()
    c = con.execute("SELECT display_name FROM clans WHERE clan_id = ?", (clan_id,)).fetchone()
    con.close()
    cname = c["display_name"] if c else clan_id

    if not top_kills:
        return f"⚠️ اطلاعاتی برای کلن `{cname}` ثبت نشده است.", {"inline_keyboard": [[{"text": "🔙 بازگشت", "callback_data": "top_menu"}]]}

    lines = [f"🏆 **برترین بازیکنان کلن:** `{cname}`", "──────────────────────────────", "💀 **بیشترین کیل‌های ثبت‌شده:**"]
    medals_icons = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣"]

    for idx, p in enumerate(top_kills):
        ico = medals_icons[idx] if idx < len(medals_icons) else "•"
        lines.append(f"{ico} **{p['display_name']}** — `{p['total_kills']:,} کیل` (استیج {p['stage']})")

    lines.append("")
    lines.append("🎖 **بیشترین مدال‌های لیگ جاری:**")
    for idx, p in enumerate(top_medals):
        ico = medals_icons[idx] if idx < len(medals_icons) else "•"
        lines.append(f"{ico} **{p['display_name']}** — `{p['current_medals']:,} مدال`")

    markup = {
        "inline_keyboard": [
            [{"text": "👥 اعضای این کلن", "callback_data": f"c_{clan_id}_0"}],
            [{"text": "🔙 انتخاب کلن دیگر", "callback_data": "top_menu"}]
        ]
    }
    return "\n".join(lines), markup

def render_clan_members(clan_id, page=0):
    con = get_db()
    clan = con.execute("SELECT clan_id, display_name FROM clans WHERE clan_id = ?", (clan_id,)).fetchone()
    if not clan:
        con.close()
        return "⚠️ کلن مورد نظر یافت نشد.", {"inline_keyboard": [[{"text": "🔙 لیست کلن‌ها", "callback_data": "clans_list"}]]}

    snap = con.execute("""
        SELECT snapshot_id, official_timestamp_utc, member_count 
        FROM snapshots WHERE clan_id = ? 
        ORDER BY official_timestamp_utc DESC LIMIT 1
    """, (clan_id,)).fetchone()

    if not snap:
        con.close()
        text = f"🏰 **کلن:** `{clan['display_name']}`\n\n⚠️ هنوز هیچ اسنپ‌شاتی برای این کلن ثبت نشده است."
        markup = {"inline_keyboard": [[{"text": "🔙 بازگشت به لیست کلن‌ها", "callback_data": "clans_list"}]]}
        return text, markup

    obs = con.execute("""
        SELECT observation_id, rank, display_name, stage, total_kills, global_player_id 
        FROM observations 
        WHERE snapshot_id = ? 
        ORDER BY rank ASC
    """, (snap["snapshot_id"],)).fetchall()
    con.close()

    total = len(obs)
    page_size = 8
    max_page = max(0, (total - 1) // page_size)
    page = max(0, min(page, max_page))
    start = page * page_size
    end = min(start + page_size, total)
    page_items = obs[start:end]

    text = (
        f"🏰 **کلن:** `{clan['display_name']}`\n"
        f"📅 **اسنپ‌شات:** `{snap['snapshot_id']}` | 👥 **اعضا:** `{snap['member_count']} نفر`\n\n"
        f"👇 جهت مشاهده **کارنامه کامل، لول سلاح‌ها و سوابق جابه‌جایی** روی بازیکن مورد نظر بزنید:"
    )

    keyboard = []
    row = []
    for o in page_items:
        dname = o["display_name"]
        if len(dname) > 14:
            dname = dname[:12] + ".."
        btn_text = f"#{o['rank']} {dname}"
        cb_data = f"p_{o['observation_id']}_{clan_id}_{page}"
        row.append({"text": btn_text, "callback_data": cb_data})
        if len(row) == 2:
            keyboard.append(row)
            row = []
    if row:
        keyboard.append(row)

    nav_row = []
    if page > 0:
        nav_row.append({"text": "◀️ قبلی", "callback_data": f"c_{clan_id}_{page-1}"})
    nav_row.append({"text": f"📄 {page+1} از {max_page+1}", "callback_data": "noop"})
    if page < max_page:
        nav_row.append({"text": "بعدی ▶️", "callback_data": f"c_{clan_id}_{page+1}"})
    keyboard.append(nav_row)

    keyboard.append([
        {"text": "🔙 لیست کلن‌ها", "callback_data": "clans_list"},
        {"text": "🌐 لیدربورد آنلاین", "url": f"https://wd.hst-vip.com/clan.html?clan={clan_id}"}
    ])

    return text, {"inline_keyboard": keyboard}

def render_player_detail(obs_id, clan_id, page):
    con = get_db()
    obs = con.execute("SELECT * FROM observations WHERE observation_id = ?", (obs_id,)).fetchone()
    con.close()
    if not obs:
        return "⚠️ مشخصات بازیکن یافت نشد.", {"inline_keyboard": [[{"text": "🔙 بازگشت", "callback_data": f"c_{clan_id}_{page}"}]]}

    career = lookup_player_career(display_name=obs["display_name"], global_player_id=obs["global_player_id"])
    report = format_career_report_persian(career)

    markup = {
        "inline_keyboard": [
            [{"text": "🔙 بازگشت به اعضای کلن", "callback_data": f"c_{clan_id}_{page}"}],
            [{"text": "🏰 لیست کلن‌ها", "callback_data": "clans_list"}]
        ]
    }
    return report, markup

def run_polling(token):
    print("🤖 War Drone Full Interactive & Secure Bot with Advanced Search is active...")
    init_tables()
    offset = 0

    while True:
        try:
            res = telegram_api(token, "getUpdates", {"offset": offset, "timeout": 20})
            updates = res.get("result", [])
            for u in updates:
                offset = u["update_id"] + 1

                # -------------------------------------------------------------
                # 1. Handle Callback Queries
                # -------------------------------------------------------------
                if "callback_query" in u:
                    cq = u["callback_query"]
                    cq_id = cq["id"]
                    from_id = cq["from"]["id"]
                    data = cq.get("data", "")
                    message = cq.get("message")
                    chat_id = message["chat"]["id"] if message else from_id
                    msg_id = message["message_id"] if message else None

                    access = check_user_access(from_id)
                    if access["status"] != "approved" and from_id != ADMIN_ID:
                        send_answer_callback(token, cq_id, "⛔ دسترسی شما تایید نشده است.")
                        continue

                    if data == "noop":
                        send_answer_callback(token, cq_id)
                        continue

                    if data == "clans_list":
                        send_answer_callback(token, cq_id)
                        text, markup = render_clans_list()
                        if msg_id:
                            edit_message_text(token, chat_id, msg_id, text, reply_markup=markup)
                        else:
                            send_message(token, chat_id, text, reply_markup=markup)
                        continue

                    if data == "top_menu":
                        send_answer_callback(token, cq_id)
                        text, markup = render_top_clans_selector()
                        if msg_id:
                            edit_message_text(token, chat_id, msg_id, text, reply_markup=markup)
                        else:
                            send_message(token, chat_id, text, reply_markup=markup)
                        continue

                    if data.startswith("top_"):
                        send_answer_callback(token, cq_id)
                        cid = data.replace("top_", "")
                        text, markup = render_clan_top_report(cid)
                        if msg_id:
                            edit_message_text(token, chat_id, msg_id, text, reply_markup=markup)
                        else:
                            send_message(token, chat_id, text, reply_markup=markup)
                        continue

                    if data.startswith("c_"):
                        send_answer_callback(token, cq_id)
                        parts = data.split("_")
                        clan_id = parts[1]
                        page = int(parts[2]) if len(parts) > 2 else 0
                        text, markup = render_clan_members(clan_id, page)
                        if msg_id:
                            edit_message_text(token, chat_id, msg_id, text, reply_markup=markup)
                        else:
                            send_message(token, chat_id, text, reply_markup=markup)
                        continue

                    if data.startswith("p_"):
                        send_answer_callback(token, cq_id)
                        parts = data.split("_", 3)
                        obs_id = parts[1]
                        clan_id = parts[2]
                        page = int(parts[3]) if len(parts) > 3 else 0
                        text, markup = render_player_detail(obs_id, clan_id, page)
                        if msg_id:
                            edit_message_text(token, chat_id, msg_id, text, reply_markup=markup)
                        else:
                            send_message(token, chat_id, text, reply_markup=markup)
                        continue

                    if data.startswith("approve_"):
                        if from_id != ADMIN_ID:
                            send_answer_callback(token, cq_id, "⛔ فقط مدیریت مجاز است.")
                            continue
                        target_uid = int(data.split("_")[1])
                        update_user_status(target_uid, "approved")
                        send_answer_callback(token, cq_id, "✅ دسترسی تایید شد.")
                        send_message(token, ADMIN_ID, f"✅ دسترسی کاربر `{target_uid}` تایید گردید.")
                        welcome_user = (
                            "🎉 **تبریک! دسترسی شما توسط مدیریت تایید شد.**\n\n"
                            "اکنون می‌توانید از تمام قابلیت‌های ربات War Drone استفاده نمایید 👇"
                        )
                        send_message(token, target_uid, welcome_user, reply_markup=get_main_keyboard(is_admin=False))
                        continue

                    if data.startswith("block_"):
                        if from_id != ADMIN_ID:
                            send_answer_callback(token, cq_id, "⛔ فقط مدیریت مجاز است.")
                            continue
                        target_uid = int(data.split("_")[1])
                        update_user_status(target_uid, "blocked")
                        send_answer_callback(token, cq_id, "❌ کاربر مسدود شد.")
                        send_message(token, ADMIN_ID, f"❌ کاربر `{target_uid}` رد و مسدود شد.")
                        send_message(token, target_uid, "⛔ درخواست دسترسی شما توسط مدیریت پذیرفته نشد.")
                        continue

                    if data.startswith("appv_pkg_"):
                        if from_id != ADMIN_ID:
                            send_answer_callback(token, cq_id, "⛔ فقط مدیریت مجاز است.")
                            continue
                        pkg_id = data.replace("appv_pkg_", "")
                        send_answer_callback(token, cq_id, "⏳ در حال پردازش اسنپ‌شات...")
                        con = get_db()
                        pkg = con.execute("SELECT * FROM pending_packages WHERE package_id = ?", (pkg_id,)).fetchone()
                        con.close()
                        if not pkg:
                            send_message(token, ADMIN_ID, f"❌ پکیج `{pkg_id}` یافت نشد.")
                            continue

                        send_message(token, ADMIN_ID, f"⚡ در حال پردازش تصاویر پکیج `{pkg['file_name']}` با هوش مصنوعی...")
                        try:
                            res_proc = process_zip_package(pkg["file_path"], pkg["clan_id"])
                            con = get_db()
                            con.execute("UPDATE pending_packages SET status='approved', reviewed_at_utc=datetime('now') WHERE package_id = ?", (pkg_id,))
                            con.commit()
                            con.close()

                            summary = (
                                f"✅ **پکیج `{pkg_id}` با موفقیت پردازش و ثبت شد!**\n"
                                f"• کل تصاویر: `{res_proc['total_images']}`\n"
                                f"• رکوردهای استخراج‌شده: `{res_proc['processed']}`\n"
                                f"• خطاهای تداوم متریک: `{res_proc['violations_count']}`\n"
                                f"• کلن مقصد: `{pkg['clan_id']}`"
                            )
                            send_message(token, ADMIN_ID, summary)
                            if pkg["user_id"] != ADMIN_ID:
                                send_message(token, pkg["user_id"], f"🎉 پکیج ارسالی شما (`{pkg['file_name']}`) توسط مدیریت تایید و ثبت شد!")
                        except Exception as e:
                            send_message(token, ADMIN_ID, f"❌ خطا در پردازش پکیج: {e}")
                        continue

                    if data.startswith("rejt_pkg_"):
                        if from_id != ADMIN_ID:
                            send_answer_callback(token, cq_id, "⛔ فقط مدیریت مجاز است.")
                            continue
                        pkg_id = data.replace("rejt_pkg_", "")
                        con = get_db()
                        pkg = con.execute("SELECT * FROM pending_packages WHERE package_id = ?", (pkg_id,)).fetchone()
                        if pkg:
                            con.execute("UPDATE pending_packages SET status='rejected', reviewed_at_utc=datetime('now') WHERE package_id = ?", (pkg_id,))
                            con.commit()
                            if os.path.exists(pkg["file_path"]):
                                os.remove(pkg["file_path"])
                            con.close()
                            send_answer_callback(token, cq_id, "❌ پکیج رد شد.")
                            send_message(token, ADMIN_ID, f"❌ پکیج `{pkg_id}` حذف گردید.")
                            if pkg["user_id"] != ADMIN_ID:
                                send_message(token, pkg["user_id"], f"⛔ پکیج ارسالی شما (`{pkg['file_name']}`) توسط مدیریت پذیرفته نشد.")
                        else:
                            con.close()
                        continue

                    send_answer_callback(token, cq_id)

                # -------------------------------------------------------------
                # 2. Handle Text Messages
                # -------------------------------------------------------------
                msg = u.get("message")
                if not msg:
                    continue

                from_user = msg.get("from", {})
                user_id = from_user.get("id")
                username = from_user.get("username")
                first_name = from_user.get("first_name")
                chat_id = msg["chat"]["id"]
                text = msg.get("text", "").strip()

                access = check_user_access(user_id, username, first_name)
                is_admin = (user_id == ADMIN_ID or access.get("role") == "admin")

                if access["status"] == "blocked":
                    send_message(token, chat_id, "⛔ دسترسی شما مسدود است. لطفاً با ادمین در ارتباط باشید.")
                    continue

                if access["status"] == "pending":
                    if access.get("is_new") or text.startswith("/start"):
                        send_message(token, chat_id, (
                            "⏳ **درخواست دسترسی شما ثبت شد.**\n\n"
                            "این سامانه جهت امنیت داده‌های کلن‌ها محافظت‌شده است. "
                            "اطلاعات شما جهت احراز هویت برای مدیریت ارسال گردید. "
                            "به محض تایید، منوی سامانه برای شما فعال خواهد شد."
                        ))
                        admin_alert = (
                            "🔔 **درخواست دسترسی جدید به ربات War Drone (UCS)**\n\n"
                            f"👤 **نام:** {first_name or '—'}\n"
                            f"🆔 **شناسه عددی:** `{user_id}`\n"
                            f"🏷 **یوزرنیم:** @{username if username else 'ندارد'}\n\n"
                            "آیا این کاربر مجاز به استفاده است؟"
                        )
                        btn_markup = {
                            "inline_keyboard": [
                                [
                                    {"text": "✅ تایید دسترسی", "callback_data": f"approve_{user_id}"},
                                    {"text": "❌ رد / مسدودسازی", "callback_data": f"block_{user_id}"}
                                ]
                            ]
                        }
                        send_message(token, ADMIN_ID, admin_alert, reply_markup=btn_markup)
                    else:
                        send_message(token, chat_id, "⏳ حساب شما هنوز در صف انتظار تایید مدیریت است.")
                    continue

                # Approved user / Admin handling
                if text == "/start" or text == "❓ راهنمای استفاده":
                    welcome = (
                        "🚁 **سامانه یکپارچه مدیریت کلن‌های War Drone (UCS)**\n\n"
                        "به پنل هوشمند کلن‌ها خوش آمدید! نیازی به تایپ دستورات نیست، "
                        "از دکمه‌های منوی زیر جهت استفاده بهره ببرید:\n\n"
                        "🔍 **استعلام با اسکرین‌شات:** ارسال عکس کارت پروفایل جهت استخراج هوشمند\n"
                        "🔎 **جستجوی متنی بازیکن:** جستجوی فوری نام و نمایش گزینه‌های منطبق\n"
                        "🏰 **لیست کلن‌ها:** مشاهده لیست کلن‌ها و اعضا به صورت شیشه‌ای\n"
                        "🏆 **برترین‌های هر کلن:** مشاهده جدول لیدربردهای کیل و مدال هر کلن\n"
                        "🌐 **داشبورد وب:** مشاهده لیدربورد آنلاین و جدول مقایسه لیگ‌ها"
                    )
                    send_message(token, chat_id, welcome, reply_markup=get_main_keyboard(is_admin))
                    continue

                if text == "🏰 لیست کلن‌ها":
                    t, m = render_clans_list()
                    send_message(token, chat_id, t, reply_markup=m)
                    continue

                if text == "🏆 برترین‌های هر کلن":
                    t, m = render_top_clans_selector()
                    send_message(token, chat_id, t, reply_markup=m)
                    continue

                if text == "🔍 استعلام با اسکرین‌شات":
                    prompt = (
                        "📸 **استعلام بازیکن با هوش مصنوعی:**\n\n"
                        "لطفاً یک اسکرین‌شات از **کارت پروفایل بازیکن** (یا کارت تسک/پروفایل کلن) را در همین چت ارسال نمایید.\n"
                        "هوش مصنوعی بلافاصله لول سلاح‌ها، کیل‌ها و پرونده سوابق او را استخراج خواهد کرد."
                    )
                    send_message(token, chat_id, prompt)
                    continue

                if text == "🔎 جستجوی متنی بازیکن" or text.startswith("/scout"):
                    if text.startswith("/scout ") and len(text.split(maxsplit=1)) > 1:
                        query = text.split(maxsplit=1)[1].strip()
                        # Direct search
                    else:
                        USER_STATES[user_id] = "waiting_search_query"
                        prompt = (
                            "🔎 **جستجوی متنی پرونده بازیکن:**\n\n"
                            "لطفاً نام یا بخشی از نام بازیکن را تایپ و ارسال نمایید:\n"
                            "(مثال: `Dadashi` یا `ehsan` یا `King`)"
                        )
                        send_message(token, chat_id, prompt)
                        continue

                if text == "🌐 لینک داشبورد وب":
                    web_info = (
                        "🌐 **داشبورد مرکزی و لیدربورد آنلاین تحت وب:**\n\n"
                        "برای مشاهده لیدربورد زنده کلن‌ها و آمار لیگ‌ها از لینک زیر استفاده نمایید:"
                    )
                    markup = {
                        "inline_keyboard": [
                            [{"text": "🌐 ورود به سامانه تحت وب", "url": "https://wd.hst-vip.com"}]
                        ]
                    }
                    send_message(token, chat_id, web_info, reply_markup=markup)
                    continue

                if text == "⚙️ پنل ادمین تحت وب" and is_admin:
                    admin_info = (
                        "⚙️ **پنل مدیریت تحت وب War Drone:**\n\n"
                        "از طریق لینک زیر می‌توانید مستقیماً کلن‌ها را ایجاد/ویرایش کنید و وضعیت دسترسی کاربران را مدیریت نمایید:\n\n"
                        "🔑 کلید ادمین: `vandad2026`"
                    )
                    markup = {
                        "inline_keyboard": [
                            [{"text": "🛠 ورود به پنل ادمین", "url": "https://wd.hst-vip.com/admin.html"}]
                        ]
                    }
                    send_message(token, chat_id, admin_info, reply_markup=markup)
                    continue

                if (text == "📊 آمار و وضعیت دیتابیس" or text == "/status") and is_admin:
                    con = get_db()
                    clans_c = con.execute("SELECT count(*) FROM clans").fetchone()[0]
                    snaps_c = con.execute("SELECT count(*) FROM snapshots").fetchone()[0]
                    players_c = con.execute("SELECT count(*) FROM global_players").fetchone()[0]
                    obs_c = con.execute("SELECT count(*) FROM observations").fetchone()[0]
                    con.close()
                    st = (
                        "📊 **آمار محرمانه پایگاه داده War Drone:**\n"
                        f"• کلن‌های فعال: `{clans_c}`\n"
                        f"• اسنپ‌شات‌های ثبت‌شده: `{snaps_c}`\n"
                        f"• بازیکنان دارای شناسه یکتا: `{players_c}`\n"
                        f"• کل رکوردهای مشاهدات: `{obs_c:,}`\n\n"
                        "🌐 سرور: [https://wd.hst-vip.com](https://wd.hst-vip.com)"
                    )
                    send_message(token, chat_id, st)
                    continue

                if text == "👥 مدیریت کاربران ربات" and is_admin:
                    con = get_db()
                    users = con.execute("SELECT user_id, username, first_name, status, role FROM bot_users ORDER BY rowid DESC LIMIT 15").fetchall()
                    con.close()
                    lines = ["👥 **لیست و وضعیت کاربران سامانه:**\n"]
                    for usr in users:
                        st_icon = "✅" if usr["status"] == "approved" else ("⏳" if usr["status"] == "pending" else "❌")
                        role_str = " (مدیر)" if usr["role"] == "admin" else ""
                        uname = f"@{usr['username']}" if usr['username'] else "بدون نام کاربری"
                        lines.append(f"{st_icon} {usr['first_name'] or '—'} ({uname}) - `{usr['user_id']}`{role_str}")
                    send_message(token, chat_id, "\n".join(lines))
                    continue

                # Handle Search Query text input
                if user_id in USER_STATES and USER_STATES[user_id] == "waiting_search_query":
                    del USER_STATES[user_id]
                    player_query = text
                    matches = search_players(player_query, limit=8)

                    if not matches:
                        send_message(token, chat_id, f"⚠️ هیچ بازیکنی با نام «{player_query}» در پایگاه داده یافت نشد.\nمی‌توانید اسکرین‌شات پروفایل او را بفرستید تا بررسی شود.")
                        continue

                    if len(matches) == 1:
                        m = matches[0]
                        send_message(token, chat_id, f"🔍 در حال استخراج پرونده بازیکن `{m['display_name']}`...")
                        career = lookup_player_career(display_name=m["display_name"], global_player_id=m["global_player_id"])
                        rep = format_career_report_persian(career)
                        send_message(token, chat_id, rep)
                        continue

                    # Multiple matches: render interactive selection buttons
                    btn_list = []
                    for m in matches:
                        btn_txt = f"👤 {m['display_name']} ({m['clan_name']}) - {m['total_kills']:,} کیل"
                        btn_list.append([{"text": btn_txt, "callback_data": f"p_{m['observation_id']}_{m['clan_id']}_0"}])

                    msg_text = f"🔎 **{len(matches)} نتیجه برای «{player_query}» یافت شد:**\nجهت مشاهده پرونده، روی گزینه مورد نظر بزنید:"
                    send_message(token, chat_id, msg_text, reply_markup={"inline_keyboard": btn_list})
                    continue

                # Fallback text query
                if text and not text.startswith("/"):
                    matches = search_players(text, limit=6)
                    if matches:
                        if len(matches) == 1:
                            career = lookup_player_career(display_name=matches[0]["display_name"], global_player_id=matches[0]["global_player_id"])
                            rep = format_career_report_persian(career)
                            send_message(token, chat_id, rep)
                        else:
                            btn_list = []
                            for m in matches:
                                btn_txt = f"👤 {m['display_name']} ({m['clan_name']}) - {m['total_kills']:,} کیل"
                                btn_list.append([{"text": btn_txt, "callback_data": f"p_{m['observation_id']}_{m['clan_id']}_0"}])
                            msg_text = f"🔎 **نتایج جستجو برای «{text}»:**"
                            send_message(token, chat_id, msg_text, reply_markup={"inline_keyboard": btn_list})
                        continue
                    else:
                        send_message(token, chat_id, "ℹ️ برای ناوبری سریع از دکمه‌های منوی زیر استفاده کنید یا عکس کارت بازیکن ارسال نمایید.", reply_markup=get_main_keyboard(is_admin))
                        continue

                # -------------------------------------------------------------
                # 3. Handle Photos
                # -------------------------------------------------------------
                if "photo" in msg:
                    photo = msg["photo"][-1]
                    send_message(token, chat_id, "⚡ در حال دریافت تصویر و استخراج مشخصات با هوش مصنوعی...")
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
                        tmp_path = tmp.name
                    try:
                        download_file(token, photo["file_id"], tmp_path)
                        extracted = extract_from_image(tmp_path)
                        continuity = check_monotonic_continuity(extracted)
                        report = format_persian_report(extracted, continuity)

                        name = extracted.get("display_name")
                        if name:
                            career = lookup_player_career(display_name=name)
                            if career.get("found") and career.get("timeline_count", 0) > 1:
                                report += "\n\n" + format_career_report_persian(career)

                        send_message(token, chat_id, report)
                    except Exception as e:
                        send_message(token, chat_id, f"❌ خطا در پردازش تصویر: {e}")
                    finally:
                        if os.path.exists(tmp_path):
                            os.remove(tmp_path)
                    continue

                # -------------------------------------------------------------
                # 4. Handle ZIP Documents
                # -------------------------------------------------------------
                if "document" in msg:
                    doc = msg["document"]
                    fname = doc.get("file_name", "").lower()
                    if fname.endswith(".zip"):
                        pkg_id = f"pkg_{int(time.time())}"
                        dest_file = os.path.join(STAGING_DIR, f"{pkg_id}_{doc.get('file_name', 'archive.zip')}")
                        download_file(token, doc["file_id"], dest_file)

                        caption = msg.get("caption", "").strip() or "CLAN-IRANIAN-ARMY-PU"

                        con = get_db()
                        con.execute("""
                        INSERT INTO pending_packages (package_id, user_id, username, file_path, file_name, clan_id, status, created_at_utc)
                        VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
                        """, (pkg_id, user_id, username or '', dest_file, doc.get("file_name", "archive.zip"), caption))
                        con.commit()
                        con.close()

                        send_message(token, chat_id, (
                            "📦 **پکیج اسنپ‌شات (فایل ZIP) با موفقیت دریافت و در قرنطینه امن ذخیره شد.**\n\n"
                            "جهت حفظ یکپارچگی داده‌ها، درخواست ورود این پکیج برای **مدیریت سامانه** ارسال گردید. "
                            f"به محض تایید، اطلاعات پردازش و ثبت خواهد شد.\n\n"
                            f"🏷 شناسه پیگیری پکیج: `{pkg_id}`"
                        ))

                        size_kb = doc.get("file_size", 0) // 1024
                        admin_text = (
                            "📦 **درخواست ورود پکیج جدید اسنپ‌شات (ZIP):**\n\n"
                            f"👤 **ارسال‌کننده:** {first_name or '—'} (@{username if username else 'ندارد'})\n"
                            f"🆔 **شناسه عددی:** `{user_id}`\n"
                            f"📁 **نام فایل:** `{doc.get('file_name', 'archive.zip')}` ({size_kb} KB)\n"
                            f"🏰 **کلن مقصد پیشنهادی:** `{caption}`\n"
                            f"🏷 **شناسه پکیج:** `{pkg_id}`\n\n"
                            "آیا پردازش هوش مصنوعی و ورود این اسنپ‌شات به دیتابیس را تایید می‌کنید؟"
                        )
                        admin_markup = {
                            "inline_keyboard": [
                                [
                                    {"text": "✅ تایید و ورود به دیتابیس", "callback_data": f"appv_pkg_{pkg_id}"},
                                    {"text": "❌ رد و حذف پکیج", "callback_data": f"rejt_pkg_{pkg_id}"}
                                ]
                            ]
                        }
                        send_message(token, ADMIN_ID, admin_text, reply_markup=admin_markup)
                    else:
                        send_message(token, chat_id, "ℹ️ لطفاً تصویر کارت پروفایل بازیکن (Photo) یا فایل فشرده اسکرین‌شات‌ها (.ZIP) ارسال نمایید.")
                    continue

        except Exception as err:
            print(f"Polling loop error: {err}")
            time.sleep(3)

def main():
    token = load_bot_token()
    if not token:
        print("⚠️ No dedicated Telegram Bot Token provided.")
        sys.exit(1)
    run_polling(token)

if __name__ == "__main__":
    main()
