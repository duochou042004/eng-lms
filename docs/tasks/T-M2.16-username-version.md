# T-M2.16: A username change bumps the student version (concurrent edits)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft |
| Owner role | BE (backend-implementer; QA at G3) |
| Branch | `fix/T-M2.16-username-version` (from `develop`) |
| Depends on | T-M2.14 (merged, `6073e71`, DEC-127); T-M2.10 (merged, `6cca511`, DEC-186) |
| Estimate | ≤ 0.5 agent-day |
| Risk tier | **M**: product behaviour of one write endpoint changes (the `version` answer of `PATCH /tutor/students/{sid}`); no `identity` code, authz, endpoint, migration or UI change, so no SEC trigger (quality-gates G3). One fresh QA reviewer (qa-protocol §2a; the UX checklist does not apply: no UI change) |
| Trace | FR-STU-03 (edit profile and username); DEC-124 (8) (the gap, routed here); DEC-125 (T-M2.14 G0 D-6); api-conventions §"Concurrency" (stale `version` → 409 `STALE_VERSION`); lessons L-03 (contradiction scan), L-04 (domain rules, one concurrent-update test per writable aggregate); DEC-185 (2) and DEC-187 (PO order) |

## Goal
Two tabs that change only a student's username from the same `version` both succeed today: the username lives on the account, so the student row
and its `version` stay as they were, the second tab's stale `version` still matches, and the last rename wins silently (DEC-124 (8)). After this
packet a committed username change bumps the student's `version` like any other edit, so the second tab gets 409 `STALE_VERSION` and the web
client's existing "This was changed elsewhere" dialog (T-M2.14) shows.

## Scope
- In:
  1. `StudentService.update` (`students.internal.app`): when the PATCH changes the username (the normalised new username differs from the current
     one, the existing condition before `accounts.changeUsername`), the student row is touched in the same transaction: `updatedAt` = now,
     `updatedBy` = the tutor, and JPA's `@Version` increments once (a new `Student` method beside `apply`, e.g. `accountChanged(actor, now)`). A PATCH
     that changes profile fields and the username bumps `version` once, not twice.
  2. The concurrent case: two username-only PATCHes from the same `version` → exactly one 200 and one 409 `STALE_VERSION`, in every interleaving
     (Domain rules: the second either fails `checkVersion` or fails the optimistic-lock flush, which `ProblemDetailsAdvice` already maps to 409
     `STALE_VERSION`); the 409 rolls back its account rename and records no `USERNAME_CHANGED` audit.
  3. The kept assertions and records that state the old behaviour, changed by DEC-187 (Design notes, contradiction scan).
- Out of scope (explicit):
  - Any other endpoint: status changes, password reset (it changes the account, not the profile; it is not a concurrent-edit conflict and keeps
    `version` as today), guardians, learning profile.
  - An account-level `version` or a new field in the student DTO.
  - The web edit form: it already stores each write's answer (`useStoreStudent`, `web/src/features/students/api/students.ts`) and sends the stored
    `version`, and it already shows the conflict dialog on any `STALE_VERSION`. No UI, i18n or E2E change; if the implementer finds a web path that
    sends a `version` it did not get from the latest answer, it is an OQ (L-10), not code.
  - The race in which both tabs rename to the **same** username (the later one may read the committed name and answer 200 as a no-op with the
    `version` it loaded): same end state, no lost update; accepted, recorded in Domain rules.
  - T-M2.33's scalar coercions.

## Guardrail answers (scope.md §6)
1. Trace: FR-STU-03, DEC-124 (8). 2. Drift toward excluded scope: no. 3. Mandatory set-up: none. 4. Weekly use: every profile edit by the tutor.
5. Hard-coded semantics: none.

## Design notes
- **Touched:** `backend/src/main/java/com/englms/students/internal/domain/Student.java` (one method; the `apply` javadoc says a username-only PATCH
  keeps `version`: reword), `students/internal/app/StudentService.java` (`update`); tests in `backend/src/test/java/com/englms/students/`; the web
  test fake `web/src/test/students.ts` and one comment in `web/src/features/students/api/students.ts`; `docs/04-backend/api-catalog.md` row
  `GET / PATCH /tutor/students/{sid}`. No `identity` change: `AccountService.changeUsername` keeps its row lock (`findForUpdateById`) and checks.
- **Why it is race-safe:** the request loads the student, checks `version`, then `changeUsername` locks the account row. A second request that
  loaded the same `version` either sees the committed bump at `checkVersion` (409) or waits on the account lock and then fails the student
  `UPDATE … WHERE version = ?` at `students.flush()` (Hibernate optimistic lock → Spring's `ObjectOptimisticLockingFailureException` →
  `ProblemDetailsAdvice.handleOptimisticLock` → 409 `STALE_VERSION`). Either way the transaction rolls back, the account rename included, and
  `StudentEventsListener` (`@TransactionalEventListener`, after commit) records nothing.
- **Contradiction scan (L-03),** each changed by DEC-187:
  - `StudentsApiIntegrationTest.aUsernameOnlyOrNoOpPatchKeepsVersionAndUpdatedAt` (line ~261): the rename part now expects `version` 1 and a moved
    `updatedAt`; the no-op part is kept (a PATCH with equal values keeps `version` and `updatedAt`) and sends the `version` the rename returned.
    Rename the test to match (e.g. `aUsernameChangeBumpsVersionAndANoOpPatchKeepsIt`).
  - `StudentsApiIntegrationTest` line ~508–511 ("the student row and its version are unchanged"): the rename now answers `version` 1; the
    same-username repeat sends `version` 1 and stays 200 with no new event (kept).
  - `StudentCreateRaceTest` line ~155 (a rename to a taken username, `version` 0): unchanged (409 `USERNAME_TAKEN` writes nothing).
  - `web/src/test/students.ts` lines ~96 and ~153–154 (the fake bumps `version` except for a username-only PATCH): it bumps for every changing
    PATCH; any web unit test that relied on the old rule is updated to the new answer, never weakened.
  - `web/src/features/students/api/students.ts` line ~100 comment ("a username-only PATCH keeps it"): reworded.
  - api-catalog row (above): "and, alone, leaves `version` as it is" → "a username change bumps `version` like any other change".
  - interaction-states, api-conventions, module-boundaries, security.md: no conflict (the 409 rule is the existing one; no module boundary
    crossed: `students` already calls `AccountApi`). `grep -rnE '(shortcut|ponytail):'` in the touched files: none.

## Domain rules (one writable aggregate: the student and its account username)
- Invariants: a committed change to the student's profile, contacts, note or username increments `version` by exactly 1 and sets `updatedAt` /
  `updatedBy`; a PATCH that changes nothing (equal values, same username) writes nothing and keeps both.
- Transitions of `PATCH /tutor/students/{sid}` (`v` = the current version):

  | Request | Answer | Row and account |
  |---|---|---|
  | `version` = v, profile fields changed | 200, `version` v+1 | profile written |
  | `version` = v, only the username changed | 200, `version` v+1 (**new**) | account renamed, `updatedAt` = now, audit `USERNAME_CHANGED` |
  | `version` = v, profile fields and the username changed | 200, `version` v+1 (once) | both written, one audit |
  | `version` = v, equal values or the same username | 200, `version` v | nothing written, no audit |
  | `version` ≠ v (any fields) | 409 `STALE_VERSION` | nothing written |
  | `version` = v, username taken | 409 `USERNAME_TAKEN` (`errors[0].field` `username`) | nothing written |
  | `version` = v, invalid fields | 422 field codes | nothing written |
  | concurrent username-only PATCHes from v, different usernames | one 200 (v+1), one 409 `STALE_VERSION` | the winner's rename, one audit |
  | concurrent PATCHes from v renaming to the same username | 200 + 200 or 200 + 409 (accepted, Out of scope) | one rename, one audit |
- Concurrency: optimistic `@Version` on the student; the account row lock (`findForUpdateById`) is held only inside the transaction, never across
  bcrypt (no password work on this path).
- Idempotency: a repeated identical PATCH after success is a stale `version` (409) unless it sends the returned `version`; then it is a no-op.
- Transaction: one (`StudentService.update`); event `StudentUsernameChanged` after commit only.
- Time: `updatedAt` from the injected `Clock` (UTC instant).
- Audience: tutor endpoint only; the student DTO is unchanged. The student's own sessions stay valid after a rename (FR-STU-03, kept).

## Acceptance criteria
- AC1 (the gap): a student at `version` v; `PATCH` `{version: v, username: "a.new"}` → 200, `version` v+1, `updatedAt` = the clock's now, the
  account's username `a.new`; a second `PATCH` `{version: v, username: "b.new"}` → 409 `STALE_VERSION`, and the username stays `a.new` (read back),
  with one `USERNAME_CHANGED` audit row.
- AC2 (no-op kept): `PATCH` with the current `version` and the same username (any case/spacing that normalises equal) → 200 with `version` and
  `updatedAt` unchanged and no audit row; the equal-values profile PATCH of the existing test likewise.
- AC3 (one bump): `PATCH` `{version: v, note: "x", username: "c.new"}` → 200 with `version` v+1 (not v+2).
- AC4 (concurrent, L-04): two username-only PATCHes from the same `version` with different usernames, released together (latch or barrier, no
  sleeps, no wall-clock bound, L-05), repeated ≥ 20 times in the test: each round exactly one 200 and one 409 `STALE_VERSION`; the final username is
  the 200's; one `USERNAME_CHANGED` audit row per round; the student's `version` is v+1.
- AC5 (proven red, L-01): with the new `Student` call removed locally (uncommitted), AC1 and AC4 fail; the summary records the run.
- AC6 (kept behaviour): a taken username still answers 409 `USERNAME_TAKEN` with nothing written; the renamed student's existing session still
  works and shows the new username (existing test kept).
- AC7 (records): the kept assertions and the api-catalog row change exactly as listed in Design notes; the web fake bumps `version` for every
  changing PATCH and `pnpm --dir web test` stays green.
- AC8: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept except those DEC-187 changes; `contract-drift` green
  with no OpenAPI change.

## Test plan
- Implementation: AC1–AC3, AC6 in `StudentsApiIntegrationTest` (Testcontainers, the test clock); AC4 as its own race test beside
  `StudentCreateRaceTest` (two threads, a start latch, 20 rounds on fresh students); AC5 mutation run; web unit tests for AC7.
- Independent QA focus (black-box, API through the running app as the tutor): AC1–AC4 by hand with two sessions; the edit form in the browser
  renaming in two tabs (the second shows "This was changed elsewhere"; Reload shows the winner's username) at 1280 only (no UI change);
  status change and password reset after a rename still use the returned `version`; exploratory: rename back and forth, case-only renames, rename
  plus a profile field, a rename racing a status change.
- Authz/isolation: no new endpoint; the matrix and isolation harnesses stay green.

## Evidence required
- `evidence/T-M2.16/summary.md` (self-check list, the AC5 red run, the AC4 rounds, the G3 cost table), one gate log on the final head (trimmed to
  ≤ 300 lines, every `gate:` line kept) + green CI, `qa/report.md` (QA, own `qa/T-M2.16` PR).
- The gate AC reads: "`./scripts/gate.sh` green once on the final head and CI green; existing assertions kept".
- No regression workflow run (no UI change).

## Docs to update
- `docs/04-backend/api-catalog.md` row `GET / PATCH /tutor/students/{sid}` (Design notes).
- No api-conventions, validation-rules, data-model or OpenAPI change.

## Risks & assumptions
- Assumption: no client depends on a username-only PATCH keeping `version`; the web client stores every answer (grep at G0: only the fake server and
  one comment state the old rule).
- Risk: the optimistic-lock failure surfaces outside `ProblemDetailsAdvice` (e.g. thrown at commit, after the controller) and becomes a 500; AC4 would
  show it. The explicit `students.flush()` inside the service keeps it inside the transaction body; the implementer keeps that flush.
- Risk: AC4 flakes on the 2-core runner; it must assert outcomes only, never timing.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd backend && ./mvnw -q test -Dtest='StudentsApiIntegrationTest,StudentUsernameRaceTest')
pnpm --dir web test
./scripts/gate.sh
```
