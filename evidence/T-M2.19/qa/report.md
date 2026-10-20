# QA Report — T-M2.19 automated UI checks (combined QA+UX pass, DEC-131)

> Recorded by the LC from the evaluator's returned text. Round 1 on `d227f48` (DEC-136); the S3 findings and QA-4/6/7 were fixed via AC9 in `0fa7a36` + `c2e300e`; delta re-check on `b89e147` (DEC-137). Screenshots stayed local (git-ignored).

## Round 1 (`d227f48`)

QA-VERDICT T-M2.19: PASS WITH MINOR
UX-REVIEW T-M2.19: APPROVED

I wrote this verdict draft from the packet, DEC-135, the docs, black-box tests of the helpers and the running app. I read the diff only after that, for line references. The diff outside `e2e/` is what the packet allows: `tokens.css` (+2 lines), the Spinner and Skeleton CSS modules (1 line each), the stylelint config (+3 rules), the new Vitest file, and the AC8 focus changes in `StudentsListPage` and `StudentWorkspacePage` with their tests. I found no change to product copy or layout and nothing out of scope (no SCOPE finding).

## Findings

| ID | Sev | Location | Failure scenario | Suggested fix |
|---|---|---|---|---|
| QA-1 | S3 | `web/src/features/students/routes/StudentWorkspacePage.tsx:48-55` (the `retried` effect) | AC8 is only met when the retry succeeds. If the workspace Try again fails again (API still answering 503), focus drops to `body` and stays there. Timeline, pressing Enter on Try again: +50 ms `body`, alert unmounted (refetch in progress); +3 s the alert is back, focus still `body`. The list page's Try again keeps focus on `h1` in the same situation, because it focuses the heading before refetching. | Also move focus to `main h1` once the error view renders again after a retry (for example fire the effect when `student.isError && !student.isFetching`). Add an E2E test for the retry-fails case. |
| QA-2 | S3 | `e2e/support/checks.ts:70-82` (`expectFocusNotLost`) | The check can pass wrongly when the focused control becomes disabled or hidden instead of removed. Chromium keeps `document.activeElement` on the now-disabled or `display:none` button until a later focus fix-up, so the first poll passes. Measured with a scratch spec: native `disabled` passed 14/15, `display:none` 15/15, disabled after an `await` 15/15, all with focus effectively gone. Scope 5 explicitly includes controls that "become disabled". The app is not affected today: the pager tests also assert `toBeFocused`, and on the 30th Add contact I checked that focus goes to the new input. | Treat `active.matches(':disabled')` or `!active.checkVisibility()` as lost. Add the disabled and `display:none` cases to `checks.spec.ts`. |
| QA-3 | S3 | `e2e/tests/students.spec.ts:2361-2377` (Motion tokens, AC5) | The test is flaky: it failed 1 of 60 runs at phone-small. `animationDuration` read back as `""` (with `running: true`) right after `toBeVisible`. A flaky-test finding under test-strategy §3, and it can fail the gate's ×3 run. | Wrap the computed-style read in `expect.poll(...).toEqual(...)`. Optionally select the Skeleton by role or test id rather than by the hashed `_skeleton_` class. |
| QA-4 | S4 | `e2e/tests/checks.spec.ts` (the "focus stays inside an inert region" test) | The test passes through the `body` branch, not the `inert` branch: Chromium blurs a focused element when its ancestor becomes inert (focus ended on `BODY` in my probe). So the helper's `closest('[inert]')` branch is never exercised. | Rename the test (it shows that focus is lost to `body` after an inert freeze), or drop the claim that it covers the inert branch. |
| QA-5 | S4 | `e2e/support/checks.ts:39-66` (`expectNoMidWordBreak`) | It reports false breaks (too strict, never a wrong pass): (a) text inside a `display:none` child is counted; (b) words separated only by `<br>` are joined into one "broken" word ("abc<br>def" is reported as "abcdef"). | Skip text nodes whose parent has no client rects, and split words at `<br>` (or use `innerText`). |
| QA-6 | S4 | `web/scripts/stylelint-motion.test.mjs:1` | Scope 6 asks for `// @vitest-environment node`. The file has no such directive and runs under jsdom, although its own comment says jsdom is not wanted. | Add the directive. |
| QA-7 | S4 | `e2e/tests/checks.spec.ts` ("fails on a hidden element") | `rejects.toThrow(/visible/)` would also pass if the locator never matched anything (a typo in `#t`). | First assert `toHaveCount(1)` on `#t`. |

## How each check held up under mutation (scratch spec outside the tree)

- **`expectNoMidWordBreak`**
  - It fails, as it should, on: a forced break in the 3rd word, a word split across inline elements, `hyphens:auto`, `word-break:break-all`, `&nbsp;`-joined wrapping, button text, `display:none`, `visibility:hidden`, a zero-height clipped box, empty text and whitespace-only text (visible box: "has text").
  - It passes on a clean multi-line box and on a split word that fits.
  - It waits for fonts: a web font delayed 2 s took 2.03 s and then reported the break.
- **`expectFocusNotLost`**
  - It fails on: a self-removing button, `body` for 7 s, `blur()`, and an inert freeze (via `body`).
  - It passes on: a 300 ms transient `body`, and focus moved before removal.
  - The disabled/hidden gap is QA-2.
- **`expectSettledAccessible`**
  - It fails on: low contrast after `data-entering` is removed, `data-entering` or `data-exiting` never cleared ("transitions settled"), a wide page (also with `body{overflow-x:hidden}`), an absolutely positioned element off the right edge, and a nameless button.
  - It passes on: a fade-in that ends readable, and an inner horizontal scroller.
  - Expected limitation: a `data-entering` that appears after the call starts is not waited for. The caller must call it after the end state.
- **AC2 failure assertions:** each one matches a specific message regex (`/words broken/`, `/has text/`, `/focus lost/`, `/color-contrast/`, `/horizontal scroll/`), so none passes because of an unrelated timeout. Two caveats: QA-7, and test (a) does not by itself prove the helper waited; (b) does.

## Scope 5 inclusion rule

I grepped every `onPress` in `web/src/features/students/**`. Every control that unmounts or disables itself has an `expectFocusNotLost` after its end state is visible, or a stronger `toBeFocused`. That includes items beyond the LC's list: Previous on page 2, Clear filters, Add another, the credentials Done, Edit profile, Add guardian, Edit guardian, Discard, and the 10th Add guardian row. The one control with only `toBeFocused` and no `expectFocusNotLost` call is the Add student Create submit (form to card); it asserts focus on the card heading, which is stronger. Account actions use `isPending`, not `isDisabled`, on their own button, and keep the same element when the status changes. Nothing is missing.

## AC8 in the running app (keyboard: Tab to the control, then Enter)

- **List error Try again:** focus goes to `H1 "Học viên"`; the next Tab reaches Add student.
- **Any-student check error Try again:** focus goes to `H1`.
- **Include archived (all-archived empty state):** focus goes to the toolbar Include archived checkbox, URL `?archived=1`. Space still works on it afterwards.
- **Workspace error Try again:** focus goes to the student's `h1` when the retry succeeds. QA-1 covers the case where it fails again.

## UX rulings (motion only)

- `--motion-duration-spin: 800ms` and `--motion-duration-pulse: 1.4s` are in `tokens.css` under Motion, each with a usage comment. The Spinner and Skeleton use the tokens with the same values, so they look the same as before.
- The reduced-motion rules are unchanged: `animation: none` on both, opacity 0.6 on the Spinner. The E2E asserts `1.4s` / `0.8s` and `0s` / not running under reduced motion; it passed 119 of 120 runs at ×20 (QA-3).
- Stylelint, tried with scratch CSS through the project config: it rejects `ms`/`s` (including `MS`) in `transition`, `animation`, `*-duration`, `*-delay`, inside `calc()`, and in any `--*` custom property. This holds for any file other than `src/ui/tokens.css`, including `src/ui/x/tokens.css` and `tokens.module.css`. It accepts `var(--motion-duration)` and `calc(var(...) * 2)`.
- Approved.

## Long-data walk (AC3), my own spot-check against the packaged app

- The fixture lengths are real: 30 / 28 / 60 / 120 characters for full name, username, email and guardian name.
- The walk does exercise wrapping:
  - at 360, the `h1` takes 2 lines and the guardian `h3` takes 4;
  - at 768, the list row wraps to 2 lines.
- No horizontal scroll at 360, 768 or 1280 in vi and en: `scrollWidth` equals `clientWidth` on the list, the profile and Edit profile.
- Usernames and emails use `overflow-wrap:anywhere`, as responsive-standards item 8 allows.
- `html lang` follows the locale.
- Screenshots (local only, under the scratchpad's `qa-T-M2.19/pw/shots/`, not in the tree):
  - `phone-small-vi-profile.png`: the full name wraps between words over 2 lines, the email breaks inside the address (allowed), the 120-character guardian name wraps over 4 lines at word boundaries, and the buttons are whole.
  - `tablet-en-list.png`: the name and username wrap inside the Name column, the email breaks at its dot, and there is no overflow.

## Isolation

Not touched by this task, but checked: with the student session, `GET /api/v1/tutor/students` returns 403 and `/tutor/students/{id}/guardians` returns 403. No `SECRET-*` marker appeared in the student's API responses.

## What I ran

| Command | Result |
|---|---|
| `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=3 tests/checks.spec.ts tests/students.spec.ts` | 519 passed, 3 skipped (the existing phone-small skip of the table test), 0 failed |
| Same projects, `--no-build --repeat-each=20 -g "T-M2.19 AC4\|T-M2.19 AC5" tests/students.spec.ts` (the AC8, D-4, focus and motion tests) | 539 passed, 1 failed (QA-3) |
| `(cd web && pnpm lint && pnpm test --run)` | lint clean; 63 test files, 705 tests passed |
| `npx vitest run scripts/stylelint-motion.test.mjs` | 4/4 passed |
| Scratch Playwright mutation specs, two projects, outside the tree | 78 + 12 + 6 cases, results as above |
| Scratch app specs against the packaged app (during the ×20 run) | AC8 keyboard 21 passed; long data 6 passed; isolation passed |
| `git status` at the end | clean, HEAD `d227f48` |

## Not verified

- I did not run `gate.sh` or check CI, as you asked. AC7 is not verified, and the bundle budget is untouched by this diff.
- No ×20 run for the rest of `students.spec.ts`.
- No screen-reader spot check: no announcement changed.
- WebKit and Firefox were not run.

Wall-clock: about 35 minutes.

## Round 2: delta re-check (`b89e147`, qa-protocol §2b)

QA-VERDICT T-M2.19: PASS WITH MINOR
UX-REVIEW T-M2.19: APPROVED

Delta re-check (qa-protocol §2b) on head `b89e147`, code `c2e300e`. I reviewed the 5 files in `git diff 1d36e7e..c2e300e` and the specs that cover them. All six findings in scope are closed. One small new S4 is left open, which is why the verdict stays PASS WITH MINOR.

## Status of each finding

| ID | Sev | Status | Evidence |
|---|---|---|---|
| QA-1 | S3 | Closed | Tested by keyboard in the packaged app on all three viewports (Tab to Try again, then Enter). When the retry fails, the error view comes back with focus on `main h1` ("Học viên"), and the next Tab reaches Try again. A second failure behaves the same. When the retry then succeeds, focus is on the student's `h1`. The new E2E test passed 60 of 60 runs. |
| QA-2 | S3 | Closed | I re-ran my round-1 probes against the new helper. Wrong passes are now 0/15 each for native `disabled`, `display:none` and "disabled after an `await`" (round 1: 14–15/15). The two new failing fixtures in `checks.spec.ts` pass. |
| QA-3 | S3 | Closed | The Skeleton and Spinner duration reads now use `expect.poll`. The motion tests passed 120 of 120 runs at ×20 (round 1 had 1 failure in 60). |
| QA-4 | S4 | Closed | The inert test is renamed to say that focus is lost to `body` after an inert freeze. |
| QA-5 | S4 | Deferred to T-M2.20 (DEC-136) | Not re-checked. |
| QA-6 | S4 | Closed (as DEC-136 rules) | The file comment is now accurate: the test runs in jsdom because the shared setup needs `window`. The packet's `// @vitest-environment node` directive was not added; the LC accepted the comment instead. The test passes 4/4. |
| QA-7 | S4 | Closed | `toHaveCount(1)` now comes before the hidden-element rejection. |

## New finding

| ID | Sev | Location | Failure scenario | Suggested fix |
|---|---|---|---|---|
| QA-8 | S4 | `e2e/support/checks.ts:78` | `checkVisibility()` without options ignores `visibility:hidden`. A focused button that sets `visibility:hidden` on itself still passes the check: it passed at 3 ms in my probe, with focus still on the button. No students-screen control does this today. | Change it to `checkVisibility({ visibilityProperty: true })` and add one fixture. |

## The QA-1 fix

The effect now also runs when the error is shown again after a retry (`isError && !isFetching`). It also reruns when the data or the error timestamp changes, to cover a fast answer arriving in a single render. This is limited to the workspace retry and changes nothing else.

## What I ran

| What | Result |
|---|---|
| `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --repeat-each=3 tests/checks.spec.ts tests/students.spec.ts` (fresh build) | 546 passed, 3 skipped (the existing phone-small table skip), 0 failed |
| Same projects, `--no-build --repeat-each=20 -g "T-M2.19 AC4\|T-M2.19 AC5" tests/students.spec.ts` (focus, AC8, the new QA-1 test, D-4, motion) | 600 passed, 0 failed |
| Scratch probes against the new helper (outside the tree) | 26 passed; results as above |
| Scratch keyboard specs against the packaged app (QA-1, plus my round-1 AC8 probes as a regression) | 24 passed; every AC8 focus target unchanged |
| `pnpm lint`, plus Vitest on `StudentWorkspacePage.test.tsx` and `stylelint-motion.test.mjs` | lint clean; 2 files, 14 tests passed |
| `git status` at the end | clean (nothing to restore) |

Not run, as you asked: `gate.sh`, a full regression, CI.

Wall-clock: about 14 minutes for this re-check (round 1 was about 35).
