# Architecture Overview

> Status: Baseline v1.0 · Style: **modular monolith** (ADR-0001) · One deployable app plus PostgreSQL and a reverse proxy.
> Related: [module-boundaries](module-boundaries.md) · [domain-model](domain-model.md) · [data-model](data-model.md) ·
> [tech-stack](tech-stack.md) · [ADRs](adr/README.md)

## 1. System context (C4 level 1)

```text
            ┌───────────┐  HTTPS (browser, desktop-first)   ┌──────────────────────────────┐
            │   Tutor   │ ────────────────────────────────► │                              │
            └───────────┘                                   │   Eng-LMS Teaching Workspace │
            ┌───────────┐  HTTPS (browser, phone-first)     │   (single deployment,        │
            │  Student  │ ────────────────────────────────► │    single tutor)             │
            └───────────┘                                   └──────────────┬───────────────┘
                                                                           │ (links only, no integration)
        Outside the system: Zalo/Facebook/phone (communication, enrolment, payment) · Google Meet/Zoom (meeting URL is stored) ·
        YouTube/Vimeo/Drive/SoundCloud (allow-listed embeds rendered in the student's browser) · Operator (SSH, runbooks)
```

## 2. Containers (C4 level 2)

```text
 Internet ──443──► ┌────────────┐  http  ┌──────────────────────────────────────────────┐  JDBC  ┌──────────────┐
                   │   Caddy    │ ─────► │  app (Spring Boot 4.1 on JDK 25)             │ ─────► │ PostgreSQL 18│
                   │ TLS, HSTS, │        │  • /api/v1/**  REST JSON (session cookie)    │        │  + unaccent  │
                   │ gzip/zstd  │        │  • /**        SPA static files (built React) │        │  + pg_trgm   │
                   └────────────┘        │  • :8081 actuator (internal only)            │        └──────────────┘
                                         │  • @Scheduled jobs (in-process)              │
                                         └──────────────────┬───────────────────────────┘
                                                            │ file I/O (FileStorage port)
                                                     ┌──────▼───────┐        nightly ┌─────────────────┐
                                                     │ files volume │ ─────────────► │ backup (off-site)│
                                                     └──────────────┘   + pg_dump    └─────────────────┘
```

- **One image, one version.** The SPA is built and copied into the jar's `static/` directory at image build time (ADR-0004). It is served same-origin, so there is no CORS and cookies stay simple.
- **No** Redis, message broker, search engine, Kubernetes or separate microservices (SPEC §36). Each of these needs an ADR backed by evidence.
- Runtime: rootless **Podman** managed by systemd **Quadlet** units (ADR-0012). Development runs the same PostgreSQL image through `docker compose` or `podman compose` (DEC-106).

## 3. Components: application modules (C4 level 3)

Base package `com.englms`. Each module is a Spring Modulith application module. Internals are package-private, and only the
module's root package (its **API**) and `events` subpackage are visible to other modules. Full contracts: [module-boundaries.md](module-boundaries.md).

```text
                                   ┌────────────┐
                                   │ dashboard  │  (read-only composition: Today, Home)
                                   └─────┬──────┘
                                   ┌─────▼──────┐
                                   │  progress  │  (read-only: per-student and overview)
                                   └─────┬──────┘
          ┌───────────────┬──────────────┼───────────────┬─────────────────┐
     ┌────▼────┐    ┌─────▼─────┐   ┌────▼─────┐   ┌─────▼──────┐   ┌──────▼─────┐
     │  plans  │    │   goals   │   │  notes   │   │ activities │   │  lessons   │
     └────┬────┘    └─────┬─────┘   └────┬─────┘   └──┬───┬─────┘   └──┬───┬─────┘
          │               │◄──(ObservationRecorder)───┤   │            │   │
          │               │              │     ┌──────▼┐  │            │   │
          │               │              │     │questions│ │            │   │
          │               │              │     └──────┬┘  │            │   │
          │               │              │        ┌───▼───▼────────────▼┐  │
          │               │              │        │       library       │  │
          │               │              │        └─────────┬───────────┘  │
          │               │              │              ┌───▼────┐         │
          │               │              │              │ files  │         │
          │               │              │              └────────┘         │
     ┌────▼───────────────▼──────────────▼─────────────────────────────────▼──┐
     │                         students  (StudentDirectory API)               │
     └───────────────────────────────────┬────────────────────────────────────┘
                                   ┌─────▼──────┐     ┌──────────┐   ┌─────────┐
                                   │  identity  │     │ settings │   │  audit  │ (listens to events)
                                   └────────────┘     └──────────┘   └─────────┘
                    shared (kernel: ids, time, errors, paging, sanitizer, security context, extension registry)
```

Arrows point from the depending module to its dependency. Dependencies flow **downwards only**, and cycles fail the build (NFR-MNT-01).

## 4. Key runtime flows

### 4.1 Request pipeline

`Caddy → Spring Security filter chain (session, CSRF, role gate on /api/v1/tutor/** and /api/v1/student/**, password-change gate)
→ Controller (web adapter, DTO validation) → Application service (@Transactional, authorization of ownership) → Domain
(aggregate invariants) → Repository (JPA) → PostgreSQL`. Errors are mapped centrally to RFC 9457 Problem Details (`api-conventions.md` §5).

### 4.2 Assign → attempt → grade → publish (activities)

```text
Tutor POST /tutor/activities/{id}/assignments ──► activities: build snapshot via questions API (content + answer keys)
                                                  ──► insert StudentActivity(snapshot) per student      [tx]
Student POST /student/work/{saId}/attempts     ──► Attempt(IN_PROGRESS, deadlineAt?)                   [tx]
Student PUT  .../responses/{itemKey} (autosave) ──► Response upsert (rejected after deadline + grace)
Student POST /student/attempts/{id}/submit      ──► handlers auto-grade ► GRADED | NEEDS_REVIEW        [tx]
                                                  ──► event AttemptSubmitted ► (audit)
Tutor   PUT  /tutor/attempts/{id}/grades        ──► manual scores/overrides (audited)
Tutor   POST /tutor/attempts/{id}/publish       ──► releasedAt; if recordResultAs: goals.ObservationRecorder
                                                      .upsertFromSource(...) (same tx, idempotent)       [tx]
                                                  ──► event ResultPublished ► (audit)
```

### 4.3 After-lesson wrap-up (the critical flow, one command)

`POST /tutor/lessons/{id}/wrap-up` is handled by `lessons.WrapUpService`, which orchestrates one transaction:
lesson status and summary → `notes` API (create note) → `library` API (attach existing or new materials; new uploads were already
stored as files and are attached here) → `activities` API (assign existing, or quick-create ad-hoc and assign) → optional next lesson.
Orchestration lives in the `lessons` module and calls only the **public APIs** of the other modules. The operation is idempotent
through the `Idempotency-Key` header (stored for 24 h).

### 4.4 Events

Spring Modulith application events with the **JDBC event publication registry**, so side effects survive a crash and are
retried at startup. MVP events: `StudentCreated`, `StudentStatusChanged`, `PasswordChanged`, `LoginSucceeded`/`Failed`,
`LessonCompleted`, `AttemptSubmitted`, `ResultPublished`, `ResultUnpublished`, `GradeOverridden`, `ContentArchived`.
Consumer in the MVP: `audit`. (Result → metric observation is a **direct API call** inside the publish transaction, DEC-025.)
**Events are never used where the caller needs the result synchronously**; P2 notifications will be the second consumer.

## 5. Cross-cutting concerns

| Concern | Approach | Doc |
|---|---|---|
| Authentication | Server-side session (Spring Session JDBC), form-style JSON login, remember-me optional | ADR-0005, security.md |
| Authorization | URL role gates, plus ownership checks in services, plus the student namespace that takes no `studentId` parameter | ADR-0016 |
| Validation | Bean Validation on DTOs; domain invariants in aggregates; type handlers for question JSON | validation-rules.md |
| Errors | RFC 9457 Problem Details with stable `code` | api-conventions.md |
| Persistence | JPA/Hibernate, Flyway, optimistic locking (`version`), UTC `timestamptz` | ADR-0003, data-model.md |
| Files | `FileStorage` port with a local filesystem adapter; access resolvers per module | ADR-0010, files-and-storage.md |
| Extensibility | Build-time extension registry (question types, material kinds, embed providers, metric types) | plugin-store-spec.md |
| Time | An injectable `Clock` everywhere (testable timers and deadlines) | coding-agent-rules.md |
| Observability | Structured JSON logs, request ID, Actuator (internal port), audit table | deployment.md |
| i18n | Backend returns codes and keys; the SPA localises. Server-generated text (credential message) uses the user's locale | NFR-I18N |
| Jobs | `@Scheduled` in-process: attempt auto-submit sweep (1 min), orphan-file cleanup (hourly), audit retention (daily) | — |

## 6. Repository layout (monorepo)

```text
/backend        Spring Boot app (Maven wrapper). src/main/java/com/englms/<module>/...
/web            React + TypeScript SPA (pnpm). src/{app,features,ui,lib,i18n,test}
/e2e            Implementation-owned Playwright acceptance tests (critical flows × viewports)
/qa             Independent-QA-owned scenarios, exploratory charters and Playwright checks (see agent-roles.md)
/deploy         Containerfile, compose.dev.yaml, quadlet/*.container, Caddyfile, backup scripts
/scripts        gate.sh, check-docs.sh, dev helpers (bash, POSIX tools only)
/docs           This documentation system
/evidence       Per-task evidence summaries (small text + key screenshots)
/.github        CI workflows, PR template
/.claude        Agent definitions and project skills (the harness)
progress.json   Machine-readable project state
```

## 7. Scaling and replaceability path (only when there is evidence)

1. Vertical scaling of the single host (expected to be sufficient for A-001 for years).
2. Move file storage to S3-compatible object storage: swap the `FileStorage` adapter (ADR-0010), with no domain change.
3. Add caching for dashboard queries if p95 exceeds its budget. Measure first; an in-process cache comes before Redis.
4. A module could be extracted only if a documented need appears. Module APIs and events already form the seams.
