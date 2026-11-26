# T-M2.7: Student Home v0 and the student Account page (FR-DASH-03 shell, FR-SET-02)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready (G0: DEC-204) |
| Owner role | BE (`GET /student/account`) then FE (Home, Account page, shell entry); one implementer at a time |
| Branch | `feature/T-M2.7-student-home-account` (from `develop`) |
| Depends on | T-M2.3, T-M2.6, T-M2.11, T-M2.32, T-M2.33 (all merged) |
| Estimate | ≤ 2 agent-days (BE ≤ 0.5, FE ≤ 1.5) |
| Risk tier | **H**: the first handler under `/api/v1/student/**` (`..web.student..`, a new endpoint; quality-gates G3) → **SEC** as its own agent, plus QA with the UX checklist in the same pass (no new shared `ui/` primitive, so UX is not split out) |
| Trace | SPEC §4.3 (student: login, logout, change password), §26 (Student Dashboard: "Good evening, <name>", own data only); FR-DASH-03 (M2: shell); FR-SET-02 (student: language, time zone, change password); FR-STU-03 (a student's name is the tutor's `fullName`); api-catalog `GET /student/home` (M2+), `GET /student/account` (M2); information-architecture §3 (Home; More › Account `/student/account`, "joins with T-M2.7"); ADR-0016 (student isolation); DEC-112 (shell items only for routes that exist), DEC-190 (account preferences, no version), DEC-204 (the split and these packet decisions); lessons L-02, L-03, L-04, L-05, L-10 |

## Goal
A signed-in student lands on a Home page that greets them by name in their language, time-of-day aware in their account's time zone, and
can open an **Account** page (from More below 768 px, from the account menu at ≥ 768 px) that shows their name and username and lets them
set their language and time zone and reach Change password. The name comes from the first student-audience endpoint,
`GET /api/v1/student/account`, built to ADR-0016 so the isolation harness runs on a real handler before M3 adds more.

**Split (task-packet step 7, DEC-204):** the old T-M2.7 row bundled this feature, the M2 regression and milestone gate, and about seven S4s.
This packet is the feature only. The backend S4s are **T-M2.36** (tier H), the web S4s **T-M2.37** (tier M), the regression and G5 **T-M2.38**
(the one regression run, after T-M2.36 and T-M2.37). No regression run here (cap 0).

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
     Reuse: the tutor's `AccountForm` and `accountForm.ts` with Display name left out for a student session (one form, a role-driven field
     list), not a copy. No new `ui/` component.
  6. **Shell entry:** `AccountSection` (`ShellParts.tsx:57`) gets an **Account** link (`/student/account`, icon `CircleUser`) above Change
     password, for a **student session only** (the tutor reaches Settings › Account from the tutor nav, unchanged); it closes the sheet or
     popover on navigate (`onNavigate`). The bottom tabs and the top-bar items stay Home only (IA §3: Account lives in More).
  7. vi + en strings for every new text (`shell` namespace for the greeting and the link; the Account page in the `settings` namespace or a
     new `account` namespace registered with its lazy chunk); i18n completeness test.

## Out of scope (explicit)
- `GET /student/home` and the Home sections Goals (M7), To do (M5), Next lesson (M3), Recent results (M5): each with its milestone; the
  api-catalog `/student/home` row stays M2+ unbuilt (the greeting reads `/student/account`, DEC-204 (2)).
- Showing the student's full name in the account menu or the "Signed in as" line (they keep `displayName ?? username`): a later row if the
  PO wants it.
- A student editing their own name or username (FR-STU-03: the tutor's data); an avatar; notifications; Forgot password (SPEC §4.3 "later").
- The S4s of the old row (T-M2.36, T-M2.37), the regression and G5 records (T-M2.38), the `qa/` spec updates (T-M2.38).

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
- **E2E data hygiene:** the shared student's preferences are answered in place by the shared fixture (T-M2.6, DEC-190 (4)); a real time-zone
  save runs on a fresh student (`e2e/support/students.ts`). The greeting's time of day is tested with a fixed clock (Playwright
  `page.clock.setFixedTime`, Vitest fake timers), never the wall clock.
- **Shortcut ledger** (task-packet step 0): no marker in the touched areas fires (`ShellParts.tsx`, `StudentShell.tsx`, `settings/*`,
  `students/internal/*` hold none; `ui/ariaStrings.ts`'s marker is about React Aria strings, untouched). Any new one uses the `shortcut:` form.
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
- Copy (vi): page "Tài khoản"; labels "Họ và tên", "Tên đăng nhập", "Múi giờ"; button **Lưu**, toast "Đã lưu"; link "Đổi mật khẩu" (the
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
- AC10: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept (the one extension in Design notes is
  listed in the summary).

## Test plan
- BE: a new `StudentAccountApiTest` (the Domain-rules table, two students, exact body properties); `PolicyRegistry` entry, `AuthzMatrixTest`,
  `IsolationTest`, `HarnessDetectionTest`, `StudentIsolationRulesTest` green; contract regenerated (contract-drift).
- FE unit/component: the greeting band helper (edges, two zones, injected `now`); `StudentHome` (pending, failure, name); the Account page
  (load, skeleton, block error and Retry focus, Save changed-only, 422, failed save, guard, no Display name for a student); `AccountSection`
  link for student only; the tutor tab's tests unchanged; i18n completeness.
- E2E: a new `student-account.spec.ts` (fresh students; serial where it saves): AC3 with `page.clock`, AC4 (route-answered 500 and offline),
  AC5 in the sheet and the popover, AC6, AC8, AC9 helpers; the extended `shells.spec.ts` AC4 set.
- **Independent QA focus:** a second student's session never shows the first one's name (two contexts); a tutor rename while the student's
  Account page is open (refetch on focus); a must-change student and an archived student's stale session against the endpoint over HTTP; the
  band around 04:00/12:00/18:00 in a zone far from the browser's; long Vietnamese names with diacritics at 360 px; keyboard-only use of the
  sheet → Account → ComboBox → Save; vi and en.
- **SEC focus:** owner scoping by `CurrentStudent` only (no ID in path, query, header, cookie or body); the DTO exposes only the two fields;
  the must-change gate; the response secret scan; the handler package and the startup verifier; no new log of personal data; `no-store`.

## Evidence required
- `evidence/T-M2.7/summary.md`: AC → proof table, the self-check list, the AC2 red run, the extended kept assertion, the G3 cost table.
- One gate log on the final head (trimmed ≤ 300 lines, every `gate:` line), green CI.
- Local screenshots (not committed, DEC-131): `impl/<viewport>-student-{home,account,account-error,account-combobox}.png` at phone-small,
  tablet, laptop.
- G3 reviews (tier H): `evidence/T-M2.7/review/security.md` (SEC agent), `evidence/T-M2.7/qa/report.md` (QA with the UX checklist; on
  `qa/T-M2.7`).

## Docs to update
- `docs/04-backend/api-catalog.md` (`GET /student/account`: body, answers, **Live**), `docs/04-backend/security.md` (§2/§4 as built: the
  first `..web.student..` handler), `docs/03-architecture/module-boundaries.md` (students: the student web package).
- `docs/05-frontend/information-architecture.md` §3 (Home v0 and Account as built), `docs/05-frontend/frontend-architecture.md` (the
  Account page and the shared form), `docs/02-requirements/traceability-matrix.md` row 26 (M2 part built).

## Risks & assumptions
- Risk: the first real student handler finds a gap in the harness (verifier, ArchUnit, scan). Mitigation: L-10 path; the LC rules before
  G3; the harness fix is in scope only when it is needed for this handler.
- Risk: reusing the tutor form breaks a kept tutor assertion. Mitigation: AC7.
- Assumption: PAUSED students keep signing in (T-M2.3 status lifecycle); only ARCHIVED disables sign-in.
- No regression run (cap 0; T-M2.38 holds the one G5 run, DEC-204).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dtest='StudentAccountApiTest,AuthzMatrixTest,IsolationTest,HarnessDetectionTest,StudentIsolationRulesTest')
cd web && pnpm test --run && cd ..
./scripts/contract-drift.sh
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop tests/student-account.spec.ts
./scripts/gate.sh
```

## Status transitions (mirrored in progress.json)
draft → ready (G0 PASS) → in_progress (PO start signal) → in_review → qa → awaiting_approval → done.
