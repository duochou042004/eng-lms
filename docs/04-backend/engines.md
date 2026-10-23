# Engines Specification — questions, activities, grading, progress, attention

> Status: Baseline v1.0 · Trace: SPEC §15–§20, §25, §27, §32, §33 · ADR-0007, 0008, 0009, 0015.
> Rule: no engine code may branch on exam semantics (TOEIC, IELTS, …) or on `Activity.kind` for grading (ADR-0007).

## 1. Question type contract (`QuestionTypeHandler`, a plugin-store extension point)

```java
public interface QuestionTypeHandler {             // registered as an extension: id like "core.single-choice"
  ExtensionManifest manifest();                    // id, version, displayNameKey, capabilities, schemaVersion
  JsonSchema contentSchema();                      // JSON Schema of `content` (includes answer key)
  JsonSchema answerSchema();                       // JSON Schema of a student's `answer`
  ValidationResult validateContent(JsonNode content);              // semantic rules beyond the schema
  JsonNode toStudentView(JsonNode content, boolean revealAnswers); // redaction (MUST remove keys unless reveal)
  ValidationResult validateAnswer(JsonNode content, JsonNode answer);
  boolean needsManualGrading(JsonNode content);    // e.g. short-answer without accepted answers → true
  GradeResult autoGrade(JsonNode content, JsonNode answer, BigDecimal maxPoints); // pure; deterministic
  JsonNode upgrade(JsonNode content, int fromSchemaVersion);       // content upcaster
}
```

## 2. MVP question types (A-010)

| ID | Content (abridged) | Answer | Auto-grade | Validation highlights |
|---|---|---|---|---|
| `core.single-choice` | `{options:[{key,textHtml,mediaFileId?}], correctKey, shuffle?}` | `{selectedKey}` | full points if equal, else 0 | 2–10 options; exactly one correct; unique keys |
| `core.multiple-choice` | `{options:[…], correctKeys:[…], scoring:ALL_OR_NOTHING\|PROPORTIONAL}` | `{selectedKeys:[…]}` | ALL_OR_NOTHING: exact set. PROPORTIONAL: `max × max(0, (correctSelected − wrongSelected) / \|correct\|)` | ≥ 1 correct; 2–15 options |
| `core.true-false` | `{correct: true\|false}` | `{value}` | equality | — |
| `core.fill-blank` | `{textWithBlanks: "The manager {{1}} the report", blanks:[{id, accepted:[…], match: CASE_INSENSITIVE\|EXACT\|ACCENT_INSENSITIVE}]}` | `{blanks:{id: text}}` | per blank `max/n`, trimmed and whitespace-collapsed | each blank has ≥ 1 accepted answer; placeholders match the blanks |
| `core.short-answer` | `{accepted:[…], match, unmatchedPolicy: MANUAL\|ZERO, maxLength}` | `{text}` | `accepted` empty → **manual**. Answer matches an accepted value → full points. No match → `MANUAL` (default: goes to review) or `ZERO` | maxLength 1–1000 |
| `core.long-answer` | `{minWords?, maxWords?, guidanceHtml?}` | `{text}` | none (manual) | maxWords ≤ 5000 |
| `core.file-upload` | `{maxFiles (1–5), allowedKinds:[DOCUMENT,IMAGE,AUDIO,VIDEO]}` | `{fileIds:[…]}` | none (manual) | per FR-FILE limits |
| `core.audio-response` | `{maxSeconds (10–600), allowUploadFallback}` | `{fileId, durationSeconds}` | none (manual) | duration ≤ maxSeconds + 2 |

Instruction-only items (`item_type=INSTRUCTION`) carry no points and no answer.
P2 types: `core.matching` (`pairs` with distractors, per-pair partial credit), `core.ordering` (exact order, or proportional by longest correct subsequence).

**Redaction rule (tested for each type):** the output of `toStudentView(content, false)` must contain none of `correctKey`, `correctKeys`, `correct`,
`accepted`, or any other answer-bearing field. A generic test serialises every handler's student view for fixture content and greps for the forbidden keys.

## 3. Activity lifecycle (engine)

1. **Define** `Activity` (library or ad hoc): settings, sections, items (question refs + points override), rubric, attachments. Totals: `maxScore = Σ item points`
   (item points = override ?? question.defaultPoints). When `scoreSource=RUBRIC`, `maxScore = Σ criterion max`.
2. **Assign** → one `StudentActivity` per student with a snapshot (ADR-0008). Status ASSIGNED. `availableFrom` and `dueAt` are set per student.
3. **Start attempt** (student): preconditions: `now ≥ availableFrom`; not WITHDRAWN or EXCUSED; no open attempt; `attemptsUsed < maxAttempts + extraAttempts`;
   if `now > dueAt` and not `allowLate` → 409 `ATTEMPT_CLOSED`. Sets `deadlineAt = startedAt + timeLimit` (if set). Status becomes IN_PROGRESS.
4. **Autosave** responses (validated by `validateAnswer`; unknown `itemKey` → 422). Rejected after `deadlineAt + 30 s`.
5. **Submit** (or auto-submit): for each item, `autoGrade` if auto-gradable, otherwise `needsManual`. `late = submittedAt > dueAt`.
   With no manual items → attempt GRADED. If `resultPolicy=IMMEDIATE`, publish automatically. With manual items → NEEDS_REVIEW (appears in the review queue).
6. **Grade** (tutor): set manual scores, override auto scores (grade_audit), rubric scores, comments, draft feedback.
7. **Publish**: requires all items scored. Computes `final_score` per `attemptScoring` over graded attempts. Sets `percent` and `passed`
   (if there is a pass mark) and `released_at`. Calls `goals.ObservationRecorder` if `recordResultAs` is set. Emits `ResultPublished`.
8. **Unpublish / reopen / excuse / withdraw** per domain-model §4.3.

**Auto-submit sweep:** every 60 s, `attempt WHERE status='IN_PROGRESS' AND deadline_at < now() - interval '30 seconds'` → submit as AUTO_SUBMITTED.
Access-time check: any read of an expired open attempt triggers the same submit (idempotent).

**Scores:** `numeric(8,2)`, rounded half-up to 2 decimals at item level. Totals are sums of rounded item scores. The percentage is rounded to 1 decimal for
display. All arithmetic uses `BigDecimal` (no floating point).

## 4. Progress calculations (read model, `progress` module)

| Figure | Definition |
|---|---|
| Work completion | `count(status IN (RELEASED, GRADED)) / count(status NOT IN (EXCUSED, WITHDRAWN))`, restricted to `assigned_at` within the selected range (default: all time) |
| Average % | Mean of `final_percent` of RELEASED work (student view) or RELEASED + GRADED work (tutor view), last N (default all; the card shows the last 5 trend) |
| Assessment series | Released ASSESSMENT results ordered by `released_at`, grouped by `source_activity_id` or by a tutor-chosen tag |
| Attendance (90 days) | Counts of COMPLETED, STUDENT_ABSENT, CANCELLED among lessons with `starts_at` in [now − 90 d, now] |
| Goal progress | ADR-0015 formula (FR-GOAL-05) |
| Plan completion | Items with status COMPLETED / (all items − SKIPPED) per ACTIVE plan |
| Metric bars | SCALE metric latest value relative to `[min, max]`; label shows the value (e.g. "6.5 / 10") |

Every figure has a fixture-based unit test with a hand-computed expected value. The UI links each figure to the records behind it.

## 5. Attention rules (dashboard module, pure functions)

```text
AttentionRule(id, evaluate(StudentSnapshot, Settings, Clock) -> Optional<AttentionReason>)
OVERDUE_WORK       : overdueCount >= settings.overdueThreshold (default 2)                → "2 overdue assignments"
NO_RECENT_LESSON   : status=ACTIVE ∧ lastCompletedLesson older than N days (14) ∧ no upcoming lesson → "No lesson for 16 days"
LOW_RESULTS        : last K (3) released results all < passMark (or < 50% without a pass mark) → "Last 3 results below pass mark"
PLAN_BEHIND        : ∃ active-plan phase/item with target_date < today ∧ status ∉ {COMPLETED, SKIPPED} → "Phase 'Listening' past target date"
```

PAUSED and ARCHIVED students are skipped. Each rule is unit-tested at its threshold boundaries. The tutor can adjust thresholds (FR-SET-01). There are no ML or AI signals (SPEC §5.4).
