# UCS Agent Operations — Schema, File Map, Snapshot Intake, and User Interaction

## Mandatory Snapshot Contract

For every real Snapshot, read `docs/SNAPSHOT_IMPORT.md` first. It is the single high-level contract for hard monotonic continuity, raw archival, scope separation, and Delta safety.

A decrease in Stage, any Weapon level, Total Kills, or lifetime Bronze/Silver/Gold means the observations are **not the same Player** and must not be paired. Every Agent-produced Raw Extraction must be archived unchanged at `Snapshot/<Clan Display Name>/<Snapshot ID>.raw.json`; same Snapshot ID with different content is a fail-closed conflict.

## Authority
Live main is current project truth. Canonical Data is the source of truth. Read Model and static site data are derived.
Do not introduce backend, database, OCR, or production ingestion architecture into a bounded Snapshot task.

## Canonical schema v0.1
clans: independent Clan contexts.
leagues: global War Drone league periods.
clan_leagues: Clan participation in a League.
snapshots: point-in-time Clan records; unique per Clan by sequence and official timestamp.
observations: one member observation in one Snapshot; source_member_key is Snapshot-local.
global_player_identities: proven Global Player identities.
membership_episodes: continuous membership periods requiring confirmed Global identity.
membership_events: JOIN, LEAVE, RETURN, TRANSFER, UNKNOWN_CHANGE, NOT_OBSERVED.
evidence_artifacts: immutable source evidence with hash and location.
resolution_cases: identity review audit trail; UNRESOLVED is valid.
delta_results: materialized changes requiring valid identity/baseline for supported deltas.

Locked semantics:
- Missing evidence is not zero.
- Display name/rank/stage/weapons/medals/kills do not prove Global identity.
- Non-confirmed observations do not carry Global Player ID or Membership Episode.
- First Snapshot has no previous baseline for membership or delta inference.
- Negative lifetime deltas are anomalies, not silently corrected.

## File map
data/canonical.json — Canonical source of truth.
src/canonical.js — Canonical invariants and reference validation.
src/league.js — League boundary and Snapshot binding.
src/identity.js — Fingerprint comparison and explicit identity decisions.
src/membership.js — Membership classification and resolution.
src/metrics.js — Delta and anomaly rules.
src/persistence.js — Atomic persistence and transaction outcomes.
src/source-adapter.js — Source/SnapshotInput boundary.
src/evidence-registry.js — Evidence/provenance registry.
src/projection.js — Canonical to Read Model.
src/static-data.js — Static bundle serialization.
src/pipeline.js — Pipeline orchestration.
src/validate-snapshot.js — SnapshotInput validation.
src/validate-canonical.js — Canonical validation.
scripts/generate-static-vertical-slice.js — Static data generator.
site/index.html — Global/Admin Dashboard and only Clan-switching UI.
site/clan.html — Dedicated single-Clan Leaderboard entrypoint.
site/archive.html — Dedicated single-Clan Snapshot archive.
site/players.html — Dedicated single-Clan player directory.
site/player.html — Dedicated single-Clan player profile.
site/member-history.html — Dedicated single-Clan membership view.
site/app.js — Browser consumer of static Read Model only.
site/styles.css — Shared viewer styling and responsive rules.
site/data/ucs-vertical-slice.json/js — Generated static artifacts.
test/* — automated foundation, ingestion, projection, and UI tests.

## Standard ZIP Snapshot intake
1. Receive Clan name, official date/time, and ZIP. Do not ask again for supplied values.
2. Calculate ZIP SHA-256.
3. Build deterministic inventory: sorted relative paths; inventory hash is SHA-256 of UTF-8 newline-joined sorted paths.
4. Classify Ranking vs Profile evidence. Ranking roster count is authoritative; Ranking-only members are valid.
5. Record duplicate screenshots as evidence but do not create duplicate observations.
6. Visually extract Ranking: rank, display_name, role, stage, current_league_clan_medals.
7. Visually extract Profile: total_kills, profile_total_clan_medal_count, lifetime_medals, weapon levels, source-native Last Online.
8. Relative Last Online stays source-native text; last_online_utc stays null unless exact UTC is known.
9. Same-Snapshot Ranking/Profile correlation is field assembly, not identity confirmation.
10. Default new real observations to UNRESOLVED. No Global Player ID from name/rank/one fingerprint.
11. For first Snapshot, do not infer membership events.
12. Keep lifetime Total Kills, current-league Clan Medals, and Membership Episode contribution distinct.
13. Append evidence-backed records to Canonical; never overwrite prior history.
14. Generate static artifacts from Canonical and require generated diff to be clean.
15. Report evidence, coverage, identity, membership, metrics, persistence, projection, UI, tests, CI, commit, blockers, and next action.

## Multi-Clan identity safety gate — mandatory
Before treating an observed player as a genuinely new Global Player, search the complete existing Global Player set across all known Clans. Compare the six hard lifetime continuity signals (Stage, 25mm, Hydra, Hellfire, Total Kills, lifetime Bronze/Silver/Gold), then inspect name/Emoji/punctuation variants, aliases, Role, temporal continuity and Membership history. A presentation-only name change or Emoji change must never create a new Global Player. If no supported existing identity is found, keep the observation UNRESOLVED / NEW_IDENTITY_PENDING_AUTHORITY rather than fabricating an ID.
## User interaction
The normal user contract is Clan + official date/time + ZIP. The agent reports uncertainty instead of guessing, works only inside the approved scope, and finishes with a report and handoff update.

## UI architecture
Global/Admin can switch Clans from index.html.
Dedicated Clan URL is clan.html?clan=CLAN-ID and opens that Clan's latest Leaderboard directly.
Dedicated Clan pages have no Clan selector and no cross-Clan navigation.

## S13 checkpoint
Persian UNITY, source label S13, official 2026-09-26T19:30:00Z, Canonical sequence 1, 48/50, 8 Ranking captures (7 unique + 1 duplicate), 48 Profile cards, 48 UNRESOLVED observations, 0 Global IDs, 0 Membership Episodes/Events, 0 deltas.
ZIP SHA-256: 7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583
Inventory hash: a3ec8927dc6bcf263a36ed57f54dfd21c76e7d8ee1101cd7fd0b067a2b65dea1
Raw checkpoint remains at data/real-snapshots/persian-unity/S13.raw.json and is historical first-pass evidence, not Canonical authority.

Next Snapshot must be processed against S13 without silently confirming identities.


## CR-01 final UI/data checkpoint — 2026-09-28
Current handoff target: **CR-02**.
Current Product main before this corrective commit: `211a1570f1b5a00e4f8a946a15f5b94506d93813`.

Persian UNITY S13 remains:
- official timestamp: 2026-09-26T19:30:00Z (4 Mehr 1405, 23:00 Iran)
- 48/50 roster
- 56 evidence files = 8 Ranking captures (7 unique + 1 duplicate) + 48 Profile cards
- 48 UNRESOLVED observations
- 0 Global IDs / 0 Membership Episodes / 0 Membership Events / 0 deltas

UI correction required by this checkpoint:
- source-native `last_online_display` must survive Canonical -> Projection -> Static Read Model and be used by the viewer; `last_online_utc` remains null unless exact UTC is known.
- lifetime medal counts `gold/silver/bronze` are evidence-backed observation fields and must be visible in the viewer's player grid/cards.
- Global/Admin `index.html` remains the only cross-Clan switcher.
- Dedicated Clan URLs remain single-Clan and direct-to-Leaderboard.
- Generated static artifacts are never hand-edited; regenerate from Canonical.

When a new real ZIP is supplied:
1. Read this file and the current shift report.
2. Re-check live main.
3. Hash and inventory the ZIP.
4. Use Project Authority's supplied Clan/date/time as official metadata.
5. Treat S13 as continuity baseline but do not auto-confirm identities.
6. Preserve unresolved cases and only create membership/delta results when their prerequisites are met.
7. Regenerate static data, validate, test, deploy, report, then update the shift report.

## Mandatory continuity documents

Before a real Snapshot task, also read:
- `docs/UCS_SCHEMA_FILE_MAP_V0_1.md`
- `docs/UCS_REAL_SNAPSHOT_INGESTION_STANDARD_V0_1.md`

These are the permanent agent-facing references for schema ownership, file responsibilities, ZIP intake order, source-native Last Online, identity/membership boundaries, and reporting.

## CR-01 FINAL COMPLETION AUDIT — 2026-09-28
Classification: FACT / HANDOFF

Live Product:
- Branch: main
- HEAD: `04007090223f9be2d2d82801335cda55eda67664`
- Tree: `7f182a2b7763e5872518d6c1e5c7869cdf5ae7df`
- Canonical SHA: `55e5e59b3f93273b09fc9d99470f6fbf7dd702f7`

Persian UNITY / S13:
- Official: `2026-09-26T19:30:00Z`
- 48/50
- 56 evidence files
- ZIP SHA-256: `7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583`
- Inventory hash: `a3ec8927dc6bcf263a36ed57f54dfd21c76e7d8ee1101cd7fd0b067a2b65dea1`
- 48 observations / 48 UNRESOLVED / 0 Global IDs
- 48 Resolution Cases / 0 Membership Episodes / 0 Membership Events / 0 S13 Delta Results

Verified fields:
- Last Online is source-native `last_online_display`; `last_online_utc` remains null unless exact UTC is known.
- Total Kills is present for all 48.
- Current League Clan Medals and Profile Total Clan Medal Count are both present for all 48 and remain separate scopes.
- Lifetime Gold/Silver/Bronze are present for all 48.

Review cases:
- `data/real-snapshots/persian-unity/S13.raw.json` remains a historical first-pass checkpoint with a historical pending-normalization list; do not rewrite it merely to match later reviewed Canonical data.
- No separate persisted S13 SnapshotInput artifact is stored. This is a traceability/replay limitation, not evidence of product-data loss.
- Identity remains unresolved by current policy.

Latest validation:
- CI Run 159 / `36352526072` / Job `108713808536`: SUCCESS.
- Pages Run 35 / `36352526096` / Job `108713820954`: SUCCESS.

Successor:
**CR-02 — Real Snapshot #2 for Persian UNITY.**
Re-check live main before mutation, then treat S13 as the continuity baseline. Do not assume the next Snapshot identifier is S14, do not re-ingest S13, and do not alter identity/schema rules without explicit Authority direction.


## CR-01 FINAL UX/UI / GRID HARDENING — 2026-09-28
- PERSIA Grid was audited directly for table wrapper, sticky headers, sort controls, responsive behavior and scroll preservation.
- UCS Leaderboard now exposes the full supported observation surface plus supported per-Snapshot deltas without importing PERSIA data architecture.
- Player Snapshot History explicitly exposes Clan Name and richer observed metrics.
- Membership change display uses safe Clan-preserving identity/observation routes.
- Scoped pages visibly identify active Clan; Global/Admin remains the only Clan switcher.
- Search/sort/mode rerender preserves table and browser viewing position.
- S13 was audited only; no re-ingestion/overwrite occurred.
- S13 required fields are already complete through Canonical -> Projection -> Static -> UI; no data-layer change was necessary.
- Detailed report: docs/reports/2026-09-28_cr01-final-ux-ui-grid-hardening.md


## S14 checkpoint — 2026-09-28
Persian UNITY S14 is now the latest real Snapshot:
- Official: 2026-09-27T19:30:00Z (5 Mehr 1405, 23:00 Iran)
- Canonical sequence: 2
- Roster: 50/50
- Evidence artifact: EV-REAL-PERSIAN-UNITY-S14
- ZIP SHA-256: 9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d
- Inventory: 58 files = 8 Ranking captures + 50 Profile cards; 0 duplicate Ranking captures
- Inventory hash: cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be
- 50 observations, all UNRESOLVED
- 50 Resolution Cases
- 0 Global IDs
- 0 Membership Episodes / Events
- 0 S14 delta_results
- Raw checkpoint: data/real-snapshots/persian-unity/S14.raw.json
- Report: reports/2026-09-28_real-s14-ingestion.md

S14 source fields include Last Online, lifetime Gold/Silver/Bronze, Total Kills, Profile Total Clan Medals and weapon levels. Do not infer identity, JOIN/LEAVE, or Delta merely from continuity with S13.


## FINAL S14 DEPLOYMENT CHECKPOINT — 2026-09-28
- Product HEAD: `96809119417aaf0527d4de6ab87524759a93ebef`
- Persian UNITY S14: 50/50, 50 UNRESOLVED, 50 Resolution Cases, 0 Global IDs, 0 Membership Episodes/Events, 0 Delta Results.
- Product CI Run `36415948600`: SUCCESS.
- Pages Run `36415948559`: SUCCESS.
- S14 report: `reports/2026-09-28_real-s14-ingestion.md`.
- S14 raw checkpoint: `data/real-snapshots/persian-unity/S14.raw.json`.
- Next real Snapshot must be new; do not re-ingest S13/S14 or silently resolve identity.

## S14 continuity and automatic Snapshot Delta operations — 2026-09-28

For second-or-later real Snapshots, compare only the adjacent previous Snapshot of the same Clan.

Derived Read Model properties:
- snapshot_delta_results: per-observation Total Kills and Current League Clan Medal deltas.
- snapshot_membership_changes: observed additions and departures between adjacent Snapshots.

These are derived observations, not Global identity confirmation. Do not create Global IDs, Membership Episodes, or canonical Membership Events from these results.

S14 verified: 46 matched; 4 additions; 2 departures; 92 deltas. The two حسن records are separated by fingerprint continuity: S13 Stage 48 → S14 Stage 48 matches; S14 Stage 10 is separate.

The UI and Archive consume these derived properties. Generated static artifacts must still be regenerated from Canonical.

## Documentation checkpoint — v0.1

Documentation continuity is governed by `docs/UCS_DOCUMENTATION_CONTROL_V0_1.md` (Product) and `projects/UCS/DOCUMENTATION_CONTROL.md` (Memory-ai).

Required behavior:
1. Read the control contract before any material task.
2. Use its task matrix to determine mandatory/conditional document reads and updates.
3. Treat `CURRENT_STATE.md`, `NEXT_ACTION.md`, `SHIFT_REPORT.md` and `CHECKPOINT.md` as status-bearing continuity surfaces; do not treat historical reports/handoffs as mutable Current.
4. A checkpoint is SEALED only after product Reality Check, task/report evidence, applicable documentation reconciliation, Product-local documentation validation, and the Memory-ai cross-repository synchronization check all pass.
5. Historical reports and point-in-time handoffs remain historical records and are not rewritten simply because newer state exists.
6. If documentation is ahead/behind or cannot be proven synchronized, classify the checkpoint DRIFTED/BLOCKED/UNKNOWN and do not claim SEALED.
7. The next Conversation must start from `projects/UCS/AGENT_START_HERE.md` and then follow the recorded checkpoint/read order rather than relying on hidden chat memory.

## SA03 audit lesson — membership events must not be inferred from Snapshot gaps

For real Snapshot processing, adjacent Snapshot presence/absence is not sufficient evidence of Membership lifecycle.
Do not turn an unmatched previous Observation into LEAVE or an unmatched current Observation into JOIN.
Use explicit Canonical Membership Events / Authority evidence for JOIN, RETURN, LEAVE and TRANSFER.
Use Fingerprint only for identity continuity and review. Hard monotonic contradictions remain blocked.
See Memory-ai report: projects/UCS/conversations/development-reports/2026-10-08_SA03-identity-membership-reconciliation-audit.md
