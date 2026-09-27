# UCS Agent Operations — Schema, File Map, Snapshot Intake, and User Interaction

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
