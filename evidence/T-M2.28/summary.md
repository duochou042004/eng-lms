# T-M2.28 summary: regression and tooling follow-ups (a)–(g) before the M2 G5
Branch chore/T-M2.28-regression-followups (from `develop` e6fecac) · start `ccca078` · (a1)(a2) `9514b3e`, (d)(e) `00f2304`, (g) `e60f37b`,
(c) + temporary diagnostics `777dbff`, (b) + diagnostics removed `f57a0d7`, final-checks evidence `f2bff5d`, (a1) repeat race `a7a1e4d`;
this summary and the gate log: the next commit · trace DEC-169, DEC-171, DEC-173, DEC-174 · PO start 2026-11-14T13:49:56Z · 2026-11-14.
Recorded by the LC from the frontend-implementer's text (L-07). Raw logs: `evidence/T-M2.28/*.log`.

## Gate (G1)
- Run 1 (LC) on `f2bff5d`: `gate: FAIL at step 'e2e'`: default pass 525 passed; the ×3 repeat of `smoke.spec.ts` and
  `students-list.spec.ts` gave 3 failed on `[phone-small] students-list.spec.ts:317` (strict mode: two `E2E Paging phone-small: 26` links).
  Cause: `pagingSet` is check-then-create and `fullyParallel: true` runs the three repeats at once on the fresh `englms_e2e`, so each
  creates the set (a race older than this task: before T-M2.25 the repeat ran on the kept dev DB where the set existed). Fixed in
  `a7a1e4d`: one set per repeat index (`E2E Paging ${project}:${repeatEachIndex}:`). Failing form 9 failed (`a1-repeat-race-old.log`),
  fixed 150 passed / 3 skipped (`a1-repeat-race-fixed.log`), kept DB ×2 12/12 each (`a1-kept-db-two-runs-repeat.log`).
- Run 2 (LC) on `a7a1e4d`: `gate: PASS (13 steps, 720s)`; e2e default pass 525 passed / 42 skipped; repeat ×3 150 passed / 3 skipped
  (the column-share skip on phone-small). Log `gate-20261114T154254Z.log` (trimmed by the LC from 2,314 to 51 lines: every `gate:` line and the counts).

## Regression runs (LC-started)
| Run | Head | Result | Use |
|---|---|---|---|
| 43604518399 | `777dbff` | 1092 passed, 33 failed | Diagnostics: 29/40 (c) old form failed, 40/40 new form passed; the 4 webkit shell tests failed; b1/b2/b3 lines |
| 43608039387 | `f2bff5d` | **success** | All six viewports + Firefox and WebKit smoke green, incl. the 4 webkit-smoke shell tests (AC3) and the firefox deep-link reloads (AC4) |
| 43611629190 | `a7a1e4d` | 1039 passed, 1 failed; re-run of the failed job: see below | `[firefox-smoke] smoke.spec.ts:77 login renders in vi and en`: `frame.evaluate: Page crashed` inside axe (`support/checks.ts:6`). `smoke.spec.ts` and `e2e/support` are byte-identical to `f2bff5d`, where the test passed: a Firefox crash on the runner, recorded here, re-run openly (`gh run rerun --failed`): attempt 2 crashed the same way (image .127); trace (PO-approved artifact download): the crash is inside `window.axe.runPartial` after all network settled, no console/page/CSP error, same Firefox 159 build and test scheduling as the green runs |
| 43617206392 | `ddd51f4` (= `a7a1e4d` + LC records) | **success**, 1040 passed | The AC9 run on the PR head; the Firefox crash ruled an intermittent engine crash (DEC-174 (5)) |

## AC → proof
| AC | Proof |
|---|---|
| AC1 (a1) | Prefix `E2E Paging ${project}:` (then `:${repeat}:`, `a7a1e4d`), `students-list.spec.ts:305`. Old form on the `.env` DB with `E2E_KEEP_DB=1`, order pinned: run 1 phone-small + tablet-land passed, run 2 phone + tablet failed `Received "Trang trướcTrang 1 / 3Trang sau"` at `:382` (`a1-old-form-run1.log`, `a1-old-form-run2.log`). New form: four projects, two runs on one kept DB, 4/4 each (`a1-new-form-two-runs.log`). Prefix rule: `:` is no regex or LIKE metacharacter and survives `Usernames.normalize`; no project's prefix is inside another's; no old row contains it. Only the prefix line (and the repeat index) changed |
| AC2 (a2) | `test.skip(page.viewportSize()!.width < 768, 'the table starts at 768 px')` (`:500`). Old skip failed on phone (`a2-old-skip-phone.log`); new: skipped on phone-small, phone; passes on tablet, tablet-land, laptop, desktop (`a2-new-skip-six.log`). Card list below 768 covered by `students-list.spec.ts:317` (else-branch ≈ 458–467; `wide()` ≥ 768, `support/students.ts:40`), the English axe test (≈ `:665`), `students-ui-checks.spec.ts:80` |
| AC3 (b) | Two causes, neither product (run 43604518399). (1) The inline `<style>body {}</style>` is Playwright's: `WKPage.shouldToggleStyleSheetToSyncAnimations()` is true in playwright-core 1.65.0 (`lib/coreBundle.js` ≈ 49660; CR/FF false ≈ 39284, 47349), so `inPagePrepareForScreenshots` (≈ 23057) appends it on every WebKit screenshot; the failing tests take one on failure (`playwright.config.ts:28`) before the guard's teardown. DIAG b1: nothing before the screenshot, the refusal right after. (2) The missing `h1`: WebKit drops Secure cookies on `http://localhost`: b2 (secure) `/auth/session` 401, no cookie sent, `/login?next=…`; b3 (not Secure) 200, `/tutor/today` "Hôm nay", `/student/home` "Trang chủ". Fix (DEC-174): `smoke.spec.ts` `stateFor()` loads stored states without Secure on WebKit only; the server's Secure attribute is unchanged (NFR-SEC-04). Run 43608039387: the 4 webkit-smoke tests pass. No CSP, `SecurityHeaders`, config, workflow or script change |
| AC4 (c) | `fontsSettled()` before the reload: the `h1` visible, then `expect.poll(document.fonts.status)` to `'loaded'` (L-05). Failing first: run 43604518399, old form 29/40 failed (`downloadable font … NS_BINDING_ABORTED`), new form 40/40 (DEC-174). Run 43608039387: both deep-link reloads pass. `git diff develop -- e2e/support/fixtures.ts` empty |
| AC5 (d) | Boot 4.1.2 jar run against a throwaway `postgres:18` (`d-boot41-binding.log`, script appended): `SPRING_DATASOURCE_HIKARI_JDBC_URL` / `_JDBCURL` move pool and Flyway; `SPRING_FLYWAY_URL` and `SPRING_APPLICATION_JSON` with `spring.flyway.url` move Flyway; `SPRING_FLYWAY_USER` cannot redirect; `dataSourceClassName` is refused by Boot; `PGDBNAME` loses to the URL. Fresh mode now refuses (caller or `.env`, any case or underscores) those three names, naming the variable (`scripts/e2e-run.sh`); `development-setup.md` "E2E database". 5 new cases: old script 16 checks fail (`d-old-script.log`); over-refusal mutation fails the `SPRING_FLYWAY_USER` case (`d-mutation-over-refusal.log`); final 127/127 |
| AC6 (e) | Java stubs write `env.tmp` then `mv`; readiness `curl` stubs succeed only once the env file is non-empty (also the first section's `app.env`, same race). Under a 2 s injected delay: old form fails all 6 `app2.env` reads (`e-old-form-delay.log`), fix passes (`e-fixed-delay.log`), mutation (ready at once) fails 9 (`e-mutation-delay.log`); ×20 20/20 (`e2e-run-test-x20.log`). No sleep |
| AC7 (f) | Reading on today's code: `useLogout` clears the query cache (`web/src/features/auth/api/session.ts:97`), then `await navigate('/login')` (`:100`); while `/login` loads, the Add student route's enabled queries (`features/students/api/students.ts:58`, `:69`) refetch, their 401 fires UNAUTHENTICATED (`lib/api/client.ts:65-66`; exempt only session and login, `:21`), and `guards.ts:126-130` navigates to `loginPath(pathname + search)`, which can win. A product cause: OQ T-M2.28-1, ruled to T-M2.29 (j) (DEC-174); the test is unchanged and stays a known product-caused intermittent until then. Held-session diagnostic lands on `/login?next=%2Ftutor%2Fstudents%2Fnew` (`f-diag-held-session.log`). ×50 laptop `--retries=0`: 50/50 on today's code and on `f57a0d7` (`f-x50-laptop-final-head.log`; the last code commit `a7a1e4d` changes only `pagingSet`, and G3's ×20 on the PR head was 20/20) |
| AC8 (g) | (g1) `setup-only.ts` fixture: the any-importer mutation passes the 92 old fixtures, fails 2 with (g1) (`g1-mutation.log`), still fails on the final rule (`g1-mutation-final-rule.log`). (g2) `shared.ts` reaching `global-setup.ts` via `via.ts`: old rule fails 2 (`g2-old-rule.log`). `gate.sh` logs `all specs: <file> reaches e2e/support/global-setup.ts, which runs before every spec`. `gate.test.sh` 98/98 |
| AC9 | Gate PASS on `a7a1e4d` (above); regression 43617206392 green on the PR head `ddd51f4`; 43611629190's Firefox crash ruled out (DEC-174 (5)); `scripts/tests/run-all.sh` PASS (`final-checks.log`); CI on the PR; all existing assertions kept, no retry, timeout or allow-list added |

## Self-check (task-packet skill step 6)
- [x] Only the packet's items (a)–(g) on its branch; tier L: no product, CSP, DTO, migration or UI change; no `playwright.config.ts` or `fixtures.ts` change.
- [x] Every new check, fixture or ordering seen failing first: (a1), (a1) repeat race, (a2), (b) b2 vs b3, (c), (d) both directions, (e), (g1), (g2).
- [x] No weakened, skipped or deleted assertion except the (a2) skip condition the packet defines; no retries or raised timeouts; async reads by polling.
- [x] The product cause found ((f)) reported at once as an OQ (L-10) and ruled before G3 (DEC-174).
- [x] Temporary diagnostics removed (`grep -c 'T-M2.28-DIAG\|DIAGNOSTIC' e2e/tests/smoke.spec.ts`: 0).
- [x] check-docs before each commit; explicit-path staging; trailers; no `.env` or `.data` content in evidence.
- [x] Shortcut ledger: none fires.
- [ ] shellcheck: not installed locally; CI's lint is the first run.

## G3 cost
| Reviewer | Rounds | Tokens |
|---|---|---|
| frontend-implementer (not G3) | 4 hand-backs | 207,441 (last reported total) |
| docs-reviewer (adversarial, runs specs and suites) | 1 + confirmation | 104,039 (round 1, 670 s) + 7,652 (confirmation, 28 s) = 111,691 |

Merged `a1bcf12` (PR #187 via merge-gate at `91f94b5`, CI 7/7, DEC-175); verdict `DOCS-REVIEW T-M2.28: PASS` (`review/docs.md`: round 1 PASS WITH MINOR, confirmation PASS); S4-3, S4-5 fixed, S4-1, S4-2 → T-M2.30, S4-4 recorded; (f) → T-M2.29 (j) (DEC-174).
