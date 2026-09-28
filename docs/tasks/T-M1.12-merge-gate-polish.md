# T-M1.12: Merge-gate polish (T-M1.7 review S4s, OQ-17, argument parsing)

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **done**: merged `9866f26` (PR #23) via merge-gate on 2026-09-28; DOCS-REVIEW PASS (round 3). DEC-075, DEC-076. (G0 on PR #22, `360c15a`) |
| Owner role | LC (governance scripts; no product code) |
| Branch | `chore/T-M1.12-merge-gate-polish` (from `develop`) |
| Depends on | T-M1.7 merged (`41beac7`) |
| Estimate | ≤ 1 agent-day |
| Trace | DEC-067 (T-M1.7 DOCS-REVIEW round 3 S4-1, S4-2), DEC-065 (round-1 notes S4-2..6, accepted), OQ-17 (default **yes**, DEC-064), DEC-074 (the trailing `--dry-run` merged PR #19), DEC-075 (PO start; the OQ-17 default accepted), git-governance §4, quality-gates G4, R-08; source: `evidence/T-M1.7/review/docs.md` |

## Goal
Close the small gaps left in `scripts/merge-gate.sh` before M2 starts sending product PRs through it: a false refusal on ids followed by a word starting with `FAIL`, a few
loosely written negatives that are still ignored, no content check on a Dependabot Maven-wrapper bump (OQ-17), and an argument parser that silently ignores a misplaced
`--dry-run` and merges.

## Scope
- In:
  1. **Word boundary after the negative token (T-M1.7 R3 S4-1).** Only the id-suffix false refusal is removed: `QA-VERDICT <id>-FAILOVER: PASS` (a word that merely starts
     with `FAIL` right after the id) no longer matches the loose-negative pattern. Every real negative keeps blocking: `FAIL`, `FAILS`, `FAILED`, `FAILURE`, `FAILING` and
     `CHANGES REQUESTED`, in exact and loose forms (e.g. `**QA-VERDICT <id>: FAILED**`, `> qa-verdict <id>: failed`, `QA-VERDICT <id> - FAILS AC3`), and an exact line with any
     other token (e.g. `QA-VERDICT <id>: FAILED-OVER`) still blocks as an unrecognised token (`merge-gate.sh` ~lines 214, 239–240), which must not change.
  2. **Rare loose negatives (T-M1.7 R3 S4-2).** These first lines also count as negatives (blocking): a numbered list prefix (`1. QA-VERDICT <id>: FAIL`, `1) …`), nested
     bullets (`- - …`), an em-dash or en-dash separator (`QA-VERDICT <id> — FAIL`, `– FAIL`), and a colon after the type (`QA-VERDICT: <id>: FAIL`). `* QA-VERDICT <id>: FAIL`
     and `- * …` already block today (`*` is stripped); they get regression tests only. Positives stay
     exact (DEC-065 S3-1): none of these forms ever counts as a positive.
  3. **Wrapper properties content (OQ-17 = yes, the default accepted with DEC-075).** The real file has three keys (`wrapperVersion=3.3.4`, `distributionType=only-script`,
     `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.16/apache-maven-3.9.16-bin.zip`). On the Dependabot path, a change to
     `backend/.mvn/wrapper/maven-wrapper.properties` is accepted only if each change replaces a `wrapperVersion=<semver>` line by another `wrapperVersion=<semver>`, or a
     `distributionUrl=` line by `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/<ver>/apache-maven-<ver>-bin.zip` (the same `<ver>` twice; no userinfo,
     port, query or other path). Any added key, removed key, other key's change (e.g. `distributionType`, or a checksum key if one is ever added — refused on purpose) or other
     host fails closed with a message naming the line.
  4. **Argument parsing (DEC-074).** `merge-gate.sh` accepts `--dry-run` before **or** after the PR number, refuses any other argument (unknown options, a second PR
     number, a non-numeric PR) with a usage message and exit code 2, **before** any API call, and never merges when an argument was not understood.
  5. Tests for each item in `scripts/tests/merge-gate.test.sh` (the mocked `gh`), including the positive controls (a correct PASS still merges; a correct wrapper bump passes; a
     plain `--dry-run 20` still works). The existing test "AC3/R3-3: a Maven wrapper properties bump passes" uses a placeholder `-a/+b` patch; it is replaced by a
     realistic `wrapperVersion`/`distributionUrl` diff with the same intent (not a weakened test). git-governance §4 describes items 3 and 4. OQ-17 is closed in
     `open-questions.md` as answered by DEC-075.

## Out of scope (explicit)
- The accepted round-1 notes (DEC-065 S4-2..6: any 40-hex SHA is accepted in `uses:` bumps, the 250-commit API cap, comment authors unchecked, latest-wins within a
  type); any new merge path; changes to `required-checks.txt` or the CI workflows; the GitLab mirror (DEC-060); product code (`backend/`, `web/`, `e2e/`).

## Guardrail answers (scope.md §6)
1. Trace: DEC-067, DEC-065, OQ-17, DEC-074. 2. No product scope; governance tooling only. 3. No tutor setup. 4. N/A (engineering; every merge uses the gate). 5. No exam semantics.

## Design notes
- The loose-negative test is the `jq` expression in `verdict()` (`scripts/merge-gate.sh` ~line 209). Normalise the leading list markers (`\d+[.)] `, repeated `- `/`* `) and the
  dashes (U+2014, U+2013 → `-`) **before** the ASCII filter (it drops non-ASCII today, which is why the em-dash form is missed), then add a word boundary after the token
  that still accepts the real negative words, e.g. `(FAIL(S|ED|URE|ING)?|CHANGES[ -]?REQUESTED)(?![A-Z0-9])`. Oniguruma look-ahead and `gsub("[—–]"; "-")` were verified on
  the local jq 1.8.2; CI's `docs-check` job runs `run-all.sh` with the runner's system jq, so the tests cover both.
- The Dependabot wrapper check follows the style of `uses_bump_problem`: a function that reads the file's patch from the PR files API and prints the first problem (use
  `printf`, never `echo`, DEC-066 S3-A). Keep `DEPENDABOT_FILES_RE` and `check-path-ownership.sh` unchanged.
- Argument parsing: a `while (($#))` loop with `case` (`--dry-run`), `[0-9]+` for the PR, `*` → usage + exit 2. The header usage line stays accurate. `mock-gh` logs only
  `pr merge` today (`merged.txt`); AC4 needs a log of every call (e.g. `calls.txt`) or a `GH_BIN` that fails when called.

## Acceptance criteria
- **AC1 (S4-1):** tests show `QA-VERDICT <id>-FAILOVER: PASS` (with `<id>` the PR's task id) is not treated as a negative, and `QA-VERDICT <id>: FAIL`, `…: FAIL.`,
  `…: FAIL (see F1)`, `…: CHANGES REQUESTED`, `**QA-VERDICT <id>: FAILED**`, `QA-VERDICT <id> - FAILS AC3` and the exact `QA-VERDICT <id>: FAILED` (unrecognised token)
  block, for QA, DOCS, SEC and UX.
- **AC2 (S4-2):** tests show each form in scope 2 blocks, and the same forms with `PASS`/`APPROVED` do not count as positives (the merge is refused for a missing verdict).
- **AC3 (OQ-17):** tests: a Dependabot PR whose wrapper diff changes only `wrapperVersion`/`distributionUrl` to a new Maven Central version passes; changing the host, adding a
  key, removing a key, or changing `distributionType` fails with a message naming the line.
- **AC4 (DEC-074):** tests: `--dry-run 20` and `20 --dry-run` both dry-run (no merge call in the mock log); no argument, `--dry-run` alone, `20 --dryrun`, `20 21`, `abc`,
  `--force 20` exit 2 with the usage message and make no `gh` call (shown by a call log in `mock-gh` or a failing `GH_BIN`).
- **AC5:** `scripts/tests/run-all.sh` passes (the merge-gate count rises from 131), `./scripts/gate.sh` is green, CI 7/7, git-governance §4 and `open-questions.md` (OQ-17
  answered, DEC-075) are updated, OQ-17 leaves `progress.json` `pendingPO`, and the evidence summary lists each AC's tests. The gate's own dry run on this PR passes before the merge.

## Test plan
- Implementation: mocked-`gh` cases per AC in `merge-gate.test.sh`; `run-all.sh`.
- Independent review focus (DOCS-REVIEW, docs/chore packet): try to bypass each new rule (other Unicode dashes, `1.` with extra spaces, `FAIL` followed by punctuation, a wrapper
  URL with `@`/userinfo or a different path on the same host, arguments with `=`), confirm no positive became easier to post, and that fail-closed behaviour holds.

## Evidence required
`evidence/T-M1.12/summary.md` (AC → tests), the `run-all.sh` output, a gate log (`ENGLMS_TASK=T-M1.12`), the dry-run output on the PR, the CI links and the review record
(`evidence/T-M1.12/review/docs.md` on the next docs branch).

## Docs to update
git-governance §4 · open-questions (OQ-17 answered by DEC-075) · `progress.json` · the evidence summary.

## Risks and assumptions
- A looser negative pattern could start matching legitimate positives: every new negative form has a positive twin test (AC2), and positives stay exact.
- jq is not pinned: the look-ahead works on the local jq 1.8.2; if the CI runner's jq lacks it, fall back to an explicit end/space/punctuation class.
- Unverified: whether a Dependabot wrapper bump also regenerates `backend/mvnw`/`mvnw.cmd` (outside `DEPENDABOT_FILES_RE`, so refused regardless). Check on the first real
  wrapper PR; any widening needs a DEC.

## Commands (reproducible)
```bash
git checkout develop && git pull --ff-only && git checkout -b chore/T-M1.12-merge-gate-polish
scripts/tests/merge-gate.test.sh && scripts/tests/run-all.sh
ENGLMS_TASK=T-M1.12 ./scripts/gate.sh
./scripts/merge-gate.sh --dry-run <pr>
```
