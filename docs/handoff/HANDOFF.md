# Handoff — 2026-09-25 (T-M1.4 merged; T-M1.5 ready)

Phase/Milestone: P1 / M1 · Current task: **T-M1.5 (ready; waiting for the PO start signal)** · Branch: `feature/T-M1.5-single-image` · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1 (`f1e3caa`), T-M1.2 (`ae9ac5d`), T-M1.3 (`8b9d938`) and **T-M1.4 (`294d597`)** are merged through merge-gate. QA reports: PR #3, #5 and #9.
  Required CI: docs-check, secrets-scan, backend, web.
- **T-M1.4:** `deploy/compose.dev.yaml` (postgres:18 pinned by index digest, loopback only), `.env.example`, `scripts/env.sh` (source it for local Testcontainers),
  `scripts/dev-up.sh` / `dev-down.sh [--purge]`, and 12 script tests. Local `verify` passes 52/52 with no leftover containers. QA **PASS WITH MINOR**.
- **Known local issue** (T-M1.8, DEC-047): Surefire force-kills the test JVM 30 s after the tests on local Podman runs. The build passes, and CI is unaffected.
- The PO asked that merged branches be deleted: every merged PR branch is already gone locally and on GitHub (merge-gate deletes them; verified, DEC-046).
- The T-M1.5 packet (`docs/tasks/T-M1.5-single-image.md`) is G0-complete: Containerfile, SPA fallback + cache and security headers, `gate.sh`, `contract-drift` CI, JaCoCo (OQ-16).

## Next steps
1. The PO gives the start signal for T-M1.5. Implement it, then QA, LC-APPROVED and merge-gate; the QA report goes on `qa/T-M1.5`.
2. Then T-M1.6 (E2E harness), T-M1.7 (merge-gate hardening), T-M1.8 (backend follow-ups) and T-M1.9 (web a11y follow-ups, **before the M2 routes**).
3. The open Dependabot PRs #6 (web tooling group: its `web` check FAILS) and #7 (`@types/node` 26) need LC triage. Don't merge #6 as is.

## Pending PO decisions
The T-M1.5 start signal. OQ-03..OQ-14 (defaults documented). OQ-16 is answered by T-M1.5 when it merges.

## Gotchas
- Subagents can't write files: record their text (QA reports go on `qa/<task>`; the UX record for T-M1.3 is the PR #4 comments).
- Run UX and QA agents one after the other if both use the browser or ports. PR numbers can skip (Dependabot takes numbers), so check `gh pr list`.
- Wait for CI with until-loops that match the head SHA (`gh run list --json headSha,status`), not a bare sleep.
- pnpm 12: no `-s`; release-age policy. zsh: `${=var}`. Kill by PID. Adding a required check means updating `OK_CHECKS` in `scripts/tests/merge-gate.test.sh`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.5-single-image.md`.
