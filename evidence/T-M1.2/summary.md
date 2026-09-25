# Evidence — T-M1.2 Backend skeleton via Spring Boot CLI

- Branch: `feature/T-M1.2-backend-skeleton` · PR: see `progress.json` · Date (UTC): 2026-09-25
- Entry gate: T-M1.1 merged (`f1e3caa`); PO approved T-M1.2 (DEC-039). Decisions within the packet: DEC-040. New open question: OQ-16 (JaCoCo timing).
- **Local environment limit (R-07):** the rootless Podman socket is disabled (T-M1.4 needs PO approval), so the Testcontainers tests
  (tag `container`: `FlywayMigrationTest`, `OpenApiContractTest`, `ApplicationIntegrationTest`) ran **in CI only**. Locally, the packaged jar was
  smoke-tested against `podman run docker.io/library/postgres:18`, which does not need the socket (`local-smoke.txt`).

## Acceptance criteria → proof

| AC | Proof | Status |
|---|---|---|
| AC1 `spring init` + Java 25 | `spring-init.txt` (exact command, Spring CLI 4.1.0 against start.spring.io, Boot 4.1.1, exit 0). `./mvnw -v`: Maven 3.9.16, Java 25.0.4 (Temurin); see `gate-local-no-container.log` header and CI. Post-generation changes are listed below | ✅ |
| AC2 `./mvnw -B verify` green in CI | `backend` job: CI_RUN_BACKEND (all 3 container tests + 29 non-container tests). Local: `gate-local-no-container.log` (29 tests, BUILD SUCCESS, `-DexcludedGroups=container`) | ⏳ CI |
| AC3 Modulith rejects illegal dependency | `negative-ac3-modulith.txt`: throwaway `shared → settings.internal` reference → `ModularityTests` fails with `Violations` and the ArchUnit internal-package rule fails too. Permanent regression: `ModularityViolationTest` (fixture modules under `src/test/java/fixture/modulith`, illegal vs legal control) | ✅ |
| AC4 forbidden identifiers | `negative-ac4-forbidden-identifiers.txt`: throwaway `TOEIC` in `src/main` → failure naming file and line. Permanent: `ForbiddenIdentifiersTest` parameterised over all 9 identifiers in temp dirs, plus a file-name case and a clean control (12 tests) | ✅ |
| AC5 `/meta` + Problem Details | `MetaControllerTest` (5 tests: shape with exactly 4 fields, locales `["vi","en"]`, 404 `application/problem+json` with `code=NOT_FOUND`, `requestId`, no `detail`; 405; request-ID echo/replace). Real server: `local-smoke.txt` + `ApplicationIntegrationTest` (CI) | ✅ |
| AC6 Flyway V1 on PostgreSQL 18 | `FlywayMigrationTest` (CI): server 18.x, V1 success, `pg_extension` has `unaccent` + `pg_trgm` in `app`, `app.simple_unaccent` strips Vietnamese accents, only `event_publication` + `flyway_schema_history` exist (no session tables, DEC-036); context start = `ddl-auto=validate` passes. Local: same checks by `psql` on the podman DB | ⏳ CI |
| AC7 contract committed + drift fails | `api/openapi.json` committed (generated with springdoc ordering + pretty printer; no host values). Drift demo: CI_RUN_DRIFT (throwaway commit changing a handler → `OpenApiContractTest` fails), reverted in the next commit | ⏳ CI |
| AC8 Actuator :8081 only, JSON logs with `requestId` | `local-smoke.txt` (8081: health/liveness/readiness/info 200, env/modulith 404; 8080: actuator 404; ECS JSON lines with `requestId`). `ApplicationIntegrationTest` (CI) asserts the same, incl. 7 non-exposed endpoints | ✅ |
| AC9 docs + progress | tech-stack §7 pins, data-model §4, development-setup §2/§4, api-catalog (`/meta` live), ci-cd (backend live), `scripts/required-checks.txt` (+`backend`, merge-gate test fixture updated: 56 script tests pass), Dependabot `maven` entry, DEC-040, OQ-16, `progress.json` | ✅ |

## Post-generation changes to the `spring init` output (all recorded in DEC-040)
- `spring-modulith-starter-jpa` → `spring-modulith-starter-jdbc` (ADR-0001 names the JDBC registry). `HELP.md` deleted.
- Added `springdoc-openapi-starter-webmvc-api` 3.1.1 and `archunit-junit5` 1.5.1 (justified in the packet; pinned in tech-stack §7).
- Generated `EnglmsApplicationTests` (context load) is replaced by the three `container` tests. `TestcontainersConfiguration` uses `docker.io/library/postgres:18`.

## Commands run (reproducible)

```bash
spring init --boot-version=4.1.1 … backend                       # spring-init.txt
(cd backend && ./mvnw -B -ntp verify -DexcludedGroups=container)   # gate-local-no-container.log
(cd backend && ./mvnw -B verify)                                  # CI (needs a Docker-compatible socket)
./scripts/tests/run-all.sh && ./scripts/check-docs.sh             # governance tests + docs gate
```

## Doc URLs consulted (R-06)
- Spring Boot 4.1 reference: structured logging (`logging.structured.format.console`), Actuator management port and health groups, Testcontainers service connections — https://docs.spring.io/spring-boot/reference/
- Spring Modulith 2.1 reference: `ApplicationModules.verify()`, `Documenter`, JDBC event publication registry schema — https://docs.spring.io/spring-modulith/reference/
- springdoc-openapi 3.x (Boot 4 line) — https://springdoc.org/
- The Modulith JDBC schema was taken verbatim from `spring-modulith-events-jdbc-2.1.1.jar!/…/schemas/v2/schema-postgresql.sql`.

## QA
Independent QA report: `evidence/T-M1.2/qa/report.md` (committed on `qa/T-M1.2`, as path ownership forbids QA paths on feature branches).
