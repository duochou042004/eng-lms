# T-M2.1: Identity core: accounts, tutor bootstrap, login/logout/session

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 checklist complete; waits for the PO start signal) |
| Owner role | BE (backend-implementer) |
| Branch | `feature/T-M2.1-identity-core` (from `develop`) |
| Depends on | M1 done (DEC-088) |
| Estimate | 2 agent-days (upper bound; split line under *Risks*) |
| Trace | SPEC §4.1–4.3, §37; FR-AUTH-01..06, FR-AUTH-09, FR-AUTH-10; NFR-SEC-04..07, NFR-SEC-11; ADR-0005, ADR-0006, ADR-0003; DEC-009, DEC-036, DEC-054, DEC-069, DEC-070; A-018, A-021, OQ-10 (default accepted); security.md §2 (T5, T6, T7, T11, T16, T17, T18), §3, §5, §8; data-model §2 (identity, audit), §3; api-conventions §5, §7; module-boundaries (identity, audit); runbooks §4 |

## Goal
The backend gets real accounts and sessions: exactly one tutor, created once from an operator secret; JSON login, logout and own-password change with
server-side sessions in PostgreSQL (Spring Session JDBC), optional 30-day remember-me, CSRF for the same-origin SPA, lockout plus per-IP throttling, the
must-change-password gate, an append-only audit log, and the security headers moved into Spring Security. After this task every `/api/**` request is either
explicitly public or authenticated, and the student and tutor namespaces are role-gated at the URL level (L1). The UI (login page, shells) is T-M2.4.

## Scope
- In:
  1. **`identity` module** (module-boundaries): `user_account` per data-model §2 (including the single-tutor partial unique index, I-01), the Spring Session
     JDBC tables and `persistent_logins` (DEC-036) in a forward-only Flyway migration (db-migration skill). `DelegatingPasswordEncoder` (`{bcrypt}`, strength 12),
     the password policy (NFR-SEC-06: 10–128 characters, not in the bundled common-password list, not equal to the username), `CurrentUser`, and
     `SessionTerminator.endAllSessions(userId)` (Spring Session's `FindByIndexNameSessionRepository` + the user's `persistent_logins` rows).
     `AccountApi.disable(userId)` / `enable(userId)` (used by T-M2.3's archive; no endpoint in this task).
  2. **Tutor bootstrap** (FR-AUTH-02): `ENGLMS_BOOTSTRAP_TUTOR_USERNAME` + `ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE` (a file path, never a password value).
  3. **Auth endpoints** (api-catalog "auth"): `GET /api/v1/auth/session`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `POST /api/v1/auth/password`.
     Problem Details codes `UNAUTHENTICATED`, `SESSION_EXPIRED`, `FORBIDDEN_ROLE`, `PASSWORD_CHANGE_REQUIRED`, `CSRF_INVALID` (and the validation codes
     the password policy needs) join `shared.ProblemCodes`.
  4. **Spring Security configuration**: the L1 URL gate of security.md §4 (`/api/v1/tutor/**` TUTOR, `/api/v1/student/**` STUDENT, `/api/v1/auth/**` and
     `/api/v1/meta` as listed, every other `/api/**` path denied); session cookie `ENGLMS_SESSION`; CSRF (cookie `XSRF-TOKEN` → header `X-XSRF-TOKEN`);
     lockout; per-IP throttle (in-memory, instance-local); the must-change gate; idle timeout 12 h and remember-me 30 days (A-021, OQ-10 default), both configurable.
  5. **Security headers into Spring Security** (DEC-054): the CSP and the four headers of security.md §5 come from Spring Security's header writers instead of
     `shared.web.SecurityHeadersFilter`; the T-M1.5/T-M1.8 header tests stay green (including the Tomcat-rejected responses that `ProblemDetailsErrorReportValve`
     answers); API responses carry `Cache-Control: no-store` (DEC-070).
  6. **Firewall regressions**: raw dot-segment paths are rejected, not answered with the SPA shell (DEC-054, T-M1.5 QA F3); `TRACE` no longer reaches Boot's
     `/error`/Whitelabel page (DEC-069, T-M1.8 SEC S4-3).
  7. **`audit` module v1** (NFR-SEC-11, security.md §8): `audit_event` per data-model §2 (append-only), `AuditApi.record(...)`, the actions this task emits,
     and the daily 365-day retention purge.
  8. **Operator tutor-password reset** (FR-AUTH-09): the `--englms.cli=reset-tutor-password` command of runbooks §4.
- Out of scope (explicit):
  - Any UI: login page, forgot-password disclosure, change-password page, role redirect in the SPA, shells (T-M2.4). The SPA keeps working against `/meta`.
  - `@Audience`, the policy registry and verifier, the authz-matrix and isolation harnesses, the secret scan, ArchUnit student rules (T-M2.2; T-M2.2 registers
    the four auth endpoints of this task). This task tests its own endpoints directly.
  - Students, student accounts, `POST /api/v1/tutor/students`, tutor reset of a student password, username suggestion/availability, archive (FR-STU-*, FR-AUTH-07,
    T-M2.3). FR-AUTH-08 is UI-only (T-M2.4).
  - `PATCH /auth/preferences` and settings (FR-SET-02, T-M2.6). An audit-log UI or `AuditApi.recent` endpoint (not in M2).
  - argon2id (later ADR), a distributed throttle store (single instance, ADR-0012), MFA, email, password-reset links (SPEC excludes self-service reset; DEC-008).
  - Changing `/meta`, the SPA fallback or asset caching beyond keeping them working under Spring Security.

## Guardrail answers (scope.md §6)
1. **Trace:** every scope item maps to FR-AUTH-01..06/09/10, NFR-SEC-04..07/11, ADR-0005 or the DEC entries above.
2. **Drift toward excluded scope?** No. No public registration, no SaaS tenancy (single tutor by DB constraint, ADR-0006), no OAuth/SSO, no email.
3. **Mandatory setup added?** One operator step that the deployment already documents (the bootstrap secret file, runbooks §1). Nothing for the tutor.
4. **Weekly use?** Yes: every tutor and student session goes through login and the session.
5. **Hard-coded semantics?** None. Roles TUTOR/STUDENT are platform roles, not curriculum or exam data.

## Design notes
- **Packages:** `com.englms.identity` (public API: `AccountApi`, `CurrentUser`, `SessionTerminator`, events `LoginSucceeded`, `LoginFailed`, `PasswordChanged`,
  `PasswordReset`, `AccountDisabled`), `identity.internal.{domain,persistence,web,security,bootstrap,cli}`; `com.englms.audit` (`AuditApi`),
  `audit.internal.*`. Dependencies follow module-boundaries (identity → shared, settings; audit → shared + events). Login-time audit writes are synchronous
  through `AuditApi.record` (security.md §8), so a failed login is audited even though the request fails. `ModularityTests` stays green.
- **Migrations** (db-migration skill; timestamped names like `V1`): identity (`user_account`, `ux_user_account__single_tutor`, the Spring Session JDBC
  PostgreSQL schema as shipped by the Spring Session version on the classpath, `persistent_logins` as `JdbcTokenRepositoryImpl` expects) and audit (`audit_event`
  with `ix (occurred_at DESC)`, `ix (action)`). The tables live in schema `app` like V1. Session and remember-me tables must work with the
  `app` search path (verify Spring Session's table-name property). `username_normalized` = `lower(unaccent(trim(username)))` computed by the application
  (the same function `students` will reuse) and checked by the unique index.
- **Remember-me and Spring Session:** ADR-0005 names `persistent_logins` (`PersistentTokenBasedRememberMeServices` + `JdbcTokenRepositoryImpl`). Ending a
  user's sessions must also delete their remember-me tokens, otherwise a cookie would revive a disabled or reset account. If the implementer finds that
  Spring Session's own `SpringSessionRememberMeServices` meets A-021 better, that is an ADR-0005 amendment and needs a DEC before code (not an in-task choice).
- **Session cookie:** `ENGLMS_SESSION`, `HttpOnly; Secure; SameSite=Lax; Path=/`. `Secure` is the default; a property may turn it off only for the
  local/E2E profile if a browser engine refuses Secure cookies on `http://localhost` (record which in the summary). Production config cannot turn it off silently
  (startup WARN at least).
- **CSRF:** Spring Security's SPA setup (`CookieCsrfTokenRepository` readable by JS, `X-XSRF-TOKEN` header). `GET /auth/session` primes the cookie (also for
  anonymous callers, who get 401 plus the cookie). Login itself requires the token. A missing or wrong token → 403 `CSRF_INVALID` Problem Details.
- **Login timing:** an unknown username still runs one password-encoder `matches` against a fixed dummy hash, so wrong-username and wrong-password take
  similar time (T16). Locked, disabled and expired-temporary-password accounts get the same generic 401 body as a wrong password.
- **Throttle:** a sliding window keyed by the client IP. The IP comes from `request.getRemoteAddr()`; Caddy's `X-Forwarded-For` is honoured only through Boot's
  `server.forward-headers-strategy` with the proxy trusted per deployment.md (do not parse the header by hand). Exceeding it → 429 with a Problem Details code
  (add `TOO_MANY_REQUESTS` or reuse a documented code; update api-conventions §5).
- **Headers:** security.md §5 values are unchanged (`frame-src 'none'` until the embed registry). Hashed `/assets/**` keep `max-age=31536000, immutable` and
  `index.html` keeps `no-cache` (T-M1.5): Spring Security's default cache-control writer must not override them. `ProblemDetailsErrorReportValve` keeps setting the
  same headers for responses Tomcat rejects before the filter chain (one source of the header values, shared by both).
- **Endpoints and contract:** springdoc picks up the four endpoints; `api/openapi.json` is regenerated and `pnpm api:generate` keeps contract-drift green.
  `GET /auth/session` returns `{userId, username, role, displayName, locale, timeZone, mustChangePassword}` (no hash, no lock fields).
- **CLI (FR-AUTH-09):** runs with `--spring.main.web-application-type=none`, prints a generated temporary password once to stdout (security.md §3 generator: 3 words + 2
  digits, `SecureRandom`), sets `mustChangePassword=true` and `temp_password_expires_at = now + 7 days`, clears the lockout, ends the tutor's sessions, writes an
  audit event, exits non-zero when no tutor exists, never creates a tutor. The bundled word list and common-password list need a licence compatible with the
  repository (record source and licence in tech-stack).
- **Decisions needed:** none blocking. OQ-10 runs on its default (12 h idle, optional 30-day remember-me).

## Acceptance criteria
- **AC1 (FR-AUTH-02, I-01):** Given an empty `user_account` and both bootstrap variables set (the password read from the file), startup creates one TUTOR with
  `mustChangePassword=true` and writes a `BOOTSTRAP_TUTOR_CREATED` audit event (no secret in its details). When a tutor exists, the variables are ignored and
  startup logs one INFO line. A missing/unreadable file or a password failing the policy stops bootstrap with an error that does not print the password.
  An integration test shows the database rejects a second TUTOR row.
- **AC2 (FR-AUTH-03, NFR-SEC-04):** `POST /auth/login` with a valid username (case-insensitive, trimmed) and password returns 200 with the session body, rotates the
  session ID (the pre-login ID no longer authenticates), sets `ENGLMS_SESSION` with `HttpOnly`, `Secure` (default config), `SameSite=Lax`, `Path=/`, and stores the
  session in the Spring Session JDBC tables (a restarted application context still accepts it). Concurrent sessions of one user are allowed (A-018).
  `LOGIN_SUCCEEDED` is audited and `last_login_at` set.
- **AC3 (FR-AUTH-03, T16):** Unknown username, wrong password, disabled account and expired temporary password all return the same 401 body; the unknown-username
  path runs the encoder (test: the encoder is invoked, and timing is within a documented tolerance on CI). `LOGIN_FAILED` is audited without the attempted password.
- **AC4 (NFR-SEC-05):** After 10 consecutive failures the account is locked for 15 minutes (both configurable): a correct password during the lock gets the same
  generic 401, `ACCOUNT_LOCKED` is audited once, and after the lock expires a correct password succeeds and resets the counter. More than 30 login attempts
  from one IP within 5 minutes (configurable) get 429 regardless of username (throttle state is instance-local; documented in security.md).
- **AC5 (FR-AUTH-03, A-021):** `rememberMe=true` issues a remember-me cookie backed by `persistent_logins`; after the server session is gone (deleted or idle-expired),
  the cookie re-authenticates within 30 days and rotates its token. Idle timeout defaults to 12 h. Without `rememberMe`, no remember-me cookie is set.
- **AC6 (FR-AUTH-04, DEC-070):** `POST /auth/logout` (with CSRF) invalidates the session, deletes the user's current remember-me token, expires `ENGLMS_SESSION`
  and the remember-me cookie, and returns 204; the old cookie then gets 401 on `GET /auth/session`. Every `/api/**` response (200, 4xx, 5xx, Problem Details)
  carries `Cache-Control` including `no-store`; `/assets/**` and `index.html` keep their T-M1.5 cache headers.
- **AC7 (FR-AUTH-05, NFR-SEC-06):** `POST /auth/password` requires the current password; the new one must meet the policy (10–128, not in the common list, ≠
  username, ≠ current) or 400 `VALIDATION_FAILED` with field codes. On success: the hash is updated, `mustChangePassword=false`, `temp_password_expires_at` cleared,
  the session ID rotates, **all other** sessions and remember-me tokens of the user end, `PASSWORD_CHANGED` is audited. Hashes are `{bcrypt}` with strength 12.
- **AC8 (FR-AUTH-06):** While `mustChangePassword=true`, every `/api/**` request except `GET /auth/session`, `POST /auth/password` and `POST /auth/logout`
  returns 403 `PASSWORD_CHANGE_REQUIRED` (tested on `GET /api/v1/meta` with the must-change session, a tutor path and a student path); the session body reports `mustChangePassword`.
- **AC9 (FR-AUTH-01, FR-AUTH-10, NFR-SEC-07, T11):** No registration route exists (`/register`, `/signup`, `POST /api/v1/auth/register` → 404, the last as Problem
  Details). Anonymous `/api/v1/tutor/**` and `/api/v1/student/**` → 401 `UNAUTHENTICATED`; a student on a tutor path and a tutor on a student path → 403
  `FORBIDDEN_ROLE`; an unmapped `/api/**` path stays 404 for an authenticated caller and 401 for an anonymous one. POST/PUT/PATCH/DELETE without a valid
  CSRF token → 403 `CSRF_INVALID`. `AccountApi.disable(userId)` makes that user's next request 401 (including via a remember-me cookie) and their login fail
  with the generic message; `enable` restores login.
- **AC10 (DEC-054, DEC-069, security.md §5):** The CSP and the four headers come from Spring Security's header configuration (`SecurityHeadersFilter` removed or
  reduced to the valve's shared values) with identical values on HTML, API JSON, Problem Details, assets and valve-rejected responses (existing tests green).
  `GET /./api/v1/meta` and `GET /x/../actuator/health` (raw, unnormalised) are rejected with a 400 Problem Details response, not the SPA shell. `TRACE /` and
  `TRACE /api/v1/meta` on :8080, with and without `Accept: text/html`, get a 405 (or 400) Problem Details JSON with the security headers and `X-Request-Id`,
  no Whitelabel page and no reflected path.
- **AC11 (FR-AUTH-09, NFR-SEC-11):** The runbooks §4 command prints one temporary password, sets `mustChangePassword=true` with a 7-day expiry, clears the
  lockout, ends the tutor's sessions and writes an audit event (security.md §8 gets the action name); it exits non-zero without creating anyone when no tutor exists.
  `audit_event` rows carry no password, hash, token or session ID; rows older than 365 days are purged by a scheduled job (integration test with a fixed clock).

## Test plan
- **Implementation:**
  - Unit: password policy (boundaries 9/10/128/129, common-list hit, = username, = current), temporary-password generator (shape, length ≥ 12, `SecureRandom`),
    username normalisation (case, trim, accents), throttle window (fixed clock), lockout transitions.
  - Integration (Testcontainers PostgreSQL 18, `container` tag): migrations on an empty DB and on the M1 schema (`FlywayMigrationTest`); single-tutor index;
    bootstrap (empty / existing tutor / bad file); JDBC session persistence across context restart; `endAllSessions` + remember-me deletion; audit retention purge.
  - API (MockMvc or a real port where cookies/firewall matter): AC2–AC10 one by one, including session-ID rotation, cookie flags, CSRF on every state-changing auth
    endpoint, must-change gate, 401/403 codes, `Cache-Control`, header values, raw dot-segment paths and `TRACE` on a real Tomcat port (MockMvc bypasses Tomcat).
  - CLI: run the command in a test context with web type `none` (AC11).
  - Architecture: `ModularityTests`, ArchUnit base rules, `ForbiddenIdentifiersTest` and the OpenAPI contract test green; contract-drift green after regeneration.
  - Authz/isolation: no harness yet (T-M2.2). This task's tests cover anonymous / tutor / student / must-change on each of its endpoints and the L1 gate;
    T-M2.2 must register the four endpoints in the policy registry.
- **Independent QA focus:** black-box over HTTP against the packaged image or `./scripts/dev-up.sh` stack: bootstrap from a secret file; login/logout with cookie
  inspection; session survives an app restart; remember-me after the session row is deleted; lockout and IP throttle (including the generic message);
  must-change gate on every reachable path; CSRF missing/wrong; Back-button/`no-store`; headers on HTML/JSON/assets/errors; dot-segment and `TRACE` probes; the CLI per
  runbooks §4; the SPA still loads at 360/768/1280 with no console errors (no UI change expected). Exploratory charter: "As a curious student, try to become the
  tutor, stay logged in after being disabled, or learn whether a username exists" (60 min).
- **Repeat runs (qa-protocol §3, DEC-088):** the timing-sensitive tests (throttle window, lockout expiry, retention with a clock, login-timing tolerance) ×20.

## Evidence required
- `evidence/T-M2.1/summary.md` (implementation section: commands, results, choices made in the design-note latitude, known limitations), the `gate.sh` log.
- `evidence/T-M2.1/qa/report.md` (QA verdict), `evidence/T-M2.1/review/security.md` (**SEC review required at G3**: identity, `SecurityConfig`, migrations with
  personal data, new endpoints; security-review skill). No UX review (no UI change); the SPA smoke screenshots at phone-small/tablet/laptop show the app still loads.

## Docs to update
- `docs/04-backend/api-catalog.md` (auth rows → live), `api-conventions.md` §5 (new codes, the 429 code), `security.md` §3 (as implemented), §5 (headers via Spring
  Security; the TRACE exception closed), §8 (operator-reset action name), `docs/03-architecture/data-model.md` §4 (the new migrations), `module-boundaries.md` (as built),
  `tech-stack.md` (Spring Security, Spring Session JDBC; word-list and common-password sources and licences), `docs/07-operations/runbooks.md` §1/§4 and
  `deployment.md` (bootstrap secret, cookie-secure property, forwarded headers), `docs/07-operations/development-setup.md` (dev bootstrap of a local tutor),
  `.env.example` (variable names only; the PO handles `.env`), traceability matrix rows for the FRs above, `progress.json`.

## Risks & assumptions
- **Size (upper bound):** if the implementer passes ~1.5 agent-days with AC1–AC10 not green, the LC splits AC11 (CLI + retention job) into a follow-up packet
  T-M2.1b through a DEC, rather than cutting tests.
- Spring Security 7 / Spring Session (Boot 4.1) APIs differ from older guides (SPA CSRF helper, firewall, header DSL): use the versions on the classpath.
- `Secure` cookies on `http://localhost` in WebKit/Firefox for E2E (see Design notes); the E2E smoke must keep passing on all six viewports.
- Spring Security's cache headers could break the immutable asset caching from T-M1.5 (AC6 guards it).
- TRACE is refused by Tomcat before the filter chain (security.md §5): the fix may need the error-page or connector configuration rather than the firewall; AC10
  states the outcome only.
- Timing-equality tests can flake: assert the encoder invocation deterministically and keep the wall-clock check loose (×20 repeat runs).
- Assumption: one application instance (ADR-0012), so the in-memory throttle is adequate (security.md §3).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh
git switch develop && git pull --ff-only && git switch -c feature/T-M2.1-identity-core
(cd backend && ./mvnw -B verify)            # unit + integration (Testcontainers on rootless Podman)
./scripts/contract-drift.sh                # OpenAPI ↔ generated client
./scripts/gate.sh
```
