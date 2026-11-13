# T-M2.27 summary: E2E stability (the three known unstable kept tests)
Branch feature/T-M2.27-e2e-stability · code 86ee35c (+ 44c33fb gate log) · trace DEC-163, DEC-165, DEC-159.

## Gate (G1)
./scripts/gate.sh on 86ee35c: gate: PASS (13 steps, 970s); backend, contract-drift skipped (no backend/api change); e2e 515 passed, 31 skipped;
changed specs x3 (tests/loading.spec.ts tests/students.spec.ts) 573 passed, 3 skipped (guards.spec.ts:100 ✘ is an expected failure, counted as passed).
Log: evidence/T-M2.27/gate-20261113T092206Z.log (trimmed; run without ENGLMS_TASK, output captured by redirection).

## AC → proof
AC1 (a) pass: own archived student (status 200), onlyArchived(page, q) adds q only to the archived-inclusive request (size=1 check unchanged;
  without q unchanged, so the any-student check test is unaffected), expect(page).not.toHaveURL(/[?&]q=/), badge read in the row or list item
  holding the student's link; noActive, expectFocusNotLost, checkbox toBeFocused kept.
AC2 (b) pass: +1 line, toHaveAttribute('aria-busy','true') before [data-shown], default budget.
AC3 (c) pass: expect.poll(() => guardianNames(page)).toEqual(['Vũ Thị Hư Cấu']); nothing else changed.
AC4 pass ((b) partly reproduced). AC5 pass (60/60 x3). AC6 gate pass; CI pending.

## AC4 (scratch copies e2e/tests/scratch-t-m2-27-{a,b,c}-{old,new}.spec.ts from .claude/scratch/lc-records/T-M2.27/make-scratch.py <rate>, which must read the old form from `6f284c4` (the pre-task develop), not `HEAD`: on the final head `HEAD` holds the new form (QA S4); the QA copy `qa/make-scratch-qa.py` does that; deleted)
(a)+(c): ./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --retries=0 -g 'only archived students: Include archived|AC4: two pages: a stale save opens the conflict dialog' tests/scratch-t-m2-27-a-old.spec.ts tests/scratch-t-m2-27-a-new.spec.ts tests/scratch-t-m2-27-c-old.spec.ts tests/scratch-t-m2-27-c-new.spec.ts
  → 6 failed, 18 passed. Failures = a-old x3 (getByText('Đã lưu trữ').first() toBeVisible: element(s) not found; route log "archived on page: 0")
  and c-old x3 (toEqual: + Received + 1 at the single guardianNames read). a-new, c-new pass on all three (route log "pass-through …&q=…").
(b): CDP Emulation.setCPUThrottlingRate, phone-small, --repeat-each=20 --retries=0 --no-build -g 'the loading region in English' (old+new copies):
  rate 6/15/25/28: old 20/20, new 20/20 · rate 27: old 19/20 (1 fail at [data-shown]), new 20/20 · rate 30: old 6/20, new 14/20 (6 fail at aria-busy:
  region not shown in 5 s) · rate 35/50: both 0/20. --workers=3 unthrottled, whole file x20: old 80 passed, new 80 passed.

## AC5
(a) 60 passed (29.6s) · (b) 60 passed (22.1s) · (c) 60 passed (1.2m), 20 each on phone-small, tablet, laptop.

## Self-check (frontend-standards)
[x] UI rules n/a (no UI change) [x] Long data n/a [x] expectFocusNotLost kept in (a) [x] polling reads; each old form seen failing
[x] no copy/heading/counter change [x] docs: none named. Screenshots: none.

## Deviations
Gate output captured by redirection (no ENGLMS_TASK) instead of a second gate run. summary.md blocked by the harness (L-07).

## Open questions
None.

## G3 cost (DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| 1 | qa-evaluator (fresh) | `edfeec4` | PASS WITH MINOR | 0/0/0/2 | full | 53,720 | 5.6 | 0 | 0 |

## LC notes
- Implementer: `frontend-implementer`, 92,059 tokens, 2,109.7 s (35.2 min), 53 tool uses; one gate run (970 s).
- (b) at CPU rate 30: the new form passes 14/20 where the old passes 6/20; the remaining failures are the region itself taking over 5 s to appear (no timeout raised, as the packet requires). Accepted under the packet's Risks; the CI failure itself was not reproduced.

- G3: `QA-VERDICT T-M2.27: PASS WITH MINOR` (`qa/report.md`); S4 1 (generator) fixed here, S4 2 ((b) residual risk) accepted (DEC-166).
- Merged: PR #170, `c5772f0` (DEC-166).
