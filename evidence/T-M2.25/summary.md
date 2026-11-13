# T-M2.25 summary: the quality docs promise only what exists; local E2E on its own database per run
Branch chore/T-M2.25-quality-docs-truth (from `develop` e253c59) · code `148e84f`, docs `1123d27`, gate log `f192183` · trace DEC-158 (PO-3, PO-4, PO-6, PO-10), DEC-167 · 2026-11-13.

## Gate (G1)
`ENGLMS_TASK=T-M2.25 ./scripts/gate.sh` on `1123d27`: `gate: PASS (13 steps, 797s)`; backend 466 tests and `All coverage checks have been met.`; web-test 818 passed;
e2e `e2e-run: recreating the E2E database englms_e2e in englms-dev-db`, 515 passed, 31 skipped (4.3m); `gate: e2e repeat: no new or changed spec`.
Log: `evidence/T-M2.25/gate-20261113T125125Z.log` (trimmed from 4,798 to 210 lines: passing per-test lines, blank INFO lines, jsdom canvas notices, dist asset lines).

## Self-check
- [x] Only the packet's scope 1-7; no product code, endpoint, UI or data change; no dependency committed (web/package.json and web/pnpm-lock.yaml restored, node_modules reinstalled with `--frozen-lockfile`).
- [x] Each new check seen failing (JaCoCo mutation and 1.00 run; the old e2e-run.sh and 16 mutations; the manual-only rule on a `pull_request:` copy).
- [x] No JaCoCo package below the floor today; no real defect found (L-10: nothing to report).
- [x] The PO's dev database not purged, dropped or edited; read only with `SELECT count(*)`; the fresh run left `.data/e2e/tutor-password` untouched (mtime unchanged).
- [x] `scripts/required-checks.txt`, `scripts/ci-text-only.paths`, `scripts/ci-text-only.known-mentions`, `scripts/ci-scope.sh`, merge-gate unchanged.
- [x] Shortcut ledger: `grep -rnE '(shortcut|ponytail):' scripts e2e backend/pom.xml`: none.
- [x] Mutations and scratch edits reverted before each commit; `./scripts/check-docs.sh` bare before each commit.

## AC → proof
| AC | Proof | Status |
|---|---|---|
| AC1 | `backend/pom.xml` `check` execution (verify, after `report`). Today: `All coverage checks have been met.`, 466 tests, BUILD SUCCESS. Per package (line / branch): identity.internal.app 94.4 % / 81.7 %, identity.internal.domain 97.2 % / 92.9 %, students.internal.app 97.2 % / 97.3 %, students.internal.domain 93.8 % / 95.6 %. (i) `T25Uncovered` (30 uncovered `if`s) in students.internal.domain: `Rule violated for package com.englms.students.internal.domain: lines covered ratio is 0.60, but expected minimum is 0.80` and `branches covered ratio is 0.40, but expected minimum is 0.70`, BUILD FAILURE, exit 1; after removal `All coverage checks have been met.`, exit 0. (ii) both minimums 1.00: exit 1, violations named for `identity.internal.app`, `identity.internal.domain`, `students.internal.app`, `students.internal.domain` (all four) | pass |
| AC2 | Web line coverage (below) with its command; nothing committed | pass (≥ 80 %: no PO question) |
| AC3 | `scripts/e2e-run.sh`; `scripts/tests/e2e-run.test.sh` 79 passed, 0 failed; the fresh run and the gate (`recreating the E2E database englms_e2e`) | pass |
| AC4 | Every case passes; the old script and each mutation fail (table below); `scripts/tests/run-all.sh`: `script tests: PASS` (1,205 passed, 0 failed) | pass |
| AC5 | Fresh vs kept, the kept smoke run and the dev DB counts (below); `scripts/gate.sh` line 8 corrected | pass |
| AC6 | `.github/workflows/regression.yml`; `--list` identical; `workflow-warnings.test.sh` 10 passed; `ci-scope-workflows.test.sh` 89 passed, 0 failed, manual-only rule failing on the copies; `required-checks.txt`, `ci-text-only.paths` not in `git diff e253c59 --stat` | pass (first run on `develop` after the merge: LC records step) |
| AC7 | Doc lines below; the AC7 grep leaves only backup lines | pass |
| AC8 | Gate above; `./scripts/check-docs.sh`: `docs-check: PASS`; CI on the PR: LC | gate pass, CI pending |

## Commands run (in order)
    source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
    export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
    (cd backend && ./mvnw -B -ntp verify)        # base; (i) with T25Uncovered.java; (ii) minimums 1.00; after removal
    (cd e2e && pnpm exec playwright test --list | tail -1)                 # before and after the config change
    (cd e2e && E2E_ENGINES=all pnpm exec playwright test --list | tail -1)
    bash scripts/tests/ci-scope-workflows.test.sh; bash scripts/tests/workflow-warnings.test.sh; bash scripts/tests/ci-scope.test.sh
    bash scripts/tests/e2e-run.test.sh           # and once per mutation (.claude/scratch/lc-records/T-M2.25/mutate-e2e.py)
    (cd web && pnpm add -D @vitest/coverage-v8@5.1.0)                      # measurement only, reverted
    (cd web && pnpm exec vitest run --coverage --coverage.provider=v8 --coverage.reportOnFailure --coverage.reporter=text \
      --coverage.reporter=json-summary '--coverage.include=src/**/model/**' '--coverage.include=src/ui/**')
    ./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop                      # fresh database
    E2E_KEEP_DB=1 ./scripts/e2e-run.sh --no-build --project=phone-small --project=tablet --project=laptop tests/smoke.spec.ts
    podman exec englms-dev-db psql -U <dev user> -d <dev db> -tAc "select count(*) from app.student"   # and app.user_account, before/after
    scripts/tests/run-all.sh
    ./scripts/check-docs.sh
    ENGLMS_TASK=T-M2.25 ./scripts/gate.sh

## e2e-run.sh: each case seen failing (scripts/tests/e2e-run.test.sh, 79 checks)
| Mutation of `scripts/e2e-run.sh` | Result | First failing check |
|---|---|---|
| M0 the old script (`e253c59`) | 30 passed, 49 failed | with .env: drop, then create, as two statements after dev-up and before java |
| M1 the DROP statement removed | 2 failed | drop, then create, as two statements |
| M2 drop and create joined in one `-c` | 2 failed | drop, then create, as two statements |
| M3 the name pattern check removed | 12 failed | guard: refuses a quote |
| M4 the dev name removed from the deny list | 6 failed | guard: refuses the dev database name (ENGLMS_DEV_DB_NAME unset: englms) |
| M5 the `.env` URL database removed from the deny list | 3 failed | guard: refuses the database name in the .env URL |
| M6 postgres, template0, template1 removed | 9 failed | guard: refuses postgres |
| M7 the host/port check removed | 6 failed | guard: refuses a non-local URL host |
| M8 the inputs read after `.env` is sourced | 1 failed | .env inputs ignored: the default per-run database is recreated |
| M9 `${E2E_DB_NAME-…}` → `${E2E_DB_NAME:-…}` | 3 failed | guard: refuses an empty value |
| M10 the stop on a failed psql removed | 4 failed | a failing psql stops the run |
| M11 the E2E URL export removed | 2 failed | the app sees the E2E database URL and .data/e2e/fresh/ |
| M12 `E2E_DATA=.data/e2e/fresh` removed | 4 failed | the app sees the E2E database URL and .data/e2e/fresh/ (also: tutor-password byte-identical) |
| M13 the fresh `tutor-password`/`state/` removal removed | 1 failed | a fresh run removes fresh/tutor-password and fresh/state |
| M14 `E2E_KEEP_DB` ignored (always fresh) | 3 failed | E2E_KEEP_DB=1: no SQL |
| M15 dev-up moved before the guard | 13 failed | guard: …: before any engine call |
| M16 the `ENGLMS_DEV_DB_USER` identifier check removed | 3 failed | guard: refuses an ENGLMS_DEV_DB_USER that is not a plain identifier |

Guard cases (each: exit 1, a message, an empty call log, so no dev-up, engine or java call): `englms` with ENGLMS_DEV_DB_NAME unset, the `.env` URL
database, `postgres`, `template0`, `template1`, a quote, a `;`, a capital, an empty value, ENGLMS_DEV_DB_NAME from `.env`, a non-plain DB user, a non-local
host, another port. Not caught by a mutation: removing the `source scripts/lib/engine.sh` line (the test sets `ENGLMS_CONTAINER_ENGINE=podman` as the
packet prescribes); the real fresh run and the gate log show it (`engine: podman (…)` right before the recreate line).

## ci-scope-workflows.test.sh (the one changed existing test)
Old test on the new tree: `regression.yml: a workflow that is neither heavy nor always-full`, 84 passed, 1 failed. New test: 89 passed, 0 failed,
including `a manual-only workflow with pull_request: added` (fails, names "workflow_dispatch as its only trigger") and `a manual-only workflow with a
scope step` (fails, names "must not use the CI scope").

## Playwright --list
Without `E2E_ENGINES`, before and after: `Total: 1092 tests in 10 files`, full output byte-identical (`cmp`). With `E2E_ENGINES=all`:
`Total: 1104 tests in 10 files` (+6 `[firefox-smoke]`, +6 `[webkit-smoke]`, all `smoke.spec.ts`). Firefox and WebKit are not run on this device.

## Web coverage (measured once, 2026-11-13; `@vitest/coverage-v8` 5.1.0, v8 provider)
| Directory | Lines covered | Line % |
|---|---|---|
| `web/src/features/auth/model` (2 files) | 25 / 25 | 100.00 |
| `web/src/features/students/model` (12 files) | 232 / 232 | 100.00 |
| `web/src/ui` (72 files) | 269 / 269 | 100.00 |
| **Total** | 526 / 526 | **100.00** (statements 98.73 %, branches 95.61 %) |

Run: 68 files, 818 tests passed. Two earlier coverage runs, while `./mvnw verify` ran in parallel, each had one timing failure in a different test
(`StudentWriteSession.test.tsx` AC8, then `DevUiPage.test.tsx`, both `findByRole`). Each passes alone with coverage and in the plain full run
(818 passed): load, not a defect. The v8 line figure is lenient; statements and branches are the stricter figures.

## Fresh vs kept (scope 5)
| Run | Database | Result | Seconds |
|---|---|---|---|
| T-M2.27 gate e2e step (`evidence/T-M2.27/gate-20261113T092206Z.log`), first pass | kept dev DB | 515 passed, 31 skipped (4.3m) | 689 s for the step (two passes, incl. build) |
| `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop` | fresh `englms_e2e` | 515 passed, 31 skipped (4.4m), exit 0 | 299 s (incl. build) |
| This gate's e2e step | fresh `englms_e2e` | 515 passed, 31 skipped (4.3m) | 289 s (incl. build; no repeat pass) |
| `E2E_KEEP_DB=1 … --no-build … tests/smoke.spec.ts` | kept dev DB | 18 passed (11.9s), exit 0: signed in with the kept password | 25 s |

Dev DB (`app.student` / `app.user_account`, read-only `SELECT count(*)`): before 1314 / 1315, after the fresh run 1314 / 1315 (equal); after the kept
smoke run 1315 / 1316 (the kept run adds, as before). `englms_e2e` was left in place (293 students after the fresh run). `.data/e2e/tutor-password` mtime unchanged.

## Doc lines changed (scope 7)
- `docs/07-operations/ci-cd.md` §1: `backend` row (the floor in verify; was "no threshold yet"); `e2e-smoke` row ("e2e profile/seed endpoint arrives" → the service's empty database); `e2e-nightly` row → `regression` row (manual, what it runs, not required; PIT not wired).
- `docs/06-quality/test-strategy.md`: §1 mutation row (planned with the grading module: release + on demand), E2E row (the `regression` workflow); §2 the `seed-e2e`/`@Profile("e2e")` line → the per-run E2E database and CI's empty database; §5 backend floor enforced (packages and sub-packages), web floor measured (date, value), not enforced.
- `docs/06-quality/qa-protocol.md`: §2 step 1; the tooling lines (no seed endpoint or `e2e` profile; `QA_ENGINES=all` stays a `qa/` fact); §3 State (no e2e profile); §5 the G5 matrix (6 × Chromium plus Firefox and WebKit smoke through `regression`, plus one `E2E_KEEP_DB=1` run) and retention option (a).
- `docs/06-quality/quality-gates.md`: G0 packet-review line (PO-6: delta re-check only after S1/S2; the LC fixes and records S3/S4); G5 (the `regression` workflow plus one local `E2E_KEEP_DB=1` run on the large dev data set).
- `docs/05-frontend/responsive-standards.md`: "all six (nightly)" → the manually started `regression` workflow.
- `docs/07-operations/development-setup.md` §2: new "E2E database (T-M2.25)" paragraph (per-run database, `.data/e2e/fresh/`, the guard, `E2E_KEEP_DB`); the E2E tutor paragraph names the data folder; accumulation now only with `E2E_KEEP_DB=1`.
- `docs/09-harness/agent-roles.md`: "Run the app (dev/e2e profile)" → "(dev, or packaged by `scripts/e2e-run.sh`)".
- `scripts/gate.sh` line 8 (scope 5).

AC7 grep (`grep -rniE 'nightly|seed-e2e|e2e.?profile|three engines' docs/` minus archive, the decision log, tasks, evidence) leaves only backup lines:
`risk-register.md` R-05, `architecture-overview.md:32`, `non-functional-requirements.md` NFR-OPS-02, `spec-reconciliation.md` G-11, `assumptions.md` A-020,
`files-and-storage.md:63`, `runbooks.md` §2.

## Deviations & known limitations
- The guard runs before `dev-up.sh` (so before any engine call, including the container start); `.env` is therefore sourced before `dev-up.sh` now (it was after); dev-up reads `.env` itself either way.
- One check beyond the packet's list: `ENGLMS_DEV_DB_USER` must be a plain identifier (it is inserted into `OWNER`); tested (M16).
- No sub-package of `internal.app`/`internal.domain` exists today, so the `.*` includes are not exercised by any package yet.
- Not changed (outside the packet): `docs/03-architecture/tech-stack.md:136` ("no threshold yet"; the packet keeps tech-stack unchanged); `docs/handoff/HANDOFF.md:88` (the LC's); the purge advice in `e2e/support/global-setup.ts` ("dev database").

## AC9 fix round

G3 round 1 (DEC-168) findings F1–F5, fixed on 0130fcc; gate on that head: `gate: PASS (13 steps, 831s)` (`gate-20261113T134525Z.log`).

| Item | Change | Proof (new case failing first) |
|---|---|---|
| F1 | `ci-scope-workflows.test.sh`: the manual-only rule takes the whole `on:` block (up to the next non-blank, non-comment line at column 0), drops blank and comment lines and requires exactly `  workflow_dispatch:`; block form only (`on: workflow_dispatch` and `on: [workflow_dispatch]` are refused) | 4 new mutations (blank line before `pull_request:`, column-0 comment before `push:`, indented comment and blank line before `schedule:`, one-line form). With the old rule: 93 passed, 4 failed (blank-line and comment copies). Now: 97 passed, 0 failed |
| F2 | `e2e-run.sh` refuses a `.env` URL whose parameters set `PGHOST`, `PGPORT` or `PGDBNAME` (any case) and a `%` in the URL database name, before any engine call | 4 cases (`?PGDBNAME=`, `?pghost=`, `?PgPort=`, `dev%64ata`). Old script: 81 passed, 18 failed. Mutations: parameter check removed 12 failed, case-sensitive check 8 failed, `%` check removed 4 failed |
| F3 | the saved copies are `readonly`; a `.env` assignment prints `readonly variable` (bash 5.3) and the caller's value stays (ignored, never applied) | `.env` with `keep_db=1 db_name=englms_x keep_set=1 name_set=1`: still a fresh run recreating `englms_e2e`, the app gets its URL. Without `readonly`: 93 passed, 2 failed |
| F5 | the `unset` line stays; the java stub asserts `E2E_DB_NAME` and `E2E_KEEP_DB` from `.env` do not reach the app (a caller's `E2E_KEEP_DB=1` does) | without the `unset` line: 94 passed, 1 failed |
| F4 | `shortcut:` comment on the JaCoCo includes in `backend/pom.xml` (a misspelled include passes at the real floors; the 1.00 run is the only proof; upgrade to a permanent package check when an include is edited or a module is added) | comment only (no behaviour); the 1.00 run of AC1 (ii) is the proof |

`e2e-run.test.sh`: 99 passed, 0 failed. `run-all.sh`: `script tests: PASS`. `check-docs.sh`: PASS. Raw logs: `.claude/scratch/lc-records/T-M2.25/fix/`.
Implementer (fix round): 117,940 tokens, 1,339.6 s, 35 tool uses; one gate run (831 s).

### F2-bis (G3 delta re-check, LC fix)
The fresh delta reviewer (48,255 tokens, 176.7 s) closed F1, F3, F4, F5 and found F2 still open: pgjdbc maps `dbname=`, `host=`, `port=` (any case) onto
`PGDBNAME`/`PGHOST`/`PGPORT`, and `service=` can supply them. LC fix `5141d85`: the rule matches an optional `PG` prefix before `HOST`, `PORT`, `DBNAME` or `SERVICE` and `=`, after `?` or `&`, on the upper-cased
parameters; three new cases (`?dbname=devdata`, `?Host=db.example.org`, `?service=x`). `e2e-run.test.sh`: 109 passed, 0 failed; the previous head's
script: 96 passed, 13 failed. Gate on `5141d85`: `gate: PASS (13 steps, 836s)`, e2e 515 passed (`gate-20261113T140600Z.log`, trimmed to 268 lines).

## Reviews
- G3: `DOCS-REVIEW T-M2.25:` pending (fresh adversarial docs-reviewer).

## G3 cost (one row per round; DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope (full / delta) | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| 1 | docs-reviewer (fresh, adversarial) | `ef5f0a6` | CHANGES REQUESTED | 0/0/3/2 | full | 73,871 | 9.7 | 0 | 0 |
| 2 | docs-reviewer (fresh, adversarial) | `83e2296` | CHANGES REQUESTED | 0/0/1/0 | delta (F1–F3) | 48,255 | 2.9 | 1 (fix round) | 13.9 |
| 3 | docs-reviewer (fresh, adversarial) | `da37eed` | PASS | 0/0/0/1 | delta (F2-bis) | 30,874 | 1.5 | 0 | 0 |

## LC notes
- Implementer: one `general-purpose` subagent briefed by the LC (DEC-167 (6)): 211,315 tokens, 2,605.5 s (43.4 min), 109 tool uses; one gate run (797 s).
- Summary recorded by the LC from the implementer's returned text (the harness blocked the agent's write).


## Merge and first regression run
- Merged: PR #174, `b3cd6fd` (DEC-169); G3 round 3 `DOCS-REVIEW T-M2.25: PASS` (`review/docs.md`).
- First `regression` run 43444433118 on `b3cd6fd`: failure, 1,021 passed, 7 failed, 76 skipped (29.5 min): `phone` ×2, `webkit-smoke` ×4, `firefox-smoke` ×1 → T-M2.28.
