# T-M2.19 summary: automated UI checks

Recorded by the LC from the frontend-implementer's returned text (the harness blocks subagents from writing this file).
PR #117 · branch `feature/T-M2.19-ui-checks` · code `62bec11` + `91341c5` (AC8) + `0fa7a36`, `c2e300e` (AC9); gate logs and records `b175d81`, `11d1870`, `b89e147`.

## Gate (G1)
Final: on `c2e300e`: PASS, 13 steps, 694 s (11.6 min), `evidence/T-M2.19/gate-20261020T080202Z.log`; web 705/705; E2E 458 passed / 31
skipped; changed specs ×3 546 passed / 3 skipped; bundle within budget (student 186.7 KB gz, tutor 186.8 KB gz); CI 7/7 on `b89e147`.
History: `0fa7a36` FAIL at web-test after 52 s (`gate-20261020T074956Z.log`; the AC9 (a) change broke the AC8 component test, fixed in
`c2e300e`); AC8 on `91341c5` PASS 696 s (`gate-20261020T071245Z.log`); round 1:
`ENGLMS_TASK=T-M2.19 ./scripts/gate.sh` on `62bec11`: PASS, 13 steps, 712 s (11.9 min), `evidence/T-M2.19/gate-20261020T065326Z.log`.
Web tests 705/705; E2E 449 passed / 31 skipped; changed specs ×3 (`checks.spec.ts`, `students.spec.ts`) 519 passed / 3 skipped; bundle
unchanged (student 186.7 KB gz, tutor 186.8 KB gz).

## AC → proof
| AC | Status | Proof |
|---|---|---|
| AC1 | pass | `e2e/support/checks.ts`: `expectNoMidWordBreak`, `expectFocusNotLost`, `expectSettledAccessible` (one-line doc comment each) and the moved `lineCount`; the local `expectAccessible` is gone and its callers use the shared `expectSettledAccessible` |
| AC2 | pass | `e2e/tests/checks.spec.ts`: 12 tests × 3 projects; failures asserted with `rejects.toThrow()` under a 1 s timeout; every listed case plus a word split across inline tags and focus inside an `inert` region; for (b) an immediate `expectNoAxeViolations` on the same fixture fails |
| AC3 | pass | `describe('Long data (T-M2.19)')`, vi and en × 3 projects: list row name, `h1`, guardian `h3`, every `h2`, every button with text; fixture `e2e/support/longData.ts` (fictitious, checks its own lengths) |
| AC4 | pass | every scope-5 action, the two D-4 tests, 9 extra controls; every `expectFocusNotLost` check passes, including the 4 former known failures (fixed by AC8) |
| AC5 | pass | stylelint rule + `web/scripts/stylelint-motion.test.mjs` (3 of its 4 tests fail with the rule removed); `pnpm lint` passes; E2E: Skeleton `1.4s` (list held), Spinner `0.8s` (guardian Save held); under reduced motion both stop, Spinner opacity 0.6 |
| AC6 | pass | test-strategy §1, responsive-standards §3 item 1, design-system §2 Motion; the frontend-standards self-check already named the helpers (no change) |
| AC8 | pass | list error and any-student check Try again focus `main h1` before the refetch; the all-archived Include archived focuses the toolbar's Include archived checkbox (else `main h1`); the workspace error Try again focuses the student's `h1` once it shows; the 4 `test.fail` marks removed and the E2E tests assert the targets; 3 component tests (`StudentsListPage.test.tsx` ×2, `StudentWorkspacePage.test.tsx`) gain a focus line that fails without the fix |
| AC9 | pass | (a) the workspace Try again failing again refocuses `main h1` (new E2E retry-fails case); (b) `expectFocusNotLost` fails on a `:disabled` or unrendered (`checkVisibility()`) active element, two new failing fixtures; (c) the motion reads through `expect.poll`; (d) inert test renamed; (e) `toHaveCount(1)` before the hidden-element rejection; (f) the stylelint test comment matches jsdom; ×20 840/840; delta re-check closed all six (DEC-136) |
| AC7 | gate pass; CI on the final head | no existing assertion removed (deletions: the two local helpers and the old import line) |

## Scope 5 coverage
The LC's list, the two D-4 tests (guardians Try again under a 503 route; Add student guardian-row Remove of first/middle/last) and, found by
the inclusion rule: pager Previous on page 2; Edit profile; guardian Edit and the section's Add guardian; Keep editing in the unsaved-changes
dialog (Add student, Edit profile, guardian form); Reset dialog Cancel and the credentials card Done; Add another on the Add student card;
Clear filters; the any-student check Try again and Include archived (fixed by AC8); the 30th Add contact. Not included (not removed or
disabled by their own press): the Account status buttons (stay enabled while pending), the guardian Remove trigger (opens a dialog).

## Open question OQ T-M2.19-1
Focus drops to `body` after the list error Try again, the any-student check error Try again and Include archived in the all-archived empty
state (`StudentsListPage`), and the workspace error Try again (`StudentWorkspacePage`). Kept as `test.fail` in round 1 because the packet
forbade focus changes. Resolved by DEC-135 as AC8, fixed in `91341c5`.

## Deviations
- The stylelint Vitest test runs in jsdom, not `// @vitest-environment node`: the shared `src/test/setup.ts` needs `window`.
- Each helper takes an optional `{ timeout }`; `expectFocusNotLost` defaults to 5 s and also fails inside an `inert` region;
  `expectSettledAccessible` also waits for `data-exiting`.

## Self-check (frontend-standards)
- [x] UI rules met; durations kept through tokens
- [x] Long data at 360/768/1280 in vi and en
- [x] `expectFocusNotLost` after every removing/disabling action (all pass after AC8)
- [x] No copy, heading or counter change
- [x] Docs in sync

Screenshots: local only (git-ignored), `evidence/T-M2.19/impl/<project>/long-*`.

## G3 cost (DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| G1 | frontend-implementer | 62bec11 | gate PASS | — | full | 216,603 | 35.2 | 1 | 11.9 |
| AC8 | frontend-implementer (resumed) | 91341c5 | gate PASS | — | AC8 | 23,071 | 16.5 | 1 | 11.6 |
| 1 | QA+UX combined | d227f48 | PASS WITH MINOR / APPROVED | 0/0/3/4 | full | 119,621 | 14.5 | 0 | 0 |
| fix | frontend-implementer (AC9) | c2e300e | gate PASS (2nd run) | — | 6 findings | 26,030 | 32.7 | 2 | 12.5 |
| 2 | QA+UX delta re-check | b89e147 | PASS WITH MINOR / APPROVED | 0/0/0/1 (new QA-8) | delta | 12,771 | 14.0 | 0 | 0 |

Agent tokens and minutes are the Agent result's `subagent_tokens` and `duration_ms` (resumed rounds: the delta of the agent's cumulative count). Total G3: 1 review agent (round 1 + one delta re-check), 1 fix round
(AC9), 2 gate runs in it (one failed fast); AC8 was an LC ruling on the implementer's open question before G3. QA-5 and QA-8 (S4) go to
T-M2.20 (DEC-136, DEC-137). LC review records: `.claude/scratch/lc-records/T-M2.19-qa-ux-r1.md`, `-r2-delta.md`.
