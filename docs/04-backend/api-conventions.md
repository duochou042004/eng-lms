# API Conventions

> Applies to every endpoint. Deviations need a DEC entry. Contract source of truth: the generated `api/openapi.json` (ADR-0014).

## 1. Base, namespaces, versioning

| Prefix | Audience | Gate |
|---|---|---|
| `/api/v1/auth/**` | public and authenticated | login, logout, session, password |
| `/api/v1/meta` | public | app version, enabled locales, workspace display name (no secrets) |
| `/api/v1/tutor/**` | TUTOR | role gate + `@Audience(TUTOR)` |
| `/api/v1/student/**` | STUDENT | role gate + `@Audience(STUDENT)`; **no `studentId` parameters** (ADR-0016) |

The version lives in the path (`v1`). Breaking changes → `v2` routes side by side (not expected before Release 2). Additive changes are fine in `v1`.

## 2. Resources and methods

- Plural nouns, kebab-case: `/tutor/lesson-templates`, `/tutor/student-activities/{id}`.
- `GET` (safe), `POST` (create or command), `PUT` (full replace of a document, e.g. an activity definition or an ordering), `PATCH` (partial update,
  JSON merge semantics on a DTO with optional fields), `DELETE`.
- **Commands** that are not CRUD use `POST /resource/{id}/<verb>`: `/lessons/{id}/complete`, `/attempts/{id}/submit`, `/attempts/{id}/publish`.
- Nested routes only for true containment (`/tutor/students/{sid}/goals`). Single resources are addressed flat by ID (`/tutor/goals/{goalId}`).
- Reordering: `PUT /…/order` with `{ "ids": [..complete ordered list..] }`. Missing or foreign IDs → 409 `ORDER_MISMATCH`.

## 3. Representation

- JSON, UTF-8, camelCase fields. IDs are UUID strings.
- Instants: ISO-8601 UTC (`2026-09-25T12:00:00Z`). Dates: `YYYY-MM-DD`. Durations: integer minutes (`durationMinutes`).
- Enums: UPPER_SNAKE strings. New enum values are additive, and clients must handle unknown values gracefully.
- Nullable vs absent: responses always include fields (with `null`). PATCH requests treat absent as "unchanged" and `null` as "clear" (where allowed).
- Rich text fields end in `Html` and are sanitized on write. Plain text fields are never interpreted as HTML.
- Money: none.

## 4. Lists: pagination, sorting, filtering

- Query params: `page` (0-based), `size` (default 25, max 100), `sort=field,asc|desc` (allow-listed per endpoint), filter params per endpoint (e.g. `status`, `q`, `tag`).
- Response: `{ "items": [...], "page": 0, "size": 25, "totalItems": 123, "totalPages": 5 }`.
- Small bounded collections (e.g. goals of a student, folders tree) return plain arrays without paging, and are documented as bounded.

## 5. Errors: RFC 9457 Problem Details

`Content-Type: application/problem+json`:

```json
{ "type": "https://englms.local/problems/validation", "title": "Validation failed", "status": 422,
  "code": "VALIDATION_FAILED", "detail": "2 fields are invalid", "instance": "/api/v1/tutor/students",
  "requestId": "01J…", "errors": [ { "field": "username", "code": "USERNAME_TAKEN", "message": "…" } ] }
```

| HTTP | `code` examples | When |
|---|---|---|
| 400 | `MALFORMED_REQUEST` | Unparseable JSON, wrong types |
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED` | No valid session |
| 403 | `FORBIDDEN_ROLE`, `PASSWORD_CHANGE_REQUIRED`, `CSRF_INVALID` | Wrong namespace or role, gate |
| 404 | `NOT_FOUND` | Missing **or not owned** (students always get 404 for foreign resources) |
| 409 | `STALE_VERSION`, `IN_USE`, `INVALID_STATE_TRANSITION`, `ORDER_MISMATCH`, `USERNAME_TAKEN`, `ATTEMPT_CLOSED`, `ATTEMPT_IN_PROGRESS`, `NO_ATTEMPTS_LEFT` | Conflicts with the current state |
| 413 / 415 | `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED` | Upload limits |
| 422 | `VALIDATION_FAILED` (+ `errors[]`) | Semantic validation |
| 423 | `ACCOUNT_LOCKED` (generic message) | Lockout |
| 429 | `RATE_LIMITED` (+ `Retry-After`) | Throttling |
| 500 | `INTERNAL_ERROR` (no stack traces; `requestId` for support) | Unexpected |

The `code` values form a closed enum in `shared.ProblemCodes`, exported in OpenAPI. The frontend maps codes to i18n messages. **Do not show `detail` directly to users.**

**Where Problem Details come from (T-M1.8):**
- Errors inside the application: `shared.web.ProblemDetailsAdvice`.
- Requests Tomcat rejects on the application port before any filter runs (an encoded `/` in the path, a raw `<` in the query string, …): `shared.web.ProblemDetailsErrorReportValve`.
  It returns `400`, `MALFORMED_REQUEST`, `Cache-Control: no-store`, the security headers and `X-Request-Id`, with no `instance` and no `detail`, so the rejected input is never echoed.
- The management port (:8081) also carries `X-Request-Id`, and its Problem Details carry the `requestId`. It carries no security headers (DEC-050), and Tomcat-level rejections
  there keep Tomcat's minimal report (loopback/internal only).

## 6. Concurrency and idempotency

- Aggregates expose `version`. Updates must send it (in the body for PUT/PATCH). A mismatch → 409 `STALE_VERSION`, and the UI offers reload or merge.
- Composite or retry-prone commands (`/lessons/{id}/wrap-up`, `/tutor/students` create, `/attempts/{id}/submit`, uploads) accept the header
  `Idempotency-Key: <uuid>`. The same key and body within 24 h return the stored response. The same key with a different body → 422 `IDEMPOTENCY_KEY_REUSED`.
- Autosave `PUT /student/attempts/{id}/responses/{itemKey}` is naturally idempotent (last write wins within an open attempt).

## 7. Security headers and caching

- API responses: `Cache-Control: no-store`. Static hashed assets: `public, max-age=31536000, immutable`. `index.html`: `no-cache`.
- CSRF header `X-XSRF-TOKEN` is required on unsafe methods (ADR-0005).
- Every response carries `X-Request-Id` (generated if absent, also logged).

## 8. Validation layering

1. DTO Bean Validation (types, lengths, formats) → 422 with field errors.
2. Application checks (existence, ownership, references) → 404 or 409.
3. Domain invariants (state transitions, ranges) → 409 or 422.
4. Database constraints are the last line of defence. A violation maps to 409 and is logged as a bug (it should have been caught earlier).

Rules per field: [`validation-rules.md`](validation-rules.md).

## 9. Controller rules (for agents)

- Controllers are thin: map DTO → command, call **one** application service method, map result → DTO. No repositories, no business logic, and no
  `@Transactional` in controllers.
- Every handler has an `@Audience` annotation, `@Operation(summary)`, documented error codes, and at least one API test plus an authz-matrix entry.
- There are two controller classes when both audiences need a resource (`TutorLessonController`, `StudentLessonController`).
