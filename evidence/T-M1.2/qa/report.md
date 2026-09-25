# QA Report — T-M1.2 Backend skeleton via Spring Boot CLI
Verdict: **PASS WITH MINOR** · Build: `e9a974b1162fb0f1e67281aa36c7c01d67ed9ba5` (PR #2 head) · Date: 2026-09-25 · Evaluator: independent QA subagent (fresh context, detached worktree)

`QA-VERDICT T-M1.2: PASS WITH MINOR`

> Recorded by the Lead Coordinator verbatim from the QA agent's final message: the harness refused the subagent's file write
> ("Subagents should return findings as text"). The content is unchanged.

## Environment
- Detached worktree at `e9a974b`. Temurin 25.0.4, Maven 3.9.16 (`./mvnw`).
- Local: `./mvnw -B verify -DexcludedGroups=container` → 29/29 green, BUILD SUCCESS. The Podman socket was left disabled.
- CI: `backend` run 36133359473 on `e9a974b` for the container-tagged tests.
- Live: the packaged jar against `docker.io/library/postgres:18` (plain `podman run`), then restarted on the same DB.
- Backend-only: no UI, viewport, axe or i18n checks.

## AC results
| AC | Result | Evidence |
|---|---|---|
| AC1 | PASS | `spring-init.txt` has the exact command (Boot 4.1.1, Java 25, `com.englms`). `./mvnw -v` reports Java 25.0.4. The pom parent is 4.1.1 with `java.version` 25. |
| AC2 | PASS | `gh pr checks 2`: backend, docs-check and secrets-scan pass. The CI log shows 52 tests, 0 failures/errors/skipped (ModularityTests 2, ArchitectureRulesTest 6, ForbiddenIdentifiersTest 12, ModularityViolationTest 2, MetaControllerTest 5, IdsTest 2, FlywayMigrationTest 6, OpenApiContractTest 1, ApplicationIntegrationTest 16). |
| AC3 | PASS (QA reproduced) | A new `qaprobe` module referencing `settings.internal.MetaProperties` gives "Module 'qaprobe' depends on non-exposed type…". The OPEN `shared` module referencing the same class gives the same violation. |
| AC4 | PASS (QA reproduced) | The scan fails for `ToeicScorer.java` (class and field), `"IELTS band 7"` and `englms.meta.exam=thpt` in `application.properties`. The repo contains no exam, curriculum or out-of-scope identifiers. |
| AC5 | PASS | `/api/v1/meta` returns 200 with the 4 fields. `/api/v1/x` returns 404 `application/problem+json`, `code=NOT_FOUND`, and a `requestId` equal to the `X-Request-Id` header. POST gives 405 `METHOD_NOT_ALLOWED`. A valid incoming ID is echoed. Unsafe or 3000-character IDs are replaced and never logged. |
| AC6 | PASS | CI `FlywayMigrationTest` 6/6 on PostgreSQL 18. Live: `unaccent` and `pg_trgm` are in `app`, `app.simple_unaccent` turns "Tiếng Việt Đà Nẵng" into `tieng viet da nang`, and the only tables are `event_publication` and `flyway_schema_history` (no seed data). A restart validates 2 migrations and readiness is UP. |
| AC7 | PASS | `api/openapi.json` is OpenAPI 3.1.0 with the single path `/api/v1/meta`, no host values and sorted keys. The drift run 36133152398 (`8e79261`) failed exactly 1 of 52 tests, in `OpenApiContractTest`. The revert `9f346cb` leaves a net zero diff. |
| AC8 | PASS | :8081: health, liveness, readiness and info return 200 with no details. env, beans, metrics, configprops, heapdump, loggers, mappings, threaddump, modulith and sbom return 404. :8080: all `actuator/**` paths return 404. `v3/api-docs` and swagger-ui return 404 on both ports. All 67 log lines are valid ECS JSON, and request lines carry `requestId`. |
| AC9 | PASS (see F2) | tech-stack §7 pins, data-model §4, development-setup, api-catalog, ci-cd, `required-checks.txt` (`backend`), Dependabot `maven` `/backend`. |

Other checks: the CI workflow runs on every PR with no `paths:` filter, SHA-pinned actions, `persist-credentials: false` and `contents: read`. Config matches the packet (virtual threads, `open-in-view=false`, `ddl-auto=validate`, JSON logs). Only the `shared` and `settings` modules exist. The ArchUnit negative probe (an `@Autowired` field, and `Instant.now()`, `LocalDate.now()`, `OffsetDateTime.now()`) failed the field-injection and clock rules as expected. The DEC-040 deviations reduce the public surface, so they are not findings.

## Findings
| ID | Sev | Summary |
|---|---|---|
| F1 | S4 | On the management port :8081, Problem Details errors have `"requestId": null` and no `X-Request-Id`, because the request-ID filter runs only on :8080 (`backend/src/main/java/com/englms/shared/web/ProblemDetailsAdvice.java:50`). Repro: `curl localhost:8081/actuator/env`. The ACs cover `/api/v1/**` on :8080 only. |
| F2 | S4 | `progress.json` is stale at the PR head: `pr: null`, `lastCommit: null`, and the next step still says "Push, open PR, wait for CI". |
| F3 | S4 | Requests that Tomcat rejects before they reach the app (e.g. a raw `<` in the query string) get Tomcat's HTML 400 page, not `application/problem+json`, and no request ID. No stack trace or version leaks. Outside the ACs. |
| F4 | S4 (docs gap for the LC) | The forbidden-identifier list matches test-strategy rule 6, but coding-agent-rules §7 also names `ExamType` and `Part5`, which the scan does not check. |

## Accessibility summary
N/A (backend only).

## Isolation / privacy checks
No student endpoints and no domain data yet. `/meta` exposes only non-sensitive fields. Actuator shows no details, and the sensitive endpoints return 404. The request ID is validated against `[A-Za-z0-9._-]{1,64}`, and query strings are never logged. No credentials are in the properties. A note for T-M1.5: :8081 listens on all interfaces, so restrict it at deployment.

## Re-test log
- 2026-09-25, initial evaluation at `e9a974b`: PASS WITH MINOR (F1–F4, all S4).
