# UCS — SA03 Iranian Army [PU] Snapshot Import & Cross-Clan Identity Closure — 2026-10-07

## Snapshot

- Snapshot: SA03
- Clan: Iranian Army [PU]
- Clan ID: CLAN-IRANIAN-ARMY-PU
- Official timestamp: 2026-10-06T20:29:00.000Z (1405-07-14 23:59 Iran)
- League: LEAGUE-WD-2026W40
- Capacity: 50
- Ranking rows: 50
- Profile cards: 50
- ZIP files: 59 (9 ranking + 50 profile)
- ZIP SHA-256: 5de1394395555bb9e3a628cfd11a479490e1a2633ab58c931053a3e3939ed75d
- Inventory SHA-256: 49f93d0c741088903fe5a2b72c6751ea129c5ff7af70925f79b97e96ed2a8d38

## Raw registration

Memory-ai raw archive:
projects/UCS/snapshots/Iranian Army [PU]/SA03.raw.json

Archive metadata:
projects/UCS/snapshots/Iranian Army [PU]/SA03.archive-meta.json

Raw extraction commit: e0477c7b2ec559da87a892667f2353195aa1f777
Archive metadata commit: c4f2b7075b0ff2b9c983a8a66b3c2b1270f6b043

## Weapon semantic mapping

SA03 was extracted using the corrected semantic mapping:
- 25mm → 25mm
- Hydra → Hydra
- Hellfire → Hellfire

No Hydra/Hellfire swap was applied during SA03 extraction. Example ehsan:
25mm 1342 / Hydra 461 / Hellfire 74.

The prior historical inversion remains corrected in the Product canonical/static data. The game itself identifies the three systems as 25mm, Hydra 70 and Hellfire; this was used only as a secondary sanity check.

## Identity resolution

SA03:
- 50 observations
- 48 CONFIRMED
- 2 UNRESOLVED

Hard monotonic continuity was applied before accepting any name match.

Returning/continuity closure:
- 40 observations matched already-confirmed Global Player IDs.
- 3 observations closed previously-unresolved cross-clan chains using SA03 evidence:
  - rank 13 ایرانی باوقار → GP-REAL-S15-R019; S15→SA01→SA02→SA03 accepted chain. The older S14→S15 Bronze contradiction remains quarantined and was not erased.
  - rank 32 hamid.iran🇮🇷 → GP-REAL-S13-R041; S13→S14→S15→SA03.
  - rank 45 ErFaN.m279 → GP-REAL-S13-R047; S13→S14→S15→SA02→SA03.
- 5 observations are genuine new Global identities after cross-clan search found no established candidate:
  - SURENA
  - miladbizhani
  - arman sh
  - mamad1370
  - ذوالفقار
- 2 observations remain blocked/unresolved:
  - rank 18 Falcon: exact name was insufficient; Hydra fell 262→202, a hard monotonic contradiction.
  - rank 41 mohammad: multiple lifetime decreases versus the prior known Persian UNITY chain; continuity blocked.

Important: no new Global ID was created for Falcon or mohammad.

## Delta validation

- SA03 Canonical delta results: 86
- 43 resolved returning players have two deltas each (Total Kills + Current League Clan Medals).
- New players have no invented baseline delta.
- Negative deltas: 0.
- All six hard lifetime continuity fields remained non-decreasing for every accepted continuity link.

## Current Product canonical counts

- Snapshots: 8
- Observations: 298
- Global Player Identities: 58 total / 56 real / 2 synthetic
- Membership Episodes: 96 total / 94 real / 2 synthetic
- Membership Events: 56 real
- Canonical Delta Results: 246
- Resolution Cases: 296

Canonical schema validation: PASS.
Static read-model regenerated from the official Projection engine.

## Validation state

The latest Product CI run is still the final gate for closure. Historical test expectations were updated only where SA03 legitimately changed current canonical identity counts and latest Snapshot expectations. A dedicated SA03 regression test was added.

## Next

Wait for the final CI and Pages results. If both pass, mark SA03 SYNCED/SEALED and update CHECKPOINT/CURRENT_STATE/NEXT_ACTION/SHIFT_REPORT with the final heads.
