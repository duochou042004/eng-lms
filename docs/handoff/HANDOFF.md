# Handoff — 2026-10-15T02:00Z (T-M2.12 done; next: the T-M2.5 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.5 (draft: packet next)** · Branch: `develop` · Last merges on develop: `b5596d3` (PR #90, T-M2.12), `0642b70` (PR #91, QA report); this record is the `chore/T-M2.12-merge-record` PR (check `git log` that it landed) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.12 done** (`b5596d3`, DEC-116..119): 150 ms navigation `ProgressLine` + polite status; offline / couldn't-load chunk pages (own `h1`,
  primary Retry that reloads only when online, never builds a URL; copy follows the connection); 403 `FORBIDDEN_ROLE` → one deduped session
  read and, on a user/role change, `resetQueries` + revalidate; data-free `BroadcastChannel` `englms-auth` for sign-in/out with a `pageshow`
  (bfcache) resync; `/login` does not revalidate while its URL is unchanged (a tab left there never ends another tab's new session); UX-9;
  security.md T19. QA PASS (round 2), UX APPROVED, SEC APPROVED (both rounds); G3 fixes via AC11 (DEC-118). This closes T-M2.4 SEC S4-2.
  Deferred to **T-M2.13** (FE, backlog): UX-3 meta error reachable on touch, UX-4 notice on `/login` after a cross-tab sign-out, UX-6 copy echo,
  O-1/O-2 logout feedback (offline spinner, silent 500).
- **T-M2.11 done** (`1af32de`, DEC-112..115): app shells (nested routes, 404s inside, tutor sidebar/drawer, student tabs/top bar, account
  section, workspace name, `Sheet`/`Popover`/`NavList`/`BottomTabs` in `ui/`).
- **T-M2.4 done** (`9fcc992`, DEC-109..111): auth UI. SEC S4-3 (CI failure traces with E2E credentials) is risk-register R-22; the `qa/` spec
  updates are T-M2.7 (DEC-111).
- This device: **Kali Linux rolling, rootless Podman 5.8.6, clone `/home/kali/App_projects/eng-lms`** (T-M1.19, DEC-108). GitLab CI paused
  (DEC-107); the mirror still syncs.

## Another device
- Follow development-setup §0 for its platform (Linux, macOS, Windows = WSL2 + Docker Desktop with the clone inside WSL); record OS, engine and versions in
  `progress.json` `environment` and the clone path in `project.repoLocal` (DEC-083). Only Linux + Podman is proven end to end so far.
- Not in git: `.env` (`cp .env.example .env`, dev-only, DEC-094), `.data/**`, the dev database volume, `.claude/settings.local.json`, Playwright browsers
  (`cd e2e && pnpm browsers`; `qa/` needs chromium, firefox and webkit; on this device firefox/webkit lack host libraries: PO `sudo` `playwright install-deps`).
- Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers. Clone setup: `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. **T-M2.5 packet** (students UI; task-packet skill, branch `docs/T-M2.5-<slug>`): the backlog row is large (list, Add student flow F2 +
   credentials card, workspace shell, profile, guardians, learning profile, status, reset password): **size check, expect a split** (DEC).
   SEC triggered (student data, tutor-private learning profile, contact links via a scheme allow-list, DEC-100). Fresh docs-reviewer, CI,
   verdicts, merge-gate, gitlab-sync; ask the PO once for the start signal (DEC); implement through G3 (QA, UX, SEC).
2. T-M2.13 (small FE follow-ups) when the PO orders it; then T-M2.6, T-M2.7 (M2 regression incl. the `qa/` spec updates). Optional: T-M2.10.

## Pending PO decisions / actions
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so `qa/` can run all three browsers (G3 of UI tasks).
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 / T-M2.3 SEC S4-9: the bundled common-password list barely filters at the 10-character minimum (`password123` passes); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
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
- merge-gate tokens: `QA-VERDICT <task>: PASS`, `SEC-REVIEW <task>: APPROVED`, `DOCS-REVIEW <task>: PASS`, `LC-APPROVED <task>`; post after CI is green for the final head.
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
`CLAUDE.md` → `progress.json` → this file → backlog M2 (T-M2.5 row) → DEC-097, DEC-100, DEC-119 → FR-STU-01..07, FR-AUTH-07, `docs/05-frontend/ux-flows.md`
F2, `information-architecture.md` §2 → `docs/tasks/T-M2.12-nav-feedback-cross-tab.md`, `T-M2.11-app-shells.md` → `web/src/app/` (router, guards,
shells), `web/src/features/` → api-catalog "tutor: students" → `.claude/skills/task-packet`, `frontend-standards`, `ux-review`, `security-review`.
