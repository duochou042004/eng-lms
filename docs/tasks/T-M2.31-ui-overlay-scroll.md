# T-M2.31: Overlay scroll follow-ups (popover overflow, drawer alert scroll, the alert effect crash)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 pending) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.31-ui-overlay-scroll` (from `develop`) |
| Depends on | T-M2.29 (`1d6ace4`), T-M2.30 (`6822841`): merged |
| Estimate | 1 agent-day |
| Risk tier | **M**: UI only (`ui/Popover` CSS, `LogoutFailedAlert`'s scroll effect). No endpoint, DTO, migration, CSP or server change, so no SEC trigger. G3 = **one combined QA+UX `qa-evaluator`** with `QA-VERDICT` and `UX-REVIEW` (a `feature/` branch merges on `QA-VERDICT T-M2.31: PASS` or `PASS WITH MINOR`) |
| Trace | DEC-178 (T-M2.29 G3: QA-1 S3, UX-1 S4 → this row); DEC-182 (G0 S2-1 → (c)); `evidence/T-M2.29/qa/report.md` QA-1, `evidence/T-M2.29/review/ux.md` UX-1; FR-AUTH-04 (log out); design-system §3 (`ui/Popover`); accessibility.md §2 (WCAG 2.4.11 focus not obscured, 1.4.10 reflow); interaction-states §1; lessons L-01, L-03, L-05, L-10; backlog row T-M2.31 |

## Goal
A failed logout's alert is fully reachable in every account overlay on a phone held sideways. The student account popover at 800×360
scrolls inside itself instead of running past the scroll-locked page. In the tutor drawer at 568×320 the focused Log out button and its
focus ring stay fully visible when the alert appears. And a failed logout no longer turns into the error page when the user retries or
closes the overlay in Chrome.

## Scope
- In:
  - **(a) QA-1 (S3, older than T-M2.29).** At 800×360 the student shell shows the account popover, not the More sheet: a sideways phone
    ≥ 768 px wide gets the popover.
    - React Aria caps the popover at `max-height: 284px` (an inline style), but `.popover` in `web/src/ui/Popover.module.css` has no
      `overflow-y`. So a failed logout's 351 px of content runs to y=416 while the page is scroll-locked (`html` `overflow: hidden`).
    - Only 65% of the alert box and 45% of its text are on screen, and the wheel does nothing. The same numbers on the base build show the
      defect predates T-M2.29.
    - Fix in `ui/Popover`: `.popover` gets `overflow-y: auto`, the same rule T-M2.29 (h1) gave the `ui/Sheet` footer. This one shared fix
      covers every `ui/Popover`: the tutor and student account popovers and `DevUiPage`.
  - **(b) UX-1 (S4).** In the tutor drawer at 568×320 the footer is 159 px tall, and `LogoutFailedAlert`'s mount scroll
    (`scrollIntoView({ block: 'nearest' })`, `LogoutFailedAlert.tsx:19`) aligns the alert's bottom edge. That clips the top of the focused
    Log out button and its ring at the footer's scroll edge: 90.4% visible. WCAG 2.4.11 is still met; at 740×360 it is 100%.
    - Measured at G0 (568×320, vi, Chromium 158): footer `clientHeight` 159 px; Log out 44 px; gap to the alert 16 px (`--space-4`); alert
      box 104.4 px (its text wraps to two lines); focus ring 4 px (2 + 2). Ring top to the alert **box** bottom = 168.4 px: does not fit.
      Ring top to the bottom of the alert **text** (the box less its 12 px bottom padding and 1 px border) ≈ 155.4 px: fits, 3.6 px spare.
    - Fix: after the scroll, the Log out button with its focus ring and the alert's title and text are inside the footer's visible box.
      Only the alert box's own bottom padding and border may be clipped.
    - The mechanism is the implementer's choice. Examples: scroll the Log out + alert group into view `nearest`, or put a
      `scroll-margin-block-start` on the scroll target that reaches above the button. Note: with `nearest`, a margin box taller than the
      scrollport aligns its start edge (568×320), a shorter one its end edge (740×360, `clientHeight` 179): AC2 covers both sizes.
    - Keep T-M2.29 (h2): no focus move, no page scroll where the alert is already visible, and the forced change-password page at 360×740
      still brings the alert into the viewport.
  - **(c) G0 S2-1 (DEC-182): the alert's effect crashes the page in Chromium 158.** `LogoutFailedAlert.tsx:19` is
    `useEffect(() => ref.current?.scrollIntoView?.(…), [])`: the arrow returns what `scrollIntoView` returns, which in Chromium 158 is a
    Promise (verified by the LC: `[object Promise]` in Playwright's Chromium 158.0.8127.18). React 19.3 stores it as the effect's cleanup and
    calls it on unmount: `TypeError`, and the route error boundary shows "Không hiển thị được trang này".
    - Seen at G0 on a production build: tutor drawer at 740×360, a failed logout, then Log out again (a second 500); tutor drawer 568×320 and
      the student popover at 1280×800, a failed logout, then Esc. In dev, StrictMode crashes on the first mount.
    - Fix: an effect body that returns nothing (`useEffect(() => { … }, [])`). Grep `web/src` for other effects whose arrow body returns an
      expression and report them (G0 found only this one; `CredentialsCard.tsx:37` returns `focus()`, which is `undefined`).
    - Explain why T-M2.13's kept E2E `shells.spec.ts:908` (a 500, then Log out again) was green with `consoleGuard`
      (`e2e/support/fixtures.ts:38-45`) on the same Chromium, and fix that gap if it is in the test (the summary says what it was).
## Out of scope (explicit)
- `ui/Toggletip`: it has its own `.popover` rule in `Toggletip.module.css` and holds one short message.
- `ui/Sheet`, which T-M2.29 (h1) already fixed. Any server, CSP or session change. React Aria strings (DEC-176).
- A `react-aria` or `react` bump: Dependabot #135 and #165 stay held. The drawer's RTL shortcut.
- A `regression` workflow run: G3 checks the sizes locally on Chromium. The G5 run belongs to T-M2.7 (DEC-180).

## Guardrail answers (scope.md §6)
1. **Trace:** backlog row T-M2.31 (DEC-178). 2. **Drift toward excluded scope?** No: fixes of existing overlays. 3. **Mandatory setup
added?** None. 4. **Weekly use?** The account overlays and Log out, every session. 5. **Hard-coded semantics?** None.

## Design notes
- **Files:**
  - `web/src/ui/Popover.module.css` and `Popover.test.tsx`.
  - `web/src/features/auth/components/LogoutFailedAlert.tsx` and its test, and/or the account section that renders Log out and the alert
    (`web/src/app/shells/ShellParts.tsx`).
  - E2E: add to `e2e/tests/shells.spec.ts`, next to T-M2.29's "AC1/AC2: tutor drawer at 740×360 and 568×320" (≈ `:996`) and its More-sheet
    test. No new spec file.
- **Contradiction scan (L-03).** These kept assertions must still hold:
  - `Popover.test.tsx`: the dialog is labelled and modal, focus goes in and returns. Design-system §3: `Popover` has a fixed width
    (`--size-popover`), and its dialog's focus ring sits inside the panel (`.dialog:focus-visible`, a negative outline offset), so
    `overflow-y: auto` on `.popover` does not clip it. The box shadow is outside the box and is not clipped by the element's own overflow.
  - `LogoutFailedAlert.test.tsx`: `scrollIntoView` called with `{ block: 'nearest' }`, focus unchanged. If (b) changes the call, this test
    changes with it, and the summary says how.
  - `shells.spec.ts` T-M2.29 AC1/AC2: drawer at 740×360 and 568×320, alert text `toBeInViewport({ ratio: 0.99 })`, page scroll unchanged,
    focus on Log out.
  - The forced change-password AC2 at 360×740 (the alert in the viewport).
  - T-M2.13's logout-failure tests (alert, no navigation, focus on Log out).
- **Scrollable region and axe:** the popover becomes a scroll container only when its content exceeds React Aria's cap. It contains
  focusable controls (Log out, the language control), so axe `scrollable-region-focusable` is met. AC4 checks it with axe in that state.
- **Shortcut ledger (L-12):** none fires. `ui/Sheet.module.css:37` (RTL) is untouched.

## UI rules
- **Popover (a):** `.popover { overflow-y: auto; scrollbar-gutter: stable; scroll-padding-block: calc(var(--focus-ring-width) +
  var(--focus-ring-offset)) }`. `scrollbar-gutter: stable` keeps the content width the same when a classic scrollbar appears (Chrome on
  Windows), so the fixed-width promise (design-system §3) holds; `scroll-padding-block` keeps an inner control's outward ring from being
  clipped when focus scrolls it into view (G0 S3-3, S4-1). The width rules are unchanged. React Aria's own `max-height` (from `containerPadding`)
  stays the cap: no new height rule unless the implementer shows the inline cap fails. Then use `max-block-size` in `dvh` and say why.
- **Drawer alert (b):** at 568×320 and 740×360, after a failed logout, the Log out button with its focus ring and the alert's title and
  text are inside the footer's padding box (`clientTop` / `clientHeight`); only the alert box's bottom padding and border may be clipped.
  Where even that cannot fit (not at these sizes, en included: the implementer measures en too), the alert text wins (as today).
- **Focus:** no focus move. After a failed logout focus stays on Log out.
- **Copy:** no string changes. **Layering:** unchanged.

## Acceptance criteria
- **AC1 ((a)), student account popover at 800×360, logout answered 500:**
  - Without any user action, the alert's mount scroll brings its text into view inside the popover (ratio 0.99), focus stays on Log out and
    Log out is visible; the title is reachable by the wheel inside the popover; nothing paints outside the popover's box.
  - The page behind does not move. No horizontal scroll. The popover's content width is the same before and after the alert (the gutter).
  - Seen failing first on today's `ui/Popover` (L-01).
  - At 844×390 and 915×412 the same holds (the alert text visible inside the popover's box, nothing painted outside it); failing first at
    844×390 (G0 measured the alert box bottom 10 px past the viewport today).
  - The tutor shell's account popover at 1280×800 does not regress (the T-M2.13 popover tests are kept).
- **AC2 ((b)), tutor drawer at 568×320 and 740×360, logout answered 500:**
  - The focused Log out button is fully inside the footer's visible box, including its focus ring (`--focus-ring-width` +
    `--focus-ring-offset`). Measure with bounding boxes against the footer's box, read through a poll (L-05).
  - The alert text is fully visible (ratio 0.99, as T-M2.29), focus stays on Log out, and the page does not move.
  - Seen failing first at 568×320 on today's code.
- **AC2c ((c)):** with `scrollIntoView` returning a Promise:
  - a unit test (a `scrollIntoView` mock that returns a Promise, then unmount) fails on today's effect and passes on the fix;
  - E2E (Chromium): after a failed logout, Esc keeps the shell (no error page, focus returns to the opener), and Log out again with a second
    500 shows the alert again, in the tutor drawer and the student popover. Seen failing first on today's code.
- **AC3 (kept behaviour):**
  - T-M2.29's AC1/AC2 tests pass unchanged: the drawer, the More sheet, and the forced change-password page at 360×740.
  - Where the alert is already visible (the popover at 1280×800), its appearance does not scroll the page.
- **AC4:** axe clean and no mid-word break (`expectNoMidWordBreak`) in each changed state, in vi and en.
  - Screenshots at phone-small, tablet and laptop, plus 800×360 and 568×320, kept locally and not committed.
- **AC5:** `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept.

**When a new check finds a real defect** outside this packet's allowed change (L-10): the implementer reports it at once as an OQ.
`test.fail` is allowed only until the LC rules, and the LC rules before G3.

## Test plan
- **Implementation:**
  - `Popover.test.tsx`: the class rule only, since jsdom cannot measure; the layout proof is the E2E.
  - The `LogoutFailedAlert` / account-section test for (b).
  - E2E at 800×360, 844×390 and 915×412 (student popover) and at 568×320 and 740×360 (tutor drawer), with `page.setViewportSize` in
    `shells.spec.ts`, on the projects T-M2.29 used.
  - The mandatory three projects in the gate.
- **Independent QA focus (combined QA+UX):**
  - Sideways phone sizes: 800×360, 844×390 and 915×412 in the student shell (popover; the tutor shows the drawer below 1024 px,
    `TutorShell.tsx:38`) and 568×320 / 740×360 in the tutor drawer, with logout answered 500 and offline.
  - After a failed logout: Esc, Log out again, the language switch, and navigating away: never the error page.
  - Wheel, touch and keyboard scrolling inside the popover; the focus ring at the footer edge.
  - The language switch inside the popover while the alert shows.
  - No regression at 1280×800 or on the forced change-password page.

## Evidence required
- `evidence/T-M2.31/summary.md`, recorded by the LC from the implementer's text (L-07). It holds:
  - AC → proof, and each failing-first observation;
  - the frontend-standards self-check list;
  - the G3 cost table.
- One gate log on the final head (trimmed) and green CI.
- Local screenshots (not committed).
- The QA report on `qa/T-M2.31`, and the UX record in `review/ux.md` on the records branch.

## Docs to update
- `docs/05-frontend/design-system.md` §3, the `Popover` entry (≈ line 109): content taller than the available height scrolls inside the
  popover.
- The backlog (LC at merge).

## Risks & assumptions
- **Assumption:** React Aria (`react-aria-components` 1.21.1, transitive `react-aria` 3.52.1) keeps setting `max-height` inline on the popover (QA measured 284 px at 800×360). If a later version
  drops it, the UI rule's `dvh` fallback applies.
- **Risk:** (b)'s mechanism can scroll the footer to a different place than T-M2.29's `nearest`. AC2 and AC3 bound that change.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
pnpm --dir web test --run src/ui src/features/auth src/app
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop tests/shells.spec.ts
ENGLMS_TASK=T-M2.31 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.31-ui-overlay-scroll
```
