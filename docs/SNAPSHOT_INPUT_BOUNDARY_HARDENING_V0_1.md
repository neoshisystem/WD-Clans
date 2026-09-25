# UCS — SnapshotInput Boundary Hardening v0.1

Status: implementation foundation; SnapshotInput v0.1 remains draft/non-final.

## Boundary
Screenshot / External Source -> Raw Extraction -> Evidence Mapping -> Same-Snapshot Observation Merge -> Standard SnapshotInput -> Structural + Domain Validation -> UCS Core.

Raw Extraction is evidence-bound and source-local. SnapshotInput is the only standardized machine-validatable hand-off into UCS Core. No Source Adapter creates Global Player IDs, confirms identities, performs migration, persists canonical data, or overrides GAME_RULES.

## Roster vs Profile coverage
snapshot.member_count is the roster member count. Profile screenshot coverage is independent.

Profile-derived fields may be null when not observed. Null is not zero. field_provenance.<field>.status distinguishes NOT_VISIBLE, UNKNOWN, AMBIGUOUS and CONFLICTING.

## Same-Snapshot merge
A RawExtraction field may contain a single capture or a non-empty capture set. Equal normalized observed values merge. Different observed values become CONFLICTING with null value and all evidence references retained. No source is silently preferred.

## Provenance
SnapshotInput carries source.artifacts, member evidence_refs and field-level field_provenance. Artifact hashes refer to original source bytes; the adapter verifies supplied hash metadata but does not compute source hashes.

## League
Authority supplies Snapshot and League context. GAME_RULES.md and src/league.js remain authoritative for the fixed Thursday 00:00 UTC / seven-day League boundary. Source filenames, timestamps and claims cannot override it.

## source_member_key
source_member_key is a source/Snapshot boundary key only. It is not Global Player Identity and is not used by the pipeline as a cross-Snapshot metric baseline. Confirmed identity baselines use previousByGlobalPlayerId.

## Validation
SnapshotInput structural validation is schema-first through src/schema-validator.js; domain/game-rule validation follows. The permanent v0.1 schema is not locked by this change.

## Out of scope
No migration, historical import, Global ID creation, PERSIA/GOLDENCROWN mutation, UI changes, GAME_RULES edits or persistence-topology redesign.
