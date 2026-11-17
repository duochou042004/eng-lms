# T-M2.30: `e2e-run.sh` refusal gaps and the Firefox `Page crashed` recurrence

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 pending) |
| Owner role | FE (frontend-implementer; E2E, scripts and the `regression` workflow) with the LC (backlog row FE/LC) |
| Branch | `chore/T-M2.30-tooling-firefox-crash` (from `develop`) |
| Depends on | T-M2.28 (`a1bcf12`), T-M2.29 (`1d6ace4`): merged |
| Estimate | 1–1.5 agent-days (two to four `regression` runs of ~30 min) |
| Risk tier | **L**: `scripts/e2e-run.sh` and its tests, the `regression` workflow's diagnostics, E2E support. No product code, endpoint, CSP, DTO, migration or UI change: a **product** cause found in (c) is reported as an OQ at once and becomes its own row (L-10). G3 = **one fresh adversarial docs-reviewer that also re-runs the script suites** (`DOCS-REVIEW T-M2.30: PASS` on a `chore/` branch) |
| Trace | DEC-174 (4) and (5) (T-M2.28 G3 S4-1, S4-2; the Firefox crash ruling and its recurrence clause), DEC-179 ((c) added after regression run 44099902526); DEC-158 PO-3 (the G5 matrix runs through `regression`); test-strategy §3 (no silent retry); lessons L-01, L-05, L-08, L-10; backlog row T-M2.30 |

## Goal
Close the two refusal gaps that T-M2.28's G3 found in `e2e-run.sh` fresh mode. Then find the cause of the Firefox `Page crashed` that has
now failed the `regression` workflow in two of its last four runs, before the M2 G5 is signed off (DEC-174 (5)). Every change keeps
what each test proves. A cause in the product is reported, not hidden.

## Scope
- In:
  - **(a) Non-identifier names reach `java`.** The fresh-mode loop (`scripts/e2e-run.sh` ≈ lines 73–79) scans `compgen -e`. That list holds
    only shell-identifier names, so a caller's `env 'spring.flyway.url=…' ./scripts/e2e-run.sh` is never seen but still reaches the
    Boot app. `SPRING_CONFIG_IMPORT`, `SPRING_CONFIG_ADDITIONAL_LOCATION` and `JAVA_TOOL_OPTIONS=-Dspring.flyway.url=…` are not
    refused either. Fix, the implementer's choice of two:
    - scan the whole environment (`env -0`, normalising `.` and `-` like `_` and upper-casing) and refuse those names too; or
    - start `java` under `env -u` / a cleaned environment for the datasource and Flyway keys.
    Either way, any remaining gap is written in `docs/07-operations/development-setup.md` "E2E database" (the section T-M2.28 (d) edited).
  - **(b) "Any case" is untested.** Removing the `${var^^}` upper-casing survives all 127 cases of `scripts/tests/e2e-run.test.sh`. Add a
    lower-case caller case (for example `spring_flyway_url`) and show the upper-casing mutation failing it.
  - **(c) Firefox `Page crashed` (DEC-174 (5) recurrence).** The failing test is `[firefox-smoke] smoke.spec.ts:77` "login renders in vi
    and en":
    - Run 43611629190 on `a7a1e4d`: failed on both attempts.
    - Run 44099902526 on `141c763`: failed at `:114`, the second `expectNoAxeViolations` after the switch to English, inside axe-core's
      `runPartial` (`support/checks.ts:6`). That run had 1059 passed, 1 failed, 116 skipped, Firefox 159.0 (playwright firefox v1572).
    - Runs 43608039387 and 43617206392: green.

    Steps, in this order:
    1. **Capture the browser's own output.** The `regression` workflow writes the Firefox (and only the browsers') stdout/stderr to a file
       uploaded with `regression-playwright-report`, for example `DEBUG=pw:browser*` redirected to `e2e/test-results/browser.log`, or a
       launch option. Any crash reporter output (minidump note, `MOZ_CRASHREPORTER*`) goes into the same file. Prove the capture works with
       a temporary deliberate crash (for example `page.goto('about:crashcontent')` in a temporary spec block). The capture must be seen
       holding a crash line before the real runs count (L-01). Remove the block before the final head.
    2. **Reproduce.** Use one or more `gh workflow run regression.yml --ref chore/T-M2.30-tooling-firefox-crash` runs. A temporary spec
       block may repeat the login test on `firefox-smoke` (the workflow has no inputs). Note each run's runner image and memory headroom
       (for example `free -m` before and after the Playwright step).
    3. **Find the cause and rule.** Collect the evidence for each of the following, then name the cause in one of three ways: a test-tooling
       cause fixed here, a product cause (an OQ and its own row), or an engine/runner cause recorded with its evidence (an upstream issue
       link or the crash signature):
       - the content process running out of memory on the 2-core runner (axe `runPartial` on a large DOM after a language switch);
       - an axe-core / Firefox 159 incompatibility;
       - something on the page (a font load, the `lang` change mid-run).

       No retry, no `test.skip` and no `test.fail` on `firefox-smoke` without a DEC (test-strategy §3).
## Out of scope (explicit)
- Any product code, CSP or server change (a product cause is its own row). A Playwright, axe-core or Firefox version bump without a DEC.
  Making `regression` a required check, adding workflow inputs, or changing the CI scope or allow-list (DEC-158). T-M2.31's UI fixes.
  The M2 G5 sign-off itself (T-M2.7).

## Guardrail answers (scope.md §6)
1. **Trace:** backlog row T-M2.30 (DEC-174), (c) DEC-174 (5) + DEC-179. 2. **Drift toward excluded scope?** No: test and script tooling.
3. **Mandatory setup added?** None. 4. **Weekly use?** Every local E2E run (fresh mode) and every regression run. 5. **Hard-coded semantics?** None.

## Design notes
- **Files:**
  - `scripts/e2e-run.sh`, `scripts/tests/e2e-run.test.sh`;
  - `.github/workflows/regression.yml` (diagnostics only: an env var, a log path, the artifact `path` list);
  - `e2e/support/checks.ts` or `e2e/playwright.config.ts` only if the cause is a test-tooling one;
  - `docs/07-operations/development-setup.md`, `docs/07-operations/ci-cd.md` §1 (what the regression artifact now holds).
- **Contradiction scan (L-03):**
  - `e2e-run.test.sh`'s 127 cases are kept. Its "keeps the host and parameters" race fix (T-M2.28 (e)) and the three refusals from T-M2.28
    (d) stay.
  - `scripts/tests/ci-scope-workflows.test.sh` lists `regression` as manual-only. It must stay so (no trigger change).
  - `smoke.spec.ts:77`'s assertions are unchanged.
  - The `regression` artifact keeps its name and 5-day retention. Its contents must stay dev-only data: the app log and browser stderr, with
    no `.env` and no secrets.
- **Shortcut ledger (L-12):** none fires.

## Acceptance criteria
- AC1 ((a)): with a caller-set `spring.flyway.url=…` (a non-identifier name), `JAVA_TOOL_OPTIONS=-Dspring.flyway.url=…`,
  `SPRING_CONFIG_IMPORT` and `SPRING_CONFIG_ADDITIONAL_LOCATION`, fresh mode either refuses, naming the variable, or provably starts
  `java` without them. New `e2e-run.test.sh` cases, each seen failing on today's script. Any remaining gap is written in
  `development-setup.md`.
- AC2 ((b)): a lower-case caller case. Mutation: dropping the upper-casing fails it. All earlier cases pass.
- AC3 ((c) capture): the `regression` artifact holds the browsers' stderr. A temporary deliberate content crash on `firefox-smoke` shows
  a crash line in it (run id recorded). The block is gone from the final head.
- AC4 ((c) cause): a written finding in `evidence/T-M2.30/summary.md`, made of the reproducing runs (ids, attempts, runner image, memory),
  the captured crash text, and the cause named as tooling, product or engine with its evidence.
  - A tooling cause is fixed here and passes, from the final head, `firefox-smoke` ×20 through the workflow with no retry plus one full
    green `regression` run.
  - A product cause is an OQ with its own row, and the LC rules before G3.
  - An engine/runner cause is recorded with the crash signature and an upstream link if one exists, and the LC rules (DEC) how the G5
    treats it.
- AC5: `scripts/tests/run-all.sh` PASS; `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept, no
  retry, timeout or allow-list added.

**When a new check finds a real defect** outside this packet's allowed change (L-10): the implementer reports it at once as an OQ,
`test.fail` only until the LC rules, and the LC rules before G3.

## Test plan
- Implementation: `e2e-run.test.sh` new cases and mutations (AC1, AC2); the capture proof and the reproducing runs (AC3, AC4).
- Independent check (adversarial docs-reviewer): re-run `scripts/tests/run-all.sh` and `e2e-run.test.sh`; try to get a datasource or Flyway
  override past fresh mode by another route; read the captured crash text and judge whether the cause named follows from it; confirm the
  temporary blocks are gone and the artifact holds no secret.

## Evidence required
- `evidence/T-M2.30/summary.md` (recorded by the LC from the implementer's text, L-07): AC → proof, each failing-first observation, the
  regression run table, and the G3 cost table.
- One gate log on the final head (trimmed) + green CI. The logs of the mutations and runs go under `evidence/T-M2.30/`.
- The docs review in `review/docs.md` on the records branch.
- **PO actions:** downloading a `regression` artifact (the trace and the browser log, ~6 MB) is a download. The LC asks the PO once for the
  runs of this task.

## Docs to update
- `docs/07-operations/development-setup.md` "E2E database" (the refusal list and any gap); `docs/07-operations/ci-cd.md` §1 (the regression
  artifact's browser log); backlog (LC at merge).

## Risks & assumptions
- **The crash may not reproduce on demand**, since it failed 2 of the last 4 runs. Budget up to four runs. If none crashes, AC4 records that
  with the capture in place, and the LC rules (DEC) how the G5 run treats a crash: the G5 run then carries the capture.
- `DEBUG=pw:browser*` output may be large: write it to a file, not the job log.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
bash scripts/tests/e2e-run.test.sh
bash scripts/tests/run-all.sh
gh workflow run regression.yml --ref chore/T-M2.30-tooling-firefox-crash
ENGLMS_TASK=T-M2.30 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh chore/T-M2.30-tooling-firefox-crash
```
