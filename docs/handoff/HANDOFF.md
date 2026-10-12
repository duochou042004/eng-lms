# Handoff — 2026-10-12T03:20Z (T-M2.11 packet in review, PR #85; split T-M2.12, DEC-112)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.11 (packet in DOCS-REVIEW, PR #85, branch `docs/T-M2.11-app-shells`)** · Branch: `develop` · Last merges on develop: `9fcc992` (PR #82, T-M2.4), `6423649` (PR #83, QA report); this record is PR #84 (check `git log` that it landed) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.4 done** (`9fcc992`, DEC-109..111): auth UI (login, forgot info, forced/voluntary password change, logout, role redirect, guards,
  `/forbidden`, `?next=` allow-list T18, XSRF header with re-priming, E2E sign-in harness with `e2e-tutor` under `.data/e2e/`). QA PASS WITH MINOR,
  UX APPROVED, SEC APPROVED (the client-side auth part of the M2 exit security review). Deferred: SEC S4-2 cross-tab session → T-M2.12 (DEC-112; was T-M2.11); SEC S4-3 CI
  failure traces (risk-register R-22); `qa/` specs that use the anonymous `/` or the shells → T-M2.7 (DEC-111).
- **T-M1.19 done** (`8be6d9f`, DEC-108): Docker or Podman on Linux, macOS, WSL2. This device: **Kali Linux rolling, rootless Podman 5.8.6, clone
  `/home/kali/App_projects/eng-lms`**; known limits N-1..N-3 in development-setup §3.
- T-M1.20 (`ed442e0`, DEC-107): GitLab CI paused; the mirror still syncs. T-M2.10 (strict JSON numbers) is in the backlog.

## Another device
- Follow development-setup §0 for its platform (Linux, macOS, Windows = WSL2 + Docker Desktop with the clone inside WSL); record OS, engine and versions in
  `progress.json` `environment` and the clone path in `project.repoLocal` (DEC-083). Only Linux + Podman is proven end to end so far.
- Not in git: `.env` (`cp .env.example .env`, dev-only, DEC-094), `.data/**`, the dev database volume, `.claude/settings.local.json`, Playwright browsers
  (`cd e2e && pnpm browsers`; `qa/` needs chromium, firefox and webkit; on this device firefox/webkit lack host libraries: PO `sudo` `playwright install-deps`).
- Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers. Clone setup: `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. **T-M2.11 packet** `docs/tasks/T-M2.11-app-shells.md` (PR #85): DOCS-REVIEW round 1 CHANGES REQUESTED (D-1 S2 language budget, D-2..D-11)
   fixed; re-review, CI, verdicts, merge-gate, gitlab-sync. Split (DEC-112): T-M2.11 shells (SEC not triggered) and **T-M2.12** navigation
   feedback (150 ms lazy navigation, offline chunk) + cross-tab session (SEC S4-2; SEC triggered). Ask the PO once for the T-M2.11 start
   signal (DEC); with it implement through G3 (QA + UX).
2. Then T-M2.12, T-M2.5 (students UI), T-M2.6, T-M2.7 (M2 regression incl. the `qa/` spec updates). Optional: T-M2.10.

## Pending PO decisions / actions
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so `qa/` can run all three browsers (G3 of UI tasks).
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 / T-M2.3 SEC S4-9: the bundled common-password list barely filters at the 10-character minimum (`password123` passes); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- Running `gate.sh` or `e2e-run.sh` rewrites tracked `evidence/<task>/` screenshots and records (T-M2.4 QA F1): reviewers restore them with
  `git checkout -- evidence/<task>`. E2E signs in as `e2e-tutor` (`.data/e2e/`); never `dev-down.sh --purge` the PO's dev database without asking.
- **One checkout, no worktrees** (DEC-094): subagents one at a time on the task branch; only the LC switches branches, never while a subagent runs.
- Paths in older docs/evidence name `/home/kali/App_sources/eng-lms` (the first machines); this device clones to `/home/kali/App_projects/eng-lms`.
- **Keep LC copies of reviewer reports outside the scratchpad** (e.g. the session folder `lc-records/`): reviewers clean the shared scratchpad with globs (DEC-101).
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
`CLAUDE.md` → `progress.json` → this file → backlog M2 (T-M2.11) → DEC-109, DEC-111 → `docs/05-frontend/information-architecture.md` §1, §3, §5,
`responsive-standards.md`, `frontend-architecture.md` → `docs/tasks/T-M2.4-auth-ui.md` and `evidence/T-M2.4/review/ux.md`, `security.md` →
`web/src/app/` (router, guards, shells) → `.claude/skills/task-packet`, `frontend-standards`, `ux-review`.
