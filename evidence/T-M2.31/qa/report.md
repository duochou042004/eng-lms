QA-VERDICT T-M2.31: PASS
UX-REVIEW T-M2.31: APPROVED

# T-M2.31 delta re-check (qa-protocol §2b), head `02d3503`

Both round-1 QA findings are closed and nothing in AC2 / AC2c / AC3 regressed: all 29 scenarios ran green. The only item left open is UX-1, a UX polish note that needs no change. UX-REVIEW stays APPROVED with it open.

**How I tested**
- **Build:** a packaged production build (jar with the SPA) from `scripts/e2e-run.sh` on a fresh `englms_e2e` database. A temporary hold spec kept the app up and has been deleted.
- **Browser:** QA's own Playwright 1.65 with Chromium 158. Phone sizes ran with mobile emulation; 1280×800 ran as desktop Chrome with classic scrollbars.
- **Failures:** logout 500 was injected with `page.route`; offline used `context.setOffline`.
- **Measurement:** every value comes from 6 polls 150 ms apart. All 6 polls agreed in every case.
- **Not done:** no gate run and no regression workflow.
- **Cleanup:** `git status --short` is empty and port 8080 is free.

**Changed files read:**
- `web/src/features/auth/components/LogoutFailedAlert.tsx` (`aed7575`): the `nearest` scroll, then `fitInScrollport`, which does a whole-pixel scroll of the nearest scrolling ancestor.
- The AC2o test in `e2e/tests/shells.spec.ts`. It asserts Log out "is cut by no more than the shortfall".

## Per-finding status
| ID | Round 1 | Now | Evidence |
|---|---|---|---|
| QA-1 (S3) / AC2o: drawer at 568×320, offline, text clipped | Text ratio 0.739 | **Closed** | See the 568×320 offline details below. |
| QA-2 (S4): ring 0.2 px past the footer's padding-box top at 568×320 with a 500 | Ring gap −0.2 px | **Closed** | 568×320 with a 500, vi/en, mouse and keyboard: ring gap +0.8 px, ring ratio 1.0, text 1.0. |
| OQ-1 (DEC-183): 740×360 offline | (ruled) | **As ruled, not worse** | vi/en, mouse and keyboard: text 1.0, ring gap −1.2 px (ratio 0.977), the Log out box itself fully inside. |
| UX-1 (S4): lopsided popover gutter at 1280 | Open | **Open, unchanged** | Polish only; it follows the packet rule. |

**568×320 offline, vi and en, mouse and keyboard**
- After the mount scroll, the whole alert is visible: title and text ratio 1.0, also in the viewport.
- Focus stays on Log out and the page does not move (`scrollY` 0).
- The footer scrolls 184 of 209 px. Log out's ring sits 21.2 px above the footer edge, so about 39% of the button is hidden. That equals the shortfall: the ring plus the text need about 180.2 px against a 159 px footer. This is the "text wins" trade-off AC2o allows, cut by no more than the shortfall.
- Screenshot `d-drawer-568x320-vi-offline-keyboard.png` (local, not committed):
  - The footer starts with the Log out button. Its top, including the top of the "Đăng xuất" label, is cut by the footer edge; the lower part of the button and its focus ring are visible.
  - Below it the full red alert shows "Chưa đăng xuất được / Bạn đang ngoại tuyến và / vẫn đang đăng nhập. Hãy / đăng xuất lại khi có mạng."

## Regression check of the new effect logic: all PASS
- **Drawer at 568×320 and 740×360 with a 500 (vi, en, mouse, keyboard):** Log out is fully inside the footer, ring ratio 1.0, text 1.0. The footer scrolls to 162 at 568×320 and 152 at 740×360 (152 is unchanged from round 1). Focus stays on Log out and `scrollY` is 0.
- **Log out again (AC2c):** pressing Enter again gives the same geometry and no error page. In every case Esc closes the drawer, returns focus to "Mở điều hướng" / "Open navigation", and logs no pageerror or console error.
- **Student popover at 800×360 and 844×390 (vi, en, 500, offline):** identical to round 1: popover scrollTop 57/107 at 800×360 and 27/77 at 844×390. Text, title and ring are all 1.0. Content width stays 286 → 286 and nothing scrolls sideways. Log out again works, Esc returns focus to the account button, and there is no error page.
- **1280×800 popovers (student vi/en 500/offline, tutor vi/en 500):** popover scrollTop 0 and `scrollY` 0, so the alert causes no scroll. Text 1.0. Content width stays 271 → 271 (classic scrollbars). Esc returns focus to the opener and there is no error page.
- **Forced change-password page at 360×740 (vi/en, 500/offline):** the page scrolls the alert into view: alert bottom at 739.9–740.3 px against a 740 px viewport. Page scroll is 59 for the vi 500 case, the same as round 1. Focus stays on Log out. Log out again shows no error page and no page errors.

## New findings
None.

- **Observation (not a finding):** at 568×320 offline, the top of the focused Log out button and its label are visibly clipped. This is what AC2o and DEC-183 accept. WCAG 2.4.11 is still met because the focused control is only partly hidden. If the LC wants it tidied, it can go to the M2 polish row with OQ-1.
- WebKit is not installed locally, so it was not checked.

**Wall-clock: about 10 minutes (delta round).**

---

# Round 1 report (full combined QA+UX, head `2bf2c32`)

QA-VERDICT T-M2.31: PASS WITH MINOR
UX-REVIEW T-M2.31: APPROVED

# QA Report — T-M2.31 Overlay scroll follow-ups (popover overflow, drawer alert scroll, the alert effect crash)
Verdict: PASS WITH MINOR · Build: `2bf2c32` (feature/T-M2.31-ui-overlay-scroll, PR #199) · Date: 2026-11-19 · Evaluator: qa-evaluator subagent, combined QA+UX mode (§2a), fresh context

## Environment
- **App:** a packaged production build (the jar with the SPA) from `scripts/e2e-run.sh` on a fresh `englms_e2e` database. I did not set `E2E_KEEP_DB` and did not touch the PO's dev DB.
  - To keep the app running while I worked, I added a temporary "hold" spec, `e2e/tests/zz-qa-hold.spec.ts`. It has been deleted.
- **Browser:** Playwright 1.65 from `qa/node_modules`, with Chromium 158 (`chromium-1254`).
  - Phone and tablet sizes ran with mobile emulation (`isMobile`, `hasTouch`, overlay scrollbars).
  - 1280×800, plus one extra 800×360 run, ran as desktop Chrome with classic 15 px scrollbars.
- **Data:** the tutor is `e2e-tutor` from global setup. Students were created through the API, each with the long vi name "Nguyễn Thị Phương Thảo QA".
- **Failures:** logout 500 was injected with `page.route`; offline used `context.setOffline(true)`.
- **Not run:** WebKit is not installed locally and I did not install it. I did not run the `regression` workflow or `gate.sh`.
- **Cleanup:** scratch scripts lived only under `.claude/scratch/qa-T-M2.31/` (git-ignored); the scratch specs are deleted. `git status --short` is empty and port 8080 is free.
- **Order of work:** I drafted the verdict from black-box results first. Only then did I read `git diff develop...HEAD -- web/src`, to explain the findings. My attempt to read `evidence/T-M2.31/summary.md` was denied by the permission classifier, so I have not read the summary.

## AC results
| AC | Scenario(s) | Viewports | Result | Evidence |
|---|---|---|---|---|
| AC1 (a) | Student account popover, logout 500 and offline, vi and en: mount scroll, wheel / touch / keyboard scrolling, the scrollbar gutter, page lock | 800×360, 844×390, 915×412 (+768×1024, 1280×800) | PASS | Details below |
| AC2 (b) | Tutor drawer footer, logout 500, vi and en, mouse and keyboard-only: Log out plus its focus ring inside the footer's padding box, alert text visible, page still | 568×320, 740×360 | PASS (S4 note QA-2) | Details below |
| AC2 (b), offline variant (UI rule "the alert text wins") | Tutor drawer, offline | 568×320 | **Deviation: QA-1 (S3)** | Text 0.739 |
| AC2c (c) | After a failed logout: Esc, Log out again (2nd 500 or still offline), language switch, navigate away, and success after a failure | All sizes above + 1280×800 student and tutor popovers + forced page | PASS | Details below |
| AC3 | 1280×800 popover: the alert causes no page scroll. Forced change-password page at 360×740 brings the alert into view. More sheet 360, drawer 360/768 | 360, 768, 1280 | PASS | Details below |
| AC4 | axe (wcag2a/aa, 21, 22aa) and a mid-word break probe in each changed state, vi and en; tutor popover at 1280 with no alert | 800×360, 568×320, 1280×800, 360×740 | PASS | Details below |
| AC5 | Gate/CI | — | Not re-run by QA (LC/CI evidence) | — |

**AC1, student popover**
- **Box and lock:** the popover is `overflow-y: auto`, `scrollbar-gutter: stable`, `scroll-padding-block: 4px`. React Aria's inline max-height is 284 / 314 / 336 px at the three sizes. The popover box is 100% inside the viewport, `html` keeps `overflow: hidden`, `scrollY` stays 0 and there is no horizontal scroll.
- **800×360, 500:** scrollHeight 351 vs clientHeight 282. The mount scroll goes to scrollTop 57: alert text ratio 1.0, title 1.0, Log out plus ring 1.0, focus on Log out.
- **800×360, offline:** scrollHeight 401, scrollTop 107; all ratios 1.0.
- **844×390 and 915×412:** the same holds (scrollTop 27/77 and 5/55).
- **Content width:** the same before and after the alert (286 px mobile, 271 px classic scrollbars).
- **Wheel:** wheel up reaches scrollTop 0 with the title fully visible; wheel down goes back to the bottom with the text visible. The page does not move.
- **Keyboard:** ArrowUp and End scroll the popover while focus stays on Log out.
- **Touch:** a CDP `touchStart` / `touchMove` drag scrolls the popover (107 → 0).
  - Note: `Input.synthesizeScrollGesture` with touch did not scroll the popover in headless Chromium. Raw touch events did, so I treat that as a tool limitation.

**AC2, tutor drawer**
- Footer clientHeight is 159 at 568×320 and 179 at 740×360.
- **500:** Log out is fully inside the footer (inBox 1). The ring box is 0.996 at 568×320 (see QA-2) and 1.0 at 740×360. The alert text ratio is 1.0, focus stays on Log out, `:focus-visible` is on in the keyboard runs, and `scrollY` is 0.
- The scrollTop is stable across a 6-sample poll: 163 at 568, 152 at 740.

**AC2c, never the error page**
- **Esc:** closes the overlay and focus returns to the opener (the account button or "Mở điều hướng" / "Open navigation").
- **Log out again:** shows the alert again. There is no `pageerror` and no console error apart from the expected "Failed to load resource" lines.
- **Language switch while the alert shows:** the alert re-renders in the other language with no error.
- **Navigating away:**
  - "Đổi mật khẩu" from the popover lands on `/change-password`, and "Học viên" / "Students" from the drawer lands on `/tutor/students`.
  - When offline, those routes show the designed offline page ("Bạn đang ngoại tuyến" / "You're offline"), as in interaction-states §1. Not the error page.
- **Fail, then succeed:** at 1280 the tutor gets a 500, then the route is removed and Log out succeeds. The app reaches `/login` ("Đăng nhập" / "Sign in") with no error: the alert unmounts safely.
- **The G0 repro:** student popover at 1280×800 with a failed logout, then Esc. Shell kept, focus on the account button.

**AC3, kept behaviour**
- **1280×800:** the alert's appearance does not scroll the page (`scrollY` 0, popover scrollTop 0).
- **Forced change-password page at 360×740:** the page scrolls so that the alert's bottom sits at the viewport edge (740.1 / 740 px). Focus stays on Log out, and Log out again gives no error page.
- **Other sizes:** student 360 (More sheet), student 768 (popover) and tutor 360/768 (drawer) all show alert text 1.0, focus on Log out and a safe Esc.

**AC4, axe and wrapping**
- axe: 0 violations in every state, vi and en: tutor popover at 1280 with and without the alert; student popover at 800×360 with the alert; drawer at 568×320 for 500 and offline; forced page at 360×740.
  - axe reports "incomplete" on `aria-prohibited-attr` in the popovers and on `color-contrast` in the scrolled 800×360 popover. Those are needs-review results, not violations.
- The `scrollable-region-focusable` rule produced no violation in the scrolling-popover state.
- Mid-word break probe (per-word Range rects inside the dialogs): none, in vi or en.

## Exploratory charter & notes (about 30 min inside the session)
- **Charter:** sideways phones; 500 and offline; retry, Esc, language switch and navigation after a failure; scroll input methods; ring at the scroll edges; regression at 1280 and on the forced page; keyboard only.
- **Keyboard-only at 800×360:**
  - Reaching the logout attempt takes 9 keys: Tab ×3 to the account button, Enter, Tab ×3, Enter.
  - Focus is contained in the popover and cycles radio → Change password → Log out.
  - Shift+Tab to the language radio scrolls the popover. The radio's ring lands 5.8 px inside the top edge thanks to the scroll padding, and every ring stays inside the padding box.
- **Language switch artefact:** with the offline alert at 800×360, Playwright's `check()` scrolled the language radio into view and pushed the alert text mostly out of view (0.078). That was the tool's actionability scroll. A real user scrolls up to reach the radio anyway, so this is not a finding.
- **Out of scope:** React Aria's English "Dismiss" buttons (DEC-176).

## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| QA-1 | S3 | Tutor drawer at 568×320, **offline**: after the mount scroll, the offline alert's last text line is clipped below the footer. Log out keeps priority instead of the alert text. | 1. Tutor at 568×320 (mobile emulation), vi or en. 2. Open "Mở điều hướng". 3. Go offline. 4. Press Log out (mouse, or keyboard Enter). | UI rule (b): where Log out with its ring plus the alert text cannot fit, "the alert text wins (as today)". The offline copy is 3 lines (alert 129.2 px, footer 159 px), so it cannot fit; the full text should be visible, as on the base build's bottom-aligned `nearest`. | Footer scrollTop 163; Log out ring at the top (gap −0.2 px). Alert text ratio **0.739** in vi and en. The third line ("đăng xuất lại khi có mạng." / "…back online.") is below the footer edge, so the instruction itself is hidden. Reachable by touch or wheel scroll of the footer. 740×360 offline is fine (text 1.0). | Screenshot `tutor-568x320-vi-offline-keyboard.png` |
| QA-2 | S4 | The ring box sits 0.2 px past the footer's padding-box top at 568×320 (500 and offline) and at 740×360 offline. | As in QA-1, or with logout answered 500. | AC2: ring fully inside the padding box. | ringTopGap −0.2 px (ratio 0.996). This is sub-pixel: integer scrollTop against a fractional layout (Log out top at x.8). Not visible; the ring renders intact. | Screenshot `tutor-568x320-en-500-keyboard.png` |
| UX-1 | S4 | Desktop popover with classic scrollbars: the reserved, always-empty 15 px gutter leaves lopsided insets. | Tutor at 1280×800, open the account popover. | Balanced panel padding. | Content inset 16 px left vs about 31 px right; content width 271 px vs 286 px before. This is what the packet's `scrollbar-gutter: stable` rule asks for (accepted in AC4). A polish option is `stable both-edges` or accepting it; no change required. | Screenshot `tutor-1280-en-alert.png` |

**Cause of QA-1 (read after the verdict draft):**
- `Shell.module.css .logoutAlert` sets `scroll-margin-block-start: calc(var(--space-4) + var(--size-control-md) + ring)` on the alert's scroll target.
- With `nearest`, a margin box taller than the scrollport aligns its start edge, so Log out always wins.
- Nothing switches back to aligning the alert's end edge when ring-top to text-bottom exceeds the footer's clientHeight. Offline at 568×320: 4 + 44 + 16 + ~116 ≈ 180 px against 159 px.
- The G0 measurements behind "not at these sizes" covered only the two-line 500 copy.
- Cheap fix: when the group does not fit, scroll the alert itself `nearest` (no margin). A matching E2E case: 568×320 offline, text ratio 0.99.

**Severity rationale for QA-1:** AC2 is worded for "logout answered 500", which passes. The offline case breaks a packet UI rule and is a regression against base, but the text stays reachable by scrolling. So S3, fixed in-task if cheap. If the LC reads the UI rule as part of AC2, it is S2.

### Screenshots (local only, under `.claude/scratch/qa-T-M2.31/shots/`, not committed)
- `student-800x360-vi-500-again-kbd.png`: student popover at 800×360 after a keyboard retry, scrolled.
  - The top of the language control is cut at the popover top edge.
  - Change password is visible, and Log out has a visible 2 px focus ring.
  - The red "Chưa đăng xuất được / Bạn vẫn đang đăng nhập. Hãy thử lại." alert is fully inside the popover above its bottom edge.
  - The page behind is unmoved.
- `tutor-568x320-en-500-keyboard.png`: drawer at 568×320 in en.
  - Today and Students nav, then the footer with the focus-ringed "Log out", then the full "Couldn't log out / You're still signed in. Try again." alert.
  - Only the alert's bottom padding and border are cut at the viewport edge.
- `tutor-568x320-vi-offline-keyboard.png` (QA-1): the same drawer in vi offline.
  - Log out is ring-visible at the top of the footer.
  - The alert shows the title and two lines, "Bạn đang ngoại tuyến và / vẫn đang đăng nhập. Hãy". The third line is cut off at the bottom of the screen.
- `tutor-1280-en-alert.png` (UX-1): tutor popover at 1280×800 with the alert. The panel's right inner margin is visibly wider than its left. Nothing on the page is scrolled.
- Other screenshots: 844×390, 915×412, 768×1024, 360×740 (More sheet and the forced page), 740×360, and 1280 vi/en with and without the alert. They show the same states with nothing clipped and nothing painted outside the overlay.

## Accessibility summary (axe + manual)
- **axe:** 0 violations across 14 analysed states (vi and en).
- **Keyboard-only:** completes the flow; focus is visible, contained and returned on Esc.
- **Focus:** no focus move after the failure.
- **2.4.11:** met at all sizes. Only the sub-pixel QA-2 case falls short of a fully clear ring.
- **1.4.10:** reflow holds: no horizontal scroll at any size.
- **No mid-word breaks.**

## Isolation / privacy checks
- As a student, `GET /api/v1/tutor/students` answers 403, and `/tutor/students` redirects to `/forbidden` ("Bạn không có quyền mở trang này") at 360 and 768.
- No `SECRET-` marker appears in any student `/api/` response captured during these sessions.
- The task is UI-only: no endpoints changed.

## Re-test log
- Round 1 (this report), full combined pass on `2bf2c32`. 16 + 16 + 4 + 2 scripted scenarios plus manual probes.
- An early mismatch in my own keyboard tab-loop caused 9 setup failures. I fixed my probe and reran: 16/16 ran.

**Wall-clock: about 16 minutes (G3 cost table).**
