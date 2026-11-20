# SEC review (G3): T-M2.10 strict JSON integers and the S2-1 burst test, PR #211

> Recorded by the LC from the security-reviewer agent's returned text (one round, fresh context, 2026-11-20; 53,309 tokens, 4.4 min).

Reviewer: Security Reviewer · Branch `fix/T-M2.10-strict-json-numbers` at `b146ae3` (code head `c106861`) · Diff `028fa59..b146ae3` · Read: the packet,
`evidence/T-M2.10/summary.md`, `docs/04-backend/security.md`, DEC-092, DEC-093, DEC-185.

**Verdict: `SEC-REVIEW T-M2.10: APPROVED`**: no S1, S2 or S3; three S4 notes.

## Runs
- AC7 mutation (ii) (bcrypt inside the login transaction, no lock) applied from the implementer's diff (base blob checked = HEAD) and
  `AuthApiIntegrationTest#anUnrelatedLogin*` run: FAILED with 24 soft failures, as the summary records ((0) 10 of 30, (c) transaction active,
  (d) pooled connections held, (a) no response, 20 × 500 after the release). Reverted; `git status --short` empty.
- Not re-run: the full `./mvnw verify`, the authz-matrix and isolation suites (the gate PASS on `c106861` relied on); mutation (i) from the summary.

## Focus
1. **AC6 still proves S2-1, not vacuously.** The pool-size guard reads the live Hikari maximum (10 < 30); (0) needs all 30 parked (a mis-wired spy
   gives 0); (c) asserts non-empty and all false; (b) locks `tutor.one`'s row with `FOR UPDATE NOWAIT` on a connection outside the pool (55P03 under
   mutation (i)); (d) reads Hikari active connections, so it also catches a connection held without a transaction; (a) is a real 200 sign-in whose
   password is never parked. Soft checks run whether or not the wait completed; the latch is released in `finally`; Mockito resets the stub after
   each test. No assertion compares elapsed times (`HANG` 30 s, `PARK_LIMIT` 5 min only detect hangs; coding-agent-rules §4.6); the sibling timing
   test is the named exception of DEC-185 (3).
2. **Global strict-integer rule: no new 500, no input leak.** A refused coercion is a `MismatchedInputException`, wrapped as
   `HttpMessageNotReadableException`; `ProblemDetailsAdvice` answers 400 `MALFORMED_REQUEST` with `detail` nulled and `requestId`. The sign-in body
   has no integer field; `rememberMe` still accepts `1` and `"true"` (OQ T-M2.10-1, agreed out of scope, benign). `/api/v1/student/**` has no
   `@RequestBody` handler today. The only integer request fields are the tutor-only `version`s.
3. **Other readers of the Spring mapper.** Only Spring Modulith's event republication deserialises through it; every event record has UUID, String,
   enum, `Instant` or `ClientInfo` components, none `LogicalType.Integer`, so stored rows still read back. Spring Session JDBC uses JDK serialisation;
   Hibernate JSON columns use Hibernate's own mapper; `AuditService` and `ProblemResponses` only write.
4. **Identity and security config:** no `src/main` change to identity, `SecurityConfiguration`, filters, throttle or the authz registry.

security.md §11: items 1, 2, 3, 5, 7, 8 not applicable (no endpoint, student DTO, file, migration or student-visible resource); 4 (input limits)
tightened, the 1 MB factory limit untouched; 6 (logs) no new log statements.

## Findings
| ID | Severity | Location | Finding | Disposition |
|---|---|---|---|---|
| S4-1 | S4 | `StrictJsonIntegersConfiguration.java:25-32` | Jackson's mismatch message quotes the refused value; it stays out of the response body, but a DEBUG log of `HttpMessageNotReadableException` would contain it. Pre-existing for every malformed-JSON 400 | Noted, no change; if verbose logging of this path is turned on, log only the exception class |
| S4-2 | S4 | Modulith republication | No test that registry rows read back through the stricter mapper; safe while no event has an integer component | Noted; add a serialise-then-deserialise test when an event first gains an `int`/`long` component |
| S4-3 | S4 | `AuthApiIntegrationTest` check (d) | Pool-wide count: a scheduled task (e.g. Spring Session cleanup) could briefly hold a connection; the polling wait absorbs it; at worst a rare false red, never a false pass | Noted; fix only if seen |
