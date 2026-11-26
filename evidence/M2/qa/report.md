# M2 milestone QA report (G5, T-M2.7 part D)

Build `e2bfd78` · 2026-11-26 · qa-evaluator (fresh session; Chromium locally, WebKit in the regression workflow) · recorded by the LC

## Local run (`E2E_KEEP_DB=1 ./scripts/e2e-run.sh`, six Chromium projects)
11:58:56Z–12:09:09Z (Playwright 9.7 min, 8 workers). 1,416 tests: 1,247 passed, 169 skipped, 0 failed, 0 flaky (the 3 `guards.spec.ts`
expected-failure self-tests count as passed).

| Project | Passed | Skipped |
|---|---|---|
| phone-small | 216 | 20 |
| phone | 201 | 35 |
| tablet | 206 | 30 |
| tablet-land | 203 | 33 |
| laptop | 218 (3 expected-fail) | 18 |
| desktop | 203 | 33 |

**Data note (QA-3, S4):** the `.env` database `englms` on this device was empty (no tables), so this was not the large-data-set run of
development-setup §2. The run created the schema and bootstrapped `e2e-tutor` and its students there (`.data/e2e/` holds its files).
A hand bootstrap of the PO's own tutor on that database will no longer apply; `scripts/dev-down.sh --purge` resets it (PO decision).

## DEC-198 QA-1 watch item (laptop account popover, focus after Esc when axe ran while open)
- Suite: 0 focus failures (the popover/Esc cases in `shells.spec.ts` green on laptop).
- Targeted reproduction (laptop, language switch → axe while open → Esc), 20 rounds × student and tutor: focus on the opener 40/40,
  `<body>` 0/40. Since DEC-198: 2/12 (T-M2.32), now 0/40. QA proposes to close the watch item.

## D3: `qa/` specs (T-M2.4 QA round 1 list)
- New `qa/support/global-setup.ts` (`globalSetup` in `qa/playwright.config.ts`): the tutor from a stored session (`QA_TUTOR_STATE`, default
  `.data/e2e/state/tutor.json`; QA reads no password file); a fresh student created through the API who passes the forced change; states in
  `.data/qa/`.
- `regression/M1.spec.ts`: each test as its caller (anonymous `/` → `/login`; shells with their role's session); the language switch
  through the shell's account section; the route-error case recovers with "Try again" (QA-2); deep links compare the path after the role
  redirect, anonymous → `/login?next=`; `:256` unknown API path → 401 Problem Details (DEC-111); hashed assets checked signed in; the console
  check accepts only the anonymous `GET /auth/session` 401; the 44 px check counts a checkbox's label as its target.
- `e2e/T-M1.9.spec.ts`: the 8 listed tests as the right caller; AC4 and N3 cover `/login`. `e2e/T-M1.13.spec.ts:98`: the student's failed
  shell chunk ("absent on /" now logged; e2e `polish.spec.ts:394` still asserts it).
- `README.md:25`: `pnpm test regression/` is the G5 milestone regression (six viewports, Chromium); `QA_ENGINES=all` optional, outside G5
  (DEC-180).
- Run (`pnpm test`, `QA_ENGINES` default, packaged `e2bfd78` on `englms_e2e`): 444 tests, 438 passed, 6 skipped (dev-only `/dev/ui`), 0 failed.
- QA-2 (S4, outside T-M2.7): after a shell chunk fails, the start-page link leads to the same failed chunk; only "Try again" recovers.

## Regression workflow run
Run [45817298721](https://github.com/duochou042004/eng-lms/actions/runs/45817298721) on `e2bfd78` (`E2E_ENGINES=all`, workflow_dispatch,
the one run the PO approved, cap 1): **success**, job 34m36s, Playwright 31.6 min, 2 workers. 1,422 tests: 1,253 passed, 169 skipped,
0 failed (the 3 laptop `guards.spec.ts` expected-failure self-tests count as passed).

| Project | Passed | Skipped |
|---|---|---|
| phone-small | 216 | 20 |
| phone | 201 | 35 |
| tablet | 206 | 30 |
| tablet-land | 203 | 33 |
| laptop | 218 (3 expected-fail) | 18 |
| desktop | 203 | 33 |
| webkit-smoke | 6 | 0 |

No failure to rule; no second run.

## Exploratory notes
Student sign-in → Home greeting → Account → time-zone save → Home; tutor rename, archive and reset seen from the student's session;
isolation and the `SECRET-*` scan clean (`evidence/T-M2.7/qa/report.md`).
