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

## 2.1 Mandatory cross-clan search before new Global Player

In the Multi-Clan UCS model, an observation that appears to be a new player must first be searched against **all existing resolved Global Player identities across all Clans**.

Required order:
1. Check the current Clan and Snapshot history.
2. Search other Clans for the same or plausibly equivalent identity.
3. Compare Stage, every weapon level (25mm/Hydra/Hellfire), Total Kills and lifetime Bronze/Silver/Gold using the hard monotonic rule.
4. Compare display-name variants, Emoji, punctuation, spacing, aliases, Role, temporal continuity and Membership history as supporting evidence.
5. Only when no supported existing Global Player remains may the case enter `NEW_IDENTITY_PENDING_AUTHORITY`.

A changed name, Emoji, punctuation, spacing or rank is never sufficient reason to create a new Global Player ID.

A Clan transfer is a Membership change, not a new Global Player.

This gate is mandatory even when the incoming player is visually presented as a "new member" by a derived UI projection.

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

## 5.2 Weapon semantic mapping — mandatory

For real War Drone Snapshot Profile extraction, weapon values must be assigned by **semantic weapon label**, never by assumed visual position alone.

Current locked semantic mapping is:
- 25mm → 25mm
- Hydra → Hydra
- Hellfire → Hellfire

A historical correction established that affected real Snapshot records had Hydra/Hellfire values stored under the opposite semantic keys. Corrected records use:
- stored Hellfire value → corrected Hydra value
- stored Hydra value → corrected Hellfire value

This correction applies to S13, S14, S15 and SA01 real observations. Synthetic fixtures are unaffected.

Future Snapshot extraction must preserve the source labels explicitly and must not infer Hydra/Hellfire identity from column position without verifying the source label.

## 5.1 Roster completeness and Authority-approved exclusions

The imported Snapshot must explicitly reconcile the source roster/header count with the members actually captured in the supplied evidence.

- A missing roster position must never be silently discarded.
- Every omitted position must be reported before acceptance.
- Project Authority may explicitly exclude an omitted roster position when its status/reason is known and the exclusion is part of the Authority instruction.
- An Authority-approved exclusion is recorded as an exception on the Snapshot/evidence metadata; it does not create an Observation, Global Player ID, Membership Episode or Membership Event for that omitted position.
- Future Snapshots must repeat this completeness check even when a previous Snapshot used an approved exclusion.

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

## 6.1 Membership change identity precedence — mandatory

For adjacent Snapshots of the same Clan, Membership Change projection must use the strongest available identity evidence before display-name comparison:

1. Confirmed global_player_id continuity with no hard monotonic contradiction.
2. Explicit continuity/resolution evidence.
3. Established fingerprint/name comparison for observations without a confirmed Global Player ID.

A display-name, punctuation or Emoji change alone is not a JOIN or LEAVE when the same confirmed Global Player ID is present in both Snapshots.

This rule applies to the derived Read Model membership-change view. It does not create identity, infer Global IDs, or override a hard continuity contradiction.
## 6.3 SA03 membership false-positive lesson — mandatory

SA03 established and validated the following additional rule for future real Snapshot intake:

- Snapshot presence/absence is observation state only.
- Do not derive factual JOIN/LEAVE from adjacent Snapshot set differences.
- A hard continuity contradiction remains an identity review case; it is not a JOIN/LEAVE.
- An unresolved Observation is not a new member.
- A confirmed cross-Clan TRANSFER must not be duplicated as JOIN in the destination Clan.
- Canonical Membership Events are the authoritative lifecycle record.
- Projection may expose unresolved comparisons as UNKNOWN_CHANGE review evidence, but UNKNOWN_CHANGE must never be classified by the UI as JOIN/LEAVE.

Before accepting a Snapshot as complete, verify the UI-facing Static bundle separately:
Canonical Membership Events → Projection → Static → UI
and confirm that only explicit/Authority-backed lifecycle events appear under "joined/entered" or "left/exited".

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
## SA03 import closure — 2026-10-07

SA03 established the following mandatory operational checks after the earlier SA02 identity mistakes:

1. Search the complete multi-clan Canonical history before assigning a new Global Player ID.
2. Name/icon/emoji/punctuation changes are never sufficient to create a new identity.
3. A candidate with even one decrease in Stage, 25mm, Hydra, Hellfire, Total Kills, lifetime Bronze, lifetime Silver or lifetime Gold is a hard contradiction and must remain unresolved.
4. Existing unresolved historical chains may be closed only when the new Snapshot supplies enough continuity evidence; historical contradiction pairs remain quarantined and are not erased.
5. New Global IDs are reserved for players with no established cross-clan candidate after the full search.
6. Raw Snapshot ZIP, deterministic inventory and RawExtraction must be registered before Canonical mutation.
7. Hydra/Hellfire must be extracted by semantic source identity, not visual column position.

## 6.2 Membership lifecycle safety — mandatory SA03 lesson

Locked rule: Snapshot presence/absence is observation state, not Membership Event evidence.

For adjacent Snapshots of the same Clan:
- appearance is not automatically JOIN;
- absence is not automatically LEAVE;
- a hard continuity contradiction does not become JOIN or LEAVE;
- an unresolved identity does not become a new member;
- a cross-Clan movement already represented by an explicit TRANSFER must not be duplicated as JOIN;
- explicit Canonical Membership Events are the authoritative lifecycle record.

Fingerprint/continuity pairing is evidence for Identity Resolution. It is not a Membership Event generator.

The derived Read Model may expose an unresolved comparison as UNKNOWN_CHANGE / review evidence, but it must never promote Snapshot set difference into factual JOIN/LEAVE semantics.

This rule was added after the SA03 audit found 10 false derived membership classifications caused by unmatched Snapshot observations.
