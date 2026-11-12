# Handoff — 2026-11-12 (T-M2.23 implemented, PR #158 open at G3: the delta re-check and the final gate are pending; not merged)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.23 CI scope by diff (LC, `qa`: G3 round 1 fixed, delta re-check pending)** ·
Next: **T-M2.13** (packet ready with AC8; **held by the PO** until a start signal) · Last merge on develop: the T-M2.23 packet (PR #157,
`c090d40`) · Open PR: **#158** `chore/T-M2.23-ci-scope`, head `f0671ca` plus this handoff commit · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **The PO started T-M2.23** (DEC-161). Everything in the packet is built on `chore/T-M2.23-ci-scope` and pushed; CI was 7/7 on `f0671ca`
  with every heavy job in full. **Nothing is merged and no rule has changed on `develop`.**
- **What is built** (all in shadow mode, `scripts/ci-scope.mode` = `shadow`, so nothing is skipped): `scripts/ci-scope.sh` (`pr`, `push`,
  `replay`), the allow-list `scripts/ci-text-only.paths`, the five heavy workflows (scope step, exact `if:` forms, marker step
  `Full run on <base>`, per-SHA group on pushes, `actions: read`), `merge-gate.sh` step 3b (recomputes text-only; any other PR needs
  the marker on every check except `docs-check` and `secrets-scan`; scope line) and step 6 (a real merge only when `HEAD` is
  `origin/develop`), the standing check in `check_docs.py` with `scripts/ci-text-only.known-mentions`, and the docs (ci-cd §1.2, §2,
  git-governance §4, quality-gates G2/G4, the handoff skill).
- **Proof so far:** suites on `f0671ca`: ci-scope 238, ci-scope-workflows 65, merge-gate 413, check-docs 86; 48 mutations, all caught;
  replay over 60 merges agrees with plain `git diff` on all 60; gate PASS on `2e855e0` (598 s). Live on PR #158: the marker appears
  as `Full run on develop` with the PR head's SHA, and the new merge-gate reads it. Record: `evidence/T-M2.23/summary.md`.
- **G3 round 1** (one fresh docs-reviewer, adversarial, at `162fc02`; 191,738 tokens, 27.4 min): CHANGES REQUESTED, **no S1** (no way
  found for a product change to reach `develop` without a full run), S2 G-1 (a listed fixture was missing), S3 G-2..G-8, S4 G-9..G-11.
  All fixed at `fa5a0a0` and `f0671ca`; the record and the LC response are in `evidence/T-M2.23/review/docs.md`; rulings in DEC-161.
- **The delta re-check did not finish:** the resumed reviewer died on an API limit and returned nothing. It must be redone.

## In flight / uncommitted
- Nothing uncommitted. PR #158 is open and unmerged; no verdict or approval comment is posted on it.

## Next steps (in this order)
1. **G3 delta re-check** by ONE fresh docs-reviewer (the old agent cannot be resumed in a new session). The full brief is in
   `.claude/scratch/lc-records/T-M2.23-g3-delta-brief.md` (git-ignored, on this device). If it is gone: scope `git diff 162fc02..HEAD`;
   state of G-1..G-11; re-run the four suites; re-apply round 1's surviving mutations (R2, R10, R15, H4, K1, K2; W1, W2, W3, W5, W6,
   W11) in a private clone; attack only the new code (the `GITHUB_ACTIONS` guard and diff flags in `ci-scope.sh`, `newest_run`,
   merge-gate step 6 and the Dependabot hint, `*` only under `scripts/tests/`, the widened scanner); check the summary against its sources.
2. Fix what it finds (S1/S2 need one more delta; S3/S4 the LC fixes and records). Append the round to
   `evidence/T-M2.23/review/docs.md` and add the **G3 cost table** to the summary (round 1: 191,738 tokens, 1,644.0 s; the cut-off
   attempt has no figures).
3. **Gate once on the final head:** `ENGLMS_TASK=T-M2.23 ./scripts/gate.sh` (about 10 min; the last one was before the G3 fixes). Trim the
   log to 300 lines, commit it, update the summary's AC10 row, delete the untracked `evidence/T-M2.23/records/`.
4. Push once (batched). When CI is green on that head: post `DOCS-REVIEW T-M2.23: PASS` and `LC-APPROVED T-M2.23`, then
   `git switch develop && git pull --ff-only && ./scripts/merge-gate.sh --dry-run 158`, then the merge, then `./scripts/gitlab-sync.sh`.
5. **Right after the merge:** look at the push runs on `develop`. Expected in shadow mode: each heavy job prints
   `ci-scope: mode=shadow verdict=fast-path why=merged tree had a successful full run …`, runs all its steps, and its marker is
   `skipped`. Record what is seen (it is the first live test of switch (b)). From then on `merge-gate.sh` refuses a real merge unless
   the checkout's `HEAD` is `origin/develop`, and every open PR needs a new run.
6. **Records PR** (`docs/T-M2.23-records`, after the merge; evidence-and-handoff part C): backlog row `**done**`, packet Status `done`,
   `completed[]`, the merge DEC with the scope line from merge-gate, `tests`, `gates`, the handoff.
7. Then, on PO signals: T-M2.13 (shadow mode gives the projected saving), T-M2.24, T-M2.25; T-M2.26 after at least 10 shadow PRs **and**
   its two entry probes (a re-run keeps the event; the merge ref after a retarget and a push), DEC-160, DEC-161.

## Pending PO decisions / actions
- **T-M2.13 start signal** (held, DEC-156).
- **To tell the PO (not ruled):** a third flaky kept E2E test: `e2e/tests/loading.spec.ts:173` "the loading region in English" failed
  once on phone-small (`toHaveCount(1)` got 0 within 5 s) on `develop`'s docs-only merge `c090d40` (run 43165176510); green on re-run.
  Options: a fix AC in T-M2.13 (as AC8, DEC-159) or the polish packet.
- **To note (DEC-160 (7)):** PO-5 is asked after the first task measured under `enforce` (after T-M2.26), not after T-M2.13.
- **Dependabot (the PO's):** PR #135 is open and red. After T-M2.23 merges it needs `@dependabot rebase` before merge-gate can accept it.
- **GitHub Actions billing:** not readable by the LC. Shadow mode adds minutes (post-merge runs are no longer cancelled by the next merge).
- For G5 on this device: Firefox/WebKit browsers and host libraries (`sudo`, PO), unless T-M2.25's `regression` workflow covers it.
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
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M2.23-ci-scope.md` → `evidence/T-M2.23/review/docs.md` (G3 round 1 and the
LC response) → `evidence/T-M2.23/summary.md` → DEC-160, DEC-161 → `git diff origin/develop...HEAD --stat` on `chore/T-M2.23-ci-scope`.
