# QA Report — T-M2.1 Identity core: accounts, tutor bootstrap, login/logout/session

Round 1: `QA-VERDICT T-M2.1: PASS WITH MINOR` (one S3, four S4; no S1/S2/SCOPE) at `57c9cfe` · **Re-test: `QA-VERDICT T-M2.1: PASS` at `a6deca2`** (PR #52) · 2026-10-04 (UTC 09:57–13:59, incl. a rate-limit pause) ·
Evaluator: independent qa-evaluator, fresh context, detached worktree. Verdict formed before reading `evidence/T-M2.1/summary.md`; the implementation diff was not
read (test names only, to pick the ×20 set). Recorded by the LC from the evaluator's final reply (agents cannot write report files).

## Environment
- Packaged jar with the SPA, built as `scripts/e2e-run.sh` does (`pnpm build` → `mvnw process-resources` → `web/dist` into `target/classes/static` → `mvnw package
  -Dmaven.test.skip=true`); `java -jar` on :8080 (management :8081).
- Throwaway `docker.io/library/postgres:18` (127.0.0.1:55439) with `SPRING_DATASOURCE_*` exported (CI mode); no `.env` read.
- Bootstrap: `ENGLMS_BOOTSTRAP_TUTOR_USERNAME=QaTutor`, `ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE=<scratch>/secrets/tutor-password` (random, mode 600).
- Client: stdlib Python HTTP client with a manual cookie jar (raw `Set-Cookie`), curl `--path-as-is` for raw paths, source IPs 127.0.0.x for separate throttle
  windows; Chromium browser pane for the SPA smoke.
- STUDENT rows inserted by SQL (no students module yet, as the packet's tests do). Lock and temp-password expiry simulated by SQL twice, plus one real 1-minute
  lock (`ENGLMS_SECURITY_LOCKOUT_DURATION=1m`).
- Cleanup: app stopped, container removed, no java on 8080/8081, viewport reset, worktree clean.

## AC results
| AC | Scenarios (black-box) | Result |
|---|---|---|
| AC1 | Empty DB + valid file → 1 TUTOR, must-change, `{bcrypt}$2a$12$`, `BOOTSTRAP_TUTOR_CREATED {}`. Missing / unreadable (chmod 000) / 8 chars / `1234567890` / = username → exit 1, message names the code or path, never the password (grepped). Tutor present → one INFO "variables are ignored". Second TUTOR insert rejected by `ux_user_account__single_tutor` | PASS |
| AC2 | `"  QATUTOR  "` and unaccented `"  DAO HOA "` (student `Đào Hoa`) log in; 200 body without hash/lock fields; `ENGLMS_SESSION; Path=/; Secure; HttpOnly; SameSite=Lax`; `next` ignored, no `Location`; ID rotation; sessions survive a full restart (plain and remember-me); concurrent sessions; `last_login_at`, `LOGIN_SUCCEEDED`; principal = `userId`; insecure cookie without `local` → exit 1 | PASS |
| AC3 | Unknown / wrong password / locked + correct / disabled / expired temp / NBSP-padded username → one identical body and header set (`UNAUTHENTICATED`). Medians over 23 samples: 315 / 315 / 316 / 315 ms (spread ≤ 16 ms); empty username short-circuits (7 ms, reveals nothing). `LOGIN_FAILED` with `details.reason` only, no attempted username/password in `audit_event` | PASS |
| AC4 | 10 failures → locked, `ACCOUNT_LOCKED` once, correct password during lock → same 401; real 1-minute lock: correct password after 62 s, counter reset. Throttle: 31st attempt → 429 `RATE_LIMITED`, `Retry-After: 291`, no-store; spoofed `X-Forwarded-For`/`Forwarded` no bypass; other IPs and other endpoints unaffected | PASS |
| AC5 | `ENGLMS_REMEMBER_ME; Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`; none without `rememberMe`; after the session row is deleted the cookie re-authenticates (same series, rotated token); 2 concurrent requests 5/5 → 200; replaying the old cookie wipes all tokens but answers 500 (F1) | PASS (F1) |
| AC6 | Logout without CSRF → `CSRF_INVALID`, GET → 405, POST → 204 no-store, both cookies expired, only this device's token deleted; old cookie → `SESSION_EXPIRED`, none → `UNAUTHENTICATED`; anonymous/double logout → 204. `no-store` on every `/api/**` status seen; `/assets/*` keep `max-age=31536000, public, immutable`, `/`, `/index.html`, SPA routes `no-cache` | PASS |
| AC7 | All six field codes seen; 128 characters accepted and logs in; success → 204, rotation, other sessions `SESSION_EXPIRED`, must-change cleared, `PASSWORD_CHANGED`; 10 wrong current passwords → lock, all 3 sessions and all tokens ended; anonymous → `UNAUTHENTICATED`; extra `role`/`userId` fields ignored | PASS |
| AC8 | Must-change tutor: `/tutor/x`, `/nothing`, `POST /auth/register`, `PATCH /auth/preferences`, `GET`/`POST /auth/login` → `PASSWORD_CHANGE_REQUIRED`; `/student/x` → `FORBIDDEN_ROLE`; `/meta` 200; body `mustChangePassword:true`. Must-change student symmetric | PASS (F3) |
| AC9 | `/register`, `/signup` → SPA not-found view (200 shell; SPA fallback out of scope); `POST /api/v1/auth/register` + CSRF → 404 Problem Details; anonymous → 401; cross-role → `FORBIDDEN_ROLE`; authenticated unmapped → 404; missing/wrong/header-only CSRF on POST/PUT/PATCH/DELETE → `CSRF_INVALID`; disabled (DB flip) → next request 401 incl. via remember-me, generic login 401, re-enable restores. `AccountApi.disable()` token deletion covered by `AuthApiIntegrationTest#disablingAnAccount…` (×20) | PASS |
| AC10 | CSP (`frame-src 'none'`) + four headers identical on HTML, SPA routes, assets, API JSON, Problem Details 401/403/404/405/422/429, firewall 400s, the 500 path; no XFO/HSTS. `/./api/v1/meta`, `/x/../actuator/health`, `%2e`, `%2e%2e`, `//`, `;jsessionid` → 400 `MALFORMED_REQUEST`, no echo. `TRACE /`, `TRACE /api/v1/meta` ± `Accept: text/html` → 405 JSON with headers and `X-Request-Id`, path not reflected | PASS |
| AC11 | Empty DB → exit 2, nothing created; reset while the app runs → exit 0, one `word-word-word-NN` line (20 chars) + expiry notice, not in logs; must-change, +7 days, lock cleared, both sessions and the token ended, previous temp password 401, `PASSWORD_RESET_BY_OPERATOR {}`; no bootstrap/scheduler messages; `UPDATE audit_event` rejected; purge covered by `thePurgeDeletesEventsOlderThan365DaysOnly` (20/20) | PASS (F5) |

SPA smoke: 360×780 `/` and `/register`, 768×1024 `/signup` and `/` (en), 1280×800 `/` → `/tutor`; no horizontal scroll, vi and en render, no console messages; the only
API call is `GET /api/v1/meta` → 200. No UI change: keyboard/axe not re-run.

## Exploratory charter (≈60 min): "As a curious student, try to become the tutor, stay logged in after being disabled, or learn whether a username exists"
- Become the tutor: second TUTOR row refused; mass assignment ignored; `FORBIDDEN_ROLE` on tutor paths (also with must-change); no registration route; forged or
  unknown-series remember-me → 401; no anonymous pre-login session, fresh ID at login.
- Stay logged in after disable: session and remember-me → 401 on the next request; login generic 401. A lock via password change and the operator reset end every
  session/token; a lock via login does not end live sessions (as security.md §3 states).
- Username existence: bodies, headers and timing identical across failure kinds; throttle username-agnostic; no oracle found (sequential; the SEC review measured
  a concurrency oracle, S2-1).

## Findings
| ID | Sev | Summary | Expected / actual | AC |
|---|---|---|---|---|
| F1 | S3 | A stale (rotated) remember-me cookie → 500: Boot's `/error` JSON on `/api/**`, the Whitelabel page with `Accept: text/html`, 500 instead of the SPA shell on `GET /` (= SEC S3-1) | Expected 401 `SESSION_EXPIRED` Problem Details / SPA shell; tokens are wiped correctly; headers present, nothing leaked | AC5, api-conventions §5 |
| F2 | S4 | `XSRF-TOKEN` set on every cookie-less response, including immutable `/assets/**` and `index.html` | Primed by `GET /auth/session` only; harmless behind Caddy, would matter with a shared cache | AC6 |
| F3 | S4 | While must-change, `POST /auth/login` itself gets 403 `PASSWORD_CHANGE_REQUIRED` (per AC8's list): T-M2.4's login page must log out before re-login | Note | AC8 |
| F4 | S4 | The top-10k list has only 51 entries ≥ 10 characters, so "too common" rarely fires (`password123`, `xxxxxxxxxx` accepted); conforms to NFR-SEC-06 | Note for PO/SEC | AC1/AC7 |
| F5 | S4 | Unknown `--englms.cli=` value (typo) exits 0 silently; runbooks §4 says exit 1 for any other failure | Non-zero + message | AC11 |

Not re-proved per the LC: the row lock across bcrypt and the missing body limit (SEC). Out of scope: `TRACE` on :8081 returns Boot JSON with `path` (DEC-050, never proxied).

## Repeat runs ×20 (DEC-088)
`./mvnw -B -ntp test -Dtest=AuditIntegrationTest,AuthApiIntegrationTest,AuthenticationServiceTest,UserAccountTest,LoginThrottleTest,LoginThrottleApiTest -Dsurefire.rerunFailingTestsCount=0 -Djacoco.skip=true`
— 20 fresh runs, no retries, app stopped: **20/20 green, 54 tests per run, 1080/1080 passed.** Each timing test 20/20: `unknownUsernameAndWrongPasswordTakeSimilarTime`,
`anUnknownUsernameRunsTheEncoderAgainstTheDummyHash`, `tenConsecutiveFailuresLockTheAccountWhichUnlocksAfterTheLockExpires`, `locksAtTheTenthConsecutiveFailureForFifteenMinutes`,
`rejectedAttemptsDoNotExtendTheWindow`, `allows30AttemptsPerIpIn5MinutesThenAsksToRetryWhenTheOldestLeavesTheWindow`,
`moreAttemptsThanTheLimitFromOneIpAre429WithRetryAfterRegardlessOfUsername`, `thePurgeDeletesEventsOlderThan365DaysOnly`.

## Isolation / privacy
No tutor-private data yet (no `SECRET-*` target). Session bodies carry no hash/lock fields; audit rows hold no password, hash, token or session ID (IP and user
agent only, documented); the CLI password goes to stdout only. Student A/B resource isolation starts with T-M2.2/T-M2.3; L1 role isolation verified.

## Re-test log — build `a6deca2`, 2026-10-05 — `QA-VERDICT T-M2.1: PASS`
Same environment (jar with SPA rebuilt at `a6deca2`, fresh `postgres:18`, tutor from a new secret file). The pass at `79f995c` was cut off by a rate limit
during its ×20 runs; everything it had shown was re-confirmed at `a6deca2`.

| ID | Status | Evidence |
|---|---|---|
| F1 (S3) | Fixed | Replayed rotated remember-me cookie: `/api/v1/auth/session`, `/api/v1/tutor/x` → 401 `SESSION_EXPIRED` Problem Details, no-store; `GET /`, `/tutor` (`Accept: text/html`) → 200 SPA shell, no-cache; `/meta` 200; every response clears `ENGLMS_REMEMBER_ME`; theft handling still wipes the tokens; the legitimate session stays 200 |
| F2 (S4) | Fixed | No `Set-Cookie` on `/`, `/index.html`, `/tutor`, `/register` or a hashed asset without cookies; caching unchanged; `GET /auth/session` still primes `XSRF-TOKEN` |
| F5 (S4) | Fixed | `reset-tutor-pasword`, `x' + 'y`, `reset-tutor-password' or 'a'=='a` → exit 1, one stderr line, nothing on stdout, no account or audit change |
| F3, F4 | Notes (spec-conform) | Unchanged by design (DEC-092) |

Regression of the fix areas: success body and case/trim; one distinct body over ~80 failures; sequential medians unknown 316, wrong 320, 10k-character
password (existing/unknown) 314/314, 300-character username 314, 100k username+password 314 ms (SEC S4-10 confirmed; over-long input does not count toward the
lockout, harmless as no valid password exceeds 128); 3 parallel rounds of 4 unknown + 4 existing: medians 318/324, 317/322, 315/320 ms, one body each; lockout
at the 10th failure, generic 401 during the lock, `ACCOUNT_LOCKED` once; throttle 31st → 429 `Retry-After: 291`, other IP unaffected; policy codes (9 → TOO_SHORT,
129 → TOO_LONG, `qwertyuiop` → TOO_COMMON, = username → TOO_SHORT + EQUALS_USERNAME without UNCHANGED, same → UNCHANGED, wrong current → CURRENT_PASSWORD_INCORRECT
only); change happy path (204, rotation, other session `SESSION_EXPIRED`, audited); must-change gate (`GET`/`HEAD /meta` 200, `/auth/session` 200, student path
and unmapped → `PASSWORD_CHANGE_REQUIRED`, tutor path → `FORBIDDEN_ROLE`, login gated); remember-me (none while must-change; happy path; logout deletes the token);
2 MB bodies on login and password → 400 `MALFORMED_REQUEST`; CLI after the S4-11 rewrite (reset exit 0, one password line, 7-day expiry, audited; no tutor → exit 2);
AC10 smoke (dot-segments 400, TRACE 405 with headers and `X-Request-Id`). SPA: backend-only delta; 360/1280 smoke at `79f995c` clean.

×20 at `a6deca2`: `./mvnw -B -ntp test -Dtest=AuditIntegrationTest,AuthApiIntegrationTest,AuthenticationServiceTest,LoginThrottleApiTest,LoginThrottleTest,UserAccountTest
-Dsurefire.rerunFailingTestsCount=0 -Djacoco.skip=true` — **20/20 runs green, 67 tests per run (1340/1340)**; each of `parallelFailedLoginsTakeSimilarTimeForUnknownAndExistingUsernames`,
`anUnrelatedLoginStaysFastDuringABurstOnOneUsername` and the eight round-1 timing tests 20/20.

New findings: none. Note: `GET /auth/session` with only `Accept: text/html` → 406 `NOT_ACCEPTABLE` Problem Details (content negotiation; the SPA sends JSON).

## Commands run (key)
- Bootstrap negatives: `timeout 60 java -jar englms-0.0.1-SNAPSHOT.jar` with a missing / short / common / username-equal / chmod-000 password file → exit 1 each;
  `SERVER_SERVLET_SESSION_COOKIE_SECURE=false` → exit 1.
- Probes: `curl -s --path-as-is -D - …` (headers, firewall, TRACE); the Python client for login, CSRF, must-change, password, logout, remember-me, lockout, throttle, timing.
- CLI: `java -jar … --englms.cli=reset-tutor-password --spring.main.web-application-type=none` against an empty DB (exit 2) and the real DB (exit 0, twice).
