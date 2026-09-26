# Handoff — 2026-09-26 (T-M1.5 merged; T-M1.6 ready)

Phase/Milestone: P1 / M1 · Current task: **T-M1.6 (ready; awaiting the PO start signal)** · Branch: `feature/T-M1.6-e2e-harness` · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1 (`f1e3caa`), T-M1.2 (`ae9ac5d`), T-M1.3 (`8b9d938`), T-M1.4 (`294d597`) and **T-M1.5 (`a96dcf7`, PR #10)** are merged through merge-gate.
  The QA report for T-M1.5 is PR #11 (`afd6a9b`). The required CI checks are now: docs-check, secrets-scan, backend, web and **contract-drift**. `container` (a build-only image check) runs on every PR but isn't required.
- **What T-M1.5 delivered:**
  - `deploy/Containerfile`: 3 stages, digest-pinned bases, a JRE runtime running as uid 10001, a read-only root + tmpfs `/tmp`, and a HEALTHCHECK. Build it with `--format docker`.
  - `shared.web`: the SPA fallback, cache headers and the security.md §5 headers.
  - `scripts/gate.sh` (fail-fast; `--list`, `--from`; `ENGLMS_TASK` writes a log) and `scripts/contract-drift.sh`.
  - JaCoCo: its totals appear in the CI job summary (`scripts/coverage-summary.sh`).
  - Decisions DEC-049..DEC-055.
- **The QA story:** round 1 FAILED on F1. The `backend` check was red because the **account-wide GitHub Actions artifact storage quota** is exhausted. Fixed by DEC-053: coverage goes to the job summary and the uploads are `continue-on-error`. Round 2: PASS WITH MINOR.
- **Deferred:**
  - To T-M1.8: F2 (Tomcat 400s have no security headers), R2-1 (a failed non-blocking upload is silent) and R2-3 (a test for `coverage-summary.sh`).
  - To T-M2.1: F3 (raw dot-segment paths get the SPA shell).
- **CSP:** React Aria's runtime `<style>` injection is pre-empted by a `<template id="react-aria-pressable-style">` in `index.html` (DEC-052). The T-M1.6 console guard must keep catching CSP violations.

## Next steps
1. Ask the PO for the **T-M1.6** start signal (the packet `docs/tasks/T-M1.6-e2e-harness.md` is G0-complete). Then implement, QA and merge-gate.
2. Then T-M1.7 (merge-gate hardening), T-M1.8 (backend follow-ups) and T-M1.9 (web a11y follow-ups, **before the M2 routes**).
3. The open Dependabot PRs #6 (web tooling group; its `web` check FAILS) and #7 (`@types/node` 26) still need LC triage. Don't merge #6 as is.

## Pending PO decisions / actions
- The start signal for T-M1.6.
- **Free the GitHub Actions artifact storage** on the account (this repo holds none), or accept that uploads fail until it's recalculated (DEC-053). The LC does not delete data.
- OQ-03..OQ-14 (defaults documented).

## Gotchas
- Subagents can't write files: record their text (the QA report goes on `qa/<task>`). If a background agent dies on a rate limit, resume it with SendMessage.
- A host restart wipes the scratchpad and stops `englms-dev-db`: rerun `./scripts/dev-up.sh`. Agent transcripts under the session's tasks folder survive.
- zsh word-splits differently: write probe loops as bash scripts (`evidence/T-M1.5/probe.sh`). `.env*` reads are blocked: use `--env-file .env`.
- Wait for CI with until-loops that match the head SHA. A new push cancels in-progress runs for the same ref (concurrency).
- `git revert` fails if the working tree is dirty; don't chain `--amend` after it blindly.
- pnpm 12: no `-s`. Adding a required check means also updating `OK_CHECKS` in `scripts/tests/merge-gate.test.sh`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.6-e2e-harness.md`.
