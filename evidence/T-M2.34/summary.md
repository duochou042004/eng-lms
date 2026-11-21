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
PR #219 on `b44f424`, all 7 checks green. Each job's "Set up job" log: `Image: ubuntu-26.04`, `Version: 20261111.635`.
Baseline: the last full `develop` push run on `ubuntu-24.04` (`d41926a`, 2026-11-21; job wall time).

| Job | Run ID (26.04) | Image line | Duration 26.04 | Duration 24.04 (`d41926a`) |
|---|---|---|---|---|
| backend | 44887387609 | ubuntu-26.04 20261111.635 | 4m35s | 4m01s |
| container-build | 44887387577 | ubuntu-26.04 20261111.635 | 1m19s | 1m14s |
| contract-drift | 44887387676 | ubuntu-26.04 20261111.635 | 59s | 59s |
| docs-check | 44887387626 | ubuntu-26.04 20261111.635 | 3m31s | 2m56s |
| e2e-smoke | 44887387642 | ubuntu-26.04 20261111.635 | 16m58s | 14m55s |
| secrets-scan | 44887387606 | ubuntu-26.04 20261111.635 | 11s | 14s |
| web | 44887387592 | ubuntu-26.04 20261111.635 | 2m02s | 1m59s |

Docker 29 / Testcontainers (`backend`) and the Chromium sandbox (`e2e-smoke`) needed no change. `e2e-smoke` took ~2 min longer
(one run each; not a trend). The 8c7691c `develop` push hit the known Maven Central flake (`maven-jar-plugin:3.5.1`) on 24.04 and was rerun.

## AC4: one regression run (PO choice (a))
Run [44888854717](https://github.com/duochou042004/eng-lms/actions/runs/44888854717) (`gh workflow run regression.yml --ref chore/T-M2.34-ci-ubuntu-2604`),
head `b44f424`, `Image: ubuntu-26.04`, `Version: 20261111.635`: **success**, job 09:17:19Z–09:43:46Z (26m27s; Playwright 24.1m).
Playwright: `1062 passed`, `156 skipped`, no failed or flaky test; `[webkit-smoke]` 6 of 6 passed (`playwright install --with-deps webkit`
worked on 26.04). Diagnostics: `kernel OOM lines: 0`; `memory: 15700 MB total, peak used 3065 MB, minimum free 7106 MB`.
One run, as capped (PO choice (a)).

## AC5: docs and gate
- `docs/07-operations/ci-cd.md` §1 names the runner label (`ubuntu-26.04`, DEC-187).
- `./scripts/check-docs.sh`: PASS.
- `./scripts/gate.sh` once on `b44f424` (the last code change; later commits are evidence only): `gate: PASS (13 steps, 557s)`; backend and
  contract-drift skipped locally (no `backend/` or `api/` change; CI ran both on 26.04). Log: [gate.log](gate.log) (93 lines, every `gate:` line).

## G3 cost (tier L, docs review)
Added in the records PR (the reviewed head stayed final). Tokens and durations from the Agent results; a resumed reviewer reports cumulative
tokens, so a confirmation round's cost is the delta.

| Round | Reviewer | Head | Verdict | Findings | Scope | Tokens | Duration | Gate runs |
|---|---|---|---|---|---|---|---|---|
| G0 round 1 | docs-reviewer (fresh) | `0e6217a` | PASS WITH MINOR | S3 ×2, S4 ×7 | full | 44,061 | 93 s | 0 |
| G0 confirmation | same | `b624169` | PASS | none | delta | 9,581 (53,642 cumulative) | 20 s | 0 |
| G3 round 1 | docs-reviewer (fresh) | `1137ab0` | PASS WITH MINOR | S4 ×2 | full | 32,628 | 106 s | 0 |
| G3 confirmation | same | `1137ab0` | PASS | none | delta | 1,496 (34,124 cumulative) | 14 s | 0 |

LC gate: 1 run (557 s, `b44f424`). Regression: 1 run (26m27s, PO choice (a)). Merge: PR #219 → `c5ae729` (merge-gate: scope full; checks: 5 full,
0 fast-path), DEC-189. Review records: [g0-docs.md](review/g0-docs.md), [g3-docs.md](review/g3-docs.md).
