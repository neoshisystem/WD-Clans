# UCS Real Snapshot Ingestion — Persian UNITY S13

## Classification
- Clan: Persian UNITY
- Snapshot: S13
- Official time: 2026-09-26T19:30:00Z (4 Mehr 1405, 23:00 Iran)
- Artifact SHA-256: 7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583
- Artifact inventory: 56 images = 48 profile cards + 8 ranking captures
- Ranking captures: 7 unique + 1 duplicate
- Observed roster: 48/50

## Current extraction result
The first-pass raw extraction records, for all 48 observed members:
rank, display name, role, stage, current-league clan medals, lifetime total kills, and profile total clan-medal count.

Profile evidence also visibly contains last-online, three weapon levels, and lifetime medal badges. Those fields are deliberately marked pending normalization rather than guessed.

## Identity / membership boundary
All 48 observations remain UNRESOLVED. No Global Player ID was created and no identity was inferred from name, rank, avatar, or one metric.

No canonical membership episode/event was invented from this single snapshot.

## Data safety
- Synthetic canonical data was not overwritten.
- No PERSIA/GOLDENCROWN data was changed.
- Real artifact identity and provenance are preserved.
- This is an evidence/raw-extraction checkpoint, not a final identity-resolved canonical commit.

## Next step
The second real Persian UNITY snapshot can now be processed against this S13 baseline. At that point we can validate roster joins/leaves, metric deltas, identity candidates, and the compact leaderboard change summaries without silently resolving identity.
