# UCS Documentation Control v0.1

**Status:** APPROVED PROJECT GOVERNANCE  
**Approved:** 2026-09-28 by Project Authority  
**Scope:** Documentation continuity, checkpoint synchronization, task read/update contracts, and fail-closed documentation validation for UCS.

## 1. Purpose

UCS must remain recoverable when a Conversation reaches a context limit, disconnects, crashes, or is replaced.

A successor must be able to reconstruct the project from the repositories without relying on hidden conversation memory, an old chat transcript, or an unverified embedded SHA.

This contract therefore governs:

- which documents are canonical owners of which information;
- what an Agent must read for each task class;
- which documents must be updated when a material event occurs;
- what constitutes a documentation checkpoint;
- how documentation drift is detected;
- when a checkpoint is allowed to be considered sealed.

This document does **not** replace product architecture or domain contracts.

## 2. Source precedence

For current product reality:

1. Live `neoshisystem/WD-Clans/main` state;
2. `data/canonical.json` for Canonical product data;
3. executable CI/test evidence;
4. current UCS governance/state documents;
5. Memory-ai continuity material as durable project context.

A documentation file never overrides verified live repository reality.

Historical SHAs remain historical evidence. They are never silently reused as current state.

## 3. Canonical ownership

One information class has one canonical owner.

| Information class | Canonical owner | Purpose |
|---|---|---|
| Product implementation | WD-Clans live `main` | Current product reality |
| Canonical data | `data/canonical.json` | Product source of truth |
| Product operating rules | `docs/UCS_AGENT_OPERATIONS.md` + this control | Execution law |
| Project continuity control | `projects/UCS/DOCUMENTATION_CONTROL.md` | Documentation synchronization/governance |
| Current project state | `projects/UCS/CURRENT_STATE.md` | Mutable current-state summary |
| Next action | `projects/UCS/NEXT_ACTION.md` | Intended successor action |
| Shift/handoff state | `projects/UCS/SHIFT_REPORT.md` | Point-in-time continuity briefing |
| Authority decisions | `projects/UCS/DECISIONS.md` | Decisions/invariants/proposals |
| Project chronology | `projects/UCS/TIMELINE.md` | Semantic milestone history |
| Durable execution/review evidence | `projects/UCS/conversations/development-reports/` | Historical execution records |
| Discovery/navigation map | `projects/UCS/UCS_CR02_DOCUMENTATION_INDEX.md` | Cold-agent routing |
| Current checkpoint | `projects/UCS/CHECKPOINT.md` | Cross-repository synchronization anchor |

Controlled duplication is allowed for discoverability, but the canonical owner must remain explicit.

## 4. Checkpoint semantics

A checkpoint is a verified project state boundary, not a chat message.

A checkpoint is **SEALED** only when:

1. Product live state has been re-verified.
2. The completed task/report is recorded.
3. All applicable canonical documentation owners are reconciled.
4. `CURRENT_STATE.md`, `NEXT_ACTION.md`, `SHIFT_REPORT.md` and `UCS_CR02_DOCUMENTATION_INDEX.md` point to the same checkpoint.
5. `CHECKPOINT.md` records the verified Product `main` HEAD.
6. Product-local documentation validation passes.
7. Cross-repository documentation-sync validation passes.
8. No material contradiction remains unclassified.

The SHA of the commit that contains a checkpoint file is not embedded in that same file. The containing Git commit is the durable identity of the Memory checkpoint. This avoids impossible self-referential SHA requirements.

## 5. Task read/update contract

### Bootstrap / takeover
**Read:** `AGENT_START_HERE.md`, this document, `CURRENT_STATE.md`, `NEXT_ACTION.md`, `SHIFT_REPORT.md`, `DECISIONS.md`, latest relevant report, and task-specific references.

**Update:** none during read-only calibration. After authorized acceptance, establish/update the current checkpoint only when the project actually reaches a meaningful state boundary.

### Real Snapshot intake
**Read:** Snapshot Intake Playbook, UCS Agent Operations, schema/file map, current state, next action, decisions, fingerprint rules, latest relevant Snapshot/development report.

**Update:** Snapshot evidence/report, `CURRENT_STATE.md`, `NEXT_ACTION.md`, `SHIFT_REPORT.md`, `CHECKPOINT.md`; update Timeline/Index when the new Snapshot materially changes project chronology/discoverability.

### Implementation / corrective development
**Read:** this document, Agent Operations, current state, next action, relevant architecture/contract docs, latest relevant report, and exact task scope.

**Update:** development report, affected current/next/decision records, `CHECKPOINT.md`, shift report, and Index only when document topology or discoverability changes.

### Review
**Read:** task scope, implementation/report, live repository state, tests/CI/evidence, current checkpoint.

**Update:** review/development report and any current/next/checkpoint owner whose truth changed.

### Research
**Read:** task-specific source material plus current governance.

**Update:** research record only unless the research creates an explicitly approved durable decision, obligation, or correction.

### Handoff / rollover
**Read:** current checkpoint, current state, next action, shift report, latest execution/review report, decisions, and applicable handoff protocol.

**Update:** finalize the outgoing shift record, update current/next/checkpoint/index, and preserve historical records rather than rewriting them.

## 6. Documentation impact rule

At every material event, classify documentation impact before checkpoint closure:

- authority decision/clarification;
- implementation or accepted merge;
- meaningful test/evidence milestone;
- material incident or durable failed approach;
- new/closed/deferred obligation;
- Snapshot ingestion or continuity result;
- role/Shift transition;
- contradiction, stale document, or recovery event.

Routine chat messages, harmless retries, and repeatable diagnostics do not require diary updates.

## 7. No documentation drift

A material product change must not be considered fully complete merely because code/tests pass.

The completion chain is:

`implementation → validation/evidence → documentation reconciliation → documentation-sync check → checkpoint`

If documentation reconciliation cannot be proven, checkpoint status is:

`DRIFTED` or `BLOCKED`, not `SEALED`.

Historical point-in-time handoffs and historical reports are not rewritten merely because newer state exists.

## 8. Automation

UCS uses two validation layers:

1. **Product-local gate** — `scripts/check-ucs-documentation.js`, executed by Product CI.
2. **Cross-repository gate** — `projects/UCS/tools/check_documentation_sync.py`, executed from Memory-ai against both the current Memory checkout and a fresh checkout of WD-Clans.

The cross-repository checker verifies required files, checkpoint identity, required references, and equality between the recorded checkpoint Product HEAD and live Product HEAD.

A scheduled Memory-ai run additionally detects Product changes that have not yet been followed by a documentation checkpoint.

These checks validate structure and recorded synchronization; they do not replace human/Agent semantic Reality Check.

## 9. Fail-closed states

Use only:

- `SYNCED` — required documentation owners reconcile with the checkpoint.
- `DRIFTED` — live state advanced beyond the recorded checkpoint.
- `BLOCKED` — required validation/evidence failed.
- `UNKNOWN` — required fact cannot be established.

Never convert `UNKNOWN` or `DRIFTED` to `SYNCED` by assumption.

## 10. Conversation recovery

A successor must start from `projects/UCS/AGENT_START_HERE.md`, then the current checkpoint and its required read order.

If a predecessor disappears unexpectedly:

- use the last sealed checkpoint as the recovery baseline;
- inspect live Product + Memory state;
- reconstruct only verifiable activity after that checkpoint;
- preserve unsupported intervals as `UNKNOWN`;
- do not infer missing work from the absence of a report.

## 11. Scope boundary

This system is intentionally smaller than the Noshika continuity system it was inspired by.

It does not introduce a global Sentinel topology, a database, a server dependency, or a second product state store.

Its purpose is bounded: keep the existing UCS documentation model recoverable and synchronized for the next several Conversations while the project reaches stability.
