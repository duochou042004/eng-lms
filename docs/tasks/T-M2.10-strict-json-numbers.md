# T-M2.10: Strict JSON number binding and the login-burst wall-clock flake

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 pending) |
| Owner role | BE (backend-implementer; SEC + QA at G3) |
| Branch | `fix/T-M2.10-strict-json-numbers` (from `develop`) |
| Depends on | T-M2.9 (merged, `37e8ce0`, DEC-105) |
| Estimate | ≤ 1 agent-day |
| Risk tier | **H**: the PR changes request binding for every JSON body, the sign-in body included, and rewrites a test in `identity` that guards SEC review S2-1 (quality-gates G3: "touches `identity`"). SEC as its own agent, then QA (no UI change, so no UX checklist) |
| Trace | api-conventions §"Errors" (400 `MALFORMED_REQUEST`: "Unparseable JSON, wrong types"); validation-rules "`version`: required on update, integer ≥ 0" (and the DEC-103 learning-profile exception); T-M2.9 QA F3 (`evidence/T-M2.9/qa/report.md` row F3, S4); DEC-105 (routing to T-M2.10); DEC-092 / DEC-093 (S2-1: no lock or pooled connection held across bcrypt; the burst test); DEC-144 (3) (the flake joins this row); coding-agent-rules §4.5, §4.6, §9.1; lessons L-01, L-05; DEC-158 PO-8 / T-M2.22 U1 (runs before the next backend task) |

## Goal
Integer request fields mean what validation-rules says: a JSON integer. Today Jackson quietly coerces `0.7` to 0, `3.9` to 3 and `"1"` to 1 (T-M2.9 QA
F3), so a client bug can write against the wrong `version`. After this packet such a body is a wrong JSON type and answers 400 `MALFORMED_REQUEST`, like
any other. Second, the test that guards SEC S2-1 (a login burst on one username must not hold locks or connections another user's sign-in needs)
stops comparing wall-clock times, which failed once on the 2-core CI runner (3355 ms, run 39567176119), and proves the same property without a
time bound.

## Scope
- In:
  1. **Strict integer binding** for every JSON request body read by Spring's auto-configured Jackson 3 mapper: a field of an integer type (`Long`,
     `long`, `Integer`, `int`, `Short`, `short`) accepts only a JSON integer token (or `null` where the field is nullable today). A float token
     (`0.7`, `3.9`, `1.0`, `1e2`), a string (`"1"`, `""`) or a boolean is refused before the controller runs: 400 `MALFORMED_REQUEST`.
     One global mechanism, in `com.englms.shared.web` next to `JsonLimitsConfiguration` (e.g. a `JsonMapperBuilderCustomizer` that disables
     `DeserializationFeature.ACCEPT_FLOAT_AS_INT` and sets the coercion config of `LogicalType.Integer` to `Fail` for the `Float`, `String` and
     `EmptyString` input shapes; the implementer verifies the Jackson 3 API names against its reference docs and cites the URL in the PR, §9.1).
     Not per-field annotations: every later endpoint gets the rule for free.
  2. **Tests on one endpoint of each kind** (the row): the student `PATCH /api/v1/tutor/students/{sid}`, the guardian
     `PATCH /api/v1/tutor/guardians/{gid}` and the learning profile `PUT /api/v1/tutor/students/{sid}/learning-profile`, each with a table of
     refused `version` values and a positive control (an integer `version` → the existing success answer).
  3. **The burst test without a wall-clock bound**: `AuthApiIntegrationTest.anUnrelatedLoginStaysFastDuringABurstOnOneUsername` is replaced by a
     deterministic test of the S2-1 property (Design notes, AC6), proven red by a mutation (AC7).
- Out of scope (explicit):
  - Coercion of other scalar types (a number for a `String` field, `"true"` for a `Boolean`, enums from integers). api-conventions covers them in
    words too, but the row and QA F3 name integer fields only; if the implementer finds such a coercion on a write endpoint it is an OQ (L-10),
    not code.
  - Query parameters (`page`, `size`): Spring's conversion service binds them, not Jackson; `size=0.7` already fails conversion. Not changed.
  - Integers outside the `long` range and negative `version` values: whatever they answer today is not changed here (QA records it; a 500 would be an OQ).
  - The sibling timing test `parallelFailedLoginsTakeSimilarTimeForUnknownAndExistingUsernames`: it guards the username timing oracle (DEC-093),
    a property that is itself a time comparison of two equal workloads; it has not failed on CI. Kept as is; a failure would be a new row.
  - Response DTOs and the OpenAPI contract: the schemas already say `integer` / `int64`, so `contract-drift` must stay green with no spec change.

## Guardrail answers (scope.md §6)
1. Trace: api-conventions (wrong type → 400), validation-rules (`version` integer), T-M2.9 QA F3, DEC-105, DEC-144 (3). 2. Drift toward excluded
scope: no. 3. Mandatory set-up: none. 4. Weekly use: every edit the tutor saves passes this binding. 5. Hard-coded semantics: none.

## Design notes
- **Touched:** `backend/src/main/java/com/englms/shared/web/` (one configuration class, or the customizer added to an existing one there);
  tests in `students` (web tutor integration tests) and `identity` (`AuthApiIntegrationTest`). No endpoint, DTO, migration, authz registry or
  frontend change.
- **Error path:** a refused coercion is a Jackson `MismatchedInputException` / `InvalidFormatException`, which Spring wraps in
  `HttpMessageNotReadableException`; `ProblemDetailsAdvice` (a `ResponseEntityExceptionHandler`) maps the 400 to `MALFORMED_REQUEST` through `codeFor` (the same path as unparseable JSON).
  The implementer confirms it with the tests; the body is the standard problem (no field echo, no Jackson message, `requestId` present).
- **Other readers of JSON:** the customizer changes only the Spring-managed mapper. The implementer lists every other place that deserialises
  JSON (e.g. `AuditService`'s mapper, Hibernate's JSON format mapper for `custom_fields`, the session store) and states whether it uses that
  mapper; a stored-JSON reader that does must still read every value already written (the existing tests cover it; the summary names them).
- **The web client** sends `version` as the number it received (`web/src/features/students/api`), never a string (grep at G0: no
  string `version` in `web/src`, `e2e/`, `qa/` or backend tests), so no kept assertion changes.
- **Burst test design (S2-1 without a clock):** wrap the `PasswordEncoder` bean in the test (e.g. `@MockitoSpyBean` or a test configuration) so
  that the 30 wrong-password attempts on `tutor.one` park inside `matches()` on a latch. While all 30 are parked (wait until 30 have entered, with
  a polling wait, L-05): (a) the unrelated user `student.c` signs in and gets 200; (b) from a separate JDBC connection,
  `SELECT 1 FROM app.user_account WHERE username = 'tutor.one' FOR UPDATE NOWAIT` succeeds (no row lock is held across the hash); (c) inside
  each parked `matches()` call, no transaction is active on that thread (`TransactionSynchronizationManager.isActualTransactionActive()` is
  false). Then release the latch; all 30 answer 401. A bounded await (e.g. 30 s) only detects a hang, it is not a speed bound, and the failure
  message says which of (a)–(c) failed. The unknown-username comparison burst is no longer needed.
- **Contradiction scan (L-03):** api-conventions and validation-rules agree with the change; no kept test sends a fractional or string integer;
  `security.md` §6 (1 MB limit) uses the factory customizer, untouched. The old burst test's comparison and its DEC-093 mutation record are
  replaced by AC7's mutation, recorded in the summary.
- **Shortcut ledger:** `LoginThrottle` (`ponytail:`) is in the login path but its trigger (multi-instance) does not fire. No other marker in the
  touched area.
- **A real defect found by a new check** outside this scope (L-10): reported at once as an OQ, `test.fail`-style disabling only until the LC
  rules, and the LC rules before G3.

## Domain rules (request binding on write endpoints; no new writes)
- Invariants: unchanged. A refused body fails before the application service runs, so no transaction starts and nothing is written.
- Concurrency: the `version` rule is unchanged (a stale integer → 409 `STALE_VERSION`); a non-integer `version` never reaches it.
- The DEC-103 exception stays: the learning-profile `PUT` takes `version` `null` or absent for the first creation; `"0"`, `0.0` and `""` are
  refused like everywhere else.
- Audience: tutor endpoints only in the tests; the binding rule also applies to `/api/v1/student/**` and `/api/v1/auth/**` bodies (one mapper).

## Acceptance criteria
- AC1 (api-conventions, QA F3): `PATCH /api/v1/tutor/students/{sid}` with `version` `0.7`, `3.9`, `1.0`, `1e0`, `"1"`, `""` or `true` answers 400
  `MALFORMED_REQUEST` with the standard problem body; the student row and its `version` are unchanged (read back).
- AC2: the same table on `PATCH /api/v1/tutor/guardians/{gid}`: 400 `MALFORMED_REQUEST`, guardian unchanged.
- AC3: the same table on `PUT /api/v1/tutor/students/{sid}/learning-profile` with an existing profile and on a first creation; `null` and an absent
  `version` still create the first profile (DEC-103).
- AC4 (positive controls): on each of the three endpoints an integer `version` equal to the current one succeeds as before, and a stale integer still
  answers 409 `STALE_VERSION`.
- AC5 (one mechanism): the rule lives in one configuration in `shared/web`; a unit test on the Spring-managed `JsonMapper` shows a record with an
  `int`, a `long` and a `Long` component refusing `0.7` and `"1"` and accepting `1` and (for `Long`) `null`. Proven red: the same test fails with the
  customizer removed (summary records the run, §4.5).
- AC6 (S2-1, no clock): `anUnrelatedLoginStaysFastDuringABurstOnOneUsername` (renamed if the implementer likes, the javadoc keeps the S2-1 reference)
  checks (a)–(c) of the Design notes while the burst is parked, with no assertion on elapsed time.
- AC7 (mutation, L-01): with bcrypt moved back under the row lock or inside the login transaction (a local, uncommitted change), AC6 fails; the
  summary records the mutation and the failing output.
- AC8: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept; `contract-drift` green with no OpenAPI change.

## Test plan
- Implementation: AC5 unit test; AC1–AC4 integration tests (Testcontainers, table-driven); AC6 in `AuthApiIntegrationTest`; AC6 run ×20 locally
  (it replaces a flake; summary records 20/20) and the AC7 mutation.
- Independent QA focus (black-box, after SEC): probe the three endpoints and also `POST /api/v1/tutor/students`, the status `PATCH`, the guardian
  `POST`, and the sign-in body (`rememberMe` is `Boolean`: out of scope, note what it does) with fractions, exponents, strings, empty strings,
  booleans, `null` and huge integers; confirm no row changed after a refusal and the problem body leaks no input; repeat AC6 ×20.
- SEC focus: the AC6 test still proves S2-1 (no lock, no transaction, no pooled connection the unrelated login needs across the hash); the global
  mapper change opens no other parse path (e.g. a coercion that now fails into a 500); no other JSON reader broke.
- Authz/isolation: no new endpoint; the existing matrix and isolation harnesses stay green.

## Evidence required
- `evidence/T-M2.10/summary.md` (self-check list, the JSON-reader list, the AC5 and AC7 red runs, AC6 ×20, the G3 cost table), one gate log on the
  final head + green CI, `review/security.md` (SEC) and `qa/report.md` (QA, own PR).
- The gate AC reads: "`./scripts/gate.sh` green once on the final head and CI green; existing assertions kept".

## Docs to update
- `docs/04-backend/api-conventions.md`: one sentence under 400 `MALFORMED_REQUEST`: integer fields take JSON integers only (no fraction, no string).
- `docs/04-backend/validation-rules.md` `version` row: "a JSON integer ≥ 0 (a fraction or string is 400 `MALFORMED_REQUEST`)".
- No api-catalog or data-model change.

## Risks & assumptions
- Assumption: no client sends integers as strings (grep at G0). If the web client ever does, its request fails loudly (400), which is the intent.
- Risk: a stored-JSON reader shares the mapper and meets an old value written as a float or string; mitigated by the Design-notes list and the full
  backend test suite.
- Risk: the latch design deadlocks the test itself if `matches()` is called on the unrelated login too; park only the burst's calls (by password or
  username).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd backend && ./mvnw -q test -Dtest='AuthApiIntegrationTest')
(cd backend && for i in $(seq 20); do ./mvnw -q test -Dtest='AuthApiIntegrationTest#anUnrelatedLogin*' || break; done)
./scripts/gate.sh
```
