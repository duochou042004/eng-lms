# T-M2.25: The quality docs promise only what exists; local E2E on its own database per run

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready |
| Owner role | LC (the LC briefs one implementer subagent at a time on the branch; the LC reviews, commits records and merges) |
| Branch | `chore/T-M2.25-quality-docs-truth` (from `develop`); this packet on `docs/T-M2.25-quality-docs-truth` |
| Depends on | T-M2.27 (`c5772f0`) and its records: merged |
| Estimate | 1.5 agent-days |
| Risk tier | **L** (build config, scripts, one manual workflow, tests and docs; no product code, endpoint, UI or data change), but it changes gate and CI tooling (the backend build gains a failing check, `e2e-run.sh` changes the database the local gate uses), so G0 and G3 are **adversarial** fresh docs-reviewers that run the new tests and mutate each new check in a private clone (T-M2.22 rule, DEC-157) |
| Trace | T-M2.22 U4 and U8 (a), its "What is promised but missing" table; DEC-158 PO-3 (the docs promise only what exists; the narrower G5 matrix), PO-4 (option (a)), PO-6 (G0 delta re-check only for S1/S2), PO-10 (local E2E on its own database, supersedes DEC-139 (3)); DEC-163 (order); test-strategy §2, §5; ci-cd §1; qa-protocol §2, §5; quality-gates G0, G5; responsive-standards; lessons-learned L-01; coding-agent-rules §4.5, §8; DEC-167 (this packet's decisions) |

## Goal
The quality docs describe a nightly lane, PIT "nightly", a `scripts/seed-e2e` reset, an `e2e` profile, enforced coverage floors and a
`qa/regression` suite that grows with every task. None of these exists. After this task the docs say what runs, and the parts the PO
accepted are built: the backend coverage floor is enforced as documented, web coverage is measured once, local E2E runs on its own
database that is recreated per run (so the PO's dev database stops filling up), and a manually started `regression` workflow replaces
the nightly promise. Each new check is shown failing.

## Scope
- In:
  1. **JaCoCo floor.** `backend/pom.xml` gains a JaCoCo `check` execution in `verify` (after `report`): element `PACKAGE`, includes
     `com.englms.*.internal.app`, `com.englms.*.internal.app.*`, `com.englms.*.internal.domain` and `com.englms.*.internal.domain.*`
     (sub-packages included), line `COVEREDRATIO` ≥ 0.80 and branch `COVEREDRATIO` ≥ 0.70 (test-strategy §5; "per module" reads as per
     module package). `./mvnw verify` fails with JaCoCo's message naming the package when one is below. Proofs, in scratch edits that are
     not committed, both result lines in the summary: (i) an uncovered class with branches added to one such package makes `./mvnw verify`
     fail, its removal makes it pass; (ii) one run with both minimums at `1.00` fails and its output names all four packages that exist
     today (`identity.internal.app`, `identity.internal.domain`, `students.internal.app`, `students.internal.domain`), so no include is a
     silent typo. **If a package is below the floor today**, the implementer stops and reports it; the LC rules before going on (L-10);
     lowering a floor is the PO's.
  2. **Web coverage, measured once.** Vitest with `@vitest/coverage-v8` at the version matching `vitest` (5.1.0), installed for the
     measurement only (`package.json` and `pnpm-lock.yaml` restored, nothing committed): line coverage of `web/src/**/model/**` and
     `web/src/ui/**`, per directory and in total, recorded in the summary with the command. The 80 % floor stays in test-strategy §5; if the
     total is below 80 %, the LC asks the PO (no enforcement in this task either way).
  3. **Local E2E on its own database** (PO-10). In `scripts/e2e-run.sh`, only when `.env` exists (local) and `E2E_KEEP_DB` is not `1`:
     - **Inputs:** `E2E_DB_NAME` (default `englms_e2e` when unset, `${E2E_DB_NAME-englms_e2e}`; set but empty is refused by the guard) and `E2E_KEEP_DB` are read from the caller's environment **before** `.env` is
       sourced and restored after it, so `.env` cannot set or change them (stated in the script's usage text).
     - **Engine:** after `dev-up.sh` the script sources `scripts/lib/engine.sh` (dev-up exports `ENGLMS_CONTAINER_ENGINE` only in its own
       process), so a direct `./scripts/e2e-run.sh` without `env.sh` works.
     - **Guard** (exit 1 with a message, before any engine call): the name must match `^[a-z][a-z0-9_]{0,62}$`; it must differ from
       `${ENGLMS_DEV_DB_NAME:-englms}` (the compose default when unset), from the database name in `.env`'s `SPRING_DATASOURCE_URL`,
       and from `postgres`, `template0` and `template1`; and `.env`'s URL must point at `127.0.0.1` or `localhost` on
       `${ENGLMS_DEV_DB_PORT:-5432}` (the dev container), otherwise the database would be made in the container while the app connects elsewhere.
     - **Recreate:** `"$ENGLMS_CONTAINER_ENGINE" exec englms-dev-db psql -U "${ENGLMS_DEV_DB_USER:-englms}" -d postgres -v ON_ERROR_STOP=1`
       with two separate `-c` statements (`DROP DATABASE IF EXISTS <name> WITH (FORCE)`, then `CREATE DATABASE <name> OWNER <user>`;
       `DROP DATABASE` cannot run in a transaction block); a failure stops the run before `java`. `SPRING_DATASOURCE_URL` is then the
       `.env` URL with its database name replaced; Flyway builds the schema at startup and the E2E tutor is bootstrapped as on CI.
     - **Own data folder:** the per-run database uses `E2E_DATA=.data/e2e/fresh/` (its own bootstrap password file, `tutor-password` and
       `state/`, the last two removed at the start of each run), passed as `E2E_DATA_DIR` and as the bootstrap password file; `.data/e2e/`
       stays the kept database's folder, so a fresh run never overwrites `.data/e2e/tutor-password` (else the next `E2E_KEEP_DB=1` run
       could not sign in and global setup would advise a purge).
     - `E2E_KEEP_DB=1`: today's behaviour (the `.env` database, `.data/e2e/`) for the G5 run against a large data set. Without `.env` (CI)
       nothing changes. The E2E database is left in place after the run (for inspection) and dropped at the start of the next one.
  4. **Proof for scope 3** in `scripts/tests/e2e-run.test.sh` (a stub engine on `PATH` recording its arguments, a stub `dev-up.sh` in the
     copied repo, the real `scripts/lib/engine.sh` with `ENGLMS_CONTAINER_ENGINE=podman` and the stub an executable named `podman` first on `PATH`, since `engine.sh` accepts only `docker` or `podman`; no `env.sh`): with `.env`, two
     separate statements (drop, then create) run before `java` and the app sees the E2E URL and `.data/e2e/fresh/`; a fresh run leaves a
     pre-existing `.data/e2e/tutor-password` byte-identical; the guard refuses, before any engine call: `E2E_DB_NAME=englms` with
     `ENGLMS_DEV_DB_NAME` unset, the name in the `.env` URL, `postgres`, `template1`, a quote, a `;`, a capital, an empty value, and a
     non-local URL host or another port; `E2E_DB_NAME` or `E2E_KEEP_DB` set inside `.env` is ignored; a failing `psql` stops the run before
     `java`; `E2E_KEEP_DB=1` runs no SQL and keeps the `.env` URL and `.data/e2e/`; without `.env`, no engine call. Each case fails against
     the old script or a mutation that removes its line (recorded).
  5. **Validation of scope 3** (U4): one full local E2E run on the fresh database, compared with the T-M2.27 gate's e2e step on the kept
     one (`evidence/T-M2.27/gate-20261113T092206Z.log`: counts and seconds); then one `E2E_KEEP_DB=1` run of `smoke.spec.ts` that signs in
     (the kept password survived); the PO's dev database row counts of `app.student` and `app.user_account` (read-only `SELECT count(*)`)
     equal before and after the fresh run. The `scripts/gate.sh` header comment ("against the dev DB", line 8) is corrected.
  6. **The `regression` workflow** (PO-3): `.github/workflows/regression.yml`, `on: workflow_dispatch` only, `permissions: contents: read`,
     `timeout-minutes: 75`, the same pinned actions, PostgreSQL service and setup steps as `e2e-smoke.yml` **minus** its CI-scope parts
     (the `CI scope` step, every `steps.scope` `if:` and the "Full run on …" marker); it runs `E2E_ENGINES=all ./scripts/e2e-run.sh` (all
     projects) with `playwright install --with-deps chromium firefox webkit`.
     - `e2e/playwright.config.ts`: with `E2E_ENGINES=all` (deliberately parallel to `qa/`'s `QA_ENGINES=all`) two more projects,
       `firefox-smoke` and `webkit-smoke` (Desktop Firefox and Desktop Safari at the laptop viewport, `testMatch` `smoke.spec.ts`); without
       the variable the project list is unchanged (`playwright test --list` output identical before and after, compared in the summary).
     - Its upload steps follow the warning rule (`workflow-warnings.test.sh` passes). It is not a required check (`scripts/required-checks.txt`
       unchanged), not on the text-only allow-list, and ci-cd §1's workflow count stays true.
     - **The one existing test this task changes:** `scripts/tests/ci-scope-workflows.test.sh` fails any workflow that is neither heavy nor
       always-full. It gains a manual-only set, whose members must have `workflow_dispatch` as their only trigger and no CI-scope wiring;
       `regression.yml` is its only member. Proof: a copy with `pull_request:` added fails (recorded). Nothing else in that test changes.
     - Its first run, on `develop` after the merge, is an LC records step (result in the merge DEC; a failure becomes a fix row).
  7. **Docs** (PO-3, PO-4, PO-6, PO-10), each sentence saying only what exists:
     - ci-cd §1: the `e2e-nightly` row becomes the `regression` row (manual; what it runs; not required); PIT only where it is planned.
     - test-strategy: §1 the mutation row "release + on demand" and the E2E row's "nightly (all 6 + Firefox + WebKit)" → the `regression`
       workflow; §2 the `seed-e2e` / `e2e` profile line replaced by the per-run E2E database (local) and the empty CI database; §5 says the
       backend floor is enforced by `./mvnw verify` (packages and sub-packages) and the web floor is measured (date, value), not enforced.
     - qa-protocol: §2 step 1 (line 19) and lines 44–45 (the `e2e` profile, `seed-e2e`, `QA_ENGINES=all`); §5 (line 81) the G5 matrix
       (6 viewports × Chromium plus Firefox and WebKit smoke, through the `regression` workflow) and `qa/` retention option (a): independent
       findings stay as implementation E2E tests through their fix ACs, `qa/` is the reviewer's tooling.
     - quality-gates: G0 (a delta re-check only after an S1/S2 packet finding; the LC fixes S3/S4 and records them, PO-6); G5 (the
       `regression` workflow, plus one local run with `E2E_KEEP_DB=1` against the large dev data set).
     - responsive-standards: "all six (nightly)" → the `regression` workflow. development-setup: the E2E paragraph (≈ line 99) names the
       per-run database, `.data/e2e/fresh/` and `E2E_KEEP_DB`.
     - Any other line under `docs/` (not `archive/`, the decision log, packets or evidence) that names a nightly lane, `seed-e2e`, an `e2e`
       profile or three engines at G5 as existing: corrected, each listed in the summary.
- Out of scope (explicit):
  - Enforcing a web coverage floor or adding a coverage dependency; PIT; changing any existing test except the one named in scope 6;
    the `qa/` suites' content.
  - Sharding, the CI allow-list (`scripts/ci-text-only.paths`), `required-checks.txt`, `ci-scope.sh`, merge-gate, the gate's steps
    (the gate keeps calling `e2e-run.sh`).
  - Purging or editing the PO's dev database (it keeps its rows; E2E stops adding to it). Splitting `students.spec.ts` (T-M2.24).

## Guardrail answers (scope.md §6)
1. Trace: T-M2.22 U4, U8 (a); DEC-158 PO-3, PO-4, PO-6, PO-10. 2. Drifts toward excluded scope? No new infrastructure: a second database
in the existing dev container, a manual workflow on the existing runner. 3. Mandatory setup added? No (`E2E_DB_NAME`, `E2E_KEEP_DB`,
`E2E_ENGINES` are optional). 4. Weekly use? Every local gate run. 5. Hard-coded semantics? None.

## Design notes
- **Contradiction scan** (L-03): DEC-139 (3) ("E2E designed for a kept DB") is superseded by PO-10 (DEC-158): the DEC for this packet
  says so. Tests written for a kept DB still pass on an empty one (CI starts empty today). `qa-protocol` and DEC-131 (7) say 6 viewports
  × 3 engines; PO-3 chose the quality-gates wording (narrower): both docs end with the same matrix. `scripts/tests/ci-scope-workflows.test.sh`
  rejects an unclassified workflow: scope 6 names the one change. `e2e/support/global-setup.ts` overwrites `tutor-password` after a forced
  change: scope 3 gives the per-run database its own folder.
- `scripts/ci-text-only.known-mentions` counts lines naming allow-listed paths in scanned dirs: a doc or script line added here that names
  one changes a count; run `scripts/tests/ci-scope.test.sh` and update the file only for a line this task adds (never widen the list).
- Dependencies: none committed (scope 2 installs one for a measurement only; tech-stack unchanged).
- Shortcut ledger: grep `scripts/`, `e2e/`, `backend/pom.xml` for `shortcut:`/`ponytail:`; none expected.
- A real defect found by a new check (scope 1, 2): report it as an OQ at once; the LC rules before G3 (L-10).

## Acceptance criteria
- AC1 (scope 1): the JaCoCo `check` runs in `./mvnw verify` with the stated includes and ratios; green on today's code; proofs (i) and (ii)
  recorded (the mutation fails naming its package; the `1.00` run names all four packages).
- AC2 (scope 2): web line coverage of `model/` and `ui/` recorded (per directory and total) with its command; no dependency committed; below
  80 % the PO is asked.
- AC3 (scope 3): local `e2e-run.sh` recreates and uses `${E2E_DB_NAME:-englms_e2e}` with `.data/e2e/fresh/`; the guard refuses every case of
  scope 3 before any engine call; `.env` cannot set the two inputs; `E2E_KEEP_DB=1` uses the `.env` database and `.data/e2e/`; CI unchanged.
- AC4 (scope 4): every listed `e2e-run.test.sh` case passes and each is shown failing (old script or mutation), recorded; `scripts/tests/run-all.sh` green.
- AC5 (scope 5): the fresh-database run and the kept-database counts and seconds compared in the summary; the `E2E_KEEP_DB=1` smoke run signs in;
  the dev DB's `app.student` and `app.user_account` counts equal before and after the fresh run.
- AC6 (scope 6): `regression.yml` as stated; `playwright test --list` without `E2E_ENGINES` identical before and after; with `E2E_ENGINES=all`
  it lists the two smoke projects; `workflow-warnings.test.sh` and `ci-scope-workflows.test.sh` green, the latter's manual-only rule shown
  failing on the `pull_request:` copy; `required-checks.txt` and `ci-text-only.paths` unchanged.
- AC7 (scope 7): the listed docs corrected; `grep -rniE 'nightly|seed-e2e|e2e.?profile|three engines'` over `docs/` minus `archive/`, the
  decision log, packets and evidence leaves only lines that are not about a test lane (the backup lines in runbooks, NFR-OPS-02, A-020, G-11,
  architecture-overview, files-and-storage and R-05, each named in the summary); the list of changed lines in the summary.
- AC8: `./scripts/gate.sh` green once on the final head (its e2e step on the new per-run database) and CI green; `./scripts/check-docs.sh` passes.

## Test plan
- Implementation: the e2e-run tests (scope 4) with mutations; the JaCoCo mutation; the web measurement; the fresh-database run; `--list`
  comparisons; workflow-warnings; one gate.
- Independent review focus (adversarial docs-reviewers, G0 and G3): can the guard be bypassed (names, quoting, an empty or unset variable,
  `.env` overriding `E2E_DB_NAME`)? Can the script ever run SQL against the dev database name, or overwrite `.data/e2e/tutor-password`? Does a failed drop or create stop the run?
  Is the JaCoCo include pattern really matching the app and domain packages (a package left out by a typo passes silently)? Do the docs now
  claim anything that does not exist? Mutations in a private clone, never in the shared checkout.

## Evidence required
- `evidence/T-M2.25/summary.md`: self-check list, AC → proof, the JaCoCo and e2e-run mutation results, the web coverage numbers, the
  fresh vs kept comparison, the dev DB counts, the `--list` comparison, the doc lines changed, the G3 cost table.
- One gate log on the final head (trimmed ≤ 300 lines) and green CI. G3: `DOCS-REVIEW T-M2.25: PASS` from a fresh adversarial reviewer.

## Docs to update
- Scope 7; `docs/07-operations/development-setup.md` if it describes E2E data; the DEC for this packet (DEC-167) and the merge DEC.

## Risks & assumptions
- A fresh database can hide data-volume defects: the G5 run with `E2E_KEEP_DB=1` keeps one run on the large set (U4 risk).
- A package may already be below the JaCoCo floor (the overall figure 95.4 / 88.7 hides per-package values): scope 1 stops then.
- `workflow_dispatch` workflows can be started only once the file is on the default branch: the first run is after the merge (scope 6).
- The `regression` run costs runner minutes (not measured; billing is not readable by the LC): it runs only when started.
- Firefox and WebKit cannot run on this device (missing host libraries, PO): their projects are checked by `--list` locally, and run in CI.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
(cd backend && ./mvnw -B verify)
scripts/tests/run-all.sh
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
(cd e2e && pnpm exec playwright test --list | tail -1; E2E_ENGINES=all pnpm exec playwright test --list | tail -1)
./scripts/gate.sh
```
