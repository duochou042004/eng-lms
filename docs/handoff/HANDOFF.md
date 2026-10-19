# Handoff — 2026-10-19 (T-M2.18 quality-process upgrade in review, DEC-131; then T-M2.15 G3)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.18 quality-process upgrade (LC, in review)** · Next: **T-M2.15 guardians G3**
(PR #112, G1 pass, held by DEC-130 until T-M2.18 merges) · Branch: `docs/T-M2.18-quality-process` (this handoff lives there) · Last merges on
develop: `eeee2bd` (PR #111) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.18** (packet `docs/tasks/T-M2.18-quality-process.md`): measured G3 on T-M2.5/12/14 (packet table; LC record
  `.claude/scratch/lc-records/T-M2.18-measure-findings.md`): 47 findings (0 S1, 5 S2, 13 S3, 29 S4), 26 preventable by an automated check, a
  packet rule or a self-check; 10 of 21 rounds started only by S3/S4; gates 21/43/87 min, ≈ 52 % of each run on untouched backend steps.
  **PO approved the proposal as written, no history rewrite (DEC-131).** Applied on the branch: quality-gates (one local gate + CI; tiers
  H/M/L; S1/S2 delta re-check, S3 cheap in-task LC-verified, S4 to the milestone polish packet), qa-protocol §2a combined QA+UX pass and §2b
  delta re-check, test-strategy, evidence-protocol (PNGs git-ignored, G3 cost table, self-check), agent-roles, packet template (Risk tier,
  UI rules), agents and skills, `gate.sh` (skips backend/contract-drift without a backend/api change; changed specs ×3), `.gitignore`
  `evidence/**/*.png`, 1,484 PNGs untracked (files kept on disk; the 61 under `evidence/*/qa/**` are QA-owned: untrack them on `qa/T-M2.15`). New backlog row **T-M2.19** (FE: long-data, focus-not-lost, axe-per-state
  checks, stylelint motion rule).
- **T-M2.15 guardians**: implemented, gate PASS ×2 on `7128127`, CI 7/7, all 10 ACs per `evidence/T-M2.15/summary.md`; **G3 not run**.
  Under DEC-131 it is tier H (SEC trigger DEC-128 (5)): one combined QA+UX reviewer + SEC; record the G3 cost table and compare with
  T-M2.14 (3 QA + 3 UX + 2 SEC rounds, 8 gate runs, 87 min).
- T-M2.13, T-M2.16, T-M2.17, T-M2.19 open in the backlog. This device: Kali Linux rolling, rootless Podman 5.8.6, clone
  `/home/kali/App_projects/eng-lms` (T-M1.19, DEC-108). GitLab CI paused (DEC-107); the mirror still syncs.

## Another device
- Follow development-setup §0 for its platform; record OS, engine and versions in `progress.json` `environment` and the clone path in
  `project.repoLocal` (DEC-083). Not in git: `.env` (`cp .env.example .env`), `.data/**`, the dev DB volume, `.claude/settings.local.json`,
  Playwright browsers (`cd e2e && pnpm browsers`). Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers;
  `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. **T-M2.18**: PR, fresh docs-reviewer (tier L), fixes in-task, CI green, `DOCS-REVIEW T-M2.18: PASS` + `LC-APPROVED T-M2.18`,
   `merge-gate.sh --dry-run` then real, `gitlab-sync.sh`, the docs review record and the merge DEC.
2. **T-M2.15 G3** on PR #112: the branch-state collision procedure (Gotchas) before `gh pr update-branch 112`; `git rm --cached` its
   `evidence/T-M2.15/**/*.png`; one combined QA+UX reviewer (qa-protocol §2a) and SEC; S1/S2 → AC + delta re-check; G3 cost table;
   merge-gate; QA report via `qa/T-M2.15` (also `git rm --cached` the 61 tracked `evidence/*/qa/**/*.png`); merge DEC. Then T-M2.19 (prevent checks) and T-M2.17.
3. T-M2.13 and T-M2.16 when the PO orders them; then T-M2.6, T-M2.7 (M2 regression incl. the `qa/` spec updates). Optional: T-M2.10.

## Pending PO decisions / actions
- **Dependabot PRs #95–#104**: untouched; say whether to review and merge them.
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so G3 can cover all three browsers.
- Dev database: reviewer and E2E runs added several hundred test students (about 60 more in T-M2.14; no purge). Say if you want it cleaned.
- Open points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget: student 186.6 KB gz);
  dates use the browser's time zone (`shortcut:` in `lib/time`; T-M2.6); production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (M8);
  the common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14 (defaults documented).

## Gotchas
- **Branch-state collision (PR #112 vs T-M2.18):** both change `progress.json`, `docs/10-governance/decision-log.md` (T-M2.18 carries
  DEC-129/130 verbatim + DEC-131), `docs/tasks/backlog.md`, `docs/handoff/HANDOFF.md`, `docs/handoff/next-session-prompt.md` and add the same
  `docs/handoff/archive/20261018T1550Z-T-M2.14-merged.md`. `git merge` is denied (DEC-090). On `feature/T-M2.15-guardians` after T-M2.18
  merges: `git fetch`; save `git diff $(git merge-base origin/develop HEAD) HEAD -- <those files> > .claude/scratch/lc-records/T-M2.15-own.diff`;
  `git checkout origin/develop -- <those files>`; commit, push; `gh pr update-branch 112`; `git pull`; re-apply only PR #112's own edits
  (its T-M2.15 backlog note, T-M2.15 as `currentTask`, its history line) as a new commit. Never force-push.
- **Toasts (T-M2.14):** `ui/Toast` is the only toast; errors are never toasts (interaction-states §4). Under a modal the region is hidden and inert (`ui/modalStack.ts`); the queue closes timed toasts pushed out of the visible 3 and is cleared on region mount/unmount.
- **Two API-limit pauses this session** stopped the implementer and QA mid-run; both resumed with SendMessage after checking `git status`/`git log` and `evidence/<task>/gate-*.log` (the implementer had finished both gates but not committed).
- CI `backend` can fail on a Maven Central **403** as well as a 429: `gh run rerun <id> --failed`.
- **Layout ACs need fixed rules.** T-M2.5's table went through four content-driven sizing attempts (min width, `nowrap`, `break-word`) before `table-layout: fixed` with column shares; write column shares and break rules into the packet up front.
- An API usage limit can stop the implementer after its gates finished but before the evidence commit: check `git log`, the newest `evidence/<task>/gate-*.log` heads and `git status` before resuming it; the LC may commit the evidence itself.
- An API usage limit can stop a subagent mid-run: check `podman ps` and `pgrep -af 'java -jar'` (its JAR may still run), then resume it with
  SendMessage; it keeps its context. A `gh` GraphQL error mid-chain: check which comments landed before re-posting.
- Fix rounds: resume the original implementer (it keeps the code context); the LC first adds the findings to the packet as an AC (DEC-088) and a DEC.
- Running `gate.sh` or `e2e-run.sh` rewrites `evidence/<task>/` records (PNGs are git-ignored since DEC-131): reviewers restore tracked records with
  `git checkout -- evidence/<task>`. The gate skips `backend`/`contract-drift` for a web-only diff against `origin/develop` (fetch first; `ENGLMS_GATE_FULL=1` forces them). E2E signs in as `e2e-tutor` (`.data/e2e/`); never `dev-down.sh --purge` the PO's dev database without asking.
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
