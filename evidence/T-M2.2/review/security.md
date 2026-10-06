# SEC review: T-M2.2, authorization matrix and student-isolation harness

Recorded by the LC from the security-reviewer's final reports (agents do not write report files). Reviewer: Security Reviewer (independent G3,
fresh context; did not implement), main checkout (DEC-094).

## Round 1

| Field | Value |
|---|---|
| Date | 2026-10-06T04:59:32Z (start) |
| Head | `bc093038edad45af5bf4993a4ae545254733a960` (PR #57) |
| Base | `develop...HEAD`: 30 files, no `pom.xml` change, no migration |
| Inputs | Packet (incl. AC2a), `evidence/T-M2.2/summary.md`, the diff, ADR-0016, security.md §2/§4/§11, test-strategy §4, the QA report (PR #58), `evidence/T-M2.1/review/security.md` |

**Scope.** Main: `shared/web/AudienceVerifier.java`, `Audience.java`, `TutorPrivate.java`; `@Audience` on `AuthController` and `MetaController`;
`settings/package-info.java`. Test: `com.englms.security.*`, `architecture/StudentIsolationRulesTest`, `fixture/archunit/**`, the `SpaServingTest` probe move.
Checked against the L1 gate (`identity/internal/security/SecurityConfiguration.java:163-176`).

**Runs.** `-Dgroups=security` at `bc09303`: BUILD SUCCESS, 63 tests (one Testcontainers "Broken pipe" retried; infrastructure). Throwaway bypass probes
(uncommitted, deleted; `git status` clean): a `RouterFunction` `GET /api/v1/student/rf` without `@Audience` started and served `SECRET-RF`; a third-party
`@GetMapping("/{*rest}")` answered `/api/v1/anything`; two `@Audience(STUDENT)` handlers on one pattern (one with `params = "full"`) collapsed into one
completeness key; a meta-annotation carrying `@Audience(TUTOR)` on a student path was correctly refused.

**What holds.** Pattern syntax fails closed (path variables or regex in a namespace segment, `/api/**`, `tutorx`, `student{x}`, encoded literals → unknown
prefix; dot/empty segments refused); case-sensitive matching in both MVC and L1; suffix and trailing-slash matching gone in Spring 7; method annotation wins,
class/interface/meta-annotations resolve; CGLIB proxies do not hide `com.englms`; `SmartInitializingSingleton` runs before the server starts and is not
disabled by lazy initialisation; `@ConditionalOnWebApplication(SERVLET)` correct (CLI unaffected); test-only controllers stay out of the production jar;
`settings` `allowedDependencies` change weakens nothing (`shared` is OPEN); the five registered statuses match T-M2.1 and QA's curl matrix; no wall-clock
assertions.

**§11 checklist.** 1 PASS (limits S3-1, S3-2) · 2 N/A (no student handler; limits S3-3, S4-2) · 3 PASS (rule gap S3-4) · 4, 5, 7, 8 N/A · 6 PASS (verifier
message names only class, method, HTTP methods and patterns; no `.env` values in evidence) · new dependencies: none.

| ID | Sev | Location | Description | Fix | Resolution |
|---|---|---|---|---|---|
| S3-1 | S3 | `AudienceVerifier`; `SecurityHarness` | Only `RequestMappingHandlerMapping` is seen: `RouterFunctionMapping`, URL handler mappings and servlets escape L2, completeness and the scan (L1 still gates by path) | Inspect every `HandlerMapping`; refuse router functions and URL mappings under `/api` or with a `com.englms` handler | Fixed (AC9, `11473e0`) |
| S3-2 | S3 | `SecurityHarness` completeness keys | Handlers differing only by params/headers/consumes/produces collapse into one key | Fail when one key maps to several handler methods | Fixed (AC9) |
| S3-3 | S3 | rules 3/4; verifier | Nothing ties `STUDENT` handlers to `..web.student..` | Require both directions | Fixed (AC9) |
| S3-4 | S3 | rule 4 | A type with a `@TutorPrivate` *field* is not caught | Also match classes with a `@TutorPrivate` field | Fixed (AC9) |
| S4-1 | S4 | verifier scope | A non-literal first segment (`/{*rest}`) serves `/api` paths unseen | Treat it as an API pattern | Fixed (AC9) |
| S4-2 | S4 | rule 3 | URI-template `{studentId}` and catch-all binders unchecked | Refuse `{…studentId}` on `/api/v1/student/**` | Fixed (AC9); other binders → T-M2.3 known limitation |
| S4-3 | S4 | verifier | L1/L2 agreement assumes case-sensitive `PathPatternParser` | Refuse otherwise | Fixed (AC9) |

No S1/S2. Nothing exploitable at `bc09303` (only the five registered handlers exist; L1 unchanged and authoritative).

SEC-REVIEW T-M2.2: APPROVED

## Round 2

| Field | Value |
|---|---|
| Date | 2026-10-06T05:23:34Z – 05:27:11Z |
| Head | `c818b4f06e00fe330e91d0d0ff841c2d290966da` |
| Delta | `git diff bc09303..c818b4f` (AC9) |

`-Dgroups=security` at `c818b4f`: BUILD SUCCESS, 75 tests. Round-1 probes re-run plus new ones (throwaway, deleted; `git status` clean).

| ID | Status | Re-probe |
|---|---|---|
| S3-1 | Confirmed | `RouterFunction` refused; a `@Lazy` bean-name `HttpRequestHandler` in `com.englms` refused; SPA resource handlers allowed |
| S3-2 | Confirmed | `params = "full"` twin fails completeness |
| S3-3 | Confirmed | `STUDENT` outside `web.student` refused; converse covered |
| S3-4 | Confirmed | inherited and generic-argument `@TutorPrivate` fields caught; a transitive dependency (`Wrapper` → `LessonView`) is not — known limitation (the `SECRET-*` scan is the runtime backstop) |
| S4-1 | Confirmed | `/{*rest}` and `/*/v1/tutor/probe` refused |
| S4-2 | Confirmed | `{studentId:.+}` refused |
| S4-3 | Confirmed | case-insensitive parser and legacy `AntPathMatcher` refused; `spring.mvc.servlet.path` unchecked but not configured |

Regressions: none (real app starts; test edits weaken nothing; fixtures stay under `src/test`; L1 unchanged).

| ID | Sev | Location | Description | Fix | Resolution |
|---|---|---|---|---|---|
| N2-1 | S4 | `AudienceVerifier` `default` branch | A custom `HandlerMapping` implementation is passed over silently | Refuse `com.englms`, lambda or synthetic mappings | Fixed by the LC (AC10, `1dd6805`): `refusesAnApplicationDefinedHandlerMapping` |
| N2-2 | S4 | URL-mapping branch | A non-singleton handler stays a bean name and resolves to `String`; a `com.englms` handler outside `/api` passes and L1's `permitAll` lets anonymous callers in | Resolve via `getType(name)` | Fixed by the LC (AC10): `resolvesABeanNameHandlerToItsType` |
| N2-3 | S4 | rule 3; verifier package check | A `web.student` controller inheriting a handler method declared outside `web.student` escapes rule 3 | Require the declaring class in `web.student` for `STUDENT` handlers | Fixed by the LC (AC10): `refusesAStudentHandlerMethodInheritedFromOutsideStudentWeb` |

No S1, S2 or S3 in round 2. The LC's AC10 fixes were verified black-box by QA's re-test at `4ebae29` (R6–R8, PASS).

SEC-REVIEW T-M2.2: APPROVED
