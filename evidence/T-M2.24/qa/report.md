# T-M2.24 QA report (G3 runtime part, one fresh qa-evaluator)

Head `6f66b5a`, PR #178. Agent: 43,298 tokens, 778.6 s. Recorded by the LC from the agent's returned text. The packet named a docs-reviewer
for G3 (`DOCS-REVIEW T-M2.24: PASS` on the same head); merge-gate's `feature/` path needs a `QA-VERDICT`, so the LC added this run for
the runtime checks the docs-reviewer did not perform (recorded in the merge DEC).

QA-VERDICT T-M2.24: PASS

**Mode:** QA, black-box runtime part. Nothing run in the gate itself; no commits; nothing written under `evidence/`. `git status --short`
clean at the end.

**1. AC4: E2E ×3 on phone-small, tablet and laptop (`--retries=0`)**
- `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=3 --retries=0`: `93 skipped / 1545 passed (11.4m)`, `playwright exit 0`; matches the implementer's counts.
- No failures. The only ✘ marks are 3 × `[laptop] guards.spec.ts:100` (designed to fail, counted as passed).
- OQ T-M2.24-1: `students-list.spec.ts:207` "… sign-out never asks" passed 9 of 9 (3 each on laptop, tablet, phone-small). With the
  implementer's 9/9 and gate run 2 it has failed once in about 21 laptop runs: intermittent, nothing ties it to the split; T-M2.28 (f).

**2. The new gate rule on the real repo**
- `evidence/T-M2.24/gate-20261113T171410Z.log` names all eight new files as importing `e2e/support/students.ts`, then one `e2e repeat x3` call with those files.
- Live: the gate's `changed_files`, `norm_path`, `resolve_ts`, `import_specifiers`, `e2e_support_specs` and `e2e_repeat` copied verbatim
  (the `e2e-run.sh` call replaced by `echo`); a one-line comment appended to `e2e/support/students.ts`; with `ENGLMS_GATE_BASE=HEAD` it
  printed 8 reason lines and one sorted repeat call with exactly those 8 files; against `origin/develop` the same 8 once each. Control
  (no edit, base `HEAD`): "no new or changed spec". Reverted; tree clean. (Run under zsh first: `mapfile: command not found`; `gate.sh`
  loads `require-bash.sh`, so the real gate is unaffected.)

**3. AC1 sanity:** `cd e2e && pnpm typecheck` exits 0; `students.spec.ts` gone; the eight files hold the packet's groups in order (list 5,
profile 1, account 3, guardians 2, focus 1, ui-checks 2, learning-profile 2, polish 1).

**4. Scope:** `git diff --stat 50f73c4..6f66b5a`: 19 files (three docs, `e2e/support/students.ts`, eight new specs and the deleted one,
T-M2.24 evidence, `progress.json`, `scripts/gate.sh`, `scripts/tests/gate.test.sh`); nothing under `backend/`, `web/src`, `.github/`,
no `playwright.config.ts`.

**Findings:** S1 none; S2 none; S3 none; S4: OQ T-M2.24-1 still open (0 of 9 here), already assigned to T-M2.28 (f).

**Not checked:** a manual walk (test code only; the 1,545 passing tests exercise those paths); a manual `SECRET-*` search; AC2/AC3,
`gate.test.sh` and the mutations (the docs-reviewer's); the full `./scripts/gate.sh`; CI; webkit, firefox, `phone`; gate-rule cases
other than one directly imported support file (they rest on the fixtures).
