# T-M2.34 summary: CI runners ubuntu-24.04 → ubuntu-26.04

Branch `chore/T-M2.34-ci-ubuntu-2604` (from `develop` @ `8c7691c`). Packet: [T-M2.34](../../docs/tasks/T-M2.34-ci-ubuntu-2604.md).
PO start signal 2026-11-21 with regression choice **(a) one run** (packet Design notes, AC4).

## AC1: the change
`git diff origin/develop --stat -- .github/workflows`: 8 files, 8 insertions, 8 deletions (one `runs-on` line each).
`grep -rn ubuntu-24.04 .github scripts` after the change: no match.

## AC2: fixture proof (red, then green)
- Red: after the workflow `sed`, before the fixture update, `bash scripts/tests/ci-scope-workflows.test.sh` → exit 1, `91 passed, 3 failed`:
  - `FAIL - constraint 1: a job-level if: (mutation not applied)`
  - `FAIL - a matrix (mutation not applied)`
  - `FAIL - a quoted job-level if (mutation not applied)`
- Green: after `sed -i 's/runs-on: ubuntu-24.04/runs-on: ubuntu-26.04/g' scripts/tests/ci-scope-workflows.test.sh` → exit 0, `97 passed, 0 failed`.
- `scripts/tests/run-all.sh`: `script tests: PASS`.

## AC3: CI on ubuntu-26.04
AC3_PENDING

## AC4: one regression run (PO choice (a))
AC4_PENDING

## AC5: docs and gate
- `docs/07-operations/ci-cd.md` §1 names the runner label (`ubuntu-26.04`, DEC-187).
- `./scripts/check-docs.sh`: PASS.
- `./scripts/gate.sh` once on the final head: GATE_PENDING

## G3 cost (tier L, docs review)
G3_PENDING
