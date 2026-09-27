# CR-01 Corrective UX/UI Gap Closure — 2026-09-28

## Classification
**PASS_WITH_REVIEW_CASES**

## Scope
Corrective continuation of the previous CR-01 Final UX/UI / Grid Hardening. The previous implementation is the baseline. No restart, wholesale replacement, Grid rebuild or S13 re-ingestion was performed.

## Read-only reconciliation
- Previous UX/UI report: `docs/reports/2026-09-28_cr01-final-ux-ui-grid-hardening.md`.
- Previous functional UX/UI checkpoints: `fdb678d753b5d9db825cf3b10f0df7f952bfc4f3` and CSS hardening `942e774e2c1af018c8892fc0cae05969ad071e5a`.
- Product main before this correction: `c18d3a2c72e56bef99cb5ee5f731055338ca95c4`.
- Memory-ai main before this correction: `cfd41f8f4c719a8ca0cf7093906d1e17cfc2d514`.
- S13 already existed in Canonical/Projection/Static/UI and was not re-ingested or overwritten.
- Direct live-browser screenshot verification remains unavailable through the current connector environment.

## Audit classification

### FACT — already completed and preserved
- Global/Admin remains the only Clan-switching UI.
- Dedicated Clan routes are direct-to-Leaderboard and Clan-scoped.
- PERSIA-grade Grid interaction hardening remains in place.
- Player Snapshot History contains Clan Name and the richer supported metrics.
- Membership change entries preserve Clan context and use safe Player/Observation routes.
- Player Profile already consumes valid existing Delta Results without inventing data.
- Persian UNITY S13 remains 48/50, 48 UNRESOLVED, 0 Global IDs, 0 Membership Episodes/Events and 0 Delta Results.

### CONFIRMED remaining gaps
1. Clan identity was too visually weak because it was represented primarily as a small context badge.
2. User-facing Snapshot timestamp surfaces still exposed raw UTC/ISO/Gregorian strings.
3. Leaderboard/Archive did not clearly distinguish current Snapshot Delta from cumulative historical performance.
4. Player Profile Snapshot History had no localized Snapshot-time column; Membership start time was also raw UTC.

## Corrective implementation
- Added one reusable `formatSnapshotDateTime()` using the authoritative stored UTC timestamp, Persian calendar and `Asia/Tehran`. Target presentation: `۴ مهر ۱۴۰۵، ساعت ۲۳:۰۰`.
- Corrected the existing common Clan-context pattern so the Clan name is visually dominant on scoped pages without introducing per-page one-off headers.
- Replaced user-facing Snapshot time presentation in the common header, Global/Admin latest-Snapshot card, Leaderboard Snapshot selector, Archive, Player Profile Membership start and Player Snapshot History with the common formatter.
- Extended the existing compact performance section and Archive aggregate to distinguish current Snapshot Delta from cumulative historical valid Delta, with the number/basis of valid Delta records.
- Preserved non-fabricating behavior: unavailable/baseline values remain unavailable; no Delta is manufactured for a first-observed Snapshot.

## Architecture boundary
Only the existing `Canonical → Projection/Read Model → Static Data → UI` path is used. No Canonical schema, Identity, Membership, Evidence, ingestion, Snapshot identity, GAME_RULES or PERSIA/GOLDENCROWN semantics were changed.

## Regression coverage
Added automated checks for:
- exact Persian-calendar/Iran-local presentation of the S13 authoritative timestamp;
- prevention of direct user-facing raw Snapshot UTC rendering in the audited paths;
- reusable prominent Clan identity;
- explicit current-vs-cumulative performance distinction;
- Player Snapshot History Clan Name + localized Snapshot time.

## S13 safety
- S13 was not re-ingested.
- S13 Canonical data was not overwritten.
- No synthetic prior Snapshot was introduced.
- No next Snapshot number was assumed.

## Final Review Gate
**PASS_WITH_REVIEW_CASES**

Non-blocking review case: direct visual live-browser screenshot verification is unavailable through the current connector environment. CI and GitHub Pages deployment are the available automated live-state checks.

## Exact Next Action
**CR-02 — Real Snapshot #2 for Persian UNITY.**

Re-check live Product + Memory heads; receive the next real Persian UNITY Snapshot ZIP; hash and inventory it; confirm the actual Snapshot identifier/sequence from Authority/context; compare against S13; preserve unresolved identity unless confirmation prerequisites are satisfied; derive only contract-supported Membership/Delta results; regenerate Static Data; validate; run CI/Pages; report and update handoff.

**Do not re-ingest or overwrite S13. Do not assume S14.**
