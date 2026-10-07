# QA Report: T-M2.3 Students core

Recorded by the LC from the qa-evaluator's final reports (the harness denied the agent this file). The round-1 logs and the plan file (`qa/plans/T-M2.3.md`)
were lost in a scratchpad clean-up before they could be committed; the re-test R1 logs (`r1-security-groups.log`, `r1-race-x20.log`) supersede them.

Verdict: PASS (re-test R1 at `adb28d5`; round 1 PASS WITH MINOR) · Build: `dcb45c8` (`feature/T-M2.3-students-core`, PR #61) · Date: 2026-10-07, 03:45 to about 04:10 UTC · Evaluator: independent QA subagent, fresh context (main checkout, DEC-094)

## Environment
- Linux, rootless Podman, JDK 25. The Spring Boot 4.1 jar was built at head (`./mvnw package -DskipTests`) and copied to the session scratchpad.
- Black-box: the packaged jar against a throwaway `docker.io/library/postgres:18` on 127.0.0.1:55432 (the dev DB and dev stack were not touched). The tutor
  was bootstrapped from a password file the evaluator generated (not the `.env` value), then went through the forced change. The app ran with
  `--englms.security.login-throttle.max-attempts=10000` (as in T-M2.2 QA). curl with one cookie jar per actor and the `X-XSRF-TOKEN` header.
- Test runs: `(cd backend && ./mvnw -B -ntp verify -Dgroups=security)` (124 tests, BUILD SUCCESS); `StudentCreateRaceTest` ×20 (20/20).
- Plan written before any implementation or test code was read. Independence: the provisional verdict was drafted after the black-box session; only then
  were `StudentService#update`, `Student#apply` and one test read, to pin down the cause of QA-S3-2.
- Cleanup: app stopped, container removed, ports 8080, 8081 and 55432 free. No `.env` values or generated passwords in this report.

## AC results
| AC | Scenario(s) | Result | Evidence |
|---|---|---|---|
| AC1 | Create without `password`: 201, `Location` resolves to 200, `{student, credentials}`; generated passwords 19–23 characters, readable word form; `expiresAt` = now + 7 d; DB `STUDENT`/`ACTIVE`/`must_change_password=t` with expiry. Sign-in returns `mustChangePassword:true`; `/student/**` → 403 `PASSWORD_CHANGE_REQUIRED`; after the change the account works and the temporary password fails (401). Supplied passwords: `short` → 422 `PASSWORD_TOO_SHORT` + `PASSWORD_TOO_COMMON`; = username → `PASSWORD_EQUALS_USERNAME`; 129 chars → `PASSWORD_TOO_LONG`; `"   "` → `PASSWORD_TOO_SHORT`; nothing created on a 422. Credentials in no `GET`, list or later response. No orphan account after any failed create (DB). | PASS | transcripts, DB |
| AC2 | `NguyenVanAn`, ` nguyenvanan `, `NGUYENVANAN`, the tutor's username → 409 `USERNAME_TAKEN` (`errors[0].field=username`) on create and PATCH. `ngùyen`, `nguyễnvanan`, `ab`, 41 chars, `a b c`, `x@y` → 422 `USERNAME_INVALID`; empty → `REQUIRED`; 40 chars and `Ok.Name_-1` accepted. Suggestion `Trần Bình` → `tranbinh`, `tranbinh2`, `tranbinh3`; `Nguyễn Văn An` → `nguyenvanan2` (base taken); `Đặng Thị Đào` → `dangthidao`; `Lê`, `A`, empty, emoji → `student`; long names cut at 36; NFD input works. Availability `available`/`INVALID`/`TAKEN` with case/space normalisation. 8 parallel creates of one username: one 201, seven 409, one account and one student row. | PASS | transcripts |
| AC3 | Default list `ACTIVE`+`PAUSED`; `status=ARCHIVED`/`PAUSED` filter. `dang`, `ĐẶNG`, `dao` → `Đặng Thị Đào`; `nguyen`, `Nguyễn`, `NGUYEN VAN` → `Nguyễn Văn An`; username, email, phone (`654 321`, `0987`) and handle values match; handle labels do not (as specified); NFC query matches an NFD-stored name; `%`, `_`, `\` literal; `an%` nothing. Paging/totals correct; `fullName`/`createdAt` asc/desc; stable ties. `size=0`/`101`, `page=-1` → 422 naming the field; unknown/extra/repeated `sort` → 422 `sort`; unknown or lowercase `status` → 422 `status`; non-integer `page`/`size` → 400. The search follows edits. | PASS (NUL in `q`: QA-S3-1) | transcripts |
| AC4 | GET full DTO with `version`. PATCH partial; `null` clears; `fullName`/`username` `null` → 422 `REQUIRED`; stale → 409 `STALE_VERSION`; missing/negative version → 422. `INVALID_FORMAT`, `TOO_LONG` (code points), `TOO_MANY` (31 handles), indexed fields; `status`, `id`, `userId` ignored. Username change: two live student sessions (one remember-me) stay valid and show the new name; old username fails, new works; `USERNAME_CHANGED` audited (tutor actor). Unknown `sid` → 404 on all five `{sid}` routes; user IDs as `sid` → 404; malformed → 400. | PASS WITH MINOR (QA-S3-2, QA-S4-3) | transcripts |
| AC5 | ACTIVE → PAUSED: both sessions 200, sign-in works. → ARCHIVED: session 1, session 2 (remember-me), a remember-me-only cookie and a pre-rotation copy all 401 `SESSION_EXPIRED` at once; sign-in → generic 401 `UNAUTHENTICATED`; account `DISABLED`. ARCHIVED→ARCHIVED, ARCHIVED→PAUSED, PAUSED→PAUSED → 409 `INVALID_STATE_TRANSITION`; unknown status → 422; stale/missing version → 409/422. Reactivation: sign-in works, `mustChangePassword` unchanged, old cookies dead. `STUDENT_STATUS_CHANGED {from,to}` each change. | PASS | transcripts, `app.audit_event` |
| AC6 | Student locked by 12 bad logins, two sessions (one remember-me). Reset: 200 `{username, temporaryPassword, expiresAt=now+7d}`, `no-store`; both sessions → 401 `SESSION_EXPIRED`; old password fails; lockout cleared; new password signs in with `mustChangePassword:true`, gated; `PASSWORD_RESET_BY_TUTOR` names the tutor. Expiry moved into the past by SQL → 401; ahead → 200. PAUSED can be reset; ARCHIVED → 409. | PASS | transcripts |
| AC7 | Matrix below matches the registry. Missing/wrong `X-XSRF-TOKEN` → 403 `CSRF_INVALID` on all four unsafe operations. The 6 known passwords appear 0 times in the app log, audit rows (details, user agent) and `event_publication`; no `$2a$`, `$2b$`, `$2y$`, `{bcrypt}` anywhere. `AuthzMatrixTest` 54/54, `IsolationTest` 14/14. | PASS | matrix, logs |
| AC8 | No production `..web.student..` handler (out of scope); `/api/v1/student/me` → 404 as a student, 403 as the tutor. `HarnessDetectionTest` 18/18 incl. B-on-A 404 and the no-student-row 401. | PASS (by test run) | test run |
| AC9 | Account `DISABLED` by SQL without ending sessions: session cookie, session + remember-me, remember-me-only → 401 `SESSION_EXPIRED`. After re-enabling, a replayed copy of the refused session cookie → 401 (invalidated); a fresh sign-in works. | PASS (QA-S4-1) | transcripts |
| AC10 | Security group BUILD SUCCESS, 124 tests (`StudentIsolationRulesTest` 3, `AuthzMatrixTest` 54, `HarnessDetectionTest` 18, `IsolationTest` 14, `AudienceVerifierTest` 35); race ×20 20/20; the implementer's gate log PASS (13 steps); OpenAPI lists exactly the 8 new operations. | PASS | logs |

### AC7 black-box matrix
Unsafe calls used `{"fullName":"Matrix","username":"nguyenvanan","version":999,"status":"ACTIVE"}`, so the tutor gets 409s there; `{sid}` is a third student.

| Operation | anonymous | tutor | student A | must-change |
|---|---|---|---|---|
| `GET /tutor/students` | 401 `UNAUTHENTICATED` | 200 | 403 `FORBIDDEN_ROLE` | 403 `FORBIDDEN_ROLE` |
| `POST /tutor/students` | 401 | 409 `USERNAME_TAKEN` | 403 | 403 |
| `GET /tutor/students/{sid}` | 401 | 200 | 403 | 403 |
| `PATCH /tutor/students/{sid}` | 401 | 409 `STALE_VERSION` | 403 | 403 |
| `POST …/{sid}/status` | 401 | 409 `STALE_VERSION` | 403 | 403 |
| `POST …/{sid}/password-reset` | 401 | 200 | 403 | 403 |
| `GET /tutor/usernames/suggestion` | 401 | 200 | 403 | 403 |
| `GET /tutor/usernames/availability` | 401 | 200 | 403 | 403 |

B-on-A N/A (tutor endpoints). Tutor `HEAD`/`OPTIONS` on the list → 200; `PUT`/`DELETE` on `{sid}` → 405.

## Exploratory charter & notes (about 30 min)
- Temporary password after create: not reachable via `GET`, list, availability, suggestion, `Location`, error bodies, a second create (409, no
  credentials), logs, audit rows or `event_publication` (IDs only).
- Session across archive: every cookie variant refused at once, none works after reactivation, except the SQL-only race state (QA-S4-1).
- Mass assignment: `status`, `role`, `mustChangePassword`, `version`, `id` in the create body are ignored.
- Input abuse: NUL → 500 (QA-S3-1); `\u0007` in a name accepted in round 1 (refused since R1); HTML stored literally; `q` of 5,000 characters → 200;
  malformed JSON, wrong types, array body → 400.
- PATCH `"email":""` clears the email; validation-rules "empty after trim = absent" + PATCH "absent = unchanged" would say unchanged. Clearing is the
  friendlier reading; worth one line in api-catalog for T-M2.5. Not a finding.
- `password123` passes the common-password check (the existing T-M2.1 list, not a T-M2.3 change); flagged for SEC; not a finding here.
- Scope: OpenAPI exactly the 8 packet operations; `app.student` has no guardian, learning-profile, goal or `started_on` columns; no `/student/**` handler,
  no UI. No SCOPE finding.
- Not applicable (no UI): viewports, keyboard, screen reader, vi/en, states, axe.

## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| QA-S3-1 | S3 | A NUL character in a free-text field or in `q` returns 500 `INTERNAL_ERROR` | Tutor `POST /tutor/students {"fullName":"Bad\u0000Name","username":"ctrlname"}`; also `note`, `contactHandles[].label`, PATCH `fullName`/`note`, `GET /tutor/students?q=a%00b` | 422 `VALIDATION_FAILED` with a field code (400/422 for `q`) | 500; log `DataIntegrityViolationException … invalid byte sequence for encoding "UTF8": 0x00`; rolled back, no orphan account. `email`/`phone` already 422 (format) | transcripts, app log |
| QA-S3-2 | S3 | Every PATCH moves `version`, including a username-only or no-op PATCH; api-catalog says a username change alone leaves `version` | Read v=n; `PATCH {"version":n,"username":"new.name"}` → v=n+1; `PATCH {"version":n}` → n+1 with a new `updatedAt` | `version`, `updatedAt` unchanged when the student row is unchanged | Cause: `Student#apply` always assigns `updatedAt = now` (and the handles list), so the row is always dirty. The test asserting v=0 passes only because `MutableClockConfiguration` freezes the clock. A UI following the doc would get a spurious 409 after a rename | transcripts |
| QA-S4-1 | S4 | The S4-1 filter invalidates the session but leaves the remember-me tokens; a token left over from the race works again after reactivation | Sign in with `rememberMe`; `DISABLED` by SQL; next request 401; `ACTIVE` again; replay the saved cookies | 401 (token gone) | 200: signed in again. Only reachable via the login/archive race + reactivation | transcripts |
| QA-S4-2 | S4 | A create losing the username race logs two lines (Hibernate, incl. the username) for the expected 409 | 8 parallel `POST /tutor/students` with one username | 409 with at most DEBUG/INFO | 7 × `duplicate key … ux_user_account__username_normalized` + `Detail: Key (username_normalized)=(racer)` (level corrected to WARN in R1) | app log |
| QA-S4-3 | S4 | A negative `version` gets the field code `REQUIRED` | `PATCH {"version":-1,"note":"x"}` | `INVALID_VALUE` (integer ≥ 0) | 422 `version` `REQUIRED` | transcript |

No S1, S2 or SCOPE findings. Round-1 verdict: PASS WITH MINOR.

## Isolation / privacy checks
- Student A and the must-change student: 403 on all 8 tutor operations; bodies carry no `SECRET-*`, no `temporaryPassword`, no student data. Anonymous 401.
- B-on-A: no student-owned endpoint in this task; `HarnessDetectionTest` (B on A's resource → 404 through `CurrentStudent`) and `IsolationTest` green.
- Temporary passwords only in the create and reset responses (`no-store`); never in logs, audit rows or the event store; no hash anywhere.

## Re-test log
- R0 (before the verdict): `StudentCreateRaceTest` ×20, 20/20 BUILD SUCCESS (2 tests per run, 0 failures).

## Re-test R1 (`adb28d5`, 2026-10-07 ~08:03–08:25 UTC, same evaluator)
Black-box as in round 1 (jar packaged at head, throwaway postgres:18, fresh QA-generated tutor secret, curl with per-actor cookie jars and CSRF).

| ID | Status | Re-test evidence |
|---|---|---|
| QA-S3-1 | Closed | `\u0000`/`\u0007`/`\u001b` in `fullName`, `note`, `email`, `phone`, `contactHandles[i].label`/`.value` → 422 `INVALID_FORMAT` naming the (indexed) field; in `username` → `USERNAME_INVALID`; PATCH the same, student unchanged; `q` `%00`/`%07`/`%1B` → 422 `q`; tab/LF/CR accepted; no orphan accounts; 0 new ERROR/WARN lines, no value text in the log |
| QA-S3-2 | Closed | Real clock, ≥ 1.2 s apart: rename-only, `{"version":0}` and same-values PATCH keep `version` 0 and `updatedAt`; a real change → 1 and a new `updatedAt`, the old version → 409 |
| QA-S4-1 | Closed | Two remember-me devices + a plain session, `DISABLED` by SQL: one refused request ends all tokens and sessions; after re-enabling every saved cookie → 401 `SESSION_EXPIRED`; fresh sign-in 200 (both the filter and the remember-me path) |
| QA-S4-3 | Closed | `version:-1` → 422 `INVALID_VALUE` on PATCH and `/status`; missing stays `REQUIRED` |
| QA-S4-2 | Unchanged, deferred (T-M2.9, DEC-100) | Losing creates still log the username via `org.hibernate.orm.jdbc.error`; the level is **WARN** (the "ERROR:" is PostgreSQL's message text) |
| SEC-S4-3 | Verified | `page=2147483647&size=100`, `page=85899346` → 422 `page`; edges 85899345 → 200, 21474837&size=100 → 422; `2147483648` → 400 |
| SEC-S3-2 | Verified by test run | `AudienceVerifierTest` 36/36 (`refusesEveryBindingAnnotationOnACurrentStudentParameter`), `HarnessDetectionTest` 19/19 (`requestParametersNamingStudentBDoNotChangeCurrentStudent`) |

Regression AC1–AC9: PASS (create/forced change, duplicates/accents/suggestion/race 1×201 + 5×409, Vietnamese search and LIKE literals, PAUSED/ARCHIVED/
reactivation, reset while signed in, 8 × 4 matrix identical, no secrets in log/audit/event store, `/student/me` 404/403). `-Dgroups=security` 126 tests
BUILD SUCCESS (`r1-security-groups.log`); `StudentCreateRaceTest` ×20 20/20 (`r1-race-x20.log`). New findings: none. Notes: DEL (`\u007f`) accepted
(validation-rules forbids C0 only); a must-change account signing in with `rememberMe` gets no token (T-M2.1 behaviour).

QA T-M2.3: PASS
