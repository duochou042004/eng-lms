# Domain Model

> Status: Baseline v1.0. SPEC §34 lists an *indicative* entity set. This document redefines it into **aggregates** with explicit
> ownership, lifecycle and invariants. Table-level detail: [data-model.md](data-model.md).

## 1. Aggregates by module

| Module | Aggregate root | Contains (same consistency boundary) | References by ID (other aggregates) |
|---|---|---|---|
| identity | `UserAccount` | credentials, lock state | — |
| students | `Student` | `Guardian[]`, `LearningProfile` (1:1) | `UserAccount` |
| goals | `MetricDefinition` | — | — |
| goals | `LearningGoal` | — | `Student`, `MetricDefinition?` |
| goals | `MetricObservation` | — | `Student`, `MetricDefinition`, source ref (`StudentActivity?`) |
| plans | `LearningPlan` | `PlanPhase[]` → `PlanItem[]` | `Student`, `LearningGoal[]`, item targets (`LessonSession`, `StudentActivity`, `Material`) |
| library | `LibraryFolder` | — | parent `LibraryFolder?` |
| library | `Material` | metadata, tags | `LibraryFolder?`, `StoredFile?` |
| library | `MaterialShare` | — | `Material`, `Student` |
| files | `StoredFile` | — | uploader `UserAccount` |
| lessons | `LessonTemplate` | material refs, homework refs | `Material[]`, `Activity[]` |
| lessons | `LessonSession` | copied body, material refs | `Student`, `LessonTemplate?` (source), `LessonSession?` (rescheduled-to) |
| notes | `TeacherNote` | — | `Student`, `LessonSession?`, `Activity?`, `StudentActivity?` |
| questions | `Question` | type content (JSON), attachments | `LibraryFolder?`, `StoredFile[]` |
| activities | `Activity` | `ActivitySection[]` → `ActivityItem[]`, rubric, settings, attachments | `Question[]` (by ID), `Material[]`, `Student?` (ad-hoc owner) |
| activities | `StudentActivity` | **snapshot** (JSON), `Attempt[]` → `Response[]`, `Feedback`, `FeedbackComment[]` | `Activity?` (source), `Student`, `LessonSession?`, `PlanItem?` |

**Why `StudentActivity` includes attempts.** Grading invariants span attempts (max attempts, scoring policy, final score), and the
data volume per student activity is small (≤ ~10 attempts × ≤ ~200 responses). If attempt write contention appears, `Attempt`
can be split into its own aggregate without an API change.

## 2. Key invariants

| # | Invariant | Enforced by |
|---|---|---|
| I-01 | Exactly one `UserAccount` with role TUTOR | Partial unique index + bootstrap logic |
| I-02 | Each `Student` has exactly one `UserAccount` (role STUDENT). Each STUDENT account belongs to exactly one Student | Unique FK `student.user_id` |
| I-03 | A student-audience query always filters by the authenticated student's ID | ADR-0016 structure + isolation tests |
| I-04 | A `StudentActivity` snapshot is immutable after creation. Its only mutable parts are status, dates, attempts and grading | No setters; DB trigger that rejects snapshot updates (defence in depth) |
| I-05 | `Response` writes are accepted only while its attempt is IN_PROGRESS and `now ≤ deadlineAt + grace` | Aggregate method + `Clock` |
| I-06 | A score is within `0 ≤ score ≤ maxPoints` for a response and a rubric criterion | Aggregate + CHECK constraints |
| I-07 | A released result is visible to the student only after `releasedAt` is set (policy AFTER_REVIEW) | Student read model filters on `released_at IS NOT NULL` |
| I-08 | A folder tree has no cycles | Move command checks the ancestry chain (recursive CTE) |
| I-09 | Positions are unique and contiguous per parent after every reorder | Reorder command replaces the whole ordering; `UNIQUE (parent, position) DEFERRABLE` |
| I-10 | Content in use cannot be hard-deleted (question in an activity; activity with assignments; material referenced) | Service check + FK `ON DELETE RESTRICT` |
| I-11 | `TeacherNote` is never mapped to a student DTO | ArchUnit + response scans |
| I-12 | `LessonSession` state transitions follow §4.2 | State machine + unit tests |
| I-13 | Goal baseline and target are inside the metric range | Aggregate validation |

## 3. Content vs student activity (SPEC §15, §32)

```text
 LIBRARY (reusable, tutor-owned)             PER-STUDENT ACTIVITY (owned by one student's record)
 ─────────────────────────────────           ───────────────────────────────────────────────────
 Question ─┐  (by reference)                 StudentActivity  ← immutable SNAPSHOT of Activity + Questions
 Question ─┼─► Activity (definition) ──assign──► ├─ status, availableFrom, dueAt, extraAttempts
 Material ─┘   sections/items/settings           ├─ Attempt 1..n ─ Response per snapshot item
                                                 ├─ Feedback (draft/published), rubric scores
                                                 └─ FeedbackComment per response
 LessonTemplate ──(copy body + material refs)──► LessonSession (student's lesson instance)
 Material ──(share / attach)──────────────────► visible to the student through a MaterialShare or through their lesson or work
```

- **Snapshot content (ADR-0008):** `{activityVersion, kind, title, instructions, settings, rubric, sections:[{key, title,
  instructions, items:[{key, type, typeSchemaVersion, prompt, content (with answer key), explanation, points, attachments}]}]}`.
  Item `key`s are stable UUIDs generated at snapshot time. Responses reference `itemKey`.
- **Redaction:** before sending a snapshot to a student, each item passes through `QuestionTypeHandler.toStudentView(content,
  reveal)`. `reveal=true` only after release and when `showCorrectAnswers` is on.
- **Materials are referenced, not snapshotted.** They are reference content, not graded. Archiving a material keeps it visible to
  students who already have access through a share, lesson or work. Only hard delete removes it, and hard delete is blocked while it is referenced.

## 4. Lifecycles (state machines)

### 4.1 Student
`ACTIVE ⇄ PAUSED`; `ACTIVE|PAUSED → ARCHIVED` (disables login); `ARCHIVED → ACTIVE` (re-enables login).

### 4.2 LessonSession (DEC-017)

```text
SCHEDULED ──complete──► COMPLETED ──reopen (≤7 days)──► SCHEDULED
    │ ──absent───► STUDENT_ABSENT ──undo (≤7 days)──► SCHEDULED
    │ ──cancel───► CANCELLED      ──undo (≤7 days)──► SCHEDULED
    └─reschedule─► RESCHEDULED (+ new SCHEDULED session, linked via rescheduledToId; terminal)
```

### 4.3 StudentActivity (work item)

```text
ASSIGNED ──start attempt──► IN_PROGRESS ──submit──► SUBMITTED ──(all auto)──► GRADED ──publish──► RELEASED
                                              └──(needs manual)──► NEEDS_REVIEW ──grade──► GRADED
RELEASED ──unpublish──► GRADED ;  RELEASED|GRADED ──reopen/new attempt──► ASSIGNED (attempt n+1)
any non-terminal ──excuse──► EXCUSED (terminal, reversible by tutor) ; any ──withdraw──► WITHDRAWN (hidden from student)
Derived flags (not states): OVERDUE (dueAt < now ∧ state ∈ {ASSIGNED, IN_PROGRESS}), LATE (submittedAt > dueAt).
```

Mapping to `resultPolicy`: IMMEDIATE auto-publishes when GRADED is reached without manual items. AFTER_REVIEW requires the tutor to publish.
HIDDEN releases feedback only (the score is never shown to the student).

### 4.4 Attempt
`IN_PROGRESS → SUBMITTED | AUTO_SUBMITTED`. Grading status per attempt: `PENDING_MANUAL | GRADED`.

### 4.5 LearningPlan, phases and items
Plan: `ACTIVE ⇄ PAUSED → COMPLETED → ARCHIVED` (and `ACTIVE → ARCHIVED`). Phase and item status: `NOT_STARTED, IN_PROGRESS, COMPLETED,
PAUSED, SKIPPED`, set manually. A phase is never auto-completed; the UI suggests completion when all items are COMPLETED or SKIPPED.

### 4.6 LearningGoal
`ACTIVE ⇄ PAUSED`; `ACTIVE → ACHIEVED | DROPPED` (both reversible by the tutor).

## 5. Ownership and audience

| Data | Tutor | Owning student | Other students |
|---|---|---|---|
| Student profile (name, contacts) | RW | R (own name and username only, on the Account page) | — |
| Guardians, learning profile, custom fields | RW | — | — |
| Goals / observations | RW | R if `visibleToStudent` | — |
| Plans (phases, items) | RW | R if `visibleToStudent`; item notes hidden | — |
| Lessons | RW | R (own; summary, materials and homework; **no** private notes) | — |
| Materials | RW | R if shared or attached to their lesson or work | — |
| Questions (bank) | RW | only redacted snapshot content inside their own work | — |
| Activities (definitions) | RW | — (the student sees their snapshot, never the definition) | — |
| StudentActivity, attempts, responses | RW (grading) | R + write responses while in progress | — |
| Feedback / grades | RW | R after release (per policy) | — |
| Teacher notes | RW | — | — |
| Audit events | R | — | — |

## 6. Identifiers, time and money

- IDs: UUIDv7 (time-ordered) generated by the application. They are exposed in URLs because they are unguessable, but **guessability
  is never the security control** (ownership checks are).
- Time: `Instant` stored as `timestamptz` (UTC). `LocalDate` stored as `date` (target dates, observation dates). Lesson times are entered in the
  tutor's zone. Per-user zone preferences are used for display.
- There is no money anywhere in the domain (SPEC §5.2).

## 7. What is deliberately NOT modelled

Course and enrolment entities (SPEC §6), classes and groups, staff roles, payments, messages, notifications (P2), vocabulary (P2),
availability or booking slots, parent accounts, and exam-specific types (TOEIC or IELTS parts, bands and so on). All of these are either user data or out of scope.
