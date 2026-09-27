# UCS Shift Report — CR-01 -> CR-02

## Handoff
Repository: neoshisystem/WD-Clans
Live main at handoff: `ca97c547c98055e8b9b70cde7591b4513f6952d3` (documentation-only successor checkpoint after functional commit `96ea01e0e6aef4a9b8a18ac4df483b090b647581`). CR-02 must still re-check HEAD before any mutation.
Successor Conversation: **CR-02**
Previous Conversation: **CR-01**
Date: 2026-09-28

## Required reading
1. `AGENTS.md`
2. `docs/UCS_AGENT_OPERATIONS.md`
3. `docs/reports/2026-09-28_cr01-final-validation.md`
4. This file
5. Existing canonical/data-model documents under `docs/`

## Current architecture
- `data/canonical.json`: sole Canonical source of truth.
- `src/projection.js`: Canonical -> deterministic Read Model projection.
- `src/static-data.js`: static bundle serialization.
- `scripts/generate-static-vertical-slice.js`: regenerates `site/data/ucs-vertical-slice.json/js`.
- `site/index.html`: Global/Admin dashboard; ONLY UI that can switch Clan.
- `site/clan.html?clan=CLAN-ID`: dedicated Clan Leaderboard; direct to latest Snapshot.
- `site/archive.html?clan=CLAN-ID`: only that Clan's Snapshot archive.
- `site/players.html?clan=CLAN-ID`: only that Clan's players.
- `site/player.html?...&clan=CLAN-ID`: Clan-scoped profile.
- `site/member-history.html?clan=CLAN-ID`: Clan-scoped membership history.
- `site/app.js`: browser consumes Read Model only; no backend/network reads.
- `site/styles.css`: shared responsive UI, including horizontal overflow containment.

## Standard real ZIP intake
Receive exactly:
- Clan name
- official Snapshot date/time
- ZIP

Then:
SHA-256 -> deterministic inventory -> Ranking/Profile classification -> visual extraction -> same-Snapshot field correlation -> validation -> Canonical -> projection -> static UI -> tests/CI -> report.

Rules:
- Official time comes from Project Authority/user, never ZIP filename.
- Ranking roster count is authoritative.
- Duplicate Ranking screenshots are evidence but do not duplicate observations.
- Ranking-only members remain valid.
- `last_online_display` stays source-native text; `last_online_utc` remains null unless exact UTC is known.
- Lifetime medals = gold/silver/bronze; current league Clan medals and lifetime/profile Clan medal count are separate fields.
- Name/rank/medals/kills/stage/weapons do not prove Global identity.
- First Snapshot has no inferred membership changes.
- Missing != zero.
- Do not create Global IDs or Membership Episodes without existing confirmation prerequisites.
- Do not hand-edit generated static artifacts.

## Current real data
Persian UNITY / S13:
- Official: 2026-09-26T19:30:00Z (4 Mehr 1405, 23:00 Iran)
- 48/50
- 56 evidence files
- ZIP SHA-256: 7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583
- Inventory hash: a3ec8927dc6bcf263a36ed57f54dfd21c76e7d8ee1101cd7fd0b067a2b65dea1
- 48 observations, all UNRESOLVED
- 0 Global IDs
- 0 Membership Episodes/Events
- 0 deltas
- Raw checkpoint: `data/real-snapshots/persian-unity/S13.raw.json`

## Completed corrections in this handoff
- Persian UNITY is present in Canonical and generated Read Model.
- Global Dashboard shows Persian UNITY in Clan Directory.
- Dedicated Clan entrypoint is direct-to-Leaderboard and has no cross-Clan selector.
- Horizontal overflow containment is implemented.
- Compact Snapshot Delta and Membership Changes sections exist.
- Source-native Last Online is now preserved through Canonical -> Snapshot Projection -> Static Read Model and displayed.
- Lifetime gold/silver/bronze counts are now exposed in player grids/cards.
- Final generated-static synchronization is deterministic and CI-validated.
- Formal agent operations and snapshot-intake documentation are maintained.

## Next task
**Real Snapshot #2 for Persian UNITY.**
Treat S13 as the continuity baseline. When the ZIP is supplied:
1. Re-check live main.
2. Hash + inventory the new ZIP.
3. Verify official timestamp from the user.
4. Extract Ranking/Profile and correlate only within the same Snapshot.
5. Compare with S13 for continuity.
6. Preserve unresolved identity where confirmation is not allowed.
7. Derive membership/deltas only when their contracts permit.
8. Regenerate static artifacts from Canonical.
9. Run validation + tests + CI + Pages.
10. Add a new development report and update this handoff with the final commit/CI/Pages evidence.

## Final validation evidence
- Final corrective commit: https://github.com/neoshisystem/WD-Clans/commit/96ea01e0e6aef4a9b8a18ac4df483b090b647581
- CI Run 133: https://github.com/neoshisystem/WD-Clans/actions/runs/36349063868 — SUCCESS (functional commit)
- Successor docs CI Run: https://github.com/neoshisystem/WD-Clans/actions/runs/36349133986 — SUCCESS
- Pages Run 23: https://github.com/neoshisystem/WD-Clans/actions/runs/36349063883 — SUCCESS
- Intermediate corrective runs 131/132 failed during diagnosis and generated-artifact synchronization; they are superseded by the final successful commit above.

## Reports
- Final corrective report: `docs/reports/2026-09-28_cr01-final-validation.md`
- Agent operations: `docs/UCS_AGENT_OPERATIONS.md`
- Entry point: `AGENTS.md`
- S13 raw evidence: `data/real-snapshots/persian-unity/S13.raw.json`

## CR-02 warning
Do not assume the next Snapshot is S14 solely because it is the next file received. Confirm the Snapshot identifier/sequence according to the existing canonical/ingestion contract and Authority-provided metadata.
