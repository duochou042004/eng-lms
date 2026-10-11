# T-M2.4 QA record (independent G3; recorded by the LC from the qa-evaluator's returned text)

Final verdict: **PASS WITH MINOR** (round 2 at `4b403a7`); merged via merge-gate as `9fcc992` (PR #82). Open S4s (F1 gate rewrites tracked evidence, F3 `/forbidden` during a forced change) are recorded in the merge DEC; the `qa/` specs listed in round 1 need an update for the removed anonymous landing page.

## Round 2

**QA report: T-M2.4 Auth UI, round 2 re-test (PR #82, `feature/T-M2.4-auth-ui` @ `4b403a7`)**

Every fix holds when tested black-box, and nothing regressed. My script passed 54/54 across 360, 768 and 1280 widths, and the new forced-mode Log out ends the session without skipping the password change. I did not re-run the full gate, because nothing gave me reason to doubt the implementer's run at `6aefd73`. Verdict: PASS WITH MINOR. The minor items are the deferred round-1 S4s, plus two new S4 notes.

## Environment and scope
- **Branch and changes:** the branch was already checked out at `4b403a7`. I diffed it against `c1e05e0`: the code fixes are in `073c71d` (web) and `6aefd73` (e2e). `git diff 6aefd73 4b403a7 -- web e2e backend scripts` is empty, so `4b403a7` adds evidence only.
- **App:** I built the JAR from this head the same way `scripts/e2e-run.sh` does (web build copied into `static/`, then `mvnw package`). I ran it on :8080 with the E2E tutor bootstrap and the raised throttle, against the dev database.
- **Accounts:** the tutor came from the harness's stored session file, loaded by Playwright; I read no secret files. I created every student through the tutor API.
- **Tools:** Chromium only, Playwright from `qa/node_modules`.
- **Where my files are:** (session-local scratchpad, not kept):
  - `spec/qa-auth.spec.ts`, now with three round-2 tests
  - `spec/qa-extra.spec.ts`
  - `spec/qa-chev.spec.ts`
  - `shots/`
  - `web-checks-r2.log`, `app-r2.log`
- **Cleanup:** the app is stopped and `./scripts/dev-down.sh` ran without `--purge` (data volume kept). `git status` is clean and no containers are running. No harness run touched tracked evidence this round, and I posted no PR comment.

## Gates
- **Web checks** (`pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget`): PASS. 24 test files, 253 tests (234 in round 1). Budget: student 155.7 KB gz (limit 200), tutor 155.7 KB gz (limit 300).
- **Full gate: not re-run.**
  - The implementer's log `evidence/T-M2.4/gate-20261011T144910Z.log` is on `6aefd73`: PASS, 13 steps, 459 s, 159 E2E passed.
  - Since `6aefd73` there are no code changes.
  - My web checks and my 54-test run on a JAR built from this head agree with it.

## My script on all 3 viewports: 54/54 passed
- All of round 1's AC1–AC10 checks still pass, including the 401 mid-session, the 403 `PASSWORD_CHANGE_REQUIRED` redirect, and anonymous `/dev/ui` (404 page) and `/forbidden`.
- One test change: AC4 now checks that the shell's "Change password" link is absent on the forced page, instead of "no Log out button", because the forced page now has Log out on purpose (UX-4).

## Verdict per AC

| AC | Verdict | What I checked |
|---|---|---|
| AC1 | PASS | `/login?next=` keeps the path and query, and signing in returns there with no full page load. On a cold load the session call finishes before the next API call starts. When the XSRF cookie is missing, it is primed and then sent as the header. |
| AC2 | PASS | 46 `?next=` values (11 of them new whitespace cases), each at 3 viewports. All stay on `localhost:8080`, with no full page load and no request to another host. |
| AC3 | PASS | The same generic message for a wrong password, an unknown user and a locked account. No session call after a failed login. The 429 wait text, a network error with Retry, one POST despite a double submit, and the XSRF priming. |
| AC4 | PASS | URL and history bypasses are caught, `/login` logs out first, and `next` is kept. The new forced-mode Log out is covered below. |
| AC5 | PASS | Each server error code shows on its field, the error summary takes focus, success shows the confirmation, and other devices get 401. |
| AC6 | PASS | Back after Log out, two tabs, and an expired session with remember-me followed by a login with no 403. |
| AC7 | PASS | Role guards for both roles, `/` redirects, `/forbidden` and its link home. Student isolation: tutor API 403/404, session DTO has 7 keys and no `SECRET-` marker. |
| AC8 | PASS | The remember-me cookie only when ticked, 30 days, `HttpOnly`/`Secure`/`Lax`. A new context holding only that cookie opens as A. Log out, then B signs in with no 403. A's old cookie is dead afterwards. |
| AC9 | PASS | Axe clean and no horizontal scroll at all three widths, now also on the forced page with Log out. Keyboard-only sign-in and password change work. |
| AC10 | PASS | The implementer's gate on `6aefd73`, my web checks, and the budget. |

## Fix verification

| Fix | Result | How I checked |
|---|---|---|
| UX-1: the summary takes focus on the first failed client-side submit | PASS | An empty submit on change password moves focus to the summary, and the current field gets "required" as its description. The login form, which has no summary, focuses the username input. |
| UX-2: chevron on the disclosure | PASS | An SVG chevron rotates 90° when the disclosure opens (`matrix(0,1,-1,0,…)`). It opens with Enter on the focused summary. |
| UX-3 / SEC S4-1: new shared-device hint | PASS | The new vi copy shows on `/login`, and so does the en copy. Axe clean. |
| UX-4: Log out in forced mode | PASS | See below. |
| UX-5: validation on submit, then on change | PASS | Before the first submit, a short value and leaving the field show no error. After a failed submit, typing clears the "required" error at once, and a mismatch in the repeat field appears as you type. |
| UX-6/UX-7: copy, role-aware `/forbidden` | PASS | The tutor sees the student-area text in vi, and in en after switching. The student sees the tutor text. The login description is shorter. |
| SEC S4-4: `isSafeAppPath` refuses whitespace in the path | PASS | See the whitespace cases below. |
| Round-1 F2: `acceptStatus` scoped to a URL | PASS | `acceptStatus(guard, status, path)` now matches the status and the exact pathname. Each use names its endpoint: login 401, login 429, password 422. The implementer's gate stays green with it. |
| Round-1 F1, F3; SEC S4-2/S4-3 | Deferred | Deferred to the merge DEC, as you said; not re-tested. |

**Forced-mode Log out (UX-4)**
- On the forced page there is a "Đăng xuất" (Log out) button and no Cancel.
- Clicking it goes to `/login`, and `GET /auth/session` then answers 401.
- Back stays on `/login`. `/student/home` and `/change-password` both go to `/login`. No 403 at any point.
- Signing in again lands on `/change-password` with `mustChangePassword` still true, so the change cannot be skipped.
- Log out can be reached with Tab and pressed with Enter; the session is then 401.

**Whitespace in `?next=` (SEC S4-4)**
- **Refused, so the user lands on `/student/home`:**
  - `/student /work` (a space inside the path)
  - a trailing space
  - `/student/a+b` (URLSearchParams turns `+` into a space)
  - NBSP (`%C2%A0`)
  - U+2028
  - an LF in the path
  - `%2520` (an encoded space after one decode)
- **Kept, because whitespace is allowed after `?` or `#`:**
  - `?q=a%20b` → `/student/work?q=a%20b`
  - `?q=a%2520b` → `?q=a%20b`
  - `#a%20b`
  - `?q=//evil.example%20x` → stays in the app at `/student/work?q=//evil.example%20x`
- In every case: no full page load and no request to another host.

## Findings

| ID | Sev | Status | Finding |
|---|---|---|---|
| F1 | S4 | Open, deferred to the merge DEC | Running the gate or `e2e-run.sh` rewrites tracked files under `evidence/T-M2.4/`. |
| F2 | S4 | Fixed | `acceptStatus` is now scoped to the URL. |
| F3 | S4 | Open, deferred to the merge DEC | `/forbidden` stays reachable during a forced change. It is public, has no data, and its link leads back. |
| R2-1 | S4, informational | New | In my first full-page screenshot taken right after Enter, the chevron was caught mid-rotation. A quick check is whether the animation respects `prefers-reduced-motion`; I did not check that. |
| R2-2 | S4, informational | New | The login form has no error summary. An empty submit focuses the username field rather than a summary. That is consistent with UX-1, which applies to the change-password form; I note it only so UX can confirm it is intended. |

No S1, S2 or SCOPE findings.

**Exploratory, round 2.** I tried to get past the forced change through the new Log out with Back, Forward and direct URLs. I tried whitespace and double-encoding mixes with lookalike paths in the query. With the session request delayed, there is still no flash of protected UI. I found no way into protected UI or data without a valid session of the right role.

**`qa/` specs needing an update:** unchanged from round 1. I did not re-run them this round, since the fixes do not touch the `/` landing behaviour.

QA-VERDICT T-M2.4: PASS WITH MINOR

## Round 1

**QA report: T-M2.4 Auth UI, independent G3 black-box (PR #82, `feature/T-M2.4-auth-ui` @ `c1e05e0`)**

The auth UI meets all ten acceptance criteria. It held up against 35 `?next=` attack values on each of the three widths, and I found no way to reach protected UI or data without a valid session of the right role. There are no S1, S2 or SCOPE findings, only three S4 notes, so the verdict is PASS WITH MINOR. As asked, this report is returned as text only; I wrote nothing under `evidence/` and posted no PR comment.

## Environment
- **Machine and tools:** Kali Linux, rootless Podman, JDK 25, Node 24, Chromium only (Playwright 1.63 from `qa/node_modules`).
- **App:** the packaged JAR from my gate run, on :8080 with the same environment as `scripts/e2e-run.sh` (E2E tutor bootstrap, raised login throttle), against the dev database.
- **Accounts:** the tutor came from the harness's stored session (`.data/e2e/state/tutor.json`, loaded by Playwright; I read no secret files). I created every student through `POST /api/v1/tutor/students`.
- **My scripts and output** are only in the scratchpad: (session-local scratchpad, not kept) (`spec/qa-auth.spec.ts`, `spec/qa-extra.spec.ts`, `shots/`, `gate.log`, `gate-20261011T135156Z.log`, `web-checks.log`, `qa-regression.log`).
- **Independence:** I read the implementation only after my verdict was drafted: the deviation 1 and 2 diffs, plus the en/vi `auth.json` strings to build locators.
- **Cleanup:**
  - The gate log, which `gate.sh` writes into `evidence/`, is moved to the scratchpad.
  - The gate's E2E run rewrote 33 tracked evidence files (finding F1). I put them back with `git checkout`.
  - `qa/qa-shots/` (created by the QA regression run) is deleted.
  - The app is stopped and `./scripts/dev-down.sh` was run without `--purge` (data volume kept).
  - The tree is clean and no containers are running.

## Gates
- **Web checks** (`pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget`): PASS. 24 test files, 234 tests. Budget: student 155.6 KB gz (limit 200), tutor 155.7 KB gz (limit 300).
- **`ENGLMS_TASK=T-M2.4 ./scripts/gate.sh`**, re-run after the interrupted attempt: **PASS (13 steps, 533 s)**.
  - E2E: 153 passed, 21 skipped (the dev-server-only and laptop-only cases).
  - Global setup reused the stored E2E tutor password on the same dev database, so this is a third consecutive green run after the implementer's two.
  - No 429 appeared.

## Verdict per AC (my script, 3 viewports: 360×740, 768×1024, 1280×800; 36/36 green)

| AC | Verdict | Evidence |
|---|---|---|
| AC1 | PASS | Anonymous `/tutor/students` → `/login?next=%2Ftutor%2Fstudents`. Anonymous `/student/work?x=1` → `/login?next=%2Fstudent%2Fwork%3Fx%3D1`; signing in returns there with no full page load (window marker kept). Cold load with the tutor session: `start session → end session → start meta → end meta`. An anonymous protected visit makes no API call besides the session one. After the XSRF cookie is removed, the POST's `X-XSRF-TOKEN` equals the new cookie. The tutor *form* sign-in was not run by me (needs the tutor password); the tutor guard path was covered with the stored session. |
| AC2 | PASS | 35-value `?next=` matrix per viewport, all on `localhost:8080`, no full page load, no request to another host (details below). A signed-in `/login?next=<unsafe or other role>` goes to the role home for both roles. |
| AC3 | PASS | Wrong password, unknown username and a locked account (10 API failures first) show the same alert text. No `GET /auth/session` after failed logins (timeline recorded). Failed logins set no cookie. Mocked 429 with `Retry-After: 240` shows the wait text. A network abort shows "Thử lại", and Retry signs in. Login delayed 1.5 s, then click, click and Enter: exactly 1 POST. With `XSRF-TOKEN` removed: GET session comes before POST login, the header matches the cookie, and there is no 403. |
| AC4 | PASS | A temporary-password student with `next=/student/work` → `/change-password?next=%2Fstudent%2Fwork`, forced copy, no Cancel, axe clean. `/student/home`, `/student/work`, `/student`, `/tutor/students`, `/` and `/student/zzz` all return to `/change-password`, with no shell or Log out control. A `history.pushState` plus `popstate` to `/student/home` is caught. `/login` logs out first (session then 401). A fresh login and the change land on the safe `next` or `/student/home`. An unsafe `next` → plain `/change-password` → `/student/home`. |
| AC5 | PASS | From the header link: `CURRENT_PASSWORD_INCORRECT` is described on the current field. `PASSWORD_TOO_COMMON`, `PASSWORD_EQUALS_USERNAME` and `PASSWORD_UNCHANGED` are described on the new field. After every failed submit, focus is on the summary, including client-side mismatch and too-short. Success shows the confirmation. A second remembered context of the same student is then 401; the current session stays valid. Axe clean. |
| AC6 | PASS | Log out → `/login`, session 401. Back and Forward show no shell or Log out control. Two tabs: after logging out in tab 1, a submit in tab 2 → `/login`, and a reload → `/login?next=%2Fstudent%2Fhome`. Idle-expired session with remember-me: Log out works, the remember-me cookie is gone, and signing in as B gives no 403. No username left in local or session storage. |
| AC7 | PASS | Anonymous `/` → `/login`. Tutor: `/` and `/login` → `/tutor/today`; `/student`, `/student/home`, `/student/x/y` → `/forbidden`, whose link goes home. Student: the mirror cases for `/tutor`, `/tutor/today`, `/tutor/students` and `/tutor/students/123`. Axe clean. Isolation: a student calling `/api/v1/tutor/students[/<id>]` gets 403/404. The student session DTO has exactly 7 keys and no `SECRET-` marker. |
| AC8 | PASS | Unticked: no `ENGLMS_REMEMBER_ME`. Ticked: `HttpOnly`, `Secure`, `SameSite=Lax`, 29.9–30.1 days. A new context holding only that cookie opens `/` as A, and `/login` also goes to A's home (shared-device behaviour as in DEC-093). Log out, then B signs in, no 403. A's old cookie no longer signs in after that. The hint, the "Quên mật khẩu?" disclosure and the switcher are present in vi and en; switching sets `<html lang="en">`. |
| AC9 | PASS | Axe (WCAG 2.0/2.1/2.2 A/AA) and no horizontal scroll at all three widths on: login vi, login with forgot-info open, login en, change password (forced, voluntary, field errors, success), and forbidden for both roles. Keyboard-only sign-in: Tab to username, Tab to password, Enter; focus lands on the h1. Keyboard-only password change works. The `/dev/ui` entries were checked through the gate's component tests only (not served by the packaged app, which shows the 404 page there). |
| AC10 | PASS | Gate green, budget green, no 429, retargeted implementer specs green. |

**`?next=` matrix (AC2)**
- **Encoded and double-encoded:** `//evil.example`, `%2F%2F…`, `%252F%252F…`, `%25252F…` → `/student/home`.
- **Backslash:** `/%5Cevil`, `%2F%255C…`, `%5C%5C…` → home.
- **Schemes:** `https:…`, `javascript:alert(1)` → home.
- **Dot segments:** `..`, `%2e%2e`, `%252e%252e`, `%25252e%25252e`, `.` → home.
- **Malformed encoding:** `%E0%A4%A` → home.
- **Other role and lookalikes:** `/tutor…`, `/studentx`, `/STUDENT/home`, `/student@evil.example` → home.
- **Whitespace and control characters:** leading space, `%09`, `%0D%0A` → home.
- **Triple slash, `/login`, `/change-password`, empty** → home.
- **Accepted as safe:** `/student`; `/student/work?q=an#top`; `/student?//evil.example` → `/student`; `/student&next=//evil` (duplicate parameter) → `/student`.
- **Long values:** a 6,000-character safe path is accepted and navigated in-app. 20,000 characters is refused by the server with HTTP 400 (request size limit), before the SPA loads.

## Findings

| ID | Sev | Finding | Repro |
|---|---|---|---|
| F1 | S4 | Running the gate (or `e2e-run.sh`) on this branch rewrites 33 **tracked** files under `evidence/T-M2.4/{impl,records,screenshots}`, because the E2E specs write their evidence to tracked paths. Any reviewer's or QA's re-run dirties the tree and invites an accidental evidence commit. | `ENGLMS_TASK=T-M2.4 ./scripts/gate.sh`, then `git status`. |
| F2 | S4 | Test hygiene: `acceptStatus` in `e2e/tests/auth.spec.ts:54` removes every console entry with a given status, not only the one from the URL the test provoked. It runs right after the provoking action, so the window is small; scoping it to the URL would make it exact. | Read `auth.spec.ts:54-58` and its uses at lines 165, 179 and 279. |
| F3 | S4 (informational) | `/forbidden` stays reachable while the password must change. It is a public page with no data, and its home link sends you back to `/change-password` (anonymous: to `/login`). Not a bypass; noted because AC4 says "any protected URL". | Forced-change student → `goto('/forbidden')` shows the 403 page. |

**Exploratory notes (charter: reach protected UI or data without a valid session of the right role; nothing found)**
- With the session request delayed by 2 s, the body is empty and there is no Log out control. There is no flash of protected UI before the redirect to `/login`.
- An anonymous visit to `/tutor/*` downloads the `TutorShell` code chunk before the redirect. That is code only, no data, and assets are public anyway.
- A real mid-session 401 (session lost after the bootstrap) on a non-session call → `/login?next=%2Ftutor%2Fstudents%3Fq%3Dan`. The `/change-password` 401 path goes to plain `/login`, because that path is not in the allow-list.
- If a mocked 401 arrives while the server session is still valid, the app ends on the role home rather than `next`, because a signed-in `/login` goes home (AC7). That is consistent with the spec.
- A mocked 403 `PASSWORD_CHANGE_REQUIRED` → `/change-password`.
- `/student//evil.example` is accepted structurally; the router normalises it to `/student/evil.example`, which stays in-app. Harmless.
- `/dev/ui` is not in the production build (the packaged app serves the 404 page).
- The 429 path was only checked with a mocked response, because the E2E throttle is raised.

**Deviations 1 and 2 against "never weaken tests"**
- **Deviation 1 (console-guard allowance): acceptable, not a weakening.**
  - It matches exactly the Chromium "status of 401" message and exactly the path `/api/v1/auth/session`.
  - A self-test (`guards.spec.ts:85`) proves that a 401 from any other URL still fails a test.
  - Residual risk: it would also hide an unexpected 401 on the bootstrap for a signed-in user. Those tests assert the landing URL, so that would still be caught.
- **Deviation 2 (`ui/Button` announcer cleanup): acceptable.**
  - It is a product fix, not a test change: it removes a dead live-region entry that axe flags (`role-img-alt`).
  - It has its own failing-without-fix unit test, and no assertion was loosened.
  - It depends on React Aria's internal `[data-live-announcer]` DOM. This is recorded as a `shortcut:` comment; a React Aria upgrade could silently make it a no-op.

## QA-owned `qa/` specs that need an update
I ran them against the T-M2.4 app at 3 viewports: 102 failed, 27 passed. None of them were edited.

**Failing because the anonymous `/` landing page is gone**, or because a shell route now needs a session or redirects to `/login`:
- `qa/e2e/T-M1.9.spec.ts`:
  - `:65` AC1 first load
  - `:93` AC1 client navigation
  - `:141` reload, skip link
  - `:160` language change
  - `:201` failed lazy load
  - `:216` axe on every route
  - `:231` AC4 skeleton and CLS for `/`, `/tutor`, `/student`, `/qa-no-such-page`
  - `:281` N3 header-shaped region
- `qa/e2e/T-M1.13.spec.ts`:
  - `:98` error page via failed lazy load ("absent on /")
- `qa/regression/M1.spec.ts`:
  - `:93` fresh visit starts in Vietnamese
  - `:101` every route
  - `:122` shells
  - `:139` client navigation
  - `:168` language switch on landing and shells
  - `:195` route error page
  - `:211` meta-failure alert in the shell header
  - `:225` deep links survive reload (`/tutor` → `/login`)
  - `:269` hashed assets: the console check sees the anonymous session 401, so these specs need the same allowance as deviation 1

**Failing for another reason:** `qa/regression/M1.spec.ts:256`. An unknown `/api/v1/qa-unknown` now answers 401 to an anonymous caller instead of 404. That is T-M2.1's deny-by-default backend behaviour, not this branch (I did not re-run it on `develop` to confirm).

**Still passing:** `T-M1.13:32` (switcher), `T-M1.13:69`, `T-M1.9:308` (isolation), `M1:240` (security headers), `M1:279` (isolation).

QA-VERDICT T-M2.4: PASS WITH MINOR
