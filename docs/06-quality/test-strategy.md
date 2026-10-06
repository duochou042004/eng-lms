# Test Strategy

> Trace: SPEC §60.G, NFR-MNT-03, NFR-SEC-01..03. Two independent lines of defence (HoH):
> **(1) Implementation tests**, written by the implementer alongside the code (TDD where practical), and **(2) Independent QA**, written and run by the QA
> Evaluator from the acceptance criteria **without reading the implementation** (qa-protocol.md). A task passes only if both pass.

## 1. Test pyramid and ownership

| Level | Tooling | Scope | Owner | Runs |
|---|---|---|---|---|
| Unit (backend) | JUnit + AssertJ (+ Mockito sparingly) | Domain logic: state machines, grading handlers, progress calculations, attention rules, validators, sanitiser | Implementer | Every build |
| Module integration | Spring Modulith `@ApplicationModuleTest` + **Testcontainers PostgreSQL** | A module's services and repositories against real PostgreSQL; events | Implementer | Every build |
| API / web slice | MockMvc or `RestTestClient` (Boot 4) on a full context + Testcontainers | Status codes, Problem Details, validation, JSON shape | Implementer | Every build |
| **Authz matrix** | Custom JUnit harness over the handler mappings | Every endpoint × {anon, tutor, student A, student B-on-A's-resource} | Implementer (framework built in M2; entries per endpoint) | Every build |
| **Student isolation / secret scan** | Fixture world (tutor, A, B, private notes, answer keys) + scan of all student responses | NFR-SEC-01/02 | Implementer (framework M2) + Security Reviewer audits | Every build |
| Architecture | Spring Modulith `verify()`, ArchUnit | Boundaries, controller rules, student DTO rules, forbidden identifiers | LC-maintained | Every build |
| Migration | Flyway on an empty DB + `ddl-auto=validate`; upgrade test from the previous release dump (from M8) | Schema correctness | Implementer | Every build / release |
| Mutation | PIT on `activities..grading` and the question handlers | Test quality for grading | Implementer | Nightly + release (≥ 70%) |
| Unit/component (web) | Vitest + Testing Library + MSW + vitest-axe | `model/` logic, `ui/` components (all states), feature components | Implementer | Every build |
| E2E (implementation) | Playwright in `/e2e` against the packaged jar + PostgreSQL | Critical flows F1–F9 on the mandatory viewports, axe, step budgets, visual snapshots | Implementer (frontend) | PR (mandatory viewports), nightly (all 6 + Firefox + WebKit) |
| **Independent QA** | Playwright + manual exploratory in `/qa` | Acceptance criteria black-box; exploratory charters; viewports; accessibility spot checks | **QA Evaluator** | Per task (G3) + milestone regression |
| Performance | Seeded dataset + load script; Lighthouse | NFR-PERF | LC / QA | M8 + release |
| Security | Authz and isolation suites; header checks; dependency scans; manual review | security.md | Security Reviewer | Per PR (triggered) + release |

## 2. Test data

- **Fixture world** (`backend/src/test/resources/fixtures/world.sql` + builders): 1 tutor, students A (active), B (active), C (archived); materials
  shared with A only; private notes for A containing the unique marker `SECRET-NOTE-A-7f3c`; an answer key containing `SECRET-KEY-…`. Scans search
  student responses for every `SECRET-*` marker and for B's IDs.
  **As built (T-M2.2):** the world is Java, not SQL: `backend/src/test/java/com/englms/security/IsolationWorld.java`, rebuilt for every test (the reset
  deletes every session). Today it holds the tutor, A and B (active), C as a **disabled** account (archived arrives with the students module; C cannot
  sign in, so it never acts) and a must-change student; usernames carry a random suffix (`student-b-<8 hex>`), so a scan hit is never a coincidence.
  Later modules add A-owned and B-owned rows and `SECRET-*` markers through `IsolationWorldContributor` (a Spring bean in test sources). The scan
  (`SecurityHarness.assertNoLeak`) searches the headers and body of student A's response to every registry entry, case-insensitively.
- Builders (Java test data builders) for aggregates. Never depend on the order of generated IDs.
- Time: tests inject a fixed `Clock`. Deadlines and overdue logic are tested at the boundaries (just before, at, and just after).
- The web uses MSW handlers generated from `api/openapi.json` examples where possible.
- E2E: `scripts/seed-e2e` resets the DB through a test-only profile endpoint **disabled in prod builds** (`@Profile("e2e")`, verified absent in the prod image by a test).

## 3. Conventions

- Test names: `should<Behaviour>_when<Condition>` (Java). `it('shows … when …')` (TS).
- One behaviour per test. Table-driven tests for handlers and rules (`@ParameterizedTest` with a readable source).
- No sleeping. Use `Clock`, Awaitility, or Playwright auto-wait.
- Flaky test policy: a flaky test is quarantined only with a DEC entry and a task to fix it within 1 milestone. Never silently retried.
- Forbidden: disabling tests to get green builds, asserting on implementation details (private fields, SQL strings), snapshot-testing whole JSON
  payloads without purpose, or mocking the database for repository logic.

## 4. Architecture rules (ArchUnit; initial set, extended per module)

1. Controllers (`..internal.web..`) do not access `..internal.persistence..`.
2. No class outside a module accesses its `..internal..` packages (also covered by Modulith).
3. `..web.student..` handler methods have no parameter, `@PathVariable` or `@RequestParam` whose (effective) name is `studentId` or ends in `StudentId`.
4. `..web.student..` classes (every class, not only DTOs) do not depend on `com.englms.notes..`, on `LearningProfile*`, or on types annotated `@TutorPrivate`.
   Rules 3 and 4 are implemented (T-M2.2) in `architecture/StudentIsolationRulesTest` (`@Tag("security")`; parameter names by reflection, the build
   compiles with `-parameters`), proven against the violating classes in `src/test/java/fixture/archunit/`.
5. No `@Transactional` on controllers. No field injection.
6. Forbidden identifiers in `src/main` (case-insensitive): `toeic`, `ielts`, `thpt`, `examtype`, `part5`, `tenant`, `payment`, `invoice`, `openai`, `anthropic`, `chatgpt`
   (the same list as coding-agent-rules §7; `examtype` and `part5` since T-M1.8).
   The rule is implemented as a source scan test with an allow-list for docs and tests.
7. No `switch`/`if` on question type IDs outside `questions..registry..` and the extension implementations.
8. No `kind ==` comparisons inside `activities..grading..` (ADR-0007).

## 5. Coverage targets

| Area | Target |
|---|---|
| Backend domain + application packages | ≥ 80% line, ≥ 70% branch (JaCoCo; reported per module) |
| Grading and handlers | ≥ 90% line, PIT mutation ≥ 70% |
| Web `model/` and `ui/` | ≥ 80% line (Vitest c8/istanbul) |
| Critical flows F1–F9 | 100% covered by E2E (implementation) **and** QA scenarios |
| Endpoints | 100% in the authz matrix; 100% of student endpoints in the isolation scan |

Coverage is a floor, not a goal. Reviewers still judge assertion quality (R-18).

## 6. Commands (reproducible; wired into `scripts/gate.sh` in T-M1.x)

```bash
./scripts/gate.sh            # everything below (12 steps, the last is e2e), fail-fast, writes evidence/<task>/gate-<timestamp>.log
(cd backend && ./mvnw -B verify)                     # unit + integration + authz + isolation + arch + jacoco
(cd web && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop   # packaged app + Playwright (T-M1.6)
```
