# UCS — Hydra / Hellfire Semantic Mapping Correction — 2026-10-03

Classification: FACT / AUTHORITY-APPROVED CORRECTION

## Finding

Project Authority identified that the stored real-Snapshot weapon values for Hydra and Hellfire were semantically reversed: the value captured under the Hellfire label belonged to Hydra, and the value captured under the Hydra label belonged to Hellfire.

Public War Drone references independently describe the weapon progression in the order 25mm, Hydra, Hellfire, with example progression levels showing Hydra substantially above Hellfire. This was used only as a secondary sanity check; the correction authority is the Project Authority instruction.

## Scope

Corrected real Snapshot observations:
- S13: 48
- S14: 50
- S15: 50
- SA01: 49
- Total: 197 real observations

Synthetic demo observations were not modified.

## Deterministic correction

For each affected real observation:

old stored mapping:
- hellfire = source Hydra value
- hydra = source Hellfire value

corrected semantic mapping:
- hellfire = previous hydra value
- hydra = previous hellfire value

25mm, Stage, Total Kills, lifetime medals, Clan Medal fields, names, roles and timestamps were not changed by this correction.

## Examples

S13 ehsan: 25mm 1297; old Hellfire 447 / Hydra 71 -> corrected Hellfire 71 / Hydra 447.

SA01 ehsan: 25mm 1330; old Hellfire 459 / Hydra 74 -> corrected Hellfire 74 / Hydra 459.

## Audit consequence

The correction changes weapon labels, not the underlying numeric pair. Because the same semantic swap was applied across all affected real snapshots, the continuity magnitude remains unchanged; the field semantics are now aligned to the game weapon identities.

## Validation requirement

Regenerate derived Static artifacts from Canonical. Run full Product validation, UI validation, documentation validation and Pages validation. No identity policy change is introduced.

## Traceability

Previous Product Canonical blob:
9965faaba4fc31455f50486b82fa69bd843f7ebf

Corrected Product Canonical blob:
ab8b959c23104075b01f4ef825a9e7b04ebde146

The original correction records for S13 and S14 remain historical and are not rewritten.
