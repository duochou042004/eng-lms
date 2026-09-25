# Eng-LMS — Private 1:1 Teaching Workspace

A workspace where **one English tutor** manages students, lessons, learning plans, homework, tests, materials, feedback, private notes and progress,
without being forced into a fixed curriculum. Students log in with accounts the tutor creates and see only their own learning space.

> **Status:** Phase P0 (planning baseline) is complete and **awaiting Product Owner approval**. There is no product code yet, by design.
> The live state is in [`progress.json`](progress.json). The narrative state is in [`docs/handoff/HANDOFF.md`](docs/handoff/HANDOFF.md).

## Start here

| You are… | Read |
|---|---|
| The Product Owner | [`docs/01-product/product-brief.md`](docs/01-product/product-brief.md) → [`docs/01-product/scope.md`](docs/01-product/scope.md) → [`docs/10-governance/open-questions.md`](docs/10-governance/open-questions.md) → [`docs/01-product/roadmap.md`](docs/01-product/roadmap.md) |
| A coding agent | [`CLAUDE.md`](CLAUDE.md) (read order and rules) |
| An engineer | [`docs/README.md`](docs/README.md) (full index) → [`docs/07-operations/development-setup.md`](docs/07-operations/development-setup.md) |

## Stack (planned; see [`docs/03-architecture/tech-stack.md`](docs/03-architecture/tech-stack.md))

Java 25 · Spring Boot 4.1 (modular monolith, Spring Modulith) · PostgreSQL 18 · Flyway · React + TypeScript + Vite (SPA served same-origin) ·
React Aria Components + CSS Modules · Playwright · Podman (Quadlet) + Caddy.

## Repository layout

```text
docs/        documentation system (product → requirements → architecture → backend → frontend → quality → ops → extensibility → harness → governance)
evidence/    per-task proof (reproducible)
scripts/     gates and tooling (check-docs now; gate.sh, merge-gate.sh … from M1)
.claude/     agent definitions and project skills (the harness)
progress.json  machine-readable project state
backend/ web/ e2e/ qa/ deploy/ api/   (created in M1)
```

## Quick check

```bash
./scripts/check-docs.sh    # validates progress.json, links, ID references, source integrity, handoff prompt size
```
