# T-M2.16: A username change bumps the student version (concurrent edits)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready (G0: `DOCS-REVIEW T-M2.16-packet`, DEC-187) |
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
  1. `StudentService.update` (`students.internal.app`): when the PATCH changes the username (the **existing** condition before
     `accounts.changeUsername`, `!username.strip().equals(currentUsername)`: strip only, case-sensitive, so a case-only rename is a change, as
     today), the student's `version` increments by exactly 1 in the same transaction, **independently of field values and of the clock**
     (G0 S2-1: a bump through `updatedAt` relies on dirty checking and does nothing when the instant is unchanged). Mechanism (Design notes): an
     explicit forced increment, **after** `accounts.changeUsername` (lock order account → student, as `changeStatus`), only when the profile part did
     not already change the row (`Student.apply` reports whether it changed anything), so a PATCH that changes profile fields and the username bumps
     `version` once, not twice. A username-only change leaves `updatedAt` / `updatedBy` as they are (they describe the student row's profile; the
     `USERNAME_CHANGED` audit records who renamed and when), so the kept `updatedAt` assertion stays.
  2. The concurrent case: two username-only PATCHes from the same `version` → exactly one 200 and one 409 `STALE_VERSION`, in every interleaving
     (Domain rules: the second either fails `checkVersion` or fails the versioned write after the account lock, which must surface as Spring's
     `OptimisticLockingFailureException`, already mapped by `ProblemDetailsAdvice` to 409 `STALE_VERSION`); the 409 rolls back its account rename and records no `USERNAME_CHANGED` audit.
  3. The kept assertions and records that state the old behaviour, changed by DEC-187 (Design notes, contradiction scan).

## Out of scope (explicit)
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
- **Touched:** `backend/src/main/java/com/englms/students/internal/domain/Student.java` (`apply` returns whether it changed the row; its javadoc
  says a username-only PATCH keeps `version`: reword), `students/internal/persistence/StudentRepository.java` (the forced increment, if done there), `students/internal/app/StudentService.java` (`update`); tests in `backend/src/test/java/com/englms/students/`; the web
  test fake `web/src/test/students.ts` and one comment in `web/src/features/students/api/students.ts`; `docs/04-backend/api-catalog.md` row
  `GET / PATCH /tutor/students/{sid}`. No `identity` change: `AccountService.changeUsername` keeps its row lock (`findForUpdateById`) and checks.
- **The forced increment (G0 S2-1):** the implementer picks one and proves it with AC1/AC4 at an unchanged clock instant:
  (a) a JPA `PESSIMISTIC_FORCE_INCREMENT` lock on the loaded student (Hibernate issues the versioned `UPDATE … SET version = version + 1 WHERE id = ?
  AND version = ?` at once, inside the service body), called through a Spring Data repository method (`@Lock` on a finder, beside the existing
  `PESSIMISTIC_WRITE` one) so a stale version is translated to `ObjectOptimisticLockingFailureException`, not left a raw
  `jakarta.persistence.OptimisticLockException` (which `ProblemDetailsAdvice` does not map: a 500); or (b) a `@Modifying` versioned update that
  must change exactly one row (0 rows → `OptimisticLockingFailureException`), keeping the managed entity's `version` in step (or reading it back)
  so the answer shows v+1 and a later flush does not fail. **Not** `OPTIMISTIC_FORCE_INCREMENT` (applied at transaction completion: a failure
  after the controller, a 500). The implementer verifies the Hibernate 7 / Spring Data behaviour against the reference docs and cites them in the PR (§9).
- **Why it is race-safe:** the request loads the student, checks `version`, then `changeUsername` locks the account row. A second request that
  loaded the same `version` either sees the committed bump at `checkVersion` (409) or waits on the account lock and then fails its versioned
  student write at the first one after the lock: the profile `UPDATE` flushed by identity's `accounts.saveAndFlush` in `changeUsername` (a
  username + profile PATCH; translated by that repository), or the forced increment (a username-only PATCH). Either way it is Spring's
  `ObjectOptimisticLockingFailureException` → `ProblemDetailsAdvice.handleOptimisticLock` → 409 `STALE_VERSION`. Either way the transaction rolls back, the account rename included, and
  `StudentEventsListener` (`@TransactionalEventListener`, after commit) records nothing.
- **Contradiction scan (L-03),** each changed by DEC-187:
  - `StudentsApiIntegrationTest.aUsernameOnlyOrNoOpPatchKeepsVersionAndUpdatedAt` (line ~261): the rename part now expects `version` 1 (its
    `updatedAt` check is kept: unchanged); the no-op part is kept (a PATCH with equal values keeps `version` and `updatedAt`) and sends the `version` the rename returned.
    Rename the test to match (e.g. `aUsernameChangeBumpsVersionAndANoOpPatchKeepsIt`).
  - `StudentsApiIntegrationTest` line ~508–511 ("the student row and its version are unchanged"): the rename now answers `version` 1; the
    same-username repeat sends `version` 1 and stays 200 with no new event (kept).
  - `StudentCreateRaceTest` line ~155 (a rename to a taken username, `version` 0): unchanged (409 `USERNAME_TAKEN` writes nothing).
  - `web/src/test/students.ts` lines ~96 and ~153–154 (the fake bumps `version` except for a username-only PATCH): it bumps for every changing
    PATCH, exactly: it bumps whenever the body has any field besides `version` (it does not model the server's no-op, as today); any web unit test that relied on the old rule is updated to the new answer, never weakened.
  - `web/src/features/students/api/students.ts` line ~100 comment ("a username-only PATCH keeps it"): reworded.
  - api-catalog row (above): "and, alone, leaves `version` as it is" → "a username change bumps `version` like any other change".
  - interaction-states, api-conventions, module-boundaries, security.md: no conflict (the 409 rule is the existing one; no module boundary
    crossed: `students` already calls `AccountApi`). `grep -rnE '(shortcut|ponytail):'` in the touched files: none.

## Domain rules (one writable aggregate: the student and its account username)
- Invariants: a committed change to the student's profile, contacts, note or username increments `version` by exactly 1, whatever the clock;
  a profile change sets `updatedAt` / `updatedBy`, a username-only change does not; a PATCH that changes nothing (equal values, the same
  username after strip) writes nothing and keeps both.
- Transitions of `PATCH /tutor/students/{sid}` (`v` = the current version):

  | Request | Answer | Row and account |
  |---|---|---|
  | `version` = v, profile fields changed | 200, `version` v+1 | profile written |
  | `version` = v, only the username changed | 200, `version` v+1 (**new**) | account renamed, `updatedAt` unchanged, audit `USERNAME_CHANGED` |
  | `version` = v, a case-only rename (`Renamed.Student` for `renamed.student`) | 200, `version` v+1 (**new**) | display case stored, audit (as today) |
  | `version` = v, profile fields and the username changed | 200, `version` v+1 (once) | both written, one audit |
  | `version` = v, equal values or the same username after strip | 200, `version` v | nothing written, no audit |
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
- AC1 (the gap): a student at `version` v; at the **same clock instant** as the create (no `clock.advance`), `PATCH`
  `{version: v, username: "a.new"}` → 200, `version` v+1, `updatedAt` unchanged, the account's username `a.new`; a second `PATCH` `{version: v, username: "b.new"}` → 409 `STALE_VERSION`, and the username stays `a.new` (read back),
  with one `USERNAME_CHANGED` audit row.
- AC2 (no-op kept, case kept): `PATCH` with the current `version` and the same username (surrounding spaces only) → 200 with `version` and
  `updatedAt` unchanged and no audit row; the equal-values profile PATCH of the existing test likewise. A case-only rename is a change: 200,
  `version` v+1, the new display case, one audit row.
- AC3 (one bump): `PATCH` `{version: v, note: "x", username: "c.new"}` → 200 with `version` v+1 (not v+2).
- AC4 (concurrent, L-04): two username-only PATCHes from the same `version` with different usernames, released together (latch or barrier, no
  sleeps, no wall-clock bound, L-05), on fresh students without advancing the clock, repeated ≥ 20 times in the test: each round exactly one 200 and one 409 `STALE_VERSION`; the final username is
  the 200's; one `USERNAME_CHANGED` audit row per round; the student's `version` is v+1.
- AC5 (proven red, L-01): two local, uncommitted mutations: (i) the forced increment removed → AC1 and AC4 fail; (ii) the increment forced
  unconditionally (the `apply` result ignored) → AC3 fails with v+2; the summary records both runs.
- AC6 (kept behaviour): a taken username still answers 409 `USERNAME_TAKEN` with nothing written; the renamed student's existing session still
  works and shows the new username (existing test kept).
- AC7 (records): the kept assertions and the api-catalog row change exactly as listed in Design notes; the web fake bumps `version` for every
  changing PATCH and `pnpm --dir web test` stays green.
- AC8: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept except those DEC-187 changes; `contract-drift` green
  with no OpenAPI change.

## Test plan
- Implementation: one table-driven test (L-04) over the Domain-rules rows of a single PATCH (rename, rename + profile, case-only rename, same
  username, equal values, stale, taken, invalid), each row asserting status, `version`, `updatedAt`, username and audit count, at an unchanged
  clock instant; AC6 in `StudentsApiIntegrationTest` (Testcontainers, the test clock); AC4 as its own race test beside
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
- Risk: the stale-version failure surfaces as something `ProblemDetailsAdvice` does not map and becomes a 500: a raw
  `jakarta.persistence.OptimisticLockException` from a direct `EntityManager` call, or a failure at commit (`OPTIMISTIC_FORCE_INCREMENT`). The
  Design notes' mechanism rules both out; AC4 shows it if not.
- Risk: AC4 flakes on the 2-core runner; it must assert outcomes only, never timing.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd backend && ./mvnw -q test -Dtest='StudentsApiIntegrationTest,StudentUsernameRaceTest')
pnpm --dir web test
./scripts/gate.sh
```
