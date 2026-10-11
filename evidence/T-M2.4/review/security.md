# T-M2.4 security review record (fresh reviewer; recorded by the LC from the returned text)

## Round 2

### Security re-review (round 2): T-M2.4 Auth UI (PR #82, `feature/T-M2.4-auth-ui` at `4b403a7`)

**Verdict: approved. Nothing regressed.** There are still no S1, S2 or S3 findings. S4-1 and S4-4 are fixed. S4-2 and S4-3 stay deferred to the merge DEC, as you said.

I reviewed `git diff c1e05e0..HEAD`. The changes are in `web/`, `e2e/`, docs (the T18 row and frontend-architecture), evidence and screenshots; nothing in the backend or `scripts/` changed. The auth, API-client, guard and route test suites pass: 9 files, 177 tests. The working tree is clean, and `./scripts/dev-down.sh` (without `--purge`) reported nothing running.

## Fuzz re-run on the new `isSafeAppPath` / `safeNext`
- **Setup:** 1.2M generated paths, as in round 1. I added whitespace and invisible-character pieces, both raw and percent-encoded: no-break space, line separator U+2028, BOM U+FEFF, ideographic space U+3000, `%0d%0a`, and query strings `?q=a%20b` and `?q= `.
- **Result: 0 bad.** No accepted path left the origin or the role's namespace when resolved with `new URL()`, as given or after one more decode.
- **The round-1 near-miss now fails the check:** `/tutor/.. `, `/tutor/%2e%2e%20`, `/tutor/..` + U+00A0, `/tutor/%2e%2e%C2%A0`, `/tutor/..%E2%80%A8` and `/tutor/..` + U+FEFF all return false, so they fall back to `/tutor/today`. JavaScript's `\s` covers all of these characters.
- **Still behaves as before:**
  - Normal app paths are accepted: `/tutor/students`, `/tutor/students?q=an%20b`, `/tutor?q=//evil#x` (an in-app query, harmless).
  - Wrong-role and external targets fall back to the role home: `/student/home` for a tutor, `//evil.example`.
  - `redirect.test.ts` gained the four S4-4 rows.

## Should the query refuse whitespace too?
No, accepting it is fine. Dot segments and authority parsing apply only to the path part. Whatever follows `?` or `#` cannot change the origin or the route, and the target route's guard runs anyway. The only case where whitespace is not simply passed through is a trailing space at the very end, which the URL parser trims, and that does nothing. Refusing it would break real search return paths for no security gain.

## The other changes

| Change | Result |
|---|---|
| S4-1 hint (`en/auth.json:10`, `vi/auth.json:10`; the `dev.json` hints too) | Matches the wording I confirmed, with "thiết bị dùng chung". It is accurate both ways: remember-me lasts 30 days, and an unticked session lasts up to 12 hours idle. Fixed. |
| Login description shortened | Fine. It no longer says the credentials come from the tutor, and no information is lost. |
| UX-4: Log out in forced mode (`ChangePasswordPage.tsx`) | Uses the existing `useLogout`: `POST /auth/logout`, then clears the query cache, then `/login`. The `/login` loader then reads the session again (anonymous) and re-primes `XSRF-TOKEN`. It is a way out of the forced change, not around it, because the session ends. It works even if the session has already expired, since logout answers 204. Cancel is still absent in forced mode. |
| UX-5: validate on submit | UX only. The client and server checks are unchanged, and focusing the error summary is still a UI-only concern. |
| UX-7: role-aware `/forbidden` copy | The text comes from the visitor's own cached session role. It reveals nothing about the page they were refused or about other users. |
| QA F2: console guard (`fixtures.ts`, `auth.spec.ts acceptStatus`) | Failed-resource entries now include their URL. `acceptStatus` removes only entries with the given status and that exact URL path (`/api/v1/auth/login` for 401 and 429, `/api/v1/auth/password` for 422), so it is narrower than before. The URLs go into test output; they are app paths with no credentials. The `polish.spec.ts` pattern change only accepts the added `[url]` suffix. |
| New evidence | The new gate log (`gate-20261011T144910Z.log`) contains neither E2E password value; I matched against the two `.data/e2e` files by count only, never printing them. Its only `TemporaryPassword` matches are the name of a test class. The changed records are layout numbers only. |

SEC-REVIEW T-M2.4: APPROVED

## Round 1

### Security review: T-M2.4 Auth UI (PR #82, `feature/T-M2.4-auth-ui` at `c1e05e0`)

**Verdict: approved. There are no S1, S2 or S3 findings, and four S4 findings, none of which blocks the merge.** As you asked, I did not write the evidence file and did not post a PR comment.

## What I covered
- **Read:** the packet, the G0 review (`evidence/T-M2.4/review/docs.md`), security.md T18, DEC-089, DEC-092, DEC-093, DEC-109 and DEC-110, and the full diff against `origin/develop`. The branch changes no backend code. Its changes are in `web/`, `e2e/`, `scripts/`, `docs/`, `evidence/` and `progress.json`.
- **Tests:** I ran the auth, API-client, guard, login and change-password unit and component suites: 7 files, 128 tests, all passed.
- **Fuzzing:** I ran 1.2M generated paths through `isSafeAppPath` and `safeNext`, built from mixed encoded and raw pieces (`//`, `\`, `%2F`, `%252F`, `%2e`, `:`, `@`, `%09`, fullwidth and ideographic characters, bad encodings). I resolved every accepted path with `new URL()`, both as given and after one more decode. **No path left the origin, and none left the app's namespace.** The only odd case is in S4-4.
- **Dependencies:** `pnpm audit --prod` reports no known vulnerabilities. `react-hook-form` 7.89.0, `zod` 4.6.5 and `@hookform/resolvers` 5.9.1 are pinned exactly and have integrity hashes in the lockfile.
- **Secrets:**
  - `.env` and `.data/**` are git-ignored. The only env file tracked is `.env.example`.
  - `.data/e2e` and its `state/` folder are owner-only (0700), and the password files are 0600.
  - I compared the two E2E password files (by filename match only, never printing them) against every tracked file at HEAD, `evidence/`, `e2e/test-results`, the Playwright report and `backend/target/e2e-app.log`: **no matches.**
  - The gate logs and the app log contain no `temporaryPassword`, `currentPassword` or `newPassword` payloads. The app log records method, path and status only, with no query string, so no `next=`.
  - The `ac8-remember-me-cookie.json` records hold only cookie attributes, not values.
- **No black-box run against the live app.** The E2E evidence (AC1, AC2, AC6, AC8) covers the same paths. `./scripts/dev-down.sh` (without `--purge`) reported nothing running. The working tree is clean.

## Focus areas

| Area | Result |
|---|---|
| `isSafeAppPath` / `safeNext` (`redirect.ts`) | Correct against T18. It checks the raw path and the path after exactly one decode, and refuses on a decode error. It refuses `//`, `/\`, `:` in the path part, backslashes, C0/DEL control characters, and `.`/`..` segments (raw, `%2e`, or mixed). The first segment must be exactly `tutor` or `student` (`/tutorx` is refused). `safeNext` adds the role's namespace. Double-encoded dots (`%252e`) are caught on the decoded form. |
| Where redirect targets are built and followed | `next` is only ever passed to the router's `navigate()` (`LoginPage.tsx`, `ChangePasswordPage.tsx`). Loader redirects use only constants or `loginPath`/`changePasswordPath`, which re-check the path and `encodeURIComponent` it. There is no `window.location`, `location.assign` or `href` built from `next`; the one `window.location.reload()` in `RouteError.tsx` is pre-existing and unrelated. Even if a crafted path got through, the guard of the target route still applies. |
| XSRF middleware (`client.ts`) | The base URL is `location.origin` and every call goes through `api`, so the header is only ever sent same-origin. It is added only for non-GET/HEAD/OPTIONS requests. Re-priming calls `GET /auth/session`, which is a safe method, so the middleware does not recurse. A 401 from that call is excluded from the sign-in redirect, so there is no loop. If priming fails, the request goes out without a header and gets 403 `CSRF_INVALID` with no retry loop. The token is never logged or stored. |
| 401 / 403 handling | A 401 (except from session or login) clears the query cache and goes to `loginPath(current)`; it does nothing when already on `/login`. A 403 `PASSWORD_CHANGE_REQUIRED` refetches the session, then goes to `/change-password`. Both use the router only. |
| Guards (`guards.ts`, `router.tsx`) | They are route loaders, so nothing protected renders before a decision. The root loader resolves the session first; the AC1 network-order record shows session completing before meta. The order of checks is: anonymous → `/login?next=`, then must-change → `/change-password`, then wrong role → `/forbidden`. `/login` logs out only a must-change session (DEC-092). Logout clears the cache before navigating, so Back re-runs the guard (E2E AC6). `/forbidden` and `/dev/ui` (dev builds only) carry no data. |
| Generic login failure (DEC-089) | One message for every 401. A 429 is per-IP, so it reveals nothing about accounts. The hint text does not say whether an account is locked. No server `detail` is shown, and server field codes go through an allow-list (`SERVER_CODES`) before they are displayed. |
| Storage, URL, console | No credentials or session data in localStorage or sessionStorage; the only stored value is the locale. No `console.*` in product code. `next` holds only an app path, never a username. The forms send JSON with `fetch` and never submit natively. |
| `autocomplete` | `username`, `current-password` (login and the current field), `new-password` (new and confirm). The password inputs set `spellCheck={false}` and `autoCapitalize="none"`. |
| Remember-me hint (DEC-093 S4-12) | See S4-1. The proposed vi and en text is accurate. |
| E2E harness | The password files are generated once with `umask 077`. `ENGLMS_BOOTSTRAP_*` and `ENGLMS_SECURITY_LOGINTHROTTLE_MAXATTEMPTS=100000` are set as env vars on the E2E `java` process only. `application.properties:53` keeps 30, and the e2e-run unit test checks the override. The `storageState` files are 0664 but sit inside a 0700 folder. |
| Console-guard exception | It is narrow: only Chromium's exact "Failed to load resource … status of 401" message, and only when the URL path is exactly `/api/v1/auth/session`. A self-test in `guards.spec.ts` shows a 401 from any other request still fails. The trade-off is acceptable. |
| `ui/Button` announcer cleanup | No security impact. It removes React Aria announcer nodes by comparing `aria-labelledby` with `getAttribute` (no selector is built from the id), and removing a node twice does nothing. A caller-supplied `id` is kept. |
| Zod `jitless` vs CSP | `z.config({ jitless: true })` runs when the only zod module is imported. In zod 4.6.5, `allowsEval` skips the `new Function` probe when `jitless` is set (`util.js:220`). The CSP still says `script-src 'self'` with no `unsafe-eval`, and the E2E console guard fails on CSP violations, so this is the right fix rather than loosening the CSP. |

## Findings

### S4-1: The current remember-me hint understates the risk; adopt the proposed wording
- **Where:** `web/src/lib/i18n/locales/en/auth.json:10` and `vi/auth.json:10`.
- **Problem:** The current text gives remember-me as the only reason to log out ("a remembered person is signed in automatically…"). But an unticked session also stays signed in for up to 12 hours of idle time (`server.servlet.session.timeout=12h`). It can also survive closing the browser if the browser restores its session.
- **Failure scenario:** A student on a shared family PC leaves "Remember me" unticked, closes the tab and walks away, believing that is safe. Within 12 hours the next person opens the app and is that student.
- **The proposed text is accurate:**
  - It is true with or without remember-me: 30 days when ticked, up to 12 hours when not.
  - Logging out really does end the server session and that device's remember-me token.
  - After a failed login, a remember-me cookie signs the remembered user in again (S4-12), and the text covers this too.
- **Fix:** Use the proposed en and vi strings. One optional consistency nit: the checkbox label says "thiết bị" (device), so the vi hint could say "thiết bị dùng chung" instead of "máy dùng chung".

### S4-2: Other tabs keep a stale session after logout or a user switch
- **Where:**
  - `web/src/features/auth/api/session.ts:27` caches the session forever (`staleTime: Infinity`).
  - `web/src/lib/api/client.ts:62-64` reacts only to 401 and to 403 `PASSWORD_CHANGE_REQUIRED`.
  - `web/src/app/guards.ts:69-80` holds the matching reactions.
- **Scenario:** On a shared device, tutor A leaves tab 1 open and logs out in tab 2, then student B signs in in tab 2. Tab 1 still holds A's cached session and query data, so its guards keep showing the tutor UI. Its new API calls go out with B's cookie and get 403 `FORBIDDEN_ROLE`, which triggers no session re-check. Whatever A had loaded stays on screen.
- **Severity:** S4. The server still enforces everything; this is physical access to A's own open tab, and today's shell pages have no tutor data yet.
- **Fix (later, when tutor data pages land in T-M2.5 / T-M2.11):** On 403 `FORBIDDEN_ROLE`, refetch the session and re-run the guard. Also broadcast sign-in and sign-out across tabs (a `storage` event or `BroadcastChannel`) so other tabs clear their cache.

### S4-3: Failure traces in a public repo will contain credentials and session cookies
- **Where:** `e2e/playwright.config.ts:27` (`trace: 'retain-on-failure'`) and `.github/workflows/e2e-smoke.yml:75-81`, which uploads `e2e/test-results/` when the job fails. **The repo is PUBLIC.**
- **Problem:** Since this task, traces include sign-in form fills (passwords), the `page.evaluate` fetch bodies (the tutor's generated password, students' temporary passwords) and session cookies from the stored tutor session.
- **Impact today:** Low. In CI they are credentials for a database that is thrown away after the job. Locally they sit in git-ignored `e2e/test-results/`, but hold the dev E2E tutor's real dev password.
- **Fix:** Keep this as a known risk, or upload only the HTML report and `e2e-app.log` (not traces) from CI. The habit matters before any real data or a staging environment exists.

### S4-4: A trailing space can hide a dot segment from the allow-list
- **Where:** `web/src/features/auth/model/redirect.ts:13`, `:23`.
- **Problem:** `/tutor/.. ` (with a trailing space, or `%2e%2e%20` that decodes to it) passes the check. The URL parser then trims the trailing space, and the `..` resolves to `/`.
- **Impact:** None. The fuzz found no way to leave the origin or the namespace, and the only reachable result is `/`, which just redirects by role. It does go against the "no dot segment" intent of T18.
- **Fix:** Refuse whitespace in the decoded path (`/\s/`), or trim each segment before the dot test, and add a row for it to `redirect.test.ts`.

### Informational (not graded)
- **Re-priming can run twice in parallel** (`client.ts:50`). Two non-GET requests that both find the XSRF cookie missing will both call `GET /auth/session`. With a remember-me cookie and no session, that is a parallel remember-me rotation, which DEC-092 only rules out at cold start. The worst outcome is a 401 `SESSION_EXPIRED` and a bounce to `/login`, then home. This is functional only, not a security issue. If it matters later, share one in-flight priming request.
- **Forced change drops `next` on direct visits.** A must-change session that opens a protected URL directly goes to `/change-password` without `?next=` (`guards.ts:29`). That is UX only and safe.

SEC-REVIEW T-M2.4: APPROVED
