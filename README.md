# Unified Clan System (UCS)

Phase 1 — Technical Design + Implementation Foundation

Project ID: UCS
Product Repository: neoshisystem/WD-Clans
Primary reference: neoshisystem/war-drone-wiki (PERSIA)
Migration cross-check: neoshisystem/WD-C-Golden (GOLDENCROWN)

## Scope of this foundation

This repository starts the UCS implementation foundation without importing PERSIA/GOLDENCROWN data.

Implemented here:
- explicit League binding against the fixed War Drone weekly game rule;
- conservative Fingerprint/Identity Resolution primitives;
- Membership lifecycle primitives that distinguish NOT_OBSERVED from LEAVE;
- metric/delta primitives with anomaly handling for monotonic lifetime metrics;
- Standard SnapshotInput validation;
- Canonical Data Model v0.1 with history/provenance invariants;
- deterministic planning primitives suitable for a future single Snapshot transaction boundary.

Not implemented yet:
- PERSIA/GOLDEN migration;
- cross-clan identity merges;
- production persistence;
- final UI/read-model integration;
- automatic identity confirmation thresholds;
- final storage/deployment topology.

The contract files in this phase are implementation-foundation v0.1 artifacts. They are not presented as a permanent schema lock.
