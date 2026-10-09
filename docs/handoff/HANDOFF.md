# Handoff — 2026-10-09T15:00Z (T-M2.9 done; next: T-M1.19 portability on a NEW DEVICE, then T-M2.4)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M1.19 (ready; PO start DEC-106)** · Branch: `develop` · Last merges on develop: `37e8ce0` (PR #72, T-M2.9), `680149b` (PR #73), `6cdbcf8` (PR #74), then the T-M1.19 packet PR · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.9 done** (`37e8ce0`; DEC-102..105; QA PASS, SEC APPROVED; records merged). T-M2.10 (strict JSON numbers, QA F3) is in the backlog.
- **PO requirement (DEC-106):** the project must run on Linux, macOS and Windows with Docker or Podman. Windows = **WSL2 + Docker Desktop** (no
  native Windows). Production stays Podman Quadlet + Caddy (ADR-0012). The next session runs on a **new device** (macOS or Windows, maybe Docker).
- **T-M1.19** (packet `docs/tasks/T-M1.19-portable-dev-env.md`, ready, start signal given): `lib/engine.sh` detection (Docker / Linux Podman socket /
  macOS Podman machine; Podman-backed `docker` shims), `env.sh` Testcontainers variables, `dev-up.sh`/`dev-down.sh` through the engine, bash ≥ 4.4 guard, per-platform setup docs, agent docs without Linux/Podman/
  `/home/kali` assumptions; proven by a green gate **on the new device**. Already portable: `deploy/compose.dev.yaml`, `.gitattributes` (LF). ADR-0012's development bullet is amended (DEC-106).

## New device: what does not travel with `git clone`
- `.env` (git-ignored; `cp .env.example .env`, dev-only values, DEC-094; set `ENGLMS_DEV_DB_PORT` if a local PostgreSQL holds 5432); `.data/**`; the
  dev database volume (fresh is fine); `.claude/settings.local.json` (local permission grants); Playwright browser caches (`cd e2e && pnpm browsers`;
  `qa/` needs chromium, firefox and webkit); a stray `~/.testcontainers.properties` on the old machine is not needed; SSH/GPG keys if used.
- Accounts: `gh auth login` (repo, workflow), `glab auth login`, git identity, credential helpers (PO; agents never enter credentials).
- Clone setup: `./scripts/install-hooks.sh`, `git remote add gitlab https://gitlab.com/duochou042004/eng-lms.git`.
- Claude's local memory (this machine's `~/.claude/projects/…`): its two notes are already in the repo (one checkout/no worktrees DEC-094; dev `.env`
  access DEC-094, restore via T-M8.7). The LC records folder (`lc-records/`) is per session; nothing pending in it.
- Windows: install WSL2 Ubuntu, Docker Desktop with WSL integration, and clone **inside WSL** (`~/…`, not `/mnt/c`); run Claude Code in WSL.
  macOS: Homebrew `bash` (≥ 4.4, first on `PATH`: `env bash -c 'echo $BASH_VERSION'`), `jq`, `gh`, `glab`, Python with `jsonschema` (Homebrew Python is
  externally managed: use a venv or `pipx`; `check-docs.sh` needs it in gate step 1), SDKMAN (Java 25.0.4-tem), nvm (Node 24.21.0), Docker
  Desktop/OrbStack/Colima. Linux with Docker Engine: the `docker` group is root-equivalent (PO decision).
- Until T-M1.19 lands, `source scripts/env.sh` fails on Docker (it requires the systemd Podman socket): expected; T-M1.19 fixes it.

## Next steps
1. On the new device: development-setup §0 steps 1–3 and 6 (toolchain, accounts, clone setup, installs); in step 1 skip the Podman items when
   `docker info` works; the engine steps follow T-M1.19. Native Windows (not WSL): stop and ask the PO to start Claude Code inside WSL2 (DEC-106).
2. **T-M1.19:** packet ready → `progress.json` in_progress, branch `feature/T-M1.19-portable-dev-env`, backend-implementer, gate green on the device,
   G3 fresh qa-evaluator (follows §0 for that platform), CI green, verdicts, merge-gate, gitlab-sync; QA report via `qa/T-M1.19`; merge DEC + records via a chore PR.
3. **T-M2.4** packet (auth UI + shells, FE; decide SEC in the packet: `?next=` allow-list T18, remember-me on shared devices; M2 exit needs an auth SEC review).
4. Optional: T-M2.10. Dependabot PRs #64–#70 open.

## Pending PO decisions / actions
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 / T-M2.3 SEC S4-9: the bundled common-password list barely filters at the 10-character minimum (`password123` passes); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- **One checkout, no worktrees** (DEC-094): subagents one at a time on the task branch; only the LC switches branches, never while a subagent runs.
- Paths in older docs/evidence name `/home/kali/App_sources/eng-lms` (the first machines); on the new device use its own clone path (T-M1.19 removes the assumption).
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
- `gitlab-sync.sh` may fail authentication transiently: retry once.
- Wall-clock bounds in tests flake on the 2-core CI runner (DEC-093). `git merge` is denied: `gh pr update-branch` (DEC-090).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.19-portable-dev-env.md` → DEC-106 → `docs/07-operations/development-setup.md` §0 →
`docs/09-harness/coding-agent-rules.md` §3 → `scripts/env.sh`, `dev-up.sh`, `dev-down.sh`, `scripts/tests/dev-scripts.test.sh` → later backlog M2 (T-M2.4) and
`.claude/skills/task-packet`, `frontend-standards`, `ux-review`.
