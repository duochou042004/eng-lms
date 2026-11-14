# T-M2.28 G3 docs review (tier L, one adversarial fresh docs-reviewer that re-runs the specs and suites; DEC-173, DEC-174)

Recorded by the LC from the agent's returned text. The reviewer worked in a private clone under `~/.cache` (deleted at the end) for the
mutations, ran the E2E and script suites from the main checkout (fresh `englms_e2e` per run, no `E2E_KEEP_DB`), and made no edits,
commits, PR comments or files in the tree.

## Round 1 (full, head `2120247`; 104,039 tokens, 670 s): PASS WITH MINOR

DOCS-REVIEW T-M2.28: PASS WITH MINOR

**Checks run**
- `./scripts/check-docs.sh`: PASS (346 files); `check-path-ownership.sh`: PASS (37 files).
- Scope (tier L): `git diff develop...HEAD` touches nothing under `web/`, `backend/`, `api/`, `e2e/support/` or `playwright.config.ts`;
  no retry, raised timeout or allow-list; the only skip change is (a2)'s (`students-list.spec.ts:503`); (a1) changes only the prefix and the
  repeat parameter (`:305-306`, `:330`); `:` survives `Usernames.normalize` (`Usernames.java:21-26`); no prefix is inside another.
- Re-runs: four projects, `--retries=0`, `students-list` + `smoke`: 66 passed, 2 skipped; the gate's repeat form ×3 on phone-small, tablet,
  laptop: 150 passed, 3 skipped (the DEC-174 (4) race did not return); (f) `sign-out never asks` laptop ×20 `--retries=0`: 20/20;
  `e2e-run.test.sh` 127/0, `gate.test.sh` 98/0, `run-all.sh` PASS. Caveat: `e2e-run.test.sh` fails 67 of 127 while an app holds port 8080
  (how the script works, not a regression).
- Mutations (private clone):

| Mutation | Result | Killed? |
|---|---|---|
| (g1) any importer counts as found | gate.test 97/1 | Yes |
| (g2) drop the global-setup all-specs line | gate.test 96/2 | Yes |
| (e) control: java stubs `sleep 2`, fix in place | 127/0 | (control) |
| (e) same delay, readiness stubs succeed at once | 118/9 | Yes |
| (d) drop `SPRINGDATASOURCEHIKARIJDBCURL` | 119/8 | Yes |
| (d) drop `SPRINGFLYWAYURL` | 123/4 | Yes |
| (d) drop `SPRINGAPPLICATIONJSON` | 123/4 | Yes |
| (d) over-refuse `SPRINGFLYWAYUSER` | 125/2 | Yes |
| (d) remove the upper-casing | 127/0 | No (S4-2) |

- (b) `stateFor` (`smoke.spec.ts:57-67`) changes WebKit only and only the client-side copy of the cookies; the server's Secure flag stays
  asserted (`AuthApiIntegrationTest.java:93` session cookie, `:347` remember-me, `StartupScenariosTest.java:182-236`). (c) `fontsSettled`
  (`:52-55`) is a polling assertion after the `h1` check (L-05).
- Regression runs read with `gh run view`: 43604518399 failure (diagnostics), 43608039387 success, 43611629190 failure (both attempts, the
  Firefox `Page crashed` at `smoke.spec.ts:77`), 43617206392 success (1040 passed, 0 failed, all firefox-smoke and webkit-smoke tests
  passing). `ddd51f4` differs from `a7a1e4d` only in docs, evidence and `progress.json`; DEC-174 (5) accepted as not hiding a code failure.
- Records: `progress.json` `pr` is `"187"`; `session.ts:97`/`:100`, `guards.ts:126-130`, `client.ts:21`/`:65-66`, `students.ts:58`/`:69`
  match the code; the raw logs match the summary's counts.

**Findings**
- **S4-1:** the fresh-mode refusal reads names from `compgen -e`, which omits names that are not shell identifiers
  (`spring.flyway.url=…` from the caller still reaches `java`); `SPRING_CONFIG_IMPORT`, `SPRING_CONFIG_ADDITIONAL_LOCATION` and
  `JAVA_TOOL_OPTIONS=-Dspring.flyway.url=…` are not refused. A `.env` cannot set such names. → T-M2.30 (a) (DEC-174).
- **S4-2:** "any case" is claimed (`e2e-run.sh:73`, `development-setup.md:103-106`) but untested: removing the upper-casing survives
  all 127 cases. → T-M2.30 (b).
- **S4-3:** DEC-174 (5) said "2 of 5 runs"; it was the same test on two attempts in a row of one run, so a G5 recurrence should be treated
  as a likely real defect. → fixed by the LC in `91f94b5`.
- **S4-4:** `document.fonts.status` alone is also `'loaded'` before any font request; the wait is meaningful only after the `h1` check, and
  run 43604518399 (29/40 vs 40/40) is the real proof. → recorded only.
- **S4-5:** the AC7 ×50 ran on `f57a0d7`, not the last code commit `a7a1e4d` (which changes only `pagingSet`). → fixed by the LC in `91f94b5`.

**Not done:** no workflow re-run, no trace artifact read, no local Firefox or WebKit, no shellcheck.

## Confirmation (delta, head `91f94b5`; 7,652 tokens, 28 s): PASS

`git diff --stat 2120247 91f94b5`: 3 files, docs and evidence only (`decision-log.md`, `backlog.md`, `summary.md`); nothing under `web/`,
`backend/`, `e2e/`, `scripts/` or `api/`; `check-docs` PASS. S4-3 and S4-5 fixed and matching the evidence; S4-1 and S4-2 moved to T-M2.30
(allowed under quality-gates G3 for S4, recorded in DEC-174); S4-4 recorded only. No re-runs (no code changed since `2120247`).

DOCS-REVIEW T-M2.28: PASS
