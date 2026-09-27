# CR-01 Final UX/UI + Grid Hardening Report — 2026-09-28

## Final Classification
**PASS_WITH_REVIEW_CASES**

## Scope
Final UX/UI, Leaderboard Grid, interaction, Player Profile, Archive/Membership presentation, Clan isolation and agent-documentation hardening before CR-02.

## Mandatory read-only audit completed

### UCS live Product audited
- Repository: neoshisystem/WD-Clans
- Branch: main
- Live Product before this hardening: 224ff4e26e35fdba6b137820e56b9b2187ac9b3e
- Canonical source and generated Static Read Model were inspected before mutation.
- S13 was inspected only; it was not re-ingested or overwritten.

### PERSIA reference audited
Relevant current PERSIA implementation:
- clan-leaderboard/assets/viewer.js
- clan-leaderboard/assets/viewer.css
- clan-leaderboard/assets/player-profile.js
- clan-leaderboard/assets/player-directory.js
- clan-leaderboard/assets/viewer-data.js
- clan-leaderboard/archive.html

Key PERSIA Grid behaviors confirmed:
- scroll-contained table wrapper
- sticky table header
- full-width sortable header buttons
- direction indicator on active sort
- minimum table width for the full Grid
- responsive Summary table
- two-column Graphic cards collapsing to one
- search/sort rerender preserves table horizontal scroll
- membership change entries are clickable
- Profile history carries the mature observation field set

PERSIA was used only as a presentation/interaction reference. UCS data, identity, membership and history semantics remain authoritative.

## Issue classification
- Leaderboard Grid: **Grid/interaction behavior + UI-only**
- Player Profile Snapshot History: **presentation/data-consumer**
- Membership Changes: **presentation/navigation**
- Clan Identity on Scoped Pages: **UI-only**
- Horizontal overflow: **UI-only**
- Projection/data gap: **already correct**
- Architecture gap: **none found**

## Implemented Product hardening

### Leaderboard Grid
The Simple Grid now follows the mature PERSIA interaction baseline while remaining UCS-specific:
Rank, Name, Role, Stage, Current League Clan Medals, Snapshot Clan Medal Delta, Total Clan Medals, Lifetime Gold/Silver/Bronze, Total Kills, Snapshot Kill Delta, Weapons and source-native Last Online.

All relevant columns have sortable header controls and ascending/descending indicators.

### Re-render context preservation
Search, sorting and display-mode changes now capture and restore table horizontal scroll position and browser vertical scroll position.

### Player Profile
Profile retains Stage, Total Kills, Current League Clan Medals, Profile Total Clan Medals, Lifetime Gold/Silver/Bronze, Weapons, source-native Last Online and Membership History.

It now also surfaces current-league/current-period performance from existing valid Delta Results, cumulative performance as the sum of valid supported Delta Results, and richer Snapshot History. When valid Delta data is unavailable, baseline/unavailable semantics are shown instead of fabricated values.

### Player Snapshot History Grid
The history table explicitly contains:
Snapshot | Clan Name | Rank | Stage | League Medals | Delta Clan Medals | Total Clan Medals | Gold / Silver / Bronze | Total Kills | Delta Kills | Weapons | Last Online

Clan Name is data-driven from the UCS Read Model.

### Membership Changes
JOIN / RETURN / LEAVE / TRANSFER / UNKNOWN_CHANGE / NOT_OBSERVED presentation remains tied to the existing Read Model. Where a Global Player ID exists, the member links to the Clan-scoped Player Profile. Where only a valid observation reference exists, the UI uses the observation route. No Global ID is invented.

### Clan identity
All scoped pages use a reusable visible Clan identity badge driven by activeClan.display_name / clan_id.

### Responsive and overflow hardening
The table is the horizontal-scroll container. Document-level horizontal overflow remains clipped, avoiding page-wide horizontal scrolling.

## S13 data integrity audit
S13 was not re-ingested or rewritten.

Verified:
- Clan: Persian UNITY
- Snapshot: S13
- Official: 2026-09-26T19:30:00.000Z
- 48/50
- 48 observations
- 48 UNRESOLVED
- 0 Global Player IDs
- 48 Resolution Cases
- 0 Membership Episodes / 0 Membership Events
- 0 S13 Delta Results
- Last Online: 48/48
- Total Kills: 48/48
- Current League Clan Medals: 48/48
- Profile Total Clan Medal Count: 48/48
- Lifetime Gold/Silver/Bronze: 48/48
- Weapons: 48/48

The earlier missing-data symptom was confirmed as a presentation/consumer exposure defect; the current Canonical and Static Read Model already contain these fields.

## Functional commits
- app.js hardening: c0c0a573299a771cd9b05bdcf95c90aa3127b56c
- CSS hardening: 942e774e2c1af018c8892fc0cae05969ad071e5a
- regression coverage: fdb678d753b5d9db825cf3b10f0df7f952bfc4f3

No Canonical file or generated Static artifact was manually edited.

## Validation
- CI Run 36356953627 / Job 108726479423 — SUCCESS.
- npm test — SUCCESS.
- syntax checks — SUCCESS.
- static generator — SUCCESS.
- generated Static diff check — SUCCESS.
- Pages Run 36356946098 — SUCCESS on site-affecting commit 942e774e2c1af018c8892fc0cae05969ad071e5a.
- The later fdb678... commit is test-only, so the deployed site content is unchanged from the successful Pages deployment.
- Direct browser screenshot verification is not available through the current connector environment; GitHub source, generated Static data and CI/Pages evidence were used.

## Documentation
This report is the detailed Product evidence for this hardening pass. The agent operations, schema/file map, snapshot standard, completion marker and CR-01 -> CR-02 shift record are updated with the final state.

## Remaining review cases
1. S13 has 48 UNRESOLVED identities by current policy.
2. Historical S13 raw checkpoint remains unchanged.
3. No standalone persisted S13 SnapshotInput artifact exists.
4. Direct live-browser visual verification is unavailable in this environment.

These are non-blocking review cases and do not authorize re-ingestion, identity inference or architecture expansion.

## Exact Next Action
CR-02 receives the next real Persian UNITY Snapshot ZIP. Re-check live main before mutation, hash and build deterministic inventory, confirm the actual Snapshot identifier/sequence from Authority/context, compare against S13, preserve unresolved identity unless confirmation prerequisites are met, derive only contract-supported membership/deltas, regenerate Static, validate, report and update the next handoff.

Do not re-ingest or overwrite S13.
Do not assume the next Snapshot identifier.
