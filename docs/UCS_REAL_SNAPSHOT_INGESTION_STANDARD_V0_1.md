# UCS Real Snapshot Ingestion Standard v0.1

## User intake contract
Normal input:
1. Clan name.
2. Official Snapshot date/time from Project Authority/user.
3. ZIP containing Ranking/Profile screenshots.

Do not ask the user to repeat values already supplied.

## Mandatory ZIP workflow
**ZIP → SHA-256 → deterministic inventory → Ranking/Profile classification → visual extraction → same-Snapshot correlation → validation → Canonical → Projection → Static → UI validation → report**

1. Preserve the ZIP unchanged.
2. Calculate ZIP SHA-256.
3. Build sorted relative-path inventory.
4. Inventory hash = SHA-256 of UTF-8 newline-joined sorted paths.
5. Classify Ranking vs Profile evidence.
6. Record duplicate screenshots as evidence; never duplicate observations.
7. Visually extract source values.
8. Correlate Ranking/Profile only within the same Snapshot.
9. Validate SnapshotInput/domain boundary.
10. Default new observations to UNRESOLVED.
11. Persist evidence-backed Canonical records only.
12. Regenerate static artifacts from Canonical.
13. Validate UI visibility and CI/Pages.
14. Write the report and update the shift checkpoint.

## Field contract
### Ranking
rank, display_name, role, stage, current_league_clan_medals.

### Profile
total_kills, profile_total_clan_medal_count, lifetime_medals (gold/silver/bronze), weapon levels, source-native Last Online.

### Last Online
Preserve source-native strings such as `1m`, `1h`, `<1m`. Set `last_online_utc = null` unless exact UTC is independently known.

## Identity rules
Never create Global Player ID from name, rank, stage, medals, kills, avatar, or one fingerprint signal. UNRESOLVED / AMBIGUOUS / CONTRADICTION / UNKNOWN remain explicit.

## Membership rules
First observed Snapshot: do not infer JOIN/LEAVE/RETURN/TRANSFER. Absence alone is not a LEAVE event.

## Metric rules
Keep lifetime Total Kills, lifetime medals, current-league Clan Medals, and Profile Total Clan Medal Count distinct. Delta requires a valid baseline and approved identity boundary. Negative lifetime delta is an anomaly, not silently corrected.

## Reporting contract
Every real Snapshot report must include: official time/source, SHA-256, inventory, coverage, extracted fields, identity status, membership, deltas, persistence, projection/static, UI, tests/CI/Pages, changed files/commit, blockers, and next action.

## Current example
Persian UNITY S13: 4 Mehr 1405, 23:00 Iran = 2026-09-26T19:30:00Z; 48/50; 56 evidence files; 48 UNRESOLVED; 0 Global IDs; 0 Membership Episodes/Events; 0 deltas.


## UX/UI hardening boundary — 2026-09-28
UX/UI hardening does not re-ingest, overwrite, renumber or reinterpret an existing Snapshot. S13 was audited as-is because its required observed fields already exist through Canonical -> Projection -> Static. Future real Snapshots remain new historical records and must follow this standard.


## S14 application checkpoint — 2026-09-28
The standard was applied to Persian UNITY S14:
- Official: 2026-09-27T19:30:00Z.
- 58-file ZIP: 8 Ranking + 50 Profile, no duplicate Ranking capture.
- 50/50 roster and 50 correlated Profile records.
- ZIP SHA-256: 9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d.
- Inventory hash: cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be.
- All S14 observations remain UNRESOLVED; no Global IDs, Membership Episodes/Events or Delta Results were fabricated.
- Raw checkpoint: data/real-snapshots/persian-unity/S14.raw.json.
- Detailed report: reports/2026-09-28_real-s14-ingestion.md.
