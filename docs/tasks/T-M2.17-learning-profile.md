# T-M2.17: Learning profile on the student's Profile view

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 docs review) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.17-learning-profile` (from `develop`) |
| Depends on | T-M2.9 (`37e8ce0`, the learning-profile endpoints), T-M2.15 (`9b9e133`, the one-form lock and the Profile view sections), T-M2.19 (`d165a4e`, the E2E checks): merged |
| Estimate | 1.5–2 agent-days |
| Risk tier | **H**: the LC triggers SEC (tutor-private student data, A-008, on screen and in the query cache; backlog row). G3 = SEC as its own fresh agent + **one combined QA+UX reviewer** (quality-gates G3; the LC does not split UX for `TagInput`: one new primitive used on one screen, covered by the UX checklist and `/dev/ui`) |
| Trace | SPEC §8, §37, §53; FR-STU-04; FR-STU-03 (the Profile view's one-form rule); NFR-UX-02, NFR-A11Y-01, NFR-A11Y-02; information-architecture §2 (Profile: learning profile); interaction-states §1, §2.2–§2.6, §2.8, §4; design-system §3 (`TagInput`, `DescriptionList`, `TextArea`, `ErrorSummary`, `ConfirmDialog`, `Toast`, `UnsavedChangesGuard`); validation-rules (learningProfile.currentLevel, learningProfile.learningNotes, strengths / weaknesses, learningProfile.customFields, `version`); api-catalog "tutor: students" (`GET`/`PUT /tutor/students/{sid}/learning-profile`, live since T-M2.9); A-008; DEC-103, DEC-127, DEC-128 (this split), DEC-131, DEC-138, DEC-139, DEC-140 (this packet's decisions) |

## Goal
The tutor keeps a flexible learning profile per student, the way SPEC §8 describes it: a current level, learning notes, strengths and
weaknesses as tags, and up to 30 custom label/value fields for whatever they track (no exam or curriculum is built in). It lives in a
**Learning profile** section of the student's Profile view, read-only until the tutor presses **Edit learning profile**. A save from a stale
tab is caught (409 `STALE_VERSION` → "This was changed elsewhere" + **Reload**). The profile is tutor-only: no student screen, response or
cache ever holds it (A-008). A new shared `ui/` **`TagInput`** carries the tags.

## Scope
- In:
  1. **Learning profile section** (IA §2 Profile, FR-STU-04): a section **Learning profile** (`h2`, vi "Hồ sơ học tập", glossary) on the
     Profile view between **Guardians** and **Account**, in both modes (while another form is open too). Heading row as Personal information
     (`.headingRow`): the `h2` and **Edit learning profile** (secondary; shown once the profile has loaded, never while loading or in the
     error state). Data: `GET /tutor/students/{sid}/learning-profile` under the query key `['students','learningProfile',sid]`. Read view: one
     `DescriptionList` (the Profile view's `emptyLabel` "Not added") with the rows **Current level**, **Strengths**, **Weaknesses**, **Learning
     notes** (line breaks kept, the `.note` class), then one row per custom field in its stored order (term = the label, description = the
     value, "Not added" when the value is empty). Strengths and weaknesses show as a list (`ul`, no bullets) of read-only tag chips in stored
     order. A never-saved profile (`version` `null`) shows the same rows, all "Not added", no custom field rows. Values are plain text: no
     value is ever turned into a link or markup (a value such as `https://…` or `<b>` shows as typed). States (interaction-states §1, as the
     Guardians section): loading → an `output` with `aria-busy="true"` and the label "Loading the learning profile" from 0 ms holding a
     `DelayedSkeleton` of four rows; error → an `InlineAlert` (danger) in the section ("Couldn't load the learning profile.") with **Try
     again**; the rest of the page is unaffected; a 404 → the feature's not-found view.
  2. **`TagInput`** (new, `ui/TagInput.tsx` + CSS module + tests + a `/dev/ui` entry; design-system §3): a labelled field (`Field`: label,
     hint, error) holding the current tags as a plain list (`ul`, no bullets; each `li` a chip: its text and a quiet `IconButton` (X icon)
     whose accessible name is the prop string "Remove {tag}" (vi "Xoá {tag}"), in the tab order; no React Aria `TagGroup`, so no grid
     navigation, no Delete/Backspace shortcut and no built-in English description, DEC-140 (4)) and one text input under the chips. Props: `label`, `hint`, `value:
     string[]`, `onChange`, `maxTags`, `maxLength`, `errorMessage`, `isDisabled`, the input `id` (the `ErrorSummary` link target) and the
     message strings (`ui/` holds no feature strings, like `CopyButton`). **Enter** or a typed **comma** commits the input's text as a tag;
     pasted text splits at commas, tabs and line breaks into several tags (read from the paste event's clipboard text: a
     single-line input drops line breaks). Each new tag is trimmed and checked before it is added: empty →
     ignored; any other control character → "Tags can't contain control characters."; longer than `maxLength` code points (`[...s].length`,
     validation-rules) → the existing `form.errors.TOO_LONG` text ("Use at most {{max}} characters."); equal to a present tag ignoring case →
     "Already added."; the tag that would exceed `maxTags` → "Up to {{max}} tags.". A
     refused entry keeps its text in the input with the error shown and adds nothing (a pasted list adds its valid tags in order and keeps
     the refused ones, comma-joined, in the input). The input stays enabled at `maxTags` (focus never lands on a disabled control). Enter in
     the input never submits the surrounding form.
  3. **Learning profile form** (in place): **Edit learning profile** turns the section's read view into one form (React Hook Form + Zod,
     `model/learningProfileSchema.ts`) with, one per row: **Current level** (`TextField`, 0–40, hint "Free text, for example B1 or your own
     scale"), **Strengths** and **Weaknesses** (`TagInput`, ≤ 30 tags of 1–40 characters each, hint "Press Enter or type a comma to add"),
     **Learning notes** (`TextArea` with counter, 0–2,000), **Custom fields** (a `fieldset` with the legend "Custom fields" and the hint
     "Anything else you track, for example: Target · 650, or Learning style · Visual": 0–30 rows, each a `fieldset` with the legend "Field
     {n}", **Label** (required in a row with a value, 1–60) and **Value** (`TextField`, 0–500), ending with **Remove field {n}** (a quiet
     `Button`, Trash icon and visible text, the contact-handle rows' pattern in `StudentFields.tsx`); under the rows **Add field** (secondary,
     Plus icon; adds an empty row and focuses its Label), hidden at 30 with the muted text "Up to 30 fields."), then **Save** / **Cancel**.
     Opening the form focuses Current level; **Edit learning profile** is hidden while its form is open (as Edit profile). The form is
     labelled "Edit learning profile". Free-text fields count code points and refuse C0 control characters other than tab, LF and CR (the
     existing `length` and `noControl` helpers of `createSchema.ts`).
  4. **Save**: the request is `PUT …/learning-profile` with the cached `version` (`null` for a never-saved profile) and the whole profile:
     `currentLevel` and `learningNotes` trimmed (`null` when empty after trimming), `strengths` and `weaknesses` in their order, and
     `customFields` = the rows whose label or value is non-empty after trimming, trimmed, in order (a row with both empty is left out; a row
     with a value and no label → "Enter a label"). Text left in a `TagInput`'s input is committed by Save first under the rules of scope 2 (a
     refused entry blocks the submit with its error). Nothing changed against the cached profile (after trimming and dropping empty rows) →
     the form closes without a request. Pending: "Saving…", double submit impossible. Success: the answer replaces the cache entry (no
     refetch), the form closes, a `Toast` says "Learning profile saved", focus moves to **Edit learning profile**. Errors: 422 → fields by
     `field` (`currentLevel`, `learningNotes`; `strengths[i]` / `weaknesses[i]` → that `TagInput`'s error naming the tag; `strengths` /
     `weaknesses` `TOO_MANY` → "Up to 30 tags."; `customFields[i].label|value` → that sent row's field, mapped back to the form row as the
     guardian rows of T-M2.15 scope 7; `customFields` `TOO_MANY` and unknown fields → the `ErrorSummary`); 409 `STALE_VERSION` → scope 5;
     404 → the not-found view; network/5xx → an `InlineAlert` above Save/Cancel, input kept. Every failed submit with a field error (client
     or 422) shows the `ErrorSummary` and focuses it (the form has more than 4 fields, interaction-states §2.3).
  5. **Conflict** (interaction-states §2.8): a 409 (another tab saved first, or created the profile while this tab still had `version`
     `null`) opens the existing `ConflictDialog` with the description "Someone changed this learning profile in another tab or window…" (vi
     with "hồ sơ học tập"); **Reload** refetches the profile and closes the form, focus to **Edit learning profile**; **Cancel** keeps the form
     as typed; when the learning notes were changed the dialog holds **Copy my learning notes**.
  6. **One form at a time** (extends T-M2.15 scope 6): `OpenForm` gains `'learning-profile'`. While any form is open, every other form
     trigger (**Edit profile**, **Add guardian**, each guardian's **Edit** and **Remove**, **Edit learning profile**) and the Account actions
     are disabled; the Account hint stays; the Guardians hint shows while the profile form **or** the learning-profile form is open; the
     Learning profile section shows the same hint ("Save or cancel your changes first") under its heading row while a form outside it is
     open. **Edit learning profile** is not locked by a status or reset request or the reset card (they cannot make the profile stale), the
     guardian triggers' rule. The form uses `UnsavedChangesGuard` ("Discard your changes?" · **Discard** / **Keep editing**); **Cancel** of a
     dirty form asks the same (uncommitted `TagInput` text counts as a change); a clean Cancel closes it, focus to **Edit learning profile**.
  7. **SEC**: the profile's cache write and its toast and focus move follow the DEC-127 session check (`isTutorSession` in
     `api/tutorSession.ts`): an answer that arrives while no tutor session is cached stores nothing and shows nothing. No profile value goes
     to the URL, `localStorage`/`sessionStorage`, the console or an error report; every sign-out path leaves no profile **data** in the
     cache, like every `students` query (`useLogout` and a 401 clear the cache; the cross-tab `dropAllButSession` removes inactive queries
     and resets mounted ones to no data, `app/guards.ts`; no auth change here).
  8. **Strings** vi + en (`students` namespace; the house spelling "Huỷ", "Xoá"; reuse the existing Cancel key; vi terms: Hồ sơ học tập,
     Trình độ hiện tại, Điểm mạnh, Điểm yếu, Ghi chú học tập, Mục tuỳ chỉnh, Nhãn, Giá trị). **E2E** (`e2e/`): extend `students.spec.ts` (phone-small, tablet, laptop) with the learning profile, creating its
     own students; extend `longData` with long learning-profile values (scope of the test plan).

## Out of scope (explicit)
- Tag suggestions or autocomplete (`GET /tutor/tags` is M4 and has no student scope), preset or seeded tags, levels or field labels (tutor
  data only, coding-agent-rules §7).
- Reordering tags or custom fields (order = entry order; to move one, remove and re-add it), showing `updatedAt`, a profile history.
- Learning goals (M7, A-008: goals are student-visible), the learning profile in Add student (FR-STU-01 does not list it), any student screen.
- Any backend or endpoint change (`api/openapi.json` must not change); the T-M2.20 polish items (the locale number format of limits,
  `ErrorSummary` heading level, the mutation-cache clear); the react-aria-components bump (PR #100, held by the PO, DEC-139); T-M2.16.

## Guardrail answers (scope.md §6)
1. **Trace:** SPEC §8, FR-STU-04, A-008; DEC-128. 2. **Drift toward excluded scope?** No: tutor notes about a student; no AI, no student
view, no messaging. 3. **Mandatory setup added?** None: every field is optional and the section works empty. 4. **Weekly use?** Yes: the
tutor updates weaknesses and notes after lessons and reads them before the next one. 5. **Hard-coded semantics?** None: level, tags and
custom fields are free text; hints give generic examples (no exam name); `ForbiddenIdentifiersTest` and the web grep stay green.

## Design notes
- **Files**: `features/students/components/LearningProfileSection.tsx` (read view, states, form host), `LearningProfileForm.tsx`,
  `model/learningProfileSchema.ts` (`toLearningProfilePut(values, version)`, `isUnchanged(profile, values)`; the custom-field row filtering
  and index mapping), `api/learningProfile.ts` (`useLearningProfile`, `useSaveLearningProfile` on `['students','learningProfile',sid]`);
  `serverErrors.ts` gains the `strengths[i]`, `weaknesses[i]` and `customFields[i].label|value` paths; `ui/TagInput.tsx` (+ `index.ts`
  export, `/dev/ui` entry); the test fixture `web/src/test/students.ts` (`workspaceApi`) gains `GET`/`PUT` learning-profile handlers.
  `StudentWorkspacePage.tsx` renders the section and passes `openForm`; `GuardiansSection.tsx` and
  `AccountSection.tsx` take the extended `OpenForm`. Import rules unchanged (feature code imports `ui/` only from its index).
- **Version bookkeeping**: the profile has its own `version` (`null` until the first save); the answer of a PUT replaces the cache entry with
  its `version`. Profile writes never touch the student's detail entry or `version`.
- **Contradiction scan (lessons L-03)**, each resolved here and in DEC-140:
  (a) kept assertions list the Profile view's `h2`s: `e2e/tests/students.spec.ts` ("AC1/AC2/AC9: none yet…", the `toEqual` list `Thông tin
  cá nhân` … `Tài khoản`) and `StudentGuardians.test.tsx` (the `getAllByRole('heading', { level: 2 })` list) gain **Learning profile**
  between the guardians and the account heading (DEC-140 (1)). Also, Playwright's `getByRole` name match is a case-insensitive
  substring unless `exact: true`, so the new vi button "Sửa hồ sơ học tập" collides with every non-exact `getByRole('button', { name:
  'Sửa hồ sơ' })` (strict-mode error): those locators in `students.spec.ts` (at 2026-10-21: lines 856, 959, 991, 994, 997, 1043, 1053,
  1395, 1714, 1903, 1911, and `copy.editProfile` in the long-data walk at 2504) gain `exact: true`, which tightens them without changing
  what they assert (DEC-140 (1)). Unit tests match names exactly and are unaffected. These are the packet's only changed kept assertions.
  (b) validation-rules has a general Tag row (≤ 20 tags per item) and a learning-profile row (≤ 30 each): the specific row and the server
  (`StudentFields.TAGS_MAX` = 30) win; the UI uses 30.
  (c) the server deduplicates tags case-insensitively without an error; the UI refuses a duplicate at entry ("Already added."), so what the
  tutor sees is what is stored.
  (d) design-system §3 lists `TagInput` with no behaviour; scope 2 defines it, and the design-system row records it as built.
  (e) interaction-states §2.8 says "Copy my text"; the built `ConflictDialog` takes a label prop: "Copy my learning notes" here.
  (f) T-M2.15's rule "the Guardians hint shows when a form outside it (the profile form) is open" widens to any form outside it.
  (g) security.md T2 / A-008: no student route or DTO exists for the profile (T-M2.9 isolation harness with `SECRET-*` markers in every
  profile field); this packet adds no endpoint, so the harness needs no new entry.
- **Shortcut ledger** (lessons L-12): the touched area holds `ui/Toast.tsx`, `ui/toastQueue.ts`, `ui/Button.tsx` (trigger: a
  react-aria bump). `TagInput` uses only `Field`, the text input and `IconButton` already in `ui/` (no `TagGroup`, no `UNSTABLE_`
  API); no bump here. `lib/time` is not touched (no date shown).

## UI rules (fixed at G0, DEC-131 (2))
- **Columns per breakpoint**: the read view is the `DescriptionList`'s own rule (one column below a 32rem container; term/value
  `minmax(var(--size-term), 1fr) 3fr` from 32rem), so its columns line up with Personal information, Contacts and Guardians at 768 and 1280
  (no `--size-reading-max` cap on the section). The heading row follows `.headingRow` (button under the `h2` below 768 px, at the row's end
  from 768 px). The form uses the existing `.form` class (one column, capped at `--size-reading-max`, as the Edit profile and guardian
  forms): every field full width of the form, one per row at every width (no grid); custom field rows: each `fieldset` full width of the
  form, legend alone on its line, Label then Value stacked, **Remove field {n}** last, start-aligned; Save/Cancel in `.stackedActions`
  (stacked full width in source order below 768 px, inline start-aligned from 768 px, `gap: var(--space-3)`).
- **Break rules**: labels, levels, tags, notes and values are human-language text: they break at spaces only
  (`expectNoMidWordBreak` with the long-data fixture, called once per chip text, once per `dd` and once per label, legend and term, never
  on a chip list, a whole `dl` or the section: the helper joins adjacent text nodes, checks.ts); a single unbroken token wider than its column (a 40-character tag with no space at
  360) may break anywhere (`overflow-wrap: anywhere`, the `DescriptionList` rule) and never scrolls the page. Tag chips wrap as whole chips
  (`flex-wrap: wrap`, `gap: var(--space-2)`); a chip's text and its remove button stay on one row; the chip's text wraps inside the chip
  when it is wider than the column. Learning notes keep their line breaks (`.note`: `white-space: pre-wrap`).
- **Focus targets** after removing or disabling the focused element: committing a tag → the input stays focused (cleared); removing a tag
  (its remove button) → the next chip's remove button, else the previous chip's, else the input; **Remove field {n}** → **Add field**
  (shown again when it was hidden at 30; the contact-row rule); Save success, an unchanged Save (no request, no toast), a clean Cancel, a
  discarded dirty Cancel and the conflict Reload → **Edit learning profile**; the conflict Cancel → back to the control that had focus before Save (React Aria dialog restore); **Try again** in
  the error state → the **Learning profile** `h2` (`tabIndex={-1}`) once the profile or the error shows again (T-M2.15 AC11 (a));
  Save's pending state keeps focus on Save (the `ui/Button` pending rule). Every one of these is followed by `expectFocusNotLost` in E2E.
- **Layering**: the "Learning profile saved" toast follows interaction-states §4 (AC12): under the conflict dialog and the discard dialog
  it is hidden and inert; nothing in the section is reachable while a dialog is open.
- **Validation per field** (validation-rules rows; lengths in code points; free text refuses C0 controls other than tab, LF, CR; the
  existing `form.errors` texts): Current level 0–40; Learning notes 0–2,000 (counter); each tag 1–40, no control
  characters (comma, tab and line break are separators), ≤ 30 per list, case-insensitively unique; custom field Label 1–60 (required in a
  kept row), Value 0–500, ≤ 30 rows. Client checks on blur and on submit, server 422 mapped as scope 4.
- **Copy** (en / vi verb): Edit learning profile / Sửa hồ sơ học tập; Save / Lưu; Cancel / Huỷ (the existing key); Add field / Thêm mục;
  Remove field {n} / Xoá mục {n}; Remove {tag} / Xoá {tag}; counters with non-breaking spaces as the existing `TextArea`.

## Domain rules (L-04; the write path is the T-M2.9 server, unchanged)
- **Invariants**: at most one profile per student (primary key `student_id`); tags 1–40, no comma or control character, unique ignoring
  case, ≤ 30 per list; ≤ 30 custom fields with label 1–60 and value 0–500; level 0–40; notes 0–2,000 (`StudentFields`, enforced server-side;
  the UI mirrors them).
- **Transitions** (`PUT` by the profile's state; the server's table, covered by `GuardiansAndLearningProfileApiTest` and
  `LearningProfileFirstPutRaceTest`; the client handles every answer):

  | Profile state | `PUT` with | Server answer | UI |
  |---|---|---|---|
  | none | `version: null` | 200, created (`version` 0) | scope 4 success |
  | none | a number | 409 `STALE_VERSION` | scope 5 |
  | exists (version n) | `version: null` | 409 `STALE_VERSION` | scope 5 |
  | exists (version n) | n | 200, replaced (`version` n + 1; n when the values equal the stored ones, `LearningProfile.apply`) | scope 4 success |
  | exists (version n) | m ≠ n | 409 `STALE_VERSION` | scope 5 |
  | any | invalid values | 422 field codes | scope 4 errors |
  | student unknown | any | 404 | not-found view |
- **Concurrency**: optimistic locking only (`version`); two first saves race to one 200 and one 409 (server test). No lock in the UI; one
  form per page (scope 6).
- **Idempotency**: a PUT is a full replacement, so a retry of the same body after a lost answer is harmless except for the version: it
  answers 409 and the dialog's Reload shows the stored result.
- **Transaction boundary, events, audit**: one server transaction per PUT; no event; no audit entry (profile edits are not audited, like
  guardian edits; audit covers create and status).
- **Time**: no date is shown or computed (`updatedAt` is not displayed).
- **Audience**: `@TutorPrivate` `LearningProfileView`; tutor endpoints only; no student DTO, route or cache key holds it.
- **Tests**: one table-driven client test over the rows above (MSW answers → cache, dialog, alert, not-found, field errors); the
  concurrent-update case as an E2E with two pages (both stale cases: an older number, and a first save after another tab created it).

## Acceptance criteria
- AC1 (FR-STU-04, IA §2): the Profile view shows **Learning profile** between Guardians and Account with Current level, Strengths,
  Weaknesses (chips in order), Learning notes (line breaks kept) and each custom field in order, "Not added" for empty values; a never-saved
  profile shows the four rows "Not added" and no custom rows; a value `https://example.com` or `<b>x</b>` shows as text (no link, no
  markup); loading (`aria-busy`, "Loading the learning profile") and the error alert with **Try again** stay inside the section with no
  **Edit learning profile**, while the rest of the page works; after Try again focus is on the section `h2` (component tests with MSW + E2E).
- AC2 (scope 2, design-system): `TagInput` adds a tag on Enter and on a typed comma, splits a pasted "a, b\nc" into three tags, ignores an
  empty entry, refuses (text kept, error shown, nothing added) a 41-character tag, a duplicate in other case, a tag with a control
  character and the 31st tag; the input stays enabled at 30; Enter never submits the form; each chip's remove button has exactly the
  accessible name "Remove {tag}" (vi "Xoá {tag}") and no English description in vi, and removes the tag with focus on the next chip's
  remove button, else the previous, else the input; axe clean in `/dev/ui` (unit tests + `/dev/ui` entry).
- AC3 (FR-STU-04, scope 3–4): **Edit learning profile** opens the form with the stored values and focus on Current level; Save of a
  never-saved profile sends `version: null`, of a saved one its `version`; the body holds every field, trimmed, `null` for emptied texts,
  without rows that are empty after trimming; text left in a `TagInput` is committed by Save; an unchanged form (also after whitespace-only
  edits) sends nothing, closes the form and focuses **Edit learning profile** with no toast; after Save the read view shows the answer, "Learning profile saved" shows and focus is on **Edit learning
  profile**; double click sends one request; a 500 keeps the input with the `InlineAlert` (component tests + E2E).
- AC4 (validation-rules, scope 4): client limits (level 40, notes 2,000, label 60 and required in a row with a value, value 500, 30 rows
  with Add hidden and the limit text) and a 422 on `currentLevel`, `strengths[2]`, `customFields[1].label` (after an empty first row was
  dropped: it marks the form's third row) and `customFields` `TOO_MANY` map as scope 4; the `ErrorSummary` is focused on every failed
  submit with a field error (unit tests for the schema and mapping, component tests).
- AC5 (interaction-states §2.8, Domain rules): a save after another tab saved (older number) and a first save after another tab created the
  profile both open "This was changed elsewhere"; **Reload** shows the other tab's values, closes the form and focuses **Edit learning
  profile**; with changed learning notes **Copy my learning notes** copies them; **Cancel** keeps the typed values; a 404 shows the
  not-found view; the table-driven test covers every row of the transitions table (component tests + E2E with two pages for both 409s).
- AC6 (scope 6): with any form open (profile, add guardian, edit guardian, learning profile) every other form trigger and the Account
  actions are disabled and the hints show (the Guardians hint also for the learning-profile form); a status request or the reset card does
  not disable **Edit learning profile**; a dirty learning-profile form (also with only uncommitted tag text) asks "Discard your changes?"
  on Cancel and on navigation (shell nav, home link) and passes a sign-out and a forced `/change-password` as T-M2.14 AC8; a clean Cancel
  focuses **Edit learning profile**.
- AC7 (SEC, A-008, DEC-127): a profile save answered after a sign-out and the next sign-in as a student, or while no tutor session is
  cached, stores nothing, shows no toast and moves no focus (unit test with a held promise); after any sign-out path no
  `['students','learningProfile',*]` query holds data; no profile value appears in the URL, web storage or the console during the E2E run;
  no student-session response holds a profile value (QA scan with `SECRET-*`-style markers; the backend harness stays green).
- AC8 (NFR-A11Y-01, 02, responsive, UI rules): `expectSettledAccessible` passes on the section (empty, filled with 30 tags per list and 30
  custom fields), the form with errors, the conflict dialog and the discard dialog at 360×740, 768×1024 and 1280×800 in vi and en; the
  long-data walk (a 40-character level, 30-character tags, 60-character labels, 500-character values and a 2,000-character note of real
  words) shows no horizontal scroll and no mid-word break (`expectNoMidWordBreak`) at the three viewports; `expectFocusNotLost` after each
  control of the UI rules' focus list; keyboard-only edit, tag add/remove, field add/remove and save; update a learning profile = ≤ 3 user
  steps (Edit learning profile → type a weakness and press Enter → Save; new ux-flows **F12**).
- AC9: `./scripts/gate.sh` green once on the final head and CI green (DEC-131 (6)); all existing unit and E2E assertions kept except the
  two `h2` lists of DEC-140 (1); F2 ≤ 6, F10 ≤ 3, F11 ≤ 3 kept; the bundle budget green with no students code in either first-visit closure;
  `api/openapi.json` unchanged; `ForbiddenIdentifiersTest` green and no exam or curriculum name in `web/src` strings or code.

## Test plan
- Implementation: unit (`toLearningProfilePut` and `isUnchanged` tables incl. `null` clears, whitespace-only edits, dropped rows; the
  `customFields[i]` index mapping; `TagInput` entry rules and focus; the scope 7 session check with a held promise; the transitions-table
  test), component tests with MSW (section states, edit/save with errors, 409/404/422/500, one-form lock with the guardian and profile forms),
  E2E `students.spec.ts` at phone-small, tablet, laptop (AC1, AC3, AC5 with two pages, AC6, AC8; F12 step log), the **T-M2.19 helpers**:
  `longData` extended with the profile's long values and walked at the three viewports in vi and en, `expectFocusNotLost` after every
  removing or disabling control of the UI rules, `expectSettledAccessible` instead of a bare axe call. Changed specs ×3 in the gate; focus
  specs ×20 by QA (DEC-131 (7)).
- **When a new check finds a real defect** outside this packet's allowed change (lessons L-10): the implementer reports it at once as an
  OQ to the LC; `test.fail` only until the LC rules (an AC + DEC), and the LC rules before G3.
- Independent QA focus (combined QA+UX, qa-protocol §2a): two tabs saving the same profile (both stale cases); 30 tags and 30 fields at
  360; pasting lists with duplicates, commas, tabs and line breaks; a long tag with no space; profile form open + learning-profile edit
  attempts; discarding with only uncommitted tag text; vi/en; the `/dev/ui` `TagInput` by keyboard and screen-reader names. Exploratory
  charter: find a way to save over another tab's change without the dialog, to lose typed tags without the discard question, or to see a
  learning-profile value in any student session response or in storage.
- **Isolation**: no new endpoint; `GET`/`PUT …/learning-profile` are `@Audience(TUTOR)` with authz-matrix and isolation entries since
  T-M2.9. QA confirms a student session gets 403 on `GET /api/v1/tutor/students/{sid}/learning-profile`.
- SEC (own fresh agent): A-008 end to end (no student route, response, cache or storage holds the profile), the scope 7 session check, the
  sign-out paths, values rendered as text only (no `dangerouslySetInnerHTML`, no auto-linking), no value in logs or URLs.

## Evidence required
- `evidence/T-M2.17/summary.md` (recorded by the LC from the implementer's returned text, L-07: AC → proof, the `frontend-standards`
  self-check list ticked, the **G3 cost** table), one gate log on the final head + green CI; local screenshots (not committed) at 360×740,
  768×1024 and 1280×800: the section empty, filled and long-data, the form (with errors, 30 fields), the conflict dialog with Copy my
  learning notes, `/dev/ui` `TagInput`, in vi and en at least once each; the F12 step log. E2E data uses **fictitious** values only. G3:
  `review/security.md` and the combined `review/ux.md` (+ QA verdict) recorded by the LC; the QA report via `qa/T-M2.17` (reviewer evidence
  never on the feature branch).

## Docs to update
- `information-architecture.md` §2 (Implemented T-M2.17 note), `interaction-states.md` §2.8 (the conflict dialog for the learning profile),
  `ux-flows.md` (new **F12 Update a learning profile: ≤ 3 steps**), `design-system.md` §3 (`TagInput` as built), `security.md` T2 (the
  learning profile on screen: tutor only, text only), `glossary.md` (vi terms: Trình độ hiện tại, Điểm mạnh, Điểm yếu, Ghi chú học tập,
  Mục tuỳ chỉnh), backlog (T-M2.17 done note), `progress.json` (LC).

## Risks & assumptions
- **Size**: 9 ACs, about 1.5–2 agent-days; `TagInput` is the new part. **Split line**: if AC1–AC6 are not green by about 2 agent-days,
  custom-field rows (scope 3's Custom fields, their part of AC4) move to a follow-up by a DEC; AC7 (SEC) never moves.
- `TagInput` puts one remove button per tag in the tab order (up to 60 extra tab stops with both lists full): accepted for the simpler,
  fully translated control (DEC-140 (4)); a grid with Delete/Backspace would need React Aria's English-only description in vi.
- The PUT replaces the whole profile: a tab with a stale version can never overwrite silently (409), so no field-level merge is needed.
- E2E signs in as `e2e-tutor` (`.data/e2e/`) and adds students with unique names; the dev database keeps them (never purge without asking the PO).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.17 ./scripts/gate.sh
git checkout -- evidence/T-M2.17   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.17-learning-profile
```
