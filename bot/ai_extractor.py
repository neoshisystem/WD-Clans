#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
War Drone AI Extraction Bot & Profile Tracker
Unified Clan System (UCS) / WD-Clans Automation Module

Extracts player profile metrics from War Drone screenshots using Google Gemini Vision,
applies monotonic continuity checks against SQLite ucs.db, and emits validated UCS records.
"""

import os
import sys
import json
import base64
import sqlite3
import argparse
import urllib.request
import urllib.error
from datetime import datetime, timezone

DB_PATH = os.environ.get("UCS_DB_PATH", "/root/projects/WD-Clans/data/ucs.db")
ENV_PATH = "/root/.hermes/.env"

def get_gemini_api_key():
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH) as f:
            for line in f:
                line = line.strip()
                if line.startswith("GEMINI_API_KEY=") or line.startswith("GOOGLE_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return None

EXTRACTION_PROMPT = """You are an expert OCR and data extraction system for the mobile combat drone game 'War Drone' (پهپاد جنگی).
Analyze this War Drone screenshot and extract all metrics into a strict JSON object with these exact keys:

{
  "type": "profile_card" | "clan_roster" | "unknown",
  "display_name": "string (player nickname or null)",
  "clan_name": "string (clan name or null)",
  "stage": integer (player level or stage, e.g. 68),
  "total_kills": integer (lifetime enemy kills, e.g. 14250),
  "weapons": {
    "25mm": integer or null (cannon level),
    "hydra": integer or null (hydra rocket level),
    "hellfire": integer or null (hellfire missile level)
  },
  "medals": {
    "gold": integer or null (lifetime gold honor medals),
    "silver": integer or null (lifetime silver honor medals),
    "bronze": integer or null (lifetime bronze honor medals)
  },
  "clan_medals": {
    "current_league": integer or null (current weekly league clan medals),
    "total_profile": integer or null (lifetime clan medals on profile)
  },
  "last_online": "string or null",
  "rank": integer or null (if shown on clan ranking)
}

RULES:
1. Return ONLY the JSON object, with no markdown code blocks, no explanation.
2. If a number has commas (e.g. 14,250), parse it as a pure integer (14250).
3. If a value is obscured or not present, use null.
4. Do not invent or estimate values.
"""

def extract_from_image(image_path, api_key=None):
    if not api_key:
        api_key = get_gemini_api_key()
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment or ~/.hermes/.env")

    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    # Read and encode image
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    b64_data = base64.b64encode(img_bytes).decode("utf-8")

    # Determine mime type
    ext = os.path.splitext(image_path)[1].lower()
    mime_type = "image/jpeg"
    if ext == ".png":
        mime_type = "image/png"
    elif ext == ".webp":
        mime_type = "image/webp"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": EXTRACTION_PROMPT},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": b64_data
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "responseMimeType": "application/json"
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            candidates = res_data.get("candidates", [])
            if not candidates:
                raise ValueError("No response candidates from Gemini API")
            text = candidates[0]["content"]["parts"][0]["text"].strip()
            # Clean possible markdown wrap
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            return json.loads(text.strip())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        raise RuntimeError(f"Gemini API Error (HTTP {e.code}): {err_body}")

def check_monotonic_continuity(extracted_data, db_path=DB_PATH):
    """
    Checks monotonic continuity against historical observations in SQLite ucs.db:
    total_kills, stage, and weapon levels must be monotonically non-decreasing.
    """
    display_name = extracted_data.get("display_name")
    if not display_name or not os.path.exists(db_path):
        return {"status": "NEW_UNLINKED", "history": None, "violations": []}

    con = sqlite3.connect(db_path)
    cur = con.cursor()

    cur.execute("""
        SELECT observation_id, snapshot_id, clan_id, rank, stage, total_kills,
               weapons, lifetime_medals, current_league_clan_medals, global_player_id
        FROM observations
        WHERE display_name = ?
        ORDER BY rowid DESC LIMIT 1
    """, (display_name,))

    row = cur.fetchone()
    con.close()

    if not row:
        return {"status": "NEW_PLAYER", "history": None, "violations": []}

    obs_id, snap_id, clan_id, rank, prev_stage, prev_kills, prev_wep_json, prev_med_json, prev_cmed, gpid = row
    prev_wep = json.loads(prev_wep_json or "{}")

    violations = []
    # Check total kills
    new_kills = extracted_data.get("total_kills")
    if prev_kills is not None and new_kills is not None and new_kills < prev_kills:
        violations.append(f"Total kills decreased: {prev_kills:,} -> {new_kills:,} (-{prev_kills - new_kills:,})")

    # Check stage
    new_stage = extracted_data.get("stage")
    if prev_stage is not None and new_stage is not None and new_stage < prev_stage:
        violations.append(f"Stage decreased: {prev_stage} -> {new_stage}")

    # Check weapons
    new_wep = extracted_data.get("weapons") or {}
    for w in ["25mm", "hydra", "hellfire"]:
        pw = prev_wep.get(w)
        nw = new_wep.get(w)
        if pw is not None and nw is not None and nw < pw:
            violations.append(f"Weapon {w} level decreased: {pw} -> {nw}")

    status = "CONTRADICTION" if violations else "CONFIRMED"
    return {
        "status": status,
        "global_player_id": gpid,
        "previous_snapshot": snap_id,
        "previous_clan": clan_id,
        "previous": {
            "stage": prev_stage,
            "total_kills": prev_kills,
            "weapons": prev_wep
        },
        "violations": violations
    }

def format_persian_report(extracted, continuity):
    lines = []
    lines.append("🎮 **گزارش استخراج هوشمند پروفایل War Drone**")
    lines.append("──────────────────────────────")
    lines.append(f"👤 **نام بازیکن:** `{extracted.get('display_name') or 'نامشخص'}`")
    if extracted.get('clan_name'):
        lines.append(f"🛡 **کلن:** `{extracted['clan_name']}`")
    if continuity.get("global_player_id"):
        lines.append(f"🆔 **شناسه گلوبال:** `{continuity['global_player_id']}`")

    status = continuity.get("status")
    if status == "CONFIRMED":
        lines.append("✅ **وضعیت تداوم هویت:** تاییدشده (یکپارچه با تاریخچه)")
    elif status == "CONTRADICTION":
        lines.append("⚠️ **هشدار تناقض متریک‌ها (اثرانگشت یکنوایی):**")
        for v in continuity.get("violations", []):
            lines.append(f"   • {v}")
    elif status == "NEW_PLAYER":
        lines.append("🆕 **وضعیت هویت:** بازیکن جدید (بدون سابقه قبلی)")

    lines.append("")
    lines.append("📊 **آمار استخراج‌شده:**")
    stage = extracted.get('stage')
    prev = (continuity.get("previous") or {})
    d_stage = f" (+{stage - prev['stage']})" if prev.get('stage') and stage and stage > prev['stage'] else ""
    lines.append(f"• **مرحله / لول:** `{stage}`{d_stage}")

    kills = extracted.get('total_kills')
    if kills is not None:
        d_kills = f" (+{kills - prev['total_kills']:,})" if prev.get('total_kills') and kills > prev['total_kills'] else ""
        lines.append(f"• **کل کیل‌ها:** `{kills:,}`{d_kills}")

    wep = extracted.get('weapons') or {}
    lines.append(f"• **سلاح‌ها:** 25mm: `{wep.get('25mm') or '—'}` | Hydra: `{wep.get('hydra') or '—'}` | Hellfire: `{wep.get('hellfire') or '—'}`")

    medals = extracted.get('medals') or {}
    lines.append(f"• **مدال‌های افتخار:** 🥇 `{medals.get('gold') or 0}` | 🥈 `{medals.get('silver') or 0}` | 🥉 `{medals.get('bronze') or 0}`")

    cmed = extracted.get('clan_medals') or {}
    if cmed.get('current_league') is not None or cmed.get('total_profile') is not None:
        lines.append(f"• **مدال کلن:** لیگ جاری: `{cmed.get('current_league') or 0}` | مجموع پروفایل: `{cmed.get('total_profile') or 0}`")

    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser(description="War Drone AI Profile Extractor")
    parser.add_argument("image", help="Path to profile card screenshot")
    parser.add_argument("--json", action="store_true", help="Output raw JSON")
    args = parser.parse_args()

    try:
        data = extract_from_image(args.image)
        continuity = check_monotonic_continuity(data)
        if args.json:
            print(json.dumps({"extracted": data, "continuity": continuity}, indent=2, ensure_ascii=False))
        else:
            print(format_persian_report(data, continuity))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
