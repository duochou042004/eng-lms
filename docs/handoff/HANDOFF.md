# Handoff — 2026-10-19 (T-M2.15 guardians implemented, G1 pass; PAUSED before G3 for the PO, DEC-129)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.15 guardians (in progress: G1 pass; PR #112; paused before G3, DEC-129)** · Branch: `feature/T-M2.15-guardians` · Last merges on develop: `6073e71` (PR #108, T-M2.14); the QA report is PR #109 (`qa/T-M2.14`) and this record is the `chore/T-M2.14-merge-record` PR (check `git log` that both landed) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.14 done** (`6073e71`, DEC-124..127): the T-M2.14 row was split again (DEC-124) into T-M2.14 and **T-M2.15** (guardians + learning
  profile), with **T-M2.16** (BE: a username-only PATCH does not bump `version`) added from the docs review. Delivered: one Edit profile form
  (personal info, contacts, note, username; changed fields only; 409 → "This was changed elsewhere" with Reload / Copy my note); the Account
  section (Pause, Resume, Archive + persistent Undo toast, Reactivate; errors as `InlineAlert`); Reset password (confirm dialog, shared
  credentials card, component state only); new `ui/` `Toast`, `UnsavedChangesGuard` (forced navigation passes only to `/change-password`,
  T-M2.5 SEC S4-5), `ConfirmDialog` primary/pending/content, `modalStack`; sign-in drops every query but the session. F10 (reset) = 3 steps.
  G3: QA 3 rounds (final PASS WITH MINOR; QA-5 S4 informational), UX 3 (APPROVED), SEC 2 (APPROVED); fixes via AC12 (a)–(l) (DEC-126).
  Recorded for later: the SEC residual (skip the detail store when the session is not the tutor) → T-M2.15 row; T-M2.16.
- T-M2.13 (small FE follow-ups) still in the backlog. This device: Kali Linux rolling, rootless Podman 5.8.6, clone
  `/home/kali/App_projects/eng-lms` (T-M1.19, DEC-108). GitLab CI paused (DEC-107); the mirror still syncs.

## Another device
- Follow development-setup §0 for its platform; record OS, engine and versions in `progress.json` `environment` and the clone path in
  `project.repoLocal` (DEC-083). Not in git: `.env` (`cp .env.example .env`), `.data/**`, the dev DB volume, `.claude/settings.local.json`,
  Playwright browsers (`cd e2e && pnpm browsers`). Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers;
  `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. **T-M2.15 guardians** (packet `docs/tasks/T-M2.15-guardians.md`, G0 PR #111 `eeee2bd`; start DEC-129): implemented on
   `feature/T-M2.15-guardians` (PR #112), gate PASS ×2 on `7128127`, evidence `evidence/T-M2.15/summary.md`. **Paused before G3**: the PO
   wants to discuss why G3 runs behind schedule first (DEC-129). Then G3 one reviewer at a time (QA, UX, SEC), merge-gate, QA report via
   `qa/T-M2.15`, merge-record PR. Then the T-M2.17 packet (learning profile + `TagInput`, DEC-128).
2. T-M2.13 and T-M2.16 when the PO orders them; then T-M2.6, T-M2.7 (M2 regression incl. the `qa/` spec updates). Optional: T-M2.10.

## Pending PO decisions / actions
- **Dependabot PRs #95–#104**: untouched; say whether to review and merge them.
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so G3 can cover all three browsers.
- Dev database: reviewer and E2E runs added several hundred test students (about 60 more in T-M2.14; no purge). Say if you want it cleaned.
- Open points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget: student 186.6 KB gz);
  dates use the browser's time zone (`shortcut:` in `lib/time`; T-M2.6); production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (M8);
  the common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14 (defaults documented).

## Gotchas
- **Toasts (T-M2.14):** `ui/Toast` is the only toast; errors are never toasts (interaction-states §4). Under a modal the region is hidden and inert (`ui/modalStack.ts`); the queue closes timed toasts pushed out of the visible 3 and is cleared on region mount/unmount.
- **Two API-limit pauses this session** stopped the implementer and QA mid-run; both resumed with SendMessage after checking `git status`/`git log` and `evidence/<task>/gate-*.log` (the implementer had finished both gates but not committed).
- CI `backend` can fail on a Maven Central **403** as well as a 429: `gh run rerun <id> --failed`.
- **Layout ACs need fixed rules.** T-M2.5's table went through four content-driven sizing attempts (min width, `nowrap`, `break-word`) before `table-layout: fixed` with column shares; write column shares and break rules into the packet up front.
- An API usage limit can stop the implementer after its gates finished but before the evidence commit: check `git log`, the newest `evidence/<task>/gate-*.log` heads and `git status` before resuming it; the LC may commit the evidence itself.
- An API usage limit can stop a subagent mid-run: check `podman ps` and `pgrep -af 'java -jar'` (its JAR may still run), then resume it with
  SendMessage; it keeps its context. A `gh` GraphQL error mid-chain: check which comments landed before re-posting.
- Fix rounds: resume the original implementer (it keeps the code context); the LC first adds the findings to the packet as an AC (DEC-088) and a DEC.
- Running `gate.sh` or `e2e-run.sh` rewrites tracked `evidence/<task>/` screenshots and records (T-M2.4 QA F1): reviewers restore them with
  `git checkout -- evidence/<task>`. E2E signs in as `e2e-tutor` (`.data/e2e/`); never `dev-down.sh --purge` the PO's dev database without asking.
- **One checkout, no worktrees** (DEC-094): subagents one at a time on the task branch; only the LC switches branches, never while a subagent runs.
- Paths in older docs/evidence name `/home/kali/App_sources/eng-lms` (the first machines); this device clones to `/home/kali/App_projects/eng-lms`.
- **Keep LC copies of reviewer reports outside the scratchpad** (`.claude/scratch/lc-records/`, git-ignored): reviewers clean the shared scratchpad with globs (DEC-101), and an API-limit pause can empty `/tmp` (T-M2.12 QA round 2 lost its scratch files). Copy each report and its screenshots as soon as it returns.
- Reviewer evidence (`evidence/*/review/**`) never on feature/fix branches; QA reports on `qa/<task>`; move any review/QA file an agent writes there off the
  feature branch before committing. `./scripts/check-path-ownership.sh <branch>` before pushing.
- merge-gate tokens: `QA-VERDICT <task>: PASS`, `SEC-REVIEW <task>: APPROVED`, `UX-REVIEW <task>: APPROVED`, `DOCS-REVIEW <task>: PASS`, `LC-APPROVED <task>`; post after CI is green for the final head.
- `./scripts/check-docs.sh`: run bare (not piped in an `&&` chain); a DEC referenced anywhere must exist in the decision log first. `progress.json` `pr` is a string.
- The gate's e2e step starts `englms-dev-db` and leaves untracked `evidence/<task>/records/` and `screenshots/`: delete them for backend-only tasks, `scripts/dev-down.sh`.
- Agents often cannot write `evidence/<task>/summary.md` or report files: record their returned text yourself. Agents never post PR comments.
- Tell reviewer agents explicitly: no PR comments, no files in the tree, return text only (the T-M2.9 SEC agent did both, DEC-105). Extract an
  agent's final text from its `tasks/<id>.output` transcript rather than retyping it.
- CI `e2e-smoke`/`backend` may fail on a Maven Central 429: `gh run rerun <id> --failed`.
- Subagent stopped by an API limit: check containers/java (the VSCode Java language server is not ours), then resume it with SendMessage.
- `gitlab-sync.sh` may fail authentication transiently: retry once. GitLab CI is **paused** (DEC-107; the sync pushes with `-o ci.skip`; to resume:
  the GitLab project variable `ENGLMS_GITLAB_CI=on` and `ENGLMS_GITLAB_CI=on ./scripts/gitlab-sync.sh`, ci-cd §1.1); the sync still runs after every merge.
- Wall-clock bounds in tests flake on the 2-core CI runner (DEC-093). `git merge` is denied: `gh pr update-branch` (DEC-090).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → backlog M2 (T-M2.15, T-M2.16, T-M2.13 rows) → DEC-124..127 → FR-STU-01 (guardians), 03, 04 →
interaction-states §2, §4 → information-architecture §2 → api-catalog "tutor: students" (guardians, learning-profile rows) →
`docs/tasks/T-M2.14-student-profile-account.md` → `web/src/features/students/`, `web/src/ui/` → `.claude/skills/task-packet`,
`frontend-standards`, `ux-review`, `security-review`.
