# T-M2.24: Split `students.spec.ts` into cohesive spec files; the gate repeats the importers of a changed support file

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`90bbfe0`, DEC-171) |
| Owner role | FE (`frontend-implementer`; the `gate.sh` change and its fixtures are in the same PR) |
| Branch | `feature/T-M2.24-split-students-spec` (from `develop`); this packet on `docs/T-M2.24-split-students-spec` |
| Depends on | T-M2.27 (`c5772f0`), T-M2.25 (`b3cd6fd`) and their records: merged |
| Estimate | 1 agent-day |
| Risk tier | **L** (E2E test code moved, no assertion change; one gate rule with fixtures; no product code, endpoint, UI or data change), but it changes the gate (PO-9), so G0 and G3 are **adversarial** fresh docs-reviewers that run the fixtures and mutate the new rule in a private clone (DEC-157), and G3 also re-runs the `--list` and assertion comparisons |
| Trace | T-M2.22 U3 (finding 3: the ×3 repeat replays all of `students.spec.ts` for a one-test change); DEC-158 PO-9; DEC-163 (order); DEC-131 (1) (the changed-spec repeat), test-strategy §1; coding-agent-rules §4.2, §4.5; lessons-learned L-01, L-03; DEC-170 (this packet's decisions) |

## Goal
`e2e/tests/students.spec.ts` (3,323 lines, 17 top-level groups) is repeated ×3 by the gate whenever any of its tests changes, which replays
every student test for a one-line change. It is split into one spec file per feature group with shared helpers under `e2e/support/`,
without changing what any test does. Because helpers then live outside `e2e/tests/`, the gate gains the rule the PO accepted: a change
to a file under `e2e/support/` repeats every spec that imports it, and all specs when the importers cannot be known.

## Scope
- In:
  1. **The split.** `e2e/tests/students.spec.ts` is replaced by these files (top-level `test.describe` titles kept verbatim, in their
     current order inside each file):
     - `students-list.spec.ts`: "Add student (F2) and the credentials card", "Students list", "Students table with realistic data (AC12 (t))",
       "Workspace page", "English UI (AC10)".
     - `students-profile.spec.ts`: "Edit profile (T-M2.14)".
     - `students-account.spec.ts`: "Account section (T-M2.14)", "Reset password (F10, T-M2.14)", "English UI (T-M2.14 AC10)".
     - `students-guardians.spec.ts`: "Guardians (T-M2.15)", "English UI (T-M2.15 AC9)".
     - `students-focus.spec.ts`: "Focus after an action removes or disables its own control (T-M2.19 AC4)".
     - `students-ui-checks.spec.ts`: "Motion tokens as rendered (T-M2.19 AC5)", "Long data (T-M2.19)".
     - `students-learning-profile.spec.ts`: "Learning profile (T-M2.17)", "English UI (T-M2.17 AC8)".
     - `students-polish.spec.ts`: "M2 polish (T-M2.20)".
     Any file-level code outside a `describe` (constants, `test.use`, `beforeEach`, comments that explain a group) moves with the groups that
     use it; a file-level hook or `test.use` that applied to all groups is repeated in every new file that needs it, and the summary lists each.
  2. **Shared helpers.** A helper used by two or more new files moves to `e2e/support/students.ts` (one module; exported, body unchanged);
     a helper used by one file moves into that file. No helper is duplicated. Comments that document a helper move with it.
  3. **The gate rule** (PO-9). `scripts/gate.sh` `e2e_repeat`: besides the new or changed specs, for each changed file under `e2e/support/`
     it adds every `e2e/tests/**/*.spec.ts` that imports it, directly or through other `e2e/support/` modules (the transitive closure).
     **Matching:** in each spec and support file, every relative specifier in `from\s*['"]<rel>['"]` (this catches the last line of a multi-line
     `import { … } from` and of `export … from`, with `import type` / `export type`), `import\s*['"]<rel>['"]` and `import\(\s*['"]<rel>['"]`,
     both quote styles. **Resolution** against the importer's directory (`moduleResolution: bundler`, `e2e/tsconfig.json`): the exact path,
     then `<rel>.ts`, then a `.js` ending mapped to `.ts`, then `<rel>/index.ts`. **All specs** (and the message says why) when the importers
     cannot be known: a changed support file that no spec reaches (e.g. `global-setup.ts`, named only as a string by the config); a deleted
     support file; a renamed one (`changed_files` gains `--no-renames`, so a rename shows its old path as deleted); a non-`.ts` file under
     `e2e/support/`; a relative specifier that lands in `e2e/support/` but resolves to no file; any support file that imports from `e2e/tests/` (checked on every gate run with a spec or support change, not only when that support file changed). The repeat stays one
     `e2e-run.sh --no-build … --repeat-each=3 --retries=0` call with the de-duplicated, sorted list; its message names why each support-driven
     spec is included.
  4. **Gate fixtures** in `scripts/tests/gate.test.sh` (its existing git-repo fixture style): a changed support file imported by one spec
     repeats exactly that spec; a multi-line import; `import type`; an `export … from` re-export chain (transitive importers); `.js` and
     `index` specifiers; `global-setup.ts` changed → all specs; a deleted support file → all specs; a renamed one → all specs; a non-`.ts` file
     → all specs; an unresolvable relative specifier → all specs; a support file importing from `e2e/tests/` → all specs; a changed support file
     plus a changed spec → both, once each; a spec with a space or Vietnamese letters in its name keeps working (`core.quotePath=false`); no
     support or spec change → no repeat (existing case). Each new
     case is shown failing against the old `gate.sh` or a mutation of the new rule (recorded).
  5. **Live references** to `e2e/tests/students.spec.ts` updated to the new file names: `docs/05-frontend/ux-flows.md` (F2, F10, F11, the
     learning-profile flow), `docs/04-backend/security.md` (line 36) and the T-M2.28 row in `docs/tasks/backlog.md`. Historical records
     (evidence, merged packets, the decision log, archived handoffs) are not edited; `docs/handoff/HANDOFF.md` and `next-session-prompt.md`
     are the LC's (records step).
- Out of scope (explicit):
  - Any change to a test body, title, assertion, expected value, timeout, `evidenceShot`/`evidenceRecord` name, or tag; any other spec file;
    `playwright.config.ts`; product code; CI workflows (`e2e-smoke` runs the whole suite and needs no change).
  - Fixing the T-M2.28 findings (the `phone` and engine failures; a script-test race found at the T-M2.25 records, added there as (e)).
  - Reducing the repeat count or repeating by title (U3 alternatives, not chosen).

## Guardrail answers (scope.md §6)
1. Trace: T-M2.22 U3, DEC-158 PO-9. 2. Drifts toward excluded scope? No. 3. Mandatory setup added? No. 4. Weekly use? Every gate run.
5. Hard-coded semantics? None.

## Design notes
- **Contradiction scan** (L-03): DEC-131 (1) says the gate repeats "the new or changed specs ×3": unchanged for specs; the support rule adds
  to it (PO-9). The kept assertions do not change (coding-agent-rules §4.2): AC2 and AC3 prove it mechanically. The evidence file names
  (`evidenceShot`/`evidenceRecord`) and the step logs named in ux-flows (`steps-f2`, `steps-f10`, `steps-f11`) keep their names.
- Parallelism: Playwright runs files in parallel (`fullyParallel: true`); tests already run in parallel inside a file, so no test may rely on
  another; no group uses `test.describe.configure` today. If the split makes a
  test fail that passed before, that is a hidden dependency: report it as an OQ, do not change the test (L-10).
- Shortcut ledger: `grep -rnE '(shortcut|ponytail):' e2e scripts/gate.sh`: none expected.

## Acceptance criteria
- AC1 (scope 1, 2): `students.spec.ts` is gone; the eight files above exist with the listed groups; shared helpers are in `e2e/support/students.ts`;
  no helper body is duplicated (a grep of each moved function name finds one definition).
- AC2: `pnpm exec playwright test --list` before and after: keep only the `[project] › …` lines (drop `Listing tests:` and `Total: …`), strip
  `<file>:<line>:<col> › ` to `[project] › <describe> › <title>`, sort; the two files are identical (`diff`), and both have 1,092 lines (default projects).
- AC3: no test changed: (i) each of the 17 top-level `test.describe(…)` blocks, from its opening line to its closing `})` at column 0, is
  byte-identical in the old file and in its new file (`diff` per block); (ii) each moved helper's body is identical apart from a leading `export `;
  (iii) the lines matching `test\.(use|beforeEach|afterEach|beforeAll|afterAll|describe\.configure)` give `test.use` ×8 (one file-level per new
  file, as line 33 today) and `beforeEach` ×4 (inside their blocks, as today). The comparison script and its output are in the summary.
- AC4: the full suite passes `--repeat-each=3 --retries=0` on `phone-small`, `tablet` and `laptop` (result line in the summary).
- AC5 (scope 3, 4): the gate rule as stated; every fixture case passes and each new one is shown failing against the old `gate.sh` or a mutation;
  `scripts/tests/run-all.sh` green.
- AC6 (scope 5): the live references name the new files: `git grep -n 'students\.spec\.ts' -- docs/05-frontend/ux-flows.md docs/04-backend/security.md`
  finds none, and the T-M2.28 backlog row no longer names the file (the done rows T-M2.20, T-M2.22, T-M2.27 and the T-M2.24 row keep their history).
- AC7: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept.

## Test plan
- Implementation: the move (AC1), the two mechanical comparisons (AC2, AC3), the suite ×3 (AC4), the gate fixtures and mutations (AC5), one gate.
- Independent review focus (adversarial docs-reviewers, G0 and G3): can a support change escape the repeat (re-exports, `import type`,
  `../support/x.js` or index specifiers, a support file importing a spec helper, a renamed file)? Does "all specs" trigger where it must?
  Did any assertion, title, hook or `test.use` get lost or applied to a group that did not have it? Rerun the AC2 and AC3 comparisons.

## Evidence required
- `evidence/T-M2.24/summary.md`: self-check list, the AC2 and AC3 comparison commands and outputs, the ×3 result line, the gate fixture and
  mutation results, the moved helpers and file-level code, the G3 cost table.
- One gate log on the final head (trimmed ≤ 300 lines) and green CI. G3: `DOCS-REVIEW T-M2.24: PASS`.

## Docs to update
- Scope 5; the DEC for this packet (DEC-170) and the merge DEC.

## Risks & assumptions
- A moved test may have relied on file-level state or order: the ×3 run (AC4) and the reviewers' focus cover it; any such case is an OQ.
- The first gate run on this branch repeats all eight new files ×3 (all are new): about the cost of today's `students.spec.ts` repeat.
- The support rule's "all specs" fallback costs a full ×3 run (about 15 min per project set); accepted by PO-9 ("unknown importer: all specs").

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
(cd e2e && pnpm exec playwright test --list) > before.txt   # on develop, then after on the branch; strip file:line:col; diff
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=3 --retries=0
bash scripts/tests/gate.test.sh; scripts/tests/run-all.sh
./scripts/gate.sh
```
