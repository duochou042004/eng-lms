# T-M1.6: E2E harness: Playwright (6 viewports), helpers, smoke, e2e-smoke CI; /qa skeleton

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **in_progress** (G0-complete; T-M1.5 merged `a96dcf7`; PO approved the start, DEC-056) |
| Owner role | FE (+LC for the CI wiring and the required-checks list) |
| Branch | `feature/T-M1.6-e2e-harness` (from `develop`) |
| Depends on | T-M1.5 merged (the packaged app serves the SPA same-origin) |
| Estimate | 1.5–2 agent-days |
| Trace | NFR-RESP-01, responsive-standards §2–§3, test-strategy §1/§6, qa-protocol §1–§2, ci-cd §1 (`e2e-smoke`), accessibility.md, DEC-052 |

## Goal
A Playwright harness in `/e2e` that drives the **packaged app** (the Boot jar with the SPA, against PostgreSQL 18). It has the six reference viewports as projects,
shared helpers (axe, no horizontal scroll, a console/CSP guard, a step counter, evidence screenshots) and one smoke spec. A required `e2e-smoke` CI job runs the
three mandatory viewports on every PR. A `/qa` skeleton gives the QA Evaluator its own space (qa-protocol §1). It adds no product features.

## Scope
- In:
  1. An `e2e/` package with its own `package.json`, pnpm 12 via corepack, `pnpm-lock.yaml` and the same release-age policy as `web/`. Dependencies: `@playwright/test` and `@axe-core/playwright`
     (on 2026-09-26 the latest were 1.63.0 and 4.13.0; **re-verify the versions and their release age at implementation time**, pin them exactly and record them in tech-stack §7). TypeScript, strict.
  2. `playwright.config.ts`:
     - Six projects matching responsive-standards §2, all Chromium: `phone-small` 360×740, `phone` 390×844, `tablet` 768×1024, `tablet-land` 1024×768, `laptop` 1280×800, `desktop` 1440×900.
     - `baseURL` from `E2E_BASE_URL` (default `http://localhost:8080`).
     - Traces and screenshots on failure; the HTML report under `e2e/playwright-report/` (already gitignored).
     - No retries (flaky policy: test-strategy §3).
  3. Helpers in `e2e/support/`:
     - `expectNoAxeViolations(page)` with the WCAG 2.2 AA tags.
     - `expectNoHorizontalScroll(page)`: `scrollWidth <= innerWidth` (rule §3.1).
     - A **console guard** fixture that fails a test on any console error or `securitypolicyviolation` event. It keeps DEC-052's CSP fix honest.
     - `countSteps()`, a step-budget counter for later flows.
     - `evidenceShot(page, name)`, writing to `evidence/<ENGLMS_TASK>/screenshots/<project>/` when `ENGLMS_TASK` is set.
  4. A smoke spec, run on every project. `/` (landing), `/tutor`, `/student` and an unknown route (the SPA's not-found page) each render their heading in **vi and en**, switched with the language switcher. Each page has no axe violations, no horizontal scroll and no console/CSP errors. Reloading the deep link `/tutor` still works (the SPA fallback).
  5. `scripts/e2e-run.sh`:
     - Builds the jar with the SPA, using the same layout as the image (`web/dist` → `static/`, without `.vite/`).
     - Starts it against the dev DB (`dev-up.sh`) on :8080, and waits for readiness on `:8081/actuator/health/readiness`.
     - Runs Playwright, passing `--project` arguments through, and always stops the app.
     - `gate.sh` gets an `e2e` step (the mandatory projects) after `contract-drift`, and `scripts/tests/gate.test.sh` is updated.
  6. CI job `e2e-smoke` (`.github/workflows/e2e-smoke.yml`):
     - Runs on every PR (no `paths:` filter), with SHA-pinned actions and `persist-credentials: false`.
     - PostgreSQL 18 as a service, pinned by digest (tech-stack §7). Playwright Chromium installed with its OS deps.
     - Runs the three mandatory projects. The report upload on failure is `continue-on-error` (DEC-053).
     - Add `e2e-smoke` to `scripts/required-checks.txt` **and** to `OK_CHECKS` in `scripts/tests/merge-gate.test.sh`.
  7. The `/qa` skeleton:
     - `qa/README.md`: how QA writes black-box checks and where the evidence goes.
     - `qa/playwright.config.ts`, reusing the `e2e` projects.
     - `qa/tests/.gitkeep`.
     - Path ownership: `/qa` is QA-owned (agent-roles §3). Check that `check-path-ownership.sh` allows this LC/FE bootstrap, or record a DEC.
  8. Docs: development-setup §4 (the E2E commands), ci-cd §1 (`e2e-smoke` live), test-strategy §6, tech-stack §7 and qa-protocol (the `/qa` layout).
- Out of scope:
  - The `e2e` seed endpoint, `@Profile("e2e")` and `scripts/seed-e2e`. There is no data until M2; the first packet with data adds them.
  - `e2e-nightly` (all 6 projects + Firefox/WebKit + PIT; M2+).
  - Visual snapshot baselines.
  - The critical flows F1–F9 (they get their own packets).
  - The T-M1.8/T-M1.9 follow-ups. If axe finds a T-M1.9 item, record it against T-M1.9; don't fix it here unless an AC fails.

## Guardrail answers (scope.md §6)
1. Trace: NFR-RESP-01, test-strategy, qa-protocol. 2. No drift. 3. No tutor setup. 4. N/A (engineering). 5. No exam semantics.

## Acceptance criteria
- **AC1:** `cd e2e && pnpm install --frozen-lockfile && pnpm exec playwright test --list` lists the smoke tests for all six projects, and the versions are pinned exactly.
- **AC2:** `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop` passes locally against the packaged app. No app process is left running, including after a failure.
- **AC3:** The smoke passes on all **six** projects locally (the log is in the evidence). Each smoke page has screenshots at `phone-small`, `tablet` and `laptop`.
- **AC4:** The helpers work. Negative demos show a failing test for (a) an injected axe violation, (b) forced horizontal overflow and (c) a CSP violation / console error. Use a throwaway branch or a test-only page; nothing ships in the product bundle.
- **AC5:** `e2e-smoke` is green on the PR and runs on every PR. It is in `required-checks.txt` and in the merge-gate fixture, and the Playwright report is uploaded on failure.
- **AC6:** `gate.sh` runs the `e2e` step, fail-fast is preserved and the script tests are updated.
- **AC7:** The `/qa` skeleton exists with its README; the docs in scope item 8 are updated; `progress.json` and `evidence/T-M1.6/summary.md` are updated.

## Test plan
- Implementation: the smoke spec itself; a negative demo for each helper; a script test for `e2e-run.sh` argument handling and cleanup (with stubs).
- Independent QA focus:
  - Run the harness from a clean clone.
  - Check that the viewports match responsive-standards §2.
  - Break a page on purpose to confirm the guards fail.
  - Confirm the CI job is required.

## Evidence required
`evidence/T-M1.6/summary.md`, the local six-project run log, the screenshots (phone-small/tablet/laptop), the negative demos, the gate log, the CI links and the QA report.

## Risks and assumptions
- Playwright's browser download is large. CI caches it, keyed on the Playwright version. The PR job uses Chromium only.
- A local `e2e-run.sh` run needs the dev DB (`dev-up.sh`) and free ports 8080/8081. It must fail clearly if they are busy.
- pnpm's release-age policy may reject the newest Playwright. Use the newest allowed version and record it, as in T-M1.3.
- The account's Actions artifact storage quota is exhausted (DEC-053), so report uploads may fail until the PO frees storage. They must not block the check.

## Commands
```bash
./scripts/dev-up.sh
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
(cd e2e && pnpm exec playwright test)            # against an already running app (E2E_BASE_URL)
```
