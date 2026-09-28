# Real Snapshot Report — Persian UNITY / S14

## Authority
- Clan: Persian UNITY
- Snapshot: S14
- Official time: 5 Mehr 1405, 23:00 Iran = 2026-09-27T19:30:00Z
- Timestamp source: Project Authority / user supplied value
- Canonical sequence: 2

## Evidence
- ZIP: S14.zip
- ZIP SHA-256: 9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d
- Inventory: 58 files
- Inventory hash: cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be
- Inventory method: SHA-256 of UTF-8 newline-joined sorted relative file paths
- Ranking: 8 captures, 8 unique
- Profiles: 50 cards
- Roster: 50/50

## Extraction / coverage
All 50 observations preserve rank, display name, role, stage, current-league Clan Medals, Total Kills, Profile Total Clan Medal Count, lifetime Gold/Silver/Bronze, 25mm/Hellfire/Hydra levels, and source-native Last Online.

last_online_utc remains null because relative source strings do not provide exact UTC.

## Identity
- 50 observations: UNRESOLVED
- 0 Global Player IDs created
- 50 Resolution Cases
- No automatic identity merge from S13

## Membership
- 0 Membership Episodes created
- 0 Membership Events created
- S14/S13 roster differences are not promoted to JOIN/LEAVE without an identity decision.
- Exact-name/presence differences remain review material, not canonical membership decisions.

## Metrics / Delta
- 0 canonical delta_results for S14.
- No Delta is fabricated while identity/baseline prerequisites are unresolved.
- Current League Clan Medals, Profile Total Clan Medal Count, lifetime medals and Total Kills remain separate observed fields.

## Continuity observations
S13 had 48/50; S14 has 50/50. S14 contains new/changed display-name cases and duplicate display names (for example two separate S14 observations named «حسن»). These are intentionally kept as separate Snapshot-local observations and are not merged.

## Persistence / Projection / UI
- Canonical S14 appended without rewriting S13.
- Raw checkpoint stored at data/real-snapshots/persian-unity/S14.raw.json.
- Static artifacts must be regenerated from Canonical before publication.
- Dedicated Clan viewer: site/clan.html?clan=CLAN-PERSIAN-UNITY&snapshot=S14

## Outcome
**PASS_WITH_REVIEW_CASES**
Evidence-backed S14 ingestion is complete. Identity and membership remain explicitly unresolved. S14 is publishable only after generated Static Data, validation, CI and Pages deployment pass.


## Final Validation — 2026-09-28
- Static bundle regenerated from Canonical in commit `230419e120cc1931b3419802fa1d0213ebcd1608`.
- Validation test correction completed in commit `1531d76d545f922e3e711ca6d0df8282c0f20254`.
- Final site-affecting checkpoint: `96809119417aaf0527d4de6ab87524759a93ebef`.
- Product CI Run `36415948600`: **SUCCESS**.
- GitHub Pages Run `36415948559`: **SUCCESS**.
- S14 is now included in the published Static Read Model with 50 members.
- Source-native Last Online and lifetime Gold/Silver/Bronze, Total Kills, Clan Medals and Weapons are present in the projected S14 member records.
- No S14 Delta Results or Membership Events/Episodes were created.

## Post-Ingestion Continuity Repair — 2026-09-28

S14 ingestion remains unchanged. A separate deterministic S13 → S14 continuity repair was subsequently completed at the Derived Read-Model layer.

- 46 matched observation pairs
- 4 observed additions
- 2 observed departures
- 92 derived Read-Model delta records
- Valid Total Kills increase: +145,391
- Valid Current League Clan Medal increase: +9,207,907
- Identity: UNRESOLVED
- Global Player IDs: 0
- Canonical Membership Events: 0
- Canonical Delta Results: 0

**Boundary:** the 92 continuity delta records are derived Read-Model results only. They do not change the fact that Canonical `delta_results` remains 0.
