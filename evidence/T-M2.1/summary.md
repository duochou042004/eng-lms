# T-M2.1 evidence summary: identity core

Packet: `docs/tasks/T-M2.1-identity-core.md` · Branch `feature/T-M2.1-identity-core` (from `develop` `20625d9`; start signal DEC-091) · Implementer: backend-implementer
(own worktree). Recorded by the LC from the implementer's final report (the harness denied the agent this file).

## Implementation

### Results
- `ENGLMS_TASK=T-M2.1 ./scripts/gate.sh` PASS at `9b8382a` (13 steps, 364 s): `gate-20261004T094833Z.log`. Backend 196 tests; contract-drift green; E2E smoke 86 passed,
  19 skipped. The worktree has no `.env`, so the e2e step ran against a throwaway PostgreSQL 18 (port 55432) with `SPRING_DATASOURCE_*` exported (CI's mode).
- Timing-sensitive tests ×20 (qa-protocol §3, DEC-088): 20/20 green, 15 tests per run (throttle window, lockout expiry, retention purge with a fixed clock, login
  timing): `repeat-x20.txt`.
- SPA smoke screenshots at phone-small / tablet / laptop: `screenshots/`.

### AC → proof (tests under `backend/src/test/java/com/englms/`)
| AC | Proof |
|---|---|
| AC1 | `identity/StartupScenariosTest`: tutor created with must-change + `BOOTSTRAP_TUTOR_CREATED`; existing tutor → one INFO line; missing file, one variable only, or a policy-failing password stop startup without printing it. `FlywayMigrationTest.theDatabaseRejectsASecondTutor` |
| AC2 | `identity/AuthApiIntegrationTest` (real port): body shape, `HttpOnly; Secure; SameSite=Lax; Path=/`, session-ID rotation, session row indexed by `userId`, 12 h idle, `last_login_at`, audit row, `next` ignored, concurrent sessions. `StartupScenariosTest`: session survives a restart; insecure cookie refused without the `local` profile |
| AC3 | Identical 401 bodies (unknown user, wrong password, disabled, expired temporary password); `AuthenticationServiceTest`: encoder runs for an unknown user; timing tolerance: medians of 5 attempts differ by < max(100 ms, half the wrong-password median) |
| AC4 | Lockout integration test + `UserAccountTest`; `LoginThrottleApiTest` (429 + `Retry-After`, any username); `LoginThrottleTest` (controlled clock) |
| AC5 | Re-authentication after the session row is deleted or idle-expired, token rotated; 30-day cookie with secure flags; none without `rememberMe`; a 31-day-old token is rejected |
| AC6 | 204, both cookies expired, only this device's token deleted; old cookie → `SESSION_EXPIRED`, no cookie → `UNAUTHENTICATED`; `no-store` on 200/401/403/404/422/429; asset and `index.html` caching unchanged |
| AC7 | Wrong current password → 422, counted toward the lockout; reaching the lock this way ends all sessions and tokens; every policy field code; success rotates the session, ends other sessions/tokens, stores `{bcrypt}$2a$12$`, audits |
| AC8 | Must-change tutor and student cases; `/meta` 200; `POST /auth/register` and login also gated |
| AC9 | `/register`, `/signup` → 404 for non-HTML requests; `POST /api/v1/auth/register` with CSRF → 404; anonymous 401, wrong role 403, unmapped path 404 when signed in; CSRF 403 for 4 methods × 6 paths × missing/forged token; disable/enable |
| AC10 | `ApplicationIntegrationTest`: exact header values on API JSON; raw dot-segments → 400 Problem Details; `TRACE` → 405 JSON with and without `Accept: text/html`, nothing reflected; existing header tests green; management port still without the security headers |
| AC11 | `ResetTutorPasswordCliTest` (web type none): one password printed, 7-day expiry, lockout cleared, sessions/tokens ended, audit row, no bootstrap or scheduled job in its context; no tutor → exit 2. `AuditIntegrationTest`: purge with a fixed clock, row survives a rollback; no secrets in audit rows; append-only trigger |

`ModularityTests`, ArchUnit, `ForbiddenIdentifiersTest` and the OpenAPI contract test are green. `audit` depends only on `shared` and `identity :: events`; identity never calls audit.

### Endpoints T-M2.2 must register
| Endpoint | Anonymous | Tutor / student | Must-change user |
|---|---|---|---|
| `GET /api/v1/auth/session` | 401 (primes the CSRF cookie) | 200 | 200 |
| `POST /api/v1/auth/login` | 200 / 401 / 429 | 200 | 403 |
| `POST /api/v1/auth/logout` | 204 | 204 | 204 |
| `POST /api/v1/auth/password` | 401 | 204 / 422 | 204 / 422 |

### Choices within the design-note latitude
- JSON login is a controller (springdoc documents it), not a filter. The session principal carries the must-change flag; every path that sets it ends the user's sessions first.
- Account changes commit in short transactions with the account row locked; events are published after commit.
- The lockout counter restarts when the lock is set (`ACCOUNT_LOCKED` audited once). A login lock does not end existing sessions; the password-change path does.
  Remember-me keeps working while locked, is rejected for a disabled account. Logout deletes this device's token only; a password change deletes all.
- The throttle counts accepted attempts only (exact `Retry-After`). The generic login failure code is `UNAUTHENTICATED`.
- Temporary passwords: `word-word-word-NN`, ≥ 14 characters, ≈ 39.6 bits, BIP-0039 list minus 2 words banned by the forbidden-identifier test.
- The bootstrap runs before the web server accepts requests; with an empty table and neither variable set the app starts with a WARN (E2E smoke and CI need this).
- Bundled lists: SecLists top-10k common passwords and BIP-0039 (both MIT); sources, checksums, licences in tech-stack §7 and `backend/src/main/resources/identity/THIRD-PARTY-NOTICES.txt`.

### Deviations and test changes (no assertion weakened)
- `MetaControllerTest` and `SpaServingTest` load the full app with a test database (headers come from the security chain); `/api/**` cases run signed in; unsafe methods send a valid CSRF pair; `/api;x=1/v1/x` has its own test (firewall 400, never the SPA).
- Two `ApplicationIntegrationTest` cases expect 401 for anonymous `GET /api/v1/x` (AC9); their Problem-Details and logged-once checks are unchanged. `FlywayMigrationTest` lists include the new migrations.
- Testcontainers get 3 start attempts (rootless Podman's service exits after 5 s idle → "Broken pipe" during full runs).
- runbooks §4 command fixed (`JarLauncher` from `/app`; no `/app/app.jar`). The security chain is limited to the application port (:8081 keeps no security headers, DEC-050).
  Spring Modulith's scheduler is off whenever `--englms.cli` is set.

### Known limitations / open questions
- **OQ-a (SEC verdict needed):** the policy allows 128 characters but bcrypt in Spring Security 7 refuses > 72 bytes; the implementation hashes the first 72 bytes (classic bcrypt behaviour, verifiable by the stock encoder). Alternatives: cap at 72 bytes (changes NFR-SEC-06) or pre-hash.
- `/register` and `/signup` in a browser get the SPA shell whose router shows not-found (SPA fallback unchanged, out of scope); the server has no handler.
- An unknown `--englms.cli=` value exits 0 and does nothing (not in the packet).
- `.env.example` not updated (reading it is denied): the PO adds `ENGLMS_BOOTSTRAP_TUTOR_USERNAME`, `ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE`.
- Which engine refuses Secure cookies on `http://localhost` is unverified (no browser sign-in yet); T-M2.4 decides on the `local` profile for its E2E.
- gitleaks not installed locally (CI's secret scan covers the bundled lists). CLI and bootstrap checked against the packaged jar, not the rebuilt image.

### Commands
```bash
(cd backend && ./mvnw -B -ntp verify)
(cd backend && ./mvnw -B -ntp -q test -Dtest=OpenApiContractTest -Dcontract.write=true -Dsurefire.failIfNoSpecifiedTests=false) && (cd web && pnpm api:generate)
./scripts/contract-drift.sh
ENGLMS_TASK=T-M2.1 ./scripts/gate.sh
```

### Docs updated
api-catalog, api-conventions §5/§7, security.md §2/§3/§4/§5/§8/§10, data-model §3/§4, module-boundaries, tech-stack, runbooks §1/§4, deployment §3, development-setup §2,
traceability matrix (FR-AUTH-06 and A-021 already amended). Web: regenerated API types only.

## G3 round 1 fixes (DEC-092) — head `ced08f0`
SEC round 1 CHANGES REQUESTED and QA PASS WITH MINOR at `57c9cfe` (records: `review/security.md`, `qa/report.md` via the QA record PR). Fixed in-task (DEC-088):

| Finding | Fix | Test (`AuthApiIntegrationTest` unless named) |
|---|---|---|
| S2-1 | Login and password change read the account without a lock and run bcrypt with no transaction/connection; a short `REQUIRES_NEW` tx locks by ID, re-checks status, lock, expiry and an unchanged hash, then writes. The locking lookup by username is removed | `parallelFailedLoginsTakeSimilarTimeForUnknownAndExistingUsernames`, `anUnrelatedLoginStaysFastDuringABurstOnOneUsername` (both in the ×20 set) |
| S2-2 | JSON parsing stops at 1 MB (chunked too) → 400 `MALFORMED_REQUEST`; login username > 64 or password > 1024 characters → generic 401, no lookup, one dummy bcrypt, audit reason `REJECTED_INPUT` | `anOversizedBodyIsRefusedAndOverLongFieldsGetTheGeneric401`, `AuthenticationServiceTest.overLongInputIsNeverLookedUpButStillRunsTheEncoder` |
| S3-1 / QA F1 | Reused or rejected remember-me → 401 `SESSION_EXPIRED` (WARN, no 500); SPA shell on HTML routes; race handled by the T-M2.4 SPA contract (security.md §3) | `aReusedRememberMeTokenIs401SessionExpiredNotA500`, `parallelRequestsWithOneRememberMeCookieNeverAnswer500`, `aReusedRememberMeTokenOnAnHtmlRouteGetsTheSpaShell` |
| S4-2 | Login deletes a remember-me token it was sent with; logout sends no cancel cookie when there was none | `aLoginDeletesTheRememberMeTokenItWasSentWith` |
| S4-3 | No remember-me issued or honoured while must-change; an expired temporary password is rejected as current | `aMustChangeUserGetsNoRememberMe`, `anExpiredTemporaryPasswordIsNotAcceptedAsTheCurrentPassword` |
| S4-4 | NFC normalisation before policy, hash and compare (incl. bootstrap) | `PasswordPolicyTest.normalisesToNfc`, `passwordsAreComparedInUnicodeNfc` |
| S4-5 | `HEAD /api/v1/meta` public and through the gate | `headMetaIsPublicAndPassesTheGate` |
| S4-6 | BIP-0039 provenance: blob `942040ed…`, MIT header at bitcoin/bips `0d1b892d…` (notices + tech-stack §7) | — |
| S4-7 | Insecure cookies refused under `prod` even with `local` | `StartupScenariosTest.insecureCookiesAreRefusedUnderTheProdProfileEvenWithLocal` |
| S4-8 | Startup WARN outside `local` without `server.forward-headers-strategy`; deployment.md §3 (`SERVER_FORWARDHEADERSSTRATEGY=native`, trusted ranges, Caddy overwrites `X-Forwarded-For`) | `StartupScenariosTest.aMissingForwardHeadersStrategyIsWarnedAbout` |
| S4-9 | Lock-out by a username-knower documented as accepted risk (security.md §3) | — |
| OQ-a | Keep truncation; the encoder's `matches` truncates to 72 bytes explicitly | `TruncatingBCryptPasswordEncoderTest.itsOwnMatchesTruncatesExplicitly` |
| QA F2 | `XSRF-TOKEN` written only on `/api/**` responses | `staticResponsesCarryNoSetCookie` |
| QA F5 | Unknown `--englms.cli` value → one stderr line naming the commands, exit 1 (runbooks §4) | `ResetTutorPasswordCliTest.anUnknownCommandExitsWithOneAndNamesTheKnownCommands` |

Results: `./mvnw verify` 214 tests green; contract-drift green (no DTO change); timing set ×20: 20/20 runs, 18 tests each (now with the parallel-login and burst
tests), appended to `repeat-x20.txt`; `ENGLMS_TASK=T-M2.1 ./scripts/gate.sh --from scripts` PASS at `11990d0` (12 steps, E2E 86 passed): `gate-20261004T141119Z.log`
(docs step run by the LC; it failed in the worktree only on the then-unrecorded DEC-092 reference). Notes: the burst bound is relative to a lone login's median
(an absolute 2.5 s bound failed once at 2.9 s under QA's concurrent E2E; the old lock behaviour was ≈ 20× the median). A password change now reports only the first
kind of problem (`PASSWORD_UNCHANGED` is not added to policy errors; saves one bcrypt). Deferred: S4-1 → T-M2.3, QA F3 → T-M2.4 (backlog), F4 accepted (DEC-092).

## G3 round 2 (SEC APPROVED at `79f995c`; S4s fixed in-task by the LC)
- S4-10: the over-long-input branch now matches a non-empty probe string against the dummy hash (the encoder short-circuits an empty password), so it pays one
  full bcrypt like any failure; `AuthenticationServiceTest.overLongInputIsNeverLookedUpButStillRunsTheEncoder` verifies the probe; security.md §3 wording.
- S4-11: the CLI conditions (`UnknownCliCommand`, `TutorBootstrap`, `AuditRetentionJob`) read `environment.getProperty('englms.cli', '')` instead of splicing
  `${englms.cli}` into SpEL; `ResetTutorPasswordCliTest.anUnknownCommandExitsWithOneAndNamesTheKnownCommands` is parameterised with a quote-containing value.
- S4-12: note for T-M2.4 (shared-device UX), no change. Targeted run: ResetTutorPasswordCliTest 4, AuthenticationServiceTest 2, StartupScenariosTest 11,
  AuditIntegrationTest 4, ModularityTests green; full verification by CI.
- CI at `3c8b882`: `anUnrelatedLoginStaysFastDuringABurstOnOneUsername` failed on the 2-core runner (6316 ms during the burst vs 347 ms alone: 30 parallel
  bcrypts are CPU-bound there). The test now compares the unrelated login during a burst on `tutor.one` with the same burst on unknown usernames (same CPU
  load, no row to lock): bound `unknown × 1.5 + 1000 ms`. Mutation check (bcrypt moved back inside the locked transaction): this test fails at 6517 vs 708 ms
  and `parallelFailedLoginsTakeSimilarTimeForUnknownAndExistingUsernames` at 1857 vs 309 ms; restored, `AuthApiIntegrationTest` 53/53 green.
- `review/security.md` is not on this branch (path ownership: implementation branches must not write reviewer evidence); the LC records it in the post-merge
  record PR together with the QA report.
