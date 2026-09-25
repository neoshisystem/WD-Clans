# UCS Canonical Data Model v0.1

Date: 2026-09-25
Status: DRAFT / Phase 1
Classification: PROPOSAL

This document describes the first concrete canonical data model for UCS.
It is versioned implementation foundation, not a permanent schema lock.

## 1. Canonical entities

1. Clan
2. League
3. Snapshot
4. Observation
5. Global Player Identity
6. Membership Episode
7. Membership Event
8. Evidence Artifact
9. Identity Resolution Case

Delta Result is derived data. It has a v0.1 record shape so the Metric engine can produce an auditable and reproducible result without making Delta the source of truth.

## 2. Relationships

Clan owns Clan-scoped history.

League is an independent game-time entity.

ClanLeague is the Clan × League participation context. It carries Clan-specific opening/final capture references without changing League's game-time boundaries.

Snapshot:
- belongs to one Clan;
- binds to one League and one ClanLeague;
- has one official observation timestamp;
- never defines the League boundary.

Observation:
- belongs to one Snapshot and Clan;
- may reference one Membership Episode only after identity is confirmed;
- retains observed player state;
- may temporarily have no Global Player Identity when resolution is unresolved;
- preserves source_member_key and optional source_identity.

Global Player Identity:
- is independent of Clan;
- can be referenced by Observations over time;
- can be referenced by Membership Episodes in multiple Clans.

Membership Episode:
- belongs to one Global Player Identity + one Clan;
- scopes Profile Total Clan Medal Count;
- multiple episodes in the same Clan are valid.

Membership Event:
- records lifecycle without replacing underlying history;
- NOT_OBSERVED is not LEAVE;
- LEAVE and TRANSFER require evidence and/or authority reference.

Evidence Artifact:
- identifies immutable source evidence by artifact ID and content hash.

Identity Resolution Case:
- links an Observation to candidate identities and evidence;
- does not allow candidate/probable status to silently become confirmed.

## 3. Metric scopes

Player lifetime:
- stage
- weapon/gun levels
- total kills
- established lifetime medal counts

League scoped:
- current league clan medals = player + clan + league

Membership Episode scoped:
- profile total clan medal count

The scopes are intentionally separate.

## 4. League completion

A League carries game-time completion separately from Snapshot capture.

completed_at_utc represents completion at the fixed game boundary.
A ClanLeague carries final_snapshot_id and opening_snapshot_id independently for that Clan.
A null final_snapshot_id means no final Snapshot was captured for that ClanLeague; it does not mean the League remained active.

No synthetic Snapshot is created.

## 5. Baseline and Delta

Observed metric values remain inside Observation and are never replaced by Delta.

Delta records reference:
- current observation;
- baseline observation when one exists;
- baseline type;
- metric key;
- scope;
- league;
- membership episode;
- calculation status.

No valid baseline means BASELINE_UNAVAILABLE or UNKNOWN, never a fabricated zero.

A new League current-league-medal baseline may use explicit NEW_LEAGUE_ZERO because the Game Rule defines that reset.

Leave -> League boundary -> Return creates a new Membership Episode. The new episode profile clan-medal baseline is zero. The prior episode remains historical data.

## 6. Identity resolution status

Canonical resolution status in v0.1:
- CONFIRMED
- AMBIGUOUS
- UNRESOLVED
- CONTRADICTION
- UNKNOWN

Candidate generation may use process states, but candidate/probable is not canonical proof.

## 7. Historical integrity

Canonical Observations are append-only:
- an existing Observation ID is never overwritten;
- future corrections require a separate correction/supersession mechanism;
- Membership Episodes remain independently addressable;
- Evidence references are retained.

Merge/Split correction storage is still OPEN DECISION.

## 8. Required lifecycle invariants

Continuous:
same Global Identity + same Clan can have many Observations in one continuing Membership Episode.

Transfer:
same Global Identity can have episodes in Clan A and Clan B; Clan-scoped data stays isolated.

Leave -> Return:
absence first yields NOT_OBSERVED; explicit Leave resolution can end the episode; later observation creates RETURN/new episode.

Late/missing League Snapshot:
League boundaries exist by Game Rule even without opening or final captures; Snapshot binds by timestamp.

## 9. Deferred decisions

OPEN DECISION:
- Global Player ID format and allocation authority.
- League ID global vs clan-scoped namespace.
- final identity automatic thresholds.
- exact transfer semantics.
- evidence storage/retention backend.
- Delta materialization strategy.
- final correction/merge/split model.
- physical storage topology.

## 10. Non-goals

v0.1 does not:
- import PERSIA;
- import GOLDENCROWN;
- create production Global Player IDs for real users;
- connect the approved legacy UIs;
- define a final deployment platform.
