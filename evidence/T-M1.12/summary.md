# T-M1.12 evidence summary: merge-gate polish

Packet: `docs/tasks/T-M1.12-merge-gate-polish.md` (G0 on PR #22, `360c15a`) · Branch: `chore/T-M1.12-merge-gate-polish` · PO start: DEC-075 (OQ-17 default recorded) ·
Implementer: the LC (governance scripts).

## Changes
- `scripts/merge-gate.sh`:
  - **Arguments (AC4, DEC-074):** a strict `while`/`case` parser. `--dry-run` before or after the PR number; an unknown option, a second or non-numeric PR (also `07`),
    `--dry-run=1`, `--` or no PR → usage on stderr and **exit 2 before any `gh` call**.
  - **Loose negatives (AC1, AC2):** before the ASCII filter, Unicode dashes (U+2010–U+2015, U+2212) become `-`; after it, leading list markers (`1.`, `1)`, `- `, `- - `)
    are stripped, a colon after the type is allowed (`QA-VERDICT: <id>`), the separator may be several `:`/`-`, and the negative word must end
    (`FAIL(S|ED|URE|ING)?|CHANGES[ -]?REQUESTED` followed by a non-alphanumeric). The exact path (unknown tokens block) is unchanged.
  - **Wrapper properties (AC3, OQ-17 = yes):** `wrapper_bump_problem` (same block parser style as `uses_bump_problem`, `printf` only): each change block replaces lines one
    for one with the same key; only `wrapperVersion=<x.y.z>` and `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/<v>/apache-maven-<v>-bin.zip`
    (same `<v>`) may change. A missing diff fails closed.
- `scripts/tests/mock-gh`: logs every call to `calls.txt` (AC4's "no gh call" proof).
- `scripts/tests/merge-gate.test.sh`: 131 → **263** tests. The T-M1.7 wrapper test's placeholder `-a/+b` patch is replaced by a realistic `wrapperVersion` +
  `distributionUrl` diff (same intent, not weaker).
- Docs: git-governance §4 (arguments, loose negatives, wrapper rule); open-questions (OQ-17 answered, DEC-075).

## AC → proof
| AC | Tests (`scripts/tests/merge-gate.test.sh`) |
|---|---|
| AC1 | `T-M1.12 AC1: 'QA-VERDICT <id>-FAILOVER: PASS' is not a negative`; for each of QA-VERDICT, DOCS-REVIEW, SEC-REVIEW, UX-REVIEW: `FAIL`, `FAIL.`, `FAIL (see F1)`, `CHANGES REQUESTED`, `**…: FAILED**`, `- FAILS AC3`, exact `FAILED`, `> … failed`, `FAILURE`, `- FAILING` block (40 cases); an exact `FAILED-OVER` still blocks |
| AC2 | 11 forms (`1.`, `1)`, `12.`, `- - `, `* ` and `- * ` (regression), em dash with and without spaces, en dash, `QA-VERDICT: <id>:`, a mixed form) block with `FAIL`, and their `PASS` twins are not positives (refused for a missing QA verdict); `DOCS-REVIEW: <id>: PASS` and `1. DOCS-REVIEW <id>: PASS` are not positives |
| AC3 | a `wrapperVersion` + `distributionUrl` bump passes (the replaced T-M1.7 test) and a `wrapperVersion`-only bump passes; another host, userinfo (`@evil.example`), another path, mismatched versions, a query, an added key, a removed key, a `distributionType` change, a renamed key, a non-semver version and a `-n` line fail and name the line; no diff fails closed |
| AC4 | `--dry-run 7` and `7 --dry-run` dry-run with no merge call; `""`, `--dry-run`, `7 --dryrun`, `7 21`, `abc`, `--force 7`, `07`, `7 --dry-run=1`, `-- 7` exit 2, print the usage and make no `gh` call (`calls.txt` empty) |
| AC5 | `gate-20260928T095641Z.log`: `ENGLMS_TASK=T-M1.12 ./scripts/gate.sh` **PASS (12 steps, 133 s)**, including every script suite (merge-gate 263/263, path-ownership 15, pre-push 15, gate 25, e2e-run 13, …); the negative demo; git-governance §4 and open-questions updated; CI and the gate's own dry run on the PR (see the PR) |

## Negative demo
`negative-old-gate.txt`: the new test file and `mock-gh` run against develop's `merge-gate.sh` (before T-M1.12): **206 passed, 57 failed**: every AC1–AC4 case that
changes behaviour fails there (e.g. the `FAILOVER` false refusal, the em-dash and `1.` negatives ignored, the wrapper content accepted, `7 --dry-run` merging).

## Notes
- The look-ahead `(?![A-Z0-9])` works on the local jq 1.8.2; CI runs the same tests with the runner's jq (`docs-check` job).
- `merge-gate.test.sh` now takes ~2 minutes locally (263 mocked gate runs).
