# DOCS-REVIEW T-M1.17 (PR #50)

Recorded by the LC from the fresh-context docs-reviewer's output (agents cannot write report files).

## Round 1 — head `d3ba78b` — PASS

Commands: `check-docs.sh` PASS; `merge-gate.test.sh` 319 passed (develop 311); `run-all.sh` green; real gh 2.102 `pr checks --json` exit 0 with an array while a
check was pending; probes for empty output and multiple JSON documents; temp file removed on pass and refuse paths. `shellcheck` not installed (optional).
AC1–AC4 met and tested. Bash: the `if ! var=$(…)` form is exempt from `set -e`; the only `trap` in the script; `mktemp` failure aborts (fail closed); no new pass path.
Trace DEC-084/085/086; scope limited to step 3.

| ID | Sev | Finding | Fix (LC, in-task, DEC-088 rule) |
|---|---|---|---|
| F1 | S3 | The summary claims a handoff note about `.claude/worktrees/` that does not exist | Line added to HANDOFF.md "Gotchas" |
| F2 | S4 | With empty stderr the message ends with a dangling colon | Shows `output: <start of stdout>` or `output: (empty)`; AC2 test asserts it |
| F3 | S4 | Missing assertions: API error not "missing"; exit 0 with empty output | Both added |
| F4 | S4 | Several JSON documents pass the type guard (cosmetic; still refused) | `jq -se 'length == 1 and (.[0] \| type == "array")'` + test |
| F5 | S4 | `progress.json` PR fields stale | `pr: "#50"`, status `in_review` |

Verdict line: `DOCS-REVIEW T-M1.17: PASS`

## Round 2 — delta `d3ba78b..4ee8f93` — PASS (merged as `077f4e4`)

`check-docs.sh` PASS; `run-all.sh` PASS (merge-gate 325 passed). F1–F5 verified: the HANDOFF line; `checks_why` fallback (quoting and `set -euo pipefail` safe);
the two new assertions; `jq -se` one-document check (empty → refused, invalid JSON → refused, the `{"x":1}` + array test would pass under the old `jq -e`);
bookkeeping consistent with develop after `bb6fbd5`.

| ID | Sev | Finding | Fix |
|---|---|---|---|
| D2-1 | S4 | The F5 row said `pr: 50`; progress.json holds `"#50"` | Row corrected (T-M1.18 PR) |
| D2-2 | S4 | HANDOFF header and next steps stale on develop (not caused by this PR) | HANDOFF refreshed in T-M1.18's PR |

Local gate at `4ee8f93`: PASS (12 steps, 280 s), `gate-20261004T030239Z.log`. Verdict line: `DOCS-REVIEW T-M1.17: PASS`
