# T-M2.28: Regression and tooling follow-ups before the M2 G5

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`a1bcf12`, DEC-175) |
| Owner role | FE (frontend-implementer; E2E and scripts) |
| Branch | `chore/T-M2.28-regression-followups` (from `develop`) |
| Depends on | T-M2.25 (`b3cd6fd`), T-M2.24 (`90bbfe0`), T-M2.13 (`e3ce22c`): merged |
| Estimate | 1.5–2 agent-days |
| Risk tier | **L**: E2E specs, the E2E console guard's test usage, `scripts/` and their tests. No product code, endpoint, CSP, DTO, migration or UI change: a **product** cause found in (b) or (f) is reported as an OQ and becomes its own row (L-10). G3 = **one fresh adversarial docs-reviewer that also runs the changed specs and script suites** (as T-M2.24). It is a `chore/` branch, so `DOCS-REVIEW` is the merge verdict (merge-gate); the LC starts one `regression` run on the branch head before G3 and gives the reviewer its result |
| Trace | DEC-169 (the first `regression` run 43444433118, 7 failed), DEC-170, DEC-171 (OQ T-M2.24-1, G3 S3-1/S4-2), DEC-172, DEC-173 (split: (h), (i) to T-M2.29); DEC-158 PO-3 (the G5 matrix runs through `regression`); test-strategy §3 (flaky policy: never silently retried); lessons L-01, L-05, L-10; backlog row T-M2.28 |

## Goal
Make the M2 G5 regression trustworthy before it runs: the `regression` workflow goes green for the right reasons, the two known
test-tooling races stop, and the gate's support-import rule has the fixture it lacks. Every change keeps what each test proves; a
failure whose cause is the product, not the test, is reported, not hidden.

## Scope
- In (the backlog row's items; facts from run 43444433118 on `b3cd6fd`, before the T-M2.24 split, so file names below are today's):
  - **(a1) Paging set collides across projects.** `students-list.spec.ts` "AC2/AC3/AC4/AC10 …" builds 26 students under
    `E2E Paging ${project}` (`pagingSet`, ≈ line 302) and searches that text; the list search is a substring match on the normalised
    name (`StudentService.list`: `Like.contains(Usernames.normalize(q))`, accents stripped and lower-cased). Two pairs collide:
    `E2E Paging phone` also matches `E2E Paging phone-small …` (seen in run 43444433118: 52 students, "Trang 1 / 3" instead of
    "Trang 1 / 2"), and `E2E Paging tablet` also matches `E2E Paging tablet-land …` (it passed in that run only because `tablet` ran
    before `tablet-land` had created its set; on a kept database, as in the G5 `E2E_KEEP_DB=1` run, it fails on the second run).
    Fix: end the prefix with a delimiter, `E2E Paging ${project}:`. The rule: the prefix contains no regex metacharacter (the test
    uses it raw in `` new RegExp(`^${prefix} \\d\\d$`) ``, ≈ line 420), no LIKE wildcard, no project's prefix is a substring of another's
    (`phone:` is not in `phone-small:`, `tablet:` is not in `tablet-land:`), and no old name contains it (the old rows have no `:`, so
    the rows left under the former prefix in a kept database are not counted). The 26 rows, the page size and every assertion stay.
  - **(a2) The column-shares test runs where no table exists.** `students-list.spec.ts` "fixed column shares at 768, 1024 and 1280 …"
    (≈ line 496) skips only `phone-small`, but the table starts at 768 px (AC12 (t)), so on `phone` (390 px) it waits for 6 rows in a
    table that is never rendered. Fix: skip every project narrower than 768 px with the same reason text. This is not a weakened test: below
    768 the test could never pass and the card list is covered by its own tests (named in the evidence).
  - **(b) WebKit smoke: the shells never render.** On `webkit-smoke` the tutor and student `h1` are not found within 5 s (4 tests) and each
    logs "Refused to apply a stylesheet … style-src" plus a `style-src-elem` violation for an **inline** stylesheet; the CSP is
    `style-src 'self'` (`SecurityHeaders.java:15`). **Diagnose first** (which element injects the inline `<style>`, under which engine, and
    whether the `h1` failure is that refusal or a separate render failure) using the `regression` workflow (the LC starts it on the branch:
    WebKit's host libraries are not installed locally) or a local WebKit if the PO installs them. Then: an engine-setup or test cause is
    fixed here; a **product** cause (our code or a library injecting inline styles that a real Safari also refuses) is an OQ to the LC at
    once and its own row with the SEC trigger (CSP), never a CSP change here.
  - **(c) Firefox smoke: aborted font downloads count as console errors.** On `firefox-smoke` "a deep link survives a reload:
    /student/home" logs three `downloadable font: download failed … status=2152398850` (`NS_BINDING_ABORTED`) errors: the reload aborts
    the font requests of the first load. Fix in the test, not the guard: before the reload, wait for the `h1` to be visible (the shell
    renders only after `/auth/session`, and fonts are requested only once text that uses them renders), then poll
    `document.fonts.status` until it is `'loaded'` (a polling assertion, L-05), so no font request is in flight when the reload starts.
    `document.fonts.ready` alone is not enough: right after `load` it can resolve before any font request has started. Firefox aborting
    in-flight font loads on a reload does not affect a user; the guard stays as it is. The console guard
    (`support/fixtures.ts`) is **not** given an allow-list. If the abort still happens with no font in flight, report it (OQ).
  - **(d) `e2e-run.sh` fresh mode and Spring's other datasource variables** (T-M2.25 G3 S4): in fresh mode the script rewrites
    `SPRING_DATASOURCE_URL` to the per-run `englms_e2e` database, but a `.env` that sets `SPRING_DATASOURCE_HIKARI_*` or
    `SPRING_FLYWAY_URL` could still point Flyway or the pool elsewhere (unverified on Boot 4.1). **Verify first** against Boot 4.1's
    property binding: the official docs, or a real jar run against a throwaway database (a stub cannot show Boot's binding). Check at
    least `SPRING_DATASOURCE_HIKARI_JDBC_URL` / `SPRING_DATASOURCE_HIKARI_JDBCURL` (Boot creates the Hikari pool from the datasource URL,
    then binds `spring.datasource.hikari.*` onto it, so these very likely win), `SPRING_FLYWAY_URL`, `SPRING_FLYWAY_USER`; both the
    caller's environment and `.env` are in scope. If any can override the rewritten URL, fresh mode refuses to start with a message
    naming the variable (fail closed); if neither can, record the evidence and change nothing. Either way one `e2e-run.test.sh` case pins it.
  - **(e) The `e2e-run.test.sh` race** (DEC-170): "keeps the host and parameters, replaces only the database name"
    (`scripts/tests/e2e-run.test.sh:88`) failed once in CI on PR #175. The java stub (≈ line 66) writes `app2.env` in the background,
    the readiness `curl` stub (≈ line 18) succeeds at once, and `e2e-run.sh`'s `cleanup` trap kills the app when it exits, so the stub can
    be killed before it writes the file. A wait after the run would only turn the race into a timeout. Fix the cause: the stub is
    "ready" only after it has written its environment (the java stub writes a temp file and `mv`s it into place; the readiness stub
    succeeds only once `app2.env` exists and is non-empty, or the equivalent in `erun`'s stubs). This covers every read of `app2.env`
    (≈ lines 82, 88, 140, 145, 153, 158), not only line 88. No fixed sleep.
  - **(f) OQ T-M2.24-1: "AC6: … sign-out never asks" lands on `/login?next=…`.** `students-list.spec.ts:207` (laptop) failed once in
    about 21 runs: after Log out on a fresh sign-in context the URL was `/login?next=%2Ftutor%2Fstudents%2Fnew`, not `/login`. T-M2.13
    changed the logout and cross-tab paths since then. **Diagnose first**: run the test `--repeat-each=50 --retries=0` on laptop on
    today's code, and read the order of the logout's own navigation and the signed-out guard's redirect. A test cause is fixed here; a product
    cause (the user lands on `/login?next=` after their own logout) is an OQ to the LC at once (L-10).
  - **(g) The gate's support-import rule and `global-setup.ts`** (T-M2.24 G3 S3-1, S4-2): today a change to a support helper imported only
    by `e2e/support/global-setup.ts` has no `gate.test.sh` fixture, so a mutation that counts any importer as found survives the 92
    fixtures. Add: (g1) the fixture, seen failing on that mutation; (g2) a changed support file that reaches `global-setup.ts` (directly or
    through other support files) repeats **all** specs, since global setup runs before every spec, with its own fixture and the log line
    saying why (like DEC-170's "imported by no spec" line).
## Out of scope (explicit)
- T-M2.29 (the T-M2.13 UI follow-ups (h), (i), DEC-173), any product, CSP or UI change, T-M2.26, Dependabot #165 and #135, a
  Playwright or browser bump, new retries or raised timeouts, the G5 regression itself.

## Guardrail answers (scope.md §6)
1. **Trace:** the backlog row T-M2.28 (DEC-169, DEC-171), split by DEC-173. 2. **Drift toward excluded scope?** No: test and tooling
correctness. 3. **Mandatory setup added?** None for the tutor; locally WebKit stays optional (CI runs it). 4. **Weekly use?** The gate and
the E2E run on every task; the G5 relies on `regression`. 5. **Hard-coded semantics?** None.

## Design notes
- **Files:** `e2e/tests/students-list.spec.ts` ((a1), (a2), (f) if a test cause), `e2e/tests/smoke.spec.ts` ((b) if a test cause, (c)),
  `playwright.config.ts` only if (b) is an engine-setup cause, `scripts/e2e-run.sh` ((d) only if an override is proven),
  `scripts/tests/e2e-run.test.sh` ((d), (e)), `scripts/gate.sh` and `scripts/tests/gate.test.sh` ((g)); docs below.
- **Contradiction scan (L-03):** kept assertions that change: none. (a1) changes only the data prefix; (a2) changes only which projects
  run the test (the skip condition), and its assertions stay; (c) adds a wait before the reload; the console guard and its
  `checks.spec.ts` proofs stay as they are. `gate.sh`'s DEC-170 rule ("imported by no spec" → all specs) is kept; (g2) adds a reason to
  repeat all specs. test-strategy §3 (never silently retried) holds: no retry is added anywhere.
- **Shortcut ledger (L-12):** none fires (no `ui/`, `lib/time` or package change).

## Acceptance criteria
- AC1 ((a1)): with `phone-small`, `phone`, `tablet` and `tablet-land` in one run against one database, `students-list.spec.ts`
  "AC2/AC3/AC4/AC10 …" passes on all four, also on a second run against the same database. Fresh mode recreates `englms_e2e` on every run (`scripts/e2e-run.sh`), so both two-run steps (this one and the old-form order below) run with `E2E_KEEP_DB=1` on the `.env` database, as the G5 run does (it adds test rows there, never a purge).
  The old form is shown failing on that setup with the order pinned (the longer-named project's set created first, e.g. a first run of
  `phone-small` and `tablet-land` only, then `phone` and `tablet`); the evidence names the commands and the "Trang 1 / 3" read. Its
  assertions are unchanged (`git diff` shows only the prefix).
- AC2 ((a2)): the column-shares test is skipped on every project under 768 px with a reason, runs on `tablet`, `tablet-land`, `laptop`,
  `desktop` and passes; the evidence names the tests that cover the card list below 768.
- AC3 ((b)): the evidence states the diagnosed cause with its proof (the injecting element or stack, the engine, the run ID). If it is a
  test or engine-setup cause, the four `webkit-smoke` tests pass in a `regression` run on the branch. If it is a product cause, the OQ is
  raised before G3 and the LC's ruling (a new row) is in the DEC; the four tests are then left as they are, failing, and named in the summary.
- AC4 ((c)): the `firefox-smoke` deep-link reload tests pass in a `regression` run on the branch with the console guard unchanged
  (`git diff e2e/support/fixtures.ts` empty). The old form is seen failing first (L-01), in a `regression` run of the old form with
  `--repeat-each` on `firefox-smoke` (or locally if Firefox is installed); if it does not fail there in 20 repeats, the evidence says so
  and quotes run 43444433118 as the only observation (the LC rules on that exception before G3).
- AC5 ((d)): the Boot 4.1 binding fact is recorded with its source; `e2e-run.test.sh` has a case that fails on the wrong behaviour (an
  override passing silently, or a refusal of a variable that cannot override) and passes on the final script.
- AC6 ((e)): the stubs report ready only after `app2.env` is written, for every case that reads it; a mutation that removes that
  ordering is shown failing under an injected delay in the java stub; `e2e-run.test.sh` ×20 green.
- AC7 ((f)): always a written reading (file:line) of the order between the logout's own navigation (`useLogout` success path) and the
  signed-out guard's redirect, on today's code, saying whether a `/login?next=` landing after one's own logout is still possible; plus
  `--repeat-each=50 --retries=0` on laptop on the final head: 50/50 (at the old 1-in-21 rate a lucky 50/50 happens about 9 % of the
  time, so the reading is the proof, the run the check). A product cause is an OQ and the LC rules before G3.
- AC8 ((g)): `gate.test.sh` gains (g1) and (g2) with the mutation of (g1) and the old rule shown failing; the log line for (g2) names
  `global-setup.ts`; all earlier fixtures still pass.
- AC9: `./scripts/gate.sh` green once on the final head and CI green; one `regression` run on the branch head (started by the LC) is
  green, or red only on tests the LC ruled out under AC3/AC7; `scripts/tests/run-all.sh` PASS; all existing assertions kept.

## Test plan
- Implementation: the changed specs on the mandatory three plus `phone` (`./scripts/e2e-run.sh --project=phone-small --project=phone
  --project=tablet --project=laptop`), the script suites (`scripts/tests/run-all.sh`), the gate. Each old form or mutation is seen failing
  first (L-01). For (b) and (c), ask the LC to start `gh workflow run regression.yml --ref chore/T-M2.28-regression-followups` on a pushed
  head (the implementer does not push); the LC returns the run ID and the failing lines.
- **When a new check finds a real defect** outside this packet's allowed change (L-10): the implementer reports it at once as an OQ,
  `test.fail` only until the LC rules, and the LC rules before G3.
- Independent G3 (adversarial docs-reviewer): re-run (a1), (a2), (f) ×20 and the script suites; try the (g) and (e) mutations itself in a
  private clone; read the `regression` run; check that no assertion, guard or timeout was weakened.

## Evidence required
- `evidence/T-M2.28/summary.md` (recorded by the LC from the implementer's text, L-07): AC → proof, each diagnosis with its source, the
  self-check list (task-packet skill step 6) and the G3 cost table; one gate log on the final head (trimmed); CI green; the `regression` run ID and result. G3: `review/docs.md` on the records
  branch.

## Docs to update
- `docs/06-quality/test-strategy.md` only if (b), (c) or (f) changes a documented practice; `docs/07-operations/ci-cd.md` only if
  `regression` changes; `docs/07-operations/development-setup.md` for (d)'s refusal message if one is added; backlog (LC at merge).

## Risks & assumptions
- (b) may need several `regression` runs (≈ 30 min each); the LC batches them. If (b) is a product defect, the G5 waits for its row.
- A kept local database still holds rows under the old `E2E Paging <project>` prefix; the new prefix must not match them.
- The `regression` run uses an empty database per run; local runs use a fresh `englms_e2e` per run (T-M2.25).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
./scripts/e2e-run.sh --project=phone-small --project=phone --project=tablet --project=laptop tests/students-list.spec.ts tests/smoke.spec.ts
./scripts/e2e-run.sh --project=laptop --repeat-each=50 --retries=0 -g 'sign-out never asks' tests/students-list.spec.ts
bash scripts/tests/e2e-run.test.sh; bash scripts/tests/gate.test.sh; scripts/tests/run-all.sh
ENGLMS_TASK=T-M2.28 ./scripts/gate.sh
gh workflow run regression.yml --ref chore/T-M2.28-regression-followups   # LC only
./scripts/check-docs.sh
./scripts/check-path-ownership.sh chore/T-M2.28-regression-followups
```
