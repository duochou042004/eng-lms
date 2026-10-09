# Handoff — 2026-10-09T14:05Z (T-M2.9 done; next: T-M2.4 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.4 (packet to write)** · Branch: `develop` · Last merges on develop: `37e8ce0` (PR #72, T-M2.9), `680149b` (PR #73, QA record), PR #74 (merge record) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.9 done** (`37e8ce0`, PR #72; packet PR #71; DEC-102 first goal → M7, DEC-103 guardian limits/empty profile, DEC-104 PO start, DEC-105 merge).
  QA PASS (round 1 PASS WITH MINOR, re-test R1 PASS; report: PR #73 `qa/T-M2.9`); SEC APPROVED in two rounds (S3/S4 fixed in-task). SEC record +
  DEC-105: the `chore/T-M2.9-merge-record` PR.
- **What T-M2.9 gives later packets:**
  - Guardians `GET`/`POST /tutor/students/{sid}/guardians`, `PATCH`/`DELETE /tutor/guardians/{gid}` (version, ≤ 10), `guardians?` on create;
    learning profile `GET`/`PUT /tutor/students/{sid}/learning-profile` (`@TutorPrivate`; `version` `null` = not created yet). UI: T-M2.5.
  - ArchUnit rule 3 now covers headers, cookies, matrix variables, the fields of any non-name-bound parameter (`@Valid` model attributes, bodies, parts,
    generic type arguments, `@JsonProperty`/`@JsonAlias`) and the name `sid`; the scan matches dashless UUIDs. Known limits: test-strategy §4.
  - Credential stamp in `CurrentUser` (tutor/operator resets bump it; `AccountStatusFilter` refuses a mismatch). Accepted limitation: a login racing the
    user's own change can keep a session or token (DEC-105).
  - Logs: `org.hibernate.orm.jdbc.error=off`, `logServerErrorDetail=false` (no usernames or row values from SQL errors).

## Next steps
1. T-M2.9 record PRs merged: #73 (`qa/T-M2.9`, `680149b`) and #74 (this merge record).
2. Write the **T-M2.4 packet** (auth UI + shells, FE; frontend-standards skill; vi + en; 360/768/1280; WCAG 2.2 AA; UX review at G3) to G0; decide the SEC review in the
   packet (auth redirects, the `?next=` allow-list security.md T18, remember-me on shared devices; the M2 exit needs an auth security review); ask
   the PO for the start signal. T-M2.5 (students UI) depends on T-M2.4 and T-M2.9.
3. **T-M2.10** (strict JSON number binding, QA F3, small BE) can be packeted any time.
4. Dependabot PRs #64–#70 are open (LC-APPROVED PR-<n> path via merge-gate when CI is green).

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
- Tell reviewer agents explicitly: no PR comments, no files in the tree, return text only (the T-M2.9 SEC agent did both, DEC-105). Extract an
  agent's final text from its `tasks/<id>.output` transcript rather than retyping it.
- CI `e2e-smoke`/`backend` may fail on a Maven Central 429: `gh run rerun <id> --failed`.
- Subagent stopped by an API limit: check containers/java (the VSCode Java language server is not ours), then resume it with SendMessage.
- `gitlab-sync.sh` may fail authentication transiently: retry once.
- Wall-clock bounds in tests flake on the 2-core CI runner (DEC-093). `git merge` is denied: `gh pr update-branch` (DEC-090).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/coding-agent-rules.md` §3 → `docs/tasks/backlog.md` (M2: T-M2.4, T-M2.5, T-M2.10) →
`docs/05-frontend/` (ux-flows, information-architecture, design system) → DEC-102..105 → `.claude/skills/task-packet`, `frontend-standards`, `ux-review`.
