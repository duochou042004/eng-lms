# T-M2.19 summary: automated UI checks

Recorded by the LC from the frontend-implementer's returned text (the harness blocks subagents from writing this file).
PR #117 · branch `feature/T-M2.19-ui-checks` · code `62bec11`, gate log and records `b175d81`.

## Gate (G1)
`ENGLMS_TASK=T-M2.19 ./scripts/gate.sh` on `62bec11`: PASS, 13 steps, 712 s (11.9 min), `evidence/T-M2.19/gate-20261020T065326Z.log`.
Web tests 705/705; E2E 449 passed / 31 skipped; changed specs ×3 (`checks.spec.ts`, `students.spec.ts`) 519 passed / 3 skipped; bundle
unchanged (student 186.7 KB gz, tutor 186.8 KB gz).

## AC → proof
| AC | Status | Proof |
|---|---|---|
| AC1 | pass | `e2e/support/checks.ts`: `expectNoMidWordBreak`, `expectFocusNotLost`, `expectSettledAccessible` (one-line doc comment each) and the moved `lineCount`; the local `expectAccessible` is gone and its callers use the shared `expectSettledAccessible` |
| AC2 | pass | `e2e/tests/checks.spec.ts`: 12 tests × 3 projects; failures asserted with `rejects.toThrow()` under a 1 s timeout; every listed case plus a word split across inline tags and focus inside an `inert` region; for (b) an immediate `expectNoAxeViolations` on the same fixture fails |
| AC3 | pass | `describe('Long data (T-M2.19)')`, vi and en × 3 projects: list row name, `h1`, guardian `h3`, every `h2`, every button with text; fixture `e2e/support/longData.ts` (fictitious, checks its own lengths) |
| AC4 | pass with 4 known failures (see OQ T-M2.19-1) | every scope-5 action, the two D-4 tests, 9 extra controls |
| AC5 | pass | stylelint rule + `web/scripts/stylelint-motion.test.mjs` (3 of its 4 tests fail with the rule removed); `pnpm lint` passes; E2E: Skeleton `1.4s` (list held), Spinner `0.8s` (guardian Save held); under reduced motion both stop, Spinner opacity 0.6 |
| AC6 | pass | test-strategy §1, responsive-standards §3 item 1, design-system §2 Motion; the frontend-standards self-check already named the helpers (no change) |
| AC7 | gate pass; CI on the final head | no existing assertion removed (deletions: the two local helpers and the old import line) |

## Scope 5 coverage
The LC's list, the two D-4 tests (guardians Try again under a 503 route; Add student guardian-row Remove of first/middle/last) and, found by
the inclusion rule: pager Previous on page 2; Edit profile; guardian Edit and the section's Add guardian; Keep editing in the unsaved-changes
dialog (Add student, Edit profile, guardian form); Reset dialog Cancel and the credentials card Done; Add another on the Add student card;
Clear filters; the any-student check Try again and Include archived (known failures); the 30th Add contact. Not included (not removed or
disabled by their own press): the Account status buttons (stay enabled while pending), the guardian Remove trigger (opens a dialog).

## Open question OQ T-M2.19-1
Focus drops to `body` after the list error Try again, the any-student check error Try again and Include archived in the all-archived empty
state (`StudentsListPage`), and the workspace error Try again (`StudentWorkspacePage`). Kept as `test.fail` in round 1 because the packet
forbade focus changes; LC ruling below.

## Deviations
- The stylelint Vitest test runs in jsdom, not `// @vitest-environment node`: the shared `src/test/setup.ts` needs `window`.
- Each helper takes an optional `{ timeout }`; `expectFocusNotLost` defaults to 5 s and also fails inside an `inert` region;
  `expectSettledAccessible` also waits for `data-exiting`.

## Self-check (frontend-standards)
- [x] UI rules met; durations kept through tokens
- [x] Long data at 360/768/1280 in vi and en
- [x] `expectFocusNotLost` after every removing/disabling action (4 known failures, OQ T-M2.19-1)
- [x] No copy, heading or counter change
- [x] Docs in sync

Screenshots: local only (git-ignored), `evidence/T-M2.19/impl/<project>/long-*`.

## G3 cost (DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| G1 | frontend-implementer | 62bec11 | gate PASS | — | full | 216,603 | 35.2 | 1 | 11.9 |

Agent tokens and minutes are the Agent result's `subagent_tokens` and `duration_ms`.
