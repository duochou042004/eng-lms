# T-M1.6 independent QA record

> Independent QA subagent (fresh context, black-box; qa-evaluator.md), recorded verbatim by the LC (subagents do not write files). Round 1 at `386f516` → FAIL (F1, S2: the overflow guard was blind under mobile emulation; fixed in `e321675`, DEC-058). Round 2 at `e321675` → **PASS WITH MINOR** (DEC-059). PR https://github.com/duochou042004/eng-lms/pull/12. This branch also adds the QA-owned `/qa` skeleton (DEC-057).

---

## Round 2 (re-test)

**Verdict: PASS WITH MINOR.** The round-1 S2 (F1) is fixed, and so are F2, F4, F6 and F7; I found no new S1, S2 or SCOPE issue. Build: `e321675` (PR #12 head, identical to local HEAD). Date: 2026-09-26. Evaluator: the same independent QA subagent as round 1. Environment as in round 1; `englms-dev-db` was already running and healthy.

## Re-test log

| Item | What I ran | Result |
|---|---|---|
| (a) F1: P9 and diagnostic D | A scratch spec outside the repo, run through `e2e-run.sh --no-build --config=<scratch>` on phone-small, phone, tablet, tablet-land and laptop. It adds a div `clientWidth + 40` or `+ 400` wide inside `main`. | **Fixed.** Every case now fails with the correct message: phone-small 416/776 > 360, phone 446/807 > 390, tablet 824/1184 > 768, tablet-land 1080/1440 > 1024, laptop 1400/1760 > 1280. The guard now compares against `documentElement.clientWidth`. |
| (a) F2: P14 and variants | A `console.error` in `context.newPage()`, an uncaught error in a `window.open` popup (P14b), and an inline `<style>` CSP violation in a second page (P14c), on 5 projects | **Fixed.** All are caught: "console.error: second page error", "pageerror: popup boom", and "CSP violation: style-src-elem blocked inline". A main-page `console.error` (regression check P16) is still caught. |
| (b) Mandatory projects | `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop` (with a full build) | Exit 0: 28 passed, 8 skipped. "app stopped", no port or process left. |
| (b) All six projects | `./scripts/e2e-run.sh --no-build` | Exit 0: **46 passed, 26 skipped**, which matches the re-recorded evidence log. "app stopped". |
| (c) CI on `e321675` | `gh pr checks 12`, after waiting for it to finish | **All 7 checks pass:** backend, container-build, contract-drift, docs-check, e2e-smoke (2m15s: 28 passed, 8 skipped), secrets-scan, web. The CI log shows the +40 px and +3000 px overflow self-tests running on phone-small, tablet and laptop. |
| (d) Docs | DEC-058, the qa-protocol §2 tooling note, the T-M1.9 backlog row, `summary.md`, `e2e-six-projects.log` | DEC-058 is accurate and traced. The qa-protocol note points to `qa/README.md` and the toolchain (F4 closed). The summary honestly records the round-1 F1 and its fix. The six-project log was re-recorded (header "HEAD 386f516 + the F1/F2/F7 working-tree fixes, committed next"). The deep-link reload now covers `/tutor` and `/student/x` (F7 closed). One placement problem in the backlog row, see R2-2. |
| (e) Attempts to defeat the fixed guard | Probes E1–E7 on 5 projects | No false negative on a real, scrollable overflow. Details below. |

**Probe (e) results:**
- **E1, overflow inside its own `overflow-x: auto` container:** passes on every project, as it should. `scrollWidth` equals the viewport width, so no false positive.
- **E5, absolute element pushed past the right edge:** caught everywhere.
- **E6, `transform: translateX(80px)`:** caught on phone-small, phone, tablet and tablet-land. On laptop it passes correctly, because `main` is centred at 1200 px, so there is room and no real overflow (`scrollWidth` 1280, `scrollX` 0).
- **E7, a page taller than the viewport:** no false positive from a vertical scrollbar.
- **E2 and E3, `overflow-x: hidden` on html or body with 3000 px content:** the guard fails. I accept that: the content is clipped, it can still be scrolled with script (`scrollX` up to 1992), and iOS ignores body `overflow-x: hidden`. It is conservative behaviour, not a blind spot.
- **E4, a 3000 px `position: fixed` element:** passes. A fixed element creates no page scroll, so rule §3.1 (no horizontal scroll) is literally met, even though the content is clipped. Clipping is outside this guard's job; axe or visual review covers it.

## Findings (round 2)

| ID | Sev | Status | Summary |
|---|---|---|---|
| F1 | S2 | **Closed** | The overflow guard compares against `clientWidth`, and its self-tests run on phone-small, tablet and laptop. My P9 and D probes are now caught on all 5 projects I tested. |
| F2 | S4 | **Closed** | The guard is context-level: second pages, popups and CSP violations in other pages are all caught, and there is a new self-test. |
| F3 | S4 | Deferred (DEC-058 → T-M1.9) | Errors raised after the test body ends are still not seen. I accept the deferral. |
| F4 | S4 | **Closed** | qa-protocol §2 now has the tooling note. |
| F5 | S4 | Open by process | `qa/T-M1.6` still has no PR. DEC-058 says it is merged right after #12, and the `/qa` Dependabot entry depends on that. |
| F6 | S4 | **Closed** | The six-project log is re-recorded, and 46 passed / 26 skipped matches my run. |
| F7 | S4 | **Closed** | The smoke reloads `/tutor` as well. |
| R2-1 | S4 | New | The only committed gate log (`gate-20260926T025016Z.log`) is from `9694be5`, before the fixes. The e2e step passes locally at `e321675` and in CI, and the round-2 diff touches only e2e files and docs, so the risk is low. The LC could re-run and commit a gate log at the final head. |
| R2-2 | S4 | New | In `docs/tasks/backlog.md`, the T-M1.9 row's F3 note ("from the T-M1.6 QA (DEC-058): **F3** …") was appended to the **Owner** cell ("FE; from …") instead of the description cell. It should move into the description column. |

No SCOPE findings. The round-2 diff (10 files) traces to DEC-058.

## Cleanup
- `git status` is clean on `feature/T-M1.6-e2e-harness`, up to date with origin.
- Nothing is listening on 8080/8081, and no app or `http.server` processes remain.
- The only probe files were under `scratchpad/qa16/probe`, outside the repo.

QA-VERDICT T-M1.6: PASS WITH MINOR
---

## Round 1: T-M1.6 E2E harness (Playwright, 6 viewports), guards, smoke, e2e-smoke CI, /qa skeleton

**Verdict: FAIL** (one S2). Build: `386f516` (PR #12 head). Date: 2026-09-26. Evaluator: independent QA subagent, fresh context. I wrote this verdict draft before reading the diff.

The S2: `expectNoHorizontalScroll` does not catch real horizontal overflow on `phone-small`, `phone` or `tablet`. Two of those are mandatory PR viewports. Everything else passes. The fix is small (see F1).

## Environment
- Kali Linux, JDK 25 (sdkman), Node 24 (nvm), pnpm 12.6.0, rootless Podman.
- `englms-dev-db` was already running and healthy (PostgreSQL 18, 127.0.0.1:5432). Ports 8080 and 8081 were free at the start.
- Playwright 1.63.0 with Chromium.
- For the clean-clone check I cloned the branch into `scratchpad/qa16/clone`.
- The probe specs lived outside the repo in `scratchpad/qa16/probe`. They shared the repo's `e2e/node_modules` and `e2e/support` through symlinks, and I ran them through the repo's `e2e-run.sh --config=<scratch config>`.
- At the end, `git status` was clean, nothing was listening on 8080/8081, and no app, `http.server` or Playwright processes were left.

## AC results

| AC | Scenario(s) and commands | Viewports | Result | Evidence |
|---|---|---|---|---|
| AC1 | Clean `git clone -b feature/T-M1.6-e2e-harness`, then `cd e2e && pnpm install --frozen-lockfile && pnpm exec playwright test --list` | all 6 | **PASS** | "Lockfile is up to date". 54 tests in 2 files (5 smoke + 4 guards) × 6 projects. The pins are exact: `@playwright/test` 1.63.0, `@axe-core/playwright` 4.13.0, `typescript` 6.0.3, `@types/node` 24.13.6, `packageManager` pnpm@12.6.0. The viewports match responsive-standards §2 exactly (360×740, 390×844, 768×1024, 1024×768, 1280×800, 1440×900). All projects are Chromium with `retries: 0`. The versions are recorded in tech-stack §7. |
| AC2 | `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop`, then forced failures | ps, tablet, laptop | **PASS** | **Happy path:** exit 0, 19 passed and 8 skipped (the guards skip off laptop), 27 s. The jar contains `BOOT-INF/classes/static/**` and no `.vite`. `backend/target/classes/static` is removed afterwards. No app java process and no 8080/8081 listener remain. **Failures:** a nonexistent spec, `--timeout=1` (7 real failures) and `--project=nope` all exit 1, print "app stopped", and leave no process or port. **Signals:** SIGTERM during startup and during Playwright both give exit 130, "app stopped", and a clean state. **Busy ports:** a listener on 8080 (127.0.0.1 or 0.0.0.0) or on 8081 gives exit 1 with "port N is already in use…", and nothing starts. |
| AC3 | `./scripts/e2e-run.sh --no-build` | all 6 | **PASS** | Exit 0, 34 passed, 20 skipped. The committed screenshots are 8 per project (4 pages × vi/en) for phone-small, tablet and laptop, and the PNG sizes match the viewports. The visual spot check was fine. |
| AC4 | Reviewed the recorded demos and self-tests. Ran my own probes (P1–P15 and diagnostic D). | laptop, phone-small, phone, tablet | **FAIL** (F1) | The demos are honest: run 1's axe demo race is disclosed, and run 2 fails correctly. The axe guard and the console/CSP guard caught every probe I tried (see the notes below). The **overflow guard is blind on the isMobile projects**. |
| AC5 | Read `e2e-smoke.yml`, `required-checks.txt`, `merge-gate.test.sh`, `gh pr checks 12`, `gh run view --log` | CI | **PASS** | The trigger is `pull_request` with no `paths:`. All actions are SHA-pinned. `persist-credentials: false`, `permissions: contents: read`. Postgres is pinned by the same digest as the dev compose file (`sha256:5a5a84b1…`). The upload step has `if: failure()`, `continue-on-error: true` and `retention-days: 5`. `e2e-smoke` is in `required-checks.txt` and `OK_CHECKS`. PR #12 `e2e-smoke` passed in 2m9s: "19 passed, 8 skipped", "app stopped". All 8 checks are green. |
| AC6 | `./scripts/gate.sh --list`, a full `./scripts/gate.sh`, and `--from contract-drift` with 8081 busy | ps, tablet, laptop | **PASS** | `--list` ends with `e2e`. The full run gave "PASS (12 steps, 150s)", exit 0. The script tests pass: e2e-run.sh 13 cases, gate.sh has cases for the e2e args and fail-fast. With 8081 busy: "FAIL at step 'e2e' (exit 1)…later steps were not run. Resume with: --from e2e". |
| AC7 | `git show origin/qa/T-M1.6 --stat`, the qa files, the docs | – | **PASS** (F4, F5) | `qa/README.md` plus QA's own pinned package, config (6 viewports × 1 or 3 engines, retries 0), `plans/`, `e2e/` and `regression/`. This matches qa-protocol §2, and the change from `qa/tests/` is covered by DEC-057. It branches from develop `afd6a9b` and has no PR yet. development-setup §4, ci-cd §1, test-strategy §6 and tech-stack §7 are updated. `progress.json` and `summary.md` are present. |
| DEC-056 | retention, Dependabot, backlog | – | **PASS** | Both `upload-artifact` steps in `backend.yml` and the one in `e2e-smoke.yml` have `retention-days: 5`. #6 and #7 were closed by the owner with technical reasons. `dependabot.yml` ignores semver-major `typescript` and `@types/node` for `/web`, `/e2e` and `/qa`, and has entries for `/e2e` and `/qa`. T-M1.10 is in the backlog as "not an M1 exit criterion". |

## Exploratory charter and notes
Charter: try to defeat each guard (CSP from other directives, page errors, overflow at narrow viewports, axe rules, timing), and test the runner's cleanup under every failure mode. About 45 minutes.

**Probe results.** A pass here means the probe test failed, which is what a sound guard should produce.

- **Caught on both laptop and phone-small:**
  - P1: `img-src` external image
  - P2: `connect-src` external fetch
  - P3: inline `<script>`
  - P4: `style` attribute through `setAttribute`
  - P5: uncaught exception
  - P6: unhandled rejection
  - P7: 404 resource
  - P8: a 3000px div
  - P10: a long unbreakable Vietnamese word
  - P11: `body{overflow-x:hidden}` with wide content
  - P12: a button with no name
  - P13: low-contrast text
- **Not caught:**
  - P9: a 20px overflow on phone-small (F1)
  - P14: a console error in a second page of the same context (F2)
  - P15: a console error that fires after the last awaited action (F3)

**Diagnostic D:** I added a div of width `innerWidth + N` to `/student` and recorded the widths. `iw` is `window.innerWidth`, `cw` is `documentElement.clientWidth`, `sw` is `scrollWidth`.

| Project | N | iw | cw | sw | Guard |
|---|---|---|---|---|---|
| phone-small | 40 | 416 | 360 | 416 | passes (**missed**) |
| phone-small | 400 | 776 | 360 | 776 | passes (**missed**) |
| phone-small | 1500 | 1440 | 360 | 1876 | caught |
| phone | 400 | 807 | 390 | 807 | passes (**missed**) |
| tablet | 1500 | 2284 | 768 | 2284 | passes (**missed**) |
| laptop | 40 | 1280 | 1280 | 1400 | caught |

Chromium with `isMobile: true` (DEC-057 item 4) widens `window.innerWidth` to the content width, up to 4× the device width. `clientWidth` and `visualViewport.width` stay at the device width.

**Other observations:**
- The not-found page has no language switcher, so the smoke sets `localStorage` and reloads for that page. That is reasonable, but it is not "switched with the language switcher".
- The tutor and student shells show "Eng-LMS Eng-LMS" twice in the header. This existed before this task, so it belongs to T-M1.9 or the UX backlog. It is not a finding here.

## Findings

| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| F1 | **S2** | `expectNoHorizontalScroll` misses overflows of up to ~4× the viewport width on `phone-small`, `phone` and `tablet` (every project with `isMobile: true`), including 2 of the 3 mandatory PR viewports. The guard self-test runs only on `laptop` ("guards are browser-level: one project is enough"), so this gap is not covered. | 1. Start the app with `e2e-run.sh --no-build`, using a scratch spec that imports `support/checks` and `support/fixtures`. 2. At phone-small, open `/student` and append a div of width `innerWidth+40` (or +400) to `main`. 3. Call `expectNoHorizontalScroll(page)`. | The test fails (responsive-standards §3.1: no horizontal page scroll at any reference viewport). | It passes: `innerWidth` becomes 416 or 776, equal to `scrollWidth`, while `clientWidth` is 360. The same probe fails correctly on laptop. | Probe P9, diagnostic D (`scratchpad/qa16/probe2.log`) |
| F2 | S4 | The console guard only watches the fixture's `page`. Errors in pages or popups opened from the same context are ignored. | `context.newPage()`, go to `/student`, run `console.error(...)`. | The test fails, or the limitation is documented. | It passes. | P14 |
| F3 | S4 | Console errors raised after the test body's last await are not caught, because teardown asserts immediately. | `setTimeout(() => console.error('late'), 300)` as the last statement. | The test fails. | It passes. | P15 |
| F4 | S4 | Scope item 8 lists "qa-protocol (the /qa layout)". qa-protocol.md is unchanged, and the summary's docs list leaves it out. §2 already describes `qa/plans` and `qa/e2e`, but there is no pointer to `qa/README.md` or QA's own toolchain. | `git diff origin/develop...HEAD -- docs/06-quality/qa-protocol.md` | Updated, or the omission explained. | No change. | – |
| F5 | S4 | The `/qa` skeleton exists only on `origin/qa/T-M1.6`, with no PR. The `dependabot.yml` `/qa` entry points at a directory that won't exist on develop until that branch is merged. | `gh pr list --head qa/T-M1.6 --state all` shows nothing. | The LC merges qa/T-M1.6 alongside or right after #12. | Not yet merged. | – |
| F6 | S4 | Evidence is slightly stale. `e2e-six-projects.log` (and the summary's "30 passed") was recorded at `67c93a3` + working tree, before the guard self-tests. Today's run gives 34 passed and 20 skipped. The label is honest; the log is just out of date. | Compare the log to `e2e-run.sh --no-build`. | A log from the final head. | An earlier head. | – |
| F7 | S4 | The deep-link reload test uses `/student/x` instead of the `/tutor` the packet names. It is a stronger nested case, but reloading `/tutor` itself is only implied. | Read `smoke.spec.ts`. | `/tutor` reload per scope item 4. | `/student/x`. | – |

No SCOPE findings. Every change traces to the packet, DEC-056 (retention, Dependabot, T-M1.10) or DEC-057, and nothing ships in the product bundle.

## Accessibility summary (axe + manual)
The axe guard uses the WCAG 2.2 AA tags. It caught `image-alt`, a button with no name and `color-contrast` on both phone-small and laptop. The smoke gives 0 violations on all 4 pages × vi/en × 6 projects. Screen-reader and keyboard checks don't apply because this task adds no product UI.

## Isolation / privacy checks
Not applicable: there are no data endpoints yet (the seed and e2e profile are out of scope until M2). The CI Postgres password is a throwaway for an ephemeral database. I did not read `.env`.

## Suggested fix for F1 (not binding)
- Compare `document.scrollingElement.scrollWidth` against `document.documentElement.clientWidth`, which stays at the device width, instead of `window.innerWidth`.
- Run the overflow self-test on `phone-small` too, with a small overflow (for example +40px) as well as 3000px.

## Re-test log
- 2026-09-26, initial run at `386f516`: FAIL (F1).

QA-VERDICT T-M1.6: FAIL