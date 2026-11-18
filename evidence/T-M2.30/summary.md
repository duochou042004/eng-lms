# T-M2.30 summary: `e2e-run.sh` refusal gaps and the Firefox `Page crashed` recurrence
Branch `chore/T-M2.30-tooling-firefox-crash` (from `develop` `3dc7f77`) · code head `60d0ed5` · DEC-180 + G5 text `10a5b48` · summary + gate log `5143257`;
G3 fixes `183965a`; **merged** `6822841` (PR #195 via merge-gate at head `183965a`, CI 7/7, scope full: 5 full, 0 fast-path, 2026-11-18T15:35:56Z) · trace DEC-174, DEC-179, DEC-180 · PO start 2026-11-18 (~11:34Z) · 2026-11-18.
Recorded by the LC from the frontend-implementer's text (L-07). Raw logs: `evidence/T-M2.30/*.log`.

## PO rulings during the task (2026-11-18)
- "Stop after this run": run 44316580788 was the last diagnostic run; no ×20 scratch run (`chore/T-M2.30-x20-scratch` was never created)
  and no `regression` run on the final head.
- "Drop Firefox": `firefox-smoke` removed from `e2e/playwright.config.ts`, Firefox from `regression.yml`; the G5 matrix is the 6 Chromium
  viewports plus WebKit smoke (DEC-180; quality-gates G5, qa-protocol §5 aligned).

## Gate (G1)
Run 1 (LC) on `10a5b48` (code = `60d0ed5`): `gate: PASS (13 steps, 623s)`; e2e default pass 536 passed / 46 skipped (4.3 min); repeat ×3
`tests/smoke.spec.ts` 54 passed. Log `gate-20261118T145005Z.log` (trimmed by the LC from 2,296 lines to every `gate:` / `e2e-run:` line and the counts).

## Commits
| sha | subject |
|---|---|
| f93be4d | chore(e2e): close e2e-run fresh-mode refusal gaps; capture browser logs and OOM lines in regression |
| c7e4959, 65f712a, a671b3f, 616224e | TEMP Firefox-only crash proof, ×20 repeat, diagnostic variants, axe rule bisection |
| b7348ee | revert of every TEMP block (`smoke.spec.ts` byte-identical to `develop` after it) |
| 320809d | trimmed regression run logs |
| 60d0ed5 | chore(e2e): drop Firefox from the regression matrix (PO, 2026-11-18) |
| 10a5b48 | docs(governance): DEC-180; G5 matrix text (LC) |

## Regression runs (all attempt 1, `ubuntu-24.04`, Firefox 159.0 / playwright v1572, 2 workers)
| Run | Head | Purpose | Image | Result | OOM lines | Peak used / min free |
|---|---|---|---|---|---|---|
| 44298018968 | `c7e4959` | capture proof + ×20 reproduction | 20261111.370.1 | 12 failed: the deliberate crash + 11/20 repeats; original login test passed | 0 | 3565 / 6896 MB |
| 44303622199 | `65f712a` | diagnostic variants ×20 | 20261111.370.1 | 60 failed, all `Page crashed`, incl. the unchanged login test | 0 | 3491 / 6065 MB |
| 44309945856 | `a671b3f` | diagnostic variants run 3 | 20261111.370.1 | 32 failed, all `Page crashed`; unchanged login test passed | 0 | 3580 / 6517 MB |
| 44316580788 | `616224e` | axe rule bisection ×15 per set | 20261111.127.1 | 7 failed, all in rule group g5; unchanged login test passed | 0 | 3762 / 6182 MB |

The other failure line in each run, `[laptop] guards.spec.ts:100` "(expected failure)", is the guard's own `test.fail` self-check.
Time per run: ~35 of ~38 min is Playwright (2,136 tests with the TEMP ones; a normal run is ~1,176 tests, 28–30 min).

## AC → proof
| AC | Proof |
|---|---|
| AC1 (a) | Fresh mode scans the whole environment (`env -0`; names upper-cased, `.` `-` `_` dropped). **Refused, naming the variable:** `spring.flyway.url`, `spring-flyway-url`, `spring.config.import`, lower-case `spring_flyway_url`; `SPRING_CONFIG_IMPORT` / `_LOCATION` / `_ADDITIONAL_LOCATION` (caller or `.env`); every spelling of `SPRING_DATASOURCE_URL` but the exact name (so which spelling Boot binds is never reached: **unverified**, stated in the docs); `JAVA_TOOL_OPTIONS`, `JDK_JAVA_OPTIONS`, `_JAVA_OPTIONS` holding `spring` (any case), an `@argfile` or `-XX:VMOptionsFile` (`-Xmx1g` passes). **Removed:** `java` starts in a freshly emptied `backend/target/e2e-cwd/` (`exec` keeps the pid), so `./application.*` and `./config/` are not read: stub records `pwd` + empty `ls -A`; run 1's app log "started … in …/backend/target/e2e-cwd". **Gaps** (development-setup "E2E database", unverified): `spring.datasource.hikari.data-source-class-name` + `data-source-properties.*`; a `java` earlier on `PATH`. Failing first: 58 new checks failed on today's script (`failing-first.log`). Local fresh-mode `--project=laptop smoke.spec.ts` 6/6, `e2e-cwd/` empty after, 0 DEBUG lines |
| AC2 (b) | Case "a lower-case spring_flyway_url from the caller". It passed on today's script (the old `compgen` loop already upper-cased), so its failing-first is the mutation: `key=${var^^}` → `key=${var}` fails 24 checks incl. all four of this case (`mutation-ac2.log`). All 127 earlier cases kept; 193/193 |
| AC3 (c) capture | `DEBUG='pw:browser*'` and a `NODE_OPTIONS --require scripts/lib/browser-log-file.cjs` preload only on the Playwright command (caller's `NODE_OPTIONS` kept); one `e2e/browser-logs/pw-<pid>.log` per Node process (git-ignored, cleared at start). `java` runs under `env -u DEBUG`: stub cases (caller and `.env` `DEBUG=true`) keep it out; run 1's app log 38,100 INFO, 1 WARN, 0 DEBUG (size not compared with a pre-task run). Workflow: background `vmstat -t -S M 5`; an `if: always()` step before the upload (`set +e`, `exit 0`) saves `dmesg` OOM lines and prints the count and peak used / min free; `e2e/browser-logs/` in the artifact `path:`; trigger, name, retention unchanged. Proof run 44298018968: `about:crashcontent` → `[pid=57529][err] … process 57657 exited on signal 11`. Block gone from the final head (`grep "TEMP T-M2.30" e2e/` empty) |
| AC4 (c) cause | **Engine/runner cause.** Crash signature (one per failure, 12/12 and 7/7): `[Parent …, IPC I/O Parent] WARNING: process <content pid> exited on signal 11: file ipc/chromium/src/chrome/common/process_watcher_posix_sigchld.cc:161`; just before each, `FormHandlerChild.sys.mjs, line 103: InvalidStateError` (also seen 166 times without a crash: correlated, not proven). Not memory (0 OOM lines, ≥ 6 GB free); not the image (both); rate unchanged with the JIT off 8/20, axe legacy 6/20, a font wait 13/20, no language switch 10/20, English first + one axe 4/20, `goto` for the reload 7/20, form fill off 10/20. Trigger: an axe run on the **second** load of `/login` in one tab (the first load ~245 tries, 0 crashes; `color-contrast` alone 0/20; a non-axe style probe 0/20). Bisection: group g5 (`frame-title, html-has-lang, html-lang-valid, html-xml-lang-mismatch, image-alt, input-button-name, input-image-alt, label-content-name-mismatch, label`) 7/15, all others 0/150. The page has 0 axe violations when it does not crash; a content-process SIGSEGV is a browser fault. Not isolated to one rule, no upstream link searched (PO cap). Ruling: DEC-180 (PO: Firefox dropped) |
| AC5 | `run-all.sh` PASS; `e2e-run.test.sh` 193/193; `ci-scope-workflows` 97, `workflow-warnings` 10, e2e typecheck, `E2E_ENGINES=all --list` (6 Chromium × 194 + `webkit-smoke` 6). Gate above; CI on the PR. No retry, `test.skip`, `test.fail`, timeout, allow-list or axe change in the final head |

## Deviations (accepted by the LC)
- `SPRING_DATASOURCE_URL` spellings refused by exact-name comparison rather than removed; JVM-option rule broader than `-Dspring.*`.
- `java` runs from `e2e-cwd/` in every mode, CI included; the preload lives in `scripts/lib/` (not `e2e/support/`, so the gate's spec
  repeat is not widened); `.gitignore` gains `e2e/browser-logs/`; `vmstat -t -S M 5`.
- The TEMP blocks went beyond a plain repeat (variants, own launches with prefs): all Firefox-only, all reverted (`b7348ee`).
- Firefox removal (PO ruling) was added to this packet's scope.

## Open questions → LC
- OQ T-M2.30-1 (Firefox mentions left): NFR-COMPAT-01 / A-014 keep Firefox as supported without automated coverage (DEC-180);
  `qa/`'s optional `QA_ENGINES=all` and its Firefox workaround stay (QA-owned, not the G5 path); accessibility.md's manual NVDA+Firefox
  check is unchanged. The rest of the grep is history or engine facts.
- OQ T-M2.30-2 (Hikari `data-source-class-name` route): kept as a recorded gap (unverified; a Boot-refused route per T-M2.28 (d)'s
  `dataSourceClassName` finding). No new row.

## G3
One fresh adversarial docs-reviewer on `abdb78b`: **`DOCS-REVIEW T-M2.30: PASS WITH MINOR`** (97,814 tokens; report in `review/docs.md` on the
records branch). It re-ran `e2e-run.test.sh` 193/193 and `run-all.sh` PASS, tried datasource/Flyway/config routes past fresh mode
(`SPRING_CONFIG_NAME` with a path is refused by Boot; config-file URLs lose to the env variable), and found "engine/runner cause" supported.
Findings, all fixed in docs by the LC (DEC-131 cheap fixes) in the next commit:
| ID | Finding | Ruling |
|---|---|---|
| S3-1 | test-strategy §2 row still lists Firefox in the regression | Fixed: "all 6 + WebKit smoke; Firefox dropped, DEC-180" |
| S4-1 | Quotes inside a JVM option name (`-Dspr''ing.flyway.url`) pass the scan; the JVM strips them (proved in a private clone) | Recorded as a gap in development-setup "E2E database" (needs deliberate obfuscation) |
| S4-2 | Lower-case `debug` / `trace` reaches `java` (Boot prints the conditions report) | Recorded as a gap there; the script and CI never set it |
| S4-3 | DEC-180 said "known" issue without an upstream search | DEC-180 (unmerged) reworded: "recorded here … not reported upstream" |
| S4-4 | NFR-COMPAT-01 Verification still says Playwright on Firefox | Fixed: Chromium and WebKit in `e2e/`; Firefox best effort via `qa/` |

Round 2 (confirmation on `183965a`): **`DOCS-REVIEW T-M2.30: PASS`**. Reports: `review/docs.md`.

## Cost
| Agent | Tokens | Duration |
|---|---|---|
| frontend-implementer (incl. 4 regression runs, resumed twice for the PO rulings) | 220,615 | 11,602 s |
| docs-reviewer round 1 (adversarial, re-ran the suites) | 97,814 | 492 s |
| docs-reviewer round 2 (confirmation) | 20,218 | 26 s |
| **G3 total (docs-reviewer rounds 1+2)** | **118,032** | 518 s |
