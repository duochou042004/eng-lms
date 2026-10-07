# DOCS-REVIEW T-M2.3: Students core (packet)

## Round 1

- Reviewer: Docs Reviewer (fresh context, did not write the reviewed docs)
- Date: 2026-10-07T01:58:58Z
- Branch: `docs/T-M2.3-students-core` (PR #60)
- Head SHA: `60d2066a20d854d47a1b09b0763b6378f4ae40b4`
- Diff (`develop...HEAD`): `docs/tasks/T-M2.3-students-core.md` (new, 183 lines), `docs/tasks/backlog.md` (T-M2.3 row rewritten, T-M2.9 row added, T-M2.5 deps), `docs/10-governance/decision-log.md` (DEC-097), `progress.json`
- `./scripts/check-docs.sh`: **PASS** (191 markdown files, progress.json valid, sources intact, prompt within limit)

### Checks performed

| Check | Result |
|---|---|
| Template / G0 completeness | Every template section is there (out of scope sits under Scope, as in T-M2.1/T-M2.2). Estimate 2 agent-days, 10 ACs: right at the size limit. If it runs over, AC9 (S4-1) is the piece that can be split off cleanly. T-M2.2 is merged (`04d90e4`). The branch, `in_progress` and the PO start signal are start-time items. |
| Traceability / guardrails (scope.md §6) | Every scope item traces to FR-STU-01/02/03/05, FR-AUTH-07, NFR-SEC, ADR-0016, DEC-092 or DEC-096. No curriculum or exam fields; handle labels are free text. No SCOPE finding. One product-facing reinterpretation needs PO sign-off (D8). |
| Original T-M2.3 backlog row vs T-M2.3 + T-M2.9 | Every item is covered: create-with-account, suggestion and availability, status, reset, search, `CurrentStudent` plus the owner-scoped convention, registry, contributor and S4-1 go to T-M2.3; guardians, the learning profile and the DEC-096 extensions go to T-M2.9 (the decision itself is made in this packet). Gap: FR-STU-02's row signals and sorts are not part of either task and have no backlog owner (D6). |
| FR ACs | FR-STU-01/03/05 and FR-AUTH-07 are reflected. AC2 on accents contradicts validation-rules (D2). Generated-password length is inconsistent between the design note and AC1 (D9). |
| Status codes vs api-conventions §5 / security.md §4 | 409 `USERNAME_TAKEN`, `STALE_VERSION` and `INVALID_STATE_TRANSITION`, 404, 422, and the L1 order (401, then role 403, then must-change 403) are right. 401 `SESSION_EXPIRED` for S4-1 matches `AuthProblems` (a rejected remember-me already answers `SESSION_EXPIRED`). AC3 leaves the status open as "422 (or 400)" (D3). The no-student-row 401 does not match the code's definition (D11). |
| Data model / migrations | The packet's claim that `app.unaccent` is STABLE holds: the extension is in `app` (V1), and `username_normalized` is computed by the application. The search design is left open (D4). The migration name does not follow the convention (D12). |
| Module boundaries | `students → identity, shared` and `audit → students :: events` are consistent. The deviation that moves `CurrentStudent` out of `shared` rests on a false premise (D1). |
| Existing code | `AccountApi` has `disable`/`enable` only (the additions are listed in scope 2). `PasswordReset.Actor.TUTOR` exists. `TemporaryPasswordGenerator` produces at least 14 characters. `IdentityEventsListener` is a synchronous `@EventListener` by design (D5). `HarnessStudentHandlers` sits in `fixture.harness.web.student` and is keyed by user ID (D15). The Modulith JDBC event registry exists (V1). |
| Determinism (DEC-093) | ACs have no wall-clock bounds. The S4-1 proof is deterministic. Expiry is tested with a controlled clock. The race test uses a latch. One option in the risks section would bring in async listeners (D5). |
| Decisions (DEC-092, DEC-096, DEC-097, ADR-0016, A-008/A-018/A-021) | DEC-097 (1) conflicts with module-boundaries "files" (D1). DEC-097 (2) reinterprets a PO-owned AC (D8). Create-time expiry goes beyond A-021's wording (D10). |
| Links / IDs | They resolve (check-docs PASS). The T-M2.9 trace is missing FR-GOAL-02 (D13). |

### Findings

| ID | Sev | Location | Finding | Suggested fix |
|---|---|---|---|---|
| D1 | S2 | packet:56-57 (design notes "Deviation"); decision-log.md:105 DEC-097 (1); backlog.md:44 | The packet moves `CurrentStudent` and its resolver into `students` and justifies it with "Every module with student handlers already depends on `students`". That is false. `files` depends on `shared` only and is "at the bottom of the graph" (module-boundaries "files"), yet it serves `GET /student/files/{id}/content` and `POST /student/files` (api-catalog:110-111). `/student/account` (FR-SET-02) could also land in `settings`, which depends on `shared` only. The move would force a `files → students` edge or rehoming those handlers, and it contradicts module-boundaries "shared". | Keep the `CurrentStudent` record and the resolver in `shared.web`, resolving through a small SPI declared in `shared` (for example `StudentIdLookup`) that `students` implements, the same pattern as `FileAccessResolver`. `shared` then reads no table and holds no business rule. Alternatively keep the move, but amend the dependency graph explicitly (`files → students`, and say which module owns `/student/files/**` handlers), then correct DEC-097 (1) and the backlog row. |
| D2 | S3 | packet:115-117 (AC2), :148 (QA focus "duplicate usernames by … accents") | validation-rules "identity / students" allows usernames of `^[a-z0-9._-]+$` after lowercasing, and `Usernames.isValid` enforces that. An accented username such as `ngùyen` is therefore 422 (availability `INVALID`), never 409. AC2's "equal … after normalisation (case, accents, …) → 409" cannot be tested for accents. | AC2: 409 for case and surrounding-space variants; an accented input → 422 field code (`INVALID` in availability). Align the QA focus. If accents should fold before validation, that changes validation-rules and needs a DEC. |
| D3 | S3 | packet:120 (AC3) | "an unknown sort or status → 422 (or 400 per api-conventions)" does not fix the outcome, and api-conventions §4 says nothing about it. Spring's default for an unparseable enum `status` is a type mismatch, which this app maps to 400 `MALFORMED_REQUEST`. The AC is not testable as written. | Pick one, for example 422 `VALIDATION_FAILED` with `errors[].field` = `sort` or `status`, and say that the handler binds `status` as a string or handles the conversion. Add the rule to api-conventions §4 (it is in "Docs to update" already for §5). |
| D4 | S3 | packet:59-62 (Migration), :74-78 (List) | The search design is left to the implementer, and one option does not meet AC3. data-model §2's `full_name_search GENERATED (lower(unaccent(full_name)))` (with an IMMUTABLE wrapper) covers only the name, while AC3 also requires email, phone and handle values. Substring matching of `q` on `search_text` and on identity's `username_normalized` does not say how LIKE wildcards are escaped. | Decide in the packet: an application-normalised `search_text` (`Usernames.normalize` over name, email, phone and handle values, recomputed on every write) with a pg_trgm GIN index, plus `q` normalised the same way. Escape `%`, `_` and `\` in `q` and add one test with `q=%`. Update data-model §2. |
| D5 | S3 | packet:170-172 (Risks, audit) | The risk note offers "`@TransactionalEventListener(AFTER_COMMIT)` or Modulith's `@ApplicationModuleListener`". `@ApplicationModuleListener` is `@Async`, so a test asserting the `STUDENT_CREATED` row would have to poll, which breaks DEC-093's deterministic-test rule. It would also diverge from module-boundaries "audit", which says the listener is synchronous. | Specify a synchronous `@TransactionalEventListener(phase = AFTER_COMMIT)` that calls `AuditApi.record` (REQUIRES_NEW), and record it in module-boundaries "audit" (as built). State that the identity `PasswordReset(TUTOR)` listener stays a plain `@EventListener`, like the other identity events. |
| D6 | S3 | packet:39-40; decision-log.md:105 DEC-097 (5); backlog.md:44 | FR-STU-02 (MVP, M2) has row signals (next lesson, open work count, attention badge) and the sorts "next lesson" (the FR default) and "recently active". After the split, no backlog row owns them: "those modules add them" is not a task, and no M3/M5/M7 row mentions FR-STU-02. | Add them to named rows: next lesson plus its sort to an M3 lessons row, open work count to an M5 row, and the attention badge to T-M7.7. Add FR-STU-02 to those rows' trace, and note in the FR-STU-02 traceability row that `name` is the default sort until M3. |
| D7 | S4 | backlog.md:45 (T-M2.9), :47 (T-M2.6) | The DEC-096 rule-3 extensions are parked in T-M2.9, but nothing orders T-M2.9 before the first `..web.student..` handler. T-M2.6 (FR-SET-02, possibly `GET /student/account`) depends only on T-M2.4. The risk is low because that endpoint has no body, header or cookie. | Add a sentence to T-M2.9 ("before any `..web.student..` handler that binds a body, header or cookie"), or add T-M2.9 to T-M2.6's dependencies if T-M2.6 adds a student handler. |
| D8 | S3 | packet:68-69; decision-log.md:105 DEC-097 (2) | FR-STU-01 ("the password is generated … and can be regenerated") and ux-flows F2 step 2 ("password auto-generated") describe a password visible in the form before Create. The LC reinterprets this as "generated at create time, regenerated via reset", which is a product-facing change to a PO-owned AC. DEC-097 records it as Accepted with owner LC only, and neither ux-flows F2 nor FR-STU-01 is in "Docs to update". | Ask the PO to confirm this together with the start signal and record the answer in DEC-097, or raise an OQ. Add ux-flows F2 step 2 ("generated on Create, shown on the credentials card") and the FR-STU-01 wording to "Docs to update", and add a note to the T-M2.5 row. |
| D9 | S4 | packet:65 vs :112 | The design note says "≥ 14 characters" (the generator's real minimum), while AC1 says "≥ 12" (FR-STU-01, security.md §3). | AC1: "≥ 12 (FR-STU-01; the generator yields ≥ 14)", or use one number throughout. |
| D10 | S4 | packet:64, :111 (AC1) | A 7-day expiry for the create-time temporary password is asserted "as for a reset, A-021", but A-021 only covers tutor-reset and operator-reset passwords. security.md T12 ("temporary passwords expire") supports the behaviour, but the extension is not recorded. | Add it to DEC-097 and amend the A-021 text (or security.md §3) in "Docs to update". |
| D11 | S4 | packet:92, :135 (AC8) | A student account with no student row → 401 `UNAUTHENTICATED`, but api-conventions §5 defines `UNAUTHENTICATED` as "without a session cookie", and here the session is valid. | Keep 401 and amend api-conventions §5 ("or a student principal with no student row"), or use 401 `SESSION_EXPIRED` and invalidate the session. Pick one and document it. |
| D12 | S4 | packet:58 | The migration name `V20261007…__students.sql` does not follow data-model's `V<yyyyMMddHHmm>__<module>_<change>.sql` (as built: `V202610040001__identity_accounts_sessions.sql`). The packet also does not say whether data-model's `started_on` column is created or exposed: it is in neither the DTO nor any AC. | Use `V2026100700NN__students_student.sql`. Say whether `started_on` is created (and left unexposed) or dropped from data-model §2. |
| D13 | S4 | backlog.md:45 (T-M2.9 trace) | The first goal is in T-M2.9's scope, but FR-GOAL-02 is missing from its trace column. | Add FR-GOAL-02 (and A-008 for the learning profile). |
| D14 | S4 | packet:150, :179 | "×20 repeat runs of the concurrency tests (AC2 race, AC9)": the AC9 test is deterministic, not concurrent. The command keeps the placeholder `<concurrency test classes>`. | Limit the ×20 runs to the AC2 race test and name its class, or say "the class proving AC2". |
| D15 | S4 | packet:94, :99-102 | The registry's `{sid}` must resolve through `IsolationWorld#resolve`, so the students contributor has to register key `sid` → A's student ID. `HarnessStudentHandlers` and `HarnessItems.ownerOfItem` are keyed by user ID, and `HarnessDetectionTest` imports its own fixtures, so its context also needs the Student rows once the handler takes `CurrentStudent`. | State both in the "Registry and world" design note. |

### Verdict

One S2 (D1) and six S3 findings (D2-D6, D8). Per DEC-088, fix the S3 and S4 findings in-task. Re-review after the fixes.

DOCS-REVIEW T-M2.3: CHANGES REQUESTED

### Fixes (LC, in-task per DEC-088)
D1 `CurrentStudent` + resolver stay in `shared.web` with a `StudentPrincipals` SPI implemented by `students` (packet scope 4, design notes; DEC-097 (1); backlog). D2 AC2: case/space variants → 409, accented → 422 (`INVALID`); QA focus aligned. D3 unknown `status`/`sort` → 422 `VALIDATION_FAILED` naming the field, bound as strings; api-conventions §4 in docs to update. D4 search decided: application-normalised `search_text` + pg_trgm GIN, `q` normalised and `LIKE`-escaped, `q=%` test in AC3. D5 synchronous `@TransactionalEventListener(AFTER_COMMIT)` for students events; identity listener unchanged. D6 row signals and sorts owned by T-M3.1, T-M5.1, T-M7.7 (backlog, FR-STU-02 in their trace). D7 T-M2.9 must merge before a student handler with body/header/cookie. D8 DEC-097 (2) marked "PO confirmation requested with the start signal"; ux-flows F2, FR-STU-01 wording in docs to update; T-M2.5 note; fallback endpoint named. D9 one number (≥ 12 per FR, generator ≥ 14). D10 create-time expiry recorded in DEC-097 (2), A-021 in docs to update. D11 no student row → 401 `SESSION_EXPIRED` + session invalidated; api-conventions §5 in docs to update. D12 `V202610070001__students_student.sql`; `started_on` not created (deferred in data-model). D13 T-M2.9 trace + FR-GOAL-02, A-008. D14 ×20 only the AC2 race class. D15 `sid` sample key and the harness fixtures re-keyed by student ID stated in "Registry and world".

## Round 2

- Reviewer: Docs Reviewer (fresh context, did not write the reviewed docs)
- Date: 2026-10-07T02:09:15Z
- Branch: `docs/T-M2.3-students-core` (PR #60)
- Head SHA: `ad6b1e88e28104f8a23be1821c172079fb8e91d7`
- Delta (`60d2066..HEAD`): packet, `backlog.md` (T-M2.3, T-M2.5, T-M2.9, T-M3.1, T-M5.1, T-M7.7), DEC-097, this file
- `./scripts/check-docs.sh`: **PASS** (192 markdown files, progress.json valid, sources intact, prompt within limit)

### Round-1 findings

| ID | Status | Evidence |
|---|---|---|
| D1 | Resolved | `CurrentStudent`, its resolver and the `StudentPrincipals` SPI are in `shared` (packet:30-31, :58-61); DEC-097 (1) and the T-M2.3 row are updated; module-boundaries "shared" is in "Docs to update". New issues: N1, N2. |
| D2 | Resolved | AC2 (packet:129-131) gives 409 for case and space variants and 422 `INVALID` for accents; the QA focus is aligned (:164). |
| D3 | Resolved | `status` and `sort` are bound as strings; an unknown value → 422 `VALIDATION_FAILED` naming the field (:86-87, AC3); api-conventions §4 is in "Docs to update". |
| D4 | Resolved | One design: an application-normalised `search_text` with a trgm GIN index; `q` is normalised and LIKE wildcards are escaped, in identity too (:64-67); AC3 adds `q=%`; data-model §2 is in "Docs to update". |
| D5 | Resolved | A synchronous `@TransactionalEventListener(AFTER_COMMIT)`, `@ApplicationModuleListener` explicitly rejected, `PasswordReset(TUTOR)` unchanged (:189-193); module-boundaries "audit" is in "Docs to update". |
| D6 | Resolved | T-M3.1 (next lesson and its default sort), T-M5.1 (open work count, "recently active") and T-M7.7 (attention badge) carry FR-STU-02; the packet (:40-42) and DEC-097 (5) point to them. |
| D7 | Resolved | The T-M2.9 row and the packet (:120-121) say "must merge before any `..web.student..` handler that binds a body, header or cookie". |
| D8 | Resolved | PO confirmation is requested with the start signal (DEC-097 (2), packet:74-77), with a fallback endpoint if the PO declines; the T-M2.5 row is noted; ux-flows F2 and FR-STU-01 are in "Docs to update" once the PO confirms. |
| D9 | Resolved | ≥ 12 per FR-STU-01, and the generator yields ≥ 14 (:71-72); AC1 is unchanged at ≥ 12. |
| D10 | Resolved | Recorded in DEC-097 (2) and in the create design note; A-021 is in "Docs to update". |
| D11 | Resolved | 401 `SESSION_EXPIRED` and the session is invalidated (:101, AC8); the api-conventions §5 amendment is listed. |
| D12 | Resolved | `V202610070001__students_student.sql`; `started_on` is not created and is marked deferred in data-model §2 (listed). |
| D13 | Resolved | The T-M2.9 trace adds FR-GOAL-02 and A-008. |
| D14 | Resolved | ×20 runs only for the AC2 race class, named in the summary (:166, :200-201). |
| D15 | Resolved | The contributor registers `sid`; harness keying and the `HarnessDetectionTest` context are stated (:110-115). |

### New findings

| ID | Sev | Location | Finding | Suggested fix |
|---|---|---|---|---|
| N1 | S3 | packet:100-102 | The resolver now sits in `shared.web` but is described as "resolving the session's `CurrentUser` (role `STUDENT`)". `CurrentUser` and `Role` live in `identity`, and `identity → shared`, so a `shared → identity` reference would create a cycle and fail `ModularityTests`. Today `shared` has no `com.englms.identity` import. | Have the resolver read Spring Security's `Authentication`: `getName()` is the user ID (as `CurrentUser.getName()` guarantees) and the authority is `ROLE_STUDENT`. Pass the UUID to `StudentPrincipals.studentIdForUser`. State in the design note that `shared` does not reference `identity`. |
| N2 | S4 | packet:55 | The packages line still says "`students` (API, `CurrentStudent`)", which contradicts :58 (`CurrentStudent` in `shared.web`). | Change it to "`students` (API, the `StudentPrincipals` implementation)". |
| N3 | S4 | packet:11 (Trace), :48 (guardrail 1) | DEC-097 records this packet's decisions but is not traced. | Add DEC-097 to both places. |

### Verdict

All D1-D15 are resolved. No S1 or S2 findings. The new S3 (N1) and S4s (N2, N3) are one-line fixes to make in-task per DEC-088. They do not need another review round, provided the fix for N1 keeps the resolver free of `identity` types.

DOCS-REVIEW T-M2.3: PASS

### Round-2 fixes (LC, in-task per DEC-088)
N1 resolver reads Spring Security's `Authentication` (name = user ID, `ROLE_STUDENT`); `shared` references no `identity` type. N2 packages line fixed. N3 DEC-097 in Trace and guardrail 1.
