# Handoff — 2026-11-19T13:51Z (T-M2.31 merged; the next session runs on a NEW DEVICE)

Phase/Milestone: P1 / M2 (in progress) · Last task: **T-M2.31 done** (`000640e`, PR #199, DEC-184) · Branch: `develop` (this handoff on
`docs/T-M2.31-records`) · Next: T-M2.10 → T-M2.16 → T-M2.6 → T-M2.32 → T-M2.7 (G5) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.31 done** (`000640e`, PR #199 via merge-gate at `02d3503`, CI 7/7 (5 full); DEC-184). PO start 2026-11-19. (a) `ui/Popover` scrolls
  inside itself (`overflow-y: auto`, stable gutter, ring scroll padding); (b) the tutor drawer keeps Log out and its ring with the alert, and the
  text wins where both cannot fit (AC2o); (c) **the live Chrome crash after a failed logout is fixed** (block-body effect, DEC-182).
- Gate PASS on `cc3d04d` (13 steps, 787 s). G3 one combined QA+UX qa-evaluator: round 1 PASS WITH MINOR / APPROVED (QA-1 S3 → AC2o, QA-2 S4,
  UX-1 S4; DEC-183), delta PASS / APPROVED. QA report PR #200 (`qa/T-M2.31`).
- **New row T-M2.32** (before T-M2.7): the `consoleGuard` gap in the other specs (may reveal hidden errors), an optional effect lint rule, and two
  S4s (740×360 offline ring 1–2 px; the gutter inset).
- **Firefox is out of the matrix** (DEC-180); G5 = 6 Chromium viewports + WebKit smoke, one `regression` run in T-M2.7.

## In flight / uncommitted
- **This records PR** (`docs/T-M2.31-records`): needs one fresh docs-reviewer (`DOCS-REVIEW T-M2.31: PASS`, text only), CI, `LC-APPROVED T-M2.31`,
  merge-gate, `gitlab-sync.sh`. If it is still open on the new device, finish it first (step 2 below).
- Nothing else: no open feature branch; Dependabot #165 and #135 stay open and held by the PO.

## Moving to a new device (read before anything else)
- **What moves with the repo:** everything durable is in git (progress.json, this handoff, packets, DECs, evidence summaries, QA reports).
  GitHub is the source of truth; GitLab is a mirror pushed by `scripts/gitlab-sync.sh` after every merge (GitLab CI paused, DEC-107).
- **What does NOT move** (git-ignored, local to the old device): `.env` (recreate: `cp .env.example .env`, dev-only values, DEC-094), `.data/**`
  (E2E users are recreated by global setup), **the PO's dev database** (1,065 active / 30 paused / 133 archived students on the old device,
  T-M2.27; the new device starts empty after `dev-up.sh`: tests must not depend on that data), local screenshots (`evidence/**/impl/*.png`),
  `.claude/scratch/lc-records/` (reviewer copies; all recorded text is already in the repo), and Playwright browser builds (`~/.cache/ms-playwright/`).
- **Set-up order:** `docs/07-operations/development-setup.md` §0 (new machine checklist, steps 1–8) from start to end. The agent stops and asks the PO
  for `sudo`, accounts and credentials (gh and glab auth as `duochou042004`, the git credential helpers). Downloads need PO approval
  (`pnpm browsers` for Playwright 1.65 / Chromium 1254). Then `./scripts/check-docs.sh`, `scripts/tests/run-all.sh` and one `./scripts/gate.sh`
  as the verification; record OS, engine, tool versions in `progress.json` `environment` and `project.repoLocal` (the clone path).
- **This device's quirks may not apply there:** `CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock` was needed because agent shells here run
  with `NoNewPrivs=1` (rootless podman's newuidmap fails). On the new device test `podman ps` plainly first; use the socket only if it fails the
  same way. Docker or Docker Desktop also works (§0); macOS needs Homebrew bash ≥ 4.4; Windows only through WSL2.
- **Paths:** this device's clone is `/home/linux/Projects/eng-lms`; update the next-session prompt's path and `project.repoLocal` on the new one.
- Last state on this device: `develop` = GitHub = GitLab after the records merge; `git status` clean.

## Next steps (in this order)
1. On the new device: set-up and verification (above).
2. If the T-M2.31 records PR is still open: one fresh docs-reviewer (text only) → `DOCS-REVIEW T-M2.31: PASS` on its final head, CI green,
   `LC-APPROVED T-M2.31`, merge-gate, `gitlab-sync.sh`.
3. **T-M2.10** (BE; the backlog row says it runs before the next backend task): write its packet (skill `task-packet`), G0 by a fresh
   docs-reviewer, ask the PO for the start signal. Then **T-M2.16** (BE), **T-M2.6** (Settings v1, BE+FE), **T-M2.32** (FE/E2E, before T-M2.7).
   The PO's goal listed T-M2.6 first; the LC proposes T-M2.10 first because of the row's note. Confirm the order with the PO at the first start-signal ask.
4. **T-M2.26** (CI scope on) only after at least 10 PRs under T-M2.23 shadow mode, with its shadow report.
5. **T-M2.7** holds the M2 G5: one `regression` run (no Firefox), the milestone retro, risk review, PO sign-off.

## Pending PO decisions / actions
- The order of the remaining M2 rows (step 3); each task's start signal.
- **Dependabot, held by the PO:** #165 (msw 3 major: `web` typecheck fails at `web/src/test/setup.ts:14`; needs a packet) and #135 (react group).
  The LC does not touch them unasked. A React bump touches T-M2.31's (c) mechanism: re-run its unit test and E2E.
- On the new device: credentials, `sudo` steps and browser downloads (§0).

## Gotchas
- **Chromium 158's `scrollIntoView` returns a Promise** (DEC-182): a `useEffect` arrow that returns an expression hands it to React as the
  cleanup, which throws on unmount. Effects that call DOM methods need a block body. Fixed in T-M2.31 (c) (`000640e`); six `focus()`/`setAttribute`
  effects keep the expression shape (safe today, `undefined`): T-M2.32 (b).
- **`consoleGuard` covers only the test's own context** (T-M2.31, DEC-184): pages opened in a `browser.newContext()` (e.g. `freshSession`) are
  unguarded, so a crash there can pass unseen when a later navigation replaces the error page. `shells.spec.ts` has a local `guardContext`;
  the other specs are T-M2.32 (a). Until then, a new E2E that signs in through a fresh context must pass the guard itself.
- **Subagent types on a session started elsewhere:** when the desktop session's folder is not the repo, `.claude/agents/*` are not registered as
  subagent types; run a `general-purpose` agent told to read and follow `.claude/agents/<role>.md` (T-M2.31 did this). Its report arrives as a
  hand-back message; extract it from the agent's output transcript (a `tool_use` input) into `.claude/scratch/lc-records/` at once.
- **A QA delta round needs the QA verdict as its own comment:** merge-gate reads only a comment's first line, so post `QA-VERDICT`, `UX-REVIEW`
  and `LC-APPROVED` as three comments (T-M2.31 PR #199).
- **`container-build` can fail on a Maven wrapper download** inside the image build (`Downloader.main`, T-M2.31 PR #200): `gh run rerun <id> --failed`.
- **`gate.sh`'s e2e repeat runs `--repeat-each=3` under `fullyParallel`** on a fresh DB: test-data helpers that check-then-create race between
  repeats; key shared sets by `testInfo.repeatEachIndex` (T-M2.28).
- **WebKit locally:** host libraries are not installed; WebKit evidence comes from `gh workflow run regression.yml --ref <branch>`
  (~25–30 min, nearly all of it Playwright; no inputs: repeat diagnostics go in a temporary spec block, removed before the final head).
  **Each run costs ~30–40 min of PO time: the PO capped T-M2.30 at 4 runs (2026-11-18).** Plan diagnostic runs up front, cap them in the
  packet, and prefer a local reproduction when the engine is installed.
- **merge-gate on `docs/`/`chore/` needs the exact `DOCS-REVIEW <task>: PASS`**; a PASS WITH MINOR needs a same-reviewer confirmation after the
  S4s are fixed or batched (T-M2.28).
- **`e2e-run.test.sh` fails while another app holds port 8080:** don't run it beside an E2E run.
- **A Playwright bump needs its browser build locally** (T-M2.13): after a Dependabot bump of `@playwright/test`, run `pnpm --dir e2e browsers`
  (a download: PO approval) before the next local E2E or gate; check `ls ~/.cache/ms-playwright/`. In the app shell `pnpm` may resolve to
  12.18 (Node 24.22.2) and refuse with a version check: run it from `e2e/` after `nvm use 24.21.0`, and never pipe it to `head` (the install stops).
- **Gate logs:** an implementer may commit the full ~2,600-line log; trim it in the records PR, keeping every `gate:` line (T-M2.13).
- **A `feature/` branch merges only on `QA-VERDICT <task>: PASS` or `PASS WITH MINOR`** (merge-gate); a docs-reviewer's `DOCS-REVIEW` counts only on `docs/`/`chore/`.
  Name the QA run in the packet's G3 (T-M2.24 needed an extra QA round at merge time, DEC-171).
- **The e2e repeat now follows `e2e/support/` imports** (T-M2.24): a change to `e2e/support/fixtures.ts` repeats all 17 specs ×3 and
  `auth.ts` 16 (~15 min per project set); budget for it.
- **Context rule over the goal hook (PO, 2026-11-13):** at ~300k tokens finish the safe step, commit, hand off and **stop**, even if a `/goal`
  Stop hook says the goal is not met: tell the PO the two conflict. This session ran to ~370k because the LC let the hook override the rule.
- **A DOCS-REVIEW PASS token needs a reviewer's exact PASS line on the final head:** when the LC fixes S3/S4 after a CHANGES REQUESTED delta (PO-6), or adds a status-only commit after a PASS (draft → ready), get a short confirmation from the same reviewer before posting PASS (T-M2.24 G0, T-M2.28 G0).
- **docs-check reads `](x)` inside code spans as a link:** write regexes like `(PG)?` after `]` as `\(PG\)` or in words (T-M2.25 records).
- **`scripts/tests/e2e-run.test.sh` can flake in CI** ("keeps the host and parameters": a stale `app2.env` race, T-M2.28 (e)): `gh run rerun <id> --failed`.
- **Local E2E now runs on its own database** (T-M2.25): `e2e-run.sh` recreates `englms_e2e` per run with `.data/e2e/fresh/`; `E2E_KEEP_DB=1` runs against the PO's dev DB as before (G5). pgjdbc URL parameters and `.env` reassignments are guarded (DEC-168, DEC-169).
- **The `regression` workflow** is manual (`gh workflow run regression.yml --ref develop`, ~25–30 min, all 6 Chromium viewports + WebKit smoke; Firefox dropped, DEC-180); its first run failed 7 tests (T-M2.28).
- **T-M2.27 (DEC-166):** the dev DB now holds 1,065 active, 30 paused and 133 archived students (read-only count by QA, 2026-11-13); local E2E added rows until T-M2.25 (now only `E2E_KEEP_DB=1` runs do). `loading.spec.ts` "the loading region in English" can still fail on a very slow runner (CPU throttle ≥ 30 in the reproduction): a CI recurrence needs a new ruling (the packet forbade raising a timeout). Reproduction generators must read the old form from the pre-task commit, not `HEAD`.
- **A QA agent can end on an API error after its verdict** (T-M2.27: Cloudflare 403 after the full report): the report already returned counts; check `git status` and `e2e/tests` for scratch files.
- **This device (2026-11-11): agent shells run with `NoNewPrivs=1`** (inherited from the desktop app), so rootless `podman` fails with
  "newuidmap: write to uid_map failed". `export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock` in every agent shell (podman remote
  mode through the systemd user socket, enabled 2026-11-11) before `dev-up`, `gate.sh`, `e2e-run.sh`; Testcontainers uses `DOCKER_HOST` from
  `scripts/env.sh`. Brief every implementer and reviewer subagent with this.
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
- CI `backend` or `e2e-smoke` can fail on a Maven Central **403** or **429**: `gh run rerun <id> --failed`.
- **Layout ACs need fixed rules.** T-M2.5's table went through four content-driven sizing attempts (min width, `nowrap`, `break-word`) before `table-layout: fixed` with column shares; write column shares and break rules into the packet up front.
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
- Agents often cannot write `evidence/<task>/summary.md` or report files: record their returned text yourself. Agents never post PR comments.
- Tell reviewer agents explicitly: no PR comments, no files in the tree, return text only (the T-M2.9 SEC agent did both, DEC-105). Extract an
  agent's final text from its `tasks/<id>.output` transcript rather than retyping it.
- `gitlab-sync.sh` may fail authentication transiently: retry once. GitLab CI is **paused** (DEC-107; the sync pushes with `-o ci.skip`; to resume:
  the GitLab project variable `ENGLMS_GITLAB_CI=on` and `ENGLMS_GITLAB_CI=on ./scripts/gitlab-sync.sh`, ci-cd §1.1); the sync still runs after every merge.
- Wall-clock bounds in tests flake on the 2-core CI runner (DEC-093); one remains: `AuthApiIntegrationTest.anUnrelatedLoginStaysFastDuringABurstOnOneUsername`
  (failed at 3355 ms on PR #125's docs-only head, run 39567176119; rerun) — now in the BE row T-M2.10 (DEC-144 (3)).
- `git merge` is denied: `gh pr update-branch` (DEC-090).
- **LC habits from T-M2.22 (free, from now):** batch fixes before pushing to a text-only PR (16 of 32 docs-head runs were cancelled by a
  later push); open the records PR after the `qa/` PR has merged.
- **CI infra flake (2026-11-11, run 43042804940):** `playwright install --with-deps` exited 100 before any test; re-run.
- **T-M2.23 design traps (G0):** the marker step follows the classifier's *verdict*, the heavy steps follow its *scope* output (always
  `full` in shadow mode); bash and jq disagree on `$` before a final newline, so a path with a control character is off the list in
  every reader; after the T-M2.23 merge every open PR needs a new run (ours: `gh pr update-branch`; Dependabot: `@dependabot rebase`).
- **Local E2E used the PO's dev DB** until T-M2.25 (merged: a per-run `englms_e2e` and `.data/e2e/fresh/`; `E2E_KEEP_DB=1` keeps the old way) and every run added students; tests that read
  "the first page" break as it grows (`students.spec.ts:2252` failed at 468 active, DEC-162). Purged on the PO's ruling 2026-11-12;
  never purge again without one. T-M2.25 gives local E2E its own database per run.
- **merge-gate step 6 (T-M2.23):** a real merge runs only from a checkout whose `HEAD` is `origin/develop`
  (`git switch develop && git pull --ff-only` first); a dry run works anywhere. In shadow mode a text-only PR prints
  `scope text-only; checks: 0 full, 5 fast-path` (the heavy jobs still ran in full; only their marker was skipped).
- **API-limit pauses** can stop a subagent mid-run and empty the session scratchpad under `/tmp`: keep runners and raw results in
  `.claude/scratch/lc-records/`; before resuming, check `git status`, `git log`, the newest `evidence/<task>/gate-*.log`, `podman ps`
  and `pgrep -af 'java -jar'` (the VSCode Java language server is not ours), then resume with SendMessage (it keeps its context).
- **Waiting:** foreground `sleep` is blocked. Wait for CI with one background `gh pr checks <n> --watch --interval 60` (or
  `gh run watch <id>`), not with repeated checks.
- **Script-suite habits (T-M2.23):** mutation runs edit scripts in place: never commit, run `check-docs` or the gate meanwhile, and
  `git status --short scripts` must be empty after; `check-docs.test.sh` builds fixtures from the committed tree (commit first);
  `scripts/ci-text-only.known-mentions` holds exact counts of lines naming an allow-listed path in scanned dirs (`*` only under
  `scripts/tests/`); the harness blocks `rm -f "$VAR"/*` (write `"${VAR:?}"/*`); `gate.sh` leaves an untracked
  `evidence/<task>/records/` (delete it) and a ~2,000-line log (trim it to ≤ 300 lines).

- **Firefox is out of the automated matrix (PO, DEC-180):** the tutor's users are on Chrome (Windows) and Safari (Mac). Firefox 159 crashes
  its content process (SIGSEGV) under axe on a second `/login` load; recorded, not reported upstream. `qa/`'s optional `QA_ENGINES=all`
  still includes it; `qa/README.md:25` still calls that run the milestone regression (QA-owned; relabel when `qa/` is next touched).
- **`e2e-run.sh` fresh mode (T-M2.30):** `java` starts in `backend/target/e2e-cwd/` under `env -u DEBUG`; browser logs go to
  `e2e/browser-logs/pw-<pid>.log`. Known gaps: quoted JVM option names, lower-case `debug`/`trace`, Hikari `data-source-class-name`
  (development-setup "E2E database").


## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/07-operations/development-setup.md` §0 (new device) → DEC-182..DEC-184 → the backlog rows
T-M2.10, T-M2.16, T-M2.6, T-M2.32, T-M2.7 → `docs/09-harness/coding-agent-rules.md`.
