# DOCS-REVIEW T-M1.20 (PR #76)

> Recorded by the LC from the docs-reviewer agent's returned text (fresh context; round 1 at `675d47a`, round 2 at `680efd8`). Round-2 S4 R2-1/R2-2 fixed by the LC at `5538d0e`.

## Round 1

I found no S1 or S2 issues. The rule works as intended, but the decision-log entry gives a wrong instruction about when pipelines can still start (S3), so the verdict is CHANGES REQUESTED.

**Review basis.** Head is `675d47a`. I read everything via `git show origin/chore/T-M1.20-gitlab-ci-pause:…`. The working tree was clean and at that same commit, so I also ran `./scripts/check-docs.sh` on it: PASS (202 markdown files, `progress.json` valid, sources intact, prompt within limit). `progress.json` parses as JSON and `.gitlab-ci.yml` parses as YAML. I wrote nothing into the repo.

**What holds up:**
- **Unset variable.** When `ENGLMS_GITLAB_CI` is not set, GitLab compares null with `"on"`, so `$ENGLMS_GITLAB_CI != "on"` is true. An empty value or anything other than exactly `on` (it is case-sensitive) also pauses CI.
- **`when: never`.** As the first workflow rule, it stops pipeline creation for every pipeline source: branch pushes, schedules, web, API and trigger runs. So no jobs run and no minutes are used, and no `.gitlab-ci.yml` change is needed for schedules. Manual, API or scheduled runs that set `ENGLMS_GITLAB_CI=on` still bypass it, which is the intended way to resume.
- **Mirror sync.** `scripts/gitlab-sync.sh` and `scripts/hooks/pre-push` don't change, and neither depends on pipelines. Their tests (`scripts/tests/gitlab-sync.test.sh`, `scripts/tests/pre-push.test.sh`) use local bare remotes, so they are unaffected.
- **Nothing depends on GitLab pipelines.** `merge-gate.sh`, `required-checks.txt`, `gate.sh` and the quality gates contain no GitLab dependency.
- **Consistency.** It agrees with DEC-061 ("not a required check, not a merge path").

| # | Sev | Location | Finding | Suggested fix |
|---|---|---|---|---|
| D1 | S3 | `docs/10-governance/decision-log.md` DEC-107 ("until the rule is on the mirror's `develop`, syncs push with `-o ci.skip`") | **Wrong condition.** GitLab reads `.gitlab-ci.yml` from each pushed commit, not from the mirror's `develop`. After merge, any branch whose tip doesn't contain the rule will still start the full pipeline when synced. That includes branches cut from `develop` before T-M1.20 and the open Dependabot branches #64–#70. **No supported way to do it.** `gitlab-sync.sh` can't pass push options, and ci-cd.md §1.1 and the HANDOFF never mention `-o ci.skip`. A coding agent with no chat history would run plain `gitlab-sync.sh <old-branch>` and trigger the failing pipelines DEC-107 is meant to stop. | Reword to: "a branch whose tip predates T-M1.20 still runs the old config: update it from `develop` (`gh pr update-branch`) before syncing it, or push it by hand with `git push -o ci.skip gitlab refs/remotes/origin/<b>:refs/heads/<b>`". Put the same sentence in ci-cd.md §1.1. Alternatively, let `gitlab-sync.sh` pass `-o ci.skip` while an env var is set (needs a test). |
| D2 | S4 | `scripts/gitlab-sync.sh:5` ("Each push runs .gitlab-ci.yml.") | Stale. The `--help` text prints lines 2–6, so users see this claim. | Change to "Each push runs .gitlab-ci.yml unless paused (DEC-107)." |
| D3 | S4 | `docs/07-operations/ci-cd.md` §1.1, the paragraph after the paused note ("runs `.gitlab-ci.yml` on every branch push") | Present tense contradicts the paused note just above it. There is also a double blank line after the note. | Change to "when enabled, runs …" and remove the extra blank line. |
| D4 | S4 | `.github/workflows/backend.yml:69`, `.github/workflows/e2e-smoke.yml:85` | The upload-failure warnings say "see the GitLab mirror pipeline (DEC-060)". While CI is paused there is no such pipeline, so the pointer leads nowhere. | Add "(paused, DEC-107)" or drop the pointer. Optional: these files are message-only and outside this PR's diff. |
| D5 | S4 | DEC-107; ci-cd.md §1.1 ("set the variable in GitLab") | New GitLab variables are protected by default, and protected variables only reach protected branches (`develop`, `master`). Resuming that way would bring CI back only on those two branches, not on the branches under review. | Add "uncheck *Protect variable*" to the resume step. |
| D6 | S4 | DEC-107 | The PO called the pause temporary, but there is no resume trigger or owner. The quota resets monthly, so it is unclear whether CI resumes on 2026-11-01 or stays off until a PO decision. DEC-107 also changes DEC-080's "keeps … its CI as a precaution" without saying so. | Add "resume: PO decision (quota resets monthly); this amends DEC-080 for CI only, the mirror is kept". Optionally add a short pointer from ci-cd.md §1.1 and git-governance.md:79 to DEC-107. |

I did not check the GitLab project itself: whether scheduled pipelines exist, whether the CI config path was changed from the default, or whether Auto DevOps is on. These don't change the result, because `when: never` covers schedules, and Auto DevOps doesn't run while a `.gitlab-ci.yml` exists. The GitLab behaviour above comes from GitLab's documented rules, not from a live run. Until D1 is fixed, syncing any branch cut before this merge will still start the failing pipelines.

Round 1 verdict: CHANGES REQUESTED

## Round 2

Round 2 passes. All six round-1 findings are fixed and I found nothing at S1–S3. Two small wording items remain at S4.

**Checks run.** The tree is at `680efd8`, the PR head, and is clean.
- `scripts/tests/gitlab-sync.test.sh`: 11/11 pass.
- `scripts/tests/pre-push.test.sh`: 15/15 pass.
- `./scripts/check-docs.sh`: PASS (202 markdown files, `progress.json` valid, sources intact, prompt within limit).
- `./scripts/gitlab-sync.sh --help` prints the new lines 2–7 correctly.

**Round-1 findings:**

| # | Round 1 | Status at `680efd8` |
|---|---|---|
| D1 | S3 | **Fixed.** `gitlab-sync.sh` now sends `-o ci.skip` on every sync unless `ENGLMS_GITLAB_CI=on`, so branches cut before the pause are covered too. With an empty option list the push still works under `set -u` (bash ≥ 4.4). The test checks this properly: the second run pushes a new branch, so the mirror's recording hook (a pre-receive hook) runs again and its stale record is cleared. DEC-107 and ci-cd.md §1.1 now say GitLab reads each pushed commit's config and forbid plain `git push` while paused. |
| D2 | S4 | **Fixed** (header and `--help`). |
| D3 | S4 | **Fixed** ("when CI is enabled"; the extra blank line is gone). |
| D4 | S4 | **Fixed.** Only the warning text in the two workflow files changed. |
| D5 | S4 | **Fixed.** DEC-107 and §1.1 now say to set the variable unprotected. |
| D6 | S4 | **Fixed.** Resume is a PO decision, DEC-107 says it amends DEC-080 for CI only, and git-governance.md now points to DEC-107. |

**New checks:**
- **Pre-push hook with push options.** The hook only reads the refs on stdin, so `-o` doesn't change it. The develop/master exception and the fast-forward check behave as before.
- **Real GitLab support for `ci.skip`.** GitLab has documented the `ci.skip` push option since 11.7 and accepts push options over HTTPS and SSH. A server that doesn't accept them makes `git push -o` fail with an error rather than push silently without the option, so it fails safe. GitLab may still show a "skipped" pipeline entry; that has no jobs and uses no minutes, and the docs don't claim otherwise. I relied on GitLab's documentation here, not a live push.

**New findings:**

| # | Sev | Location | Finding | Suggested fix |
|---|---|---|---|---|
| R2-1 | S4 | `.gitlab-ci.yml:10` ("To resume, set … or delete these two lines"); `docs/handoff/HANDOFF.md:54–55` ("resume with the GitLab project variable") | Resuming now takes two steps: turn the `workflow` rule on (set the variable or delete the rule) **and** sync with `ENGLMS_GITLAB_CI=on`. Both places name only the first step. Someone following them would still see no pipelines. That fails safe (no minutes used) but is confusing. | Add "and sync with `ENGLMS_GITLAB_CI=on ./scripts/gitlab-sync.sh` (ci-cd.md §1.1)" in both places. |
| R2-2 | S4 | `docs/07-operations/ci-cd.md` §1.1 ("set that variable …, sync with `ENGLMS_GITLAB_CI=on …`, or revert the rule") | The list reads as three alternatives. Reverting the rule alone doesn't resume CI, because the sync still sends `ci.skip`. | Reword: "set that variable (unprotected) or revert the rule, **and** sync with `ENGLMS_GITLAB_CI=on ./scripts/gitlab-sync.sh` (or remove the script's `ci.skip` default)." |

DOCS-REVIEW T-M1.20: PASS
