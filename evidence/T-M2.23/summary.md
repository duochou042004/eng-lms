# T-M2.23 summary — CI runs the heavy jobs only where the diff can affect them (shadow mode)

Task packet: `docs/tasks/T-M2.23-ci-scope.md` · Branch: `chore/T-M2.23-ci-scope` · PR: see `progress.json` · Implementer: the LC ·
Decisions: DEC-158 (PO-1, PO-2), DEC-160 (packet), DEC-161 (start signal and rulings).

**State after this task: everything is built and nothing is skipped.** `scripts/ci-scope.mode` holds `shadow`. T-M2.26 switches it on.

## AC → proof

| AC | Proof |
|---|---|
| AC1 allow-list and diff | `scripts/ci-text-only.paths` (four lines; a test pins them); `scripts/tests/ci-scope.test.sh` section "AC1": the text-only and not-text-only inputs of the packet's AC1 list |
| AC2 switch (a) | the same suite, section "AC2": base `master`, `feature/T-y`, `develop2`, another event, one parent, wrong or empty head SHA, a depth-1 checkout, usage errors |
| AC3 switch (b) | the same suite, section "AC3": (b1) and (b2) pass; the `full` cases (commit shape, `before`, tree, `behind_by`, run and marker states, listing completeness, API errors, each not-green state) |
| AC4 workflows | `scripts/tests/ci-scope-workflows.test.sh`: the real workflows pass; 22 mutated copies fail, each for its rule; a new unlisted workflow fails |
| AC5 merge-gate | `scripts/tests/merge-gate.test.sh`, block "T-M2.23 AC5": 325 earlier assertions kept and passing, 77 new (402 in all) |
| AC6 standing check | `scripts/tests/check-docs.test.sh`, block "T-M2.23 AC6": 13 fixtures; `./scripts/check-docs.sh` passes on the real tree with `scripts/ci-text-only.known-mentions` (19 files) |
| AC7 shadow mode | `ci-scope.test.sh` section "AC7": 9 mode-file contents and a missing file; only `enforce` (with or without one final newline) passes a `fast-path` verdict through; the committed file holds `shadow` |
| AC8 offline replay | the table below |
| AC9 docs | ci-cd.md §1 (`docs-check` row), new §1.2, §2; git-governance §4; quality-gates G2, G4; the five workflow headers; `.claude/skills/evidence-and-handoff/SKILL.md` part C |
| AC10 gate and CI | `evidence/T-M2.23/gate-20261112T123056Z.log`: gate PASS on `2e855e0` (13 steps, 598 s; `scripts` 188 s, `web-test` 53 s, `e2e` 336 s with 31 skipped; `backend` and `contract-drift` skipped for this diff). The first full gate on this device. CI: see "G2 and the GitHub assumptions" |

## Constraint → fixture (each seen failing; T-M2.22 U2 constraints 1 to 9)

| # | Fixture that fails without the rule |
|---|---|
| 1 | workflow test: "a paths filter", "a job-level if:", "a matrix", "a second job without the wiring" |
| 2 | merge-gate: "a product PR with skipped markers", "a marker for another base (A-4)", "only text files but base master"; mutations G1, G2, G9, G10, G11 |
| 3 | ci-scope: "base master", "base feature/T-y", "base develop2"; mutation C5 |
| 4 | ci-scope AC1 table and AC7; workflow test: "continue-on-error on the scope step", "reversed polarity", "a heavy step without the condition", "an extra conjunct"; mutations C1 to C4, C7 |
| 5 | workflow test: "a group without the SHA for pushes" |
| 6 | ci-scope: "(b2) the first parent has no run / is queued / in progress / was cancelled / failed / was skipped / has only a pull_request run"; mutation C14 |
| 7 | check-docs: "a tracked symlink", "a tracked submodule", "a new web/ file that mentions docs/"; mutations D1 to D7 |
| 8 | ci-scope: "a compare API error (403)", "a runs API error (5xx)", "a jobs API error"; workflow test: "no actions: read", "fetch-depth 1" |
| 9 | merge-gate: "the scope line counts five fast-path checks", "1 full, 4 fast-path"; mutation G12 |

## Mutation run (each rule switched off once; the count is the cases that then fail; none survived)

Runner and raw output: LC scratch (`.claude/scratch/lc-records/T-M2.23-mutate.py`, git-ignored). 37 mutations, 37 caught.

| Mutation | Failing cases | First failing case |
|---|---|---|
| C1 control-character guard off | 1 | a newline in a path under docs/ (control character): verdict full (missing: verdict=full ) |
| C2 mode check off | 5 | a symlink added under docs/: verdict full (missing: verdict=full ) |
| C3 empty diff accepted | 2 | an empty diff: verdict full (missing: verdict=full ) |
| C4 allow-list check off | 54 | web/src/a.ts: verdict full (missing: verdict=full ) |
| C5 base check off (pr) | 3 | base master: verdict full (missing: verdict=full ) |
| C6 second-parent check off (pr) | 2 | a second parent that is not the event's head SHA: verdict full (missing: verdict=full ) |
| C7 mode always enforce | 9 | the default mode is shadow (missing: mode=shadow) |
| C8 ref check off (push) | 1 | a push to master: verdict full (missing: verdict=full ) |
| C9 before check off (push) | 2 | before is not HEAD^1 (a multi-commit push): verdict full (missing: verdict=full ) |
| C10 tree equality off (push) | 2 | a merge tree that differs from the second parent's: verdict full (missing: verdict=full ) |
| C11 behind check off (push) | 2 | the merged head 1 commit behind: verdict full (missing: verdict=full ) |
| C12 marker not required (b1) | 8 | (b1) the marker was skipped (a fast-path run): verdict full (missing: verdict=full ) |
| C13 run conclusion not required (b1) | 8 | (b1) the run failed: verdict full (missing: verdict=full ) |
| C14 green first parent not required (b2) | 18 | (b2) the first parent has no run: verdict full (missing: verdict=full ) |
| C15 listing completeness off | 2 | (b1) an incomplete run listing: verdict full (missing: verdict=full ) |
| C16 newest run not selected | 4 | (b1) an older run succeeded, the newest failed: verdict full (missing: verdict=full ) |
| C17 two-parent check off | 1 | three parents: verdict full (missing: verdict=full ) |
| G1 every PR text-only | 63 | T-M2.23: the scope line counts the five heavy checks as full (missing: merge-gate: scope full; checks: 5 full, |
| G2 base check off | 3 | T-M2.23: only text files but base master (G0 D-3) (expected exit 1, got 0) |
| G3 changedFiles equality off | 4 | T-M2.23: not text-only: a listing shorter than changedFiles (truncated) (expected exit 1, got 0) |
| G4 3,000 limit off | 2 | T-M2.23: not text-only: 3,000 files (expected exit 1, got 0) |
| G5 status rule off | 6 | T-M2.23: not text-only: status copied (expected exit 1, got 0) |
| G6 control-character rule off | 4 | T-M2.23: not text-only: a file name with a newline (bash and jq disagree on $, G0 D-15) (expected exit 1, got  |
| G7 previous_filename ignored | 2 | T-M2.23: not text-only: a rename from a path off the list (expected exit 1, got 0) |
| G8 job head SHA ignored | 2 | T-M2.23: a job for another head SHA (expected exit 1, got 0) |
| G9 skipped marker accepted | 41 | T-M2.23: a product PR with skipped markers (expected exit 1, got 0) |
| G10 missing marker accepted | 20 | T-M2.23: a marker for another base (a run from before a retarget, A-4) (expected exit 1, got 0) |
| G11 marker base ignored | 2 | T-M2.23: a marker for another base (a run from before a retarget, A-4) (expected exit 1, got 0) |
| G12 fast-path miscount | 4 | T-M2.23: the scope line counts the five heavy checks as full (missing: merge-gate: scope full; checks: 5 full, |
| D1 symlink check off | 3 | a tracked symlink fails (expected exit 1, got 0) |
| D1b submodule check off | 3 | a tracked submodule (gitlink) fails (expected exit 1, got 0) |
| D2 unknown mention accepted | 12 | a new web/ file that mentions docs/ fails (expected exit 1, got 0) |
| D3 count change accepted | 3 | a listed file that gains one more mentioning line fails (G0 D-6) (expected exit 1, got 0) |
| D4 token-set rule off | 2 | an allow-list line without a token set fails (the two cannot drift, G0 D-8) (expected exit 1, got 0) |
| D5 quoted-word tokens off | 3 | join(ROOT, 'docs', name) in a new e2e/ file fails (a path built from quoted parts, G0 D-7) (expected exit 1, g |
| D6 rotten entries accepted | 3 | a listed path that is not tracked fails (the list cannot rot) (expected exit 1, got 0) |
| D7 star allowed anywhere | 3 | '*' outside scripts/ fails (expected exit 1, got 0) |

## Offline replay (AC8): `./scripts/ci-scope.sh replay 60` on `origin/develop` at `c090d40`

For every merge the verdict was compared with `git diff --name-only M^1 M^2` filtered by the four patterns ("Off-list" below): the two
agree on all 60. No merge that changed a path off the list is called text-only.

- 60 merges: 23 text-only (all ours), 9 full of ours, 28 Dependabot (all full; 6 with an identical tree, 22 merged behind).
- The 17 task merges the T-M2.22 G0 reviewer replayed (#117 to #154, `develop` at `d5908fa`): 12 text-only (#118, #119, #122, #124,
  #125, #126, #137, #138, #139, #141, #153, #154), 4 full (#117, #123, #136, #140) and the docs PR #121 full (it changed
  `.github/pull_request_template.md`). This is the predicted result (AC8).

| Merge | PR | Verdict (a) | Tree vs head | Off-list files |
|---|---|---|---|---|
| `c090d40` | #157 `docs/T-M2.23-ci-scope` | text-only | same | 0 |
| `e9901dd` | #156 `docs/T-M2.22-po-decisions` | text-only | same | 0 |
| `c93d128` | #155 `docs/T-M2.22-qa-strategy-review` | text-only | same | 0 |
| `d5908fa` | #154 `docs/T-M2.22-qa-strategy-plan` | text-only | same | 0 |
| `b1a542f` | #153 `docs/T-M2.13-auth-shell-followups` | text-only | same | 0 |
| `d763086` | #141 `docs/T-M2.21-g3-records` | text-only | same | 0 |
| `d890aae` | #140 `chore/T-M2.21-records-checks` | full | same | 6 |
| `b34c0a6` | #139 `docs/T-M2.21-records-checks` | text-only | same | 0 |
| `995d047` | #138 `docs/T-M2.20-g3-records` | text-only | same | 0 |
| `b89ee92` | #137 `qa/T-M2.20` | text-only | same | 0 |
| `f3a77fa` | #136 `feature/T-M2.20-m2-polish` | full | same | 27 |
| `c53f2ec` | #126 `docs/T-M2.20-m2-polish` | text-only | same | 0 |
| `6217a67` | #125 `docs/T-M2.17-g3-records` | text-only | same | 0 |
| `17cf9ee` | #124 `qa/T-M2.17` | text-only | same | 0 |
| `ff1d2ec` | #123 `feature/T-M2.17-learning-profile` | full | same | 28 |
| `7e39a46` | #122 `docs/T-M2.17-learning-profile` | text-only | same | 0 |
| `502bf2f` | #121 `docs/T-M2.19-retrospective` | full | same | 7 |
| `3d434ca` | #119 `docs/T-M2.19-records` | text-only | same | 0 |
| `d78ea09` | #118 `qa/T-M2.19` | text-only | same | 0 |
| `d165a4e` | #117 `feature/T-M2.19-ui-checks` | full | same | 13 |
| `9052169` | #116 `docs/T-M2.19-ui-checks-packet` | full | same | 1 |
| `9b6922c` | #115 `qa/T-M2.15` | text-only | same | 0 |
| `30293f3` | #114 `docs/T-M2.15-records` | text-only | same | 0 |
| `9b9e133` | #112 `feature/T-M2.15-guardians` | full | same | 26 |
| `5dab35e` | #113 `docs/T-M2.18-quality-process` | full | same | 15 |
| `eeee2bd` | #111 `docs/T-M2.15-guardians-packet` | text-only | same | 0 |
| `ffd23ee` | #110 `chore/T-M2.14-merge-record` | text-only | same | 0 |
| `ee042b1` | #109 `qa/T-M2.14` | text-only | same | 0 |
| `6073e71` | #108 `feature/T-M2.14-student-profile-account` | full | same | 48 |
| `356a5c0` | #107 `docs/T-M2.14-student-profile-account` | text-only | same | 0 |
| `02b6c88` | #106 `chore/T-M2.5-merge-record` | text-only | same | 0 |
| `624a346` | #105 `qa/T-M2.5` | text-only | same | 0 |

## Commands
```bash
bash scripts/tests/ci-scope.test.sh            # 218 passed
bash scripts/tests/ci-scope-workflows.test.sh  # 47 passed
bash scripts/tests/merge-gate.test.sh          # 402 passed
bash scripts/tests/check-docs.test.sh          # 74 passed
./scripts/tests/run-all.sh                     # script tests: PASS
./scripts/ci-scope.sh replay 60
./scripts/check-docs.sh
```

## Deviations and rulings (DEC-161)
- `continue-on-error` is allowed only on `actions/upload-artifact` steps (packet AC4 against scope 4).
- `known-mentions` holds exact counts outside `scripts/` and `*` under `scripts/`.
- A workflow file that is neither heavy nor always-full fails the workflow test.
- The marker must appear exactly once in a job.

## Self-check
- [x] Every rule has a violating fixture and a mutation that the suite catches.
- [x] No existing script test or assertion removed or weakened (merge-gate: the 325 earlier assertions pass; their mock gained job markers).
- [x] `scripts/ci-scope.mode` is `shadow`; the allow-list is the four lines of DEC-160.
- [x] No product code, endpoint, UI or data change.
