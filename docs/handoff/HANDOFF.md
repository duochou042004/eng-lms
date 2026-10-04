# Handoff — 2026-10-04T00:31Z (M1 G5 regression done; M1 awaits the PO sign-off)

Phase/Milestone: P1 / M1 (`awaiting_approval`) · Current task: **T-M2.1 (draft; packet not written)** · Branch: `docs/T-M1.16-m1-g5` · Last commit on develop: `2fc6935` (regression suite; build under test `fc288b3`) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **M1 G5 regression done** (DEC-087): QA-VERDICT PASS WITH MINOR at `fc288b3`: 22 regression scenarios × 6 viewports × Chromium, Firefox and WebKit, 132/132 per
  engine and 396/396 ×3; implementer E2E 161 passed on 6 viewports; gate PASS; CI 7/7. Report `evidence/M1/qa-regression.md`, retro `evidence/M1/retro.md`,
  risk register reviewed (R-07 closed). S4s: F-3, F-4 → T-M2.4; F-6's gate step → new **T-M1.18**; F-2 accepted (Firefox/COOP Playwright hang, workaround in the spec).
- **PO (DEC-086):** T-M1.17 captures the `gh` issue; it comes **first** among the "Carried past M1" items, then T-M1.18; T-M1.10 when upstream is ready.
- WebKit's system libraries are installed on this device now (the PO ran `playwright install-deps webkit`).

## In flight
- PR #46 (`qa/T-M1.16-m1-regression`: the regression suite and `evidence/M1/qa/`) is merged (`2fc6935`); this docs PR (#47: the report, retro, DEC-086/087)
  cites its files and merges after it via merge-gate.

## Next steps
1. Ask the PO to sign off M1's G5 (record a DEC); then `milestone.status` = `done`, `gates.G5` = pass.
2. T-M2.1 packet (identity core; task-packet skill; SEC review at G3), DOCS-REVIEW, PO start signal.
3. T-M1.17 (first of the carried items), then T-M1.18.

## Pending PO decisions / actions
- M1 G5 sign-off. Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- `.env*` files are unreadable by rule: the PO creates `.env` (and links it into any worktree); `glab` is a snap; merge-gate needs `gh` ≥ 2.101.
- Branch names must be `<kind>/<task-id>-<slug>` (milestone work rides on a task ID); qa/ branches may only change `qa/**` and `evidence/*/qa/**`.
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`; post them after CI is green for the final head.
- `git merge` is denied: `gh pr update-branch <n>`. Subagents share the working tree: give each a worktree. Only one E2E run at a time (ports 8080/8081).
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u`; `./scripts/gitlab-sync.sh` after merges; stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `evidence/M1/qa-regression.md` → `docs/tasks/backlog.md` (M2, carried items).
