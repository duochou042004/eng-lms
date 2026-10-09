# T-M2.9: Students part 2 (guardians, tutor-private learning profile, rule extensions, credential stamp)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft |
| Owner role | BE (backend-implementer; SEC review at G3) |
| Branch | `feature/T-M2.9-students-part-2` (from `develop`) |
| Depends on | T-M2.3 (merged, `f0e228c`, DEC-101) |
| Estimate | 2 agent-days |
| Trace | SPEC §4.2, §5.6, §8, §37; FR-STU-01 (guardians at create), FR-STU-03 (guardians), FR-STU-04; NFR-SEC-01, NFR-SEC-02; A-005, A-008 (OQ-06 default: tutor-only); ADR-0016 §2–4; api-catalog "tutor: students"; data-model §2 `student_guardian`, `student_learning_profile`; domain-model §4.1; validation-rules "identity / students"; test-strategy §4 rules 3–4; DEC-096, DEC-097 (4), DEC-100 (T-M2.3 SEC S4-2, S4-5), DEC-102 (first goal → M7) |

## Goal
The tutor can record a student's guardians (also when creating the student) and keep a tutor-private learning profile (level, notes, strengths,
weaknesses, custom fields) that no student response can ever contain. The student-isolation rules close the DEC-096 gaps before the first
`..web.student..` handler that binds a body, header or cookie, and two T-M2.3 security leftovers are closed: a login racing a tutor password reset
cannot leave a usable session (S4-5), and a duplicate username is not written to the application log (S4-2).

## Scope
- In:
  1. **Guardians** (FR-STU-03, A-005): table `student_guardian`, `GET`/`POST /tutor/students/{sid}/guardians`, `PATCH`/`DELETE /tutor/guardians/{gid}`,
     and an optional `guardians` array in `POST /tutor/students` (FR-STU-01, same transaction).
  2. **Learning profile** (FR-STU-04, A-008): table `student_learning_profile` (one row per student), `GET`/`PUT /tutor/students/{sid}/learning-profile`,
     its types marked `@TutorPrivate`.
  3. **Isolation world:** guardian and profile rows for A, B, C with `SECRET-*` markers in every tutor-only text field.
  4. **DEC-097 (4) rule extensions:** ArchUnit rule 3 also inspects `@RequestHeader`/`@CookieValue`/`@MatrixVariable` names and the fields of
     `@RequestBody`/`@ModelAttribute` types; the isolation scan also matches B's UUIDs without dashes.
  5. **S4-5** (credential stamp) and **S4-2** (no username in the log on a duplicate).
  6. Registry entries, OpenAPI contract, docs.
- Out of scope (explicit):
  - **The first goal at creation** (FR-STU-01 optional, FR-GOAL-02 "M2: first goal"): moved to M7 (**DEC-102**): ux-flows F2 step 4 picks or creates a
    metric inline, so it needs the `goals` module (metric definitions, validation against range and direction); a goal-only stub now would be rebuilt in
    T-M7.1. T-M7.1 accepts the first goal in `POST /tutor/students`, T-M7.2 adds it to the add-student form.
  - Guardian reordering (no `order` endpoint; guardians keep their insertion order), guardian accounts or contact by the system (A-005: no parent portal).
  - A student-visible profile or per-field visibility toggles (OQ-06 default: tutor-only).
  - Audit rows for guardian or profile edits (security.md §8 lists no such action).
  - A transitive rule 4 and other ID encodings in the scan (DEC-097 (4) (b), (c)).
  - The PostgreSQL server's own log line for a unique violation (database operations, M8 runbooks), any UI (T-M2.5), `GET …/overview` (FR-STU-06).

## Guardrail answers (scope.md §6)
1. **Trace:** FR-STU-01/03/04, NFR-SEC-01/02, A-005, A-008, DEC-096/097/100/102 (above); nothing else.
2. **Drift toward excluded scope?** No. Guardians are stored contact values with no account, login, notification or portal (SPEC §5.6).
3. **Mandatory setup added?** None. Guardians and every profile field are optional; a new student gets an empty profile.
4. **Weekly use?** Yes: the tutor reads and updates a student's level, strengths, weaknesses and notes while planning lessons; guardians when contacting parents.
5. **Hard-coded semantics?** None. `currentLevel` is free text ("B1" is an example), strengths/weaknesses are free tags, custom fields are tutor labels;
   the forbidden-identifier scan stays green.

## Design notes
- **Packages** (backend-module skill): in `students`: `internal.domain` (`Guardian`, `LearningProfile`), `internal.persistence`, `internal.app`,
  `internal.web.tutor` (controllers, DTOs). No new module and no new dependency. The learning-profile domain type and its tutor DTOs are annotated
  `@TutorPrivate` (type-level), so rule 4 forbids any `..web.student..` class from using them; guardian DTOs are tutor-only DTOs (personal data, data-model §5).
- **Migration** (db-migration skill): `V202610090001__students_guardians_learning_profile.sql`: `app.student_guardian` and
  `app.student_learning_profile` as in data-model §2 plus the standard columns (guardian: `created_at`, `updated_at`, `created_by`, `updated_by`;
  `ix_student_guardian__student_id_position`); the profile backfills one empty row per existing student (`INSERT … SELECT`), and the create transaction
  inserts one for every new student, so every student has exactly one profile row. Both `ON DELETE CASCADE` from `student`.
- **Guardians:** request `{name, relationship?, phone?, email?, notes?}`; limits: name 1–120, relationship 0–40, phone/email the common rules, notes
  0–2,000 (Description), **≤ 10 guardians per student** (new limit, validation-rules; a further `POST` → 422 `TOO_MANY` on `guardians`).
  `POST` appends (`position` = max + 1) → 201 + `Location` with the guardian DTO `{id, name, relationship, phone, email, notes}`; `GET` lists in
  position order; `PATCH` (absent = unchanged, `null` clears, not `name`) → 200; `DELETE` → 204. Last write wins (data-model §2 has no `version` on a
  guardian; one tutor edits). An unknown `sid` or `gid` → 404. `POST /tutor/students` accepts `guardians?: [...]` (≤ 10, same rules; field paths
  `guardians[i].name`); the student DTO does not embed guardians (the UI reads the list endpoint).
  `search_text` is **not** extended to guardians (FR-STU-02 search covers the student's name, username and contacts).
- **Learning profile:** `GET` → `{currentLevel, learningNotes, strengths: [..], weaknesses: [..], customFields: [{label, value}], updatedAt, version}`;
  `PUT` takes the full object plus `version` (absent field = cleared/empty; stale → 409 `STALE_VERSION`) → 200 with the new state. Limits:
  `currentLevel` 0–40, `learningNotes` 0–2,000, strengths/weaknesses tags (1–40 characters, ≤ 30 each, case-insensitive dedup keeping the first
  spelling), `customFields` label 1–60 / value 0–500 / ≤ 30 (common label/value list). An unknown `sid` → 404. Free text refuses C0 controls (validation-rules).
- **Registry and world** (authz-isolation skill): one `PolicyRegistry` entry per new `METHOD /pattern` (anonymous 401, tutor 2xx/4xx, student A 403,
  must-change 403, B-on-A `NA`); `{gid}` → a guardian of A via `world.ownedByA("gid", …)`. The students contributor (or a second contributor) adds a
  guardian and a populated profile for A, B and C with `SECRET-*` markers in `notes`, `learningNotes`, a strength tag and a custom-field value, and
  registers the guardian and profile IDs of B with `ownedByB`; `reset()` removes what it added.
- **Rule 3 extension (DEC-097 (4) (a))**: the condition also reads `@RequestHeader`, `@CookieValue` and `@MatrixVariable` `value`/`name`, and for a
  parameter annotated `@RequestBody` or `@ModelAttribute` (or an unannotated non-simple type, which Spring binds as a model attribute) the names of the
  record components / fields of its type, recursing into nested `com.englms` (and `fixture`) types, cycle-safe; a violation names the method and the
  field path. New violating fixtures in `fixture.archunit.web.student` prove each way (header, cookie, matrix, body record component, nested body
  field, model attribute field) and a clean one. `CurrentStudent` itself is exempt (its `studentId` is the point of it; the verifier already refuses a
  binding annotation on it). Rule 4 is unchanged (b).
- **Scan extension (DEC-097 (4) (c))**: `IsolationWorld.ownedByB` registers, for a UUID, both the canonical and the dashless lowercase form (and the
  scan stays case-insensitive for UUIDs); `HarnessDetectionTest` gains a fixture that leaks B's ID without dashes and must be caught.
- **S4-5 credential stamp (DEC-100):** today `AccountStatusFilter` re-reads only the status, so a login that commits just before a tutor reset can store
  a session that survives the reset's `endAllSessions`. Add `user_account.credential_stamp` (`bigint NOT NULL DEFAULT 0`, migration
  `V202610090002__identity_credential_stamp.sql`), incremented in the same transaction as every password write (own change, tutor reset, operator reset,
  bootstrap). `CurrentUser` gains the stamp read at authentication (session and remember-me); the filter's primary-key read returns status **and** stamp
  and refuses a mismatch exactly like a non-`ACTIVE` account (401 `SESSION_EXPIRED`, every session and token ended). The user's own password change
  re-issues the caller's principal with the new stamp, so the kept session survives (FR-AUTH-05 unchanged). `CurrentUser` is stored in sessions:
  changing it makes existing dev sessions unreadable (sign in again; no production data yet). Prove it deterministically (DEC-093): sign in, change the
  stamp in the database without ending sessions (the state the race leaves), call with the session → 401.
- **S4-2 (DEC-100):** the losing duplicate-username insert or rename makes Hibernate's `SqlExceptionHelper` log the PostgreSQL detail
  `Key (username_normalized)=(…) already exists`. Stop the application log from carrying it (e.g. the logger level for that class, or translating the
  constraint violation before Hibernate logs it; the implementer picks the smallest option and documents what other SQL errors still log). Personal
  data in logs: data-model §5.
- **No change** to the student endpoints' existing DTOs other than `guardians?` in the create request.

## Acceptance criteria
- AC1 (FR-STU-03, A-005): Given a tutor session, `POST /tutor/students/{sid}/guardians` creates a guardian (201 + `Location`), `GET …/guardians`
  lists them in insertion order, `PATCH /tutor/guardians/{gid}` updates (absent unchanged, `null` clears, `name` cannot be cleared) and `DELETE`
  answers 204; validation per the design notes → 422 with field codes (incl. an 11th guardian → `TOO_MANY`, a NUL → `INVALID_FORMAT`); an unknown
  `sid`/`gid` → 404; deleting the student's last guardian leaves an empty list.
- AC2 (FR-STU-01): `POST /tutor/students` with `guardians` (≤ 10) creates them in the same transaction as the account and the student; an invalid
  guardian → 422 with `guardians[i].<field>` and no account, student or guardian remains; the response and `GET …/guardians` show them in request order.
- AC3 (FR-STU-04): every student has a learning profile (existing ones via the migration, new ones at create); `GET` returns it with `version`; `PUT`
  replaces it (strengths/weaknesses deduplicated case-insensitively), a stale `version` → 409 `STALE_VERSION`; limits per the design notes → 422 with
  field codes; an unknown `sid` → 404; no field, enum or constant names an exam (forbidden-identifier scan green).
- AC4 (A-008, NFR-SEC-02): the learning-profile types are `@TutorPrivate`; the isolation world holds guardians and profiles for A, B and C with
  `SECRET-*` markers in every tutor-only text field and B's guardian and profile IDs registered; `IsolationTest` stays green, and a `HarnessDetectionTest`
  case proves that a student response leaking a learning-profile marker fails the scan.
- AC5 (DEC-097 (4) (a)): rule 3 reports a `..web.student..` handler that takes a student ID through a `@RequestHeader`, `@CookieValue` or
  `@MatrixVariable` name, a `@RequestBody` record component, a nested body field or a `@ModelAttribute` field (one fixture each, the report names the
  field path); the clean fixture and the application pass; `CurrentStudent` parameters pass.
- AC6 (DEC-097 (4) (c)): the scan fails when student A's response contains a B UUID without dashes (detection fixture), and stays green for the application.
- AC7 (DEC-100 S4-5): a session (and a remember-me login) whose credential stamp differs from the account's is refused on its next request with 401
  `SESSION_EXPIRED` and every session and token of the account ends (deterministic test of the design notes); after the user's own password change the
  kept session still works and the others end; a tutor reset and the operator reset increment the stamp; existing auth tests stay green.
- AC8 (DEC-100 S4-2): when a create or rename loses on a duplicate username (sequential and the existing race test), the application log captured
  during the test contains neither the username nor its normalised form at any level, and the API still answers 409 `USERNAME_TAKEN`.
- AC9 (NFR-SEC-01): every new handler is `@Audience(TUTOR)` with a `PolicyRegistry` entry; the authz matrix passes (anonymous 401, student A 403,
  must-change 403, the tutor's registered status); no guardian or profile value appears in any log line written during the API tests.
- AC10: `ENGLMS_TASK=T-M2.9 ./scripts/gate.sh` green (OpenAPI contract updated), `-Dgroups=security` green, `ModularityTests` green, the
  forbidden-identifier scan green; docs updated (list below); no existing test weakened.

## Test plan
- Implementation: domain/validation unit tests (guardian limits, tag dedup, custom-field limits); migration test (backfill: a student created before
  the migration has a profile; cascade on student delete); API tests per endpoint (happy path, 422s, 404s, 409 stale); the AC2 rollback test; rule-3
  fixtures (AC5) and the scan detection fixture (AC6); the S4-5 deterministic test plus own-change and reset stamp tests; the S4-2 log-capture test;
  registry entries + contributor; OpenAPI contract.
- Independent QA focus: black-box guardians CRUD and create-with-guardians (rollback on one bad guardian); profile round trip with Vietnamese text and
  duplicate tags differing in case; stale profile `PUT`; every new endpoint as student/anonymous/must-change; a signed-in student whose password the
  tutor resets (old session refused at once, also with remember-me); own password change keeps the current session; logs free of usernames on a
  duplicate and of guardian/profile values; ×20 repeat runs of the S4-5 test class and of `StudentCreateRaceTest` (S4-2 log assertion).
  Exploratory charter: try to make any student-audience response or log line carry a guardian or learning-profile value, and to keep a session alive
  across a tutor reset.
- Security review (SEC) at G3: personal data of possibly minor guardians, tutor-private data, identity change (credential stamp), rule extensions.

## Evidence required
- `evidence/T-M2.9/summary.md` (AC → proof table, commands, known limitations), the gate log, `security-groups.log`, the ×20 run logs; QA report (via a
  `qa/T-M2.9` PR); SEC review record (via the merge-record PR). No screenshots (no UI).

## Docs to update
- api-catalog "tutor: students" (guardians: `GET`/`POST …/guardians`, `PATCH`/`DELETE /tutor/guardians/{gid}` as built; learning profile `GET`/`PUT`;
  `guardians?` in the create body); data-model §2 (both tables as built, `credential_stamp` in identity), §5 (guardians personal data, unchanged rule);
  validation-rules (≤ 10 guardians, guardian notes, `learningNotes`, tag limits as built); security.md §4 (credential stamp next to the S4-1 status
  check; rule 3 and scan extensions); test-strategy §4 (rules 3/4 as built); module-boundaries "students" (owns the two tables); authz-isolation skill
  (rule 3 now covers headers, cookies, matrix variables and body/model-attribute fields); traceability-matrix rows for FR-STU-01/03/04;
  `progress.json`.

## Risks & assumptions
- **Rule 3 field recursion:** limited to `com.englms`/`fixture` types and cycle-safe; generic collections are followed through their type argument
  only when it is such a type. A `studentId` field in a nested DTO of a student handler would also be flagged, which is intended (ADR-0016 §2).
- **Credential stamp:** one more column in the existing per-request primary-key read (no extra query). Changing `CurrentUser` invalidates stored dev
  sessions once.
- **S4-2:** silencing a vendor logger can hide other SQL errors; the chosen option must keep unexpected SQL errors visible (the 500 path logs them).
- OQ-06 stays at its default (tutor-only); if the PO later wants a student-visible level, that is a new packet with a student DTO.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh && source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dgroups=security)
# ×20 for the S4-5 test class and StudentCreateRaceTest (name them in the summary)
(cd backend && for i in $(seq 1 20); do ./mvnw -B -ntp -q verify -Dtest='<S4-5 test class>,StudentCreateRaceTest' -Dsurefire.failIfNoSpecifiedTests=false || break; done)
ENGLMS_TASK=T-M2.9 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.9-students-part-2
```
