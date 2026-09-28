# Real Snapshot Report — Persian UNITY / S15

## Authority

- Clan: Persian UNITY
- Snapshot: S15
- Official time: 6 Mehr 1405, 23:00 Iran = 2026-09-28T19:30:00Z
- Timestamp source: Project Authority / user supplied value
- Canonical sequence: 3
- League: LEAGUE-WD-2026W39

## Evidence

- ZIP: S15.zip
- ZIP SHA-256: eb652100c9e00a8882bbf4598b739c619bcdfb4672632d1a3c476cb720b678c5
- Inventory: 58 files
- Inventory hash: 5e8d79979fc7656c259ae65b919042cdd18d378a29b5c796f89d94fd697119bd
- Inventory method: SHA-256 of UTF-8 newline-joined sorted relative file paths
- Ranking: 8 screenshots
- Profiles: 50 cards
- Roster: 50/50
- No duplicate Ranking screenshots observed

## Extraction / coverage

All 50 S15 observations preserve the supported fields:
- rank
- exact source display name
- role
- stage
- weapons: 25mm / Hellfire / Hydra
- Total Kills
- Current League Clan Medals
- Profile Total Clan Medal Count
- lifetime Gold/Silver/Bronze
- source-native Last Online

Relative Last Online remains in source-native `last_online_display`; `last_online_utc` remains null because the source does not provide exact UTC.

Current League Clan Medals and Profile Total Clan Medal Count are kept as separate scopes. They are equal for many members but are not assumed equal. S15 includes verified differences such as:
- R20: 159,305 current-league / 171,384 profile total
- R27: 131,202 / 769,510
- R29: 113,266 / 701,188
- R31: 105,090 / 458,331
- R32: 102,143 / 769,630
- R34: 100,236 / 701,989
- R35: 95,998 / 771,983
- R39: 73,440 / 222,440
- R41: 67,810 / 796,126
- R42: 67,443 / 501,983
- R43: 66,635 / 370,479
- R44: 54,869 / 1,174,900
- R45: 52,555 / 407,548

## Identity

- 50 observations: UNRESOLVED
- 50 Resolution Cases
- 0 Global Player IDs created
- No automatic identity confirmation from display name, rank, presence, or fingerprint continuity

Exact display-name changes are preserved as new Snapshot-local observations. Examples include Commander → Commander 🇮🇷, ALI → ALI 🇮🇷, Worker Ant → Worker Ant 🐜, hisystem → hissystem, hamed_ir → hamed ir, hadi.land → hadi,land, H03E1N → H03EIN, soltoon → ♕soltoon♕, saied → saied 🥇 🇮🇷, and Kian_Tak → Kian...Tak.

The duplicate-name condition around حسن is not silently resolved.

## Membership

- Canonical Membership Events created: 0
- Canonical Membership Episodes created: 0
- S14 → S15 observed continuity differences remain Projection/Read-Model observations only.
- 15 observed current-side additions and 15 observed prior-side departures were derived from the existing exact-display-name + Stage/weapon continuity contract.
- These are not canonical JOIN/LEAVE events.

## Derived continuity / Delta

- Matched observation pairs: 35
- Derived Read-Model Delta records: 70
  - 35 Total Kills
  - 35 Current League Clan Medals
- Valid aggregate Total Kills delta: +93,705
- Valid aggregate Current League Clan Medals delta: +1,003,508
- Anomalous derived delta records: 11
- Canonical `delta_results`: 0

### Review cases — ANOMALY

The existing Projection contract marks these negative same-League/lifetime deltas as ANOMALY rather than correcting them:

- S15::R012 Current League Clan Medals: -461,211 vs S14::R009
- S15::R031 Current League Clan Medals: -294,690 vs S14::R045
- S15::R032 Current League Clan Medals: -639,427 vs S14::R033
- S15::R034 Current League Clan Medals: -581,648 vs S14::R032
- S15::R035 Current League Clan Medals: -647,735 vs S14::R034
- S15::R039 Current League Clan Medals: -125,145 vs S14::R042
- S15::R042 Current League Clan Medals: -415,405 vs S14::R043
- S15::R043 Current League Clan Medals: -293,617 vs S14::R038
- S15::R044 Current League Clan Medals: -1,118,031 vs S14::R039
- S15::R045 Current League Clan Medals: -354,993 vs S14::R040
- S15::R045 Total Kills: -300 vs S14::R040

These values are preserved as observed/derived anomalies. No silent clamp, rewrite, identity change, or Canonical delta materialization was performed.

## Persistence / Projection / Static

- S15 appended to Canonical without rewriting S13 or S14.
- Raw checkpoint: `data/real-snapshots/persian-unity/S15.raw.json`
- Canonical observation count for S15: 50
- Canonical resolution cases for S15: 50
- Canonical Global Player IDs created by S15: 0
- Canonical Membership Events/Episodes created by S15: 0
- Canonical Delta Results created by S15: 0
- Static artifacts regenerated from Canonical using the existing project generator.
- S15 is present in the generated Static Read Model.

## Validation

- Product CI after final S15 generator output: SUCCESS
- `npm test`: SUCCESS
- `node --check` suite: SUCCESS
- Generator/committed Static diff: SUCCESS
- Product documentation check: SUCCESS
- Cross-repository documentation sync is to be sealed after the final Memory checkpoint update.

## Outcome

**PASS_WITH_REVIEW_CASES**

S15 ingestion is complete and reproducible through the existing pipeline. The 11 derived ANOMALY records are preserved for review. Identity and canonical membership remain unresolved.

## Next safe action

Treat S15 as the latest historical Persian UNITY Snapshot. Do not re-ingest or overwrite S13/S14/S15. Any future Snapshot should be new, follow the existing evidence-first intake, and re-check live Product + Memory before mutation.

