# API Catalogue (MVP design)

> Design-level list. The authoritative contract is `api/openapi.json` once generated. Each packet that adds endpoints updates this file.
> Prefix `/api/v1` omitted. **M** = milestone. Audience: T = tutor, S = student, P = public, A = any authenticated.
> `/auth/**` is open at the URL gate and each handler decides (security.md §4); there is no registration route (`/auth/register` → 404, FR-AUTH-01).
> Every handler carries `@Audience` (the column "Aud") and a policy-registry entry (security.md §4). Registered since T-M2.2: the four auth endpoints and `GET /meta`;
> since T-M2.3 the eight live "tutor: students" endpoints below (all `@Audience(TUTOR)`).

## auth, meta (identity, settings)

| Method | Path | Aud | Purpose | FR | M |
|---|---|---|---|---|---|
| GET | `/meta` | P | `{name, version, locales, displayName}` from `englms.meta.*` config; locales `["vi","en"]` (DEC-039). `HEAD` is public too. **Live** (T-M1.2, `api/openapi.json`) | — | M1 |
| GET | `/auth/session` | P | `{userId, username, role, displayName, locale, timeZone, mustChangePassword}` or 401 (`UNAUTHENTICATED` without a session cookie, `SESSION_EXPIRED` when the cookie names no live session). Also primes the `XSRF-TOKEN` cookie, for anonymous callers too. Passes the must-change gate. **Live** (T-M2.1) | FR-AUTH-03 | M2 |
| POST | `/auth/login` | P | `{username, password, rememberMe}` → 200 with the session body; rotates the session ID; `rememberMe` sets the 30-day `ENGLMS_REMEMBER_ME` cookie. One generic 401 `UNAUTHENTICATED` for every failure (also while locked, DEC-089 (6)); 429 `RATE_LIMITED` + `Retry-After` past the per-IP throttle; no redirect target (T18). CSRF required. **Live** (T-M2.1) | FR-AUTH-03 | M2 |
| POST | `/auth/logout` | P | 204; ends this session and this device's remember-me token, expires both cookies; idempotent for anonymous callers. CSRF required; passes the must-change gate. **Live** (T-M2.1) | FR-AUTH-04 | M2 |
| POST | `/auth/password` | A (handler: 401 otherwise) | `{currentPassword, newPassword}` → 204; rotates the session ID, ends every other session and remember-me token. 422 `VALIDATION_FAILED` with `errors[]` field codes (`CURRENT_PASSWORD_INCORRECT`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_TOO_COMMON`, `PASSWORD_EQUALS_USERNAME`, `PASSWORD_UNCHANGED`). CSRF required; passes the must-change gate. **Live** (T-M2.1) | FR-AUTH-05, 06 | M2 |
| PATCH | `/auth/preferences` | A | `{locale, timeZone, displayName?}` | FR-SET-02 | M2 |

## tutor: students, goals, plans

| Method | Path | Purpose | FR | M |
|---|---|---|---|---|
| GET | `/tutor/students` | List, search, filter, sort. `q` (accent- and case-insensitive substring of the full name, username, email, phone or a handle value; `%`, `_`, `\` match literally), `status` (repeatable: `ACTIVE`, `PAUSED`, `ARCHIVED`; default `ACTIVE`+`PAUSED`), `page`, `size` (≤ 100), `sort` = `fullName` (default) or `createdAt`, `,asc`/`,desc`. Rows `{id, fullName, username, status, email, phone, createdAt}` in the page envelope (api-conventions §4). Unknown `status`/`sort` or out-of-range `page`/`size` → 422 naming the field. Row signals and the "next lesson"/"recently active" sorts: T-M3.1, T-M5.1, T-M7.7 (DEC-097 (5)). **Live** (T-M2.3) | FR-STU-02 | M2 |
| POST | `/tutor/students` | Create student + account: `{fullName, username, password?, email?, phone?, contactHandles?: [{label, value}], note?}`. Without `password` the server generates one (≥ 14 characters, DEC-097 (2)/DEC-098); a supplied one must pass the policy (422 `password` field codes). The account is `STUDENT`, `mustChangePassword=true`, temporary password valid 7 days (A-021). `201` + `Location` with `{student: <student DTO>, credentials: {username, temporaryPassword, expiresAt}}`: the credentials appear **only** here. 409 `USERNAME_TAKEN` (`errors[0].field = "username"`, also when two creates race); 422 field codes. Guardians (`guardians?`): T-M2.9; the first goal (FR-GOAL-02): T-M7.1 (DEC-102). `Idempotency-Key` (api-conventions §6): not built yet. **Live** (T-M2.3) | FR-STU-01 | M2 |
| GET | `/tutor/usernames/suggestion?fullName=` | `{username}`: the full name lowercased without accents and other characters (≤ 36), `student` when shorter than 3, then the first free of `base`, `base2`, … **Live** (T-M2.3) | FR-STU-01 | M2 |
| GET | `/tutor/usernames/availability?username=` | `{username, available, reason}` with `reason` `INVALID`, `TAKEN` or `null`. **Live** (T-M2.3) | FR-STU-01 | M2 |
| GET / PATCH | `/tutor/students/{sid}` | Profile and contacts. `GET` → the student DTO `{id, fullName, username, status, email, phone, contactHandles, note, createdAt, updatedAt, version}`. `PATCH` `{version, fullName?, username?, email?, phone?, contactHandles?, note?}`: absent = unchanged, `null` clears (not `fullName`/`username`); stale `version` → 409 `STALE_VERSION`; a username change keeps the student's sessions (409 `USERNAME_TAKEN`; audit `USERNAME_CHANGED`) and, alone, leaves `version` as it is (the username is the account's). Unknown `sid` → 404. Guardians: T-M2.9. **Live** (T-M2.3) | FR-STU-03 | M2 |
| PUT | `/tutor/students/{sid}/learning-profile` | Learning profile | FR-STU-04 | M2 |
| POST | `/tutor/students/{sid}/guardians` · PATCH/DELETE `/tutor/guardians/{gid}` | Guardians | FR-STU-03 | M2 |
| POST | `/tutor/students/{sid}/status` | `{status, version}` → the student DTO. `ACTIVE ⇄ PAUSED`, `ACTIVE\|PAUSED → ARCHIVED` (disables the account: every session and remember-me token ends, sign-in answers the generic 401), `ARCHIVED → ACTIVE` (re-enables; `mustChangePassword` unchanged); others → 409 `INVALID_STATE_TRANSITION`; stale → 409 `STALE_VERSION`; audit `STUDENT_STATUS_CHANGED {from, to}`. **Live** (T-M2.3) | FR-STU-05 | M2 |
| POST | `/tutor/students/{sid}/password-reset` | New temporary password (once): `200 {username, temporaryPassword, expiresAt}`; must change, 7-day expiry, lockout cleared, all sessions and remember-me tokens ended; audit `PASSWORD_RESET_BY_TUTOR` (actor = tutor). An `ARCHIVED` student → 409 `INVALID_STATE_TRANSITION`. **Live** (T-M2.3) | FR-AUTH-07 | M2 |
| GET | `/tutor/students/{sid}/overview` | Workspace header + overview composition | FR-STU-06 | M2+ |
| GET / POST | `/tutor/metrics` · PATCH `/tutor/metrics/{id}` · POST `/tutor/metrics/{id}/archive` | Metric definitions | FR-GOAL-01 | M7 |
| GET / POST | `/tutor/students/{sid}/goals` · PATCH/DELETE `/tutor/goals/{id}` · PUT `/tutor/students/{sid}/goals/order` | Goals | FR-GOAL-02 | M7 |
| GET / POST | `/tutor/students/{sid}/observations` · PATCH/DELETE `/tutor/observations/{id}` | Observations | FR-GOAL-03 | M7 |
| GET / POST | `/tutor/students/{sid}/plans` · GET/PATCH/DELETE `/tutor/plans/{pid}` · POST `/tutor/plans/{pid}/status` | Plans | FR-PLAN-01, 04 | M7 |
| POST | `/tutor/plans/{pid}/phases` · PATCH/DELETE `/tutor/phases/{id}` · PUT `/tutor/plans/{pid}/phases/order` | Phases | FR-PLAN-02 | M7 |
| POST | `/tutor/phases/{id}/items` · PATCH/DELETE `/tutor/plan-items/{id}` · PUT `/tutor/phases/{id}/items/order` · POST `/tutor/plan-items/{id}/move` | Items | FR-PLAN-03 | M7 |

## tutor: library, files, lessons, notes

| Method | Path | Purpose | FR | M |
|---|---|---|---|---|
| GET | `/tutor/library/folders` | Whole tree (bounded) | FR-LIB-01 | M4 |
| POST · PATCH · DELETE | `/tutor/library/folders[/{id}]` · POST `/…/{id}/move` · PUT `/…/{id}/children/order` | Folder operations | FR-LIB-01 | M4 |
| GET / POST | `/tutor/materials` · GET/PATCH/DELETE `/tutor/materials/{id}` · POST `/…/{id}/archive` `/unarchive` | Materials | FR-LIB-02, 03 | M4 |
| POST / DELETE | `/tutor/materials/{id}/shares` (`{studentIds, note}`) · `/tutor/materials/{id}/shares/{sid}` | Sharing | FR-LIB-04 | M4 |
| GET | `/tutor/students/{sid}/materials` | What a student can see | FR-LIB-05 | M4 |
| GET | `/tutor/tags?scope=material\|question\|activity\|lesson-template&prefix=` | Tag suggestions | FR-LIB-06 | M4 |
| POST | `/tutor/files` (multipart; `purpose`) | Upload | FR-FILE-01 | M4 |
| GET | `/tutor/files/{id}` · `/tutor/files/{id}/content` | Metadata · stream (Range) | FR-FILE-02 | M4 |
| GET | `/tutor/storage/usage` | Usage | FR-FILE-04 | M4 |
| GET / POST | `/tutor/lesson-templates` · GET/PATCH/DELETE `/…/{id}` · archive | Lesson templates | FR-LES-01 | M4 |
| GET | `/tutor/lessons?from=&to=&studentId=&status=` | Schedule range | FR-LES-04 | M3 |
| POST | `/tutor/lessons` | Schedule a lesson | FR-LES-02 | M3 |
| GET / PATCH / DELETE | `/tutor/lessons/{id}` | Detail, edit, delete (if allowed) | FR-LES-05 | M3 |
| POST | `/tutor/lessons/{id}/{complete\|absent\|cancel\|reopen\|reschedule}` | Transitions | FR-LES-03 | M3 |
| POST | `/tutor/lessons/{id}/materials` · DELETE `/…/materials/{mid}` | Attach materials | FR-LES-05 | M4 |
| POST | `/tutor/lessons/{id}/notes` | Note linked to a lesson | FR-NOTE-01 | M3 |
| POST | `/tutor/lessons/{id}/wrap-up` | **Composite after-lesson command** (Idempotency-Key) | FR-LES-06 | M5 |
| GET | `/tutor/students/{sid}/lessons` | Lesson history | FR-LES-08 | M3 |
| GET / POST | `/tutor/students/{sid}/notes` · PATCH/DELETE `/tutor/notes/{id}` | Notes | FR-NOTE-01..03 | M3 |

## tutor: questions, activities, grading

| Method | Path | Purpose | FR | M |
|---|---|---|---|---|
| GET | `/tutor/question-types` | Enabled types + JSON schemas | FR-QB-01, FR-EXT-02 | M6 |
| GET / POST | `/tutor/questions` · GET/PATCH/DELETE `/tutor/questions/{id}` | Bank CRUD + search | FR-QB-01..03 | M6 |
| POST | `/tutor/questions/{id}/{duplicate\|archive\|unarchive}` · POST `/tutor/questions/bulk` | Operations | FR-QB-02, 03 | M6 |
| GET | `/tutor/questions/{id}/preview` | Student-view rendering data | FR-QB-04 | M6 |
| GET / POST | `/tutor/activities?kind=&q=&tag=&archived=` · GET/PUT/DELETE `/tutor/activities/{id}` | Definitions (PUT = full document) | FR-ACT-01..03 | M5–M6 |
| POST | `/tutor/activities/{id}/{duplicate\|archive\|unarchive\|promote}` | Operations (promote an ad-hoc activity to the library) | FR-ACT-04, 07 | M5 |
| GET | `/tutor/activities/{id}/preview` | Student view | FR-ACT-03 | M6 |
| POST | `/tutor/activities/{id}/assignments` | `{students:[{studentId, availableFrom?, dueAt?}]}` → StudentActivities | FR-ACT-05 | M5 |
| POST | `/tutor/students/{sid}/quick-assignment` | Create ad-hoc + assign in one step (also used by wrap-up) | FR-ACT-04 | M5 |
| GET | `/tutor/student-activities?studentId=&status=&kind=` · GET `/…/{id}` | Work items (tutor view incl. attempts) | FR-ACT-06 | M5 |
| PATCH | `/tutor/student-activities/{id}` | Dates, extra attempts | FR-ACT-06 | M5 |
| POST | `/tutor/student-activities/{id}/{excuse\|unexcuse\|withdraw\|reopen}` | Management | FR-ACT-06 | M5 |
| POST | `/tutor/student-activities/{id}/notes` | Note linked to work | FR-NOTE-01 | M5 |
| GET | `/tutor/review-queue` | Pending review | FR-GRD-02 | M5 |
| GET | `/tutor/attempts/{id}` | Attempt + responses + snapshot (with keys) | FR-GRD-03 | M5 |
| PUT | `/tutor/attempts/{id}/grades` | `{responses:[{itemKey, score, comment?}], rubric:[{key, score}]}` | FR-GRD-03, 04 | M5–M6 |
| POST / DELETE | `/tutor/responses/{id}/comments[/{cid}]` | Anchored comments | FR-GRD-05 | M6 |
| PUT | `/tutor/attempts/{id}/feedback` | Draft feedback body | FR-GRD-06 | M5 |
| POST | `/tutor/attempts/{id}/{publish\|unpublish}` | Release | FR-GRD-06 | M5 |

## tutor: dashboards, progress, settings

| Method | Path | Purpose | FR | M |
|---|---|---|---|---|
| GET | `/tutor/dashboard/today` | Today composition | FR-DASH-01, 02 | M3+ |
| GET | `/tutor/progress/students` | Overview table | FR-PROG-03 | M7 |
| GET | `/tutor/students/{sid}/progress` | Per-student progress | FR-PROG-01 | M7 |
| PUT | `/tutor/students/{sid}/progress/metrics` | Displayed metrics | FR-PROG-04 | M7 |
| GET / PATCH | `/tutor/settings` | Workspace settings | FR-SET-01 | M2+ |
| GET · PATCH | `/tutor/extensions` · `/tutor/extensions/{id}` | Catalogue, enable or disable | FR-EXT-02 | M6 |
| GET | `/tutor/audit-events?action=&page=` | Security log | FR-SET-03 | M8 |

## student (all scoped to the authenticated student; never a `studentId` parameter)

| Method | Path | Purpose | FR | M |
|---|---|---|---|---|
| GET | `/student/home` | Home composition | FR-DASH-03 | M2+ |
| GET | `/student/account` | Own name and username | FR-SET-02 | M2 |
| GET | `/student/goals` · `/student/progress` | Visible goals, progress | FR-PROG-02 | M7 |
| GET | `/student/plans` · `/student/plans/{pid}` | Visible plans | FR-PLAN-06 | M7 |
| GET | `/student/lessons?from=&to=` · `/student/lessons/{id}` | Own lessons | FR-LES-07 | M3 |
| GET | `/student/materials` · `/student/materials/{id}` | Visible materials | FR-LIB-05 | M4 |
| GET | `/student/files/{id}/content` | Stream if resolvable (Range) | FR-FILE-02 | M4 |
| POST | `/student/files` | Upload for a response (`purpose=SUBMISSION`) | FR-ATT-03 | M5 |
| GET | `/student/work?group=` · `/student/work/{saId}` | My work, work detail (redacted snapshot) | FR-ATT-01 | M5 |
| POST | `/student/work/{saId}/attempts` | Start attempt | FR-ATT-02 | M5 |
| GET | `/student/attempts/{id}` | Attempt state (+ server time, deadline) | FR-ATT-02, 04 | M5 |
| PUT | `/student/attempts/{id}/responses/{itemKey}` | Autosave response | FR-ATT-02 | M5 |
| POST | `/student/attempts/{id}/submit` | Submit (Idempotency-Key) | FR-ATT-02 | M5 |
| GET | `/student/attempts/{id}/result` | Released result + feedback | FR-ATT-07 | M5 |
