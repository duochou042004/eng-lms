# Security review — T-M2.1 Identity core (PR #52)

Reviewer: security-reviewer (G3, fresh context, own worktree; read-only on product code). Recorded by the LC from the reviewer's replies (agents cannot write
report files). Scope: `identity/**`, `audit/**`, `shared/**` (ProblemException, ProblemResponses, SecurityHeaders, valve, SpaFallbackFilter), migrations
`V202610040001`/`V202610040002`, `application.properties`, `pom.xml`, bundled lists, docs.

## Round 1 — head `57c9cfe` (base `20625d9`), 2026-10-04 — `SEC-REVIEW T-M2.1: CHANGES REQUESTED`

Ran 16 test classes (163 tests, green) and black-box probes against the packaged jar on ports 18080/18081 with a throwaway `postgres:18` (`-Xmx512m`, tutor
from a secret file); the throttle was raised only for the timing probe.

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| S2-1 | S2 | `AuthenticationService.attempt` (:90-108) and `changePassword` (:146-177) hold a `PESSIMISTIC_WRITE` row lock across bcrypt. 6 parallel wrong-password logins: unknown user 0.37 s wall, existing user a staircase to 1.93 s (username oracle under concurrency; 2 requests suffice; defeats T16). A 30-request burst on one username stalled an unrelated login to 6.4 s (Hikari connections wait on the lock), also while locked | Fix: read without lock, bcrypt with no transaction/connection, then a short `REQUIRES_NEW` tx with `findForUpdateById` that re-checks and records; same for `changePassword`; parallel-timing and burst tests |
| S2-2 | S2 | No body or field size limit on the anonymous JSON auth endpoints (Jackson 3.1.5: 100 MB strings, unlimited documents; security.md §6 "1 MB" unenforced; the throttle runs after parsing): 90 MB username → 2.1 s; 6 parallel → `OutOfMemoryError`, 500s (§11.4 fails) | Fix: ~1 MB body cap on `/api/**` (413 Problem Details) + early field bounds before normalisation/DB/bcrypt, same generic 401 on login |
| S3-1 | S3 | Parallel requests with one remember-me cookie after the session ends → `CookieTheftException` → 500 and all tokens wiped (fails safe; breaks AC5 for a parallel-loading SPA) | Fix: map to 401 `SESSION_EXPIRED` + concurrent test. Race: LC decision DEC-092 (SPA contract for T-M2.4: one `GET /auth/session` completes before parallel calls; no grace-window column) |
| S4-1 | S4 | A login committing just before `AccountApi.disable` can store its session after `endAllSessions` (ms window) | Tracked for T-M2.3 (archive), DEC-092 |
| S4-2 | S4 | Login without `rememberMe` leaves a previous user's remember-me cookie (`AuthSessions.java:54-57`) | In-task |
| S4-3 | S4 | Remember-me issued/renewed while must-change; `changePassword` accepts an expired temporary password as current | In-task |
| S4-4 | S4 | Passwords not NFC-normalised (Vietnamese input methods differ); cheapest before the first production hash | In-task |
| S4-5 | S4 | `HEAD /api/v1/meta` → 401 anonymous (`SecurityConfiguration.java:156` permits GET only) | In-task |
| S4-6 | S4 | BIP-0039 provenance cites `ce1862ac` whose header has no licence line; `License: MIT` is on current master (blob `942040ed…` identical) | In-task |
| S4-7 | S4 | Insecure-cookie escape keys only on the `local` profile name | In-task (if a `prod` profile exists) |
| S4-8 | S4 | `server.forward-headers-strategy` not defaulted for production (all clients share Caddy's IP: one throttle bucket, useless audit IPs); Tomcat's default `internalProxies` also trusts 169.254/16, 100.64/10, IPv6 loopback/link-local/ULA | In-task (startup WARN + deployment.md) |
| S4-9 | S4 | Anyone knowing the tutor's username can keep it locked (10 per 15 min stays under the per-IP throttle) | Accepted risk, security.md §3 |

**OQ-a verdict (bcrypt 72 bytes vs the 128-character policy): keep the truncation.** `TruncatingBCryptPasswordEncoder` hashes the first 72 UTF-8 bytes with
`$2a$12` (classic bcrypt, verifiable by the stock encoder). Capping makes the limit script-dependent (~24 Vietnamese characters) and changes NFR-SEC-06;
pre-hashing needs its own `{id}`, an ADR and has known footguns (NUL bytes, shucking). The argon2id ADR later removes the limit via rehash on login.
Follow-ups: override `matches` to truncate explicitly (Spring 7.1.1's `matches` → `checkpw` truncates today); combine with S4-4.

Checks that passed (security.md §11 and the focus list):
- §11.1: `@Audience`/registry handed to T-M2.2 — **T-M2.2 must register `GET /auth/session`, `POST /auth/login`, `/auth/logout`, `/auth/password`**.
- §11.2/§11.3/§11.8: no student handlers; `SessionResponse`/`AccountView` carry only the user's own account, no hash or lock fields. §11.5: no files.
- §11.6 logs: bootstrap logs no secret (no Boot "generated security password"); policy failures list codes only; a missing file names only the path; the CLI
  prints the password once to stdout; `toString`s of request DTOs, `OperatorReset` and `UserAccount` omit secrets; no hand-parsed `X-Forwarded-For`.
- §11.7 migrations: new tables only, named constraints, `ux_user_account__single_tutor` (tested), Spring Session schema as shipped,
  `persistent_logins.username` = userId, `audit_event` append-only via an `UPDATE`-rejecting trigger (app role can still DELETE/TRUNCATE, documented).
- Dependencies: Spring Security 7.1.1, Spring Session JDBC 4.1.1 (Boot-managed, Apache-2.0); CVE scanning via Trivy/Dependabot (T15).
- Session fixation: `ChangeSessionIdAuthenticationStrategy` + CSRF token rotation at login; password change rotates and ends other sessions; remember-me login starts a fresh session.
- Cookies (live): `ENGLMS_SESSION` `Path=/; Secure; HttpOnly; SameSite=Lax`; `ENGLMS_REMEMBER_ME` `Max-Age=2592000; Secure; HttpOnly; SameSite=Lax`;
  `XSRF-TOKEN` `Secure; SameSite=Lax` (JS-readable by design); `secure=false` without `local` fails startup.
- CSRF: every unsafe method on login, logout, password, a tutor path, an unmapped path and an SPA path → 403 `CSRF_INVALID` (anonymous, missing, forged).
- L1 order CSRF → 401 → `FORBIDDEN_ROLE` → must-change → 404; `/api/**` only requires authentication (no `denyAll`); the must-change filter covers unmapped paths
  and allows exactly the four requests.
- Enumeration bodies identical; locked → 401 not 423; disabled/locked still run `matches` (timing equal sequentially only, S2-1).
- Lockout/throttle: count restarts at the lock (`ACCOUNT_LOCKED` once); attempts during a lock don't extend it; throttle keyed on `getRemoteAddr()`, rejected
  attempts don't extend the window, map swept past 10k IPs.
- Remember-me deletion by userId (`SessionTerminator.java:36-43`) on disable, password change, operator reset and a lock via password change; disabled
  account's cookie rejected.
- Audit: synchronous `@EventListener`, `AuditApi.record` `REQUIRES_NEW`, events published after commit; rows carry no password, hash, series, token, session
  ID or attempted username (`row_to_json` test).
- CLI isolation: no bootstrap bean, no scheduled tasks, one `ApplicationRunner`, exit 2 without a tutor, Modulith moments off.
- Temp-password generator: `SecureRandom`, 3 of 2046 words + 2 digits ≈ 39.6 bits, ≥ 14 characters (adequate for online-bounded 7-day must-change credentials).
- Licences: SecLists MIT (verified at the pinned commit); BIP-0039 MIT on master (S4-6).
- Headers: CSP + four headers from Spring Security, one shared source (`SecurityHeaders`); `no-store` on `/api/**`; live CSP on `/assets` matches §5.
- Management port (DEC-050): chain excluded; :8081 exposes only `/actuator`, health, info; the app port's `/actuator/health` → 404.
- TRACE/dot-segments (live): `TRACE /api/v1/meta` + `Accept: text/html` → 405 `application/problem+json`; raw `/x/../actuator/health` → 400.
- Tests/fixtures: dummy passwords and runtime-generated hashes only.

## Round 2 — head `79f995c` (delta from `57c9cfe`), 2026-10-04 — `SEC-REVIEW T-M2.1: APPROVED`

Ran 16 test classes (181 tests, green) and probes against the packaged jar on 18080/18081 (`-Xmx512m`, `postgres:18` on 55433; throttle raised only for timing).

| ID | Status | Evidence |
|---|---|---|
| S2-1 | Fixed | 6 parallel wrong logins: unknown 0.37 / 0.31 s, existing 0.35 / 0.33 s, no staircase (was 1.93 s); unrelated login during a 30-burst 0.37 s (was 6.4 s) |
| S2-1 TOCTOU | OK | 25 parallel wrong logins on one account: exactly 10 `BAD_PASSWORD`, one lock, one `ACCOUNT_LOCKED`, 15 rejected as locked; the `REQUIRES_NEW` re-check (status, lock, unchanged hash, then count) rejects an attempt whose hash changed between read and write; `changePassword` likewise |
| S2-2 | Fixed | 2 MB → 400 in 0.01 s; chunked 3 MB → 400; 90 MB → answered after 1 MB, connection closed; 6 × 90 MB parallel → no OOM, health 200; username 65 / password 1025 → 401 identical to unknown-user, audited `REJECTED_INPUT` |
| S3-1 | Fixed as decided (DEC-092) | Reused rotated token → 401 `SESSION_EXPIRED`, WARN, no ERROR; 4 parallel → no 500; HTML route → SPA shell by test `aReusedRememberMeTokenOnAnHtmlRouteGetsTheSpaShell` (probe jar had no `static/`) |
| S4-1 | Deferred to T-M2.3 (DEC-092) | Accepted |
| S4-2 | Fixed | B logging in with A's cookie deletes A's series and cancels the cookie; A's old cookie → 401 |
| S4-3 | Fixed | Must-change login with `rememberMe` → no cookie; existing token refused; expired temp password rejected and counted |
| S4-4 | Fixed | NFC in login, change, bootstrap and policy |
| S4-5 | Fixed | HEAD `/meta` 200, passes the gate |
| S4-6 | Fixed | Blob `942040ed…`, MIT header at `0d1b892d` |
| S4-7 | Fixed | Refused with `prod` (test) |
| S4-8 | Fixed (WARN) | Startup WARN outside `local` (test); deployment.md |
| S4-9 | Accepted risk | security.md §3 |
| OQ-a | Kept; `matchesNonNull` truncates explicitly | `itsOwnMatchesTruncatesExplicitly` |

Other changes checked: `ApiCsrfTokenRepository` restricts only `saveToken` to `/api/**`; `loadToken` and the check still run on every unsafe request, login still
rotates the token (no weakening). CLI: unknown command → exit 1, one stderr line, no change; reset → exit 0, password once on stdout, in no log line. NFC vs existing
hashes: no production data yet (go-live M8), fixtures and temp passwords are ASCII; accepted.

New findings (S4 only):
| ID | Sev | Finding | Disposition |
|---|---|---|---|
| S4-10 | S4 | The over-long-input branch calls `encoder.matches("", dummyHash)`, which returns immediately (0.01 s vs 0.31 s); not an oracle (depends only on the attacker's input length, same for existing and unknown accounts), but the comment, docs and test name claim equal cost | Fixed in-task (see the summary) |
| S4-11 | S4 | `@ConditionalOnExpression` splices `${englms.cli}` into SpEL (`UnknownCliCommand`, `TutorBootstrap`, `AuditRetentionJob`): a `'` in the value is evaluated as SpEL; only the operator controls JVM args/env (no privilege boundary) | Fixed in-task (see the summary) |
| S4-12 | S4 | A failed login carrying A's remember-me cookie first auto-logs A in and rotates A's cookie (stock filter order); a successful login by B deletes A's series (verified) | Note for T-M2.4 shared-device UX; no action |

Verdict: all round-1 S2/S3 fixed and confirmed black-box; **APPROVED**, provided CI is green on the final head.

Recorder's note (LC): S4-10 and S4-11 were fixed by the LC at `3c8b882`; `SEC-REVIEW T-M2.1: APPROVED` was posted on PR #52 (2026-10-05T15:43Z) after CI was green on the final head `a6deca2` (DEC-093).
