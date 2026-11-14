# T-M2.28: Regression and tooling follow-ups before the M2 G5

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft |
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
    `E2E Paging ${project}` (`pagingSet`, ≈ line 302) and searches that text. On `phone` the search `E2E Paging phone` also matches
    `E2E Paging phone-small …`, so with both projects in one database it sees 52 students and reads "Trang 1 / 3" instead of "Trang 1 / 2".
    Fix: a project prefix that no other project's prefix contains (e.g. `E2E Paging [phone]`), keeping the 26 rows, the page size and every
    assertion. Old rows under the former prefix stay in any kept database and must not be counted (the new search text excludes them).
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
    the font requests of the first load. Fix in the test, not the guard: before the reload wait until the page's fonts settle
    (`document.fonts.ready` read through a polling assertion), so no request is in flight when the reload starts. The console guard
    (`support/fixtures.ts`) is **not** given an allow-list. If the abort still happens with no font in flight, report it (OQ).
  - **(d) `e2e-run.sh` fresh mode and Spring's other datasource variables** (T-M2.25 G3 S4): in fresh mode the script rewrites
    `SPRING_DATASOURCE_URL` to the per-run `englms_e2e` database, but a `.env` that sets `SPRING_DATASOURCE_HIKARI_*` or
    `SPRING_FLYWAY_URL` could still point Flyway or the pool elsewhere (unverified on Boot 4.1). **Verify first** against Boot 4.1's
    property binding (official docs, or a stub run): if either can override the rewritten URL, fresh mode refuses to start with a message
    naming the variable (fail closed); if neither can, record the evidence and change nothing. Either way one `e2e-run.test.sh` case pins it.
  - **(e) The `e2e-run.test.sh` race** (DEC-170): "keeps the host and parameters, replaces only the database name"
    (`scripts/tests/e2e-run.test.sh:88`) reads `app2.env` before the java stub has written it, and failed once in CI on PR #175. Fix: wait
    for the file (bounded, then fail with a clear message), never a fixed sleep.
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
- AC1 ((a1)): with `phone` and `phone-small` in one run against one database, `students-list.spec.ts` "AC2/AC3/AC4/AC10 …" passes on both;
  the old form is shown failing on that setup (the evidence names the command and the "Trang 1 / 3" read); its assertions are unchanged
  (`git diff` shows only the prefix).
- AC2 ((a2)): the column-shares test is skipped on every project under 768 px with a reason, runs on `tablet`, `tablet-land`, `laptop`,
  `desktop` and passes; the evidence names the tests that cover the card list below 768.
- AC3 ((b)): the evidence states the diagnosed cause with its proof (the injecting element or stack, the engine, the run ID). If it is a
  test or engine-setup cause, the four `webkit-smoke` tests pass in a `regression` run on the branch. If it is a product cause, the OQ is
  raised before G3 and the LC's ruling (a new row) is in the DEC; the four tests are then left as they are, failing, and named in the summary.
- AC4 ((c)): the `firefox-smoke` deep-link reload tests pass in a `regression` run on the branch with the console guard unchanged
  (`git diff e2e/support/fixtures.ts` empty); the old form's failure is shown or its cause quoted from run 43444433118.
- AC5 ((d)): the Boot 4.1 binding fact is recorded with its source; `e2e-run.test.sh` has a case that fails on the wrong behaviour (an
  override passing silently, or a refusal of a variable that cannot override) and passes on the final script.
- AC6 ((e)): the "keeps the host and parameters …" case waits for `app2.env`; a mutation that removes the wait is shown failing under an
  injected delay; `e2e-run.test.sh` ×20 green.
- AC7 ((f)): `--repeat-each=50 --retries=0` on laptop on the final head: 50/50, or the diagnosed cause with its proof and either the test fix
  (then 50/50) or the OQ and the LC ruling before G3.
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
  G3 cost table; one gate log on the final head (trimmed); CI green; the `regression` run ID and result. G3: `review/docs.md` on the records
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
