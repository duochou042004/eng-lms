# Handoff — 2026-11-13T10:00Z (T-M2.27 merged; next T-M2.25)

Phase/Milestone: P1 / M2 (in progress) · Task: **T-M2.25** (draft: the LC writes its packet) · Branch: `develop` · Last commit on develop: see
`git log -1` after the records PR merges (`c5772f0` before it) · Next: T-M2.24, then **T-M2.13** (packet ready, PR #153, held until T-M2.25 and
T-M2.24 are merged) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.27 is merged** (`c5772f0`, PR #170, DEC-166; packet PR #169 `6f284c4`, DEC-165): the three unstable kept E2E tests are fixed
  ((a) own archived student via the request's `q`; (b) the twin's `aria-busy` read; (c) the Guardians AC4 polling read). AC5 60/60 ×3;
  G3 `QA-VERDICT T-M2.27: PASS WITH MINOR` (2 × S4: generator fixed in the records, (b) residual risk accepted).
- Order (DEC-163, DEC-164): T-M2.25 → T-M2.24 → T-M2.13. T-M2.26 follows after at least 10 shadow PRs and its two probes.

## In flight / uncommitted
- None after the records PR (`docs/T-M2.27-records`) and the QA PR (`qa/T-M2.27`, #171) are merged.

## Next steps (in this order)
1. **Write the T-M2.25 packet** (`task-packet` skill) from its backlog row (LC task: JaCoCo floor with a failing fixture, one-off web
   coverage measurement, local E2E on its own database per run, a manual `regression` workflow, the quality docs corrected). It is
   tier L but changes gate/CI tooling: adversarial G0 and G3 (T-M2.22 rule). Merge the packet; build it; G3; merge; records.
2. T-M2.24 (FE), packet first. Then ask the PO to start T-M2.13 (before it: `gh pr update-branch 153`).
3. T-M2.26 after at least 10 shadow PRs and its two entry probes (DEC-160, DEC-161).

## Pending PO decisions / actions
- None open. **Dependabot (the PO's):** PRs #135 and #160–#166 need `@dependabot rebase` before merge-gate can accept them.
- **GitHub Actions billing:** not readable by the LC. Shadow mode adds minutes.
- For G5 on this device: Firefox/WebKit browsers and host libraries (`sudo`, PO), unless T-M2.25's `regression` workflow covers it.
- Open points (unchanged): the `ui/index.ts` barrel in the student first visit; `lib/time` uses the browser's time zone (T-M3.1/T-M3.3, L-12);
  `SERVER_FORWARDHEADERSSTRATEGY=native` (M8); the common-password list (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14.

## Gotchas
- **T-M2.27 (DEC-166):** the dev DB now holds 1,065 active, 30 paused and 133 archived students (read-only count by QA, 2026-11-13); local E2E keeps adding rows until T-M2.25. `loading.spec.ts` "the loading region in English" can still fail on a very slow runner (CPU throttle ≥ 30 in the reproduction): a CI recurrence needs a new ruling (the packet forbade raising a timeout). Reproduction generators must read the old form from the pre-task commit, not `HEAD`.
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
- **Local E2E uses the PO's dev DB** (`e2e-run.sh` loads `.env` whenever it exists) and every run adds students; tests that read
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
`CLAUDE.md` → `progress.json` → this file → DEC-163, DEC-166 → the T-M2.25 row in `docs/tasks/backlog.md` → `.claude/skills/task-packet/`
→ `docs/tasks/T-M2.22-qa-strategy-review.md` (U4, U8 (a), the "promised but missing" table) → `scripts/e2e-run.sh`, `scripts/gate.sh`.
