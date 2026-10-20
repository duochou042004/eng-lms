# Documentation Index

> The docs are the project's durable memory. No agent should need chat history. Each file has one purpose. Cross-references use IDs:
> `SPEC §n`, `FR-*`, `NFR-*`, `A-*` (assumptions), `DEC-*` (decisions), `ADR-*`, `OQ-*` (open questions), `R-*` (risks), `T-M*.*` (tasks).
> Validate with `./scripts/check-docs.sh`.

## Reading paths

- **Product Owner (≈ 45 min):** product-brief → scope → spec-reconciliation → open-questions → roadmap → ux-flows → design-system §1, §6.
- **New agent session:** `../CLAUDE.md` → `../progress.json` → `handoff/HANDOFF.md` → the current task packet.
- **Architecture review:** architecture-overview → module-boundaries → domain-model → data-model → ADRs → security.

## Tree

| Area | File | Purpose |
|---|---|---|
| 00 Sources | [00-sources/README.md](00-sources/README.md) | Immutable inputs (SPEC, CONV), precedence, checksums |
| 01 Product | [product-brief.md](01-product/product-brief.md) | Vision, North Star, users, principles, success criteria |
| | [scope.md](01-product/scope.md) | MVP / P2 / Future / Never / needs a decision; guardrail procedure |
| | [assumptions.md](01-product/assumptions.md) | A-001..A-022 |
| | [glossary.md](01-product/glossary.md) | Ubiquitous language (en / vi / code) |
| | [spec-reconciliation.md](01-product/spec-reconciliation.md) | Conflicts C-01..C-16, gaps G-01..G-14, resolutions |
| | [roadmap.md](01-product/roadmap.md) | Phases P0–P4, milestones M0–M8, exit criteria |
| 02 Requirements | [functional-requirements.md](02-requirements/functional-requirements.md) | FR-* with acceptance criteria |
| | [non-functional-requirements.md](02-requirements/non-functional-requirements.md) | NFR-* with verification |
| | [traceability-matrix.md](02-requirements/traceability-matrix.md) | SPEC §1–§61 → FR → module → milestone → phase; SPEC §52 checklist |
| 03 Architecture | [architecture-overview.md](03-architecture/architecture-overview.md) | C4 context, containers, components; runtime flows; repo layout |
| | [module-boundaries.md](03-architecture/module-boundaries.md) | Module APIs, events, ownership, allowed dependency graph |
| | [domain-model.md](03-architecture/domain-model.md) | Aggregates, invariants, state machines, content vs activity, audience matrix |
| | [data-model.md](03-architecture/data-model.md) | Tables, keys, constraints, indexes, archive policy, sensitive fields |
| | [tech-stack.md](03-architecture/tech-stack.md) | Every technology with its justification; environment inventory; version policy |
| | [adr/README.md](03-architecture/adr/README.md) | ADR-0001..0016 |
| 04 Backend | [api-conventions.md](04-backend/api-conventions.md) | REST, errors (RFC 9457), paging, concurrency, idempotency |
| | [api-catalog.md](04-backend/api-catalog.md) | Endpoint design per module and milestone |
| | [security.md](04-backend/security.md) | Threat model, authn/authz, headers, input, files, audit, privacy, review checklist |
| | [engines.md](04-backend/engines.md) | Question types, activity lifecycle, grading, progress maths, attention rules |
| | [files-and-storage.md](04-backend/files-and-storage.md) | Upload pipeline, allow-list, streaming, access resolvers |
| | [validation-rules.md](04-backend/validation-rules.md) | Field-level rules |
| 05 Frontend | [information-architecture.md](05-frontend/information-architecture.md) | Navigation, routes, workspace tabs, page anatomy |
| | [ux-flows.md](05-frontend/ux-flows.md) | Critical flows F1–F9 with step budgets |
| | [design-system.md](05-frontend/design-system.md) | Visual language, tokens, components, status vocabulary, anti-patterns |
| | [responsive-standards.md](05-frontend/responsive-standards.md) | Breakpoints, reference viewports, rules, per-screen behaviour |
| | [interaction-states.md](05-frontend/interaction-states.md) | Loading, empty, error, offline, forms, autosave, toasts |
| | [accessibility.md](05-frontend/accessibility.md) | WCAG 2.2 AA rules and PR checklist |
| | [frontend-architecture.md](05-frontend/frontend-architecture.md) | Structure, data flow, routing, i18n, extensions |
| 06 Quality | [test-strategy.md](06-quality/test-strategy.md) | Pyramid, ownership (implementation vs QA), fixtures, architecture rules, coverage |
| | [quality-gates.md](06-quality/quality-gates.md) | G0–G6, severities |
| | [qa-protocol.md](06-quality/qa-protocol.md) | Independent QA procedure and report template |
| 07 Operations | [development-setup.md](07-operations/development-setup.md) | Toolchain per platform, local stack, Testcontainers on Docker or Podman |
| | [deployment.md](07-operations/deployment.md) | Topology, image, configuration, install, upgrade, observability |
| | [runbooks.md](07-operations/runbooks.md) | Backup, restore, resets, incidents |
| | [ci-cd.md](07-operations/ci-cd.md) | Workflows, required checks, branch protection, releases |
| 08 Extensibility | [plugin-store-spec.md](08-extensibility/plugin-store-spec.md) | Internal extension registry ("plugin store") |
| 09 Harness | [hoh-operating-model.md](09-harness/hoh-operating-model.md) | HoH loops, principles, cadence, escalation |
| | [agent-roles.md](09-harness/agent-roles.md) | Roles, tool permissions, path ownership |
| | [lessons-learned.md](09-harness/lessons-learned.md) | Mistakes so far, their causes and the rules they produced (read before a packet) |
| | [skills-catalog.md](09-harness/skills-catalog.md) | Project skills |
| | [coding-agent-rules.md](09-harness/coding-agent-rules.md) | Binding rules for coding agents; Boot 4 pitfalls |
| | [git-governance.md](09-harness/git-governance.md) | Branches, commits, PRs, merges, releases |
| | [task-packet-template.md](09-harness/task-packet-template.md) | Packet template and status transitions |
| | [evidence-protocol.md](09-harness/evidence-protocol.md) | Evidence layout and summary template |
| | [session-handoff-protocol.md](09-harness/session-handoff-protocol.md) | Memory layers, context threshold, handoff and prompt |
| | [schemas/progress.schema.json](09-harness/schemas/progress.schema.json) | Schema for `progress.json` |
| | [claude-settings.proposed.json](09-harness/claude-settings.proposed.json) | Proposed agent permissions (OQ-15) |
| 10 Governance | [decision-log.md](10-governance/decision-log.md) | DEC-001.. |
| | [risk-register.md](10-governance/risk-register.md) | R-01..R-20 |
| | [open-questions.md](10-governance/open-questions.md) | OQ-01..OQ-15 with defaults |
| Tasks | [tasks/backlog.md](tasks/backlog.md) | Packet stubs M0–M8 |
| | [tasks/T-M1.1-repo-bootstrap-governance.md](tasks/T-M1.1-repo-bootstrap-governance.md) | **First gated task** |
| Handoff | [handoff/HANDOFF.md](handoff/HANDOFF.md) · [handoff/next-session-prompt.md](handoff/next-session-prompt.md) | Session continuity |

## PO goal deliverables → where each one lives

| Requested | Location |
|---|---|
| Project/product plan, scope, assumptions, milestones | 01-product/* |
| Functional requirements + acceptance criteria | 02-requirements/functional-requirements.md |
| Domain/data model, architecture, ADRs | 03-architecture/* |
| Backend/API/security specs | 04-backend/* |
| Frontend IA, UX flows, responsive/design standards | 05-frontend/* |
| Testing/QA and release gates | 06-quality/* |
| Development/deployment/runbooks | 07-operations/* |
| Plugin-store specification | 08-extensibility/plugin-store-spec.md |
| Agent roles, skills, tool permissions | 09-harness/agent-roles.md, skills-catalog.md, `.claude/agents`, `.claude/skills` |
| Coding-agent harness rules | 09-harness/coding-agent-rules.md, `CLAUDE.md` |
| Cross-session memory / handoff protocol | 09-harness/session-handoff-protocol.md, handoff/ |
| Risk register + decision log | 10-governance/* |
| progress.json | `../progress.json` + schema |
