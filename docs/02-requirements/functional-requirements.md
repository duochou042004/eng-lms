# Functional Requirements and Acceptance Criteria

> Status: Baseline v1.0. ID format `FR-<AREA>-<nn>`. **Phase** column: MVP / P2. **M** = milestone where it is delivered.
> Acceptance criteria (AC) are written to be directly testable. "T" = the tutor, "S" = a student, "S′" = another student.
> Global rules for every FR: (1) a student only ever sees their own data (NFR-SEC-01); (2) tutor-private data never reaches
> student APIs (NFR-SEC-02); (3) every list view has loading, empty, error and populated states (`interaction-states.md`);
> (4) validation rules are in `docs/04-backend/validation-rules.md`.

---

## AUTH — Authentication and accounts (module `identity`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-AUTH-01 | No public registration exists | MVP | M2 | SPEC §4.1 |
| FR-AUTH-02 | The tutor account is created once, at first run, from an operator secret; exactly one tutor exists | MVP | M2 | DEC-009 |
| FR-AUTH-03 | Log in with username + password | MVP | M2 | SPEC §4.3 |
| FR-AUTH-04 | Log out | MVP | M2 | SPEC §4.3 |
| FR-AUTH-05 | Change own password | MVP | M2 | SPEC §4.3 |
| FR-AUTH-06 | Forced password change on first login with a temporary password | MVP | M2 | SPEC §4.2 |
| FR-AUTH-07 | Tutor resets a student's password | MVP | M2 | DEC-008 |
| FR-AUTH-08 | A student who forgot their password is told to contact the tutor | MVP | M2 | SPEC §4.3, DEC-008 |
| FR-AUTH-09 | Operator can reset the tutor password (runbook) | MVP | M2 | DEC-008 |
| FR-AUTH-10 | A disabled account cannot log in, and its active sessions end | MVP | M2 | SPEC §37 |

**AC FR-AUTH-01**
- No UI route, link or API endpoint lets an unauthenticated user create an account. `/register`, `/signup` and `/api/v1/auth/register` return 404.
- The only account-creating endpoint is `POST /api/v1/tutor/students`, which requires the TUTOR role (the authz matrix proves it).

**AC FR-AUTH-02**
- Given an empty `user_account` table and `ENGLMS_BOOTSTRAP_TUTOR_USERNAME` + `ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE` set, startup creates one TUTOR with `mustChangePassword=true` and writes an audit event.
- When a tutor already exists, the bootstrap variables are ignored and startup logs one INFO line.
- A second TUTOR row is rejected by the database (partial unique index). An integration test proves this.

**AC FR-AUTH-03**
- The username is case-insensitive and trimmed. A wrong username and a wrong password give **the same** message and similar timing.
- After 10 consecutive failures, the account is locked for 15 minutes (configurable). The lockout message does not reveal whether the account exists. Per-IP throttling also applies (NFR-SEC-05).
- On success, the session ID is rotated. The user lands on `/tutor/today` or `/student/home` based on role, or on `/change-password` if `mustChangePassword`.
- "Keep me signed in" (optional checkbox) extends the session per A-021.

**AC FR-AUTH-04**
- Logout invalidates the server session, clears the cookies and redirects to `/login`. Pressing Back does not show protected data (responses are `Cache-Control: no-store`).

**AC FR-AUTH-05**
- The current password is required. The new password must satisfy the policy (NFR-SEC-06) and differ from the current one.
- On success, all **other** sessions of that user are invalidated and an audit event is recorded.

**AC FR-AUTH-06**
- While `mustChangePassword=true`, every API except `GET /auth/session`, `POST /auth/password`, `POST /auth/logout` and the public `GET /meta` (no user data; the SPA shell needs it, DEC-089) returns 403 with `code=PASSWORD_CHANGE_REQUIRED`, and the SPA routes to `/change-password`.

**AC FR-AUTH-07**
- T clicks "Reset password" on a student. A generated temporary password is shown **once**, with a copy button and a copyable message. S's sessions end. `mustChangePassword=true` is set. The temporary password expires after 7 days if unused (A-021).

**AC FR-AUTH-08**
- The login page has a "Forgot password?" disclosure: "Please contact your tutor to reset your password." It has no form and makes no network call.

**AC FR-AUTH-09**
- Running `runbooks.md#tutor-password-reset` against a running deployment sets a new temporary tutor password and records an audit event. No UI exposes this.

**AC FR-AUTH-10**
- When T archives S (or the account is disabled), S's next request returns 401, and login fails with the generic message.

---

## STU — Students (module `students`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-STU-01 | Create a student together with their account | MVP | M2 | SPEC §4.2, §46, §49 |
| FR-STU-02 | Student list with search, filters and key signals | MVP | M2 | SPEC §41, §55 |
| FR-STU-03 | Edit profile, contacts and guardians | MVP | M2 | SPEC §4.2, §5.6, §46 |
| FR-STU-04 | Learning profile (flexible) | MVP | M2 | SPEC §8 |
| FR-STU-05 | Student status lifecycle | MVP | M2 | SPEC §37, G-07 |
| FR-STU-06 | Student workspace shell (tutor) | MVP | M2 (tabs grow M3–M7) | SPEC §6, §7 |
| FR-STU-07 | Contact quick links | MVP | M2 | CONV §18 |
| FR-STU-08 | Permanent delete and export of student data | **OPTIONAL** | — | OQ-07 |

**AC FR-STU-01** (UX budget: ≤ 90 s, see `ux-flows.md` F2)
- Required fields: full name, username, password. The username is **suggested** from the name (accents removed, lowercase, unique suffix) and checked for availability as the tutor types. The password is **generated** (readable; ≥ 12 characters) and can be regenerated.
- Optional, in collapsed sections: email, phone, contact handles (Zalo, Facebook, other: label + value), guardians (name, relationship, phone, email, notes), a note, and a first goal (title + optional metric/baseline/target).
- On save, the system creates the UserAccount (`STUDENT`, `mustChangePassword=true`) and the Student in **one transaction**, then shows a **credentials card**: username, temporary password, login URL and a "Copy message" button that produces a ready-to-paste text in the UI language.
- The temporary password cannot be retrieved again later (it can only be reset).
- A duplicate username returns 409 `USERNAME_TAKEN` and the field shows an inline error.

**AC FR-STU-02**
- Lists ACTIVE and PAUSED students by default. The filter includes ARCHIVED. Search is accent-insensitive on name, username and contact values ("nguyen" matches "Nguyễn").
- Each row shows the name, status, next lesson (date and time), the count of open work items and an attention badge with the reason on hover or focus.
- Sort options: next lesson (default), name, recently active.
- At < 768 px, rows render as a list and there is no horizontal scroll.

**AC FR-STU-03**
- All fields from FR-STU-01 except the password are editable. Optimistic locking applies: a stale version returns 409 `STALE_VERSION`, and the UI offers "Reload".
- The username can be changed (the uniqueness check applies). S's sessions stay valid.

**AC FR-STU-04**
- Fields: current level (free text, e.g. "B1"), learning notes, strengths (tags), weaknesses (tags), and custom fields (an ordered list of label/value pairs, up to 30).
- No field is tied to an exam, and nothing TOEIC- or IELTS-specific exists in code (an ArchUnit/grep test checks for the forbidden identifiers listed in `coding-agent-rules.md`).
- Not visible to the student (A-008). A student API scan proves this.

**AC FR-STU-05**
- The statuses are ACTIVE, PAUSED (on break; login allowed; excluded from attention rules) and ARCHIVED (login disabled; hidden by default; data kept).
- Reactivating an ARCHIVED student re-enables login. `mustChangePassword` is unchanged.
- Each change writes an audit event.

**AC FR-STU-06**
- The header shows the name, status, next lesson (with a join link when online), quick actions (Schedule lesson · Assign work · Add note) and contact links.
- Tabs: Overview · Plan · Lessons · Work · Materials · Progress · Notes · Profile. A tab's content arrives in the milestone of its module; until then the tab is **not shown** (no dead tabs).
- An empty section explains what it is for and offers one primary action. Nothing is mandatory.

**AC FR-STU-07**
- Phone opens as `tel:`, email as `mailto:`. Zalo and Facebook handles open as links when they are URLs and are otherwise shown with a copy button. There is no in-app messaging.

---

## GOAL — Goals and metrics (module `goals`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-GOAL-01 | Tutor-defined metric definitions | MVP | M7 | SPEC §9, §25, ADR-0015 |
| FR-GOAL-02 | Goals per student | MVP | M7 (M2: first goal in create-student) | SPEC §9, §49 |
| FR-GOAL-03 | Record metric observations manually | MVP | M7 | SPEC §8, §25 |
| FR-GOAL-04 | Record an assessment result as an observation | MVP | M7 | SPEC §25 ("Mock Tests 550 → 585 → 610") |
| FR-GOAL-05 | Goal progress computation | MVP | M7 | SPEC §26 |

**AC FR-GOAL-01**
- Fields: name, unit (free text), value type `NUMBER` (optional min/max, decimals) or `SCALE` (min/max required, e.g. 0–10), direction (`HIGHER_IS_BETTER` by default, or `LOWER_IS_BETTER`), description. They can be archived but not deleted once in use.
- There are no seeded metrics. The empty state suggests examples as **text only** ("e.g. Test score 0–990, Speaking fluency 0–10").

**AC FR-GOAL-02**
- Fields: title (required), description, optional metric, baseline value, target value, target date, status (`ACTIVE`, `ACHIEVED`, `PAUSED`, `DROPPED`), `visibleToStudent` (default true), and manual order.
- A qualitative goal (no metric) has status only, and its progress is shown as a status badge.
- The baseline and target must fit the metric's range and direction (validation).

**AC FR-GOAL-03**
- Fields: metric, value (validated against the definition), observed date (default today), optional note, `visibleToStudent` (default true). Observations can be edited and deleted (audited).
- The student's metric history is a chronological list and a small trend line (≥ 2 points).

**AC FR-GOAL-04**
- An assessment activity can set `recordResultAs = {metricId, transform: RAW_SCORE | PERCENT}`. When the attempt result is **published**, an observation is created with `source=ACTIVITY_RESULT` and a link to the student activity. Unpublishing or a regrade updates it. This happens through an event, idempotently.

**AC FR-GOAL-05**
- For a metric goal: `progress = clamp((current − baseline) / (target − baseline), 0, 1)`, adjusted for direction, where `current` is the latest observation. Without a baseline, the first observation after goal creation is used. With no observation, the display is "No data yet".
- A goal is never auto-marked ACHIEVED. When `current` reaches the target, the UI suggests "Mark achieved".

---

## PLAN — Learning plans (module `plans`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-PLAN-01 | Create and manage plans per student | MVP | M7 | SPEC §10, §46 |
| FR-PLAN-02 | Phases: add, edit, delete, reorder, status, priority | MVP | M7 | SPEC §10 |
| FR-PLAN-03 | Items: add, edit, delete, reorder, move between phases, status, priority, links | MVP | M7 | SPEC §10, CONV §13 |
| FR-PLAN-04 | Pause, complete and archive a plan | MVP | M7 | SPEC §10 |
| FR-PLAN-05 | Linked items show live status | MVP | M7 | SPEC §15 |
| FR-PLAN-06 | Student views plan (read-only) | MVP | M7 | SPEC §47, §56 |
| FR-PLAN-07 | Plan templates | P2 | — | SPEC §11, §43, OQ-04 |

**AC FR-PLAN-01**
- A student may have 0..n plans. Fields: title, description, linked goals (0..n), status (`ACTIVE`, `PAUSED`, `COMPLETED`, `ARCHIVED`), `visibleToStudent` (default true).
- A plan can be created empty in ≤ 2 interactions from the Plan tab.

**AC FR-PLAN-02 / FR-PLAN-03**
- Phase statuses: `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED`, `PAUSED`, `SKIPPED`. Priority: `LOW`, `NORMAL`, `HIGH`. Optional target date.
- Item kinds: `MILESTONE`, `TASK` (free text), `LESSON` (links a LessonSession), `ACTIVITY` (links a StudentActivity), `MATERIAL` (links a Material). Items have their own status (same set as phases), priority, target date and notes.
- Reorder and move work by **pointer drag and by keyboard** (React Aria DnD), and also through a "Move to…" menu. The server accepts the complete ordered ID list per parent and rejects lists with missing or foreign IDs (409).
- Deleting a phase that has items requires confirmation and deletes its items. Linked targets are never deleted.

**AC FR-PLAN-05**
- An ACTIVITY item shows the linked work status (Assigned, Submitted, Graded 8/10…) next to its own status. When the linked work is graded, the UI offers "Mark done" (A-009). The item status is not changed automatically.

**AC FR-PLAN-06**
- S sees only plans with `visibleToStudent=true` and status ≠ ARCHIVED. Phases are shown with ✓ / ▶ / ○ icons **and text labels**. Items link to S's own lessons, work and materials. S sees no priority or notes marked private (plan item notes are tutor-only).

---

## LIB — Library (module `library`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-LIB-01 | Folder tree defined by the tutor | MVP | M4 | SPEC §12 |
| FR-LIB-02 | Materials of four kinds | MVP | M4 | SPEC §13 |
| FR-LIB-03 | Browse, search and filter | MVP | M4 | SPEC §12, §16 |
| FR-LIB-04 | Share a material with students | MVP | M4 | SPEC §26, §38 |
| FR-LIB-05 | Student "My materials" | MVP | M4 | SPEC §47 |
| FR-LIB-06 | Tags as free tutor data | MVP | M4 | SPEC §13, §16 |

**AC FR-LIB-01**
- Create, rename, move (cycles rejected) and reorder folders. Delete is allowed only when the folder is empty. Otherwise, a dialog offers "Move contents to parent and delete".
- Names are unique among siblings (case-insensitive). No folder is seeded.

**AC FR-LIB-02**
- `FILE` (an uploaded file, per the FR-FILE limits), `RICH_TEXT` (sanitized HTML, ADR-0010, NFR-SEC-09), `LINK` (http/https URL), `EMBED` (a URL from an allow-listed provider, rendered as a sandboxed iframe, DEC-019).
- Common fields: title (required), description, tags, folder (optional; unfiled is allowed) and `metadata` (tutor-defined label/value pairs). The system records created/updated timestamps.
- Archive and unarchive. Delete is allowed only if the material is unreferenced (by a lesson, activity, share or plan item). Otherwise the API returns 409 `IN_USE` and lists the usages.

**AC FR-LIB-03**
- The folder tree and the list are shown side by side at ≥ 1024 px. Below that, a folder picker sits above the list.
- Search is full-text, accent-insensitive, over title, description and tags, and returns ≤ 300 ms p95 for 5,000 items (NFR-PERF-01). Filters: kind, tag, archived.

**AC FR-LIB-04 / FR-LIB-05**
- T shares a material with 1..n students (with an optional note) and can unshare it. Attaching the material to a lesson or activity also exposes it to that lesson's or activity's student.
- In "My materials", S sees the union of direct shares, materials from their own lessons, and attachments of their own work, grouped by source and newest first. S′'s materials and unshared materials return **404**.

**AC FR-LIB-06**
- Tags are free strings (1–40 characters, trimmed, case-insensitive uniqueness per item). Autocomplete suggests existing tags. No tag is seeded, and none is used in code logic.

---

## FILE — Files (module `files`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-FILE-01 | Upload with limits and type detection | MVP | M4 | SPEC §38 |
| FR-FILE-02 | Authorized view and download (streaming, Range) | MVP | M4 | SPEC §37, §38 |
| FR-FILE-03 | Orphan cleanup | MVP | M4 | ops hygiene |
| FR-FILE-04 | Storage usage visible to the tutor | MVP | M4 | A-011 |

**AC FR-FILE-01**
- Allowed types (by detected content): PDF, DOCX, PPTX, XLSX, TXT, images (PNG, JPEG, WebP, GIF), audio (MP3, M4A/AAC, OGG/Opus, WebM, WAV), video (MP4, WebM). SVG and HTML are **rejected**. Size limits follow A-011. Violations return 413 or 415 with a clear message.
- The UI shows per-file progress, can cancel, and can retry a failed upload.

**AC FR-FILE-02**
- The tutor can read any file. A student can read a file only if it is (a) their own upload or (b) reachable through something shared with them (a material share, their lesson, or their work snapshot). Otherwise: **404**.
- Images, PDF, audio and video are served inline, with Range support for audio and video. Everything else is served as `attachment`. All responses carry `X-Content-Type-Options: nosniff` and a restrictive CSP.

**AC FR-FILE-03**
- Files uploaded but not attached within 24 h are deleted by a scheduled job, which logs a count.

**AC FR-FILE-04**
- Settings → Storage shows total bytes, a breakdown by purpose, and a warning at the configured threshold.

---

## LES — Lessons, schedule and wrap-up (module `lessons`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-LES-01 | Lesson templates (Lesson Builder) | MVP | M4 | SPEC §14, §31 |
| FR-LES-02 | Schedule a lesson | MVP | M3 | SPEC §22 |
| FR-LES-03 | Reschedule, cancel, mark absent, complete | MVP | M3 | SPEC §23 |
| FR-LES-04 | Schedule views | MVP | M3 | SPEC §22, §27 |
| FR-LES-05 | Lesson detail | MVP | M3 (+M4, M5 links) | SPEC §14, §22 |
| FR-LES-06 | **After-lesson wrap-up** | MVP | **M5** | SPEC §28, §48 |
| FR-LES-07 | Student lessons view | MVP | M3 | SPEC §22, §47 |
| FR-LES-08 | Lesson history per student | MVP | M3 | SPEC §46, §55 |

**AC FR-LES-01**
- Fields: title, duration (minutes), body (rich text), materials (ordered references), suggested homework (activity references), tags and folder. Blocks are optional, so a lesson with only a title is valid (SPEC §14 "không được bắt mọi lesson phải chứa cùng loại dữ liệu").

**AC FR-LES-02**
- Required: student, date, start time, duration (default: the student's last duration, or 60). Optional: title/topic, mode (`ONLINE` with meeting URL / `OFFLINE` with location), lesson template (its body and materials are **copied** into the lesson, so later template edits do not affect it), and a note.
- An overlap with another SCHEDULED lesson shows a **warning** that the tutor can override.
- Times are entered in the tutor's time zone and stored as UTC instants.

**AC FR-LES-03**
- Reschedule: the original gets `RESCHEDULED` with `rescheduledToId`, and a new SCHEDULED lesson is created (its fields are copied and editable). Cancel requires an optional reason. Absent sets `STUDENT_ABSENT`. Complete sets `COMPLETED` and `completedAt`.
- Only SCHEDULED lessons can be rescheduled, cancelled or marked absent. A COMPLETED lesson can be reopened within 7 days (for correcting mistakes). These transitions are unit-tested as a state machine.
- Delete is allowed only for a SCHEDULED lesson with no links (notes, homework, materials).

**AC FR-LES-04**
- The Today agenda (on the dashboard), a **week agenda** (list grouped by day, with next/previous and "this week") and a month overview (counts per day, click to go to that day). Filter by student.
- At < 768 px the week view is a day-grouped list. There is no drag and drop in the MVP (DEC-023).

**AC FR-LES-05**
- Shows the student, time, mode (a **Join** button opens the meeting URL in a new tab), status, the lesson content (copied body), materials, homework (linked work items with status), the student-visible summary and private notes (tutor-only area, visually distinct).

**AC FR-LES-06** (UX budget: ≤ 7 steps, ≤ 60 s; `ux-flows.md` F1)
- It opens from Today (the "Wrap up" action on a lesson that has started or ended) and from the lesson detail, as one screen (a sheet on mobile).
- Fields: status (default COMPLETED; alternatives Absent or Cancelled), **summary for student** (optional), **private note** (optional), **materials** (search the library *or* upload new; uploads create unfiled library materials), **homework** (pick an existing library activity *or* quick-create an assignment: title, instructions, due date (default: the next lesson date, or +7 days), response type text and/or file), and an optional **"Schedule next lesson"** (prefilled with the same weekday, time and duration next week).
- **One Save** runs one server command (`POST /tutor/lessons/{id}/wrap-up`) that is atomic: either all parts persist or none do. It is idempotent per client request ID.
- After saving, the student sees the summary, materials and homework. Private notes are never shown.
- Unsaved-changes guard. Keyboard-completable. Validated at 360, 768 and 1280 px.

**AC FR-LES-07**
- S sees upcoming lessons (next 30 days) and history (paginated), each with date, time, mode, **Join** (online, from 15 minutes before the start until the end) and the summary, materials and homework once completed. S′'s lessons return 404.

**AC FR-LES-08**
- The Lessons tab in the student workspace is a reverse-chronological timeline of lessons showing status, summary, a private-note excerpt (tutor only) and homework status. It answers "What did we do last time?" in one click from the student page.

---

## NOTE — Private notes (module `notes`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-NOTE-01 | Create, edit, delete and pin private notes | MVP | M3 | SPEC §24 |
| FR-NOTE-02 | Notes timeline per student plus contextual display | MVP | M3 | SPEC §24 |
| FR-NOTE-03 | Quick note from the student context | MVP | M3 | SPEC §28 |

**AC**
- A note has a body (plain text with simple Markdown: bold, lists, links; rendered safely) and `pinned`. It is linked to a student (required) and optionally to a lesson, an activity definition or a student activity.
- The Notes tab lists pinned notes first, then newest first, filterable by link type. Notes also appear on the lesson detail and on the grading screen.
- **Never** visible to students. An automated test scans every student endpoint's responses for note bodies and IDs from fixtures.

---

## QB — Question bank (module `questions`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-QB-01 | Create and edit questions of the registered types | MVP | M6 | SPEC §16, §17 |
| FR-QB-02 | Duplicate, archive, unarchive; delete when unused | MVP | M6 | SPEC §16 |
| FR-QB-03 | Search, filter, tag; bulk tag and archive | MVP | M6 | SPEC §16 |
| FR-QB-04 | Preview as student | MVP | M6 | SPEC §40 |
| FR-QB-05 | Type-specific validation | MVP | M6 | SPEC §16 |

**AC**
- Common fields: type (from the registry; disabled types are hidden for new questions), prompt (rich text), attachments (image/audio), explanation (rich text), difficulty (`EASY`, `MEDIUM`, `HARD`; optional), default points (> 0, default 1), tags and folder.
- Type content and validation follow `docs/04-backend/engines.md` §2. For example, single choice has 2–10 options and exactly one correct, and fill-in-the-blank has ≥ 1 blank, each with ≥ 1 accepted answer.
- Editing a question never alters existing student snapshots (ADR-0008). The editor says so when the question is in use ("Used in 3 assigned activities; changes apply to future assignments only").
- Delete is allowed only if the question is referenced by no activity definition. Otherwise use archive. Archived questions can't be added to new activities.
- The search matches the prompt text, explanation and tags (accent-insensitive), filtered by type, tag, difficulty and archived. Bulk actions work on the selection.
- The preview renders exactly what S would see (the answer key is stripped), with a toggle to reveal the answer key.

---

## ACT — Activities: assignments and assessments (module `activities`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-ACT-01 | Create an assignment | MVP | M5 (questions in M6) | SPEC §17, §46 |
| FR-ACT-02 | Create an assessment with sections | MVP | M6 | SPEC §18, §50 |
| FR-ACT-03 | Builder: reorder, points, total, preview | MVP | M6 | SPEC §50 |
| FR-ACT-04 | Library vs ad-hoc activities | MVP | M5 | SPEC §15, PO goal ("student-specific activities") |
| FR-ACT-05 | Assign to one or more students with a snapshot | MVP | M5 | SPEC §15, §32 |
| FR-ACT-06 | Manage an assigned work item | MVP | M5 | SPEC §15 |
| FR-ACT-07 | Duplicate and archive activities | MVP | M5 | SPEC §16 by analogy |

**AC FR-ACT-01**
- Fields: title (required), description, instructions (rich text), attachments (materials or files), **response mode** (any of: text response, file upload, question items), optional time limit, max attempts (default 1), pass mark (%), result policy (G-10), tags and folder.
- A valid assignment can consist of nothing but a title and instructions with a text response (the "quick homework" of the wrap-up).

**AC FR-ACT-02 / FR-ACT-03** (UX: `ux-flows.md` F4)
- An assessment has 1..n sections (title, instructions) with ordered items. Items are questions picked from the bank (search panel) or created inline (a new bank question). Each item can override its points. Totals are computed live.
- Settings: time limit (minutes, optional), max attempts, attempt scoring (`LATEST` or `HIGHEST`), pass mark, shuffle options (per activity), result policy and "show correct answers after release" (yes/no), and optional `recordResultAs` (FR-GOAL-04).
- The builder saves the whole definition as one document, with optimistic locking. A draft is autosaved every 10 s while it is dirty. The preview renders the student view.
- An activity with 100 questions in 5 sections loads in the builder in < 1 s and saves in < 500 ms p95 (NFR-PERF-02).
- No code path depends on the activity being "TOEIC" or "IELTS" (an architecture test checks for forbidden identifiers).

**AC FR-ACT-04**
- An activity created from a student context (wrap-up or "Assign work" → "New") is `adHoc=true` with `ownerStudentId`. It is hidden from library lists and can be promoted with "Save to library".

**AC FR-ACT-05**
- Assign to 1..n students, with `availableFrom` (default now) and `dueAt` (optional) per student. The system creates one StudentActivity per student containing an **immutable snapshot** (structure, question content, answer keys, points, settings).
- Editing or deleting the definition afterwards does **not** change existing snapshots (an integration test checks this). The source link remains for traceability (it is null if the definition is deleted).
- Assigning the same activity to the same student again creates a new, independent StudentActivity.

**AC FR-ACT-06**
- T can change `dueAt` or `availableFrom`, add extra attempts, **excuse** (removed from stats, visible to S as "Excused"), **withdraw** (hidden from S; kept for the tutor) or **reopen** (a new attempt is allowed).
- Every change is audited and visible in the work item's history.

**AC FR-ACT-07**
- Duplicate creates a copy titled "(copy)" that references the same bank questions. Archive hides the activity from pickers. Delete is allowed only if the activity has never been assigned; otherwise use archive.

---

## ATT — Student work and attempts (module `activities`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-ATT-01 | "My work" list | MVP | M5 | SPEC §26, §29, §47 |
| FR-ATT-02 | Take an attempt (autosave, navigation, submit) | MVP | M5 (text/file), M6 (questions, timer) | SPEC §19, §29 |
| FR-ATT-03 | Response types | MVP | M5, M6 | SPEC §17, §19 |
| FR-ATT-04 | Server-enforced time limit and auto-submit | MVP | M6 | SPEC §17, §18 |
| FR-ATT-05 | Late submissions | MVP | M5 | SPEC §15 (Deadline) |
| FR-ATT-06 | Multiple attempts | MVP | M6 | SPEC §15 (Attempts) |
| FR-ATT-07 | Results and feedback view | MVP | M5 | SPEC §29, §47 |

**AC FR-ATT-01**
- Groups: **To do** (overdue first, then by due date), **Submitted** (awaiting review), **Done** (released results), and Excused. Each item shows its kind (Assignment/Assessment), title, due date (relative and absolute), time limit and attempts left.

**AC FR-ATT-02**
- "Start" creates an attempt. Before starting a timed attempt, a confirmation shows the time limit.
- Responses autosave on change (debounced ≤ 1 s) and on blur. A save indicator shows Saving… / Saved / Offline, retrying. A reload restores all responses.
- Navigation by section and item, with an answered/unanswered overview. The submit confirmation lists unanswered items.
- Submit is idempotent: a double submit returns the same result.

**AC FR-ATT-03**
- Choice (radio/checkbox), true/false, blanks (inline text inputs), short/long text (long text has a character count and no rich formatting in the MVP), file upload (per the FR-FILE limits; multiple files if configured), and **audio recording** (record, stop, play back, re-record, upload; A-015; microphone permission errors explained; fallback to uploading an audio file).

**AC FR-ATT-04**
- `deadlineAt = startedAt + timeLimit` is stored on the server. The client shows a countdown synchronised to server time (drift-corrected). Responses received after `deadlineAt + 30 s grace` are rejected with 409 `ATTEMPT_CLOSED`.
- An expired attempt is auto-submitted on the next access **or** by a scheduled sweep (≤ 1 min), whichever comes first. The auto-submitted attempt is marked `AUTO_SUBMITTED`.

**AC FR-ATT-05**
- After `dueAt`: if `allowLate` (default true), submission is allowed and flagged **Late**; otherwise start and submit are rejected and the item shows "Closed".

**AC FR-ATT-06**
- A new attempt is allowed while `attemptsUsed < maxAttempts` and there is no attempt in progress. The final score follows `attemptScoring` (LATEST or HIGHEST). Previous attempts stay viewable when released.

**AC FR-ATT-07**
- Per the result policy: IMMEDIATE (auto-graded only) shows the score at submit. AFTER_REVIEW shows "Submitted, waiting for your tutor" until published. HIDDEN never shows a score (feedback only).
- A released result shows the total and percent, pass/fail if a pass mark is set, per-item correctness, correct answers and explanations **only if** "show correct answers" is on, rubric scores, the overall feedback and anchored comments (a timestamp anchor seeks the audio).

---

## GRD — Grading and feedback (module `activities`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-GRD-01 | Auto-grading on submit | MVP | M6 | SPEC §19 |
| FR-GRD-02 | Review queue | MVP | M5 (basic), M6 | SPEC §27 (Pending submissions) |
| FR-GRD-03 | Manual grading per response, including override | MVP | M5 | SPEC §19 |
| FR-GRD-04 | Rubric scores | MVP | M6 | SPEC §20 |
| FR-GRD-05 | Anchored comments | MVP | M6 | SPEC §20, DEC-018 |
| FR-GRD-06 | Overall feedback: draft and publish | MVP | M5 | SPEC §20 |

**AC FR-GRD-01**
- Each auto-gradable type is scored by its handler (engines.md §2). Partial credit for multiple choice is configurable (`ALL_OR_NOTHING` default, or `PROPORTIONAL` with penalties for wrong choices, floored at 0). Blank matching is trimmed, case-insensitive by default, with optional accent-insensitive or exact mode per blank.
- An attempt with no manual items is `GRADED` immediately. Otherwise it is `NEEDS_REVIEW`.

**AC FR-GRD-02**
- The queue lists attempts in `NEEDS_REVIEW`, plus graded-but-unpublished ones, oldest first. Each shows student, title, submitted time (Late flag) and item counts. The count appears on Today. Grading the queue in order uses a "Save & next" keyboard flow.

**AC FR-GRD-03**
- For each response, T sets points (0..max, step 0.5) and a comment. Overriding an auto score requires the new value and records who, when, old and new value (audit).

**AC FR-GRD-04**
- An activity may define rubric criteria (name, max points, optional description). The grading screen shows the criteria as score inputs. The rubric total is shown **alongside** the item points (it does not replace them), unless the activity sets `scoreSource=RUBRIC`.

**AC FR-GRD-05**
- A response can carry 0..n comments `{anchor?: string ≤ 40, text}`. An anchor matching `^\d{1,2}:\d{2}$` renders as a seek link for audio responses.

**AC FR-GRD-06**
- Feedback (overall text plus rubric) is saved as `DRAFT`, invisible to S. **Publish** releases the scores (per policy) and the feedback in one action, sets `releasedAt`, emits the `ResultPublished` event and updates the Home "Recent result" for S. Unpublish is possible (audited).

---

## PROG — Progress (module `progress`, read-only)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-PROG-01 | Student progress (tutor view) | MVP | M7 | SPEC §25, §46 |
| FR-PROG-02 | Student progress (student view) | MVP | M7 | SPEC §47, §51 |
| FR-PROG-03 | Progress overview across students | MVP | M7 | SPEC §41 |
| FR-PROG-04 | Configurable metric display | MVP | M7 | SPEC §25 |

**AC FR-PROG-01**
- Sections: **Work** (completed/assigned, excluding excused and withdrawn; average % of released results; last 5 results), **Assessments** (score series per activity title or tag, as a line when there are ≥ 2 points, e.g. 550 → 585 → 610), **Attendance** (completed / absent / cancelled counts over the last 90 days), **Goals** (progress per FR-GOAL-05), **Plan** (items done / total per active plan) and **Metrics** (SCALE metrics as labelled bars with the latest value; NUMBER metrics as latest + trend).
- Every number links to its underlying records. Fixture-based tests verify each calculation.

**AC FR-PROG-02**
- The same sections, restricted to student-visible data: released results only, visible goals, visible observations, visible plans. No private notes and no attention reasons.

**AC FR-PROG-03**
- A table of ACTIVE students: last lesson, next lesson, overdue work count, average of the last 5 results with a trend arrow, goal progress (primary goal) and attention reasons. It becomes a list on mobile. Sortable.

**AC FR-PROG-04**
- Per student, T picks which metrics appear in the Metrics section and in what order (default: all metrics with observations).

---

## DASH — Dashboards (module `dashboard`, read-only)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-DASH-01 | Tutor Today | MVP | M3 (schedule), M5 (review), M7 (attention) | SPEC §27, §28 |
| FR-DASH-02 | Attention rules | MVP | M7 | SPEC §27 |
| FR-DASH-03 | Student Home | MVP | M2 (shell), M5, M7 | SPEC §26, §29 |

**AC FR-DASH-01**
- In priority order: a greeting line with the date; **Today's lessons** (time, student, topic, Join, Open, Wrap up), **Needs attention** (student + reason + action), **Review queue** (count + oldest 5), **Recent student work** (last 10 submissions and results), **Upcoming** (next 7 days), and quick actions (Add student · Schedule lesson · New assignment). The counts (active students, lessons today, pending review) are shown as a text summary line, **not** as KPI tiles.
- No charts on Today. It loads in ≤ 500 ms p95 (NFR-PERF-01).

**AC FR-DASH-02**
- The rules (thresholds live in Settings): `OVERDUE_WORK` (≥ 2 overdue items), `NO_RECENT_LESSON` (active student with no completed lesson in 14 days and no upcoming lesson), `LOW_RESULTS` (the last 3 released results are below the pass mark, or below 50% when no pass mark is set), `PLAN_BEHIND` (an active phase or item is past its target date). Each flag shows its rule's reason text. PAUSED students are excluded. Rules are pure functions with unit tests.

**AC FR-DASH-03**
- A greeting (in the student's language, time-of-day aware); **Your goals** (visible goals with progress); **To do** (overdue and due in ≤ 7 days, plus in-progress attempts, max 5, with "See all"); **Next lesson** (date, time, Join); **Recent results** (latest released results and feedback). Mobile-first; the main content is visible without horizontal scroll at 360 px.

---

## SET — Settings (module `settings`)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-SET-01 | Workspace settings (tutor) | MVP | M2 (+ later sections) | SPEC §41 |
| FR-SET-02 | Personal account settings (both roles) | MVP | M2 | SPEC §4.3 |
| FR-SET-03 | Security log view (tutor) | MVP | M8 | NFR-SEC-11 |

**AC**
- Workspace: display name (brand), default time zone, default language, attention thresholds, upload limits, embed providers (from the allow-list registry), enabled extensions (the plugin catalog, FR-EXT-02) and metrics management.
- Account: display name (tutor), language, time zone, change password.
- Security log: the last 500 audit events, filterable by type (login success/failure, password changes, resets, account status, grade overrides, deletions).

---

## EXT — Extension registry ("plugin store", module `shared.extension` + owners)

| ID | Requirement | Phase | M | Trace |
|---|---|---|---|---|
| FR-EXT-01 | Build-time extension registry with manifest validation | MVP | M6 | A-016, plugin-store-spec |
| FR-EXT-02 | Catalog in Settings; enable or disable an extension | MVP | M6 | SPEC §40.5 |
| FR-EXT-03 | Frontend/backend extension parity check | MVP | M6 | plugin-store-spec §6 |

**AC:** see `docs/08-extensibility/plugin-store-spec.md` §8.
