# UX-REVIEW T-M2.14 (PR #108; rounds 1–3; final APPROVED at `d1e5fbd`)

Fresh ux-reviewer subagent (resumed for each delta round); recorded by the LC from the reviewer's returned text (the reviewer writes no files). Screenshots stay in the LC's local records (`.claude/scratch/lc-records/T-M2.14-ux-r*`), not in the repo.

| Round | Head | Verdict | Findings → fix (DEC-126) |
|---|---|---|---|
| 1 | `982bb71` | CHANGES REQUESTED | S2 UX-1 (toasts over a modal hide its focused buttons at 360); S3 UX-2 (focus after Undo stays in the toast region), UX-3 (vi "Học lại"), UX-4 (= QA-4, overflowing toast shows later); S4 UX-5..UX-7 → AC12 (a)–(g) |
| 2 | `2c1c4fc` | CHANGES REQUESTED | UX-1..UX-7 fixed; S3 UX-8 (a timed toast pushed out by an action toast returns) → AC12 (l) |
| 3 | `d1e5fbd` | **APPROVED** | UX-8 fixed; no open findings |

Rulings (DEC-126): QA-5 accepted; the Account `h2` focus fallback after Undo accepted; Edit profile focusing Full name accepted; Undo on its own line accepted; the hover pause after a mouse Cancel at 360 accepted.

## Round 3

UX-REVIEW T-M2.14: APPROVED

Round 3 on head `d1e5fbd`, run on the packaged jar built the same way as `scripts/e2e-run.sh`. UX-8 is fixed and nothing from round 2 regressed. No S1 or S2 findings are open.

### UX-8 / AC12 (l): fixed
I ran Pause → Resume → Pause → Archive at 360×740 in en and at 1280×800 in vi. In every case below the hidden first "An paused" (the toast Archive pushed out of view) never came back.

| Path | 360 en | 1280 vi |
|---|---|---|
| (1) × on the Archive toast (An is ARCHIVED on the server) | Only the 2 toasts that were already visible remain | Same |
| (2) Client-side navigation to Binh | The 2 visible ones stay for their remaining time, then 0 | Same |
| (3) Failed Undo (409, alert "Couldn't undo. Use Reactivate." / "Không hoàn tác được. Hãy dùng Kích hoạt lại.") | The 2 visible ones close within about 4 s; nothing comes back | Same |

In round 2 this case brought back the 3rd toast, which said something false. A stale "Profile saved" no longer reappears after a failed Undo either.

**S4, no change needed:** after × in path (1), the two remaining toasts were still there after 7 s at both viewports. Most likely focus moved to the next toast after ×, and §4 pauses timers while focus is inside the region. I did not check where focus was.

### Round-2 smoke at 360×740, vi and en
- **UX-1:** with three toasts open, the conflict dialog and the reset dialog hide the toast region (hidden, `inert`, z-index 150). The focused Cancel/Huỷ is the topmost element and overlaps no toast. After Cancel, the region and all three toasts come back and focus returns to Reactivate.
- **UX-2:** focus after Undo is on the Account `h2` ("Account" / "Tài khoản").
- **UX-3 and UX-7:** the new vi copy is in place ("Tiếp tục học", "Đã chuyển … sang Tạm nghỉ", "Đã cho … học tiếp", "Bỏ thay đổi").
- **UX-5:** in edit mode, the "Other contacts" `h4` matches its `h3` (16 px, no padding, aligned).
- **UX-4:** after four timed toasts and a navigation, the count on the other page is 3 for 5 s, then 0. Nothing shows up late.
- **Extra change:** after Pause and after Archive, the focused control is clear of the toasts.
- **Regression:**
  - Layout: Edit profile under its heading, actions stacked at 328 px, no horizontal scroll, targets at least 44 px.
  - Focus: Full name when editing opens, the ErrorSummary on a failed save, Edit profile after Save, the card heading after a reset, and Reset password after Done.
  - F10: 3 steps.

Only 360 and 1280 were run this round; 768 was last checked in round 2.

### Rulings (unchanged, in DEC-126)
QA-5 accepted (S4). The `h2` fallback after Undo accepted. Focus on Full name when editing opens accepted. Undo on its own line accepted. The pointer resting over the returning toast region after a mouse Cancel is accepted as designed hover-pause (S4).

### Cleanup
The app is stopped, `backend/target/classes/static` is removed, `git checkout -- evidence/T-M2.14` is done, and `git status` is clean on `d1e5fbd`. No PR comment was posted.

Screenshots are in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/95e88d51-0cf3-4229-9e6b-2adfee30d4de/scratchpad/ux-T-M2.14/r3/`:
- UX-8 runs: `360-en-1-after-dismiss.png`, `360-en-2-other-student.png`, `360-en-3-failed-undo.png`, and the same three for `1280-vi-*`
- Smoke run: `360-{vi,en}-01…09-*.png`, plus `log-360-{vi,en}.txt`

Not checked this round: screen-reader output and reduced motion. The dev database now holds about 10 more `ux6-*` and `ux4-*` students.

## Round 2

UX-REVIEW T-M2.14: CHANGES REQUESTED

Round 2 on head `2c1c4fc`. I ran the packaged jar (built the same way as `scripts/e2e-run.sh`) and walked it with Playwright at 360×740, 768×1024 and 1280×800, in vi and en, with new students. AC12 (a)–(g) all work as described, and nothing from round 1 regressed. The one thing left: the UX-4 fix (AC12 (d)) only covers half the cases. A timed toast pushed out of view by Archive's toast still comes back later, sometimes saying something false on another student's page. It's S3, which normally wouldn't block. I'm requesting changes anyway because AC12 (d) as written ("a timed toast pushed out of the 3 visible is closed at once") is not met, and the fix is about one line.

Screenshots are in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/95e88d51-0cf3-4229-9e6b-2adfee30d4de/scratchpad/ux-T-M2.14/r2/`, with per-viewport logs `log-<width>-<locale>.txt`. My round-1 files were cleared from the scratchpad between rounds, so the round-1 screenshot paths no longer exist.

### The AC12 items, checked on the running app
| Item | Result | Evidence |
|---|---|---|
| (a) UX-1 | **Fixed.** With three toasts open (one of them Archive's), the conflict dialog and the reset dialog both open with the toast region hidden and `inert` (z-index 150). The focused Cancel/Huỷ is the topmost element at its centre and overlaps no toast, at all 3 widths in vi and en. After Cancel, the region and all three toasts come back and focus returns to Reactivate. | `*-06-conflict-dialog-toasts-hidden.png`, logs ("UX-1 conflict", "reset dialog focus") |
| (b) UX-2 | **Fixed.** Undo by keyboard (F6, Tab, Enter) with two other toasts open puts focus on the Account `h2` ("Account" / "Tài khoản") at every width and locale. | `*-07-after-undo.png` |
| (c) UX-3 | **Fixed.** The new vi copy appears in the button and the toasts: "Tiếp tục học", "Đã chuyển … sang Tạm nghỉ", "Đã cho … học tiếp". | `360-vi-05-archive-toasts.png` |
| (d) UX-4 | **Only partly fixed.** See UX-8 below. When four timed toasts are sent and you then navigate client-side, the hidden one no longer comes back: the count on the other student's page was 3, 3, 3, 3, 3, 0… at 360 in vi and en. | logs ("UX-4") |
| (e) UX-5 | **Fixed.** In edit mode "Other contacts" is an `h4`, 16 px like its `h3`, with 0 inline padding, start-aligned with the `h3` (x 16 / 256). | `*-02-edit-errors.png` |
| (f) UX-6 | **Fixed.** The icon's centre equals the centre of the message's first line (605/605, 580/580, 889/889, 665/665). | `*-05-archive-toasts.png` |
| (g) UX-7 | **Fixed.** The discard dialog reads "Bỏ thay đổi" / "Tiếp tục sửa". | `*-03-discard-dialog.png` |
| Extra change at 360 (focused control scrolled clear when a toast appears) | **Works.** After Pause and after Archive, the focused Resume/Reactivate overlaps no toast and is the topmost element. | logs ("after pause focus", "after archive") |

### Regression pass (no change from round 1)
- **Layout:** at 360, Edit profile sits under its heading and the actions stack at 328 px. At 768 and 1280 they sit inline, with Edit profile at the end of the heading row. No horizontal scroll anywhere. Targets are at least 44 px tall.
- **Focus:**
  - Opening Edit profile focuses Full name; a failed save focuses the ErrorSummary.
  - After Save, focus is on Edit profile and "Profile saved" appears.
  - The reset dialog opens on Cancel; the card focuses its "New temporary password" heading; Done returns focus to Reset password.
  - Edit profile is disabled while the card shows.
  - A failed Undo shows the "Couldn't undo. Use Reactivate." alert.
- **F10:** 3 steps at every width (Reset password → Confirm → Copy message).
- **F2:** the add form flow is untouched in this round.

### New finding
**UX-8 (S3), all widths (checked at 360 en): a timed toast pushed out by Archive's toast still shows up later.**
- **Cause:** in `ui/toastQueue.ts`, `toast.success` returns early for a toast with an action, before the sweep that closes hidden timed toasts. So when the Archive toast pushes a timed toast out of view, that toast stays hidden instead of being closed. It comes back when the Archive toast closes for any reason other than a later timed toast arriving: ×, a failed Undo, or leaving the page.
- **What I saw:**
  - **After ×:** Pause → Resume → Pause → Archive, then × on the Archive toast. The first "An … paused" comes back while the server says An is ARCHIVED. (`360-en-10-hidden-toast-returns-after-dismiss.png`)
  - **After leaving the page:** the same sequence, then client-side navigation to Binh. Binh's page shows "An paused", "An resumed", "An paused", while An is ARCHIVED. (`360-en-11-hidden-toast-on-other-student.png`)
  - **After a failed Undo:** a stale "Profile saved" came back in my main walk at every width.
- **Fix:** run the same sweep after `queue.add` for action toasts too, so every timed toast that is not visible is closed whichever kind of toast pushed it out. Add a unit test: 3 timed toasts, then an action toast, then close the action toast; no timed toast comes back.

### Ruling on QA's new point (pointer over the returning toast region)
**Accepted, S4, no change.** After a mouse click on the dialog's Cancel, the pointer can end up over the toast region as it comes back, which pauses a timed toast until the pointer moves. Pausing on hover is what interaction-states §4 specifies. The toast closes as soon as the pointer moves, React Aria ignores hover from touch, and a toast that stays longer hides nothing (scroll padding still applies).

In my run the pointer happened to land clear of the toast (Cancel at y 461–505, toast at 662–724), and the toast closed after 5 s.

The other round-1 rulings stand as recorded in DEC-126: QA-5 accepted, the `h2` fallback accepted, focus on Full name accepted, Undo on its own line accepted.

### Cleanup
The app is stopped, `backend/target/classes/static` is removed, `git checkout -- evidence/T-M2.14` is done, and `git status` is clean on `2c1c4fc`. My scripts and logs are only in the scratchpad. No PR comment was posted.

Not checked this round: screen-reader output, reduced motion, and the conflict dialog with "Copy my note". UX-8 is easy to reproduce: three timed confirmations and an Archive within 5 s. The dev database now holds about 20 more `ux4-*` and `ux5-*` students.

## Round 1

UX-REVIEW T-M2.14: CHANGES REQUESTED

The verdict is CHANGES REQUESTED because of one S2 finding (UX-1): at 360 px, open toasts sit on top of a modal dialog and completely hide its buttons, including the focused one. Everything else passes or is S3/S4.

I ran the packaged jar (built the way `scripts/e2e-run.sh` builds it, on :8080) at head `982bb71` and walked it with Playwright at 360×740, 768×1024 and 1280×800, in vi and en, signed in as `e2e-tutor`. I created my own `ux-*`, `ux2-*` and `ux3-*` students with long Vietnamese names. Screenshots are in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/95e88d51-0cf3-4229-9e6b-2adfee30d4de/scratchpad/ux-T-M2.14/`, named `<width>-<locale>-NN-*.png`, with measurement logs in `log-*.txt`.

### What passes (checked myself)
- **Layout rules:**
  - Below 768 px, Edit profile sits under its heading (h2 top 395, button top 425). At 768 and 1280 it is at the end of the heading row.
  - Save/Cancel, the Account actions and the card's actions are 328 px wide and stacked at 360, and inline and start-aligned at 768 and 1280.
  - Toasts are 328 px wide (16 px gutters) at 360, and 384 px (24rem) at the bottom end at 768 and 1280.
  - No horizontal scroll on any screen I measured (scroll width minus window width is 0 everywhere).
  - Every Account, card, Undo and Dismiss target is at least 44 px tall.
- **Focus:**
  - Opening Edit profile focuses Full name.
  - A failed save focuses the ErrorSummary; a successful Save focuses Edit profile and shows "Profile saved".
  - After Pause or Archive, focus stays on the same button position (now Resume or Reactivate).
  - The reset dialog opens on Cancel. Confirming it puts focus on the card's "New temporary password" heading; Done returns focus to Reset password.
  - Edit profile is disabled while the card shows.
- **Archive and Undo at 360:** with the page scrolled to the end, the focused Reactivate button (top 323) does not overlap the toast stack (top 559).
- **Status and colour:** status always shows an icon, text and colour. Disabled actions show the "Save or cancel your changes first" hint.
- **Step budgets:** F10 is 3 steps at every viewport (Reset password → confirm → Copy message). F2 is untouched.

### Findings

**UX-1 (S2), 360×740, vi and en: the conflict dialog is hidden behind the toasts (WCAG 2.4.11).**
- **How to reproduce:** Pause → Resume → Archive, then another tab edits the student, then press Reactivate. The "This was changed elsewhere" dialog opens, but its focused Cancel button (y 425–469) and Reload are completely under the toast stack (408–724). At the button's centre, the topmost element is the "paused" toast, not the button.
- **Why it happens:** the toasts are drawn above the modal scrim (the implementer did this on purpose: `--z-toast` > `--z-overlay`). So the Undo button stays visible and clickable over a modal. A touch user has to dismiss toasts before they can reach Reload.
- **Other dialogs:** the same applies to any dialog opened while toasts show. The reset dialog was only 20 px clear in vi at 360. At 768 and 1280 the conflict dialog stayed clear (`hitIsSelf: true`).
- **Fix (a fixed rule, not content-driven):** while a modal dialog is open, toasts are neither visible nor reachable. They go under the overlay (the scrim covers them and they are inert), their timers pause, and they come back when the dialog closes.
- **Test to add (E2E):** at 360×740 with three toasts, one of them Archive's, the conflict dialog's Reload and Cancel boxes overlap no toast box, and `elementFromPoint` at the focused button's centre returns that button.
- **Evidence:** `360-vi-15-conflict-dialog-under-toasts.png`, `360-en-15-…`, `360-vi-09-reset-dialog.png`.

**UX-2 (S3), all viewports: focus after Undo lands on another toast when more than one toast is open.**
- **What happens:** with the "paused" and "resumed" toasts still open, pressing Undo (F6 → Tab → Undo → Enter) moves focus to the "…paused" toast instead of the Account `h2`. The Account `h2` fallback only works when the Archive toast is alone (I confirmed `h2 "Account"` for both keyboard and pointer Undo).
- **Why it matters:** focus stays inside the region, which pauses the timers, so stale toasts never close while the user's focus is there.
- **Fix:** in `AccountSection`'s `afterUndo` effect, treat focus that is still inside the toast region the same as lost focus (`document.activeElement.closest(<region>)` → `titleRef.focus()`).
- **Evidence:** `log-*-*.txt` ("focus after Undo div …paused").

**UX-3 (S3), vi: "Học lại" is the wrong word for Resume.**
- **Problem:** "Học lại" usually means to retake or re-learn something, not to resume. The toasts also use mixed sentence patterns: "{name} đã tạm nghỉ" / "{name} đã học lại" versus "Đã lưu trữ {name}" / "Đã kích hoạt lại {name}".
- **Fix:**
  - Change `account.resume` to "Tiếp tục học" and `account.resumed` to "Đã cho {{name}} học tiếp".
  - Change `account.paused` to "Đã chuyển {{name}} sang Tạm nghỉ", so all four toasts start with "Đã …".
  - `account.failed.resume` would then read "Không cho học viên học tiếp được. Hãy thử lại."
- **Evidence:** `360-vi-06-paused-toast.png`, `360-vi-07-archive-toast-end.png`.

**UX-4 (S3, raised from QA-4's S4), all viewports: an older toast pushed out of view shows up later as a false statement.**
- **What happens:** after 4 quick status toasts, a client-side navigation to student B's page showed "An … paused" for 5 s, about 5 s later. By then An was already back to Active. A full reload clears the queue; client-side navigation does not.
- **Why S3:** the message is now untrue and appears on another student's page. It does not block merge, because it needs 4 confirmations within 5 s.
- **Fix (fixed rule):** a timed toast pushed out of the visible 3 is closed, never shown later. For example, in `toast.success`, after `add`, close timed toasts beyond `queue.visibleToasts`. Persistent action toasts are never the ones dropped, because the newest is always visible.
- **Evidence:** `360-en-14-qa4-late-toast-on-other-student.png`.

**UX-5 (S4), edit form at all viewports, vi and en: the heading hierarchy is inverted.**
- **Problem:** in edit mode, "Contacts" (`h3`, `--font-size-md`) is smaller than its own sub-heading "Other contacts" (also an `h3`, in the bigger `.legend` style). "Other contacts" is also indented 4 px by `.legend`'s `padding-inline`.
- **Fix:** in edit mode, render the handles title as an `h4` styled the same as or smaller than `.subTitle`, with no inline padding outside the `fieldset`.
- **Evidence:** `768-vi-03-edit-errors.png`, `768-vi-03b-contacts-zoom.png`.

**UX-6 (S4), Undo toast at all viewports: the icon is vertically centred across both rows.** With a message and Undo, the check icon sits beside the middle of the message rather than its first line. Fix: `.withAction .icon { align-self: start; }`, with a top margin equal to the half-leading of the message. Evidence: `1280-en-07-archive-toast-end.png`.

**UX-7 (S4), vi: the Discard button says only "Bỏ".** interaction-states §2.9 asks the confirm button to repeat the verb. Use "Bỏ thay đổi".

### Rulings on the QA points
- **QA-4:** confirmed and raised to S3. See UX-4 above.
- **QA-5 (the pending status button announced assertively): accepted as S4, informational.** This is React Aria's built-in pending announcement. The packet requires the pressed button to keep its label, and the result is announced politely by the toast. No change needed.
- **Focus after Undo falling back to the Account `h2`:** accepted when the Archive toast is alone. The element focused before (Reactivate) is still there, but it is disabled while the requests run, so React Aria can't return focus to it, and the `h2` fallback is what the packet says. The multi-toast case is wrong (UX-2). Optional improvement: keep the toast open with Undo pending until the requests finish, so focus returns to the re-enabled button.
- **Edit profile focusing Full name:** accepted. The trigger disappears and the form has no heading, so the first field is the logical place. Please record this in the packet and design-system notes.
- **Undo on its own line:** accepted. It is a fixed rule, readable at 360, and the same at every width. The only issue is the icon alignment (UX-6).

### Cleanup
The app is stopped, `backend/target/classes/static` is removed, `git checkout -- evidence/T-M2.14` is done, and `git status` is clean on `982bb71`. My scripts (`ux.cjs`, `ux2.cjs`, `ux3.cjs`) and run logs are in the scratchpad only. No PR comment was posted.

Not checked: screen-reader output (only React Aria roles and focus), the conflict dialog with "Copy my note" (taller, so likely worse under UX-1), and reduced motion. The dev database now holds about 15 extra `ux*` students.
