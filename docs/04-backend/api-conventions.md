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
- Unknown or invalid list parameters (T-M2.3): an unknown `sort` field or direction, an unknown filter value (e.g. `status`), `page < 0` or `size`
  outside 1–100 → 422 `VALIDATION_FAILED` with `errors[].field` = the parameter name (`sort`, `status`, `page`, `size`) and code `INVALID_VALUE`.
  The parameters are bound as strings and checked by the handler. As built: `shared.web.PageResponse`.

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
| 401 | `UNAUTHENTICATED`, `SESSION_EXPIRED` | No valid session: `UNAUTHENTICATED` without a session cookie (and for every failed login), `SESSION_EXPIRED` when the cookie names no live session (unknown, idle-expired, logged out), when the session's account is no longer `ACTIVE` (the session is invalidated, SEC S4-1) and when a student principal has no student row (`CurrentStudent`; the session is invalidated). **Live** (T-M2.1; T-M2.3) |
| 403 | `FORBIDDEN_ROLE`, `PASSWORD_CHANGE_REQUIRED`, `CSRF_INVALID` | Wrong namespace or role, gate, missing or wrong `X-XSRF-TOKEN`. **Live** (T-M2.1) |
| 404 | `NOT_FOUND` | Missing **or not owned** (students always get 404 for foreign resources) |
| 409 | `STALE_VERSION`, `IN_USE`, `INVALID_STATE_TRANSITION`, `ORDER_MISMATCH`, `USERNAME_TAKEN`, `ATTEMPT_CLOSED`, `ATTEMPT_IN_PROGRESS`, `NO_ATTEMPTS_LEFT` | Conflicts with the current state |
| 413 / 415 | `FILE_TOO_LARGE`, `FILE_TYPE_NOT_ALLOWED` | Upload limits |
| 422 | `VALIDATION_FAILED` (+ `errors[]`) | Semantic validation |
| 423 | — | **Not used.** Login answers the generic 401 `UNAUTHENTICATED` while an account is locked: a 423 would reveal that the account exists (security.md T16; DEC-089 (6), confirmed DEC-091) |
| 429 | `RATE_LIMITED` (+ `Retry-After` in seconds) | Throttling: more than 30 login attempts from one IP within 5 minutes (instance-local). **Live** (T-M2.1) |
| 500 | `INTERNAL_ERROR` (no stack traces; `requestId` for support) | Unexpected |

The `code` values form a closed enum in `shared.ProblemCodes`, exported in OpenAPI. The frontend maps codes to i18n messages. **Do not show `detail` directly to users.**

**Field codes** (`errors[].code`, also in `shared.ProblemCodes`; T-M2.1): `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_TOO_COMMON`, `PASSWORD_EQUALS_USERNAME`,
`PASSWORD_UNCHANGED` (field `newPassword`) and `CURRENT_PASSWORD_INCORRECT` (field `currentPassword`). Each entry is `{field, code, message}`; `message` is English for developers.
**Field codes since T-M2.3** (students): `REQUIRED` (missing or empty after trim), `TOO_LONG`, `TOO_MANY` (list entries), `INVALID_FORMAT` (email,
phone), `INVALID_VALUE` (unknown enum or list parameter), `USERNAME_INVALID` (validation-rules username rule), `USERNAME_TAKEN` (with the top-level
409 `USERNAME_TAKEN`, `errors[0].field = "username"`); list fields are named with an index (`contactHandles[2].label`). Top-level 409 codes live since
T-M2.3: `USERNAME_TAKEN`, `STALE_VERSION` (also an optimistic-locking failure at flush), `INVALID_STATE_TRANSITION`.
Application code throws `shared.ProblemException` (status, code, field errors, `Retry-After`); `ProblemDetailsAdvice` maps it.

**Where Problem Details come from (T-M1.8):**
- Errors inside the application: `shared.web.ProblemDetailsAdvice`.
- Answers of the security filter chain (401/403 from the entry point, access-denied handler and must-change gate): `shared.web.ProblemResponses.write`, same shape.
- Requests Spring Security's firewall rejects (raw dot-segments such as `/./api/v1/meta`, a `;` in the path, `TRACE`, …; T-M2.1): `ProblemResponses.writeRejected` with
  400 `MALFORMED_REQUEST` (405 `METHOD_NOT_ALLOWED` for a forbidden method), the same headers and body as the valve below, no `instance`.
- Requests Tomcat rejects on the application port before any filter runs (an encoded `/` in the path, a raw `<` in the query string, …): `shared.web.ProblemDetailsErrorReportValve`.
  It returns Tomcat's status (usually `400`; also e.g. `417` for a bad `Expect`, `501`/`505` for unsupported transfer codings or HTTP versions) with `MALFORMED_REQUEST` for
  4xx and `INTERNAL_ERROR` for 5xx, `Cache-Control: no-store`, the security headers and `X-Request-Id`, with no `instance` and no `detail`, so the rejected input is never echoed.
  It writes only for an error nobody has reported yet and with no body (Tomcat's own guard).
  Residual cases (T-M1.8 QA F4/F5): when Tomcat fails on the **request line** (a raw `<` in the query, a raw `\` in the path), it never parses the headers, so a valid incoming
  `X-Request-Id` can't be reused and a new one is generated. `OPTIONS *` is answered by Tomcat itself with no request ID or headers. `TRACE`: 405 from the firewall (security.md §5, T-M2.1).
- The management port (:8081) also carries `X-Request-Id`, and its Problem Details carry the `requestId`. It carries no security headers (DEC-050), and Tomcat-level rejections
  there keep Tomcat's minimal report (loopback/internal only).

## 6. Concurrency and idempotency

- Aggregates expose `version`. Updates must send it (in the body for PUT/PATCH). A mismatch → 409 `STALE_VERSION`, and the UI offers reload or merge.
- Composite or retry-prone commands (`/lessons/{id}/wrap-up`, `/tutor/students` create, `/attempts/{id}/submit`, uploads) accept the header
  `Idempotency-Key: <uuid>`. The same key and body within 24 h return the stored response. The same key with a different body → 422 `IDEMPOTENCY_KEY_REUSED`.
  `/tutor/students` create gets it with the idempotency store (T-M5.4; until then a retried create answers 409 `USERNAME_TAKEN` and the tutor resets the
  password): a replay must never return the stored temporary password in clear (T-M2.3 known limitation, DEC-099).
- Autosave `PUT /student/attempts/{id}/responses/{itemKey}` is naturally idempotent (last write wins within an open attempt).

## 7. Security headers and caching

- API responses: `Cache-Control: no-store` (every `/api/**` response, also 4xx/5xx Problem Details; a Spring Security header writer since T-M2.1, DEC-070). Static hashed assets: `public, max-age=31536000, immutable`. `index.html`: `no-cache`.
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
