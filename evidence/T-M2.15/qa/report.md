# QA Report — T-M2.15 Guardians (combined QA+UX pass, DEC-131)

> Recorded by the LC from the evaluator's returned text. Round 1 on `7c3bfb8`; the S3 findings were fixed via AC11 in `1a9d606` and verified by the LC (DEC-132). Screenshots stayed local (git-ignored).

QA-VERDICT T-M2.15: PASS WITH MINOR
UX-REVIEW T-M2.15: APPROVED

Build: `7c3bfb8` (PR #112 head), the packaged jar built by `scripts/e2e-run.sh` and signed in as `e2e-tutor`. One app session covered 360×740, 768×1024 and 1280×800, in vi and en. Everything was driven by Playwright scripts kept in my scratchpad. Nothing was written to the repo tree: `git status` is clean and `evidence/T-M2.15` was restored.

## AC results

| AC | Scenarios (black-box) | Viewports / locale | Result |
|---|---|---|---|
| AC1 | Order of the h2s is Personal information · Contacts · Note · Guardians · Account. Insertion order kept. A 2-line note keeps its line breaks. "Not added" shows for empty values and "No guardians added." when there are none. Phone and email are links ("Call …", "Email …"). Loading is an `output` with aria-busy="true" and "Loading the guardians" from 50 ms, then 2 skeleton rows, with the rest of the page usable. Error shows the danger alert and Try again after 3 GETs. Neither state has Add guardian. A 404 on the GET gives "Student not found" | all 3, vi+en | Pass, but see QA-1 (focus after Try again) |
| AC2 | F11: POST `{name}` only, focus on "Edit {name}", toast "Guardian added". Padded values for all five fields are sent trimmed. Double-click on Save sends one POST. At 10 guardians: no Add button and the limit text. Two pages, other page adds the 10th: "This student already has 10 guardians." is focused, the list is refetched (10), input kept, no ErrorSummary | l en, s vi | Pass |
| AC3 | Edit opens with saved values, focus on Name, group label "Edit guardian {name}". Changing the phone and clearing the email sends `{"version":0,"phone":…,"email":null}`. Unchanged form and a whitespace-only change: no request, form closes. Clearing every optional field sends `null` for each. Client limits (121/41/2001 characters, bad email and phone) show the ErrorSummary, which is focused. A 500 keeps the input with the alert. Pending label "Saving…", one PATCH only | l, m, s | Pass |
| AC4 | Two pages, other page saves first: the conflict dialog opens, Copy my notes puts the typed notes on the clipboard, Cancel keeps the input, Reload shows the other page's value and closes the form. Removed in the other page: the warning is focused, the list is refetched without the guardian, and the alert clears on the next Edit | l en, s vi | Pass (UX-1 is about the dialog text) |
| AC5 | Dialog text matches the spec. Cancel sends nothing and returns focus to Remove. A 503 keeps the dialog with "Couldn't remove the guardian. Try again." While pending: "Removing…", and Escape does not close it. Confirm: toast "{name} removed", focus on the Guardians h2. A 404 closes, refetches and toasts | l, m, s | Pass |
| AC6 | With the profile form open, Add, Edit and Remove are disabled and the Guardians hint shows. With a guardian form open, Account is disabled with its hint. Dirty Cancel asks Discard / Keep editing. Keep editing returns focus to the trigger. Discard and a clean Cancel return focus to the trigger. Shell nav (link and drawer) shows the guard. Reload triggers beforeunload | l, s | Pass |
| AC7 | Disclosure starts collapsed. 10 rows, then Add is hidden and the limit text shows. Removing the first row focuses the new first Name. Removing a middle row focuses the previous Name. Removing the last row focuses Add guardian. Rows filled / empty / whitespace-only / phone without a name: "Enter the guardian's name" and the section reopens itself. Mocked 422 on `guardians[1].email` with an empty row dropped: the 4th form row's Email is marked. Without the mock: `guardians` holds the 2 filled rows in order, and both are listed on the new Profile view | l en, m en, s vi | Pass |
| AC8 | Not run black-box (see "Not checked") | — | Not verified by QA |
| AC9 | axe: 0 serious/critical on the Profile view with 0, 2 and 10 guardians (all 3 viewports × vi/en), the form with errors, the remove dialog when settled, the conflict dialog, the loading and error states, and the add form with an error. No horizontal scroll with a long name, a 2,000-character note and a long email. Actions stacked full width below 768 (328 px wide) and inline at ≥768. Keyboard-only add and edit (Tab, typing, Enter). Button names include the guardian's name. F11 is 3 steps | all | Pass, plus UX-2 |
| AC10 | Gate not run by QA (CI is the regression). Guardian e2e specs: ×3 gave 108/108; ×20 on the 5 focus/keyboard specs gave 300/300 on phone-small, tablet and laptop | 3 projects | Pass for what QA ran |

## Findings

| ID | Sev | Viewport / locale | Issue | Steps | Expected / actual | Screenshot shows | Suggested fix |
|---|---|---|---|---|---|---|---|
| QA-1 | S3 | all, vi+en | Focus is lost to `body` after **Try again** in the guardians error state | Make the guardians GET return 500 until the alert shows, stop the 500s, focus Try again, press Enter | Expected: focus stays in the section (the brief: never on body). Actual: the button unmounts when the skeleton appears, and focus goes to `BODY` and stays there after the list loads | Error state at 768 en: the "Guardians" h2, the alert "Couldn't load the guardians." and the Try again button. No Add button | When Retry is pressed, focus the Guardians h2 (it already has `tabIndex={-1}`). `GuardiansSection.tsx:160` |
| UX-1 | S3 | all, vi+en | The conflict dialog text for a guardian says "Someone changed this **student** in another tab or window…" (vi: "Học viên này…"). It was the guardian that changed | Two pages, edit the same guardian, save in B, then save in A | Expected: text about the guardian. Actual: the shared profile string (`students.json:167`) | Conflict dialog at 1280 en: title, the "this student" text, then Copy my notes, Reload, Cancel | Pass the text as a prop, as the copy label already is ("Someone changed this guardian…") |
| UX-2 | S3 | 768, 1280 | The Guardians list is capped at `--size-reading-max`, but the Personal information and Contacts lists above it span the full main width. The term/value columns don't line up (values at about x=210 above and about x=141 in Guardians). The long email wraps mid-token at 1280 only because of the cap | Open a student with guardians at 1280 | Expected: "the Profile view's column", one alignment. Actual: two column widths on one page | 1280 en: the full-width Contacts list stacked over the narrower Guardians list, with misaligned value columns | LC ruling: either the guardians follow the Profile lists' real width, or the Profile view takes reading-max too (T-M2.14 follow-up) |
| UX-3 | S4 | all, en | The Notes TOO_LONG error reads "Use at most 2000 characters." while the counter shows "0 / 2,000" | Type 2,001 characters, Save | Expected: matching number format. Actual: 2000 vs 2,000 | Form with errors at 1280 en | Format `{{max}}` with the locale's number format (shared string `students.json:89`) |
| UX-4 | S4 | all | The ErrorSummary heading is an `h2` ("The guardian wasn't saved") inside the Guardians `h2` section, so in the outline it becomes a sibling section | Save an empty guardian form | Expected: level 3 inside the section. Actual: h2 | Form with errors | Let the ErrorSummary heading level be set per use, or accept |

No SCOPE findings: nothing untraced was found. Guardians have no account or messaging, and there is no Undo on Remove.

Not a defect: axe once flagged `color-contrast` on the remove dialog's buttons (3.5–4.38:1). This happened only when axe ran within about 0 ms of the dialog opening, during the fade-in. One second later it was clean, and opacity was 1 all the way up. If the e2e axe checks run immediately after opening a dialog, they should wait for it to settle.

## UX rulings

- **Hierarchy:** one h1. Sections are in the order the spec gives. Add guardian is secondary, consistent with the T-M2.14 sections.
- **System:** only house components seen (`InlineAlert`, `ConfirmDialog`, `Toast`, `DescriptionList`, Disclosure, `TextArea` counter). Remove-row buttons have the trash icon and visible text.
- **States:** loading, empty, error and populated are all present and stay inside the section, with no layout jump into the Account section. Offline does not apply (not an autosave area).
- **Forms:** labels are always visible, "(required)" is in text, the hint is under Relationship, the summary is focused, and the unsaved guard plus beforeunload work.
- **Responsive:** no horizontal scroll at any of the three widths. Long Vietnamese names wrap at word boundaries. Emails break anywhere, as the spec requires for single tokens. Action buttons are 44 px tall.
- **Copy:** vi reads natively. "Phụ huynh" is the glossary term (`glossary.md:13`). The house Retry label is "Try again" / "Thử lại", so it is consistent. UX-1 is the one wording issue.
- **Budgets:** F11 is 3 steps (Add → type → Save, and Enter in Name also submits). F2 without guardians sends no `guardians`.

## Isolation

- I signed in as the QA student whose profile has 2 guardians (temporary password changed through the API).
- The guardian and student endpoints under `/api/v1/tutor/students/{sid}`, both GET and POST, answer 403 for that student.
- Opening `/tutor/students/{sid}` sends the student to `/forbidden`.
- I scanned 23 API responses from the student's pages (home, today, profile, session) for the guardian names, emails, phone, notes and `SECRET-*`. There were 0 hits.

## Not checked

- **AC8 (SEC residual):** answer arriving after a sign-out and a student sign-in, with nothing stored and no toast. I did not test this black-box, to avoid ending the shared e2e tutor session. It is left to the SEC review and the unit tests.
- Sign-out and forced `/change-password` while a guardian form is dirty.
- 400% zoom / 320 px reflow.
- Screen-reader announcements (only the accessible names and roles were checked).
- Firefox and WebKit.
- Gate run and bundle budget.
- `api/openapi.json` unchanged: CI on the head covers it.

QA data is left in the dev DB, as the packet allows: students named "QA …" and guardians prefixed "QAGUARD", all with example.com / +1 555 01xx values.

Wall-clock: about 25 minutes.
