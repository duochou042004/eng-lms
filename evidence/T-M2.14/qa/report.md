# QA report T-M2.14 (PR #108, merged `6073e71`)

Independent qa-evaluator subagent (one session, three rounds); recorded by the LC from the evaluator's returned text. Screenshots stay in the LC's local records (`.claude/scratch/lc-records/T-M2.14-qa-r*`).

Final verdict (round 3, `d1e5fbd`): **QA-VERDICT T-M2.14: PASS WITH MINOR** (open: QA-5, S4 informational, accepted by UX, DEC-126).

---

## Round 3

**QA-VERDICT T-M2.14: PASS WITH MINOR**

### QA Report, round 3 (confirmation): T-M2.14

**Head tested:** `d1e5fbd`, which includes `157425c` for AC12 (l) / UX-8. This round tests only that change: one web file (`ui/toastQueue.ts`) and its test. There is no backend or `api/` diff since round 2. All tests used Chromium only (Firefox and WebKit libraries are missing on this device). The dev database was not purged.

## Checks

| # | Check | Result |
|---|---|---|
| 1 | **UX-8, black box, at 360, 768 and 1280.** Pause → Resume → Pause → Archive, then × on the Archive toast, then a client-side navigation to another student. Before ×, three toasts were visible: resumed, paused (the second one) and archived. The first "paused" toast had been pushed out by Archive. After ×, two remained: resumed and paused. After the navigation, those two closed at 5 s. The pushed-out toast never came back during 8 s of watching. | PASS |
| 2 | **Unit tests and budget.** `pnpm test --run`: 58 files, 634/634 tests (+1 since round 2). `pnpm budget`: student 186.6 KB gz (limit 200), tutor 186.8 KB gz (limit 300). | PASS |
| 3 | **E2E.** Full run at phone-small, tablet and laptop: 344 passed, 31 skipped. `--grep "T-M2.14" --repeat-each=5`: 180/180 passed, with no flakes. | PASS |
| 4 | **AC12 (d), 4 quick timed toasts, at all 3 viewports.** Only the newest three (Ovf2–4) were ever shown. Ovf1 never appeared, and the region was empty from 5 s on. | PASS |

## Findings still open

- **QA-5 (S4, informational):** when a status button goes pending, React Aria announces its own label assertively. This is library behaviour and outside AC12, so it goes to the backlog or the UX screen-reader check.
- **Closed:** QA-1 (S2), QA-2 (S3), QA-3 (S3) and QA-4 (S4). No S1, S2, S3 or SCOPE findings are open.

## Commands

- `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --reporter=line`: 344 passed.
- `./scripts/e2e-run.sh --no-build … --grep "T-M2.14" --repeat-each=5`: 180 passed.
- `cd web && pnpm test --run && pnpm build && pnpm budget`: green.
- Black-box script `ux8.js`, run against the packaged jar.
- `git checkout -- evidence/T-M2.14`: `git status` is clean on `d1e5fbd`.

Files are in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/95e88d51-0cf3-4229-9e6b-2adfee30d4de/scratchpad/qa-T-M2.14/`:
- `r3/e2e-full.log`
- `r3/e2e-repeat5.log`
- `r2/scripts/ux8.js`

This round confirms only the AC12 (l) change, not the whole task again. The full regression is in round 2 on `2c1c4fc`, and nothing outside `toastQueue.ts` has changed since. I did not run `gate.sh` myself; the implementer reports it passed twice on `157425c`.

---

## Round 2

**QA-VERDICT T-M2.14: PASS WITH MINOR**

### QA Report, round 2: T-M2.14 Student profile editing, status and password reset

- **Verdict:** PASS WITH MINOR. There are no S1, S2, S3 or SCOPE findings. One S4 remains open (QA-5, carried over from round 1).
- **Head tested:** `2c1c4fc` (fix commit `6883cd5`, packet AC12 (a)–(k), DEC-126), on branch `feature/T-M2.14-student-profile-account`, PR #108.
- **Date:** 2026-10-18. Round 2, by an independent QA subagent.
- **Environment:** the packaged jar from `./scripts/e2e-run.sh` (e2e profile, signed in as `e2e-tutor`) on the dev PostgreSQL 18 under Podman. The database was not purged. All students used were created by me.
- **Browser:** Chromium only, because the Firefox and WebKit host libraries are missing on this device. Viewports 360×740, 768×1024 and 1280×800, in vi and en.
- **Method:** black-box first. I checked every AC12 item with my own Playwright scripts against the running app before looking at the fix.

## AC12 results (black-box, `2c1c4fc`)

| Item | What I checked | Viewports | Result |
|---|---|---|---|
| (a) UX-1: toasts under modals | **Setup:** 3 toasts, one of them the archive toast with Undo, then the conflict dialog; the same for the reset and discard dialogs. **While a dialog is open:** the region is `inert` and `visibility:hidden` and the scrim covers it. `elementFromPoint` at the focused button returns that button. Dismiss cannot be hit by the pointer. Tab stays on Reload/Cancel and F6 cannot leave the dialog. **Timers:** the timed toasts are still there after 6.5 s with the dialog open. **Overlap:** at 768 and 1280 the dialog buttons overlap no toast box. At 360 they overlap only the hidden boxes, which are not visible or reachable. **After closing:** the region comes back and the timed toast closes about 5.3 s later. | 360/768/1280 | PASS |
| (b) UX-2: focus after Undo | **Keyboard (F6 → Tab → Undo → Enter):** with 2 other toasts open, focus moves to the Account `h2`. **Mouse:** focus goes back to the Account button the tutor used before, and never stays inside the region or on `body`. | all 3 | PASS |
| (c) UX-3: vi copy | The button reads "Tiếp tục học". The toasts read "Đã chuyển … sang Tạm nghỉ", "Đã cho … học tiếp", "Đã kích hoạt lại …" and "Đã lưu trữ …". The failure alert reads "Không cho học viên học tiếp được. Hãy thử lại." | 1280 vi | PASS |
| (d) UX-4, QA-4: overflow | **4 quick timed toasts:** only the 3 newest are ever visible; the 4th oldest is never shown later, and the region is empty at 5 s. **Archive toast plus 3 "Profile saved" toasts:** the archive toast is kept and appears when they close, so it is never dropped. | all 3 | PASS |
| (e) UX-5: h4 heading | In edit mode "Liên hệ khác" is an `h4` at 16px/600, the same size as the Contacts `h3`. It has no inline padding and is aligned with its container (same x). | 1280 vi | PASS |
| (f) UX-6: icon alignment | In the archive toast the icon's centre matches the message's first line within 1 px (top 595 vs 595 at 360; 904 vs 903 at 768). | all 3 | PASS |
| (g) UX-7: discard button | The vi discard dialog has the buttons "Bỏ thay đổi" and "Tiếp tục sửa". | 1280 vi | PASS |
| (h) QA-2: Account alerts test | The ×20 run had 60 passes out of 60 for this test (the whole ×20 run was 720/720). | 3 | PASS |
| (i) QA-3: long Account test | Same ×20 run: no timeouts in 60 runs. | 3 | PASS |
| (j) SEC S-1: no query survives sign-in | **Steps:** a PATCH answer was delayed 3 s and faked as 200 with `LATE-ANSWER…`. I logged out while it was pending, signed in again through the form, and blocked the detail GET for 4 s. **Result:** the page showed only its loading frame, with no cached student and no `LATE-ANSWER` before or after the fetch. | 1280 vi | PASS |
| (k) SEC S-2: no toast in the next session | **Steps:** a status answer was delayed 3 s and faked as 200, and I logged out while it was pending, then signed in again. **Result:** no toast in the new session. | 1280 vi | PASS |
| Extra fix: focused control clear of toasts | **Tab sweep:** with 3 toasts visible I tabbed 25 times through the page; no focused control ended up under a visible toast. **Published size:** the region's height is published in whole pixels (`--toast-stack-size` 193/218/256/281px), and `main` padding and the root `scroll-padding` equal that size + 16px. **Reactivate at 360:** focused and scrolled to the end, it stays in view and does not overlap a toast. | all 3 | PASS |

## AC1–AC11 regression (`2c1c4fc`)

| AC | Result | Notes |
|---|---|---|
| AC1 | PASS | **PATCH body:** only the changed fields plus `version`; an emptied phone is sent as `phone:null`; a no-op save sends nothing. **After Save:** focus is on Edit profile and the toast closes after 5.1 s. **List:** shows the new email. |
| AC2 | PASS | **Failed submits:** client errors and an injected 422 both focus the summary; the 422 marks row 2 `aria-invalid`. **500:** the alert shows and the input is kept. **Double click:** one request. |
| AC3 | PASS | **Availability:** the student's own name sends no check; "Taken" shows for another student's. **409 `USERNAME_TAKEN`:** focuses Username. **Sessions:** the old session still answers 200, the new username signs in and the old one gets 401. |
| AC4 | PASS | **Profile vs profile:** Copy my note, Cancel keeps the input, Reload shows the other tab's values. **Stale status button:** opens the same dialog. |
| AC5 | PASS | **Undo:** from PAUSED, 2 requests (v2 then v3); from ACTIVE, 1. **Archive toast:** still there after 10.5 s, closed by Reactivate, removed when leaving the page. **Undo failures:** "Couldn't undo" with no dialog; the 2nd-request failure alert. **Other errors:** INVALID_STATE_TRANSITION and network alerts, never an error toast. **Pending:** all actions and Edit profile are disabled. **Sign-in:** 401 while archived, 200 after Reactivate. |
| AC6/AC7 | PASS | **Card:** the dialog copy, focus on the card heading, Done returns focus. **Hygiene:** the temporary password is in no storage, history, URL or console, and not in the heap after Done; no card after Back/forward, a reload or `pagehide`. **Student side:** the old session gets 401 and the temporary password lands on `/change-password`. **Errors:** the archived-meanwhile alert; a 5xx keeps the dialog; Esc does nothing while pending. |
| AC8 | PASS | **Asks:** nav, home link, browser Back, Cancel and Change password; Keep editing restores focus. **Passes without asking:** a clean form, a forced 403 redirect to `/change-password`, own logout and cross-tab logout (no toast left). **Forced elsewhere:** a forced POP to `/tutor/today` is blocked. |
| AC9 | PASS | **Size and placement:** 328 px at 360; 384 px at the bottom end at 768 and 1280. **Timing:** hover pauses the timer. **Keyboard:** F6, Tab, Undo. |
| AC10 | PASS | **axe:** 0 serious or critical issues in the read view, edit with errors, paused toast, archived toast, reset dialog and card, at 3 viewports × vi/en. **Layout:** no horizontal scroll and the layout rules hold. **Keyboard-only:** edit, archive + Undo and reset all work. **F10:** 3 steps. |
| AC11 | PASS | **Web checks:** lint, typecheck, 633/633 unit tests and the budget pass (student 186.6 KB, tutor 186.8 KB). **Full E2E:** 344 passed. **Repeats:** ×20 gave 720/720. **Unchanged:** `api/openapi.json` and `backend/` have no diff against `develop`. path-ownership and check-docs pass. I did not run `gate.sh` myself (the implementer's logs report PASS ×2 on `6883cd5`). |

**Isolation and privacy.** A student session gets 403 on every `/tutor/students/**` call I tried (GET list and detail, PATCH, status, reset), with no `SECRET-*` marker in the bodies. I scanned 15 student UI responses with the tutor note set to `SECRET-QA-note-private`; none contained it.

## Findings

| ID | Sev | Status |
|---|---|---|
| QA-1 (role-img-alt after Save) | S2 | Fixed in round 1 (`0e1c7ef`); no recurrence in the 720/720 run or the axe sweeps |
| QA-2 (flaky Account alerts E2E) | S3 | **Fixed** (AC12 (h)): 60/60 |
| QA-3 (Account E2E near its 30 s timeout) | S3 | **Fixed** (AC12 (i)): 60/60, no timeouts |
| QA-4 (overflow toast shown late) | S4 | **Fixed** (AC12 (d)) |
| QA-5 (a pending status button announces its label assertively) | S4 | **Open**, informational: React Aria behaviour, not in AC12. Left for the UX screen-reader check. |

**Observation, not a defect.** At 360, the dialog's Cancel button sits where a toast reappears when the dialog closes. After a mouse click on Cancel the pointer is then over the region, so the timed toast stays (the hover pause the spec asks for). With the pointer moved away, Esc, or at 1280, it closes about 5.3 s after the dialog closes. Touch devices have no hover state, so real phones are not affected.

## Commands run

| Command | Result |
|---|---|
| `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --reporter=line` (full build, `2c1c4fc`) | 344 passed, 31 skipped |
| `./scripts/e2e-run.sh --no-build … --grep "T-M2.14" --repeat-each=20` | **720 passed, 0 failed** (11.0 min) |
| `cd web && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget` | OK; 58 files / 633 tests; budget PASS |
| `git diff develop -- api/openapi.json backend` | empty |
| `./scripts/check-path-ownership.sh …` | PASS (551 files) |
| `./scripts/check-docs.sh` | PASS |
| Black-box scripts: `ac12a.js` (×3 viewports), `ac12b.js`, `resume.js`, `obscure.js`, `layout.js`, `edit.js`, `status.js`, `reset.js`, `guard.js`, `keyboard.js` | results above |
| `git checkout -- evidence/T-M2.14`; `git status` | clean on `2c1c4fc`, nothing untracked |

Evidence is in the scratchpad, under `/tmp/claude-1000/-home-kali-App-projects-eng-lms/95e88d51-0cf3-4229-9e6b-2adfee30d4de/scratchpad/qa-T-M2.14/r2/`:
- `e2e-full.log` and `e2e-repeat20.log`
- `scripts/`
- `shots/`:
  - (a), toasts hidden under the dialogs: `a-{360,768,1280}-conflict-with-toasts.png`, `a-{360,768,1280}-reset-with-toasts.png`
  - (f), icon alignment: `f-{360,768,1280}-archive-toast.png`
  - (e), the handles heading: `e-1280-vi-handles.png`
  - (k), after signing in again: `k-1280-vi-after-relogin.png`
  - the layout and axe states: `{360,768,1280}-{vi,en}-{read,edit-errors,paused-toast,archived-toast,reset-dialog,card}.png`

## Re-test log

- **`3945b7b`:** QA-1 (S2), with the draft verdict FAIL.
- **`982bb71`:** QA-1 fixed; QA-2, QA-3 and QA-4 open. Verdict PASS WITH MINOR.
- **`2c1c4fc`:** AC12 (a)–(k) and the extra fix verified, QA-2/3/4 closed, regression clean. Verdict PASS WITH MINOR, with only QA-5 (S4) open.

Not covered: I did not run `gate.sh` myself, there was no manual screen-reader pass, and only Chromium was tested. (j) and (k) were checked from the outside with faked late answers; I did not inspect the query cache directly.

---

## Round 1

**QA-VERDICT T-M2.14: PASS WITH MINOR**

### QA Report: T-M2.14 Student profile editing, status and password reset

- **Verdict:** PASS WITH MINOR.
- **Build tested:** `982bb71` (PR #108, branch `feature/T-M2.14-student-profile-account`). The first pass ran on `3945b7b`; the axe fix in `0e1c7ef` was re-verified on `982bb71`.
- **Date:** 2026-10-18.
- **Evaluator:** an independent QA subagent session.

**Environment.** I used the packaged jar from `./scripts/e2e-run.sh` (e2e profile, `e2e-tutor`) against the dev PostgreSQL 18 under Podman. The database was not purged. I created my own students with names starting `qa…` or `Toast1–4`.

**Browser.** Chromium only: the Firefox and WebKit host libraries are missing on this device. Viewports 360×740, 768×1024 and 1280×800; locales vi and en. I drove the app with my own Playwright scripts (two pages for the conflict and cross-tab cases) and used the Browser pane for `/dev/ui` on the Vite dev server.

**Independence.** I wrote a verdict draft before reading `evidence/T-M2.14/summary.md` or the diff. I read the `Button.tsx` and `students.spec.ts` changes only afterwards, to explain findings.

## AC results (on `982bb71`)

| AC | What I checked | Viewports | Result |
|---|---|---|---|
| AC1 | **PATCH body:** sends `version` + `email` + `contactHandles` only; an emptied phone is sent as `phone:null`; clearing every optional field sends `email:null, note:null, contactHandles:[]`. **No-op save:** a save with nothing changed sends no request. **After Save:** focus is on Edit profile and the "Profile saved" toast closes after about 5.1 s. **Header and list:** both show the new values. | all 3 | PASS |
| AC2 | **Client validation:** empty, too long (120 / 2000), a bad username, a bad email. **30 handles:** Add is disabled at 30 and saving 30 works. **Injected 422:** `contactHandles[1].value` maps to row 2 and an unknown field goes to the ErrorSummary, which takes focus. **Injected 500:** the InlineAlert shows and every input is kept. **Double click:** one request. **Pending:** the button reads "Saving…" and is disabled. | 1280 (+E2E ×3) | PASS |
| AC3 | **Availability:** the student's own username sends no check; another student's shows "Taken"; the helper text is shown. **409 `USERNAME_TAKEN`:** a name taken just before Save shows the inline error and focuses Username. **Header:** shows the new `@username`. **Sessions:** a student session from before the change still answers 200; the new username signs in and the old one gets 401. | 1280 | PASS |
| AC4 | **Profile vs profile (two pages):** the dialog opens with focus on Cancel; Copy my note copies the typed note; Cancel keeps the input; Reload shows the other tab's values and closes the form. **Profile vs status, and a stale status button:** the same dialog appears, with no Copy my note button. | 1280 | PASS |
| AC5 | **Toasts:** Pause/Resume toasts close after 5 s and stay while hovered; the archive toast is still there after 10.5 s and disappears when leaving the page. **Undo:** from ACTIVE it sends one request; from PAUSED it sends two in order with versions 2 then 3. **Undo failures:** after another tab's change, "Couldn't undo. Use Reactivate." with no dialog; a failing 2nd request shows "Couldn't restore Paused…". **Reactivate and quick sequences:** Reactivate closes the archive toast; archive→Undo→archive in quick succession stays consistent with the server. **Errors:** INVALID_STATE_TRANSITION and network errors show their alerts, and a later success clears them. **Pending:** every other Account action and Edit profile are disabled. **Sign-in:** an archived student gets 401, and 200 again after Reactivate. | 360/768/1280 | PASS |
| AC6 | **Dialog:** names the student and the consequences; Cancel sends nothing. **Card:** focus on "New temporary password"; Edit profile is disabled while it shows. **Copy message:** vi text identical to F2's. **Done:** focus returns to Reset password. **Student side:** the old session gets 401, the old password fails, and the temporary one lands on `/change-password`. **F10:** 3 steps. | all 3 | PASS |
| AC7 | **Not stored anywhere:** no temporary password in localStorage, sessionStorage, `history.state`, the URL or the console. **Heap:** a heap snapshot after Done does not contain it. **No card again:** not after Back/forward, a reload or `pagehide`. **Errors:** an archived-meanwhile 409 closes the dialog and shows the alert with no card; a 5xx keeps the dialog with its alert. **Pending:** "Resetting…" shows and Esc does nothing. | 1280 | PASS |
| AC8 | **Dirty form asks:** shell nav, home link, the Back link, browser Back, Change password and Cancel all ask "Discard your changes?". Keep editing stays and restores focus; Discard leaves. **Clean form:** leaves without asking; `beforeunload` fires for a reload. **Passes without a dialog:** own Log out, a cross-tab Log out (no toast remains) and a forced 403 `PASSWORD_CHANGE_REQUIRED` redirect to `/change-password`. **Forced elsewhere:** a navigation to `/tutor/today` carrying `state.forced` is blocked. | 1280, 360 | PASS |
| AC9 | **Region:** the polite region named "Notifications"; F6 then Tab reaches Undo. **Visibility:** at most 3 visible, newest last. **Width:** 328 px at 360 (16 px gutters); 384 px (24rem) at the bottom end at 768 and 1280. **Overlap:** at 360, scrolled to the end, the focused Reactivate button does not overlap the toast. No horizontal scroll. | all 3 | PASS (see QA-4) |
| AC10 | **axe** (serious and critical only): read view, edit with errors, paused toast, archived toast, reset dialog and card. 0 violations at 3 viewports × vi/en. **Layout rules:** hold (actions full width below 768, inline at 768 and above; Edit profile under its heading below 768, at the row end at 768 and above). **Keyboard-only:** edit, archive + Undo (focus ends on the Account `h2` because the focused button is gone) and reset all work. **Status:** never shown by colour alone. | all 3 | PASS |
| AC11 | **Web checks:** lint, typecheck, 627/627 unit tests, build, and the bundle budget (student 186.2 KB, tutor 186.4 KB) all pass. **Full E2E:** 335 passed, 31 skipped. **Unchanged:** `api/openapi.json` and `backend/` have no diff against `develop`. path-ownership and check-docs pass. **Not re-run:** I did not run `gate.sh` myself; the implementer's logs report PASS ×2 on `0e1c7ef`. **Repeats:** the ×20 run has 2 failures in 540, both test-side (QA-2, QA-3). | 3 | PASS with minor |

## Exploratory charter and notes

- **Seeing the temporary password again:** I found no way to do it after Done, Back/forward, a reload, `pagehide` or a revisit. It was also not in storage, history, the URL, the console or the heap.
- **Saving over another tab without the dialog:** every non-username field change was caught. I did not report the username-only case (known limit, T-M2.16).
- **Archive → Undo → archive quickly:** consistent with the server.
- **Reset on a student archived in another tab:** handled correctly.
- **Toasts at 360 with the drawer open:** the toast stays above and clickable, by design.
- **vi screens:** no English leaked into the vi UI. Long Vietnamese names wrap.
- **`/dev/ui`:** the "Profile and account components" entries are present (toasts, the unsaved-changes guard, the primary, pending and with-content dialogs).
- **Scope:** nothing untraced. The student shell has no toast region.

## Findings

| ID | Sev | Summary | Status |
|---|---|---|---|
| QA-1 | S2 | Serious axe `role-img-alt` violation right after Save | **Fixed in `0e1c7ef`, verified on `982bb71`** |
| QA-2 | S3 | Flaky E2E: Account alerts test races its own Archive | Open |
| QA-3 | S3 | Flaky E2E: Pause/Resume/Archive test runs out of time | Open |
| QA-4 | S4 | A toast pushed out of view shows up later, after its action | Open |
| QA-5 | S4 | A pending status button announces its own label assertively | Open (informational) |

**QA-1 (S2, fixed).** React Aria's pending-announcement entry, a `div[role=img]`, was left in the assertive announcer pointing at the removed Save button.
- **On `3945b7b`:** axe reported the violation 0 ms after Save. The Edit-profile E2E failed 9 of 15 runs with `--repeat-each=5`.
- **On `982bb71`:** 30 cycles (Save, Archive, Undo, reset, Done) at 3 viewports gave 0 dangling entries and 0 axe violations at 0, 50, 120 and 250 ms after Save. The ×20 run had 0 failures of that test.
- **Evidence:** `repeat5-test-results/` (old head; lost in the `/tmp` wipe), `scripts/fix.js`.

**QA-2 (S3, flaky test).** `students.spec.ts:1112` "the Account alerts…" failed 1 of 60 times on `982bb71` (and 1 of 15 on `3945b7b`).
- **Steps:** `--grep "T-M2.14" --repeat-each=20`, phone-small.
- **Expected:** the setup `POST …/status` answers 200.
- **Actual:** it gets 409 at line 1148, and the console guard then reports the 503 and 409.
- **Cause:** the test clicks Archive and only waits for "no alert" before reading `version`. The Archive request can finish between the GET and the POST, so the version is stale.
- **Fix:** wait for the archive toast or the Reactivate button first. This is test-side, not a product defect, but a flaky test needs a fix or a quarantine DEC (test-strategy §3).
- **Evidence:** `e2e-repeat20.log`, `repeat20-test-results/students-Account-section-T-28752…`.

**QA-3 (S3, flaky test).** `students.spec.ts:1036` "AC5/AC9: Pause, Resume, Archive with Undo…" failed 1 of 60 (phone-small, first iteration) with the 30 s test timeout.
- **What happened:** the trace shows every step passed, but the test spends about 20 s in fixed waits: a 10.5 s timeout plus 3.9 s and 5.4 s toast waits. Under load it goes past 30 s.
- **Fix:** split the test or mark it slow. This is a test-design issue.
- **Evidence:** `e2e-repeat20.log`, `repeat20-test-results/students-Account-section-T-58237…/tr/`.

**QA-4 (S4).** A toast pushed out of view by newer ones shows up later.
- **Steps:** pause 4 different students quickly.
- **Expected:** at most 3 visible, newest last. This is met.
- **Actual:** after the 3 newest close (about 5 s), the hidden "Toast1 paused" appears, and an even older "…reactivated" with it. The tutor is by then on another student's page, so a stale confirmation can mislead.
- **Suggestion:** drop toasts that overflow, or give them a maximum age.
- **Evidence:** `shots/overflow-toast-1280-en.png`, `scripts/status.js`.

**QA-5 (S4, informational).** When a status button goes pending, React Aria announces its label assertively, twice: "Pause", and the re-rendered "Resume". The result itself comes as the polite toast. This is library behaviour, measured on `3945b7b`; that code path did not change. It is worth checking in the UX screen-reader spot check.

## Accessibility summary

- **axe:** 0 serious or critical issues on `982bb71` in every state listed in AC10.
- **Keyboard:** the full flows work at 3 viewports. Focus returns from the dialogs and the card; the Undo focus fallback goes to the `h2`.
- **Roles:** toasts are `alertdialog` with `role=status` content in a polite region labelled "Notifications".
- **Not done:** a manual screen-reader check.

## Isolation and privacy

- **Tutor endpoints:** a student session gets 403 on `GET /tutor/students`, `GET`/`PATCH /tutor/students/{sid}`, `POST …/status` and `POST …/password-reset`, with no `SECRET-` marker in the bodies.
- **Student UI traffic:** 15 responses with the tutor's note set to `SECRET-QA-note-private`; none contained a `SECRET-*` marker.
- **Not checked:** student B reaching student A's resources. There are no student-owned resource routes yet in M2.

## Commands run

| Command | Result |
|---|---|
| `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop` on `3945b7b` | 335 passed |
| `… --no-build --grep "T-M2.14" --repeat-each=5` on `3945b7b` | 10 of 135 failed (9 QA-1, 1 QA-2) |
| `./scripts/e2e-run.sh … --reporter=line` (full build) on `982bb71` | 335 passed, 31 skipped |
| `… --no-build --grep "T-M2.14" --repeat-each=20` on `982bb71` | 538 passed, 2 failed (QA-2, QA-3) |
| `cd web && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget` | 57 files / 627 tests pass; budget PASS |
| `git diff develop -- api/openapi.json backend` | empty |
| `./scripts/check-path-ownership.sh …` | PASS |
| `./scripts/check-docs.sh` | PASS |
| Exploratory scripts `fix.js`, `edit.js`, `stale.js`, `status.js`, `reset.js`, `guard.js`, `layout.js`, `keyboard.js` (against the jar via `run-app.sh`) | results above |
| `git checkout -- evidence/T-M2.14` | done; `git status` clean on `982bb71`, nothing untracked |

## Evidence (scratchpad; `/tmp` was wiped once, so the first-pass files are gone)

Everything is under `/tmp/claude-1000/-home-kali-App-projects-eng-lms/95e88d51-0cf3-4229-9e6b-2adfee30d4de/scratchpad/qa-T-M2.14/`:
- `e2e-full.log` and `e2e-repeat20.log`
- `repeat20-test-results/` (failure traces and screenshots for QA-2 and QA-3)
- `scripts/*.js` and `run-app.sh`
- `shots/`: `{360,768,1280}-{vi,en}-{read,edit-errors,paused-toast,archived-toast,reset-dialog,card}.png`, `conflict-1280-en.png`, `overflow-toast-1280-en.png`

## Re-test log

- **`3945b7b`:** QA-1 (S2) found, which made the draft verdict FAIL.
- **`982bb71`:** QA-1 verified fixed. Full regression re-run with no new S1/S2 findings, so the verdict is PASS WITH MINOR.

Not done: I did not run `gate.sh` myself (AC11 relies on the implementer's two logs plus my own runs above), there was no manual screen-reader check and no Firefox/WebKit. The two flaky E2E tests (QA-2, QA-3) need a fix or a quarantine DEC, or the merge gate will fail now and then.
