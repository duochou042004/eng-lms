# Handoff — 2026-10-23 (T-M2.21 merged, DEC-154; next: the T-M2.13 packet, on a new device)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.13 auth and shell feedback follow-ups (FE, draft)**: packet to write ·
Next: **T-M2.16** username-only PATCH (BE) · Last merges on develop: T-M2.21 (`d890aae`, PR #140), its packet (PR #139, `b34c0a6`), the
T-M2.20 records (PRs #137, #138) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.21 merged** (PR #140, `d890aae`, DEC-154): `check-docs` enforces the merge records (done rows and packet Status for
  `completed[]`, the handoff archive, escaped pipes in table code spans), proven by `scripts/tests/check-docs.test.sh` (18 fixture
  clones, 39 results; each check mutated off fails its cases); 15 stale records fixed; the flaky `RouteError` test fixed (AC9, DEC-153).
  Records: `evidence/T-M2.21/summary.md` (G3 cost table, mutation runs), `review/docs.md` (G0 and G3), this records PR.
- G3 (tier L) cost: one docs-reviewer, round 1 72,125 tokens PASS WITH MINOR (S4 G-1..G-10) and delta 21,875 PASS WITH MINOR (S4
  N-1..N-3), all fixed; implementer the LC; 5 gate runs (2 FAIL on the flake, 3 PASS, last 428 s).
- Left over (unchanged): S4 QA-2 in the **T-M2.7** row (M2 G5, DEC-148); the backend wall-clock flake in **T-M2.10** (DEC-144 (3)); AC6's
  purpose unverified off Chromium (G5, DEC-146). **The quality process is DEC-131.** Open in the backlog: T-M2.13, T-M2.16, T-M2.10; then
  T-M2.6, T-M2.7 (G5).

## In flight / uncommitted
- Nothing uncommitted. If this records PR (`docs/T-M2.21-g3-records`) is still open: merge it via merge-gate (`DOCS-REVIEW T-M2.21:
  PASS` after an LC records check, `LC-APPROVED T-M2.21`), then gitlab-sync.

## Moving to a new device (PO, 2026-10-23: the next session runs on a new, near-identical device)
- Follow development-setup §0 for its platform. Then record the OS, engine and versions in `progress.json` `environment` and the clone
  path in `project.repoLocal` (DEC-083), in a small docs commit on the first task branch there (the T-M2.13 packet branch), and say so in its history entry.
- Not in git, so set up again: `.env` (`cp .env.example .env`), `.data/**` (E2E creates `.data/e2e/` on first run), the dev DB volume
  (a fresh one is fine: the old one only held fictitious test students, DEC-139), `.claude/settings.local.json`, Playwright browsers
  (`cd e2e && pnpm browsers`; for G3 on all engines `(cd qa && pnpm exec playwright install-deps firefox webkit)` needs `sudo`, PO).
- Accounts (PO): `gh auth login`, `glab auth login`, the git identity, credential helpers; `./scripts/install-hooks.sh`;
  `git remote add gitlab https://gitlab.com/duochou042004/eng-lms.git`. Check `gh --version` ≥ 2.101 (merge-gate).
- Lost with this device: `.claude/scratch/lc-records/` (LC copies of reviewer reports; everything needed is in `evidence/` and the DEC log)
  and the old dev DB. First run on the new device: `./scripts/check-docs.sh`, `./scripts/tests/run-all.sh`, then the gate once with the
  first task.

## Next steps
1. New device: the section above; then `./scripts/check-docs.sh` and `./scripts/tests/run-all.sh`.
2. If the records PR is open: merge-gate, gitlab-sync.
3. The **T-M2.13 packet** (task-packet skill; FE, tier M: one combined QA+UX reviewer) from its backlog row (UX-3 compact meta error
   on touch, UX-4 the cross-tab sign-out, …); G0 docs review; PO start signal.
4. Then T-M2.16, T-M2.10; then T-M2.6, T-M2.7 (M2 regression, G5, with the DEC-148 S4 and Firefox/WebKit).

## Pending PO decisions / actions
- **PR #100** (react-aria-components 1.21.1 → 1.22.1) is **held** (PO, DEC-139): full local verification with a manual check of the toast
  and dialog screens (`shortcut:` in `ui/Toast.tsx`, `ui/toastQueue.ts`, `ui/Button.tsx`) before any action. Dependabot PRs #127–#135
  are the PO's.
- Open points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget); dates use the browser's
  time zone (`shortcut:` in `lib/time`; T-M3.1/T-M3.3, L-12); production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (M8); the
  common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14 (defaults documented).

## Gotchas
- **`check-docs` now guards the merge records (T-M2.21, DEC-154):** a task in `completed[]` needs a backlog cell starting with
  `**done**` and a packet Status starting with `done`; a changed `HANDOFF.md` needs a new archive file (`mv` it first); a table-row
  code span needs `\|` for a pipe (reviewer tables often hold bare pipes: escape them when recording). It fails closed when
  `origin/develop` (or `ENGLMS_DOCS_BASE`) does not resolve: `git fetch` first on a fresh clone.
- The flaky `RouteError.test.tsx` AC11 (a) test (2 of 3 full local gates) is fixed with polling reads (DEC-153); another single
  `getBy*` read right after an event is the same trap (L-05).
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
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/lessons-learned.md` → `docs/tasks/backlog.md` (T-M2.13) → DEC-118, DEC-119,
DEC-131, DEC-154 → the task-packet skill → `docs/tasks/T-M2.20-m2-polish.md` (latest FE packet shape) → `quality-gates.md` G0 →
`docs/07-operations/development-setup.md` §0 (new device).
