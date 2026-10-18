# T-M2.14 evidence summary: student profile editing, status and password reset

Branch `feature/T-M2.14-student-profile-account` · packet `docs/tasks/T-M2.14-student-profile-account.md` · DEC-124, DEC-125

## CI fix: axe `role-img-alt` on `:root` (PR #108, e2e-smoke run 39093117152)

- **Symptom:** `students.spec.ts` "Edit profile › AC1/AC10" failed at tablet and laptop in `expectAccessible` after Save:
  `role-img-alt (serious) … [:root]`; it passed locally.
- **Root cause:** React Aria announces a focused button's pending state with a live-announcer entry `div[role="img"]`
  `aria-labelledby="<button id>"`. It creates the announcer lazily and adds that first announcement 100 ms late. A fast Save closed the form
  (the button unmounted) before the entry arrived, and `ui/Button`'s timer-based drop (150 ms after unmount) left it dangling for up to
  ~50 ms. On the faster CI runner axe started inside that window; the drop then removed the node mid-scan, so axe could only name it `:root`.
- **Fix (`ui/Button.tsx`, `0e1c7ef`):** a gone button watches the document for 500 ms and removes a late entry pointing at it in the task
  that inserts it (`MutationObserver` callbacks run as microtasks), so no other task (a screen reader, axe) can see it dangle. The window
  closes after React Aria's delay (its timer was set first, so it fires first). No axe rule, node or check was excluded or loosened.
- **Tests that catch it:** `ui/Button.test.tsx` adds a late entry after the unmount and asserts it is gone before the next task (fails on
  the old code, passes now), plus that the watcher ends. The E2E test records announcer entries still dangling one task after insertion
  around Save (`watchDanglingAnnouncements`): on the old code it failed 7 of 10 repeats at tablet/laptop; with the fix 40/40 passed
  (`--repeat-each=20`, tablet + laptop).
- **Second, test-only race found by the repeats:** at tablet the guard dialog is opened from the navigation drawer; its focus restore after
  closing could land in the middle of Playwright's `fill`, so Full name stayed empty (1 of 20 runs). The test now waits for the dialog to
  finish closing before typing and asserts the typed value. Focus restore on close is correct product behaviour, so nothing changed there.
- **Gate after the fix:** `evidence/T-M2.14/gate-20261018T091320Z.log` PASS and `evidence/T-M2.14/gate-20261018T092437Z.log` PASS (13
  steps each; backend 466, web 627 in 57 files, E2E 335 passed; budget student 186.2 / tutor 186.4 KB gz), back to back on the same dev
  database, on `0e1c7ef`.

## Implementation (frontend-implementer)

### What was built (by packet scope)
1. **Edit profile** (`features/students/components/ProfileForm.tsx`): one secondary button in the "Personal information" heading row;
   Personal information, Contacts and Note become one form in place (add form rules via `model/editSchema.ts`; contacts and note expanded;
   "Added on" read-only on top; header keeps the saved values; first field focused). The read view's Status row is gone (Account section).
2. **Save**: `toPatchRequest(initial, values, version)` sends `version` + only the changed fields (empty email/phone/note → `null`,
   whole `contactHandles` when any row changed, nothing changed → no request). Success replaces the detail cache entry, invalidates the
   list, closes the form, focuses Edit profile, toasts "Profile saved". Errors as in the add form (summary + focus, `USERNAME_TAKEN` →
   Username, 422 by field/handle index, 404 → not-found view, network/5xx → `InlineAlert` above the actions); no double submit.
3. **Conflict** (`ConflictDialog.tsx` on `ConfirmDialog`): 409 `STALE_VERSION` on Save or a status button; Reload (primary) refetches and
   closes the form; Cancel keeps the input; Copy my note when the note changed.
4. **Username**: shared availability check (`components/useUsernameCheck.ts`), the student's own username not checked, the
   stay-signed-in helper text.
5. **Account section** (`AccountSection.tsx`): status + actions per status; no confirmation; pressed button pending, all other actions and
   Edit profile disabled; toasts per action; Archive toast persistent with **Undo** (one or two requests with the latest cached version);
   archive toast closed by key on a later success/reset or on leaving the page; all errors as Account `InlineAlert`s (never toasts).
6. **Reset password**: `ConfirmDialog` naming the student → `POST …/password-reset` → the credentials card in place of the actions
   (focus on "New temporary password"), Copy message (same builder as F2), Copy password, Done (focus back to Reset password); pending
   dialog not dismissible; 409 archived → dialog closes + alert; 5xx → alert inside the dialog.
7. **Hygiene**: the reset answer lives only in `StudentWorkspace`'s component state (`useResetPassword` with `gcTime: 0`, reset after the
   move); dropped on Done, leaving, `pagehide`; `CredentialsCard` refactored to `{credentials, title, intro, actions}` and shared with F2.
8. **`ui/UnsavedChangesGuard`** + `ui/blocksNavigation.ts` (S4-5: `state.forced` passes only to `/change-password`), used by both forms;
   the profile Cancel asks the same question when dirty.
9. **`ConfirmDialog`** `confirmVariant`, `isPending`/`pendingLabel`, `children` slot. **`ui/Toast`** (`ToastRegion` + `toast` queue in
   `ui/toastQueue.ts`) mounted in `TutorShell`; fixed placement, `--size-toast` token, `--toast-stack-size` + `data-toasts` on `:root`
   driving `main` `padding-block-end` and `:root` `scroll-padding-block-end`; queue cleared on shell unmount.
10. vi + en strings (`students`: `profile.*`, `conflict.*`, `account.*`; `shell.toast.*`; `dev`), `/dev/ui` "Profile and account
    components" section, E2E in `e2e/tests/students.spec.ts` (9 new tests × 3 projects).

Shared parts extracted from `AddStudentForm.tsx` (no copy): `components/StudentFields.tsx` (full name, username, contacts, note fields),
`model/studentFields.ts` (field ids, error summary), `model/useSummaryFocus.ts`.

### Commands and results
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop --grep "T-M2.14"   # 27 passed
ENGLMS_TASK=T-M2.14 ./scripts/gate.sh; ENGLMS_TASK=T-M2.14 ./scripts/gate.sh
```
- Gate run 1: `evidence/T-M2.14/gate-20261018T025554Z.log`: **PASS** (13 steps; backend 466 tests, web 625 tests in 57 files, E2E 335
  passed; the one `✘` in the log is the console guard's expected-failure self-test).
- Gate run 2: `evidence/T-M2.14/gate-20261018T030549Z.log`: **PASS** (13 steps, same counts), same dev database, back to back, both on
  `3d0958f`.
- Earlier runs (logs not kept): one failed at `web-test` (a late `document is not defined` from the new delayed announcer cleanup in
  `ui/Button.tsx`, fixed in `283d43c`); two then passed on `283d43c`, superseded by the runs above after the toast one-row fix (`3d0958f`).
- Unit/component tests: 546 → 625 (new: `ui/Toast.test.tsx`, `ui/UnsavedChangesGuard.test.tsx`, ConfirmDialog variants,
  `model/editSchema.test.ts`, `routes/StudentProfileEdit.test.tsx` (21), `routes/StudentAccount.test.tsx` (21), the `/dev/ui` entry).
- Bundle budget: student 186.2 KB gz ≤ 200, tutor 186.3 KB gz ≤ 300 (T-M2.5 baseline 180.5 student); no `src/features/students/` module in either first visit.
- `api/openapi.json` and `backend/` unchanged (`git diff develop -- api/openapi.json backend` empty).
- axe: clean in component tests (each status, edit with errors, conflict, reset dialog, card, toast) and in E2E at 360/768/1280, vi and en.
- F10 step log: `records/<project>/steps-f10.json`: 3 steps (Reset password → Confirm → Copy message) at all three viewports.
- Keyboard: `records/<project>/keyboard-edit.json` (Tab/typing/Enter edit); archive + F6 → Tab → Undo → Enter (E2E and component test);
  reset by keyboard covered by the dialog focus (Cancel focused) + Enter path in E2E.

### Existing assertions changed
- `StudentWorkspacePage.test.tsx`: Personal information terms → `['Họ tên', 'Tên đăng nhập', 'Ngày thêm']` (the AC11 named exception).
- `e2e/tests/students.spec.ts` `expectAccessible` now first waits for `[data-entering]` to be gone (a dialog fading in was measured at part
  opacity by axe); a wait only, no assertion relaxed. No other existing assertion changed.

### Screenshots (`evidence/T-M2.14/impl/<phone-small|tablet|laptop>/`)
profile-view-vi, profile-view-en, edit-form-vi, edit-errors-vi, edit-errors-en, edit-username-vi, conflict-dialog-vi, conflict-dialog-en,
account-active-vi, account-paused-vi, account-paused-en, account-archived-vi, archive-toast-vi, archive-toast-en, profile-saved-toast-vi,
reset-dialog-vi, reset-dialog-en, reset-card-vi, reset-card-en (password masked), account-alert-status-vi, account-alert-undo-vi,
account-alert-reset-archived-vi; `/dev/ui`: devui-toast, devui-unsaved-guard, devui-confirm-primary, devui-confirm-pending,
devui-confirm-content (captured from the Vite dev server with the session and meta calls stubbed: the gallery is development-only, so
the packaged app used by E2E has no `/dev/ui`). The impl folder also holds the other specs' screenshots the gate run rewrites.

### Deviations, decisions and known limitations
- **Toast content role**: React Aria's `ToastContent` defaults to `role="alert"`; it is set to `role="status"` + `aria-live="polite"`
  (packet: polite region). Toasts themselves keep React Aria's `role="alertdialog"` (focusable, F6).
- **F6 landmark fix**: React Aria registers the region landmark only when its label changes; with our fixed label it never registered, so
  `ToastRegion` remounts when it gets its first toast (comment in `ui/Toast.tsx`).
- **Status buttons are keyed by position**, so after Archive the focused button becomes Reactivate (AC9 bounding-box check); after an Undo
  the previously focused Account button is disabled while the requests run, so focus ends on the Account `h2` (the packet's fallback).
- **Toast layout**: icon | message | Dismiss on one row; with an action (Undo) it sits on its own line under the message, so a 360 px
  toast stays readable. Toasts render above an open dialog's scrim (React Aria's top layer, `--z-toast` > `--z-overlay`).
- **Edit form focus**: opening the form focuses Full name (the Edit profile button disappears while editing).
- `shortcut:` comments: `ui/toastQueue.ts` / `ui/Toast.tsx` (React Aria `UNSTABLE_` toast API wrapped there only); `ui/Button.tsx`
  (relies on React Aria's announcer DOM and its 100 ms first-announcement delay).
- Known server limit (packet Risks, T-M2.16): a username-only PATCH does not bump `version`.
