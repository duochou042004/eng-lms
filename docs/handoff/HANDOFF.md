# Handoff — 2026-11-11 (new device recorded; T-M2.13 packet at G0 PASS WITH MINOR, DEC-155; next: merge PR #153, PO start signal)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.13 auth and shell feedback follow-ups (FE, tier M, ready)** ·
Next: **T-M2.16** username-only PATCH (BE) · Last merges on develop: the PO's Dependabot PRs #127–#152 (except held #100 and open #135),
the T-M2.21 records (PR #141, `d763086`) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **New device recorded** (commit `4358ca3` on the packet branch; `progress.json` `environment`, `project.repoLocal`): Ubuntu 26.10, rootless
  Podman 5.8.6 through the user socket, JDK 25.0.4 + Boot CLI 4.1.0 (`.sdkmanrc`), Node 24.21.0, pnpm 12.6.0, gh 2.103.3, glab 1.130.0,
  hooks, gitlab remote, `.env`, Chromium headless shell 156. `./scripts/check-docs.sh` PASS and `./scripts/tests/run-all.sh` PASS here; the
  gate has not run on this device yet.
- **T-M2.21 records PR #141 was already merged** (`d763086`) before this session; the GitLab mirror had it.
- **T-M2.13 packet** `docs/tasks/T-M2.13-auth-shell-followups.md` (DEC-155; Status ready): UX-3 compact meta error opens on tap
  (new `ui/Toggletip`), UX-4 `/login` notice after a cross-tab sign-out (read first, clear without reset, 401 stands down), O-1/O-2 a failed
  logout stays signed in and says so (`networkMode: 'always'`; shared `LogoutFailedAlert`), UX-6 chunk-page copy. 7 ACs; five changed kept
  assertions (a)–(e). G0: round 1 CHANGES REQUESTED (S2 D-1, S4 D-2..D-10; 104,400 tokens / 6.0 min), delta PASS WITH MINOR (S4 N-1,
  N-2; 11,890 / 0.8 min), all fixed; record `evidence/T-M2.13/review/docs.md`.
- Left over (unchanged): S4 QA-2 in the **T-M2.7** row (M2 G5, DEC-148); the backend wall-clock flake in **T-M2.10** (DEC-144 (3)); AC6's
  purpose unverified off Chromium (G5, DEC-146). **The quality process is DEC-131.**

## In flight / uncommitted
- Packet PR **#153** (`docs/T-M2.13-auth-shell-followups`): merge via merge-gate after CI is green (`DOCS-REVIEW T-M2.13: PASS`,
  `LC-APPROVED T-M2.13`), then `./scripts/gitlab-sync.sh`. If it is already merged, nothing is in flight.

## Next steps
1. If PR #153 is open: CI green, verdict comments, `./scripts/merge-gate.sh 153 --dry-run`, then real; gitlab-sync.
2. **PO start signal for T-M2.13** (not given yet). Then the frontend-implementer on `feature/T-M2.13-auth-shell-followups` from
   `origin/develop` (brief it with the `CONTAINER_HOST` gotcha); one gate on the final head + CI; G3 tier M: one combined fresh QA+UX reviewer.
3. Then T-M2.16, T-M2.10; then T-M2.6, T-M2.7 (M2 regression, G5, with the DEC-148 S4 and Firefox/WebKit, which need the PO's `sudo`
   `playwright install-deps`).

## Pending PO decisions / actions
- **T-M2.13 start signal.**
- **PR #100** (react-aria-components bump) is **held** (PO, DEC-139): full local verification with a manual check of the toast and dialog
  screens before any action. Dependabot PRs (now #135 open) are the PO's.
- For G5 on this device: Firefox and WebKit browsers and their host libraries (`(cd qa && pnpm exec playwright install firefox webkit &&
  pnpm exec playwright install-deps firefox webkit)`, `sudo`, PO).
- Open points (unchanged): the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget); dates use the
  browser's time zone (`shortcut:` in `lib/time`; T-M3.1/T-M3.3, L-12); production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (M8); the
  common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14 (defaults documented).

## Gotchas
- **This device (2026-11-11): agent shells run with `NoNewPrivs=1`** (inherited from the desktop app), so rootless `podman` fails with
  "newuidmap: write to uid_map failed". `export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock` in every agent shell (podman remote
  mode through the systemd user socket, enabled 2026-11-11) before `dev-up`, `gate.sh`, `e2e-run.sh`; Testcontainers uses `DOCKER_HOST` from
  `scripts/env.sh`. Brief every implementer and reviewer subagent with this. The first full gate on this device has not run yet (T-M2.13 G1).
- **New CI flake (2026-11-11, PR #153 run 43017673796, tablet):** the kept `students.spec.ts:1805` "Guardians (T-M2.15) AC4: two pages: a
  stale save opens the conflict dialog …" read `guardianNames(page)` once right after the removed-guardian alert (the L-05 single-read
  trap) and also hit a console error; 514 passed, 1 failed on a docs-only head. Not ruled yet: the LC decides at T-M2.13 G1 (an L-10 OQ)
  or routes it to the M2 polish/T-M2.7 with a DEC. Rerun with `gh run rerun <id> --failed`.
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

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/lessons-learned.md` → `docs/tasks/T-M2.13-auth-shell-followups.md` → DEC-155,
DEC-131 → `evidence/T-M2.13/review/docs.md` → `.claude/agents/frontend-implementer.md` and the `frontend-standards` skill.
