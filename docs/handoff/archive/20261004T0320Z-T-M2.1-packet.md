# Handoff — 2026-10-04T03:20Z (T-M2.1 packet merged, PO start signal requested; T-M1.17 merged; T-M1.18 in review)

Phase/Milestone: P1 / M2 (started: packet only) · Current task: **T-M2.1 (packet at G0, `bb6fbd5`; waits for the PO start signal)** · Branch: `chore/T-M1.18-qa-typecheck` · Last merge on develop: `077f4e4` (T-M1.17) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.1 packet** (`docs/tasks/T-M2.1-identity-core.md`, 11 ACs, backend only, SEC review at G3) merged via merge-gate after DOCS-REVIEW rounds 1–4 (DEC-089, DEC-090).
  Key choices: audit records identity's events (no identity → audit call); principal = `userId`; login answers 401 while locked; `/meta` passes the must-change gate;
  filter order CSRF → 401 → L1 role → must-change → 404; fallback split of AC11 (CLI + retention) into T-M2.1b by DEC.
- **The PO start signal for T-M2.1 was requested in chat**, with confirmation of DEC-089 (6)–(8). Not received yet.
- **T-M1.17 done** (`077f4e4`): merge-gate names an unusable `gh pr checks --json` (gh's error, gh ≥ 2.101) instead of "missing checks".
- **T-M1.18** (LC): `qa-typecheck` step in `gate.sh` (before `e2e`), "Typecheck the QA suite" in `e2e-smoke` and the GitLab `web` job; PR #51 (DOCS-REVIEW PASS; merged if `gh pr list` no longer shows it).

## Next steps
1. If PR #51 (T-M1.18) is still open: CI green → DOCS-REVIEW verdict → LC-APPROVED → merge-gate → gitlab-sync.
2. On the PO start signal (record a DEC): set the T-M2.1 packet `ready` (also fold in DOCS-REVIEW R4 **D5-1**: the authenticated 404 for unmapped `/api/**` comes from
   handler lookup after the must-change gate), `progress.json` → `in_progress`, branch `feature/T-M2.1-identity-core`, backend-implementer in its own worktree,
   then QA (fresh) + SEC review at G3, merge-gate.
3. Without the signal: prepare the T-M2.2 packet (authz matrix + isolation harness; it must register T-M2.1's four auth endpoints). T-M1.10 stays upstream-gated.

## Pending PO decisions / actions
- **T-M2.1 start signal** + confirm DEC-089 (6) 401 instead of 423 while locked, (7) `/meta` through the must-change gate, (8) 7-day expiry for the operator reset (A-021).
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented; OQ-10 default in use by T-M2.1).

## Gotchas
- `.env*` files are unreadable by rule: the PO creates `.env` (and links it into any worktree); `glab` is a snap; merge-gate needs `gh` ≥ 2.101; WebKit deps installed.
- Branch names must be `<kind>/<task-id>-<slug>`; qa/ branches may only change `qa/**` and `evidence/*/qa/**`.
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`; post them after CI is green for the final head.
- `git merge` is denied: `gh pr update-branch <n>`. On a conflict in bookkeeping files: restore them to the merge base in one commit, `gh pr update-branch`, re-apply (DEC-090). Give each subagent its own git worktree. Only one E2E run at a time (ports 8080/8081).
- `check-docs.sh` also scans `.claude/worktrees/*` copies (a subagent worktree on another branch makes it fail): remove finished subagent worktrees (`git worktree remove --force …`) before running the gate (T-M1.17).
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u`; `./scripts/gitlab-sync.sh` after merges; stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/backlog.md` (M2, "Carried past M1") → `docs/tasks/T-M2.1-identity-core.md` → `.claude/skills/backend-module`, `db-migration`, `authz-isolation`, `security-review`.
