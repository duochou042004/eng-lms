# T-M2.24 G3 docs review (tier L, one adversarial fresh docs-reviewer; DEC-170, DEC-171)

Recorded by the LC from the agent's returned text. The reviewer worked in private clones under `~/.cache` (deleted at the end); it made no
edits, commits, PR comments or files in the tree, and ran no Playwright E2E or `gate.sh`. The runtime part is in `../qa/report.md`.

## Round 1 (full, head `6f66b5a`; 80,018 tokens, 562.2 s): PASS

DOCS-REVIEW T-M2.24: PASS

**Checks run**
- `./scripts/check-docs.sh` in the clone: PASS.
- AC2 re-run: `playwright test --list` on `50f73c4` (`Total: 1092 tests in 10 files`) and on the head (`1092 tests in 17 files`); normalised
  as the packet says: 1,092 and 1,092 lines, `diff` empty; 182 tests per project across 6 projects; 360 student tests before and after.
- AC3 with the reviewer's own script against `git show 50f73c4:e2e/tests/students.spec.ts`: 17 of 17 top-level blocks byte-identical, each in
  the file the packet lists; 36 of 36 helpers identical apart from `export `, each defined once; no new top-level declarations or statements;
  `test.use({ storageState: TUTOR_STATE })` ×8 (column 0, one per file), `beforeEach` ×4 inside their "English UI" blocks; no other hooks;
  every file imports `test` and `expect` from `../support/fixtures`; `pnpm typecheck` clean.
- `bash scripts/tests/gate.test.sh`: 92 passed, 0 failed; `scripts/tests/run-all.sh`: `script tests: PASS`; the fixtures against
  `git show 50f73c4:scripts/gate.sh`: 71 passed, 21 failed.
- Scope: only the eight specs, `e2e/support/students.ts`, the deleted spec, `scripts/gate.sh`, `scripts/tests/gate.test.sh`, the three scope-5
  docs, evidence and `progress.json`; AC6 grep empty; shortcut ledger empty.
- Escape attempts (own harness from the head's `changed_files` … `e2e_repeat`, stubbed `e2e-run.sh`, throwaway repos): repeated exactly the
  importer for `export type … from` chains, `../support/x.js`, directory and `index.ts` specifiers, `./y`, `../../e2e/support/one`, explicit
  `.ts`, no-space imports, multi-line `import * as`, a subdirectory, a reachable cycle, a space and Vietnamese letters, a nested spec,
  delete and re-add, untracked files. All specs for an unreachable cycle, a template-literal or non-relative sole importer, `.mjs` and
  `.d.ts`, a staged delete, a rename, support importing from `e2e/tests/`, an unresolved support specifier, a helper only `global-setup.ts`
  imports. Real tree: `auth.ts` → 16 specs, `fixtures.ts` → 17, `students.ts` → the 8 new files, `global-setup.ts` → all; no false "all";
  the graph builds in about 0.8 s.

**Findings**
- **S3-1** (`scripts/gate.sh:83-86`, `scripts/tests/gate.test.sh:217-220`): moving `found=1` above the spec filter survives all 92 fixtures.
  Repro: base `e2e/support/gs-helper.ts` imported only by `global-setup.ts`; change it: head → all specs ("imported by no spec"); mutant →
  "no new or changed spec" (fail-open). The code is right today; the proof is missing (coding-agent-rules §4.5). → T-M2.28 (g) (DEC-171).
- **S4-1:** other surviving mutations fail safe or are dormant: the exact-path candidate in `resolve_ts` (`:52`), the unresolved check
  limited to spec importers (`:69`), `${r:-$p}` → `$r` (`:68`), `find -maxdepth 1` in the fallback (`:107`). Optional cases. Recorded.
- **S4-2** (`gate.sh:58-90`): a changed `auth.ts` repeats its 16 importers but not `checks.spec.ts`, although `global-setup.ts` imports it;
  literal compliance with the packet; follow-up: a BFS reaching `global-setup.ts` → all specs. → T-M2.28 (g).
- **S4-3:** not watched (outside the packet): a non-spec `.ts` under `e2e/tests/`; `e2e/` files outside `support/` and `tests/`; a symlinked
  support file; a second importer using a template literal or `import x = require(…)` beside a normal one. Recorded.
- **S4-4:** OQ T-M2.24-1 is consistent with L-10 (byte-identical block, OQ, not changed, ruled before G3, re-run documented); the records must
  add the DEC and T-M2.28 (f): done in DEC-171.

**Not checked:** AC4, the AC7 gate run and CI (by instruction); the flake's root cause; shellcheck; other bash versions; webkit and firefox.
