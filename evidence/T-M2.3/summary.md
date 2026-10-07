# T-M2.3 evidence summary: students core

Packet: `docs/tasks/T-M2.3-students-core.md` · Branch `feature/T-M2.3-students-core` (from `develop` `3d53b68`; start signal DEC-098) ·
Implementer: backend-implementer (main checkout, DEC-094). Recorded by the LC from the implementer's final report (the harness denied the agent this file).

## Implementation

### Results
- `ENGLMS_TASK=T-M2.3 ./scripts/gate.sh` **PASS** at `01319a0` (13 steps, 449 s): `gate-20261007T031403Z.log`. Backend 384 tests, 0 failures; contract-drift
  green (`api/openapi.json` lists the eight new operations; `web/src/lib/api/schema.d.ts` regenerated); E2E smoke 86 passed, 19 skipped (the e2e step's
  untracked `records/` and `screenshots/` deleted: no UI). An earlier gate run at `323cd7e` failed in the backend step (two existing tests still treated
  `/api/v1/tutor/students` as unmapped; `FlywayMigrationTest` lacked the new migration); fixed in `ae3c799`, `01319a0`; that log was not kept.
- `(cd backend && ./mvnw -B -ntp verify -Dgroups=security)` **BUILD SUCCESS**, 124 tests: `security-groups.log` (at `323cd7e`; later commits touch only
  `FlywayMigrationTest`, `SpaServingTest` and evidence). `AuthzMatrixTest` 54 (was 22), `IsolationTest` 14, `HarnessDetectionTest` 18,
  `StudentIsolationRulesTest` 3, `AudienceVerifierTest` 35.
- ×20 of the AC2 race class `StudentCreateRaceTest` (2 tests): **20/20 passed** (`race-x20.log`).
- S4-1 mutation check: with the `AccountStatusFilter` removed from the chain, `aSessionOfAnAccountNoLongerActiveIsRefusedWith401SessionExpiredAndInvalidated`
  and `aProtectedRequestOfAnAccountNoLongerActiveIs401SessionExpired` fail (the remember-me case was already refused); restored.
- Logs checked for `.env` values: only the database name/user (equal to the application name `englms`); no password.

### AC → proof
Main code in `backend/src/main/java/com/englms/`, tests in `backend/src/test/java/`. `SAIT` = `com/englms/students/StudentsApiIntegrationTest`.

| AC | Proof |
|---|---|
| AC1 | `students/internal/app/StudentService#create` (one `@Transactional`: `AccountApi.createStudentAccount`, then `saveAndFlush(Student)`); `identity/internal/app/AccountService#createStudentAccount` (`UserAccount.newStudent`: `STUDENT`, `ACTIVE`, must change, expiry now + 7 d; generator when `password` absent); `TutorStudentController#create` (201 + `Location`, `{student, credentials}`). SAIT: `createMakesTheStudentAccountAndTheStudentAndReturnsGeneratedCredentialsOnce`, `aSuppliedPasswordMustPassThePolicyAndIsUsedWhenItDoes`, `invalidFieldsAre422WithFieldCodesAndNothingIsCreated`, `aFailedStudentInsertRollsTheAccountBackAndLeavesNoAuditRow` (test-only trigger: 500, no account, student or `STUDENT_CREATED`), `noTemporaryPasswordOrHashAppearsInAnyOtherResponseAuditRowOrLogLine`. Generator ≥ 14 and policy-clean: `TemporaryPasswordGeneratorTest`. |
| AC2 | `AccountService#createStudentAccount`/`saveCheckingUsername` (existence check, `saveAndFlush`; index violation → 409 `USERNAME_TAKEN`, `errors[0].field = "username"`). `StudentCreateRaceTest`: `twoConcurrentCreatesOfOneUsernameGiveOne201AndOne409` (start latch, no timing bound), `theUniqueIndexCatchesACreateThatPassedTheExistenceCheck` (loser seen waiting in `pg_stat_activity`). SAIT: `aUsernameEqualAfterNormalisationIs409UsernameTaken`, `anAccentedUsernameIsInvalid` (422 `USERNAME_INVALID`, availability `INVALID`), `theSuggestionIsTheNormalisedNameThenTheFirstFreeSuffix`, `availabilityAnswersAvailableInvalidOrTaken`. Unit: `students/internal/domain/StudentDomainTest`. |
| AC3 | `StudentService#list` (Specification: statuses, `search_text LIKE` with `shared.Like` escaping, `OR user_id IN` identity's username lookup, one `AccountApi.usernames` batch per page); `TutorStudentController#list` (422 naming `status`/`sort`/`page`/`size`). SAIT: `theListShowsActiveAndPausedByDefaultAndArchivedOnlyWhenAsked`, `searchIsAccentAndCaseInsensitiveOverNameUsernameEmailPhoneAndHandleValues` (`dang` → `Đặng`), `likeWildcardsInQMatchLiterally`, `pagingAndTheFullNameAndCreatedAtSortsFollowTheConventions`, `anUnknownSortOrStatusOrAnOutOfRangePageIs422NamingTheField`, `theListMakesTheSameNumberOfStatementsWhateverTheNumberOfRows` (Hibernate statistics). Unit: `shared/LikeTest`. |
| AC4 | `StudentService#update` (version → 409 `STALE_VERSION`; present fields only; `AccountApi.changeUsername` in the same transaction, `StudentUsernameChanged`); `ProblemDetailsAdvice` maps `OptimisticLockingFailureException` → 409. SAIT: `getAndPatchReadAndUpdateTheProfileWithOptimisticLocking`, `aUsernameChangeAppliesUniquenessKeepsTheStudentsSessionsAndIsAudited`, `anUnknownStudentIs404Everywhere`. |
| AC5 | `StudentStatus#canBecome` (domain-model §4.1); `StudentService#changeStatus` (`ARCHIVED` → `AccountApi.disable`, `ARCHIVED → ACTIVE` → `enable`, `StudentStatusChanged {from, to}`). SAIT: `statusTransitionsFollowTheLifecycleAndAreAudited`, `archivingEndsEverySessionAndTokenAtOnceAndReactivationReEnablesSignInWithMustChangeUnchanged` (two sessions + remember-me → 401), `reactivationKeepsAPendingPasswordChange`. |
| AC6 | `StudentService#resetPassword` (`ARCHIVED` → 409); `AccountService#resetPasswordByTutor` (7 d, lockout cleared, `endAllSessions`, `PasswordReset(TUTOR, tutorId)`). SAIT: `aTutorResetGivesANewTemporaryPasswordOnceEndsSessionsClearsTheLockoutAndIsAudited`, `theTemporaryPasswordExpiresAfterSevenDaysIfUnused` (`MutableClockConfiguration`), `anArchivedStudentCannotBeReset`. |
| AC7 | Class-level `@Audience(TUTOR)` on `TutorStudentController`; `security/PolicyRegistry` eight entries (anonymous 401, tutor 201/200, A 403, must-change 403, B-on-A `NA`); `students/StudentsWorldContributor` (A, B, C `ARCHIVED`, must-change; `SECRET-STUDENT-NOTE-*`, `SECRET-STUDENT-HANDLE-*`; `sid` → A). `AuthzMatrixTest` 54/54, `IsolationTest` 14/14; SAIT secret test above (responses, audit rows, captured log: no temporary password, `$2a$` or `{bcrypt}`). |
| AC8 | `shared/web/CurrentStudent`, `CurrentStudentResolver` (Authentication name + `ROLE_STUDENT`, never a request parameter; no student row → session invalidated, 401 `SESSION_EXPIRED`; otherwise `IllegalStateException`), `shared/StudentPrincipals` (implemented by `StudentService#studentIdForUser`). `fixture/harness/web/student/HarnessStudentHandlers` (`item`, new `me`) take `CurrentStudent`; `HarnessItems` keyed by student ID. `HarnessDetectionTest`: `aCurrentStudentHandlerAnswersEachActorAsRegistered`, `currentStudentCarriesTheSignedInStudentsIds`, `aStudentAccountWithoutAStudentRowGets401SessionExpiredAndItsSessionEnds`, B-on-A `anOwnerScopedHandlerAnswersEachActorAsRegisteredIncludingBOnAsResource` (404). Convention in `.claude/skills/backend-module` and `authz-isolation`. |
| AC9 | `identity/internal/security/AccountStatusFilter` (after `RememberMeAuthenticationFilter`; non-`ACTIVE` or missing account → session invalidated, context cleared, continues anonymous; `AuthProblems` answers `SESSION_EXPIRED`). `identity/AuthApiIntegrationTest`: `aSessionOfAnAccountNoLongerActiveIsRefusedWith401SessionExpiredAndInvalidated` (deterministic: `DISABLED` by SQL without ending sessions), `aProtectedRequestOfAnAccountNoLongerActiveIs401SessionExpired`, `aRememberMeLoginOfAnAccountNoLongerActiveIs401SessionExpired`, `aRefusedSessionDoesNotBlockSigningInAgainOnTheSameDevice`. Mutation check above; existing auth tests 57/57. |
| AC10 | Gate log; `security-groups.log`; `ModularityTests` (students module; audit allows `students :: events`), `ForbiddenIdentifiersTest` green; contract updated. Docs: api-catalog, data-model §2–§4, module-boundaries (identity, students, shared, audit, graph), security.md §4/§8, api-conventions §4/§5, validation-rules, A-021, ux-flows F2 step 2, FR-STU-01, traceability rows (4.2, 4.3, 5.6, 37, 41), both skills, `progress.json`. |

### Commands
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh && source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dgroups=security)
(cd backend && for i in $(seq 1 20); do ./mvnw -B -ntp verify -Dtest='StudentCreateRaceTest' -Dsurefire.failIfNoSpecifiedTests=false || break; done)
./scripts/contract-drift.sh
ENGLMS_TASK=T-M2.3 ./scripts/gate.sh
./scripts/check-docs.sh && ./scripts/check-path-ownership.sh feature/T-M2.3-students-core
```

### Choices within the design-note latitude
- Create response `{student, credentials: {username, temporaryPassword, expiresAt}}`; a supplied password is also returned in `credentials` (must change).
- New field codes in `ProblemCodes`: `REQUIRED`, `TOO_LONG`, `TOO_MANY`, `INVALID_FORMAT`, `INVALID_VALUE`, `USERNAME_INVALID`, `USERNAME_TAKEN`; list
  fields indexed (`contactHandles[1].value`).
- Explicit validation (`students.internal.app.StudentFields`), not Bean Validation (the advice maps it to 400 without `errors[]`); one 422 collects all.
- PATCH binds a setter-based class (Jackson 3 binds an absent `Optional` record component like `null`).
- `version` moves only when the student row changes; a username-only change keeps it.
- Events carry status names (`String from/to`); audit depends on `students :: events` only.
- `StudentDirectory.require` returns `StudentRef {studentId, userId, fullName}`; `StudentService` implements `StudentDirectory` and `StudentPrincipals`.
- The S4-1 filter continues as anonymous (login, logout, `/meta` still work on a device holding a refused session); `/api/**` only.
- `StudentsWorldContributor` is `@Order(HIGHEST_PRECEDENCE)`; contributors reset in reverse order; `IdentityFixtures.reset` deletes `student` rows first.
- Registry sample paths may carry a query string; `Policy.key()` drops it.
- `MutableClockConfiguration` (`@Primary` clock) shared by the students API and race tests (one extra context); rollback proof by a test-only trigger.

### Deviations
- `web/src/lib/api/schema.d.ts` regenerated by `scripts/contract-drift.sh` (gate requirement, as in T-M2.1); no hand edit under `web/`.
- Existing tests updated, none weakened: `AuthApiIntegrationTest.theWrongRoleGets403AndAnUnmappedPathStays404ForAnAuthenticatedCaller` and
  `SpaServingTest.apiActuatorAndAssetPathsNeverFallBack` probe `/api/v1/tutor/nothing-here` (was `/tutor/students`, now live); `FlywayMigrationTest`
  inventory + new `theStudentTableEnforcesItsConstraints`; harness fixtures keyed by student ID; `IdentityFixtures.reset`, `IsolationWorld.build`.
- `UserAccountRepository`: a duplicated Javadoc line removed.

### Known limitations
- A login racing a tutor **password reset** (out of scope): the account stays `ACTIVE`, so the S4-1 check does not catch it; needs a per-session credential stamp.
- Remember-me of a student account without a student row: the resolver ends the session but cannot delete tokens (`shared` cannot call identity); the
  cookie is refused on every request. Not reachable in normal operation (account and row are created in one transaction).
- `Idempotency-Key` on `POST /tutor/students` (api-conventions §6) not built (no AC); a double submit gets 409 `USERNAME_TAKEN`. LC: deferred to T-M5.4 (the idempotency store), a replay must not return the temporary password in clear (DEC-099, api-conventions §6, backlog).
- Each students event leaves one completed `event_publication` row (Modulith default); nothing purges them yet.
- bcrypt runs inside the create and reset transactions (one tutor; sign-in locks only its own row).
- Username suggestion checks candidates one by one; the `q` username lookup is an `IN` list; `fullName` sort uses the database collation.

## G3 fixes (backend-implementer, in-task per DEC-088)
QA and SEC findings from round 1, fixed in `a2bb217` (code + tests) and `57de84f` (docs). Each new test was run against the pre-fix `backend/src/main` (`dcb45c8`): 11 of the 12 fail there, and all pass with the fix. The exception is `requestParametersNamingStudentBDoNotChangeCurrentStudent`: it pins the existing resolver order and passes on both, as expected.

| Finding | Fix | Proof (fails without the fix) |
|---|---|---|
| QA-S3-1 / SEC-S3-1: NUL in `fullName`, `note`, handle label/value or `q` → 500; the jsonb error logged the value | `StudentFields.text(raw, field, problems)` refuses C0 control characters except tab, LF and CR → 422 `INVALID_FORMAT` naming the field (indexed for handles); email and phone are covered too. `TutorStudentController#list` refuses them in `q` before normalising → 422 `q`. Backstop: `ProblemDetailsAdvice.handleUnexpected` maps SQLState 22021/22P05 anywhere in the cause chain to 422 `VALIDATION_FAILED` and logs only the SQLState. | `StudentsApiIntegrationTest.controlCharactersInFreeTextAre422NamingTheField` (create with NUL/ESC in every field → six `INVALID_FORMAT` codes; tab/LF/CR allowed; PATCH handle value NUL → 422; `q` with NUL → 422 `q`; the captured log has neither the value nor "Unhandled exception"); `anUnknownSortOrStatusOrAnOutOfRangePageIs422NamingTheField` (`q=a%00b`, `q=%07`); `shared/web/ProblemDetailsAdviceTest` (22021 and 22P05 → 422, message not logged; other errors stay 500). |
| SEC-S3-2: a binding annotation on a `CurrentStudent` parameter binds it from the request | `AudienceVerifier.currentStudentBindings` refuses startup for a `CurrentStudent` parameter carrying `@ModelAttribute`, `@RequestBody`, `@RequestParam`, `@PathVariable`, `@RequestHeader`, `@CookieValue`, `@MatrixVariable`, `@RequestPart`, `@RequestAttribute` or `@SessionAttribute` (also as meta-annotations). A bare parameter is resolved by `CurrentStudentResolver`: Spring consults custom resolvers before its catch-all `ServletModelAttributeMethodProcessor`, so the resolver was not prepended (proved by test). | `AudienceVerifierTest.refusesEveryBindingAnnotationOnACurrentStudentParameter` (fixture `StudentWebHandlers.BoundCurrentStudent`, 10 handlers, each annotation named, "10 handler rule(s)"); `ValidStudent` now takes a bare `CurrentStudent` and still starts (36/36 green). `HarnessDetectionTest.requestParametersNamingStudentBDoNotChangeCurrentStudent` (A calls `me?studentId=<B>&userId=<B>` and gets A's IDs). |
| QA-S3-2 / SEC-S4-4: a username-only or no-op PATCH moved `updatedAt` (and `version` with a moving clock); a negative `version` gave `REQUIRED` | `Student#apply` returns early when the new profile equals the current one: `updatedAt`, `updatedBy` and the handles are left as they are. A negative `version` → `INVALID_VALUE` in PATCH and `/status`. | `StudentsApiIntegrationTest.aUsernameOnlyOrNoOpPatchKeepsVersionAndUpdatedAt` (clock advanced 1 h before each PATCH: rename and same-values PATCH keep version 0 and the creation `updatedAt`; a real change → version 1, `updatedAt` = clock); `aNegativeVersionIsInvalidNotMissing`. |
| QA-S4-1 / SEC-S4-1: a refused account kept its other sessions and remember-me tokens, which came back after a re-enable | `AccountStatusFilter` also calls `SessionTerminator.endAllSessions(userId)`. `AccountRememberMeServices.processAutoLoginCookie` does the same when a valid token belongs to an account that is not `ACTIVE` (`AccountUserDetails.active()`; a must-change account keeps its tokens). | `AuthApiIntegrationTest.aRefusedRememberMeTokenIsDeletedAndDoesNotReviveTheAccountAfterReEnabling` (remember-me sign-in, `DISABLED` by SQL, one refused request, tokens and sessions gone, `ACTIVE` again, replay of the cookie → 401 `SESSION_EXPIRED`); `aRefusedSessionEndsTheAccountsOtherSessionsAndTokens` (the filter path: the other session and the token end too). |
| SEC-S4-3: `?page=2147483647&size=100` → 500 | `page > Integer.MAX_VALUE / size` → 422 `page` `INVALID_VALUE`. | `anUnknownSortOrStatusOrAnOutOfRangePageIs422NamingTheField` (`page=2147483647&size=100`, `page=85899346` with the default size 25). |
| SEC-S4-6: `resetPasswordByTutor` ran bcrypt while holding the row lock | The temporary password is generated and encoded before `findForUpdateById`. | `identity/internal/app/AccountServiceTest.theTutorResetEncodesBeforeTakingTheRowLock` (Mockito `InOrder`: `encode` before `findForUpdateById`). |
| SEC-S4-7: `AccountApi.changeUsername` accepted a non-STUDENT account | It is filtered to `Role.STUDENT`, like the reset (`NoSuchElementException` otherwise). | `AccountServiceTest.aTutorAccountCannotBeRenamedOrResetThroughTheStudentApi` (the tutor's username and hash are unchanged, nothing saved, no session ended). |

Results:
- `ENGLMS_TASK=T-M2.3 ./scripts/gate.sh` **PASS** at `57de84f` (13 steps, 447 s): `gate-20261007T044249Z.log`.
  - Backend: 396 tests, 0 failures.
  - contract-drift OK: no contract change in this round.
  - E2E: 86 passed, 19 skipped.
  - The old gate log `gate-20261007T031403Z.log` was removed; the untracked `records/` and `screenshots/` were deleted.
- `-Dgroups=security` **BUILD SUCCESS**, 126 tests at `57de84f` (`security-groups.log`, overwritten): `AudienceVerifierTest` 36, `HarnessDetectionTest` 19, `AuthzMatrixTest` 54, `IsolationTest` 14, `StudentIsolationRulesTest` 3.
- ×20 `StudentCreateRaceTest` (rerun because `changeUsername` changed): **20/20** at `57de84f` (`race-x20.log`, overwritten).
- Docs:
  - security.md §4: the L2 `CurrentStudent` binding rule, and refusals now end all sessions and tokens.
  - validation-rules: control characters.
  - api-conventions §4/§5: the `page × size` bound, `q` `INVALID_FORMAT`, a negative `version` as `INVALID_VALUE`, the SQLState backstop.
  - The authz-isolation skill: never annotate `CurrentStudent`.
- `check-docs.sh` PASS; `check-path-ownership.sh feature/T-M2.3-students-core` PASS.

Not in this round (recorded by the LC): S4-2 (the vendor's ERROR log of the username on a duplicate), S4-5 (login racing a reset), S4-8 (UI href note), S4-9 (common-password list).

## G3 SEC round 2 S4 (LC, in-task per DEC-088)
SEC round 2 APPROVED at `adb28d5` (all round-1 fixes confirmed) with one new S4, fixed by the LC:
- R2-1: a control character (e.g. NUL) in the login username reached the database and, through the new SQLState backstop, answered 422 instead of the
  generic 401 with a dummy bcrypt and a `REJECTED_INPUT` audit row (security.md §3). `AuthenticationService#attempt` sends such usernames down the
  `REJECTED_INPUT` branch. Proof: `AuthApiIntegrationTest.anOversizedBodyIsRefusedAndOverLongFieldsGetTheGeneric401` (a NUL username → the same 401 body as
  a wrong password, audited `REJECTED_INPUT`; fails without the fix), `AuthenticationServiceTest.overLongInputIsNeverLookedUpButStillRunsTheEncoder`
  (never looked up, one dummy bcrypt). Both classes green (2 + 59 tests). security.md §3 input bounds amended. `ENGLMS_TASK=T-M2.3 ./scripts/gate.sh` **PASS** at `879c8d1` (13 steps, 452 s): `gate-20261007T084035Z.log` (replaces `gate-20261007T044249Z.log`).
