QA-VERDICT T-M2.10: PASS

# T-M2.10 QA (G3, tier H, after SEC), head `b146ae3` (code head `c106861`)

> Recorded by the LC from the qa-evaluator agent's returned text (fresh context, 2026-11-20, about 25 min; 90,979 tokens).

## Summary
In black-box HTTP testing, every non-integer `version` on all four endpoints with a `version` field (student PATCH, guardian PATCH, learning-profile
PUT on an existing profile and on a first creation, status POST) was refused with 400 `MALFORMED_REQUEST` and the standard problem body, and nothing
changed after a refusal. Positive controls and the stale 409 work as before; the AC6 test passed 20/20. **T-M2.9 F3 is closed.** No S1–S4 findings.
Other-scalar coercions are recorded for OQ T-M2.10-1, not judged against this packet.

## Environment
- Branch `fix/T-M2.10-strict-json-numbers` at `b146ae3`; working tree clean before and after.
- The Boot jar built from this head (`mvnw package -Dmaven.test.skip=true`, API only) on :8080/:8081, on a throwaway `docker.io/library/postgres:18`
  container (`qa-t-m2-10-db`, 127.0.0.1:55433, Flyway schema; stopped and removed). The dev DB was not touched; `.env*`/`.data/**` not read.
- Test data through the API only (bootstrap tutor `qa-tutor`, students `qa-stu-a`, `qa-stu-b`, one guardian, a learning profile on A, `qa-oq-*`).
- Podman via `scripts/env.sh`. No gate run.

## What was run
1. **Refusal tables:** `version: X` plus a marker string, GET read-back before and after; status, `code`, `Content-Type`, keys,
   `requestId` = `X-Request-Id`, and a leak grep (marker, "jackson", "deserializ", "coerc", "Cannot", "line:", "column"). X: `0.7`, `3.9`, `1.0`,
   `0.0`, `-0.0`, `1e0`, `1e2`, `0e0`, `1E+0`, `"1"`, `"0"`, `""`, `" "`, `"0.7"`, `"1e0"`, `true`, `false`, `[0]`, `{}`, `9223372036854775808`,
   `99999999999999999999999999`, `-9223372036854775809`, `1e400`, plus `-1`, `-9223372036854775808`, `9223372036854775807`, `null`, absent.
   Endpoints: `PATCH /tutor/students/{sid}`, `PATCH /tutor/guardians/{gid}`, `PUT /tutor/students/{sid}/learning-profile` (existing and first),
   `POST /tutor/students/{sid}/status`.
2. **Positive controls** on all four (current integer → success, stale → 409; profile `null`/absent first creation, `null` after → 409, DEC-103).
3. **Other-scalar probes** (OQ T-M2.10-1): `POST /tutor/students`, guardian `POST`, student PATCH `note`, status `status`, `POST /auth/login`.
4. **Order and isolation:** anonymous/no-CSRF with a bad body; unknown `sid`; student B sending `version: 0.7` to A's tutor resources and `/student/…`.
5. **AC6 ×20** fail-fast (`AuthApiIntegrationTest#anUnrelatedLogin*`; surefire: 1 test per run).
6. **App log:** 0 ERROR lines, no marker or input value logged.
7. **Scope:** `git diff --stat develop...HEAD`: one config class in `shared/web`, three test classes, two doc lines, evidence and records.

## Results
| Check | Result |
|---|---|
| AC1 student PATCH, the 23 non-integer values | 400 `MALFORMED_REQUEST` each; `application/problem+json`; keys exactly `type,title,status,instance,code,requestId`; no `detail`; `requestId` = `X-Request-Id`; no leak; read-back identical (version, note, `updatedAt`) |
| AC2 guardian PATCH | same; guardian list unchanged |
| AC3 profile PUT, existing | same; profile unchanged |
| AC3 profile PUT, first creation | same; B's profile stays empty |
| Status POST (QA focus) | same; status and version unchanged |
| Negative in range (`-1`, `Long.MIN`) | 422 `VALIDATION_FAILED` (`version`, `INVALID_VALUE`) on all four; existing behaviour |
| `Long.MAX` | 409 `STALE_VERSION` on all four |
| Beyond the long range, `1e400` | 400 `MALFORMED_REQUEST`; no 500 |
| `null`/absent on student PATCH, guardian PATCH, status POST | 422 `REQUIRED` (unchanged) |
| AC4 positive controls | student v0 → 200 v1, stale → 409; guardian likewise; profile v1 → 200 v2, stale → 409, `null` on existing → 409; first PUT absent → 200 v1, then `null` → 409; status v1 → 200 PAUSED v2, stale → 409, v2 → 200 ACTIVE v3 |
| Order of checks | anonymous/no CSRF + bad body → 403 `CSRF_INVALID`; student B + bad body on tutor routes → 403 `FORBIDDEN_ROLE` (authz before binding, no parse oracle); tutor, unknown `sid`: bad body → 400, integer body → 404 |
| Isolation | student B: 403 on A's tutor resources, 404 on `/student/students/{A}` and `/student/me`; no `SECRET-`, marker or A data |
| AC6 ×20 | 20/20 passed (about 30 s per run) |
| T-M2.9 F3 | closed: guardian PATCH `{version: 0.7}` → 400, guardian unchanged |
| Docs | api-conventions 400 row and validation-rules `version` row carry the new sentence |

## Recorded for OQ T-M2.10-1 (out of scope by the packet; not findings)
- `POST /tutor/students`: `fullName` `123`, `1.5`, `true` → 201 stored as strings; `note: 42`, `phone: 84901234567`, contact handle label/value
  numbers → stored as strings; inline `guardians: [{name: 7}]` → 201; **`password: 12345678901234` (a number) accepted as the password**;
  `email: false` → 422 `INVALID_FORMAT`; `fullName` `[1]` or `{}` → 400.
- Guardian `POST`: `name` `42`, `true`, `4.2` → 201 as strings; `phone: 123` → 422; `name: ["a"]` → 400; an unknown `version: 0.7` on the create
  body is ignored (unknown properties ignored as before).
- Student PATCH `note: 77` → 200 stored `"77"`. Status `status` `0`, `1`, `"paused"`, `true`, `""` → 422 `INVALID_VALUE` (no ordinal coercion).
- Sign-in `rememberMe`: `true`, `1`, `2`, `"true"` → remember-me cookie; `false`, `0`, `""`, `" "`, `null`, `"false"`, absent → none; `0.7`,
  `1.0`, `"1"`, `"yes"`, `[true]`, `{}` → 400. A student with `mustChangePassword=true` got no cookie with `true` (existing behaviour).
- Sign-in `username`/`password` as numbers or booleans → generic 401 (coerced to strings); `username: [..]` → 400; unknown extra fields ignored.

## Findings
| ID | Severity | Summary | Steps | Expected | Actual |
|---|---|---|---|---|---|
| — | — | No S1–S4 or SCOPE findings | — | — | — |

The negative-`version` 422 and the scalar coercions are observations: the packet's Out of scope covers negative and out-of-range integers and other
scalar types, and none produced a 500.

## Not covered
UI, viewports, keyboard, i18n (no UI change); regression and gate runs; `/auth/password` and `/auth/preferences` bodies (no integer fields); no
`/api/v1/student/**` write endpoint exists yet.
