# T-M1.11 independent review record (docs-reviewer subagent, fresh context; recorded verbatim by the LC)

T-M1.11 passes with minor findings: nothing is S1 or S2, there is one S3 and there are six S4s. Nothing lets someone push to GitHub's develop/master without deliberately bypassing the hook, and on the mirror the hook guards as well as it claims to.

I stayed read-only, so I did not write `evidence/T-M1.11/review/docs.md`. The LC should commit this text as the review record.

**Git status note:** `docs/handoff/HANDOFF.md` and `docs/handoff/next-session-prompt.md` became modified during my review. My commands didn't do it (no test script touches those files, and all attacks ran in scratch clones). They look like concurrent uncommitted LC work. One of those edits drops "conferencing, Drive clone" from the non-goals list in `next-session-prompt.md`. Before committing it, check that the shorter list doesn't break the SPEC §5 wording.

## Checks run
- **`./scripts/check-docs.sh`:** PASS (121 files, `progress.json` valid, sources intact, prompt within the limit).
- **Script tests:**
  - `bash scripts/tests/pre-push.test.sh`: 13/13
  - `bash scripts/tests/gitlab-sync.test.sh`: 8/8
  - `bash scripts/tests/run-all.sh`: PASS
- **GitHub PR #14 at `b4a4eef`:** all 7 checks pass (docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke, container-build).
- **GitLab pipelines, project 86941168:**
  - **2886164985** (`725b97b`): success.
    - backend 101 s: artifacts are archive, junit and jacoco; they expire 2026-10-02T01:18:42Z; GitLab parsed coverage as 90.3.
    - web 29 s: no artifacts (the packet doesn't require any).
    - e2e-smoke 148 s: the archive expires 2026-10-02T01:19:29Z.
  - **2886169118** (`b4a4eef`, the branch head): success. backend 82 s, web 29 s, e2e-smoke 98 s; the artifacts also expire after 5 days.
  - **Parity with GitHub at the same head:** backend 83 tests, 0 failures in both. e2e 28 passed and 8 skipped in both. The JDK line in the trace reads `/tmp/jdk.tgz: OK`.
  - **Testcontainers over DinD:** 28 Testcontainers/postgres mentions in the backend trace.
- **Supply chain:**
  - `TEMURIN_SHA256` matches Adoptium's published `OpenJDK25U-jdk_x64_linux_hotspot_25.0.4_7.tar.gz.sha256.txt`.
  - All five image digests resolved in the job traces with exactly the pinned digests. The temurin, node and postgres digests are the same pins already used in `deploy/Containerfile` and `compose.dev.yaml`.
- **Secrets:** no token is in the repo or in CI variables (the project has 0 variables). `POSTGRES_PASSWORD: englms-ci` is only used by the ephemeral service DB and is commented as such. secrets-scan is green.
- **Traceability:** DEC-060 is consistent with DEC-053 and DEC-056 (5-day expiry, uploads stay non-blocking) and with R-08. Out of scope says the GitHub workflows are unchanged, and the diff confirms none changed. No product code, no SPEC non-goal touched, no scope creep.

## Hook attack cases
All ran in `/tmp/claude-1000/-home-kali-App-sources-Eng-LMS/3b5d7c08-47e2-4424-9588-821d0ef38ff2/scratchpad/rev11/`; the script is `attack.sh` there.

| # | Attack | Result |
|---|---|---|
| A1 | Forge the local `refs/remotes/origin/develop` with `update-ref`, then push that commit to the mirror | **Allowed** (see F2) |
| A2 | `ENGLMS_MIRROR_URL_RE='.*'` plus a forged tracking ref, pushed to origin (GitHub stand-in) | **Allowed**, and origin's develop moved (see F3) |
| A3 | The same forged ref with the default regex, pushed to origin | Blocked |
| A3b | `--no-verify` baseline | Allowed (as before this PR) |
| A4 | `pushInsteadOf` rewrites the mirror URL to another repo | Blocked. The hook receives the rewritten URL. |
| A5 | One remote with two push URLs (mirror and another repo) | Mirror accepted, the other blocked, because the hook runs once per URL |
| A6 | `--force` rewind of the mirror's develop to origin/develop | Blocked (non-fast-forward) |
| A8 | Delete master on the mirror | Blocked |
| A9 | `file://` variant or empty URL | Blocked (fails closed) |

A1 and A2 both need a deliberate act that takes about as much effort as `--no-verify`, which was always possible. So there is no regression against the old guarantees for GitHub, and nothing is ever let through by accident.

## Findings

**F1 (S3): GitLab is "not a merge path" only by policy. Nothing on GitLab or in the agent rules enforces it.**
- **Evidence:**
  - `glab api projects/86941168` shows `merge_requests_enabled: true`.
  - `repository/branches` shows develop (`3dc82a2`) and master (`bbef1f2`) with `protected: false`.
  - The only protected branch is `chore/T-M1.11-gitlab-ci` (Maintainers, no force push), left over from being the first branch pushed. This will also block deleting that branch on the mirror after the merge.
  - `.claude/settings.json` denies `gh pr merge`, `gh repo delete` and `gh release delete` but has no `glab` equivalents. glab is logged in to the PO's account (`progress.json` line 290), so an agent could run `glab mr merge`, `glab repo delete` or change the project's visibility without hitting a deny rule.
- **Expected:** `ci-cd.md:36` ("GitLab is not a merge path") and DEC-060 hold beyond the local hook, as they do on GitHub.
- **Actual:** only the local pre-push hook guards develop/master on the mirror.
- **Fix:**
  - Protect develop and master on GitLab: push allowed for Maintainers, `allow_force_push: false`, no merge access.
  - Disable merge requests on the project.
  - Unprotect or delete the leftover chore-branch protection.
  - Add deny rules: `Bash(glab mr merge:*)`, `Bash(glab repo delete:*)`, `Bash(glab release delete:*)`, and treat any `glab repo edit` visibility change as outward-facing (PO approval).
  - Record all of this in DEC-060 and ci-cd §1.1.
  - If you want it before merge, it's small. Otherwise do it as the first follow-up.

**F2 (S4): the hook actually trusts the local tracking ref, not "GitHub's exact commit".**
- **Where:** `scripts/hooks/pre-push:14-15`. The same claim appears in `git-governance.md:58-60`, DEC-060 and the hook's own header comment.
- **Evidence:** attack A1 pushed an arbitrary commit to the mirror's develop after running `git update-ref refs/remotes/origin/develop <evil>`.
- **Fix:** reword the docs to "exactly the local `origin/<branch>` tracking ref, as last fetched". Optionally, have the hook check `git ls-remote origin refs/heads/<branch>`. GitLab-side protection (F1) at least prevents a poisoned mirror develop from being rewritten.

**F3 (S4): the production hook accepts an environment override meant for tests.**
- **Where:** `ENGLMS_MIRROR_URL_RE` at `scripts/hooks/pre-push:9`.
- **Evidence:** attack A2 widened the mirror regex to match GitHub; combined with a forged tracking ref, a new develop commit reached origin.
- **Impact:** no worse than `--no-verify`, but it's a new, undocumented knob in a guard.
- **Fix:** document it as test-only in the header. Better: honour it only when the URL is a local path (for example, it matches `^/`), so it can never be widened to match a github.com URL.

**F4 (S4): the evidence summary promises pipelines it doesn't list.**
- **Where:** `evidence/T-M1.11/summary.md:13` says "The final-head and develop pipelines are listed below", but lines 18-19 list only 2886164985.
- **Fix:** add 2886169118 (`b4a4eef`, success) and, after the merge, the develop pipeline (which AC1 still needs), plus a pointer to this review.

**F5 (S4): the task status disagrees across files, and a planned PO decision is missing.**
- **Status:** the packet (`docs/tasks/T-M1.11-gitlab-ci.md:6`) and the backlog say `in_progress`; `progress.json:35` says `in_review` with `"pr": null`, although PR #14 exists.
- **Missing PO decision:** packet line 46 says the keep-or-remove-the-mirror decision is recorded in `pendingPO`. `decisions.pendingPO` holds only OQ-03..OQ-14; the item appears only in `currentTask.nextSteps`.
- **Fix:** align the statuses, set `pr: 14`, and add the mirror decision to `pendingPO`.

**F6 (S4): the committed handoff doesn't mention T-M1.11 at the head.**
- **Evidence:** `git show HEAD:docs/handoff/HANDOFF.md` has no GitLab or T-M1.11 content, while `progress.json` makes T-M1.11 the current task. A cold-start agent wouldn't learn to run `gitlab-sync.sh` after merges.
- **Fix:** the pending uncommitted edits add this; commit them.

**F7 (S4): the per-pipeline cost estimate is stale.**
- **Where:** packet line 44 says 10–15 min per pipeline.
- **Actual:** about 4.6 compute-minutes (101 + 29 + 148 s). The uncommitted handoff says ≈4.5 min.
- **Fix:** update the packet so the 400-minute budget reasoning is right.

## Notes (no action required)
- **Branching:** the packet says the branch was cut from the T-M1.7 bookkeeping branch rather than from `develop`. The deviation from CLAUDE.md's "branch from develop" is disclosed there, and the stale T-M1.7 branch is handled in the pending handoff edits.
- **Pins won't auto-update:** Dependabot doesn't cover `.gitlab-ci.yml`, so its digests won't be bumped. That's acceptable for a temporary mirror.
- **Unpinned apt fallback:** `apt-get install curl` only runs if curl is missing, and the Playwright image already has it.
- **Testcontainers image tag:** Testcontainers pulls `docker.io/library/postgres:18` by tag. That predates this PR and GitHub CI does the same.
- **Earlier bookkeeping commit `6638a20`:** consistent. T-M1.6 is marked done with `5f193e6` and `3dc82a2`, the T-M1.7 packet is ready and waiting for the PO start signal, the backlog rows match, and the T-M1.5 handoff is archived.

DOCS-REVIEW T-M1.11: PASS WITH MINOR