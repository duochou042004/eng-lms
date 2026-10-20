# Task Packet Template

> Copy to `docs/tasks/<task-id>-<slug>.md`. A packet must pass G0 (quality-gates.md) before it is set to `ready`.
> Size: ≤ 2 agent-days, ≤ ~10 ACs, one PR. Split anything larger.

```markdown
# <TASK-ID>: <Title>

| Field | Value |
|---|---|
| Milestone | M? |
| Status | draft · ready · in_progress · in_review · qa · awaiting_approval · done · blocked · cancelled |
| Owner role | BE / FE / LC / QA |
| Branch | feature/<task-id>-<slug> |
| Depends on | <task IDs, merged> |
| Estimate | ≤ 2 agent-days |
| Risk tier | H / M / L and why (quality-gates G3: H = SEC trigger, M = UI or behaviour, L = docs/chore/scripts) |
| Trace | SPEC §…, FR-…, NFR-…, DEC-…, ADR-… |

## Goal
One paragraph: the user-visible or engineering outcome.

## Scope
- In: …
## Out of scope (explicit)
- …

## Guardrail answers (scope.md §6)
1. Trace: … 2. Drifts toward excluded scope? no/why … 3. Mandatory setup added? … 4. Weekly use? … 5. Hard-coded semantics? …

## Design notes
Modules/packages/routes/components touched; API changes (link api-catalog rows); migrations; extension points; decisions needed.

## UI rules (UI packets; fixed at G0, DEC-131 (2))
- Columns per breakpoint and their shares (`table-layout: fixed`), where each value may break (names at spaces, emails at `@`/`.`, phones never), what never wraps.
- Focus target after every action that removes or disables the focused element (delete, close, last page, pending buttons).
- Layering: toasts vs modals and sheets; what is inert while a dialog is open.
- Validation rule per field (validation-rules.md row) and URL/contact schemes.
- Copy: the vi verb on each button; counters with non-breaking spaces.

## Domain rules (packets that write data; fixed at G0, lessons-learned L-04)
- Invariants (what is always true; which DB constraint or check enforces each).
- Transitions: a table of state × action → new state or the refusal (problem code), illegal transitions included.
- Concurrency: the version rule (stale write → 409 `STALE_VERSION`), locks and what they must never span (e.g. no lock across bcrypt).
- Idempotency of creates and retries; the transaction boundary; events published and their listeners.
- Time: which instants are stored (UTC) and which zone a date is computed in (the account's `timeZone`, not the browser's).
- Audit entries; the audience DTOs and what each audience never sees (ADR-0016).
- Tests: one table-driven test over every transition (legal and illegal) and one concurrent-update test per writable aggregate.

## Acceptance criteria
- AC1 (FR-…): Given … when … then …
- …

## Test plan
- Implementation: unit …, integration …, API …, authz/isolation …, web component …, E2E (flows, viewports) …
- Independent QA focus: scenarios, isolation checks, viewports, exploratory charter (1–2 lines)

## Evidence required
- evidence/<task-id>/summary.md (with the self-check list and the G3 cost table), one gate log on the final head + green CI, local screenshots
  (phone-small/tablet/laptop, not committed) for …, the G3 reviews of the risk tier
- The gate AC reads: "`./scripts/gate.sh` green once on the final head and CI green; existing assertions kept"

## Docs to update
- …

## Risks & assumptions
- …

## Commands (reproducible)
```bash
…
```
```

## Status transitions (mirrored in progress.json)

`draft → ready` (LC, G0) → `in_progress` (implementer starts) → `in_review` (PR open, G2 green) → `qa` (G3 running) → `awaiting_approval` (G3 passed)
→ `done` (G4 merged). Any state → `blocked` (a blocker is recorded) → back. Any state → `cancelled` (DEC entry).
