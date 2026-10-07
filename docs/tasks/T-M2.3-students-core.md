# T-M2.3: Students core (create-with-account, usernames, list and search, profile, status, password reset)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 review pending; PO start signal pending) |
| Owner role | BE (backend-implementer; SEC review at G3) |
| Branch | `feature/T-M2.3-students-core` (from `develop`) |
| Depends on | T-M2.2 (merged, `04d90e4`, DEC-096) |
| Estimate | 2 agent-days |
| Trace | SPEC §4.2, §4.3, §37, §41, §46, §49; FR-STU-01 (except the first goal), FR-STU-02 (search, filter, sort; not the row signals), FR-STU-03 (profile and contacts; not guardians), FR-STU-05, FR-AUTH-07; NFR-SEC-01..04, NFR-SEC-11; A-018, A-021; ADR-0011, ADR-0016 §2–3; api-catalog "tutor: students"; data-model §2 "students"; domain-model §4.1; validation-rules "identity / students"; module-boundaries "students"; security.md §4 (L3), §8; DEC-092 (SEC S4-1), DEC-096 |

## Goal
The tutor can create a student together with their account in one call and gets the temporary credentials once, find students by an accent-insensitive
search, edit a student's profile and contacts, pause, archive and reactivate a student (archive ends the student's sessions and blocks sign-in), and
reset a student's password. This creates the `students` module and the first `/api/v1/tutor/**` handlers, each registered in the authz matrix, and the
`CurrentStudent` argument resolver that every later `/api/v1/student/**` handler uses (ADR-0016 §2). A session of a login that races a disable can no
longer be used (T-M2.1 SEC S4-1).

## Scope
- In:
  1. **Module `students`** (`com.englms.students`, `allowedDependencies = {"shared", "identity"}`): table `student` (data-model §2), a public
     `StudentDirectory` API (`require(studentId)`, `studentIdForUser(userId)`) and events `StudentCreated`, `StudentStatusChanged`, `StudentUsernameChanged`
     in `students.events`.
  2. **Identity additions** (`AccountApi`): create a `STUDENT` account (inside the caller's transaction), rename it, reset its password by the tutor,
     username availability and a batch lookup of usernames by user ID. `PasswordReset` with `Actor.TUTOR` is published for the reset.
  3. **Endpoints** (api-catalog "tutor: students"; all `@Audience(TUTOR)`):
     `POST /tutor/students`, `GET /tutor/students`, `GET /tutor/students/{sid}`, `PATCH /tutor/students/{sid}`, `POST /tutor/students/{sid}/status`,
     `POST /tutor/students/{sid}/password-reset`, `GET /tutor/usernames/suggestion`, `GET /tutor/usernames/availability`.
  4. **`CurrentStudent`** (`shared.web`, record with `studentId` and `userId`), its Spring MVC argument resolver and the `StudentPrincipals` SPI that
     `students` implements, for `..web.student..` handlers (AC8).
  5. **SEC S4-1** (DEC-092): a session that exists for a non-`ACTIVE` account is refused (AC9).
  6. Audit: the audit module records the new students events and the tutor reset (security.md §8).
  7. Registry entries, an isolation-world contributor with `SECRET-*` markers, OpenAPI contract update, docs (AC10).
- Out of scope (explicit):
  - **Guardians, the learning profile** (FR-STU-03 guardians, FR-STU-04): tables `student_guardian`, `student_learning_profile`, their endpoints and
    `@TutorPrivate` mapping → **T-M2.9**. Also T-M2.9: the DEC-096 ArchUnit/scan extensions (see "Decisions" below).
  - The **first goal** at creation (FR-STU-01 optional, FR-GOAL-02 "M2: first goal in create-student"): it needs the `goals` module's tables → T-M2.9
    decides whether to create a minimal `learning_goal` early or to move it to M7 (an LC decision with a DEC, after this packet).
  - List **row signals** (next lesson, open work count, attention badge) and the sorts "next lesson" / "recently active": their data arrives with lessons (M3)
    and activities (M5); backlog T-M3.1 (next lesson + its sort), T-M5.1 (open work count, "recently active") and T-M7.7 (attention badge) own them
    (DEC-097 (5)). Until then the default sort is the name (api-conventions §4 allow-list).
  - `GET /tutor/students/{sid}/overview` (FR-STU-06, "M2+"), any `/api/v1/student/**` production handler (first in T-M2.6/T-M2.7 or M3), production
    owner-scoped repositories (no student-owned resource exists yet; the first arrives in M3 and follows the convention of AC8).
  - Permanent delete and export (FR-STU-08, OQ-07). Any UI (T-M2.5). A login racing a **password reset** (same window as S4-1; note it in the summary).

## Guardrail answers (scope.md §6)
1. **Trace:** FR-STU-01/02/03/05, FR-AUTH-07, ADR-0016, DEC-092, DEC-096 (above); nothing else.
2. **Drift toward excluded scope?** No. One tutor manages their own students; no self-registration, no school roles, no messaging (contacts are stored values).
3. **Mandatory setup added?** None. Only full name and username are required; the password is generated when not given.
4. **Weekly use?** Yes: adding and finding students, pausing and archiving, resetting forgotten passwords (FR-AUTH-08 sends the student to the tutor).
5. **Hard-coded semantics?** None. No level, exam or curriculum field; contact handle labels are free text (Zalo, Facebook are examples, not an enum).

## Design notes
- **Packages** (backend-module skill): `students` (API, `CurrentStudent`), `students.events` (`@NamedInterface("events")`), `students.internal.domain`
  (`Student`, `StudentStatus`, transitions), `students.internal.persistence`, `students.internal.app`, `students.internal.web.tutor` (controllers and tutor
  DTOs). The audit module gains `allowedDependencies` `students :: events`.
  **`CurrentStudent` stays in `shared`** (module-boundaries "shared"; DOCS-REVIEW D1): `shared.web.CurrentStudent` (record `studentId`, `userId`), its
  argument resolver in `shared.web`, and a one-method SPI in `shared` (`StudentPrincipals.studentIdForUser(UUID userId) → Optional<UUID>`) that
  `students` implements, the same pattern as `FileAccessResolver`. `shared` reads no table and holds no business rule, and modules at the bottom of the
  graph (`files`, `settings`) can declare `CurrentStudent` handlers without depending on `students`.
- **Migration** (db-migration skill): `V202610070001__students_student.sql` creates `app.student` as in data-model §2 (`user_id` unique FK
  `ON DELETE RESTRICT`, `status` check, `version bigint` for optimistic locking, standard columns). `started_on` is **not** created (no FR or AC uses it;
  data-model §2 marks it deferred). **Search:** an application-normalised `search_text` column (`Usernames.normalize` over the full name, email, phone and
  handle values, joined with spaces, recomputed on every write; like `user_account.username_normalized`) with a pg_trgm GIN index; data-model §2's
  `full_name_search GENERATED` column is replaced by it (as built). `q` is normalised the same way and `%`, `_` and `\` in it are escaped before the
  `LIKE` (also in identity's username lookup).
- **Create** (FR-STU-01): request `{fullName, username, password?, email?, phone?, contactHandles?: [{label, value}], note?}`. One transaction: identity
  creates the account (`STUDENT`, `ACTIVE`, `mustChangePassword=true`, `tempPasswordExpiresAt = now + 7 days` as for a reset; this extends A-021 to the
  create-time password, security.md T12 "temporary passwords expire"; DEC-097, PO confirmation requested with the start signal) and students inserts
  the row. When `password` is absent the server generates one with `TemporaryPasswordGenerator` (≥ 12 characters per FR-STU-01; the generator yields
  ≥ 14); when present it must pass the password policy. Response `201` + `Location`: the student DTO plus `credentials {username, temporaryPassword, expiresAt}`, **only in this response**
  (`Cache-Control: no-store` already applies). The login URL and the "Copy message" text are composed by the UI (T-M2.5) from `/meta`.
  **LC interpretation, PO confirmation requested with the start signal (DEC-097 (2), DOCS-REVIEW D8):** FR-STU-01's "generated and can be regenerated"
  and ux-flows F2 step 2 "password auto-generated" are met by server-side generation on Create (shown on the credentials card) and by the reset endpoint
  afterwards; no separate password-suggestion endpoint is added (not in api-catalog). If the PO wants the password visible in the form before Create,
  the packet gains `GET /tutor/passwords/suggestion` (tutor-only, no-store) before it is set to `ready`.
- **Usernames:** suggestion = `Usernames.normalize(fullName)` with every character outside `[a-z0-9]` removed, truncated to 36 characters; if shorter than
  3 characters, `student`; then the first free of `base`, `base2`, `base3`, … (`"Nguyễn Văn An"` → `nguyenvanan`, ux-flows F2). Availability:
  `{username, available, reason?}` with `reason ∈ {INVALID, TAKEN}`; both are tutor-only and read-only. Uniqueness is the identity index on
  `username_normalized`; a violation at insert/rename maps to 409 `USERNAME_TAKEN` with `errors[0].field = "username"` (api-conventions §5).
- **List** (FR-STU-02): `GET /tutor/students?q=&status=&page=&size=&sort=` (api-conventions §4). Default statuses `ACTIVE`,`PAUSED`; `status` (repeatable)
  selects any of `ACTIVE`, `PAUSED`, `ARCHIVED`. `q` is accent- and case-insensitive (`nguyen` matches `Nguyễn`) and matches the full name, the username,
  the email, the phone and handle values (substring). The username lives in identity and queries do not join across modules (data-model §1): ask
  `AccountApi` for the user IDs whose normalised username contains `q`, and for the usernames of the page (one batch call). Sort allow-list:
  `fullName` (default, asc), `createdAt`. `status` and `sort` are bound as strings and checked by the handler: an unknown value → 422
  `VALIDATION_FAILED` with `errors[].field` = `status` or `sort` (added to api-conventions §4). Row DTO: `id`, `fullName`, `username`, `status`, `email`, `phone`, `createdAt`.
- **Profile** (FR-STU-03): `GET` returns the full tutor DTO with `version`; `PATCH` takes `version` plus any of `fullName`, `username`, `email`, `phone`,
  `contactHandles`, `note`; a stale `version` → 409 `STALE_VERSION`; a username change goes through `AccountApi` in the same transaction, keeps the
  student's sessions (the principal is the user ID) and publishes `StudentUsernameChanged` (audit `USERNAME_CHANGED`).
- **Status** (FR-STU-05, domain-model §4.1): `POST …/status {status, version}`. `ACTIVE ⇄ PAUSED`; `ACTIVE|PAUSED → ARCHIVED` calls `AccountApi.disable`
  (ends all sessions and remember-me tokens); `ARCHIVED → ACTIVE` calls `AccountApi.enable`; `mustChangePassword` is unchanged; same status or
  `ARCHIVED → PAUSED` → 409 `INVALID_STATE_TRANSITION`. Each change publishes `StudentStatusChanged {from, to}` (audit `STUDENT_STATUS_CHANGED`).
  `PAUSED` keeps sign-in (attention rules arrive later).
- **Password reset** (FR-AUTH-07): `POST …/password-reset` → `200 {username, temporaryPassword, expiresAt}`, shown once; `mustChangePassword=true`,
  7-day expiry, lockout cleared, all sessions and tokens ended, `PasswordReset(TUTOR, tutorUserId)` (audit `PASSWORD_RESET_BY_TUTOR`). An `ARCHIVED`
  student → 409 `INVALID_STATE_TRANSITION` (reactivate first).
- **Errors:** an unknown `{sid}` → 404 `NOT_FOUND`; validation per validation-rules (fullName 1–120; username rules; email; phone; handles label 1–60,
  value 0–500, ≤ 30; note ≤ 2,000) → 422 with field codes. Statuses follow api-conventions §5.
- **`CurrentStudent` (ADR-0016 §2):** a `HandlerMethodArgumentResolver` for `CurrentStudent` parameters, resolving the session's `CurrentUser` (role
  `STUDENT`) through the `StudentPrincipals` SPI; a student principal without a student row → the session is invalidated and 401 `SESSION_EXPIRED`
  (like AC9; api-conventions §5 amended); no principal or a non-student principal never reaches a student handler (L1) and is an `IllegalStateException`
  in the resolver. It never reads a request parameter. The convention for owner-scoped reads (`findByIdAndStudentId(id, me.studentId())`, mismatch → 404) goes into the backend-module and
  authz-isolation skills; the T-M2.2 fixture handler `HarnessStudentHandlers` is switched to `CurrentStudent` so the B-on-A check exercises it.
- **S4-1 (DEC-092):** today a login that commits just before `AccountApi.disable` can store its session after `endAllSessions`. Close it by re-checking the
  account per authenticated request (one primary-key read of `status`; acceptable for one tutor and their students): when the account is not `ACTIVE`, the
  session is invalidated and the request answers 401 `SESSION_EXPIRED`. Remember-me already checks the status. Prove it deterministically (no sleeps, no
  wall-clock bounds, DEC-093): sign in, set the account `DISABLED` without ending sessions (the state the race leaves), then call with the session.
- **Registry and world** (authz-isolation skill): one `PolicyRegistry` entry per new `METHOD /pattern`; statuses: anonymous 401, tutor 2xx/4xx as the sample
  request yields, student A 403, must-change 403, B-on-A `NA` (tutor endpoints). The students contributor creates `Student` rows for A, B and C (C
  `ARCHIVED`, matching its `DISABLED` account) and the must-change student, with `SECRET-*` markers in the tutor-only fields (`note`, a contact handle
  value), so every later student endpoint is scanned for them; it registers the sample key `sid` → A's student ID (`IsolationWorld#ownedByA`), which the
  registry's `{sid}` resolves through. Session-ending entries (status → `ARCHIVED`, password reset) act on a world student and run in a fresh world as
  today. `HarnessStudentHandlers`/`HarnessItems` are keyed by user ID today: once the handler takes `CurrentStudent` they key by student ID, and
  `HarnessDetectionTest`'s context gets the student rows (the students contributor, or its own fixture contributor).
- **Decisions in this packet (DEC-096 limitations, implemented in T-M2.9):** (a) rule 3 is extended to `@RequestHeader`, `@CookieValue` and
  `@MatrixVariable` names and to the record components / fields of `@RequestBody` and `@ModelAttribute` types (nested `com.englms` types included);
  (b) rule 4 stays non-transitive: the `SECRET-*` response scan is the runtime backstop, and a transitive rule over every type graph is noisy and slow;
  (c) the scan also matches B's UUIDs without dashes; other encodings (base64 etc.) are not scanned (no encoder exists in the app). T-M2.9 carries them
  because T-M2.3 adds no `..web.student..` handler with a body, header or cookie; T-M2.9 must merge before any `..web.student..` handler that binds a body,
  header or cookie (backlog).

## Acceptance criteria
- AC1 (FR-STU-01): Given a tutor session, `POST /api/v1/tutor/students` with a full name and a free username creates the `STUDENT` account
  (`mustChangePassword=true`, temporary-password expiry 7 days) and the `ACTIVE` student in one transaction and answers 201 with the credentials; without
  `password` the response carries a generated one (≥ 12 characters) that signs in once and then requires a change; a supplied weak password → 422 with the
  policy field code; the credentials appear in no other response (`GET` of the student, list). If the student insert fails after the account insert, no
  account remains (rollback test).
- AC2 (FR-STU-01): A username equal to an existing one after normalisation (case, surrounding spaces) → 409 `USERNAME_TAKEN` with
  `errors[0].field = "username"`, also when two creates race (database index); an accented username (`ngùyen`) fails validation-rules → 422 with the
  username field code (availability `INVALID`). `GET /tutor/usernames/suggestion?fullName=Nguyễn Văn An` →
  `nguyenvanan`, then `nguyenvanan2` once the first is taken; `GET /tutor/usernames/availability?username=` answers `available` / `INVALID` / `TAKEN`.
- AC3 (FR-STU-02): `GET /api/v1/tutor/students` lists `ACTIVE` and `PAUSED` students by default and `ARCHIVED` only when asked; `q=nguyen` matches
  `Nguyễn` in the name and matches the username, email, phone and a handle value; paging and the `fullName`/`createdAt` sorts follow api-conventions §4; an
  unknown sort or status → 422 `VALIDATION_FAILED` naming the field; `q=%` matches only a literal `%`; no N+1 username lookups (one batch call per
  page).
- AC4 (FR-STU-03): `GET`/`PATCH /api/v1/tutor/students/{sid}` read and update the profile and contacts with optimistic locking (stale `version` → 409
  `STALE_VERSION`); a username change applies the uniqueness rule, keeps the student's existing sessions valid and records `USERNAME_CHANGED`; an unknown
  `sid` → 404; field validation per validation-rules → 422 with field codes.
- AC5 (FR-STU-05): `POST …/status` applies the transitions of domain-model §4.1 and refuses others with 409 `INVALID_STATE_TRANSITION`; `ARCHIVED` ends
  every session and remember-me token of the student at once and makes sign-in answer the generic 401; reactivation (`ARCHIVED → ACTIVE`) re-enables
  sign-in with `mustChangePassword` unchanged; `PAUSED` keeps sign-in; each change writes an audit event with `from` and `to`.
- AC6 (FR-AUTH-07): `POST …/password-reset` returns a new temporary password once; the student's sessions and remember-me tokens end; the old password
  fails; the new one signs in with `mustChangePassword=true` and expires after 7 days if unused (clock-controlled test); the lockout is cleared; the audit
  event `PASSWORD_RESET_BY_TUTOR` names the tutor; an `ARCHIVED` student → 409.
- AC7 (NFR-SEC-01): Every new handler is `@Audience(TUTOR)` and has a `PolicyRegistry` entry; the authz matrix passes with anonymous 401, student A 403,
  must-change 403 and the tutor's registered status; the students contributor adds A/B/C rows with `SECRET-*` markers and `IsolationTest` stays green; no
  response, log line or audit detail contains a temporary password or a password hash (test on the create and reset responses' neighbours: list, `GET`,
  audit rows, the application log captured during the test).
- AC8 (ADR-0016 §2–3): A `..web.student..` handler declaring `CurrentStudent me` receives the signed-in student's IDs; anonymous → 401 at L1; a tutor
  session never reaches it (403 at L1); a student account without a student row → 401 `SESSION_EXPIRED` and the session ends; `HarnessStudentHandlers` uses `CurrentStudent` and its
  B-on-A check still answers 404; the owner-scoped convention is written in the backend-module and authz-isolation skills.
- AC9 (DEC-092 S4-1): A session (and a remember-me login) of an account whose status is not `ACTIVE` is refused on its next request with 401
  `SESSION_EXPIRED` and the session is invalidated, proven with the deterministic test of the design notes; sign-in, the must-change gate and the
  existing auth tests stay green.
- AC10: `ENGLMS_TASK=T-M2.3 ./scripts/gate.sh` green (contract drift updated: the OpenAPI document lists the new operations), `-Dgroups=security` green,
  `ModularityTests` green with the new module, the forbidden-identifier scan green; docs updated (list below); no existing test weakened.

## Test plan
- Implementation: domain unit tests (transitions, username suggestion incl. `đ`, digits, very long and very short names, collision suffixes); repository
  and migration tests on PostgreSQL (Testcontainers); API tests per endpoint (happy path, validation, 404, 409s, stale version); the rollback test of AC1;
  the race test of AC2 (two concurrent creates, one 201 and one 409, by threads with a start latch, no timing bound); the S4-1 test; `PolicyRegistry`
  entries + contributor; `ModularityTests` and the module documentation; OpenAPI contract test.
- Independent QA focus: black-box create → sign in with the credentials → forced change; duplicate usernames by case/spaces, accented usernames refused; search with Vietnamese
  diacritics (`Đặng` via `dang`); archive while the student has two sessions and a remember-me cookie (all refused at once); reactivate; reset while signed
  in; stale versions; secrets absent from list/`GET`/logs/audit; ×20 repeat runs of the class proving the AC2 create race.
  Exploratory charter: try to obtain a student's temporary password or account state after the create response, and to keep a session alive across archive.
- Security review (SEC) at G3: identity changes, new tutor endpoints, `CurrentStudent`, S4-1.

## Evidence required
- `evidence/T-M2.3/summary.md` (implementation section: AC → proof table, commands, known limitations), the gate log, `security-groups.log`, the ×20 run
  log; QA report (via a `qa/T-M2.3` PR); SEC review record (via the merge-record PR). No screenshots (no UI).

## Docs to update
- api-catalog "tutor: students" (as built: query params, bodies, the `password` default, `credentials`); data-model §2 `student` (search column as built,
  `version`, `search_text`, `started_on` deferred); module-boundaries "students" (API, events, the `StudentPrincipals` implementation), "shared"
  (`CurrentStudent`, resolver, SPI) and "audit" (synchronous after-commit listener for students events); security.md §4 (L3 `CurrentStudent`, S4-1
  per-request status check) and §8 (new actions); api-conventions §4 (unknown `status`/`sort` → 422) and §5 (`SESSION_EXPIRED` also for an account no
  longer `ACTIVE` and a student principal without a student row); validation-rules if a limit is refined (note ≤ 2,000); A-021 (create-time temporary
  password expiry) and, once the PO confirms DEC-097 (2), ux-flows F2 step 2 ("generated on Create, shown on the credentials card") and the FR-STU-01
  wording; authz-isolation and backend-module skills (owner-scoped convention, `CurrentStudent`); traceability-matrix rows for
  FR-STU-01/02/03/05 and FR-AUTH-07; `progress.json`.

## Risks & assumptions
- **Per-request status read (AC9):** one indexed PK read per authenticated API request; acceptable at this scale (one tutor, tens of students). If it shows
  in profiles later, cache by session with the disable event as invalidation.
- **Cross-module search:** the username part of `q` is resolved by identity first; for one tutor's students the ID list stays small (ponytail-sized).
- **Password policy vs generated passwords:** the generator's output must pass `PasswordPolicy` (≥ 10, not common); a unit test asserts it.
- The identity audit listeners are synchronous `@EventListener`s writing in their own transaction (a failed-login row must survive the failed request):
  for the students events that would let a rolled-back create leave a `STUDENT_CREATED` row. The audit module records the students events with a
  **synchronous** `@TransactionalEventListener(phase = AFTER_COMMIT)` calling `AuditApi.record` (`REQUIRES_NEW`), not the asynchronous
  `@ApplicationModuleListener` (tests stay deterministic, DEC-093); a test shows that a rolled-back create leaves no row. The identity `PasswordReset(TUTOR)`
  listener stays a plain `@EventListener` like the other identity events. module-boundaries "audit" records both (as built).
- Assumes no PO change to FR-STU-01's credentials-card content (UI composes it; T-M2.5).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh && source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dgroups=security)
# ×20 for the class proving the AC2 create race (name it in the summary)
(cd backend && for i in $(seq 1 20); do ./mvnw -B -ntp -q verify -Dtest='<AC2 race test class>' -Dsurefire.failIfNoSpecifiedTests=false || break; done)
ENGLMS_TASK=T-M2.3 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.3-students-core
```
