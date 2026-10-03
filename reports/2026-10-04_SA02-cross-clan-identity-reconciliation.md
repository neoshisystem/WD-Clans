# UCS — SA02 Cross-Clan Identity Reconciliation — 2026-10-04

Status: **IDENTITY AUDIT COMPLETE / CORRECTED STATE VERIFIED / 3 CASES REMAIN UNRESOLVED**

## Authority context
Snapshot: SA02  
Clan: Iranian Army [PU]  
Official timestamp: 2026-10-03T19:30:00.000Z  
Authority wording: 11 Mehr 1405, 23:00 Iran time

Source:
- ZIP SHA-256: 5de1394395555bb9e3a628cfd11a479490e1a2633ab58c931053a3e3939ed75d
- Inventory: 56 files
- Inventory SHA-256: 9147cd6fcc571be53cec8bbb5f19c6681accb4237c88dcf82fe5b9c6cf5dfcab
- Ranking screenshots: 7
- Profile cards: 49
- Ranking rows: 49, ranks 1–49
- Roster header: 49/50

The source roster reconciles internally: the evidence contains exactly the 49 rows shown by the 49/50 header. This is different from SA01, where Authority explicitly excluded position 50.

## Weapon mapping
SA02 RawExtraction preserves the corrected semantic mapping:
- 25mm = first observed weapon value
- Hydra = second observed weapon value
- Hellfire = third observed weapon value

Example from SA02 ehsan:
- source values: 1334 / 459 / 74
- semantic result: 25mm 1334, Hydra 459, Hellfire 74

The historical Hydra/Hellfire inversion affecting S13/S14/S15/SA01 was corrected before SA02. SA02 is using the corrected mapping.

## The reported 11 "new members"
The user-provided UI screenshot showed 11 apparent JOIN/new-member entries caused by the earlier identity/membership projection state. The current live Canonical state was rechecked directly.

### Confirmed existing Global Player identities
These eight SA02 observations are already correctly linked to existing Global Player IDs. Their name/Emoji changes are presentation changes, not new identities:

1. SA02-R09 — 🇮🇷 ALI 🇮🇷 → GP-REAL-S13-R007
   Prior anchor: SA01-R30
   Name relation: SOURCE_NAME_VARIANT
   Hard monotonic violations: none

2. SA02-R20 — 🏅saied🏅🇮🇷 → GP-REAL-S14-R049
   Prior anchor: SA01-R16
   Name relation: SOURCE_NAME_VARIANT
   Hard monotonic violations: none

3. SA02-R11 — behrang → GP-REAL-S13-R012
   Prior anchor: SA01-R11
   Name relation: EXACT_SOURCE_NAME
   Hard monotonic violations: none

4. SA02-R10 — 🇮🇷 HARPY 🌩️🦅 → GP-REAL-S13-R043
   Prior anchor: SA01-R12
   Name relation: SOURCE_NAME_VARIANT
   Hard monotonic violations: none

5. SA02-R21 — RADMAN → GP-REAL-S13-R011
   Prior anchor: SA01-R35
   Note: SA01 displayed the same continuity chain as RAMAN.
   Name relation: SOURCE_NAME_VARIANT
   Hard monotonic violations: none

6. SA02-R17 — H03E1N → GP-REAL-S13-R026
   Prior anchor: SA01-R09
   Earlier S15 source display was H03EIN.
   Name relation: SOURCE_NAME_VARIANT
   Hard monotonic violations: none

7. SA02-R23 — 🇮🇷 F 35 🇮🇷 → GP-REAL-S13-R017
   Prior anchor: SA01-R26
   Name relation: SOURCE_NAME_VARIANT
   Hard monotonic violations: none

8. SA02-R32 — PERSIAN TIGER🇮🇷 → GP-REAL-S13-R009
   Prior anchor: SA01-R20
   Name relation: SOURCE_NAME_VARIANT
   Hard monotonic violations: none

These eight do NOT need new Global Player IDs.

## Three cases that remain unresolved

### SA02-R48 — ErFaN.m279
Historical observations:
- S13-R047 — ErFaN.m279 — UNRESOLVED
- S14-R036 — ErFaN.m279 — UNRESOLVED
- S15-R040 — ErFaN.m279 — UNRESOLVED
- SA02-R48 — ErFaN.m279 — UNRESOLVED

The historical chain has strong continuity characteristics and no hard monotonic decrease across the available vectors, but all prior observations are themselves unresolved and have no confirmed Global Player ID. Therefore the system must not fabricate a Global ID merely to collapse this chain.

Current status: **UNRESOLVED / IDENTITY CANDIDATE CHAIN**

### SA02-R45 — santiago123
No previously confirmed Global Player candidate was found that satisfies the six hard monotonic continuity gates.

Current status: **UNRESOLVED / NO SUPPORTED PRIOR ID**

### SA02-R49 — سرباز وطن
No previously confirmed Global Player candidate was found that satisfies the six hard monotonic continuity gates.

Current status: **UNRESOLVED / NO SUPPORTED PRIOR ID**

## Final SA02 identity state
- SA02 observations: 49
- CONFIRMED: 45
- UNRESOLVED: 4
  - ایرانی باوقار: prior hard contradiction remains unresolved
  - santiago123
  - ErFaN.m279
  - سرباز وطن
- SA02-specific Global IDs: **0**
- Distinct existing Global IDs used by confirmed SA02 observations: **45**

The original 22 membership-change projection was already corrected in Product. Current SA02 Read Model has exactly 6 derived membership changes:
- JOIN: santiago123
- JOIN: ErFaN.m279
- JOIN: سرباز وطن
- LEAVE: ehsan.7472
- LEAVE: hamed ir
- LEAVE: amin.shirazi

The other 16 apparent changes are rename/Emoji-only differences and are not membership events.

## Mandatory new operational rule
Before any Snapshot observation may be treated as a genuinely new Global Player:

Snapshot observation
→ search current resolved identities across ALL Clans
→ compare core fingerprint + six hard monotonic gates
→ inspect historical aliases/display-name variants and Emoji/punctuation changes
→ inspect membership/temporal continuity
→ if an existing identity is supported, link to it
→ only when no supported existing identity remains, enter NEW_IDENTITY_PENDING_AUTHORITY
→ never create a new Global Player solely because the display name changed

This search is mandatory for Multi-Clan UCS because a player may move between Clans.

## Conclusion
The user-reported "new" list was substantially caused by identity recognition/display-name/Emoji comparison failure. The current live state already contains the corrected eight existing Global ID links and contains no SA02-created Global IDs. The remaining three cases stay unresolved rather than being incorrectly promoted to new identities.

