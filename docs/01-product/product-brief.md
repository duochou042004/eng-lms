# Product Brief — Private 1:1 Teaching Workspace

> Status: **Baseline v1.0 (awaiting Product Owner approval)** · Source: SPEC §1–§3, §6, §45, §51, §55–§61 · Owner: Lead Coordinator

## 1. One-sentence definition (SPEC §57)

A private workspace where **one tutor** runs 1:1 English teaching. The tutor creates, organises, personalises and manages
content, lessons, homework, tests, learning plans and progress for each student. No fixed curriculum or workflow is imposed.

## 2. North Star (SPEC §61)

> Does this make it easier for a single tutor to run 1:1 teaching than **Zalo + Google Drive + Word/PDF + Zoom/Meet + Sheets**?

A feature that adds complexity without clear value for the tutor's daily work is **not built, or is postponed**.

**Product character (SPEC §55):** *"A private teacher's digital workspace"*, not *"a giant LMS"*. A tutor opens it and can
immediately answer these questions:

| Question | Where it is answered |
|---|---|
| Who am I teaching today? | Today page: schedule |
| What does this student need? | Student workspace: overview (goals, attention reasons, plan position) |
| What did we do last time? | Student workspace: lesson history and last summary and notes |
| What should I teach next? | Learning plan: current phase and next items |
| What homework is pending? | Today page: Review queue and the student's Work tab |
| What result did the student get? | Student work results and Progress |
| Where is the material? | Library search, plus the materials attached to a lesson or activity |
| How is this student progressing? | Student progress: goals, metrics, scores, attendance |

## 3. Users (SPEC §3)

| Role | Count | Description |
|---|---|---|
| `TUTOR` | exactly **1** per deployment | Owner, administrator, teacher, content manager and student manager in one account. Has every permission. |
| `STUDENT` | ≤ ~200 accounts (A-001) | Created by the tutor. Logs in and sees **only their own** data. Cannot register. |

There are no other roles: no admin, staff, assistant, parent or branch manager (SPEC §3.1, §5.3, §5.6).

## 4. Core model (SPEC §6, §7, §56)

The centre of the product is the **Student Workspace**, not `Course → Module → Lesson`.

```text
TUTOR ─┬─ STUDENTS ── each: Profile · Goals · Learning Plan · Lessons · Work (assignments/assessments)
       │                    · Materials · Progress · Private Notes
       ├─ LIBRARY (reusable) ── Materials · Lesson templates · Questions · Assignments · Assessments
       └─ SCHEDULE ── Lessons (sessions) · attendance
```

Reusable **content** is separate from per-student **activity** (SPEC §15, §32). What a student does never changes the
original content.

## 5. Design principles (SPEC §2, §33, §40, §54)

1. **Tools, not a curriculum.** Nothing that is English-specific or exam-specific (TOEIC, IELTS, THPT…) is hard-coded. Those are *data the tutor enters*.
2. **Generic engine, user-defined content.** Lesson, Activity, Question, Material, Goal, Metric and LearningPlan are generic.
3. **Tutor-first, few clicks.** The after-lesson flow and the add-student flow have step budgets (see `docs/05-frontend/ux-flows.md`).
4. **No mandatory setup.** A student can exist with nothing configured. Everything is progressive.
5. **Progressive complexity.** Simple options first; advanced settings only when needed.
6. **Avoid enterprise UI.** No school-ERP menus and no dashboards made of vanity charts.
7. Non-functional priority order: **Simplicity > Flexibility > Correctness > Security > Maintainability > UX > Performance > Scalability**.

## 6. Success criteria (SPEC §51)

- **The tutor can** create and manage students, see profiles, build personalised plans, create, organise and reuse content, create assignments and assessments, grade, give feedback, schedule lessons, record lesson history and see progress.
- **A student can** log in, view their plan, lessons and materials, complete and submit work, and view results, feedback and progress.
- **Critical:** the tutor is **never forced** into a curriculum or workflow that does not fit an individual student.
- **Adoption signal (A-019):** in User Acceptance Testing (UAT), the tutor can finish the after-lesson wrap-up in ≤ 60 s and the add-student flow in ≤ 90 s, without guidance.

## 7. What this is NOT (SPEC §45, §5)

It is not an English centre, a school LMS, a tutor marketplace, a multi-tenant SaaS, a booking platform, a payment platform, a social network,
a video-conferencing app, a Google Drive replacement, an AI tutor, or a platform of pre-built TOEIC or IELTS content. Full list and handling procedure:
[`scope.md`](scope.md).
