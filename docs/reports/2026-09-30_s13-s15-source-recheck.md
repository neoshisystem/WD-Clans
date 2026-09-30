# Persian UNITY S13→S15 — Fresh ZIP Source Recheck

Status: SOURCE_RECHECK_COMPLETE / REPLAYABILITY_HARDENED
Date: 2026-09-30

## Artifact identity
- S13 ZIP SHA-256: 7e19f1702139c5d78c9f19acb43a5e0fc0fd14b4f34e8f40be992c55f154f583
- S13 inventory: 56 files; inventory hash a3ec8927dc6bcf263a36ed57f54dfd21c76e7d8ee1101cd7fd0b067a2b65dea1
- S14 ZIP SHA-256: 9d0006b7e4e1fafef9598be30bf121632ac1b2caa8c6b7cebe26e99aef42ba9d
- S14 inventory: 58 files; inventory hash cfefc6a5a96985eba187b1d115c901fb2d773578fabfcd18fc6b1f939f4866be
- S15 ZIP SHA-256: eb652100c9e00a8882bbf4598b739c619bcdfb4672632d1a3c476cb720b678c5
- S15 inventory: 58 files; inventory hash 5e8d79979fc7656c259ae65b919042cdd18d378a29b5c796f89d94fd697119bd

## Fresh recheck findings
- The three uploaded ZIPs were hashed and inventoried again. Their artifact identities match the previously registered ZIPs.
- S13 RawExtraction was not complete enough for replay: last_online_display, lifetime_medals and weapon_levels were absent from the product raw record, although these fields are source-visible.
- S13 RawExtraction contained source transcription differences; CORR-S13-SOURCE-RECHECK-2026-09-30 records the corrections.
- S14 data values are consistent with the corrected source checkpoint, but its raw evidence references were too coarse.
- S15 values are consistent with the current Canonical source record, but raw used weapons instead of weapon_levels.
- Exact source display names remain evidence and are not replaced by normalized names.
- Hard monotonic contradictions remain continuity blockers. No automatic identity swap is permitted.

## Future S16 guardrails
ZIP → SHA → inventory → visual extraction → Raw archive → source-scope validation → continuity checks → Canonical → Projection → Static → CI/Pages.
