# Architecture Decision Records

> Format: lightweight MADR. File name: `ADR-NNNN-kebab-title.md`. Status values: `Proposed` → `Accepted` → (`Superseded by ADR-x` | `Deprecated`).
> An ADR is **required** for new infrastructure, a new framework or library that shapes the architecture, a new module or extension point,
> a change of persistence, auth or deployment model, or anything that contradicts an existing ADR. ADRs are immutable once Accepted.
> To change one, write a new ADR that supersedes it.

| ADR | Title | Status |
|---|---|---|
| [0001](ADR-0001-modular-monolith-spring-modulith.md) | Modular monolith with Spring Modulith | Accepted (baseline) |
| [0002](ADR-0002-java25-spring-boot4-maven.md) | Java 25, Spring Boot 4.1, Maven Wrapper, generated with the Spring Boot CLI | Accepted (baseline) |
| [0003](ADR-0003-postgresql-jpa-flyway.md) | PostgreSQL 18 + Spring Data JPA + Flyway | Accepted (baseline) |
| [0004](ADR-0004-react-vite-spa-same-origin.md) | React + Vite SPA served same-origin from the backend jar | Accepted (baseline) |
| [0005](ADR-0005-session-cookie-auth.md) | Server-side session cookies (Spring Session JDBC), no JWT | Accepted (baseline) |
| [0006](ADR-0006-single-tenant-single-tutor.md) | Single tenant: one deployment, one tutor | Accepted (baseline) |
| [0007](ADR-0007-unified-activity-engine.md) | One Activity engine for assignments and assessments | Accepted (baseline) |
| [0008](ADR-0008-snapshot-on-assign.md) | Immutable snapshot when assigning work to a student | Accepted (baseline) |
| [0009](ADR-0009-question-types-registry-jsonb.md) | Question types as registered handlers with jsonb content | Accepted (baseline) |
| [0010](ADR-0010-file-storage-port-local-fs.md) | FileStorage port with a local filesystem adapter | Accepted (baseline) |
| [0011](ADR-0011-archive-not-soft-delete.md) | Archive instead of global soft delete | Accepted (baseline) |
| [0012](ADR-0012-podman-quadlet-caddy-deployment.md) | Podman Quadlet + Caddy on a single host | Accepted (baseline) |
| [0013](ADR-0013-design-system-react-aria-css-modules.md) | In-house design system on React Aria Components + CSS Modules + tokens | Accepted (baseline) |
| [0014](ADR-0014-openapi-contract-generated-client.md) | OpenAPI generated from code, committed, drift-checked; typed client | Accepted (baseline) |
| [0015](ADR-0015-generic-metrics-goals-progress.md) | Generic metrics and observations back goals and progress | Accepted (baseline) |
| [0016](ADR-0016-student-namespace-isolation.md) | Student API namespace without a studentId parameter | Accepted (baseline) |

"Accepted (baseline)" means accepted by the Lead Coordinator in T-M0.1. PO approval of the planning baseline confirms them.

## Template

```markdown
# ADR-NNNN: Title
- Status: Proposed | Accepted | Superseded by ADR-x
- Date: YYYY-MM-DD · Deciders: LC (+ PO if product-affecting) · Trace: SPEC §, FR/NFR, DEC
## Context
## Decision
## Alternatives considered
## Consequences (positive / negative / follow-ups)
## Verification (how we know it holds: tests, checks)
```
