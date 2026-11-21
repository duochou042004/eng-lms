# T-M2.34: CI runners ubuntu-24.04 → ubuntu-26.04

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`c5ae729`, DEC-189) |
| Owner role | LC (chore; the LC edits, a fresh docs-reviewer at G3) |
| Branch | `chore/T-M2.34-ci-ubuntu-2604` (from `develop`) |
| Depends on | T-M2.16 (merged, `edaa7bb`, DEC-188) |
| Estimate | ≤ 0.25 agent-day |
| Risk tier | **L**: CI configuration and one script test only; no product code, no SEC trigger (quality-gates G3: docs, chore, scripts). Docs review at G3 |
| Trace | PO approval (chat 2026-11-20) and PO order (DEC-187 (1)); GitHub runner notice (actions/runner-images#14747 GA 2026-09-17, #14748 `ubuntu-latest` migration 2026-10-19..11-19); coding-agent-rules §4.5 (a changed check seen red); lessons L-01, L-08; DEC-158 PO-1/PO-2 (merge assurance unchanged) |

## Goal
Every GitHub Actions job runs on the current Ubuntu LTS runner image, `ubuntu-26.04`, instead of `ubuntu-24.04`, with the same jobs, steps,
scope rules and merge gate, so CI keeps tracking the image GitHub maintains longest. Nothing else in CI changes.

## Scope
- In:
  1. `runs-on: ubuntu-24.04` → `runs-on: ubuntu-26.04` in the 8 workflows: `.github/workflows/backend.yml`, `container.yml`, `contract-drift.yml`,
     `docs-check.yml`, `e2e-smoke.yml`, `regression.yml`, `secrets-scan.yml`, `web.yml` (one line each, nothing else in those files).
  2. `scripts/tests/ci-scope-workflows.test.sh`: its fixtures (lines 129–131, 159) name the literal `runs-on: ubuntu-24.04` line; they are updated
     to `ubuntu-26.04`. The `.replace()` mutations at 129, 130 and 159 must match the workflow text: a stale one fails as "mutation not applied"
     (the harness fails closed, L-01), so the fixtures must follow the workflows; 131 (an appended second job) changes only for consistency.
  3. `docs/07-operations/ci-cd.md`: one sentence naming the runner label (`ubuntu-26.04`, DEC-187) in §1 "Workflows and required checks".
- Verification on the new image (AC3): every job of the PR's CI runs green and its "Set up job" log names the `ubuntu-26.04` image.

## Out of scope (explicit)
- Action version bumps (`uses:` SHAs), Java/Node/pnpm/Playwright versions, job steps, the scope classifier (`scripts/ci-scope.sh`), the text-only
  allow-list (never widened), merge-gate and its required checks: unchanged.
- `ubuntu-latest` or an Arm runner; GitLab CI (paused, DEC-107).
- Fixing a test that newly fails on 26.04 for a reason in our code: an OQ (L-10) for the LC to rule before G3, not a silent change here; a runner-only
  failure we cannot fix in configuration means rollback (Risks).
- Historical evidence and DECs that name `ubuntu-24.04` (T-M2.30 run logs): records of their time, unchanged.

## Guardrail answers (scope.md §6)
1. Trace: PO approval, DEC-187. 2. Drift toward excluded scope: no. 3. Mandatory set-up: none. 4. Weekly use: every PR's CI. 5. Hard-coded
semantics: none.

## Design notes
- **Touched:** the 8 workflow files (one line each), `scripts/tests/ci-scope-workflows.test.sh` (fixture strings), `docs/07-operations/ci-cd.md`.
  `check-path-ownership.sh` allows workflow files on `chore/` branches; merge-gate on `chore/` needs `DOCS-REVIEW T-M2.34: PASS`, `LC-APPROVED T-M2.34` and `progress.json` changed in the PR.
- **Known image differences** (GitHub notice, DEC-187): Docker 28.0.4 → 29.x with the containerd image store by default (user report #15330);
  Testcontainers here is **2.0.5** (Spring Boot 4.1.2 BOM via the `backend/pom.xml` parent), which supports Docker 29's minimum API version, so `backend` should work unchanged.
  AppArmor restricts unprivileged user namespaces (user report, `unpriv_bwrap`): Chromium's sandbox in `e2e-smoke` (`playwright install --with-deps
  chromium`) is the job to watch. Default Java 25, Node 24, PostgreSQL 18 are preinstalled; our jobs install their own (`setup-java`, `setup-node`,
  Testcontainers `postgres:18`), so the defaults do not matter.
- **The `regression` workflow** (manual, ~25–30 min; Chromium 6 viewports + WebKit smoke) is not triggered by a PR, so the PR's CI cannot show it on
  26.04 (`playwright install --with-deps webkit` on a new distro is its main risk). **PO decision at the start signal:** (a) one `regression` run on
  the branch before merge (~30–40 min of PO time; recommended, so a WebKit failure is found here, not at T-M2.7's G5), or (b) no run here: T-M2.7's
  G5 run is the first on 26.04 and a runner-caused failure there reverts `regression.yml` alone to `ubuntu-24.04`. The cap is **one** run either way. Under (b) the LC adds that clause to the T-M2.7
  backlog row (first `regression` run on 26.04; a runner-caused failure → `regression.yml` back to `ubuntu-24.04`).
- **Contradiction scan (L-03):** grep for `ubuntu-24.04` outside historical records finds only the 8 workflows and the script-test fixtures,
  plus records and plans naming this task (DEC-187, HANDOFF, next-session prompt, backlog, progress.json, this packet; unchanged);
  `docs/07-operations/development-setup.md:186` ("the Ubuntu runner's Docker") stays true; no kept E2E or unit assertion names the runner.
  `grep -rnE '(shortcut|ponytail):'` in the touched files: none.

## Acceptance criteria
- AC1: the 8 workflows say `runs-on: ubuntu-26.04` and differ from `develop` only in that line (`git diff origin/develop -- .github/workflows`
  shows 8 one-line changes); no other `ubuntu-24.04` remains under `.github/` or `scripts/`.
- AC2: red first: after the workflow `sed` and before the fixture update, `scripts/tests/ci-scope-workflows.test.sh` fails with exactly 3
  `mutation not applied` FAILs (the fixtures at lines 129, 130, 159); after the fixture update it passes; the summary records both runs. `scripts/tests/run-all.sh` passes.
- AC3: the PR's CI is green on the final head, every job (7 checks) on `ubuntu-26.04`: the summary lists each job's "Set up job" image line
  (`gh run view <id> --log` → `Image: ubuntu-26.04`, image version) and its duration next to the last `develop` run on 24.04.
- AC4 (only if the PO chooses (a)): one `gh workflow run regression.yml --ref chore/T-M2.34-ci-ubuntu-2604` passes on `ubuntu-26.04`; the summary
  records its run ID, image line and result. A failure is reported to the PO with its log before any second run.
- AC5: `docs/07-operations/ci-cd.md` names the runner label; `./scripts/check-docs.sh` passes; `./scripts/gate.sh` green once on the final head.

## Test plan
- Local: `scripts/tests/ci-scope-workflows.test.sh` (pass, and red with one stale fixture), `scripts/tests/run-all.sh`, `./scripts/gate.sh` once.
- CI: the PR's 7 checks on 26.04 (AC3); the optional regression run (AC4).
- Independent review (tier L): a fresh docs-reviewer checks the diff is exactly the scope, the fixture proof, the image lines and the records.

## Evidence required
- `evidence/T-M2.34/summary.md`: the AC2 red/green runs, the AC3 table (job, run ID, image line, duration on 26.04 vs 24.04), AC4 if run, the G3 cost
  table; one gate log on the final head (trimmed ≤ 300 lines, every `gate:` line kept) + green CI.

## Docs to update
- `docs/07-operations/ci-cd.md` (AC5). No ADR change (a runner label is CI configuration).

## Risks & assumptions
- Risk: a job fails on 26.04 for a runner reason (Docker 29, AppArmor/Chromium sandbox, WebKit deps). Mitigation: read the log; any configuration change
  beyond the `runs-on` line is an OQ to the LC/PO (L-10); otherwise **rollback** = that workflow back to
  `ubuntu-24.04` (the notice's own mitigation), recorded in the merge DEC with the failing run. A rollback of any
  workflow is reported to the PO, and the merge DEC amends AC1/AC3 to list the rolled-back workflows; without that ruling the task stays open.
- Risk: CI flakes unrelated to the image (Maven Central 403/429, artifact resolution): `gh run rerun <id> --failed` once, as today.
- Assumption: `ubuntu-24.04` stays available (no removal date announced), so a rollback is always possible.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
sed -i 's/runs-on: ubuntu-24.04/runs-on: ubuntu-26.04/' .github/workflows/*.yml
bash scripts/tests/ci-scope-workflows.test.sh   # red: 3 x 'mutation not applied' (AC2)
sed -i 's/runs-on: ubuntu-24.04/runs-on: ubuntu-26.04/g' scripts/tests/ci-scope-workflows.test.sh
bash scripts/tests/ci-scope-workflows.test.sh   # green
bash scripts/tests/run-all.sh
./scripts/gate.sh
gh run view <run-id> --log | grep -m1 -A1 'Image:'
```
