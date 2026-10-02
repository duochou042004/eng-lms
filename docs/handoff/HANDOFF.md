# Handoff — 2026-10-02 (T-M1.14 merged; M1 nearly done)

Phase/Milestone: P1 / M1 · Current task: **T-M1.16 (draft: S4 polish, no packet yet)** · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1..T-M1.9 and T-M1.11..T-M1.15 are merged through merge-gate. **T-M1.14** (`3a405ce`, PR #37): the flaky request-ID test is
  deterministic (strict UUIDv7 header, body `requestId` == header, no echo of `bad<id>`/`<`); QA-VERDICT PASS; DEC-081. Open in M1: **T-M1.16** (S4 polish stub,
  DEC-079) and T-M1.10 (TS 7, waits for upstream).
- **DEC-080 (PO, 2026-10-02):** T-M1.14 started; **the GitLab mirror is kept as a backup** (GitHub stays the only merge path; GitLab CI not required; image digests
  bumped by hand with the monthly batch). `backend-coverage` uploads on GitHub again.
- **Open PRs:** #38 `qa/T-M1.14` (QA record, LC-only path); this branch `docs/T-M1.14-merge-record` (DEC-081, state); **six Dependabot PRs #29–#34** (npm
  `@types/node` ×3, `@tanstack/react-query`, a web tooling group; Maven 3.9.16 → 3.10.0) not yet triaged.

## Next steps
1. Merge #38 and this branch via merge-gate (this one needs a fresh `DOCS-REVIEW T-M1.14: PASS`).
2. Triage the Dependabot PRs (git-governance: Dependabot path; `@dependabot rebase`, never "Update branch"; the Maven bump changes the wrapper: OQ-17 content check).
3. T-M1.16 packet (task-packet skill; FE + LC items, UX review at G3) → PO start. Then check the M1 exit criteria (roadmap.md) and plan M2 (T-M2.1).

## Pending PO decisions / actions
- T-M1.16 start (after its packet). Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- Branch names must be `<kind>/<task-id>-<slug>` (merge-gate refuses others, e.g. `docs/DEC-080-…`).
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`; DOCS `PASS`; SEC and UX `APPROVED`.
- `git merge` is denied: `gh pr update-branch <n>`. If `progress.json` would conflict, update the branch **before** editing `progress.json`.
- Subagents share the working tree: give each one its own worktree or tell it not to checkout branches; `gh pr close -d` switches the current checkout.
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u` (don't type them).
- `./scripts/gitlab-sync.sh [branch]` after merges and on branches under review. Stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/backlog.md` (T-M1.16 row, DEC-079) → the task-packet skill.
