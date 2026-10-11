# T-M2.4 packet DOCS-REVIEW (fresh docs-reviewer; recorded by the LC from the returned text)

Rounds: 1 CHANGES REQUESTED at `7c13808`, 2 CHANGES REQUESTED at `07f2e96`, 3 **PASS** at `032a8b8`. The final head adds the reviewer's own round-3 S4 suggestions (R3-1 wording, R3-2 in AC6, rewrap; the second AC10 run kept out of the split line) and this record.

## Round 3

DOCS-REVIEW T-M2.4, round 3 (PR #81, `032a8b8`, diffed against `07f2e96`): **pass**. All six round-2 findings are fixed, and the AC8 flow works against the backend as currently coded. Nothing new above S4. `./scripts/check-docs.sh` run bare passes (206 files, `progress.json` valid).

## AC8 traced through the backend

I traced this through the code and the Spring Security 7.1.1 jars; I did not run it.

1. **A new context holding only the student's remember-me cookie opens the app.** The first request is the bootstrap `GET /auth/session`. Remember-me signs the student in there, and `CsrfAuthenticationStrategy` expires `XSRF-TOKEN`. The handler then calls `AuthSessions.primeCsrfCookie` (`AuthController.java:64`), which writes a fresh token later in the same response. So the context opens as the student and holds a valid XSRF cookie.
2. **Log out.** The request now carries a live session, so the remember-me filter does nothing and no CSRF rotation happens. The CSRF check passes. `signOut` ends the remember-me token and the session. The XSRF cookie is left alone, because Spring's logout handling is disabled (`SecurityConfiguration.java:164`).
3. **Another user signs in.** The cookie is still there, so the header is sent: 200, no 403.

The flow passes even without the re-priming. Re-priming matters in one case: a request that arrives with a remember-me cookie but no session, on a non-GET. Example: Log out after the session idle-expired, on a remembered device (AC6's expired case). That request's remember-me sign-in expires the cookie, and the re-prime then rescues the next login.

The re-prime itself is sound:
- `GET /auth/session` primes the cookie even on a 401.
- It is excluded from the 401 → `/login` redirect.
- It is a GET, so the middleware does not recurse.
- The CSRF token lives only in the cookie, so it cannot go stale on the server.

`POST /auth/logout` with a dead session cookie still returns 204: it is PUBLIC and the handler always answers 204.

## Round-2 fixes

| Item | Result |
|---|---|
| R2-1 | Fixed. Logout-first applies only to a must-change session (line 42). Re-priming is in scope 2 (lines 25-26) with a unit and component test (AC3, line 114). The realistic case is in the scope (lines 44-45), the hint (lines 101-102) and AC8 (lines 124-127). SEC confirmation is listed in Risks. |
| R2-2 | Fixed (lines 75-79): `guards.spec.ts`, plus every shell case in `smoke` and `loading`. |
| R2-3 | Fixed (lines 130-131): the empty database is covered by CI `e2e-smoke`, and no purge without asking. |
| R2-4 | Fixed (lines 53-54): `/change-password?next=` is set only when `isSafeAppPath` accepts it. |
| R2-5 | Fixed (AC8, line 125; design notes line 102). |
| R2-6 | Fixed: `updatedAt` is 09:42:29Z, matching `HANDOFF.md:1` at 09:42Z. |

## Remaining S4s (no merge block)

| ID | Where | Finding | Suggested fix |
|---|---|---|---|
| R3-1 | `T-M2.4-auth-ui.md:103-104` | "with a remembered user, logout ends the `XSRF-TOKEN` cookie" is true only when the logout request has no live session, because that is when remember-me signs in during it. After the bootstrap, logout leaves the cookie alone. | Reword: "a non-GET that arrives with a remember-me cookie but no session (e.g. Log out after an idle expiry) ends the cookie; the scope-2 re-priming covers the next request". |
| R3-2 | AC6 / AC8 | No E2E test exercises the re-prime against the real backend; AC8's flow passes without it. | Optionally add to AC6: an expired session plus a remember-me cookie, then Log out, then a login with no 403. Otherwise leave it in the QA focus (line 139), where it already is. |
| R3-3 | `T-M2.4-auth-ui.md:46`, `:54`, `:78` | These lines are over-long or wrapped oddly after the edits. | Rewrap. |

The split line now defers "the second consecutive run of AC10" (line 158). That run is the proof that `.data/e2e/tutor-password` is reused, so I suggest keeping it, though it is the Coordinator's call.

DOCS-REVIEW T-M2.4: PASS

## Rounds 1 and 2

DOCS-REVIEW T-M2.4 (PR #81, branch `docs/T-M2.4-auth-ui`, base `origin/develop` `a2c59a0`): **changes requested**. I found 3 × S2, 6 × S3 and 6 × S4. The packet's structure meets G0. Two of its main claims are wrong against the live code: that the client already sends the CSRF header, and that the existing E2E specs can keep passing unchanged. The E2E sign-in design also has unanswered questions that would make the gate flaky or break it on a second run.

I wrote no file, as you asked, so `evidence/T-M2.4/review/docs.md` does not exist. The record needs to land in a reviewer-owned PR.

## What passes

- **Docs check:** `./scripts/check-docs.sh` run bare passes: 206 markdown files, `progress.json` valid, sources intact, prompt within limit.
- **G0 structure:** all of it is present. Goal, trace, scope, explicit out-of-scope, guardrail answers, 10 ACs, test plan with an independent QA focus and an exploratory charter, SEC and UX triggered, evidence, docs to update, risks, an estimate of 2 agent-days, and commands.
- **Trace:** every reference exists and fits. That covers FR-AUTH-03..06 and 08, NFR-SEC-04/07, NFR-A11Y-01/02, T18, DEC-073/087/089/092/093/094, information-architecture §4 and frontend-architecture §2–3.
- **Backend contract:** the packet matches it on these points:
  - The generic 401 on every login failure, including while locked (DEC-089 (6)).
  - 429 `RATE_LIMITED` with `Retry-After`.
  - Logout returns 204 and is safe to repeat.
  - The six `/auth/password` field codes and the 10–128 length.
  - The 30-day `ENGLMS_REMEMBER_ME` cookie.
  - `/auth/session` primes the XSRF cookie.
- **Split:** no item of the old backlog row is lost. Every T-M1.9, M1 G5 and T-M2.1 carry-over is now in T-M2.4 or T-M2.11.
- **Other checks:** DEC-109 is consistent with the packet. `progress.json` is internally consistent. Nothing drifts into excluded scope.

## Findings

| ID | Sev | Where | Finding | Suggested fix |
|---|---|---|---|---|
| D-1 | S2 | `docs/tasks/T-M2.4-auth-ui.md:73`; `web/src/lib/api/client.ts` | The design note says "the client already sends `X-XSRF-TOKEN`". It does not. `client.ts` has only the Problem-Details middleware, and `grep -i xsrf web/src` finds only `schema.d.ts`. Login, logout and password change all need CSRF, so they would get 403 `CSRF_INVALID`. frontend-architecture §2 requires this middleware, but no AC covers it. | Add the XSRF middleware to scope item 2: read the `XSRF-TOKEN` cookie and send it as `X-XSRF-TOKEN` on non-GET requests. Add a unit test and fold it into AC1 or AC3. Fix line 73. |
| D-2 | S2 | `T-M2.4-auth-ui.md:28` ("`/` redirects by role … anonymous → `/login`"), `:52` ("Existing E2E specs keep passing"); `web/src/app/router.tsx:21`; `e2e/tests/smoke.spec.ts:8`; `e2e/tests/loading.spec.ts:20` | The redirect on `/` removes today's `Landing` page. That page holds the only `LanguageSwitcher` an anonymous user can reach. `smoke.spec` and `loading.spec` test the landing chunk, its switcher and its skeleton. So those specs must change, not just "keep passing", and nothing says the login page gets a language switcher. vi + en are both required (OQ-02/DEC-039). | Say explicitly that `Landing` is removed (or kept) and where its tests go. Put `LanguageSwitcher` on `/login`, `/change-password` and `/forbidden`, and add that to AC8 or AC9. Name the specs that will be rewritten, and confirm that moving a test's target is allowed under "never weaken tests". |
| D-3 | S2 | `T-M2.4-auth-ui.md:49-52`, `:96` (AC10), `:100`; `scripts/e2e-run.sh`; `TutorBootstrap.java`; `IdentityProperties.LoginThrottle` | The E2E sign-in design leaves several questions open. A QA agent could not verify AC10 as written. Details below the table. | Answer the five points below in the packet, or add an E2E-harness design note and add "no 429 and no cross-test invalidation" to AC10. |
| D-4 | S3 | `T-M2.4-auth-ui.md:29-31`, `:72` | `safeNext(next, role)` needs a role. On the 401 redirect, and for an anonymous visitor (AC1), there is no role yet. As written, the 401 path cannot apply the rule. | Split it: a structural check with no role when building `?next=`, and the structural check plus the role namespace after sign-in. State both in item 4 and in the design notes. |
| D-5 | S3 | `T-M2.4-auth-ui.md:29-31`, `:68-69` (T18 rule) | Gaps in the `?next=` rule. Details below the table. | Add the four rules below and extend the test table to match. |
| D-6 | S3 | `T-M2.4-auth-ui.md:70-71`; `docs/05-frontend/design-system.md:50` | The packet builds password show/hide as an ad hoc `IconButton` on two pages. The design system lists `PasswordField` (reveal) as a `ui/` component, and CLAUDE.md says to use `web/src/ui/` components only. | Add `PasswordField` to scope item 8 and to AC9's `/dev/ui` entries. |
| D-7 | S3 | `T-M2.4-auth-ui.md:126` | The command is `pnpm test`, which is `vitest` and starts in watch mode on a TTY. Earlier packets and `gate.sh` use `pnpm test --run`. The command also has no `pnpm install --frozen-lockfile`, though new dependencies are added. | Use `cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget`. Also list `cd e2e && …` or `./scripts/e2e-run.sh --project=…`. |
| D-8 | S3 | `T-M2.4-auth-ui.md:10`, `:21-52` | The 2-day estimate is at risk. The scope covers 10 items: two or three new `ui/` components, two new dependencies, CSRF and 401/403 middleware, guards, three pages, an E2E harness redesign and rewrites of existing specs. | Record a split line, as DEC-089 (4) did. For example: if AC1–AC8 are not green by about 1.5 days, AC9's extra viewports or the re-run part of the harness move to a follow-up, recorded by DEC. |
| D-9 | S3 | `T-M2.4-auth-ui.md:32-33` (DEC-093 S4-12) | The hint text, "signing in here replaces whoever was remembered", does not match S4-12. S4-12 says a failed login carrying A's remember-me cookie first signs A in. The packet does not say what the SPA does after a failed login while such a cookie is present. Does it keep the user on `/login` without refetching the session? | Write the intended behaviour and its user-facing wording, then check it in the QA focus. The cookie-on-shared-device point is for SEC to confirm. |
| D-10 | S4 | `docs/tasks/backlog.md:49-52` | The old row traced FR-AUTH-03..08 and IA §1–4. FR-AUTH-07 (tutor reset UI) and IA §2 are now traced in neither new row, although T-M2.5's text covers both. | Add FR-AUTH-07 and IA §2 to T-M2.5's trace column. |
| D-11 | S4 | `T-M2.4-auth-ui.md:113-116` | "Docs to update" leaves out `design-system.md` (the new `Checkbox`, `ErrorSummary` and `PasswordField` become implemented). It also leaves out frontend-architecture §2 for the CSRF middleware, and the E2E docs for rewriting `smoke.spec` and `loading.spec`. | Add them. |
| D-12 | S4 | `docs/handoff/HANDOFF.md:1` | The new timestamp, 09:33Z, is earlier than the one it replaces, 09:40Z. | Use the actual write time. |
| D-13 | S4 | `T-M2.4-auth-ui.md:32` | Item 5 does not order the two `/login` rules: a signed-in visitor goes home, but a must-change session first logs out (AC4). | Order them: if must-change, log out and show the form; else if signed in, go to the role home. |
| D-14 | S4 | `T-M2.4-auth-ui.md:61` | Guardrail answer 1 omits DEC-109 and NFR-A11Y. | Make it match the Trace row. |
| D-15 | S4 | `progress.json:39` | `"pr": "81"` is a string while other entries use `null`. | Check the convention. If PRs are stored as numbers, use `81`. |

### D-3 details: E2E sign-in

1. **Re-run.** After the first run, the tutor's password is no longer the bootstrap password, and `PASSWORD_UNCHANGED` forbids changing it back. The packet does not say where the changed password is stored or how a re-run picks it up.
2. **Telling tutors apart.** `e2e-run.sh` sources `.env`, which may already set `ENGLMS_BOOTSTRAP_TUTOR_*` (see `.env.example:13-14`). The packet does not say which values win, or how the script detects "a different tutor". The backend has no such query; probably a trial login.
3. **Login throttle.** The per-IP throttle allows 30 attempts in 5 minutes and counts every attempt. The auth spec makes about 10 sign-ins per project across 3 projects, plus global setup, so it will hit 429. `englms.security.login-throttle.*` can be set for the E2E run, but the packet does not say so.
4. **Shared sessions.** `fullyParallel` is on. The logout test (AC6) and the voluntary password change (AC5) end shared `storageState` sessions; a password change ends every other session. If they run as the tutor, the change also breaks the stored password.
5. **Fixture student for AC4.** How the temporary student is created and named so that it is unique per run.

**Fix for points 4 and 5:** require separate, fresh sign-ins for the destructive tests, AC5 and AC6 as a throwaway student, and say how the AC4 student is created and named.

### D-5 details: the `?next=` rule

**Gaps:**

- **No navigation rule.** Nothing requires router `navigate()` for the redirect. If an implementation used `location.assign` or `href`, the structural check would be the only defence.
- **Bad percent-encoding.** `decodeURIComponent` throws on malformed input, and that case is not specified.
- **Dot segments.** `/tutor/../student/home` passes the prefix test. The browser then normalises it to `/student/home`, which lands on `/forbidden` instead of home. That is not an open redirect, but it misses AC2's "lands on the role home".
- **The bare namespace.** `/tutor` and `/student` (no trailing slash) are valid routes, but the namespace test as written is `/tutor/`.

**Fix:**

- Navigate only through the router, never via `window.location` or `href`.
- A decode error means refuse.
- Refuse `.` and `..` segments, raw and `%2e`-encoded.
- Accept `/tutor` and `/student` exactly.

## Decisions for the PO

None strictly needs the PO; the packet's decisions are within the Lead Coordinator's remit. Two are worth mentioning to the PO:

- **E2E and the dev database:** E2E would stop on the PO's dev database whenever it holds another tutor, and the fix is `dev-down.sh --purge`, which deletes local data (D-3).
- **Shared-device remember-me:** the wording, and what happens after a failed login (D-9).

## Not checked

I did not check the `qa/` regression specs for dependence on `/`, or CI workflow changes for the E2E bootstrap in CI.

DOCS-REVIEW T-M2.4: CHANGES REQUESTED

---

DOCS-REVIEW T-M2.4, round 2 (PR #81, `07f2e96`, diffed against my round-1 head `7c13808`): **changes requested**. Round 1 is fixed apart from D-9 (still open as R2-1 below). But logout before every login fails against the live backend in exactly the shared-device case it is meant to handle, so AC8 cannot pass as written. `./scripts/check-docs.sh` run bare passes (206 files, `progress.json` valid).

## Your three questions

**1. Logout before every login: not sound in the remembered-user case.** I traced this through the code and the Spring Security 7.1.1 jars; I did not run it.
- The CSRF filter runs before remember-me (`SecurityConfiguration.java` around line 137). So `POST /auth/logout` passes its CSRF check with the old token.
- Then the remember-me filter signs A in. `RememberMeConfigurer` gives it the shared session strategy, which includes `CsrfAuthenticationStrategy`, because `CsrfConfigurer` adds it.
- That strategy calls `saveToken(null)`, which expires the `XSRF-TOKEN` cookie on this `/api/**` response, and only creates a lazy replacement token.
- Nothing loads the replacement: `logout()` / `signOut()` never call `primeCsrfCookie`, and `csrf.spa()` adds no eager-load filter.
- So the next `POST /auth/login` goes out with no `X-XSRF-TOKEN` and gets 403 `CSRF_INVALID`.
- The backend tests miss this because `Browser.send` re-primes the token itself whenever the cookie is missing (`Browser.java:55-57`).
- Without remember-me (an anonymous visitor, or a must-change session, which never gets remember-me) logout touches no CSRF state, so those paths are fine.

**2. The env var name is correct.** `englms.security.login-throttle.max-attempts` (`application.properties:53`) binds to `ENGLMS_SECURITY_LOGINTHROTTLE_MAXATTEMPTS`, which matches `deployment.md:43`. The overrides for `ENGLMS_BOOTSTRAP_TUTOR_*` bind to `englms.bootstrap.tutor.*`, and `e2e-tutor` passes the username rule.

**3. AC count and size are acceptable.** There are still 10 ACs, but they are denser (AC1, AC3 and AC8 each check four or more things). The scope grew too: CSRF middleware, `PasswordField`, moving the switcher, and retargeting about 5 specs. With the split line in Risks, 2 agent-days is tight but acceptable.

## Round-1 fixes

| Item | Result |
|---|---|
| D-1 | Fixed: scope 2 (lines 24-27), AC1 (lines 102-104), line 97. |
| D-2 | Fixed in principle (lines 30-31, 60-61, 74-76, AC8). Incomplete; see R2-2. |
| D-3 | Fixed (lines 62-76, AC10). The throttle variable, `.env` override, password reuse, untouched `storageState` and fresh students all check out against `e2e-run.sh` and `TutorBootstrap`. See R2-3. |
| D-4 | Fixed (lines 33-39). |
| D-5 | Fixed (lines 34-40, table at lines 92-94). The table now covers bad encoding, dot segments, `/tutorx` and `/tutor` exactly, and navigation is router-only. |
| D-6, D-7, D-8 | Fixed (lines 57-58, 157-165, 149-150). |
| D-9 | Not sound; see R2-1. |
| D-10 | Fixed: the T-M2.5 trace now has FR-AUTH-07 and IA §2. |
| D-11, D-13, D-14 | Fixed. |
| D-12 | Fixed: `HANDOFF.md:1` now reads 09:38Z. |
| D-15 | Withdrawn: `progress.schema.json:25` makes `pr` `["string","null"]`, and the handoff Gotchas confirm it. |

## New findings

| ID | Sev | Where | Finding | Suggested fix |
|---|---|---|---|---|
| R2-1 | S2 | `T-M2.4-auth-ui.md:43-46`, `:97`, `:119-121` (AC8) | **(a)** With A remembered and no session, the logout-first submit clears the XSRF cookie (question 1), so B's login gets 403 and AC8's shared-device clause fails. Fixing that on the backend is out of scope (line 81). **(b)** That situation is barely reachable through the SPA anyway. With A's remember-me cookie, the bootstrap `GET /auth/session` already signs A in. Then line 42 ("else if signed in → the role home") takes B to A's home, and B never sees the form. AC8 does not say how QA sets it up. | In scope 2: when the `XSRF-TOKEN` cookie is missing, the middleware first calls `GET /auth/session` (it primes even on 401), then sends the non-GET. Add a unit test. In AC8, give the setup (load `/login` anonymous, add A's remember-me cookie to the context, submit B with a wrong password, then a correct one) and the expected result: nobody signed in after the failure, B signed in after success, no 403. Also state the realistic case in the design notes and hint: with A remembered, the app opens as A, so log out on a shared device. SEC confirms. |
| R2-2 | S3 | `T-M2.4-auth-ui.md:74-76` | The retarget list leaves out `e2e/tests/guards.spec.ts`. It opens the anonymous `/tutor` and expects the h1 "Không gian gia sư" (`guards.spec.ts:16-23`), so after this task it would land on `/login`. Also, the tutor and student cases in `smoke.spec.ts` (lines 9-10) and `loading.spec.ts` (lines 12-15, 118) need sign-in, but only the landing case is called out. | Add `guards.spec.ts` (sign in, or use `/login` as the guard target). Say that every shell case in `smoke` and `loading` uses the tutor `storageState` or a student session. |
| R2-3 | S3 | `T-M2.4-auth-ui.md:124` (AC10), `:151-152` | "and on an empty one" invites a local `dev-down.sh --purge`, which deletes the PO's dev data. CI's `e2e-smoke` already starts from an empty database (`e2e-smoke.yml`, `e2e-run.sh` step). | Make the empty-database variant the CI `e2e-smoke` run, recorded in the evidence. Forbid purging the PO's dev database without asking. |
| R2-4 | S4 | `T-M2.4-auth-ui.md:39`, `:52-53` | It does not say how `next` gets from `/login` to `/change-password`, so forced mode cannot use `safeNext`. | Login success with must-change goes to `/change-password?next=<next>` when `isSafeAppPath` accepts it. |
| R2-5 | S4 | AC8, `:120` | `AuthSessions.signIn` gives no remember-me while the password must change (line 40). The remember-me cookie E2E therefore needs a user past the forced change. | Say so: a student after the forced change, or a fresh tutor sign-in (it does not end the stored session). |
| R2-6 | S4 | `progress.json` `updatedAt` | It still reads 09:33:19Z while HANDOFF reads 09:38Z. | Bump it with the next edit. |

DOCS-REVIEW T-M2.4: CHANGES REQUESTED
