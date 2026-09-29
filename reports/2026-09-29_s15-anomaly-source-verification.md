# UCS — S15 Anomaly Investigation — S14 Evidence Continuation & Full Chain Verification

- **Authority:** Project Authority
- **Task Type:** Read-Only Source Verification / Root-Cause Continuation
- **Authority Status:** APPROVED
- **Mutation:** NONE
- **Scope:** Persian UNITY / S13 → S14 → S15
- **Investigation date:** 2026-09-29
- **Primary predecessor report:** `reports/2026-09-29_s15-anomaly-root-cause-investigation.md`
- **Final Classification:** **INPUT_REQUIRED**
- **Status:** **INVESTIGATION_COMPLETE_PENDING_REPAIR**

## 0. Recovery / checkpoint log

| Checkpoint | State | Evidence |
|---|---|---|
| INVESTIGATION_STARTED | COMPLETE | Previous report was read first; continuation begins from its INPUT_REQUIRED stopping point. |
| S14_SOURCE_VERIFIED | **NOT COMPLETE** | Supplied binary is `S15.zip`, SHA `eb652100...`; it exactly matches registered S15, not S14. |
| CONTINUITY_AUDIT_COMPLETE | COMPLETE (repository-level) | 50 S15 Resolution Cases contain explicit S14 prior Observation references and remain CONTINUOUS_CANDIDATE. |
| METRIC_AUDIT_COMPLETE | **NOT COMPLETE** | Canonical arithmetic/scope pattern audited; original S14 source verification remains blocked. |
| ROOT_CAUSE_CLASSIFICATION_COMPLETE | **NOT COMPLETE** | Final source classifications cannot be promoted without correct S14 source evidence. |
| FINAL_INVESTIGATION_REPORT | COMPLETE | This blocked continuation report is persisted. |

## A. Artifact Verification

### A.1 Registered S14 evidence

- Evidence ID: `EV-REAL-PERSIAN-UNITY-S14`
- Registered source: `user-upload:S14.zip`
- Registered S14 ZIP SHA-256: `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`
- Registered inventory: 58 files
- Registered inventory SHA-256: `cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be`

### A.2 Artifact actually supplied

- Exact filename: `S15.zip`
- Container size: **73,589,389 bytes**
- SHA-256: `eb652100c9e00a8882bbf4598b739c619bcdfb4672632d1a3c476cb720b678c5`
- Inventory: 58 files
- Deterministic inventory SHA-256: `5e8d79979fc7656c259ae65b919042cdd18d378a29b5c796f89d94fd697119bd`
- Contents are the same 58 JPG screenshot set already registered for S15.
- SHA-256 and deterministic inventory both **exactly match S15 Evidence**.

### A.3 Artifact identity conclusion

The supplied artifact is the existing S15 binary, not S14. It must not be interpreted as S14 evidence or used to confirm/refute S14 source extraction.

### A.4 S13 availability

No original S13 ZIP was supplied in this continuation. S13 raw Product data exists, but no S13 source-level verification is claimed.

## B. Executive Finding

The continuation is blocked at the exact source-verification boundary identified in the predecessor report.

What is confirmed without the correct S14 source:

- S14 stored extraction has `current_league_clan_medals == profile_total_clan_medal_count` for **50/50**.
- S15 separates these fields for **13/50** members; the S15 source evidence was already inspected in the predecessor investigation.
- 12/13 S15 Current League anomalies are in that unequal S15 subset.
- S14 and S15 share `LEAGUE-WD-2026W39`.
- Projection calculates `current_value - previous_value` from Canonical values.

Thus the previously indicated **S14 field-scope extraction problem remains the leading hypothesis for 12 Current League anomalies**, but it is **not source-confirmed**. Liam's Current League anomaly and Amin's -300 Total Kills remain source-unresolved.

No repair is authorized or executed.

## C. S14 Source Audit

A true source audit of the 50 S14 players cannot be completed because the artifact supplied is S15.

The following is the complete **stored S14 baseline audit** (not source verification):

| Rank | Stored S14 Name | Role | Stage | Current League | Profile Total | Total Kills | Weapons (25mm/Hydra/Hellfire) | Lifetime (B/S/G) | Source status |
|---:|---|---|---:|---:|---:|---:|---|---|---|
| 1 | ehsan | Co-Leader | 69 | 345,257 | 345,257 | 291,112 | 1301/72/450 | 2/4/2 | SOURCE_BLOCKED |
| 2 | Cpt. Of Persia | Leader & MVP | 50 | 336,355 | 336,355 | 335,017 | 1056/94/357 | 3/4/3 | SOURCE_BLOCKED |
| 3 | Alini | Member | 53 | 297,962 | 297,962 | 391,896 | 1092/57/315 | 5/5/2 | SOURCE_BLOCKED |
| 4 | kaveh | Elder | 46 | 264,575 | 264,575 | 198,453 | 1026/89/335 | 3/3/2 | SOURCE_BLOCKED |
| 5 | paradise | Member | 29 | 227,779 | 227,779 | 174,501 | 686/60/196 | 1/2/2 | SOURCE_BLOCKED |
| 6 | ALI | Member | 46 | 212,131 | 212,131 | 116,073 | 1130/64/275 | 0/3/3 | SOURCE_BLOCKED |
| 7 | Commander | Elder | 58 | 211,492 | 211,492 | 281,130 | 1064/68/265 | 3/3/2 | SOURCE_BLOCKED |
| 8 | Eren | Member | 26 | 199,994 | 199,994 | 183,867 | 628/63/258 | 0/2/2 | SOURCE_BLOCKED |
| 9 | Liam kouhkan | Member | 28 | 666,927 | 666,927 | 163,012 | 726/87/224 | 3/3/2 | SOURCE_BLOCKED |
| 10 | PERSIAN TIGER | Member | 23 | 167,384 | 167,384 | 95,244 | 501/49/232 | 0/0/0 | SOURCE_BLOCKED |
| 11 | F 35 🇮🇷 | Member | 57 | 166,524 | 166,524 | 263,696 | 1065/54/304 | 4/6/4 | SOURCE_BLOCKED |
| 12 | Worker Ant | Member | 64 | 166,416 | 166,416 | 270,693 | 1167/86/394 | 3/5/2 | SOURCE_BLOCKED |
| 13 | behrang | Member | 14 | 155,423 | 155,423 | 99,586 | 346/60/144 | 0/1/1 | SOURCE_BLOCKED |
| 14 | Ardalan | Member | 38 | 151,123 | 151,123 | 156,314 | 842/69/216 | 1/1/2 | SOURCE_BLOCKED |
| 15 | Tjk001 | Member | 25 | 150,576 | 150,576 | 135,987 | 466/58/247 | 2/3/1 | SOURCE_BLOCKED |
| 16 | RADMAN | Member | 50 | 147,258 | 147,258 | 227,908 | 1104/80/389 | 1/2/2 | SOURCE_BLOCKED |
| 17 | I.Man | Member | 15 | 157,793 | 157,793 | 46,671 | 300/30/135 | 2/2/0 | SOURCE_BLOCKED |
| 18 | NaViD | Member | 49 | 145,105 | 145,105 | 179,648 | 936/63/329 | 3/5/2 | SOURCE_BLOCKED |
| 19 | hisystem | Co-Leader | 28 | 137,324 | 137,324 | 199,048 | 591/58/253 | 2/3/3 | SOURCE_BLOCKED |
| 20 | ایرانی باوقار | Member | 28 | 133,689 | 133,689 | 141,411 | 524/30/199 | 2/2/1 | SOURCE_BLOCKED |
| 21 | hadi.land | Member & MVP | 39 | 525,136 | 525,136 | 141,969 | 737/36/267 | 0/2/2 | SOURCE_BLOCKED |
| 22 | SORENA | Member | 28 | 126,590 | 126,590 | 154,918 | 922/76/270 | 2/3/2 | SOURCE_BLOCKED |
| 23 | Dariush | Elder | 34 | 125,734 | 125,734 | 143,428 | 686/53/267 | 1/3/2 | SOURCE_BLOCKED |
| 24 | ایران | Member | 38 | 115,347 | 115,347 | 96,161 | 701/60/181 | 0/1/2 | SOURCE_BLOCKED |
| 25 | hamed_ir | Member | 32 | 99,566 | 99,566 | 142,198 | 716/42/190 | 0/0/2 | SOURCE_BLOCKED |
| 26 | H03E1N | Member | 39 | 737,297 | 737,297 | 107,394 | 723/52/348 | 2/4/2 | SOURCE_BLOCKED |
| 27 | boz gurd | Member | 28 | 96,621 | 96,621 | 106,705 | 622/40/250 | 0/1/1 | SOURCE_BLOCKED |
| 28 | reza1009 | Member | 25 | 94,324 | 94,324 | 93,297 | 521/43/164 | 0/0/0 | SOURCE_BLOCKED |
| 29 | Amirhoseinifpy | Member | 38 | 680,791 | 680,791 | 119,235 | 756/56/385 | 2/4/3 | SOURCE_BLOCKED |
| 30 | Harpy☁️ | Member | 28 | 89,258 | 89,258 | 109,711 | 617/40/211 | 1/0/0 | SOURCE_BLOCKED |
| 31 | سید حیدر ۳۱۳ | Member | 28 | 86,278 | 86,278 | 119,270 | 611/61/236 | 0/0/0 | SOURCE_BLOCKED |
| 32 | Hafezi | Member | 40 | 681,884 | 681,884 | 109,051 | 821/68/210 | 2/4/3 | SOURCE_BLOCKED |
| 33 | Mohsen.es68 | Member | 78 | 741,570 | 741,570 | 184,082 | 1439/55/489 | 1/3/2 | SOURCE_BLOCKED |
| 34 | Uk 🇮🇷💪 | Member | 41 | 743,733 | 743,733 | 131,660 | 776/57/311 | 2/3/3 | SOURCE_BLOCKED |
| 35 | hamid.iran🇮🇷 | Member | 14 | 63,980 | 63,980 | 50,560 | 308/32/132 | 2/3/2 | SOURCE_BLOCKED |
| 36 | ErFaN.m279 | Member | 30 | 63,655 | 63,655 | 109,807 | 589/51/276 | 2/1/2 | SOURCE_BLOCKED |
| 37 | Elvin | Member | 26 | 62,305 | 62,305 | 100,003 | 547/27/184 | 1/2/2 | SOURCE_BLOCKED |
| 38 | حسن | Member | 48 | 360,252 | 360,252 | 168,127 | 886/68/320 | 5/7/6 | SOURCE_BLOCKED |
| 39 | 👑Dadashi👑 | Elder | 64 | 1,172,900 | 1,172,900 | 217,535 | 1153/99/384 | 2/3/3 | SOURCE_BLOCKED |
| 40 | Amin | Member | 43 | 407,548 | 407,548 | 91,455 | 762/60/307 | 2/4/3 | SOURCE_BLOCKED |
| 41 | soltoon | Member | 38 | 780,661 | 780,661 | 144,287 | 1000/53/170 | 4/4/3 | SOURCE_BLOCKED |
| 42 | YALALINHO🔥 | Member | 54 | 198,585 | 198,585 | 153,608 | 1001/52/211 | 0/0/3 | SOURCE_BLOCKED |
| 43 | Nouk | Member | 37 | 482,848 | 482,848 | 108,547 | 670/81/267 | 2/3/3 | SOURCE_BLOCKED |
| 44 | Armin Lukas | Member | 39 | 48,267 | 48,267 | 151,716 | 854/57/312 | 0/0/1 | SOURCE_BLOCKED |
| 45 | Mahbod_1 | Elder | 23 | 399,780 | 399,780 | 50,506 | 496/48/120 | 2/3/3 | SOURCE_BLOCKED |
| 46 | ali | Member | 29 | 46,472 | 46,472 | 50,690 | 542/36/173 | 0/1/1 | SOURCE_BLOCKED |
| 47 | حسن | Member | 10 | 19,450 | 19,450 | 239,334 | 263/46/84 | 0/2/2 | SOURCE_BLOCKED |
| 48 | ADNAN | Member | 38 | 8,226 | 8,226 | 166,249 | 654/76/429 | 0/2/2 | SOURCE_BLOCKED |
| 49 | saied | Member | 22 | 452 | 452 | 70,814 | 546/29/88 | 0/0/0 | SOURCE_BLOCKED |
| 50 | Kian_Tak | Member | 34 | 234 | 234 | 102,883 | 580/62/293 | 1/2/0 | SOURCE_BLOCKED |

This 50-row table confirms that Product has a complete S14 stored extraction, but not that each value was read from the correct original S14 screen field.

## D. S14 → S15 Continuity Audit

The current Product mapping remains:

- **50 Continuous**
- **0 Observed additions**
- **0 Observed departures**
- **0 repository-level ambiguous/unresolved pair gaps**
- all 50 S15 continuity assessments: `CONTINUOUS_CANDIDATE`
- S15 Global IDs: 0
- S15 Membership Events/Episodes: 0/0

The 14 anomaly cases are all paired to explicit S14 predecessor Observations; no pair was changed.

Because the correct S14 source artifact is missing, this does not upgrade source-level continuity confidence beyond the existing Fingerprint review evidence.

## E. Metric Scope Audit

| Metric | Intended source / scope | Delta semantics |
|---|---|---|
| Current League Clan Medals | Ranking / current League | S15 current − S14 current when same League |
| Profile Total Clan Medal Count | Profile / profile-member total | Not the same metric as Current League; not a Projection delta metric in this task |
| Total Kills | Profile / lifetime | S15 total − S14 total |
| Gold/Silver/Bronze | Profile / lifetime medals | Continuity/supporting signals; not a Derived Delta metric here |

Observed scope pattern:

- S14 Current League == Profile Total: **50/50**
- S15 Current League == Profile Total: **37/50**
- S15 Current League != Profile Total: **13/50**

This is a strong indication that S14 baseline extraction may have collapsed two semantically distinct source fields. The correct S14 screenshots are still required.

## F. Full S14 → S15 Metric Comparison

The following is calculated from current Canonical values and the existing 50-pair continuity mapping. S14 values are **not source-verified** in this continuation.

| S15 | S14 | Player | Current League 14→15 (Δ) | Profile Total 14→15 (Δ) | Total Kills 14→15 (Δ) | Gold | Silver | Bronze | Stage | 25mm | Hydra | Hellfire |
|---|---|---|---:|---:|---:|---|---|---|---|---|---|---|
| S15::R001 | S14::R002 | Cpt. Of Persia | 336,355 → 488,220 (+151,865) | 336,355 → 488,220 (+151,865) | 335,017 → 342,360 (+7,343) | 3 → 3 | 4 → 4 | 3 → 3 | 50 → 50 | 1056 → 1062 | 94 → 94 | 357 → 357 |
| S15::R002 | S14::R001 | ehsan | 345,257 → 480,136 (+134,879) | 345,257 → 480,136 (+134,879) | 291,112 → 297,192 (+6,080) | 2 → 2 | 4 → 4 | 2 → 2 | 69 → 69 | 1301 → 1309 | 72 → 72 | 450 → 454 |
| S15::R003 | S14::R003 | Alini | 297,962 → 355,987 (+58,025) | 297,962 → 355,987 (+58,025) | 391,896 → 398,514 (+6,618) | 2 → 2 | 5 → 5 | 5 → 5 | 53 → 53 | 1092 → 1100 | 57 → 57 | 315 → 316 |
| S15::R004 | S14::R004 | kaveh | 264,575 → 338,501 (+73,926) | 264,575 → 338,501 (+73,926) | 198,453 → 202,102 (+3,649) | 2 → 2 | 3 → 3 | 3 → 3 | 46 → 46 | 1026 → 1061 | 89 → 90 | 335 → 336 |
| S15::R005 | S14::R007 | Commander 🇮🇷 | 211,492 → 329,191 (+117,699) | 211,492 → 329,191 (+117,699) | 281,130 → 286,129 (+4,999) | 2 → 2 | 3 → 3 | 3 → 3 | 58 → 58 | 1064 → 1079 | 68 → 68 | 265 → 265 |
| S15::R006 | S14::R005 | paradise | 227,779 → 297,647 (+69,868) | 227,779 → 297,647 (+69,868) | 174,501 → 176,351 (+1,850) | 2 → 2 | 2 → 2 | 1 → 1 | 29 → 29 | 686 → 686 | 60 → 62 | 196 → 196 |
| S15::R007 | S14::R008 | Eren | 199,994 → 286,994 (+87,000) | 199,994 → 286,994 (+87,000) | 183,867 → 189,730 (+5,863) | 2 → 2 | 2 → 2 | 0 → 0 | 26 → 27 | 628 → 628 | 63 → 63 | 258 → 258 |
| S15::R008 | S14::R006 | ALI 🇮🇷 | 212,131 → 259,699 (+47,568) | 212,131 → 259,699 (+47,568) | 116,073 → 117,599 (+1,526) | 3 → 3 | 3 → 3 | 0 → 0 | 46 → 46 | 1130 → 1140 | 64 → 64 | 275 → 277 |
| S15::R009 | S14::R010 | PERSIAN TIGER 🇮🇷 | 167,384 → 215,178 (+47,794) | 167,384 → 215,178 (+47,794) | 95,244 → 98,808 (+3,564) | 0 → 0 | 0 → 0 | 0 → 0 | 23 → 24 | 501 → 522 | 49 → 49 | 232 → 232 |
| S15::R010 | S14::R011 | 🇮🇷 F 35 🇮🇷 | 166,524 → 211,485 (+44,961) | 166,524 → 211,485 (+44,961) | 263,696 → 266,181 (+2,485) | 4 → 4 | 6 → 6 | 4 → 4 | 57 → 57 | 1065 → 1068 | 54 → 54 | 304 → 304 |
| S15::R011 | S14::R014 | Ardalan | 151,123 → 210,352 (+59,229) | 151,123 → 210,352 (+59,229) | 156,314 → 160,072 (+3,758) | 2 → 2 | 1 → 1 | 1 → 1 | 38 → 38 | 842 → 842 | 69 → 69 | 216 → 216 |
| S15::R012 | S14::R009 | Liam kouhkan | 666,927 → 205,716 (-461,211) | 666,927 → 205,716 (-461,211) | 163,012 → 172,189 (+9,177) | 2 → 2 | 3 → 3 | 3 → 3 | 28 → 28 | 726 → 732 | 87 → 89 | 224 → 224 |
| S15::R013 | S14::R018 | NaViD | 145,105 → 197,714 (+52,609) | 145,105 → 197,714 (+52,609) | 179,648 → 181,646 (+1,998) | 2 → 2 | 5 → 5 | 3 → 3 | 49 → 49 | 936 → 936 | 63 → 63 | 329 → 329 |
| S15::R014 | S14::R013 | behrang | 155,423 → 194,571 (+39,148) | 155,423 → 194,571 (+39,148) | 99,586 → 104,651 (+5,065) | 1 → 1 | 1 → 1 | 0 → 0 | 14 → 14 | 346 → 352 | 60 → 62 | 144 → 144 |
| S15::R015 | S14::R022 | SORENA 🏹 | 126,590 → 191,066 (+64,476) | 126,590 → 191,066 (+64,476) | 154,918 → 161,228 (+6,310) | 2 → 2 | 3 → 3 | 2 → 2 | 28 → 28 | 922 → 950 | 76 → 76 | 270 → 275 |
| S15::R016 | S14::R012 | Worker Ant 🐜 | 166,416 → 189,679 (+23,263) | 166,416 → 189,679 (+23,263) | 270,693 → 273,064 (+2,371) | 2 → 2 | 5 → 5 | 3 → 3 | 64 → 64 | 1167 → 1175 | 86 → 86 | 394 → 394 |
| S15::R017 | S14::R015 | Tjk001 | 150,576 → 188,014 (+37,438) | 150,576 → 188,014 (+37,438) | 135,987 → 139,280 (+3,293) | 1 → 1 | 3 → 3 | 2 → 2 | 25 → 25 | 466 → 466 | 58 → 58 | 247 → 247 |
| S15::R018 | S14::R019 | hissystem | 137,324 → 171,190 (+33,866) | 137,324 → 171,190 (+33,866) | 199,048 → 201,082 (+2,034) | 3 → 3 | 3 → 3 | 2 → 2 | 28 → 28 | 591 → 591 | 58 → 58 | 253 → 253 |
| S15::R019 | S14::R020 | ایرانی باوقار | 133,689 → 161,486 (+27,797) | 133,689 → 161,486 (+27,797) | 141,411 → 145,058 (+3,647) | 1 → 1 | 2 → 2 | 2 → 0 | 28 → 28 | 524 → 524 | 30 → 30 | 199 → 203 |
| S15::R020 | S14::R017 | I.Man | 157,793 → 159,305 (+1,512) | 157,793 → 171,384 (+13,591) | 46,671 → 48,413 (+1,742) | 0 → 0 | 2 → 2 | 2 → 2 | 15 → 15 | 300 → 300 | 30 → 30 | 135 → 135 |
| S15::R021 | S14::R025 | hamed ir | 99,566 → 155,455 (+55,889) | 99,566 → 155,455 (+55,889) | 142,198 → 145,755 (+3,557) | 2 → 2 | 0 → 0 | 0 → 0 | 32 → 32 | 716 → 724 | 42 → 42 | 190 → 190 |
| S15::R022 | S14::R021 | hadi,land | 525,136 → 552,172 (+27,036) | 525,136 → 552,172 (+27,036) | 141,969 → 145,665 (+3,696) | 2 → 2 | 2 → 2 | 0 → 0 | 39 → 39 | 737 → 743 | 36 → 38 | 267 → 267 |
| S15::R023 | S14::R016 | RADMAN | 147,258 → 154,680 (+7,422) | 147,258 → 154,680 (+7,422) | 227,908 → 228,843 (+935) | 2 → 2 | 2 → 2 | 1 → 1 | 50 → 50 | 1104 → 1110 | 80 → 82 | 389 → 389 |
| S15::R024 | S14::R023 | Dariush | 125,734 → 140,741 (+15,007) | 125,734 → 140,741 (+15,007) | 143,428 → 145,279 (+1,851) | 2 → 2 | 3 → 3 | 1 → 1 | 34 → 34 | 686 → 691 | 53 → 53 | 267 → 269 |
| S15::R025 | S14::R027 | boz gurd | 96,621 → 138,307 (+41,686) | 96,621 → 138,307 (+41,686) | 106,705 → 112,009 (+5,304) | 1 → 1 | 1 → 1 | 0 → 0 | 28 → 29 | 622 → 650 | 40 → 40 | 250 → 260 |
| S15::R026 | S14::R024 | ایران | 115,347 → 133,953 (+18,606) | 115,347 → 133,953 (+18,606) | 96,161 → 97,970 (+1,809) | 2 → 2 | 1 → 1 | 0 → 0 | 38 → 38 | 701 → 706 | 60 → 60 | 181 → 181 |
| S15::R027 | S14::R026 | H03EIN | 737,297 → 131,202 (-606,095) | 737,297 → 769,510 (+32,213) | 107,394 → 109,472 (+2,078) | 2 → 2 | 4 → 4 | 2 → 2 | 39 → 39 | 723 → 729 | 52 → 52 | 348 → 348 |
| S15::R028 | S14::R030 | Harpy☁️ | 89,258 → 122,360 (+33,102) | 89,258 → 122,360 (+33,102) | 109,711 → 113,155 (+3,444) | 0 → 0 | 0 → 0 | 1 → 1 | 28 → 29 | 617 → 627 | 40 → 40 | 211 → 216 |
| S15::R029 | S14::R029 | Amirhoseinifpv | 680,791 → 113,266 (-567,525) | 680,791 → 701,188 (+20,397) | 119,235 → 120,399 (+1,164) | 3 → 3 | 4 → 4 | 2 → 2 | 38 → 38 | 756 → 759 | 56 → 56 | 385 → 385 |
| S15::R030 | S14::R028 | reza1009 | 94,324 → 111,454 (+17,130) | 94,324 → 111,454 (+17,130) | 93,297 → 94,485 (+1,188) | 0 → 0 | 0 → 0 | 0 → 0 | 25 → 25 | 521 → 525 | 43 → 43 | 164 → 164 |
| S15::R031 | S14::R045 | Mahbod_1 | 399,780 → 105,090 (-294,690) | 399,780 → 458,331 (+58,551) | 50,506 → 51,334 (+828) | 3 → 3 | 3 → 3 | 2 → 2 | 23 → 23 | 496 → 496 | 48 → 48 | 120 → 120 |
| S15::R032 | S14::R033 | Mohsen.es68 | 741,570 → 102,143 (-639,427) | 741,570 → 769,630 (+28,060) | 184,082 → 186,186 (+2,104) | 2 → 2 | 3 → 3 | 1 → 1 | 78 → 78 | 1439 → 1440 | 55 → 55 | 489 → 489 |
| S15::R033 | S14::R031 | سید حیدر ۳۱۳ | 86,278 → 101,743 (+15,465) | 86,278 → 101,743 (+15,465) | 119,270 → 123,046 (+3,776) | 0 → 0 | 0 → 0 | 0 → 0 | 28 → 28 | 611 → 617 | 61 → 63 | 236 → 240 |
| S15::R034 | S14::R032 | Hafezi | 681,884 → 100,236 (-581,648) | 681,884 → 701,989 (+20,105) | 109,051 → 109,916 (+865) | 3 → 3 | 4 → 4 | 2 → 2 | 40 → 40 | 821 → 827 | 68 → 70 | 210 → 214 |
| S15::R035 | S14::R034 | Uk 🇮🇷💪 | 743,733 → 95,998 (-647,735) | 743,733 → 771,983 (+28,250) | 131,660 → 133,004 (+1,344) | 3 → 3 | 3 → 4 | 2 → 2 | 41 → 41 | 776 → 776 | 57 → 57 | 311 → 311 |
| S15::R036 | S14::R035 | hamid.iran🇮🇷 | 63,980 → 84,270 (+20,290) | 63,980 → 84,270 (+20,290) | 50,560 → 51,912 (+1,352) | 2 → 2 | 3 → 3 | 2 → 2 | 14 → 14 | 308 → 308 | 32 → 32 | 132 → 136 |
| S15::R037 | S14::R037 | Elvin | 62,305 → 74,011 (+11,706) | 62,305 → 74,011 (+11,706) | 100,003 → 101,000 (+997) | 2 → 2 | 2 → 2 | 1 → 1 | 26 → 26 | 547 → 550 | 27 → 27 | 184 → 184 |
| S15::R038 | S14::R047 | حسین | 19,450 → 73,845 (+54,395) | 19,450 → 73,845 (+54,395) | 239,334 → 249,964 (+10,630) | 2 → 2 | 2 → 2 | 0 → 0 | 10 → 10 | 263 → 263 | 46 → 46 | 84 → 84 |
| S15::R039 | S14::R042 | YALALINHO🔥 | 198,585 → 73,440 (-125,145) | 198,585 → 222,440 (+23,855) | 153,608 → 155,631 (+2,023) | 3 → 3 | 0 → 0 | 0 → 0 | 54 → 54 | 1001 → 1001 | 52 → 52 | 211 → 211 |
| S15::R040 | S14::R036 | ErFaN.m279 | 63,655 → 73,212 (+9,557) | 63,655 → 73,212 (+9,557) | 109,807 → 110,664 (+857) | 2 → 2 | 1 → 1 | 2 → 2 | 30 → 30 | 589 → 589 | 51 → 51 | 276 → 276 |
| S15::R041 | S14::R041 | ♕soltoon♕ | 780,661 → 67,810 (-712,851) | 780,661 → 796,126 (+15,465) | 144,287 → 145,252 (+965) | 3 → 3 | 4 → 4 | 4 → 4 | 38 → 38 | 1000 → 1000 | 53 → 53 | 170 → 174 |
| S15::R042 | S14::R043 | Nouk | 482,848 → 67,443 (-415,405) | 482,848 → 501,983 (+19,135) | 108,547 → 109,737 (+1,190) | 3 → 3 | 3 → 3 | 2 → 2 | 37 → 37 | 670 → 676 | 81 → 81 | 267 → 267 |
| S15::R043 | S14::R038 | حسن | 360,252 → 66,635 (-293,617) | 360,252 → 370,479 (+10,227) | 168,127 → 168,420 (+293) | 6 → 6 | 7 → 7 | 5 → 5 | 48 → 48 | 886 → 886 | 68 → 68 | 320 → 320 |
| S15::R044 | S14::R039 | 👑Dadashi👑 | 1,172,900 → 54,869 (-1,118,031) | 1,172,900 → 1,174,900 (+2,000) | 217,535 → 217,535 (+0) | 3 → 3 | 3 → 3 | 2 → 2 | 64 → 64 | 1153 → 1153 | 99 → 99 | 384 → 384 |
| S15::R045 | S14::R040 | Amin | 407,548 → 52,555 (-354,993) | 407,548 → 407,548 (+0) | 91,455 → 91,155 (-300) | 3 → 3 | 4 → 4 | 2 → 2 | 43 → 43 | 762 → 762 | 60 → 60 | 307 → 307 |
| S15::R046 | S14::R046 | ali | 46,472 → 50,662 (+4,190) | 46,472 → 50,662 (+4,190) | 50,690 → 51,030 (+340) | 1 → 1 | 1 → 1 | 0 → 0 | 29 → 29 | 542 → 542 | 36 → 36 | 173 → 173 |
| S15::R047 | S14::R044 | Armin Lukas | 48,267 → 50,171 (+1,904) | 48,267 → 50,171 (+1,904) | 151,716 → 153,018 (+1,302) | 1 → 1 | 0 → 0 | 0 → 0 | 39 → 39 | 854 → 862 | 57 → 57 | 312 → 313 |
| S15::R048 | S14::R049 | saied 🥇 🇮🇷 | 452 → 27,802 (+27,350) | 452 → 27,802 (+27,350) | 70,814 → 73,622 (+2,808) | 0 → 0 | 0 → 0 | 0 → 0 | 22 → 22 | 546 → 546 | 29 → 29 | 88 → 88 |
| S15::R049 | S14::R048 | ADNAN | 8,226 → 22,373 (+14,147) | 8,226 → 22,373 (+14,147) | 166,249 → 168,069 (+1,820) | 2 → 2 | 2 → 2 | 0 → 0 | 38 → 38 | 654 → 658 | 76 → 76 | 429 → 433 |
| S15::R050 | S14::R050 | Kian...Tak | 234 → 4,808 (+4,574) | 234 → 4,808 (+4,574) | 102,883 → 103,254 (+371) | 0 → 0 | 2 → 2 | 1 → 1 | 34 → 34 | 580 → 582 | 62 → 62 | 293 → 293 |

### Metrics that are not delta-calculated here

Gold, Silver, Bronze, Stage and weapon levels are continuity/fingerprint signals, not the two metrics emitted by the S15 Derived Read Model. Profile Total Clan Medal Count is explicitly kept as a separate observed scope.

## G. All 14 Existing Anomalies

| S15 Observation | S14 Observation | Player | Pair Status | Source Verified | Current League S14 | Current League S15 | League Delta | Profile Total S14 | Profile Total S15 | Total Kills S14 | Total Kills S15 | Root Cause | Confidence |
|---|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---|---|
| S15::R012 | S14::R009 | Liam kouhkan | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 666,927 | 205,716 | -461,211 | 666,927 | 205,716 | 163,012 | 172,189 | INPUT_REQUIRED — Liam S14 source scope unavailable | MEDIUM |
| S15::R027 | S14::R026 | H03EIN | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 737,297 | 131,202 | -606,095 | 737,297 | 769,510 | 107,394 | 109,472 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R029 | S14::R029 | Amirhoseinifpv | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 680,791 | 113,266 | -567,525 | 680,791 | 701,188 | 119,235 | 120,399 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R031 | S14::R045 | Mahbod_1 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 399,780 | 105,090 | -294,690 | 399,780 | 458,331 | 50,506 | 51,334 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R032 | S14::R033 | Mohsen.es68 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 741,570 | 102,143 | -639,427 | 741,570 | 769,630 | 184,082 | 186,186 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R034 | S14::R032 | Hafezi | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 681,884 | 100,236 | -581,648 | 681,884 | 701,989 | 109,051 | 109,916 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R035 | S14::R034 | Uk 🇮🇷💪 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 743,733 | 95,998 | -647,735 | 743,733 | 771,983 | 131,660 | 133,004 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R039 | S14::R042 | YALALINHO🔥 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 198,585 | 73,440 | -125,145 | 198,585 | 222,440 | 153,608 | 155,631 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R041 | S14::R041 | ♕soltoon♕ | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 780,661 | 67,810 | -712,851 | 780,661 | 796,126 | 144,287 | 145,252 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R042 | S14::R043 | Nouk | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 482,848 | 67,443 | -415,405 | 482,848 | 501,983 | 108,547 | 109,737 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R043 | S14::R038 | حسن | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 360,252 | 66,635 | -293,617 | 360,252 | 370,479 | 168,127 | 168,420 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R044 | S14::R039 | 👑Dadashi👑 | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 1,172,900 | 54,869 | -1,118,031 | 1,172,900 | 1,174,900 | 217,535 | 217,535 | INPUT_REQUIRED — S14 source unavailable | MEDIUM |
| S15::R045 | S14::R040 | Amin | CONTINUOUS_WITH_METRIC_ANOMALY | S14 BLOCKED; S15 previously confirmed | 407,548 | 52,555 | -354,993 | 407,548 | 407,548 | 91,455 | 91,155 | INPUT_REQUIRED — S14 source unavailable for medal + Total Kills verification | MEDIUM |

## H. Cross-Case Pattern

| Pattern | Count |
|---|---:|
| S14 Current League == Profile Total | **50/50** |
| S14 Current League != Profile Total | **0/50** |
| S15 Current League == Profile Total | **37/50** |
| S15 Current League != Profile Total | **13/50** |
| Negative Current League deltas | **13** |
| Negative Total Kills deltas | **1** |
| Current-League anomaly cases with normal/increasing Core progression | **13/13** |
| Current-League anomalies where S15 Current != S15 Profile | **12/13** |
| Current-League anomaly where S15 Current == S15 Profile | **1/13 (Liam)** |

The shared pattern is systematic at the S14 stored-extraction level, not isolated to individual players. But the first incorrect source-level point cannot be established until the actual S14 screenshots are inspected.

## I. Source → Canonical → Projection Chain

**S15 chain:** original S15 screenshot/ZIP → S15 Raw Extraction → Canonical → existing continuity pair → Derived Delta is already source-confirmed in the predecessor investigation for the investigated S15 values.

**S14 chain:** original S14 screenshot/ZIP → S14 Raw Extraction → Canonical → continuity pair → Derived Delta.

The exact first bad/ambiguous point for S14 is currently the boundary between **Original S14 Source** and **S14 Raw Extraction**. The supplied file does not provide that source; it is S15.

## J. Projection Verification

Current Product Projection remains unchanged and was re-verified from live `src/projection.js`:

- Snapshots are ordered by official timestamp / Clan / sequence.
- Previous Snapshot is the immediately previous Snapshot for the same Clan.
- Current/previous Observations come directly from the continuity pair.
- Same-League check: `previousSnapshot.league_id === snapshot.league_id`.
- Metrics read directly from Canonical:
  - `total_kills`
  - `current_league_clan_medals`
- Calculation: **`current_value - previous_value`**.
- Negative result: `ANOMALY` with reason `monotonic_metric_decreased`.
- No clamp or hidden conversion occurs before subtraction.

Projection is therefore not the identified failure domain.

## K. Historical Impact

- **S13:** unchanged; no original S13 source supplied.
- **S14:** potentially materially affected if the missing source proves a Current League field-scope extraction error; Amin's S14 Total Kills also remains unverified.
- **S15:** unchanged; no S15 value repair or reinterpretation.
- **Identity/Fingerprint:** unchanged.
- **Canonical:** unchanged.
- **Derived Read Model:** unchanged; all 14 anomalies preserved.
- **Static Data:** unchanged.

## L. Repair Recommendation — NOT EXECUTED

1. Provide the actual original S14 ZIP whose registered SHA-256 is `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`, or the original S14 Ranking/Profile screenshots.
2. Verify all 50 S14 Ranking/Profile field sources, not only the 14 anomalies.
3. Specifically verify Liam's S14 Current League and Profile Total origins.
4. Specifically verify Amin's S14 Total Kills source.
5. Only if source evidence proves an extraction/scope error, create a separate authorized historical correction/supersession task.
6. Recompute derived output only after authorized Canonical correction.
7. Validate Product/CI/Pages and reconcile Memory under a new checkpoint.

No repair was executed.

## M. Final Classification

**INPUT_REQUIRED**

The continuation cannot cross the source-verification gate because the supplied artifact is S15, not S14.

The previous suspected root cause remains a hypothesis, not a confirmed source-level classification.

## N. STOP / Mutation Record

- Canonical: NOT MODIFIED
- S13: NOT MODIFIED
- S14: NOT MODIFIED
- S15: NOT MODIFIED
- Resolution Cases: NOT MODIFIED
- Fingerprint mappings: NOT MODIFIED
- Projection: NOT MODIFIED
- Static Data: NOT MODIFIED
- Membership: NOT MODIFIED
- Identity: NOT MODIFIED
- Re-ingestion: NONE
- Repair: NONE

**FINAL_INVESTIGATION_REPORT — PERSISTED**

**Final Classification: INPUT_REQUIRED**
