# Handoff — 2026-10-23 (T-M2.20 packet at G0, DEC-145; next: the PO start signal)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.20 M2 polish batch (FE, ready, tier M): waits for the PO start signal** ·
Next: **T-M2.21 records checks** · Last merges on develop: the T-M2.20 packet (PR #126), the T-M2.17 records (PRs #124, #125), `ff1d2ec`
(T-M2.17, PR #123) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.20 packet at G0** (`docs/tasks/T-M2.20-m2-polish.md`, DEC-144 decisions, DEC-145 G0): the eight M2 S4 items, one AC each (AC1
  limits `{{max, number}}`; AC2 `ErrorSummary` `headingLevel`; AC3 mutation cache cleared at sign-in, sign-out, 401 and
  `dropAllButSession`; AC4 `useCreateStudent` session guard; AC5/AC6 `expectNoMidWordBreak` / `expectFocusNotLost` fixes with proofs;
  AC7 settled axe after overlays; AC8 every `TagInput` refusal reason; AC9 gate/CI). **Tier M** (one combined QA+UX reviewer; S-1/S-2
  only remove client state, the docs reviewer agreed). DOCS-REVIEW PASS in 2 rounds (108,658 + 7,714 tokens); record
  `evidence/T-M2.20/review/docs.md`.
- The backend wall-clock flake joined T-M2.10 (DEC-144 (3)); the `shortcut:` ledger has 8 markers (lessons-learned corrected, G0 D-7).
- **The quality process is DEC-131** (risk tiers, delta re-checks, S4 → polish packet, one local gate per head + CI, reviewers return
  text only, G3 cost table). Student forms validate on submit, then on change (DEC-142). Open in the backlog: T-M2.10, T-M2.13, T-M2.16,
  T-M2.20, T-M2.21. This device: Kali Linux rolling, rootless Podman 5.8.6, clone `/home/kali/App_projects/eng-lms`. GitLab CI paused
  (DEC-107); the mirror syncs.

## In flight / uncommitted
- Nothing uncommitted. PR #126 merged by merge-gate in this session (if not, merge it first: `DOCS-REVIEW T-M2.20: PASS` and
  `LC-APPROVED T-M2.20` after CI green).

## Another device
- Follow development-setup §0 for its platform; record OS, engine and versions in `progress.json` `environment` and the clone path in
  `project.repoLocal` (DEC-083). Not in git: `.env` (`cp .env.example .env`), `.data/**`, the dev DB volume, `.claude/settings.local.json`,
  Playwright browsers (`cd e2e && pnpm browsers`). Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers;
  `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. If PR #124 (`qa/T-M2.17`) or this records PR (`docs/T-M2.17-g3-records`) is still open: merge via merge-gate (`--dry-run` first;
   `LC-APPROVED T-M2.17`, the docs PR also `DOCS-REVIEW T-M2.17: PASS` after an LC check of the records), then gitlab-sync.
2. The **T-M2.20 packet** (task-packet skill; tier M: one combined QA+UX reviewer) from its backlog row; G0 docs review; PO start signal.
3. Then T-M2.21 (records checks), T-M2.13, T-M2.16; then T-M2.6, T-M2.7 (M2 regression, G5).

## Next steps
1. **Wait for the PO start signal for T-M2.20** (do not implement before it). Then branch `feature/T-M2.20-m2-polish` from `develop`;
   `progress.json` `in_progress`; one frontend-implementer (returns its summary text, L-07); one gate on the final head + CI; G3: one
   combined fresh QA+UX reviewer (qa-protocol §2a), measured in the G3 cost table; S4 left over → the M2 G5 list.
2. Then T-M2.21 (records checks), T-M2.13, T-M2.16, T-M2.10; then T-M2.6, T-M2.7 (M2 regression, G5).

## Pending PO decisions / actions
- **PR #100** (react-aria-components 1.21.1 → 1.22.1) is **held** (PO, DEC-139): it needs a full local verification with a manual check of
  the toast and dialog screens (`shortcut:` in `ui/Toast.tsx`, `ui/toastQueue.ts`, `ui/Button.tsx`); no action until the PO says so.
  The other Dependabot PRs were handled by the PO.
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so G3 can cover all three browsers.
- Open points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget: student 186.7 KB gz);
  dates use the browser's time zone (`shortcut:` in `lib/time`; resolved in T-M3.1/T-M3.3, L-12); production needs
  `SERVER_FORWARDHEADERSSTRATEGY=native` (M8); the common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny
  rules (DEC-061); OQ-03..OQ-14 (defaults documented).
- Dev database: **kept** (LC call, DEC-139: ≈ 15,000 test students, 56 MB, gates green); recreate a fresh volume at the M2 G5 regression.

## Gotchas
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
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/lessons-learned.md` → `docs/tasks/T-M2.20-m2-polish.md` → DEC-131, DEC-144,
DEC-145 → `docs/09-harness/coding-agent-rules.md` → `.claude/agents/frontend-implementer.md` → `quality-gates.md` G1–G4 → `qa-protocol.md` §2a.
