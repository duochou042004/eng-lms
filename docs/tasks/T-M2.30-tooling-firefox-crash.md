# T-M2.30: `e2e-run.sh` refusal gaps and the Firefox `Page crashed` recurrence

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`6822841`, PR #195, DEC-180, DEC-181; G0 PASS, PR #193 `357c4c4`; PO start 2026-11-18) |
| Owner role | FE (frontend-implementer; E2E, scripts and the `regression` workflow) with the LC (backlog row FE/LC) |
| Branch | `chore/T-M2.30-tooling-firefox-crash` (from `develop`) |
| Depends on | T-M2.28 (`a1bcf12`), T-M2.29 (`1d6ace4`): merged |
| Estimate | 1.5–2 agent-days: (a)/(b) ≈ 0.5; (c) **time-boxed at 1 agent-day** (then the LC rules); up to ~6 `regression` runs of ~30 min |
| Risk tier | **L**: `scripts/e2e-run.sh` and its tests, the `regression` workflow's diagnostics, E2E support. No product code, endpoint, CSP, DTO, migration or UI change: a **product** cause found in (c) is reported as an OQ at once and becomes its own row (L-10). G3 = **one fresh adversarial docs-reviewer that also re-runs the script suites** (`DOCS-REVIEW T-M2.30: PASS` on a `chore/` branch) |
| Trace | DEC-174 (4) and (5) (T-M2.28 G3 S4-1, S4-2; the Firefox crash ruling and its recurrence clause), DEC-179 ((c) added after regression run 44099902526); DEC-158 PO-3 (the G5 matrix runs through `regression`); test-strategy §3 (no silent retry); lessons L-01, L-05, L-08, L-10; backlog row T-M2.30 |

## Goal
Close the two refusal gaps in `e2e-run.sh` fresh mode that T-M2.28's G3 found. Then find the cause of the Firefox `Page crashed` that
has now failed the `regression` workflow in two of its last four runs, before the M2 G5 is signed off (DEC-174 (5)). Every change
keeps what each test proves. A cause in the product is reported, not hidden.

## Scope
- In:
  - **(a) Overrides that fresh mode does not refuse.** The fresh-mode loop (`scripts/e2e-run.sh:75-79`) scans `compgen -e`, which lists
    only shell-identifier names. So a caller's `env 'spring.flyway.url=…' ./scripts/e2e-run.sh` is never seen, yet it reaches the Boot
    app (`java` starts at `:137` from the caller's directory). The cases below must be handled. Each is refused (naming the variable or
    file), proved removed from `java`'s environment, or recorded as a remaining gap in
    `docs/07-operations/development-setup.md` "E2E database":
    - non-identifier names (`spring.flyway.url`, `spring-flyway-url`);
    - `SPRING_CONFIG_IMPORT`, `SPRING_CONFIG_LOCATION`, `SPRING_CONFIG_ADDITIONAL_LOCATION`;
    - `JAVA_TOOL_OPTIONS`, `JDK_JAVA_OPTIONS`, `_JAVA_OPTIONS` carrying `-Dspring.datasource.*` or `-Dspring.flyway.*`;
    - `spring.datasource.url` / `spring_datasource_url` set by the caller. These normalise to the same key as the script's own rewritten
      `SPRING_DATASOURCE_URL`, so refusing them by name is not possible. Either remove them from `java`'s environment, or record which
      one Boot uses (verified or stated as unverified);
    - `./config/application.*` and `./application.*` in the caller's working directory: refuse them or start `java` from a fixed
      directory, or record the gap.

    The mechanism is the implementer's: a scan of the whole environment (`env -0`, normalising `.` and `-` like `_`, upper-casing), or
    `env -u` / `env -i` with an allow-list. Both still need the names.
  - **(b) "Any case" is untested.** Add a lower-case caller case (for example `spring_flyway_url`) to `scripts/tests/e2e-run.test.sh`.
    It must fail when the final code's case normalisation is removed.
  - **(c) Firefox `Page crashed` (DEC-174 (5) recurrence).** The test is `[firefox-smoke] smoke.spec.ts:77` "login renders in vi and en".
    Run 43611629190 on `a7a1e4d` failed it on both attempts. Run 44099902526 on `141c763` failed it at `:114`, the second
    `expectNoAxeViolations` after the switch to English, inside axe-core's `runPartial` (`support/checks.ts:6`): 1059 passed, 1 failed,
    116 skipped, Firefox 159.0 (playwright v1572), runner image 20261111.370.1, 2 workers on the public-repo `ubuntu-24.04` runner
    (4 vCPU, 16 GB). Runs 43608039387 and 43617206392 were green. In this order:
    1. **Capture the browser's own output.** `DEBUG=pw:browser*` makes Playwright log the browser's stdout/stderr as `[pid=N][err] …`
       lines; content processes inherit that stderr. The rules:
       - Set it only on the Playwright command inside `e2e-run.sh` (or run `java` under `env -u DEBUG`). Spring Boot reads a `DEBUG`
         environment variable as its `debug` property, so it must never reach the app.
       - Write the log outside `e2e/test-results/` (Playwright empties that folder at start), for example `e2e/browser-logs/`, one file
         per process (`DEBUG_FILE` opens with `w`, so a restarted worker would truncate a shared file), or keep it in Playwright's
         per-test stderr attachment.
       - Add the folder to the artifact's `path:` list. Never redirect the step's own stderr.
       - Add an `if: always()` step **before the upload step** that saves the kernel's OOM lines
         (`sudo dmesg -T | grep -iE 'oom|killed process' || true`: a grep with no match must not fail a green run) and a background memory
         sample (`vmstat 5`) into the same folder, and also prints a short summary (the OOM line count, the peak used / minimum free memory)
         to the job log. The upload stays `if: failure()`, so on green runs the job log is the source. A process killed for lack of memory
         writes nothing to stderr.
       - `MOZ_CRASHREPORTER`, `MOZ_CRASHREPORTER_NO_REPORT` and `MOZ_CRASHREPORTER_SHUTDOWN` are set by Playwright and cannot be set by
         the caller.

       **Proof (L-01):** a temporary block, run on `firefox-smoke` only (skipped for every other project, so neither the Chromium
       projects nor the PR's `e2e-smoke` job fail), crashes a content process, for example with `page.goto('about:crashcontent')`. The
       capture must show a crash line: a `[pid=N][err]` line at the crash time, or the `dmesg` line. Record the run id. The proof and the
       first reproduction may share one run. Remove the block before the final head.
    2. **Reproduce.** Use `gh workflow run regression.yml --ref chore/T-M2.30-tooling-firefox-crash` runs. A temporary repeat of the login
       test on `firefox-smoke` only is allowed (the workflow has no inputs). Record each run's id, attempt and runner image.
    3. **Find the cause and rule.** Weigh the evidence for content-process memory (OOM lines, memory sample), an axe-core / Firefox 159
       fault (the crash text, the stack at `runPartial`), and the page (a font load, the `lang` change mid-run). Then name the cause:
       - a test-tooling cause, fixed here;
       - a product cause, reported as an OQ and given its own row;
       - an engine/runner cause, recorded with its evidence;
       - or no reproduction (see AC4).

       For (c): **no** retry, `test.skip`, `test.fail` or timeout change on `firefox-smoke`. When it crashes, the test stays unchanged,
       the implementer reports an OQ, and the LC rules (a `test.fail` would also fail every green run).
## Out of scope (explicit)
- Any product code, CSP or server change (a product cause is its own row).
- A Playwright, axe-core or Firefox version bump without a DEC.
- Making `regression` a required check, adding workflow inputs, or changing the workflow trigger, the CI scope or the allow-list (DEC-158).
- Weakening the axe check (`disableRules`, `exclude`, a narrower `include`, dropped tags, skipped frames) without a DEC.
- T-M2.31's UI fixes. The M2 G5 sign-off itself (T-M2.7).

## Guardrail answers (scope.md §6)
1. **Trace:** backlog row T-M2.30 (DEC-174); (c) DEC-174 (5) + DEC-179. 2. **Drift toward excluded scope?** No: test and script tooling.
3. **Mandatory setup added?** None. 4. **Weekly use?** Every local E2E run (fresh mode) and every regression run. 5. **Hard-coded semantics?** None.

## Design notes
- **Files:**
  - `scripts/e2e-run.sh` and `scripts/tests/e2e-run.test.sh`. The java stub (`:19`) records only `ENGLMS_(BOOTSTRAP|SECURITY)` variables.
    Widen it to record the datasource, Flyway, config and `JAVA`/`JDK` option names (and `DEBUG`) when the proof needs "java started
    without X".
  - `.github/workflows/regression.yml`: diagnostics only (the log folder in the artifact `path:` list, the `if: always()` OOM/memory
    step).
  - `e2e/support/checks.ts` / `e2e/playwright.config.ts`, only for a test-tooling cause and only within the axe rule above.
  - `docs/07-operations/development-setup.md`, and `docs/07-operations/ci-cd.md` §1 (what the regression artifact now holds).
- **Contradiction scan (L-03):**
  - `e2e-run.test.sh`'s 127 cases are kept, including T-M2.28 (e)'s race fix and (d)'s three refusals.
  - `scripts/tests/ci-scope-workflows.test.sh:16` lists `regression` as manual-only and must stay so.
  - `smoke.spec.ts:77`'s assertions are unchanged.
  - `e2e/tests/checks.spec.ts` keeps rejecting, including its negative axe case "(b) the same fixture fails when axe runs at once"
    (≈ `:163-166`).
  - The `regression` artifact keeps its name and 5-day retention, and stays dev-only data: the app log (unchanged: `DEBUG` never reaches
    `java`), the browser logs, the OOM lines, and no `.env`.
- **Shortcut ledger (L-12):** none fires.

## Acceptance criteria
- AC1 ((a)): each case listed in (a) is refused (naming the variable or file), proved absent from `java`'s environment (the widened stub),
  or written as a gap in `development-setup.md`, which also says which one Boot uses (verified, or stated as unverified). Every new case
  is seen failing on today's script.
- AC2 ((b)): a lower-case caller case. A mutation removing the final code's case normalisation fails it. All earlier cases pass.
- AC3 ((c) capture): the `regression` artifact holds the browser log, the OOM lines and the memory sample. A temporary, Firefox-only
  deliberate content crash shows a crash line in it (run id recorded). `DEBUG` is absent from the app's environment (stub case, or the
  app log unchanged in size and level). The block is gone from the final head.
- AC4 ((c) cause): `evidence/T-M2.30/summary.md` holds the run table (ids, attempts, runner images, memory, OOM lines), the captured
  crash text if any, and exactly one of these outcomes:
  - **Test-tooling cause:** fixed here. Proof: a throwaway commit on top of the final head adds only a temporary Firefox-only repeat
    (×20) and is pushed to a separate scratch branch (`--ref` that branch), never to the PR branch. Its diff and run id are recorded, with
    20/20 and no retry. One full `regression` run on the final head itself is green.
  - **Product cause:** an OQ and its own row; the LC rules before G3.
  - **Engine/runner cause:** the crash signature and an upstream link if one exists; the LC rules (DEC) how the G5 treats it.
  - **No reproduction:** no crash in the runs made within the time box (ids, attempts, images recorded). The capture is shown working
    by AC3 and stays in `regression.yml`, and the LC rules (DEC) how the G5 run treats a crash.
- AC5: `scripts/tests/run-all.sh` PASS; `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept, no retry,
  timeout, allow-list or axe weakening added.

**When a new check finds a real defect** outside this packet's allowed change (L-10): the implementer reports it at once as an OQ, and
the LC rules before G3. For (a) and (b), `test.fail` is allowed only until that ruling. For (c), never (above).

## Test plan
- Implementation: `e2e-run.test.sh` new cases and mutations (AC1, AC2); the capture proof and the reproducing runs (AC3, AC4).
- Independent check (adversarial docs-reviewer):
  - re-run `scripts/tests/run-all.sh` and `e2e-run.test.sh`;
  - try to get a datasource or Flyway override past fresh mode by another route;
  - read the captured text and judge whether the cause named follows from it;
  - confirm the temporary blocks are gone and the artifact holds no secret and no debug-level app log.

## Evidence required
- `evidence/T-M2.30/summary.md` (recorded by the LC from the implementer's text, L-07): AC → proof, each failing-first observation, the
  regression run table, and the G3 cost table.
- One gate log on the final head (trimmed) + green CI.
- The mutation and run logs under `evidence/T-M2.30/`.
- The docs review in `review/docs.md` on the records branch.
- **PO action:** downloading a `regression` artifact (the trace and logs, ~6 MB each) is a download. The LC asks the PO once for this task's runs.

## Docs to update
- `docs/07-operations/development-setup.md` "E2E database" (the refusal list and any gap).
- `docs/07-operations/ci-cd.md` §1 (the regression artifact's logs).
- The backlog (LC at merge).

## Risks & assumptions
- **The crash may not reproduce on demand** (2 of the last 4 runs): AC4's "no reproduction" outcome and the 1-day time box cover it.
- `DEBUG=pw:browser*` output is large: it goes to files, not the job log.
- `about:crashcontent` crashing a Playwright Firefox content process is assumed from Playwright's own crash tests. If it does not, the
  proof uses another way to kill the content process (for example `kill -SEGV` on a content pid found with `pgrep -f contentproc`, or another method the implementer chooses), and records which.

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
