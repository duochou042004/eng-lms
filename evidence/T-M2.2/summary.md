# T-M2.2 evidence summary: authorization matrix + student-isolation harness

Packet: `docs/tasks/T-M2.2-authz-isolation-harness.md` · Branch `feature/T-M2.2-authz-isolation-harness` (from `develop` `80dee8d`; start signal DEC-095) ·
Implementer: backend-implementer (main checkout, DEC-094). Recorded by the LC from the implementer's final report (the harness denied the agent this file).

## Implementation

### Results
- `ENGLMS_TASK=T-M2.2 ./scripts/gate.sh` **PASS** at `00987ba` (13 steps, 392 s): `gate-20261006T042315Z.log`. Backend 276 tests, 0 failures; contract-drift
  green (no API change); E2E smoke 86 passed, 19 skipped. The E2E step's records and screenshots were not kept (no UI change; the packet asks for none).
- `(cd backend && ./mvnw -B -ntp verify -Dgroups=security)` **BUILD SUCCESS**, 61 tests: `security-groups.log` (run at `87512e1`; later commits change docs
  only). The surefire report lists `StudentIsolationRulesTest` (ArchUnit, 3), `AuthzMatrixTest` (22), `HarnessDetectionTest` (11), `IsolationTest` (6)
  and `AudienceVerifierTest` (19).
- Logs checked for `.env` values: only the database name/user appear, which equal the application name `englms` printed on every log line; no password.

### AC → proof
Main code in `backend/src/main/java/com/englms/`, tests in `backend/src/test/java/`.

| AC | Proof |
|---|---|
| AC1 | `shared/web/Audience.java` (`Audience.Kind {TUTOR, STUDENT, PUBLIC, AUTHENTICATED}`, method or class, runtime); `shared/web/TutorPrivate.java` (type + field, runtime). `AuthController`: `session`, `login`, `logout` `PUBLIC`, `changePassword` `AUTHENTICATED`; `MetaController.meta` `PUBLIC`. The verifier accepting the real app (every full-context test starts) proves all five are annotated. |
| AC2 | `shared/web/AudienceVerifier.java` (`SmartInitializingSingleton`, `@ConditionalOnWebApplication(SERVLET)`). `com/englms/shared/web/AudienceVerifierTest`: 16 one-controller servlet contexts each refuse to start naming `Class#probe` and the rule: no `@Audience`; `STUDENT`/`AUTHENTICATED`/`PUBLIC` on tutor; `TUTOR`/`AUTHENTICATED`/`PUBLIC` on student; `TUTOR`/`STUDENT` on auth; `AUTHENTICATED` and `POST`+`PUBLIC` on `/meta`; unknown `/api/v1/probe`; `com.englms` handler at `/probe`; bare `@RequestMapping`; a two-pattern handler where only the student pattern breaks; a wrong class-level audience. Also: two offenders are both named; valid handlers (incl. `GET`+`HEAD` `/meta`, method-over-class) start; a non-web context with an unannotated controller starts and has no verifier (CLI case; `ResetTutorPasswordCliTest` green). `AuthzMatrixTest.theL2VerifierRunsInTheApplication`. |
| AC3 | `com/englms/security/PolicyRegistry.java` (five entries, statuses as in the design notes); `AuthzMatrixTest.answersEachActorAsRegistered`: 20 calls (5 entries × anonymous, tutor, A, must-change; B-on-A is N/A for all five), each actor signed in through `POST /api/v1/auth/login` in a fresh world, CSRF on unsafe methods (`Browser`). |
| AC4 | `AuthzMatrixTest.everyHandlerMappingHasARegistryEntryAndEveryEntryAMapping` (live keys from `RequestMappingHandlerMapping` via `AudienceVerifier.handlers`). `HarnessDetectionTest.completenessNamesAHandlerMappingWithoutAnEntry` (test-only `@Audience(TUTOR)` controller → fails naming `GET /api/v1/tutor/harness-probe`) and `completenessNamesAnEntryWithoutAHandlerMapping` (stale `DELETE /api/v1/tutor/harness-gone` named; the same set without it passes). |
| AC5 | `com/englms/architecture/StudentIsolationRulesTest` (`@Tag("security")`): `studentRulesHoldForTheApplication` (both rules on `com.englms`, `allowEmptyShould(true)`); `ruleThreeCatchesEveryWayOfNamingAStudentId` (fixtures: parameter `studentId`, parameter `peerStudentId`, `@PathVariable("studentId") UUID id`, `@RequestParam(name = "otherStudentId")`; exactly 4 violations, `Clean` none); `ruleFourCatchesNotesLearningProfileAndTutorPrivateTypes` (notes type, `LearningProfileSummary`, `@TutorPrivate` type, `@TutorPrivate` field). Fixtures in `fixture/archunit/`. |
| AC6 | `com/englms/security/IsolationWorld.java` (tutor; A, B active; C disabled; must-change; random-suffix usernames), `SecurityHarness.assertNoLeak` (headers + body, any status, case-insensitive; B's user ID, username, contributed B IDs; `SECRET-[A-Z0-9-]+`). `IsolationTest.studentAsResponseLeaksNothingOfStudentBOrTheTutor` (all five entries pass). `HarnessDetectionTest.theScanNamesStudentBsIdentifierInTheBodyWhateverItsCase` (B's ID upper-cased in the body) and `theScanNamesASecretMarkerInAHeaderWhateverItsCase` (lower-case marker in a header): each fails naming the endpoint and the hit. |
| AC7 | `IsolationWorldContributor` (extension point, Spring beans). `HarnessDetectionTest.Items` contributor + owner-scoped fixture handler `GET /api/v1/student/harness/items/{itemId}`: every actor as registered, B on A's item → 404 (`anOwnerScopedHandlerAnswersEachActorAsRegisteredIncludingBOnAsResource`); an unscoped twin fails the B-on-A check naming the endpoint (`aHandlerThatIsNotOwnerScopedFailsTheBOnAsResourceCheck`). `IsolationTest.theDisabledStudentCannotSignIn` (C → 401). |
| AC8 | `security-groups.log` and the gate log above. Existing tests changed: only `SpaServingTest` (probe `/api/v1/probe` → `/api/v1/tutor/probe` with `@Audience(TUTOR)`; its request URI follows). |

### Commands
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh && source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dgroups=security)
ENGLMS_TASK=T-M2.2 ./scripts/gate.sh
./scripts/check-docs.sh && ./scripts/check-path-ownership.sh feature/T-M2.2-authz-isolation-harness
```

### Choices within the design-note latitude
- Registry: a Java class (`PolicyRegistry.ENTRIES`, `Policy.of(method, path, body, anonymous, tutor, studentA, studentBOnA, mustChange)`); `NA` marks
  B-on-A not applicable. Sample path variables `{key}` resolve to A's resources registered by contributors.
- Sessions: one fresh world and one sign-in per (entry, actor) call, so `logout`/`login` cannot affect another call; throttle raised via
  `englms.security.login-throttle.max-attempts` (the matrix and isolation tests share `AuthApiIntegrationTest`'s cached context).
- Contributors: Spring beans (`ObjectProvider<IsolationWorldContributor>`); `reset()` runs before the accounts are deleted (future rows may reference them).
- ArchUnit rules as plain JUnit `@Test` methods under `@Tag("security")` (packet option), so one tag mechanism selects all three suites. Rule 3 also
  ignores case, `_` and `-` (`student_id` is caught); rule 4 also catches a dependency on the `@TutorPrivate` annotation itself (a field marked private).

### Deviations
- `settings/package-info.java`: `allowedDependencies = "shared :: *"` → `"shared"` (as identity). `shared :: *` admits only named interfaces and shared
  has none, so `MetaController`'s `@Audience` broke `ModularityTests`. No new module dependency; module-boundaries "shared" notes it.

### Known limitations
- Rule 3 checks parameter names and `@PathVariable`/`@RequestParam` names only, not `@RequestBody` DTO fields, headers or cookies (ADR-0016 §2 also forbids
  a student ID in the body; no rule in test-strategy §4 covers DTO fields yet). Open question for T-M2.3 / the first student handler.
- The scan matches B's UUIDs in their canonical text form only (not e.g. without dashes or base64-encoded).
- No `CurrentStudent`, owner-scoped repositories or production student-owned resources yet (T-M2.3); B-on-A is N/A for all live entries.
- The matrix signs in once per (entry, actor): 20 sign-ins today (bcrypt 12); revisit per the packet's risk note when the registry grows.

## G3: QA fixes (LC, in-task per DEC-088)
QA PASS WITH MINOR at `071aec6` (report recorded via the `qa/T-M2.2` PR). QA-S4-1 (the verifier accepted `/api/**` patterns with `.`/`..`/empty segments,
e.g. `/api/v1/tutor/{x}/../../student/qa-dots`; unreachable today, defence in depth) fixed: `AudienceVerifier` refuses such patterns as ambiguous; packet
AC2a; security.md §4. Proof: `AudienceVerifierTest` cases `DotSegments`, `EmptySegment` (21/21 green).

## G3 round 1 SEC fixes (backend-implementer, AC9, in-task per DEC-088)
SEC APPROVED at `bc09303` with S3-1..S3-4 and S4-1..S4-3; all fixed in `11473e0` (code) and `0819571` (docs). Each has a failing-fixture proof.

| Finding | Fix | Proof (test → fixture) |
|---|---|---|
| S3-1 only `RequestMappingHandlerMapping` seen | `AudienceVerifier` iterates every `HandlerMapping` bean: refuses a `RouterFunctionMapping` with a router function, and any `AbstractUrlHandlerMapping` key under `/api` or with a `com.englms` handler; SPA resource handlers allowed | `AudienceVerifierTest.refusesFunctionalRoutes` (`GET /api/v1/student/rf` route), `refusesAUrlHandlerMappingUnderApi`, `refusesAUrlHandlerMappingWithAnApplicationHandler`, `allowsTheSpaResourceHandlers` (`SpaWebConfiguration`) |
| S3-2 keys collapse handlers differing by params/headers/consumes/produces | `SecurityHarness.liveKeys` returns key → handler methods; `assertComplete` fails naming a key with more than one handler method | `HarnessDetectionTest.completenessNamesAKeyServedByTwoHandlerMethods` (`SameKeyTwice`: `GET /api/v1/tutor/harness-twice` with and without `params = "full"`) |
| S3-3 STUDENT not tied to `..web.student..` | Verifier: a `STUDENT` handler outside `..web.student..`, or a non-`STUDENT` handler in it, is refused | `AudienceVerifierTest` cases `StudentOutsideStudentWeb`, `StudentWebHandlers.TutorInStudentWeb`; valid `StudentWebHandlers.ValidStudent` starts. Test-only student handlers moved to `fixture/verifier/web/student/` and `fixture/harness/web/student/HarnessStudentHandlers` (+ `fixture/harness/HarnessItems`) |
| S3-4 rule 4 misses types with a `@TutorPrivate` field | Rule 4 also matches classes with any `@TutorPrivate` field (inherited included) | `StudentIsolationRulesTest.ruleFourCatchesNotesLearningProfileAndTutorPrivateTypes` (`DependsOnTypeWithTutorPrivateField` → `PrivateTypes.LessonView.privateNote`) |
| S4-1 literal `/api` scope | A pattern whose first segment is not a literal counts as API and is refused | `AudienceVerifierTest` cases `CatchAllHandler` (`fixture.verifier`, `/{*rest}`, third-party-like) and `WildcardFirstSegment` (`/*/v1/tutor/probe`) |
| S4-2 `{studentId}` path variables | `/api/v1/student/**` patterns with a `{…studentId}` variable (case, `_`, `-` ignored) are refused | `AudienceVerifierTest` case `StudentWebHandlers.StudentIdVariable` (`{peer_StudentId}`) |
| S4-3 parser not checked | Startup refused unless each `RequestMappingHandlerMapping` has a non-null, case-sensitive `PathPatternParser` | `AudienceVerifierTest.refusesACaseInsensitivePatternParser`, `refusesLegacyAntPathMatching` |

Existing-test edits (no assertion weakened): `AudienceVerifierTest.Valid` lost its student handler (now `StudentWebHandlers.ValidStudent`, still in the
start test); `MethodWins` proves method-over-class with `@Audience(PUBLIC)` on `POST /api/v1/auth/c` (class `TUTOR`), since a `STUDENT` method outside
`..web.student..` is now refused; `HarnessDetectionTest` imports the moved fixtures and uses the `Map` returned by `liveKeys`.

Results: `-Dgroups=security` BUILD SUCCESS, 75 tests (`security-groups.log`, at `0819571`). `ENGLMS_TASK=T-M2.2 ./scripts/gate.sh` PASS at `0819571`
(13 steps, 394 s; backend 290 tests, E2E 86 passed / 19 skipped): `gate-20261006T051555Z.log`. Docs: security.md §4 (L2 rules, completeness),
test-strategy §4 rule 4, authz-isolation skill (student handlers in `..web.student..`, one handler per key, no functional routes).

Known limitation: URL-mapping handlers registered lazily by bean name (a `String` handler) are not resolved to their class; none exist.
