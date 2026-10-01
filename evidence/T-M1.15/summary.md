# T-M1.15 evidence summary: merge-gate reads all of a PR's files

Packet: `docs/tasks/T-M1.15-merge-gate-pr-files.md` (packet and fix in one PR, DEC-078) · Branch `chore/T-M1.15-merge-gate-pr-files` (from `develop` `6c8d1d4`) · Implementer: LC.

## Change
`scripts/merge-gate.sh` step 5 lists the files with `gh api --paginate repos/{owner}/{repo}/pulls/<n>/files?per_page=100` instead of `gh pr view --json files`
(`files(first: 100)`, no paging); an API error fails closed; a removed `progress.json` does not count; `files` is dropped from the `pr view` fields.

## AC → proof
| AC | Proof |
|---|---|
| AC1 | `merge-gate-after.log`: "(T-M1.15) passes when progress.json is the 130th file (on the second page)" (the mocked REST listing serves two arrays; `pr view` lists 100 files without it). |
| AC2 | `merge-gate-after.log`: the three "(T-M1.15) refuses …" tests (only `pr view` lists it; deleted; listing fails, with the "fail closed" message). |
| AC3 | `merge-gate-after.log`: **301 passed, 0 failed** (was 295). `merge-gate-before.log`: the same tests against develop's gate: 295 passed, **6 failed** (the four new tests and their two message checks). |
| AC4 | `merge-gate-live-25.log`: the fixed gate's `--dry-run 25` passes PR #25 (develop's gate refused it). `check-docs.sh` PASS. CI 7/7 for `dc42050` (e.g. backend run https://github.com/duochou042004/eng-lms/actions/runs/36905974878). Merged as `9a68eb7` via merge-gate. Review: `review/docs.md`. |

## Scope 3 (other capped fields)
`GH_DEBUG=api gh pr view 25 --json comments,files,commits` (gh 2.102.0): `comments(first: 100)` with `pageInfo` (paged by gh); `files(first: 100)` and
`commits(first: 100)` without. `commits` only feeds the `commit_time` floor under the required push times, so it is left unchanged.
