# Handoff — 2026-10-20 (T-M2.19 merged; retrospective done, DEC-139; next: the T-M2.17 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.17 learning profile (FE, draft, tier H): packet to write** · Next: **T-M2.20
M2 polish** · Last merges on develop: `d165a4e` (T-M2.19, PR #117), the T-M2.19 packet (PR #116), `9b9e133` (T-M2.15), `5dab35e` (T-M2.18) ·
Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **The quality process is DEC-131** (T-M2.18): risk tier per packet; tier H = SEC + one combined QA+UX reviewer; tier M = one combined
  QA+UX reviewer; tier L = docs review; S1/S2 → AC + **delta** re-check; S3 cheap in-task, LC-verified from test + diff (a delta re-check
  when the fix changes behaviour); S4 → **T-M2.20** unless one line; one local gate per head + CI; reviewers return text only and the LC
  records and posts; PNGs git-ignored; a **G3 cost** table in every summary.
- **T-M2.19 merged** (PR #117, `d165a4e`, DEC-138): `e2e/support/checks.ts` has `expectNoMidWordBreak`, `expectFocusNotLost` (also fails on
  a disabled/unrendered or inert active element), `expectSettledAccessible`; `e2e/support/longData.ts`; proofs in `e2e/tests/checks.spec.ts`;
  stylelint rejects raw `ms`/`s` outside `src/ui/tokens.css` (`--motion-duration-spin`, `--motion-duration-pulse`). **Later UI packets reuse
  these helpers** (call `expectFocusNotLost` after each removing/disabling control; `expectSettledAccessible` instead of a bare axe call).
  The new focus check found 4 real defects before review (AC8, DEC-135); G3: one reviewer, round 1 + one delta re-check (DEC-136, DEC-137).
- Records: `evidence/T-M2.19/summary.md`, `review/ux.md`, `review/docs.md`; the QA report on `qa/T-M2.19` (PR #118, needs only
  `LC-APPROVED T-M2.19` via merge-gate if not merged yet).
- Open in the backlog: T-M2.13, T-M2.16, T-M2.17, T-M2.20 (now also T-M2.19 QA-5, QA-8). This device: Kali Linux rolling, rootless Podman
  5.8.6, clone `/home/kali/App_projects/eng-lms`. GitLab CI paused (DEC-107); the mirror syncs.

## Another device
- Follow development-setup §0 for its platform; record OS, engine and versions in `progress.json` `environment` and the clone path in
  `project.repoLocal` (DEC-083). Not in git: `.env` (`cp .env.example .env`), `.data/**`, the dev DB volume, `.claude/settings.local.json`,
  Playwright browsers (`cd e2e && pnpm browsers`). Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers;
  `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. If the `docs/M2-retrospective` PR is still open: merge it via merge-gate (`--dry-run` first), then gitlab-sync.
2. Read **`docs/09-harness/lessons-learned.md`** (L-01..L-13), then the **T-M2.17 packet** (invoke the task-packet skill: contradiction scan, Domain rules block, shortcut ledger; split from T-M2.15, DEC-128): tier H (student personal data: SEC + combined QA+UX); a UI rules block
   (DEC-131 (2)); the T-M2.19 helpers in its test plan; G0 docs review (tier L, delta rounds); then the PO start signal.
3. Then T-M2.20 polish, T-M2.21 (records checks), T-M2.13, T-M2.16; then T-M2.6, T-M2.7 (M2 regression, G5).

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
- Wall-clock bounds in tests flake on the 2-core CI runner (DEC-093). `git merge` is denied: `gh pr update-branch` (DEC-090).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/lessons-learned.md` → DEC-128, DEC-131, DEC-138, DEC-139 → `docs/tasks/backlog.md` (T-M2.17, T-M2.20) → the task-packet
skill → `docs/tasks/T-M2.15-guardians.md` and `T-M2.19-ui-checks.md` (packet shape, UI rules block) → `quality-gates.md` G0 → `e2e/support/checks.ts`.
