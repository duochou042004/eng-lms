# Security Specification

> Status: Baseline v1.0 · Owner: Security Reviewer role · Trace: SPEC §37, NFR-SEC-*, NFR-PRIV-*, ADR-0005, ADR-0016.
> Every PR touching `identity`, any `web.student` package, `files`, sanitisation or `SecurityConfig` requires a **Security Reviewer sign-off** (G3).

## 1. Assets and actors

| Asset | Why it matters |
|---|---|
| Student personal data (names, phones, guardians; possibly minors) | Privacy law, trust |
| Tutor-private data (notes, learning profiles, unreleased grades, answer keys) | SPEC §37: students must not see it |
| Student work (responses, recordings) | Integrity of grades; privacy |
| Tutor account | Full control of the system |
| Library content | The tutor's intellectual work |

Actors: anonymous internet users, an authenticated student (curious or malicious, e.g. trying to see another student's work or answer keys), the tutor
(trusted, but can make mistakes), the operator (SSH access), supply-chain dependencies.

## 2. Threat model (STRIDE-lite) → controls

| # | Threat | Control | Verified by |
|---|---|---|---|
| T1 | Student reads another student's data by changing IDs (IDOR) | ADR-0016: student namespace without studentId; `findByIdAndStudentId`; 404 | Isolation suite |
| T2 | Student reads tutor-private fields through an over-broad DTO | Audience-specific DTOs; `@TutorPrivate`; ArchUnit; response secret scan. **Learning profile on screen (T-M2.17):** tutor pages only (no student route, DTO or cache key); its query lives under `['students','learningProfile',sid]` (cleared or reset to no data on every sign-out path); a save answered after the tutor session ended stores and shows nothing (DEC-127); values render as text only (no links, no markup), never in URLs, storage or logs | NFR-SEC-02 tests |
| T3 | Student obtains answer keys before or without release | Handler `toStudentView` redaction; release gate I-07 | Handler tests + scan for key fields |
| T4 | Student submits after the deadline or tampers with the timer | Server `deadlineAt` + grace; client timer is display only | Attempt tests |
| T5 | Credential stuffing or brute force | Lockout + per-IP throttle; generic errors; bcrypt cost ≥ 12 | Auth tests |
| T6 | Session hijacking (XSS → cookie theft) | HttpOnly cookie; strict CSP; sanitised HTML; no tokens in JS storage | Header + XSS corpus tests |
| T7 | CSRF on state changes | Spring Security CSRF (cookie → header) | Tests |
| T8 | Stored XSS through rich text, filenames, tags or metadata | Server allow-list sanitiser; React escaping; DOMPurify; `Content-Disposition` filename encoding | XSS corpus |
| T9 | Malicious upload (HTML or SVG script, polyglot, zip bomb, huge file) | Tika sniff + allow-list; SVG and HTML rejected; size limits; never inline except safe types; `nosniff`; no archive extraction | File tests |
| T10 | Embed injection (arbitrary iframe) | Only allow-listed providers; the URL is parsed and re-built into a canonical embed URL; iframe `sandbox`; CSP `frame-src` | Embed tests |
| T11 | Privilege escalation to tutor | No self-registration; one TUTOR (DB constraint); role never taken from the client | Authz matrix |
| T12 | Account takeover through the password reset flow | Tutor-only reset of student passwords; the tutor's own password only by the operator on the host (runbooks §4, FR-AUTH-09); temporary passwords expire (7 days, also the operator's reset: DEC-089 (8)) and require a change; sessions and remember-me tokens revoked **Frontend (T-M2.5):** the one-time temporary password of a create lives only in the Add student page's component state (the credentials card): the create mutation has `gcTime: 0` and is reset once its result is in state, nothing is seeded into a query, and it never reaches the URL, history state, storage or a log; Back or leaving the page drops it for good (a later visit shows an empty form), and `pagehide` drops the card first, so **Frontend (T-M2.14):** a tutor reset's answer (`POST …/password-reset`, `useResetPassword`: `gcTime: 0`, reset once moved) lives only in the workspace page's component state and shows on the credentials card in the Account section until **Done**, leaving the page or `pagehide`; never in the query cache, URL, history state, storage or a log; a later visit shows no card. The unsaved changes guard lets a navigation marked `state.forced === true` pass only to `/change-password` (T-M2.5 SEC S4-5, DEC-123); a forced mark on any other target is blocked. |
back/forward-cache restore never shows it (AC12 (m)); a dirty Add student form never blocks the forced redirect to `/change-password`
(the auth reaction marks it `state.forced`; the user's own link still asks, AC12 (l)); it is shown as text (no input, no autocomplete) | Tests (T-M2.1 CLI test; `AddStudentPage.test.tsx`, `students.spec.ts` AC7) |
| T13 | Data loss (disk failure, bad migration) | Backups + restore drill; forward-only migrations; pre-deploy backup | Release gate |
| T14 | Secrets leak (repo, logs) | gitleaks; Podman secrets; log masking; no secrets in `application.yml` | CI, review |
| T15 | Vulnerable dependency | Dependabot, `pnpm audit`, Trivy at release | Release gate |
| T16 | Enumerating usernames | Same login response and timing for unknown and wrong-password; availability check is tutor-only | Tests |
| T17 | Clickjacking | `frame-ancestors 'none'` | Header test |
| T18 | Open redirect after login | Login neither accepts nor returns a redirect target (T-M2.1); the SPA picks the landing route from the session's role, and its `?next=` accepts only relative app paths from an allow-list. **Implemented (T-M2.4):** `isSafeAppPath` (structural: one decode, no `//`, `/\`, scheme, whitespace in the path part (G3 SEC S4-4), backslash, control character or dot segment; first segment `tutor` or `student`) and `safeNext` (also the role's own namespace, else the role home) in `web/src/features/auth/model/redirect.ts`; the redirect always goes through the router's `navigate()` | Tests (`redirect.test.ts` table; `auth.spec.ts` AC2) |
| T19 | Stale session in another tab on a shared device: a tab keeps showing (or acting on cached data of) a previous user after a sign-out, a sign-in as someone else or a role change in another tab | **Implemented (T-M2.12, DEC-116):** a 403 `FORBIDDEN_ROLE` makes the tab read `GET /auth/session` once (concurrent 403s share it) and, when the user, role or sign-in changed, drop every cached query but the session and re-run its route guards (queries of mounted pages are reset, so they refetch for the new session: a same-role switch keeps no old data, G3 SEC S4-1); a same-origin `BroadcastChannel` (`englms-auth`) carries `{ type: 'signed-in' }` / `{ type: 'signed-out' }` only (no user ID, name, role or other data: a page of the same origin learns nothing it could not learn from `GET /auth/session`; `BroadcastChannel` does not cross origins); receivers drop their cache, read the session and re-run the guards; a page restored from the back/forward cache (`pageshow` with `persisted`), which missed the messages, does the same (G3 SEC S4-2); messages of any other shape are ignored; a received message never posts (no ping-pong); a revalidation never logs out (`/login` does not revalidate while its URL is unchanged; a tab there that learns of a signed-in session navigates to `/`); the only full-page load in this code is the chunk-error Retry. Not covered (by design): a session ended on another device (the next API call's 401 handles it). **T-M2.15 (DEC-127):** a students write (profile save, status, guardian add/edit/remove) stores its answer in the query cache, invalidates the list, toasts and moves focus only while the cached session (`['auth','session']`, read by key) has `role === 'TUTOR'`, so an answer that arrives after a sign-out and the next sign-in is dropped (`features/students/api/tutorSession.ts`; `StudentWriteSession.test.tsx`); Add student invalidates the list under the same rule (T-M2.20). **T-M2.20 (DEC-144 (2)):** the mutation cache (a finished write's variables and answer) is cleared with the query cache at sign-in, sign-out (also a failed call), a 401 and every drop (cross-tab message, role or user change, back/forward restore) (`app/sessionBoundaries.test.tsx`) | Tests (`sessionSync.test.tsx`, `client.test.ts`; `navigation.spec.ts` AC5, AC6) |

## 3. Authentication

- Spring Security, JSON login (`/api/v1/auth/login`). Session per ADR-0005: `JSESSIONID`-equivalent cookie `ENGLMS_SESSION`, `HttpOnly; Secure; SameSite=Lax; Path=/`.
- Session ID rotated on login and on privilege change (password change). Idle timeout 12 h (configurable). Remember-me 30 days (optional; OQ-10).
- **As implemented (T-M2.1):** sessions in PostgreSQL (Spring Session JDBC, `spring_session*`), so they survive restarts. The principal is a `CurrentUser {userId, role,
  mustChangePassword}` whose **name is the user ID**, never the username: it is Spring Session's principal-name index and the owner of the remember-me tokens, so
  `SessionTerminator.endAllSessions(userId)` finds every session and token whatever case was typed. Remember-me: `PersistentTokenBasedRememberMeServices` with
  `persistent_logins` (cookie `ENGLMS_REMEMBER_ME`, `HttpOnly; Secure; SameSite=Lax`, 30 days, token rotated on every use); logout deletes this device's token,
  a password change, a reset, a disable or a lock through the password change deletes all of them. `Secure` can be turned off only under the `local` Spring profile
  (`server.servlet.session.cookie.secure=false` without it, or with the `prod` profile, fails startup, NFR-SEC-04). CSRF: `CookieCsrfTokenRepository` (`XSRF-TOKEN`, readable by JavaScript,
  `Secure; SameSite=Lax`) → header `X-XSRF-TOKEN`, Spring Security's SPA handler; `GET /auth/session` primes the cookie, login rotates it. The cookie is written on `/api/**` responses only, so hashed assets and `index.html` (cacheable) never carry a `Set-Cookie` (QA F2). On an HTML route a remember-me cookie that no longer authenticates is ignored and the SPA shell is served (QA F1). Concurrent sessions are allowed (A-018).
  The idle timeout is `server.servlet.session.timeout`; lockout, throttle and remember-me validity are `englms.security.*`.
- **Password policy (NFR-SEC-06):** 10–128 characters, not in `common-passwords.txt` (top 10k, bundled), not equal to the username. No composition rules (per NIST 800-63B).
  Generated temporary passwords: 3 random words from a bundled word list + 2 digits (≥ 12 characters, easy to type on a phone), from a `SecureRandom` source.
- Hashing: `DelegatingPasswordEncoder` (default `{bcrypt}`, strength 12). Upgrading to argon2id is a later ADR (rehash on login). bcrypt reads at most 72 bytes; a
  longer password (the policy allows 128 characters) is hashed over its first 72 UTF-8 bytes, as classic bcrypt does (Spring Security's encoder would refuse it;
  `TruncatingBCryptPasswordEncoder`, T-M2.1).
- Lockout: after 10 consecutive failures → `locked_until = now + 15 min`. A successful login resets the count. The tutor sees lock status on the student page and can unlock through a password reset.
  As implemented (T-M2.1): the count restarts when the lock is set, so `ACCOUNT_LOCKED` is audited once per lock; a wrong current password on `POST /auth/password` counts too,
  and reaching the lock that way ends all of the user's sessions and remember-me tokens. While locked, login answers the same generic 401 as a wrong password (no 423, T16).
  An unknown username runs one bcrypt comparison against a fixed dummy hash, so it takes about as long as a wrong password (T16). Disabled accounts and expired
  temporary passwords get the same 401.
- Per-IP throttle: an in-memory sliding window (30 attempts per 5 minutes per IP). Adequate for a single instance; documented as instance-local. The IP is
  `request.getRemoteAddr()`; behind Caddy it is the client's only with `server.forward-headers-strategy=native` (deployment.md §3; a startup WARN names a missing setting
  outside the `local` profile). Past the limit: 429 `RATE_LIMITED` + `Retry-After`.
- **Accepted risk (NFR-SEC-05 trade-off, SEC review S4-9):** anyone who knows the tutor's username can keep the account locked by failing 10 times every
  15 minutes (the per-IP throttle slows one IP, not a distributed attacker). Existing sessions and remember-me tokens survive a login lock, and the operator
  CLI (runbooks §4) clears the lock. Accepted for a single-tutor workspace; revisit if it is ever observed (the audit shows `ACCOUNT_LOCKED` bursts).
- **bcrypt never runs under a lock (T-M2.1, SEC review S2-1):** sign-in and the password change read the account without a lock, compare with bcrypt while no
  transaction or pool connection is held, then lock the row by ID in a short transaction that re-checks status, lock, temporary-password expiry and that the hash
  is still the one compared, and only then counts the failure or records the success. Parallel attempts on one account therefore take no longer than on an
  unknown username (no timing oracle) and a burst on one account doesn't hold connections other sign-ins need.
- **Input bounds (SEC review S2-2):** JSON bodies are limited to 1 MB by the parser (§6). Login usernames over 64 characters or with a control character (T-M2.3 SEC R2-1), and passwords over 1024 characters, are never looked
  up or hashed in full (the attempt still pays one bcrypt against a dummy hash) and get the generic 401 (audited as `LOGIN_FAILED`, reason `REJECTED_INPUT`).
- **Unicode (SEC review S4-4):** passwords are NFC-normalised before the policy check, hashing and comparison, so precomposed and decomposed Vietnamese input are equal.
- **Remember-me details (SEC review S3-1, S4-2, S4-3):** a login first deletes any remember-me token sent with it (a previous user's on a shared device); no token
  is issued or honoured while the password must change; an expired temporary password is not accepted as the current one. A token presented after it was already
  rotated (Spring Security's theft signal: two parallel requests with the same cookie, or a stolen cookie) deletes all of the user's tokens and answers 401
  `SESSION_EXPIRED` with a WARN log, never a 500. **LC decision:** no grace window (no extra column); the SPA contract for T-M2.4 is that one
  `GET /auth/session` completes before any parallel API call, so the rotation happens once.
- `mustChangePassword` gate: a filter lets only `GET /auth/session`, `POST /auth/password`, `POST /auth/logout` and the public `GET`/`HEAD /meta` (DEC-089) through. It runs after the
  L1 role check and before handler lookup, so it also answers paths without a handler (403 `PASSWORD_CHANGE_REQUIRED`). The SPA's own files are not gated.
- Tutor bootstrap (FR-AUTH-02): the password is read from a **file path** (`ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE`, a Podman secret), never from an env value in production.

## 4. Authorization model

| Layer | Mechanism |
|---|---|
| L1 URL gate | `/api/v1/tutor/**` → `hasRole('TUTOR')`; `/api/v1/student/**` → `hasRole('STUDENT')`; `/api/v1/auth/**` → permitAll (each handler decides: an unknown auth path such as `register` is a 404); `GET /api/v1/meta` → permitAll; everything else under `/api/**` → "deny", which at L1 **only requires authentication**: an anonymous caller gets 401, an authenticated one passes the must-change gate and then gets the handler lookup's 404, so nothing reveals which paths exist (not `denyAll`; T-M2.1, DOCS-REVIEW S3-3, R4 D5-1). Order: CSRF (403 `CSRF_INVALID`) → authentication (401) → role (403 `FORBIDDEN_ROLE`) → must-change gate (403) → handler lookup (404) |
| L2 Audience annotation | `@Audience` on every handler; a startup verifier cross-checks it with the path prefix (as built in T-M2.2, below) |
| L3 Ownership | Student services take `CurrentStudent` and use owner-scoped queries. Tutor services can access everything (single tutor), but still validate that referenced IDs exist and belong together (e.g. a note's lesson belongs to the note's student) |
| L4 Data shaping | Audience DTOs; handler redaction; release rules |
| L5 Files | `FileAccessResolver` chain (a student is denied unless a resolver grants access) |

The **authz matrix test** enumerates `RequestMappingHandlerMapping`. For each handler it performs a request as anonymous, tutor, student A and student B
(on A's resources) and checks the expected outcome from the policy registry. A handler missing from the registry fails the build.

**As built (T-M2.2).**
- **L2 verifier** `com.englms.shared.web.AudienceVerifier` (servlet applications only; the operator CLI has no web application). After all singletons
  exist and before the server listens, it enumerates every `RequestMappingHandlerMapping` and refuses to start, with one line per offending handler, when
  a rule is broken. In scope: handlers whose bean class is in `com.englms..` or with a pattern under `/api/`. Rules, per pattern of a handler (a
  multi-pattern handler must satisfy each): `/api/v1/tutor/**` → `TUTOR`; `/api/v1/student/**` → `STUDENT`; `/api/v1/auth/**` → `PUBLIC` or
  `AUTHENTICATED`; `/api/v1/meta` → `PUBLIC` with `GET`/`HEAD` only (all that L1 opens there); any other `/api/**` path, or a `com.englms` handler
  outside `/api/**` → error; so is an `/api/**` pattern with an empty, `.` or `..` segment (ambiguous namespace; T-M2.2 QA-S4-1). Every in-scope handler needs `@Audience` (method or class; the method wins) and explicit HTTP methods. Third-party handlers
  outside `/api/**` (Boot's `/error`, springdoc's `/v3/api-docs`) are ignored. `PUBLIC` is therefore only accepted where L1 permits anonymous access.
  Added by T-M2.2 SEC round 1 (AC9): a pattern whose first segment is not a literal (`/{x}/…`, `/**`, `/{*rest}`) can match `/api/**` and is refused;
  a `STUDENT` handler's class must reside in a `..web.student..` package and a `..web.student..` handler must be `STUDENT`; a `/api/v1/student/**`
  pattern must not carry a `{…studentId}` variable (case, `_` and `-` ignored); each `RequestMappingHandlerMapping` must match with a case-sensitive
  `PathPatternParser` (as L1 does). The verifier also inspects every other `HandlerMapping` bean, since those handlers cannot carry `@Audience`: functional
  routes (`RouterFunctionMapping` with a router function) are refused, and so is any URL handler mapping key under `/api` or with a `com.englms` handler.
  The SPA's resource handlers (`/**`, `/assets/**`, Spring's `ResourceHttpRequestHandler`) stay allowed. SEC round 2 (AC10): a URL-mapping handler
  kept as a bean name (non-singleton) is checked by the type that name resolves to; an application-defined `HandlerMapping` (a `com.englms`, hidden or
  synthetic class) is refused; a `STUDENT` handler method must also be *declared* in `..web.student..` (an inherited method would escape ArchUnit rule 3).
- **Policy registry** `backend/src/test/java/com/englms/security/PolicyRegistry.java`: one entry per mapping (`METHOD /pattern`, no `HEAD`/`OPTIONS`
  entries: matched implicitly) with a sample request and the expected status for anonymous, tutor, student A, student B on A's resource (only when the
  sample names a student-owned resource) and a must-change student.
- **Authz matrix** `AuthzMatrixTest` (`@Tag("security")`): completeness both ways (a mapping without an entry and an entry without a mapping both fail,
  named; so does a `METHOD /pattern` key served by more than one handler method, e.g. two handlers told apart only by `params`), then every entry × actor on the real port, each actor signed in through `POST /api/v1/auth/login` in a fresh fixture world.
- **Isolation scan** `IsolationTest`: student A calls every entry; the headers and body of every response (any status) are searched, case-insensitively,
  for B's user ID, username and B-owned resource IDs, and for `SECRET-[A-Z0-9-]+`. `HarnessDetectionTest` proves each detection with test-only handlers.
- Run: `cd backend && ./mvnw -B verify -Dgroups=security` (verifier, matrix, isolation, ArchUnit student rules); all of them also run in the normal `verify`.

**As built (T-M2.3).**
- **L3 `CurrentStudent`** (ADR-0016 §2): `..web.student..` handlers declare `CurrentStudent me` (`shared.web`, `{studentId, userId}`), resolved by
  `shared.web.CurrentStudentResolver` from Spring Security's `Authentication` (name = user ID, authority `ROLE_STUDENT`) through the `StudentPrincipals`
  SPI (students implements it). It never reads a request parameter. A student principal without a student row: the session is invalidated and the
  request answers 401 `SESSION_EXPIRED`. Anonymous and tutor callers never reach a student handler (401/403 at L1; reaching the resolver anyway is an
  `IllegalStateException`). Owner-scoped reads: `findByIdAndStudentId(id, me.studentId())`, a mismatch is 404 (backend-module and authz-isolation
  skills); `HarnessStudentHandlers` (test fixture) uses it and its B-on-A check answers 404. The first production student handler: T-M2.6/T-M2.7 or M3.
  **L2 rule (T-M2.3 G3 SEC-S3-2):** Spring runs its annotation-based argument resolvers before custom ones, so `AudienceVerifier` refuses startup for
  any handler parameter of type `CurrentStudent` carrying a binding annotation (`@ModelAttribute`, `@RequestBody`, `@RequestParam`, `@PathVariable`,
  `@RequestHeader`, `@CookieValue`, `@MatrixVariable`, `@RequestPart`, `@RequestAttribute`, `@SessionAttribute`, also as meta-annotations). A bare
  `CurrentStudent` parameter is resolved by `CurrentStudentResolver`, which Spring consults before its catch-all model-attribute binding: request
  parameters such as `?studentId=&userId=` never reach it (`HarnessDetectionTest.requestParametersNamingStudentBDoNotChangeCurrentStudent`).
- **Per-request account status (SEC S4-1, DEC-092):** a login that commits just before `AccountApi.disable` could store its session after the disable
  ended all sessions. `identity.internal.security.AccountStatusFilter` (right after remember-me in the chain) re-reads the account's `status` on every
  authenticated `/api/**` request (one primary-key read): unless `ACTIVE` (or if the account is gone), the session is invalidated, the context cleared and
  the request continues as anonymous, so protected paths and `GET /auth/session` answer 401 `SESSION_EXPIRED` while `login`, `logout` and `/meta` keep
  working on that device. Remember-me already refuses a non-active account (401 `SESSION_EXPIRED`). Both refusals also end every session and
  remember-me token of the account (`SessionTerminator.endAllSessions`; T-M2.3 G3 QA-S4-1), so re-enabling the account revives none of them.
- **Credential stamp (SEC S4-5, DEC-100, T-M2.9):** the same window for a login racing a **password reset by someone else**: `user_account.credential_stamp`
  (`bigint`, default 0) is incremented in the transaction of the tutor's reset of a student and of the operator's reset of the tutor (runbooks §4), never
  by the user's own change (that flow rotates the caller's session and ends the others; bumping would refuse a parallel request of the kept session,
  FR-AUTH-05). `CurrentUser` carries the stamp read at sign-in (the locked account read that checks the password; remember-me reads it with the
  account). `AccountStatusFilter`'s primary-key read returns status **and** stamp (still one statement); a differing stamp invalidates **only** the
  current session and the current request's remember-me token (series deleted, cookie cancelled, as a logout of this request) and the request goes on as
  anonymous, 401 `SESSION_EXPIRED`: the reset already ended everything older, and a sign-in after it (current stamp) keeps working. A remember-me token
  inserted by a login whose account read preceded a concurrent reset would outlive the reset's token deletion, so after the insert the stamp is read
  `FOR SHARE` (it waits for a reset holding the row) and on a mismatch the token is deleted and no cookie is set. The stamp is in no response and no
  log line (`CurrentUser.toString()` omits it). A session stored before the column existed reads back with stamp 0 (record deserialisation, same
  `serialVersionUID`). Known limitation (T-M2.9 summary, SEC at G3): a login with the **old** password racing the user's **own** change can keep a session or a remember-me token (accepted
  by SEC, T-M2.9 G3).
- **No username in the log on a duplicate (SEC S4-2, DEC-100, T-M2.9):** Hibernate 7's `SqlExceptionHelper` logs the PostgreSQL message of a refused
  statement (logger `org.hibernate.orm.jdbc.error`) before the application translates it; for a losing duplicate-username insert or rename that message
  names the username. The logger is `off` (`application.properties`); a translated violation (409 `USERNAME_TAKEN`) logs nothing, and any unexpected SQL
  error still logs through `ProblemDetailsAdvice` ("Unhandled exception" with its cause, 500). The PostgreSQL server's own log is out of scope (M8).
  The JDBC driver leaves PostgreSQL's error detail (`Failing row contains (…)`, `Key (…)=(…)`) out of exception messages
  (`spring.datasource.hikari.data-source-properties.logServerErrorDetail=false`, T-M2.9 SEC S4-1), so that 500 log line names the constraint and the
  message but no row values.
- **Tutor endpoints** (api-catalog "tutor: students"): all `@Audience(TUTOR)` with registry entries (anonymous 401, tutor 2xx, student A and must-change
  403, B-on-A n/a). The isolation world gains student rows (A, B, C archived, must-change) with `SECRET-*` markers in the note and a contact-handle
  value (`StudentsWorldContributor`, sample key `sid`). T-M2.9 adds the guardian and learning-profile endpoints (sample key `gid` = A's guardian) and,
  for A, B and C, a guardian and a stored learning profile with `SECRET-*` markers in every tutor-only text field (B's guardian ID is B's).
- **Rule 3 and scan extensions (DEC-097 (4), T-M2.9):** ArchUnit rule 3 also checks `@RequestHeader`, `@CookieValue` and `@MatrixVariable` names and the
  fields of `@RequestBody`/`@RequestPart`/`@ModelAttribute` (and unannotated) parameter types, `@JsonProperty`/`@JsonAlias` names included, nested,
  through arrays, collections, `Optional`, `Map` values and type arguments, `@Valid` parameters included, and the name `sid` (test-strategy §4). Rule 4 stays non-transitive. The isolation scan also matches B's UUIDs
  without dashes. Catch-all binders stay out of the name check (DEC-096).

## 5. Transport and headers

- HTTPS only (Caddy) with HSTS `max-age=31536000; includeSubDomains`. HTTP redirects to HTTPS.
- CSP (served by the app for HTML):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self';
  connect-src 'self'; frame-src <allow-listed embed origins>; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`.
  (`style-src` may need `'unsafe-inline'` only if a library requires it. That needs a DEC entry; the default is none.)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=()`, `Cross-Origin-Opener-Policy: same-origin`.
- **As implemented (T-M2.1, DEC-054):** Spring Security's header configuration writes the CSP above with `frame-src 'none'` (until the embed allow-list exists) and the
  four headers (and nothing else: its defaults are off, so no `X-Frame-Options`, HSTS or `X-XSS-Protection`) on **every response of the application port** (HTML,
  API JSON, Problem Details, assets). The values have one source, `shared.web.SecurityHeaders`, which also writes them where Spring Security's writers don't run:
  requests Tomcat rejects before any filter (`ProblemDetailsErrorReportValve`, T-M1.8) and requests the firewall rejects. Every `/api/**` response also gets
  `Cache-Control: no-store` (DEC-070); assets and `index.html` keep their own `Cache-Control` (T-M1.5). (T-M1.5 to T-M2.1: `shared.web.SecurityHeadersFilter`, now removed.)
- **Firewall (T-M2.1):** Spring Security's `StrictHttpFirewall` rejects raw dot-segments (`/./api/v1/meta`, `/x/../actuator/health`), `;` path parameters and forbidden
  methods before the SPA fallback (which now runs after the security chain), with 400 (405 for a method) Problem Details, the headers above and `X-Request-Id`, without
  echoing the request. **The `TRACE` exception is closed** (T-M1.8 SEC review S4-3, DEC-069): Tomcat now lets `TRACE` through its connector (`allowTrace`) to the
  firewall, which answers 405 Problem Details JSON (with or without `Accept: text/html`) instead of Boot's `/error`/Whitelabel page.
  The management port (:8081, never proxied by Caddy) serves only health/info JSON and does not carry them (DEC-050). HSTS stays with Caddy.
  The SPA runs under `style-src 'self'` with no violations (evidence/T-M1.5): React Aria's runtime `<style>` injection is pre-empted by a marker in `index.html` and its rule ships in `global.css` (DEC-052). `Permissions-Policy: payment=()` disables the browser payment API; it is the one
  allowed occurrence of "payment" in production sources (ForbiddenIdentifiersTest, DEC-049).

## 6. Input handling

- Bean Validation on every DTO. Size limits on every string (validation-rules.md). JSON body limit 1 MB (except uploads). **As implemented (T-M2.1):** Jackson's
  `StreamReadConstraints.maxDocumentLength` = 1 MB (`shared.web.JsonLimitsConfiguration`), enforced while streaming, so chunked bodies are covered too; a longer body
  answers 400 `MALFORMED_REQUEST` without reaching the handler.
- Rich text: OWASP Java HTML Sanitizer policy `RichTextPolicy` allows p, br, strong, em, u, s, h2–h4, ul, ol, li, blockquote, code, pre,
  a[href http/https/mailto; rel=noopener noreferrer; target=_blank], img[src=/api/v1/…/files/… only], table, thead, tbody, tr, th, td.
  Everything else is stripped. The sanitised output is stored, and sanitisation is idempotent.
- URLs (links, meeting URLs, embeds): must be `http`/`https`, ≤ 2048 characters, and are displayed with `rel="noopener noreferrer"`. Meeting URLs are opened in a new tab.
- Embed allow-list (registry, DEC-019): YouTube (`youtube.com`, `youtu.be` → `https://www.youtube-nocookie.com/embed/{id}`), Vimeo
  (`player.vimeo.com/video/{id}`), Google Drive file preview (`drive.google.com/file/d/{id}/preview`), SoundCloud (widget URL).
  An unknown provider is rejected, and the tutor is told to use the LINK kind instead.
- Markdown in notes: a minimal subset rendered on the client with a safe renderer (no raw HTML).
- **Student contact values (T-M2.5, DEC-100 SEC S4-8):** the frontend builds an `href` from a student's phone, email or contact handle only
  through `features/students/model/contactHref.ts`: `tel:` (a leading `+` and digits, ≥ 3 digits), `mailto:` (exactly one address with a
  dotted domain and no whitespace, `?`, `#`, `,`, `;`, `%`, `:`, `/`, `<`, `>`, `"`, `\` or control character) or a handle that parses to
  `https:` with a host and no user name or password (`https://zalo.me@evil.example/` is refused; `target="_blank"
  rel="noopener noreferrer"`) (AC12 (j), (k)). Every other value (`http:`, `javascript:`, `data:`, `zalo:`, protocol-relative, plain text) is text with a copy
  button. Table test `contactHref.test.ts`.

## 7. Files (details: files-and-storage.md)

The type is sniffed by content, then checked against the allow-list and size limit. Files are stored with random keys outside any web root. They are served only through
authorised endpoints, `inline` only for images, PDF, audio and video, `attachment` otherwise, always with `nosniff` and
`Content-Security-Policy: sandbox` on file responses. Filenames are encoded per RFC 6266.

## 8. Audit (NFR-SEC-11)

Recorded actions: `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `PASSWORD_CHANGED`, `PASSWORD_RESET_BY_TUTOR`,
`STUDENT_CREATED`, `STUDENT_STATUS_CHANGED`, `USERNAME_CHANGED`, `GRADE_OVERRIDDEN`, `RESULT_PUBLISHED`, `RESULT_UNPUBLISHED`,
`CONTENT_DELETED`, `SETTINGS_CHANGED`, `BOOTSTRAP_TUTOR_CREATED`, `PASSWORD_RESET_BY_OPERATOR` (the runbooks §4 CLI, T-M2.1). Details never include secrets. Retention: 365 days (a daily job purges older rows).

**As implemented (T-M2.1):** `audit_event` (append-only: a trigger rejects `UPDATE`; only the retention job deletes), written by `AuditApi.record` in its own
transaction (`REQUIRES_NEW`). The audit module records identity's events in a synchronous listener; identity never calls audit. Live actions: `LOGIN_SUCCEEDED`,
`LOGIN_FAILED` (`details.reason`: `UNKNOWN_USERNAME`, `BAD_PASSWORD`, `ACCOUNT_LOCKED`, `ACCOUNT_DISABLED`, `TEMPORARY_PASSWORD_EXPIRED`, `CURRENT_PASSWORD_INCORRECT`, `REJECTED_INPUT`;
never the attempted username or password), `ACCOUNT_LOCKED`, `PASSWORD_CHANGED`, `PASSWORD_RESET_BY_OPERATOR`, `BOOTSTRAP_TUTOR_CREATED` (`PASSWORD_RESET_BY_TUTOR` is mapped,
emitted from T-M2.3). Rows carry the client IP and user agent (personal data, data-model §3). The purge runs daily at 03:30 (server time).

**As built (T-M2.3):** `PASSWORD_RESET_BY_TUTOR` (actor = the tutor, subject = the student's account, from identity's `PasswordReset(TUTOR)`),
`STUDENT_CREATED` (`details.userId`), `STUDENT_STATUS_CHANGED` (`details.from`, `details.to`) and `USERNAME_CHANGED` (`details.userId`; never the old or
new username), each with actor = the tutor and subject type `STUDENT`. The three students actions are written after commit (a rolled-back command
leaves no row); no temporary password or hash appears in any row (tested).

## 9. Privacy (NFR-PRIV)

- Collect only what the data model lists. No analytics, trackers or third-party fonts.
- Students may be minors (THPT). The tutor obtains consent outside the system (A-004). The system supports it by: tutor-only personal data,
  export and permanent delete (**pending OQ-07**), and audit logs of access-relevant changes.
- Vietnam's personal-data regulations (Decree 13/2023/ND-CP and the Personal Data Protection Law effective 2026) may apply to the tutor as data controller.
  **This document is not legal advice.** R-12 tracks it, and the PO decides on any legal review before production.
- Backups are encrypted before leaving the host (NFR-PRIV-03).

## 10. Secrets and configuration

| Secret | Source (prod) | Dev |
|---|---|---|
| DB password | Podman secret → `SPRING_DATASOURCE_PASSWORD_FILE` → read via a config property | `.env` (git-ignored); an example exists in `.env.example` |
| Tutor bootstrap password | Podman secret file (`ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE`) | A git-ignored local file the developer writes, named by the same variable (development-setup.md §2); no `scripts/dev-bootstrap` (T-M2.1) |
| Backup encryption key | Operator-held key file (offline copy) | n/a |

Never commit a secret. gitleaks runs in pre-commit (optional locally) and in CI (required).

## 11. Security review checklist (per PR, used by the Security Reviewer)

1. New or changed endpoints have `@Audience`, a policy registry entry and matrix coverage.
2. Student endpoints: no `studentId` parameter; owner-scoped queries; 404 on mismatch; audience DTOs only.
3. No private field is reachable from a student DTO (the ArchUnit test passes; manual read of the mappers).
4. Inputs have size limits. Rich text goes through the sanitiser. URLs are validated.
5. Files: purpose set, resolver updated when a new link to files is introduced.
6. Logs: no secrets or personal data beyond IDs.
7. Migrations: no weakening of constraints; sensitive columns documented in data-model §3.
8. Tests: an isolation test was added for any new student-visible resource.
