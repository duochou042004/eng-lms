# Handoff — 2026-10-03 (new device ready; T-M1.16 started)

Phase/Milestone: P1 / M1 · Current task: **T-M1.16 (PO start signal given, DEC-084)** · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **The new device is set up** by development-setup §0 (DEC-083, DEC-084): Ubuntu 26.04.1, clone at `/home/kali/App_sources/eng-lms`, Java 25.0.4 + Boot CLI 4.1.0
  (sdk defaults), Node 24.21.0, pnpm 12.6.0, Podman 5.7.0 rootless + podman-compose 1.5.0, `podman.socket` enabled, dev DB healthy, `englms:dev` built.
  `./scripts/gate.sh` **PASS** (12 steps, 194 s; backend 97, web 86, E2E 86 tests); `gitlab-sync.sh` OK. Versions in `progress.json` `environment`.
- M1 exit criteria are met; **T-M1.16** (`docs/tasks/T-M1.16-review-polish.md`) is the last M1 task. T-M1.10 does not block M1 (DEC-083).

## Next steps
1. T-M1.16 on `feature/T-M1.16-review-polish`: frontend-implementer for items 1–5 and 9 (own git worktree); the LC does items 6–8. G3 = QA + UX.
2. After the merge: the M1 close-out (merge record, UX record, milestone status) and the T-M2.1 packet (SEC review applies).

## Pending PO decisions / actions
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- `.env*` files are unreadable by rule: the PO creates `.env` (`cp .env.example .env`); `glab` is a snap (`/snap/bin/glab`).
- Branch names must be `<kind>/<task-id>-<slug>`; verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`.
- `git merge` is denied: `gh pr update-branch <n>`; update before editing `progress.json` if it would conflict. Dependabot PRs: `@dependabot rebase`.
- Subagents share the working tree: give each a worktree or forbid checkouts; `gh pr close -d` switches the current checkout.
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u`; `./scripts/gitlab-sync.sh` after merges; stage explicit paths.
- Short sessions: hand off at ~300–400k tokens with a goal-mode prompt (≤ 4000 chars) in `docs/handoff/next-session-prompt.md`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.16-review-polish.md`.
