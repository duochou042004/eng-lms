# T-M2.24 summary: `students.spec.ts` split into eight spec files; the gate repeats the importers of a changed support file
Branch feature/T-M2.24-split-students-spec (from `develop` 50f73c4) · split `e020a0f`, gate rule `cc9853d` + `b8227e4`, docs `51b13d2`, red gate log `5d96ada`, green gate log and this summary: the next commit · trace T-M2.22 U3, DEC-158 PO-9, DEC-170 · 2026-11-13.

## Gate (G1)
- Run 1 (implementer) on `51b13d2`: `gate: FAIL at step 'e2e' (exit 1) after 311s`: every earlier step passed (backend and contract-drift
  skipped as path-aware); e2e default pass `1 failed / 31 skipped / 514 passed (4.6m)`: `students-list.spec.ts:207` "sign-out never asks"
  (laptop) only, so the ×3 repeat did not run. Log `evidence/T-M2.24/gate-20261113T170139Z.log` (trimmed from 2,141 to 215 lines). See OQ T-M2.24-1.
- Run 2 (LC, same code, head `5d96ada`): `gate: PASS (13 steps, 1003s)`; e2e default pass `515 passed, 31 skipped (4.4m)` (the ✘ is
  `guards.spec.ts:100`, an expected failure); the support rule's repeat: `gate: e2e repeat: tests/students-<each>.spec.ts imports
  e2e/support/students.ts` for all eight files, then `--repeat-each=3 --retries=0` on phone-small, tablet, laptop: `537 passed, 3 skipped (6.8m)`.
  Log `evidence/T-M2.24/gate-20261113T171410Z.log` (trimmed by the LC from 2,662 to 183 lines). This is the AC7 gate run.

## Self-check
- [x] Only the packet's scope 1–5: no test body, title, assertion, timeout, evidence name or tag changed; no `playwright.config.ts`, product code
      or CI workflow change; no dependency.
- [x] The split was generated mechanically (`split.mjs`, which asserts every non-blank old line is covered exactly once); comment-only edits:
      the `// ----` rule lines dropped, and the T-M2.5 comment's last sentence ("T-M2.14's tests follow at the end of the file.") dropped as no longer true.
- [x] Each new gate fixture seen failing (old `gate.sh`: 71 passed, 21 failed) or killed by a mutation (M1–M11).
- [x] Mutations reverted (`git status --short scripts` clean after); no mutation in place during check-docs or the gate.
- [x] `./scripts/check-docs.sh` bare before both docs commits; `./scripts/check-path-ownership.sh feature/T-M2.24-split-students-spec`: PASS (16 files).
- [x] Shortcut ledger: `grep -rnE '(shortcut|ponytail):' e2e scripts/gate.sh`: none.
- [x] A test failed in the gate that passed 9/9 in the ×3 run and whose block is byte-identical: not changed (L-10): OQ T-M2.24-1.

## AC → proof
| AC | Proof | Status |
|---|---|---|
| AC1 | `e2e/tests/students.spec.ts` deleted; the eight files hold their listed groups in the original order; 28 shared helpers in `e2e/support/students.ts`; 36 moved names each with exactly one definition (AC3 script); `pnpm typecheck` in `e2e/` clean (`noUnusedLocals`) | pass |
| AC2 | Below: `Total: 1092 tests in 10 files` → `in 17 files`; normalised lists 1,092 / 1,092 lines; `diff` empty (re-run by the LC) | pass |
| AC3 | Below: 17/17 blocks identical; 36/36 helpers identical apart from `export `; `test.use` ×1 → ×8 (one column-0 per file), `beforeEach` ×4 → ×4 inside their blocks; no other hooks | pass |
| AC4 | `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=3 --retries=0`: `93 skipped / 1545 passed (13.2m)`, 0 failed, exit 0 | pass |
| AC5 | `bash scripts/tests/gate.test.sh`: `-> 92 passed, 0 failed`; `scripts/tests/run-all.sh`: `script tests: PASS`; fixtures and mutations below | pass |
| AC6 | `git grep -n 'students\.spec\.ts' -- docs/05-frontend/ux-flows.md docs/04-backend/security.md`: none; F2 → `students-list`, F10 → `students-account`, F11 → `students-guardians`, F12 → `students-learning-profile`; security.md:36 → `students-list.spec.ts` AC7; the T-M2.28 row (a) → `students-list.spec.ts`; the T-M2.20, T-M2.22, T-M2.27, T-M2.24 rows untouched | pass |
| AC7 | Gate run 2 above (green); CI 7/7 (0 fast-path) on `6f66b5a` | pass |

## AC2 commands and output
    (cd e2e && pnpm exec playwright test --list) > list-before-raw.txt   # on the pre-change tree (git diff --quiet develop HEAD -- e2e)
    norm: grep -E '^  \[[^]]+\] › ' "$1" | sed -E 's/^  (\[[^]]+\]) › [^ ]+:[0-9]+:[0-9]+ › /\1 › /' | LC_ALL=C sort
    wc -l: list-before.txt 1092, list-after.txt 1092;  diff list-before.txt list-after.txt → (no output)

## AC3 script and output
The old side is `git show 50f73c4:e2e/tests/students.spec.ts` (`.claude/scratch/lc-records/T-M2.24/ac3.sh`, output `ac3-output.txt`).
- (i) each block from `test.describe('<title>', () => {` to the first `^})$`: 17 of 17 identical; describe lines 2,990 old, 2,990 new.
- (ii) each helper with its doc comment and continuation lines, leading `export ` stripped: 36 of 36 identical, one definition each.
- (iii) old `test.use` ×1, `test.beforeEach` ×4; new `test.use` ×8 (`test.use({ storageState: TUTOR_STATE })` at column 0, one per file),
  `test.beforeEach` ×4 (list, account, guardians, learning-profile; inside their blocks); sorted non-file-level hook lines identical; no
  `afterEach`, `beforeAll`, `afterAll`, `describe.configure`. Result line: `AC3: PASS`.

## Moved helpers and file-level code
- **`e2e/support/students.ts`** (exported, bodies and doc comments unchanged; 28): h1, shot (with its masking comment), token, Created, apiStudent,
  acceptStatus, wide, navItem, fullNameField, usernameField, accountRegion, toastRegion, box, profileStudent, studentSession, trySignIn,
  expectActionRow, expectToastPlacement, guardiansRegion, fictitiousGuardian, expectFieldsStacked, failRequests, lpRegion, lpEdit, lpForm,
  lpSave, tagGroup, apiProfile. Placement counts transitive use (`Created` only inside the module; `box`, `wide` also by module helpers).
- **One file each:** students-profile: watchDanglingAnnouncements; students-guardians: guardianNames, guardianWrites; students-learning-profile:
  lpRows, profileWrites, expectHeadingRow, NOT_ADDED_ROWS; students-polish: pasteInto.
- **Repeated file-level code:** `test.use({ storageState: TUTOR_STATE })` in all eight files; section comments moved with their groups (T-M2.14
  in profile and account; T-M2.19 in focus and ui-checks). `students-list` does not import `box` (a local `const box` shadows it; tsc confirms).

## Gate rule (scope 3)
`scripts/gate.sh`: `changed_files` passes `--no-renames` to both diffs; new `norm_path`, `resolve_ts` (exact, `.ts`, `.js`→`.ts`, `/index.ts`),
`import_specifiers` (file joined to one line; `from`, `import`, `import(` with either quote), `e2e_support_specs` (reverse import graph over
`e2e/tests` and `e2e/support`, breadth-first from each changed support file). The all-specs checks (support importing from `e2e/tests/`; a
specifier into `e2e/support/` resolving to nothing) run on every gate run with a spec or support change. One `e2e-run.sh --no-build …
--repeat-each=3 --retries=0` call with a `sort -u` list; a reason line per support-driven spec. Dry run on this branch: all eight new files ×3,
each "importing e2e/support/students.ts".

## Gate fixtures (scope 4) and proof
Cases in `scripts/tests/gate.test.sh`: one importer; multi-line import; `import type` (double quotes); `export * from` chain ("through mid.ts");
`.js` and `index` specifiers; `global-setup.ts` → all; deleted → all; renamed → all; non-`.ts` → all; unresolvable → all; support importing
from `e2e/tests/` (in the base) + an unrelated spec change → all; support + changed spec → both; support + its own changed importer → once;
dynamic `import(` across lines + side-effect `import '…'`; `tests/học viên.spec.ts`; no change → no repeat.
**Old gate** (`git show develop:scripts/gate.sh`): `-> 71 passed, 21 failed`, exit 1; every new case fails except "changed importer (once)" (M1 covers it).

| Mutation | Change | Fixtures that fail |
|---|---|---|
| M1 | `sort -u` → `sort` | "once" |
| M2 | drop `--no-renames` | "renamed" |
| M3 | direct importers only | the chain and its message |
| M4 | no `.js` mapping | 8 (incl. js/idx) |
| M5 | no `index.ts` | 8 (same reason) |
| M6 | no tests-import check | that case and its message |
| M7 | single-line named imports only | 6 (multi-line, type, chain, tests-import) |
| M8 | no unresolved check | that case and its message |
| M9 | no non-`.ts` check | its message |
| M10 | no deleted check | its message |
| M11 | `from`-only regex | the dynamic/side-effect case (91/1; passed every fixture before `b8227e4` added it) |

## Open questions
- **OQ T-M2.24-1 (LC ruling, DEC-171; T-M2.28 (f)):** `students-list.spec.ts:207` "Add student (F2) and the credentials
  card › AC6: … sign-out never asks" (laptop) failed once in gate run 1: after Log out on a fresh sign-in context the URL was
  `/login?next=%2Ftutor%2Fstudents%2Fnew`, not `/login`. The block is byte-identical to the old one (AC3) and passed 9/9 on laptop in the ×3 run,
  so it is not the split; likely a race where the signed-out guard's redirect (keeping `next`) beats the logout's own navigation (not diagnosed).
  Not changed (packet out of scope; L-10). The LC re-ran the gate once on the same code.

## Not checked
shellcheck (not installed); webkit/firefox/phone projects; the flake's root cause; a specifier that leaves the repo or a support import cycle (the
search keeps a visited set; no fixture).

## G3 cost (one row per round; DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope (full / delta) | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| 1 | docs-reviewer (fresh, adversarial) | `6f66b5a` | PASS | 0/0/1/4 | full | 80,018 | 9.4 | 0 | 0 |
| 1b | qa-evaluator (fresh; runtime part, DEC-171) | `6f66b5a` | PASS | 0/0/0/1 | full (AC4, live rule) | 43,298 | 13.0 | 0 (E2E ×3 11.4 min) | 0 |

Implementation: frontend-implementer 154,002 tokens, 35.2 min, 84 tool uses; LC gate run 2: 16.7 min.

Merged `90bbfe0` (PR #178, DEC-171); verdicts `DOCS-REVIEW T-M2.24: PASS` (`review/docs.md`) and `QA-VERDICT T-M2.24: PASS` (`qa/report.md`); S3-1 and S4-2 → T-M2.28 (g), OQ T-M2.24-1 → T-M2.28 (f).
