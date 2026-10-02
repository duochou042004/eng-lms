# Handoff — 2026-10-02 (Dependabot triage; T-M1.16 packet)

Phase/Milestone: P1 / M1 · Current task: **T-M1.16 (ready; PO start signal pending)** · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 exit criteria are met** by merged work (gate green locally and in CI; backend skeleton + Modulith + Flyway V1; same-origin SPA; Playwright smoke at 3 viewports
  with axe; contract drift; Testcontainers on rootless Podman). T-M1.1..T-M1.9 and T-M1.11..T-M1.15 are merged. Left in M1: **T-M1.16** (review polish + Maven 3.10.0,
  packet on PR `docs/T-M1.16-packet`) and T-M1.10 (TS 7, waits for upstream; proposed to the PO: don't let it block M2).
- **Dependabot triage (DEC-082):** #29, #30, #33, #34 (types/react-query) and #32 (oxlint/vitest) go through `@dependabot rebase` + CI + `LC-APPROVED PR-<n>` +
  merge-gate one at a time; #31 (Maven) closed, its bump is T-M1.16 item 7. Check `gh pr list` for any that are still open (e.g. if #32's E2E fails again).
- The GitLab mirror is kept as a backup (DEC-080).

## Next steps
1. Merge the `docs/T-M1.16-packet` PR (fresh DOCS-REVIEW PASS, LC-APPROVED after CI) if still open; finish any open Dependabot PRs the same way.
2. PO start for T-M1.16 → a frontend-implementer (items 1–5) and the LC (items 6–8) on `feature/T-M1.16-review-polish`; G3 = QA + UX.
3. Then M2: write the T-M2.1 packet (identity core; SEC review applies).

## Pending PO decisions / actions
- T-M1.16 start. T-M1.10 outside the M1 exit path (proposal). Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- Branch names must be `<kind>/<task-id>-<slug>`; the monthly deps batch too (`chore/<task-id>-deps-YYYY-MM` after T-M1.16).
- Dependabot PRs: `@dependabot rebase`, never "Update branch"; only manifests/lockfiles/wrapper-properties changes pass merge-gate.
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`; DOCS `PASS`; SEC and UX `APPROVED`.
- `git merge` is denied: `gh pr update-branch <n>`; update before editing `progress.json` if it would conflict.
- Subagents share the working tree: give each a worktree or forbid checkouts; `gh pr close -d` switches the current checkout.
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u`; `./scripts/gitlab-sync.sh` after merges; stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.16-review-polish.md` → the frontend-standards skill.
