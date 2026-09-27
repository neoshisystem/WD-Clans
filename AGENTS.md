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