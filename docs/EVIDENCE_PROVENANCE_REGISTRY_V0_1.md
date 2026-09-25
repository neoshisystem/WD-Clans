# UCS — Evidence / Provenance Registry Foundation v0.1

Status: IMPLEMENTATION FOUNDATION / DRAFT / NON-FINAL

This document defines the Phase 1 reversible Evidence / Provenance Registry foundation. It is not a final Evidence schema, storage architecture, retention policy, or backend decision.

## 1. Architecture boundary

The intended lineage remains:

RAW EVIDENCE
↓
RAW EXTRACTION
↓
EVIDENCE / PROVENANCE REGISTRY
↓
STANDARD SNAPSHOTINPUT
↓
UCS CORE
↓
CANONICAL OBSERVATION
↓
DERIVED / UI

Evidence and Provenance are not Canonical Data. Canonical Observations and Derived projections do not replace the original evidence lineage.

## 2. Evidence Artifact contract

Minimum implementation contract:

- artifact_id
- artifact_type
- content_hash
- optional source_location
- optional implementation metadata

artifact_id is an Evidence identifier. It is not a Global Player ID.

content_hash is integrity metadata for the supplied artifact bytes. The Registry does not claim to have computed the hash unless source bytes are explicitly available to a separate capability.

The current RawExtraction boundary uses SHA-256. The Registry Foundation therefore validates SHA-256 metadata when that algorithm is supplied; it does not read or store the source bytes.

The Registry does not silently inject, issue, or infer Global Player IDs.

## 3. Artifact immutability

Registration is immutable:

REGISTERED → artifact record exists.

Repeated registration with the same artifact ID and equivalent metadata is:

IDEMPOTENT.

Reusing the same artifact ID with another content hash is:

CONFLICT.

Reusing the same artifact ID with incompatible metadata is:

CONFLICT.

No overwrite is performed.

The implementation returns cloned records so a consumer cannot mutate Registry state through a read result.

Correction and supersession semantics are not implemented. They remain open.

## 4. Provenance contract

A Provenance relation links a subject to one or more Evidence Artifact references:

- provenance_id
- subject_type
- subject_id
- optional field_name
- ordered/deterministically sorted evidence_refs

Current subject categories represented by the foundation include:

- SNAPSHOT_INPUT
- OBSERVATION
- FIELD_OBSERVATION
- RAW_EXTRACTION
- RAW_EXTRACTION_CAPTURE
- RESOLUTION_CASE

The category set is implementation guidance, not a permanent schema lock.

A reference to an unregistered Artifact is rejected. Metadata mismatches are rejected.

Multiple references for the same field are preserved. The Registry does not decide which source value is correct.

## 5. Registry API boundary

Reference interface:

- registerArtifact(...)
- getArtifact(...)
- hasArtifact(...)
- validateReference(...)
- registerProvenance(...)
- resolveReference(...)

Additional read helpers provide deterministic registry inspection.

The reference implementation is:

InMemoryEvidenceRegistry

It is intentionally reversible and metadata-oriented. It does not perform:

- Global Player ID issuance
- Identity resolution or confirmation
- Membership classification
- Delta calculation
- SnapshotInput generation
- Canonical persistence
- Migration
- GAME_RULES override

## 6. Hash semantics

The current Foundation validates supplied SHA-256 metadata but does not compute the original artifact hash from bytes.

Important distinction:

artifact_id ≠ content_hash

content_hash ≠ Global Player ID

content_hash ≠ mandatory deduplication identity

Two different Artifact IDs may carry the same content hash. They are not merged automatically.

Hash-based deduplication remains an OPEN DECISION.

## 7. Scope semantics

The in-memory implementation enforces artifact_id uniqueness within one Registry instance.

The permanent/global scope of artifact_id is OPEN and must not be inferred from this adapter.

The Registry instance itself is not a durable registry.

## 8. Atomicity / failure safety

Artifact registration is single-record atomic.

Provenance registration preflights all supplied references and all existing relation conflicts before changing state. A failed batch does not leave a partial provenance set.

Deterministic ordering is applied when exposing artifacts and provenance records.

## 9. RawExtraction and SnapshotInput integration

The Foundation provides validation helpers for both boundaries:

- RawExtraction declared Artifacts and evidence references can be validated against a Registry.
- SnapshotInput declared Artifacts and evidence references can be validated against a Registry.
- The Core pipeline may receive an optional evidenceRegistry context and will fail closed if the declared Artifact metadata or references do not resolve.

This is optional infrastructure integration, not a durable storage dependency.

## 10. Canonical planning integration

The existing canonical planning path was minimally adjusted to preserve:

- all declared source Artifacts;
- snapshot/member-level evidence references;
- field-level provenance references;
- resolution-case evidence references;
- source locations for persisted Artifact metadata.

The transaction topology is unchanged.

Canonical validation now validates field-level provenance references in addition to observation-level evidence references.

## 11. Deduplication finding

FACT:
- Current canonical/persistence identity is keyed by Artifact ID.
- The Registry foundation does not deduplicate different Artifact IDs with equal hashes.

PROPOSAL:
- Keep hash-based dedup policy external to the Registry v0.1 implementation until Authority defines provenance equivalence semantics.

OPEN DECISION:
- Whether any future durable layer should deduplicate by content hash, by source scope, by artifact ID, or by a combination.

## 12. Non-goals

This Stage does not implement or decide:

- binary/object storage
- durable database
- S3 or equivalent
- retention/deletion policy
- correction/supersession semantics
- final Evidence schema
- final SnapshotInput schema
- migration
- historical import
- Global Player creation
- ambiguity auto-confirmation
- membership redesign
- delta redesign
- GAME_RULES change
- UI redesign
- PERSIA/GOLDENCROWN mutation
- persistence topology redesign
