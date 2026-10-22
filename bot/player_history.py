#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
War Drone Cross-Clan Player History & Career Timeline Resolver
Queries SQLite ucs.db to retrieve full player career, clan transfers, weapon evolution, and kills.
"""

import os
import sys
import json
import sqlite3

DB_PATH = os.environ.get("UCS_DB_PATH", "/root/projects/WD-Clans/data/ucs.db")

def lookup_player_career(display_name=None, global_player_id=None, db_path=DB_PATH):
    if not os.path.exists(db_path):
        return {"error": f"Database not found at {db_path}"}

    con = sqlite3.connect(db_path)
    cur = con.cursor()

    # 1. Resolve identity
    target_gpid = global_player_id
    if not target_gpid and display_name:
        cur.execute("""
            SELECT global_player_id FROM observations 
            WHERE display_name = ? AND global_player_id IS NOT NULL 
            ORDER BY rowid DESC LIMIT 1
        """, (display_name,))
        row = cur.fetchone()
        if row:
            target_gpid = row[0]

    # 2. Query all observations
    if target_gpid:
        cur.execute("""
            SELECT o.observation_id, o.snapshot_id, o.clan_id, c.display_name as clan_name,
                   o.rank, o.display_name, o.stage, o.total_kills, o.weapons,
                   o.lifetime_medals, o.current_league_clan_medals, o.profile_total_clan_medal_count,
                   o.last_online_utc, s.official_timestamp_utc
            FROM observations o
            LEFT JOIN clans c ON o.clan_id = c.clan_id
            LEFT JOIN snapshots s ON o.snapshot_id = s.snapshot_id
            WHERE o.global_player_id = ?
            ORDER BY s.official_timestamp_utc ASC, o.rowid ASC
        """, (target_gpid,))
    elif display_name:
        cur.execute("""
            SELECT o.observation_id, o.snapshot_id, o.clan_id, c.display_name as clan_name,
                   o.rank, o.display_name, o.stage, o.total_kills, o.weapons,
                   o.lifetime_medals, o.current_league_clan_medals, o.profile_total_clan_medal_count,
                   o.last_online_utc, s.official_timestamp_utc
            FROM observations o
            LEFT JOIN clans c ON o.clan_id = c.clan_id
            LEFT JOIN snapshots s ON o.snapshot_id = s.snapshot_id
            WHERE o.display_name = ?
            ORDER BY s.official_timestamp_utc ASC, o.rowid ASC
        """, (display_name,))
    else:
        con.close()
        return {"error": "Must provide display_name or global_player_id"}

    rows = cur.fetchall()

    # 3. Query membership events / episodes
    episodes = []
    events = []
    if target_gpid:
        cur.execute("""
            SELECT me.membership_episode_id, me.clan_id, c.display_name as clan_name,
                   me.sequence, me.started_from_snapshot_id, me.ended_at_utc, me.status
            FROM membership_episodes me
            LEFT JOIN clans c ON me.clan_id = c.clan_id
            WHERE me.global_player_id = ?
            ORDER BY me.sequence ASC
        """, (target_gpid,))
        for r in cur.fetchall():
            episodes.append({
                "episode_id": r[0],
                "clan_id": r[1],
                "clan_name": r[2] or r[1],
                "sequence": r[3],
                "started_snapshot": r[4],
                "ended_at": r[5],
                "status": r[6]
            })

        cur.execute("""
            SELECT membership_event_id, event_type, clan_id, effective_at_utc,
                   observed_snapshot_id, from_clan_id, to_clan_id
            FROM membership_events
            WHERE global_player_id = ?
            ORDER BY effective_at_utc ASC
        """, (target_gpid,))
        for r in cur.fetchall():
            events.append({
                "event_id": r[0],
                "type": r[1],
                "clan_id": r[2],
                "effective_at": r[3],
                "observed_snapshot": r[4],
                "from_clan": r[5],
                "to_clan": r[6]
            })

    con.close()

    if not rows:
        return {
            "found": False,
            "display_name": display_name,
            "global_player_id": target_gpid,
            "message": "بازیکن در دیتابیس کلن‌های ما سابقه‌ای ندارد (بازیکن جدید / آزاد)."
        }

    # Format timeline
    timeline = []
    for r in rows:
        wep = json.loads(r[8] or "{}")
        med = json.loads(r[9] or "{}")
        timeline.append({
            "observation_id": r[0],
            "snapshot_id": r[1],
            "clan_id": r[2],
            "clan_name": r[3] or r[2],
            "rank": r[4],
            "name": r[5],
            "stage": r[6],
            "kills": r[7],
            "weapons": wep,
            "medals": med,
            "current_medals": r[10],
            "total_medals": r[11],
            "last_online": r[12],
            "timestamp": r[13]
        })

    first = timeline[0]
    last = timeline[-1]
    clan_list = list(dict.fromkeys([t["clan_name"] for t in timeline]))

    return {
        "found": True,
        "global_player_id": target_gpid,
        "primary_name": last["name"],
        "known_clans": clan_list,
        "first_seen": {"snapshot": first["snapshot_id"], "clan": first["clan_name"], "time": first["timestamp"], "kills": first["kills"], "stage": first["stage"]},
        "last_seen": {"snapshot": last["snapshot_id"], "clan": last["clan_name"], "time": last["timestamp"], "kills": last["kills"], "stage": last["stage"], "weapons": last["weapons"]},
        "delta_career": {
            "kills": (last["kills"] - first["kills"]) if (last["kills"] and first["kills"]) else 0,
            "stage": (last["stage"] - first["stage"]) if (last["stage"] and first["stage"]) else 0
        },
        "episodes": episodes,
        "events": events,
        "timeline_count": len(timeline),
        "timeline": timeline
    }

def format_career_report_persian(data):
    if not data.get("found"):
        return f"🔍 **جستجوی سابقه بازیکن:** `{data.get('display_name')}`\n⚠️ {data.get('message')}"

    lines = []
    lines.append(f"🎖 **پرونده و سابقه بازیکن:** `{data['primary_name']}`")
    lines.append("──────────────────────────────")
    if data.get("global_player_id"):
        lines.append(f"🆔 **شناسه یکتا (Global ID):** `{data['global_player_id']}`")
    lines.append(f"🏰 **کلن‌های ثبت‌شده:** {', '.join(data['known_clans'])}")
    lines.append(f"📅 **تعداد دفعات رصدشده:** {data['timeline_count']} اسنپ‌شات")

    first = data["first_seen"]
    last = data["last_seen"]
    delta = data["delta_career"]

    lines.append("")
    lines.append("📈 **سیر پیشرفت و تغییرات کلی:**")
    lines.append(f"• **نخستین مشاهده:** اسنپ‌شات `{first['snapshot']}` در کلن `{first['clan']}` (مرحله {first['stage']} | کیل: {f"{first['kills']:,}" if first['kills'] else '—'})")
    lines.append(f"• **آخرین وضعیت:** اسنپ‌شات `{last['snapshot']}` در کلن `{last['clan']}` (مرحله {last['stage']} | کیل: {f"{last['kills']:,}" if last['kills'] else '—'})")

    if delta["kills"] > 0 or delta["stage"] > 0:
        lines.append(f"• **رشد کل در طول زمان:** `+{delta['kills']:,} کیل` | `+{delta['stage']} مرحله`")

    wep = last.get("weapons") or {}
    lines.append(f"• **سلاح‌های فعلی:** 25mm: `{wep.get('25mm') or '—'}` | Hydra: `{wep.get('hydra') or '—'}` | Hellfire: `{wep.get('hellfire') or '—'}`")

    if data.get("events"):
        lines.append("")
        lines.append("🔄 **رویدادهای عضویت و انتقالات:**")
        for ev in data["events"]:
            if ev["type"] == "TRANSFER":
                lines.append(f"• 🔁 انتقال از کلن `{ev['from_clan']}` به کلن `{ev['to_clan']}` در اسنپ‌شات `{ev['observed_snapshot']}`")
            elif ev["type"] == "JOIN":
                lines.append(f"• 📥 ورود به کلن `{ev['clan_id']}` در اسنپ‌شات `{ev['observed_snapshot']}`")
            elif ev["type"] == "LEAVE":
                lines.append(f"• 📤 خروج از کلن `{ev['clan_id']}` در اسنپ‌شات `{ev['observed_snapshot']}`")

    return "\n".join(lines)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 player_history.py <player_name_or_gpid>")
        sys.exit(1)
    arg = sys.argv[1]
    res = lookup_player_career(display_name=arg) if not arg.startswith("GP-") else lookup_player_career(global_player_id=arg)
    print(format_career_report_persian(res))

def search_players(query, limit=10, db_path=DB_PATH):
    if not os.path.exists(db_path):
        return []
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    q = f"%{query.strip()}%"
    rows = cur.execute("""
        SELECT o.observation_id, o.display_name, o.rank, o.stage, o.total_kills,
               c.display_name as clan_name, o.clan_id, o.global_player_id
        FROM observations o
        LEFT JOIN clans c ON o.clan_id = c.clan_id
        WHERE o.display_name LIKE ? OR o.global_player_id LIKE ?
        GROUP BY o.global_player_id, o.display_name
        ORDER BY o.total_kills DESC
        LIMIT ?
    """, (q, q, limit)).fetchall()
    con.close()
    results = []
    for r in rows:
        results.append({
            "observation_id": r[0],
            "display_name": r[1],
            "rank": r[2],
            "stage": r[3],
            "total_kills": r[4],
            "clan_name": r[5] or "نامشخص",
            "clan_id": r[6],
            "global_player_id": r[7]
        })
    return results

def get_clan_top_players(clan_id, metric="kills", limit=10, db_path=DB_PATH):
    if not os.path.exists(db_path):
        return []
    con = sqlite3.connect(db_path)
    cur = con.cursor()
    snap = cur.execute("SELECT snapshot_id FROM snapshots WHERE clan_id = ? ORDER BY official_timestamp_utc DESC LIMIT 1", (clan_id,)).fetchone()
    if not snap:
        con.close()
        return []
    order_col = "total_kills" if metric == "kills" else "current_league_clan_medals"
    rows = cur.execute(f"""
        SELECT rank, display_name, stage, total_kills, current_league_clan_medals, observation_id, global_player_id
        FROM observations
        WHERE snapshot_id = ?
        ORDER BY {order_col} DESC
        LIMIT ?
    """, (snap[0], limit)).fetchall()
    con.close()
    results = []
    for r in rows:
        results.append({
            "rank": r[0],
            "display_name": r[1],
            "stage": r[2],
            "total_kills": r[3],
            "current_medals": r[4],
            "observation_id": r[5],
            "global_player_id": r[6],
            "snapshot_id": snap[0]
        })
    return results
