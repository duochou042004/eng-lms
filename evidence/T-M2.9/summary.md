# T-M2.9 evidence summary: students part 2

Packet: `docs/tasks/T-M2.9-students-part-2.md` · Branch `feature/T-M2.9-students-part-2` (from `develop` `4c02ee0`; start signal DEC-104) ·
Implementer: backend-implementer (main checkout, DEC-094). Recorded by the LC from the implementer's final report (the harness denied the agent this file).

## Implementation

### Results
- `ENGLMS_TASK=T-M2.9 ./scripts/gate.sh` **PASS** at `7550855` (13 steps, 482 s): `gate-20261009T091443Z.log`. Backend 462 tests, 0 failures;
  web 88; contract-drift OK (`api/openapi.json`, `web/src/lib/api/schema.d.ts` regenerated and committed in `3c578fb`); E2E 86 passed, 19 skipped
  (the e2e step's untracked `records/` and `screenshots/` deleted: no UI; `scripts/dev-down.sh` run).
- `(cd backend && ./mvnw -B -ntp verify -Dgroups=security)` **BUILD SUCCESS**, 158 tests at `7550855` (`security-groups.log`): `AuthzMatrixTest` 78
  (was 54), `IsolationTest` 20 (was 14), `HarnessDetectionTest` 21 (was 18), `StudentIsolationRulesTest` 3, `AudienceVerifierTest` 36.
- ×20 of `CredentialStampTest` (S4-5, 8 tests), `GuardianCapRaceTest` (AC1 race), `LearningProfileFirstPutRaceTest` (AC3 race) and
  `StudentCreateRaceTest` (3 tests incl. the S4-2 log assertions): **20/20 passed** at `7550855` (`x20.log`, filtered to these four classes).
- Mutation checks (each reverted at once, not committed):
  - S4-2: with `logging.level.org.hibernate.orm.jdbc.error=off` commented out, `StudentCreateRaceTest` fails 2 of 3 (the HTTP race and the index
    test: Hibernate's log line names the username). The sequential test passes either way (the existence check answers before any SQL error).
  - S4-5 filter: with the stamp comparison in `AccountStatusFilter` disabled, 4 of 8 `CredentialStampTest` tests fail.
  - S4-5 remember-me: with the post-insert stamp re-check in `AccountRememberMeServices#onLoginSuccess` disabled,
    `aLoginRacingAResetKeepsNoRememberMeToken` fails.
- Finding while building S4-2: Hibernate 7 logs SQL errors under the logger `org.hibernate.orm.jdbc.error`, not
  `org.hibernate.engine.jdbc.spi.SqlExceptionHelper` (the class name); the setting uses the logger name (verified by the mutation check above).

### AC → proof
Main code in `backend/src/main/java/com/englms/`, tests in `backend/src/test/java/`. `GLP` = `com/englms/students/GuardiansAndLearningProfileApiTest`.

| AC | Proof |
|---|---|
| AC1 | `students/internal/app/GuardianService` (`add`: `StudentRepository.findForUpdateById` = `SELECT … FOR UPDATE`, count ≥ 10 → 422 `TOO_MANY` on `guardians`, `position` = max + 1; `update`: version `REQUIRED`/`INVALID_VALUE`, 404, 409 `STALE_VERSION`, absent/`null` merge, `name` `REQUIRED`; `delete`), `internal/web/tutor/TutorGuardianController` (201 + `Location`), migration `V202610090001` (`ux_student_guardian__student_id_position` `DEFERRABLE INITIALLY DEFERRED`). GLP: `guardiansAreAddedListedInInsertionOrderUpdatedAndDeleted` (incl. the last guardian deleted → empty list), `positionsAreNotCompactedAndANewGuardianGoesLast`, `invalidGuardianFieldsAre422WithFieldCodes` (NUL → `INVALID_FORMAT`), `theEleventhGuardianIs422TooMany`, `anUnknownStudentOrGuardianIs404`, `guardiansAndTheProfileWorkForPausedAndArchivedStudents`, `theGuardianListMakesTheSameNumberOfStatementsWhateverTheNumberOfGuardians` (Hibernate statistics, ≤ 3). Race: `students/GuardianCapRaceTest` (9 guardians, two `POST`s behind a start latch → one 201, one 422; positions 1..10). Unit: `students/internal/app/StudentFieldsTest`. |
| AC2 | `StudentService#create` validates `guardians` with the rest (`StudentFields.guardians`, paths `guardians[i].name`, ≤ 10) and calls `GuardianService#addAll` after the student insert in the same transaction. GLP: `createWithGuardiansStoresThemInRequestOrderAndTheStudentDtoDoesNotEmbedThem`, `anInvalidGuardianAtCreateIs422WithItsIndexAndNothingIsCreated`, `aFailedGuardianInsertRollsTheAccountAndStudentBack` (test-only trigger fails the second guardian insert: 500, no account, student or guardian). |
| AC3 | `LearningProfileService` (`get`: the row or the empty profile with `version` `null`; `put`: `version` `null` → `LearningProfileRepository#insertEmptyIfAbsent` = `INSERT … ON CONFLICT (student_id) DO NOTHING`, 0 rows → 409; a number → must equal the row's version, else 409; then the values are written with optimistic locking), `StudentFields.tags` (Tag rule, case-insensitive dedup keeping the first spelling, ≤ 30) and `customFields`. GLP: `aStudentNeverEditedHasTheEmptyProfileWithVersionNull`, `theFirstPutCreatesTheProfileAndLaterPutsReplaceIt` (Vietnamese text, duplicate tags differing in case, stale number, a second sequential `null`, absent version), `aStaleNumberBeforeTheFirstPutIs409`, `profileLimitsAre422WithFieldCodes`, `anUnknownStudentOrGuardianIs404`. Race: `students/LearningProfileFirstPutRaceTest` (one 200, one 409, one row). `ForbiddenIdentifiersTest` green. |
| AC4 | `@TutorPrivate` on `LearningProfile`, `LearningProfileDetails`, `CustomField`, `LearningProfileView`, `StudentCommands.LearningProfilePut`, `TutorLearningProfileController.LearningProfileRequest`/`LearningProfileResponse`. `students/StudentsWorldContributor` adds a guardian and a stored profile for A, B and C with `SECRET-*` in guardian name, relationship, email (`secret-g1-<x>@example.test`, marker `SECRET-G1-<X>`), notes and profile level, notes, a strength, a weakness, a custom-field label and value; `{gid}` = A's guardian; B's guardian ID registered with `ownedByB`. `IsolationTest` 20/20. `HarnessDetectionTest.theScanNamesALearningProfileMarker` (fixture `/api/v1/student/harness/leak-profile` returns the student's own stored level → the scan names `SECRET-LEVEL-A`). |
| AC5 | `architecture/StudentIsolationRulesTest` (`bindingNames`, `bindsFields`, `studentIdFields`); fixtures in `fixture/archunit/web/student/StudentWebFixtures`: header, cookie, matrix variable, body record component, nested body field, body field inside a `List`, `@JsonProperty` rename, `@JsonAlias` rename, `@RequestPart` field, `@ModelAttribute` field, unannotated model attribute, array of bodies, `Optional` field, `Map` value; `ruleThreeCatchesEveryWayOfNamingAStudentId` asserts each report line names the method and the field path and the total is 18; the `Clean` class (`CurrentStudent`, clean header/cookie names, a cyclic body type `Node`) reports nothing; `studentRulesHoldForTheApplication` green. Rule 4 unchanged. |
| AC6 | `security/IsolationWorld#ownedByB` registers a UUID canonical and dashless; `HarnessDetectionTest.theScanNamesStudentBsIdentifierWithoutDashes` (fixture `/leak-id-dashless`); `IsolationTest` stays green. |
| AC7 | Migration `V202610090002` (`credential_stamp bigint NOT NULL DEFAULT 0`); `UserAccount#resetPassword` increments it (used only by `AccountService#resetPasswordByTutor` and `#resetTutorPasswordByOperator`; the own change uses `changePassword`); `CurrentUser` gains `credentialStamp` (explicit `serialVersionUID` 1, `toString` without it), filled from the locked login read (`AccountView`) and the remember-me read (`UserAccount#toCurrentUser`); `UserAccountRepository#findStateById` returns status and stamp in one read; `AccountStatusFilter` on a mismatch invalidates the session, clears the context and calls `AccountRememberMeServices#logout` (series deleted, cookie cancelled) → 401 `SESSION_EXPIRED`; `AccountRememberMeServices#onLoginSuccess` re-reads the stamp `FOR SHARE` after the token insert and drops a token that a concurrent reset would otherwise leave behind. `identity/CredentialStampTest`: `aSessionWithAnOlderStampIs401AndEndsWithItsRememberMeTokenWhileALaterSignInKeepsWorking`, `aProtectedRequestWithAnOlderStampIs401SessionExpired`, `aRememberMeSignInWithAnOlderStampIsRefusedAndItsTokenEnds`, `aLoginRacingAResetKeepsNoRememberMeToken` (test-only trigger), `aTutorResetIncrementsTheStampAndASignInWithTheNewPasswordWorks`, `theOperatorResetIncrementsTheTutorsStamp`, `theOwnPasswordChangeKeepsTheStampAndTheCurrentSession`, `noResponseCarriesTheStamp`. `identity/CurrentUserTest` (a principal serialised without the component reads back with stamp 0; `toString`). `AuthApiIntegrationTest` 59/59 unchanged. |
| AC8 | `application.properties`: `logging.level.org.hibernate.orm.jdbc.error=off` (with the reason). `StudentCreateRaceTest` (`@ExtendWith(OutputCaptureExtension)`): `twoConcurrentCreatesOfOneUsernameGiveOne201AndOne409`, `theUniqueIndexCatchesACreateThatPassedTheExistenceCheck` and the new `aSequentialDuplicateCreateOrRenameLogsNoUsername` assert the captured log contains neither form of the username (case-insensitive) and the API answers 409 `USERNAME_TAKEN`. Unexpected SQL errors stay visible: `StudentsApiIntegrationTest.aFailedStudentInsertRollsTheAccountBackAndLeavesNoAuditRow` now asserts the log has "Unhandled exception" and the trigger's message. Mutation check above. |
| AC9 | Class-level `@Audience(TUTOR)` on `TutorGuardianController` and `TutorLearningProfileController`; six `PolicyRegistry` entries (anonymous 401, tutor 200/201/204, student A 403, must-change 403, B-on-A `NA`); `AuthzMatrixTest` 78/78 incl. completeness. GLP `noGuardianOrProfileValueAppearsInTheLog` (guardian and profile values, a NUL refusal and a stale `PUT`: none in the captured log). |
| AC10 | Gate log; `security-groups.log`; `ModularityTests` 2/2; `ForbiddenIdentifiersTest` 17/17; `FlywayMigrationTest` (both migrations, tables, upgrade from M1 = 5 migrations, `guardiansAndTheLearningProfileFollowTheirStudentAndPositionsAreUniqueAtCommit`). Contract regenerated. Docs: api-catalog, data-model §2–§4, validation-rules (incl. the `version` exception, R1), security.md §4, test-strategy §2/§4, module-boundaries "students", traceability (4.2, 5.6, 8, 37), authz-isolation skill, `progress.json`. No existing test weakened: changed assertions are additions (`StudentIsolationRulesTest` size 4 → 18 with the new fixtures; `FlywayMigrationTest` lists the new versions/tables; `HarnessDetectionTest` completeness list gains the two new fixture handlers). |

### Commands
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh && source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dgroups=security)
(cd backend && for i in $(seq 1 20); do ./mvnw -B -ntp -q verify -Dtest='CredentialStampTest,GuardianCapRaceTest,LearningProfileFirstPutRaceTest,StudentCreateRaceTest' -Dsurefire.failIfNoSpecifiedTests=false || { echo "run $i failed"; exit 1; }; done)
./scripts/contract-drift.sh
ENGLMS_TASK=T-M2.9 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.9-students-part-2
```

### Choices within the design-note latitude
- **First `PUT` of the profile:** `INSERT … ON CONFLICT DO NOTHING` inserts an empty row (scalar parameters only), then the values are written through
  the entity, so the profile created by the first `PUT` answers `version` 1 (0 if every value is empty). A stored row always has a number.
- **No-op writes:** a guardian `PATCH` or profile `PUT` that changes nothing keeps `updatedAt` and `version` (as the student `PATCH`, T-M2.3 QA-S3-2).
- **Order of checks:** `version` format (422) → unknown `sid`/`gid` (404) → stale guardian version (409) → field rules (422); for the profile the field
  rules come before the 409.
- **Tags:** an empty or blank tag is `REQUIRED` on `strengths[i]`; the ≤ 30 limit counts tags after the case-insensitive deduplication.
- **Guardian at create:** a `null` array element is validated as an empty guardian (`guardians[i].name` `REQUIRED`).
- **S4-2:** the smallest option, the logger level, documented in `application.properties` and security.md §4. What still logs: every SQL error that is
  not translated reaches `ProblemDetailsAdvice` ("Unhandled exception" with the cause, which can carry the statement's detail); the PostgreSQL server
  log is out of scope (M8).
- **S4-5, remember-me at creation:** the design notes cover a session that carries an old stamp. A login with "stay signed in" that commits just before a
  reset also inserts a remember-me token after the reset deleted every token; that token would authenticate with the account's current stamp. So
  `onLoginSuccess` (the stock code plus the check) re-reads the stamp `FOR SHARE` after the insert and deletes the token on a mismatch (no cookie).
  Within the S4-5 goal ("cannot leave a usable session"); flagged for SEC. The token creation time uses the injected `Clock`.
- **Data-model "§5":** the packet's "data-model §5 (guardians personal data)" is the "Security-sensitive fields" table, §3 in the current data-model.md.

### Known limitations
- **Own-change race (accepted by SEC at G3, S4-4 wording):** a login with the old password racing the user's own password change can keep a session or a remember-me token: the own change
  does not increment the stamp (bumping it would refuse a parallel request of the kept session, FR-AUTH-05). Same window as S4-5; the attacker needs
  the old password; S4-5 is about resets by someone else.
- **Stamp bumped without a reset:** the deterministic tests increment the stamp by SQL. In production only the two resets do, and each deletes every
  remember-me token in the same transaction; a token that predates a bump done by other means (manual SQL) would still sign in with the new stamp.
- **Stored sessions:** a session written before this change reads back with stamp 0 (`CurrentUserTest`); an account reset before the upgrade has stamp 0.
- **S4-2:** turning off `org.hibernate.orm.jdbc.error` also hides Hibernate's own line for every other SQL error; the 500 path still logs each
  unexpected one with its cause.
- **Rule 3:** `@JsonProperty` on a setter/getter (not a field) and catch-all binders are not inspected (packet scope; DEC-096). No `..web.student..`
  handler exists in `src/main` yet.
- No UI (T-M2.5); no audit rows for guardian or profile edits (security.md §8 lists none).

## QA round 1 fixes (`f7e0b37`; QA PASS WITH MINOR at `723b924`)
- **F1 (S3), control characters in tags:** `StudentFields.tags` refuses a tag with any control character (`Character.isISOControl`: tab, LF, CR,
  other C0, DEL, C1 such as U+0085), checked on the raw value before trimming → 422 `INVALID_FORMAT` on `strengths[i]`/`weaknesses[i]`;
  validation-rules says so. Tests: `StudentFieldsTest.tagsRefuseEveryControlCharacter`, `GuardiansAndLearningProfileApiTest.controlCharactersInATagAre422`.
- **F2 (S4), timestamp precision:** every timestamp the students module writes is truncated to microseconds when set (`StudentFields.now(clock)`), so a
  write response equals the following read. Test: `GuardiansAndLearningProfileApiTest.aWriteResponseCarriesTheSameUpdatedAtAsTheNextRead` (fails without
  the truncation). Identity's timestamps are unchanged.
- **F3 (S4), lenient `version` coercion:** not in this task (cross-cutting Jackson setting, pre-existing since T-M2.3); routed by the LC.
- Results at `f7e0b37`: backend verify 465/465, `-Dgroups=security` 158/158, contract-drift OK (no DTO change).

## SEC round 1 fixes (`2ea63f3`; SEC APPROVED at `d6d2ee1` with S3-1, S3-2, S4-1..S4-4)
- **S3-1:** rule 3 inspects the fields of every handler parameter except `CurrentStudent` and those bound by name or from the request context
  (`@PathVariable`, `@RequestParam`, `@RequestHeader`, `@CookieValue`, `@MatrixVariable`, `@RequestAttribute`, `@SessionAttribute`,
  `@AuthenticationPrincipal`), so `@Valid`/`@Validated` model attributes are checked. Fixtures `ValidModelAttributeField`, `ValidatedModelAttributeField`.
- **S3-2:** `isStudentId` also matches the exact name `sid` (case, `_`, `-` ignored). Fixture `PathVariableNamedSid`.
- **S4-3:** (a) field recursion resolves type arguments with Spring's `ResolvableType` (fixture `GenericWrapperBody` → `body.payload.studentId`);
  (b)/(c) JSON names on `@JsonCreator` parameters/getters/setters and `@JsonAnySetter`/`JsonNode`/`Map<String, Object>` bodies are documented known
  limits (test-strategy §4, authz-isolation skill). Rule 3 reports 22 fixture violations (was 18); the clean class none. ADR-0016 §2 updated.
- **S4-2:** `StudentFields.tags` refuses a list longer than 4 × 30 with one `TOO_MANY` before the loop (`StudentFieldsTest.aTagListFarBeyondTheLimitIsOneProblem`).
- **S4-1:** `spring.datasource.hikari.data-source-properties.logServerErrorDetail=false`: the 500 log line no longer carries PostgreSQL's detail
  (`Failing row contains (…)`); `USERNAME_TAKEN` translation unchanged; `aFailedGuardianInsertRollsTheAccountAndStudentBack` asserts the detail is
  absent (fails without the setting). security.md §4.
- **S4-4:** the own-change limitation reads "can keep a session or a remember-me token" (security.md §4, packet, this summary); accepted by SEC.
- Results at `2ea63f3`: backend verify 466/466, `-Dgroups=security` 158/158, ×20 20/20, check-docs and path-ownership PASS, no contract change.

## SEC round 2 and merge
- SEC round 2 APPROVED at `57a87e7` (all round-1 findings verified; rule-3 probe 8/8 caught); S4 R2-1 (the 120-entry tag-list cap missing from
  validation-rules) fixed by the LC at `5de3a62`. CI 7/7 at `5de3a62`; merged via merge-gate as `37e8ce0` (DEC-105). QA report: PR #73.
