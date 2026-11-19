# T-M2.31 summary: overlay scroll follow-ups and the logout alert effect crash
Branch `feature/T-M2.31-ui-overlay-scroll` (from `develop` `c4c4d7a`) · code head `ed57e1e` · gate log `4dfd63f` · trace DEC-178, DEC-182, FR-AUTH-04 ·
PO start 2026-11-19 (~12:02Z; answered Hold on 2026-11-18).
Recorded by the LC from the frontend-implementer's text (L-07). Failing-first and untrimmed logs: `.claude/scratch/lc-records/T-M2.31/` (local, git-ignored).

## Gate (G1)
Run 1 (implementer) on `ed57e1e`: `gate: PASS (13 steps, 785s)`; backend and contract-drift skipped (web-only diff); e2e 485 s including the
`shells.spec.ts` ×3 repeat on phone-small, tablet and laptop. Log `gate-20261119T121710Z.log` (trimmed to 154 lines, all 32 `gate:` lines kept).
Before the gate, the full `shells.spec.ts` run on the fixed code: 99 passed, 24 skipped. `check-docs` PASS; `check-path-ownership` PASS (10 files).

## Commits
| sha | subject |
|---|---|
| 82b8cba | fix(ui): scroll popover content taller than its cap inside the popover (`Popover.module.css`, `Popover.test.tsx`, design-system §3) |
| f555f47 | fix(auth): keep the logout alert effect cleanup-free and Log out in view (`LogoutFailedAlert.tsx` + test, `ShellParts.tsx`, `Shell.module.css`, `shells.test.tsx`) |
| ed57e1e | test(e2e): guard fresh contexts and cover the overlay scroll and alert crash (`e2e/tests/shells.spec.ts`) |
| 4dfd63f | chore(evidence): T-M2.31 gate log (trimmed) |

## Implementation
- **(a)** `.popover { overflow-y: auto; scrollbar-gutter: stable; scroll-padding-block: calc(var(--focus-ring-width) + var(--focus-ring-offset)) }`;
  width rules unchanged; no height rule (React Aria's inline `max-height` held at every size tested).
- **(b)** `LogoutFailedAlert` takes an optional `className` for its scroll target; `AccountSection` passes `.logoutAlert` with
  `scroll-margin-block-start: calc(var(--space-4) + var(--size-control-md) + var(--focus-ring-width) + var(--focus-ring-offset))` (the gap, Log
  out's 44 px and its ring). With `nearest` the ~168 px margin box is taller than the 568×320 footer (159 px), so it aligns at the start (ring at
  the footer's top edge, alert text ~3.6 px short of the bottom); at 740×360 (179 px) it aligns at the end. The call stays
  `scrollIntoView({ block: 'nearest' })`, so the kept `LogoutFailedAlert.test` assertion is unchanged; the forced change-password page passes no class.
- **(c)** Block-body effect: `useEffect(() => { ref.current?.scrollIntoView?.({ block: 'nearest' }) }, [])`.

## AC → proof
| AC | Proof | Failing first on `c4c4d7a` |
|---|---|---|
| AC1 (a) | Unit `Popover.test` "scrolls content taller than its cap…" (the CSS rule). E2E phone-small "AC1/AC4: student account popover at 800×360 (vi, en)", "844×390 (vi)", "915×412 (vi)": text in view (0.99) and inside the popover's box, Log out in view and focused, nothing painted below the box, content width unchanged, page scroll unchanged, no horizontal scroll; at 800×360 the wheel scrolls inside the popover to the title and text | Unit: `overflow-y` rule missing. E2E: 800×360 text 47.98 px outside the popover's box; 844×390 viewport ratio 0.557; 915×412 12.98 px outside the box |
| AC2 (b) | Unit `shells.test` "T-M2.31 (b)…" (scroll target carries `.logoutAlert`, the CSS rule, the `.account` gap). E2E phone-small "AC2/AC4: tutor drawer at 568×320 and 740×360… (vi, en)": polls that Log out plus ring, the title and the text are each inside the footer's padding box; text in view (0.99); focus on Log out; page does not move | E2E 568×320 vi: Log out's ring −9.2 px outside the footer's padding box. Unit: `.logoutAlert` missing |
| AC2c (c) | Unit `LogoutFailedAlert.test` "survives a scrollIntoView that returns a Promise…" (StrictMode mount, unmount, no throw, no `console.error`). E2E "AC2c: tutor drawer at 740×360" (phone-small) and "AC2c: student popover at 1280×800" (laptop): Esc keeps the shell, no error page, focus returns to the opener; Log out again with a second 500 shows the alert again | Unit: `TypeError: destroy is not a function`. E2E both: the "Không hiển thị được trang này" h1 count 1; guard logged `TypeError: l is not a function` and "React Router caught the following error during render" |
| AC3 | T-M2.29's tests (drawer 740×360 and 568×320, More sheet 568×320, forced change-password vi/en) keep every assertion and pass; T-M2.13's tests pass. New laptop "AC3/AC4: tutor account popover at 1280×800": the alert appears with no scroll inside the popover and no page move | The 1280×800 test failed on today's code (the second Log out crashed the page) |
| AC4 | `expectSettledAccessible` (axe, no horizontal scroll) and `expectNoMidWordBreak` in every new state, vi and en, incl. the tutor popover at 1280×800 with no alert | Within the failing tests above |
| AC5 | Gate green once on `ed57e1e`; CI on the PR | n/a |

## (c) effect grep (`web/src`, non-test)
- `LogoutFailedAlert.tsx:19`: the defect, fixed.
- Intentional cleanup returns: `App.tsx:14` (`connectAuthProblems` disconnect), `students/components/AccountSection.tsx:85`, `ui/Button.tsx:61` (`() => () => …`).
- Same shape, returning `undefined` today (left unchanged, out of scope): `ProfileForm.tsx:70`, `GuardianForm.tsx:239`, `LearningProfileForm.tsx:120`,
  `CredentialsCard.tsx:37`, `ui/ConfirmDialog.tsx:92` (all `.focus()`), `ui/Toggletip.tsx:55` (`setAttribute`).

## Why `shells.spec.ts:908` (T-M2.13) stayed green
`consoleGuard` (`e2e/support/fixtures.ts:38-45`) listens only on the test's own `context`; the test signs in through `freshSession`
(`browser.newContext()`), so nothing listened on the page that crashed. The second Log out got a 204 and navigated to `/login`, replacing the error
page before any assertion. The gap was in the test. **Fix:** `guardContext(context, problems)` in `shells.spec.ts` applies the fixture's rules
(reusing the exported `isAnonymousSessionProbe`); `freshSession` takes an optional `guard`; T-M2.13's 500 and offline tests, T-M2.29's four tests and
all new tests pass it and accept their provoked 500s with `acceptStatus`. **Proof:** with the guard on, today's code failed T-M2.13 "a 500…" (laptop),
"offline…" (phone-small, laptop) and T-M2.29 "drawer at 740×360 and 568×320", each on the same TypeError; all pass after the fix. No assertion removed or loosened.

## frontend-standards self-check (implementer)
- [x] UI rules block met (popover rule as specified; drawer Log out, ring, title and text inside the footer's padding box at 568×320 and 740×360, vi and en; no focus move; no copy or layering change).
- [x] `expectSettledAccessible` and `expectNoMidWordBreak` on each changed state (the changed state is the alert inside the account overlays, measured at the packet's sizes; no data view changed, so no `longData` fixture).
- [x] Focus not lost: stays on Log out after each failed Log out; Esc returns focus to the opener; T-M2.13's `expectFocusNotLost` kept.
- [x] Async state through polling assertions, no wall-clock bounds; each new check seen failing.
- [x] No new strings; heading levels unchanged; no counters.
- [x] Docs named in the packet in sync: design-system §3 Popover entry.

## Screenshots (local, git-ignored, `evidence/T-M2.31/impl/`)
phone-small: `logout-failed-popover-800x360-{vi,en}`, `-844x390-vi`, `-915x412-vi`, `logout-failed-drawer-ring-568x320-{vi,en}`,
`-740x360-{vi,en}`, `logout-failed-again-tutor-vi`; laptop: `account-popover-1280x800-{vi,en}`, `logout-failed-popover-1280x800-{vi,en}`,
`logout-failed-again-student-vi`; the kept tests' shots under phone-small, tablet and laptop.

## Deviations (accepted by the LC)
1. T-M2.29's four tests and T-M2.13's offline test now pass `consoleGuard` to `freshSession` and accept their 500s: stricter, no assertion changed.
   `failLogout`, `pageScroll`, `scrollPageToEnd` moved verbatim from the T-M2.29 describe to module scope.
2. The guard helper lives in `shells.spec.ts`, not `e2e/support/fixtures.ts` (packet file list; avoids the all-specs ×3 gate repeat); ~10 lines duplicate the fixture's listener logic.
3. AC2c covers the drawer at 740×360 (phone-small) and the student popover at 1280×800 (laptop), the sizes where G0 saw the crash.

## Open questions → LC
- **OQ T-M2.31-1:** the same unguarded-context gap exists in other specs using `browser.newContext()`: `route-focus.spec.ts`, `students-list.spec.ts`,
  `auth.spec.ts`, `students-account.spec.ts`, `navigation.spec.ts`, `e2e/support/students.ts:71,82`. Suggestion: export `guardContext` from
  `fixtures.ts` for every fresh context (repeats all specs ×3 in the gate). Not checked whether those specs hide errors today.
- **OQ T-M2.31-2 (optional):** a lint rule against expression-bodied effect arrows; the six `focus()`/`setAttribute` effects would need block bodies first.

## G3
Pending: one combined QA+UX `qa-evaluator` on the final head (packet G3).

| Round | Reviewer | Head | Verdict | Findings | Mode | Tokens | Minutes |
|---|---|---|---|---|---|---|---|
| impl | frontend-implementer | `ed57e1e` | gate PASS | — | — | 199,373 | 28.2 |
