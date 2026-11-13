# T-M2.27: E2E stability before T-M2.13 (the three known unstable kept tests)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`c5772f0`, DEC-166) |
| Owner role | FE (`frontend-implementer`) |
| Branch | `feature/T-M2.27-e2e-stability` (from `develop`); this packet on `docs/T-M2.27-e2e-stability` |
| Depends on | T-M2.23 (`d2db003`) and its records (`b488ec8`): merged |
| Estimate | 0.5 agent-day |
| Risk tier | **L**: E2E test code only (`e2e/tests/students.spec.ts`, `e2e/tests/loading.spec.ts`). No product code, endpoint, UI, data or script change. G3 is **one fresh `qa-evaluator`** rather than a docs-reviewer, because the proof is test runs (the ×20 repeats and the old-form reproductions), not text (DEC-165) |
| Trace | DEC-163 (this task; the PO's condition "testing first"), DEC-159 (the Guardians AC4 polling read, was T-M2.13 AC8), DEC-162 (`students.spec.ts:2252` failed at 468 active students), run 43165176510 (`loading.spec.ts:173` on phone-small), lessons-learned L-05 (single reads, timing assumed) and L-10, coding-agent-rules §4.2 and §4.6, DEC-165 (this packet's decisions) |

## Goal
Three kept E2E tests fail now and then for reasons outside the product: one depends on the other rows in the database, one gives a whole
cold start a single 5 s read, and one reads a list once right after an event. Each is rewritten so it proves the same thing without that
dependence, its old form is shown failing where the cause can be reproduced, and each passes ×20 on `phone-small`, `tablet` and `laptop`.
This is the first of the three testing tasks the PO wants merged before T-M2.13 (DEC-163).

## Scope
- In:
  1. **(a) `students.spec.ts` "Focus after an action removes or disables its own control (T-M2.19 AC4)" › "only archived students:
     Include archived: focus to the toolbar control"** (≈ line 2252). Today it clicks Include archived and reads
     `getByText('Đã lưu trữ', { exact: true }).first()`, which finds a badge only if an archived student is on the first page the real backend
     returns; on a DB with many active students sorting first it fails (DEC-162). The test makes its own archived student (`apiStudent` with a
     `token()` name, then `POST …/status` `ARCHIVED` with its version, as the AC2/AC3 test at ≈ line 377 does, the status answer checked as `200`)
     and the archived-inclusive list request returns that student whatever else the DB holds. The route stays in the default view (no `q` in
     the page URL, so the "no active" empty state and the click on its button are unchanged); the suggested way is that `onlyArchived` forwards
     the archived-inclusive request with the test's own `q` added (`route.fallback({ url })`), the default-view and `size=1` requests unchanged.
     The badge read is scoped to that student's row or card (its name), not `.first()` on the page.
  2. **(b) `loading.spec.ts` "the loading region in English"** (≈ line 173). Today its first read after `goto(…, { waitUntil: 'commit' })` is
     `region.locator('[data-shown]')` `toHaveCount(1)`: one default 5 s budget covers the whole cold start (document, entry chunk, session,
     the 150 ms delay). Its Vietnamese twin first waits `expect(region).toHaveAttribute('aria-busy', 'true')`. The English test does the same
     read before the `[data-shown]` read, with the same (default) budget; nothing else in the test changes.
  3. **(c) `students.spec.ts` "Guardians (T-M2.15)" › "AC4: two pages: a stale save opens the conflict dialog …; a removed guardian shows the
     alert"** (≈ line 1805): the single read `expect(await guardianNames(page)).toEqual(['Vũ Thị Hư Cấu'])` becomes
     `await expect.poll(() => guardianNames(page)).toEqual(['Vũ Thị Hư Cấu'])`, the same expected value; no other line changes (DEC-159).
  4. **Old form shown failing** (coding-agent-rules §4.5, L-01), each in a scratch copy that is never committed:
     - (a) the old and the new test under one scratch route that stands in for a crowded DB: an archived-inclusive answer for a request
       **without** `q` gets 25 synthetic active rows put first and is then cut back to the page size (25), so no archived row is on the first
       page; an answer for a request **with** `q` passes through unchanged (a real backend filters synthetic rows out). The old form fails, the
       new form passes under the same route; the database is not touched.
     - (b) the old and the new test under a CPU throttle (Chromium CDP `Emulation.setCPUThrottlingRate`, rate chosen by the implementer and
       recorded) or three loading tests at once (`--workers=3`, as in run 43165176510): record whether the old form failed and how often in
       ×20; if no setting reproduces it, record the settings tried; the new form must pass ×20 under the same setting.
     - (c) the old read with the list refetch delayed (a scratch `page.route` on `GET /api/v1/tutor/students/{sid}/guardians`, the only refetch after a removed guardian, that waits about 300 ms
       before `route.fallback()`): the old single read fails, the polling read passes.
- Out of scope (explicit):
  - Every other test, including the other single `guardianNames` reads in the Guardians block (≈ lines 1643, 1661, 1683, 1892). If one of them
    is seen failing in these runs, report it as an OQ; it is not fixed here (L-10).
  - Product code, `e2e/support/**`, `playwright.config.ts`, the default expect timeout, retries, scripts and CI.
  - Splitting `students.spec.ts` (T-M2.24) and a per-run E2E database (T-M2.25).

## Guardrail answers (scope.md §6)
1. Trace: DEC-163, DEC-159, DEC-162. 2. Drifts toward excluded scope? No: test code only. 3. Mandatory setup added? No. 4. Weekly use? Every
gate and CI run uses these tests. 5. Hard-coded semantics? None.

## Design notes
- Files: `e2e/tests/students.spec.ts` (tests (a), (c); the `onlyArchived` helper is used only by (a) and the any-student check test above it,
  whose behaviour must not change: the `size=1` any-student request also sends all three statuses, ARCHIVED included
  (`web/src/features/students/api/students.ts`), so `q` is added only to non-`anyCheck` requests whose status includes ARCHIVED; the `size=1`
  check stays unchanged, and so does the any-student check test),
  `e2e/tests/loading.spec.ts` (test (b)).
- **Contradiction scan** (L-03): (a) keeps `noActive` `toHaveCount(0)`, `expectFocusNotLost` and the Include archived checkbox `toBeFocused()`;
  the badge read becomes stricter (its own row). (b) adds one read the twin already has. (c) changes the read form only (DEC-159). No kept
  assertion is removed or weakened (coding-agent-rules §4.2); no expected value changes. Product behaviour that these tests read is unchanged:
  `StudentsListPage` shows the "no active" state only in the default view (`!view.q && !view.archived`), which is why (a) adds `q` to the
  request, not to the page URL.
- Shortcut ledger: no `shortcut:`/`ponytail:` marker in `e2e/`.
- If a reproduction or a ×20 run finds a real product defect: report it at once as an OQ; `test.fail` only until the LC rules, before G3 (L-10).

## Acceptance criteria
- AC1 (a): the test creates its own archived student (status answer `200`), the archived-inclusive list request returns that student whatever
  the other rows in the DB, the page URL has no `q`, and the "Đã lưu trữ" badge is read inside that student's row or card. Its other assertions
  are unchanged.
- AC2 (b): "the loading region in English" waits for `aria-busy="true"` on the region before reading `[data-shown]`, with the default budget as
  its Vietnamese twin; no timeout is raised and nothing else changes.
- AC3 (c): the removed-guardian list read is `await expect.poll(() => guardianNames(page)).toEqual(['Vũ Thị Hư Cấu'])`; no other line of the test
  changes.
- AC4: each old form is shown failing as scope 4 says (for (b): the result, or the settings tried when nothing reproduces it), and the new form
  passes under the same condition; the scratch copies are not committed; the commands and result lines are in the summary.
- AC5: each of the three changed tests, selected by title (`-g`), passes `--repeat-each=20 --retries=0` on `phone-small`, `tablet` and `laptop`.
- AC6: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept (the diff touches only the lines AC1–AC3 name, and
  the `onlyArchived` helper).

## Test plan
- Implementation: the three tests rewritten; the scratch reproductions of scope 4; the ×20 runs of AC5; one gate on the final head.
- Independent QA focus (qa-evaluator): read the diff for removed or weakened assertions; rerun AC5 (at least ×20 on one project, ×5 on the other
  two) and the (a) and (c) reproductions from the summary's commands; run (a) against a DB with more than 25 active students if one is at hand
  (do not add rows to the PO's dev DB for this); check that the any-student check test still passes ×5.

## Evidence required
- `evidence/T-M2.27/summary.md`: the self-check list, the reproduction commands and result lines (AC4), the ×20 result lines (AC5), the G3 cost table.
- One gate log on the final head (`evidence/T-M2.27/gate-*.log`, trimmed to ≤ 300 lines) and green CI.
- G3: one `qa-evaluator` report with `QA-VERDICT T-M2.27: PASS`, recorded on `qa/T-M2.27`.
- No screenshots (no UI change).

## Docs to update
- None in the feature PR beyond `evidence/T-M2.27/`. Records PR (LC): backlog row and this Status `done`, `progress.json`, the handoff, a DEC with
  merge-gate's scope line.

## Risks & assumptions
- (b) may not reproduce locally; the fix rests on the cause found in run 43165176510 (DEC-163) and the twin's pattern. Accepted.
- The gate's ×3 repeat of changed specs runs all of `students.spec.ts` (≈ 15 min per project); one gate run only, on the final head.
- Local E2E still uses the PO's dev DB (T-M2.25 changes that): the new (a) adds one archived student per run, as other tests do. Never purge it.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=20 --retries=0 \
  -g 'only archived students: Include archived'
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=20 --retries=0 --no-build \
  -g 'the loading region in English'
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=20 --retries=0 --no-build \
  -g 'AC4: two pages: a stale save opens the conflict dialog'
./scripts/gate.sh
```
