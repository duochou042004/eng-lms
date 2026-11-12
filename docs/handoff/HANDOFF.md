# Handoff — 2026-11-12 (T-M2.23 merged in shadow mode, DEC-162; T-M2.13 held by the PO)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.13** (FE, packet ready with AC8; **held by the PO** until a start signal) ·
Next: T-M2.24 (no packet yet) · Last merge on develop: **T-M2.23** (PR #158, `d2db003`) · Open PRs: this records PR (`docs/T-M2.23-records`),
#153 (T-M2.13 packet branch), Dependabot #135 · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.23 is merged in shadow mode** (`scripts/ci-scope.mode` = `shadow`, nothing is skipped): the classifier `scripts/ci-scope.sh`,
  the allow-list `scripts/ci-text-only.paths`, the five wired heavy workflows with the marker `Full run on <base>`, merge-gate step 3b
  (text-only or full run of every heavy check) and step 6 (a real merge only when `HEAD` is `origin/develop`), the standing check in
  `check_docs.py`. G3: three rounds, round 3 PASS WITH MINOR; gate green in two parts after the PO-approved dev-DB purge (DEC-162).
- **First live switch (b)** on `d2db003`: the five heavy push jobs printed `ci-scope: mode=shadow verdict=fast-path why=merged tree had a
  successful full run (run …)` with `scope=full`, ran every step and skipped only the marker; all seven push runs green
  (`evidence/T-M2.23/summary.md`, "After the merge").
- **Shadow count starts now:** T-M2.26 (`enforce`) needs at least 10 shadow PRs and its two entry probes (a re-run keeps the event; the
  merge ref after a retarget and a push), DEC-160, DEC-161.
- **The dev DB was purged** (only test data in it) on the PO's ruling; local E2E rebuilds it on the next run.

## In flight / uncommitted
- This records PR (`docs/T-M2.23-records`): backlog row and packet Status `done`, DEC-162, `progress.json`, the summary's post-merge
  section, this handoff. Merge it with merge-gate from an up-to-date `develop` checkout after CI is green (as on PR #141: the LC's part-C
  check, then `DOCS-REVIEW T-M2.23: PASS` and `LC-APPROVED T-M2.23` on this PR).

## Next steps (in this order)
1. Merge this records PR: CI green, `DOCS-REVIEW T-M2.23: PASS` and `LC-APPROVED T-M2.23` on this PR, `git switch develop && git pull --ff-only && ./scripts/merge-gate.sh --dry-run <pr>`, merge,
   `./scripts/gitlab-sync.sh`. merge-gate now prints `scope <text-only|full>; checks: <n> full, <m> fast-path`: copy it into the record.
2. On the PO's start signal: T-M2.13 (`gh pr update-branch 153` first: every open PR needs a new run since T-M2.23). Its shadow-mode
   lines give the projected saving.
3. Then T-M2.24 and T-M2.25 packets (task-packet skill), on PO signals; T-M2.26 after 10 shadow PRs and its probes.

## Pending PO decisions / actions
- **Placement needed:** `students.spec.ts:2252` ("only archived students: Include archived") assumes an archived student on the
  first page of 25, so the local dev DB fills up with each run until it fails again (it failed on 468 active; purged on the PO's ruling,
  DEC-162). A fix AC in T-M2.13 (as AC8, DEC-159) or T-M2.25 (its own E2E database per run would also cure it).
- **T-M2.13 start signal** (held, DEC-156).
- **To tell the PO (not ruled):** a third flaky kept E2E test: `e2e/tests/loading.spec.ts:173` "the loading region in English" failed
  once on phone-small (`toHaveCount(1)` got 0 within 5 s) on `develop`'s docs-only merge `c090d40` (run 43165176510); green on re-run.
  Options: a fix AC in T-M2.13 (as AC8, DEC-159) or the polish packet.
- **To note (DEC-160 (7)):** PO-5 is asked after the first task measured under `enforce` (after T-M2.26), not after T-M2.13.
- **Dependabot (the PO's):** PR #135 is open and red. T-M2.23 has merged: it needs `@dependabot rebase` before merge-gate can accept it.
- **GitHub Actions billing:** not readable by the LC. Shadow mode adds minutes (post-merge runs are no longer cancelled by the next merge).
- For G5 on this device: Firefox/WebKit browsers and host libraries (`sudo`, PO), unless T-M2.25's `regression` workflow covers it.
- Open points (unchanged): the `ui/index.ts` barrel in the student first visit; `lib/time` uses the browser's time zone (T-M3.1/T-M3.3, L-12);
  `SERVER_FORWARDHEADERSSTRATEGY=native` (M8); the common-password list (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14.

## Gotchas
- **This device (2026-11-11): agent shells run with `NoNewPrivs=1`** (inherited from the desktop app), so rootless `podman` fails with
  "newuidmap: write to uid_map failed". `export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock` in every agent shell (podman remote
  mode through the systemd user socket, enabled 2026-11-11) before `dev-up`, `gate.sh`, `e2e-run.sh`; Testcontainers uses `DOCKER_HOST` from
  `scripts/env.sh`. Brief every implementer and reviewer subagent with this. Full gates have run on this device (T-M2.23).
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
- **T-M2.23 working notes (2026-11-12):**
  - An API-limit pause **emptied the session scratchpad under `/tmp`** (the mutation runner and its results were lost and redone).
    Keep runners and raw results in `.claude/scratch/lc-records/` from the start: `T-M2.23-mutate.py`, `T-M2.23-mutate2.py`, the four
    `T-M2.23-mut-*.txt`, `T-M2.23-g0-round1.md`, `T-M2.23-g3-round1.md`, `T-M2.23-g3-delta-brief.md` are there.
  - The mutation runners edit `scripts/ci-scope.sh`, `scripts/merge-gate.sh` or `scripts/check_docs.py` in place and restore them:
    never commit, run `check-docs` or the gate while one runs; `git status --short scripts` afterwards must be empty.
  - `scripts/tests/check-docs.test.sh` builds its fixtures from the **committed** tree (`git archive HEAD`): commit a new script file
    or list entry before running it. `merge-gate.test.sh` takes about 2.5 min, `check-docs.test.sh` about 1 min; the gate's
    `scripts` step is now 188 s (74 s before).
  - `scripts/ci-text-only.known-mentions` holds exact counts of mentioning lines: a new comment that names `docs/`, `evidence/`,
    `progress.json` or a root `*.md` in a scanned file (`backend/`, `web/`, `e2e/`, `qa/`, `deploy/`, `api/`, `scripts/`, `.github/`)
    fails `check-docs` until the count is updated (`*` only under `scripts/tests/`).
  - A reviewer that mutates files works in a private clone (`git clone -q <repo> "$(mktemp -d)/r"`), never in the working tree.
  - The harness blocks a command or file body holding `rm -f "$VAR"/*`: write `"${VAR:?}"/*`.
  - `gate.sh` leaves an untracked `evidence/<task>/records/` (delete it) and a full log of about 1,900 lines (trim it).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M2.13-auth-shell-followups.md` → DEC-155, DEC-156, DEC-159, DEC-162 →
`docs/07-operations/ci-cd.md` §1.2 (CI scope in shadow mode).
