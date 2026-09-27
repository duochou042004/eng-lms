# T-M1.7 review record (G3, chore packet): DOCS-REVIEW

Reviewer: one fresh `docs-reviewer` agent (a fresh context that never shared a session with the implementer). It worked black-box, read-only and adversarially: its own mock-gh
fixtures (kept in the session scratchpad), `--dry-run` only, and no commits, comments or merges. Re-tests went to the same agent via SendMessage. PR #15, merged as `41beac7`.

| Round | Head | Verdict | Handling |
|---|---|---|---|
| 1 | `c9d6206` | **CHANGES REQUESTED** (S2-1, S3-1..5, S4-1..6) | All fixed, or accepted as notes (DEC-065) |
| 2 | `39096c6` | **PASS** (new S3-A, S3-B, S4-A, S4-B) | Fixed anyway (DEC-066); S3-A was a fail-open |
| 3 | `0cd46cb` (final) | **PASS** (S4-1, S4-2 only) | Deferred to backlog T-M1.12 (DEC-067) |

The PR comment `DOCS-REVIEW T-M1.7: PASS` and then `LC-APPROVED T-M1.7` were posted after CI went 7/7 green for `0cd46cb`.

## Round 1 (head `c9d6206`): DOCS-REVIEW T-M1.7: CHANGES REQUESTED

The reviewer was a fresh docs-reviewer agent. It worked black-box and read-only, with its own mock-gh fixtures and dry runs only.

Tool results:
- `check-docs.sh`: PASS.
- `run-all.sh`: PASS (merge-gate 87/87).
- No old test was removed or weakened (the `expect_` count went from 35 to 85).
- `shellcheck` is not installed.

| # | Sev | Finding | Resolution (DEC-065) |
|---|---|---|---|
| S2-1 | S2 | The workflow rule accepted non-bumps. It only checked that every changed line is some `uses: X@<40hex>` and that the same *set* of actions is removed and added. Swapping the checkout and setup-python lines in `docs-check.yml` moved `persist-credentials: false` onto the wrong action (rc=0). Re-indents, same-SHA edits and moves into `run:` blocks also passed | Fixed. `uses_bump_problem` pairs the lines within each change block: the same text up to `@`, a different SHA, and only the `# comment` free. Covered by 5 tests |
| S3-1 | S3 | Loosely written negatives were ignored (`QA-VERDICT  T: FAIL`, lowercase, `**…**`, backticks, `>`) | Fixed. A loose negative counts as a negative; positives must still be exact. 9 tests |
| S3-2 | S3 | A stale run could stand in for the push time. The repository Activity API gives the server-side push time and the actor | Fixed. Activity is a required source (fail closed); DEC-063 is amended by DEC-065. 5 tests |
| S3-3 | S3 | The identity check couldn't tell Dependabot's commits from any GitHub-signed commit | Fixed. Every activity entry since the branch's latest creation must be by `dependabot[bot]`. 3 tests |
| S3-4 | S3 | git-governance §4 claimed "added/renamed files refused" for all files; manifests could be added or removed | Fixed. Every Dependabot file must be `modified`, and the doc was corrected. 1 test |
| S3-5 | S3 | `dry-run.txt` wasn't committed, and the CI links and review record were missing | Fixed. The dry-run log is committed, the CI links are in `summary.md`, and this record |
| S4-1 | S4 | Timestamps were compared as strings (fractions, offsets) | Fixed. Times are compared as whole-second UTC, and other formats fail closed. 2 tests |
| S4-2..6 | S4 | Any 40-hex SHA is accepted; the 250-commit API cap; T-M1.11 bookkeeping `34b8416` rides on the PR; comment authors aren't checked; latest-wins within a type | Accepted as notes (DEC-065); `34b8416` is mentioned in the PR body |

Checks that held in round 1:
- newline file names;
- CRLF, `+++`, `docker://` and quoted `uses:` lines;
- `changed`/`removed`/`copied` statuses;
- every other fail-closed path;
- DEC-063's premise on real data (`pushedDate` is null on PRs #9–#15).

## Round 2 (head `39096c6`): DOCS-REVIEW T-M1.7: PASS

All round-1 findings were verified fixed. The reviewer's fixtures replayed the swap, re-indent, loose negatives, activity replay, a human push on a Dependabot branch and the timestamp tricks; all were refused.

| # | Sev | Finding | Resolution (DEC-066) |
|---|---|---|---|
| S3-A | S3 | `uses_bump_problem` used `echo`, so a removed diff line `-n`/`-e`/`-E` printed nothing and any added line passed (only reachable with a base line that is exactly `n`/`e`/`E`) | Fixed: `printf`. 4 tests |
| S3-B | S3 | The Dependabot activity window was an order-dependent slice after a stable sort, so a push in the same second as the branch creation was skipped | Fixed: every entry stamped at or after the latest creation, with unparsable times inside. 2 tests |
| S4-A | S4 | Diff lines with an unknown prefix were treated as context | Fixed: they fail closed. 1 test |
| S4-B | S4 | Loose negatives still missed `##`, `- `, emoji, `QA VERDICT`, `<id> - FAIL`, `CHANGES_REQUESTED`/`-REQUESTED` | Fixed. 8 tests |

## Round 3 (head `0cd46cb`, final): DOCS-REVIEW T-M1.7: PASS

All round-2 items were verified fixed. `run-all.sh` (merge-gate 131/131) and `check-docs.sh` passed, and the test diff only adds lines.

The widened negative match raises no false positives on:
- other ids: `T-M9.9-x`, `T-M9.9x`, `T-M9.90`, `T-M9.10`, `T-M9.9.1`, and `PR-70` against `PR-7`;
- prose.

Non-exact positives never count.

| # | Sev | Finding | Resolution (DEC-067) |
|---|---|---|---|
| S4-1 | S4 | `QA-VERDICT <id>-FAILOVER: PASS` is falsely refused (` ?[:-] ?FAIL` matches a suffix); it fails closed, and ids carry no slug | Deferred: backlog T-M1.12 (add a word boundary after the token) |
| S4-2 | S4 | Rare loose negatives are still ignored: `1. QA-VERDICT …: FAIL`, `- - …`, an em-dash separator, `QA-VERDICT: <id>: FAIL` | Deferred: backlog T-M1.12 |

## Merge
```text
$ <T-M1.7 merge-gate.sh @ 0cd46cb> --dry-run 15   # 2026-09-27T02:23:30Z, final head 0cd46cb, CI 7/7 green, DOCS-REVIEW PASS + LC-APPROVED posted
merge-gate: all gates passed for PR #15 (T-M1.7: chore/T-M1.7-merge-gate-hardening → develop @ 0cd46cb)
merge-gate: dry run — not merging
exit=0

$ ./scripts/merge-gate.sh --dry-run 15   # develop @ 293e048 (the gate in force before the merge)
merge-gate: all gates passed for PR #15 (T-M1.7: chore/T-M1.7-merge-gate-hardening → develop @ 0cd46cb)
merge-gate: dry run — not merging

$ ./scripts/merge-gate.sh 15
merge-gate: all gates passed for PR #15 (T-M1.7: chore/T-M1.7-merge-gate-hardening → develop @ 0cd46cb)
merge-gate: merged PR #15 with a merge commit
```
