# QA report: T-M1.8 (backend error-surface and tooling follow-ups)

Evaluator: an independent `qa-evaluator` agent (fresh context, never shared a session with the implementer). It tested black-box on the packaged jar with the local PostgreSQL,
and its verdict was formed before it read the implementation. PR #17, merged as `01dfc5d` via merge-gate.

| Round | Head | Verdict |
|---|---|---|
| 1 | `f7b046d` | **QA-VERDICT T-M1.8: PASS WITH MINOR** |
| 2 | `e651c14` (final) | **QA-VERDICT T-M1.8: PASS WITH MINOR** |

## AC results (round 1, confirmed in round 2)

| AC | Result | Evidence |
|---|---|---|
| AC1 :8081 request IDs | PASS | `GET :8081/actuator/env` → 404 Problem Details, with `requestId` equal to `X-Request-Id`. Health carries the header. Valid incoming IDs are echoed and bad or oversized ones replaced. No security headers on 26 :8081 responses (DEC-050). Only health and info are exposed |
| AC2 Tomcat rejections → Problem Details | PASS | `?q=<`, `a%2fb` and `..%2fmeta` via curl `--path-as-is` and raw sockets, plus about 30 more malformed inputs: 400, `application/problem+json`, `no-store`, `MALFORMED_REQUEST`, a matching `requestId`, all five security.md §5 headers, no `Server` header, no echo. The exceptions are listed under the findings |
| AC3 examtype/part5 | PASS | Present in `FORBIDDEN`, with fixtures. test-strategy rule 6 and coding-agent-rules §7 list the same 11 identifiers |
| AC4 no 30 s kill | PASS | Two `./mvnw -B verify` runs: 33.3 s and 29.7 s, 94 tests, 0 kill lines, 0 Hikari warnings, 3 × "No publications outstanding", no leftover containers. No timeout or Surefire setting changed |
| AC5 quiet `dev-down` | PASS | With nothing running: rc 0 and one combined line. The DB was restored afterwards |
| AC6 upload warnings | PASS | All 3 `continue-on-error` steps have an `id` and a following warning step. `workflow-warnings.test.sh` 10/10. Check run 108585949916 shows the "Coverage report not uploaded" annotation while the check passes (storage not reset yet) |
| AC7 coverage-summary test | PASS | 9/9 cases; the fixture totals were checked by hand |
| AC8 gate, docs, progress | PASS | `run-all.sh` and `check-docs.sh` PASS, 7/7 PR checks green, docs updated. Round 2: `./mvnw -B verify` passes 97 tests (the 3 new ones included) |

No test was removed or weakened (the `FORBIDDEN` and `@ValueSource` lists were replaced by supersets). No scope findings.

## Findings

| ID | Sev | Summary | Disposition |
|---|---|---|---|
| F1 | S3 | `TRACE` on :8080 gets Boot's 405 `/error` response (JSON with the path, or the Whitelabel HTML page with `Accept: text/html`), with no security headers or request ID | Deferred to **T-M2.1** (Spring Security firewall), DEC-069/070. It predates T-M1.8 and can't be sent by browsers |
| F2 | S3 | Every :8080 request was access-logged twice, the second line without a `requestId` (the management config was component-scanned) | **Fixed** in `e651c14` (DEC-069); round 2 verified 41 lines, each with a `requestId`, and no duplicates |
| F3 | S4 | Tomcat's 417 carried `code: INTERNAL_ERROR` | **Fixed** in `e651c14` (4xx → `MALFORMED_REQUEST`; 5xx stay `INTERNAL_ERROR`) |
| F4 | S4 | A request-line failure can't reuse a valid incoming `X-Request-Id` (Tomcat never parses the headers) | Documented in api-conventions §5 (residual case) |
| F5 | S4 | `OPTIONS *` has no request ID or headers | Documented in api-conventions §5 (residual case) |
| F6 | S4 | App-handled errors lack `Cache-Control: no-store` (pre-existing) | Deferred to **T-M2.1** (Spring Security's default cache headers), DEC-070 |
| F7 | S4 | The security.md §5 TRACE note mentions only the JSON form, not the Whitelabel HTML page | Docs fixed in the post-merge bookkeeping (docs/T-M1.9-packet) |

Also noted (outside the packet): Tomcat-level rejections on :8081 keep Tomcat's HTML report without a request ID. The packet puts this out of scope (loopback/internal).

## Environment
The app was stopped, ports 8080 and 8081 are free, `englms-dev-db` is healthy, and there are no stray containers. The raw probe results and logs stayed in the session scratchpad.
