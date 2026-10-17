# Handoff — 2026-10-17 (T-M2.5 done; next: the T-M2.14 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.14 (draft: packet next)** · Branch: `develop` · Last merges on develop: `84c97c1` (PR #94, T-M2.5), `624a346` (PR #105, QA report); this record is the `chore/T-M2.5-merge-record` PR (check `git log` that it landed) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.5 done** (`84c97c1`, DEC-120..123): split from the big students-UI row (DEC-120) into T-M2.5 and **T-M2.14**. Delivered: Students
  nav item; list (`DataList` with fixed column shares 29/16.5/31/23.5 %, search, include archived, Name/Newest, 1-based paging, URL state, all
  data states); Add student flow F2 (6 named steps; suggestion + availability; generated password unless typed; collapsed Contact/Note;
  unsaved changes guard that lets sign-out, `/forbidden` and a forced `/change-password` through); the one-time credentials card (component
  state only, dropped on `pagehide`); read-only workspace page (header + Profile view, no tab bar until a second tab; Overview arrives in M3,
  DEC-120 (8)); contact links only `tel:`, `mailto:`, `https:` without userinfo; student statuses in `ui/status/statusMap.ts`; new `ui/`
  components `DataList`, `StatusBadge`, `Disclosure`, `TextArea`, `CopyButton`, `ConfirmDialog`, `DescriptionList`, `SearchField`.
  G3 took QA 6 rounds (one FAIL: table wider than the viewport at 768/1024), UX 4, SEC 2; all fixes via AC12 (a)–(u) (DEC-122).
  Deferred: SEC S4-5 (guard should check that `state.forced` targets `/change-password`) → T-M2.14.
- **T-M2.12 done** (`b5596d3`, DEC-119); T-M2.13 (small FE follow-ups: UX-3, UX-4, UX-6, O-1, O-2) still in the backlog.
- This device: **Kali Linux rolling, rootless Podman 5.8.6, clone `/home/kali/App_projects/eng-lms`** (T-M1.19, DEC-108). GitLab CI paused
  (DEC-107); the mirror still syncs.

## Another device
- Follow development-setup §0 for its platform (Linux, macOS, Windows = WSL2 + Docker Desktop with the clone inside WSL); record OS, engine and versions in
  `progress.json` `environment` and the clone path in `project.repoLocal` (DEC-083). Only Linux + Podman is proven end to end so far.
- Not in git: `.env` (`cp .env.example .env`, dev-only, DEC-094), `.data/**`, the dev database volume, `.claude/settings.local.json`, Playwright browsers
  (`cd e2e && pnpm browsers`; `qa/` needs chromium, firefox and webkit; on this device firefox/webkit lack host libraries: PO `sudo` `playwright install-deps`).
- Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers. Clone setup: `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. **T-M2.14 packet** (student profile editing: edit profile and contacts with optimistic locking/Reload, username change, guardians incl.
   the add-form section, learning profile with `TagInput`, status changes with archive toast + Undo, reset password with the credentials card,
   `Toast`; plus T-M2.5 SEC S4-5). Size check, likely split (DEC). SEC triggered. Fresh docs-reviewer, CI, verdicts, merge-gate, gitlab-sync;
   ask the PO once for the start signal (DEC); implement through G3.
2. T-M2.13 when the PO orders it; then T-M2.6, T-M2.7 (M2 regression incl. the `qa/` spec updates). Optional: T-M2.10.

## Pending PO decisions / actions
- **Dependabot PRs #95–#104** (react-aria-components 1.22.1, zod, i18next, react-i18next, Playwright 1.64, @types/node, actions, tooling):
  opened during T-M2.5; untouched. Say whether to review and merge them (each needs CI; the merge-gate expects a task ID).
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so `qa/` can run all three browsers (G3 of UI tasks).
- Dev database: reviewer and E2E runs added a few hundred test students (no purge). Say if you want it cleaned (`dev-down.sh --purge` wipes everything).
- Open T-M2.5 points: the `ui/index.ts` barrel ships tutor-only components in the student first visit (+5.9 KB gz, under the 200 KB budget);
  dates use the browser's time zone, not the account's (`shortcut:` in `lib/time`; settle with T-M2.6 settings).
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 / T-M2.3 SEC S4-9: the bundled common-password list barely filters at the 10-character minimum (`password123` passes); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
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
`CLAUDE.md` → `progress.json` → this file → backlog M2 (T-M2.14 row) → DEC-120..123 → FR-STU-01 (guardians), 03, 04, 05, FR-AUTH-07 →
interaction-states §2 → `docs/tasks/T-M2.5-students-list-add.md` → `web/src/features/students/`, `web/src/ui/` → api-catalog "tutor: students"
→ `.claude/skills/task-packet`, `frontend-standards`, `ux-review`, `security-review`.
