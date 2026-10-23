# Handoff — 2026-10-23 (T-M2.21 packet at G0, DEC-151; next: the PO start signal, then the LC implements it)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.21 records checks (LC, ready, tier L)**: packet merged at G0 (PR #139), waits
for the PO start signal · Next: **T-M2.13 auth and shell feedback** · Last merges on develop: the T-M2.21 packet (PR #139), the T-M2.20
records (PRs #137, #138, `995d047`), T-M2.20 (`f3a77fa`, PR #136) · Remote: https://github.com/duochou042004/eng-lms (mirror:
gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.21 packet** `docs/tasks/T-M2.21-records-checks.md` (DEC-150 decisions, DEC-151 G0): three new `check-docs` checks: (1) a task in
  `progress.json` `completed[]` has `**done**` in its backlog row and a packet Status starting with `done`; (2) `HANDOFF.md` changed against
  the merge base of `${ENGLMS_DOCS_BASE:-${ENGLMS_GATE_BASE:-origin/develop}}` needs a new `docs/handoff/archive/` file (fails closed on an
  unknown base); (3) no bare `|` in a table-row code span (git-ignored Markdown skipped). Each is proven failing in a new
  `scripts/tests/check-docs.test.sh` (fixtures from `git archive HEAD`, `ENGLMS_DOCS_ROOT`). The same PR fixes the stale records listed in
  scope 6 (8 packet Status lines, 3 backlog rows, 4 code spans). **Until it lands, keep the T-M2.21 records by hand (part C).**
- G0 cost: one docs-reviewer, round 1 full 78,905 tokens (287 s) PASS WITH MINOR, round 2 delta 12,275 (25 s) PASS.
- PRs #137 (QA report) and #138 (T-M2.20 records) were already merged at session start (`b89ee92`, `995d047`); mirror synced.
- Left over (unchanged): S4 QA-2 in the **T-M2.7** row (M2 G5, DEC-148); the backend wall-clock flake in **T-M2.10** (DEC-144 (3)); AC6's
  purpose unverified off Chromium (G5, DEC-146). **The quality process is DEC-131.** Open in the backlog: T-M2.21 (ready), T-M2.13,
  T-M2.16, T-M2.10; then T-M2.6, T-M2.7 (G5).

## In flight / uncommitted
- Nothing uncommitted. If PR #139 is still open: merge it via merge-gate (`DOCS-REVIEW T-M2.21: PASS`, `LC-APPROVED T-M2.21`).

## Moving to a new device (PO, 2026-10-23: the next session runs on a new, near-identical device)
- Follow development-setup §0 for its platform. Then record the OS, engine and versions in `progress.json` `environment` and the clone
  path in `project.repoLocal` (DEC-083), in a small docs commit on the next task branch, and say so in its history entry.
- Not in git, so set up again: `.env` (`cp .env.example .env`), `.data/**` (E2E creates `.data/e2e/` on first run), the dev DB volume
  (a fresh one is fine: the old one only held fictitious test students, DEC-139), `.claude/settings.local.json`, Playwright browsers
  (`cd e2e && pnpm browsers`; for G3 on all engines `(cd qa && pnpm exec playwright install-deps firefox webkit)` needs `sudo`, PO).
- Accounts (PO): `gh auth login`, `glab auth login`, the git identity, credential helpers; `./scripts/install-hooks.sh`;
  `git remote add gitlab https://gitlab.com/duochou042004/eng-lms.git`. Check `gh --version` ≥ 2.101 (merge-gate).
- Lost with this device: `.claude/scratch/lc-records/` (LC copies of reviewer reports; everything needed is in `evidence/` and the DEC log)
  and the old dev DB. First run on the new device: `./scripts/check-docs.sh`, `./scripts/tests/run-all.sh`, then the gate once with the
  first task.

## Next steps
1. If PR #139 is open: merge-gate (`--dry-run` first), gitlab-sync.
2. Ask the PO for the T-M2.21 start signal (if not given yet). Then the LC implements it on `chore/T-M2.21-records-checks` from
   `develop`: packet scope 1-7, AC1-AC8; `ENGLMS_TASK=T-M2.21 ./scripts/gate.sh` once on the final head; summary with the AC5 mutation
   output; G3 = one fresh docs-reviewer that runs the fixtures and mutates each check; merge-gate; records (part C, now checked).
3. Then T-M2.13, T-M2.16, T-M2.10; then T-M2.6, T-M2.7 (M2 regression, G5, with the DEC-148 S4 and Firefox/WebKit).

## Pending PO decisions / actions
- **T-M2.21 start signal.**
- **PR #100** (react-aria-components 1.21.1 → 1.22.1) is **held** (PO, DEC-139): it needs a full local verification with a manual check of
  the toast and dialog screens (`shortcut:` in `ui/Toast.tsx`, `ui/toastQueue.ts`, `ui/Button.tsx`); no action until the PO says so.
  Dependabot PRs #127–#135 (opened 2026-10-23) are the PO's to handle, as before.
- Open points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget: student 186.7 KB gz);
  dates use the browser's time zone (`shortcut:` in `lib/time`; resolved in T-M3.1/T-M3.3, L-12); production needs
  `SERVER_FORWARDHEADERSSTRATEGY=native` (M8); the common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny
  rules (DEC-061); OQ-03..OQ-14 (defaults documented).

## Gotchas
- **Engine facts can void a "fails on develop" clause** (T-M2.20 AC6, DEC-146): Chromium 156 already blurs a control that turns
  `visibility: hidden`; write a proof AC as "the new rule rejects X" unless the old helper's pass was observed first.
- **A component's own error state can hide the form's error** (T-M2.20 QA-1, DEC-147): when a `ui/` field keeps a local error, say in the
  packet which one wins after a submit.
- **Branch names carry a task ID** (merge-gate: `<kind>/T-Mx.y-<slug>`): LC docs work without its own task goes on the latest task's ID
  (`docs/T-M1.16-m1-g5`, `docs/T-M2.19-retrospective`); `docs/M2-retrospective` was refused (PR #120 closed).
- **Invoke the skills, don't recall them:** `evidence-and-handoff` part C at every merge (backlog row and packet Status `done`, handoff
  archive, numbers copied from their source); the T-M2.19 records slipped on all three (L-09).
- **Resumed subagents report cumulative `subagent_tokens`:** the round's cost is the delta from the previous result (T-M2.19 summary).
- An implementer may leave known failures as `test.fail` when a packet forbids the fix: the LC rules (an AC + DEC, as DEC-135) before G3,
  so the reviewer sees the final product.
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
- Wall-clock bounds in tests flake on the 2-core CI runner (DEC-093); one remains: `AuthApiIntegrationTest.anUnrelatedLoginStaysFastDuringABurstOnOneUsername`
  (failed at 3355 ms on PR #125's docs-only head, run 39567176119; rerun) — now in the BE row T-M2.10 (DEC-144 (3)).
- `git merge` is denied: `gh pr update-branch` (DEC-090).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M2.21-records-checks.md` → DEC-150, DEC-151 → `docs/09-harness/lessons-learned.md`
(L-01, L-09) → `scripts/check_docs.py`, `scripts/tests/lib.sh`, `scripts/tests/gate.test.sh` (fixture and git identity pattern) →
`.claude/skills/evidence-and-handoff/SKILL.md` → `docs/07-operations/development-setup.md` §0 (new device).
