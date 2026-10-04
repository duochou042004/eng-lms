# T-M1.18 evidence summary: `qa/` typecheck in the gate and CI

Packet: `docs/tasks/T-M1.18-qa-typecheck.md` · Branch `chore/T-M1.18-qa-typecheck` (from `develop` `077f4e4`) · Implementer: LC.

## AC → proof
| AC | Proof |
|---|---|
| AC1 | `scripts/gate.sh` step `qa-typecheck` between `contract-drift` and `e2e` (`(cd qa && pnpm install --frozen-lockfile && pnpm typecheck)`). `scripts/tests/gate.test.sh`: 34 passed (order incl. `qa-install qa-typecheck`, `--list` position, frozen lockfile, `--from`; a failing `qa-install` or `qa-typecheck` fails the gate at `qa-typecheck` and `e2e` does not run, review F1). `negative-check.txt`: a deliberate type error in a scratch copy of `qa/e2e/T-M1.13.spec.ts` makes `pnpm typecheck` exit 2; removed → exit 0 (not committed). |
| AC2 | `.github/workflows/e2e-smoke.yml` step "Typecheck the QA suite" (frozen lockfile) before the E2E run (required check `e2e-smoke`; CI on the PR); `.gitlab-ci.yml` `web` job runs the same after `contrast`. |
| AC3 | ci-cd.md §1 (GitHub `e2e-smoke` row, GitLab `web` row) and development-setup's gate row list the step. `gate-20261004T030829Z.log`: `ENGLMS_TASK=T-M1.18 ./scripts/gate.sh` PASS (13 steps, 277 s; `qa-typecheck` 2 s). |

## Notes
- The step reuses the existing `e2e-smoke` job, so `scripts/required-checks.txt` is unchanged.
- This PR also carries LC bookkeeping: the T-M1.17 merge record (DEC-090; review round 2 recorded, D2-1/D2-2 fixed), the T-M2.1 DOCS-REVIEW round 4 record (D5-1 deferred to the `ready` amendment), the refreshed HANDOFF and next-session prompt.
- DOCS-REVIEW round 1 PASS with F1/F2 (S3) and F3/F4 (S4), fixed in-task (DEC-088 rule). Record: `review/docs.md`.
