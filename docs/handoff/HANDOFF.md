# Handoff — 2026-09-27 (T-M1.7 merged `41beac7`; T-M1.8 ready)

Phase/Milestone: P1 / M1 · Current task: **T-M1.8 (ready; PO start signal given, DEC-068)** · Bookkeeping branch: `docs/T-M1.8-packet` (PR #16) · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1..T-M1.6, T-M1.11 and **T-M1.7 (`41beac7`, PR #15)** are merged through merge-gate.
  Required CI checks: docs-check, secrets-scan, backend, web, contract-drift and e2e-smoke. `container` runs on every PR but isn't required.
- **What T-M1.7 changed in `scripts/merge-gate.sh`** (git-governance §4; DEC-062..067):
  - **Freshness by push time.** A verdict counts only if posted strictly after the head **arrived**. The arrival is the latest of: the repository Activity API
    (`/activity?ref=refs/heads/<branch>`, the entry whose `after` is the head), the head's `pull_request` workflow runs on the branch, the PR's force-push events,
    and `committedDate`. Times are compared as whole-second UTC.
    The gate **fails closed** when the activity entry or the run is missing, a time can't be parsed, or an API call fails. Right after a push, wait for CI to start before running the gate.
  - **Negatives block.** For QA, DOCS, SEC and UX, the latest fresh verdict must be that type's positive token, on every path. Loosely written negatives also block.
  - **Dependabot PRs:**
    - every commit is authored by `dependabot[bot]`, committed by `web-flow`, and verified;
    - every branch activity entry since creation is by `dependabot[bot]`, so **don't "Update branch" a Dependabot PR**: comment `@dependabot rebase` instead;
    - only existing manifests, lockfiles and the wrapper properties may be *modified*, plus workflows whose change blocks are pairwise `uses:` SHA bumps.
  - The DEC-037/038 manual checks are over (DEC-064). Tests: merge-gate **131**, path-ownership 15.
  - Review: DOCS-REVIEW round 1 CHANGES REQUESTED (an S2: a `uses:` swap passed; fixed), then rounds 2 and 3 PASS. The round-3 S4s went to **T-M1.12** (DEC-067). Record: `evidence/T-M1.7/review/docs.md`.
- **Open PR `docs/T-M1.8-packet`:** the T-M1.7 merge and review record, DEC-067, backlog T-M1.12, the **T-M1.8 packet** (G0), `progress.json` and this handoff.
  It needs a `DOCS-REVIEW T-M1.8: PASS` (a fresh docs-reviewer on the packet) plus `LC-APPROVED T-M1.8`, then merge-gate. It uses the chore/docs path with id T-M1.8.
- **GitLab mirror (DEC-060):** develop was synced at `41beac7`. The stale mirror branch `chore/T-M1.7-merge-gate-hardening` still exists on GitLab (harmless).

## Next steps
1. Open or merge the `docs/T-M1.8-packet` PR: get the docs review of the packet, post the comments, run merge-gate `--dry-run` from develop, then merge, then `./scripts/gitlab-sync.sh`.
2. Implement **T-M1.8** (start signal given, DEC-068). T-M1.8 is BE: management-port request IDs, Problem Details and headers for Tomcat-rejected requests, the forbidden identifiers
   `ExamType`/`Part5`, the local 30 s shutdown stall, a quiet `dev-down`, upload-failure warnings, and a `coverage-summary` test. G3 is QA plus **SEC** review.
3. Then T-M1.9 (web a11y follow-ups, **before the M2 routes**). T-M1.10 (TS 7) waits for upstream. T-M1.12 (merge-gate polish) can run at any time.

## Pending PO decisions / actions
- OQ-17: a content check of the wrapper properties on the Dependabot path (default yes, in T-M1.12).
- After the GitHub storage reset (expected 2026-10-01): keep or remove the GitLab mirror (DEC-060).
- Recommended (DEC-061): `glab mr merge`/`repo delete`/`release delete` deny rules in `.claude/settings.json`.
- OQ-03..OQ-14 (defaults documented).

## Gotchas
- merge-gate refuses until the head's `pull_request` runs **and** its activity entry exist. `gh pr checks` pending is expected right after a push.
- A pipe to `tail` hides a failing `check-docs.sh`: run it bare before committing. `progress.json` `pr` is a string (the URL); the gate statuses are `n/a|pending|pass|fail`.
- Mirror: `./scripts/gitlab-sync.sh [branch]` after merges and before reviews; pipelines: `glab ci list -R duochou042004/eng-lms`.
- An unrelated untracked PDF of the user's sits in the repo root: never `git add -A`; stage explicit paths.
- `/qa/**` can only change on `qa/<task>` branches; reviewer evidence (`evidence/*/review/`) can't go on feature/fix branches.
- `e2e-run.sh` needs ports 8080/8081 free and `dev-up.sh` (rerun after a reboot). A host restart wipes the scratchpad.
- If a subagent hits a rate limit, resume it with SendMessage. Wait for CI with until-loops on the head SHA (foreground `sleep` chains are blocked).
- `shellcheck` isn't installed; installing it needs PO approval.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.8-backend-follow-ups.md`.
