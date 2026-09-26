# T-M1.6 evidence summary: E2E harness (Playwright, 6 viewports), guards, smoke, e2e-smoke CI, /qa skeleton

Branch `feature/T-M1.6-e2e-harness` · PR: see below · Packet `docs/tasks/T-M1.6-e2e-harness.md` · PO start: DEC-056

## AC → proof

| AC | Result | Proof |
|---|---|---|
| **AC1** `pnpm install --frozen-lockfile` + `playwright test --list` lists the smoke for 6 projects; exact pins | PASS | `e2e/package.json` pins `@playwright/test` 1.63.0, `@axe-core/playwright` 4.13.0, `typescript` 6.0.3, `@types/node` 24.13.6 (no ranges); `e2e/pnpm-lock.yaml`; projects `phone-small` 360×740, `phone` 390×844, `tablet` 768×1024, `tablet-land` 1024×768, `laptop` 1280×800, `desktop` 1440×900 (`e2e/playwright.config.ts`, responsive-standards §2). Versions recorded in tech-stack §7 |
| **AC2** `e2e-run.sh` with the mandatory projects passes against the packaged app; no app left running, also after a failure | PASS | `gate-20260926T025016Z.log` `e2e` step: 15 smoke + 4 guard self-tests on the mandatory projects, "app stopped". `scripts/tests/e2e-run.test.sh` (13 cases): the app is stopped after a pass **and** after a failing run, the Playwright exit code propagates, a busy port and a missing datasource are refused. `negative-demo-guards.log` also shows "app stopped" after failing runs |
| **AC3** smoke passes on all six projects; screenshots at phone-small/tablet/laptop | PASS | `e2e-six-projects.log` (re-recorded after the QA round-1 fixes, QA F6): **46 passed, 26 skipped** (6 smoke tests × 6 projects + the guard self-tests on their target projects), exit 0, "app stopped". `screenshots/{phone-small,tablet,laptop}/` — 8 each (landing, tutor, student, not-found × vi/en); the other three projects' shots were taken but not committed (size) |
| **AC4** guards fail on an axe violation, horizontal overflow and a CSP violation/console error | PASS | `negative-demo-guards.log`: a throwaway spec (deleted, never committed). Run 1: overflow ✘ (`scrollWidth 3000 > innerWidth 1280`), inline `<style>` ✘ (`console.error: Applying inline style violates … 'style-src 'self''` + `CSP violation: style-src-elem blocked inline`); the axe demo **passed** because the demo injected the `<img>` before React rendered `main` (a race in the demo). Run 2 (fixed demo): axe ✘ (`image-alt (critical)`). The cases are permanent self-tests in `e2e/tests/guards.spec.ts` (they assert that each guard throws). **QA round 1 found F1 (S2):** the overflow guard used `window.innerWidth`, which mobile emulation widens, so it was blind on phone-small/phone/tablet; fixed (compare with `clientWidth`; the self-test now runs +40/+3000 px on phone-small, tablet and laptop), plus a second-page console-guard self-test (F2), DEC-058 |
| **AC5** `e2e-smoke` green on the PR, on every PR, required, report uploaded on failure | see CI | `.github/workflows/e2e-smoke.yml`: `pull_request` with no `paths:`, SHA-pinned actions, `persist-credentials: false`, PostgreSQL 18 service pinned by digest, report upload `if: failure()` + `continue-on-error` + `retention-days: 5`. `e2e-smoke` is in `scripts/required-checks.txt` and in `OK_CHECKS` (`merge-gate.test.sh`). CI links below |
| **AC6** `gate.sh` runs the `e2e` step; fail-fast kept; script tests updated | PASS | `gate.sh` has 12 steps (the last is `e2e`, mandatory viewports); `gate.test.sh` 25 cases (order, e2e args, fail-fast, `--from`); `gate-20260926T025016Z.log`: **PASS (12 steps, 150 s)** at `9694be5`; final head: `gate-20260926T031128Z.log` **PASS (12 steps, 151 s)** at `199c7e9` (QA R2-1) |
| **AC7** `/qa` skeleton + README; docs; progress; summary | PASS (qa part on `qa/T-M1.6`) | `/qa` is QA-owned, so its skeleton (README, QA's own pinned Playwright package and config with 6 viewports × 1 or 3 engines, `plans/`, `e2e/`, `regression/`) is committed on `qa/T-M1.6` (DEC-057). Docs: development-setup §4, ci-cd §1 (+ the 5-day artifact rule), test-strategy §6, tech-stack §7; `progress.json`; this file |

## Also in this PR (PO requests, DEC-056)
- Artifact retention: every `upload-artifact` keeps **5 days** (backend coverage + test reports, e2e report). The PO freed the account storage.
- Dependabot: **#6** (TypeScript 7) and **#7** (`@types/node` 26) closed with reasons; `dependabot.yml` ignores those majors (web/, e2e/, qa/); **T-M1.10** (TS 7 migration) in the backlog; npm entries for `/e2e` and `/qa`.

## Decisions
DEC-056 (PO start, retention, Dependabot triage), DEC-057 (implementation choices), DEC-058 (QA round 1: F1/F2/F4/F6/F7 fixed, F3 → T-M1.9, F5 by merging qa/T-M1.6).

## CI
- `386f516`: all 7 checks green (e2e-smoke https://github.com/duochou042004/eng-lms/actions/runs/36213091797). The backend coverage artifact upload still hit the account quota (GitHub recalculates usage 6–12 h after the PO's cleanup); non-blocking by DEC-053.

## Files
`e2e-six-projects.log`, `negative-demo-guards.log`, `gate-*.log`, `screenshots/`.
