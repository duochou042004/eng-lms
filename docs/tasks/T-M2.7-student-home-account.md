# T-M2.7: Student Home v0, the student Account page, the M2 S4s and the M2 milestone gate (FR-DASH-03 shell, FR-SET-02, G5)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | in_progress (G0: part A PASS, DEC-204; parts B–D delta PASS WITH MINOR, S3/S4 fixed, confirmed PASS, DEC-205; PO start signal 2026-11-26) |
| Owner role | BE (part A endpoint + part B) then FE (part A UI + part C); then QA (part D regression report); one checkout-using agent at a time (coding-agent-rules §11) |
| Branch | `feature/T-M2.7-student-home-account` (from `develop`) |
| Depends on | T-M2.3, T-M2.6, T-M2.11, T-M2.32, T-M2.33 (all merged) |
| Estimate | ≤ 3 agent-days (BE ≤ 0.75, FE ≤ 1.75, QA ≤ 0.5); over the size rule by the PO's decision (DEC-205) |
| Risk tier | **H**: the first handler under `/api/v1/student/**` (`..web.student..`, a new endpoint) and part B's sign-in credential logging (quality-gates G3) → **one SEC** agent for parts A and B, plus **one QA** with the UX checklist for parts A–C and the part D regression report (no new shared `ui/` primitive) |
| Trace | SPEC §4.3 (student: login, logout, change password), §26 (Student Dashboard: "Good evening, <name>", own data only); FR-DASH-03 (M2: shell); FR-SET-02 (student: language, time zone, change password); FR-STU-03 (a student's name is the tutor's `fullName`); api-catalog `GET /student/home` (M2+), `GET /student/account` (M2); information-architecture §3 (Home; More › Account `/student/account`, "joins with T-M2.7"); ADR-0016 (student isolation); DEC-112 (shell items only for routes that exist), DEC-190 (account preferences, no version), DEC-204 (part A decisions), DEC-205 (consolidation); part B: DEC-186, DEC-201 (3), DEC-202 S4-1; part C: DEC-148 QA-2, DEC-197 (4), DEC-198 QA-2, DEC-202 S4-3; part D: quality-gates G5, DEC-111, DEC-158 PO-3, DEC-180, DEC-198 QA-1; lessons L-02, L-03, L-04, L-05, L-09, L-10, L-12 |

## Goal
A signed-in student lands on a Home page that greets them by name in their language, time-of-day aware in their account's time zone, and
can open an **Account** page (from More below 768 px, from the account menu at ≥ 768 px) that shows their name and username and lets them
set their language and time zone and reach Change password. The name comes from the first student-audience endpoint,
`GET /api/v1/student/account`, built to ADR-0016 so the isolation harness runs on a real handler before M3 adds more.

**Consolidation (PO, DEC-205):** DEC-204 split the old row into four tasks; the PO merged them back into this one task and one feature PR,
to save the fixed cost of three more packets, reviews and record PRs. Part A is the feature (above); **part B** the backend S4s, **part C** the
web S4s, **part D** the M2 regression and milestone gate (G5), which closes M2. T-M2.26 moves to the new device (outside M2's exit criteria).

## Scope
- In (BE, `students`):
  1. `GET /api/v1/student/account`, `@Audience(STUDENT)`, in a new `com.englms.students.internal.web.student` package; the handler declares
     `CurrentStudent me` (unannotated) and takes no other parameter. 200 `{fullName, username}`: the student's `fullName` (stored form) and
     their account's username. A new audience DTO (`StudentAccountResponse`), not `StudentView` (which carries email, phone, status, notes).
     Behind the must-change gate (403 `PASSWORD_CHANGE_REQUIRED`), like every endpoint except the exempt ones. No body, no query parameter, no
     event, no audit entry. `Cache-Control: no-store` as every API response.
  2. Service: a read-only method in `StudentService` that loads the student by `me.studentId()` with its username (the `get` path). A student
     row that is missing is impossible behind `CurrentStudentResolver` (it ends the session with 401 `SESSION_EXPIRED`); the method still
     throws the module's not-found problem (404) rather than returning `null`.
  3. Authz matrix entry (`PolicyRegistry`: anonymous 401, tutor 403, student 200, must-change student 403; `studentBOnA` `NA`, the path names
     no resource), the student-isolation harness (the response secret scan over the fixture world, which holds `SECRET-*` markers in the
     learning profile, contacts and guardians), ArchUnit rules 3 and 4 pass on the real handler. api-catalog row marked **Live**; the OpenAPI
     contract regenerated (`api/openapi.json`, `web/src/lib/api/schema.d.ts`).
- In (FE):
  4. **Home v0** (`/student/home`, replaces the placeholder `StudentHome` in `StudentShell.tsx:66-76`): the page `h1` stays **Home** /
     **Trang chủ** (kept assertions read it, Design notes); under it a greeting line: "Chào buổi sáng, {fullName}" / "Good morning, {fullName}"
     (afternoon, evening as in UI rules), the time of day computed from the current instant in the **session's `timeZone`** (not the
     browser's). While `GET /student/account` loads, or when it fails, the greeting shows without the name ("Chào buổi sáng!" / "Good
     morning!"): the name is decorative on Home, so no alert there. Below it the existing empty state stays (its copy unchanged): Goals, To do,
     Next lesson and Recent results arrive with M7, M5 and M3 (out of scope).
  5. **Account page** (`/student/account`, a new child route of the student shell, lazy): page header "Tài khoản" / "Account"; a read-only
     block with **Name** and **Username** from `GET /student/account` (loading: a skeleton of the two rows; failure: an `InlineAlert` with
     Retry in that block, the rest of the page works); then the **Language** row (the existing `LanguageSwitcher`, as on the tutor's Account
     tab) and a form with **Time zone** (`ui/ComboBox`, `timeZoneOptions`) and **Save**, which behaves exactly as the tutor's Account tab
     without Display name (changed-only body, Save disabled while unchanged, 422 → `ErrorSummary` + field, other errors → `InlineAlert`,
     `UnsavedChangesGuard`, `networkMode: 'always'`, `keepDirtyValues`; DEC-191); then a **Change password** link to `/change-password`.
     Reuse: the tutor's `AccountForm` (today private in `app/routes/settings/AccountSettingsPage.tsx:61`) and `accountForm.ts` **move to a
     shared module** (e.g. `app/routes/account/AccountForm.tsx` + `accountForm.ts`) that both pages import, with Display name left out for a
     student session (one form, a role-driven field list), not a copy: a student route must never import the tutor settings module
     (`router.tsx:15`, "a student never downloads tutor code", NFR-PERF-03; G0 S4-1). No new `ui/` component.
  6. **Shell entry:** `AccountSection` (`ShellParts.tsx:57`) gets an **Account** link (`/student/account`, icon `CircleUser`) above Change
     password, for a **student session only** (the tutor reaches Settings › Account from the tutor nav, unchanged); it closes the sheet or
     popover on navigate (`onNavigate`). The bottom tabs and the top-bar items stay Home only (IA §3: Account lives in More).
  7. vi + en strings for every new text (`shell` namespace for the greeting and the link; the Account page in the `settings` namespace or a
     new `account` namespace registered with its lazy chunk); i18n completeness test.

- In (part B, BE, S4s):
  8. **B1 (DEC-202 S4-1, extends DEC-186 SEC S4-1):** a JSON scalar of the wrong type never puts the sent value into any log at any level: the
     mismatch message (Jackson's, carried by `HttpMessageNotReadableException` into `ProblemDetailsAdvice` and Spring's resolver logging) is
     logged without the value (redacted, or the value quoting turned off at the binding); the 400 `MALFORMED_REQUEST` body is unchanged.
  9. **B2:** `docs/07-operations/deployment.md` (a logging row in its configuration table) says production never runs `org.springframework.web` or the app loggers at DEBUG
     with request bodies.
  10. **B3 (DEC-201 (3)):** the workspace `displayName` `@Schema` description (`TutorSettingsController.java:95`) names the shared name rule
     (`shared.Names`: no `Cc`/`Cf`/`Cs`/`Zl`/`Zp` code point, ends stripped, 1–120) instead of the T-M2.35 classes; the contract regenerated.
- In (part C, FE, S4s):
  11. **C1 (DEC-148 QA-2):** `ui/TagInput` clears its entry error on every submit of the form, not only when the caller's `errorMessage`
     changes (a submit signal from the form, e.g. a `submitCount` prop or key), so a second failed Save with the identical message shows the
     current state.
  12. **C2 (DEC-197 (4)):** `DevUiPage.test.tsx:14`'s first read (the `findByRole` of the gallery heading) of the lazy chunk polls with a longer bound (e.g. `findByRole(..., { timeout: 5000 })`;
     no wall-clock assertion, L-05).
  13. **C3 (DEC-198 QA-2):** the vi ComboBox no-match count reads "Không có lựa chọn nào." (`ui/ariaStrings.ts`), en unchanged.
  14. **C4 (DEC-202 S4-3):** `workspaceForm.ts` compares the stripped value with the stripped saved name (as `accountForm.ts`).
- In (part D, the M2 milestone gate, quality-gates G5):
  15. **D1:** one `regression` workflow run (`gh workflow run regression.yml --ref feature/T-M2.7-student-home-account`, 6 Chromium viewports
     + WebKit smoke, no Firefox, DEC-180) on the final head after the gate and CI, **cap 1, PO approval before the run**; the branch then holds
     all of M2. A failure is ruled by the LC (an AC + fix for S1/S2, L-10); a second run needs a new PO approval. One local
     `E2E_KEEP_DB=1` run against the PO's dev data set (development-setup §2) by QA.
  16. **D2:** QA's M2 milestone report `evidence/M2/qa/report.md` (from the run's report and the local run; the DEC-198 QA-1 watch item: the
     laptop account-popover focus after Esc when axe ran while open, observed and counted), on the `qa/T-M2.7` PR with the task's QA report.
  17. **D3 (`qa/`, QA-owned, on `qa/T-M2.7`):** the `qa/` specs listed in `evidence/T-M2.4/qa/report.md` (round 1): sign in first for the anonymous
     `/` and the shells; `M1.spec.ts:256` expects 401 for an unknown API path (T-M2.4 QA, DEC-111); `qa/README.md:25`'s
     "milestone regression" label for `QA_ENGINES=all` (DEC-180).
  18. **D4 (LC, the records PR after the merge):** `evidence/M2/retro.md` (risk register, decision log and roadmap reviewed), lessons-learned
     updated, the `shortcut:` ledger reviewed (a trigger M3 fires becomes a backlog row), the README roadmap row (M2 done), roadmap/progress
     milestone status; the PO demo (a recorded walkthrough or a live session) is the PO's acceptance step (G5).

## Out of scope (explicit)
- `GET /student/home` and the Home sections Goals (M7), To do (M5), Next lesson (M3), Recent results (M5): each with its milestone; the
  api-catalog `/student/home` row stays M2+ unbuilt (the greeting reads `/student/account`, DEC-204 (2)).
- Showing the student's full name in the account menu or the "Signed in as" line (they keep `displayName ?? username`): a later row if the
  PO wants it.
- A student editing their own name or username (FR-STU-03: the tutor's data); an avatar; notifications; Forgot password (SPEC §4.3 "later").
- T-M2.26 (CI scope on): on the new device, after M2 (PO, DEC-205). Other unbuilt M2 items: none (backlog M2 table).
- A second regression run without a new PO approval; Firefox (DEC-180).

## Guardrail answers (scope.md §6)
1. Trace: FR-DASH-03 (M2 shell), FR-SET-02, SPEC §26, §4.3, api-catalog `/student/account`. 2. Drift toward excluded scope: no (no profile,
chat or social features; the student sees only their own name and username). 3. Mandatory set-up: none (the name exists from student
creation). 4. Weekly use: every student sign-in lands on Home. 5. Hard-coded semantics: none (the greeting uses the full name as stored; no
name parsing, no goal or exam wording).

## Design notes
- **BE placement:** `students/internal/web/student/StudentAccountController` (the only `..web.student..` package so far; reference
  `fixture/harness/web/student/HarnessStudentHandlers#item`, authz-isolation skill); `StudentService.account(UUID studentId)` returning the
  view from `get`'s path; the DTO a record with only the two fields. No new module dependency (`students` already reads usernames through
  `AccountApi`).
- **Contradiction scan (L-03):**
  - Kept E2E and unit tests read the student Home `h1` "Trang chủ" (`shells.spec.ts` `COPY.studentHome`, `auth.spec.ts:465` `STUDENT_HOME`,
    `app.test.tsx:23,33`, `ChangePasswordPage.test.tsx:125,260-263`, `navigation.spec.ts`): the `h1` stays, so they hold. The greeting is a
    paragraph, not a heading.
  - Kept assertions on the account section (`shells.spec.ts:290-300` AC4: signed-in line, switcher, Change password, Log out "the same visual
    kind"): the new link is one more item in that set; the "same visual kind" comparison extends to it (the implementer adds it to the
    compared list, not a changed assertion). `shells.spec.ts:1055` (568×320 sheet, all content reachable): must stay green with the extra
    link (the sheet scrolls).
  - `shells.test.tsx`/`RouteLoading.test.tsx` shell skeletons for `/student/*`: unchanged (no new nav item).
  - The tutor's Account tab tests (`AccountSettingsPage.test.tsx`, `settings-account.spec.ts`): unchanged behaviour for the tutor; the
    role-driven field list must keep every tutor assertion green. `AccountSettingsPage.test.tsx:418` (a student never reaches
    `/tutor/settings`) stays.
  - ADR-0016 / security.md §2 and §4: owner-scoped by `CurrentStudent`, no `studentId` anywhere; the DTO exposes no tutor-private field.
  - interaction-states §1 (loading, error with retry for the Account page's name block), §3 (form errors), §4 (no error toasts): kept.
  - **Unit-test infrastructure (G0 S3-1):** `web/src/test/setup.ts:17` runs MSW with `onUnhandledRequest: 'error'` and the default `handlers`
    (`web/src/test/server.ts:57-61`) hold only session, meta and preferences, so every kept unit test that renders `/student/home`
    (`app.test.tsx:23,33`, `ChangePasswordPage.test.tsx:125,260-263`, the student cases of `shells.test.tsx`, `guards.test.tsx`,
    `routeAnnouncement.test.tsx`) would now make an unhandled request. The implementer adds a default `GET */api/v1/student/account`
    handler to `server.ts` `handlers` (a `studentAccountAs(...)` helper; test infrastructure only, no kept assertion changes).
  - **Kept E2E that fail or cut the network on student Home** (`navigation.spec.ts:211-260` offline and chunk-failure cases, the
    `shells.spec.ts` logout-failure cases): the new read must add no console entry they do not accept. Offline, TanStack queries pause (no
    request, no error); a failed read shows the name-less greeting without `console.error` (AC4). The implementer greps `e2e/tests` for
    `route(`/`setOffline` on student pages and lists the specs run.
- **E2E data hygiene:** the shared student's preferences are answered in place by the shared fixture (T-M2.6, DEC-190 (4)); a real time-zone
  save runs on a fresh student (`e2e/support/students.ts`). The greeting's time of day is tested with a fixed clock (Playwright
  `page.clock.setFixedTime`, Vitest fake timers), never the wall clock.
- **Shortcut ledger** (task-packet step 0): no marker in the touched areas fires (`ShellParts.tsx`, `StudentShell.tsx`, `settings/*` hold
  none; `students/internal/domain/UsernameSuggestions.java:29` has one `ponytail:` marker (username candidates), trigger not fired here;
  `ui/ariaStrings.ts`'s marker is about React Aria strings, untouched). Any new one uses the `shortcut:` form.
- **A new check that finds a real defect outside this scope** (L-10): the implementer reports it at once as an OQ, uses `test.fail` only until
  the LC rules, and the LC rules before G3.

## UI rules (fixed at G0, DEC-131 (2))
- Layout: one column at every breakpoint, content max width 40 rem (the Settings form width). Home: `h1`, then the greeting (body text, one
  paragraph), then the empty state. Account: header, the Name/Username block (a description list: label above value below 768 px, two columns
  30 % / 70 % at ≥ 768 px), Language row, the Time zone form, the Change password link.
- Breaks: the full name breaks at spaces, one long word with `overflow-wrap: anywhere`; the username never breaks inside (it has no spaces;
  ellipsis is **not** used: it wraps with `overflow-wrap: anywhere` as a last resort at 360 px for a 50-character username); the greeting wraps
  as text. Use the T-M2.19 helpers (`longData`, `expectNoMidWordBreak` for the name, no horizontal scroll).
- Time-of-day bands (in the session's `timeZone`): 04:00–11:59 morning ("Chào buổi sáng" / "Good morning"), 12:00–17:59 afternoon ("Chào
  buổi chiều" / "Good afternoon"), 18:00–03:59 evening ("Chào buổi tối" / "Good evening"). Computed once per render of the page (no live
  timer).
- Focus: route focus on the page `h1` (route-focus rules); after Save success focus stays on Save; after a 422 on the `ErrorSummary`; after
  Retry in the name block, focus stays on the block's region (the Retry button is replaced by the content: focus moves to the block's
  heading-less container with `tabIndex={-1}`, never to `<body>`); the Account link closes the sheet/popover and the route focus takes over.
- Layering: the ComboBox popover as on the tutor tab (`ui/modalStack.ts`); toasts under it.
- Validation: time zone as validation-rules "account" (an option of the list or the current value); no other field.
- Copy (vi): page "Tài khoản"; labels "Họ tên", "Tên đăng nhập" (the app's existing terms, `students.json`), "Múi giờ"; button **Lưu**, toast "Đã lưu"; link "Đổi mật khẩu" (the
  existing key); the account section link "Tài khoản"; the name block's failure "Không tải được thông tin tài khoản." with **Thử lại**.
  Non-breaking space rules as today.
- Viewports 360 / 768 / 1280 (and the gate's six projects); WCAG 2.2 AA (target size ≥ 24 px, focus visible, the description list's
  semantics, the greeting not announced as a heading).

## Domain rules (fixed at G0, L-04)
- This packet writes no new data: `GET /student/account` is read-only; the Account page writes only through the existing
  `PATCH /auth/preferences` (its rules unchanged, DEC-190: no version, last write wins per property; a student's `displayName` → 422).
- Invariants: the response's `fullName` and `username` belong to the caller's own student row and account (`CurrentStudent`); nothing else is
  ever returned. Audience: the new DTO only; `@TutorPrivate` fields and contacts never appear (secret scan).
- Transitions: none. States of the caller: ACTIVE and PAUSED students sign in and get 200 (PAUSED can sign in today, T-M2.3); ARCHIVED cannot
  sign in (401 at login; a live session ends at the next request through `AccountStatusFilter`); must-change → 403.
- Concurrency: a tutor renaming the student while the page is open: the student sees the new name on the next read (window focus refetch,
  TanStack defaults); no version on this read.
- Time: the greeting's band is computed in the session's `timeZone` from an injected or faked clock in tests.
- Tests: one table-driven API test over the caller kinds (anonymous, tutor, active student, paused student, must-change student, archived
  student's stale session) and their answers.

## Acceptance criteria
- AC1 (FR-SET-02, ADR-0016): `GET /api/v1/student/account` as a student returns 200 `{fullName, username}` of that student only (two students
  in one test: each sees their own); the table of Domain rules (anonymous 401, tutor 403, must-change 403 `PASSWORD_CHANGE_REQUIRED`, PAUSED
  200, an archived student's old session 401) passes; the body has exactly these two properties.
- AC2 (ADR-0016): the authz matrix and isolation harnesses cover the endpoint (a `PolicyRegistry` entry; the secret scan finds no `SECRET-*`
  marker in the response); the handler lives in `..web.student..`, declares only `CurrentStudent`, and ArchUnit rules 3 and 4 and the startup
  verifier pass; removing the `PolicyRegistry` entry fails `AuthzMatrixTest` (L-01: shown red once, in the summary).
- AC3 (FR-DASH-03): on `/student/home` the `h1` reads Home / Trang chủ and the greeting shows the student's full name with the band of the
  current time in the session's zone: a unit test over the band edges (03:59, 04:00, 11:59, 12:00, 17:59, 18:00) in two zones, and one E2E
  with a fixed clock where the same instant greets "buổi sáng" for `Asia/Ho_Chi_Minh` and "buổi tối" for `America/Los_Angeles` (fresh
  students); vi and en.
- AC4: while `/student/account` is pending and when it fails (500, offline), Home shows the greeting without a name and no alert, the empty
  state stays, and the console guard stays clean (no `console.error` from the product).
- AC5 (IA §3): the account section shows an **Account** link for a student only (More sheet below 768 px, account popover at ≥ 768 px),
  which closes the overlay and opens `/student/account` with route focus on its `h1`; the tutor's account section has no such link; the
  student nav items stay Home (and More).
- AC6 (FR-SET-02): the Account page shows Name and Username from the endpoint (a skeleton while loading; a failed read shows the block's
  `InlineAlert` with Retry, the rest of the page usable, Retry recovers and focus never lands on `<body>`), the Language row (the switcher),
  Time zone with Save (changed-only body verified on the request; Save disabled while unchanged; 422 → `ErrorSummary` with focus; a failed
  save → `InlineAlert`; the unsaved-changes guard on leave), and Change password leading to `/change-password`; no Display name field for a
  student.
- AC7: the tutor's Settings › Account tab is unchanged (every kept `AccountSettingsPage.test.tsx` and `settings-account.spec.ts` assertion
  passes untouched).
- AC8: a real time-zone save on a fresh student persists (`GET /auth/session` shows it) and the Home greeting follows the new zone on the
  next visit.
- AC9: viewports 360/768/1280 for Home and Account (default, name-block error, ComboBox open, a 120-character name and a 50-character
  username: no horizontal scroll, no mid-word break of the name); axe clean (the recorded open-list exception only, DEC-191); vi + en
  complete.
- AC9a (ux-flows step budgets): Account is reached in ≤ 2 steps from any student page (More or the account menu → Account) at 360, 768
  and 1280 (a step log in the E2E); F0 Log out (≤ 2) and the language switch (≤ 2) are unchanged by the extra link (`shells.spec.ts`
  step records stay green).
- AC11 (part B, B1): with DEBUG on for `org.springframework.web` and `com.englms` in a test, `POST /auth/login` with `"password": 987654321`
  (and a number for `username`, and a boolean for a workspace `displayName`) answers the unchanged 400 and the captured log output contains
  neither value; the test fails on the code before the fix (L-01, shown red in the summary). B2 and B3 (the description and the regenerated
  contract; contract-drift green).
- AC12 (part C): C1 a component test: two failed Saves with the identical form message after a re-committed refused entry → the entry error
  is cleared on the second submit; C2 the bound is polling (no other change to the test); C3 a unit test reads the vi no-match string; C4 a
  unit test: the server's saved name " Lan " (stored before the strip rule) with the field "Lan": no change, Save disabled.
- AC13 (part D): the one regression run is green, or each failure is ruled before G3 ends (DEC); `evidence/M2/qa/report.md` holds the run ID,
  the counts per project, the local `E2E_KEEP_DB=1` result and the DEC-198 QA-1 count; the D3 `qa/` changes run (`QA_ENGINES` default);
  D4's records are in the records PR (check-docs green, the README roadmap row says M2 done).
- AC10: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept (the one extension in Design notes is
  listed in the summary).

## Test plan
- BE: a new `StudentAccountApiTest` (the Domain-rules table, two students, exact body properties); `PolicyRegistry` entry, `AuthzMatrixTest`,
  `IsolationTest`, `HarnessDetectionTest`, `StudentIsolationRulesTest` green; contract regenerated (contract-drift).
- FE unit/component: the greeting band helper (edges, two zones, injected `now`); `StudentHome` (pending, failure, name); the Account page
  (load, skeleton, block error and Retry focus, Save changed-only, 422, failed save, guard, no Display name for a student); `AccountSection`
  link for student only; the tutor tab's tests unchanged; i18n completeness.
- E2E: a new `student-home-account.spec.ts` (fresh students; serial where it saves): AC3 with `page.clock`, AC4 (route-answered 500 and offline),
  AC5 in the sheet and the popover, AC6, AC8, AC9 helpers; the extended `shells.spec.ts` AC4 set.
- **Independent QA focus:** a second student's session never shows the first one's name (two contexts); a tutor rename while the student's
  Account page is open (refetch on focus); a must-change student and an archived student's stale session against the endpoint over HTTP; the
  band around 04:00/12:00/18:00 in a zone far from the browser's; long Vietnamese names with diacritics at 360 px; keyboard-only use of the
  sheet → Account → ComboBox → Save; vi and en.
- **QA part D:** read the regression run's report (the LC hands over the run ID); run the local `E2E_KEEP_DB=1` suite once; no repeat run.
- **SEC focus (part B):** no sent value of a mismatched scalar in any log line at any level; the 400 body unchanged; no new logger at DEBUG in
  the default configuration.
- **SEC focus:** owner scoping by `CurrentStudent` only (no ID in path, query, header, cookie or body); the DTO exposes only the two fields;
  the must-change gate; the response secret scan; the handler package and the startup verifier; no new log of personal data; `no-store`.

## Evidence required
- `evidence/T-M2.7/summary.md`: AC → proof table, the self-check list, the AC2 red run, the extended kept assertion, the G3 cost table.
- One gate log on the final head (trimmed ≤ 300 lines, every `gate:` line), green CI.
- Local screenshots (not committed, DEC-131): `impl/<viewport>-student-{home,account,account-error,account-combobox}.png` at phone-small,
  tablet, laptop.
- G3 reviews (tier H): `evidence/T-M2.7/review/security.md` (SEC agent, parts A and B), `evidence/T-M2.7/qa/report.md` (QA with the UX
  checklist, parts A–C) and `evidence/M2/qa/report.md` (part D), both on `qa/T-M2.7`.
- G5: the regression run ID and result in the summary; `evidence/M2/retro.md` and the other D4 records in the records PR.
- PRs: the feature PR, `qa/T-M2.7`, the records PR (three; no separate packet PRs for B–D).

## Docs to update
- `docs/04-backend/api-catalog.md` (`GET /student/account`: body, answers, **Live**), `docs/04-backend/security.md` (§2/§4 as built: the
  first `..web.student..` handler), `docs/03-architecture/module-boundaries.md` (students: the student web package).
- `docs/05-frontend/information-architecture.md` §3 (Home v0 and Account as built), `docs/05-frontend/frontend-architecture.md` (the
  Account page and the shared form), `docs/02-requirements/traceability-matrix.md` row 26 (M2 part built).

- Part B: `docs/07-operations/deployment.md` (the logging row), the contract (`api/openapi.json`, `web/src/lib/api/schema.d.ts`). Part D: README
  roadmap row, `docs/01-product/roadmap.md` M2 status, `docs/09-harness/lessons-learned.md`, `docs/10-governance/risk-register.md`.

## Risks & assumptions
- Risk: the first real student handler finds a gap in the harness (verifier, ArchUnit, scan). Mitigation: L-10 path; the LC rules before
  G3; the harness fix is in scope only when it is needed for this handler.
- Risk: reusing the tutor form breaks a kept tutor assertion. Mitigation: AC7.
- Assumption: PAUSED students keep signing in (T-M2.3 status lifecycle); only ARCHIVED disables sign-in.
- Risk: the one regression run fails on something unrelated (the first run in T-M2.28 failed 7 tests). Mitigation: the LC rules each failure
  (L-10); a second run only with the PO's approval (cap 1).
- Risk: the task's size (14 ACs, 18 scope items). Mitigation: one BE and one FE implementer, each resumed for its fix rounds instead of fresh agents; one
  SEC and one QA (coding-agent-rules §11).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dtest='StudentAccountApiTest,AuthzMatrixTest,IsolationTest,HarnessDetectionTest,StudentIsolationRulesTest')
cd web && pnpm test --run && cd ..
./scripts/contract-drift.sh
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop tests/student-home-account.spec.ts
./scripts/gate.sh
# part D, only after the PO approves the one run:
gh workflow run regression.yml --ref feature/T-M2.7-student-home-account
```

## Status transitions (mirrored in progress.json)
draft → ready (G0 PASS) → in_progress (PO start signal) → in_review → qa → awaiting_approval → done.
