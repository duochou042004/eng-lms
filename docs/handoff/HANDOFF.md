# Handoff — 2026-10-07T08:55Z (T-M2.3 done; next: T-M2.9 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.9 (packet to write)** · Branch: `chore/T-M2.3-merge-record` · Last merge on develop: `f0e228c` (PR #61, T-M2.3) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.3 done** (`f0e228c`, PR #61; packet PR #60; DEC-097 split, DEC-098 PO start signal, DEC-099/100 deferrals, DEC-101 merge). QA PASS (re-test R1 at
  `adb28d5`; report: PR #62 `qa/T-M2.3`); SEC APPROVED in round 2 (S3-1, S3-2 and the cheap S4s fixed in-task; R2-1 fixed by the LC at `879c8d1`). SEC record +
  DEC-101: the `chore/T-M2.3-merge-record` PR.
- **What T-M2.3 gives later packets:**
  - Module `students` (`StudentDirectory`, events `StudentCreated`, `StudentStatusChanged`, `StudentUsernameChanged`), 8 tutor endpoints under `/api/v1/tutor/students`
    and `/tutor/usernames/*`; application-normalised `search_text` + `shared.Like` escaping.
  - `shared.web.CurrentStudent` + `CurrentStudentResolver` + `shared.StudentPrincipals` SPI; the verifier refuses any binding annotation on a `CurrentStudent`
    parameter. Owner-scoped convention (`findByIdAndStudentId`, mismatch 404) in the backend-module and authz-isolation skills.
  - `AccountStatusFilter`: a non-`ACTIVE` account's session/remember-me → 401 `SESSION_EXPIRED`, all sessions and tokens ended.
  - Field codes `REQUIRED`, `TOO_LONG`, `TOO_MANY`, `INVALID_FORMAT`, `INVALID_VALUE`, `USERNAME_INVALID`, `USERNAME_TAKEN`; C0 control characters refused
    in free text (validation-rules).

## Next steps
1. Merge the open record PRs: #62 (`qa/T-M2.3`) and the `chore/T-M2.3-merge-record` PR (fresh DOCS-REVIEW, CI green → verdicts → LC-APPROVED → merge-gate → gitlab-sync).
2. Write the **T-M2.9 packet** to G0 (backlog row): guardians (FR-STU-03), tutor-private learning profile (FR-STU-04, `@TutorPrivate`, `SECRET-*`), the first
   goal at creation (decide: minimal `learning_goal` now or move to M7), the DEC-097 (4) ArchUnit/scan extensions, SEC S4-5 (credential stamp: login racing a
   tutor reset) and S4-2 (duplicate-username log). Must merge before any `..web.student..` handler binding a body/header/cookie. Ask the PO for the start signal.
3. T-M2.4 (auth UI + shells, FE) is also unblocked (depends only on T-M2.1).

## Pending PO decisions / actions
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 / T-M2.3 SEC S4-9: the bundled common-password list barely filters at the 10-character minimum (`password123` passes); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- **One checkout, no worktrees** (DEC-094): subagents one at a time on the task branch; only the LC switches branches, never while a subagent runs.
- **Keep LC copies of reviewer reports outside the scratchpad** (e.g. the session folder `lc-records/`): reviewers clean the shared scratchpad with globs (DEC-101).
- Reviewer evidence (`evidence/*/review/**`) never on feature/fix branches; QA reports on `qa/<task>`; move any review/QA file an agent writes there off the
  feature branch before committing. `./scripts/check-path-ownership.sh <branch>` before pushing.
- merge-gate tokens: `QA-VERDICT <task>: PASS`, `SEC-REVIEW <task>: APPROVED`, `DOCS-REVIEW <task>: PASS`, `LC-APPROVED <task>`; post after CI is green for the final head.
- `./scripts/check-docs.sh`: run bare (not piped in an `&&` chain); a DEC referenced anywhere must exist in the decision log first. `progress.json` `pr` is a string.
- The gate's e2e step starts `englms-dev-db` and leaves untracked `evidence/<task>/records/` and `screenshots/`: delete them for backend-only tasks, `scripts/dev-down.sh`.
- Agents often cannot write `evidence/<task>/summary.md` or report files: record their returned text yourself. Agents never post PR comments.
- Subagent stopped by an API limit: check containers/java (the VSCode Java language server is not ours), then resume it with SendMessage.
- `gitlab-sync.sh` may fail authentication transiently: retry once.
- Wall-clock bounds in tests flake on the 2-core CI runner (DEC-093). `git merge` is denied: `gh pr update-branch` (DEC-090).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/coding-agent-rules.md` §3 → `docs/tasks/backlog.md` (M2: T-M2.9) → `docs/tasks/T-M2.3-students-core.md`
(decisions) → `evidence/T-M2.3/summary.md` → DEC-097..101 → `.claude/skills/task-packet`, `authz-isolation`, `backend-module`, `db-migration`.
