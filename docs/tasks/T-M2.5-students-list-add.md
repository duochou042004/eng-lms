# T-M2.5: Students list, Add student (F2) and the workspace header

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.5-students-list-add` (from `develop`) |
| Depends on | T-M2.3 (`f0e228c`), T-M2.9 (`37e8ce0`), T-M2.4 (`9fcc992`), T-M2.11 (`1af32de`), T-M2.12 (`b5596d3`): all merged |
| Estimate | 2 agent-days |
| Trace | SPEC §4.2, §6, §41, §46, §49; FR-STU-01 (without guardians and the first goal), FR-STU-02 (as served today, DEC-097 (5)), FR-STU-06 (header and Profile view, read-only), FR-STU-07; NFR-UX-02, NFR-A11Y-01, NFR-A11Y-02, NFR-PERF-03; ux-flows F2 (≤ 6 steps, ≤ 90 s); information-architecture §1 (Students item), §2 (workspace), routes `/tutor/students`, `/tutor/students/new`, `/tutor/students/:sid`; interaction-states §1, §2; design-system §3, §4, §5.1–5.2; api-catalog "tutor: students" (live endpoints only); security.md T12 (temporary passwords); A-021; DEC-097 (2), DEC-098, DEC-100 (SEC S4-8: contact links through a scheme allow-list), DEC-102 (no first goal before M7), DEC-120 (this split and the packet decisions) |

## Goal
The tutor can find a student and add one. A **Students** item in the tutor navigation opens a responsive, searchable list; **Add student**
creates the student and their account in the ux-flows F2 budget and shows the **credentials card** once (username, temporary password, login
URL, a ready-to-paste message); **Open workspace** lands on the student's workspace page, which shows the header (name, status, username,
contact quick links) and the student's personal information and contacts. Editing, guardians, the learning profile, status changes and the
password reset are the follow-up **T-M2.14** (DEC-120).

## Scope
- In:
  1. **Navigation**: a `Students` row in the tutor shell's item list (`nav.students`, icon `Users`, `/tutor/students`), after Today. The new routes are
     children of the `/tutor` layout route; each page is its **own lazy chunk** imported from the router (not re-exported through
     `TutorShell.tsx`, so React Hook Form, Zod and the pages stay out of the tutor first-visit budget), and students code never reaches a
     student's bundle (NFR-PERF-03); feature code lives in `web/src/features/students/` (`routes/`, `components/`, `api/`, `model/`).
  2. **List** `/tutor/students` (FR-STU-02 as the API serves it, DEC-097 (5)): `PageHeader` "Students" with the primary action **Add student**
     (`/tutor/students/new`). A `DataList` (new `ui/` component: a semantic table at ≥ 768 px, a list of rows below 768 px, no horizontal scroll at
     360 px) of the rows `{fullName, username, status, email, phone}`: the name links to the workspace; status uses `StatusBadge`. Controls: a
     search field (`q`, debounced 300 ms, server-side accent-insensitive), an **Include archived** checkbox (adds `ARCHIVED` to the default
     `ACTIVE`+`PAUSED`), a sort `SegmentedControl` **Name** (`fullName,asc`, default) / **Newest** (`createdAt,desc`), and **Previous / Next**
     paging (25 per page) with "Page n of m". Every control lives in the URL search params (`q`, `archived=1`, `sort=newest`, `page`), so Back,
     reload and a shared link restore the view. The URL `page` is **1-based** and maps to the API's 0-based `page` (`page − 1`, api-conventions
     §4). Invalid params fall back to the defaults (non-numeric or < 1 `page` → 1, unknown `sort` → Name); a `page` past the last page (an empty
     `items` with `totalItems > 0`, e.g. a stale link) replaces the URL with the last page; control characters (U+0000–U+001F, U+007F) are
     stripped from `q` and it is trimmed before it is sent. The user never sees a 422.
  3. **List states** (interaction-states §1): initial loading → `DelayedSkeleton` of the rows (same heights); a refetch keeps the rows and shows the existing
     `ProgressLine` at the top edge of the viewport (design-system §3; G3 QA-1) while it runs (after 150 ms); **first use** (no student in any status) → `EmptyState` "Add your first
     student" explaining that the student gets their own sign-in, with one primary action. With **Include archived** on and no `q`, an empty list is first use
     directly (no count request). When the default view (no `q`, archived off) is empty, one count request with all three statuses and `size=1` decides; when it finds students (all
     archived), the list says "No active or paused students" with the action **Include archived** instead; **filtered empty** → "No students match “…”" with **Clear filters**; **error** → `InlineAlert` with Retry, rows kept if cached.
  4. **Add student** `/tutor/students/new` (FR-STU-01, ux-flows F2): React Hook Form + Zod (`model/`, aligned with validation-rules) with
     **Full name** (required) and **Username** (required): while the username is untouched, typing the name fills it from
     `GET /tutor/usernames/suggestion` (debounced 300 ms) once the name has at least 3 letters or digits after removing accents (below that no
     request is sent, so the server's `student` fallback never fills the field), and emptying the name clears the untouched username; once the
     tutor edits Username, the suggestion stops. The username shows its availability
     from `GET /tutor/usernames/availability` (debounced 300 ms; "Available" / "Taken" / "Not a valid username", polite, never blocking typing).
     **Password** is a collapsed optional section: empty = the server generates one (helper text says so); typed = `PasswordField` with the policy
     hint. Collapsed optional sections (a new `ui/` `Disclosure`): **Contact** (email, phone, contact handles: up to 30 label + value rows,
     add/remove; validation-rules: label 1–60, value 0–500, ≤ 30 entries), **Note** (a new `ui/` `TextArea`, counter). No guardian and no goal section (DEC-120, DEC-102). **Create** posts
     `POST /tutor/students`; while pending the button shows "Creating…" and double submit is impossible. Errors: 409 `USERNAME_TAKEN` → inline
     on Username and focus there; 422 → mapped to fields by `field` (contact rows by index), unknown ones to the `ErrorSummary` (the form has
     > 4 fields: summary on top, focus moves to it); network/5xx → `InlineAlert` above the actions, input kept. **Cancel** returns to the list.
     **Unsaved changes guard** (interaction-states §2.6): leaving the dirty form in-app asks through a new `ui/` `ConfirmDialog` ("Discard this
     student?" · **Discard** / **Keep editing**); `beforeunload` while dirty. Successful create turns the guard off. The guard blocks every
     navigation to another pathname (the shell links, the home link `/`, the account section's "Change password") except a target of `/login`
     or `/forbidden`: a sign-out (own Log out, another tab's sign-out, a 401) and a role redirect are never blocked, so a dirty form never keeps
     a signed-out page open.
  5. **Credentials card** (FR-STU-01, F2 step 6, security.md T12): after a 201 the page replaces the form with the card (the card, with
     its `h2` "Student created" receiving focus, is the create success feedback instead of the toast of interaction-states §2.5, DEC-120 (7)): student name,
     username, temporary password (monospace, selectable), the expiry date (`expiresAt`, in the tutor's locale), the login URL
     (`<origin>/login`) and the notice "This password is shown only now. You can reset it later from the student's profile." Actions:
     **Copy message** (primary; a ready-to-paste text in the UI language with the workspace name, login URL, username, temporary password, expiry
     and "you will choose your own password at first sign-in"), **Copy password**, **Open workspace** (`/tutor/students/:sid`) and **Add another
     student** (an empty form). A new `ui/` `CopyButton` uses `navigator.clipboard.writeText`, announces "Copied" politely and, where the clipboard
     is unavailable or refused, says "Couldn't copy. Select the text and copy it." (the text stays selectable). The credentials live only in
     this page's component state: never in the query cache, the URL, history state, storage or a log; Back or leaving the page drops them for
     good, and a later visit to `/tutor/students/new` shows an empty form.
  6. **Workspace page** `/tutor/students/:sid` (FR-STU-06, read-only in this task): `GET /tutor/students/{sid}`. Header (design-system §5.2):
     the name as `h1`, `StatusBadge`, `@username`, and the **contact quick links** (scope 7). Body: the **Profile** view (IA §2) as a
     `DescriptionList` (new `ui/`): personal information (full name, username, status, added on) and contacts (email, phone, handles), then the
     note (plain text, line breaks kept). No tab bar while Profile is the only content (DEC-120 (3), (8); FR-STU-06 "no dead tabs"; the route plan: the index shows the Profile view until a second tab ships, then the
     Profile moves to `/profile` and the index becomes the Overview, IA §2), no quick actions
     and no next lesson (their modules are M3–M5). Empty values show "Not added" (muted text, no action: editing arrives with T-M2.14). States: skeleton after 150 ms; 404 (and a
     `:sid` that is not a UUID, which sends no request) → the feature's own not-found view inside the shell (an `h1` "Student not found",
     "This student doesn't exist or isn't available to you", and a link to Students; built from `ui/` components, since `features/` cannot
     import `app/`'s `ShellNotFound`); error → `InlineAlert` + Retry. A **Back to students** link returns to the list with its previous search params.
  7. **Contact quick links** (FR-STU-07, DEC-100 SEC S4-8): one pure function `contactHref(kind, value)` in `features/students/model/`
     decides; nothing else builds an `href` from a student value. Phone → `tel:` with only `+` and digits kept (no link when fewer than 3
     digits remain); email → `mailto:` only when the value is one address (`local@domain`, no whitespace, `?`, `#`, `,`, `;`, `%0a`/control
     characters or second `@`); a handle → a link only when it parses with `new URL()` to the `https:` protocol with a host; every other value
     (including `http:`, `javascript:`, `data:`, `zalo:`, protocol-relative, and handle values that are not URLs) is shown as text with a
     `CopyButton`. Links have visible text = the value, an accessible name with the label ("Call 0901…", "Email …", "Open Zalo link"), and
     https links open with `target="_blank" rel="noopener noreferrer"`.
  8. **Status vocabulary**: student statuses start `ui/status/statusMap.ts` (the file design-system §4 names; it does not exist yet) and join design-system §4: ACTIVE "Active / Đang học" (success,
     check-circle), PAUSED "Paused / Tạm nghỉ" (warning, pause-circle), ARCHIVED "Archived / Đã lưu trữ" (neutral, archive), in §4's icon
     naming (lucide `CircleCheck`, `CirclePause`, `Archive`); `StatusBadge`
     (new `ui/`) shows icon + text (never colour alone).
  9. **Strings** vi + en in a new `students` namespace (and `shell` for `nav.students`); `/dev/ui` entries for every new `ui/` component.
  10. **E2E** (`e2e/`): `students.spec.ts` for the list, the add flow with the credentials card, the workspace page and the step budget at
      phone-small, tablet and laptop; it creates its own students through the UI and the API with unique names (existing helpers).

## Out of scope (explicit)
- **T-M2.14** (DEC-120): edit profile and contacts (optimistic locking, Reload on 409), username change, guardians (list, add, edit, delete,
  and the guardian section of the add form), the learning profile (tags, custom fields), status changes (pause, archive, reactivate), reset
  password (FR-AUTH-07) and the account section of the Profile view; `TagInput`, `Toast`.
- List row signals (next lesson, open work, attention badge) and the "next lesson" / "recently active" sorts: T-M3.1, T-M5.1, T-M7.7
  (DEC-097 (5)). The first goal in the add form: T-M7.2 (DEC-102). Workspace tabs, quick actions and the next lesson: with their modules (M3–M7).
- The "+ New" menu and the command palette (IA §1: with their first targets; the list's **Add student** is the F2 entry point now);
  `Idempotency-Key` on create (not built, api-catalog); split view at ≥ 1280 px (design-system §5.1 "may").
- Any backend or endpoint change (all used endpoints are live: api-catalog "tutor: students"); the `qa/` specs (T-M2.7).

## Guardrail answers (scope.md §6)
1. **Trace:** FR-STU-01, 02, 06, 07; SPEC §49 (F2); DEC-097, DEC-100, DEC-120. 2. **Drift toward excluded scope?** No: no messaging (quick links
only open the tutor's own apps), no school roster features, no bulk import. 3. **Mandatory setup added?** None: only full name and username are
required, and the username is suggested. 4. **Weekly use?** Yes: finding a student is the tutor's most frequent navigation; adding one happens
with every new student. 5. **Hard-coded semantics?** None: no level, exam or curriculum field; handle labels are free text.

## Design notes
- **Routes** (`app/router.tsx`, under `/tutor`): `students` (list), `students/new` (add), `students/:studentId` (workspace). Each `lazy`
  imports its page module from `features/students/routes/` directly (one chunk per page, not through `TutorShell.tsx`); the frontend-architecture import rules hold
  (`features/students` imports only `ui`, `lib` and itself; the router composes). The feature's query keys: `['students','list',params]`,
  `['students','detail',sid]`; a successful create invalidates `['students','list']` and seeds nothing with the credentials.
- **New `ui/` components** (design-system §3 inventory names): `DataList`, `StatusBadge` (+ `status/statusMap.ts`), `Disclosure`, `TextArea`,
  `CopyButton`, `ConfirmDialog` (React Aria `AlertDialog` pattern; also used for the unsaved changes guard via React Router `useBlocker`),
  `DescriptionList`, and a search field (`SearchField`, React Aria). Reused: `PageHeader`, `Button`/`ButtonLink`, `TextField`, `PasswordField`,
  `Checkbox`, `SegmentedControl`, `EmptyState`, `InlineAlert`, `ErrorSummary`, `DelayedSkeleton`/`Skeleton`, `Stack`. Tokens only.
- **Username suggestion race**: only the latest suggestion response may write the field, and never after the tutor typed in it (a sequence
  counter or the query key); the availability check uses the field's current value and ignores stale answers.
- **Generated password**: the request omits `password` when the field is empty (DEC-097 (2), DEC-098); the server answers
  `credentials.temporaryPassword`. The card's message template is one i18n string with interpolation (no HTML).
- **Credentials hygiene** (SEC): component state only; the mutation's result is not kept by TanStack Query beyond the component (`gcTime: 0`
  on the mutation or the result moved to state and the mutation reset); no `console` output; the page sets no `autocomplete` on the displayed
  password (it is text, not an input). After a cross-tab sign-out the existing T-M2.12 reaction revalidates and the guard leaves the page, so
  the state is gone.
- **Workspace not-found**: the page renders its own not-found view (scope 6) for a 404 `ApiError` (or a non-UUID `:sid`), not a redirect,
  so the address stays and route focus lands on its `h1`.
- **Unsaved changes guard**: `useBlocker(({ currentLocation, nextLocation }) => dirty && nextLocation.pathname !== currentLocation.pathname &&
  !['/login', '/forbidden'].includes(nextLocation.pathname))` (scope 4), so sign-out and role redirects pass.
- **Contact links**: `contactHref` returns `string | null`; components render `<a>` only for a non-null result. Unit table tests cover each
  scheme and the refused forms listed in scope 7.

## Acceptance criteria
- AC1 (IA §1, NFR-PERF-03): the tutor navigation shows **Students** (sidebar ≥ 1024 px, drawer below) with `aria-current` on the students
  pages; each students page is its own lazy chunk; `web/scripts/bundle-budget.mjs` `FORBIDDEN_IN_CLOSURE` is extended so that any
  `src/features/students/` key in the student first-visit closure fails, and no students key is in the tutor first-visit closure either; the
  bundle budget stays green.
- AC2 (FR-STU-02): with seeded students, the list shows name (a link to the workspace), username, status badge, email and phone; ACTIVE and
  PAUSED by default, ARCHIVED only with **Include archived**; searching `nguyen` finds "Nguyễn …" (server search); **Newest** sorts by
  creation; Previous/Next page through 26+ students; every control is reflected in the URL and restored by Back and reload; the URL `page` is 1-based; garbage params
  (`page=-1`, `page=abc`, `sort=x`) show the default view, `page=99` lands on the last page, and a `q` with a control character searches
  without it, never showing an error (component tests with MSW + E2E).
- AC3 (FR-STU-02, responsive): at 360×740 rows render as a list without horizontal scroll (`scrollWidth <= clientWidth`); at 768×1024 and
  1280×800 as a table with column headers; long names and emails wrap or truncate with the full value available (E2E bounding boxes).
- AC4 (interaction-states §1): skeleton only after 150 ms; first-use empty state with **Add student** only when no student exists in any status; with only archived students the
  default view says "No active or paused students" with **Include archived**; a refetch shows the `ProgressLine` and keeps the rows; filtered empty state with the query
  and **Clear filters** (resets the URL params); a failing list request shows `InlineAlert` + Retry, and Retry recovers (component tests).
- AC5 (FR-STU-01, F2): typing "Nguyễn Văn An" fills Username with the server's suggestion and shows "Available"; a name with fewer than 3 letters or digits sends no suggestion request; emptying the name clears an untouched username; editing
  Username stops the suggestion; a taken or invalid username shows "Taken" / "Not a valid username"; stale suggestion or availability answers never overwrite a
  newer state (unit test with delayed MSW responses). Create with only name + username creates the student (no `password` in the request
  body); with Contact filled (email, phone, two handles) and a Note, the values are sent and later shown on the workspace page.
- AC6 (FR-STU-01 errors, interaction-states §2): a 409 `USERNAME_TAKEN` (e.g. another tab took the name) shows the inline error on
  Username and focuses it; 422 field errors map to their fields (`contactHandles[1].value` → that row) and unknown ones to the
  `ErrorSummary` with focus on it; a 500 shows the `InlineAlert` and keeps every input; Create is disabled while pending and a double click
  sends one request; leaving a dirty form via the nav asks Discard / Keep editing, and a clean form or a created student leaves without asking; the shell's home link and "Change password" also ask; a sign-out (own Log out or another
  tab's) while the form is dirty lands on `/login` without a dialog.
- AC7 (FR-STU-01, security.md T12): after Create, focus moves to the card's "Student created" heading; the card shows username, temporary password, expiry date, login URL and the "shown only now"
  notice; **Copy message** puts the localised message (vi and en) with those values on the clipboard and announces "Copied"; a refused
  clipboard shows the manual-copy text; **Open workspace** goes to the new student's page; after Open workspace, browser Back to
  `/tutor/students/new` shows an empty form, and nothing of the password is found in `localStorage`, `sessionStorage`, `history.state`, the
  URL or the TanStack Query cache (E2E + unit).
- AC8 (FR-STU-06, FR-STU-07, DEC-100): the workspace page shows the header (name `h1`, status badge, `@username`) and the Profile view
  (personal information, contacts, note with line breaks; empty values "Not added"); phone → `tel:+…`, email → `mailto:`, an `https://zalo.me/…` handle → a new-tab
  link with `rel="noopener noreferrer"`; a non-URL handle, `http://…`, `javascript:alert(1)`, `data:…`, `mailto:a@b?cc=c` and
  `//evil.example` render as text with a copy button and no `<a>` (unit table test of `contactHref` + component test); an unknown or
  non-UUID `:sid` shows the not-found view inside the shell with a link to Students (the non-UUID case sends no request).
- AC9 (ux-flows F2, roadmap M2 exit): an E2E at phone-small, tablet and laptop runs F2 from the Students list: Add student → name → (expand
  Contact → phone) → Create → Copy message → Open workspace in ≤ 6 user steps (the step count is asserted by the spec's step log), within 90 s of
  wall time as a reported measure (not an assertion, DEC-093).
- AC10 (NFR-A11Y-01, 02): axe shows no serious or critical issue on the list (populated, empty, filtered empty), the add form (with
  errors), the credentials card and the workspace page at 360×740, 768×1024 and 1280×800 in vi and en; keyboard-only completion of F2; every
  new `ui/` component has a `/dev/ui` entry, a unit test and an axe check; status is never colour-only.
- AC11: `./scripts/gate.sh` green twice in a row on the same dev database; all existing unit and E2E assertions kept; the API types are
  regenerated only if `api/openapi.json` changed (it must not).

- AC12 (G3 round 1, DEC-122; S2/S3 and cheap S4 fixes made in this task, DEC-088): (a) UX-1 (S2): when a pager button becomes disabled
  after a page change, focus moves to the other pager button (or the labelled list region), never to `body`; unit test at both ends;
  (b) UX-2: a page change scrolls the list top into view and announces "Page n of m" / "Trang n / m" politely; (c) UX-3, QA-4: at 360 px the
  pager keeps Previous at the start and Next at the end in vi and en ("Page n of m" on its own row if needed); (d) UX-4: `DataList` columns
  can be `nowrap`, used for phone and status (no phone wrap at 768 and 1280); (e) UX-6: in the narrow list the `StatusBadge` sits in the
  title row and the meta line holds username, email and phone; (f) UX-7: the vi message uses a neutral greeting (no full name, no "em"
  form; en adjusted to match) and the expiry reads "10:25, 23/10/2026" style (design-system §7) in both languages; (g) UX-8: "Copied"
  causes no layout shift (label/icon swap inside the button, announcement visually hidden); (h) UX-9: the header quick links carry
  `aria-hidden` Phone/Mail/Link icons and `DescriptionList` values align with their terms at 768; (i) UX-10: handle rows stack the label
  above the value consistently at 360; (j) QA-2, SEC S4-1: `contactHref` refuses an https URL with a username or password
  (`https://zalo.me@evil.example/`, `https://user:pw@evil.example/`); (k) QA-3, SEC S4-2: the email check also refuses `:`, `/`, `<`, `>`,
  `"`, `\` and requires a dot in the domain; (l) SEC S4-3: the unsaved changes guard also lets a forced redirect to `/change-password`
  through (the auth reaction marks its navigation, e.g. router state), while the user's own "Change password" link still asks; (m) SEC
  S4-4: the credentials card is dropped on `pagehide`, so a back/forward-cache restore never shows the password; (n) UX-5:
  `responsive-standards.md` §1 and §3.3 describe the 768 px viewport switch for `DataList` (DEC-120) and the container query as the target
  for a narrower column; (o) UX ruling (a): `steps-f2.json` lists the named steps. (p) QA-R2-1 (S3, G3 round 2, DEC-122): at 768 and 1280 the
  table keeps usernames of up to 20 characters on one line (no mid-word break; the Username column has a minimum width or `nowrap`) and
  its header on one line, with no horizontal scroll. (q) UX-11 (S2, UX round 2, DEC-122; supersedes the (p) minimum width): the
  table has no Username column; the Name cell shows `@username` as a muted second line (the narrow list's meta line drops the username,
  which the title row now carries), and the `--size-column-id` minimum is removed, so at 768 a three-word Vietnamese name and a
  20-character email each take at most 2 lines and a 20-character username stays on one line (E2E line counts at 768 and 1280); (r) UX-12:
  the pager position ("Trang 1 / 133", "Page 1 of 133") never breaks inside the number group (non-breaking spaces). Tests for each; existing assertions change only where
  these items change copy, layout or a step record.

## Test plan
- Implementation: unit (`contactHref` table; list param parsing and fallbacks; username suggestion/availability race; the copy-message
  builder in vi/en), component tests with MSW (list states and controls, add form errors and focus, credentials card copy success/failure,
  workspace states, each new `ui/` component), E2E `students.spec.ts` (AC2, AC3, AC5–AC9 at phone-small, tablet, laptop), axe.
- Independent QA focus: search with Vietnamese diacritics and special characters (`%`, `_`, quotes); paging edges (exactly 25, 26, 50);
  Back/forward through list states; the add flow with slow and failing suggestion/availability endpoints; a username taken in another tab
  between check and Create; a double Create; leaving the form dirty via nav, Back, tab close and a sign-out (own and cross-tab); credentials card copy on a browser that refuses
  the clipboard; Back after the card; cross-tab sign-out while the card is open (the card must disappear with the page); contact values
  that try other schemes; 360 px with long Vietnamese names; vi/en. Exploratory charter: find a way to see a temporary password again after
  leaving the card, or to make a student value produce a link to anything but `tel:`, `mailto:` or `https:`.
- SEC: **triggered** (student personal data on screen, the one-time temporary password, contact links from student data, DEC-100 S4-8).
  UX: **triggered** (new list, form, card and workspace pages; new `ui/` components; F2 step budget).

## Evidence required
- `evidence/T-M2.5/summary.md`, gate logs (both runs), screenshots under `evidence/T-M2.5/impl/` at 360×740, 768×1024 and 1280×800: the list
  (populated, first use, filtered empty), the add form (empty, with suggestion/availability, with errors), the credentials card, the workspace
  page (with contact links), in vi and en at least once each; `/dev/ui` new components; axe results; the F2 step log and its wall time.
  QA report via `qa/T-M2.5`; UX and SEC verdicts as PR records (reviewer evidence never on the feature branch).

## Docs to update
- `design-system.md` §3 (implemented notes for the new components) and §4 (student statuses), `information-architecture.md` §1 (Students item
  implemented) and §2 (M2: Profile view at the index, no tab bar until a second tab; then Profile at `/profile` and the Overview at the index,
  whose first content arrives with M3, DEC-120 (3), (8)), `interaction-states.md` §2.5 (the credentials card is the create success feedback,
  DEC-120 (7)), `frontend-architecture.md` §1 (the students feature),
  `ux-flows.md` F2 (implemented; no guardian section until T-M2.14), `security.md` (T12: the card keeps the password in component state only;
  contact links through `contactHref`, DEC-100), backlog (T-M2.5 done note), `progress.json`.

## Risks & assumptions
- **Split line** (within this task): if AC1–AC9 are not green by about 2 agent-days, first the `/dev/ui` polish beyond basic states, then the `Newest`
  sort, then the keyboard-only F2 proof beyond axe move to T-M2.14 by a DEC; the credentials hygiene (AC7) and the contact allow-list (AC8) never move.
- `navigator.clipboard` needs a secure context: `localhost` and HTTPS production qualify; the manual-copy fallback covers refusals.
- Paging is 25 per page from the API's page envelope; A-001 caps a workspace at ≤ 200 student accounts, so no virtualisation.
- E2E signs in as `e2e-tutor` (`.data/e2e/`) and adds students with unique names; the dev database keeps them (dev data; never purge without
  asking the PO).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.5 ./scripts/gate.sh && ENGLMS_TASK=T-M2.5 ./scripts/gate.sh
git checkout -- evidence/T-M2.5   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.5-students-list-add
```
