# Handoff — 2026-11-12 (the T-M2.23 packet is ready at G0, DEC-160; the PO is asked for its start signal; T-M2.13 still held)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.23 CI scope by diff (LC, ready; waits for the PO's start signal)** ·
Next: **T-M2.13** (packet ready with AC8, DEC-155, DEC-159; **held by the PO** until a start signal) · Last merges on develop: the
T-M2.22 records (PR #156, `e9901dd`), this packet PR #157 · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **The T-M2.23 packet passed G0** (`docs/tasks/T-M2.23-ci-scope.md`, DEC-160; record `evidence/T-M2.23/review/docs.md`): one fresh
  docs-reviewer with an adversarial brief, PASS WITH MINOR (141,820 tokens, 9.3 min; 14 S3 and 6 S4, all fixed; no S1 or S2). It found
  no way for a product change to reach `develop` without a full run, and nothing beyond DEC-158 PO-1 and PO-2.
- **What the packet decides (DEC-160):** T-M2.23 builds both switches (text-only PRs; post-merge runs on a tested tree), merge-gate's
  own recomputation, the marker step `Full run on <base>`, the standing `check-docs` check and the offline replay, and **merges in
  shadow mode**: the classifier reports, every heavy step still runs. The switch-on is the new row **T-M2.26**, after at least 10 PRs
  in shadow mode without a wrong verdict.
- **No rule has changed yet.** T-M2.24 (U3) and T-M2.25 (U4) are rows only. T-M2.13 is still held.

## In flight / uncommitted
- Nothing, once PR #157 (`docs/T-M2.23-ci-scope`) is merged.

## Next steps
1. **T-M2.23 implementation** on the PO's start signal: `chore/T-M2.23-ci-scope`, the LC implements, 10 ACs, the constraint-to-fixture
   map in the packet; each rule seen failing (L-01). First verify the four GitHub assumptions in the packet's Risks (expanded step
   names in the jobs API, `head_sha` of PR runs, re-runs keep the event, the merge ref after a retarget). G3: one fresh docs-reviewer
   with an adversarial brief. If it passes 2 agent-days, split switch (b) off (packet, Design notes).
2. **T-M2.13** on the PO's start signal. Under shadow mode it gives the projection of the saving, not the measurement (DEC-160 (7)).
3. Then T-M2.24, T-M2.25, and T-M2.26 once 10 shadow PRs exist. The backend wall-clock flake (T-M2.10 row) runs before the next backend task.
4. PO-5 (one records PR) is asked after the first task measured under `enforce` mode (after T-M2.26). U7 and U8 (b)–(d) are not scheduled.

## Pending PO decisions / actions
- **T-M2.23 start signal** (asked 2026-11-12) and the **T-M2.13 start signal** (held, DEC-156).
- **To note (DEC-160 (7)):** DEC-158 said PO-5 is decided after "T-M2.13 under T-M2.23". T-M2.13 runs in shadow mode, where nothing is
  skipped, so it can only project the saving; the measured figure comes from the first task after T-M2.26.
- **GitHub Actions billing** (Settings → Billing): the LC cannot read it; 2,844 wall minutes of CI ran in 22 days. Shadow mode adds
  minutes: post-merge runs that a later merge cancels today will finish.
- **Dependabot (U5, the PO's):** PR #135 is open and red (13 failed runs); Dependabot merges go in outside merge-gate, 18 of 23 while behind. PR #100 is closed.
- For G5 on this device: Firefox/WebKit browsers and host libraries (`sudo`, PO), unless T-M2.25's manual `regression` workflow covers it.
- Open points (unchanged): the `ui/index.ts` barrel in the student first visit; `lib/time` uses the browser's time zone (T-M3.1/T-M3.3, L-12);
  `SERVER_FORWARDHEADERSSTRATEGY=native` (M8); the common-password list (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14.

## Gotchas
- **This device (2026-11-11): agent shells run with `NoNewPrivs=1`** (inherited from the desktop app), so rootless `podman` fails with
  "newuidmap: write to uid_map failed". `export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock` in every agent shell (podman remote
  mode through the systemd user socket, enabled 2026-11-11) before `dev-up`, `gate.sh`, `e2e-run.sh`; Testcontainers uses `DOCKER_HOST` from
  `scripts/env.sh`. Brief every implementer and reviewer subagent with this. The first full gate on this device has not run yet (T-M2.13 G1).
- **New CI flake (2026-11-11, PR #153 run 43017673796, tablet):** the kept `students.spec.ts:1805` "Guardians (T-M2.15) AC4: two pages: a
  stale save opens the conflict dialog …" read `guardianNames(page)` once right after the removed-guardian alert (the L-05 single-read
  trap) and also hit a console error; 514 passed, 1 failed on a docs-only head. Not ruled yet: an input to T-M2.22 (flake history); else the LC
  rules at T-M2.13 G1 (an L-10 OQ) or routes it to T-M2.7 with a DEC. Rerun with `gh run rerun <id> --failed`.
- **Node on this device:** the app-inherited PATH starts on Node 24.22.2; `nvm use` in the repo picks 24.21.0 (`.nvmrc`). corepack is
  enabled on both, so `pnpm` 12.6.0 works either way.
- **T-M2.13 D-1 (G0):** the cross-tab `signed-out` follow must read the session **before** dropping caches, then clear without a reset; a
  reset refetches mounted queries whose 401 wins without the notice flag. The packet's scope 2 steps (i)–(iii) are the rule.
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
- Paths in older docs/evidence name `/home/kali/App_sources/eng-lms` and `/home/kali/App_projects/eng-lms` (earlier machines); this device clones to `/home/linux/Projects/eng-lms`.
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
- **LC habits from T-M2.22 (free, from now):** batch fixes before pushing to a text-only PR (16 of 32 docs-head runs were cancelled by a
  later push); open the records PR after the `qa/` PR has merged.
- **CI infra flake (2026-11-11, run 43042804940):** `playwright install --with-deps` exited 100 before any test; re-run.
- The CI timing analysis used throwaway scripts in the session scratchpad; the commands in the T-M2.22 packet reproduce the data.
- **T-M2.23 design traps (G0):** the marker step follows the classifier's *verdict*, the heavy steps follow its *scope* output (always
  `full` in shadow mode); bash and jq disagree on `$` before a final newline, so a path with a control character is off the list in
  every reader; after the T-M2.23 merge every open PR needs a new run (ours: `gh pr update-branch`; Dependabot: `@dependabot rebase`).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M2.23-ci-scope.md` → `evidence/T-M2.23/review/docs.md` → DEC-158, DEC-160 →
`scripts/merge-gate.sh`, `.github/workflows/`, `scripts/check_docs.py`, `scripts/tests/` → `docs/tasks/T-M2.13-auth-shell-followups.md`.
