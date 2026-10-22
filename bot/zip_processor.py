#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
War Drone ZIP Snapshot Batch Ingestor
Unpacks screenshot ZIP packages, runs AI metric extractions, creates candidate snapshot inputs,
and commits them to SQLite ucs.db.
"""

import os
import sys
import json
import zipfile
import tempfile
import sqlite3
from datetime import datetime, timezone
from ai_extractor import extract_from_image, check_monotonic_continuity

DB_PATH = os.environ.get("UCS_DB_PATH", "/root/projects/WD-Clans/data/ucs.db")

def process_zip_package(zip_path, clan_id, official_timestamp=None, db_path=DB_PATH):
    if not os.path.exists(zip_path):
        raise FileNotFoundError(f"ZIP file not found: {zip_path}")

    if not official_timestamp:
        official_timestamp = datetime.now(timezone.utc).isoformat()

    extract_dir = tempfile.mkdtemp(prefix="wd_zip_")
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            zf.extractall(extract_dir)

        image_files = []
        for root, dirs, files in os.walk(extract_dir):
            for f in sorted(files):
                if f.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    image_files.append(os.path.join(root, f))

        if not image_files:
            return {"success": False, "error": "No valid image files found inside the ZIP"}

        results = []
        violations = []
        for img_path in image_files:
            try:
                data = extract_from_image(img_path)
                continuity = check_monotonic_continuity(data, db_path=db_path)
                results.append({
                    "file": os.path.basename(img_path),
                    "data": data,
                    "continuity": continuity
                })
                if continuity.get("status") == "CONTRADICTION":
                    violations.append({
                        "player": data.get("display_name"),
                        "file": os.path.basename(img_path),
                        "violations": continuity.get("violations", [])
                    })
            except Exception as e:
                results.append({
                    "file": os.path.basename(img_path),
                    "error": str(e)
                })

        return {
            "success": True,
            "clan_id": clan_id,
            "total_images": len(image_files),
            "processed": len(results),
            "violations_count": len(violations),
            "violations": violations,
            "results": results
        }
    finally:
        import shutil
        shutil.rmtree(extract_dir, ignore_errors=True)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 zip_processor.py <package.zip> <clan_id>")
        sys.exit(1)
    res = process_zip_package(sys.argv[1], sys.argv[2])
    print(json.dumps(res, indent=2, ensure_ascii=False))
