# T-M2.4 Auth UI: implementation evidence

Branch `feature/T-M2.4-auth-ui`. Implementation commits: `550a231` (web), `2502074` (E2E harness and specs), `6b821a2` (docs).
Both gate runs ran on `6b821a2`, against the same dev database, one after the other.

## Gates

| Run | Log | Result |
|---|---|---|
| 1 | `gate-20261011T103024Z.log` | PASS (13 steps, 534 s) |
| 2 | `gate-20261011T103937Z.log` | PASS (13 steps, 531 s) |

- Web: lint, typecheck and 24 test files with 234 tests pass. Build passes.
- Bundle budget: student 155.5 KB gz (limit 200), tutor 155.6 KB gz (limit 300). Zod and React Hook Form are only in the `LoginPage`, `ChangePasswordPage` and `schemas` chunks.
- Contrast: PASS (32 pairs).
- E2E on `phone-small`, `tablet` and `laptop`: 153 passed and 21 skipped per run. The skips are the dev-server-only `/dev/ui` cases and the guard self-tests, which only run on `laptop`.
- The guards' "expected failure" self-test shows as ✘ in the list output by design.
- `./scripts/check-docs.sh`, run bare: PASS.

**The bootstrap path ran once per database.**
- Before the gates, the dev database was empty (as stated in the brief). The first E2E run of the session bootstrapped `e2e-tutor` and did the forced first change.
- In both gate runs, the app log says `A tutor account exists; the tutor bootstrap variables are ignored`. The global setup signed in with the stored `.data/e2e/tutor-password`.
- So run 2 proves that the stored password is reused.
- The empty-database path in CI is the `e2e-smoke` job, which uses the same `e2e-run.sh` and the same global setup.

**No 429 from the server.**
- The app log (`backend/target/e2e-app.log`) contains no `RATE_LIMITED` in either run.
- The 429 screenshot uses a response that the test mocks in the browser (`page.route`). The throttle is raised for the E2E process only.

## AC → proof

| AC | Proof |
|---|---|
| AC1 | **E2E** `auth.spec.ts` "AC1: a protected URL asks to sign in…": `/tutor/students` → `/login?next=%2Ftutor%2Fstudents` → sign-in → `/tutor/students`, with no full page load (window marker).<br>**E2E** "AC1: GET /auth/session completes before any other API request": events `start session, end session, start meta` (`records/*/ac1-network-order.json`).<br>**Unit/component** `guards.test.tsx` (anonymous → `?next=`; cold-load order with a delayed session).<br>**Unit** `lib/api/client.test.ts` "sends X-XSRF-TOKEN equal to the cookie on every non-GET request" and "sends no header on GET". |
| AC2 | **Unit** `features/auth/model/redirect.test.ts`: the design-notes table, every accepted and refused row, plus extra cases (encoded CR/LF, DEL, `%252e`, encoded backslash, scheme in the path). `safeNext('/student/home','TUTOR')` → `/tutor/today`.<br>**E2E** "AC2: signing in with next=…" ×5: `//evil.example`, `https://…`, `/tutor/../student/home` and `/student/home` → `/tutor/today`; `/tutor/students?q=an` is kept. Each lands with no full page load.<br>**Component** `LoginPage.test.tsx` (6 next/role cases). |
| AC3 | **Component** `LoginPage.test.tsx`:<br>• the same generic message for a wrong password, an unknown user and a locked user, with zero session requests after the failures;<br>• 429 `Retry-After: 240` → "Hãy thử lại sau 4 phút." / "Try again in 4 minutes.";<br>• a network failure shows Retry, and the retry signs in;<br>• one POST after Enter, click and Enter while pending;<br>• with no XSRF cookie: `GET /auth/session` comes before `POST /auth/login`.<br>**Unit** `client.test.ts` (priming, and the request without the header when priming fails).<br>**E2E** screenshots of the error, rate-limited and forgot-open states. |
| AC4 | **E2E** "AC4: the forced change cannot be bypassed…":<br>• a new student signs in and lands on `/change-password` (forced copy, no Cancel);<br>• `/student/home`, `/student/work`, `/tutor/students` and `/` all go back to `/change-password`;<br>• `/login` logs out (session 401), then a protected URL asks to sign in;<br>• a fresh login works, and the change lands on `/student/home`.<br>**Component** `ChangePasswordPage.test.tsx` (forced mode; `next` handling ×4; every protected URL). |
| AC5 | **E2E** "AC5: voluntary change from the header":<br>• `CURRENT_PASSWORD_INCORRECT` on the current field; `PASSWORD_TOO_COMMON`, `PASSWORD_EQUALS_USERNAME` and `PASSWORD_UNCHANGED` on the new field;<br>• the summary has focus after each failed submit;<br>• success confirms that other devices were signed out, and a second context of the same student gets 401.<br>**Component**: all six server codes on their fields, client checks with summary links, a network error and Cancel. |
| AC6 | **E2E** "AC6: Log out ends the session…":<br>• Log out → `/login`; Back → `/login?next=%2Fstudent%2Fhome` (no student page);<br>• a protected visit → `/login?next=`;<br>• the idle expiry (session cookie removed) ×2, without and with remember-me: Log out works, the remember-me cookie is gone, the next login succeeds, and no 403 is recorded.<br>**Component** `guards.test.tsx` (the logout sends the XSRF header and clears the cache; a failing logout still goes to `/login`). |
| AC7 | **E2E** "signed in as TUTOR/STUDENT › AC7":<br>• the wrong role → `/forbidden`, whose link leads to the role home (h1 focused);<br>• `/` and `/login` → the role home.<br>• "AC7: / sends an anonymous visitor to /login".<br>**Component** `guards.test.tsx`, `app.test.tsx`, `LoginPage.test.tsx`. |
| AC8 | **E2E** "AC8: remember-me…":<br>• unticked → no `ENGLMS_REMEMBER_ME`; ticked → the cookie, `HttpOnly`, `Secure`, `SameSite=Lax`, 30.0 days (`records/*/ac8-remember-me-cookie.json`);<br>• a new context holding only that cookie opens `/` as the student;<br>• after Log out, the tutor signs in on the form with no 403.<br>**E2E** "AC8/AC9: the public pages in vi and en": the hint, the disclosure and the switcher on `/login`, and the switcher on `/forbidden`. The switcher on `/change-password` is covered by "AC9: … the password page in English". |
| AC9 | axe and the no-horizontal-scroll check run inside the E2E tests at all 3 viewports, on:<br>• login: default, error, rate-limited, forgot-open vi/en;<br>• change password: forced, voluntary, field errors, success, en;<br>• forbidden: both roles;<br>• the shell header: both roles.<br>Keyboard-only tests: "AC9: keyboard-only sign-in" and "AC9: keyboard-only password change". The 44 px targets add the header link and button (`records/*/ac6-target-sizes.json`).<br>`ui/` tests with axe: `PasswordField.test.tsx`, `Checkbox.test.tsx`, `ErrorSummary.test.tsx`. `/dev/ui` entries are asserted in `DevUiPage.test.tsx`. |
| AC10 | Both gate runs above. No 429. The empty-database path is CI `e2e-smoke`. The bundle budget is green.<br>Retargeted specs keep their assertions:<br>• smoke and loading: landing → `/login`; the shells use the stored tutor or student session;<br>• guards: signed in; the anonymous second page now expects `/login?next=%2Fstudent`;<br>• polish AC2/AC3: `/login`;<br>• polish AC4: the failing navigation is the header's password link, and `/` itself fails through the session bootstrap;<br>• route-focus: per role, through the header links and the 404 link. |

Step budget (ux-flows F0, login ≤ 3): 3 steps at 360, 768 and 1280 (`records/*/steps-login.json`).

## Screenshots (`impl/<project>/`, project = `phone-small` 360×740, `tablet` 768×1024, `laptop` 1280×800)

The same 14 files exist for each project:
- `login-default-vi`, `login-error-vi`, `login-rate-limited-vi`, `login-forgot-open-vi`, `login-forgot-open-en`
- `change-password-forced-vi`, `change-password-voluntary-vi`, `change-password-voluntary-en`, `change-password-field-errors-vi`, `change-password-success-vi`
- `forbidden-tutor-vi`, `forbidden-student-vi`
- `shell-header-tutor-vi`, `shell-header-student-vi`

The retargeted specs also write their usual screenshots to `screenshots/<project>/`: login vi/en, the shells, loading, AC2–AC4 and focus.

## Accessibility notes (accessibility.md §2)

**axe**: clean on every changed route, at all 3 viewports.

**Keyboard**:
- Sign-in: Tab to the username, type, Tab to the password, type, Enter. Focus lands on the home page's h1.
- Password change: Tab to each field, Enter. The success region takes focus.
- After a failed change, the error summary takes focus, and its links move focus to the fields.

**Focus**: client navigations move focus to the h1, as before.

**Names**:
- The reveal toggle has a fixed name ("Hiện mật khẩu" / "Show password") with `aria-pressed`.
- The checkbox hint is its description.
- The summary is an `alert` named by its h2.

No screen-reader run (manual NVDA/VoiceOver passes are planned for M5 and M8).

## Deviations and notes for review

1. **Console guard allowance (`e2e/support/fixtures.ts`).**
 - Chromium logs every 4xx response as a console error. The anonymous session bootstrap (`GET /api/v1/auth/session` → 401) is the documented answer.
 - So the guard ignores exactly that message from exactly that URL.
 - A new self-test (`guards.spec.ts`) proves that a 401 from any other request still fails a test.
 - Tests that provoke a 401, 422 or 429 on purpose remove only those entries (`acceptStatus`).
2. **`ui/Button`.** It now removes React Aria's pending announcement for the button when the button unmounts.
 - Without this, a submit that navigates leaves a live-region `role="img"` pointing at a missing id for 7 s, and axe fails (`role-img-alt`).
 - A unit test covers it, and it fails without the fix.
 - The shortcut relies on React Aria's `[data-live-announcer]` DOM.
3. **Zod is configured `jitless`.** Zod's `new Function` probe raised a CSP violation under `script-src 'self'`.
4. **Header order.** The account controls come before the language switcher, so the switcher's segments do not move when a language change resizes the other labels (polish AC2). The loading skeleton mirrors this order.
5. **Not built: an unsaved-changes guard on the password form.** It is not in the packet's scope, and `ConfirmDialog` and `UnsavedChangesGuard` do not exist yet. The forms otherwise follow interaction-states §2.
6. **E2E students accumulate.** Each E2E run creates students in the dev database: one shared student, plus one per destructive test and project. This follows the packet's design.
7. **The polish AC4 "/ itself" case now fails `/` through an aborted session request.** `/` has no page module any more.

## G3 round 1 fixes (`073c71d` web, `6aefd73` E2E)

| Finding | Fix | Proof |
|---|---|---|
| UX-1 (S2) | The summary-focus effect now waits until the summary is in the DOM. In a browser, react-hook-form publishes the errors one render after the submit's state update. The login form already moved focus to its first invalid field. | E2E: the first empty submit focuses the summary, by Enter and by click, in forced mode (AC4) and voluntary mode (both roles). These checks fail against the previous logic (verified on `laptop`). Component tests cover click and Enter, forced and voluntary, too short and mismatch, plus login by Enter. jsdom cannot reproduce the race, because Testing Library flushes it inside `act`. |
| UX-2 (S3) | The disclosure has a lucide `ChevronRight` marker (`aria-hidden`), turned 90° when `details[open]`. It uses tokens only; under reduced motion the transition is 0 ms (`--motion-duration`). | Component test; `impl/*/login-forgot-open-*`. |
| UX-3, SEC S4-1 | The remember-me hint now uses the agreed vi/en copy. | Component and E2E assertions. |
| UX-4 (S3) | Forced mode has a quiet "Đăng xuất / Log out" button next to the submit, using the header's logout flow. It does not appear in voluntary mode. | Component test (POST logout, then `/login`); E2E checks it is visible; `impl/*/change-password-forced-vi`. |
| UX-5 (S3) | Both forms use `mode: 'onSubmit'` and `reValidateMode: 'onChange'`. | Component tests: tabbing through empty fields shows no error; after a failed submit, typing clears the error. |
| UX-6 (S4) | The login description is role-neutral. | Component test; screenshots. |
| UX-7 (S4) | `/forbidden` copy depends on the role. The success link is flush with the column (`.flush`, still 44 px tall). | `guards.test.tsx` for both roles; `impl/*/forbidden-*`, `impl/*/change-password-success-vi`. |
| SEC S4-4 | `isSafeAppPath` refuses whitespace in the path part, raw or decoded. A query may still contain an encoded space (`?q=an%20b`). | New rows in `redirect.test.ts`: `/tutor/.. `, `/tutor/%2e%2e%20`, `/tutor/students/a%20b` and a tab. |
| QA F2 (S4) | Failed-resource console entries now carry their URL. `acceptStatus(status, path)` only accepts the provoked status from the provoking API path. The polish regex for aborted requests allows the URL suffix. | `auth.spec.ts`. |

**Gate**
- Run on `6aefd73`, same dev DB: `gate-20261011T144910Z.log`, PASS (13 steps, 459 s).
- Web: 24 files / 253 tests. Budget: student 155.7 KB gz, tutor 155.7 KB gz.
- E2E: 159 passed, 21 skipped.
- The stored E2E tutor password was reused; no `RATE_LIMITED` in the app log.

**Gate logs kept:** `gate-20261011T103937Z.log` (pre-review run 2) and the new one. The pre-review run-1 log is removed, as asked.

**Screenshots:** the gate run rewrote `impl/`, `screenshots/` and `records/` for all 3 viewports.
