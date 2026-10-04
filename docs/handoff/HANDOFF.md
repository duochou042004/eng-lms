# Handoff — 2026-10-04T01:50Z (M1 done; M2 next: T-M2.1 packet; T-M1.17 first among the carried items)

Phase/Milestone: P1 / M2 (not started) · Current task: **T-M2.1 (draft; packet not written)** · Branch: `docs/T-M1.16-m1-signoff` · Last commit on develop: `59143de` · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **M1 is done** (PO, DEC-088): G5 regression PASS WITH MINOR on 3 engines × 6 viewports (DEC-087, `evidence/M1/qa-regression.md`), retro `evidence/M1/retro.md`.
  The retro's proposals are now rules: qa-protocol §3 "Repeat runs" (E2E changes ×3, timing-sensitive ×20) and quality-gates G3 (cheap S3/S4 fixes to reused pieces in the same task).
- Carried past M1 (backlog section): **T-M1.17 first** (PO, DEC-086: merge-gate reports an unsupported `gh`), then T-M1.18 (`qa/` typecheck in the gate), T-M1.10 when upstream is ready.
- T-M2.4 now also carries M1 G5 QA F-3/F-4 (offline shell-chunk feedback; 404 for unknown shell sub-paths).

## In flight
- This docs PR (DEC-088, the M1 close, the new rules, the next-session prompt). Nothing else open.

## Next steps
1. T-M2.1 packet (identity core) with the task-packet skill; SEC review at G3; DOCS-REVIEW, merge-gate; ask the PO for the start signal.
2. T-M1.17 (LC; packet first, then implementation with mocked-`gh` tests), then T-M1.18.

## Pending PO decisions / actions
- T-M2.1 start signal (after its packet). Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- `.env*` files are unreadable by rule: the PO creates `.env` (and links it into any worktree); `glab` is a snap; merge-gate needs `gh` ≥ 2.101; WebKit deps installed.
- Branch names must be `<kind>/<task-id>-<slug>`; qa/ branches may only change `qa/**` and `evidence/*/qa/**`.
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`; post them after CI is green for the final head.
- `git merge` is denied: `gh pr update-branch <n>`. Give each subagent its own git worktree. Only one E2E run at a time (ports 8080/8081).
- `check-docs.sh` also scans `.claude/worktrees/*` copies (a subagent worktree on another branch makes it fail): remove finished subagent worktrees (`git worktree remove --force …`) before running the gate (T-M1.17).
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u`; `./scripts/gitlab-sync.sh` after merges; stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/backlog.md` (M2, "Carried past M1") → `.claude/skills/task-packet`.
