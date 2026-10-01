# T-M1.15: merge-gate reads all of a PR's files

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **in review** (packet and fix in one PR by PO choice, DEC-078; G0 and G3 are the same DOCS-REVIEW) |
| Owner role | LC (harness script) |
| Branch | `chore/T-M1.15-merge-gate-pr-files` (from `develop` `6c8d1d4`) |
| Depends on | T-M1.12 merged (`9866f26`) |
| Estimate | ≤ 0.25 agent-day |
| Trace | DEC-078 (the defect and the PO's start signal); git-governance §4 (merge-gate checks that `progress.json` changed); T-M1.7, T-M1.12 (merge-gate tests with the mocked `gh`) |

## Goal
`merge-gate.sh` step 5 read the PR's files from `gh pr view --json files`, which `gh` 2.102 fetches as `files(first: 100)` without paging. On PR #25 (T-M1.13, 130 files)
`progress.json` was not among the first 100, so the gate refused a valid PR ("progress.json not updated in this PR"). It failed closed, but it blocks every PR with more than
100 files. Read the files from the paginated REST listing the Dependabot path already uses.

## Scope
- In:
  1. Step 5 lists the files with `gh api --paginate repos/{owner}/{repo}/pulls/<n>/files?per_page=100` (GitHub's limit for this listing is 3000 files); an API error
     fails closed ("cannot list the PR's files"); a `progress.json` with status `removed` does not count. `files` is dropped from the `gh pr view` field list (no other user).
  2. Tests in `scripts/tests/merge-gate.test.sh` with the mocked `gh`.
  3. Check the other `gh pr view` fields for the same cap and record the result (below).
- Out of scope (explicit): any other merge-gate behaviour; the Dependabot path (already paginated); `web/`, `backend/`, CI.

## Other capped fields (scope 3)
`GH_DEBUG=api gh pr view 25 --json comments,files,commits` shows `comments(first: 100)` **with** `pageInfo{hasNextPage,endCursor}` (gh pages the comments), and
`files(first: 100)` and `commits(first: 100)` **without** it. `commits` only feeds `commit_time`, a floor under the required server-side push times (activity API and
workflow runs, T-M1.7), so a capped list cannot make a stale verdict look fresh: no change.

## Guardrail answers (scope.md §6)
1. Trace: DEC-078. 2. No product drift (harness only). 3. No tutor setup. 4. Not user-facing; it unblocks merges. 5. No exam or curriculum semantics.

## Acceptance criteria
- **AC1:** with `progress.json` as the 130th file (second REST page) and absent from `pr view`'s files, the gate passes (dry run).
- **AC2:** the gate refuses when only `pr view` lists `progress.json` (REST decides), when the PR deletes `progress.json`, and when the files listing fails (fail closed).
- **AC3:** all earlier merge-gate tests still pass (295 → 301); the four new tests fail against develop's gate (negative demo).
- **AC4:** a live `--dry-run` of the fixed gate on PR #25 passes; `./scripts/check-docs.sh` passes; CI 7/7.

## Test plan
- Implementation: the four tests; the negative demo; the live dry run.
- Review focus (DOCS-REVIEW, fresh): can the change make the gate easier to pass than before (fail-open)? Pagination and jq `inputs` over several JSON arrays; the
  `removed` case; renames (`previous_filename`); the fail-closed message.

## Evidence required
`evidence/T-M1.15/summary.md` (logs: `merge-gate-after.log`, `merge-gate-before.log`, `merge-gate-live-25.log`), the CI link, the review record
(`evidence/T-M1.15/review/docs.md`).

## Docs to update
git-governance §4 (one sentence), `progress.json`, the decision log (DEC-078), the backlog.

## Risks and assumptions
- One more API call per merge (paged); negligible.
- A PR with more than 3000 files cannot be listed completely by GitHub; the gate then refuses unless `progress.json` is among the listed files, which fails closed.

## Commands (reproducible)
```bash
bash scripts/tests/merge-gate.test.sh
git show develop:scripts/merge-gate.sh > /tmp/old-gate.sh   # negative demo: swap in, run the tests, swap back
./scripts/merge-gate.sh --dry-run 25
./scripts/check-docs.sh
```
