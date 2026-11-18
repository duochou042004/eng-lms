# T-M2.30 G3 docs review (adversarial, tier L)
Recorded by the LC from the reviewers' returned text (L-07). PR #195.

## Round 1: fresh adversarial docs-reviewer on `abdb78b`: `DOCS-REVIEW T-M2.30: PASS WITH MINOR`
Judged against the packet as amended by the PO's two rulings of 2026-11-18 (run cap; Firefox dropped).
- **Suites re-run:** `e2e-run.test.sh` 193 passed / 0 failed; `run-all.sh` `script tests: PASS` (ci-scope-workflows, workflow-warnings 10/10);
  `check-docs.sh` PASS.
- **Bypass attempts on fresh mode** (`scripts/e2e-run.sh:77-91`): non-identifier names, lower case, `SPRING_CONFIG_*`, `.env` entries and
  `SPRING_APPLICATION_JSON` are refused. `SPRING_PROFILES_ACTIVE` has no route (no profile files; empty cwd). `SPRING_CONFIG_NAME=application,../../evil`
  is refused by Boot itself at startup (real jar). A config-file `spring.datasource.url` loses to the `${SPRING_DATASOURCE_URL}` env variable.
  pgjdbc PG* variables only fill defaults. `JAVA_TOOL_OPTIONS=-Xmx1g` is allowed (a test case covers it).
- **DEBUG / NODE_OPTIONS:** upper-case `DEBUG` never reaches java (`env -u DEBUG` in a subshell; stub cases for caller and `.env`); the
  preload is appended after the caller's `NODE_OPTIONS`; each worker writes its own `DEBUG_FILE`.
- **Workflow:** the diagnostics step is `if: always()`, `set +e`, `exit 0`, before the upload (still `if: failure()`); trigger, artifact name,
  `retention-days: 5` unchanged; `e2e/browser-logs/` in `path:`; no allow-list or CI-scope change; `MANUAL_ONLY = {"regression.yml"}` kept.
- **Test integrity:** `smoke.spec.ts` diff against `develop` is comments only; no `TEMP` / `crashcontent` left; no retry, `test.skip`,
  `test.fail`, timeout or axe change added; `e2e/support/checks.ts` untouched; Firefox gone from `playwright.config.ts` and `regression.yml`.
- **Cause:** "engine/runner cause" follows from the logs (content-process SIGSEGV 12/12 and 7/7; 0 OOM lines, ≥ 6 GB free on both images;
  0 axe violations when not crashing); the FormHandlerChild correlation is correctly marked unproven.
- **Secrets:** none in the evidence logs; no DEBUG-level app lines.

| ID | Finding | LC ruling |
|---|---|---|
| S3-1 | `docs/06-quality/test-strategy.md:20` still listed Firefox in the regression matrix | Fixed in `183965a` |
| S4-1 | Quotes inside a JVM option name (`-Dspr''ing.flyway.url`) pass the scan; the JVM strips them (3 probe cases in a private clone: 193 passed, 9 failed) | Recorded as a gap in development-setup "E2E database" (`183965a`) |
| S4-2 | Lower-case `debug` / `trace` reaches java (real jar printed the conditions report) | Recorded as a gap there (`183965a`) |
| S4-3 | DEC-180 called the crash "known" without an upstream search | DEC-180 reworded before merge (`183965a`) |
| S4-4 | NFR-COMPAT-01 Verification still said Playwright on Firefox | Fixed in `183965a` |

Merge precondition noted: `container-build` failed on a Maven Central 404 for `apache-maven-3.10.0-bin.tar.gz` (run 44330763904, outside
the diff); green on the next head. Non-diff note: `HANDOFF.md` still named Firefox in the regression (fixed in the records).
Cost: 97,814 tokens, 492 s; one private clone (deleted), four short jar startups without a database; no regression run.

## Round 2: confirmation on `183965a`: `DOCS-REVIEW T-M2.30: PASS`
`git diff abdb78b..183965a` touches only `non-functional-requirements.md`, `test-strategy.md`, `development-setup.md`, `decision-log.md`
and `evidence/T-M2.30/summary.md`. All five findings resolved or correctly recorded as gaps; the new text agrees with DEC-180, quality-gates
G5, qa-protocol §5, ci-cd §1 and the summary's G3 table. `check-docs.sh` PASS. Non-blocking note (older than the diff): `qa/README.md:25`
labels `QA_ENGINES=all pnpm test regression/` "milestone regression: Chromium, Firefox, WebKit"; an optional relabel ("optional all-engine
run, Firefox best effort, DEC-180") is left to the QA-owned `qa/` files (handoff). Cost: 20,218 tokens, 26 s.
