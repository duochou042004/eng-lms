# T-M2.4: Auth UI (login, forgot info, password change, role redirect, route guards, logout)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready (G0) |
| Owner role | FE (frontend-implementer; one script change for E2E sign-in) |
| Branch | `feature/T-M2.4-auth-ui` (from `develop`) |
| Depends on | T-M2.1 merged (`a93bcc1`), T-M1.19 merged |
| Estimate | 2 agent-days |
| Trace | SPEC §4.2, §4.3; FR-AUTH-03, 04, 05, 06, 08; NFR-SEC-04, NFR-SEC-07, NFR-A11Y-01, NFR-A11Y-02; security.md T18 (`?next=` allow-list); DEC-089 (generic login failure, no redirect target), DEC-092 (session bootstrap before parallel calls; log out before logging in when the session must change its password), DEC-093 (S4-12 shared-device remember-me note), DEC-109 (split: the shells move to T-M2.11); information-architecture §4; frontend-architecture §2 (API client 401/403 handling), §3 |

## Goal
A tutor or a student opens the app, signs in with username and password (optionally "remember me"), is sent to the home of their role or to a
safe `?next=` path, changes a temporary password when the server requires it, can change their own password and log out. A signed-out visit to a
protected route lands on the login page and returns there after sign-in; a wrong-role visit shows the 403 page. A student who forgot their password
is told to contact the tutor. The navigation shells (sidebar, drawer, bottom tabs, account menu) are T-M2.11 (DEC-109); this task keeps today's
placeholder shell header and adds only a log-out control to it.

## Scope
- In:
  1. **Session bootstrap** (`features/auth/api`): `useSession()` (TanStack Query, key `['auth','session']`) over `GET /auth/session`; the root route
     resolves it **before** any other API call (one request completes first; DEC-092 remember-me rotation race), anonymous → `null` on 401.
  2. **API client** (`lib/api`): on 401 from any call except `GET /auth/session` and `POST /auth/login`, clear the query cache and navigate to
     `/login?next=<current path+search>`; on 403 `PASSWORD_CHANGE_REQUIRED`, navigate to `/change-password` (frontend-architecture §2).
  3. **Route guards** (`app/`): `/tutor/*` requires role `TUTOR`, `/student/*` requires `STUDENT`; anonymous → `/login?next=…`; wrong role →
     `/forbidden` (403 page, link to the role home); `mustChangePassword` → `/change-password` for every protected route. `/` redirects by role
     (`TUTOR` → `/tutor/today`, `STUDENT` → `/student/home`, anonymous → `/login`). Today's shells keep their catch-all child routes (nested 404s are T-M2.11).
  4. **`?next=` allow-list (T18)** in one pure function `safeNext(next, role)`: accepted only when it is a relative app path that starts with `/` but not
     `//` or `/\`, contains no scheme, backslash or control character after one URL-decode, and its first segment belongs to the role's
     namespace (`/tutor/` for TUTOR, `/student/` for STUDENT); anything else → the role home. Used after login and after a forced password change.
  5. **Login page** `/login` (public; a signed-in visitor goes to their home): username, password, "Remember me on this device" checkbox with a
     shared-device hint (DEC-093 S4-12: do not tick it on a shared device; signing in here replaces whoever was remembered), submit with pending
     state and no double submit; one generic error for 401 (DEC-089), a rate-limit message with the wait from `Retry-After` for 429, a retry-able
     network error. **Forgot your password?** disclosure (FR-AUTH-08): students ask their tutor to reset it; the tutor follows the operator runbook
     (no link to the runbook, no email flow). When the current session must change its password, the page first calls `POST /auth/logout`
     (DEC-092, QA F3) so the login is not blocked by the must-change gate.
  6. **Change password page** `/change-password` (authenticated): current password, new password, confirm; client checks (required, length
     10–128 like validation-rules, confirm matches) and the server's `errors[]` codes mapped to field messages (`CURRENT_PASSWORD_INCORRECT`,
     `PASSWORD_TOO_SHORT`, `PASSWORD_TOO_LONG`, `PASSWORD_TOO_COMMON`, `PASSWORD_EQUALS_USERNAME`, `PASSWORD_UNCHANGED`); error summary + focus on
     a failed submit. **Forced mode** (`mustChangePassword`): explanatory text, no cancel, and on success the session is refetched and the user goes to
     `safeNext` or the role home. **Voluntary mode**: reached from the shell header's account control, has Cancel (back), and on success shows a
     confirmation that other devices were signed out (the API ends them).
  7. **Logout** (FR-AUTH-04): a "Log out" control in the current placeholder shell header (both shells); `POST /auth/logout`, clear the query cache,
     go to `/login`; works when the session has already expired.
  8. **UI library**: `Checkbox` (React Aria) and `ErrorSummary` added to `web/src/ui/` with all states, tests, axe, and `/dev/ui` entries; forms use
     React Hook Form + Zod (frontend-architecture §2; added as dependencies) with schemas in `features/auth/model/`.
  9. **i18n** vi + en for every string (namespace `auth`); the `/forbidden` page.
  10. **E2E sign-in support**: `scripts/e2e-run.sh` bootstraps an E2E tutor on an empty database from a git-ignored dev-only password file under
      `.data/e2e/` (generated once, DEC-094), and the Playwright global setup signs in, performs the tutor's forced first change and stores the
      sessions (`storageState`) for the tests; when the database already holds a different tutor, `e2e-run.sh` stops with one message
      (`scripts/dev-down.sh --purge` resets the dev database). CI starts from an empty database. Existing E2E specs keep passing (they now sign in).
- Out of scope (explicit):
  - Tutor sidebar/drawer, student bottom tabs, account menu, header brand fix, `meta.error` copy, lazy-navigation loading feedback, offline chunk
    feedback, nested 404s under `/tutor/…` and `/student/…`: **T-M2.11** (DEC-109).
  - `/tutor/today` and `/student/home` content (M2 T-M2.7, M6); tutor-side student password reset UI (T-M2.5); account preferences
    (`PATCH /auth/preferences`, T-M2.6); any backend endpoint or behaviour change; email/SMS password recovery (excluded by SPEC); a stronger
    common-password list (pending PO).

## Guardrail answers (scope.md §6)
1. **Trace:** FR-AUTH-03..06, 08; T18; DEC-089/092/093. 2. **Drift toward excluded scope?** No: no registration, no self-service recovery, no SSO.
3. **Mandatory setup added?** None for the tutor beyond the existing first-run password change. 4. **Weekly use?** Every session starts here.
5. **Hard-coded semantics?** None.

## Design notes
- Routes: `/login`, `/change-password`, `/forbidden` are lazy route modules in the shared chunk (small); the guard lives in `app/` and reads
  `useSession`; no auth code in the tutor or student chunks beyond the log-out control. Bundle budget (NFR-PERF-03) stays green.
- `safeNext` is a pure function with a table-driven unit test (accepted: `/tutor/students?q=an`; refused: `//evil.example`, `/\evil`,
  `https://evil.example`, `/%2F%2Fevil`, `javascript:…`, `/student/home` for a tutor, `/login`, empty, control characters).
- The login and change-password forms are one column, max 400 px, centred; inputs ≥ 16 px; `autocomplete` = `username`, `current-password`,
  `new-password`; password fields have a show/hide `IconButton` with a name; Enter submits.
- The 401 redirect keeps the current path in `next` only when `safeNext` would accept it.
- CSRF: the client already sends `X-XSRF-TOKEN`; the session bootstrap primes the cookie (T-M2.1).
- Decision recorded by this packet: **DEC-109** (the T-M2.4 backlog row is split into T-M2.4 auth UI and T-M2.11 shells; SEC review triggered for
  T-M2.4).

## Acceptance criteria
- AC1 (FR-AUTH-03, DEC-092): Given no session, opening `/tutor/students` shows `/login?next=%2Ftutor%2Fstudents`; signing in as the tutor lands on
  `/tutor/students`; `GET /auth/session` completes before any other API request on a cold load (network-order test).
- AC2 (T18): `safeNext` accepts only same-role relative app paths and refuses every case in the design-notes table (unit test); a login with an
  unsafe or wrong-role `next` lands on the role home (E2E).
- AC3 (FR-AUTH-03, DEC-089): a wrong password, an unknown username and a locked account show the same generic message; a 429 shows the wait from
  `Retry-After`; a network failure shows a retry-able error; the submit cannot fire twice (component tests with mocked API).
- AC4 (FR-AUTH-06, DEC-092): a student created with a temporary password signs in, is sent to `/change-password` (forced mode, no cancel) from
  any protected URL, cannot leave it by navigation, changes the password and lands on `/student/home`; visiting `/login` in that state logs out
  first and a fresh login works (E2E).
- AC5 (FR-AUTH-05): voluntary change from the shell header: each server field code shows its message on the right field, the error summary takes
  focus on a failed submit, and success shows the other-devices confirmation (component + E2E).
- AC6 (FR-AUTH-04): Log out ends the session (a back navigation does not show protected data; the next protected visit goes to `/login`), also
  when the session had already expired (E2E).
- AC7: wrong role → `/forbidden` (403 page, link home); `/` redirects by role; a signed-in visit to `/login` goes home (E2E for both roles).
- AC8 (FR-AUTH-08, DEC-093): the "Forgot your password?" disclosure and the remember-me shared-device hint are present in vi and en; remember-me
  sets the 30-day cookie only when ticked (E2E cookie check).
- AC9 (NFR-A11Y-01, 02): login, change-password and forbidden pages pass axe at 360×740, 768×1024 and 1280×800 with no horizontal scroll; keyboard-only
  login and password change work; `Checkbox` and `ErrorSummary` have `/dev/ui` entries and tests.
- AC10: `./scripts/gate.sh` green (incl. E2E with sign-in on an empty database and on a re-run), all existing E2E specs green, bundle budget green.

## Test plan
- Implementation: unit (`safeNext`, Zod schemas, API client 401/403 middleware), component (login, change password, guards with a mocked
  session), E2E (`auth.spec.ts`: AC1, AC2, AC4, AC6, AC7, AC8 at the mandatory viewports; existing specs signed in), axe.
- Independent QA focus: open-redirect attempts through `?next=` (encoded, double-encoded, protocol-relative, backslash, other role); forced change
  cannot be bypassed by URL; logout and back button; two tabs (log out in one, act in the other → login); remember-me on/off across a browser
  restart (new context with the stored cookie); vi/en; 360/768/1280. Exploratory charter: find any way to reach protected UI or data without a
  valid session of the right role.
- SEC: **triggered** (identity UI, redirect handling, remember-me, session bootstrap; also the auth part of the M2 exit "security review of
  authentication" for the client side). UX: **triggered** (new screens).

## Evidence required
- `evidence/T-M2.4/summary.md`, gate log, screenshots (360×740, 768×1024, 1280×800) of login (default, error, rate-limited, forgot-info open),
  change password (forced, voluntary, field errors) and forbidden under `evidence/T-M2.4/impl/`; QA report via `qa/T-M2.4`; UX and SEC verdicts
  as PR records (reviewer evidence never on the feature branch).

## Docs to update
- `frontend-architecture.md` (session bootstrap order, guard, `safeNext`), `security.md` T18 (implemented), `information-architecture.md` §4 if a
  route detail changes, `ux-flows.md` (login step budget: one screen, two fields + submit), `development-setup.md` / `e2e` notes (E2E tutor
  bootstrap and `.data/e2e/`), backlog (T-M2.4 done note), `progress.json`.

## Risks & assumptions
- The dev database may already hold a manually bootstrapped tutor: E2E then stops with a clear message instead of guessing credentials.
- Adding React Hook Form + Zod is the documented standard (frontend-architecture §2), not new infrastructure; the bundle budget must stay green.
- `/tutor/today` and `/student/home` are placeholder shell pages until their tasks; landing there is enough for this task.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm budget)
ENGLMS_TASK=T-M2.4 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.4-auth-ui
```
