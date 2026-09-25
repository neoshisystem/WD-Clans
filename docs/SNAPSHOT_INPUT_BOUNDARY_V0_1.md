
# UCS — Standard Snapshot Input Boundary v0.1

Status: DRAFT / Phase 1  
Classification: FACT + PROPOSAL  
Permanent schema lock: NO

## Purpose

The official ingestion boundary into the UCS Core is the standardized SnapshotInput contract.

```
Screenshot(s) / External Source
        ↓
Raw Extraction / Source Adapter
        ↓
Standard SnapshotInput Contract
        ↓
Deterministic Validation
        ↓
UCS Core Pipeline
        ↓
Identity / Membership Resolution
        ↓
Metrics / Delta
        ↓
Canonical Persistence
        ↓
Derived Projections / UI
```

A Screenshot is an Evidence / Source Artifact. It is not Core input.

## A. Raw Extraction

RawExtraction v0.1 is a source-boundary record. It is not a canonical entity model and it must not contain Global Player IDs, Delta results or resolved Membership/Identity decisions.

It preserves:

- original source artifact identifiers;
- source artifact type;
- SHA-256 hash of the original artifact bytes;
- field-level evidence references;
- the raw value as observed;
- an optional deterministic normalized value;
- an explicit observation status;
- whether the value contains interpretation.

### Field status

- OBSERVED — value is directly visible/available from the source.
- NOT_VISIBLE — field exists conceptually but the source does not visibly expose it.
- UNKNOWN — source does not establish a value.
- AMBIGUOUS — multiple readings/candidates remain possible.
- CONFLICTING — available source evidence disagrees.

The raw value is never replaced by its normalized form.

## B. Normalization vs interpretation

Normalization is allowed only when deterministic and mechanically repeatable.

Examples:

- Persian/Arabic digit → ASCII digit conversion;
- removal of unambiguous grouping separators;
- trimming text boundaries;
- deterministic date-time pass-through of an explicitly supplied ISO value;
- deterministic numeric-map normalization.

Interpretation is different: it adds meaning that the source itself does not establish.

Examples of prohibited Core-boundary interpretation:

- guessing an unseen metric as zero;
- selecting one identity candidate;
- inventing a Snapshot timestamp from a filename;
- turning absence into LEAVE;
- computing Delta and treating it as source truth;
- creating a Global Player ID.

A RawExtraction field marked `INTERPRETED` cannot cross into SnapshotInput v0.1.

## C. Evidence / provenance

The original artifact is identified and hashed at the source boundary.

The hash refers to the original artifact bytes, not to a normalized JSON representation.

Multiple artifacts are supported. One artifact is marked as `primary_artifact_id` and maps to SnapshotInput.source. Member/field evidence references can point to any declared artifact.

The current SnapshotInput contract can carry these references but does not yet model a durable Extraction entity. That is intentionally deferred to the future Evidence / Provenance Registry.

## D. SnapshotInput v0.1 minimum

The existing v0.1 contract currently requires:

- project/clan identity;
- Snapshot identity, sequence, observation timestamp, member count and capacity;
- League identity and fixed boundary timestamps;
- primary source artifact ID/type/hash;
- for every member: source_member_key, rank, display_name, Stage, Weapons, Total Kills, Lifetime Medals, Current League Clan Medals, Profile Total Clan Medal Count.

Role and Last Online remain nullable/optional in the current contract.

The minimum contract is deliberately Core-ready, not a raw screenshot representation.

## E. Missing / UNKNOWN / AMBIGUOUS

RawExtraction can represent missing, unknown, ambiguous and conflicting values without fabricating replacements.

However, SnapshotInput v0.1 currently requires the principal numeric/member values as non-null non-negative integers/maps.

Therefore:

1. Raw extraction MUST preserve the unresolved state.
2. Source Adapter MUST NOT convert UNKNOWN / NOT_VISIBLE / AMBIGUOUS / CONFLICTING required fields into zero or another guessed value.
3. Such a Snapshot is blocked from SnapshotInput v0.1 until the value becomes deterministically available or Project Authority explicitly changes the contract.
4. Nullable optional fields may cross as `null`.

Identity ambiguity is intentionally not resolved by the source adapter. Source identity may be omitted from SnapshotInput when ambiguous; Core Identity Resolution then handles the unresolved state.

## F. Authority context vs source observation

Source Adapter receives an explicit context containing:

- project_id;
- clan_id;
- Snapshot identity/sequence/timestamp/member count/capacity;
- League identity/boundaries and optional metadata.

The adapter never derives official Snapshot identity or League boundary from a filename or Screenshot timing.

This prevents an observation timestamp from silently redefining League mechanics.

## G. Agent / Conversation operating procedure

1. Acquire the original artifact(s).
2. Hash the original bytes with SHA-256.
3. Create RawExtraction v0.1.
4. Preserve raw field values exactly as observed.
5. Attach field-level evidence references.
6. Mark non-visible/unknown/ambiguous/conflicting values explicitly.
7. Apply only deterministic normalization.
8. Do not perform identity resolution, membership interpretation or Delta calculation.
9. Provide authoritative Snapshot/League context separately.
10. Run the Source Adapter.
11. Run deterministic SnapshotInput validation.
12. Pass only the resulting SnapshotInput into the UCS Core pipeline.

Conversation/Agent output is a producer of SnapshotInput. It is not the canonical store.

## H. Backward compatibility / schema discipline

- Existing `schemas/snapshot-input.schema.json` remains v0.1.
- This Stage does not promote v0.1 to a permanent schema.
- RawExtraction is introduced as a separate v0.1 boundary contract.
- Source Adapter is an interface/foundation, not a migration tool.
- Any future change that requires nullable required metrics, a durable Extraction entity, a new schema version, or a different authority model is an OPEN DECISION unless explicitly approved.

## I. Intentionally open

- Durable Evidence / Provenance Registry.
- Source-specific adapters for PERSIA, GOLDENCROWN, API and other external systems.
- Final raw-extraction retention policy.
- Final SnapshotInput versioning and schema lock.
- Exact artifact-storage backend.
- Mapping rules for future source-specific semantic field aliases.
