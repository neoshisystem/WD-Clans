# UCS Agent Entry Point

Read docs/UCS_AGENT_OPERATIONS.md before any real-data mutation. For continuity, read docs/UCS_SHIFT_REPORT_CR-01_TO_CR-02_2026-09-28.md before taking over from CR-01.

Critical operating rules:
- Live main is current truth; re-check HEAD immediately before mutation.
- data/canonical.json is the source of truth. site/data static files are generated projections.
- Preserve evidence, uncertainty, and history. Missing is not zero.
- Never create a Global Player ID from a name, rank, avatar, metric, or one fingerprint signal.
- ZIP intake is: SHA-256 -> deterministic inventory -> Ranking/Profile classification -> visual extraction -> same-Snapshot correlation -> validation -> Canonical -> projection -> UI validation -> report. Never treat the ZIP filename or ingestion time as the official Snapshot time.
- Official Snapshot time comes from Project Authority/user input, not filenames or ingestion time.
- Real Clan histories remain isolated.
- For a first observed Snapshot, do not infer JOIN/LEAVE/TRANSFER.
- Do not hand-edit generated static artifacts without matching Canonical regeneration.

- Read docs/UCS_SCHEMA_FILE_MAP_V0_1.md and docs/UCS_REAL_SNAPSHOT_INGESTION_STANDARD_V0_1.md before processing a real Snapshot.
- Preserve source-native Last Online in `last_online_display`; do not replace relative values with invented UTC.
- Lifetime medal counts (gold/silver/bronze) are evidence-backed observation fields and must remain visible in the Read Model/UI when observed.

## CR-01 FINAL UX/UI / GRID HARDENING — 2026-09-28
Classification: FACT / HANDOFF

- Leaderboard Grid now follows the audited mature PERSIA interaction baseline for table containment, sticky headers, sortable header controls, direction indicators, responsive behavior and render-context preservation.
- The Simple Grid exposes the supported UCS observation fields and supported per-Snapshot delta fields.
- Player Snapshot History explicitly shows Clan Name and richer available historical metrics.
- Membership changes are clickable when a valid Global identity or observation route exists; no Global ID is fabricated.
- Scoped pages visibly identify the active Clan through a reusable context badge; Global/Admin remains the only cross-Clan switcher.
- S13 was not re-ingested or overwritten. Canonical and Static already contained Last Online, Kills, Clan Medals, lifetime medals and Weapons.
- No Canonical/Projection schema change was required by this pass.
- Detailed report: docs/reports/2026-09-28_cr01-final-ux-ui-grid-hardening.md
- Product functional commits: c0c0a573299a771cd9b05bdcf95c90aa3127b56c; 942e774e2c1af018c8892fc0cae05969ad071e5a; fdb678d753b5d9db825cf3b10f0df7f952bfc4f3.
- CI Run 36356953627 / Job 108726479423: SUCCESS.
- Pages Run 36356946098: SUCCESS for the latest site-affecting commit in this hardening chain.
- Exact next action: CR-02 receives the next real Persian UNITY Snapshot ZIP; re-check live main, hash/inventory, confirm actual Snapshot identifier/sequence, compare to S13, preserve unresolved identity and derive only contract-supported membership/deltas. Do not re-ingest S13 or assume S14.

## S14 continuity repair — 2026-09-28

Second-or-later Snapshot continuity is derived in Projection/Read Model only.

For adjacent same-Clan Snapshots, the matcher uses exact display name plus Stage/weapon fingerprint scoring. A unique score >= 5 produces continuity; duplicate-name ties remain unmatched.

S14 result: 46 matched, 4 observed additions, 2 observed departures, 92 derived deltas. Valid aggregate deltas: +145,391 Kills and +9,207,907 Current League Clan Medals.

Two حسن records are separated by fingerprint: S13 Stage 48 -> S14 Stage 48 is continuity; S14 Stage 10 is a separate observed addition.

Report: reports/2026-09-28_real-s14-continuity-repair.md
