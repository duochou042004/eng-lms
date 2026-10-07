# Validation Rules

> Layering: api-conventions.md §8. Messages are i18n keys (`validation.<code>`). Strings are trimmed before validation; empty after
> trim = absent. Lengths count Unicode code points. "text" = plain, "html" = sanitised rich text (the limit applies to the sanitised output).

## Common

| Field type | Rule |
|---|---|
| Title / name | text, 1–200 |
| Description | text, 0–2,000 |
| Rich text (`*Html`) | html, 0–100,000 chars after sanitisation |
| Tag | text 1–40, no commas or control characters; ≤ 20 tags per item; case-insensitive deduplication |
| URL | http/https, ≤ 2,048, valid host |
| Email | RFC 5322 (pragmatic), ≤ 254 |
| Phone | 6–20 characters from `[0-9 +().-]` |
| Label/value lists (custom fields, contact handles, metadata) | label 1–60, value 0–500, ≤ 30 entries |
| Position lists (`order` PUT) | the full set of current child IDs, no duplicates |
| `version` | required on update, integer ≥ 0 |

## identity / students

| Field | Rule |
|---|---|
| username | 3–40, `^[a-z0-9._-]+$` after lowercasing, unique among normalised usernames (case- and accent-insensitive) |
| password (new) | 10–128; not in the common list; ≠ username; ≠ current |
| fullName | text 1–120 |
| student note | text 0–2,000 (T-M2.3; the "Description" limit) |
| student email / phone / contact handles | the "Common" rules (contact handles: label 1–60, value 0–500, ≤ 30 entries); field codes api-conventions §5 |
| student status transition | per domain-model §4.1 |
| guardian.name | 1–120; relationship 0–40 |
| learningProfile.currentLevel | 0–40 |
| strengths / weaknesses | tags (≤ 30 each) |

## goals

| Field | Rule |
|---|---|
| metric.valueType SCALE | `min < max`, both required |
| metric.decimals | 0–3 |
| goal.baseline / target | within the metric range (if a metric is set); `target ≠ baseline` |
| goal.targetDate | ≥ goal creation date (warning only if in the past on edit) |
| observation.value | within the metric range; decimals ≤ `metric.decimals` |
| observation.observedOn | ≤ today + 1 day (time-zone tolerance) |

## plans

| Field | Rule |
|---|---|
| phase and item title | 1–200 |
| item link | exactly the field matching `kind` is set (LESSON → lessonSessionId, …), and the target belongs to the **same student** as the plan |
| move | target phase must be in the same plan |

## library / files

| Field | Rule |
|---|---|
| folder.name | 1–80, unique among siblings (case-insensitive); no `/` |
| folder move | target ≠ self and ≠ descendant |
| material kind FILE | `fileId` refers to an unattached or same-owner file with purpose MATERIAL |
| material kind EMBED | URL parses to an allow-listed provider (security.md §6) |
| file upload | security.md §7 + files-and-storage.md §2 |

## lessons

| Field | Rule |
|---|---|
| startsAt | required. A new lesson more than 1 year in the past or future → 422 |
| durationMinutes | 5–600 |
| mode ONLINE | `meetingUrl` optional but must be a valid URL if present |
| mode OFFLINE | `location` 0–200 |
| transition | per domain-model §4.2; the reopen window is 7 days |
| wrap-up | status ∈ {COMPLETED, STUDENT_ABSENT, CANCELLED}; homework `dueAt` > now; next lesson validated like a new lesson |

## questions

| Field | Rule |
|---|---|
| type | a registered and **enabled** extension ID (for create) |
| content | JSON Schema of the type + `validateContent` |
| defaultPoints | 0.5–1,000, step 0.5 |
| promptHtml | html 1–20,000 |

## activities

| Field | Rule |
|---|---|
| sections (ASSESSMENT) | 1–20 sections; items per activity ≤ 300 |
| sections (ASSIGNMENT) | exactly 1 (implicit); the UI hides section chrome |
| item points override | 0.5–1,000, step 0.5 |
| settings.timeLimitMinutes | 1–600 or null |
| settings.maxAttempts | 1–10 |
| settings.passMarkPercent | 0–100 or null |
| settings.responseModes (ASSIGNMENT) | at least one of TEXT, FILE, QUESTIONS |
| rubric | ≤ 12 criteria; name 1–60; maxPoints 1–100 |
| recordResultAs.metricId | an existing, non-archived metric |
| assignment dueAt | > availableFrom (if both are set) |
| grade score | 0 ≤ score ≤ item max; step 0.5 (policy `grading.step`, default 0.5) |
| feedback comment anchor | ≤ 40 characters |
| feedback body | text ≤ 10,000 |

## notes

| Field | Rule |
|---|---|
| body | text 1–10,000 (Markdown subset) |
| links | the linked lesson or student activity belongs to the note's student |
