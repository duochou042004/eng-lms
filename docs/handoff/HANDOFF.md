# Handoff — 2026-09-25 (T-M1.1 in review)

Phase/Milestone: P1 / M1 · Task: **T-M1.1 (in_review)** · Branch: `chore/T-M1.1-repo-governance` · Remote: https://github.com/duochou042004/eng-lms (private)

## Where we are
- **PO-APPROVED T-M0.1** (DEC-032). The baseline is merged into `develop` (`a14caae`, a one-time bootstrap `--no-ff`, DEC-030). OQ-01 and OQ-15 use their defaults (DEC-033, DEC-034).
- The private repo exists with default branch `develop` and merge commits only. **Branch protection is unavailable** (403, free plan) → harness enforcement (DEC-031).
- T-M1.1 is implemented: `docs-check` + `secrets-scan` workflows, `merge-gate.sh`, `check-path-ownership.sh`, the pre-push hook, 34 script tests, `.claude/settings.json`,
  and the README redesign (DEC-035). PR #1 is open (see `progress.json`).
- The T-M1.2 packet (backend skeleton) is written and `ready`.

## In flight
PR #1: waiting on CI, then DOCS-REVIEW, then LC-APPROVED, then `./scripts/merge-gate.sh <pr>`.

## Next steps (in order)
1. Finish PR #1 via merge-gate. Record the merge commit and CI run URLs (evidence/T-M1.1/summary.md "CI"; progress.json completed[]).
2. `git checkout develop && git pull && git checkout -b feature/T-M1.2-backend-skeleton` → execute T-M1.2 as BE (backend-implementer).
3. Ask the PO about T-M1.4's persistent user service (`systemctl --user enable --now podman.socket`) before that task starts.

## Blockers and pending PO decisions
None blocking. OQ-02..OQ-14 are open, with defaults (needed from M1.3 onwards: OQ-02 language).

## Gotchas
- Run `./scripts/install-hooks.sh` in every clone. **Never** push `develop` or `master` directly. Merge only through `merge-gate.sh` (`gh pr merge` is denied for agents).
- `.claude/settings.json` is active: it denies force pushes, direct pushes, `gh pr merge` and `sudo`.
- zsh globbing: quote `gh api 'repos/...?ref=x'` URLs that contain `?`.
- Private-repo Actions badges render only for signed-in collaborators.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.2-backend-skeleton.md`.
