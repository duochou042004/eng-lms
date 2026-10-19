# Handoff — 2026-10-19 (T-M2.15 at G1, G3 held; next: T-M2.18 quality-process upgrade, DEC-130)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.15 guardians (blocked: G1 pass, G3 held, DEC-130)** · Next: **T-M2.18
quality-process upgrade (LC, draft)** · Branch: `feature/T-M2.15-guardians` (PR #112, open; this handoff lives there) · Last merges on
develop: `eeee2bd` (PR #111, the T-M2.15 packet) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.15 guardians** (DEC-128 split: the learning profile → **T-M2.17**): packet merged at G0 (PR #111, `eeee2bd`; docs review 2 rounds,
  `evidence/T-M2.15/review/docs.md`); PO start signal DEC-129. Implemented on `feature/T-M2.15-guardians` (PR #112, CI 7/7): Guardians section
  (list, add, edit with changed fields and the conflict dialog, confirmed remove, ≤ 10, removed-elsewhere), the Add student Guardians rows, the
  DEC-127 SEC residual (a write stores its answer only while a tutor session is cached, `api/tutorSession.ts`). Gate PASS ×2 on `7128127`
  (web 701, E2E 380 passed); all 10 ACs pass per `evidence/T-M2.15/summary.md` (deviations and open questions listed there). **G3 has not run.**
- **PO observations (DEC-130):** G3 (three sequential reviewers + fix rounds + two full gates per round) costs more time and quota than the
  coding (T-M2.5: three quota resets for G3; T-M2.14: 3 QA + 3 UX + 2 SEC rounds, 8 gate runs ≈ 90 min of gates); re-checks repeat passed
  features and trivial checks; the cost grows with every feature; evidence PNGs are tracked in git (1,949 files, 74.8 MB; GitHub repository ≈ 99 MB).
  The PO paused T-M2.15 at G1: **T-M2.18 comes first**, then T-M2.15's G3 under the approved process.
- T-M2.13, T-M2.16, T-M2.17 open in the backlog. This device: Kali Linux rolling, rootless Podman 5.8.6, clone
  `/home/kali/App_projects/eng-lms` (T-M1.19, DEC-108). GitLab CI paused (DEC-107); the mirror still syncs.

## T-M2.18 brief: the PO's observations (2026-10-19, DEC-130)
- The PO is not against G3: it protects quality. But G3 (QA, UX, SEC in sequence, then fix rounds, each round re-running two full
  gates and full re-reviews) takes more time and usage quota than the coding and fixing. T-M2.5 needed three quota resets for G3 alone;
  T-M2.14 had 3 QA + 3 UX + 2 SEC rounds and 8 gate runs (≈ 90 min of gates).
- Re-checks re-test features that already passed, and whole rounds run for very minor findings. Long runs are fine only for something
  significant that affects the whole workflow. At this pace the first release could take a year, and the cost grows with every feature.
- The PO wants a smarter, leaner QA approach (process **and** test scripts) that keeps or raises the **implementation quality**: the aim
  is not fewer checks for their own sake, but catching problems earlier and cheaper, and spending review effort where the risk is.
- Evidence PNGs are committed: 1,949 tracked files, 74.8 MB; GitHub reports the repository at ≈ 99 MB (`size` 101,274 KB). The PO does
  not think they belong in the repo ("up to you").
- Order the PO asked for: stop at G1 for T-M2.15, review and upgrade the testing strategy and its docs first (T-M2.18), then continue.
- Not available as data: per-round token use of past reviews (never recorded); the quota side is the PO's observation. Start recording
  agent tokens and minutes per round (the Agent result reports them) so the new process can be compared.

## Another device
- Follow development-setup §0 for its platform; record OS, engine and versions in `progress.json` `environment` and the clone path in
  `project.repoLocal` (DEC-083). Not in git: `.env` (`cp .env.example .env`), `.data/**`, the dev DB volume, `.claude/settings.local.json`,
  Playwright browsers (`cd e2e && pnpm browsers`). Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers;
  `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. **T-M2.18 quality-process upgrade** (LC, DEC-130; backlog row; read the brief above): (a) measure T-M2.5, T-M2.12, T-M2.14 (rounds
   per reviewer, findings by severity and type, which an automated check or a packet rule could have caught, what each re-check re-tested,
   gate runs and step minutes from the gate logs, evidence MB); (b) draft one proposal (≤ 1 page, with trade-offs) on two levers:
   **prevent** (turn recurring finding types into automated checks, fixed packet rules and implementer self-checks) and **proportion**
   (review depth by risk tier, a combined review pass, delta-only re-checks, S3/S4 batched to the backlog, one local gate + CI, targeted
   E2E per task with full regression at milestones, screenshots out of git); (c) **show it to the PO and get the decision before writing
   docs** (DEC); (d) then the packet and the doc/skill/agent/script changes, docs review, merge.
2. **T-M2.15 G3** under the approved process on PR #112, then merge-gate, the QA report and the merge record. Then T-M2.17.
3. T-M2.13 and T-M2.16 when the PO orders them; then T-M2.6, T-M2.7 (M2 regression incl. the `qa/` spec updates). Optional: T-M2.10.

## Pending PO decisions / actions
- **Dependabot PRs #95–#104**: untouched; say whether to review and merge them.
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so G3 can cover all three browsers.
- Dev database: reviewer and E2E runs added several hundred test students (about 60 more in T-M2.14; no purge). Say if you want it cleaned.
- Open points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (under budget: student 186.6 KB gz);
  dates use the browser's time zone (`shortcut:` in `lib/time`; T-M2.6); production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (M8);
  the common-password list barely filters at 10 characters (T-M2.3 SEC S4-9); `glab` deny rules (DEC-061); OQ-03..OQ-14 (defaults documented).

## Gotchas
- **Branch-state collision (PR #112 vs T-M2.18):** PR #112 changes `progress.json`, `decision-log.md` (DEC-129, DEC-130), `backlog.md`,
  `HANDOFF.md`, `next-session-prompt.md` and the T-M2.15 packet; a T-M2.18 PR from `develop` will change some of the same files, so after it
  merges `gh pr update-branch 112` conflicts and `git merge` is denied (DEC-090). Procedure on the feature branch: save
  `git diff $(git merge-base origin/develop HEAD) HEAD -- <shared files>`; `git checkout origin/develop -- <shared files>`; commit and push
  (both sides now agree, so the update is clean); `gh pr update-branch 112`; pull; re-apply only PR #112's own edits from the saved diff
  (T-M2.15 status lines, its backlog note) as a new commit. Never force-push. Keep T-M2.18 off T-M2.15's files.
- **Toasts (T-M2.14):** `ui/Toast` is the only toast; errors are never toasts (interaction-states §4). Under a modal the region is hidden and inert (`ui/modalStack.ts`); the queue closes timed toasts pushed out of the visible 3 and is cleared on region mount/unmount.
- **Two API-limit pauses this session** stopped the implementer and QA mid-run; both resumed with SendMessage after checking `git status`/`git log` and `evidence/<task>/gate-*.log` (the implementer had finished both gates but not committed).
- CI `backend` can fail on a Maven Central **403** as well as a 429: `gh run rerun <id> --failed`.
- **Layout ACs need fixed rules.** T-M2.5's table went through four content-driven sizing attempts (min width, `nowrap`, `break-word`) before `table-layout: fixed` with column shares; write column shares and break rules into the packet up front.
- An API usage limit can stop the implementer after its gates finished but before the evidence commit: check `git log`, the newest `evidence/<task>/gate-*.log` heads and `git status` before resuming it; the LC may commit the evidence itself.
- An API usage limit can stop a subagent mid-run: check `podman ps` and `pgrep -af 'java -jar'` (its JAR may still run), then resume it with
  SendMessage; it keeps its context. A `gh` GraphQL error mid-chain: check which comments landed before re-posting.
- Fix rounds: resume the original implementer (it keeps the code context); the LC first adds the findings to the packet as an AC (DEC-088) and a DEC.
- Running `gate.sh` or `e2e-run.sh` rewrites tracked `evidence/<task>/` screenshots and records (T-M2.4 QA F1): reviewers restore them with
  `git checkout -- evidence/<task>`. E2E signs in as `e2e-tutor` (`.data/e2e/`); never `dev-down.sh --purge` the PO's dev database without asking.
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
`CLAUDE.md` → `progress.json` → this file → backlog M2 (T-M2.15, T-M2.16, T-M2.13 rows) → DEC-124..127 → FR-STU-01 (guardians), 03, 04 →
interaction-states §2, §4 → information-architecture §2 → api-catalog "tutor: students" (guardians, learning-profile rows) →
`docs/tasks/T-M2.14-student-profile-account.md` → `web/src/features/students/`, `web/src/ui/` → `.claude/skills/task-packet`,
`frontend-standards`, `ux-review`, `security-review`.
