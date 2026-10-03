# Handoff — 2026-10-03 (moving to a new device; T-M1.16 next)

Phase/Milestone: P1 / M1 · Current task: **T-M1.16 (ready; PO start signal pending)** · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **M1 exit criteria are met** by merged work. T-M1.1..T-M1.9 and T-M1.11..T-M1.15 are merged; **T-M1.16** (review polish, Maven 3.10.0, the flaky route-focus E2E test;
  packet `docs/tasks/T-M1.16-review-polish.md`, G0 via PR #40) is the last M1 task. **T-M1.10 does not block M1** (PO, DEC-083). Then M2 starts with T-M2.1.
- Dependabot: #29/#30/#32/#33/#34 merged, #31 (Maven) closed into T-M1.16 (DEC-082). No PRs are open. The GitLab mirror is kept (DEC-080).
- **The PO moves development to a new device (DEC-083).** The PO clones the repo; the next session sets up the rest with development-setup.md **§0** and verifies
  it with the full gate before any task work. `progress.json` `environment` describes the old device; update it there.

## Next steps
1. New device: development-setup §0 steps 1–8 (toolchain check, PO-side auth, hooks, gitlab remote, `.env`, `podman.socket`, dev DB, installs + Playwright browser,
   `englms:dev` image, `./scripts/gate.sh` green, `gitlab-sync.sh`). Record versions in `progress.json` and the result here; commit on a `docs/T-M1.16-…` branch.
2. Ask the PO for the T-M1.16 start signal (DEC). Frontend-implementer for items 1–5 and 9 (own git worktree); the LC does items 6–8. G3 = QA + UX.
3. After the merge: the M1 close-out (merge record, milestone status) and the T-M2.1 packet (SEC review applies).

## Pending PO decisions / actions
- On the new device: `gh`/`glab` login and git identity (agents never enter credentials); any missing system package (`sudo`).
- T-M1.16 start. Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- Branch names must be `<kind>/<task-id>-<slug>`; verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`.
- `git merge` is denied: `gh pr update-branch <n>`; update before editing `progress.json` if it would conflict. Dependabot PRs: `@dependabot rebase`.
- Subagents share the working tree: give each a worktree or forbid checkouts; `gh pr close -d` switches the current checkout.
- `.env*` files are unreadable by rule (secrets); `cp .env.example .env` works without reading it.
- Run `./scripts/check-docs.sh` bare; timestamps from `date -u`; `./scripts/gitlab-sync.sh` after merges; stage explicit paths.
- Short sessions: hand off at ~300–400k tokens with a goal-mode prompt (≤ 4000 chars) in `docs/handoff/next-session-prompt.md`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/07-operations/development-setup.md` §0 → `docs/tasks/T-M1.16-review-polish.md`.
