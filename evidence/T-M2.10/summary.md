# T-M2.10 summary: strict JSON integers and the login-burst wall-clock flake

Branch `fix/T-M2.10-strict-json-numbers` (from `develop` `028fa59`) · code head `c106861` · gate log head `7bcf2a1` · trace DEC-105, DEC-144 (3),
DEC-185, DEC-092/093 (S2-1), T-M2.9 QA F3. Recorded by the LC from the backend-implementer's returned text (L-07). Red-run logs and the full gate
log: `.claude/scratch/lc-records/T-M2.10/` (local, git-ignored).

## Gate (G1)
`gate: PASS (13 steps, 860s)` on `c106861` (`evidence/T-M2.10/gate-20261120T143455Z.log`, trimmed). Steps: docs 1 s, scripts 190 s, backend 252 s
(524 tests, 0 failures), web-install 0 s, web-lint 4 s, web-typecheck 5 s, web-test 50 s (855), web-build 7 s, web-budget 0 s, web-contrast 0 s,
contract-drift 27 s (OK, no OpenAPI change), qa-typecheck 2 s, e2e 322 s (544 passed, 62 skipped; no changed spec to repeat). Later commits on the
branch are evidence and records only.

## Commits
| sha | subject |
|---|---|
| `829316a` | fix(web): bind JSON integer fields from JSON integers only (config, its test, `StrictJsonIntegersApiTest`, api-conventions, validation-rules) |
| `c106861` | test(identity): prove S2-1 with a parked burst instead of a wall clock (`AuthApiIntegrationTest`) |
| `7bcf2a1` | chore(evidence): T-M2.10 gate log (trimmed) |

## Implementation
- `shared.web.StrictJsonIntegersConfiguration`: one `JsonMapperBuilderCustomizer` bean `strictJsonIntegers`: disables
  `DeserializationFeature.ACCEPT_FLOAT_AS_INT`; the coercion config of `LogicalType.Integer` is `CoercionAction.Fail` for the `Float`, `String` and
  `EmptyString` shapes, with `setAcceptBlankAsEmpty(false)` (so `" "` fails). No endpoint, DTO, migration, authz or frontend change. A refused
  value reaches Spring's 400 handling and `MALFORMED_REQUEST`.
- API checked (§9.1) with `javap` against jackson-databind 3.1.7 and spring-boot-jackson 4.1.2:
  https://docs.spring.io/spring-boot/4.1/how-to/spring-mvc.html#howto.spring-mvc.customize-jackson-jsonmapper ·
  https://docs.spring.io/spring-boot/4.1/api/java/org/springframework/boot/jackson/autoconfigure/JsonMapperBuilderCustomizer.html ·
  https://javadoc.io/doc/tools.jackson.core/jackson-databind/3.1.7/tools.jackson.databind/tools/jackson/databind/cfg/MapperBuilder.html ·
  https://github.com/FasterXML/jackson-databind/blob/3.x/src/main/java/tools/jackson/databind/cfg/CoercionConfigs.java ·
  https://github.com/FasterXML/jackson-databind/wiki/Deserialization-Features

## AC → proof
| AC | Proof | Failing first (customizer bean removed, local) |
|---|---|---|
| AC1 | `StrictJsonIntegersApiTest.aNonIntegerVersionOnTheStudentPatchIs400AndChangesNothing`, 11 rows: `0.7`, `3.9`, `1.0`, `0.0`, `1e0`, `1e2`, `"1"`, `"0"`, `""`, `" "`, `true` (regression row). Each 400 with the standard problem (`application/problem+json`; keys type/title/status/instance/code/requestId; `requestId` = `X-Request-Id`; no input or parser text); row unchanged (`to_jsonb(row)::text` before = after), `version` reads back 0 | `0.7`, `0.0`, `"0"` → **200 (wrote the row)**; `3.9`, `1.0`, `1e0`, `1e2`, `"1"` → 409; `""`, `" "` → 422; `true` → 400 |
| AC2 | `…OnTheGuardianPatchIs400AndChangesNothing`, same 11 rows, guardian row unchanged | same pattern as AC1 |
| AC3 | `…OnAnExistingProfileIs400AndChangesNothing` and `…OnTheFirstPutIs400AndCreatesNothing` (11 rows each); `aNullOrAbsentVersionStillCreatesTheFirstProfile` (DEC-103) | existing: `1.0`, `1e0`, `"1"` → **200 (replaced)**; first PUT: `""`, `" "` → **200 (created)**; `true` → 400 |
| AC4 | `anIntegerVersionStillUpdatesTheStudentAndAStaleOneIs409`, `…TheGuardian…`, `…ReplacesTheProfile…`: current → 200 (+1), stale → 409 `STALE_VERSION` | positive controls, green before and after |
| AC5 | `shared.web.StrictJsonIntegersConfigurationTest` (`@JsonTest` + `@Import(StrictJsonIntegersConfiguration.class)`): `Numbers(int, long, Long)`: `0.7` and `"1"` refused per component, `1` accepted, `null` for `Long`; 10/10 | `@Bean` commented out (import kept): 6 of 10 failed (every fraction and numeric-string case) |
| AC6 | `AuthApiIntegrationTest.anUnrelatedLoginSucceedsWhileABurstOnOneUsernameIsParkedInTheHash`; ×20 fail-fast loop **20/20**; whole class 59/59 | AC7 |
| AC7 | both mutations below, each red, each reverted (`AuthenticationService.java` clean) | — |
| AC8 | gate PASS on `c106861`; contract-drift OK with no spec change; no kept assertion changed (the old burst test replaced as the packet says); CI on the PR | — |

Overall red run of AC1–AC4 with the bean removed: 41 of 48 failed (the `true` regression rows passed before and after).

## AC6 design
Pool-size guard (`HikariDataSource.getMaximumPoolSize() < 30`). A `@MockitoSpyBean PasswordEncoder` parks only calls with the burst's
`wrong-password-1`; each parked call records `TransactionSynchronizationManager.isActualTransactionActive()` and waits on a latch (`PARK_LIMIT`
5 min, a hang bound only). 30 virtual-thread wrong-password logins on `tutor.one`; a polling wait (≤ 30 s) until all 30 are parked. Then, whether
or not the wait completed, named `SoftAssertions`: (0) `N of 30 attempts reached the hash: serialised by a lock or the pool`; (c) the recorded
flags non-empty and all false; (d) a polling wait (≤ 30 s) for Hikari active connections == 0; (b) `SELECT 1 FROM app.user_account WHERE id = ?
FOR UPDATE NOWAIT` on a connection outside the pool, rolled back; (a) `student.c` signs in → 200. The latch is released in `finally`; all 30 then
answer 401. No elapsed-time assertion. The old helper and the unknown-username comparison are removed; the sibling timing test
`parallelFailedLoginsTakeSimilarTimeForUnknownAndExistingUsernames` is kept unchanged (named §4.6 exception, DEC-185 (3)).

## AC7 mutations (local, uncommitted, reverted)
- **(i) bcrypt under the row lock** (`matches()` moved after `findForUpdateById` inside `transactions.execute`): FAILED, 25 soft failures: (0)
  `1 of 30`, (c) `[true]`, (d) 10 active, (b) refused SQLState 55P03, (a) no response (TimeoutException), 20 × 500 after the release (Hikari timeout).
- **(ii) bcrypt inside the transaction, no lock** (`matches()` as the first statement in `transactions.execute`): FAILED, 24 soft failures: (0)
  `10 of 30`, (c) `[true…]`, (d) 10 active, (a) no response, 20 × 500 after the release; (b) passed (no lock held, as expected).
- Both match the packet's expectation, plus (a)/(d) under (i) and (a) under (ii). The first mutation run used a 60 s park bound, under which (a)
  passed in (ii) because parked calls timed out and returned connections; the bound was raised to 5 min before committing, and both mutations and
  the 20/20 loop were re-run on the committed test.

## Other JSON deserialisation readers
| Reader | Spring-managed mapper? | Effect |
|---|---|---|
| Spring MVC request bodies | yes | the rule applies (AC1–AC4) |
| `audit.internal.AuditService` | yes, write only | none |
| Hibernate JSON columns (`Student.contactHandles`, `LearningProfile.customFields`) | no (Hibernate 7.4.13 builds its own `Jackson3JsonFormatMapper`) | none (String components); kept tests green |
| Spring Modulith event publication registry | yes (reads only on republication) | no event type has an integer component |
| Spring Session JDBC | no (JDK serialisation) | none |
| `ProblemResponses` (`JsonMapper.shared()`) | no, write only | none |
| springdoc (Jackson 2) | no, writes the spec | none |
| Actuator (`health`, `info`) | no write endpoint | none |

## Deviations (implementer, accepted by the LC)
1. The refused tables add `1e2`, `0.0` and `"0"` (named in packet Scope 1 and the Domain rules) on every endpoint.
2. Rows compared as `to_jsonb(row)::text` (`text[]` columns come back as `PgArray`, no `equals`).
3. New class `StrictJsonIntegersApiTest` shares `GuardiansAndLearningProfileApiTest`'s cached context; the spy bean gives `AuthApiIntegrationTest`
   its own context (one extra start).
4. AC6 renamed `anUnrelatedLoginSucceedsWhileABurstOnOneUsernameIsParkedInTheHash` (still matches `anUnrelatedLogin*`; javadoc keeps S2-1).

## Open question and LC ruling (before G3, L-10)
**OQ T-M2.10-1:** Jackson 3 still coerces other scalars by default (plain Jackson 3.1.7 in jshell): a number or boolean into a `String`
(`{"s":5}` → `"5"`), `"true"` or `1` into a `Boolean` (`rememberMe: 1` → true), `""` into a `Boolean` → null. api-conventions says "wrong types" →
400. **LC ruling:** out of this packet's scope (Out of scope, first item); no code here. Routed to a new BE backlog row in the T-M2.10 merge records
(a `Textual`/`Boolean` coercion rule, or an explicit acceptance); its order is the PO's. QA records the behaviour over HTTP.

## Known limitations
- AC6 takes about 22 s here (30 bcrypt-12 calls after the release); under a mutation about 110 s.
- The Modulith republication path through the stricter mapper has no own test; safe while no event type has an integer component.

## Self-check
- [x] Only AC1–AC8; one mechanism in `shared/web`; no per-field annotations; no new dependency.
- [x] Each new check seen red: AC5 (bean removed), AC1–AC4 (41/48), AC6 (both mutations).
- [x] No wall-clock bound in AC6; async state by polling (L-05); latch released in `finally`.
- [x] No kept assertion changed or weakened; the old burst test replaced as the packet specifies.
- [x] `src/main` change is the configuration class only; no exam identifiers; `Clock` untouched.
- [x] Docs in sync: api-conventions 400 row; validation-rules `version` row.
- [x] Synthetic test data (`REFUSED-T-M2.10` marker); no `.env` or `.data` read.

## G3 cost
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| G0 | docs-reviewer | `245d01c` | PASS | 0/0/2/9 | packet | 81,389 | 5.7 | 0 | 0 |
| impl | backend-implementer | `c106861` | gate PASS | — | — | 191,935 | 51.5 | 1 | 14.3 |
