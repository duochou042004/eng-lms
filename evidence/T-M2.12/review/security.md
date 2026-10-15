# T-M2.12 security review record (fresh reviewer; recorded by the LC from the returned text)

Final verdict: **APPROVED** at `5ed3f4d` (round 2).

---

## Round 2


**Round 2.** Both round-1 findings are fixed and tested, and nothing else in the new diff weakens the round-1 checks. There are no S1, S2 or S3 findings and no open findings.

I reviewed `git diff 57ce8df..5ed3f4d -- web docs e2e` at head 5ed3f4d. The web unit tests pass: 34 files, 370 tests, up from 364 in round 1. The tree is clean. I posted no PR comment and wrote no files.

## Round-1 recap (head 57ce8df)
Round 1 was APPROVED with two S4 notes and no S1–S3 findings:
- **S4-1:** a page that stays mounted could keep showing the previous user's data after a same-role switch. Removing queries from the cache does not tell the components watching them.
- **S4-2:** a tab restored from the back/forward cache missed the cross-tab messages.

QA observations: O-1 and O-3 had no security impact. O-2 (a failed logout is silent) was an S4 that existed before this task; it is now backlog T-M2.13. The 401-race note (a request already in flight can make tab 1 log out another tab's new must-change session) existed before the task and has a millisecond window; it stays as a note.

## Status of S4-1 and S4-2
**S4-1: Fixed** (`web/src/app/guards.ts:101-106`).
- On a user or role change, `dropAllButSession` now resets every query except the session, then removes the unused ones. Resetting tells the mounted components, wipes the old data and refetches with the new cookie.
- The 403 path, the channel messages and the `pageshow` path all use it.
- **Loops:** a page refetched after a tutor-to-student switch gets 403 `FORBIDDEN_ROLE` again. That 403 queues behind the resync, finds the session it already read unchanged, and stops. After a sign-out the refetches get 401 and land on `/login?next=`, where the resync also ends up. Neither path logs anyone out or posts a message.
- **Test** (`sessionSync.test.tsx:275-310`): the test component sits outside the router, so a router re-render cannot pass the test by accident. It checks that student A's data is gone, B's data is shown, and the route did not change.

**S4-2: Fixed** (`guards.ts:135-143`).
- `pageshow` with `persisted` runs the same steps as a received message. A normal `pageshow` does nothing.
- The listener is removed on unmount, and it never posts a message.
- T19 in `docs/04-backend/security.md` now mentions both fixes.
- Tests at `sessionSync.test.tsx:312ff` cover the restored and the normal case.

## Round-1 checks re-verified on the new diff
- **No loops:** `roleCheck` still shares one session read across concurrent 403s, and the work still runs one item at a time.
- **No logout on revalidation:** `router.tsx` `shouldRevalidate` and `followSession` are unchanged.
- **Messages:** `authChannel.ts` is unchanged. Messages carry only `{ type }` and are validated on receipt. Messages are still posted from exactly three places: login success, logout, and the `/login` guard's must-change logout. A received message or `pageshow` never posts.
- **Retry:** both buttons still only call `window.location.reload()`. `RouteError` now follows `online`/`offline` events, but only to change the copy, not to reload. The "reloads nothing on its own" test still passes. The new titles and button styles are UI-only.
- **`?next=` / T18:** unchanged.
- **Personal data:** none in the new strings or messages.

## Checklist (security.md §11)
- [x] `@Audience` + policy registry: not applicable (no backend changes in either round).
- [x] Student handlers without `studentId`, owner-scoped 404s, audience DTOs: not applicable.
- [x] Inputs and URLs: Retry builds no URL, and `?next=` is unchanged.
- [x] Files: not applicable.
- [x] Logs and messages: no secrets or personal data. Channel messages carry no data.
- [x] Migrations: none.
- [x] New dependencies: none.
- [x] The T19 row matches the code.

I did not run E2E or the gate, and I did not test back/forward cache behaviour in a real browser. The `pageshow` path is covered by the unit test only.

Relevant files:
- /home/kali/App_projects/eng-lms/web/src/app/guards.ts
- /home/kali/App_projects/eng-lms/web/src/app/sessionSync.test.tsx
- /home/kali/App_projects/eng-lms/web/src/app/routes/RouteError.tsx
- /home/kali/App_projects/eng-lms/docs/04-backend/security.md

---

## Round 1 (`57ce8df`)


I found no S1, S2 or S3 issues. I recorded two S4 hardening notes and rated the QA observations. Nothing blocks the merge.

**Scope and checks.** I reviewed `git diff origin/develop...HEAD -- web e2e docs` at 57ce8df. The backend, the migrations, `features/auth/model/redirect.ts` and the dependencies are unchanged. The web unit tests pass (34 files, 364 tests). I did not run E2E or the gate again, because QA covers `navigation.spec.ts` AC5, AC6 and the D-2 case. The tree is clean. I posted no PR comment and wrote no files.

## Findings

**S4-1: A page that stays mounted can keep showing the previous user's cached data when the user changes but the role does not.**
- **Where:** `web/src/app/guards.ts:100` (`dropAllButSession` uses `removeQueries`) and `followSession`, `guards.ts:79-85`.
- **Why:** In TanStack Query 5.104, removing a query from the cache does not notify the components still watching it. They keep showing the old data until they re-render. Only on that next render do they fetch again.
- **Scenario:** Student B's session expires while tab 1 stays open on a student page. In tab 2, student C signs in and posts `signed-in`. Tab 1 drops its cache, reads the session (C) and revalidates. `requireRole('STUDENT')` passes, so the page is not redirected and stays mounted. Any part of it that does not re-render, for example a `React.memo` child, keeps showing B's data on C's screen.
- **Why only S4:** The server still enforces ownership. Today there are no student data pages, and there is only one tutor, so a tutor-to-tutor switch cannot happen. QA found no stale sequence in practice.
- **Fix (before the student data pages in M3, not needed now):** Do one of these:
  - Use `queryClient.resetQueries({ predicate: … })` instead of `removeQueries`. It notifies the watching components and refetches with the new cookie.
  - Key the shell `<Outlet>` on `session.userId`.
- Then add one unit test for a student-to-student switch with the page rendered.

**S4-2: A tab restored from the back/forward cache missed the messages.**
- **Where:** The new T19 row in `docs/04-backend/security.md` (its "Not covered" text), and `web/src/app/guards.ts` (no `pageshow` handler).
- **Why it can happen:** `index.html` is served `no-cache`, not `no-store` (`SpaWebConfiguration.java:25`), so the page can be kept in the back/forward cache.
- **Scenario:** Tab 1 is on a tutor page and leaves the app through a full-page navigation (an external link or a typed URL). Tutor A logs out in tab 2 and student B signs in. B presses Back in tab 1. If the browser restores the page from the cache without throwing it away, the page comes back with A's DOM and cached data. The session stays cached forever (`staleTime: Infinity`), so the guards keep allowing tutor routes. Only the next API call fixes it (403 or 401).
- **Not verified:** I believe Chrome throws a cached page away when it receives a BroadcastChannel message. I did not check Firefox or WebKit.
- **Fix:** One small listener that runs the same steps as a received message: `addEventListener('pageshow', e => { if (e.persisted) …drop the cache, read the session, follow it })`. Alternatively, add this case to T19's "Not covered (by design)" list.

**QA observations, rated:**
- **O-1 (logout offline shows a spinner):** No security impact. The session stays alive, and the spinner does not falsely tell the user they are signed out.
- **O-2 (logout 500 is silent):** S4, and the behaviour existed before this task (`onSettled` already navigated to `/login`). On a shared device, the `/login` guard sends the user back to their home page with no message, so they may walk away still signed in. This should be a backlog item: show an error when `POST /auth/logout` fails. It is not part of T-M2.12.
- **O-3 (50 messages cause 50 serial session reads):** Informational. Only a page on the same origin can post to the channel, and such a script already has full XSS power. The reads are serial and none of them logs anyone out. Merging repeated messages is optional.

**Note (no finding, and the behaviour existed before):** A 401 for a request that was already in flight when another tab signed in a must-change user sends tab 1 to `/login`. That is a real navigation, so its guard can log that new session out. The window is milliseconds, and the only impact is that the user signs in again.

## Focus areas checked
- **403 `FORBIDDEN_ROLE`** (`client.ts:67-71`, `guards.ts:105-113`):
  - Concurrent 403s share one session read (`roleCheck ??=`), and a test confirms three 403s cause one read.
  - It cannot loop: a second 403 sees an unchanged session and stops. The session read itself never returns 403 `FORBIDDEN_ROLE`, and client errors (4xx) are not retried.
  - No logout on this path.
  - The cache is dropped only when the user, role or sign-in changed.
  - The backend sends `FORBIDDEN_ROLE` from `AuthProblems.java:46`.
- **BroadcastChannel `englms-auth`:**
  - Messages carry only `{ type }`.
  - A received message must be a plain object with exactly one key and a known type, and the listener gets a fresh copy.
  - A tab does not receive its own messages, a received message never posts, and the channel is closed on unmount.
  - A spoofed message from the same origin can only cause a session read and a revalidation, never a logout.
  - Storage partitioning plus `frame-ancestors 'none'` keep third-party embeds off the channel.
- **The `/login` guard:**
  - `shouldRevalidate` returns false only when the URL is unchanged (N-2).
  - A tab on `/login` that learns of a session navigates to `/`, which leads to `/change-password` for a must-change session. So D-2 is closed, and the unit test plus the E2E must-change case confirm it.
- **RouteError:**
  - Retry only calls `window.location.reload()`. No URL is built, so a `//host` pathname cannot become an open redirect (N-1, tested). The start-page link is the constant `/`.
  - Nothing reloads on its own (tested), and there is no `vite:preloadError` handler, so Vite's default applies and a preload error is just shown as an error.
- **`?next=` / T18:** `redirect.ts` is unchanged, and the 401 path still uses `loginPath`.
- **Stale data after a user switch:** The S4-2 scenario (A logs out in tab 2, B signs in, tab 1) is closed by the `signed-out` and `signed-in` messages plus the 403 fallback, and the E2E AC6 test covers it. What remains is S4-1 and S4-2 above.
- **Personal data:** No `console` calls, and no personal data in messages, i18n strings or errors.

## Checklist (security.md §11)
- [x] `@Audience` + policy registry: not applicable (no backend changes).
- [x] Student handlers without `studentId`, owner-scoped 404s, audience DTOs: not applicable. No student DTO or mapper was touched.
- [x] Input limits, sanitiser, URL policy: no new inputs. The Retry URL is not built, and `?next=` is unchanged.
- [x] Files (purpose, resolver, download headers): not applicable.
- [x] Logs: no secrets or personal data. Channel messages carry no data.
- [x] Migrations: none.
- [x] New dependencies: none.
- [x] T19 row added to security.md and matches the code, apart from the back/forward cache gap (S4-2).

I did not run E2E, the gate or the backend `mvnw verify` (no backend changes; QA ran E2E), and I did not test back/forward cache behaviour in a real browser. S4-1 should be fixed before the student data pages arrive.

Relevant files:
- /home/kali/App_projects/eng-lms/web/src/app/guards.ts
- /home/kali/App_projects/eng-lms/web/src/features/auth/api/authChannel.ts
- /home/kali/App_projects/eng-lms/web/src/lib/api/client.ts
- /home/kali/App_projects/eng-lms/web/src/app/routes/RouteError.tsx
- /home/kali/App_projects/eng-lms/web/src/app/router.tsx
- /home/kali/App_projects/eng-lms/docs/04-backend/security.md
- /home/kali/App_projects/eng-lms/backend/src/main/java/com/englms/shared/web/SpaWebConfiguration.java
