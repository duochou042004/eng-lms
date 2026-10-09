# SEC review (G3): T-M2.9 students part 2, PR #72

> Recorded by the LC from the security-reviewer agent's returned text (round 1 at `d6d2ee1`, round 2 at `57a87e7`); the agent's own file was moved off the feature branch.

Reviewer: Security Reviewer (fresh context) · Branch `feature/T-M2.9-students-part-2` at `d6d2ee1` · Diff `origin/develop...HEAD` (65 files) ·
Read: security.md (§4, §11), ADR-0005, ADR-0016, files-and-storage.md, packet `docs/tasks/T-M2.9-students-part-2.md`, `evidence/T-M2.9/summary.md`.

## Runs
- `cd backend && ./mvnw -B -ntp verify -Dgroups=security`: **BUILD SUCCESS, 158/158** (AuthzMatrixTest 78, IsolationTest 20, HarnessDetectionTest 21,
  StudentIsolationRulesTest 3, AudienceVerifierTest 36).
- Targeted: `CredentialStampTest` 8, `CurrentUserTest` 2, `AuthApiIntegrationTest` 59, `GuardiansAndLearningProfileApiTest` 17, `StudentCreateRaceTest` 3,
  `GuardianCapRaceTest` 1, `LearningProfileFirstPutRaceTest` 1: **91/91 green**.
- Rule 3 probe (throwaway fixture in `fixture.archunit.web.student`, deleted afterwards together with its compiled classes; tree clean): three
  handlers that do bind a student ID were **not** reported (`ruleThreeCatchesEveryWayOfNamingAStudentId` stayed at exactly 18): see S3-1, S3-2, S4-3.

## Findings

| ID | Sev | Location | Finding (scenario) | Recommendation |
|---|---|---|---|---|
| S3-1 | S3 | `backend/src/test/java/com/englms/architecture/StudentIsolationRulesTest.java:200-203` (`bindsFields`) | An implicit model attribute is only inspected when the parameter has **no annotation at all**. `@GetMapping("/a") void list(@Valid Filter filter)` with `record Filter(UUID studentId)` is bound by Spring from `?studentId=<B's id>` (an implicit `@ModelAttribute`; `@Valid` is no binding annotation), but rule 3 skips its fields. Proven by the probe: not reported. `@Valid`/`@Validated` on a query object is the usual Spring idiom, so this is the most likely way the AC5 model-attribute extension gets bypassed. | Treat a parameter as field-binding unless it carries a Spring binding or resolver annotation (`@PathVariable`, `@RequestParam`, `@RequestHeader`, `@CookieValue`, `@MatrixVariable`, `@RequestAttribute`, `@SessionAttribute`, `@AuthenticationPrincipal`, …) and is not a simple type; add a `@Valid` model-attribute fixture. Cheap; DEC-088 says fix in this task, or defer with a DEC. |
| S3-2 | S3 | same file `:265` (`isStudentId`) | The house name for a student ID in paths is `sid` (`/tutor/students/{sid}`, PolicyRegistry key `sid`), but the rule only matches names ending in `studentid`. A student handler written in the house style, `@GetMapping("/b/{sid}") get(@PathVariable UUID sid)`, passes rule 3 (proven by the probe). The rule was specified this way before T-M2.9 (test-strategy §4), but this PR is the extension of rule 3 and the gap sits in the convention developers will copy. | Also match the exact name `sid` (normalised); add a fixture; amend test-strategy §4 and ADR-0016 §2. Same handling as S3-1. |
| S4-1 | S4 | `backend/src/main/resources/application.properties:68` and `ProblemDetailsAdvice.java:71` (pre-existing) | The S4-2 change is sound: the silenced logger (`org.hibernate.orm.jdbc.error`, `SQLExceptionLogging` in hibernate-core 7.4.5) only emits Hibernate's duplicate "ErrorCode/SQLState" + message lines. SQL warnings use `org.hibernate.orm.jdbc.warn` and still log. Every untranslated SQL error still reaches the "Unhandled exception" ERROR with its cause, and the 409 translation and the remember-me catch were the only catches. Bind parameters are never logged (placeholders only, checked in the test log). **But** the 500 path still logs the PostgreSQL `Detail:`, because pgjdbc's `logServerErrorDetail` defaults to true. A NOT NULL or CHECK violation logs `Failing row contains (<every column value>)`, and a unique violation logs `Key (…)=(…)`. So a bug that lets a guardian insert hit a constraint would write the guardian's name, phone, email and notes (possibly about a minor's family) to the application log. This is not introduced by this PR (it was already true before, and Hibernate logged it too). | Add `spring.datasource.hikari.data-source-properties.logServerErrorDetail=false`. The constraint name stays in the primary message, so `saveCheckingUsername`'s translation keeps working. Mention it in security.md §4 next to S4-2. Backlog or M8 hardening. |
| S4-2 | S4 | `backend/src/main/java/com/englms/students/internal/app/StudentFields.java:199` (`tags`) | Unlike `labelValues` (early `TOO_MANY` return) and `guardians`, `tags` walks the whole raw list and adds one `FieldProblem` per bad element before it checks the 30 cap. With 200,000 empty strings in `strengths`, one request builds and returns 200,000 problems (a large 422). The endpoint is tutor-only and behind CSRF, so this is robustness rather than an exploitable issue. | Refuse `raw.size()` above a generous bound (e.g. 4 × `TAGS_MAX`) with `TOO_MANY` before the loop, or stop collecting after N problems. |
| S4-3 | S4 | `StudentIsolationRulesTest.java:231` | More name-check blind spots, beyond the documented getter/setter `@JsonProperty` and catch-all binders: (a) **type variables**: `@RequestBody Wrapper<Filter>` with `record Wrapper<T>(T payload)`, where the field type is a `TypeVariable` and recursion stops (proven by the probe); (b) `@JsonCreator` constructor parameters named via `@JsonProperty("studentId")` on a plain class; (c) `@JsonAnySetter` / `JsonNode` / `Map<String,Object>` bodies (catch-alls). | Resolve type variables against the parameterised type (or follow all type arguments that are application types). Add (b) and (c) to the summary's and test-strategy §4's known limits; the scan and SEC review remain the backstop. |
| S4-4 | S4 | `AccountRememberMeServices.java:81-85`, docs security.md §4 | The documented own-change limitation also covers **remember-me**: a "stay signed in" login with the old password racing the user's own change inserts a token after `endOtherSessions` deleted the tokens. The stamp is unchanged, so the post-insert check passes and the token lives for 30 days, not only for the session. Accepted below, but the text says only "keep a session". | Reword the known limitation to "a session or a remember-me token". |

No S1/S2 findings.

## Decisions requested by the packet

**(1) Own-change race (packet N7): ACCEPTED.** The window is narrow. The login's locked read compares `checkedHash` (`AuthenticationService.java:131-144`), so a password check that finishes after the change commits fails. What remains is the time between the login's commit and the session save or token insert. To use it, an attacker needs the **current** password at that moment and must time a login within milliseconds of the user's change. Hammering is capped by the per-IP throttle (30 per 5 min). The artefact is removed by any later own change (`endOtherSessions`), a tutor or operator reset (stamp + `endAllSessions`) or a disable. The alternative (bump the stamp on an own change) would refuse in-flight parallel requests of the kept session (FR-AUTH-05). Condition: reword per S4-4 so the remember-me case is recorded too. The merge DEC records this acceptance.

**(2) Extra remember-me check in `onLoginSuccess`: CORRECT and within the S4-5 goal.** Both resets take `PESSIMISTIC_WRITE` on the account first (`AccountService.java:125`, `:218`), bump the stamp, and delete every token, all in one transaction. `signIn` is not transactional (`AuthSessions.java:52-64`), so the token insert autocommits before the `FOR SHARE` read. Cases:
- The insert is visible before the reset's DELETE: the reset deletes the token.
- Otherwise the reset already holds the row lock, so `FOR SHARE` waits for its commit, reads the new stamp, and deletes the token, and no cookie is set.

The read holds no lock past its own statement, so no deadlock is possible. The `stamp == null` branch is dead code but harmless (accounts are never deleted). Without the check, a reset would leave a usable 30-day credential, which is exactly what S4-5 is meant to close. The stock behaviour (catch on insert failure, cookie only on success) is kept. A related path I checked: a remember-me auto-login racing a reset loads the user after the reset, so `mustChangePassword` is true and the login is refused (`AccountUserDetailsService`, S4-3). Nothing usable is left there either.

## Checklist (security.md §11)
1. **Audience/registry/matrix:** both new controllers have class-level `@Audience(TUTOR)`. There are six `PolicyRegistry` entries (anonymous 401, tutor 2xx, A 403, must-change 403, B-on-A n/a), and AuthzMatrixTest 78/78 includes the completeness check. OK
2. **Student handlers:** no new `..web.student..` handler in `src/main`. Rule 3 is extended: S3-1/S3-2/S4-3 are gaps for future handlers, and nothing is exposed today. OK (with findings)
3. **No private field reachable from student DTOs:** `@TutorPrivate` is on `LearningProfile`, `LearningProfileDetails`, `CustomField`, `LearningProfileView`, `LearningProfilePut`, and the request/response records. Rule 4 is green. The isolation world has `SECRET-*` markers in every guardian text field and every profile field, and `HarnessDetectionTest` proves a profile leak is caught. The dashless-UUID scan is sound: `ownedByB` registers both forms, the scan lowercases, and it covers response headers and the body. Guardians are not `@TutorPrivate`, which matches the packet (tutor-only DTOs); the markers are the backstop. OK
4. **Inputs:**
   - Limits: guardian name 1-120, relationship 0-40, phone/email use the common rules, notes 0-2,000, at most 10 guardians under a `FOR UPDATE` lock on the student.
   - Profile: level 0-40, notes 0-2,000, tags (Tag rule, any control character refused), custom fields at most 30.
   - No rich text or URLs in scope.
   - Native `INSERT … ON CONFLICT` is parameterised (no injection).
   - See S4-2 for the tag-list size. OK
5. **Files:** none referenced. n/a
6. **Logs:**
   - Every new record or entity with personal data overrides `toString` with IDs or version only (`GuardianRequest`, `UpdateGuardianRequest`, `GuardianResponse`, `GuardianInput`, `GuardianView`, `GuardianDetails`, `Guardian`, `LearningProfile*`).
   - `CurrentUser.toString` omits the stamp.
   - The GLP log-capture test and the S4-2 tests pass.
   - Residual 500-path detail: S4-1. OK
7. **Migrations:** new tables only, plus `ADD COLUMN credential_stamp bigint NOT NULL DEFAULT 0`; no constraint is weakened. There are FK cascades to `student`, and the unique `(student_id, position)` is deferrable. Sensitive columns are documented in data-model §3 (guardians, profile, stamp). OK
8. **Isolation tests:** there is no new student-visible resource. The world is extended for A, B and C, and B's guardian ID is registered. OK
- **Credential stamp (S4-5):**
  - The filter reads status and stamp in one primary-key read. A mismatch (`AccountStatusFilter.java:68`) ends only this session and this request's remember-me series. The override in `logout` deletes by series, not every token of the user.
  - A sign-in after the reset survives. Own change does not bump (`AuthenticationService.changePassword`, it uses `changePassword` and not `resetPassword`).
  - `CurrentUser` keeps `serialVersionUID` 1, and an old session reads back with stamp 0 (`CurrentUserTest`).
  - The stamp is in no DTO (`noResponseCarriesTheStamp`). OK
- **Dependencies:** none added. OK

Not checked: CVE scan (no new dependency); PostgreSQL server log (out of scope, M8); no live-app exploratory run beyond the test suites.

Round 1 verdict (at `d6d2ee1`): APPROVED

## Round 2

Verdict: all six round-1 findings are fixed and verified, and the fixes introduced nothing new above S4. One new S4 is a documentation gap.

This round was read-only on the repo. The rule-3 probe file and its compiled classes were removed, the tree is clean (`git status` empty), and I posted no PR comment and wrote no file. My round-1 `evidence/T-M2.9/review/security.md` is no longer in the tree (someone removed it), so the round-1 text needs to be recorded with the merge-record PR.

**Scope:** head `57a87e7` on `feature/T-M2.9-students-part-2`; delta `git diff d6d2ee1..57a87e7`; fixes in `2ea63f3` ("SEC round 1 fixes" in `evidence/T-M2.9/summary.md`).

### Runs
- **`-Dgroups=security` at `57a87e7`:** BUILD SUCCESS, 158/158 (AuthzMatrixTest 78, IsolationTest 20, HarnessDetectionTest 21, StudentIsolationRulesTest 3, AudienceVerifierTest 36). The wider `bindsFields` still passes for the application, so it adds no false positives on `src/main`.
- **Targeted tests:** all green. GuardiansAndLearningProfileApiTest 17, StudentFieldsTest 7, StudentCreateRaceTest 3 (the `USERNAME_TAKEN` translation still works with the detail off), StudentsApiIntegrationTest 27, CredentialStampTest 8. No `Detail:`, `Failing row` or `probe-detail` text appears in the captured run log.
- **Rule-3 probe, re-run:** I added a throwaway fixture with 8 handlers to `fixture.archunit.web.student`, then deleted it and its compiled classes. All 8 were reported: the fixture assertion went from 22 to 30.

| Probe handler | Reported as |
|---|---|
| `@Valid Filter` model attribute | `filter.studentId` |
| `@PathVariable UUID sid` | `sid` |
| `@PathVariable("sid") UUID id` | `sid` |
| `@RequestBody Wrapper<Filter>` | `body.payload.studentId` |
| `@RequestBody Wrapper<List<Wrapper<Filter>>>` | `body.payload[].payload.studentId` |
| `@Valid @RequestBody Sub`, where `Sub extends Base<Filter>` | `body.item.studentId` |
| `@RequestBody record SidBody(UUID sid)` | `body.sid` |
| `@RequestPart("meta") Wrapper<Filter>` | `meta.payload.studentId` |

### Verification of the round-1 findings
| R1 ID | Status | Evidence |
|---|---|---|
| S3-1 | **Fixed** | `bindsFields` now inspects every parameter except `CurrentStudent` and the ones in `NOT_FIELD_BOUND` (`@PathVariable`, `@RequestParam`, `@RequestHeader`, `@CookieValue`, `@MatrixVariable`, `@RequestAttribute`, `@SessionAttribute`, `@AuthenticationPrincipal`). This defaults to inspecting, which is the safe direction: a new kind of parameter gets checked rather than skipped. New fixtures for `@Valid` and `@Validated`; the probe confirms. |
| S3-2 | **Fixed** | `isStudentId` also matches exactly `sid` after removing case, `_` and `-`, for parameter names, binding names and field names. There is a fixture, and ADR-0016 §2, test-strategy §4 and the authz-isolation skill are updated. |
| S4-1 | **Fixed** | `spring.datasource.hikari.data-source-properties.logServerErrorDetail=false`. The test `aFailedGuardianInsertRollsTheAccountAndStudentBack` now asserts a trigger `DETAIL` is missing from the 500 log line (the summary reports it fails without the setting). The translation by constraint name still works: the race test is green, and no code reads the PostgreSQL detail (checked in round 1). The setting applies to the one datasource, which Flyway also uses. Documented in security.md §4. |
| S4-2 | **Fixed** | `StudentFields.tags` returns a single `TOO_MANY` when the raw list has more than 4 × 30 entries, before the loop. The unit test covers 200,000 entries, and 120 duplicates still deduplicate cleanly. |
| S4-3 | **Fixed / documented** | (a) Type arguments are now resolved with `ResolvableType`: generic wrappers, nested generics, generic superclasses and `@RequestPart` wrappers are all caught (probe). Cycles are stopped by remembering each resolved type. (b) and (c) are listed as known limits in test-strategy §4 and the skill, with the scan and SEC review as the backstop. |
| S4-4 | **Fixed** | The known limitation now reads "can keep a session or a remember-me token" in security.md §4, the packet and the summary. Accepted, as stated in round 1. |

### New findings
| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| R2-1 | S4 | `docs/04-backend/validation-rules.md:36` vs `StudentFields.java:203-207` | The new cap is not in the validation rules. The doc says tags are deduplicated first and then limited to 30, but a `strengths` list of 121 entries with only a few distinct tags now gets `TOO_MANY` on `strengths`. The client cannot tell this from the documented contract. No security impact. | Add "a list of more than 120 entries → `TOO_MANY` before deduplication" to the strengths/weaknesses row. Backlog, or fix with the next docs touch. |

These were checked and are not findings:
- **Rule-3 recursion keyed by resolved type:** in theory, a type that keeps growing its own generic argument could recurse without end. That would only crash the test, never let a student ID through, and no such type exists.
- **`logServerErrorDetail=false`:** it removes row values from operator diagnostics as well. This is the intended trade-off under data-model §3, and the constraint name and SQLState stay in the log.

### Checklist (security.md §11), delta only
1. **Audience, registry and matrix:** unchanged; AuthzMatrixTest 78/78. OK
2. **Student handlers:** rule 3 is now stronger (`@Valid` and `@Validated`, `sid`, generic types). No `..web.student..` handler exists in `src/main`. OK
3. **Private fields:** rule 4 and the scan are unchanged and green; IsolationTest 20/20 and HarnessDetectionTest 21/21. OK
4. **Inputs:** the tag list is capped before the loop (R2-1 is docs only). OK
5. **Files:** not applicable.
6. **Logs:** the PostgreSQL detail is gone from the 500 path, and the guardian/profile and username log-capture tests are green. OK
7. **Migrations:** no change in the delta. OK
8. **Isolation tests:** no new student-visible resource. OK

Decisions from round 1 stand: (1) the own-change race is accepted, now worded to include the remember-me token; (2) the `onLoginSuccess` `FOR SHARE` re-check is correct and within the S4-5 goal (that code is unchanged in the delta).

I did not re-run the ×20 race loop or the full gate this round; those are the implementer's claims at `2ea63f3`.

SEC-REVIEW T-M2.9: APPROVED
