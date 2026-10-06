# DOCS-REVIEW T-M2.2: Authorization matrix + student-isolation harness (packet)

Recorded by the LC from the docs-reviewer's final report (the agent does not write report files).

## Round 1

- Reviewer: Docs Reviewer (fresh context, did not write the reviewed docs)
- Date: 2026-10-06T03:52:07Z
- Branch: `docs/T-M2.2-authz-isolation-harness` (PR #56)
- Head SHA: `33a98e83a041fe21f3d7247fe8f4dc89338f15e2`
- Diff (`develop...HEAD`): `docs/tasks/T-M2.2-authz-isolation-harness.md` (new), `docs/tasks/backlog.md` (packet link), `progress.json`
- `./scripts/check-docs.sh`: **PASS**

### Checks performed

| Check | Result |
|---|---|
| Template / G0 completeness | All sections present; estimate 1.5 agent-days; 8 ACs; T-M2.1 merged (`a93bcc1`). Branch, `in_progress` and the PO start signal are start-time items. |
| Traceability (scope.md §6) | Every scope item traces to NFR-SEC-01..03, ADR-0016 §2–§5, security.md §4, test-strategy §2/§4 rules 3–4, api-conventions §9 or the DEC-093 hand-over. No SCOPE finding. |
| Backlog row T-M2.2 | All six items covered. T-M2.3 depends on T-M2.2 (consistent). See F4 for `CurrentStudent`. |
| M2 exit criterion ("harnesses fail on any unregistered endpoint") | Met: AC4 two-way completeness check plus AC2 startup refusal. |
| Expected statuses vs T-M2.1 hand-over and real code | Correct for all 5 mappings × 5 actors (`MustChangePasswordFilter.ALLOWED`; `changePassword` with a correct current password and a policy violation → 422 without side effects; session anonymous → 401; logout 204; meta 200 incl. must-change). 422 and anonymous-login 200 are a sound narrowing of the hand-over table. |
| Verifier vs real handlers | Only `AuthController` and `MetaController` are `RequestMappingHandlerMapping` handlers in `com.englms`; SPA resource handlers and `ProblemDetailsAdvice` are not; springdoc disabled; actuator on :8081. |
| Feasibility | `-parameters` set by the Boot parent; ArchUnit 1.5.1 `JavaParameter` has no names (reflection fallback right); `allowEmptyShould(true)` appropriate; throttle in memory 30/5 min, not cleared by `IdentityFixtures.reset` (F1); `Browser`/`IdentityFixtures` reusable; test package `com.englms.security` creates no module. |
| Decisions (DEC-088..094, ADR-0016) | No conflict; module-boundaries `Audience {TUTOR, STUDENT}` amended to four values (correct direction); DEC-094 respected (see F11). |
| Links / IDs | Resolve; see F9. |

### Findings

| ID | Sev | Location | Finding | Suggested fix | Resolution |
|---|---|---|---|---|---|
| F1 | S3 | packet test plan / risks | Session plan inconsistent: per-test reset deletes sessions vs sign-in once per class; logout ends and login rotates the acting session; no throttle test configuration exists | Sign in per test; session-ending entries last or re-sign-in; raise `englms.security.login-throttle.max-attempts` like `AuthApiIntegrationTest` | Fixed (design note "Sessions in the harness") |
| F2 | S3 | scope 6, design notes, AC8 | JUnit `@Tag` does not apply to `@ArchTest` rules (ArchUnit engine reads `@ArchTag`); `-Dgroups=security` would skip them | `@ArchTag("security")` or `@Test` + `rule.check`; AC8 proves the suite runs | Fixed (design notes, AC8, QA focus) |
| F3 | S3 | AC2 vs design notes | AC2 narrower than the rules: `AUTHENTICATED` outside `/auth`, multi-pattern handler; method-less `@RequestMapping` undefined | AC2 proves each rule; method-less handler is an error | Fixed |
| F4 | S3 | out of scope; backlog | `CurrentStudent` resolver and owner-scoped repositories have no owning backlog row | Amend the T-M2.3 row; mirror in module-boundaries | Fixed (backlog T-M2.3 row; module-boundaries in the implementation docs list) |
| F5 | S3 | commands | `./mvnw verify` needs `DOCKER_HOST` from `scripts/env.sh` | Add `source scripts/env.sh` | Fixed |
| F6 | S4 | scope 2 | Verifier must be servlet-only (CLI has no web app) | `@ConditionalOnWebApplication(type = SERVLET)` | Fixed |
| F7 | S4 | risks, design notes | HEAD is matched implicitly, not "reported" | Reword | Fixed |
| F8 | S4 | guardrail 1 | Omits SPEC §26, §37 | Add | Fixed |
| F9 | S4 | trace, docs to update | "§11.1" and "line 6" references; api-catalog says four, packet registers five | "§11 item 1"; "intro note"; four auth + `GET /meta` | Fixed |
| F10 | S4 | isolation scan | Short usernames → false positives; non-2xx bodies unscanned | Distinctive usernames; scan every response | Fixed (every response scanned; random-suffix usernames) |
| F11 | S4 | QA focus | "scratch copy" could mean a second checkout (DEC-094) | Uncommitted change in the main checkout | Fixed |
| F12 | S4 | design notes | L1 opens only `GET`/`HEAD /meta`; path-only PUBLIC rule too loose | Method-aware rule | Fixed |
| F13 | S4 | AC5 | Rule 3 must check the effective `@PathVariable`/`@RequestParam` name; rule 4 scope vs "DTO classes" | Effective names; amend test-strategy §4 rule 4 | Fixed |

No S1, S2 or SCOPE findings. All findings fixed in-task (DEC-088, DEC-095).

DOCS-REVIEW T-M2.2: PASS

## Round 2

- Reviewer: Docs Reviewer (fresh context; did not write the reviewed docs)
- Date: 2026-10-06T03:57:35Z
- Head SHA: `428495113047b994ba0d221c66f75f76a10e93fa`
- `./scripts/check-docs.sh`: **PASS**

F1–F13: all confirmed fixed (F1 throttle property real, `application.properties:53`, same pattern as `AuthApiIntegrationTest`; F2 `@ArchTag` present in
`archunit-junit5-api` 1.5.1 and selected by `-Dgroups`; F3 every rule in AC2, all live mappings declare methods; F4 backlog T-M2.3 row; F5 `scripts/env.sh`;
F6 servlet-only; F7 wording; F8 trace; F9 references; F10 every response scanned, random-suffix usernames; F11 main checkout; F12 method-aware `PUBLIC`
matches `SecurityConfiguration` L1; F13 effective names, rule 4 scope). DEC-095 consistent with the record and `progress.json`; no scope creep, no broken references.

### New findings

| ID | Sev | Location | Finding | Fix | Resolution |
|---|---|---|---|---|---|
| N1 | S3 | AC2, AC8; `backend/src/test/java/com/englms/shared/web/SpaServingTest.java:167-174` | The test-only `ProbeController` (`/api/v1/probe`, no `@Audience`) will stop its context once the verifier exists (missing annotation and unknown prefix), contradicting AC8's "no existing test changed except to add `@Audience`" | Move the probe to `/api/v1/tutor/probe` with `@Audience(TUTOR)` (the test runs as a mock TUTOR); widen AC8's exception | Fixed in AC8 (DEC-088) |

No S1, S2 or SCOPE findings.

DOCS-REVIEW T-M2.2: PASS
