# UCS — SA03 Final Closure — Iranian Army [PU] — 2026-10-07

Status: SYNCED / SEALED / READY FOR NEXT AUTHORITY-SUPPLIED SNAPSHOT

## Snapshot
- Snapshot: SA03
- Clan: Iranian Army [PU]
- Clan ID: CLAN-IRANIAN-ARMY-PU
- Official timestamp: 2026-10-06T20:29:00.000Z (14 Mehr 1405, 23:59 Iran)
- League: LEAGUE-WD-2026W40
- Capacity: 50
- Ranking rows: 50
- Profile cards: 50
- ZIP inventory: 59 files = 9 Ranking + 50 Profile
- Primary registered ZIP SHA-256: 5de1394395555bb9e3a628cfd11a479490e1a2633ab58c931053a3e3939ed75d
- Inventory SHA-256: 49f93d0c741088903fe5a2b72c6751ea129c5ff7af70925f79b97e96ed2a8d38

## Re-received artifact note
A second user-uploaded SA-03.zip was received during this recovery turn.
- Secondary ZIP SHA-256: a535121206fb9ca4ccb227d74b609ea53f9f400f68222202565292af539f8240
- Inventory count: 59
- Inventory SHA-256: 49f93d0c741088903fe5a2b72c6751ea129c5ff7af70925f79b97e96ed2a8d38
- Deterministic inventory matches the primary registered SA03 evidence.
- The ZIP container hash differs, so it was NOT silently treated as byte-identical evidence and did NOT replace the primary RawExtraction.
- The secondary receipt is recorded in SA03.archive-meta.json.

## Raw archive
Primary replay archive:
projects/UCS/snapshots/Iranian Army [PU]/SA03.raw.json

Archive metadata:
projects/UCS/snapshots/Iranian Army [PU]/SA03.archive-meta.json

RawExtraction remains immutable/replayable and preserves source-semantic weapon mapping.

## Weapon semantic mapping
Locked source-semantic mapping:
- 25mm → 25mm
- Hydra → Hydra
- Hellfire → Hellfire

No Hydra/Hellfire swap was applied to SA03.

This is mandatory because the historical S13/S14/S15/SA01 inversion was corrected before SA03. Future extraction must use semantic source identity, never visual column position alone.

## Identity resolution
- 50 observations
- 48 CONFIRMED
- 2 UNRESOLVED
- 0 fabricated IDs for blocked cases
- 5 genuinely new Global Player identities were created only after the cross-clan search found no established candidate:
  - SURENA → GP-REAL-SA03-R46
  - miladbizhani → GP-REAL-SA03-R47
  - arman sh → GP-REAL-SA03-R48
  - mamad1370 → GP-REAL-SA03-R49
  - ذوالفقار → GP-REAL-SA03-R50

Previously unresolved chains closed by SA03:
- ایرانی باوقار → GP-REAL-S15-R019
- hamid.iran🇮🇷 → GP-REAL-S13-R041
- ErFaN.m279 → GP-REAL-S13-R047

Blocked and intentionally unresolved:
- SA03-R18 Falcon — Hydra 262→202 contradiction; hard monotonic gate.
- SA03-R41 mohammad — multiple lifetime decreases against the prior known chain; continuity blocked.

The historical contradiction evidence was not erased.

## Hard continuity validation
For every accepted continuity pair:
- Stage non-decreasing
- 25mm non-decreasing
- Hydra non-decreasing
- Hellfire non-decreasing
- Total Kills non-decreasing
- lifetime Bronze/Silver/Gold non-decreasing

SA03 accepted continuity produced:
- Canonical Delta Results for SA03: 86
- Negative numeric deltas: 0
- No invented baseline for genuinely new identities

## Current Product state
- Snapshots: 8
- Observations: 298
- Global Player Identities: 58 total / 56 real / 2 synthetic
- Membership Episodes: 96 total / 94 real / 2 synthetic
- Membership Events: 56 real
- Canonical Delta Results: 246
- Resolution Cases: 296

Canonical schema: PASS.
Static read-model: regenerated from the official Projection engine.
Static parity: PASS.

## Validation
- Foundation Validation Run 392: SUCCESS
- GitHub Pages deployment Run 138: SUCCESS
- Both executed against Product HEAD:
  61fa458475bef27a52783ee982f52ccf5469caf7

A previous series of CI failures was caused by stale historical test expectations after legitimate SA03 identity closure. The failing assertions were corrected without changing product data or identity logic. Final Foundation and Pages validation now pass.

## Current live Product
Repository: neoshisystem/WD-Clans
Branch: main
HEAD: 61fa458475bef27a52783ee982f52ccf5469caf7

## Next action
WAIT for the next real Project-Authority-supplied Snapshot.

Do not:
- recreate SA03 IDs;
- reopen the two blocked SA03 cases without new evidence;
- re-ingest S13/S14/S15;
- replace the primary SA03 ZIP evidence with the secondary re-packaged ZIP;
- change Hydra/Hellfire semantics.

Next real Snapshot pipeline:
ZIP SHA-256 → deterministic inventory → Ranking/Profile classification → visual extraction → immutable Memory Raw archive → roster completeness → source-scope validation → six hard monotonic checks → SnapshotInput → Canonical → Projection → Static → UI → CI → Pages → final report → checkpoint.
