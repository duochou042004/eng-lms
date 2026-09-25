# Handoff — 2026-09-25 12:30 UTC (T-M1.2 merged; T-M1.3 ready)

Phase/Milestone: P1 / M1 · Current task: **T-M1.3 (ready, not started; waiting for the PO start signal)** · Branch: `feature/T-M1.3-web-skeleton` · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **T-M1.2 is done.** PR #2 was merged through `scripts/merge-gate.sh` as `ae9ac5d` (head `fbc9689`). CI is green: docs-check, secrets-scan, and `backend` (52 tests, including Testcontainers PostgreSQL 18).
  QA verdict: **PASS WITH MINOR** (4 × S4). F2 was fixed. F1/F3/F4 are deferred to **T-M1.8** (DEC-041). The QA report was merged via PR #3 (`02b706c`, `qa/T-M1.2`).
- `backend/`: Boot 4.1.1 / Java 25 / Modulith 2.1.1, with modules `shared` and `settings` (`GET /api/v1/meta`), Flyway V1, and the contract `api/openapi.json`.
  The implementation choices are in DEC-040 (JDBC event registry; springdoc `-api` without UI; `/v3/api-docs` disabled at runtime).
- `backend` is a required check (`scripts/required-checks.txt`) and runs on every PR. Dependabot now covers `maven`.
- The T-M1.3 packet (`docs/tasks/T-M1.3-web-skeleton.md`) is G0-complete: vi default + en, tokens, 8 `ui/` primitives, shells, API client, `web` CI.

## In flight
Nothing. This branch only has the post-merge bookkeeping commit. It becomes the T-M1.3 implementation branch.

## Next steps
1. The PO gives the start signal for T-M1.3. Implement it (frontend-implementer role). At G3 it needs a **UX review and independent QA**, then the LC merges via merge-gate from `develop`.
2. Ask the PO to approve the persistent user-level `podman.socket` (T-M1.4). Until then, Testcontainers tests run in CI only (`-DexcludedGroups=container` locally).
3. Schedule T-M1.7 (merge-gate hardening) and T-M1.8 (error-surface follow-ups). OQ-16 (JaCoCo timing) defaults to T-M1.5.

## Pending PO decisions
The T-M1.3 start signal. The T-M1.4 persistent user service. OQ-03..OQ-14 and OQ-16 (defaults documented).

## Gotchas
- QA subagents can't write files (the harness returns findings as text). The LC records the report verbatim on a `qa/<task>` branch (path ownership forbids QA paths on feature branches) and merges it with `LC-APPROVED <task>`.
- Adding a required check means updating the `OK_CHECKS` fixture in `scripts/tests/merge-gate.test.sh`.
- Modulith observability proxies module beans, so bean classes in modules must not be `final`.
- Run `./scripts/install-hooks.sh` per clone. Never push `develop`/`master`. Verdicts count only if the verdict is on the first line and posted after the head commit.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.3-web-skeleton.md`.
