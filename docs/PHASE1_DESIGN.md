# UCS Phase 1 — Technical Design + Implementation Foundation

Date: 2026-09-25
Classification: FACT / PROPOSAL / AUTHORITY DECISION / UNKNOWN

## Status

This is an implementation-foundation design. It is not a final schema lock.

## 1. Domain boundaries

Canonical domain boundaries:

- Clan: owner of Clan-scoped history.
- League: independent game-time entity.
- Snapshot: time-stamped observation container inside exactly one League.
- Observation: player state as observed in one Snapshot + Clan context.
- Global Player Identity: clan-independent identity reference.
- Membership Episode: continuous membership period of one Global Player in one Clan.
- Membership Event: lifecycle event attached to membership history.
- Resolution Case: auditable identity decision/evidence record.
- Evidence Artifact: immutable source artifact reference.

Derived boundaries:

- Delta results.
- History indexes.
- Leaderboard read models.
- Archive/report projections.

## 2. Contract statuses

The implementation uses these explicit states conservatively:

Identity:
UNRESOLVED | CANDIDATE | RESOLVED | AMBIGUOUS | NEW_IDENTITY_PENDING_AUTHORITY | REJECTED_MATCH

Membership:
JOIN | CONTINUE | NOT_OBSERVED | LEAVE | RETURN | POSSIBLE_TRANSFER | UNKNOWN_CHANGE

Metric result:
VALID | BASELINE_UNAVAILABLE | ANOMALY | UNKNOWN

No default automatic identity threshold is defined yet.

## 3. League Binding Contract v0.1

Game Rule:
Thursday 00:00 UTC boundary, continuous 7-day windows.

Required behavior:
- explicit League record supplies opaque league_id;
- League start must be Thursday 00:00 UTC;
- League end must be exactly +7 days;
- Snapshot timestamp must satisfy start <= timestamp < end;
- no Snapshot can create or redefine the League boundary;
- a late first Snapshot still binds to the already-running League;
- absence of an end Snapshot does not prevent game-time completion.

The League ID format and global/clan scope remain open decisions.

## 4. Identity Resolution Contract v0.1

Source identity is not global identity.

Resolution flow:
Observation
→ Candidate Retrieval
→ Fingerprint Comparison
→ Resolution Case
→ status

Core mechanical signals:
- stage
- weapon levels
- total kills

Supporting signals:
- lifetime medal counts
- honor/context signals when supplied
- role
- names/aliases
- temporal continuity
- membership history
- profile evidence

The library compares signals but does not invent a confirmation threshold. Confirmation requires an explicit resolution decision/policy.

## 5. Membership Event Contract v0.1

Presence and membership lifecycle are separate.

Current observation exists + prior current observation exists → CONTINUE.
Current observation exists + no prior episode → JOIN.
Current observation exists + prior ended episode → RETURN.
Current observation absent → NOT_OBSERVED.

LEAVE requires an explicit resolution decision/evidence; absence alone never upgrades itself to LEAVE in this foundation.

POSSIBLE_TRANSFER is an explicit cross-clan resolution state, not an automatic consequence of seeing the same name in another clan.

## 6. Metric / Delta Contract v0.1

Player-lifetime:
- stage
- weapon levels
- total kills
- established lifetime medal counts

Clan/League:
- current league clan medals

Membership episode:
- profile total clan medal count

Lifetime monotonic metrics:
- delta uses last valid observation;
- decrease => ANOMALY;
- no valid baseline => BASELINE_UNAVAILABLE;
- never silently reset.

Current league clan medals:
- same League: current - previous;
- new League: current value is the new League earned baseline from zero;
- no opening Snapshot required.

Profile total clan medal contribution:
- same episode + same League: current - previous;
- same episode + new League: current value;
- new episode: current value starting from zero;
- a Leave→League boundary→Return reset is a valid lifecycle reset, not a negative global metric delta.

## 7. Four required scenario checks

### Normal continuous membership
Same Global Identity + same Clan + observations in sequence:
- Membership = CONTINUE.
- Lifetime deltas use prior valid observation.
- Episode clan-medal contribution is same-League delta.
- No history is replaced.

### Clan transfer
Same resolved Global Identity appears in another Clan:
- original Clan history remains isolated;
- destination Clan begins a separate Membership Episode;
- identity remains global only when resolution is explicitly established;
- no cross-clan merge occurs from display name/rank/grid position.

### Leave → Return
Absence first yields NOT_OBSERVED.
After explicit Leave resolution, the next observed episode yields RETURN.
New episode profile total clan medals starts from zero.
Prior episode remains immutable history.

### Late / missing Snapshot around League boundary
League exists independently of capture.
A late first Snapshot binds by timestamp to the already-running League.
No opening Snapshot is required to calculate a lifetime delta when a valid prior observation exists.
No final Snapshot is required to complete the League by game time.

## 8. Evidence / provenance boundary

SnapshotInput requires source artifact identity + content hash.
Observations may reference evidence artifacts.
Resolution Cases carry the evidence references used for identity decisions.
Derived projections do not replace evidence or canonical observations.

## 9. Transaction boundary

Phase 1 foundation intentionally separates:
- pure deterministic planning/validation;
- eventual persistence.

The intended publication contract is:
one accepted SnapshotInput → one deterministic mutation plan → atomic persistence in a future persistence adapter.

Actual persistence, rollback, and deployment topology remain implementation work after the foundation.

## 10. UI

Existing PERSIA/GOLDEN UI remains the approved baseline.
No UI redesign or mutation is performed by this foundation.
Future UCS read models must adapt to approved UI behavior.
