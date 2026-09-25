# Module Boundaries and Contracts

> Enforced by Spring Modulith `ApplicationModules.of(EngLmsApplication.class).verify()` and ArchUnit rules (test-strategy.md §4).
> Package convention per module `com.englms.<module>`:
>
> | Package | Visibility | Contents |
> |---|---|---|
> | `<module>` (root) | **Public API** | `*Api` interfaces/facades, API records (IDs, views), enums used across modules |
> | `<module>.events` | **Public** (`@NamedInterface("events")`) | Immutable event records |
> | `<module>.internal.domain` | internal | Aggregates, entities, value objects, domain services |
> | `<module>.internal.app` | internal | Application services (`@Transactional`), command handlers |
> | `<module>.internal.persistence` | internal | Spring Data repositories, JPA converters |
> | `<module>.internal.web.tutor` / `.web.student` | internal | REST controllers + request/response DTOs, split by audience |
>
> Rules: (1) no module touches another module's `internal` package or tables; (2) no JPA associations across modules, only
> IDs (`UUID` value types); (3) cross-module reads go through the API, never shared repositories; (4) DB foreign keys across
> modules **are allowed** for integrity (DEC-024), but queries must not join another module's tables (exceptions: the read-only
> `progress` and `dashboard` modules may use SQL views declared in their own migrations and documented here).

## identity
- **Owns:** `user_account`, Spring Session tables, `persistent_logins`, login throttling state.
- **API:** `AccountApi.createStudentAccount(username, rawTempPassword, locale)`, `resetPassword(userId)`, `disable/enable(userId)`,
  `changeUsername`, `CurrentUser` (principal accessor: `userId`, `role`, `studentId?`), `SessionTerminator.endAllSessions(userId)`.
- **Events:** `LoginSucceeded`, `LoginFailed`, `PasswordChanged`, `PasswordReset`, `AccountDisabled`.
- **Depends on:** shared, settings.

## students
- **Owns:** `student`, `student_guardian`, `student_learning_profile`.
- **API:** `StudentDirectory.require(studentId)`, `summary(studentId)`, `findActive()`, `studentIdForUser(userId)`; create/update commands.
- **Events:** `StudentCreated`, `StudentStatusChanged`.
- **Depends on:** identity, shared.

## goals
- **Owns:** `metric_definition`, `learning_goal`, `metric_observation`.
- **API:** `GoalsApi.goalsFor(studentId, audience)`, `observationsFor(...)`, `latestValue(studentId, metricId)`,
  `MetricsApi.requireMetric(metricId)` (validation), `ObservationRecorder.upsertFromSource(studentId, metricId, value, sourceRef)` /
  `removeBySource(sourceRef)` (idempotent by `sourceRef`).
- **Depends on:** students, shared. It knows nothing about activities. The activities module calls the recorder synchronously inside
  the publish/unpublish transaction (DEC-025), so there is no event round-trip and no cycle.

## plans
- **Owns:** `learning_plan`, `plan_phase`, `plan_item`, `plan_goal` (P2: `plan_template*`).
- **API:** `PlansApi.plansFor(studentId, audience)`, `progressSummary(studentId)`.
- **Depends on:** students, goals (goal IDs), lessons / activities / library (validating link targets and resolving titles and statuses via APIs).

## library
- **Owns:** `library_folder`, `material`, `material_share`, and tag suggestion views.
- **API:** `LibraryApi.requireMaterial`, `materialsVisibleTo(studentId)`, `attach/validate material refs`, `FolderApi`, `TagSuggestions`.
- **Provides:** a `FileAccessResolver` implementation (material files are readable by students with a share).
- **Depends on:** files, students, shared.

## files
- **Owns:** `stored_file`, and the storage volume.
- **API:** `FilesApi.store(stream, meta, purpose, owner)`, `open(fileId)`, `markAttached(fileId)`, `delete`. SPI: `FileAccessResolver`
  (each module answers "may student S read file F?"; the files module denies unless some resolver grants).
- **Depends on:** shared only (it is at the bottom of the graph).

## lessons
- **Owns:** `lesson_template`, `lesson_template_material`, `lesson_template_homework`, `lesson_session`, `lesson_session_material`, `idempotency_record` (shared table, owned here first; may move to shared).
- **API:** `LessonsApi.upcomingFor(studentId)`, `historyFor`, `requireSessionOf(studentId, sessionId)`; the `WrapUpService` orchestration.
- **Provides:** a `FileAccessResolver` (files of materials attached to a student's lessons).
- **Depends on:** students, library, activities (assign), notes (create note), files, shared.

## notes
- **Owns:** `teacher_note`.
- **API:** `NotesApi.create(...)`, `notesFor(studentId, filter)`. **There is no student-audience method, by design.**
- **Depends on:** students, shared **only**. `lessons` calls `notes` (wrap-up), so `notes` must not depend on `lessons` or
  `activities`. Link targets (lesson or activity IDs) are stored as plain IDs. The module that **owns the link target**
  validates it and calls `NotesApi`: `POST /tutor/lessons/{id}/notes` lives in `lessons`,
  `POST /tutor/student-activities/{id}/notes` lives in `activities`. The `notes` module itself only exposes
  student-level endpoints (`/tutor/students/{sid}/notes`) and edit or delete by note ID.

## questions
- **Owns:** `question`, `question_attachment`.
- **API:** `QuestionsApi.snapshotOf(questionIds)` (content + answer key, for building activity snapshots), `search`, `QuestionTypeRegistry`.
- **Extension point:** `QuestionTypeHandler` (plugin-store-spec §4.1).
- **Depends on:** library (folder IDs), files, shared.

## activities
- **Owns:** `activity`, `activity_section`, `activity_item`, `activity_attachment`, `student_activity`, `attempt`, `response`,
  `feedback`, `feedback_comment`, `grade_audit`.
- **API:** `ActivitiesApi.assign(activityId, students, dates)`, `quickCreateAndAssign(...)`, `workFor(studentId, audience)`,
  `resultsSummary(studentId)`, `reviewQueue()`.
- **Events:** `AttemptSubmitted`, `ResultPublished`, `ResultUnpublished`, `GradeOverridden`.
- **Provides:** a `FileAccessResolver` (attachments of a student's work; the student's own response files).
- **Depends on:** questions, library, files, students, goals (metric validation and result → observation), notes (notes linked to work), shared.

## progress (read-only)
- **Owns:** SQL views only (`v_student_work_stats`, …) declared in its own migrations.
- **API:** `ProgressApi.forStudent(studentId, audience)`, `overview()`.
- **Depends on:** students, goals, plans, lessons, activities (APIs), shared.

## dashboard (read-only)
- **Owns:** nothing persistent (attention thresholds are read from settings).
- **API/web:** Today (tutor), Home (student). `AttentionRules` are pure functions over data fetched through the APIs.
- **Depends on:** progress, lessons, activities, goals, students, settings, shared.

## settings
- **Owns:** `workspace_setting` (typed key/value), `extension_state`.
- **API:** `SettingsApi.get(Key<T>)`, `ExtensionStateApi.isEnabled(extensionId)`.
- **Depends on:** shared.

## audit
- **Owns:** `audit_event` (append-only).
- **API:** `AuditApi.record(...)` (for synchronous security events such as login), `recent(filter)`.
- **Listens:** security and content events from the other modules.
- **Depends on:** shared (and `*.events` packages).

## shared (kernel, `@ApplicationModule(type = OPEN)` or a shared module per the Spring Modulith docs)
- IDs (`StudentId`, `UserId`, … as records wrapping UUIDs), `Clock` provider, `ProblemCodes`, paging types, `HtmlSanitizer`,
  `Audience {TUTOR, STUDENT}`, `CurrentStudent` argument resolver, and the `extension` registry core (`ExtensionPoint`, `ExtensionManifest`).
- **Rule:** shared contains **no business rules** of any module. Additions need LC review.

## Allowed dependency graph (checked in CI)

```text
dashboard → progress, lessons, activities, goals, students, settings
progress  → students, goals, plans, lessons, activities
plans     → students, goals, lessons, activities, library
lessons   → students, library, activities, notes, files
activities→ questions, library, files, students, goals, notes
questions → library, files
goals     → students
notes     → students
library   → files, students
students  → identity
identity  → settings
audit     → (events only)
all       → shared
```
