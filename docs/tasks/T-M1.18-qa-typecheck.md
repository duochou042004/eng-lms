# T-M1.18: `qa/` typecheck in the gate and CI

| Field | Value |
|---|---|
| Milestone | carried past M1 (not an M1 exit criterion, DEC-087) |
| Status | in_progress |
| Owner role | LC (harness scripts, CI) |
| Branch | `chore/T-M1.18-qa-typecheck` (from `develop`) |
| Depends on | T-M1.17 merged (DEC-086 order) |
| Estimate | ≤ 0.5 agent-day |
| Trace | DEC-087 (M1 G5 QA F-6: `qa/e2e/T-M1.13.spec.ts` had 3 type errors on develop, fixed on `qa/T-M1.16-m1-regression`), DEC-088; test-strategy (tests must not rot) |

## Goal
The independent QA suite (`qa/`) is typechecked by `./scripts/gate.sh` and by CI on every PR, so a change to shared types or helpers cannot break QA specs unnoticed.

## Scope
- In: a `qa-typecheck` step in `scripts/gate.sh` (`pnpm install --frozen-lockfile && pnpm typecheck` in `qa/`, after `contract-drift`, before `e2e`) and its
  stub test in `scripts/tests/gate.test.sh`; a "Typecheck the QA suite" step in the required `e2e-smoke` workflow; the same in the GitLab `web` job;
  ci-cd.md and development-setup.md say so.
- Out of scope: running the QA specs in CI or the gate (QA runs them in its own context, qa-protocol); changes to `qa/**` (qa/ branches own it); a new required
  check name (the step lives in the existing `e2e-smoke` job, so `scripts/required-checks.txt` is unchanged).

## Guardrail answers (scope.md §6)
1. Trace: DEC-087/088. 2. No product scope. 3. No new setup (pnpm and Node 24 already required). 4. Every gate run and PR. 5. No product semantics.

## Acceptance criteria
- AC1: `./scripts/gate.sh --list` shows `qa-typecheck` between `contract-drift` and `e2e`; the step runs `pnpm install --frozen-lockfile` and `pnpm typecheck` in
  `qa/`, and a failing typecheck fails the gate at that step (gate stub tests).
- AC2: The `e2e-smoke` workflow typechecks `qa/` (frozen lockfile) before the E2E run, so a type error in `qa/` turns the required check red; the GitLab `web` job
  does the same.
- AC3: ci-cd.md §1 (GitHub and GitLab tables) and development-setup's gate row list the step; `./scripts/gate.sh` is green on the branch.

## Test plan
- Implementation: `scripts/tests/gate.test.sh` (order, commands, `--from`), `scripts/tests/run-all.sh`, a real `pnpm typecheck` in `qa/` on develop's specs,
  the full gate; CI on the PR shows the new step green. A local negative check (a deliberate type error in a scratch copy of a `qa/` spec fails `pnpm typecheck`;
  not committed).
- Independent check: fresh DOCS-REVIEW (chore packet, quality-gates G3).

## Evidence required
- `evidence/T-M1.18/summary.md`, the gate log, the negative-check output.

## Docs to update
- `docs/07-operations/ci-cd.md`, `docs/07-operations/development-setup.md`, backlog row, `progress.json`.

## Risks & assumptions
- `qa/` installs add ~10 s to `e2e-smoke`; `@playwright/test` does not download browsers on install.

## Commands (reproducible)
```bash
source ~/.nvm/nvm.sh
(cd qa && pnpm install --frozen-lockfile && pnpm typecheck)
bash scripts/tests/gate.test.sh
./scripts/gate.sh
```
