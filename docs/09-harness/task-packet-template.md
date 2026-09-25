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

## Acceptance criteria
- AC1 (FR-…): Given … when … then …
- …

## Test plan
- Implementation: unit …, integration …, API …, authz/isolation …, web component …, E2E (flows, viewports) …
- Independent QA focus: scenarios, isolation checks, viewports, exploratory charter (1–2 lines)

## Evidence required
- evidence/<task-id>/summary.md, gate log, screenshots (phone-small/tablet/laptop) for …, QA report, SEC/UX reviews (if triggered)

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
