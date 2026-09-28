# T-M1.12: Merge-gate polish (T-M1.7 review S4s, OQ-17, argument parsing)

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **ready** (G0: DOCS-REVIEW on the packet PR; dependencies merged; the PO gives the start signal) |
| Owner role | LC (governance scripts; no product code) |
| Branch | `chore/T-M1.12-merge-gate-polish` (from `develop`) |
| Depends on | T-M1.7 merged (`41beac7`) |
| Estimate | ≤ 1 agent-day |
| Trace | DEC-067 (T-M1.7 DOCS-REVIEW round 3 S4-1, S4-2), DEC-065 (round-1 notes S4-2..6, accepted), OQ-17 (default **yes**, DEC-064), DEC-074 (the trailing `--dry-run` merged PR #19), git-governance §4, quality-gates G4, R-08; source: `evidence/T-M1.7/review/docs.md` |

## Goal
Close the small gaps left in `scripts/merge-gate.sh` before M2 starts sending product PRs through it: a false refusal on ids followed by a word starting with `FAIL`, a few
loosely written negatives that are still ignored, no content check on a Dependabot Maven-wrapper bump (OQ-17), and an argument parser that silently ignores a misplaced
`--dry-run` and merges.

## Scope
- In:
  1. **Word boundary after the negative token (T-M1.7 R3 S4-1).** The loose-negative pattern matches `FAIL`/`CHANGES REQUESTED` only as a whole word: `QA-VERDICT <id>-FAILOVER: PASS`
     and `QA-VERDICT <id>: FAILED-OVER…`-style suffixes are not negatives. `QA-VERDICT <id>: FAIL`, `…: FAIL.` and `…: FAIL (see F1)` still are.
  2. **Rare loose negatives (T-M1.7 R3 S4-2).** These first lines also count as negatives (blocking): a numbered list prefix (`1. QA-VERDICT <id>: FAIL`, `1) …`), nested
     bullets (`- - …`, `* …`), an em-dash or en-dash separator (`QA-VERDICT <id> — FAIL`, `– FAIL`), and a colon after the type (`QA-VERDICT: <id>: FAIL`). Positives stay
     exact (DEC-065 S3-1): none of these forms ever counts as a positive.
  3. **Wrapper properties content (OQ-17, default yes).** On the Dependabot path, a change to `backend/.mvn/wrapper/maven-wrapper.properties` is accepted only if every changed
     line is `wrapperVersion=<semver>`, `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/<ver>/apache-maven-<ver>-bin.zip` or
     `wrapperUrl=https://repo.maven.apache.org/maven2/org/apache/maven/wrapper/maven-wrapper/<ver>/maven-wrapper-<ver>.jar`, with no added keys, no removed keys and
     no other host (no `distributionSha256Sum` removal, no `distributionType` change). Anything else fails closed with a message naming the line.
  4. **Argument parsing (DEC-074).** `merge-gate.sh` accepts `--dry-run` before **or** after the PR number, refuses any other argument (unknown options, a second PR
     number, a non-numeric PR) with a usage message and exit code 2, **before** any API call, and never merges when an argument was not understood.
  5. Tests for each item in `scripts/tests/merge-gate.test.sh` (the mocked `gh`), including the positive controls (a correct PASS still merges; a correct wrapper bump passes; a
     plain `--dry-run 20` still works). git-governance §4 describes items 3 and 4. OQ-17 is closed in `open-questions.md`.

## Out of scope (explicit)
- The accepted round-1 notes (DEC-065 S4-2..6: any 40-hex SHA is accepted in `uses:` bumps, the 250-commit API cap, comment authors unchecked, latest-wins within a
  type); any new merge path; changes to `required-checks.txt` or the CI workflows; the GitLab mirror (DEC-060); product code (`backend/`, `web/`, `e2e/`).

## Guardrail answers (scope.md §6)
1. Trace: DEC-067, DEC-065, OQ-17, DEC-074. 2. No product scope; governance tooling only. 3. No tutor setup. 4. N/A (engineering; every merge uses the gate). 5. No exam semantics.

## Design notes
- The loose-negative test is the `jq` expression in `verdict()` (`scripts/merge-gate.sh` ~line 209). Normalise the leading list markers (`\d+[.)] `, repeated `- `/`* `) and the
  dashes (U+2014, U+2013 → `-`) **before** the ASCII filter (it drops non-ASCII today, which is why the em-dash form is missed), then add a word boundary after the token
  (`(FAIL|CHANGES[ -]?REQUESTED)(?![A-Z0-9])`, or an explicit end/space/punctuation class; check jq's Oniguruma supports the look-ahead).
- The Dependabot wrapper check follows the style of `uses_bump_problem`: a function that reads the file's patch from the PR files API and prints the first problem (use
  `printf`, never `echo`, DEC-066 S3-A). Keep `DEPENDABOT_FILES_RE` and `check-path-ownership.sh` unchanged.
- Argument parsing: a `while (($#))` loop with `case` (`--dry-run`), `[0-9]+` for the PR, `*` → usage + exit 2. The header usage line stays accurate.

## Acceptance criteria
- **AC1 (S4-1):** tests show `QA-VERDICT <id>-FAILOVER: PASS` (with `<id>` the PR's task id) is not treated as a negative, and `QA-VERDICT <id>: FAIL`, `…: FAIL.`,
  `…: FAIL (see F1)` and `…: CHANGES REQUESTED` block, for QA, DOCS, SEC and UX.
- **AC2 (S4-2):** tests show each form in scope 2 blocks, and the same forms with `PASS`/`APPROVED` do not count as positives (the merge is refused for a missing verdict).
- **AC3 (OQ-17):** tests: a Dependabot PR whose wrapper diff changes only `wrapperVersion`/`distributionUrl` to a new Maven Central version passes; changing the host, adding a
  key, removing a key, or changing `distributionType` fails with a message naming the line.
- **AC4 (DEC-074):** tests: `--dry-run 20` and `20 --dry-run` both dry-run (no merge call in the mock log); `20 --dryrun`, `20 21`, `abc`, `--force 20` exit 2 with the usage
  message and make no `gh` call.
- **AC5:** `scripts/tests/run-all.sh` passes (the merge-gate count rises from 131), `./scripts/gate.sh` is green, CI 7/7, git-governance §4 and `open-questions.md` (OQ-17
  answered) are updated, and the evidence summary lists each AC's tests. The gate's own dry run on this PR passes before the merge.

## Test plan
- Implementation: mocked-`gh` cases per AC in `merge-gate.test.sh`; `run-all.sh`.
- Independent review focus (DOCS-REVIEW, docs/chore packet): try to bypass each new rule (other Unicode dashes, `1.` with extra spaces, `FAIL` followed by punctuation, a wrapper
  URL with `@`/userinfo or a different path on the same host, arguments with `=`), confirm no positive became easier to post, and that fail-closed behaviour holds.

## Evidence required
`evidence/T-M1.12/summary.md` (AC → tests), the `run-all.sh` output, a gate log (`ENGLMS_TASK=T-M1.12`), the dry-run output on the PR, the CI links and the review record
(`evidence/T-M1.12/review/docs.md` on the next docs branch).

## Docs to update
git-governance §4 · open-questions (OQ-17 answered) · `progress.json` · the evidence summary.

## Risks and assumptions
- A looser negative pattern could start matching legitimate positives: every new negative form has a positive twin test (AC2), and positives stay exact.
- jq's regex engine (Oniguruma) may lack a feature; test the look-ahead on the pinned jq and fall back to an explicit character class.

## Commands (reproducible)
```bash
git checkout develop && git pull --ff-only && git checkout -b chore/T-M1.12-merge-gate-polish
scripts/tests/merge-gate.test.sh && scripts/tests/run-all.sh
ENGLMS_TASK=T-M1.12 ./scripts/gate.sh
./scripts/merge-gate.sh --dry-run <pr>
```
