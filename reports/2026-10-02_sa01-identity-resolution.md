# UCS — SA01 Identity Resolution & Cross-Clan Transfer — 2026-10-02

## Status
COMPLETE / VALIDATED

## Snapshot
- Snapshot ID: SA01
- Clan: Iranian Army [PU]
- Clan ID: CLAN-IRANIAN-ARMY-PU
- Official timestamp: 2026-10-01T20:30:00.000Z
- League: LEAGUE-WD-2026W40
- Capacity: 50
- Observed roster persisted: 49
- Authority exception: roster position 50 was explicitly excluded because the member is inactive and expected to leave the clan.
- Evidence artifact: EV-REAL-IRANIAN-ARMY-SA01
- ZIP SHA-256: aa28bc98a89c287e2644fbcced61fba1051c22298c3565ceb26ab6512c2c7df6
- Inventory count: 57
- Inventory SHA-256: 78d208344957cfb0f795eedb7c858d3a225bee1d9f8a56d29323288efb3df68a

## Identity Resolution
The Project Authority explicitly authorized cross-clan identity resolution for SA01 using the approved Fingerprint and Snapshot Import contracts.

Final SA01 result:
- 48 observations CONFIRMED
- 1 observation CONTRADICTION / blocked
- 48 real Global Player IDs
- 35 SA01 players linked to existing Persian UNITY historical identity chains
- 13 SA01 players established as new identities
- No silent identity swap
- No negative lifetime Delta

Two historical cases were intentionally anchored from S14 rather than forcing a broken S13 boundary:
- SA01 rank 17 (Amin) uses the valid S14 identity anchor; the known S14→S15 -300 Total Kills contradiction remains excluded from the identity chain.
- SA01 rank 32 (Vk / historical Uk) uses the valid S14→S15 chain; the known S13→S14 lifetime Silver decrease remains excluded.
SA01 rank 13 (ایرانی باوقار) remains blocked because the S14→S15 boundary is hard contradictory and the SA01 comparison to the latest valid Persian UNITY observation also decreases lifetime Bronze; no Global ID was assigned.

## Membership
- Real membership episodes created: 83
- Real membership events created: 48
- 35 confirmed cross-clan transfers from Persian UNITY to Iranian Army [PU]
- 13 new-player JOIN events in Iranian Army [PU]
- No membership event was created for the blocked SA01 rank 13.

## Deltas
- Canonical SA01 delta results: 70
- 35 PLAYER_LIFETIME Total Kills deltas
- 35 LEAGUE Current League Clan Medals baselines
- Numeric negative Canonical deltas: 0
- Static Read Model numeric negative deltas: 0
- Current League Clan Medals and Profile Total Clan Medal Count remain separate scopes.

## Player History
Hi System (GP-REAL-S13-R016) now contains:
- S13::R016
- S14::R019
- S15::R018
- SA01::SA01-R14

The Player Profile therefore exposes all four Snapshot observations across both clans.

## Validation
- Foundation Validation Run 36943618715: SUCCESS
- GitHub Pages Run 36943618574: SUCCESS
- Final Product HEAD: b58dbd791dfbd7b89f7f0c793f03b41bc5b5329d

## Durable Raw Evidence
- projects/UCS/snapshots/Iranian Army [PU]/SA01.raw.json
- projects/UCS/snapshots/Iranian Army [PU]/SA01.archive-meta.json
- Raw archive commit: 5a8abab04bfc3143343efe39ebdfbd253d2b87e1

## Future Intake Rule
Every future Snapshot must compare roster/header count against captured members and explicitly report every omitted roster position before acceptance. Authority-approved exclusions must record the excluded position and reason. Silent omission is prohibited.
