# UCS Snapshot Import Contract

**Status:** APPROVED PROJECT-LEVEL OPERATING CONTRACT

This is the single high-level reference for real Snapshot extraction, archival, identity continuity, metric handling, and the path from Raw Extraction to the user-facing Read Model.

## 1. Hard continuity rule

For the **same Player**, these lifetime values can never decrease between adjacent Snapshots:

- Stage
- every Weapon/Gun level
- Total Kills
- lifetime Bronze medals
- lifetime Silver medals
- lifetime Gold medals

**A decrease of even 1 means the two observations must not be paired as the same Player.**

Example: Stage 8 / 28,000 Kills → Stage 8 / 27,000 Kills means **not the same Player observation**. The likely explanation is that the previous Player left and another similarly named Player entered.

Equality is valid and may simply mean the Player was offline.

An increase is compatible with continuity, but is **not by itself proof of identity**.

The system must never turn a hard continuity contradiction into a negative Delta.

## 2. Identity decision rule

A name, rank, Stage, weapon match, medal count, or any single signal does not prove identity.

When a hard continuity contradiction is found:

`previous observation != current observation for continuity purposes`

The system must:

- block the automatic pair;
- keep both observations intact;
- record the contradiction and evidence;
- expose JOIN/LEAVE-like observed changes at Read Model level when appropriate;
- require human/Project Authority review when identity needs to be resolved;
- never fabricate a Global Player ID or canonical identity merge from the contradiction.

Project Authority may establish that a source value was extracted incorrectly; in that case the **source evidence/extraction must be corrected**, not the game rule.

## 3. Medal scopes are not interchangeable

### Lifetime medals
Bronze / Silver / Gold counts are lifetime values and are monotonic non-decreasing.

### Current League Clan Medals
This is a **League-scoped** value shown by the Ranking. A new League creates a new baseline. Do not confuse it with Profile Total Clan Medal Count.

### Profile Total Clan Medal Count
This is **Membership Episode-scoped**.

The only documented reset is:

`LEAVE → League boundary passes → RETURN to same Clan`

A new Membership Episode starts from zero.

A return during the same League may again show the Clan's current League medal value on Ranking while the Profile Total Clan Medal Count remains zero for the new Membership Episode.

## 4. League boundary

War Drone League boundaries are fixed:

- Thursday 00:00 UTC
- Thursday 03:30 Iran
- exact duration: 7 days

League status must be determined from the authoritative Snapshot timestamp, not the ZIP filename or ingestion time.

## 5. Replayable Raw Snapshot archive — mandatory

Every Agent-produced Raw Extraction must be saved as a replayable, conversation-readable archive in the private Memory-ai repository:

projects/UCS/snapshots/<Clan Display Name>/<Snapshot ID>.raw.json

The Product repository may retain a historical/raw mirror under data/real-snapshots/<clan>/.

Rules:
- one immutable raw file per Snapshot;
- never overwrite an existing raw archive; same Snapshot ID + different content is an archive conflict;
- store ZIP SHA-256 and deterministic inventory hash;
- preserve exact source display_name;
- preserve Ranking/Profile source scope and evidence references;
- preserve UNKNOWN, AMBIGUOUS, CONFLICTING and UNRESOLVED states;
- later rechecks must be able to replay the Snapshot from the Raw archive without re-reading the ZIP when the archive is complete;
- Raw Extraction is evidence/archive, not Canonical Data.

`data/real-snapshots/...` remains historical legacy evidence where already present; new ingestion uses the `Snapshot/<Clan>/` archive as the standard replay source.

## 6. Source field scope

The extraction agent must keep these source scopes separate:

| Field | Primary source |
|---|---|
| rank | Ranking |
| display_name | Ranking + Profile correlation |
| stage | Ranking + Profile correlation |
| current_league_clan_medals | Ranking |
| role | Profile (or explicitly evidenced alternate source) |
| total_kills | Profile |
| profile_total_clan_medal_count | Profile |
| lifetime medals | Profile |
| weapon levels | Profile |
| Last Online | Profile |

A value from one scope must never be silently substituted for another.

Example: Profile Total Clan Medal Count must never be copied into Current League Clan Medals.

## 7. Required pipeline

ZIP → SHA-256 → deterministic inventory → visual extraction → RawExtraction archive → same-Snapshot correlation → SnapshotInput → identity/continuity review → Canonical → Projection → Static → UI → validation/report

S16+ intake must not bypass the RawExtraction archive step.

`ZIP → SHA-256 → deterministic inventory → Ranking/Profile classification → visual extraction → Raw Extraction archive → same-Snapshot correlation → SnapshotInput → identity/continuity review → Canonical → Projection → Static → UI → validation/report`

Canonical remains the only product source of truth. Static files are always regenerated from Canonical.

## 8. Delta safety

- Valid increase → positive Delta.
- No change → zero Delta.
- No valid baseline → null / baseline unavailable.
- Hard continuity contradiction → no pair and therefore no player-lifetime Delta.
- Any remaining numeric negative Delta is invalid and must fail validation.

This document is the first read for any real Snapshot task.