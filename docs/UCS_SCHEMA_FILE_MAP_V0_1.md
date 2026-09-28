# UCS Schema & File Map v0.1

## Purpose
Agent-facing map of the current UCS data model and file ownership. This is continuity documentation, not an executable task. Live `main` is current truth.

## Data path
**Raw Evidence → Raw Extraction → SnapshotInput → Canonical → Projection/Read Model → Static Bundle → UI**

- `data/canonical.json`: only source of truth.
- `src/canonical.js`: Canonical invariants/reference validation.
- `src/source-adapter.js`: Source/SnapshotInput boundary.
- `src/evidence-registry.js`: evidence identity/provenance.
- `src/identity.js`: explicit identity comparison/decision.
- `src/membership.js`: membership classification.
- `src/metrics.js`: supported delta/anomaly rules.
- `src/persistence.js`: atomic persistence.
- `src/projection.js`: deterministic Canonical → Read Model.
- `src/static-data.js`: Static bundle serialization.
- `scripts/generate-static-vertical-slice.js`: generated static artifacts.
- `site/app.js`: read-only browser consumer.
- `site/styles.css`: viewer/responsive styling.

## Canonical collections
`clans`, `leagues`, `clan_leagues`, `snapshots`, `observations`, `global_player_identities`, `membership_episodes`, `membership_events`, `evidence_artifacts`, `resolution_cases`, `delta_results`.

## Observation fields
Ranking: rank, display_name, role, stage, current_league_clan_medals.

Profile: total_kills, profile_total_clan_medal_count, lifetime_medals (gold/silver/bronze), weapon levels, source-native `last_online_display`.

Relative Last Online values such as `1m`, `1h`, `<1m` stay source-native. `last_online_utc` is null unless exact UTC is known.

## UI isolation
- `site/index.html`: Global/Admin dashboard; only cross-Clan selector.
- `site/clan.html?clan=<CLAN-ID>`: direct latest Leaderboard for one Clan.
- `site/archive.html?clan=<CLAN-ID>`: only that Clan.
- `site/players.html?clan=<CLAN-ID>`: only that Clan.
- `site/player.html?...&clan=<CLAN-ID>`: scoped profile.
- `site/member-history.html?clan=<CLAN-ID>`: scoped membership.

## Generation
Never treat `site/data/ucs-vertical-slice.json/js` as source data. Regenerate from Canonical with `scripts/generate-static-vertical-slice.js` and require a clean generated-artifact diff.

## Current real checkpoint
Persian UNITY / `CLAN-PERSIAN-UNITY`: S13, 48/50, 48 UNRESOLVED observations, 0 Global IDs, 0 Membership Episodes/Events, 0 deltas because there is no prior valid baseline.


## UX/UI ownership and Grid contract — 2026-09-28
- site/app.js: browser-only consumer for Leaderboard, Search, Sort, display modes, Profile, Archive, Membership and scoped routing.
- site/styles.css: shared responsive styling, contained table scrolling, sticky headers, sort controls, Clan identity context and Profile history Grid.
- UI consumes Read Model values only; missing values remain missing.
- PERSIA is a presentation/interaction reference only. UCS Canonical and Projection semantics remain authoritative.
- No new Canonical collection or projection field was introduced by the final UX/UI hardening.


## S14 current real checkpoint — 2026-09-28
Persian UNITY / S14 is the latest Canonical Snapshot:
- 50/50 roster.
- 50 UNRESOLVED observations.
- 50 Resolution Cases.
- 0 Global IDs.
- 0 Membership Episodes/Events.
- 0 Delta Results.
- Evidence: EV-REAL-PERSIAN-UNITY-S14.
- Raw evidence checkpoint: data/real-snapshots/persian-unity/S14.raw.json.
- Report: reports/2026-09-28_real-s14-ingestion.md.

## Derived continuity Read Model properties — 2026-09-28

The current Read Model includes two derived properties in addition to the existing canonical-delta projection:
- snapshot_delta_results: deterministic adjacent-Snapshot observation deltas for total_kills and current_league_clan_medals.
- snapshot_membership_changes: deterministic observed JOIN/LEAVE changes between adjacent same-Clan Snapshots.

Both retain Observation and Evidence references. Neither is a Canonical collection and neither creates Global identity or canonical membership state.
