# T-M1.14 evidence summary: deterministic rejected request-ID test

Packet: `docs/tasks/T-M1.14-flaky-request-id-test.md` (G0 via PR #28) · PO start: DEC-080 · Branch `fix/T-M1.14-flaky-request-id-test` (from `develop` `14e820d`) · PR #37.
Implementer: backend-implementer agent (this summary was written by the LC from the implementer's report, as the harness blocks subagents from writing it).

## Commits
| SHA | Subject |
|---|---|
| `1e0825b` | test(shared): make the rejected request-ID test independent of the generated digits |
| `82b89a4` | docs(T-M1.14): add gate, 50-run, mutation, determinism and scope-2 evidence |

## AC → proof
| AC | Proof |
|---|---|
| AC1 | `ApplicationIntegrationTest.aRejectedRequestReusesAValidIncomingRequestIdAndNeverEchoesABadOne`: the valid incoming `it-rejected-1` is reused in the header and in the body's `requestId` (read with the Jackson 3 `JsonMapper`); for `bad<id>` the header matches `[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}` and parses as a UUID with version 7 and variant 2; the body's `requestId` equals the header; neither contains `bad<id>` nor `<`. A one-line comment states why the digits can't fail it (shape and equality only; every banned string contains `<`, which hex never does). |
| AC2 | `mutation-demo.log`: a scratch `RequestIds.resolve` returning the incoming value makes the new test fail (the header `bad<id>` does not match the pattern); reverted, `src/main` clean. Every old check remains (not echoed: now the exact value and `<`, header and body; well-formed: stricter). |
| AC3 | `determinism-demo.log`: a scratch program (not committed) on the real `ProblemDetailsErrorReportValve.body(400, "01a0e646-0000-7bad-8bad-000000000bad")`: the old `doesNotContain("bad")` fails, the new assertions pass. |
| AC4 | `scope2-grep.log`: no other test needs a fix; the sibling `doesNotContain("<","html","Tomcat","Exception","instance","meta","%2f")` tokens each contain a non-hex character; `IdsTest` and `MetaControllerTest` don't depend on generated digits. |
| AC5 | `gate-20261002T042058Z.log`: `ENGLMS_TASK=T-M1.14 ./scripts/gate.sh` **PASS** (12 steps). `runs-50.log`: the packet's loop, 50/50 runs, no `FAIL` (1.6 MB: `-q` still prints the app's JSON log lines). The gate's E2E records/screenshots were deleted (no UI change). CI 7/7 for `0de5bb0` (backend run https://github.com/duochou042004/eng-lms/actions/runs/36964447084, e2e-smoke run https://github.com/duochou042004/eng-lms/actions/runs/36964447010). |

## Notes
- Test-only diff: `backend/src/test/java/com/englms/ApplicationIntegrationTest.java` (+ `bodyRequestId` helper, imports `java.util.UUID`, `tools.jackson.databind.json.JsonMapper`). No `src/main` change, no new dependency.

## G3 and merge
QA-VERDICT PASS at `0de5bb0` (`qa/report.md`, PR #38); merged as `3a405ce` via merge-gate (PR #37). S4 dispositions: DEC-081.
