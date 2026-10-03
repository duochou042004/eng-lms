# Handoff — 2026-10-03 (T-M1.16 merged; all M1 packets merged; M1 awaits G5)

Phase/Milestone: P1 / M1 (in review for G5) · Current task: **T-M2.1 (draft; packet not written)** · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **New device** (Ubuntu 26.04.1, clone `/home/kali/App_sources/eng-lms`) set up by development-setup §0 and proven by the full gate (DEC-084); versions in `progress.json` `environment`.
- **T-M1.16 merged** as `1dbd7e3` (PR #43, merge-gate, CI 7/7): switcher skeletons sized from the switcher, `/dev/ui` example, lint loopholes, merge-gate file pages,
  Maven 3.10.0, deps-batch branch name, and the flaky route-focus test fixed. QA PASS WITH MINOR (record PR #44), UX APPROVED (`evidence/T-M1.16/review/ux.md`).
  S4s accepted; review R2-1 → backlog **T-M1.17** (merge-gate should report an unsupported `gh`), not an M1 exit criterion (DEC-085).
- **All M1 packets are merged.** M1 is `in_review`: gate G5 (quality-gates §G5) is still open. T-M1.10 stays upstream-gated (DEC-083).

## Next steps
1. M1 G5: a fresh qa-evaluator runs the milestone regression (full E2E on all 6 viewports × Chromium, smoke on Firefox and WebKit; `evidence/M1/`), the LC writes
   `evidence/M1/retro.md` (risk register, decision log, roadmap reviewed), the PO signs off; then `milestone.status` = `done`.
2. T-M2.1 packet (identity core; task-packet skill; SEC review at G3), DOCS-REVIEW, PO start signal.
3. T-M1.17 when convenient (small LC chore).

## Pending PO decisions / actions
- M1 G5 sign-off. Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- `.env*` files are unreadable by rule: the PO creates `.env` (and links it into any worktree); `glab` is a snap (`/snap/bin/glab`); merge-gate needs `gh` ≥ 2.101.
- Branch names must be `<kind>/<task-id>-<slug>`; verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`. Verdicts must be posted after the head push.
- `git merge` is denied: `gh pr update-branch <n>`; update before editing `progress.json` if it would conflict. Dependabot PRs: `@dependabot rebase`.
- Subagents share the working tree: give each a worktree or forbid checkouts; `gh pr close -d` switches the current checkout. Only one E2E run at a time (ports 8080/8081).
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u`; `./scripts/gitlab-sync.sh` after merges; stage explicit paths.
- Short sessions: hand off at ~300–400k tokens with a goal-mode prompt (≤ 4000 chars) in `docs/handoff/next-session-prompt.md`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/06-quality/quality-gates.md` §G5 → `docs/tasks/backlog.md` (M2).
