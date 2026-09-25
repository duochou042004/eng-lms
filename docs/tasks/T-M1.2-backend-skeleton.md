# T-M1.2: Backend skeleton via Spring Boot CLI

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **ready** (G0 passed 2026-09-25; starts after T-M1.1 merges) |
| Owner role | BE (backend-implementer) |
| Branch | `feature/T-M1.2-backend-skeleton` (from `develop`) |
| Depends on | T-M1.1 merged |
| Estimate | 1–1.5 agent-days |
| Trace | ADR-0001, ADR-0002, ADR-0003, ADR-0014, NFR-MNT-01, NFR-MNT-04, NFR-OPS-04, coding-agent-rules §7 and §9, test-strategy §4 |

## Goal
A compiling, tested Spring Boot 4.1 / Java 25 backend skeleton in `backend/`, generated with the Spring Boot CLI. It contains the module structure,
boundary verification, the first migration, the OpenAPI contract pipeline and the `backend` CI job. It has **no domain features**.

## Scope
- In:
  1. Generate with `spring init` (command below; record the exact command and output in the evidence). Maven Wrapper, Java 25, Boot 4.1.x, `com.englms`.
  2. Packages: `com.englms.shared` (IDs, `Clock` bean, `ProblemCodes`, a Problem Details `@RestControllerAdvice`, request-ID filter) and `com.englms.settings`
     (placeholder module exposing only `GET /api/v1/meta` → `{name, version, locales:["vi","en"], displayName}` from configuration).
     Empty module packages with `package-info.java` are **not** created for future modules (they arrive with their milestone).
  3. Flyway `V202609250001__platform_extensions.sql`: `unaccent`, `pg_trgm`, the `app` schema, the `app.simple_unaccent` text-search configuration.
     Plus the Spring Modulith JDBC event publication table, if the chosen starter doesn't create it (verify in the docs).
  4. Configuration: virtual threads on, `open-in-view=false`, `ddl-auto=validate`, structured JSON logging (Boot's native structured logging),
     Actuator on management port 8081 exposing only `health` and `info`, liveness and readiness groups.
  5. Tests: `ModularityTests` (`ApplicationModules.verify()` + a Documenter run writing to `backend/target/modulith-docs`), ArchUnit base rules
     (test-strategy §4 rules 1, 2, 5, and a no-`Instant.now()`/`LocalDate.now()` rule), a **forbidden-identifier source scan** (rule 6), a
     `MetaControllerTest` (200 + JSON shape + Problem Details for an unknown `/api/v1/**` path), a `FlywayMigrationTest` on Testcontainers PostgreSQL 18
     (`docker.io/library/postgres:18`), and `OpenApiContractTest` writing or verifying `api/openapi.json` (`-Dcontract.write=true` regenerates it).
  6. CI: `.github/workflows/backend.yml` (Temurin 25 via `actions/setup-java` pinned by SHA; `./mvnw -B verify`; upload the surefire reports on failure).
     Add `backend` to `scripts/required-checks.txt`. Dependabot `maven` entry for `/backend`.
  7. Docs: tech-stack §7 pinned versions (Boot, Modulith, springdoc, ArchUnit, Testcontainers), data-model §4 (V1 contents), api-catalog (`/meta` confirmed),
     development-setup (real commands).
- Out of scope: security (Spring Security arrives in T-M2.1, so `/meta` is public by default here), any domain module, the web app, Containerfile
  (T-M1.5), local Podman compose and the Testcontainers-on-Podman setup (T-M1.4; locally, the implementer may run tests in CI only if the socket isn't enabled yet).

## Guardrail answers
1. Trace: the ADRs above. 2. No drift towards excluded scope. 3. No tutor setup. 4. N/A (engineering). 5. No exam semantics; the forbidden-identifier test enforces this.

## Design notes
- Suggested generation (verify the IDs with `spring init --list`):
  `spring init --boot-version=4.1.1 --java-version=25 --build=maven --type=maven-project --group-id=com.englms --artifact-id=englms --name=englms --package-name=com.englms --dependencies=web,data-jpa,flyway,postgresql,validation,actuator,modulith,testcontainers,configuration-processor backend`
- Non-Initializr dependencies (justify and pin each one): `springdoc-openapi-starter-webmvc-ui` (a Boot 4-compatible line), `archunit-junit5`. Use Boot-managed versions everywhere else.
- Boot 4 pitfalls: Jackson 3, modular starters, `@MockitoBean`, `RestTestClient` (coding-agent-rules §9). Cite doc URLs in the PR.

## Acceptance criteria
- **AC1:** `backend/` was produced by `spring init`, and the exact command is in the evidence. `./mvnw -v` reports Java 25.
- **AC2:** `cd backend && ./mvnw -B verify` passes in CI (`backend` job green), including the modularity, ArchUnit, forbidden-identifier, meta, Flyway and contract tests.
- **AC3:** Spring Modulith `verify()` fails when an illegal cross-module dependency is introduced (demonstrated on a throwaway commit or a test fixture; output in the evidence).
- **AC4:** The forbidden-identifier test fails for a fixture file containing `toeic` under `src/main` (tested through a parameterised scan of a temp directory).
- **AC5:** `GET /api/v1/meta` returns 200 with `{name, version, locales, displayName}`. An unknown `/api/v1/x` returns `application/problem+json` with `code=NOT_FOUND` and a `requestId`.
- **AC6:** Flyway V1 applies on PostgreSQL 18 (Testcontainers), and `ddl-auto=validate` passes. The extensions exist (the test queries `pg_extension`).
- **AC7:** `api/openapi.json` is committed and deterministic. Rerunning the contract test without `-Dcontract.write` fails when a handler changes (demonstrated).
- **AC8:** Actuator is reachable only on :8081 with `health`/`info`. Logs are JSON with a `requestId` field.
- **AC9:** Docs updated (tech-stack §7 pins, data-model §4, development-setup, api-catalog). `progress.json` and the evidence summary are updated.

## Test plan
- Implementation: as listed in scope item 5.
- Independent QA focus: a clean clone → CI green; `./mvnw -B verify` reproducible from the evidence; run the jar and probe `/api/v1/meta`, an unknown path and `:8081/actuator/health`; check that no domain code or exam identifiers exist.

## Evidence required
`evidence/T-M1.2/summary.md`, the `spring init` output, a gate log, the negative demonstrations for AC3, AC4 and AC7, the CI run link, and the QA report.

## Docs to update
tech-stack.md §7 · data-model.md §4 · development-setup.md §2/§4 · api-catalog.md (meta) · ci-cd.md (backend job live) · `scripts/required-checks.txt`.

## Risks and assumptions
R-06 (Boot 4 habits) → verify against the docs. R-07 (Testcontainers on Podman): if the local socket isn't enabled yet (T-M1.4 needs PO approval), run the container tests in CI and state this in the evidence.

## Commands
```bash
source ~/.sdkman/bin/sdkman-init.sh && sdk env
git checkout develop && git pull && git checkout -b feature/T-M1.2-backend-skeleton
spring init … backend      # see Design notes
cd backend && ./mvnw -B verify
```
