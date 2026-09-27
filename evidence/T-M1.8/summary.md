# T-M1.8 evidence summary: backend error-surface and tooling follow-ups

Branch `feature/T-M1.8-backend-follow-ups` · Packet `docs/tasks/T-M1.8-backend-follow-ups.md` · PO start signal DEC-068 · Trace DEC-041, DEC-047, DEC-050, DEC-054, DEC-055

## What changed
- **:8081 request IDs (AC1).** `ManagementRequestIdConfiguration` is a `@ManagementContextConfiguration(CHILD)` loaded from
  `META-INF/spring/…ManagementContextConfiguration.imports`, and registers `RequestIdFilter` in the management child context.
  - The application's filter beans never reached that context's servlet container.
  - Only the request ID is added there; no security headers on :8081 (DEC-050).
  - `RequestIds.resolve` now holds the shared "reuse a well-formed ID, otherwise generate one" rule.
- **Tomcat-rejected requests (AC2).** `ProblemDetailsErrorReportCustomizer` is a lowest-precedence `WebServerFactoryCustomizer` in the application context only. It swaps the
  `ErrorReportValve` that Boot adds to the host pipeline for `ProblemDetailsErrorReportValve`, and sets the host's `errorReportValveClass` so Tomcat doesn't add another at start-up.
  - For an error response with no body yet, the valve writes Problem Details: `type`, `title`, `status`, `code`, `requestId`, and no `instance`/`detail`, so nothing is echoed.
  - It also sets `SecurityHeadersFilter.apply` (now a shared static), `X-Request-Id` and `Cache-Control: no-store`.
  - The :8081 factory doesn't get the customizer, so Tomcat-level rejections there keep Tomcat's minimal report (out of scope).
- **Forbidden identifiers (AC3).** `examtype` and `part5` were added to `ForbiddenIdentifiersTest`, with fixtures. test-strategy rule 6 and coding-agent-rules §7 now name the same list.
- **Local shutdown stall (AC4).** See the root cause below. The fix is `SpringContextsClosingListener`, registered through `spring.factories` and the JUnit service file.
  It adds a test-scoped `junit-platform-launcher` dependency (Boot-managed; tech-stack updated).
- **Quiet `dev-down` (AC5).** If `englms-dev-db` doesn't exist, it prints one line, skips `compose down`, and still honours `--purge`.
- **Visible upload failures (AC6).** Each `continue-on-error` upload (two in `backend.yml`, one in `e2e-smoke.yml`) has an `id` and a following
  `if: always() && steps.<id>.outcome == 'failure'` step that prints a `::warning`. The new `scripts/tests/workflow-warnings.test.sh` enforces this.
- **`coverage-summary.sh` test (AC7).** The new `scripts/tests/coverage-summary.test.sh`.

## AC4 root cause
The fork JVM hung in `System.exit` for 30 s until Surefire killed it. The thread dumps show why:
- Locally, Ryuk is off under rootless Podman (DEC-044), so Testcontainers removes containers from its own JVM shutdown hook.
- Spring Boot's `SpringApplicationShutdownHook` closed the cached test contexts at the same time.
- While closing, Spring Modulith's `DefaultEventPublicationRegistry.destroy()` always queries the database (`findIncompletePublications`).
- The database container was already stopped, so Hikari waited its 30 s connection timeout. That produced the "connection has been closed" warnings.

CI was unaffected because Ryuk outlives the JVM there.

**Fix:** close the test contexts when the JUnit test plan finishes, while the database still runs. Spring then shuts down in dependency order: the registry, then the data source, then the `PostgreSQLContainer` bean.

**Rejected alternatives:**
- `LauncherSessionListener`: Surefire exits before closing the session.
- `ContextCache.clear()`: it forgets contexts without closing them.
- Lowering Hikari's timeout: that masks the race rather than fixing it (the packet forbids it).
- `@DirtiesContext`: it would defeat context caching for M2.

No test was disabled or timeout changed.

## AC → proof

| AC | Result | Proof |
|---|---|---|
| **AC1** :8081 request IDs | PASS | `ApplicationIntegrationTest`: `managementProblemDetailsCarryTheRequestIdOfTheResponseHeader` (404 Problem Details, `requestId` equals the header, no CSP), `managementEchoesAValidIncomingRequestId`, `managementHealthCarriesAGeneratedRequestId`. `curl-ac1-ac2.txt` |
| **AC2** Tomcat-rejected → Problem Details + headers | PASS | `requestsRejectedByTomcatGetProblemDetailsAndTheSecurityHeaders` × 3 (`?q=<`, `a%2fb`, `..%2fmeta`, over a raw socket): 400, `application/problem+json`, `no-store`, all five security.md §5 headers, `MALFORMED_REQUEST`, `requestId` equals the header, and no `<`/html/Tomcat/Exception/instance/echo. `aRejectedRequestReusesAValidIncomingRequestIdAndNeverEchoesABadOne`. `curl-ac1-ac2.txt` |
| **AC1/AC2 tests are real** | PASS | With the fix disabled (the customizer's `@Component` removed and the imports file removed, including its stale copy in `target/classes`), all 7 new tests **fail**: the 3 AC2 cases see `text/html`, the request-ID case gets `null`, and the 3 management cases get no header or a null `requestId`. With the fix, they pass |
| **AC3** examtype/part5 | PASS | `ForbiddenIdentifiersTest` 17/17, including the new fixtures `ExamType`, `EXAMTYPE_LISTENING`, `Part5` and `part5Questions`. `src/main` is clean |
| **AC4** no 30 s kill locally | PASS | `ac4-before.txt`: 58.5 s, a kill, 10 Hikari warnings. `ac4-verify-run1.txt` / `ac4-verify-run2.txt`: 94 tests, BUILD SUCCESS, 28.7 s each, **0** kill lines, **0** Hikari warnings, 3 × "No publications outstanding" (every context closed cleanly), 0 leftover containers |
| **AC5** quiet `dev-down` | PASS | `dev-scripts.test.sh` 21/21 (+11: one line for stdout+stderr, no compose call, `--purge` with and without a volume). Real run: `dev-down: nothing is running (data volume englms-dev-pgdata kept; use --purge to delete it)`, rc 0 |
| **AC6** upload warnings | PASS (storage reset: see the CI section) | `workflow-warnings.test.sh` 10/10, with fixtures for: no id, no warning, a warning in another job, a warning before the upload, and a warning without `always()`. The checker fails on develop's workflows (3 problems) and passes on this branch |
| **AC7** `coverage-summary` test | PASS | `coverage-summary.test.sh` 9/9: the exact totals line and sorted rows, a missing CSV (exit 1 + message), a header-only CSV and an empty file |
| **AC8** gate, docs, progress | PASS | `gate-20260927T084129Z.log`: **PASS (12 steps, 108 s)**, down from 174 s at T-M1.7 thanks to AC4. Docs: api-conventions §5, security.md §5, test-strategy rule 6, coding-agent-rules §7, development-setup (the known-issue note replaced), ci-cd §1, tech-stack |

## CI
PR #17 at `5c1b45b`: 7/7 green:
- backend https://github.com/duochou042004/eng-lms/actions/runs/36307161866
- docs-check https://github.com/duochou042004/eng-lms/actions/runs/36307161855
- secrets-scan https://github.com/duochou042004/eng-lms/actions/runs/36307161861
- web https://github.com/duochou042004/eng-lms/actions/runs/36307161874
- contract-drift https://github.com/duochou042004/eng-lms/actions/runs/36307161867
- e2e-smoke https://github.com/duochou042004/eng-lms/actions/runs/36307161838
- container https://github.com/duochou042004/eng-lms/actions/runs/36307161877

**AC6 live proof:** GitHub's artifact storage is still exhausted, so on backend run 36307161866 "Upload coverage report" failed (`Artifact storage quota has been hit`, 0 artifacts).
The new step ran and the check shows the annotation `warning: Coverage report not uploaded`, while the job and the required check still passed.
Once the storage resets (expected 2026-10-01), `backend-coverage` should upload again; this is recorded in the handoff.

## Notes / findings for the reviewers
- `Cache-Control: no-store` is **not** set on ordinary API responses yet, although api-conventions §7 asks for it. T-M1.8 sets it only on the valve's responses (AC2).
  This is outside the packet, so it's an open question for the LC (not code here).
- The :8081 Problem Details keep `instance` (the actuator path), as any app-handled error does. That is unchanged behaviour.
- `shellcheck` is not installed locally (the PO's call).
