# T-M1.17 evidence summary: merge-gate reports an unusable `gh pr checks --json`

Packet: `docs/tasks/T-M1.17-merge-gate-gh-version.md` · Branch `chore/T-M1.17-merge-gate-gh-version` (from `develop` `af5dd56`) · Implementer: LC.

## AC → proof
| AC | Proof |
|---|---|
| AC1 | `merge-gate-tests.log`: "T-M1.17 AC1" cases. A `checks.json.fail` fixture printing an old gh's `unknown flag: --json` → exit 1 with "cannot read the PR's checks with 'gh pr checks --json' (needs gh >= 2.101, development-setup §0): unknown flag: --json …" and no "is missing" line; an empty `.fail` (API error) → refused, shows `HTTP 502 for checks.json`. |
| AC2 | Same log, "T-M1.17 AC2": exit 0 with `{"message":"Bad credentials"}` → refused, the message shows the output (`output: {"message":…}`), no "is missing" line; empty output → `output: (empty)`; several JSON documents → refused (review F3, F4). |
| AC3 | Existing (a) check cases unchanged and green: 325 passed, 0 failed after the review fixes (319 at the first review) (develop's tests on develop's gate: 311 passed). |
| AC4 | development-setup §0 already states `gh` **≥ 2.101** (DEC-084); no change needed. The refusal message points to it. |
| Gate | `gate-20261004T024554Z.log`: `ENGLMS_TASK=T-M1.17 ./scripts/gate.sh` PASS (12 steps, 283 s). |

## Notes
- Verified on gh 2.102 (PR #49 with pending checks): `gh pr checks --json name,bucket` exits 0 with a JSON array, so a non-zero exit is a real error.
- The mock `gh` now routes `pr checks` through `serve`, so a `<fixture>.fail` file works for it too; a non-empty `.fail` file is printed as the error text.
- New helper `expect_output_not_contains` in `scripts/tests/lib.sh`.
- Found while running the gate: a subagent worktree under `.claude/worktrees/` makes `check-docs.sh` scan the worktree's copy of the docs (it failed on a
  DEC defined only on another branch). Removing the finished worktree fixed it; noted in HANDOFF.md "Gotchas" (review F1; not in this packet's scope).
- DOCS-REVIEW round 1 PASS with F1 (S3) and F2–F5 (S4), all fixed in-task (DEC-088 rule): the HANDOFF note, the output shown when gh prints no error, two more
  assertions (API error not "missing", empty output), one-document check (`jq -se`), `progress.json` PR fields. Record: `review/docs.md`.
