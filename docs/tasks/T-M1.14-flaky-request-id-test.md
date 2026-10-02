# T-M1.14: Fix the flaky request-ID backend test

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **done** (merged `3a405ce`, PR #37; DEC-081) (G0: DOCS-REVIEW on the packet PR, recorded in `evidence/T-M1.14/review/docs.md`; dependencies merged; PO start signal given, DEC-080) |
| Owner role | BE (backend-implementer) |
| Branch | `fix/T-M1.14-flaky-request-id-test` (from `develop`) |
| Depends on | T-M1.8 merged (`01dfc5d`) |
| Estimate | ≤ 0.5 agent-day |
| Trace | DEC-074 (the flake and its cause); test-strategy (flaky test policy: fix within 1 milestone, never silently retried); api-conventions §5 (Tomcat-level rejections, Problem Details `requestId`) and §7 (`X-Request-Id` on every response); T-M1.8 AC2 (Tomcat-level rejections) |

## Goal
`ApplicationIntegrationTest.aRejectedRequestReusesAValidIncomingRequestIdAndNeverEchoesABadOne` fails about once in 250 runs: it asserts the Problem Details body
`doesNotContain("bad")`, but the fresh UUIDv7 request ID in that body is hex and can contain `bad` (random bits, and rare windows of the timestamp part). Make the test
deterministic **without weakening what it checks**: a bad incoming request ID is never echoed, and a fresh, valid request ID replaces it.

## Scope
- In:
  1. Rewrite the assertions of that one test so that no outcome depends on the random or time-derived digits of the generated ID:
     - the response header `X-Request-Id` is a **UUID** (RFC 9562 text form, lowercase hex, version 7 nibble, variant `8`–`b`), not just `[0-9a-f-]{36}`;
     - the body's `requestId` (parsed from the JSON, not by substring) **equals** that header;
     - neither the header nor the body contains the incoming value `bad<id>` nor its `<` (the character that made it invalid), anywhere;
     - the first half (a valid incoming ID `it-rejected-1` is reused in the header) is unchanged, and also asserted for the body's `requestId`.
  2. If more tests in `backend/src/test/**` assert `doesNotContain` against a body or header that carries a generated request ID (or any other generated hex/UUID), fix them
     the same way; list each one (or "none found", with the grep) in the evidence.

## Out of scope (explicit)
- Any change to `backend/src/main/**` (the request-ID behaviour is correct); quarantine, `@RepeatedTest`/retry or `@Disabled`; test-framework or
  dependency changes; `web/`, `api/`, CI, `scripts/`; the T-M2.1 deferrals (TRACE 405, `Cache-Control: no-store`).

## Guardrail answers (scope.md §6)
1. Trace: DEC-074 and the flaky-test policy in test-strategy. 2. No drift (test-only change). 3. No tutor setup. 4. Not user-facing; it keeps CI from blocking unrelated PRs.
5. No exam or curriculum semantics.

## Design notes
- `RawResponse` in `ApplicationIntegrationTest` already exposes the body; parse it with the Jackson 3 `JsonMapper` (`tools.jackson.databind.json`; Boot 4 brings Jackson 3, tech-stack.md) from the test classpath, with no new dependency, rather than string search.
  `java.util.UUID.fromString` alone is too lenient (it accepts short groups); keep a strict regex for the text form and check `UUID.version() == 7` and `variant() == 2`.
- The error body for this path is written by `ProblemDetailsErrorReportValve` (Tomcat-level rejection), so the `requestId` comes from `RequestIds.resolve` or the valve's own
  fallback: assert behaviour, not which component generated it.
- Determinism proof: the test must be correct for **every** possible generated ID. Show it by a unit-level demo in the evidence: the old assertion fails and the new one passes
  for a body whose ID contains `bad` (e.g. `01a0e646-0000-7bad-8bad-000000000bad`), without committing a test that depends on a fixed generator.

## Acceptance criteria
- **AC1:** the test asserts all of scope 1 (strict UUIDv7 header; body `requestId` == header via JSON; no `bad<id>` and no `<` in header or body; valid incoming ID reused in
  header and body). None of its assertions can fail because of the generated ID's digits (the reasoning is written in a one-line comment above the test).
- **AC2 (no weakening):** each property the old test checked is still checked: the bad ID is not echoed (now as the exact value and its `<`, in header and body), and the
  replacement is a well-formed ID (now stricter). A mutation demo in the evidence: making `RequestIds.resolve` (or the valve's fallback) return the incoming value (scratch change, not committed) fails the
  new test. (`RequestIdFilter` never runs for this path: Tomcat rejects `/api/v1/a%2fb` before any filter.)
- **AC3:** the determinism demo (design notes) is in the evidence: the old `doesNotContain("bad")` fails on a body containing `…-7bad-…`; the new assertions pass on it.
- **AC4:** scope 2's grep and its result are in the evidence; any other such assertion is fixed the same way.
- **AC5:** `./scripts/gate.sh` green (`ENGLMS_TASK=T-M1.14`, log in the evidence); the test class run 50 times locally without a failure (log); CI 7/7;
  `evidence/T-M1.14/summary.md` maps each AC to its proof.

## Test plan
- Implementation: the rewritten integration test; the scratch mutation (AC2) and determinism (AC3) demos, recorded and not committed.
- Independent QA focus: read the diff for any assertion that was dropped or loosened; re-run the mutation demo; grep for other generated-ID substring assertions; confirm no
  `src/main` change. G3 is QA only (no UI, no new endpoint, no security surface change).

## Evidence required
`evidence/T-M1.14/summary.md`, the gate log, the 50-run log (`runs-50.log`), the mutation and determinism demos, the grep, the CI links, the QA report (on `qa/T-M1.14`).

## Docs to update
`progress.json` and the evidence summary only.

## Risks and assumptions
- The JSON body of the Tomcat-level error is valid JSON (T-M1.8 tests already parse it by substring; if parsing fails, that is a bug to report, not to work around).
- 50 local runs are a smoke check, not proof; AC1/AC3 are the proof that the outcome does not depend on the digits.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh && source scripts/env.sh   # env.sh: DOCKER_HOST for Testcontainers (the test class is @Tag("container"))
git checkout develop && git pull --ff-only && git checkout -b fix/T-M1.14-flaky-request-id-test
mkdir -p evidence/T-M1.14
(cd backend && for i in $(seq 1 50); do echo "run $i"; ./mvnw -B -q test -Dtest=ApplicationIntegrationTest || { echo "FAIL run $i"; break; }; done) 2>&1 | tee evidence/T-M1.14/runs-50.log
ENGLMS_TASK=T-M1.14 ./scripts/gate.sh
```
