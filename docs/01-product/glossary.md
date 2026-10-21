# Glossary — Ubiquitous Language

> Use these terms **exactly** in code, API, UI copy and docs. If a term is ambiguous, extend this file before writing code.
> Format: **UI term (vi)** · `CodeName` · definition.

## People and access

| UI (en) | UI (vi) | Code | Definition |
|---|---|---|---|
| Tutor | Gia sư | `Role.TUTOR` | The single owner and teacher account. Has every permission. |
| Student | Học viên | `Role.STUDENT`, `Student` | A learner whose account the tutor created. Sees only their own data. |
| Account | Tài khoản | `UserAccount` | Login identity (username, password hash, role, status). One per tutor or student. |
| Guardian | Phụ huynh | `Guardian` | Contact info for a parent or guardian on a student profile. Not a user. |
| Temporary password | Mật khẩu tạm | `mustChangePassword=true` | A system-generated password shown once; it must be changed at first login. |

## Student workspace

| UI (en) | UI (vi) | Code | Definition |
|---|---|---|---|
| Student workspace | Không gian học viên | *(UI composition)* | The tutor's view of one student: Overview, Plan, Lessons, Work, Materials, Progress, Notes, Profile. |
| Learning profile | Hồ sơ học tập | `LearningProfile` | Level, strengths, weaknesses, learning notes and custom label/value fields. Tutor-only (A-008). UI terms (T-M2.17): Current level · Trình độ hiện tại; Strengths · Điểm mạnh; Weaknesses · Điểm yếu; Learning notes · Ghi chú học tập; Custom fields · Mục tuỳ chỉnh (a row: Label · Nhãn, Value · Giá trị). |
| Metric | Chỉ số | `MetricDefinition` | A tutor-defined measurable quantity, e.g. "TOEIC score" (0–990) or "Speaking fluency" (0–10). |
| Observation | Lần ghi nhận | `MetricObservation` | One measured value of a metric for a student at a point in time (manual, or from an assessment result). |
| Goal | Mục tiêu | `LearningGoal` | What a student is aiming for. Can have a metric with baseline and target, or be qualitative. |
| Learning plan | Lộ trình học | `LearningPlan` | A student's personalised roadmap: ordered **phases**, each with ordered **items**. Not a curriculum. |
| Phase | Giai đoạn | `PlanPhase` | An ordered group of plan items ("Phase 2: Listening"). |
| Plan item | Mục lộ trình | `PlanItem` | A milestone, a free task, or a link to a lesson, an activity or a material. |
| Plan template | Mẫu lộ trình | `PlanTemplate` *(P2)* | A reusable plan skeleton that is copied into a student plan. |
| Private note | Ghi chú riêng | `TeacherNote` | Tutor-only note linked to a student and optionally to a lesson or an activity. **Never** student-visible. |

## Content (reusable, the Library)

| UI (en) | UI (vi) | Code | Definition |
|---|---|---|---|
| Library | Thư viện | `library` module | The tutor's reusable content. Folders and tags are defined by the tutor. |
| Folder | Thư mục | `LibraryFolder` | A tutor-defined tree node. Materials, lesson templates, questions and activities may be filed in folders. |
| Material | Tài liệu | `Material` (`kind` = FILE, RICH_TEXT, LINK, EMBED) | A teaching resource. |
| Lesson template | Mẫu buổi học | `LessonTemplate` | Reusable lesson content built with the Lesson Builder (title, duration, body, materials, suggested homework). |
| Question | Câu hỏi | `Question` | A question-bank item of a registered **question type**. |
| Question type | Dạng câu hỏi | `QuestionType` extension | A plugin-registered type (single choice, audio response…). See the plugin-store spec. |
| Assignment | Bài tập | `Activity(kind=ASSIGNMENT)` | Homework-style activity: instructions, attachments, optional questions, due date. |
| Assessment | Bài kiểm tra | `Activity(kind=ASSESSMENT)` | Quiz, test or mock test: sections, questions, time limit, scoring. |
| Activity | Hoạt động | `Activity` | The **definition** shared by assignments and assessments (ADR-0007). Can be in the library or *ad hoc* (created for one student). |
| Section | Phần | `ActivitySection` | An ordered group of items in an activity. Assignments have one implicit section. |
| Item | Mục | `ActivityItem` | A question reference with points, or an instruction block, placed in a section. |
| Rubric | Tiêu chí chấm | `Rubric` / `RubricCriterion` | Tutor-defined scoring criteria (e.g. Pronunciation /10) on an activity. |

## Student activity (per student, never changes content)

| UI (en) | UI (vi) | Code | Definition |
|---|---|---|---|
| Work | Bài làm / Bài được giao | `StudentActivity` | An activity **assigned** to one student. It holds a frozen **snapshot**, its own due date and status (ADR-0008). |
| Snapshot | Bản chụp | `ActivitySnapshot` | An immutable copy of an activity's structure, questions, answer keys and points at assignment time. |
| Attempt | Lượt làm | `Attempt` | One try at a student activity (start, autosaved responses, submit). |
| Response | Câu trả lời | `Response` | The student's answer to one snapshot item within an attempt. |
| Grade | Điểm | `score` fields | Automatic or manual points per response; totals per attempt. |
| Feedback | Nhận xét | `Feedback` | Tutor's overall comment and rubric scores for an attempt. It is either `DRAFT` or `PUBLISHED`. |
| Anchored comment | Nhận xét gắn mốc | `FeedbackComment` | A comment tied to a response, with an optional anchor ("00:12" or a quoted phrase). |
| Review queue | Chờ chấm | *(query)* | Submitted attempts that need manual grading or publishing. |
| Result | Kết quả | *(view)* | What the student sees after release: score, correctness and feedback, according to the policy. |

## Schedule

| UI (en) | UI (vi) | Code | Definition |
|---|---|---|---|
| Lesson | Buổi học | `LessonSession` | One scheduled or past teaching occurrence with one student (date, time, mode, link, status). |
| Wrap-up | Kết thúc buổi học | `SessionWrapUp` command | A one-screen post-lesson action: status, summary, note, materials, homework, next lesson. |
| Lesson summary | Tóm tắt buổi học | `LessonSession.summaryForStudent` | A **student-visible** record of what was taught. |
| Attendance | Điểm danh | `LessonSession.status` | `SCHEDULED`, `COMPLETED`, `STUDENT_ABSENT`, `CANCELLED` or `RESCHEDULED` (DEC-017). |
| Meeting link | Link học online | `meetingUrl` | A Google Meet or Zoom URL. It is only stored and opened; there is no conferencing (SPEC §5.5). |

## Progress and dashboards

| UI (en) | UI (vi) | Code | Definition |
|---|---|---|---|
| Today | Hôm nay | tutor dashboard | Tutor's daily page: schedule, attention, review queue, recent work, quick actions. |
| Home | Trang chủ | student dashboard | Student's daily page: goals, today's tasks, next lesson, recent results. |
| Needs attention | Cần chú ý | `AttentionRule` | A deterministic rule that flags a student and shows the reason (e.g. two overdue items). |
| Recent student work | Bài làm gần đây | *(query)* | Latest submissions and results. **Do not** call this "activity feed" (it collides with Activity). |

## Engineering terms

| Term | Meaning |
|---|---|
| Module | A Spring Modulith application module (a top-level package under `com.englms`) that owns its tables and API. |
| Task packet | A self-contained work order (`docs/tasks/T-*.md`) that an agent executes on one branch. |
| Evidence | Reproducible proof of a task's results under `evidence/<task-id>/`. |
| LC | Lead Coordinator, the agent role that plans, approves and merges. |
| PO | Product Owner, the human owner who approves product decisions, releases and external actions. |
| HoH | Harness-of-Harnesses: nested plan → implement → independent evaluation loops with persisted state. |
