# Handoff — 2026-10-05T16:35Z (T-M2.1 done; dev-phase harness DEC-094; next: T-M2.2 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.2 (packet to write)** · Branch: `chore/T-M2.8-dev-harness` · Last merge on develop: `ceb3f1e` (T-M2.1 merge record) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.1 done** (`a93bcc1`, PR #52; QA PASS, SEC APPROVED; records PR #53 and #54, DEC-091..DEC-093). Hand-over table for T-M2.2: `evidence/T-M2.1/summary.md`.
- **Dev-phase harness (DEC-094, T-M2.8; PO request 2026-10-05):**
  - Agents may read, create and edit `.env`, `.env.*` and `.data/**` (the three deny rules are gone from `.claude/settings.json`). **Dev-only values**:
    never a real secret, API key or personal data; never committed or pasted into evidence, PR comments or logs (coding-agent-rules §3.5).
  - **No git worktrees.** Everything happens in the main checkout `/home/kali/App_sources/eng-lms` (the PO watches it in VSCode). Subagents run there one at a
    time on the task branch; QA and SEC may run together only on a fixed head with no branch switch or commits; the LC never switches branches while a
    subagent runs (coding-agent-rules §3.4).
  - Restore: **T-M8.7** re-adds the deny rules before any real secret is used, at the latest before T-M8.4; the release (T-M8.6) depends on it (risk R-21).
- **Follow-ups in the backlog:** T-M2.3 (login racing a disable, SEC S4-1); T-M2.4 (one `GET /auth/session` before parallel calls, logout before re-login while
  must-change, shared-device remember-me note).

## Next steps
1. If the `chore/T-M2.8-dev-harness` PR is still open: CI green → DOCS-REVIEW PASS → LC-APPROVED → merge-gate → gitlab-sync.
2. Write the **T-M2.2 packet** to G0 (task-packet skill): `@Audience`, policy registry + verifier, authz-matrix and student-isolation harnesses that fail on any
   unregistered endpoint, secret scan, ArchUnit student rules; register `GET /auth/session`, `POST /auth/login|logout|password`. Fresh DOCS-REVIEW, merge,
   then ask the PO once for the start signal; implement only after it (backend-implementer, then QA + SEC at G3 — all in the main checkout).

## Pending PO decisions / actions
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 (noted): the bundled common-password list rarely fires at the 10-character minimum (conforms to NFR-SEC-06); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- Reviewer evidence (`evidence/*/review/**`) may not be committed on feature/fix branches — record it in a docs/chore PR; QA reports go on `qa/<task>` branches.
  Run `./scripts/check-path-ownership.sh <branch>` before pushing.
- Wall-clock bounds in tests flake on the 2-core CI runner: compare against a same-load baseline instead (DEC-093).
- Subagents can stop on API usage limits: check for leftover containers/java, then resume them with SendMessage (their context survives). Keep records in the
  repo, not the session scratchpad (other agents may clear it).
- E2E/app runs: only one at a time on 8080/8081. Agents may now `source .env` (dev values) or use a throwaway `postgres:18` with `SPRING_DATASOURCE_*` (CI mode).
- `git merge` is denied: `gh pr update-branch <n>`; on a bookkeeping conflict restore to the merge base, update, re-apply (DEC-090). merge-gate deletes the merged branch.
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`; post after CI is green for the final head. Run `./scripts/check-docs.sh` bare; `date -u`; stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/coding-agent-rules.md` §3 → `docs/tasks/backlog.md` (M2) → `evidence/T-M2.1/summary.md` → `.claude/skills/task-packet`, `authz-isolation`.
