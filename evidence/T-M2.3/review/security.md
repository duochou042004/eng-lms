# Security review: T-M2.3 Students core (PR #61)

Reviewer: security-reviewer (G3, fresh context, main checkout per DEC-094, read-only on product code). Recorded by the LC from the reviewer's final report
(the reviewer's own file was lost in a scratchpad clean-up before it could be committed).

Scope (`git diff develop...HEAD`): the `students` module and `V202610070001__students_student.sql`; identity: `AccountApi`/`AccountService` (create,
rename, tutor reset, username lookups, LIKE escaping), `UserAccountRepository`, `AccountStatusFilter` (SEC S4-1, DEC-092), `AuthProblems`,
`SecurityConfiguration`; shared: `shared.Like`, `shared.web` `CurrentStudent`, `CurrentStudentResolver`, `StudentPrincipals`, `PageResponse`,
`ProblemDetailsAdvice`; `audit.internal.StudentEventsListener`; the 8 tutor endpoints and DTOs; `PolicyRegistry`, `StudentsWorldContributor`, harness fixtures.

## Round 1: head `dcb45c8`, 2026-10-07: `SEC-REVIEW T-M2.3: CHANGES REQUESTED`

### Runs
- `(cd backend && ./mvnw -B -ntp verify -Dgroups=security)`: BUILD SUCCESS, 124 tests (`AuthzMatrixTest` 54, `IsolationTest` 14, `HarnessDetectionTest` 18,
  `StudentIsolationRulesTest` 3, `AudienceVerifierTest` 35).
- Targeted classes: 109 tests, BUILD SUCCESS (`StudentsApiIntegrationTest` 24, `AuthApiIntegrationTest` 57, `StudentCreateRaceTest` 2,
  `FlywayMigrationTest` 10, `ModularityTests` 2, `StudentDomainTest` 13, `LikeTest` 1).
- Black-box: the packaged jar on :18080/:18081 against a throwaway `docker.io/library/postgres:18` (rootless podman); random DB and tutor passwords kept in
  the session scratchpad and deleted afterwards; container and JVM stopped.

### Findings
| ID | Sev | Location | Finding | Fix |
|---|---|---|---|---|
| S3-1 | S3 | `students/internal/app/StudentFields.java:37-42` (`text`), `StudentService.java:103` (`q`), `shared/web/ProblemDetailsAdvice.java:56` | Confirms and refines QA-S3-1: a NUL in a contact handle value answers 500 and PostgreSQL's jsonb error (`Where: JSON data, line 1: [{"label":"Zalo","value":"PRIVATE-PHONE-0909\u0000...`) is logged 5 times (WARN by `org.hibernate.orm.jdbc.error`, ERROR by `ProblemDetailsAdvice` "Unhandled exception"): a contact value of a possibly minor student in the log (§11.6). NUL in `note`, `fullName`, `q` also 500 (SQLState 22021), values not echoed. Rolled back; tutor-only trigger | Reject C0 control characters except `\t\n\r` in `StudentFields.text` and in `q` before normalising → 422 `INVALID_FORMAT` naming the field (in-task, DEC-088: every later text field reuses it). Optional backstop: map 22021/22P05 to 422 without logging the message |
| S3-2 | S3 | `shared/web/CurrentStudentResolver.java:48-49`; rule 3 in `StudentIsolationRulesTest` | Spring MVC orders custom argument resolvers after the built-in annotation-based ones: `@ModelAttribute CurrentStudent me` is bound from `?studentId=<B>&userId=<B>`, `@RequestBody CurrentStudent me` from the body, and the handler serves B's data to A (T1). Rule 3 checks names only (`me` passes); the DEC-096 (a) extension in T-M2.9 would catch the `studentId` component but is ordered only before body/header/cookie handlers, not query-bound ones. Latent (no production student handler) but the L3 primitive every student handler reuses (DEC-088) | Refuse a binding annotation on a `CurrentStudent` parameter (startup in `AudienceVerifier` or ArchUnit), or prepend the resolver; a `HarnessDetectionTest` fixture with `@ModelAttribute CurrentStudent` that must fail |
| S4-1 | S4 | `AccountStatusFilter.java:46-49` | Confirms QA-S4-1: remember-me sign-in, `DISABLED` by SQL, cookie not presented, `ACTIVE` again, cookie → 200 without a password | `SessionTerminator.endAllSessions(userId)` on refusal, also in the remember-me path for a non-active account |
| S4-2 | S4 | `AccountService.java:329-340`, Hibernate SQL exception helper | Confirms QA-S4-2: the losing create/rename logs `Key (username_normalized)=(race.user) already exists` (also in the gate log) | Silence the vendor log for this known constraint. Backlog |
| S4-3 | S4 | `TutorStudentController.java:96-105` | `?page=2147483647&size=100` → 500 with an ERROR log ("Page offset exceeds Integer.MAX_VALUE") | Bound `page` so `page*size` fits an int → 422 `page` |
| S4-4 | S4 | `TutorStudentController.java:144`; `StudentService.java:154`, `Student.java:90` | Confirms QA-S4-3 and QA-S3-2: negative version → `REQUIRED`; `apply` always sets `updatedAt`, so every PATCH bumps `version` (contradicts the summary). Optimistic locking stays correct, only stricter: not a security issue | `INVALID_VALUE`; set `updatedAt` only on a change |
| S4-5 | S4 | `AccountStatusFilter` (status only) | Known limitation: in the takeover case a session of a login racing the reset survives it. Bounded: its remember-me token is refused (must-change now true); the student's forced change runs `endOtherSessions`; millisecond window; the attacker cannot trigger the reset | Backlog or DEC; cheapest close: a credential stamp in the principal compared in the filter's existing PK read |
| S4-6 | S4 | `AccountService.java:118-126` | `resetPasswordByTutor` runs bcrypt while holding the `findForUpdateById` lock (against the T-M2.1 S2-1 principle); tutor-only trigger, no attacker-driven oracle | Encode before locking. Backlog |
| S4-7 | S4 | `AccountService.java:104-108` | `changeUsername` doesn't check `role == STUDENT` (unlike the reset); a later `AccountApi` caller could rename the tutor | Add the role filter |
| S4-8 | S4 | contact handles in `TutorStudentDtos`; `StudentFields.email` | Handle values are free text and the email regex accepts `javascript:x@a.b`; safe as stored text | Note for T-M2.5: never render as an `href` without a scheme allow-list |
| S4-9 | S4 | `identity/common-passwords.txt` | Confirmed `password123` passes: the top-10k list is mostly shorter than the 10-character minimum; predates T-M2.3, but tutor-chosen create passwords now use it | Backlog: a list filtered to ≥ 10 characters from a larger breached corpus |

Other known limitations: remember-me of a student account without a student row (unreachable in normal operation): accepted. DEC-099 (create idempotency
deferred, no cleartext replay): agreed.

### Checklist (security.md §11 and the focus list)
- §11.1 `@Audience`/registry/matrix: pass (`@Audience(TUTOR)` on the class, 8 entries, `AuthzMatrixTest` 54/54; live student 403 `FORBIDDEN_ROLE`, anonymous 401).
- §11.2/§11.3 student handlers: pass except S3-2 (no production student handler; resolver reads only the security context and the SPI; harness B-on-A 404;
  `SECRET-*` markers in the world, `IsolationTest` 14/14; tutor-only DTOs; credentials only in create and reset responses).
- §11.4 inputs: pass except NUL (S3-1) and page overflow (S4-3); limits per validation-rules; plain text; sort/status allow-lists; `size` ≤ 100.
- SQL/LIKE injection: pass (bound parameters; `Like.contains` escapes `\`, `%`, `_`; live `%`, `_`, `\`, `' or 1=1--` → 0 rows; `nguyen` finds `Nguyễn`).
- Mass assignment: pass (`status`, `id`, `userId`, `role`, `mustChangePassword`, `version` ignored on create and PATCH).
- §11.5 files: none. §11.6 logs/secrets: pass except S3-1, S4-2 (redacted `toString`s; audit details IDs and status names only; `no-store`).
- §11.7 migration: new table, named constraints, FK `ON DELETE RESTRICT`, unique `user_id`; `search_text` copies personal data and belongs in data-model §3.
- Session revocation: pass (live archive: `persistent_logins` and `spring_session` to 0; session, cookie, new login → 401; reset of an archived student 409;
  old cookie dead after reactivation).
- `AccountStatusFilter` coverage: all of `/api/**` incl. `GET /auth/session` (401 `SESSION_EXPIRED` live), after remember-me, before authorization; gaps S4-1, S4-5.
- CSRF, L1, must-change gate: pass (tutor POST without token 403, `text/plain` 415; must-change tutor 403 on create).
- Enumeration/takeover: pass (availability/suggestion tutor-only; reset tutor-only and STUDENT-only; `SecureRandom` ≥ 14 characters, 7-day expiry, forced change).
- Races: pass (username index + flush, ×20 green; `@Version` on status and PATCH; the archive race closed by the filter). Dependencies: none added.

Required before merge (DEC-088): S3-1 and S3-2 in this task; S4-1 recommended in the same round; other S4s backlog or a DEC.

SEC-REVIEW T-M2.3: CHANGES REQUESTED

LC note: fixed in-task at `a2bb217`/`57de84f` (S3-1, S3-2, S4-1, S4-3, S4-4, S4-6, S4-7); S4-2, S4-5 → T-M2.9; S4-8 → T-M2.5; S4-9 = pending PO note (DEC-100).

## Round 2: head `adb28d5` (delta `dcb45c8..adb28d5`), 2026-10-07: `SEC-REVIEW T-M2.3: APPROVED`

### Runs
- `-Dgroups=security`: BUILD SUCCESS, 126 tests (`AudienceVerifierTest` 36, `HarnessDetectionTest` 19, `AuthzMatrixTest` 54, `IsolationTest` 14,
  `StudentIsolationRulesTest` 3). Targeted: 106 tests, BUILD SUCCESS (`StudentsApiIntegrationTest` 27, `AuthApiIntegrationTest` 59, `AccountServiceTest` 2,
  `ProblemDetailsAdviceTest` 3, `StudentCreateRaceTest` 2, `StudentDomainTest` 13). Black-box: the `adb28d5` jar against a throwaway postgres:18; stopped.

### Per-finding status
| ID | Status | Verification |
|---|---|---|
| S3-1 | Closed | NUL/ESC in every free-text field, email and `q` → 422 `INVALID_FORMAT` naming the field; no value or "Unhandled exception" in the log; tab/LF/CR accepted; U+0085 and DEL accepted (harmless) |
| S3-2 | Closed | `AudienceVerifier.currentStudentBindings` refuses all 10 binding annotations (tested) |
| S4-1 | Closed | Session path by test; remember-me path live: tokens/sessions 1/2 → 0/0 after one refused presentation; after re-enabling both 401 |
| S4-3 | Closed | Live 422 `page`; `page > MAX_VALUE / size` correct (size ≥ 1) |
| S4-4 | Closed | Negative version → `INVALID_VALUE` (PATCH, `/status`); `Student#apply` early return correct |
| S4-6 | Closed | Encode before `findForUpdateById` (`InOrder`); a pool connection is still held during bcrypt by the outer transaction: acceptable (tutor-only; the finding was the lock) |
| S4-7 | Closed | STUDENT filter added and tested |
| S4-2, S4-5 | Routed to T-M2.9 (DEC-100): agreed | Prefer S4-5 before the first production student handler |
| S4-8 | Routed to T-M2.5: agreed | |
| S4-9 | Pending PO note: agreed | Predates the task (T-M2.1 QA F4) |
| DEC-099 | Confirmed | |

Meta-annotations: the verifier's meta-annotation branch is correct but untestable in practice (nine of the ten annotations are `@Target(PARAMETER)`,
`@ModelAttribute` `PARAMETER, METHOD`; Spring's resolvers see direct annotations only); the direct check is tested, and a bare `CurrentStudent` is resolved
by `CurrentStudentResolver` before the catch-all model-attribute resolver (`requestParametersNamingStudentBDoNotChangeCurrentStudent`).

Regression checks: the filter ending all sessions runs only for the caller's own non-active account (no cross-user trigger); the remember-me deletion
needs a valid series/token pair and a non-active account (cannot sign another user out; must-change keeps tokens); the SQLState backstop covers only
22021/22P05 (other data errors stay 500, tested; WARN names the SQLState); `Student#apply` early return keeps the constructor path, compares records by
value on trimmed input; `searchText` and `status` cannot go stale.

### New finding
| ID | Sev | Location | Finding | Fix |
|---|---|---|---|---|
| R2-1 | S4 | `identity/internal/app/AuthenticationService.java:111-119` via the `ProblemDetailsAdvice` backstop | Anonymous `POST /auth/login` with a NUL in the username → 422 `VALIDATION_FAILED` in 0.01 s (unknown username: 401 in 0.32 s); no `LOGIN_FAILED` row; throttle still counts (429 after 30). Was 500 before this round. Not an oracle (any NUL username, existing or not), but breaks security.md §3: rejected login input gets the generic 401, a dummy bcrypt and a `REJECTED_INPUT` audit row | Send control-character usernames down the `REJECTED_INPUT` branch |

SEC-REVIEW T-M2.3: APPROVED
