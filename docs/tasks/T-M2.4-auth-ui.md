# T-M2.4: Auth UI (login, forgot info, password change, role redirect, route guards, logout)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready (G0) |
| Owner role | FE (frontend-implementer; E2E harness script changes included) |
| Branch | `feature/T-M2.4-auth-ui` (from `develop`) |
| Depends on | T-M2.1 merged (`a93bcc1`), T-M1.19 merged (`8be6d9f`) |
| Estimate | 2 agent-days (split line in Risks) |
| Trace | SPEC §4.2, §4.3; FR-AUTH-03, 04, 05, 06, 08; NFR-SEC-04, NFR-SEC-07, NFR-A11Y-01, NFR-A11Y-02; security.md T18 (`?next=` allow-list); DEC-089 (generic login failure, no redirect target), DEC-092 (session bootstrap before parallel calls; log out before logging in when the session must change its password), DEC-093 (S4-12 shared-device remember-me), DEC-094 (dev-only `.data/**`), DEC-109 (split: the shells move to T-M2.11; SEC triggered); information-architecture §4; frontend-architecture §2 (API client: XSRF header, 401/403 handling), §3; design-system (`PasswordField`, `Checkbox`) |

## Goal
A tutor or a student opens the app, signs in with username and password (optionally "remember me"), is sent to the home of their role or to a
safe `?next=` path, changes a temporary password when the server requires it, can change their own password and log out. A signed-out visit to a
protected route lands on the login page and returns there after sign-in; a wrong-role visit shows the 403 page. A student who forgot their password
is told to contact the tutor. The navigation shells (sidebar, drawer, bottom tabs, account menu) are T-M2.11 (DEC-109); this task keeps today's
placeholder shell header and adds only a "Change password" link and a "Log out" control to it.

## Scope
- In:
  1. **Session bootstrap** (`features/auth/api`): `useSession()` (TanStack Query, key `['auth','session']`) over `GET /auth/session`; the root route
     resolves it **before** any other API call (one request completes first; DEC-092 remember-me rotation race); anonymous → `null` on 401.
  2. **API client** (`lib/api`, frontend-architecture §2): a middleware reads the `XSRF-TOKEN` cookie and sends it as `X-XSRF-TOKEN` on every
     non-GET request (today the client sends no CSRF header; login, logout and password change need it, NFR-SEC-07); when the cookie is missing
     it first calls `GET /auth/session` (which primes it, also on 401) and then sends the request; on 401 from any call except
     `GET /auth/session` and `POST /auth/login`, clear the query cache and navigate to `/login?next=<current path+search>` (only when
     `isSafeAppPath` accepts it, else plain `/login`); on 403 `PASSWORD_CHANGE_REQUIRED`, navigate to `/change-password`.
  3. **Route guards** (`app/`): `/tutor` and `/tutor/*` require role `TUTOR`, `/student` and `/student/*` require `STUDENT`; anonymous →
     `/login?next=…`; wrong role → `/forbidden` (403 page, link to the role home); `mustChangePassword` → `/change-password` for every protected
     route. `/` redirects by role (`TUTOR` → `/tutor/today`, `STUDENT` → `/student/home`, anonymous → `/login`); **the `Landing` page is removed**
     (its content was the anonymous placeholder; the language switcher moves to the public pages, item 9). Today's shells keep their catch-all child
     routes (nested 404s are T-M2.11).
  4. **`?next=` allow-list (T18)**, two pure functions in `features/auth/model/`:
     - `isSafeAppPath(path)` (structural; no role, so it also serves the 401 redirect and anonymous visits): accepted only when, after exactly one
       `decodeURIComponent` (a decode error → refuse), the path starts with `/` but not `//` or `/\`, contains no scheme, backslash or control
       character, has no `.` or `..` segment (raw or `%2e`-encoded), and its first segment is `tutor` or `student` (`/tutor` and `/student` exactly,
       or followed by `/`, `?` or `#`).
     - `safeNext(next, role)` = `isSafeAppPath(next)` **and** the first segment is the role's namespace (`tutor` for TUTOR, `student` for STUDENT);
       otherwise the role home. Used after login and after a forced password change.
     - The redirect always goes through the router's `navigate()`; never `window.location`, `location.assign` or an `href` built from `next`.
  5. **Login page** `/login` (public). On load, in this order: if the session must change its password → `POST /auth/logout` and show the form
     (DEC-092, T-M2.1 QA F3); else if signed in → the role home; else the form. Fields: username, password (`PasswordField`), "Remember me on this
     device" (`Checkbox`) with the shared-device hint. Submitting calls `POST /auth/login`. A user A remembered on the device is signed in by the
     bootstrap `GET /auth/session`, so the app opens as A and B must log out first; the hint says so (DEC-093 S4-12; SEC confirms). After a
     failed login the page stays on `/login` with one generic error for 401 (DEC-089) and does not refetch the session; 429 shows the wait
     from `Retry-After`; a network failure shows a retry-able error; pending state, no double submit.
     **Forgot your password?** disclosure (FR-AUTH-08): students ask their tutor to reset it; the tutor follows the operator runbook (no link to
     the runbook, no email flow).
  6. **Change password page** `/change-password` (authenticated): current password, new password, confirm (all `PasswordField`); client checks
     (required, length 10–128 per validation-rules, confirm matches) and the server's `errors[]` codes mapped to field messages
     (`CURRENT_PASSWORD_INCORRECT`, `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_TOO_COMMON`, `PASSWORD_EQUALS_USERNAME`,
     `PASSWORD_UNCHANGED`); `ErrorSummary` + focus on a failed submit. **Forced mode** (`mustChangePassword`): explanatory text, no cancel, and on
     success the session is refetched and the user goes to `safeNext` or the role home (a login whose session must change its password goes to
     `/change-password?next=<next>` when `isSafeAppPath` accepts `next`, else plain `/change-password`). **Voluntary mode**: reached from the
     shell header link, has Cancel (back), and on success shows a confirmation that other devices were signed out (the API ends them).
  7. **Logout** (FR-AUTH-04): a "Log out" control in the current placeholder shell header (both shells); `POST /auth/logout`, clear the query cache,
     go to `/login`; works when the session has already expired.
  8. **UI library** (`web/src/ui/`, design-system): `PasswordField` (reveal toggle with an accessible name), `Checkbox` (React Aria) and
     `ErrorSummary`, each with all states, tests, axe and a `/dev/ui` entry; forms use React Hook Form + Zod (frontend-architecture §2; added as
     dependencies) with schemas in `features/auth/model/`.
  9. **i18n** vi + en for every string (namespace `auth`); the `LanguageSwitcher` on `/login`, `/change-password` and `/forbidden` (it was on the
     removed `Landing`); the `/forbidden` page.
  10. **E2E sign-in harness** (`scripts/e2e-run.sh`, `e2e/`):
      - `e2e-run.sh` starts the JAR with its own E2E bootstrap values, which override `.env`'s `ENGLMS_BOOTSTRAP_TUTOR_*` for that process only:
        username `e2e-tutor`, password file `.data/e2e/tutor-bootstrap-password` (generated once, git-ignored, dev-only, DEC-094); and a raised
        per-IP login throttle (`ENGLMS_SECURITY_LOGINTHROTTLE_MAXATTEMPTS`, E2E process only; application defaults unchanged) so sign-ins across
        the projects never hit 429.
      - The Playwright global setup signs in as `e2e-tutor` with the current password from `.data/e2e/tutor-password` when it exists, else with
        the bootstrap password, performs the forced first change to a generated password and writes it to `.data/e2e/tutor-password`
        (re-runs reuse it). When neither works (the dev database holds another tutor or another password), the run stops with one message naming
        `scripts/dev-down.sh --purge` (it deletes the local dev data). CI starts from an empty database and follows the same path.
      - The tutor's stored session (`storageState`) is never logged out or password-changed by a test. Destructive tests (forced change AC4,
        voluntary change AC5, logout AC6) each create their own student through the tutor API (`POST /api/v1/tutor/students` with a temporary
        password, username `e2e-<project>-<random>`) and sign in fresh.
      - Specs that use the anonymous `/` or the shells are retargeted, keeping every assertion: `smoke.spec.ts` and `loading.spec.ts` (the landing
        case moves to `/login`: heading, switcher, chunk and skeleton; every tutor and student shell case runs with the tutor `storageState` or a
        student session), `guards.spec.ts` (signed in for the shell heading; the anonymous case now expects `/login`), `polish.spec.ts` and
        `route-focus.spec.ts` (sign in first). Specs under
        `qa/e2e/` are QA-owned: the QA run updates those that rely on the anonymous `/` on `qa/T-M2.4`.
- Out of scope (explicit):
  - Tutor sidebar/drawer, student bottom tabs, account menu, header brand fix, `meta.error` copy, lazy-navigation loading feedback, offline chunk
    feedback, nested 404s under `/tutor/…` and `/student/…`: **T-M2.11** (DEC-109).
  - `/tutor/today` and `/student/home` content (T-M2.7, M6); tutor-side student password reset UI (T-M2.5); account preferences
    (`PATCH /auth/preferences`, T-M2.6); any backend endpoint or behaviour change; email/SMS password recovery (excluded by SPEC); a stronger
    common-password list (pending PO); CI workflow changes (the e2e-smoke job already runs `e2e-run.sh`).

## Guardrail answers (scope.md §6)
1. **Trace:** FR-AUTH-03..06, 08; NFR-SEC-04/07; NFR-A11Y-01/02; T18; DEC-089/092/093/094/109. 2. **Drift toward excluded scope?** No: no
registration, no self-service recovery, no SSO. 3. **Mandatory setup added?** None for the tutor beyond the existing first-run password change.
4. **Weekly use?** Every session starts here. 5. **Hard-coded semantics?** None.

## Design notes
- Routes: `/login`, `/change-password`, `/forbidden` are lazy route modules in the shared chunk (small); the guard lives in `app/` and reads
  `useSession`; no auth code in the tutor or student chunks beyond the header controls. Bundle budget (NFR-PERF-03) stays green.
- `isSafeAppPath`/`safeNext` table-driven unit test. Accepted: `/tutor`, `/tutor/students?q=an`, `/student/work#top`. Refused: `//evil.example`,
  `/\evil`, `https://evil.example`, `javascript:alert(1)`, `/%2F%2Fevil`, `%2F%2Fevil`, `/%E0%A4%A` (bad encoding), `/tutor/../student/home`,
  `/tutor/%2e%2e/x`, `/tutorx`, `/login`, `/`, empty, control characters; `safeNext('/student/home', 'TUTOR')` → `/tutor/today`.
- The login and change-password forms are one column, max 400 px, centred; inputs ≥ 16 px; `autocomplete` = `username`, `current-password`,
  `new-password`; Enter submits.
- CSRF: the bootstrap `GET /auth/session` primes the `XSRF-TOKEN` cookie (T-M2.1); the middleware of scope 2 sends it.
- Shared-device hint wording (vi + en, final copy by the implementer, checked by UX): do not tick "Remember me" on a shared device; on a shared
  device, log out when you finish (a remembered user opens the app as themselves). The server gives no remember-me while the password must change.
- Logging out before a login is done only for a session that must change its password (DEC-092). A non-GET that arrives with a remember-me
  cookie but no session (e.g. Log out after an idle expiry) ends the `XSRF-TOKEN` cookie; the re-priming of scope 2 covers the next request.

## Acceptance criteria
- AC1 (FR-AUTH-03, DEC-092, NFR-SEC-07): Given no session, opening `/tutor/students` shows `/login?next=%2Ftutor%2Fstudents`; signing in as the
  tutor lands on `/tutor/students`; `GET /auth/session` completes before any other API request on a cold load (network-order test); every
  non-GET request carries `X-XSRF-TOKEN` equal to the cookie (unit test of the middleware).
- AC2 (T18): `isSafeAppPath` and `safeNext` accept and refuse exactly the design-notes table (unit test); a login with an unsafe or wrong-role
  `next` lands on the role home, and the redirect uses the router (E2E; no full page load).
- AC3 (FR-AUTH-03, DEC-089, DEC-093): a wrong password, an unknown username and a locked account show the same generic message; a 429 shows the
  wait from `Retry-After`; a network failure shows a retry-able error; the submit cannot fire twice; a failed login does not refetch the session;
  with no `XSRF-TOKEN` cookie the middleware primes it with `GET /auth/session` before the non-GET (component and unit tests with a mocked API).
- AC4 (FR-AUTH-06, DEC-092): a student created with a temporary password signs in, is sent to `/change-password` (forced mode, no cancel) from
  any protected URL, cannot leave it by navigation, changes the password and lands on `/student/home`; visiting `/login` in that state logs out
  first and a fresh login works (E2E).
- AC5 (FR-AUTH-05): voluntary change from the shell header: each server field code shows its message on the right field, the error summary takes
  focus on a failed submit, and success shows the other-devices confirmation (component + E2E).
- AC6 (FR-AUTH-04): Log out ends the session (a back navigation does not show protected data; the next protected visit goes to `/login`), also
  when the session had already expired, including on a remembered device: after that Log out, a login succeeds with no 403 (the re-priming of
  scope 2) (E2E).
- AC7: wrong role → `/forbidden` (403 page, link home); `/` redirects by role and anonymous → `/login`; a signed-in visit to `/login` goes home
  (E2E for both roles).
- AC8 (FR-AUTH-08, DEC-093): the "Forgot your password?" disclosure, the shared-device hint and the language switcher are on the public pages in
  vi and en; for a user past the forced change (a student created by the test), remember-me sets the 30-day `ENGLMS_REMEMBER_ME` cookie only
  when ticked; a new browser context holding that cookie opens as that user, and after Log out the login form signs in another user with no 403
  (E2E cookie and session checks).
- AC9 (NFR-A11Y-01, 02): login, change-password and forbidden pages pass axe at 360×740, 768×1024 and 1280×800 with no horizontal scroll;
  keyboard-only login and password change work; `PasswordField`, `Checkbox` and `ErrorSummary` have `/dev/ui` entries, tests and axe checks.
- AC10: `./scripts/gate.sh` green twice in a row on the same dev database (the second run reuses the E2E tutor password); the empty-database
  case is CI's `e2e-smoke` run (recorded in the evidence; never purge the PO's dev database without asking); no 429 in the E2E run; all
  retargeted specs keep their assertions; bundle budget green.

## Test plan
- Implementation: unit (`isSafeAppPath`, `safeNext`, Zod schemas, XSRF and 401/403 middleware), component (login, change password, guards with a
  mocked session, `ui/` components), E2E (`auth.spec.ts`: AC1, AC2, AC4, AC6, AC7, AC8 at the mandatory viewports; retargeted specs), axe.
- Independent QA focus: open-redirect attempts through `?next=` (encoded, double-encoded, malformed, protocol-relative, backslash, dot segments,
  other role); forced change cannot be bypassed by URL; logout and back button; two tabs (log out in one, act in the other → login);
  remember-me on/off across a browser restart (new context with the stored cookie) and the shared-device case of AC8; a missing `XSRF-TOKEN`
  cookie before a login; vi/en; 360/768/1280;
  `gate.sh` twice. Exploratory charter: find any way to reach protected UI or data without a valid session of the right role.
- SEC: **triggered** (DEC-109: identity UI, redirect handling, remember-me, session bootstrap, CSRF header; the client-side part of the M2 exit
  "security review of authentication"). UX: **triggered** (new screens).

## Evidence required
- `evidence/T-M2.4/summary.md`, gate logs (both runs), screenshots (360×740, 768×1024, 1280×800) of login (default, error, rate-limited,
  forgot-info open), change password (forced, voluntary, field errors) and forbidden under `evidence/T-M2.4/impl/`; QA report via `qa/T-M2.4`;
  UX and SEC verdicts as PR records (reviewer evidence never on the feature branch).

## Docs to update
- `frontend-architecture.md` §2 (XSRF middleware implemented, session bootstrap order, guard, `isSafeAppPath`/`safeNext`), `design-system.md`
  (`PasswordField`, `Checkbox`, `ErrorSummary` implemented), `security.md` T18 (implemented), `information-architecture.md` §4 (`/` redirect,
  no landing page), `ux-flows.md` (login step budget: one screen, two fields + submit), `development-setup.md` (E2E tutor under `.data/e2e/`,
  re-runs, `dev-down.sh --purge` when the dev database holds another tutor), backlog (T-M2.4 done note), `progress.json`.

## Risks & assumptions
- **Split line** (as DEC-089 (4)): if AC1–AC8 are not green by about 1.5 agent-days, AC9's `/dev/ui` polish beyond the three components' basic
  states move to a follow-up recorded by a DEC; the open-redirect rules, CSRF and the guards never move.
- The PO's dev database may hold a manually bootstrapped tutor: E2E then stops with a clear message instead of guessing credentials; the fix
  (`dev-down.sh --purge`) deletes local dev data, so the message says so.
- Adding React Hook Form + Zod is the documented standard (frontend-architecture §2), not new infrastructure; the bundle budget must stay green.
- `/tutor/today` and `/student/home` are placeholder shell pages until their tasks; landing there is enough for this task.
- SEC confirms the shared-device behaviour (a remembered user opens the app; log out on shared devices) and its wording.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.4 ./scripts/gate.sh && ENGLMS_TASK=T-M2.4 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.4-auth-ui
```
