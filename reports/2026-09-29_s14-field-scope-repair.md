# UCS — S14 Field-Scope Correction & S15 Delta Repair

- **Authority:** Project Authority
- **Task Type:** Historical Data Correction / Derived Read-Model Repair
- **Authority Status:** APPROVED
- **Mutation:** AUTHORIZED — bounded to Persian UNITY S14 → S15
- **Repair Date:** 2026-09-29
- **Final Classification:** **IN PROGRESS**
- **Checkpoint:** `REPAIR_STARTED`

## 0. Recovery / Checkpoint State

This report is the primary recovery artifact for the bounded S14 field-scope correction and S15 derived repair.

### REPAIR_STARTED
- Live Product `main` at task start: `77892ae9258f319bdbc69f35b8ab0110b422eb84`
- Live Product tree at task start: `19cb2553b15825fbaabbc35aad8fe9058959317e`
- S14 Raw Extraction before repair: `28117bdc557a284a4b408664f6f7816794c17429`
- Canonical before repair: `9c05d02a1ef9db8ac4302cacecf88f3686d99606`
- Static JSON before repair: `e5fe3a7e99c273a050cb197d6292b2812a850e4a`
- Static JS before repair: `d0ef2db97dbf7895004213128f208159154b0888`
- S14 Evidence ID: `EV-REAL-PERSIAN-UNITY-S14`
- S14 ZIP SHA-256: `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`
- S14 inventory: 58 files
- S14 inventory SHA-256: `cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be`
- S14 inventory method: SHA-256 of UTF-8 newline-joined sorted relative file paths

No source artifact is modified by this repair.

## 1. Authorized correction set

Exactly 17 S14 observations are in scope for `current_league_clan_medals` correction:

| Rank | Player | Original Stored | Correct Ranking | Profile Total |
|---:|---|---:|---:|---:|
| 9 | Liam kouhkan | 666,927 | 168,142 | 666,927 |
| 17 | I.Man | 157,793 | 145,714 | 157,793 |
| 21 | hadi.land | 525,136 | 128,106 | 525,136 |
| 26 | H03EIN | 737,297 | 98,989 | 737,297 |
| 29 | Amirhoseinifpv | 680,791 | 92,869 | 680,791 |
| 32 | Hafezi | 681,884 | 80,131 | 681,884 |
| 33 | Mohsen.es68 | 741,570 | 74,083 | 741,570 |
| 34 | Uk 🇮🇷💪 | 743,733 | 67,748 | 743,733 |
| 38 | حسن | 360,252 | 56,408 | 360,252 |
| 39 | 👑Dadashi👑 | 1,172,900 | 52,869 | 1,172,900 |
| 40 | Amin | 407,548 | 52,555 | 407,548 |
| 41 | soltoon | 780,661 | 52,345 | 780,661 |
| 42 | YALALINHO🔥 | 198,585 | 49,585 | 198,585 |
| 43 | Nouk | 482,848 | 48,308 | 482,848 |
| 45 | Mahbod_1 | 399,780 | 46,539 | 399,780 |
| 47 | حسن | 19,450 | 18,202 | 19,450 |
| 48 | ADNAN | 8,226 | 8,462 | 8,226 |

All other 33 S14 `current_league_clan_medals` values are out of scope and must remain unchanged.

## 2. Invariants

- S14 `profile_total_clan_medal_count`: unchanged for all 50.
- S14 `total_kills`: unchanged for all 50.
- Amin S14 Total Kills remains **91,455**.
- S15 Amin Total Kills remains **91,155**.
- Amin derived Total Kills anomaly remains **-300**.
- S14/S15/S13 evidence artifacts and hashes remain immutable.
- No new Global IDs.
- No Membership Event/Episode creation.
- No Canonical Delta Results.
- Fingerprint continuity mappings remain unchanged unless a validation failure proves otherwise.

## 3. Authorized downstream expectations

After correction and regeneration:

- S14 observations = 50.
- S14 current-league values present = 50.
- S14 Profile Total values present = 50.
- S14 identity status remains UNRESOLVED = 50.
- S14 → S15 continuity remains 50 continuous / 0 additions / 0 departures.
- The 13 former S15 Current League negative anomalies become valid non-negative deltas.
- Amin Total Kills remains a separate -300 ANOMALY.
- Canonical Delta Results remain 0.

## 4. Checkpoint protocol

The report will be advanced only after each state has actually completed:

- [x] REPAIR_STARTED
- [ ] S14_RAW_CORRECTION_COMPLETE
- [ ] CANONICAL_CORRECTION_COMPLETE
- [ ] PROJECTION_REGENERATED
- [ ] STATIC_REGENERATED
- [ ] VALIDATION_COMPLETE
- [ ] CI_COMPLETE
- [ ] MEMORY_SYNC_COMPLETE
- [ ] REPAIR_FINALIZED

## 6. REPAIR checkpoint — S14_RAW_CORRECTION_COMPLETE

The authorized Raw Extraction correction has completed.

- S14 Raw Extraction path: `data/real-snapshots/persian-unity/S14.raw.json`
- Before blob SHA: `28117bdc557a284a4b408664f6f7816794c17429`
- After blob SHA: `bb7e8cbf27f68db7e3487bd613432a86307c1195`
- Exactly 17 `current_league_clan_medals` values changed.
- Exactly the 17 authorized Ranking values were written.
- All 17 `profile_total_clan_medal_count` values were preserved.
- All 17 `total_kills` values were preserved.
- The 33 out-of-scope S14 Current League records were not changed by the correction operation.
- Auditable correction sidecar: `data/real-snapshots/persian-unity/S14.correction.json`
- Sidecar commit: `4fb040b125dc103355dcaab784af433448769c6a`
- Evidence artifact remains unchanged: `EV-REAL-PERSIAN-UNITY-S14` / SHA-256 `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`.

The corrected Raw Extraction remains review-state; this step did not create identity, membership, or delta results.


## 7. Checkpoint — CANONICAL_CORRECTION_COMPLETE

- Product main after Canonical correction and continuity-audit refresh: `ebea003df7aa04d9e0c7ca26a9c7bb97bf0f9438` at that stage.
- Final Canonical blob before the static-only commit: `ebea003df7aa04d9e0c7ca26a9c7bb97bf0f9438`.
- Exactly 17 S14 observations had `current_league_clan_medals` changed from the authorized original values to the verified Ranking values.
- No S14 Profile Total or Total Kills values were changed.
- S15 continuity mapping remained 50 explicit continuous candidates; no Global IDs, Membership Events or Membership Episodes were introduced; `delta_results` remained 0.

## 8. Checkpoint — PROJECTION_REGENERATED

The existing Projection contract was applied to the corrected Canonical state. The 50 S14→S15 continuity pairs remained intact.

For the 17 affected continuity baselines, the Current League comparison values were refreshed. Across the complete S15 snapshot:

- Current League derived deltas: **50 VALID / 0 ANOMALY**
- Current League valid-delta sum: **+2,258,332**
- Amin Current League: **52,555 → 52,555 = 0**
- Amin Total Kills: **91,455 → 91,155 = -300 ANOMALY**

No new Current League anomaly was introduced.

## 9. Checkpoint — STATIC_REGENERATED

- Static regeneration commit on Product main: `210606da9adb5ec5ab1f9e12112d927038fc54fb`
- Static JSON blob at current main: `d017bf1965debaf481a7fb3afcc8f4bbc2e157ab`
- Static JS blob at current main: `df77e84613c9556a14eabde58e47fb63ebf1de2c`
- The committed Static bundle contains the corrected 17 S14 Current League values and the recalculated S15 derived records.
- The first attempted static commit reconstruction exposed a rank-key formatting mistake; it was corrected before the final main commit. No source/Cannonical regression was introduced by that formatting correction.
- Static generation/deployment was not allowed to complete validation because the repository test suite failed first in both normal CI and Pages.

## 10. STOP CONDITION — CI FAILURE / REPAIR_BLOCKED

The task is now **BLOCKED** and no further repair or retry will be performed.

### CI

- Workflow: **UCS Foundation Validation**
- Run: **36568505523** (run #264)
- Job: **109406319571**
- Head: `210606da9adb5ec5ab1f9e12112d927038fc54fb`
- Result: **FAILURE**
- `npm test`: **237 passed / 1 failed / 238 total**
- First failing test: `test/static-vertical-slice.test.js:147:12`
- All later CI steps were skipped because `npm test` failed.

### GitHub Pages

- Workflow: **Deploy UCS Static Site to GitHub Pages**
- Run: **36568506593** (run #77)
- Job: **109406323239**
- Head: `210606da9adb5ec5ab1f9e12112d927038fc54fb`
- Result: **FAILURE**
- Failing step: **Validate project** (`npm test`)
- Static regeneration/deployment steps were skipped.

### Stop decision

Per task Stop Conditions, the failed CI run means the repair cannot be declared complete. No test fix, retry, or additional mutation is executed in this task.

## 11. Current Product State at Block

- Product main: `210606da9adb5ec5ab1f9e12112d927038fc54fb`
- S14 Raw Extraction: `bb7e8cbf27f68db7e3487bd613432a86307c1195`
- Canonical: `ebea003df7aa04d9e0c7ca26a9c7bb97bf0f9438`
- Static JSON: `d017bf1965debaf481a7fb3afcc8f4bbc2e157ab`
- Static JS: `df77e84613c9556a14eabde58e47fb63ebf1de2c`
- Evidence ID/hash remains `EV-REAL-PERSIAN-UNITY-S14` / `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`.
- No source artifact bytes were modified.
- Repair report itself remains the recovery artifact.
- `VALIDATION_COMPLETE`: **NOT COMPLETED**
- `CI_COMPLETE`: **completed with FAILURE**
- `MEMORY_SYNC_COMPLETE`: **NOT COMPLETED**
- `REPAIR_FINALIZED`: **NOT COMPLETED**

## 12. Final Classification

**REPAIR_BLOCKED**

The data-layer correction and derived-output preparation reached the authorized bounded mutation stage, but the repository validation gate failed. The remaining state must not be treated as a successful repair until the failing test/contract is addressed under a new authorized continuation.

## 5. Source provenance

The corrected S14 Current League field is sourced from Ranking evidence under `EV-REAL-PERSIAN-UNITY-S14`. The Profile Total field remains sourced from the corresponding Profile evidence. The correction preserves an auditable before/after record rather than silently treating the original stored value as source truth.

