# UCS Agent Entry Point

Read docs/UCS_AGENT_OPERATIONS.md before any real-data mutation.

Critical operating rules:
- Live main is current truth; re-check HEAD immediately before mutation.
- data/canonical.json is the source of truth. site/data static files are generated projections.
- Preserve evidence, uncertainty, and history. Missing is not zero.
- Never create a Global Player ID from a name, rank, avatar, metric, or one fingerprint signal.
- ZIP intake is: SHA-256 -> deterministic inventory -> Ranking/Profile classification -> visual extraction -> same-Snapshot correlation -> validation -> Canonical -> projection -> UI validation -> report.
- Official Snapshot time comes from Project Authority/user input, not filenames or ingestion time.
- Real Clan histories remain isolated.
- For a first observed Snapshot, do not infer JOIN/LEAVE/TRANSFER.
- Do not hand-edit generated static artifacts without matching Canonical regeneration.
