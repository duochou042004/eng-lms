# Handoff — 2026-11-13T15:52Z (T-M2.24 packet merged; implementation not started)

Phase/Milestone: P1 / M2 (in progress) · Task: **T-M2.24** (ready; no feature branch yet) · Branch: `develop` (`f010cd8`; this handoff on
`docs/T-M2.24-handoff`) · Next: **T-M2.13** (packet ready, PR #153; ask the PO after T-M2.24) · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **Merged today:** T-M2.27 (`c5772f0`, DEC-166; records `925d7d2`); T-M2.25 (`b3cd6fd`, DEC-169; records `503eb44`); the T-M2.24 packet
  (`f010cd8`, PR #176, DEC-170; G0 adversarial: round 1 CHANGES REQUESTED, round 2 no S1/S2 with S3/S4 fixed by the LC, round 3 PASS).
- **T-M2.24 implementation has not started:** no `feature/T-M2.24-split-students-spec` branch, no subagent running, nothing uncommitted.
- Local E2E runs on its own per-run database (`englms_e2e`, `.data/e2e/fresh/`); `E2E_KEEP_DB=1` uses the PO's dev DB (G5 only).
- The first `regression` run (43444433118) failed 7 tests (phone ×2, WebKit smoke ×4 with CSP `style-src-elem` refusals,
  Firefox smoke ×1) → **T-M2.28**, which also holds the Hikari/Flyway S4 and the e2e-run test race; before the M2 G5, not blocking T-M2.13.

## In flight / uncommitted
- This handoff PR (`docs/T-M2.24-handoff`): open; it needs one docs-reviewer and merge-gate (step 1 below). Nothing else.

## Next steps (in this order)
1. Merge this handoff PR: one fresh docs-reviewer (records check, text only), then `DOCS-REVIEW T-M2.24: PASS` and `LC-APPROVED T-M2.24`,
   `./scripts/merge-gate.sh <n>` from an up-to-date `develop`.
2. `git switch -c feature/T-M2.24-split-students-spec` from `develop`; brief the `frontend-implementer` with
   `docs/tasks/T-M2.24-split-students-spec.md` (scope 1–5, AC1–AC7; the environment notes in `docs/handoff/next-session-prompt.md`; gate once on the final head; return the
   summary text). The LC writes `evidence/T-M2.24/summary.md`, updates `progress.json` (`in_review`, `pr` as a string), pushes, opens the PR.
3. CI (one background `gh pr checks <n> --watch`); G3: one fresh adversarial docs-reviewer that runs `scripts/tests/gate.test.sh`, mutates
   the new rule in a private clone and reruns the AC2/AC3 comparisons; S1/S2 → an AC + DEC and a delta re-check; merge via merge-gate;
   records PR (part C: DEC with merge-gate's scope line, `review/docs.md`, backlog and packet `done`, progress, handoff archive).
4. `gh pr update-branch 153`, then ask the PO to start T-M2.13 (DEC-163, DEC-164).
5. Later: T-M2.28 before the M2 G5; T-M2.26 after at least 10 shadow PRs and its two probes.

## Pending PO decisions / actions
- None open. After T-M2.24: the PO's start signal for T-M2.13.
- **Dependabot (the PO's):** PRs #135 and #160–#166 need `@dependabot rebase`.

## Gotchas
- **Context rule over the goal hook (PO, 2026-11-13):** at ~300k tokens finish the safe step, commit, hand off and **stop**, even if a `/goal`
  Stop hook says the goal is not met: tell the PO the two conflict. This session ran to ~370k because the LC let the hook override the rule.
- **A DOCS-REVIEW PASS token needs a reviewer's PASS verdict line:** when the LC fixes S3/S4 after a CHANGES REQUESTED delta (PO-6), get a short
  confirmation from the same reviewer before posting PASS (T-M2.24 G0).
- **docs-check reads `](x)` inside code spans as a link:** write regexes like `(PG)?` after `]` as `\(PG\)` or in words (T-M2.25 records).
- **`scripts/tests/e2e-run.test.sh` can flake in CI** ("keeps the host and parameters": a stale `app2.env` race, T-M2.28 (e)): `gh run rerun <id> --failed`.
- **Local E2E now runs on its own database** (T-M2.25): `e2e-run.sh` recreates `englms_e2e` per run with `.data/e2e/fresh/`; `E2E_KEEP_DB=1` runs against the PO's dev DB as before (G5). pgjdbc URL parameters and `.env` reassignments are guarded (DEC-168, DEC-169).
- **The `regression` workflow** is manual (`gh workflow run regression.yml --ref develop`, ~33 min, all 6 viewports + Firefox/WebKit smoke); its first run failed 7 tests (T-M2.28).
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

## Files to read first
`CLAUDE.md` → `progress.json` → this file → DEC-170 → `docs/tasks/T-M2.24-split-students-spec.md` → `scripts/gate.sh` (`changed_files`,
`e2e_repeat`) → `scripts/tests/gate.test.sh` → `e2e/tests/students.spec.ts` (17 top-level groups) → `docs/09-harness/coding-agent-rules.md`.
