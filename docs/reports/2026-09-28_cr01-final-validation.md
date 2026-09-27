# CR-01 Final Validation Report — Persian UNITY S13 / UI + Handoff

Date: 2026-09-28
Successor: CR-02
Repository: neoshisystem/WD-Clans
Purpose: final corrective checkpoint before conversation shift.

## 1. Snapshot state
Clan: Persian UNITY
Snapshot: S13
Official time: 2026-09-26T19:30:00Z (4 Mehr 1405, 23:00 Iran)
Roster: 48/50
Evidence: 56 files = 8 Ranking captures (7 unique + 1 duplicate) + 48 Profile cards
ZIP SHA-256: 7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583
Inventory hash: a3ec8927dc6bcf263a36ed57f54dfd21c76e7d8ee1101cd7fd0b067a2b65dea1
Identity: 48 UNRESOLVED, 0 Global IDs
Membership: 0 Episodes, 0 Events
Deltas: 0

## 2. Root cause found
The real S13 Canonical observations already contained source-native `last_online_display` and lifetime medal counts, but Projection/UI did not expose all of them:
- Projection retained `last_online_utc` but dropped `last_online_display`.
- Viewer displayed `last_online_utc` directly, therefore source values rendered as a dash.
- Graphic cards did not render lifetime gold/silver/bronze counts.
- Search also did not include source-native Last Online.

No new Snapshot data was invented or altered to fix this.

## 3. Corrective implementation
- Preserve `last_online_display` in Canonical -> Projection.
- Viewer uses source-native Last Online when present, falling back to UTC only when needed.
- Player grids/cards expose lifetime medal counts as compact gold/silver/bronze badges.
- Search includes source-native Last Online.
- Existing compact Delta and membership-change sections remain unchanged.
- Horizontal overflow containment remains in place.

## 4. Integrity boundaries
- No Global Player IDs created.
- No identity confirmation.
- No Membership Event inferred from first Snapshot.
- No delta created for S13.
- No PERSIA/GOLDENCROWN mutation.
- Generated static artifacts must be regenerated from Canonical.

## 5. Agent documentation
Updated:
- `AGENTS.md`
- `docs/UCS_AGENT_OPERATIONS.md`
- this report
- successor handoff report

## 6. Next phase
CR-02 receives the next real Persian UNITY Snapshot ZIP.
S13 is the first continuity baseline. The next Snapshot must be processed as a new point in history, not overwritten into S13.

Read before execution:
- `AGENTS.md`
- `docs/UCS_AGENT_OPERATIONS.md`
- this report
- successor shift report

## Final validation evidence
- CI Run 133: https://github.com/neoshisystem/WD-Clans/actions/runs/36349063868 — SUCCESS
- GitHub Pages Run 23: https://github.com/neoshisystem/WD-Clans/actions/runs/36349063883 — SUCCESS
- Intermediate runs 131/132 failed while closing the generated-projection gap; the failure was diagnosed as the source-native Last Online field not surviving the Snapshot projection and deterministic generated artifacts. It was corrected before the final validation above.
- Final verified S13 Read Model sample: `S13::R001.last_online_display = 1m`; `last_online_utc = null`; lifetime medals = gold 2 / silver 4 / bronze 2.

## Classification
FACT: S13 Canonical evidence and normalized values already exist.
FACT: The missing Last Online and medal display was a Projection/UI exposure defect.
PROPOSAL: None.
AUTHORITY DECISION: S13 is the baseline for the next real Snapshot.
OPEN DECISION: Any identity correlation that cannot satisfy existing confirmation policy.
UNKNOWN: Any unobserved or conflicting field in the next ZIP.
