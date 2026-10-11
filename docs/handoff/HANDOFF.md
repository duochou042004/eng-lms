# Handoff — 2026-10-11T09:42Z (T-M1.19 done on the new device; T-M2.4 packet at G0)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.4 (ready; PO start signal pending)** · Branch: `develop` · Last merges on develop: `8be6d9f` (PR #78, T-M1.19), `a4d9af2` (PR #79, QA report); `a2c59a0` (PR #80, T-M1.19 merge record); this packet is PR #81 · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M1.19 done** (`8be6d9f`, DEC-108): Docker or Podman on Linux, macOS, Windows via WSL2 (`scripts/lib/engine.sh`, `env.sh`, dev scripts, bash ≥ 4.4
  guard, development-setup §0 per platform). Proven on this device: **Kali Linux rolling, rootless Podman 5.8.6, clone `/home/kali/App_projects/eng-lms`**
  (`progress.json` `environment`, `project.repoLocal`); gate PASS; QA round 2 PASS; known limits N-1..N-3 in development-setup §3.
- **T-M1.20 done** (`ed442e0`, DEC-107): GitLab CI paused; GitHub Actions is the only CI; the mirror still syncs.
- **T-M2.9 done** (`37e8ce0`, DEC-105). T-M2.10 (strict JSON numbers) is in the backlog.

## Another device
- Follow development-setup §0 for its platform (Linux, macOS, Windows = WSL2 + Docker Desktop with the clone inside WSL); record OS, engine and versions in
  `progress.json` `environment` and the clone path in `project.repoLocal` (DEC-083). Only Linux + Podman is proven end to end so far.
- Not in git: `.env` (`cp .env.example .env`, dev-only, DEC-094), `.data/**`, the dev database volume, `.claude/settings.local.json`, Playwright browsers
  (`cd e2e && pnpm browsers`; `qa/` needs chromium, firefox and webkit; on this device firefox/webkit lack host libraries: PO `sudo` `playwright install-deps`).
- Accounts (PO): `gh auth login`, `glab auth login`, git identity, credential helpers. Clone setup: `./scripts/install-hooks.sh`, `git remote add gitlab …`.

## Next steps
1. **T-M2.4** (packet `docs/tasks/T-M2.4-auth-ui.md`, G0 via PR #81; DEC-109 split the old row into T-M2.4 auth UI and **T-M2.11** app shells):
   needs the **PO start signal** (record it as a DEC). Then `progress.json` in_progress, branch `feature/T-M2.4-auth-ui`, frontend-implementer
   (frontend-standards), gate green, G3: fresh qa-evaluator, ux-reviewer and security-reviewer (SEC triggered, DEC-109), CI, verdicts, merge-gate,
   gitlab-sync; QA report via `qa/T-M2.4`; merge record via a chore PR.
2. Then the T-M2.11 packet, then T-M2.5 (students UI). Optional: T-M2.10.

## Pending PO decisions / actions
- This device: `(cd qa && pnpm exec playwright install-deps firefox webkit)` (needs `sudo`) so `qa/` can run all three browsers (G3 of UI tasks).
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 / T-M2.3 SEC S4-9: the bundled common-password list barely filters at the 10-character minimum (`password123` passes); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
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
`CLAUDE.md` → `progress.json` → this file → backlog M2 (T-M2.4) → FR-AUTH-03..08 → `docs/05-frontend/information-architecture.md` §4,
`frontend-architecture.md` §2–3 → `docs/04-backend/api-catalog.md` (auth) and `security.md` T18 → `.claude/skills/task-packet`, `frontend-standards`, `ux-review`,
`security-review`.
