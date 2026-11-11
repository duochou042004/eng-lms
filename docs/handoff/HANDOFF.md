# Handoff — 2026-11-11 (PO: T-M2.13 held; next: T-M2.22 QA and delivery strategy review, DEC-156)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.22 QA and delivery strategy review (LC, draft)** · Next: **T-M2.13**
(packet ready, DEC-155; **held by the PO** until after T-M2.22 and a start signal) · Last merges on develop: the T-M2.13 packet (PR #153,
`b1a542f`), this records PR · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- The new device is recorded (Ubuntu 26.10, rootless Podman through the user socket; `progress.json` `environment`). The gate has not run here yet.
- **T-M2.13 packet merged at G0** (PR #153, `b1a542f`, DEC-155). The PO answered the start-signal question "Not yet" and asked the next
  session to **examine the testing and QA process first** (DEC-156): delivery has slowed, and the tests grow more costly with every feature.
  The PO's question is whether the process is over-built, over-meticulous or simply wrong in places.
- **Input:** the external review `/home/linux/Projects/Eng-LMS-QA-Strategy-Review-2026-10-29.md` (a PO file outside the repo, **not in git**;
  if it is missing, ask the PO). Its paths name `/home/kali/Projects/eng-lms-develop`: map them to this clone.
- **Already checked by the LC on `b1a542f` (DEC-156):** no nightly/scheduled workflow; `e2e-smoke` runs the full suite on every PR (docs-only
  too) and again on each push to `develop`; JaCoCo has no `check` goal and web has no Vitest coverage; `students.spec.ts` is 3,305 of 6,379 spec
  lines; `qa/` holds M1 specs only; `scripts/seed-e2e` does not exist; e2e is Chromium only. Measured over the last 40 `e2e-smoke` runs:
  28 success / 10 failure, success p50 16.0 min, p90 17.4, max 19.5. PR #153 (docs only) took two full e2e runs (a flake, then green).
- Left over (unchanged): S4 QA-2 in the **T-M2.7** row (DEC-148); the backend wall-clock flake in **T-M2.10** (DEC-144 (3)); AC6's purpose
  unverified off Chromium (G5, DEC-146).

## In flight / uncommitted
- Nothing, once this records PR (`docs/T-M2.22-qa-strategy-plan`) is merged.

## Next steps
1. **T-M2.22** (backlog row): read the external review in full and audit it against the live repo (it describes a 2026-10-23 snapshot).
   Build the baseline from data, not impressions: per-run CI wait split into queue, setup, packaging, test body and uploads (`gh run view
   --json jobs`); first-attempt failures classified (product, test, infra); local gate step times (`evidence/*/gate-*.log`); review rounds,
   tokens and minutes per tier (the G3 cost tables, DEC-131 measurement); where repeats and duplicate runs come from.
2. Answer the PO directly: what is sound and must stay (independent QA, authz/isolation harness, negative proofs), what is over-built or
   duplicated, what is promised but missing. Then a ranked upgrade plan: per item the weakness, evidence, risk, alternatives, validation and
   rollback. Smallest discriminating experiments where the evidence cannot choose. Every change to merge assurance needs a PO decision (DEC).
3. Write it as the T-M2.22 packet/plan on `docs/T-M2.22-<slug>`; G0 by a fresh docs-reviewer plus an adversarial angle for gate/CI changes;
   PO approval; then the chosen pilots as their own packets. T-M2.13 resumes only after that and a PO start signal.

## Pending PO decisions / actions
- **T-M2.22 outcome:** the policy trade-offs (e.g. full e2e on docs-only PRs, the post-merge run, the runner-minute budget for sharding,
  coverage floors now or later, the G5 browser matrix).
- **T-M2.13 start signal** (held, DEC-156).
- **PR #100** (react-aria-components bump) is **held** (DEC-139). Dependabot PRs (#135 open) are the PO's.
- For G5 on this device: Firefox/WebKit browsers and host libraries (`sudo`, PO).
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

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `/home/linux/Projects/Eng-LMS-QA-Strategy-Review-2026-10-29.md` → DEC-131, DEC-156 →
`docs/06-quality/{quality-gates,test-strategy,qa-protocol}.md` → `docs/tasks/T-M2.18-quality-process.md` (the DEC-131 measurement) →
`docs/09-harness/lessons-learned.md` → `scripts/gate.sh`, `scripts/e2e-run.sh`, `.github/workflows/`, `e2e/playwright.config.ts`.
