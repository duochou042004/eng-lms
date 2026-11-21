# T-M2.16 summary: a username change bumps the student version

Branch `fix/T-M2.16-username-version` (from `develop` `38fa45d`) · code head `2c71ec3` · gate log head `e2272c6` · trace FR-STU-03, DEC-124 (8),
DEC-187. Recorded by the LC from the backend-implementer's returned text (L-07). PO start signal 2026-11-21.

## Gate (G1)
`gate: PASS (13 steps, 832s)` on `2c71ec3` (`evidence/T-M2.16/gate-20261121T050324Z.log`, trimmed to 58 lines, every `gate:` line kept). Steps: docs
2 s, scripts 186 s, backend 265 s (531 tests, 0 failures), web-install 0 s, web-lint 4 s, web-typecheck 5 s, web-test 47 s (855 in 70 files),
web-build 6 s, web-budget 0 s, web-contrast 0 s, contract-drift 23 s (OK, no OpenAPI change), qa-typecheck 2 s, e2e 292 s (544 passed, 62
skipped). An earlier run on `3ebb7c7` was stopped after about a minute (not evidence).

## Commits
| sha | subject |
|---|---|
| `3ebb7c7` | fix(students): a username change bumps the student version |
| `2c71ec3` | test(students): a stale forced increment fails at once as Spring's optimistic-lock failure |
| `e2272c6` | chore(evidence): T-M2.16 gate log on the final head (PASS, 13 steps, 832s) |

## Implementation
- `Student.apply` returns whether it changed the row (javadoc reworded).
- New repository fragment `students.internal.persistence.StudentVersionIncrement` / `StudentVersionIncrementImpl` (package-private,
  constructor-injected `EntityManager`): `forceVersionIncrement(student)` = `entityManager.lock(student, LockModeType.PESSIMISTIC_FORCE_INCREMENT)`;
  `StudentRepository` extends it, so the call passes the repository proxy's `PersistenceExceptionTranslationInterceptor` and a stale version is
  `ObjectOptimisticLockingFailureException` → `ProblemDetailsAdvice` 409 `STALE_VERSION`.
- `StudentService.update`: inside the existing rename condition (`!username.strip().equals(currentUsername)`), after `accounts.changeUsername`,
  `students.forceVersionIncrement(student)` when `apply` changed nothing. `updatedAt` / `updatedBy` stay for a username-only change.
- Hibernate 7.4.13 path (sources jar): `DefaultLockEventListener` → `LoaderHelper.upgradeLock` → `OptimisticLockHelper.forceVersionIncrement` →
  `UpdateCoordinatorStandard.doVersionUpdate` at once with the loaded version; 0 rows → `StaleObjectStateException`; `EntityEntryImpl.forceLocked`
  writes v+1 back to the entity. After a flushed profile update the entry is at `LockMode.WRITE` (same level as `PESSIMISTIC_FORCE_INCREMENT`), so
  Hibernate skips a second increment by itself; the `!changed` guard pins the intent if identity ever stops flushing.
- Docs (§9): https://docs.hibernate.org/orm/7.4/userguide/html_single/ (Locking) ·
  https://docs.spring.io/spring-data/jpa/reference/jpa/locking.html ·
  https://docs.spring.io/spring-data/jpa/reference/repositories/custom-implementations.html ·
  https://docs.spring.io/spring-framework/reference/data-access/orm/general.html ·
  https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/orm/jpa/EntityManagerFactoryUtils.html ·
  https://repo1.maven.org/maven2/org/hibernate/orm/hibernate-core/7.4.13.Final/hibernate-core-7.4.13.Final-sources.jar
- Records: `web/src/test/students.ts` (the fake bumps `version` whenever the body has a field besides `version`), the `useStoreStudent` comment in
  `web/src/features/students/api/students.ts`, the api-catalog row `GET / PATCH /tutor/students/{sid}`. No OpenAPI, migration, identity, UI, i18n
  or dependency change.

## AC → proof
| AC | Proof |
|---|---|
| AC1 | `StudentsApiIntegrationTest.aUsernameOnlyChangeBumpsVersionSoTheSecondTabIsStale` (same instant: 200 v1, `updatedAt` unchanged; second 409 `STALE_VERSION`; `a.new` read back; 1 audit row); table rows "rename", "stale" |
| AC2 | table rows "same username after strip", "equal values", "case-only rename" (200 v1, `Row.Case`, 1 audit); `aUsernameChangeBumpsVersionAndANoOpPatchKeepsIt` |
| AC3 | table row "rename + profile (one bump)" (v1); `StudentServiceVersionTest.aProfileAndUsernameChangeLeavesTheIncrementToTheRowUpdate` |
| AC4 | `StudentUsernameRaceTest.twoConcurrentUsernameOnlyPatchesFromOneVersionGiveOne200AndOneStale409` (20 rounds, latch, fresh students, unchanged instant: one 200 + one 409, version 1, winner's username, one audit row); `aStaleForcedIncrementFailsAtOnceAsSpringsOptimisticLockingFailure` |
| AC5 | mutations below |
| AC6 | kept `aUsernameChangeAppliesUniquenessKeepsTheStudentsSessionsAndIsAudited`; table row "taken"; `StudentCreateRaceTest` unchanged |
| AC7 | DEC-187 assertion changes (rename answers 1; no-op sends 1 and stays 1; `updatedAt` checks kept); fake, comment, catalog row; web 855/855 |
| AC8 | gate PASS on `2c71ec3`; `contract-drift` OK; CI on the PR |

Table test: `patchTransitionsOfAUsernameChangeAtAnUnchangedInstant`, 8 rows (rename, rename + profile, case-only, same username after strip, equal
values, stale, taken, invalid), each asserting status, code, `version`, `updatedAt`, username read back and audit count; the clock never advances.

AC4 note: the waiting tab usually fails first at identity's `findForUpdateById` lock upgrade (its managed account is stale by `@Version`), also
translated to 409; hence the deterministic stale-path test of the forced increment itself.

## AC5 mutation runs (local, uncommitted, reverted; `git status` clean)
- (i) forced increment removed: 5 of 30 failed: `StudentUsernameRaceTest.twoConcurrent…:99` (winner version 0; statuses still 200 + 409 from the
  account version), `aUsernameOnlyChangeBumpsVersionSoTheSecondTabIsStale:296`, `patchTransitions…:345 [rename]`,
  `aUsernameChangeBumpsVersionAndANoOpPatchKeepsIt:275`, `aUsernameChangeAppliesUniqueness…:582`.
- (ii) increment forced unconditionally: all 30 HTTP tests green (Hibernate skips the second increment); `StudentServiceVersionTest…:71` red
  (1 of 3), green after revert.
- extra: `OPTIMISTIC_FORCE_INCREMENT` makes `aStaleForcedIncrementFailsAtOnce…:142` fail; green after revert.

## LC rulings before G3 (L-10; recorded in the merge DEC)
1. Mechanism: `EntityManager.lock` from a repository fragment instead of a `@Lock` finder (which issues only `select … for no key update` for an
   already-managed entity in Hibernate 7.4.13): accepted; it is a translated Spring Data repository method, not `OPTIMISTIC_FORCE_INCREMENT`.
2. AC5 (ii) "AC3 fails with v+2" is not observable over HTTP (Hibernate skips the second increment); proven red by the unit test: accepted.
3. The extra stale-path test: in scope (it proves the packet's named risk, a 500 instead of a 409).

## Self-check (backend)
No module boundary crossed (`students` already calls `AccountApi`; no `identity` change); constructor injection; `@Transactional` only on the
service; injected `Clock`; no forbidden identifiers; no new `shortcut:`/`ponytail:` marker; no new endpoint (authz matrix and isolation harnesses
green); contract unchanged; no migration; no dependency; only the DEC-187 assertions changed; the race test asserts outcomes only. Frontend
standards: not applicable (no UI change).

## Open questions
None (no L-10 defect). Accepted, untested: the same-username race (200 + 200).

## G3 (tier M: one fresh QA reviewer)
| Round | Reviewer | Head | Verdict | Tokens | Duration |
|---|---|---|---|---|---|
| G0 | docs-reviewer (3 passes) | `a3155a6` → `44e4c17` | CHANGES REQUESTED → PASS WITH MINOR → PASS | 66,998 (cumulative) | 285 s |
| impl | backend-implementer | `2c71ec3` | gate PASS | 157,948 | 1,862 s |
| G3 | qa-evaluator | | | | |
