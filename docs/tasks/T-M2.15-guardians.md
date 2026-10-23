# T-M2.15: Guardians on the student profile and in Add student

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`9b9e133`, PR #112) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.15-guardians` (from `develop`) |
| Depends on | T-M2.9 (`37e8ce0`, the guardian endpoints), T-M2.14 (`6073e71`): merged |
| Estimate | 1.5–2 agent-days |
| Trace | SPEC §4.2, §5.6, §46, §49; FR-STU-01 (guardians in the add form), FR-STU-03 (guardians); NFR-UX-02, NFR-A11Y-01, NFR-A11Y-02; information-architecture §2 (Profile: guardians); interaction-states §1, §2.2–§2.6, §2.8, §2.9, §4; design-system §3 (`ConfirmDialog`, `Toast`, `UnsavedChangesGuard`, `Disclosure`, `DescriptionList`); validation-rules (guardian.name, guardians per student, Common phone/email, Description); api-catalog "tutor: students" (`GET`/`POST …/students/{sid}/guardians`, `PATCH`/`DELETE /tutor/guardians/{gid}`, the `guardians` of `POST /tutor/students`; all live since T-M2.9); A-005; DEC-124, DEC-127 (the T-M2.14 SEC residual), DEC-128 (this split) |

## Goal
The tutor can record who to contact about a student (a parent, a partner, an employer): on the student's Profile view they see, add,
correct and remove up to 10 guardians, and they can enter guardians right in Add student. Concurrent edits from another tab are caught (409
`STALE_VERSION` → "This was changed elsewhere" + **Reload**). Guardians are contact details only: no account, sign-in or notification
(A-005). Also closes the T-M2.14 SEC residual (DEC-127): a write answer that arrives after the next sign-in is never stored. The
tutor-private learning profile and `TagInput` are the follow-up **T-M2.17** (DEC-128).

## Scope
- In:
  1. **Guardians section** (IA §2 Profile "guardians", FR-STU-03): a section **Guardians** (`h2`) on the Profile view between **Note** and
     **Account** (while the profile form is open: after the form, before Account), shown in both modes. Data: `GET /tutor/students/{sid}/guardians` under the query key
     `['students','guardians',sid]` (insertion order). Each guardian is an `li` of a list (`ul`, no bullets) with the name as `h3`, a
     `DescriptionList` (Relationship, Phone, Email, Notes — the Notes value keeps its line breaks; empty values "Not added", the same `emptyLabel` as the Profile view; phone and
     email through `ContactValue`, so they link as on the Profile view) and an action row: **Edit** and **Remove** (both secondary; their
     accessible names include the guardian's name, e.g. "Edit Nguyễn Thị Lan", visible text "Edit" / "Remove"). Under the list, once the
     guardians have loaded (never while loading or in the error state): **Add guardian** (secondary). No guardians: the muted text "No guardians added." and **Add guardian**. Ten guardians: no Add button; the
     muted text "Up to 10 guardians. Remove one to add another." States (interaction-states §1): loading → an `output` with `aria-busy="true"` and
     the label "Loading the guardians" from 0 ms holding a `DelayedSkeleton` of two rows (as `WorkspaceSkeleton`), inside the section (the
     rest of the page renders); error → an `InlineAlert` (danger) in the section ("Couldn't load the guardians.")
     with **Retry**; the rest of the page is unaffected; a 404 → the feature's not-found view.
  2. **Guardian form** (add and edit, in place): **Add guardian** opens an empty form after the list (the Add button is hidden while it is
     open); **Edit** turns that guardian's `li` into the form with its saved values. One `GuardianForm` component for both (React Hook Form
     + Zod, `model/guardianSchema.ts`): Name (required, 1–120), Relationship (0–40, hint "For example: mother, father, partner"), Phone and
     Email (the add form's rules, `model/createSchema.ts`), Notes (`TextArea` with counter, 0–2,000); **Save** / **Cancel**.
     Focus: opening the form moves focus to Name. The form's group is labelled ("New guardian" / "Edit guardian {name}").
  3. **Save**: add sends `POST …/guardians` with the trimmed values (an optional field empty after trimming is left out); edit sends
     `PATCH /tutor/guardians/{gid}` with `version` and **only the fields whose trimmed value changed** (an emptied optional field as `null`; nothing changed → the form
     closes without a request). Pending: "Saving…", double submit impossible. Success: the answer updates the guardians cache entry in place
     (append for POST, replace by `id` for PATCH; no refetch), the form closes and a `Toast` says "Guardian added" / "Guardian saved"; focus
     moves to the new or saved guardian's **Edit** button. Errors: 422 → fields by `field` (unknown ones to the form's `ErrorSummary`); a 422
     `TOO_MANY` on `guardians` (another tab added the 10th) → the guardians query is refetched and an `InlineAlert` in the form says "This
     student already has 10 guardians." (input kept, focus on the alert, no `ErrorSummary`); 409 `STALE_VERSION` → scope 5; a 404 on PATCH (another tab removed the guardian) →
     the guardians are refetched, the form closes and an `InlineAlert` (warning) at the top of the section says "This guardian was removed
     in another tab or window." (focus on the alert; it clears on the next guardian action: Add, Edit, Remove); a 404 on POST → the not-found view; network/5xx → `InlineAlert` above Save/Cancel, input kept. Every failed
     submit with a field error (client, or a 422 other than `TOO_MANY`) shows the `ErrorSummary` and focuses it (the form has 5 fields, interaction-states §2.3).
  4. **Remove** (interaction-states §2.9, irreversible): **Remove** opens a `ConfirmDialog` "Remove {name} from the guardians?" ·
     "Their contact details will be deleted. This can't be undone." · **Remove guardian** (danger) / **Cancel**. Confirm sends `DELETE
     /tutor/guardians/{gid}`; pending: the confirm button shows "Removing…" and the dialog cannot be dismissed (the T-M2.14 `isPending`).
     204 → the guardian leaves the cache entry, the dialog closes, a `Toast` "{name} removed" (no Undo), focus to the **Guardians** `h2`
     (`tabIndex={-1}`). 404 (already removed elsewhere) → the same as 204 but the guardians are refetched. Network/5xx → the dialog stays
     open with an `InlineAlert` in its content slot ("Couldn't remove the guardian. Try again.").
  5. **Conflict** (interaction-states §2.8): a 409 `STALE_VERSION` on a guardian save opens the existing `ConflictDialog`; **Reload**
     refetches the guardians and closes the form; **Cancel** keeps the form as typed; when the Notes were changed, the dialog holds **Copy
     my notes** (the `ConflictDialog`'s copy slot gets a label prop: "Copy my note" for the profile, "Copy my notes" here).
  6. **One form at a time** (extends T-M2.14 scope 1): the page has at most one open form among the profile form, the add-guardian form and
     one guardian's edit form. While one is open, **Edit profile**, **Add guardian**, every guardian's **Edit** and **Remove**, and the
     Account actions are disabled; the Account section keeps its hint "Save or cancel your changes first", and the Guardians section shows the
     same hint above its list when a form outside it (the profile form) is open. The guardian triggers are not locked by a pending status or
     reset request or the reset card (guardians cannot make them stale). Each guardian form uses `UnsavedChangesGuard` ("Discard your
     changes?" · **Discard** / **Keep editing**, as the profile form); **Cancel** of a dirty guardian form asks the same; a clean Cancel
     closes it, focus back to the trigger (**Add guardian** or that guardian's **Edit**).
  7. **Guardians in Add student** (FR-STU-01): a collapsed `Disclosure` **Guardians** between **Contact** and **Note** in the add form. It
     holds 0–10 guardian rows (each a `fieldset` with the legend "Guardian {n}" and the five fields of scope 2, stacked) and **Add guardian**
     (adds a row and focuses its Name; hidden at 10 with the scope 1 limit text); each row ends with **Remove guardian {n}** (a quiet `Button` with the Trash icon and visible text, the contact-handle rows' pattern in
     `StudentFields.tsx`; focus moves to the previous row's Name; when the first row is removed, to the new first row's Name; when no row
     is left, to **Add guardian**). A row whose five fields are all empty after trimming is left out
     of the request; a row with any value needs a Name ("Enter the guardian's name"). The request's `guardians` holds the kept rows in order
     (left out when none); a 422 on `guardians[i].<field>` maps to that row's field (index of the sent rows → the form row), other `guardians`
     errors to the `ErrorSummary` (`TOO_MANY` → "Up to 10 guardians."). The section opens itself when a submit has an error inside it. The
     credentials card is unchanged; F2 stays ≤ 6 steps without guardians.
  8. **SEC residual** (DEC-127, T-M2.14 SEC round 2): every students write that stores its answer in the cache (`useStoreStudent` and the
     guardian cache updates of scope 3, 4) first reads the cached session under `['auth','session']` (by key, no import from
     `features/auth`, frontend-architecture §1) and stores nothing unless it is a session with `role === 'TUTOR'`; the list invalidation is
     skipped likewise. A toast or focus move of a write whose answer is not stored is skipped too.
  9. **Strings** vi + en (`students` namespace). `/dev/ui` needs no new entry (no new `ui/` component). **E2E** (`e2e/`): extend
     `students.spec.ts` (phone-small, tablet, laptop) with guardians, creating its own students.

## Out of scope (explicit)
- **T-M2.17** (DEC-128): the tutor-private learning profile (level, learning notes, strengths/weaknesses tags, ≤ 30 custom fields; `GET`/`PUT
  …/learning-profile`) and `TagInput` in `ui/`.
- Reordering guardians (the API has no order endpoint; insertion order), a guardian account, sign-in or message (A-005), guardian quick
  links in the workspace header (the header keeps the student's own contacts), Undo for Remove (irreversible, confirmed instead).
- Any backend or endpoint change (`api/openapi.json` must not change); the `qa/` specs (T-M2.7); T-M2.16.

## Guardrail answers (scope.md §6)
1. **Trace:** FR-STU-01, FR-STU-03; SPEC §4.2, §5.6, §46; DEC-124, DEC-127, DEC-128. 2. **Drift toward excluded scope?** No: guardians are
contact details, with no account, messaging or notification (A-005; no chat, no parent portal). 3. **Mandatory setup added?** None: guardians are
optional everywhere, collapsed in Add student. 4. **Weekly use?** Yes for teen students: the tutor checks or updates a parent's phone when a
lesson moves. 5. **Hard-coded semantics?** None: Relationship is free text (the hint gives examples, no list).

## Design notes
- **Files**: `features/students/components/GuardiansSection.tsx` (list, states, add/edit/remove), `GuardianForm.tsx` (scope 2, also the
  field group reused by the add form's rows, scope 7), `model/guardianSchema.ts` (`toGuardianCreate(values)`, `toGuardianPatch(initial,
  values, version)` returning only changed fields; the add form's row schema and `toCreateRequest` extension); `api/guardians.ts`
  (`useGuardians`, `useAddGuardian`, `useUpdateGuardian`, `useRemoveGuardian`, all on `['students','guardians',sid]`); the session check of
  scope 8 as one helper in `api/` used by `useStoreStudent` and the guardian hooks. `serverErrors.ts` gains the `guardians[i].<field>` paths.
  `StudentWorkspacePage.tsx` lifts "which form is open" into one state (`'profile' | 'add-guardian' | {guardian: id} | null`). Import rules
  unchanged.
- **Version bookkeeping**: each guardian has its own `version`; a PATCH sends the cached guardian's `version` and the answer replaces it.
  Guardian writes never touch the student's `version` or detail entry.
- **Layout rules (fixed, not content-driven)**: the section keeps the Profile view's own column (uncapped since AC11 (c), DEC-132);
  guardian items stack with `gap: var(--space-4)`, each with a `var(--border-width) solid var(--color-border)` block-start divider except the first; the guardian `h3` wraps with
  `overflow-wrap: anywhere`; the Notes value uses the Profile view's `.note` class (`white-space: pre-wrap`, `overflow-wrap: anywhere`); the form fields
  are full width of the column, one per row at every width (no grid); action rows (`.actions`) as in T-M2.14: below 768 px stacked full
  width in source order, at ≥ 768 px inline, start-aligned, `gap: var(--space-3)`. The add form's guardian rows: each `fieldset` full width,
  the legend alone on its line, the fields stacked below, the **Remove guardian {n}** button last in the fieldset (start-aligned, as the
  contact-handle rows). Long values (notes, email) wrap with `overflow-wrap: anywhere` inside the
  `DescriptionList` (its existing rule).

## Acceptance criteria
- AC1 (FR-STU-03, IA §2): the Profile view shows **Guardians** between Note and Account with each guardian's name, relationship, phone and
  email links and notes in insertion order (a multi-line note keeps its line breaks), "Not added" for empty values, and "No guardians added." when there are none; the loading
  region (`aria-busy`, "Loading the guardians") and the error alert with Retry stay inside the section, with no **Add guardian**, while
  the rest of the page works (component tests with MSW + E2E).
- AC2 (FR-STU-03): **Add guardian** with only a name sends a POST with `{name}`; with all fields the trimmed five; the guardian appears at
  the end of the list without a refetch, "Guardian added" shows and focus is on its **Edit**; at 10 guardians the Add button is gone and the
  limit text shows; a 422 `TOO_MANY` from another tab's 10th shows "This student already has 10 guardians." and the refetched list (component
  tests + E2E with two pages).
- AC3 (FR-STU-03): **Edit** opens the form with the saved values and focus on Name; changing the phone and clearing the email sends a PATCH
  with `version`, `phone` and `email: null` only; an unchanged form sends nothing; after Save the item shows the new values, "Guardian
  saved" shows and focus is on its **Edit**; client validation (required name, limits: name 120, relationship 40, notes 2,000, email/phone
  rules) and a 422 map to the fields; the `ErrorSummary` is focused on every failed submit with a field error (client, or a 422 other than `TOO_MANY`); `TOO_MANY` focuses its
  `InlineAlert`; a whitespace-only change sends nothing; a 500 keeps the input with the `InlineAlert`;
  double click sends one request.
- AC4 (interaction-states §2.8): a guardian saved in another tab first → Save answers 409 and the "This was changed elsewhere" dialog
  appears; **Reload** shows the other tab's values and closes the form; with changed notes **Copy my notes** copies them; **Cancel** keeps
  the typed values; a guardian removed in another tab → Save answers 404, the list is refetched without it and "This guardian was removed in
  another tab or window." shows (focused) until the next guardian action (component tests + E2E with two pages for the 409).
- AC5 (interaction-states §2.9): **Remove** asks first (the dialog names the guardian and says it can't be undone); Cancel sends nothing;
  confirm removes it from the list, toasts "{name} removed" and focuses the **Guardians** heading; while pending the dialog cannot be
  dismissed; a 5xx keeps the dialog open with its alert; a 404 closes it and refetches.
- AC6 (scope 6): with any form open (profile, add guardian, edit guardian) every other form trigger and the Account actions are disabled
  and the hints show; a status request or the reset card does not disable the guardian triggers; a dirty guardian form asks "Discard your
  changes?" on Cancel and on navigation (shell nav, home link) and passes a sign-out and a forced `/change-password` as T-M2.14 AC8; a clean
  Cancel returns focus to the trigger.
- AC7 (FR-STU-01): in Add student the collapsed **Guardians** section adds up to 10 rows (Add hidden at 10) and removes rows (focus as scope
  7, including removing the first of several rows and the last remaining row); creating a student with two guardians (one row left empty, one whitespace-only) sends `guardians` with the two filled rows in order, and the new student's
  Profile view lists them; a row with a phone and no name shows "Enter the guardian's name" and opens the section; a 422 on
  `guardians[1].email` marks the second sent row's Email; a student without guardians still takes ≤ 6 steps (F2) and its request has no
  `guardians` (component tests + E2E).
- AC8 (SEC, DEC-127): a student write (profile save, status, guardian add/edit/remove) answered after a sign-out and the next sign-in as a
  student, or while no tutor session is cached, stores nothing in the query cache, invalidates nothing and shows no toast (unit tests with
  a held promise: answer after logout + login as student → no `students` query, empty toast queue); a tutor session stores as before.
- AC9 (NFR-A11Y-01, 02, responsive): axe shows no serious or critical issue on the Profile view with 0, 2 and 10 guardians, the guardian
  form with errors, the remove dialog, and the add form with two guardian rows with an error, at 360×740, 768×1024 and 1280×800 in vi and
  en; the layout rules hold (actions stacked full width below 768, inline at ≥ 768; fields one per row; no horizontal scroll with a 120-character
  name and a 2,000-character note); keyboard-only add, edit, remove; the guardian action buttons' accessible names include the name; add a
  guardian = ≤ 3 user steps (Add guardian → type the name → Save; new ux-flows **F11**).
- AC10: `./scripts/gate.sh` green twice in a row on the same dev database (met on `7128127`; after the AC11 fixes once on the final head + CI, DEC-131 (6)); all existing unit and E2E assertions kept (F2 ≤ 6, F10 ≤ 3),
  with one named exception: the `ConflictDialog` copy button's label becomes a prop (its tests pass the profile label); the bundle budget
  green with no students code in either first-visit closure; `api/openapi.json` unchanged.
- AC11 (G3 round 1, DEC-132; S3 fixed in-task, DEC-131 (5)): (a) **QA-1** after **Try again** in the guardians error state, focus moves to the
  Guardians `h2` (never `body`); (b) **UX-1** the guardian conflict dialog says the guardian changed ("Someone changed this guardian in another
  tab or window…"; vi with the glossary term "phụ huynh", glossary.md), the profile dialog keeps its text (the description becomes a prop like the copy
  label); (c) **UX-2** (LC ruling) the Guardians section follows the Profile view's own column: no `--size-reading-max` cap on `.guardians`, so
  its term/value columns line up with Personal information and Contacts at 768 and 1280. Unit tests prove (a) and (b).

## Test plan
- Implementation: unit (`toGuardianPatch` changed-fields table incl. `null` clears, trailing spaces and whitespace-only values; the add form's row filtering and index mapping; the
  scope 8 session check), component tests with MSW (section states, add/edit/remove with errors, 409/404/`TOO_MANY`, one-form lock, the add
  form's guardian rows), E2E `students.spec.ts` (AC1–AC7, AC9 at phone-small, tablet, laptop; two pages for 409 and `TOO_MANY`), axe.
- Independent QA focus: two tabs editing and removing the same guardian; adding the 10th in two tabs at once; clearing every optional field;
  120-character names and 2,000-character notes at 360; profile form open + guardian edit attempts; the add form with 10 rows, removing the first, one from
  the middle and the last, a 422 on a later row after an empty row was dropped; vi/en. Exploratory charter: find a way to leave a guardian form's changes
  without the discard question, to save over another tab's guardian change without the conflict dialog, or to see a guardian in any student
  session response.
- **Isolation**: no new endpoint; the guardian endpoints are `@Audience(TUTOR)` with authz-matrix and isolation entries since T-M2.9. QA
  confirms a student session gets 403 on `GET /api/v1/tutor/students/{sid}/guardians` and that no student response holds a guardian value.
- SEC: **triggered** (third-party personal data — guardians' phone, email, notes — on screen and in the cache; the scope 8 residual; SEC
  confirms that sign-out, own and cross-tab, also drops `['students','guardians',*]`: `useLogout` and a 401 clear the whole query cache; a
  cross-tab message drops every query but the session, `dropAllButSession` in `app/guards.ts`). UX:
  **triggered** (new section, forms, dialog, add form section).

## Evidence required
- `evidence/T-M2.15/summary.md`, gate logs (both runs), screenshots under `evidence/T-M2.15/impl/` at 360×740, 768×1024 and 1280×800: the
  Guardians section (0, 2 and 10 guardians), the guardian form (add, edit with errors), the conflict dialog with Copy my notes, the remove
  dialog (and its error), the removed-elsewhere alert, the add form with guardian rows (with an error), in vi and en at least once each; axe
  results; the F11 step log. E2E data and screenshots use **fictitious** guardians only (invented names, `example.com` emails,
  phone numbers from the range reserved for fiction, `+1 555 0100`–`0199`), never real people's data. QA report via `qa/T-M2.15`; UX and SEC verdicts as PR records (reviewer evidence never on the feature branch).

## Docs to update
- `information-architecture.md` §2 (Profile: guardians implemented; learning profile T-M2.17), `interaction-states.md` §2.8 (the conflict
  dialog for guardians) and §2.9 (Remove guardian as built), `ux-flows.md` (new **F11 Add a guardian: ≤ 3 steps**; F2: replace "No guardian section until
  T-M2.14" with the optional, collapsed Guardians section of T-M2.15), `security.md` T19 (the scope 8 session check: a write answer is
  stored only while a tutor session is cached), backlog (T-M2.15 done note), `progress.json`.

## Risks & assumptions
- **Size**: 10 ACs, about 1.5–2 agent-days; the lift of "which form is open" touches `StudentWorkspacePage.tsx` and `AccountSection.tsx`
  (T-M2.14). **Split line** (within this task): if AC1–AC6 are not green by about 2 agent-days, the add form's guardian section (scope 7,
  AC7) moves to a follow-up by a DEC; AC8 (SEC) never moves.
- `DELETE /tutor/guardians/{gid}` takes no `version`: a remove after another tab edited the guardian succeeds (the edit is lost). Accepted:
  the tutor confirmed the removal of that person; QA does not report it as a defect.
- E2E signs in as `e2e-tutor` (`.data/e2e/`) and adds students with unique names; the dev database keeps them (never purge without asking the PO).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.15 ./scripts/gate.sh && ENGLMS_TASK=T-M2.15 ./scripts/gate.sh
git checkout -- evidence/T-M2.15   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.15-guardians
```
