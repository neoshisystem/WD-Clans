# UCS — Deterministic Projection / Read Model Foundation v0.1

Status: IMPLEMENTATION FOUNDATION / DRAFT / NON-FINAL

This document defines a pure, deterministic read-model projection layer over the UCS Canonical Data Model. It is not a second canonical store, UI renderer, deployment mechanism, or durable read-model backend.

## 1. Source-of-truth boundary

Canonical Data is the source of truth.

The projection layer reads Canonical State and produces regenerable Read Models / Derived Records:

Canonical Data
↓
Deterministic Projection
↓
Read Model / Derived Record
↓
UI

Projection never writes Canonical State and never re-reads RawExtraction or SnapshotInput.

## 2. Implemented projection API

ProjectionEngine is the reference implementation. ReadModelProjector is an alias.

Methods:
- projectGlobalPlayers(canonicalState)
- projectClans(canonicalState)
- projectSnapshots(canonicalState)
- projectPlayerHistory(canonicalState)
- projectActivity(canonicalState)
- projectAll(canonicalState)

All methods are pure from the caller's perspective: Canonical State is validated/read, not modified, and returned Read Model objects are independent clones.

## 3. Global Player Read Model

Only Global Player identities already present in Canonical State are projected.

For each existing Global Player the model may contain:
- global_player_id
- identity_status
- display_name derived from the latest confirmed observation
- sorted alias list from confirmed observations
- memberships
- latest observation/snapshot references
- latest known canonical metrics
- observation and membership-event references
- provenance linking the derived record to Canonical refs and Evidence refs

No Global Player Identity is created and no identity is resolved.

Unresolved/AMBIGUOUS/CONTRADICTION/UNKNOWN observations are not attached to a Global Player unless Canonical already contains a valid confirmed binding.

## 4. Clan Read Model

Derived only from Canonical Clan, Membership Episode, Snapshot and Observation records.

The current member list is based on canonical ACTIVE membership episodes. The model also exposes observed Global Player IDs and unresolved observation references.

Projection never decides JOIN/LEAVE/RETURN/TRANSFER.

## 5. Snapshot Read Model

Contains:
- snapshot/clan/league identity
- official observation timestamp
- member_count/capacity
- deterministic member observation ordering
- per-observation canonical fields
- observation identity status
- provenance/evidence references

Both resolved and unresolved observations remain visible with their canonical identity status.

## 6. Player History Index

For each Canonical Global Player:
- chronological observation history
- membership history
- membership event history
- snapshot references
- provenance

History ordering is chronological; ties are resolved by stable IDs.

## 7. Activity / Membership Timeline

Projects Canonical Membership Events only.

Ordering:
1. effective_at_utc
2. membership_event_id

No membership event is inferred or created.

## 8. Determinism

Projection never uses:
- wall-clock time
- random values
- network responses
- UI state
- previous generated Read Models

Collections and nested history arrays are explicitly sorted. Tie breakers use stable canonical IDs.

stableStringify recursively sorts object keys. Array order is established by projection-specific sorting before serialization.

A projection hash may be calculated from the stable serialized output as an integrity/determinism check. It is not a Canonical Identity.

## 9. Metric semantics

Projection does not introduce metric semantics.

It exposes Canonical observation values as separate fields:
- stage
- weapons
- total_kills
- lifetime_medals
- current_league_clan_medals
- profile_total_clan_medal_count
- last_online_utc

Lifetime and scoped metric semantics remain governed by GAME_RULES.md.

Canonical delta_results are not recomputed by the projection layer.

## 10. Missing data

Projection never substitutes missing values with zero or guessed values.

Current Canonical v0.1 requires several observation metrics to be present and non-null, so the projection foundation does not alter that Canonical contract. Where Canonical contains explicit nullable values such as role or last_online_utc, they remain null.

A future Canonical schema change needed to represent additional missing profile metrics remains an OPEN DECISION outside this Stage.

## 11. Provenance

Derived records contain:
- Canonical record references
- Evidence references inherited from Canonical provenance

Field-level observation provenance is retained inside projected observation provenance when it exists in Canonical.

Projection does not resolve evidence conflicts and does not remove references.

## 12. Immutability / regeneration

The Projection layer does not mutate Canonical State.

A newly generated Read Model does not become input to a later projection. Every generation starts from Canonical State.

Returned objects are detached from Canonical objects, so caller mutation cannot alter source truth.

## 13. Materialization

This Stage implements pure in-memory projection only.

Not implemented:
- static JSON publishing
- GitHub Pages generation
- UI build integration
- durable read-model database
- object storage for read models
- cache invalidation infrastructure

## 14. Version / schema discipline

projection_version is implementation metadata. The reference value is 0.1.

This does not lock a final Read Model schema or permanent projection version.

## 15. Open Decisions / Unknowns

OPEN DECISION:
- final Read Model schemas
- durable Read Model backend/materialization
- projection versioning policy
- UI integration/read-model binding
- Canonical representation for additional nullable Profile fields
- long-term persistence/concurrency design

UNKNOWN:
- scale threshold for materialized read models
- final UI adapter contract

PROPOSAL:
- treat ProjectionEngine/In-Memory results as the reversible reference implementation until durable materialization is explicitly authorized.

## 16. Non-goals

No:
- migration
- historical import
- Global Player creation
- identity auto-confirmation
- membership redesign
- delta redesign
- GAME_RULES change
- PERSIA/GOLDENCROWN mutation
- UI redesign
- GitHub Pages deployment
- durable Read Model backend
- final schema lock
- Evidence backend decision
- artifact retention decision
- hash dedup policy decision
- correction/supersession policy decision
