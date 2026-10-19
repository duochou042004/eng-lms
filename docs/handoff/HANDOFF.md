# Handoff — 2026-10-19 (T-M2.18 and T-M2.15 merged under DEC-131; next: T-M2.19)

Phase/Milestone: P1 / M2 (in progress) · Current: **T-M2.19 automated UI checks (FE, draft)** · Next: **T-M2.17 learning profile** ·
Last merges on develop: `9b9e133` (PR #112, T-M2.15), `5dab35e` (PR #113, T-M2.18) · Records: `docs/T-M2.15-records`, `qa/T-M2.15` ·
Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **The quality process is DEC-131** (T-M2.18): risk tier per packet; tier H = SEC + one combined QA+UX reviewer; tier M = one combined
  QA+UX reviewer; tier L = docs review; S1/S2 → AC + **delta** re-check; S3 cheap in-task, LC-verified from test + diff; S4 → the M2 polish
  row **T-M2.20**; one local gate per head + CI (the gate skips backend/contract-drift for web-only diffs, repeats changed specs ×3);
  reviewers return text only and the LC records and posts; PNGs git-ignored; a **G3 cost** table in every summary.
- **First run of the new process (T-M2.15, DEC-132/133):** 2 review agents (≈ 157k tokens, ≈ 26 min) + 1 fix round + 1 gate run (10.6 min)
  vs T-M2.14's 8 review rounds and 8 gate runs (87 min). No S1/S2; 3 S3 fixed via AC11; 4 S4 → T-M2.20.
- Open: the records PR (review records, DEC-133, this handoff) and the `qa/T-M2.15` QA report PR (also untracks the 61 tracked
  `evidence/*/qa/**/*.png`). T-M2.13, T-M2.16, T-M2.17, T-M2.19, T-M2.20 open in the backlog. This device: Kali Linux rolling, rootless
  Podman 5.8.6, clone `/home/kali/App_projects/eng-lms`. GitLab CI paused (DEC-107); the mirror syncs.

## Another device
- Follow development-setup §0 for its platform; record OS, engine and versions in `progress.json` `environment` and the clone path in
  `project.repoLocal` (DEC-083). Not in git: `.env` (`cp .env.example .env`), `.data/**`, the dev DB volume, `.claude/settings.local.json`,
  Playwright browsers (`cd e2e && pnpm browsers`). Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers;
  `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. If still open: merge the records PR and the `qa/T-M2.15` PR (merge-gate), `gitlab-sync.sh`.
2. **T-M2.19** (FE, tier M; the PO orders it): packet with the task-packet skill (UI rules, risk tier), the E2E checks of DEC-131 (1) in
   `e2e/support/checks.ts` (long data, focus-not-lost, axe per state) and the stylelint motion rule; each check proven against a violating fixture.
3. **T-M2.17** learning profile (FE, SEC trigger → tier H), then T-M2.20 polish, T-M2.13, T-M2.16; then T-M2.6, T-M2.7 (M2 regression, G5).

## Pending PO decisions / actions
- **Dependabot PRs #95–#104**: untouched; say whether to review and merge them.
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so G3 can cover all three browsers.
- Dev database: reviewer and E2E runs added several hundred test students (about 60 more in T-M2.14; no purge). Say if you want it cleaned.
- Open points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget: student 186.6 KB gz);
  dates use the browser's time zone (`shortcut:` in `lib/time`; T-M2.6); production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (M8);
  the common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14 (defaults documented).

## Gotchas
- **Measure every G3:** fill the summary's G3 cost table from each Agent result (tokens, duration) as soon as it returns; compare tasks by it.
- **Toasts (T-M2.14):** `ui/Toast` is the only toast; errors are never toasts (interaction-states §4). Under a modal the region is hidden and inert (`ui/modalStack.ts`); the queue closes timed toasts pushed out of the visible 3 and is cleared on region mount/unmount.
- **Two API-limit pauses this session** stopped the implementer and QA mid-run; both resumed with SendMessage after checking `git status`/`git log` and `evidence/<task>/gate-*.log` (the implementer had finished both gates but not committed).
- CI `backend` can fail on a Maven Central **403** as well as a 429: `gh run rerun <id> --failed`.
- **Layout ACs need fixed rules.** T-M2.5's table went through four content-driven sizing attempts (min width, `nowrap`, `break-word`) before `table-layout: fixed` with column shares; write column shares and break rules into the packet up front.
- An API usage limit can stop the implementer after its gates finished but before the evidence commit: check `git log`, the newest `evidence/<task>/gate-*.log` heads and `git status` before resuming it; the LC may commit the evidence itself.
- An API usage limit can stop a subagent mid-run: check `podman ps` and `pgrep -af 'java -jar'` (its JAR may still run), then resume it with
  SendMessage; it keeps its context. A `gh` GraphQL error mid-chain: check which comments landed before re-posting.
- Fix rounds: resume the original implementer (it keeps the code context); the LC first adds the findings to the packet as an AC (DEC-088) and a DEC: S1/S2 and cheap S3 only; S4 to the milestone polish packet (DEC-131 (5)).
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
`CLAUDE.md` → `progress.json` → this file → DEC-131..133 → backlog M2 (T-M2.19, T-M2.20, T-M2.17 rows) → `quality-gates.md` G1/G3 →
`qa-protocol.md` §2a/§2b → `evidence-protocol.md` §2 → `task-packet-template.md` → `e2e/support/checks.ts` → `.claude/skills/task-packet`, `frontend-standards`.
