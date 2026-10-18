# T-M2.14: Student profile editing, status and password reset

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready (G0 in review) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.14-student-profile-account` (from `develop`) |
| Depends on | T-M2.3 (`f0e228c`), T-M2.5 (`84c97c1`): merged |
| Estimate | 2 agent-days |
| Trace | SPEC §4.2, §4.3, §6, §37, §46; FR-STU-03 (profile, contacts and username; guardians: T-M2.15), FR-STU-05, FR-STU-06 (the Profile view's account section), FR-AUTH-07; NFR-UX-02, NFR-A11Y-01, NFR-A11Y-02, NFR-PERF-03; information-architecture §2 (Profile: personal info, contacts, account); interaction-states §1, §2.2–§2.6, §2.8, §2.9; design-system §3 (`Toast`, `UnsavedChangesGuard`), §4; api-catalog "tutor: students" (`PATCH /tutor/students/{sid}`, `POST …/status`, `POST …/password-reset`, all live); security.md T12; A-021; DEC-120, DEC-123 (SEC S4-5), DEC-124 (this split) |

## Goal
On the student's workspace page the tutor can correct a student's personal information, contacts, note and username, pause, archive
(with **Undo**) or reactivate the student, and reset the student's password, seeing the new temporary password once on the credentials card.
Conflicting edits from another tab are caught (409 `STALE_VERSION` → "This was changed elsewhere" + **Reload**). Guardians and the learning
profile are the follow-up **T-M2.15** (DEC-124).

## Scope
- In:
  1. **Edit profile** (FR-STU-03): the Profile view gets one **Edit profile** button (secondary, in the "Personal information" section
     heading row). It turns the Personal information, Contacts and Note sections into **one form** in place (React Hook Form + Zod; the field
     rules and limits of the add form, `model/createSchema.ts`): Full name (required), Username (required), Email, Phone, contact handles (≤ 30
     label + value rows, add/remove), Note (`TextArea` with counter). The Contact and Note fields are shown expanded (no `Disclosure` in edit
     mode). **Save** / **Cancel** at the end of the form. While editing, the header (name, status, `@username`, quick links) keeps showing
     the saved values. Only one form exists on the page at a time: while the profile form is open the Account section's actions (scope 4,
     5) are disabled with the hint "Save or cancel your changes first".
  2. **Save** sends `PATCH /tutor/students/{sid}` with the loaded `version` and **only the changed fields** (absent = unchanged; an emptied
     email, phone or note is sent as `null`; `contactHandles` as the whole list when any row changed). Nothing changed → Save closes the
     form without a request. Success: the response replaces the `['students','detail',sid]` cache entry, `['students','list']` is
     invalidated, the form closes, focus moves to the **Edit profile** button and a `Toast` says "Profile saved". Pending: "Saving…", double
     submit impossible. Errors: 409 `USERNAME_TAKEN` → inline on Username, focus there; 409 `STALE_VERSION` → scope 3; 422 → fields by
     `field` (handle rows by index), unknown ones to the `ErrorSummary` (> 4 fields: summary on top, focus on it); 404 → the feature's
     not-found view; network/5xx → `InlineAlert` above the actions, input kept.
  3. **Conflict** (interaction-states §2.8): a 409 `STALE_VERSION` on any write of this task (profile, status) opens a `ConfirmDialog`
     "This was changed elsewhere" ("Someone changed this student in another tab or window. Reload to see the latest version; your unsaved
     changes will be lost.") with **Reload** (primary: refetch the student, discard the form, close it) and, for the profile form when the
     Note was changed, **Copy my note** (`CopyButton` with the typed note) before reloading; **Cancel** keeps the form as typed.
  4. **Username change** (FR-STU-03): the Username field reuses the add form's availability check (debounced 300 ms, "Available" /
     "Taken" / "Not a valid username"; the student's own current username counts as unchanged and is not checked; no suggestion in edit
     mode) and shows the helper text "The student signs in with the new username. They stay signed in on their devices." (the server keeps the
     sessions).
  5. **Account section** (IA §2 Profile "account", FR-STU-05, FR-AUTH-07): a last section **Account** (`h2`) below the Note with the status
     (`StudentStatusBadge`) and the actions for that status, in this order: ACTIVE → **Pause**, **Archive**, **Reset password**; PAUSED →
     **Resume**, **Archive**, **Reset password**; ARCHIVED → **Reactivate** and the text "Reactivate the student to reset their password."
     (no reset button: the server answers 409 for an archived student). Each status button sends `POST …/status {status, version}` with
     **no confirmation** (reversible, interaction-states §2.9); while pending it is disabled with its label kept; success updates the detail
     cache from the response, invalidates the list and shows a `Toast`: "Student paused", "Student resumed", "Student reactivated", and for
     Archive "Student archived. They can no longer sign in." with **Undo**. **Undo** restores the previous status with the response's
     `version`: from ACTIVE one request (`ARCHIVED → ACTIVE`); from PAUSED two in sequence (`ARCHIVED → ACTIVE`, then `ACTIVE → PAUSED`);
     its own success toast "Archiving undone"; a failure of the first request shows an error toast "Couldn't undo. Use Reactivate." (the
     Account section still offers Reactivate), a failure of the second "Couldn't restore Paused. The student is active.". Errors: 409 `STALE_VERSION` → scope 3; 409 `INVALID_STATE_TRANSITION` → refetch and an error toast "This student's
     status changed. Check it and try again."; network/5xx → an error toast with the action's name ("Couldn't archive the student. Try
     again."), nothing changed on screen. The header badge and the list follow the new status.
  6. **Reset password** (FR-AUTH-07, security.md T12): **Reset password** opens a `ConfirmDialog` that names the student: "Reset the password
     for {name}?" · "Their current password stops working, they're signed out on every device, and they choose a new password at their next
     sign-in. The new temporary password expires in 7 days." · **Reset password** (danger) / **Cancel**. Confirm sends
     `POST …/password-reset`; on 200 the dialog closes and the Account section shows the **credentials card** in place (focus on its `h2`
     "New temporary password"): name, username, temporary password, expiry, login URL, the "shown only now" notice, **Copy message**
     (the same message builder as F2, so the vi/en text and the "choose your own password" line are identical), **Copy password** and
     **Done** (closes the card, focus back to **Reset password**). Pending: the dialog's button shows "Resetting…" and the dialog cannot be
     dismissed. Errors: 409 `INVALID_STATE_TRANSITION` (archived meanwhile) → refetch, the dialog closes and an error toast "This student is
     archived. Reactivate them first."; network/5xx → the dialog stays open with an `InlineAlert`.
  7. **Credentials hygiene** (SEC): the reset's answer lives only in the workspace page's component state (mutation `gcTime: 0` and reset
     after moving the result to state, as `useCreateStudent`); never in the query cache, URL, history state, storage or a log; the card is
     dropped on **Done**, on leaving the page and on `pagehide` (as AC12 (m) of T-M2.5); a later visit shows no card. `CredentialsCard` is
     refactored to take `{fullName, username, temporaryPassword, expiresAt}`, a heading text and its action slot, so F2 and the reset share it
     (F2's actions and copy unchanged).
  8. **Unsaved changes guard** (interaction-states §2.6; T-M2.5 SEC S4-5, DEC-123): the guard of the add form moves into a shared
     `ui/UnsavedChangesGuard` (design-system §3 inventory name; a component or hook rendering the `ConfirmDialog` from `useBlocker` plus
     `beforeunload`), used by the add form and the profile form ("Discard your changes?" · **Discard** / **Keep editing** for the profile
     form; the add form keeps its "Discard this student?" copy). It blocks every navigation to another pathname except `/login` and
     `/forbidden`; a navigation marked `state.forced === true` passes **only when its target pathname is `/change-password`** (S4-5); a
     forced mark on any other target is blocked like a normal navigation. **Cancel** of a dirty profile form asks the same question.
  9. **`Toast`** (new `ui/`, design-system §3 "polite live region"): built on React Aria Components' toast (`UNSTABLE_ToastRegion`,
     `UNSTABLE_ToastQueue`, already in `react-aria-components` 1.21.1; no new dependency); one region per app shell (the tutor shell in this
     task), a queue API `toast.success|error(message, {action?})`. Fixed placement rules: bottom-centre below 768 px with a 16 px inline gutter
     (`inline-size: calc(100% - 2 × --space-4)`, max `--size-reading-max`), bottom-end at ≥ 768 px (fixed `inline-size: 24rem`), above page
     content (`z-index` token), never covering the focused control's row on the first show (bottom offset `--space-4` + safe area). At most 3
     visible, newest last. Timing: success toasts close after 5 s, toasts with an action or an error after 10 s; the timer pauses while the
     pointer is over the region or focus is inside it; each toast has a Close button (`IconButton`, "Dismiss"). Success = `CircleCheck` icon,
     error = `CircleAlert` icon + text (never colour alone). F6 / the region's landmark reaches it from the keyboard (React Aria).
  10. **Strings** vi + en (`students` namespace; `ui` strings for `Toast` and `UnsavedChangesGuard`); `/dev/ui` entries for `Toast` and
      `UnsavedChangesGuard`. **E2E** (`e2e/`): extend `students.spec.ts` with edit, conflict, status + Undo and reset (phone-small, tablet,
      laptop), creating its own students.

## Out of scope (explicit)
- **T-M2.15** (DEC-124): guardians (list, add, edit, delete; ≤ 10) and the guardian section of the add form; the tutor-private learning
  profile (level, notes, strengths/weaknesses tags, ≤ 30 custom fields) and `TagInput`.
- The workspace tab bar, Overview, quick actions, next lesson (M3+, DEC-120 (3), (8)); the success toast for Add student (the credentials
  card stays its feedback, DEC-120 (7)); a toast region in the student shell (no student action needs one yet).
- Account information beyond status and reset (last sign-in, sessions list, `mustChangePassword` display): no endpoint serves it; permanent
  delete and export (FR-STU-08, OPTIONAL, OQ-07).
- Any backend or endpoint change (all used endpoints are live; `api/openapi.json` must not change); the `qa/` specs (T-M2.7).

## Guardrail answers (scope.md §6)
1. **Trace:** FR-STU-03, 05, 06, FR-AUTH-07; SPEC §4.2, §4.3, §37; DEC-120, DEC-123, DEC-124. 2. **Drift toward excluded scope?** No: no
messaging, no self-service password recovery (the tutor resets), no account admin console. 3. **Mandatory setup added?** None: every edit is
optional; nothing new is required. 4. **Weekly use?** Yes: correcting contacts and pausing a student on break are routine; a reset follows
every "I forgot my password". 5. **Hard-coded semantics?** None: no level, exam or curriculum field (the learning profile is T-M2.15 and free-form).

## Design notes
- **Files**: `features/students/components/ProfileForm.tsx` (edit mode), `AccountSection.tsx`, `ConflictDialog.tsx` (on `ConfirmDialog`);
  the shared contact fields (email, phone, handle rows) and the username field with availability are extracted from `AddStudentForm.tsx`
  into components both forms use (no copy of the logic); `model/editSchema.ts` (the create schema without password, plus a
  `toPatchRequest(initial, values, version)` that returns only the changed fields); `api/students.ts` gains `useUpdateStudent`,
  `useChangeStatus` and `useResetPassword` (the last with `gcTime: 0`, no query seeded). `ui/Toast.tsx`, `ui/UnsavedChangesGuard.tsx`;
  the tutor shell mounts the toast region. Import rules unchanged (`features/students` imports `ui`, `lib` and itself).
- **Version bookkeeping**: every write uses the `version` of the latest detail response and replaces the cache entry with the answer, so
  a status change right after a save (or Undo's second request) never sends a stale version. A username-only PATCH leaves `version` as it is
  (api-catalog); the code takes `version` from the response, never `+1`.
- **Undo**: the toast's action closes over `{previousStatus, sid}`; it reads the current `version` from the cache when pressed.
- **Guard (S4-5)**: `useBlocker(({currentLocation, nextLocation}) => dirty && nextLocation.pathname !== currentLocation.pathname &&
  !['/login','/forbidden'].includes(nextLocation.pathname) && !(isForced(nextLocation.state) && nextLocation.pathname === '/change-password'))`.
- **Layout rules (fixed, not content-driven)**: the edit form and the credentials card keep `max-inline-size: var(--size-reading-max)`, the
  Profile view's column; form fields are full width of that column; action rows (`.actions`) wrap with `gap: var(--space-3)`; below 768 px the
  Save/Cancel, the Account actions and the card's actions stack full width in source order (one per row); at ≥ 768 px they sit inline,
  start-aligned. The **Edit profile** button sits at the end of the "Personal information" heading row (heading `flex: 1 1 auto`, button
  `flex: none`; at 360 px it wraps under the heading, start-aligned). Handle rows in edit mode use the add form's row layout unchanged.
  The toast placement is scope 9.

## Acceptance criteria
- AC1 (FR-STU-03): **Edit profile** opens the form with the saved values; changing the email and adding a handle and pressing **Save** sends
  a PATCH with `version`, `email` and `contactHandles` only; emptying the phone sends `phone: null`; an unchanged form sends no request;
  after Save the Profile view and header show the new values, focus is on **Edit profile** and the "Profile saved" toast appears; the list
  shows the new email (component tests with MSW + E2E).
- AC2 (FR-STU-03, interaction-states §2.2–§2.4): client validation matches the add form (required name and username, limits, ≤ 30 handles);
  a 422 maps to its field (`contactHandles[1].value` → that row) and unknown ones to the `ErrorSummary` with focus on it; a 500 shows the
  `InlineAlert` and keeps every input; Save is disabled while pending and a double click sends one request.
- AC3 (FR-STU-03 username): changing the username shows the availability ("Taken" for another student's, nothing for the student's own) and
  the stay-signed-in helper; Save changes it (the header shows the new `@username`); a 409 `USERNAME_TAKEN` shows the inline error and
  focuses Username; E2E: after the change the student signs in with the new username, and a student session open before the change still
  works (an API call of the student context answers 200).
- AC4 (interaction-states §2.8): when another tab saved the student first, Save answers 409 `STALE_VERSION` and the "This was changed
  elsewhere" dialog appears; **Reload** shows the other tab's values and closes the form; with a changed note **Copy my note** copies it;
  **Cancel** keeps the typed values; a status change with a stale version opens the same dialog (component tests + E2E with two pages).
- AC5 (FR-STU-05): an ACTIVE student shows Pause, Archive and Reset password; Pause → PAUSED (badge in the header and Account section,
  "Student paused" toast) and Resume back; Archive → ARCHIVED with the toast and **Undo**; Undo returns an archived-from-ACTIVE student to
  ACTIVE (one request) and an archived-from-PAUSED student to PAUSED (two requests, in order, each with the latest version); ARCHIVED shows
  only Reactivate and the reset hint; Reactivate → ACTIVE; while the profile form is open the Account actions are disabled with the hint;
  an `INVALID_STATE_TRANSITION` and a network error show their error toasts and leave the screen consistent with the server (component tests;
  E2E: an archived student's sign-in fails with the generic message, and succeeds again after Undo or Reactivate).
- AC6 (FR-AUTH-07, security.md T12): Reset password asks first (the dialog names the student and states the consequences); Cancel sends
  nothing; Confirm shows the card with focus on "New temporary password", the password, expiry and login URL; **Copy message** puts the
  same localised message as F2 on the clipboard (vi and en); **Done** closes it and focus returns to Reset password; E2E: the student's open
  session is signed out, the old password fails, the temporary one signs in and lands on `/change-password`.
- AC7 (credentials hygiene, SEC): after a reset, nothing of the temporary password is in `localStorage`, `sessionStorage`, `history.state`,
  the URL or the TanStack Query cache (the mutation is gone); Back/forward away and back, a reload and a `pagehide` show no card; no
  `console` output contains it (unit + E2E). An archived-meanwhile 409 closes the dialog with its toast and no card.
- AC8 (interaction-states §2.6, DEC-123 SEC S4-5): with a dirty profile form, the shell nav, the home link, "Change password" and the profile's
  **Cancel** ask "Discard your changes?"; Keep editing stays, Discard leaves (or closes the form for Cancel); a clean form leaves without
  asking; a sign-out (own Log out or another tab's) and a forced redirect to `/change-password` pass without a dialog; a navigation with
  `state.forced === true` to any other pathname is blocked (unit test of the guard predicate for both forms; the add form's tests still pass).
- AC9 (design-system §3, scope 9): each toast is announced by the region's live region (React Aria) when it appears; success
  closes after 5 s and action/error toasts after 10 s, paused while hovered or focused; Close dismisses; Undo is reachable by keyboard
  (F6 to the region, Tab to Undo); at 360×740 a toast spans the width minus the 16 px gutters, at 768 and 1280 it is 24rem at the bottom end;
  no horizontal scroll; at most 3 visible (unit tests with fake timers + E2E bounding boxes).
- AC10 (NFR-A11Y-01, 02, responsive): axe shows no serious or critical issue on the Profile view (read, edit with errors), the Account
  section in each status, the reset dialog, the credentials card and a visible toast at 360×740, 768×1024 and 1280×800 in vi and en; the
  layout rules hold (actions stacked full width below 768, inline at ≥ 768; Edit profile wraps under its heading at 360); keyboard-only
  edit, archive + Undo and reset; status never colour-only; reset = ≤ 3 user steps (Reset password → confirm → Copy message, ux-flows F10).
- AC11: `./scripts/gate.sh` green twice in a row on the same dev database; all existing unit and E2E assertions kept (F2 still ≤ 6 steps);
  the bundle budget green with no students code in either first-visit closure; `api/openapi.json` unchanged.

## Test plan
- Implementation: unit (`toPatchRequest` changed-fields table incl. `null` clears and unchanged handles; the guard predicate incl. forced
  targets; Undo sequencing with versions; `Toast` timers), component tests with MSW (edit save/errors/conflict, username availability in
  edit mode, Account section per status and errors, reset dialog and card, hygiene), E2E `students.spec.ts` (AC1, AC3–AC7, AC9, AC10 at
  phone-small, tablet, laptop; two pages for the conflict), axe.
- Independent QA focus: two tabs editing the same student (profile vs status, Undo after the other tab changed it); username swap to a
  just-taken name; clearing every optional field; 30 handles; archive → Undo → archive quickly; reset on a student archived in another tab;
  dirty form + sign-out (own and cross-tab) + forced `/change-password`; toasts at 360 with the drawer open; vi/en. Exploratory charter:
  find a way to see a reset temporary password again after **Done** or leaving the page, or to save over another tab's change without the
  conflict dialog.
- SEC: **triggered** (student personal data edits, username change with kept sessions, the account disable/enable path, the one-time reset
  password, the guard's forced-navigation trust S4-5). UX: **triggered** (edit form, Account section, dialogs, new `Toast`).

## Evidence required
- `evidence/T-M2.14/summary.md`, gate logs (both runs), screenshots under `evidence/T-M2.14/impl/` at 360×740, 768×1024 and 1280×800: the
  Profile view with Edit profile, the edit form (with errors), the conflict dialog, the Account section (ACTIVE, PAUSED, ARCHIVED), the
  archive toast with Undo, the reset dialog, the credentials card, in vi and en at least once each; `/dev/ui` `Toast` and
  `UnsavedChangesGuard`; axe results; the reset step log. QA report via `qa/T-M2.14`; UX and SEC verdicts as PR records (reviewer evidence
  never on the feature branch).

## Docs to update
- `design-system.md` §3 (`Toast`, `UnsavedChangesGuard` implemented notes, placement and timing), `information-architecture.md` §2 (Profile:
  edit and account section implemented; guardians and learning profile T-M2.15), `interaction-states.md` §2.5 (toasts implemented), §2.8 (the
  conflict dialog as built), `ux-flows.md` (new **F10 Reset a student's password: ≤ 3 steps**), `security.md` T12 (the reset card in component
  state; the guard's forced pass-through limited to `/change-password`), `frontend-architecture.md` §1 if the shared form parts change it,
  backlog (T-M2.14 done note), `progress.json`.

## Risks & assumptions
- **Split line** (within this task): if AC1–AC8 are not green by about 2 agent-days, first the `/dev/ui` polish beyond basic states, then
  **Copy my note** in the conflict dialog move to T-M2.15 by a DEC; the credentials hygiene (AC7) and the guard fix (AC8) never move.
- React Aria's toast is `UNSTABLE_`-prefixed: it is wrapped in `ui/Toast` only, so an API change touches one file (`shortcut:` comment).
- The status endpoint has no batch: Undo from PAUSED is two requests; if the second fails the student stays ACTIVE (scope 5 copy), which
  the Account section then shows.
- Archive ends the student's sessions (server); Undo re-enables sign-in, and the student signs in again.
- E2E signs in as `e2e-tutor` (`.data/e2e/`) and adds students with unique names; the dev database keeps them (never purge without asking the PO).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.14 ./scripts/gate.sh && ENGLMS_TASK=T-M2.14 ./scripts/gate.sh
git checkout -- evidence/T-M2.14   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.14-student-profile-account
```
