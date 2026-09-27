# T-M1.8: Backend error-surface and tooling follow-ups (T-M1.2/T-M1.4/T-M1.5 QA items)

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **in_progress** (G0 passed on PR #16, merged `207be44`; PO start signal 2026-09-27, DEC-068) |
| Owner role | BE (the LC-owned files it may touch are listed under "LC-owned files" below; the LC reviews that diff before `LC-APPROVED`) |
| Branch | `feature/T-M1.8-backend-follow-ups` (from `develop`) |
| Depends on | T-M1.2, T-M1.4, T-M1.5 (merged); T-M1.7 merged |
| Estimate | ≤ 2 agent-days |
| Trace | DEC-041 (T-M1.2 QA F1, F3, F4), DEC-047 (T-M1.4 QA F1, F2), DEC-054 (T-M1.5 QA F2), DEC-055 (T-M1.5 QA R2-1, R2-3), DEC-050 (headers on the application port only), NFR-SEC-08, api-conventions §5 and §7 ("every response carries `X-Request-Id`"), security.md §5, test-strategy §4 rule 6, coding-agent-rules §7 |

## Goal
Close the QA findings deferred from T-M1.2, T-M1.4 and T-M1.5 before M2 adds real endpoints. On the application port (:8080), every error a client can see must be
RFC 9457 Problem Details with a request ID and the security headers, including errors Tomcat produces before the application's filters run. On the management port (:8081),
every response carries a request ID, but **no security headers** (DEC-050 stands: :8081 is loopback/internal and never proxied). The forbidden-identifier scan must match
the written rules. The local test run must not stall for 30 s at shutdown, and two small tooling gaps get fixed: silent upload failures and an untested script.

## Scope
- In:
  1. **Management port (T-M1.2 F1).** Responses on :8081 carry `X-Request-Id`, and its Problem Details bodies have a non-null `requestId`. Only the request ID is added there:
     the security headers stay on :8080 only (DEC-050). Today the request-ID filter runs only on :8080
     (`ProblemDetailsAdvice.java:50`; repro `curl -i localhost:8081/actuator/env`).
  2. **Requests rejected by Tomcat before the app, on :8080 (T-M1.2 F3 + T-M1.5 F2).** Examples: a raw `<` in the query string, an encoded `%2f` or `..%2f` in the path. They must get a
     `400 application/problem+json` body (no HTML, no stack trace, no server version), the security.md §5 headers and an `X-Request-Id`, instead of Tomcat's HTML error page.
  3. **Forbidden identifiers (T-M1.2 F4).** `ForbiddenIdentifiersTest` also rejects `examtype` and `part5`. test-strategy §4 rule 6 and coding-agent-rules §7 list the **same** set.
  4. **Local shutdown stall (T-M1.4 F1).** On local rootless Podman, `./mvnw -B verify` must not end with Surefire force-killing the fork JVM after 30 s. Find the root cause; the
     QA saw Hikari "connection has been closed" warnings in the shutdown hook. Fix it, without disabling tests or raising timeouts to hide it.
  5. **Quiet `dev-down.sh` (T-M1.4 F2).** When nothing is running, it prints one line and exits 0, with no Podman error noise.
  6. **Visible upload failures (T-M1.5 R2-1).** Every `continue-on-error` upload step in `.github/workflows/*.yml` has an `id` and is followed by a step that emits `::warning::` when
     `steps.<id>.outcome == 'failure'`. The workflows' actions and required checks don't change otherwise.
  7. **`coverage-summary.sh` test (T-M1.5 R2-3).** Add `scripts/tests/coverage-summary.test.sh` with a fixture JaCoCo CSV, picked up by `run-all.sh`.

## Out of scope (explicit)
- Security headers on :8081 (DEC-050); Tomcat-level rejections on :8081 (loopback/internal only; they keep Tomcat's minimal report); new endpoints;
  Spring Security or authentication (M2, T-M2.1, including the dot-segment paths of DEC-054 F3); changes to the required checks list or `merge-gate.sh`;
  the T-M1.7 review S4 items and OQ-17 (backlog T-M1.12); the web client (T-M1.9).

## Guardrail answers (scope.md §6)
1. Trace: DEC-041, DEC-047, DEC-054, DEC-055, DEC-050, NFR-SEC-08, api-conventions §5/§7, security.md §5.
2. No drift toward excluded scope: this is engineering hygiene only.
3. No tutor setup is added.
4. Weekly use: N/A (engineering; every future error response benefits).
5. No hard-coded semantics. The scan is extended to forbid more exam identifiers.

## Design notes
- `backend/src/main/java/com/englms/shared/web/`: `RequestIdFilter`, `RequestIds`, `ProblemDetailsAdvice`, `SecurityHeadersFilter`.
- For :8081, register the request-ID filter (only) on the management context too. That can be a `@ManagementContextConfiguration` in `META-INF/spring/…ManagementContextConfiguration.imports`,
  or the filters can be made generic. Keep actuator exposure unchanged (health and info only).
- For Tomcat-level rejections, customise Tomcat's error report: for example, a `WebServerFactoryCustomizer<TomcatServletWebServerFactory>` that installs an `ErrorReportValve`
  subclass writing Problem Details plus the headers (with `showReport`/`showServerInfo` off), or an equivalent documented approach. Record the choice in the evidence; it needs an ADR only if it adds infrastructure.
- Problem Details shape: api-conventions §5 (`type`, `title`, `status`, `code` from `shared.ProblemCodes`, `requestId`; `instance` and `detail` optional). Tomcat-level 400s use the existing
  `MALFORMED_REQUEST` code, so no new enum value and no contract change. Never reflect the rejected input in the body, and leave `instance` out for rejected requests.
- **LC-owned files** (agent-roles §3) the BE implementer may change in this task: `.github/workflows/backend.yml`, `.github/workflows/e2e-smoke.yml`, `scripts/dev-down.sh`,
  `scripts/tests/dev-scripts.test.sh`, the new `scripts/tests/coverage-summary.test.sh` and the new workflow-warning test in `scripts/tests/`. It may also change the doc sections under
  "Docs to update" (including coding-agent-rules §7). Nothing else under `.github/**` or `scripts/**`. The LC reviews that part of the diff before `LC-APPROVED`.
- No migrations, no API catalogue rows (no new endpoints).

## Acceptance criteria
- **AC1 (F1):** `GET :8081/actuator/env` returns a 404 Problem Details body with a non-null `requestId` that equals its `X-Request-Id` response header. `GET :8081/actuator/health` also carries `X-Request-Id`.
  A valid incoming `X-Request-Id` is echoed on :8081 as on :8080.
- **AC2 (F3/F2):** for each of `GET /api/v1/meta?q=<` (a raw `<`), `GET /api/v1/a%2fb` and `GET /api/..%2fmeta`, the response is:
  - `400`;
  - `Content-Type: application/problem+json` and `Cache-Control: no-store`;
  - a body with `"status": 400` and `"code": "MALFORMED_REQUEST"`, and no HTML, stack trace, server version or echo of the rejected input;
  - a `requestId` equal to `X-Request-Id`;
  - every header required by security.md §5.

  This is proven by an integration test on the running server (not MockMvc) and by `curl` in the evidence.
- **AC3 (F4):** `ForbiddenIdentifiersTest` fails on a fixture containing `ExamType` or `Part5` (case-insensitive), and test-strategy rule 6 and coding-agent-rules §7 name the same identifiers.
- **AC4 (T-M1.4 F1):** two consecutive local `source scripts/env.sh && ./mvnw -B verify` runs on rootless Podman:
  - pass;
  - show no `Surefire is going to kill self fork JVM` and no Hikari shutdown warnings;
  - leave no Testcontainers containers behind.

  The root cause and the fix are written in `evidence/T-M1.8/summary.md`. No test is disabled, and no timeout is raised to mask it.
- **AC5 (T-M1.4 F2):** `./scripts/dev-down.sh` with no stack running exits 0, and its **combined stdout and stderr** is exactly one line starting with `dev-down:`.
  A new `dev-scripts.test.sh` case uses a stub `podman` that reproduces the no-op compose output (as the existing stubs do).
- **AC6 (R2-1):** every `continue-on-error: true` upload step has an `id` and a following `if: steps.<id>.outcome == 'failure'` step that prints `::warning::`. A script test checks this for all
  workflows. If GitHub's artifact storage has reset by then (expected 2026-10-01), the evidence shows `backend-coverage` uploaded on the PR run; otherwise the evidence says so.
- **AC7 (R2-3):** `scripts/tests/coverage-summary.test.sh` covers:
  - a fixture CSV (known line and branch totals → the exact summary line);
  - a missing CSV (a clear message and the documented exit code);
  - an empty CSV.

  `run-all.sh` runs it in `docs-check`.
- **AC8:** `./scripts/gate.sh` is green (log in `evidence/T-M1.8/`). The docs are updated (see below), and so are `progress.json` and `evidence/T-M1.8/summary.md`.

## Test plan
- Implementation:
  - unit tests for any new valve or writer;
  - Spring Boot integration tests on a **real port** for AC1 and AC2 (raw requests: use a socket or `HttpClient` with an unencoded `<`);
  - the forbidden-identifier fixture test;
  - script tests (`dev-scripts.test.sh`, the workflow-warning check, `coverage-summary.test.sh`);
  - `gate.sh`.
- Independent QA focus:
  - black-box `curl` of malformed requests on :8080 (encoded slashes, backslashes, raw `<` / `"` / spaces, over-long headers, a bad `X-Request-Id`). Every response must be Problem Details
    with the security headers and no reflected input;
  - on :8081, every response carries `X-Request-Id` and no security headers (DEC-050);
  - two local verify runs, timed;
  - `dev-down` when idle;
  - reading a workflow run log for the warning path.
- SEC review: **triggered** (the error surface and the security headers on every response, security.md §5).

## Evidence required
- `evidence/T-M1.8/summary.md` (AC → proof, the AC4 root cause), the gate log, `curl -i` transcripts for AC1/AC2, the two verify-run logs for AC4, the CI links, the QA report, and the SEC review.

## Docs to update
- api-conventions §5 (errors on :8081 and Tomcat-level rejections)
- security.md §5 (headers on every **application-port** response, including Tomcat-rejected ones; :8081 unchanged)
- test-strategy §4 rule 6 and coding-agent-rules §7 (the same list)
- development-setup: remove or replace the "Known issue (T-M1.8)" note about the Surefire force-exit once AC4 passes
- ci-cd §1 (the upload-warning convention)

## Risks & assumptions
- Tomcat's error report may still be used for some very early failures (e.g. a malformed request line). Cover what the valve can reach; document any residual case as a finding, not a silent gap.
- The AC4 root cause may sit in Testcontainers or Podman rather than the app. Time-box the investigation to about half a day. If a real fix isn't possible, stop and raise an OQ with
  the evidence before changing any timeout; AC4 may then be split out by a DEC into a backlog task, while AC1–AC3 and AC5–AC8 still merge.
- Registering filters on the management context must not expose more actuator endpoints.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh && source scripts/env.sh && (cd backend && ./mvnw -B verify)
curl -si 'http://localhost:8080/api/v1/meta?q=<'
curl -si http://localhost:8081/actuator/env
bash scripts/tests/run-all.sh
ENGLMS_TASK=T-M1.8 ./scripts/gate.sh
```
