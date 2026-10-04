# T-M1.17: merge-gate reports an unusable `gh pr checks --json` instead of missing checks

| Field | Value |
|---|---|
| Milestone | carried past M1 (not an M1 exit criterion, DEC-085) |
| Status | in_progress |
| Owner role | LC (harness script) |
| Branch | `chore/T-M1.17-merge-gate-gh-version` (from `develop`) |
| Depends on | T-M1.16 merged (`1dbd7e3`) |
| Estimate | ≤ 0.5 agent-day |
| Trace | DEC-084 (review R2-1: Ubuntu's `gh` 2.46.0 made merge-gate report every required check as missing), DEC-085, DEC-086 (PO: first of the carried items); git-governance §4 |

## Goal
When `gh pr checks <pr> --json name,bucket` cannot run (a `gh` too old for `--json`, an API or auth error, output that is not a JSON array), merge-gate refuses
the merge with a message that names the real cause and the needed `gh`, instead of hiding the error (`2>/dev/null || true`) and listing every required check as "missing".

## Scope
- In: step 3 of `scripts/merge-gate.sh`; `scripts/tests/mock-gh` (the checks call honours `<fixture>.fail`); tests in `scripts/tests/merge-gate.test.sh`;
  development-setup §0 re-checked for the needed `gh` version.
- Out of scope: any other merge-gate step or rule; a separate `gh --version` parser (the command's own failure is the signal: `--json` on `gh pr checks` exits 0 with
  JSON even while checks are pending or failing, checked with gh 2.102 on PR #49); installing or upgrading `gh` (PO, DEC-084).

## Guardrail answers (scope.md §6)
1. Trace: DEC-084/085/086. 2. No product scope. 3. No new setup. 4. Used on every merge. 5. No product semantics.

## Acceptance criteria
- AC1: When `gh pr checks --json` exits non-zero, merge-gate refuses (exit 1) with one problem line that says the checks could not be read, names
  `gh ≥ 2.101` (development-setup §0) and includes the start of `gh`'s error text; it does **not** report the required checks as missing.
- AC2: When the command exits 0 but its output is not a JSON array, merge-gate refuses the same way (fail closed).
- AC3: The existing check outcomes are unchanged (pass, fail, pending, missing, non-passing extra checks); all existing merge-gate tests stay green.
- AC4: development-setup §0 states the `gh` version merge-gate needs (≥ 2.101, DEC-084), and merge-gate's message points there.

## Test plan
- Implementation: mocked `gh` cases for AC1 (`checks.json.fail` with an "unknown flag: --json" message, as an old `gh` prints) and AC2 (non-array output);
  the suite `scripts/tests/run-all.sh`; `./scripts/gate.sh`.
- Independent check: fresh DOCS-REVIEW (chore packet, quality-gates G3); the reviewer runs the merge-gate tests.

## Evidence required
- `evidence/T-M1.17/summary.md` (commands, results), `evidence/T-M1.17/review/docs.md` (the review text, recorded by the LC).

## Docs to update
- `docs/07-operations/development-setup.md` §0 (only if AC4 needs it), backlog row, `progress.json`.

## Risks & assumptions
- A future `gh` could exit non-zero with valid JSON for pending checks; then the gate refuses loudly (safe direction) and this step needs a follow-up.

## Commands (reproducible)
```bash
bash scripts/tests/merge-gate.test.sh
./scripts/gate.sh
```
