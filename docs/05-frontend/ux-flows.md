# Critical UX Flows (with step budgets)

> Trace: SPEC §28, §29, §48–§50, §60.F; NFR-UX-01. A **step** = one deliberate user action: a click or tap that changes the view or state,
> or a completed field entry. Typing inside one field counts as one step. Budgets are measured by E2E step counters
> (`e2e/support/steps.ts`) and are part of the acceptance criteria. Each flow is validated at 360, 768 and 1280 px.

## F0 Sign in (FR-AUTH-03, T-M2.4): budget ≤ 3 steps, one screen

```text
[1] Username   [2] Password   [3] Sign in (or Enter)   → the role home, or the safe ?next= of the role (security.md T18)
```

"Remember me on this device" is optional and unticked by default (shared-device hint, DEC-093). A first sign-in with a temporary password adds the
forced change on `/change-password` (current, new, repeat, submit). Measured by `e2e/tests/auth.spec.ts` (`steps-login` record).

## Shell flows (T-M2.11, DEC-112 (5))

- **Log out** (FR-AUTH-04): ≤ 2 steps from any shell page at every viewport: open the account section (the account menu button, the tutor's
  menu button below 1024 px, or the student's More tab below 768 px), then Log out → `/login`. Measured by `e2e/tests/shells.spec.ts`
  (`steps-logout-*`).
- **Switch the language:** 1 step on the public pages (the switcher in their toolbar row); ≤ 2 from a shell page (open the account section,
  pick a language). Was 1 step everywhere (T-M1.9) until the shell's switcher moved into the account section. Measured by
  `e2e/tests/route-focus.spec.ts` (`steps-switch-language`).

## F1 After-lesson wrap-up (SPEC §48): budget ≤ 7 steps, ≤ 60 s

Entry points: Today → lesson row → **Wrap up**; or the lesson detail → **Wrap up**; or the student workspace → the last lesson card.

```text
[1] Tap "Wrap up" on today's 19:00 lesson (Nguyễn A)
    Sheet (mobile) / side panel (desktop) opens, prefilled: Status = Completed ✓
[2] Type summary for student ("Present perfect vs past simple; practised 20 sentences")
[3] Type private note ("Still confuses have/has")                      (optional)
[4] Materials: search "present perfect" → pick "Grammar - Present Perfect.pdf"    (or drop a file)
[5] Homework: pick existing "Present Perfect #3"  – or –  Quick assignment: title + instructions (due defaults to the next lesson)
[6] (optional) "Schedule next lesson" toggle — prefilled Thu 19:00, 90 min, same link
[7] Save  →  toast "Lesson wrapped up · Open lesson" (every part stays editable from the lesson detail; there is no composite undo, DEC-027)
```

Design rules: a single scroll area; sections are collapsed until used, with chips showing what is filled; keyboard `Ctrl/⌘+Enter` saves; the Save
button is sticky at the bottom on mobile; the unsaved-changes guard is on. Failure: the error summary stays in place, nothing is half-saved (atomic command).

## F2 Add student (SPEC §49): budget ≤ 6 steps, ≤ 90 s

```text
[1] Students → "+ Add student"   (or "+ New → Student")
[2] Full name "Nguyễn Văn An"  → username suggestion "nguyenvanan" (✓ available); the password is generated on Create and shown on the credentials card
[3] (optional) expand "Contact" → phone / Zalo
[4] (optional) expand "First goal" → title "TOEIC 650", metric (or create inline), current 570, target 650   (from M7: T-M7.2, DEC-102)
[5] Create
[6] Credentials card → "Copy message" (paste into Zalo) → "Open workspace"
```

Step 2 (DEC-097 (2), confirmed DEC-098): the server generates the password on Create unless the tutor types one; "regenerate" later is the
password-reset action (no password-suggestion endpoint). The template step (SPEC §49 step 7) is P2 (OQ-04). Nothing else is required, and the student is usable immediately (NFR-UX-02).

**Implemented (T-M2.5, DEC-120):** Students → **Add student** (the list's primary action; "+ New" arrives later) → Full name (the username
follows the name until edited; "Available" / "Taken" / "Not a valid username") → optional collapsed Password, Contact (email, phone, up to 30
handles) and Note → **Create** → the credentials card (focus on "Student created") → **Copy message** → **Open workspace**. No guardian section
until T-M2.14 and no first goal until T-M7.2 (DEC-102). Measured by `e2e/tests/students.spec.ts` (`steps-f2` record): 6 counted steps at
360, 768 and 1280 px, with ux-flows step [3] "expand Contact → phone" counted as one step as listed above (strictly, the expand click and the
phone entry are two actions); the wall time is reported, not asserted (DEC-093). Keyboard-only F2: `keyboard-f2` record.

## F3 Schedule a lesson: budget ≤ 5 steps

```text
[1] "+ New → Lesson" (or student header "Schedule lesson": the student is prefilled)
[2] Student (combobox; recent students first)  [3] Date + time (smart defaults: next free slot on the same weekday as the last lesson)
[4] (optional) template / meeting link (defaults to the student's last link)     [5] Save
```

## F4 Create an assessment (SPEC §50): budget ≤ 12 steps for 2 sections × 5 picked questions (excluding typing question content)

```text
Library → Assessments → "+ New" → name → [Section 1: title] → "Add questions" panel (search/filter bank, multi-select, Add)
→ "+ Section" → pick questions → Settings (time limit, pass mark, attempts, result policy) → Save → "Assign" (students, due) → Assign
```

Builder layout: at ≥ 1024 px, the structure outline sits on the left (drag or keyboard reorder), the item editor or preview in the centre, and the question-bank
panel on the right as a drawer. At < 1024 px, the outline becomes a collapsible list and the bank opens as a full-screen sheet. Autosave draft every 10 s.

## F5 Grade a submission: budget ≤ 4 steps per auto+manual attempt

```text
[1] Review → first item   [2] For each manual response: score (keyboard: digits, Tab)   [3] Overall comment (optional)
[4] "Publish & next" (or "Save draft")
```

The layout shows the student's response and the answer key or rubric side by side at ≥ 1024 px, stacked below that. Audio has a waveform-less player with ±5 s buttons
and timestamp insertion into a comment (`[00:12]` button).

## F6 Assign existing work to a student: budget ≤ 4 steps

Student header "Assign work" → search the library activity → due date (default +7 days) → Assign.

## F7 Edit a learning plan: budget ≤ 3 steps per common operation

Add an item (`+` in the phase → title → Enter). Reorder (drag, or keyboard: focus the handle → Space → arrows → Space). Move to another phase (`⋯` → Move to…).
Change status (click the status chip → choose).

## F8 Student does homework (SPEC §29): budget ≤ 5 steps from login to submit (excluding answering)

Login → Home "To do" → item → Start → (answer; autosave) → Submit → confirmation → result or "waiting for review".

## F9 Student checks progress and feedback: ≤ 2 steps from Home

Home → "Recent results" item → the result page with feedback. Or More → Progress.

## Flow review checklist (UX reviewer)

- [ ] The budget is met at all 3 viewports (E2E counter evidence).
- [ ] Defaults are smart (dates, times, durations, links, due dates) and every default is visible and editable.
- [ ] No mandatory field beyond the documented minimum.
- [ ] The flow can be completed with the keyboard only; focus lands logically after each step.
- [ ] Failure at any step keeps the user's input.
- [ ] Success feedback says what happened and offers the next logical action.
