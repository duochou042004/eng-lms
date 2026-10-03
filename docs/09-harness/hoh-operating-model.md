# Harness-of-Harnesses (HoH) Operating Model

> Purpose: deliver the product through **small, verifiable increments**. Each increment is planned, built and **independently evaluated** in nested
> loops whose state lives in the repository (not in chat). Trace: PO directive (HoH), SPEC §60.H ("don't build everything at once").

## 1. The loops

```text
OUTER LOOP (milestone, owner LC + PO) ─────────────────────────────────────────────────────────────────────────────────┐
│ plan milestone (roadmap) → slice into task packets → [INNER LOOP × n] → milestone gate G5 → retro → replan            │
│                                                                                                                      │
│   INNER LOOP (task, ≤ 2 agent-days, one branch, one PR) ─────────────────────────────────────────────────────┐        │
│   │ 1 PLAN     LC writes packet (G0)                           → docs/tasks/T-*.md, progress.json=ready      │        │
│   │ 2 BUILD    Implementer: TDD, small commits, docs           → branch feature/T-*                          │        │
│   │ 3 VERIFY   Implementer runs gate.sh (G1), opens PR (G2)    → evidence/T-*/impl, CI                        │        │
│   │ 4 EVALUATE QA (fresh context) + SEC/UX if triggered (G3)   → evidence/T-*/qa, review/                     │        │
│   │ 5 DECIDE   LC: merge (G4) or return with findings          → PR comments, decision-log if needed          │        │
│   │ 6 RECORD   progress.json, handoff, next packet ready       → docs/handoff/, progress.json                 │        │
│   └─────────── on FAIL: back to 2 with the findings list (max 3 cycles, then LC re-plans or splits the task) ──┘        │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
RELEASE LOOP (owner LC + PO): release branch → G6 → master + tag → deploy → post-release check
```

**Harnesses** (the mechanisms each loop relies on):
- **State harness:** `progress.json` (machine-readable) + `docs/handoff/HANDOFF.md` (human-readable) + git history.
- **Quality harness:** `scripts/gate.sh`, CI required checks, architecture tests, authz and isolation suites, E2E viewports.
- **Evaluation harness:** the QA protocol (independent), the Security and UX checklists.
- **Knowledge harness:** this docs tree, ADRs, the decision log, the risk register, the glossary.
- **Context harness:** the session-handoff protocol (context monitoring, handoff prompt ≤ 4,000 characters).

## 2. Principles

1. **Small and verifiable:** a packet has ≤ ~10 ACs, one PR, and is reviewable in < 30 minutes. Split anything larger.
2. **Evidence over assertion:** "tests pass" without a log or report in `evidence/` counts as not done.
3. **Independence:** the evaluator never shares a context with the implementer (qa-protocol.md §1).
4. **Traceability:** every change traces to FR/NFR/DEC IDs. Untraced work is a `SCOPE` finding.
5. **Reuse first:** before creating a component, endpoint or doc, search for an existing one (`ui/` catalogue, api-catalog, docs index).
6. **Stop the line:** S1 findings, red `develop` CI or a failed restore drill halt new feature work until they are fixed.
7. **No chat-only memory:** anything that must survive the session goes into the repo (docs, progress.json, evidence) before the session ends.

## 3. Cadence

| Event | When | Output |
|---|---|---|
| Session start | Every agent session | Read progress.json → HANDOFF.md → current packet (CLAUDE.md read order) |
| Task end | Each merge | progress.json + handoff update, next packet ready |
| Milestone gate | End of M1..M8 | QA regression report, retro, PO demo |
| Replan | After each milestone | roadmap/backlog/risk updates |
| Dependency batch | Monthly | `chore/<task-id>-deps-YYYY-MM` PR (the batch gets a backlog task ID) |
| Restore drill | Before each release | evidence/<release>/restore-drill.md |

## 4. Parallelism

- Backend and frontend packets of the same feature may run in parallel **after** the API contract for that feature is merged (a contract-first
  sub-packet: an OpenAPI change + stub controller returning 501 + MSW handlers).
- Two implementers never edit the same module in parallel. The LC serialises packets per module.
- QA may evaluate task N while task N+1 is being implemented.

## 5. Milestone retrospective (template: `evidence/<milestone>/retro.md`)

What went well · what hurt (flaky tests, rework, unclear ACs) · gate effectiveness (did QA find what implementation tests missed? → add tests) ·
harness changes (rules, skills, checklists) → apply them as a `docs/` or `chore/` packet · risk register changes.

## 6. Escalation to the Product Owner

The LC escalates (as an open question with a recommended default) when: scope is ambiguous or expanding; a requirement conflicts with a
standard; an external or outward-facing action is needed (repo creation, deployment, a paid service, a host setting); a release is ready; there is a legal or privacy question.
While waiting, work continues on non-blocked packets using documented defaults, marked `assumption` in the packet.
