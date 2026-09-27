# T-M1.8 security review record: SEC-REVIEW

Reviewer: an independent `security-reviewer` agent (fresh context). It read the full diff, checked the valve against the Tomcat 11.0.24 `ErrorReportValve` source,
and probed the packaged app live on :8080 and :8081. It was read-only: no commits or comments. PR #17, merged as `01dfc5d` via merge-gate.

| Round | Head | Verdict |
|---|---|---|
| 1 | `f7b046d` | **SEC-REVIEW T-M1.8: CHANGES REQUESTED** |
| 2 | `e651c14` (final) | **SEC-REVIEW T-M1.8: APPROVED** |

## Findings

| # | Sev | Finding | Resolution |
|---|---|---|---|
| S3-1 | S3 | `@ManagementContextConfiguration` is meta-`@Configuration`, so `ManagementRequestIdConfiguration` was also component-scanned into the application context. The request-ID filter ran twice on :8080: an extra access-log line without `requestId`, and a "management-only" config silently applying to the public port (which weakens the DEC-050 separation) | **Fixed** (DEC-069): `EnglmsApplication` adds a local `@ComponentScan` that keeps Boot's two default filters and excludes `@ManagementContextConfiguration`, and a regression test checks it. Round 2 verified it live. The application-context bean diff (old 390, new 388) drops only the two leaked beans; there is exactly one `RequestIdFilter` and all 14 `com.englms` beans are still present |
| S4-1 | S4 | The valve skipped Tomcat's `setErrorReported()` guard, so it could add a body to any empty 4xx/5xx (e.g. a future `HttpStatusEntryPoint` 401) | **Fixed**: the guard was added and verified in the built class. App-handled errors keep their bodies |
| S4-2 | S4 | Tomcat 417/501/505 were labelled `INTERNAL_ERROR`, and the docs promised only 400 | **Fixed**: 4xx → `MALFORMED_REQUEST`, 5xx stay `INTERNAL_ERROR`; tests for 417/505; api-conventions §5 corrected |
| S4-3 | S4 | `TRACE` on :8080 skips the valve and the filters (Boot's `/error` 405, with the path JSON-encoded); pre-existing | **Deferred to T-M2.1** (backlog row, DEC-069/070); security.md §5 lists it as a known exception |

## Checked and fine (round 1, still true in round 2)
- **No reflection or injection.** The JSON body is constants plus a request ID validated as `[A-Za-z0-9._-]{1,64}`. Bad, CR-injected or oversized IDs are replaced. No path, query, `instance` or `detail` is included.
- **No server info or stack traces.** There are no double writes: nothing happens when the response is committed, content has been written, or I/O isn't allowed.
- **Headers.** All five security.md §5 headers, `X-Request-Id` and `no-store` are present on every Tomcat-level rejection tried: encoded `/`, raw `<`, `%00`, `..%2f`, a bad request line, a malformed header, duplicate `Host`, a 20 KB header, and 417/501/505.
- **:8081.** No security headers (DEC-050), and actuator exposure is unchanged (health and info only).
- **Workflow steps.** They only echo constant `::warning` strings. There is no `${{ }}` interpolation of untrusted data and no permission changes.
- **Other files.** `dev-down.sh` uses fixed names. `SpringContextsClosingListener` is test-scoped.
