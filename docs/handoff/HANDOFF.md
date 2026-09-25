# Handoff — 2026-09-25 14:40 UTC (T-M1.3 merged; T-M1.4 ready)

Phase/Milestone: P1 / M1 · Current task: **T-M1.4 (ready; waiting for the PO start signal)** · Branch: `feature/T-M1.4-local-stack` · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1 (`f1e3caa`), T-M1.2 (`ae9ac5d`) and **T-M1.3 (`8b9d938`)** are merged through merge-gate. The QA reports are merged (PR #3, PR #5).
- **T-M1.3:** `web/` (Vite 9 template, React 19, TS strict, pnpm 12). Tokens + contrast check, 8 `ui/` primitives, i18n vi default + en, lazy shells, an openapi-fetch client,
  a bundle budget, and `web` CI (required). UX: round 1 CHANGES REQUESTED → fixed; round 2 **APPROVED**. The UX record is the PR #4 comments (see Gotchas). QA **PASS WITH MINOR**.
- **Deferred to T-M1.9** (DEC-043, DEC-045): route focus/titles, a segmented language control, 44 px link targets, `RouteLoading` layout, error copy without a request ID,
  the dev i18n namespace in the production bundle, and the `window.fetch` lint gap. **T-M1.9 must land before the M2 routes.**
- The user `podman.socket` is **enabled** (PO-approved, DEC-044). Local `./mvnw -B verify` with `DOCKER_HOST` + `TESTCONTAINERS_RYUK_DISABLED=true` passes 52/52.
- The T-M1.4 packet (`docs/tasks/T-M1.4-local-stack.md`) is G0-complete: compose.dev (digest-pinned postgres:18), env.sh, dev-up/down, the Testcontainers proof.

## Next steps
1. The PO gives the start signal for T-M1.4. Implement it (backend-implementer), then QA, LC-APPROVED and merge-gate.
2. Then T-M1.5 (Containerfile, SPA serving, `gate.sh`, contract-drift; OQ-16 JaCoCo default), T-M1.6 (E2E), T-M1.7, T-M1.8 and T-M1.9 (hardening and follow-ups).

## Pending PO decisions
The T-M1.4 start signal. OQ-03..OQ-14 and OQ-16 (defaults documented).

## Gotchas
- Reviewer evidence (`evidence/*/review/`) can't be committed on feature branches. A docs/chore PR needs its own DOCS-REVIEW (don't re-use another PR's verdict).
  For T-M1.3 the UX record of truth is the two PR #4 comments. QA reports go on `qa/<task>` with `LC-APPROVED <task>`.
- Subagents can't write files: record their text. Run the UX and QA agents one after the other (they share the browser pane and ports).
- pnpm 12: no `-s`. Release-age policy (1 day). `allowBuilds` in `web/pnpm-workspace.yaml`. zsh: `${=var}`. Kill by PID. Foreground `sleep` chains are blocked: use until-loops.
- Adding a required check means updating `OK_CHECKS` in `scripts/tests/merge-gate.test.sh`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.4-local-stack.md`.
