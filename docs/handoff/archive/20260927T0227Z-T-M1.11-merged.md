# Handoff — 2026-09-27 (T-M1.6 and T-M1.11 merged `293e048`; T-M1.7 ready)

Phase/Milestone: P1 / M1 · Current task: **T-M1.7 (ready; awaiting the PO start signal)** · Branch: `chore/T-M1.7-merge-gate-hardening` (bookkeeping only; recreated from develop after PR #14) · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1..T-M1.5 and **T-M1.6 (`5f193e6`, PR #12)** are merged through merge-gate. The T-M1.6 QA record and the `/qa` skeleton are PR #13.
  Required CI checks: docs-check, secrets-scan, backend, web, contract-drift and **e2e-smoke**. `container` (a build-only image check) runs on every PR but isn't required.
- **What T-M1.6 delivered:**
  - `e2e/`: Playwright 1.63.0 + axe with 6 viewport projects; guards for axe, overflow (`clientWidth`) and a context-level console/CSP check; guard self-tests; a vi+en smoke.
  - `scripts/e2e-run.sh`: builds the packaged jar with the SPA and always stops the app. `gate.sh` has **12 steps** (the last is `e2e`).
  - `/qa`: QA's own pinned Playwright toolchain (DEC-057).
  - QA round 1 FAILED on F1: the overflow guard was blind under mobile emulation. Fixed by DEC-058. Round 2: PASS WITH MINOR (DEC-059).
- **T-M1.11 (DEC-060, PO decision):** a private **GitLab mirror** https://gitlab.com/duochou042004/eng-lms whose `.gitlab-ci.yml` re-runs backend, web and e2e-smoke and
  **stores the reports for 5 days** (JaCoCo, JUnit, Playwright). GitHub's artifact storage is still exhausted (monthly usage; expected reset 2026-10-01).
  GitHub stays the source of truth (PRs, required checks, merge-gate). After every merge, run `./scripts/gitlab-sync.sh` (pushes GitHub's develop/master and any named
  branches). The pre-push hook allows develop/master on the mirror only as exactly `origin/<branch>`. GitLab.com free tier: 400 CI minutes/month (≈4.5 min per pipeline).
- **PO requests done (DEC-056):**
  - Every `upload-artifact` step keeps **5 days**. The PO freed the account storage; the quota may still show until GitHub recalculates (6–12 h).
  - Dependabot #6 (TypeScript 7 breaks openapi-typescript) and #7 (`@types/node` 26 vs Node 24) are closed. `dependabot.yml` ignores those majors, and T-M1.10 is in the backlog.
- **Deferred:**
  - T-M1.8: F2, R2-1, R2-3 from T-M1.5.
  - T-M1.9: F3 from T-M1.6 (a late console error).
  - T-M2.1: F3 from T-M1.5 (dot-segment paths).

## Next steps
1. Ask the PO for the **T-M1.7** start signal (merge-gate hardening; the packet `docs/tasks/T-M1.7-merge-gate-hardening.md` is G0-complete). It's a chore packet, so G3 is a review by a docs-reviewer or QA agent.
2. Then T-M1.8 (backend follow-ups) and T-M1.9 (web a11y follow-ups, **before the M2 routes**). T-M1.10 (TS 7) waits for upstream.
3. The M1 exit needs everything in roadmap M1 (gate.sh, CI and the e2e smoke are live now).

## Pending PO decisions / actions
- The start signal for T-M1.7.
- After the GitHub storage reset (expected 2026-10-01): keep or remove the GitLab mirror (DEC-060). Check with `gh run view <id> --log | grep quota`.
- Recommended (DEC-061): add `Bash(glab mr merge:*)`, `Bash(glab repo delete:*)`, `Bash(glab release delete:*)` deny rules to `.claude/settings.json`, like the `gh` ones (the PO's permission file; the LC does not edit it).
- OQ-03..OQ-14 (defaults documented).

## Gotchas
- Mirror: `./scripts/gitlab-sync.sh [branch]` after merges and before reviews; pipelines: `glab ci list -R duochou042004/eng-lms`; artifacts: `glab api projects/86941168/jobs/<id>/artifacts > a.zip`.
- An unrelated untracked PDF of the user's sits in the repo root: never `git add -A`; stage explicit paths.
- `/qa/**` can only change on `qa/<task>` branches (path ownership); `.gitignore` can't. Keep a `qa/` worktree in the scratchpad for the QA branch.
- Chromium's `isMobile` widens `window.innerWidth`: measure the layout with `documentElement.clientWidth`.
- `e2e-run.sh` needs ports 8080/8081 free and `dev-up.sh` (restart it after a reboot). A host restart wipes the scratchpad; subagent transcripts survive.
- If a subagent hits a rate limit, resume it with SendMessage. Wait for CI with until-loops that match the head SHA.
- pnpm 12: `pnpm list` is pnpm's own command; use `pnpm run <script>`. Adding a required check means also updating `OK_CHECKS`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.7-merge-gate-hardening.md`.
