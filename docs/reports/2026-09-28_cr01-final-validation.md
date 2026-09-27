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


## CR-01 FINAL COMPLETION AUDIT — 2026-09-28
Classification: FACT / HANDOFF

Live Product final verification:
- HEAD: `04007090223f9be2d2d82801335cda55eda67664`
- Tree: `7f182a2b7763e5872518d6c1e5c7869cdf5ae7df`
- Canonical SHA: `55e5e59b3f93273b09fc9d99470f6fbf7dd702f7`
- Latest CI Run 159 / `36352526072` / Job `108713808536`: SUCCESS
- Latest Pages Run 35 / `36352526096` / Job `108713820954`: SUCCESS

S13 final state:
- Clan: Persian UNITY
- Source Snapshot label: S13
- Canonical sequence: 1
- Official timestamp: `2026-09-26T19:30:00Z` (4 Mehr 1405, 23:00 Iran)
- Roster: 48/50
- Evidence artifact: `EV-REAL-PERSIAN-UNITY-S13`
- ZIP SHA-256: `7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583`
- Inventory: 56 files = 8 Ranking captures (7 unique + 1 duplicate) + 48 Profile cards
- Inventory hash: `a3ec8927dc6bcf263a36ed57f54dfd21c76e7d8ee1101cd7fd0b067a2b65dea1`

Pipeline classification:
- Raw Artifact: COMPLETE
- Historical RawExtraction checkpoint: PARTIAL / REVIEW_REQUIRED
- Source Adapter outcome: COMPLETE
- Persisted S13 SnapshotInput artifact: PARTIAL (not separately stored)
- Evidence / Provenance: COMPLETE
- Canonical: COMPLETE
- Identity: REVIEW_REQUIRED / 48 UNRESOLVED
- Membership: COMPLETE for first-observed-Snapshot semantics
- Metrics: COMPLETE for Last Online, Total Kills, Current League Clan Medals, Profile Total Clan Medal Count, and lifetime Gold/Silver/Bronze
- Projection / Read Model: COMPLETE
- Static Bundle: COMPLETE
- UI: COMPLETE

Important metric interpretation:
- `last_online_display` is present for all 48; `last_online_utc` remains null because the source provides relative status only.
- `total_kills` is present for all 48.
- Current League Clan Medals and Profile Total Clan Medal Count are present for all 48 and remain separate scopes.
- Lifetime `gold/silver/bronze` medal counts are present for all 48.
- S13 Delta Results = 0 is correct: S13 is the first observed Snapshot for this Clan and has no valid prior baseline; no Delta was fabricated.
- Membership Episodes/Events = 0 is correct for the same reason.

Raw checkpoint note:
`data/real-snapshots/persian-unity/S13.raw.json` is explicitly a historical first-pass checkpoint. Its pending-normalization list still contains Last Online / weapon levels / lifetime medals, but later reviewed values are already complete in Canonical, Projection, Static Data and UI. The raw checkpoint was not rewritten because historical raw evidence must not be silently overwritten.

Reference audit:
S10/S11-era PERSIA reference structures were checked only to confirm field conventions. They were not used as S13 source data and did not authorize a schema change.

Regression:
The previously fixed Render and Horizontal/Wide Scroll issues were not reimplemented. Current overflow containment and UI regression tests remain present. Automated CI passed; direct live-browser screenshot verification was not available through the current connector.

Final outcome: **PASS_WITH_REVIEW_CASES**

Remaining review cases are non-blocking:
1. 48 S13 identities remain UNRESOLVED until valid confirmation evidence/policy permits resolution.
2. The historical first-pass raw checkpoint remains unchanged.
3. No standalone persisted S13 SnapshotInput artifact exists; do not add persistence architecture solely to close this without explicit Authority direction.

Exact successor point:
CR-02 proceeds to **Real Snapshot #2 for Persian UNITY**. Re-check live main, hash/inventory the new ZIP, verify its official Snapshot identifier/sequence from Authority/context, compare with S13, preserve unresolved identity when required, derive membership/deltas only when contracts permit, regenerate static artifacts, validate, and update the next report/handoff. Do not re-ingest or overwrite S13 and do not assume the next identifier is S14.
