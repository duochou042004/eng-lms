# QA Report: T-M2.2 Authorization matrix + student-isolation harness

Recorded by the LC from the qa-evaluator's final report (agents do not write report files).

Verdict: PASS WITH MINOR · Build: `071aec64f16eec8103cdd7244d7d32cf0fbaa896` (`feature/T-M2.2-authz-isolation-harness`, PR #57) · Date: 2026-10-06, 04:32 to about
05:05 UTC · Evaluator: independent QA subagent, fresh context (main checkout, DEC-094)

## Environment
- Linux, rootless Podman, JDK 25.0.4, Tomcat 11.0.24 (Spring Boot 4.1 jar), Node 24 for the gate's web and e2e steps.
- Black-box runs: the packaged jar against a throwaway `docker.io/library/postgres:18` container (127.0.0.1:55432); the dev DB was not touched.
- QA world: five accounts inserted by SQL with a bcrypt-12 hash of a generated QA password, usernames `qa-<role>-<8 hex>`: tutor, student A (`ACTIVE`),
  student B (`ACTIVE`), student C (`DISABLED`), a must-change student.
- Matrix runs used `--englms.security.login-throttle.max-attempts=10000`, as the harness does (a first run at the default limit hit the intended 429).
- Cleanup: app stopped, ports free, container removed, throwaway code removed (`rm` / `git restore`), gate artifacts removed; `git status` clean. No `.env`
  values in this report.
- Independence: provisional verdict drafted after the black-box matrix and startup probes, before reading implementation or test code.

## AC results
| AC | Scenario(s) | Result | Evidence |
|---|---|---|---|
| AC1 | `@Audience` 4 kinds, method or type, runtime; `session`/`login`/`logout` `PUBLIC`, `password` `AUTHENTICATED`, `/meta` `PUBLIC`; `@TutorPrivate` used by rule 4 | PASS | Controller diffs add annotations only; the real app starts |
| AC2 | Throwaway controllers in `com.englms.qaprobe` packaged into the jar: startup refused, `@Audience check failed … for 13 handler rule(s)`, one line per handler | PASS | Rules caught below; real app starts; CLI unaffected (`ResetTutorPasswordCliTest` 4/4, `AudienceVerifierTest#doesNotRunWithoutAWebApplication`); `AudienceVerifierTest` 19/19 |
| AC3 | curl matrix: 5 mappings × anonymous, tutor, A, must-change (+ disabled C); fresh cookie jar and sign-in per call; CSRF on unsafe methods | PASS | 25 cells match the registry (table below); `AuthzMatrixTest` 22/22 |
| AC4 | Probe: two valid unregistered handlers; mutation: stale entry `GET /api/v1/tutor/qa-stale` | PASS | Missing entries named (`GET /api/v1/tutor/qa-unregistered`, `GET /api/v1/tutor/{x}/../../student/qa-dots`); stale entry named |
| AC5 | ArchUnit rules 3 and 4 on `com.englms` and `fixture.archunit`; mutation M4 | PASS | `StudentIsolationRulesTest` 3/3 under `-Dgroups=security`; M4 fails the rule-3 proof |
| AC6 | As A: every entry's headers and body grepped for B's UUID and username (case-insensitive) and `SECRET-[A-Z0-9-]+`; scan mutations | PASS | No hits (422 Problem Details carry no foreign IDs); `IsolationTest` 6/6; M1–M3 bite |
| AC7 | B on A's resource via fixture handler + contributor; C cannot sign in | PASS | Owner-scoped fixture → 404 for B, unscoped twin caught; C login 401 |
| AC8 | `-Dgroups=security` ×3; full gate; existing-test changes | PASS | 61 tests, 0 failures, 3/3 runs; report lists all five suites; `ENGLMS_TASK=T-M2.2 ./scripts/gate.sh` PASS (13 steps, backend 276); only `SpaServingTest` probe moved (allowed) |

**AC2: rule breaks caught** — no `@Audience` (`#none`); `STUDENT` on tutor (`#wrong`, class-level `#override`); `AUTHENTICATED` on student; `PUBLIC` on
tutor; `TUTOR` on auth; `AUTHENTICATED` on `/meta`; `PUBLIC` on `POST /meta`; unknown prefix (`#tutorx`); `com.englms` handler outside `/api/**` (`#outside`,
`/API/v1/tutor/...`); bare `@RequestMapping`; multi-pattern with one bad pattern (only the bad one named). A class-level `@Audience(TUTOR)` with an inherited
method audience was accepted.

### AC3 black-box matrix
| Mapping | anonymous | tutor | student A | must-change | disabled C (extra) |
|---|---|---|---|---|---|
| `GET /api/v1/auth/session` | 401 | 200 | 200 | 200 | 401 |
| `POST /api/v1/auth/login` (own credentials; anonymous uses A's) | 200 | 200 | 200 | 403 | 401 |
| `POST /api/v1/auth/logout` | 204 | 204 | 204 | 204 | 204 |
| `POST /api/v1/auth/password` (correct current, too-short new) | 401 | 422 | 422 | 422 | 401 |
| `GET /api/v1/meta` | 200 | 200 | 200 | 200 | 200 |

B-on-A does not apply to any live entry.

### Detector mutation runs (all reverted)
| # | Mutation | Observed |
|---|---|---|
| M1 | Secret matcher replaced by `(?!)` | `theScanNamesASecretMarkerInAHeaderWhateverItsCase` FAILED |
| M2 | B-identifier match case-sensitive | `theScanNamesStudentBsIdentifierInTheBodyWhateverItsCase` FAILED |
| M3 | Headers dropped from the scanned text | `theScanNamesASecretMarkerInAHeaderWhateverItsCase` FAILED |
| M4 | `isStudentId` `endsWith` → `equals` | `ruleThreeCatchesEveryWayOfNamingAStudentId` FAILED |
| M5 | Stale-entry assertion removed from `assertComplete` | `completenessNamesAnEntryWithoutAHandlerMapping` FAILED |
| M6 | Stale `PolicyRegistry` entry added | Completeness FAILED naming `GET /api/v1/tutor/qa-stale` |

## Exploratory charter & notes (about 30 min)
- Multi-pattern and class-level `@Audience`: per-pattern checks; method overrides class.
- Verifier path tricks rejected as unknown prefix: `/api/v1/tutor{x}`, `/api/v1/tutor*/qa-star`, `/api/v1/{ns}/qa-ns`, `/api/**`, `/api/v1/meta{x}`,
  `/api/v1/auth{x}`. Spring refuses `/api/**/x`; `/API/v1/tutor/...` is outside `/api/**` and rejected. Gap: literal `..` segments accepted (QA-S4-1).
- HEAD `/meta` 200 for all; OPTIONS anonymous 401, signed-in 200, must-change 403; POST/PUT/DELETE anonymous 401, signed-in 405, must-change 403 (as T-M2.1).
- Request-path tricks: `/api/v1/meta/`, `/Meta`, `/metax` → 401/404/404/403; `/api/v1/tutor[/]` → 401, student 403, tutor 404; `/tutorx`, `/studentx` → 401/404;
  `/api/v1/student/x` → 401, A 404, tutor 403; `/api/v1//meta`, `;x=1` → firewall 400. `GET /api/v1/tutor/probe` → 404 (test probe not in the jar).
- Scope: main-source changes are the three `shared.web` types, the annotations, and `settings/package-info.java` (documented deviation). No SCOPE finding.
- Not applicable: viewports, keyboard, vi/en, states (no UI change); the gate's e2e passed unchanged.

## Findings
| ID | Sev | Summary | Repro | Expected | Actual | Suggested fix |
|---|---|---|---|---|---|---|
| QA-S4-1 | S4 | The L2 verifier accepts patterns with literal `.`/`..` segments: `@Audience(TUTOR)` on `/api/v1/tutor/{x}/../../student/qa-dots` starts | Add the handler in a `com.englms` controller, package, start | Startup refused (ambiguous namespace) | Starts; unreachable today (firewall 400; normalized path does not match); defence in depth | Reject empty, `.` or `..` segments in `AudienceVerifier` + one test case (cheap, DEC-088) |

**LC resolution:** QA-S4-1 fixed in-task at `bc09303` (AC2a; `AudienceVerifierTest` `DotSegments`, `EmptySegment`; security.md §4).

## Accessibility
Not applicable (no UI change).

## Isolation / privacy checks
- B-on-A not applicable for the five live mappings; mechanism proven by `HarnessDetectionTest`.
- No B user ID, B username or `SECRET-*` in any student A response (live and harness).
- Disabled C → 401 on login; must-change → 403 on login, its session reaches only `session`, `logout`, `password`, `GET`/`HEAD /meta`.

## Re-test log
(none)

QA-VERDICT T-M2.2: PASS WITH MINOR

## Re-test (round 2)

Head `4ebae2921085811a5583690b17f95818b05f118d` · 2026-10-06 from 05:32:45 UTC · same evaluator, same method (uncommitted throwaway probes under
`com.englms.qaprobe`, packaged and started against a throwaway `postgres:18`, then deleted; `git status` clean). Delta since `071aec6`: `bc09303` (AC2a),
`be064ac`..`c818b4f` (AC9, SEC round 1), `1dd6805` (AC10, SEC round 2 S4s), `4ebae29`.

| # | Check | Result |
|---|---|---|
| R1 | QA-S4-1 / AC2a: `/api/v1/tutor/{x}/../../student/qa-dots`, `/api/v1/tutor//qa-dslash`, `/api/v1/tutor/./qa-dot` | PASS: all refused as ambiguous path patterns; QA-S4-1 closed |
| R2 | AC9 S3-1: `RouterFunction` on `/api/v1/tutor/qa-router`; `SimpleUrlHandlerMapping` key `/api/v1/tutor/qa-url` | PASS: both refused |
| R3 | AC9 S3-3: `STUDENT` outside `..web.student..`; `TUTOR` inside `qaprobe.web.student` | PASS: each refused |
| R4 | AC9 S4-2: `/api/v1/student/{otherStudentId}/qa` | PASS: refused |
| R5 | AC9 S4-1: `/{x}/v1/tutor/qa-firstvar` | PASS: refused (non-literal first segment) |
| R6 | AC10 N2-1: custom `HandlerMapping` bean | PASS: refused |
| R7 | AC10 N2-2: `SimpleUrlHandlerMapping` → bean name of a `com.englms` `Controller` | PASS: refused after resolving the type |
| R8 | AC10 N2-3: `STUDENT` method inherited from `com.englms.qaprobe.QaBase` | PASS: refused |
| R9 | Round-1 probes (13 rule breaks + 6 pattern tricks) | PASS: all still refused; good patterns not flagged |
| R10 | No false positives (valid student handler with `{itemId}`, class-level `TUTOR`) | PASS: starts; `GET /api/v1/meta` 200 |
| R11 | Real app (clean jar) | PASS: starts |
| R12 | Curl matrix 5 mappings × 5 actors | PASS: all 25 cells identical to round 1; no B UUID/username or `SECRET-` in A's responses |
| R13 | `-Dgroups=security` ×2 | PASS: 78 tests, 0 failures, both runs (`AudienceVerifierTest` 35, `HarnessDetectionTest` 12, `AuthzMatrixTest` 22, `IsolationTest` 6, `StudentIsolationRulesTest` 3) |
| R14 | `ENGLMS_TASK=T-M2.2 ./scripts/gate.sh` | PASS: 13 steps, 395 s, backend 293 tests, e2e OK |

New findings: none. QA-S4-1: fixed in `bc09303`, verified by R1.

QA-VERDICT T-M2.2: PASS
