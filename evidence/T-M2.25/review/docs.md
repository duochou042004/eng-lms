# T-M2.25 G3 docs review (tier L, adversarial fresh docs-reviewers; DEC-167, DEC-168)

Recorded by the LC from each agent's returned text. Reviewers ran mutations in private clones; none wrote files in the tree. In two quoted regexes `(PG)` is written `\(PG\)` so check-docs does not read `](PG)` as a link.

## Round 1 (full, head `ef5f0a6`; 73,871 tokens, 584.6 s): CHANGES REQUESTED

DOCS-REVIEW T-M2.25: CHANGES REQUESTED

The guard in `scripts/e2e-run.sh` cannot drop or create the dev database or a system database. It can only run SQL inside the `englms-dev-db` container, and a fresh run never touches `.data/e2e/tutor-password`. But two of the new checks can be bypassed with input that is easy to write, so the packet's AC3 and AC6 wording is not fully true yet. Each needs only a small fix.

**What I ran** (private clone of head ef5f0a6 in `/tmp/claude-1000/-home-linux-Projects-eng-lms/64399496-671d-42a9-90c3-c074988b587d/scratchpad/g3/repo`; the shared checkout and the dev database were not touched)
- `e2e-run.test.sh`: 79 passed, 0 failed. `ci-scope-workflows.test.sh`: 89 passed, 0 failed. `workflow-warnings.test.sh`: 10 passed, 0 failed. `ci-scope.test.sh`: 243 passed, 0 failed.
- `run-all.sh`: `script tests: PASS`. `check-docs.sh`: `docs-check: PASS (299 markdown files, ...)`.
- My own mutations of `e2e-run.sh`, failing checks out of 79:

| Mutation | Failed |
|---|---|
| name-compare loop disabled | 18 |
| host check removed | 3 |
| port check removed | 3 |
| `ON_ERROR_STOP` removed | 2 |
| `keep_db` read after `.env` is sourced | 1 |
| regex anchors dropped | 9 |
| `postgres` removed from the deny list | 3 |
| `template0` removed | 3 |
| drop and create in one statement | 2 |
| no exit on a failed psql | 3 |
| fresh folder replaced by `.data/e2e` | 4 |
| no removal of `fresh/` state | 1 |
| `${E2E_DB_NAME-...}` changed to `:-` | 3 |
| `url_db` dropped from the deny list | 3 |
| user regex removed | 3 |
| guard moved after `dev-up` | 13 |
| URL parameters dropped | 1 |
| the `unset E2E_DB_NAME E2E_KEEP_DB` line removed | **0** (no effect, see F5) |

- Edge cases run against the real script with a stub engine:
  - **Refused:** a trailing newline, a trailing space, `ENGLMS_DEV_DB_NAME=englms_e2e`, an IPv6 `[::1]` URL, a URL database `Devdata` when the name is `devdata`.
  - **Run in fresh mode:** `E2E_KEEP_DB=true` and `" 1"`, which is the safe direction. A URL with no port defaults to 5432 and is accepted.
- JaCoCo (`jacoco:check@check` offline, using a copy of the shared `jacoco.exec` and classes):
  - As committed: `All coverage checks have been met.`
  - Both minimums at 1.00: all four packages are named.
  - Domain includes misspelled, at 1.00: only the two app packages are named, so the 1.00 run does catch a typo.
  - App include misspelled, at the real floor: BUILD SUCCESS, so nothing catches it (see F4).
- `playwright test --list` without `E2E_ENGINES`: identical before and after (1092 tests). With `E2E_ENGINES=all` it lists `firefox-smoke` and `webkit-smoke`.
- `regression.yml` compared with `e2e-smoke.yml`: the four pinned action SHAs are identical. The trigger is `workflow_dispatch` only, with `contents: read`, `timeout-minutes: 75`, the CI scope step, every `steps.scope` `if:` and the "Full run on" marker removed, the three browsers installed, and the upload step plus its warning step present. `required-checks.txt`, `ci-text-only.paths` and `ci-text-only.known-mentions` are unchanged.
- AC7 grep: only the backup lines remain (R-05, architecture-overview, NFR-OPS-02, G-11, A-020, files-and-storage, runbooks). `tech-stack.md:136` matches the pom (0.8.16, `check` in `verify`). `qa/regression/` exists, and nothing new in the docs claims something that is missing.

**Findings**

- **F1 (S3)** `/home/linux/Projects/eng-lms/scripts/tests/ci-scope-workflows.test.sh:38`
  - Problem: the manual-only rule only looks at the one line after `workflow_dispatch:`. A blank line or a column-0 comment before a second trigger gets through. Both of these copies of `regression.yml` scored 89 passed, 0 failed:
    - `on:\n  workflow_dispatch:\n\n  pull_request:\n`
    - `on:\n  workflow_dispatch:\n# also\n  push:\n`

    So the new check does not enforce "workflow_dispatch as its only trigger" (AC6).
  - Fix: take every line after `on:` up to the next non-blank, non-comment line at column 0. Drop blank and comment lines, then require the result to be exactly `["  workflow_dispatch:"]`. Add the blank-line copy as a mutation case.

- **F2 (S3)** `/home/linux/Projects/eng-lms/scripts/e2e-run.sh:58` and `:77`
  - Problem: query parameters in the `.env` URL are copied unchecked into the E2E URL. I checked pgjdbc 42.7.14's `Driver.parseURL`: URL parameters override the host and database name in the URL. `...5432/englms_e2e?PGDBNAME=devdata&PGHOST=db.example.org` parses to `{PGHOST=db.example.org, PGDBNAME=devdata}`.
    - With `?PGDBNAME=<dev db>` in `.env`, a "fresh" run recreates `englms_e2e` but the app, Flyway and the specs write to the dev database. That is exactly what PO-10 is meant to stop.
    - `PGHOST` gets past the "local only" check the same way.
    - `%`-encoded names are decoded too: `eng%6Cms` becomes `englms`, which slips past the `.env` URL-name check.
  - Fix: refuse when `url_params` matches `(^|[?&])PG(HOST|PORT|DBNAME)=`, and refuse `%` in `url_db`. Add a test case for each.

- **F3 (S3)** `/home/linux/Projects/eng-lms/scripts/e2e-run.sh:43`
  - Problem: the caller's values are saved in ordinary shell variables before `.env` is sourced into the same shell. A `.env` line `keep_db=1` switched a run to the kept dev database (I observed no SQL and the `.env` URL). A line `db_name=englms_x` changed the per-run database name. Both contradict AC3 and the usage text, and also `development-setup.md:102-104` ("a value in `.env` is ignored"). The guard still checks the overridden name, so this cannot cause a drop.
  - Fix: add `readonly name_set db_name keep_set keep_db` right after line 43. I did not run this fix, so check that assigning to a readonly variable during `source` makes the script stop or refuse rather than carry on with a warning. Add a test case with `keep_db=1` in `.env`.

- **F4 (S4)** `/home/linux/Projects/eng-lms/backend/pom.xml` (the `check` rule includes)
  - Problem: a misspelled include passes silently at the real floors. The 1.00 run proves the includes only once and does not guard future edits.
  - Fix: optional. Note the limit as a `shortcut:` comment, or keep a permanent check that lists the module packages.

- **F5 (S4)** `/home/linux/Projects/eng-lms/scripts/tests/e2e-run.test.sh`
  - Problem: removing the `unset E2E_DB_NAME E2E_KEEP_DB` line changes nothing the tests see, because no child process reads those variables today.
  - Fix: either have the java or pnpm stub assert that `E2E_KEEP_DB` and `E2E_DB_NAME` are absent when `.env` set them, or drop the line.

Scope: I found no scope creep, and none of the PO-accepted items (PO-3, PO-4, PO-6, PO-10) is missing. The packet's "Independent review focus" asks whether the guard can be bypassed; F1–F3 are such bypasses, which is why I am requesting changes rather than leaving them as S3 items for the LC to log. After the fixes, a delta re-check of F1–F3 is enough.

Not checked: a full `./mvnw verify` in the clone (I ran the JaCoCo check against the existing exec file instead), CI on the PR, a real Firefox or WebKit run, and the web coverage numbers, which I took from the summary.

DOCS-REVIEW T-M2.25: CHANGES REQUESTED

## Round 2 (delta F1–F3, head `83e2296`; fresh reviewer, 48,255 tokens, 176.7 s): CHANGES REQUESTED

I re-checked the round 1 findings in a private clone. F1, F3, F4 and F5 hold up, but F2 is still open. pgjdbc accepts plain `dbname=`, `host=` and `port=` parameters in any case, the new check doesn't catch them, and a fresh run then writes to the dev database.

**What I ran** (private clone of 83e2296 at `/tmp/claude-1000/-home-linux-Projects-eng-lms/64399496-671d-42a9-90c3-c074988b587d/scratchpad/g3r2/repo`; I did not touch the shared checkout or the dev database)
- `e2e-run.test.sh`: 99 passed, 0 failed. `ci-scope-workflows.test.sh`: 97 passed, 0 failed.
- I ran `org.postgresql.Driver.parseURL` from pgjdbc 42.7.14 (in `~/.m2`) on the base `jdbc:postgresql://127.0.0.1:5432/englms_e2e`:
  - `?dbname=devdata` and `?DbName=devdata` give `PGDBNAME=devdata`.
  - `?host=db.example.org&port=6000` gives `PGHOST=db.example.org` and `PGPORT=6000`.
  - `?x=1&PGDBNAME=devdata` gives `PGDBNAME=devdata`.
  - `?%50GDBNAME=devdata` has no effect: the driver does not decode parameter names, so URL-encoded names are not a bypass.
- I ran the real `e2e-run.sh` with stubbed engine, java, pnpm, curl and dev-up, and a hand-written `.env` for each case:
  - **F2, refused:** `"...?x=1&PGDBNAME=devdata"` (quoted, so the `&` form works).
  - **F2, accepted.** Each of these ran fresh mode: it dropped and created `englms_e2e`, then started the app with the parameter still in the URL.
    - `?dbname=devdata`
    - `?sslmode=disable&DbName=devdata`
    - `?host=db.example.org&port=6000`
    - `?service=dev`
  - **F3, value ignored:** the run stays fresh on `englms_e2e` for `keep_db=1` as the first line (the later `.env` lines are still loaded), `unset keep_db db_name`, `declare keep_db=1`, `declare -g`, `keep_db+=x`, and an `unset()` function plus `E2E_KEEP_DB=1`.
- F1 rule on mutated `regression.yml` copies:
  - **Refused:** `"on":`, `'on':`, a trailing comment on the `on:` line or the dispatch line, 4-space indent, mixed indent, `workflow_dispatch: {}`, a second `on:` key later, a `true:` key, `---` followed by a new document, CRLF line endings, an indented `#` line before `push:`, the flow form `on: {…}`, and a `<<:` merge key.
  - **Accepted, but harmless:** a tab before `push:`, which is invalid YAML (PyYAML raises a ScannerError), and a separate `On:` key, which is not a trigger under YAML 1.2.

**Findings**

- **F2-bis (S3)** `/home/linux/Projects/eng-lms/scripts/e2e-run.sh:64`
  - Problem: pgjdbc maps the short names `dbname`, `host` and `port` (any case) onto `PGDBNAME`, `PGHOST` and `PGPORT`. The check only matches the `PG…` spellings, so `?dbname=<dev db>` in the `.env` URL still sends the app, Flyway and the specs to the dev database while the script recreates `englms_e2e`. `?host=` gets past the local-only rule the same way.
  - `service=` can pull host and database from a pg_service file. I did not prove that it overrides the database in the URL path, but refusing it costs nothing.
  - Fix: change the condition to `[[ ! "${url_params^^}" =~ [?\&]\(PG\)?(HOST|PORT|DBNAME|SERVICE)= ]]` and update the refusal message. Add test cases `?dbname=devdata`, `?Host=db.example.org` and `?service=x`, and show each one failing on the current head.

- **F3 (S4 note)** `/home/linux/Projects/eng-lms/scripts/e2e-run.sh:45`: `readonly` prints `.env: line N: keep_db: readonly variable`, the caller's value stays, and the rest of `.env` is still loaded. I read that as AC9's "ignores": the value is never applied, so the warning is acceptable.

- **S4 note (outside AC9)** `/home/linux/Projects/eng-lms/scripts/e2e-run.sh:17-40`: `ROOT`, `E2E_DATA`, `build`, `READY_TIMEOUT` and `APP_LOG` are set before `.env` is loaded, so a `.env` line with the same name can change them. This is the same class of collision as F3. In fresh mode `E2E_DATA` is set again later, so it only matters for a kept run. Shell code put into `.env` on purpose, such as functions, is outside this guard's threat model.

- **F1:** closed. **F4:** the `shortcut:` comment is present at `/home/linux/Projects/eng-lms/backend/pom.xml:248`. **F5:** closed; the stub assertion passes.

DOCS-REVIEW T-M2.25: CHANGES REQUESTED

Not checked: I did not repeat the implementer's mutation counts, run the gate, look at CI, or read the gate log. Whether `service=` really overrides the database in the URL path is unproven.

## Round 3 (delta F2-bis, head `da37eed`; fresh reviewer, 30,874 tokens, 89.7 s): PASS

I re-checked F2-bis: the fix closes it, and I found no remaining way to bypass it through URL parameters.

All runs were in a private clone at da37eed, which I deleted afterwards. The shared checkout is still clean, and nothing touched a real database or container.

**Runs and results**
- **Existing tests:** `bash scripts/tests/e2e-run.test.sh` gave `-> 109 passed, 0 failed`.
- **pgjdbc 42.7.14 itself:** I called `Driver.parseURL` directly from a small Java program against the jar in `~/.m2`:
  - `dbname=`, `DbName=` and `&&dbname=` change the database. So does `#?dbname=`, because pgjdbc ignores the `#`.
  - pgjdbc does not decode parameter names, so `PG%44BNAME=`, `db%6Eame=`, `%20dbname=` and `dbname%3D=` stay unknown keys and do nothing.
  - `??dbname=` and `?a=b?dbname=` also do nothing.
  - `database=`, `hostaddr=`, `user=`, `options=` and `socketFactory=` leave the host, port and database alone.
- **The real `scripts/e2e-run.sh` with the test's stubs** (stub podman, `dev-up.sh` and java; `.env` written with quotes so `&` survives; `E2E_DB_NAME=englms_e2e`):
  - **Refused with exit 1 before any engine call:** `?dbname=devdata`, `?a=1&DBNAME=devdata`, `?a=1&&dbname=devdata`, `?Host=db`, `?pgport=5433`, `?port=5433`, `?service=x`, `?Service=x`, `?DbName=devdata` and `other#?dbname=devdata`.
  - **Still accepted, so no false positives:** `?sslmode=disable&ApplicationName=x` and `?ssl=true`. Both exit 0 and the app gets `jdbc:postgresql://127.0.0.1:5432/englms_e2e?<params>`.

**Findings**
- F2-bis is closed by `/home/linux/Projects/eng-lms/scripts/e2e-run.sh:65`, the `[?\&]\(PG\)?(HOST|PORT|DBNAME|SERVICE)=` check on the upper-cased parameters.
- One S4 note, outside this delta and not blocking. The script loads all of `.env` and only checks `SPRING_DATASOURCE_URL`. A `.env` line such as `SPRING_DATASOURCE_HIKARI_JDBC_URL=...` would, in Spring Boot's usual setup, take priority over the URL the script rewrites. A "fresh" run could then reach the dev database without using any URL parameter. I did not run this against Spring Boot 4.1.
  - Suggested fix: in fresh mode, refuse when any `SPRING_DATASOURCE_HIKARI_JDBC*` / `SPRING_DATASOURCE_HIKARI_DATA_SOURCE_PROPERTIES_*` variable is set, or unset them. Add one test case either way.

Not checked: whether the Hikari setting really wins in Boot 4.1, and `SPRING_FLYWAY_URL`, which would send Flyway to another database.

DOCS-REVIEW T-M2.25: PASS
