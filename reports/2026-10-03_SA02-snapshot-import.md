# UCS — Iranian Army [PU] SA02 Snapshot Import — Final Validation Report

Status: **IMPORTED / VALIDATED / REVIEW_REQUIRED — NOT SEALED**

## Source
- Snapshot: SA02
- Clan: Iranian Army [PU]
- Official timestamp: 2026-10-03T19:30:00.000Z
- League: LEAGUE-WD-2026W40
- ZIP SHA-256: 5de1394395555bb9e3a628cfd11a479490e1a2633ab58c931053a3e3939ed75d
- Inventory: 56 files
- Inventory SHA-256: 9147cd6fcc571be53cec8bbb5f19c6681accb4237c88dcf82fe5b9c6cf5dfcab
- Ranking screenshots: 7
- Profile cards: 49
- Roster evidence: 49/50

## Weapon semantic mapping
Applied current locked mapping to all 49 profiles:
- 25mm = first observed source value
- Hydra = second observed source value
- Hellfire = third observed source value

Example: ehsan 1334 / 459 / 74 -> 25mm 1334, Hydra 459, Hellfire 74.

The historical Hydra/Hellfire defect fixed before SA02 was explicitly checked during this intake. No synthetic records were changed.

## Identity / continuity
- 45 observations confirmed against existing Global Player identities.
- 4 observations remain unresolved:
  - rank 13 ایرانی باوقار — prior SA01 case remains CONTRADICTION with no Global ID.
  - rank 45 santiago123 — no established prior identity.
  - rank 48 ErFaN.m279 — prior Persian UNITY observations are still unresolved; no Global ID fabricated.
  - rank 49 سرباز وطن — no established prior identity.
- Hard continuity decreases among the 45 confirmed links: 0.
- Negative numeric Delta records: 0.
- Added Delta records: 90 = 45 Total Kills + 45 Current League Clan Medals.

## Review-required metric anomalies
Seven confirmed players have a lower Profile Total Clan Medal Count than in SA01:
- GuiltyBlueSnake: 264427 -> 43071
- RAMIN: 54745 -> 34429
- leeroth: 253879 -> 27985
- Falcon: 404280 -> 27233
- CheekyIvoryWolf: 296643 -> 16747
- AMIR: 112002 -> 12253
- CaringBlueBear: 534403 -> 5913

Profile Total Clan Medal Count is Membership-Episode scoped, so these are not hard lifetime identity contradictions and no negative Delta was stored. However both SA01 and SA02 belong to League W40, so the established Leave -> League boundary -> Return reset rule does not explain a reset between the two captures. These cases remain review-required.

## Roster completeness
SA02 source shows 49/50. Unlike SA01, there is no separate Authority instruction recorded for SA02 that permits treating roster position 50 as an approved exclusion. Therefore the Snapshot remains NOT SEALED for completeness review.

## Persisted state
Canonical:
- observations: 248
- global player identities: 50
- membership episodes: 85
- membership events: 48
- resolution cases: 246
- delta results: 160
- evidence artifacts: 7

Raw replay:
- Product: Snapshot/Iranian Army [PU]/SA02.raw.json
- Memory: projects/UCS/snapshots/Iranian Army [PU]/SA02.raw.json
- Memory metadata: projects/UCS/snapshots/Iranian Army [PU]/SA02.archive-meta.json

## Validation
- Canonical validation: PASS
- Foundation Validation #357: SUCCESS
- GitHub Pages #126: SUCCESS
- Product HEAD: fb8dee777e5516a51c2e7871b8952afd8b43f9af

## Next
Resolve or explicitly accept the 49/50 roster completeness case, and review the seven Profile Total Clan Medal anomalies plus the four unresolved identity cases before issuing a sealed closure checkpoint.
