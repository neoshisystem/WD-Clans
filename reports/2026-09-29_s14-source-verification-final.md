# UCS — S15 Derived Delta Anomaly Investigation — S14 Source Verification Final

- **Authority:** Project Authority
- **Task Type:** Read-Only Source Verification / Root-Cause Confirmation
- **Authority Status:** APPROVED
- **Mutation:** NONE
- **Scope:** Persian UNITY / S14 source → S14 Raw Extraction → Canonical → S14→S15 Continuity → Derived Projection
- **Investigation Date:** 2026-09-29
- **Predecessor:** `reports/2026-09-29_s15-anomaly-root-cause-investigation.md`
- **Blocked continuation record:** `reports/2026-09-29_s15-anomaly-source-verification.md`
- **Final Classification:** **SOURCE_VERIFICATION_COMPLETE**
- **Repair Status:** **REPAIR_NOT_EXECUTED / SEPARATE AUTHORIZATION REQUIRED**

## 1. Executive Result

The original S14 evidence has now been supplied and independently verified.

The supplied `/mnt/data/S14.zip` is the exact registered S14 artifact:

- SHA-256: `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`
- Size: **73,632,879 bytes**
- Inventory: **58 files**
- Deterministic inventory SHA-256: `cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be`
- Contents: **8 Ranking screenshots + 50 Profile cards**
- Duplicate CRC groups: **0**
- All inspected images: **2340×1080**

A full source-level audit of the S14 Ranking/Profile field boundary was then performed.

The result is now **confirmed**, not merely hypothesized:

> The S14 Raw Extraction populated `current_league_clan_medals` from the Profile Total Clan Medal field on **17 of 17 source-unequal rows** instead of the Ranking Current League Clan Medal field.

Across the complete 50-member S14 source:

- **17/50** have Ranking Current League Clan Medals different from Profile Total Clan Medals.
- **33/50** have equal values.
- Stored S14 Raw Extraction has Current League == Profile Total for **50/50**.

Therefore the S14 extraction boundary collapsed two semantically distinct source fields. The first confirmed incorrect point is:

**S14 Original Source → S14 Raw Extraction, field mapping for `current_league_clan_medals`.**

This explains **all 13 S15 Current League Clan Medal ANOMALY records**. When the correct S14 Ranking values are substituted, all 13 become non-negative valid deltas.

A separate issue remains valid at source level:

- Amin / S15::R045 Total Kills: **91,455 → 91,155 = -300**
- S14 Profile source confirms **91,455**
- S15 source/Cannonical already confirmed **91,155**
- This is a distinct lifetime-metric decrease and is **not explained by the S14 medal field-scope defect**.

No S13 source is required to resolve the S14 field-scope defect or the Amin -300 source anomaly.

No Canonical, Resolution Case, Fingerprint mapping, Projection, Static Data, Snapshot, or historical raw artifact was modified.

## 2. Artifact Identity and Integrity

### Registered S14 evidence

- Evidence ID: `EV-REAL-PERSIAN-UNITY-S14`
- Source location: `user-upload:S14.zip`
- Registered ZIP SHA-256: `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`
- Registered inventory: 58 files
- Registered inventory SHA-256: `cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be`

### Supplied S14 artifact

- Exact filename: `S14.zip`
- Exact SHA-256: `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`
- Exact size: **73,632,879 bytes**
- Exact deterministic inventory hash: `cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be`
- Exact inventory count: **58**
- Duplicate CRC groups: **0**

The artifact therefore has **exact registered S14 identity**. It is not S15 and does not create a second Evidence artifact.

## 3. Source Classification

The archive was classified as:

- Ranking screenshots: **8**
- Profile cards: **50**
- Duplicate ranking screenshots: **0**

Ranking screenshots observed:

1. `Screenshot_20260927_224922_War Drone.jpg`
2. `Screenshot_20260927_224939_War Drone.jpg`
3. `Screenshot_20260927_224950_War Drone.jpg`
4. `Screenshot_20260927_224958_War Drone.jpg`
5. `Screenshot_20260927_225008_War Drone.jpg`
6. `Screenshot_20260927_225018_War Drone.jpg`
7. `Screenshot_20260927_225026_War Drone.jpg`
8. `Screenshot_20260927_225041_War Drone.jpg`

The full Ranking set was inspected, and the complete 50-member Profile set was used for source field verification.

## 4. Contracted Field Scope

The S14 Raw Extraction declares:

### Ranking

- rank
- display_name
- role
- stage
- **current_league_clan_medals**

### Profile

- total_kills
- **profile_total_clan_medal_count**
- last_online
- weapon_levels
- lifetime_medals

The source screenshots confirm that these two Clan Medal fields are semantically distinct.

## 5. Complete S14 Field-Scope Audit

The full 50-member S14 source was checked.

### 17 source-unequal cases

In every row below:

**Source Ranking Current League != Source Profile Total**

and the stored S14 Raw Extraction value for `current_league_clan_medals` equals the **Profile Total**, demonstrating the field-scope error.

| Rank | Player | Source Ranking Current League | Source Profile Total | Stored S14 Raw Current | Ranking source | Profile source |
|---:|---|---:|---:|---:|---|---|
| 9 | Liam kouhkan | 168,142 | 666,927 | 666,927 | `Screenshot_20260927_224939_War Drone.jpg` | `Screenshot_20260927_225208_War Drone.jpg` |
| 17 | I.Man | 145,714 | 157,793 | 157,793 | `Screenshot_20260927_224950_War Drone.jpg` | `Screenshot_20260927_225310_War Drone.jpg` |
| 21 | hadi.land | 128,106 | 525,136 | 525,136 | `Screenshot_20260927_224950_War Drone.jpg` | `Screenshot_20260927_225340_War Drone.jpg` |
| 26 | H03EIN | 98,989 | 737,297 | 737,297 | `Screenshot_20260927_224958_War Drone.jpg` | `Screenshot_20260927_225417_War Drone.jpg` |
| 29 | Amirhoseinifpv | 92,869 | 680,791 | 680,791 | `Screenshot_20260927_225008_War Drone.jpg` | `Screenshot_20260927_225439_War Drone.jpg` |
| 32 | Hafezi | 80,131 | 681,884 | 681,884 | `Screenshot_20260927_225008_War Drone.jpg` | `Screenshot_20260927_225518_War Drone.jpg` |
| 33 | Mohsen.es68 | 74,083 | 741,570 | 741,570 | `Screenshot_20260927_225008_War Drone.jpg` | `Screenshot_20260927_225526_War Drone.jpg` |
| 34 | Uk 🇮🇷💪 | 67,748 | 743,733 | 743,733 | `Screenshot_20260927_225008_War Drone.jpg` | `Screenshot_20260927_225533_War Drone.jpg` |
| 38 | حسن | 56,408 | 360,252 | 360,252 | `Screenshot_20260927_225018_War Drone.jpg` | `Screenshot_20260927_225615_War Drone.jpg` |
| 39 | 👑Dadashi👑 | 52,869 | 1,172,900 | 1,172,900 | `Screenshot_20260927_225018_War Drone.jpg` | `Screenshot_20260927_225623_War Drone.jpg` |
| 40 | Amin | 52,555 | 407,548 | 407,548 | `Screenshot_20260927_225018_War Drone.jpg` | `Screenshot_20260927_225631_War Drone.jpg` |
| 41 | soltoon | 52,345 | 780,661 | 780,661 | `Screenshot_20260927_225018_War Drone.jpg` | `Screenshot_20260927_225638_War Drone.jpg` |
| 42 | YALALINHO🔥 | 49,585 | 198,585 | 198,585 | `Screenshot_20260927_225018_War Drone.jpg` | `Screenshot_20260927_225653_War Drone.jpg` |
| 43 | Nouk | 48,308 | 482,848 | 482,848 | `Screenshot_20260927_225026_War Drone.jpg` | `Screenshot_20260927_225700_War Drone.jpg` |
| 45 | Mahbod_1 | 46,539 | 399,780 | 399,780 | `Screenshot_20260927_225026_War Drone.jpg` | `Screenshot_20260927_225714_War Drone.jpg` |
| 47 | حسن | 18,202 | 19,450 | 19,450 | `Screenshot_20260927_225026_War Drone.jpg` | `Screenshot_20260927_225732_War Drone.jpg` |
| 48 | ADNAN | 8,462 | 8,226 | 8,226 | `Screenshot_20260927_225026_War Drone.jpg` | `Screenshot_20260927_225738_War Drone.jpg` |

### Remaining 33/50

The remaining **33** S14 members were source-checked and their Ranking Current League value equals their Profile Total value. Their stored Raw Extraction values therefore do not reveal a cross-field discrepancy on those rows.

Important: this does **not** invalidate the 17-row finding. It shows that the extraction defect is visible only where the two source fields differ.

## 6. S14 Raw Extraction Cross-Check

Product file:

`data/real-snapshots/persian-unity/S14.raw.json`

Blob SHA:

`28117bdc557a284a4b408664f6f7816794c17429`

The raw extraction records:

- 50/50 current-league values equal to profile-total values.
- 17 rows where this equality is contradicted by the original source.
- The 17 incorrect stored Current League values exactly equal the corresponding source Profile Total values.

This is direct source-to-raw evidence of a field-mapping defect.

## 7. S14 → S15 Continuity Audit

The 14 existing S15 anomaly cases remain paired to the same S14 observations.

All 14 Resolution Cases retain:

- `assessment_state = CONTINUOUS_CANDIDATE`
- explicit S14 prior Observation references
- same Clan
- adjacent snapshots
- same League
- strong core fingerprint continuity through Stage / 25mm / Hellfire / Hydra / Total Kills

The source verification changes the interpretation of the metric baseline; it does **not** invalidate the continuity mapping.

No identity was confirmed and no Membership Event/Episode was created.

## 8. Exact S15 Current-League Anomaly Resolution

The 13 S15 Current League ANOMALY records were recalculated using the **actual S14 Ranking Current League source values**.

| S15 Observation | Player | Wrong stored S14 Current | Correct S14 source Current | S15 Current | Previously derived Δ | Correct Δ | Result |
|---|---|---:|---:|---:|---:|---:|---|
| S15::R012 | Liam kouhkan | 666,927 | 168,142 | 205,716 | -461,211 | **+37,574** | ANOMALY REMOVED |
| S15::R027 | H03EIN | 737,297 | 98,989 | 131,202 | -606,095 | **+32,213** | ANOMALY REMOVED |
| S15::R029 | Amirhoseinifpv | 680,791 | 92,869 | 113,266 | -567,525 | **+20,397** | ANOMALY REMOVED |
| S15::R031 | Mahbod_1 | 399,780 | 46,539 | 105,090 | -294,690 | **+58,551** | ANOMALY REMOVED |
| S15::R032 | Mohsen.es68 | 741,570 | 74,083 | 102,143 | -639,427 | **+28,060** | ANOMALY REMOVED |
| S15::R034 | Hafezi | 681,884 | 80,131 | 100,236 | -581,648 | **+20,105** | ANOMALY REMOVED |
| S15::R035 | Uk 🇮🇷💪 | 743,733 | 67,748 | 95,998 | -647,735 | **+28,250** | ANOMALY REMOVED |
| S15::R039 | YALALINHO🔥 | 198,585 | 49,585 | 73,440 | -125,145 | **+23,855** | ANOMALY REMOVED |
| S15::R041 | soltoon | 780,661 | 52,345 | 67,810 | -712,851 | **+15,465** | ANOMALY REMOVED |
| S15::R042 | Nouk | 482,848 | 48,308 | 67,443 | -415,405 | **+19,135** | ANOMALY REMOVED |
| S15::R043 | حسن | 360,252 | 56,408 | 66,635 | -293,617 | **+10,227** | ANOMALY REMOVED |
| S15::R044 | 👑Dadashi👑 | 1,172,900 | 52,869 | 54,869 | -1,118,031 | **+2,000** | ANOMALY REMOVED |
| S15::R045 | Amin | 407,548 | 52,555 | 52,555 | -354,993 | **0** | ANOMALY REMOVED |

This resolves the entire 13-case Current League anomaly set.

## 9. Amin — Separate Total Kills Anomaly

Amin (S15::R045) has two distinct metric outcomes.

### Current League Clan Medals

- S14 source Ranking: **52,555**
- S15 source/Canonical: **52,555**
- Correct delta: **0**
- The previously reported -354,993 was entirely caused by the S14 field-scope extraction defect.

### Total Kills

- S14 Profile source: **91,455**
- S15 source/Canonical: **91,155**
- Delta: **-300**

This -300 is a separate lifetime-metric anomaly.

The S14 source verification therefore upgrades the Amin Total Kills case from source-unresolved to:

**SOURCE_CONFIRMED_ANOMALY**

It remains separate from the medal-field correction.

## 10. Projection Audit

Product file:

`src/projection.js`

Current blob SHA:

`35fb3724677d02a190eebc7be2d03fc048083c4d`

The relevant logic remains correct:

- Snapshots are ordered by official timestamp / Clan / sequence.
- The previous Snapshot is selected per Clan.
- Current and previous Observations are taken from the continuity pair.
- Same-League comparison uses the two Snapshot League IDs.
- Current League metric reads `current_league_clan_medals` from Canonical Observation.
- Lifetime Total Kills reads `total_kills` from Canonical Observation.
- Delta calculation is `current_value - previous_value`.
- Negative same-League result becomes `ANOMALY / monotonic_metric_decreased`.
- There is no hidden clamp or normalization that creates these values.

Therefore Projection is **not** the root cause. It faithfully projected the incorrect S14 Canonical baseline.

## 11. Source → Raw → Canonical → Projection Chain

### Confirmed first-bad boundary

**Original S14 Source → S14 Raw Extraction**

The defect is field selection/mapping for `current_league_clan_medals`.

### Downstream state

- S14 Canonical values reflect the already-stored Raw Extraction.
- S14→S15 continuity pairing remains valid.
- Projection correctly subtracts the stored S14 baseline.
- The resulting 13 negative Current League deltas are therefore downstream manifestations of the S14 ingestion error.

No evidence was found for:

- Snapshot ID swap
- Observation ID reuse across Snapshots
- S15 values written backward into S14
- Projection mutation during calculation
- wrong League boundary
- cross-Snapshot data corruption

## 12. League Boundary

S13:

- `2026-09-26T19:30:00.000Z`
- `LEAGUE-WD-2026W39`

S14:

- `2026-09-27T19:30:00.000Z`
- `LEAGUE-WD-2026W39`

S15:

- `2026-09-28T19:30:00.000Z`
- `LEAGUE-WD-2026W39`

S14→S15 is therefore a same-League comparison. A League reset cannot explain the 13 original negative Current League deltas.

## 13. Impact Assessment

### Confirmed affected records

- **13** S15 Current League Derived ANOMALY records are false anomalies caused by the S14 field-scope extraction defect.
- **4 additional S14 field-scope defects** exist even though they did not produce S15 negative deltas:
  - rank 17 I.Man
  - rank 21 hadi.land
  - rank 47 حسن
  - rank 48 ADNAN
- **1 separate source-confirmed lifetime Total Kills anomaly** remains:
  - Amin: -300

Therefore the root issue is broader than the 13 displayed anomalies: S14 Current League extraction is incorrect on **17/50** source-unequal rows.

## 14. S13 Requirement Check

S13 source evidence was **not requested**.

Reason:

The current S14 artifact directly establishes:

1. the correct source field for S14 Current League Clan Medals;
2. the complete 17-row field-scope mismatch set;
3. the correct S14 baselines for all 13 affected S15 Current League anomalies;
4. the correct S14 Amin Total Kills source.

No unresolved question necessary for this root-cause classification depends on S13.

## 15. Repair Boundary — NOT EXECUTED

This investigation is read-only.

A separate explicitly authorized historical correction task is required before any data-layer repair.

That future task should, at minimum:

1. preserve the original S14 ZIP and current Evidence identity;
2. create an auditable correction/supersession record rather than silently rewriting history;
3. correct S14 `current_league_clan_medals` from the Ranking field for the 17 source-unequal rows;
4. retain the confirmed S14 Profile Total values as `profile_total_clan_medal_count`;
5. preserve Amin S14 Total Kills = 91,455;
6. validate the complete 50-row S14 Current League field before commit;
7. regenerate derived outputs only after Canonical correction;
8. confirm that all 13 Current League negative deltas disappear;
9. preserve Amin Total Kills -300 as a remaining anomaly;
10. run Product validation / CI / documentation synchronization;
11. update Memory under a new corrective checkpoint.

The four non-anomaly S14 field-scope defects must not be omitted from the correction merely because they did not trigger a negative S15 delta.

## 16. Mutation Record

- S14 ZIP: **READ ONLY**
- S14 Raw Extraction: **NOT MODIFIED**
- S14 Canonical: **NOT MODIFIED**
- S15 Canonical: **NOT MODIFIED**
- Resolution Cases: **NOT MODIFIED**
- Fingerprint mappings: **NOT MODIFIED**
- Membership: **NOT MODIFIED**
- Projection code: **NOT MODIFIED**
- Static Data: **NOT MODIFIED**
- Re-ingestion: **NONE**
- Historical overwrite: **NONE**
- Repair: **NONE**

## 17. Final Classification

**SOURCE_VERIFICATION_COMPLETE**

Sub-classification:

- **13 Current League S15 anomalies:** confirmed S14 extraction-induced anomalies; correct source deltas are non-negative.
- **4 additional S14 Current League source-mapping defects:** confirmed.
- **Amin Total Kills -300:** source-confirmed independent lifetime anomaly.
- **Projection:** not root cause.
- **Continuity mapping:** remains valid.
- **S13:** not required for this investigation.
- **Repair:** pending a separate explicit authorization.

This report is a documentation/evidence record only. No Product data correction was executed.
