# UCS — Persian UNITY S13→S15 CLEAN Finalization

Date: 2026-09-29
Authority: CR Coordination / Project Authority
Task: UCS — Persian UNITY S13→S15 CLEAN Finalization
Authority Status: APPROVED
Task Type: CLEAN Final Ingestion / Validation / Documentation
Scope: Persian UNITY / S13 → S14 → S15
Mutation: APPROVED
Final Classification: **CLEAN_FINALIZED**

## 1. Final Product State

- Repository: `neoshisystem/WD-Clans`
- Branch: `main`
- HEAD: `3f6fd96d4ccc913013b5d528dd34cd1dbd32c6fe`
- Tree SHA: not exposed by the installed GitHub connector; HEAD and file-level state were independently verified.
- Canonical SHA: `ebea003df7aa04d9e0c7ca26a9c7bb97bf0f9438`
- Product repair report: `reports/2026-09-29_s14-field-scope-repair.md`
- This finalization report records the post-repair clean gate only. No second S14 data repair was performed.

## 2. Source / Evidence Integrity

S13:
- Evidence ID: `EV-REAL-PERSIAN-UNITY-S13`
- ZIP SHA-256: `7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583`
- Inventory: 56 files
- Local re-hash of supplied `/mnt/data/S13.zip`: exact SHA match.
- Registered inventory: 8 Ranking captures, 48 Profile cards, 1 duplicate Ranking capture.

S14:
- Evidence ID: `EV-REAL-PERSIAN-UNITY-S14`
- ZIP SHA-256: `9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d`
- Inventory: 58 files
- Source-correct S14 field-scope repair already completed and preserved.

S15:
- Evidence ID: `EV-REAL-PERSIAN-UNITY-S15`
- ZIP SHA-256: `eb652100c9e00a8882bbf4598b739c619bcdfb4672632d1a3c476cb720b678c5`
- Inventory: 58 files

No source artifact was modified.

## 3. Snapshot State

### S13 — Baseline
- First observed Persian UNITY snapshot.
- 48 observations.
- 48 unresolved.
- Global IDs: 0.
- Membership Events/Episodes created from baseline: 0.
- Canonical Delta Results: 0.
- No synthetic baseline JOIN/LEAVE was introduced.

### S14
- 50 observations.
- 50 unresolved.
- 17 Current League values previously corrected from Profile Total to verified Ranking Current League.
- Profile Total values unchanged.
- Total Kills unchanged.
- Global IDs: 0.
- Membership Events/Episodes: 0.

### S15
- 50 observations.
- 50 unresolved.
- Global IDs: 0.
- Membership Events/Episodes: 0.
- Current League: 50 VALID / 0 ANOMALY.
- Amin Total Kills remains a separate -300 ANOMALY.

## 4. Continuity

S13 → S14:
- Matched: 46
- Additions: 4
- Departures: 2
- Ambiguous: 0
- Conflicting: 0

S14 → S15:
- Matched: 50
- Additions: 0
- Departures: 0
- Ambiguous: 0

These are derived continuity/read-model categories only. They were not converted into Canonical Membership Events.

## 5. Metric Scope / Delta State

The source-correct metric scopes remain separated:

- `total_kills` = PLAYER_LIFETIME
- `current_league_clan_medals` = LEAGUE
- `profile_total_clan_medal_count` = profile / membership-episode scope

S14 → S15:
- Current League: 50 VALID, 0 ANOMALY.
- Amin: `52,555 → 52,555 = 0`.
- Amin Total Kills: `91,455 → 91,155 = -300 ANOMALY`.
- The -300 was not clamped, removed, or merged with the medal correction.

Canonical Delta Results remain: 0.

## 6. S14 → S15 Clean Result

The 13 former false Current League negative anomalies are gone after the source-correct S14 field-scope repair and regeneration.

The 17-record S14 correction remains exactly bounded to the verified Ranking Current League values. The four non-anomaly-producing field-scope cases were also corrected as required.

No new anomaly, identity, membership, or historical-data mutation was introduced.

## 7. Projection / Static

Projection remains the source-correct implementation:
- Current League reads `current_league_clan_medals`.
- Profile Total is not substituted.
- Same-League delta = current minus previous.
- Negative monotonic results remain ANOMALY.

Static output is deterministic against the official generator.

The current regression contract records the source-correct S13→S14 aggregate:
- Total valid delta sum: 1,829,984
- Total Kills valid component: 145,391
- Current League valid component: 1,684,593
- S13→S14 structure: 92 deltas = 46 Total Kills + 46 Current League; 4 JOIN / 2 LEAVE derived changes.

The only Product commit after the blocked checkpoint changed exactly the two stale aggregate expectations in `test/site-product-ui.test.js`:
- 9,353,298 → 1,829,984
- 9,207,907 → 1,684,593

No application logic, Canonical data, evidence, identity, membership, or Static generator was changed in that final correction.

## 8. Validation / CI

Authoritative CI:
- Run: `36603054005`
- Job: `109525005784`
- Result: SUCCESS
- `npm test`: SUCCESS
- All workflow steps completed successfully, including:
  - syntax checks for UCS source modules;
  - official Static Generator;
  - generated-vs-committed Static JSON/JS diff check;
  - documentation check.
- Reported test total: 238/238 PASS.

Local direct npm execution was not possible in this environment because outbound GitHub DNS/network access was unavailable; the repository's authoritative GitHub Actions run above is the validation authority for the committed Product state.

## 9. Identity / Membership Safety

- No Global IDs created.
- No identity decisions inferred from fingerprint continuity.
- No Membership Events created.
- No Membership Episodes created.
- No historical snapshot renumbering or overwrite.
- No synthetic clan introduced.

## 10. Changed Files / Commits

Final Product HEAD commit:
- `3f6fd96d4ccc913013b5d528dd34cd1dbd32c6fe`
- Message: `test(UCS): align S14 aggregate expectation with source-correct data`
- Changed file: `test/site-product-ui.test.js`
- Change: only the two source-correct aggregate expectations described above.

Earlier authorized repair/validation commits remain historical and are not repeated here.

## 11. Final Invariants

All required invariants are satisfied:
- S13 baseline preserved.
- S13→S14 = 46 / 4 / 2.
- S14→S15 = 50 / 0 / 0.
- S14 Profile Totals unchanged.
- S14 Total Kills unchanged.
- S15 Current League = 50 VALID / 0 ANOMALY.
- Amin Total Kills -300 remains ANOMALY.
- Global IDs = 0.
- Membership Events/Episodes = 0.
- Canonical Delta Results = 0.
- Static deterministic.
- CI green.
- Evidence immutable.

## 12. Final Classification

**CLEAN_FINALIZED**

No further repair, research, expectation change, or architectural work is authorized by this finalization task.
