# T-M1.5 independent QA record

> Independent QA subagent (fresh context, black-box; qa-evaluator.md), recorded verbatim by the LC (subagents do not write files). Round 1 at `6c15fa1` → FAIL (F1, S2; fixed in `98a2bd3`, DEC-053). Round 2 at `72da8a9` → **PASS WITH MINOR** (DEC-054, DEC-055). PR https://github.com/duochou042004/eng-lms/pull/10.

---

## Round 2: QA Report, round 2 (re-test): T-M1.5, single image + same-origin SPA serving, gate.sh, contract-drift CI

**Verdict: PASS WITH MINOR.** F1, the only blocker, is resolved: all six checks are green on the PR head 72da8a9. F4 is fixed. F2 and F3 are properly deferred. Only S4 items remain.

Build: head `72da8a9` (fix `98a2bd3`) · Date: 2026-09-26 · Evaluator: the same independent QA subagent as round 1 (fresh from the implementer).

## Environment
- Same host and tools as round 1.
- The dev DB `englms-dev-db` had exited overnight (host restart). I restarted it with `./scripts/dev-up.sh`; it is healthy on 127.0.0.1:5432 and I left it running.
- The round-1 scratchpad had been wiped, so I rewrote the probe script.

## Re-test log

| Item | What I did | Result |
|---|---|---|
| (a) F1 vs AC6 | Checked `gh run view` for backend run 36150811541 (98a2bd3) and 36151098882 (72da8a9) | **Resolved.** Both runs: `Verify` success and `Coverage summary` success. The summary prints `**Total:** lines 90.3% (112/124), branches 79.5% (31/39)` plus a per-package table. `Upload coverage report` still logs "Artifact storage quota has been hit", but `continue-on-error` means the job concludes `success`. |
| (b) Required checks | `gh pr checks 10` on 72da8a9 | backend, contract-drift, docs-check, secrets-scan and web all pass, as does the non-required container-build. `merge-gate.sh` requires all five of the required checks, and they are satisfied. |
| (c) Image | Fresh `git clone` of 72da8a9, then `podman build --no-cache --format docker -f deploy/Containerfile -t englms:qa2 .` | rc=0 in 40 s. Stage 1 now runs `pnpm build && rm -rf dist/.vite`. `static/` contains only `assets`, `favicon.svg` and `index.html`. User 10001:10001, no javac or node, 416 MB. |
| | Ran it `--read-only --tmpfs /tmp --network host --env-file .env` | `healthy` |
| | curl probes | `/.vite/manifest.json` returns 404 Problem, with or without an HTML Accept, so **F4 is fixed**. `/.vite/` with HTML gets the SPA, which is expected for an extension-less path. |
| | Round-1 behaviour | Unchanged. `/`, `/tutor`, `/student/x` and HEAD `/tutor` return 200 `no-cache`. Assets are `immutable`. `/api/v1/meta` returns 200 JSON. `/api/v1/x` returns 404 Problem. POST gives 405 and `/tutor` with a JSON Accept gives 404. `:8080/actuator/health` is 404; `:8081` liveness is 200 and `env` is 404. All 5 security headers are present on every app-port response. |
| | Deferred items | F2 (Tomcat 400 without headers) and F3 (`/./api/v1/meta` getting the SPA) behave as in round 1, as expected. |
| | Browser at 360 and 1280 | `/tutor`, `/student/x` and `/` work, including a keyboard Tab/Enter. The console is empty (no CSP errors), there are 0 `<style>` elements and no horizontal scroll. Viewport reset to desktop. |
| (d) DEC-053 | Reviewed | The root cause (the account-wide quota; `Verify` itself passed) is stated honestly. Freeing storage is correctly left as a PO action, with no data deletion by the LC. |
| | DEC-054 | Consistent with my severities. |
| | Backlog | The T-M1.8 row now includes F2, with repro examples. The T-M2.1 row includes the F3 firewall regression test and moving the headers into Spring Security. |
| | backend.yml | Coverage step is `if: always()`. Both uploads are `continue-on-error`. Actions are still SHA-pinned. |
| | `coverage-summary.sh` | Output is correct and matches the JaCoCo CSV. A missing CSV exits 1 with a clear message. A header-only CSV prints `n/a`. It works under mawk 1.3.4, which is what the CI runner may use. |
| | `SpaFallbackFilter` comment | Corrected (F3). |
| | AC6 wording in `summary.md` | Now honest: it records F1, the red runs on `427d394`/`6c15fa1`, the fix, the green run links and that the upload still fails. |
| | ci-cd.md §1 | Updated. |
| (e) gate | `./scripts/gate.sh` | `gate: 72da8a9 … PASS (11 steps, 126s)`, rc=0. `git status` is clean. |

### AC6 interpretation
The packet says "uploaded by CI". The job summary is a per-run CI output that needs no artifact storage and shows the report's totals and per-package figures. It is not the full HTML report. DEC-053 is the LC's recorded interpretation, which qa-protocol §1.3 says settles an AC-interpretation question. I accept it as meeting AC6's intent (coverage is visible from every CI run). The remaining gap is S4 finding R2-1.

## Findings (round 2)

| ID | Sev | Summary | Steps to reproduce | Expected | Actual |
|---|---|---|---|---|---|
| F1 | S2, **closed** | Required `backend` check red; coverage never delivered | `gh pr checks 10` | Green, with coverage delivered | Green on 98a2bd3 and 72da8a9, with coverage in the job summary |
| F4 | S4, **closed** | Vite manifest served | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8080/.vite/manifest.json` | 404 | 404 |
| F2 | S3, deferred | Tomcat 400s have no security headers | as round 1 | — | Deferred to T-M1.8 (DEC-054, backlog row updated) |
| F3 | S4, deferred | Raw dot-segment paths get the SPA | as round 1 | — | Comment fixed; test deferred to T-M2.1 (DEC-054, backlog row updated) |
| R2-1 | S4 | While the quota lasts, the full HTML report and, on failure, the surefire reports are never uploaded. `continue-on-error` also shows the failed step as `success`, so the loss is silent in the check UI. | `gh run view 36151098882 --log \| grep quota` | The HTML report is available, or the loss is visible | Only the error line in the log shows it. Suggestion: once the PO frees storage, check that `backend-coverage` appears, or add a `::warning::` when `steps.<id>.outcome == 'failure'`. |
| R2-2 | S4 | DEC-051 still says the `backend` job "uploads … as `backend-coverage`". DEC-053 refines it but does not mark DEC-051 as superseded or amended. | `docs/10-governance/decision-log.md` rows 59 and 61 | A cross-reference from DEC-051 to DEC-053 | No cross-reference |
| R2-3 | S4 | `scripts/coverage-summary.sh` has no case in `scripts/tests/`, while other governance scripts do (e.g. `gate.test.sh`) | `grep -l coverage-summary scripts/tests/*` returns nothing | A small fixture-CSV test ("tests with every change") | None. I checked its behaviour manually (see above). |

## Isolation / privacy
Still N/A: `api/openapi.json` lists only `/api/v1/meta`, and 98a2bd3 adds no endpoint.

## Scope
The fix commits touch only what F1–F4 require, plus the evidence, the progress update, the DEC entries and the backlog rows. Nothing is untraced.

## Cleanup
Removed container `englms-qa2`, image `englms:qa2` with its 2 intermediate images, and the clone. `englms-dev-db` is running (healthy). The implementer's `englms:dev`/`englms:clean` images are untouched. The repo is on `feature/T-M1.5-single-image` at 72da8a9 with a clean `git status`.

QA-VERDICT T-M1.5: PASS WITH MINOR
---

## Round 1: QA Report: T-M1.5, single image + same-origin SPA serving, gate.sh, contract-drift CI

**Verdict: FAIL** (one S2; everything else passes). The one blocker: the required `backend` check is red on the PR head, and CI has never actually uploaded the JaCoCo report that AC6 requires. I found no product-behaviour defect.

Build: `6c15fa1` (fresh clone of `feature/T-M1.5-single-image`, PR #10) · Date: 2026-09-25 · Evaluator: independent QA subagent in a fresh context.

## Environment
- Kali Linux, rootless Podman. JDK 25.0.4-tem (sdkman), Node 24 (nvm), pnpm 12.
- Dev DB `englms-dev-db` (postgres:18, digest-pinned) on 127.0.0.1:5432.
- Image built from a fresh `git clone` of the branch into the scratchpad.
- The container was run with `--read-only --tmpfs /tmp --network host --env-file <repo>/.env`.
- Browser: the Claude Browser pane against `http://127.0.0.1:8080`.
- Independence: I read the Containerfile and the workflows as the deliverables under test. I read the implementation code (SpaFallbackFilter and the `develop...HEAD` diff) only after the verdict draft was written.

## AC results

| AC | Scenario(s) | Result | Evidence |
|---|---|---|---|
| AC1 | Clean clone, then `podman build --format docker -f deploy/Containerfile -t englms:qa .` | PASS | The first build hit the cache fully, so I rebuilt with `--no-cache`: rc=0 in 50 s. The pnpm/Maven cache mounts persist, as the implementer's evidence also says. |
| | Image facts | PASS | User `10001:10001`; `id` gives uid=10001(englms). Temurin 25.0.4 JRE: no javac, jshell, node, npm, pnpm, curl or wget. `/app` is root-owned. The OS is Ubuntu 26.04.1. The image is 415.9 MB with 11 layers. |
| | Run read-only | PASS | `ReadonlyRootfs=true`, tmpfs `/tmp`. The status was `healthy` after about 33 s (start-period 60 s, interval 30 s). `podman healthcheck run` gave rc=0. |
| | Base images | PASS | All three `FROM` lines are fully qualified `docker.io/library/...@sha256:`. They match the local image digests and deployment.md §2 / tech-stack §7. I could not check them against the registry (no skopeo; the manifest fetch returned nothing). |
| AC2 | `/` and `/tutor` | PASS | 200 `text/html`, `Cache-Control: no-cache` |
| | Hashed assets | PASS | `/assets/index-BDZDyrpt.js` and the css return `max-age=31536000, public, immutable` |
| | API | PASS | `/api/v1/meta` returns 200 JSON. `/api/v1/x` returns 404 `application/problem+json`, with or without an HTML Accept. |
| | Actuator on :8080 | PASS | `:8080/actuator/health` returns a 404 Problem |
| AC3 | Headers on app-port responses | PASS, with S3 F2 | Every app-port response has the exact CSP (`frame-src 'none'`), `nosniff`, Referrer-Policy, Permissions-Policy and COOP: HTML, assets, JSON, 404/405/406 Problems and HEAD. The exception is Tomcat-level 400s (F2). |
| | Browser at 360/768/1280 on `/`, `/tutor`, `/student/x` and a not-found route | PASS | No CSP console errors. 0 `<style>` elements. `scrollWidth` equals the viewport width. The not-found page renders. |
| AC4 | Full `./scripts/gate.sh` from the repo | PASS | `PASS (11 steps, 123s)`, rc=0. `git status` was clean afterwards. |
| | Fail-fast | PASS | With pnpm removed from PATH, `--from web-install` fails at web-install ("later steps were not run") with rc=1 |
| | Arguments | PASS | `--help` rc=0. `--bogus`, `--from nope` and `--from` with no value each give rc=2. `--list` prints the 11 steps. `ENGLMS_TASK=../../x` and `ENGLMS_TASK='T-M1.5; rm -rf x'` are refused with rc=2. |
| AC5 | Workflow configuration | PASS | `contract-drift` is green on `6c15fa1`. The workflow runs on `pull_request` with no `paths:` filter, has SHA-pinned actions and `persist-credentials: false`. |
| | Required checks | PASS | It is listed in `required-checks.txt` and in `OK_CHECKS` in `merge-gate.test.sh`. |
| | Negative demo | PASS | Run 36148976036 on `11f7e02` concluded `failure`, showing both diffs (`/api/v1/meta` became `/meta-info`). The revert `a972299` leaves an empty net diff. |
| AC6 | Report in `verify` | PASS | `jacoco:0.8.15:report` runs in `verify` (gate log), and `backend/target/site/jacoco/index.html` is produced. OQ-16 is answered (DEC-051). |
| | CI upload | **FAIL (F1)** | See F1: no CI run has ever uploaded `backend-coverage`. |
| AC7 | Docs and config | PASS | All present: deployment §2, ci-cd §1, development-setup §4, tech-stack §7, security §5 "as implemented", open-questions OQ-16, DEC-049..052, `required-checks.txt`, the fixture, `progress.json`. |
| | Evidence summary | Partial | The summary overstates AC6 (F1). |

## Exploratory charter and notes
I probed about 75 cases with curl, all on the running image.

**SPA fallback behaves correctly for:**
- Accept values: `text/html`, a full browser Accept, `*/*` and no Accept all get the SPA. `application/json` gets a 404 Problem.
- Methods: HEAD gets the SPA. POST, PUT, DELETE and OPTIONS on `/tutor` get a 404 Problem.
- Missing files: missing assets, `/assets` and `/assets/` get 404, even with an HTML Accept. So do `/missing.png`, `/favicon.ico` and `/robots.txt`.
- Path tricks: `/apix` and `/API/v1/x` get the SPA, which is correct because they are not the API. `/api`, `/api/`, `//api/v1/x`, `/%61pi/v1/x`, `/api;x=1/v1/x`, `/actuator;x/health` and `/%61ctuator/health` all get a 404 Problem. `/api/v1/meta;x=1` returns 200 JSON, and `/tutor;jsessionid=1` gets the SPA.
- Traversal: `/application.yml` and `/BOOT-INF/classes/application.yml` return 404. Encoded traversal gets a Tomcat 400 (F2).
- `/v3/api-docs` returns the SPA shell, not the spec (springdoc is disabled at runtime).

**Management port :8081:**
- Only `health` (including liveness and readiness), `info` and the `/actuator` index are served. `env`, `heapdump`, `metrics`, `prometheus`, `/`, `/tutor` and `/api/v1/meta` all return 404.
- It carries no security headers, as documented in DEC-050.

**Browser:**
- As a positive control, I injected a `<style>` element. The console logged the `style-src 'self'` violation, which proves violations are captured.
- A ReportingObserver cross-check could not capture my injected violation in this browser, so I did not count it as evidence.
- A keyboard walk worked: switching the language to English and pressing Enter on "Tutor area" navigated with visible focus and no violations.
- The React Aria `touch-action` rule applies from the stylesheet (computed `manipulation`) with no `<style>` injection, as DEC-052 describes.
- The viewport was reset to desktop at the end.

**Evidence honesty:**
- The build, curl, image-inspect, fail-fast and negative-demo logs match what I observed.
- The two gate logs are the same size (106,786 bytes) but are genuinely different runs (different SHAs and timestamps).
- The exception is AC6 (F1).

## Findings

| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| F1 | **S2** | The required check `backend` is red on the PR head, and CI has never uploaded the JaCoCo report (AC6). The evidence summary still marks AC6 PASS. | `gh pr checks 10`, then `gh run view 36149519008 --log-failed`. Also check runs 36149252124 (`427d394`) and 36148976048 (`11f7e02`). | `backend` passes, and the run has a `backend-coverage` artifact that AC6 can point to. | Run 36149519008 fails: `Verify` is a success (83 tests, BUILD SUCCESS, `jacoco:report` ran), but `Upload coverage report` (`if: always()`, no `continue-on-error`) fails with GitHub's "Artifact storage quota has been hit" error. The same happens on `427d394`. On `11f7e02` the upload step found "No files were found" because `verify` had failed. So all 3 branch runs fail, and none uploaded coverage. `merge-gate.sh` will refuse to merge. The summary gives only the workflow YAML as proof for AC6, says "Final head: see the PR checks", and does not mention that the `427d394` run was already red before the summary commit. | `backend.yml` lines 37–51; `evidence/T-M1.5/summary.md` |
| F2 | S3 | Tomcat rejects some requests with 400 before the filter chain runs, so those responses have none of the security.md §5 headers. AC3 says "every response". | `curl -si --path-as-is 'http://127.0.0.1:8080/api%2fv1%2fx'`; the same for `/%2e%2e/%2e%2e/etc/passwd` and `/assets/..%2f..%2fapplication.yml` | The CSP, nosniff, Referrer-Policy, Permissions-Policy and COOP headers, or a documented exception | Tomcat's default HTML "HTTP Status 400 – Bad Request" page with no security headers. There is no reflected input and no server version, so the risk is low, but the gap is undocumented. | probe output |
| F3 | S4 | A raw dot-segment path gets the SPA, not the API/actuator exclusion. Only non-browser clients can send these; browsers normalize them. | `curl -s --path-as-is -o /dev/null -w '%{http_code} %{content_type}' 'http://127.0.0.1:8080/./api/v1/meta'`; the same for `/x/../actuator/health` | A 404 Problem, or the API response, as for `/api/...` | 200 `text/html` (index.html) when Accept is `*/*` or missing. With `Accept: application/json` it is a 404 Problem, because Spring MVC does not route these paths to the controller either, so no handler is bypassed. `SpaFallbackFilter`'s comment says the path is "Decoded, normalised", but `UrlPathHelper` does not resolve `.`/`..`. Suggest a regression case in T-M2.1: Spring Security's StrictHttpFirewall should reject these. | probe output |
| F4 | S4 | Vite's build manifest is served publicly. | `curl -s http://127.0.0.1:8080/.vite/manifest.json` | Not served, since it is not part of the SPA | 200 JSON, `no-cache`. It lists only public hashed asset names, so the leak is harmless. Could be left out of the `static/` copy. | probe output |

## Accessibility summary
There is no new UI in scope. The DEC-052 change to `index.html`/`global.css` keeps behaviour intact (`touch-action` applied, keyboard focus visible). No axe run was needed: web-test in the gate includes the axe tests and passed.

## Isolation / privacy checks
N/A for student isolation: no new endpoints. `api/openapi.json` still lists only `/api/v1/meta`, and the diff does not touch `api/` or the generated types. Springdoc is not exposed. Actuator endpoints are limited to health/info on the internal port.

## Scope
Nothing untraced. The web changes (`index.html`, `global.css`, `csp.test.tsx`) come from the packet's CSP risk and DEC-052. The `OpenApiContractTest` gets an Accept header because of the SPA fallback. `.containerignore` and `.gitignore` support the build. The T-M1.4 status line, the handoff files and the archive are LC governance housekeeping.

## Cleanup
The QA container `englms-qa`, image `englms:qa` and its 2 intermediate images are removed, and so is the clone. `englms-dev-db` is kept. The implementer's `englms:dev` / `englms:clean` images are untouched. The repo is on the branch with a clean `git status`.

## Re-test log
First run. To close F1, do one of the following, then fix AC6 in `summary.md` with the run link:
- Free the Actions artifact storage or wait for the quota to be recalculated, then re-run `backend` on the head and confirm it is green with a `backend-coverage` artifact.
- Or record an LC decision (DEC) on whether a coverage-upload failure may fail a required check, and adjust the workflow.

F2–F4 do not block. They can be fixed or recorded as follow-ups.

QA-VERDICT T-M1.5: FAIL