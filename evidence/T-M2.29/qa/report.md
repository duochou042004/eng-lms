# T-M2.29 G3: combined QA + UX report (qa-evaluator, fresh context)

Head reviewed: PR #190 `4ae60ff` (final code `5284bc4`, base `6ccd792`). Black-box first, then the diff `6ccd792..5284bc4`. Each own
scenario seen failing on the base build `6ccd792` and passing on `5284bc4`. Recorded by the LC from the evaluator's text (reviewers return text only).

## Findings
| ID | Sev | Screen / viewport | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| QA-1 | S3 (pre-existing, outside the packet, L-10: an OQ for the LC) | Student account popover at 800×360 (a sideways phone ≥ 768 gets the popover, not the More sheet) | Student signs in at 800×360; `**/api/v1/auth/logout` → 500; open the account popover, press Đăng xuất; wheel over the popover | The whole alert reachable (as AC1 requires for the Sheet) | React Aria caps the popover at `max-height: 284px` but the popover is `overflow: visible`: 351 px of content runs to y=416 while the page is scroll-locked (`html` `overflow: hidden`); 65% of the alert box and 45% of its text on screen; the wheel does nothing. At 844×390 and 915×412 the alert fits, the popover still runs to y=416. The base build gives the same numbers (0.653 / 0.452): not caused here | `web/src/ui/Popover.module.css` `.popover` (no `overflow-y`). Fix: as (h1), `overflow-y: auto` on the popover. Screenshot `x-popover-student-800x360.png` |
| UX-1 | S4 | Tutor drawer at 568×320, vi and en | Logout → 500, press Log out in the drawer | Focus stays on Log out and its ring is fully visible | Focus stays on Log out, but the footer is 159 px and `nearest` aligns the alert's bottom edge, so the top of the button and its ring are clipped at the footer's scroll edge (90.4% of the button visible). WCAG 2.4.11 still met (not entirely hidden); 740×360 is 100% | `web/src/features/auth/components/LogoutFailedAlert.tsx:19`. Fix: `scroll-margin-block-start` ≈ one button height on the wrapper, or scroll the Log out + alert group. Screenshot `ac1-drawer-568x320-vi.png` |

Notes (not findings):
- The implementer's drawer-at-568×320 observation is a Playwright artefact: the banner is not sticky, so at scrollTop 37 the opener sits at
  y=−25 and `locator.click()` scrolls it into view (37 → 12). A real `page.mouse.click` on its visible part and opening by keyboard both
  keep scrollTop (37 → 37, 10 → 10) at 740×360 and 568×320. No severity.
- Enter ×3 on Log out sends two POSTs (the button is not disabled while pending, from T-M2.13). Still exactly `/login`, no notice, 204;
  `ownLogoutInFlight` is a boolean, but `pathname === '/login'` covers the overlap. No action.

## AC by AC
| AC | Evidence | Result |
|---|---|---|
| AC1 | Tutor drawer at 740×360 and 568×320, vi and en, logout 500: dialog inside the viewport (0–360; 0–320), no horizontal scroll on page or dialog, focus on Log out, axe clean; title and text each scroll fully into view (1.000); on mount the alert is already fully visible (the footer scrolls on its own, 179/343 px at 740, 159/343 px at 568; the body scrolls separately); every link/button/h2 reachable; no mid-word breaks. Student More sheet at both heights, vi and en: inside the viewport (top 54, 48), alert box 1.000, all reachable, focus on Log out. Base build: the drawer check failed 5/5 | PASS (UX-1 S4) |
| AC2 | Forced change-password page at 360×740, 768, 1280, 740×360, 568×320, vi and en, keyboard only: alert in viewport on the first poll (1.000), focus on Log out and visible (1.000), axe clean, no mid-word breaks, a retry after the 500 lands on `/login`. Page scroll when the alert appears (opened by keyboard): unchanged for the tutor popover at 1280, the drawer at 768/360/740×360/568×320, the student More sheet at 360×300/740×360/568×320 (e.g. 80 → 80). Base build: the 360×740 forced-page check failed 5/5 | PASS |
| AC3 | Own logout from `/tutor/students/new` with a filled name ×20 on each of phone-small, tablet, laptop, two variants (natural timing with jitter; the session read held 1.5 s after a successful POST): 120/120 exactly `/login`, no notice, no dialog, one navigation. Other pages (`/tutor/today`, `/tutor/students`, a student detail, `/student/home`, forced `/change-password`), held and not, three projects: exactly `/login`. Back after logout goes to `/login?next=…` and paints no earlier data. Base build: the held variant ended on `/login?next=%2Ftutor%2Fstudents%2Fnew` 5/5 laptop, 1/5 phone-small. "sign-out never asks" ×50 laptop `--retries=0`: 50/50 | PASS |
| AC4 | Cross-tab (three projects): tab A `/login`, no notice; tab B `/login?next=%2Ftutor%2Fstudents%2F<id>` with "Bạn đã đăng xuất ở một thẻ khác.". Server-side loss (raw `POST /auth/logout`, then click a student): `/login?next=…`, no notice. Logout answered 401 (session ended via `route.fetch`, client given 401): `/login?next=%2Ftutor%2Fstudents%2Fnew`. Rule-1 attacks: logout, sign in again, server-side loss → `/login?next=` (the signal ended); logout navigation interrupted by Back with the session read held 2.5 s → `/login?next=%2Ftutor%2Fstudents`, nothing painted. No way found to end a real session loss silently on `/login` | PASS |
| AC5 | axe clean in every changed state (drawer, sheet, forced page; vi, en; 360/768/1280/740×360/568×320); no mid-word breaks; no string changes; screenshots local only | PASS |
| AC6 | Gate not re-run (the implementer's log green; CI the regression). `pnpm test --run src/ui src/features/auth src/app`: 466/466, 44 files. The implementer's T-M2.29, cross-tab and sign-out E2E on three projects: 32 passed, 4 skipped | PASS (CI to confirm: 7/7 green) |

Isolation: student B opening `/tutor/students/<A id>` gets the forbidden page; `GET /api/v1/tutor/students/<A id>` 403; the `SECRET-qa29-note`
marker never appears in the student's responses. Scope: only the packet's files. No SCOPE finding.

## UX checklist
`ui/` components and tokens only (a plain `<div>` around `ui/InlineAlert`; a token-free rule); layering and copy unchanged; vi and en correct, no
English leaking into vi; focus never moves or is lost; no horizontal scroll; UX-1 and QA-1 the only issues.

## DEC-177 rulings
1. Inactive-only removal: sound with a caveat: `removeQueries({type: 'inactive'})` runs when `navigate` resolves; if React commits `/login`
   later in a transition, old observers may still be mounted and their queries survive; they can hold only an error (the cache was cleared
   before any refetch, every refetch after the POST answers 401), so the privacy intent holds; Back painted no earlier data in 14 variants.
   Accepted. Optional: also run the predicate removal once after the next tick.
2. The AC3 hold point: sound (own independent hold reproduces on base 5/5 laptop, never on head 0/60).
3. Ratio 0.99: sound (< 1 px on a 78 px alert; own measure 1.000 everywhere).

## Housekeeping and cost
`git status`: only `?? evidence/T-M2.29/records/` (pre-existing). Scratch spec, logs and screenshots in `.claude/scratch/qa-T-M2.29/`
(git-ignored); the temporary `e2e/tests/qa-T-M2.29.spec.ts` and the private base clone removed; no commits, pushes or PR comments.
Cost: ~20 min wall clock; 8 `e2e-run.sh` runs (1 head build, 1 base-clone build, the rest `--no-build`), ~230 scenario executions, one web unit run;
132,160 tokens. Not checked: Firefox, WebKit, real-device landscape Safari, an own full gate run.

QA-VERDICT T-M2.29: PASS WITH MINOR
UX-REVIEW T-M2.29: PASS WITH MINOR
