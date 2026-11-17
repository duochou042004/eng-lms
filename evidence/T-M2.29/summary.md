# T-M2.29 summary: UI follow-ups from T-M2.13 and the own-logout race
Branch feature/T-M2.29-ui-logout-followups (from `develop` 6ccd792) · (h1) `2b915f2`, (h2) `25fb339`, (j) `5284bc4`, gate log `c6837c7`;
this summary, DEC-177 and the trimmed gate log `4ae60ff`; merged `1d6ace4` (PR #190, DEC-178); QA report PR #191 `141c763` · trace DEC-172, DEC-173, DEC-174, DEC-176, DEC-177, FR-AUTH-04 · PO start
2026-11-17T12:50Z · 2026-11-17. Recorded by the LC from the frontend-implementer's text (L-07).

## Gate (G1)
- One run on `5284bc4` (the final code; later commits are evidence/docs only): `gate: PASS (13 steps, 854s)`; web-test 852/852; e2e default
  pass 536 passed / 46 skipped; repeat ×3 of `shells.spec.ts` and `students-list.spec.ts` 381 passed / 33 skipped. Log
  `gate-20261117T131354Z.log` (trimmed by the LC from 2,590 to 52 lines: every `gate:` line and the counts).

## What changed
- (h1) `web/src/ui/Sheet.module.css` `.footer { max-block-size: 50%; overflow-y: auto }` (the packet's rule); header and body unchanged.
- (h2) `LogoutFailedAlert.tsx`: a wrapper `<div ref>` calls `scrollIntoView?.({ block: 'nearest' })` on mount; no focus move.
- (j) `session.ts`: module flag `isOwnLogoutInFlight()`, set in `useLogout.onSuccess` before the first clear, reset in `finally` after
  `await navigate('/login')`, then `removeQueries` on the inactive queries but the session (DEC-177 (1)); `guards.ts`: the UNAUTHENTICATED
  reaction returns early while it is on (no navigation, no clear). Never set in `mutationFn`, `onMutate` or `logout()`.
- Docs: design-system §3 `Sheet` (footer rule), frontend-architecture §2 ("Own logout in flight"), the `guards.ts` comment block.

## AC → proof
| AC | Proof |
|---|---|
| AC1 (h1) | `Sheet.test.tsx` "the footer takes at most half the sheet and scrolls; the body keeps its own scroll". E2E `shells.spec.ts` "T-M2.29 … AC1/AC2: tutor drawer at 740×360 and 568×320": title and text each scrolled into view (`toBeInViewport({ratio: 0.99})`, DEC-177 (3)), dialog inside the viewport, no horizontal scroll, axe, `expectNoMidWordBreak`, focus on Log out. Student More sheet at 568×320: every laid-out h2/p/a/button/radio reachable. Kept `Sheet.test.tsx` assertions pass |
| AC2 (h2) | `LogoutFailedAlert.test.tsx`: called with `{block:'nearest'}`, focus stays on Log out. E2E "AC2/AC5: forced change-password page" on phone-small, tablet, laptop: alert in viewport (polled), Log out focused, `expectFocusNotLost`. E2E "AC2: the account popover or drawer" (three projects) plus the drawer and More-sheet tests: the page's scroll position unchanged when the alert appears (polled) |
| AC3 (j) | `guards.test.tsx` "own logout with 401s while /login loads": session read held, two 401s fired; URL exactly `/login`, no `signedOutElsewhere`, no notice, no second clear, afterwards only the session and `/login`'s public meta cached. E2E `students-list.spec.ts` "T-M2.29 AC3" holds the race deterministically (DEC-177 (2)), three projects. "sign-out never asks" ×50 laptop `--retries=0`: **50 passed, 0 failed** (96 s) |
| AC4 (j kept) | New `guards.test.tsx` cases "a logout answered 401 … /login?next=<path>" and "the signal ends with the navigation: signed in again, a later 401 goes to /login?next="; no-second-clear in the AC3 test; new `sessionBoundaries.test.tsx` "sign-out with a 401 during its navigation: no write and no query of the earlier session". Kept unchanged and passing: `guards.test.tsx:103`, sessionSync "no notice after this tab's own logout", sessionBoundaries 204 case, T-M2.13 failure tests, `navigation.spec.ts` cross-tab, `session.test.tsx` |
| AC5 | `expectSettledAccessible` (axe, no horizontal scroll) in each changed state; `expectNoMidWordBreak` at 360 vi and en on the forced page and at 740×360 / 568×320 in the drawer; no string changes. Screenshots local only (`evidence/T-M2.29/impl/`, git-ignored) |
| AC6 | Gate PASS (above); CI on the PR; all existing assertions kept |

## Failing first (L-01)
1. Unit tests on today's code: 3 failed / 14 passed: `guards.test.tsx:176` (expected `/login?next=%2Ftutor%2Ftoday` to be `/login`),
   `Sheet.test.tsx:84` (footer rule had padding only), `LogoutFailedAlert.test.tsx:25` (`scrollIntoView` not called with `{block:'nearest'}`).
2. `sessionBoundaries.test.tsx:102` with `session.ts`/`guards.ts` at HEAD: `/login?next=%2Ftutor%2Ftoday` vs `/login`.
3. Mutations of the four (j) rules (guards tests): flag set in `mutationFn` → "a logout answered 401" fails; flag never reset → "the signal
   ends" fails (`/tutor/today` vs `/login?next=…`); no `removeQueries` → the race test fails (cache size); navigation suppressed but caches
   still cleared → the race test fails (cached value cleared).
4. E2E with the product files at HEAD: drawer 740×360 viewport ratio 0.109 (`shells.spec.ts:1026`); forced page 360×740 ratio 0.433
   (`:1125`); AC3 E2E on phone-small and laptop landed on `/login?next=%2Ftutor%2Fstudents%2Fnew`. The no-regression checks (More sheet
   568×320, popover/drawer page position, forced page on tablet/laptop) pass on today's code, as intended.

## Rulings (DEC-177)
Three implementer deviations accepted: (1) inactive-only removal keeps `/login`'s public meta; (2) the AC3 hold point; (3) ratio 0.99.

## Observation for G3 (not a finding)
On the tutor drawer at 568×320, *opening* the drawer moves the page behind the scrim (scrollTop 37 → 12) before any logout: existing open
behaviour (likely React Aria's scroll lock), not introduced here; the AC2 page-position checks measure after the overlay opens.

## Self-check (frontend-standards)
- [x] The packet's UI rules: the footer rule as given, the optional `scrollIntoView`, no focus move, no copy change, layering unchanged.
- [x] axe and `expectNoMidWordBreak` on each changed screen (fixed copy only; no long user data on these screens).
- [x] Focus stays on Log out after a failed logout; `/login`'s route focus after a successful one (existing tests).
- [x] Async state read by polling; each new check seen failing.
- [x] No vi button, heading-level or counter change.
- [x] Docs named in the packet in sync.

## Not checked
Real-device landscape Safari; Firefox/WebKit (not installed locally; the M2 G5 regression covers them).

## G3 cost
| Role | Run | Tokens | Wall clock |
|---|---|---|---|
| frontend-implementer | 1 | 180,391 | ~38 min (agent clock) |
| qa-evaluator (combined QA+UX) | 1 | 132,160 | ~20 min (agent clock); ~230 scenario executions |

## G3 result
`QA-VERDICT T-M2.29: PASS WITH MINOR`, `UX-REVIEW T-M2.29: PASS WITH MINOR` (`qa/report.md`, `review/ux.md`): QA-1 (S3, older than this
task, `ui/Popover`) and UX-1 (S4) to T-M2.31 (DEC-178); DEC-177's rulings found sound. CI 7/7 on `4ae60ff`.
