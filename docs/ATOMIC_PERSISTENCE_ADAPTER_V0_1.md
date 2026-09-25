
# UCS — Atomic Persistence Adapter v0.1

Date: 2026-09-25
Status: DRAFT / Phase 1
Classification: PROPOSAL

## Purpose

This document defines the first reversible persistence boundary between the deterministic Snapshot transaction planner and physical storage.

It is an implementation foundation, not a final persistence topology or schema lock.

## Boundary

SnapshotInput
→ validation / League binding / Identity / Membership / Metric evaluation
→ deterministic Snapshot transaction plan
→ CanonicalPersistencePort.commit(transaction)
→ atomic commit

The domain/pipeline layer does not depend on a storage implementation. The reference implementation is an in-memory adapter.

## Transaction identity

v0.1 uses a narrow idempotency identity:

UCS|SNAPSHOT|<clan_id>|<snapshot_id>

The transaction also carries a deterministic plan_hash derived from the canonical patch with recursively sorted object keys.

This is a technical proposal only. The final persistent transaction ledger / storage key design remains OPEN DECISION.

## Commit semantics

A transaction is evaluated before changing the adapter's committed state:

1. Reject unsupported transaction shapes.
2. Detect exact transaction replay.
3. Detect existing Snapshot conflicts.
4. Apply the canonical patch to an isolated candidate state.
5. Run historical-preservation checks.
6. Validate the full canonical model.
7. Publish the candidate as the new committed state in one logical commit.
8. Record transaction metadata for replay detection.

There is no mutation of committed state before all checks succeed.

## Rollback and failure injection

The reference adapter applies writes only to a cloned candidate state. Any exception discards the candidate.

Tests inject failure after partial candidate writes. The committed state remains unchanged.

A future database adapter must provide equivalent all-or-nothing guarantees using its transaction/locking primitives.

## Idempotency

Exact replay returns IDEMPOTENT_REPLAY and does not increment the store version.

A Snapshot ID already present with identical content is also treated deterministically as idempotent.

Reusing the same idempotency key with different transaction content returns CONFLICT.

## Conflict detection

v0.1 detects:

- idempotency-key reuse with different plan hash;
- duplicate Snapshot identity with different content;
- conflicting entity content for the same canonical entity ID;
- optimistic expected-version mismatch.

The reason is returned in the transaction result for auditability.

## Historical preservation

Canonical observations, membership episodes/events, and evidence artifacts are preserve-oriented. The adapter appends missing entities and rejects conflicting content for existing IDs.

The adapter does not overwrite or delete historical canonical records.

Correction / supersession / merge / split persistence remains an OPEN DECISION.

## Review-gated identity

The adapter never creates a Global Player Identity.

Confirmed observations reference a Global Player Identity that must already exist in canonical state.

Candidate / ambiguous / unresolved identity states can be persisted only as review-gated observations with global_player_id = null and an auditable Resolution Case.

This keeps v0.1 conservative and avoids locking an issuance or matching threshold.

## League / ClanLeague

The transaction persists League and ClanLeague separately.

League boundaries remain governed by GAME_RULES.md.

A late Snapshot stores the observed timestamp while retaining the League starts_at_utc.

final_snapshot_id is independently nullable. Missing final capture does not make the League incomplete.

## Metric scope

The adapter stores observed metrics as part of Observation. Delta remains derived/auditable and is not used as the source of truth.

Lifetime metrics are never rewritten by the adapter.

Current League Clan Medals and Profile Total Clan Medal Count remain scoped to their respective game rules; the adapter does not collapse them into lifetime state.

## Transaction result model

- COMMITTED — atomic state change completed.
- IDEMPOTENT_REPLAY — exact or identical replay; no state change.
- REJECTED — malformed/unsupported transaction or blocked review.
- CONFLICT — transaction assumptions conflict with current state.
- REVIEW_REQUIRED — transaction remains unresolved and may be explicitly persisted as review state without identity binding.
- FAILED_ROLLED_BACK — execution failed; committed state is unchanged.

## Intentionally open

- physical storage topology;
- durable transaction ledger representation;
- Global Player ID issuance;
- automatic identity resolution threshold/policy;
- final event/correction model;
- evidence storage and retention;
- delta materialization;
- scale/concurrency deployment strategy;
- final schema lock.
