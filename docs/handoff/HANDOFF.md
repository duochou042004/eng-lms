# Handoff — 2026-10-05T15:45Z (T-M2.1 merged; next: T-M2.2 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.2 (packet to write)** · Branch: `chore/T-M2.1-merge-record` · Last merge on develop: `a93bcc1` (T-M2.1) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M1.18 done** (`20625d9`, PR #51). **T-M2.1 done** (`a93bcc1`, PR #52; PO start DEC-091 with DEC-089 (6)–(8) confirmed): identity + audit modules, bootstrap,
  login/logout/session (Spring Session JDBC), remember-me, CSRF, lockout + throttle, must-change gate, L1 role gate, headers in Spring Security, firewall/TRACE, operator CLI.
  G3: SEC round 1 CHANGES REQUESTED → fixed in-task → round 2 APPROVED; QA PASS WITH MINOR → re-test PASS; ×20 timing 20/20 (DEC-092, DEC-093).
- **Records:** QA report via PR #53 (`qa/T-M2.1`, needs only LC-APPROVED); security review + this bookkeeping via the `chore/T-M2.1-merge-record` PR (needs DOCS-REVIEW PASS).
- **Follow-ups recorded in the backlog (DEC-092, DEC-093):** T-M2.3 — a login racing `AccountApi.disable` (SEC S4-1). T-M2.4 — one `GET /auth/session` before parallel calls
  (remember-me rotation race), log out before re-login while must-change (QA F3), shared-device remember-me note (SEC S4-12).

## Next steps
1. If PR #53 or the merge-record PR is still open: CI green → (record PR: DOCS-REVIEW PASS) → LC-APPROVED → merge-gate → gitlab-sync.
2. Write the **T-M2.2 packet** to G0 (task-packet skill): `@Audience`, policy registry + verifier, authz-matrix and student-isolation harnesses that fail on any
   unregistered endpoint, secret scan, ArchUnit student rules; it registers `GET /auth/session`, `POST /auth/login|logout|password` (table in `evidence/T-M2.1/summary.md`).
   Fresh DOCS-REVIEW, merge, then ask the PO for the start signal.

## Pending PO decisions / actions
- `.env.example`: add `ENGLMS_BOOTSTRAP_TUTOR_USERNAME`, `ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE` (agents cannot read `.env*`); production also needs
  `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3).
- QA F4 (noted): the bundled common-password list rarely fires at the 10-character minimum (conforms to NFR-SEC-06); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- **Reviewer evidence (`evidence/*/review/**`) may not be committed on feature/fix branches** (path ownership; CI docs-check) — record it in a docs/chore PR;
  QA reports go on `qa/<task>` branches. Run `./scripts/check-path-ownership.sh <branch>` before pushing.
- Wall-clock bounds in tests flake on the 2-core CI runner: compare against a same-load baseline instead (DEC-093).
- Subagents hit API usage limits mid-run; resume them with SendMessage (their context survives) and check for leftover containers/java first. The session
  scratchpad can be wiped by other agents: keep records in the repo (untracked) rather than the scratchpad.
- `.env*` unreadable by rule; agents run E2E against a throwaway `postgres:18` with `SPRING_DATASOURCE_*` exported (CI mode). Only one app/E2E on 8080/8081 at a time.
- `git merge` is denied: `gh pr update-branch <n>`; on a bookkeeping conflict restore to the merge base, update, re-apply (DEC-090). merge-gate removes the merged branch.
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`; post after CI is green for the final head. Run `./scripts/check-docs.sh` bare; `date -u`; stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/backlog.md` (M2) → `evidence/T-M2.1/summary.md` (hand-over table) → `.claude/skills/task-packet`, `authz-isolation`.
