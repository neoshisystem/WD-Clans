# UCS — S15 Derived Delta Anomaly Root-Cause Investigation

- **From:** Project Authority
- **To:** CR-02
- **Project:** Unified Clan System (UCS)
- **Scope:** Persian UNITY / S13 → S14 → S15
- **Task Type:** Read-Only Root-Cause Investigation
- **Authority Status:** APPROVED
- **Mutation:** NONE
- **Investigation Date:** 2026-09-29
- **Final Classification:** **INPUT_REQUIRED**
- **Current Status:** **INVESTIGATION_COMPLETE_PENDING_REPAIR**

## 1. Executive finding

The investigation does **not** support a Projection bug or a continuity-pair failure as the dominant cause.

The strongest cross-case signal is a **S14 field-scope problem in the stored baseline for `current_league_clan_medals`**:

- S14 declares `current_league_clan_medals` as a Ranking field and `profile_total_clan_medal_count` as a Profile field.
- In the stored S14 raw extraction, **all 50/50 members have current-league Clan Medals exactly equal to Profile Total Clan Medal Count**.
- S15 demonstrates that these two fields are semantically distinct: **37/50** S15 records are unequal, and the Ranking/Profile screenshots visibly show different values for those records.
- Of the 13 S15 current-league anomaly cases, **12** are in that S15 unequal subset. Liam kouhkan is the exception because S15 current-league and profile-total happen to be equal.
- A separate S15 non-anomalous example, R020 (I.Man), also has current-league != profile-total, confirming that inequality is normal and field separation exists in the source.

Therefore the dominant indicated pattern is:

> **S14 stored current-league values appear to have been populated from the Profile Total Clan Medal field rather than the Ranking Current League Clan Medal field.**

However, the original S14 ZIP/screenshots are **not available in the current repository/environment**. The S14 raw extraction and historical report are available, but they are not the original source evidence requested by this task. Under the task's fail-closed rule, the primary classification for every affected case is therefore **INPUT_REQUIRED**, not a claimed confirmed root cause.

The S15 source evidence **is available and was inspected**. S15 source values match the corresponding Canonical values for all investigated anomaly fields.

## 2. Verified current product baseline

- Product repository: `neoshisystem/WD-Clans`
- Branch: `main`
- Current Product HEAD: `48867f4b6a869268be6262d45a05778575dbec38`
- Canonical SHA: `9c05d02a1ef9db8ac4302cacecf88f3686d99606`
- S14 raw checkpoint SHA: `28117bdc557a284a4b408664f6f7816794c17429`
- S15 raw checkpoint SHA: `5c27ae00674f364baab12c5361d24c774468dcc5`

No Canonical, Resolution Case, Fingerprint, Projection, Static, S13, S14, or S15 mutation was performed.

## 3. League / temporal boundary verification

Live Canonical records show:

| Snapshot | Timestamp | League |
|---|---|---|
| S13 | 2026-09-26T19:30:00.000Z | LEAGUE-WD-2026W39 |
| S14 | 2026-09-27T19:30:00.000Z | LEAGUE-WD-2026W39 |
| S15 | 2026-09-28T19:30:00.000Z | LEAGUE-WD-2026W39 |

S14 and S15 are therefore in the **same League ID**. A League reset is not a valid explanation for the observed S14→S15 current-league decreases.

## 4. Continuity-pair verification

All 14 anomaly records were checked against the already recorded S14→S15 Fingerprint review metadata in Canonical Resolution Cases.

All 14 cases have:

- `assessment_state = CONTINUOUS_CANDIDATE`
- an explicit prior Observation reference
- same Clan
- adjacent Snapshots
- same League
- strong Core fingerprint continuity through Stage / 25mm / Hellfire / Hydra / Total Kills
- supporting lifetime-medal / role / rank / display-name evidence as recorded in the Resolution Case

For this investigation the pair classification is:

**CONTINUOUS_WITH_METRIC_ANOMALY**

for all 14 cases.

The continuity evidence does not indicate that the anomalies were created by a wrong pair. The Liam case contains an additional metric contradiction, but the Core fingerprint remains strongly continuous.

## 5. Projection / calculation audit

Current `src/projection.js` SHA: `35fb3724677d02a190eebc7be2d03fc048083c4d`.

The relevant implementation was inspected.

### Previous/current Observation selection

`projectSnapshotDeltaResults()` orders Snapshots by official timestamp / Clan / sequence and keeps the immediately previous Snapshot per Clan in `previousByClan`.

For each continuity pair it takes:

- current Observation = pair.currentObservation
- previous Observation = pair.previousObservation

### League comparison

The implementation uses:

`sameLeague = previousSnapshot.league_id === snapshot.league_id`

### Metrics

The two relevant metrics are read directly from Canonical:

- `total_kills`
- `current_league_clan_medals`

### Calculation

The implementation performs:

`delta = current_value - previous_value`

There is no hidden normalization, conversion, or clamping before subtraction.

### ANOMALY rule

When a same-League metric produces a negative result:

`delta < 0` → `status = ANOMALY`, `reason = monotonic_metric_decreased`

For Current League Clan Medals, a different-League condition would instead use current value against a zero baseline. That condition does not apply to S14→S15.

**Projection conclusion:** the arithmetic and baseline-selection logic are consistent with the observed results. The Projection is faithfully exposing the discrepancy already present in Canonical Observation values.

Primary Projection root cause classification for the investigated cases: **not supported by evidence**.

## 6. Cross-snapshot storage / corruption audit

The stored S14 and S15 records preserve distinct Snapshot-local Observation IDs and source-member keys. The S15 values used by the anomaly calculations are present independently in S15 raw extraction and S15 Canonical.

The investigation found no evidence that:

- S15 values were written backward into S14;
- Snapshot IDs were swapped;
- Observation IDs were reused across Snapshots;
- S15 source values were copied into S14;
- the Projection mutated Canonical while calculating deltas.

The critical S14 issue is instead the **content of the stored S14 extraction itself**: the current-league and profile-total fields are identical across all 50 S14 members.

## 7. Field-scope verification

The historical S14 ingestion contract recorded:

- Ranking fields: rank, display name, role, stage, **current_league_clan_medals**
- Profile fields: total kills, **profile_total_clan_medal_count**, last online, weapon levels, lifetime medals

Yet the S14 stored raw extraction contains:

- **50/50:** `current_league_clan_medals == profile_total_clan_medal_count`

This is not merely a property of the 13 anomalies. It is a **whole-Snapshot pattern**.

By contrast, S15 contains:

- **37/50** members where current-league != profile-total
- **13/50** members where they are equal

Those S15 inequalities are directly visible in the original Ranking/Profile source screenshots and are represented in Canonical.

This establishes that the two fields are semantically separable in the source and that S14's all-50 equality is abnormal enough to be treated as a strong extraction/field-scope warning.

## 8. Historical chain observations

Where the player can be traced into S13, the historical raw data also shows that Current League Clan Medals and Profile Total Clan Medal Count are distinct fields. Representative S13 stored examples:

| Player | S13 Current League | S13 Profile Total |
|---|---:|---:|
| Liam kouhkan | 126,745 | 625,538 |
| Amirhoseinifpy | 72,585 | 660,507 |
| Mahbod_1 | 39,401 | 392,642 |
| Mohsen.es68 | 45,085 | 712,572 |
| Hafezi | 69,209 | 671,462 |
| YALALINHO🔥 | 36,287 | 185,287 |
| Nouk | 39,405 | 473,945 |
| حسن | 37,469 | 31,313 |
| 👑Dadashi👑 | 50,891 | 1,178,922 |
| Amin | 29,702 | 384,695 |

These S13 values are additional evidence that the two metrics have different scopes. They are not a substitute for the unavailable original S14 source.

## 9. Per-case investigation table

**Source verification rule:** S14 original evidence is unavailable; therefore S14 cannot receive `EXTRACTION_VALUE_CONFIRMED`. S15 original evidence is available and inspected.

| S15 Observation | S14 Observation | Pair Status | Source Verified | Field Scope | Calculation | Primary Root Cause | Confidence |
|---|---|---|---|---|---|---|---|
| S15::R012 | S14::R009 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current/profile both 666,927; S15 both 205,716. S14 declared Ranking/Profile separation but stored values are identical. | 205,716 - 666,927 = **-461,211** | **INPUT_REQUIRED** | MEDIUM |
| S15::R027 | S14::R026 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=737,297 equals profile total; S15 current=131,202, profile=769,510. | 131,202 - 737,297 = **-606,095** | **INPUT_REQUIRED** | MEDIUM |
| S15::R029 | S14::R029 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=680,791 equals profile total; S15 current=113,266, profile=701,188. | 113,266 - 680,791 = **-567,525** | **INPUT_REQUIRED** | MEDIUM |
| S15::R031 | S14::R045 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=399,780 equals profile total; S15 current=105,090, profile=458,331. | 105,090 - 399,780 = **-294,690** | **INPUT_REQUIRED** | MEDIUM |
| S15::R032 | S14::R033 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=741,570 equals profile total; S15 current=102,143, profile=769,630. | 102,143 - 741,570 = **-639,427** | **INPUT_REQUIRED** | MEDIUM |
| S15::R034 | S14::R032 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=681,884 equals profile total; S15 current=100,236, profile=701,989. | 100,236 - 681,884 = **-581,648** | **INPUT_REQUIRED** | MEDIUM |
| S15::R035 | S14::R034 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=743,733 equals profile total; S15 current=95,998, profile=771,983. | 95,998 - 743,733 = **-647,735** | **INPUT_REQUIRED** | MEDIUM |
| S15::R039 | S14::R042 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=198,585 equals profile total; S15 current=73,440, profile=222,440. | 73,440 - 198,585 = **-125,145** | **INPUT_REQUIRED** | MEDIUM |
| S15::R041 | S14::R041 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=780,661 equals profile total; S15 current=67,810, profile=796,126. | 67,810 - 780,661 = **-712,851** | **INPUT_REQUIRED** | MEDIUM |
| S15::R042 | S14::R043 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=482,848 equals profile total; S15 current=67,443, profile=501,983. | 67,443 - 482,848 = **-415,405** | **INPUT_REQUIRED** | MEDIUM |
| S15::R043 | S14::R038 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=360,252 equals profile total; S15 current=66,635, profile=370,479. | 66,635 - 360,252 = **-293,617** | **INPUT_REQUIRED** | MEDIUM |
| S15::R044 | S14::R039 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=1,172,900 equals profile total; S15 current=54,869, profile=1,174,900. | 54,869 - 1,172,900 = **-1,118,031** | **INPUT_REQUIRED** | MEDIUM |
| S15::R045 | S14::R040 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 INPUT_REQUIRED; S15 CONFIRMED | S14 current=407,548 equals profile total; S15 current=52,555, profile=407,548. | Current medals: 52,555 - 407,548 = **-354,993**; kills: 91,155 - 91,455 = **-300** | **INPUT_REQUIRED** | MEDIUM |

## 10. Per-case source verification details

### S15::R012 / S14::R009 — Liam kouhkan

**S14 stored extraction (original source unavailable):**
- Evidence: `EV-REAL-PERSIAN-UNITY-S14`
- Stored raw checkpoint: `data/real-snapshots/persian-unity/S14.raw.json`
- Declared current-league source field: Ranking / `current_league_clan_medals` = 666,927
- Profile Total field: Profile / `profile_total_clan_medal_count` = 666,927
- Total Kills = 163,012
- Original S14 screenshot/ZIP: **INPUT_REQUIRED — ORIGINAL_EVIDENCE_UNAVAILABLE**

**S15 original source inspected:**
- Ranking screenshot: `Screenshot_20260928_224152_War Drone.jpg`
- Profile screenshot: `Screenshot_20260928_224431_War Drone.jpg`
- Ranking Current League Clan Medals = 205,716
- Profile Total Clan Medal Count = 205,716
- Profile Total Kills = 172,189
- Canonical values match these S15 source observations.

**Special finding:** Liam is the one current-league anomaly for which S15 current and profile values are equal. The S14 all-50 field-scope pattern therefore cannot by itself establish whether Liam's complete decrease is extraction scope, genuine source behavior, or another source-level discrepancy. It remains INPUT_REQUIRED.

### S15::R027 / S14::R026 — H03E1N → H03EIN

**S14 stored:** current=737,297; profile total=737,297; kills=107,394. Original source unavailable.

**S15 original source inspected:**
- Ranking screenshot for current-league value: `Screenshot_20260928_224206_War Drone.jpg`
- Profile screenshot: `Screenshot_20260928_224626_War Drone.jpg`
- Current League = 131,202
- Profile Total = 769,510
- Total Kills = 109,472
- Canonical values match source.

The S15 profile total increased by 32,213 while the S15 current-league value decreased by 606,095 from the stored S14 baseline. This is strongly consistent with a wrong S14 field scope, but the original S14 source must be inspected before classifying that root cause as confirmed.

### S15::R029 / S14::R029 — Amirhoseinifpy → Amirhoseinifpv

**S14 stored:** current=680,791; profile total=680,791; kills=119,235. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224206_War Drone.jpg`
- Profile: `Screenshot_20260928_224638_War Drone.jpg`
- Current League = 113,266
- Profile Total = 701,188
- Total Kills = 120,399
- Canonical values match source.

### S15::R031 / S14::R045 — Mahbod_1

**S14 stored:** current=399,780; profile=399,780; kills=50,506. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224212_War Drone.jpg`
- Profile: `Screenshot_20260928_224651_War Drone.jpg`
- Current League = 105,090
- Profile Total = 458,331
- Total Kills = 51,334
- Canonical values match source.

### S15::R032 / S14::R033 — Mohsen.es68

**S14 stored:** current=741,570; profile=741,570; kills=184,082. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224212_War Drone.jpg`
- Profile: `Screenshot_20260928_224658_War Drone.jpg`
- Current League = 102,143
- Profile Total = 769,630
- Total Kills = 186,186
- Canonical values match source.

### S15::R034 / S14::R032 — Hafezi

**S14 stored:** current=681,884; profile=681,884; kills=109,051. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224218_War Drone.jpg`
- Profile: `Screenshot_20260928_224712_War Drone.jpg`
- Current League = 100,236
- Profile Total = 701,989
- Total Kills = 109,916
- Canonical values match source.

### S15::R035 / S14::R034 — Uk 🇮🇷💪

**S14 stored:** current=743,733; profile=743,733; kills=131,660. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224218_War Drone.jpg`
- Profile: `Screenshot_20260928_224719_War Drone.jpg`
- Current League = 95,998
- Profile Total = 771,983
- Total Kills = 133,004
- Canonical values match source.

### S15::R039 / S14::R042 — YALALINHO🔥

**S14 stored:** current=198,585; profile=198,585; kills=153,608. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224228_War Drone.jpg`
- Profile: `Screenshot_20260928_224753_War Drone.jpg`
- Current League = 73,440
- Profile Total = 222,440
- Total Kills = 155,631
- Canonical values match source.

### S15::R041 / S14::R041 — soltoon → ♕soltoon♕

**S14 stored:** current=780,661; profile=780,661; kills=144,287. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224233_War Drone.jpg`
- Profile: `Screenshot_20260928_224812_War Drone.jpg`
- Current League = 67,810
- Profile Total = 796,126
- Total Kills = 145,252
- Canonical values match source.

### S15::R042 / S14::R043 — Nouk

**S14 stored:** current=482,848; profile=482,848; kills=108,547. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224233_War Drone.jpg`
- Profile: `Screenshot_20260928_224818_War Drone.jpg`
- Current League = 67,443
- Profile Total = 501,983
- Total Kills = 109,737
- Canonical values match source.

### S15::R043 / S14::R038 — حسن

**S14 stored:** current=360,252; profile=360,252; kills=168,127. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224233_War Drone.jpg`
- Profile: `Screenshot_20260928_224843_War Drone.jpg`
- Current League = 66,635
- Profile Total = 370,479
- Total Kills = 168,420
- Canonical values match source.

### S15::R044 / S14::R039 — 👑Dadashi👑

**S14 stored:** current=1,172,900; profile=1,172,900; kills=217,535. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224233_War Drone.jpg`
- Profile: `Screenshot_20260928_224852_War Drone.jpg`
- Current League = 54,869
- Profile Total = 1,174,900
- Total Kills = 217,535
- Canonical values match source.

### S15::R045 / S14::R040 — Amin

**S14 stored:** current=407,548; profile=407,548; kills=91,455. Original source unavailable.

**S15 original source inspected:**
- Ranking: `Screenshot_20260928_224233_War Drone.jpg`
- Profile: `Screenshot_20260928_224903_War Drone.jpg`
- Current League = 52,555
- Profile Total = 407,548
- Total Kills = 91,155
- Canonical values match source.

The Amin case is therefore especially clear about source scope on S15: Ranking and Profile provide materially different Clan Medal values. The -300 Total Kills result is separate from the medal-field scope issue and cannot be resolved without the original S14 source.

## 11. Special-case conclusions

### Liam kouhkan

The Fingerprint pair is strongly continuous:

- Stage 28 → 28
- 25mm 726 → 732
- Hellfire 224 → 224
- Hydra 87 → 89
- Total Kills 163,012 → 172,189
- Lifetime medals unchanged at Bronze 3 / Silver 3 / Gold 2
- Same Clan / same League / adjacent Snapshots

The suspicious values are:

- Current League Clan Medals: 666,927 → 205,716
- Profile Total Clan Medal Count: 666,927 → 205,716

Both S14 values are equal in the stored extraction, and both S15 values are equal in the original source.

**Classification:** INPUT_REQUIRED.

The original S14 screenshot is required to decide whether the 666,927 S14 current-league value was a field-scope extraction error or a genuine source value.

### Amin

The Fingerprint pair is strongly continuous:

- Stage 43 → 43
- 25mm 762 → 762
- Hellfire 307 → 307
- Hydra 60 → 60
- role unchanged
- Display Name unchanged
- same rank-adjacent continuity pattern recorded by the Fingerprint review

Stored/source values:

- Total Kills: 91,455 → 91,155 = **-300**
- Current League Clan Medals: 407,548 → 52,555 = **-354,993**
- Profile Total Clan Medal Count: 407,548 → 407,548 = **0**

S15 source confirms all three S15 values directly. The medal contradiction is consistent with the broader S14 field-scope signal. The -300 kills anomaly is independent and remains unresolved until S14 original evidence is inspected.

**Classification:** INPUT_REQUIRED.

## 12. Cross-case pattern

The 14 anomalies are not best understood as 14 unrelated player-level failures.

The pattern separates into two categories:

### A. Thirteen Current League Clan Medal anomalies

These contain a strong common signal:

- S14 stored current-league == S14 stored profile-total for every affected player.
- This equality is not limited to affected players; it holds **50/50 across all S14 members**.
- In S15, current-league and profile-total are normally separable.
- 12/13 current-league anomaly cases have S15 current-league != profile-total.
- For those 12, the S15 Profile Total generally increased or held while the S15 Ranking Current League value is much lower.
- Same-League status rules out explaining these decreases as a League reset.

This pattern strongly indicates a **S14 field-scope extraction defect**.

### B. One Total Kills anomaly

Amin's -300 Total Kills does not follow the medal-field pattern.

- The S15 source has 91,155 kills.
- The Projection computes -300 correctly from the stored S14/S15 values.
- No evidence shows the S15 kill value was derived from the wrong medal field.
- The original S14 Profile source is missing.

This case must remain INPUT_REQUIRED.

## 13. Primary classifications

Because the original S14 source evidence is unavailable:

- **S15::R012:** INPUT_REQUIRED
- **S15::R027:** INPUT_REQUIRED
- **S15::R029:** INPUT_REQUIRED
- **S15::R031:** INPUT_REQUIRED
- **S15::R032:** INPUT_REQUIRED
- **S15::R034:** INPUT_REQUIRED
- **S15::R035:** INPUT_REQUIRED
- **S15::R039:** INPUT_REQUIRED
- **S15::R041:** INPUT_REQUIRED
- **S15::R042:** INPUT_REQUIRED
- **S15::R043:** INPUT_REQUIRED
- **S15::R044:** INPUT_REQUIRED
- **S15::R045:** INPUT_REQUIRED (covers both medal and Total Kills anomalies)

The **provisional indicated root-cause signal** is:

- 12 current-league anomalies: **WRONG_FIELD_SCOPE** strongly indicated in S14 baseline extraction.
- Liam current-league anomaly: **WRONG_FIELD_SCOPE remains plausible but not proven; source-level ambiguity remains.**
- Amin Total Kills anomaly: **GENUINE_SOURCE_ANOMALY vs S14 extraction mismatch remains unresolved.**

These provisional signals are not promoted to the primary classification until S14 original evidence is inspected.

## 14. Historical impact

### S13

- No S13 mutation occurred.
- S13 remains a separate historical Snapshot.
- S13 stored data supplies supporting evidence that Current League Clan Medals and Profile Total Clan Medal Count are semantically distinct.
- No repair is authorized or performed by this investigation.

### S14

Potential impact is **material** if the original evidence confirms that `current_league_clan_medals` was populated from the Profile Total field.

Potentially affected layer:
- S14 Canonical Observation metric values
- downstream S15 current-league derived deltas that use S14 as baseline

No correction was applied.

### S15

- S15 source evidence matches the current S15 Canonical values for the investigated source fields.
- S15 observations remain unchanged.
- S15 continuity mappings remain unchanged.
- S15 Derived Read-Model anomalies remain unchanged.

### Continuity mapping

No evidence currently supports changing any S14→S15 pair. The Fingerprint continuity record remains the current mapping.

### Projection / Static

The Projection calculation is not the identified fault domain. Static output was not modified.

## 15. Recommended repair — NOT EXECUTED

1. Obtain the original S14 ZIP and/or the original S14 Ranking/Profile screenshots.
2. Inspect the actual source field for all affected cases, with special attention to Ranking Current League Clan Medals versus Profile Total Clan Medal Count.
3. Verify whether the S14 all-50 equality is a genuine source property or a field-scope extraction error.
4. Independently verify Amin's S14 Total Kills source value.
5. If evidence confirms an S14 extraction/field-scope error, perform a separate **authorized correction task** with immutable historical correction/supersession semantics. Do not overwrite history silently.
6. Regenerate Derived Read-Model output only after the Canonical correction is explicitly authorized.
7. Re-run validation/CI/Pages and documentation reconciliation under a new checkpoint.

No step above was executed in this investigation.

## 16. Required missing input

**INPUT_REQUIRED — ORIGINAL S14 EVIDENCE**

Required evidence:

- Original `S14.zip` if available; preferred.
- Otherwise the original S14 Ranking screenshots and Profile screenshots sufficient to verify all 14 anomaly source values.

The current Product repository contains only the S14 raw extraction checkpoint and historical report, not the original binary evidence artifact.

## 17. Final status

**INVESTIGATION_COMPLETE_PENDING_REPAIR**

The investigation established:

- continuity is not the leading fault domain;
- Projection arithmetic is correct;
- S14 field-scope contamination is strongly indicated for the Current League Medal anomalies;
- Amin's Total Kills anomaly remains a separate unresolved source question;
- no data was modified;
- no repair was executed;
- original S14 evidence is required before promoting the provisional root cause to a confirmed classification.

**Final Classification: INPUT_REQUIRED**
