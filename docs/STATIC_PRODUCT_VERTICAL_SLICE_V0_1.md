# UCS — Static Product Vertical Slice Foundation v0.1

Status: implementation foundation / draft / reversible

## Purpose

This stage establishes the first concrete product path in UCS:

Canonical State
→ Deterministic Projection
→ Static Data Bundle
→ Static UI

The stage uses one small synthetic Canonical dataset only. It does not import PERSIA or GOLDENCROWN data and does not create real player identities.

## Static data contract

The current vertical-slice transport contract is intentionally non-final.

Top-level fields:
- static_data_version: transport contract version, currently 0.1
- source: records that the bundle was produced from Canonical State and carries the current Canonical schema version
- read_model: the existing ProjectionEngine output
- provenance: aggregate Canonical and Evidence references discovered in the projected Read Models

Per-record provenance remains inside the Read Model. The top-level provenance is an index for traceability, not a replacement for record-level provenance.

The bundle is serialized with the existing deterministic stableStringify behavior. It contains no generation timestamp, randomness, network response or UI state.

## Browser/static transport

Two committed artifacts are produced from the same bundle:
- site/data/ucs-vertical-slice.json — inspectable static JSON artifact
- site/data/ucs-vertical-slice.js — browser-safe wrapper containing the same bundle

The UI loads only the local browser-safe wrapper. No fetch, backend, Node runtime, database or remote URL is required by the viewer. This wrapper exists only to make the same static payload consumable when index.html is opened directly from a local filesystem location.

## Pipeline

The generator at scripts/generate-static-vertical-slice.js:
1. reads the synthetic Canonical fixture;
2. validates Canonical State;
3. runs ProjectionEngine;
4. builds the Static Data Bundle;
5. emits deterministic JSON and browser-wrapper artifacts.

The generator contains the filesystem boundary. src/static-data.js is pure application code and does not require filesystem, GitHub, server or database access.

## Determinism

The generated JSON and browser wrapper are deterministic for identical Canonical State.

The CI contract regenerates the artifacts and fails when the committed artifacts differ.

A Canonical data change changes the generated bundle through the existing Projection layer; no second source of truth is introduced.

## Missing data and provenance

Missing/null values remain represented as null in the projected data. The UI renders null/undefined as an em dash and does not substitute zero.

Field-level provenance remains embedded in projected observations. The static bundle also retains aggregate provenance references.

## Scope boundaries

Not implemented in this stage:
- PERSIA or GOLDENCROWN migration
- historical import
- real Snapshot ingestion
- real Global Player creation
- identity resolution policy
- membership inference
- durable Evidence storage
- durable Read Model storage
- database adapter
- hosting architecture
- deployment
- permanent Read Model or Static Data schema lock

## Classification

FACT:
- WD-Clans previously had no committed UCS site/UI surface.
- Projection is the existing Canonical-only deterministic layer.
- The Static Data Bundle wraps the current Read Model without mutating Canonical State.

PROPOSAL:
- Keep this v0.1 static bundle as a reversible transport adapter until a future Read Model/UI contract review.

AUTHORITY DECISION:
- None created by this implementation.

OPEN DECISION:
- Final Read Model schema.
- UI read-model adapter contract.
- Projection versioning policy.
- Durable materialization strategy.

UNKNOWN:
- Long-term materialization scale and operational threshold.
