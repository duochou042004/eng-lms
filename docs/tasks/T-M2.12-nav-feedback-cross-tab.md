# T-M2.12: Navigation feedback and cross-tab session

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`b5596d3`, DEC-119) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.12-nav-feedback-cross-tab` (from `develop`) |
| Depends on | T-M2.11 merged (`1af32de`, DEC-115) |
| Estimate | 1.5 agent-days |
| Trace | NFR-PERF-03 (lazy shell chunks), NFR-A11Y-01, NFR-A11Y-02, NFR-SEC-04 (server-side sessions), NFR-COMPAT-01 / A-014 (browsers); interaction-states §1 (Loading, Offline rows) and §3 (feedback timing: nothing below 150 ms); frontend-architecture §2 (API client, session bootstrap), §3 (routing); security.md T11 (role), new T19 (stale session in another tab); DEC-073 (T-M1.9 QA F4), DEC-087 (M1 G5 QA F-3), DEC-111 (T-M2.4 SEC S4-2), DEC-112 (this split; SEC triggered), DEC-115 (T-M2.11 UX-9), DEC-116 (packet decisions) |

## Goal
A client-side navigation that takes longer than 150 ms shows that it is working; a page whose code cannot load (offline, or a failed chunk
download) says so and offers Retry instead of hanging. A tab never keeps showing a previous user's session: a 403 `FORBIDDEN_ROLE` makes it
read the session again, and a sign-in or sign-out in one tab makes every other tab of the same browser drop its cached data and re-run its route
guards. The narrow shell top bar's compact workspace-name error keeps Retry beside its icon (UX-9).

## Scope
- In:
  1. **Navigation feedback** (DEC-073, interaction-states §1, §3): while the router is navigating (`useNavigation().state !== 'idle'`: lazy
     chunks and loaders), after 150 ms a thin indeterminate **progress line** shows at the top edge of the viewport (a new `ui/` component,
     `ProgressLine`: tokens only; reduced motion → a static line, no animation) and the current page stays visible and usable (no skeleton swap,
     no layout shift). It has an accessible status: one polite `role="status"` region in `RootLayout` says "Loading the page" / "Đang tải trang"
     (`app.loading`, existing key) while it shows, and is empty otherwise. Nothing shows for a navigation that settles within 150 ms. Focus
     stays where it is until the new page renders; then route focus moves as today (frontend-architecture §3).
  2. **Chunk load failure** (DEC-087 F-3): when a route's `lazy()` import fails (any engine's dynamic-import error, or any route error while
     `navigator.onLine` is `false`), `RouteError` shows specific copy instead of the generic error: offline → "You're offline. This page needs a
     connection to load." / Vietnamese equivalent; online → "This page couldn't load. Check your connection and try again." / Vietnamese
     equivalent; with a **Retry** button and the existing link back to the start page. Retry while `navigator.onLine` is `false` keeps the
     page and announces the offline message again (no request); otherwise it does a **full load of the failed URL**
     (`window.location.reload()`: after a failed client navigation the address bar already shows that URL; no URL is built, so Retry can
     never leave the origin, DOCS-REVIEW N-1), because React Router caches a rejected `lazy()` per route for the router's life and a browser may keep a
     failed dynamic `import()` in its module map (DOCS-REVIEW D-1, DEC-116 (2)); the full load re-reads the session from the cookie and keeps the
     language (stored locally), and it also picks up a new deployment's chunk names. No request ID line (there is none). Nothing reloads
     automatically (`vite:preloadError` and the `online` event never trigger a reload). The generic error page keeps its Reload button.
  3. **403 `FORBIDDEN_ROLE`** (T-M2.4 SEC S4-2): `lib/api/client.ts` reports a 403 `FORBIDDEN_ROLE` to the existing auth-problem listener as a
     third `AuthProblem`; `connectAuthProblems` reads the session again (`refreshSession`). If the user or role changed (`userId`, `role`,
     or anonymous now), it clears every cached query except the new session and revalidates the router, so the guards redirect (anonymous →
     `/login?next=`, wrong role → `/forbidden`, must change → `/change-password`). If nothing changed, nothing else happens (the caller still
     gets its `ApiError`). Concurrent 403s cause one session read, not one per request.
  4. **Cross-tab sign-in/out** (T-M2.4 SEC S4-2): one module (`features/auth/api/authChannel.ts`) wraps a `BroadcastChannel` named
     `englms-auth`. After a successful sign-in (`useLogin`), after a logout settles (`useLogout`, also when the call failed) and after the
     `/login` guard logs out a must-change session (`guard.login` gains this post; its redirect rules do not change), the tab posts `{ type: 'signed-in' }` or `{ type: 'signed-out' }`: **no user ID, name,
     role or any other data**. Every other tab that receives a message clears every cached query, reads the session again and revalidates its
     router (guards re-run, as in item 3). Messages of any other shape are ignored. Where `BroadcastChannel` does not exist, the module does
     nothing (no fallback; every browser of A-014 / NFR-COMPAT-01 has it). The channel is closed when the app unmounts.
     **Revalidation never logs out** (DOCS-REVIEW D-2): the must-change logout of the `/login` guard runs only when the visitor navigates to
     `/login`, never on a revalidation caused by a message or a 403. The `/login` route opts out of revalidation while its URL is unchanged
     (`shouldRevalidate` returns `false` when `currentUrl.href === nextUrl.href`, so moving between `/login` URLs still runs the guard,
     DOCS-REVIEW N-2), and a tab on `/login` that learns of a signed-in session (message or 403 reaction) navigates to `/` with `replace`, whose guard
     picks the role home or `/change-password`. So a tab left on `/login` never ends a session that another tab just created.
  5. **UX-9** (DEC-115): inside `@container workspace-error (width < 22rem)` the compact meta error's Retry sits next to the icon (the
     `margin-inline-start: auto` push is reset), and the icon's wrapper carries the message as `title` (`meta.error`); the message stays the
     visually hidden alert text linked to Retry (AC11 (c) of T-M2.11 unchanged).
  6. **Strings** vi + en for items 1–2 (`error.offline*`, `error.chunk*`, `error.retry` or equivalent keys); no other copy changes.
  7. **E2E** (`e2e/`): a new `navigation.spec.ts` for AC1–AC6 (delayed or aborted chunk requests via `page.route`, `context.setOffline`, two
     pages in one browser context for the broadcast); existing specs keep every assertion.

## Out of scope (explicit)
- A global offline banner and save queue (interaction-states §1 "Offline" for autosave areas; with the first autosave area, M5).
- Loading feedback inside pages (skeletons per page arrive with their pages, T-M2.5 on).
- Broadcasting a password change, a language change or any other state; detecting a session ended on another device (the next API call's
  401 already handles it); a service worker or offline caching of chunks.
- Any backend or endpoint change; the redirect rules of the guards themselves (`isSafeAppPath`, `safeNext`, guard order) stay as they are
  (only `guard.login` posts `signed-out` after its must-change logout, scope 4).
- The `qa/` specs (QA-owned; their M2 update is T-M2.7, DEC-111).

## Guardrail answers (scope.md §6)
1. **Trace:** DEC-073, DEC-087, DEC-111, DEC-112, DEC-115; interaction-states §1/§3; security.md. 2. **Drift toward excluded scope?** No: no
offline mode, no sync, no notifications; only feedback and session hygiene. 3. **Mandatory setup added?** None. 4. **Weekly use?** Every
navigation; every shared-device sign-in. 5. **Hard-coded semantics?** None.

## Design notes
- `RootLayout` already stays mounted across navigations: it renders `ProgressLine` and the status region from `useNavigation()`; the 150 ms delay
  reuses the timing helper behind `DelayedSkeleton` if it can be shared, else a small hook next to it in `ui/`.
- The pathless child route already has `RouteError` as its boundary, so a failed lazy import renders inside `RootLayout` (route focus moves to
  its `h1`). React Router 8.4 keeps each route's `lazy()` promise in a module-level `WeakMap`, rejections included, so an in-app retry
  (`navigate`, `revalidate`) would get the same rejection: Retry is a full load of the failed URL when online (scope 2). A unit test proves
  the offline branch makes no request and the online branch calls `location.reload()` and never `assign`/`href` (a pathname such as
  `//evil.example/x` would otherwise be read as another origin, N-1).
- `AuthProblem` gains `'FORBIDDEN_ROLE'`; the listener contract stays one listener. A single in-flight promise dedupes the session read.
  `router.revalidate()` re-runs the shell's parent guard (frontend-architecture §3); the guards' redirect rules do not change (only
  `guard.login` posts `signed-out`, and the `/login` route opts out of revalidation, scope 4).
- Cache clearing on another tab's message: `queryClient.removeQueries()` for every key but `SESSION_KEY`, then `refreshSession`, then
  `router.revalidate()`; on `/login` with a signed-in session, `router.navigate('/', { replace: true })` instead (scope 4). `?next=` is
  not honoured there (only the tab that signed in uses it).
- The channel carries only a type, so a page from the same origin learns nothing it could not learn from `GET /auth/session` (same-origin
  only: `BroadcastChannel` does not cross origins). SEC checks this and the absence of a reload loop.

## Acceptance criteria
- AC1 (DEC-073): a client-side navigation whose lazy chunk is delayed 1.5 s shows the progress line and the polite "Loading the page" status
  after ≥ 150 ms, the previous page stays visible, and both disappear when the page renders (route focus then on its `h1`); a navigation that
  settles within 150 ms never shows them; reduced motion shows a static line (E2E + component test with fake timers).
- AC2 (DEC-087 F-3): offline, a navigation to a never-loaded shell chunk (e.g. a student on a public page → `/student/home` with the chunk
  uncached, as in the M1 G5 repro) shows the offline copy, Retry and the start-page link within the navigation (no endless busy state);
  online with the chunk request aborted shows the "couldn't load" copy (E2E: `context.setOffline`, `page.route` abort).
- AC3: Retry while still offline keeps the page and sends no request; after `setOffline(false)` Retry loads the failed URL in full and shows
  the target page with the language choice kept (E2E + unit test of both branches).
- AC4 (S4-2): with a cached tutor session, a 403 `FORBIDDEN_ROLE` from an API call reads the session once; if the server now says student or
  anonymous, the tab lands on `/forbidden` or `/login?next=<path>` and cached queries other than the session are gone; if the session is
  unchanged, no navigation happens; three concurrent 403s cause one session read (unit tests on `client.ts` and `connectAuthProblems` with MSW).
- AC5 (S4-2): two pages in one browser context, both on `/tutor/today`: Log out in page B → page A goes to `/login?next=%2Ftutor%2Ftoday`
  without user action, and its query cache holds only the anonymous session (E2E + unit test of the receiver).
- AC6 (S4-2): page A on `/login`, page B signs in as the tutor → page A goes to the tutor home; page A on `/tutor/today`, page B logs out and
  signs in as a student → page A ends on `/forbidden` or `/student/home` and never shows tutor data after the student's sign-in; page A on
  `/login`, page B signs in as a user who must change the password → page A goes to `/change-password` and page B's session stays valid
  (B can complete the change) (E2E; the students are created by the spec through the API as existing specs do).
- AC7 (security): messages carry only `{ type }` (unit test asserts the exact posted objects); an unknown or malformed message is ignored; a
  received message never triggers a post (no ping-pong between tabs); a revalidation never calls `logout()`; the only full-page load in the new
  code is the chunk-error Retry of scope 2 (code search over the new and changed files + tests).
- AC8 (UX-9, DEC-115): in a narrow shell top bar (tutor 360×740, student 360×740 and 768×1024) with `GET /api/v1/meta` failing, Retry's
  start edge is within 8 px of the icon's end edge, the icon has `title` = the `meta.error` text, and T-M2.11 AC11 (c) still holds
  (component test + E2E bounding boxes).
- AC9 (NFR-A11Y-01, 02): axe has no serious or critical issues on the chunk-error page and with the progress line showing, at 360×740,
  768×1024 and 1280×800 in vi and en; the progress line is not focusable and is hidden from the accessibility tree (the status region speaks
  for it); `ProgressLine` has a `/dev/ui` entry, tests and an axe check.
- AC10: `./scripts/gate.sh` green twice in a row on the same dev database; all existing E2E and unit assertions kept; bundle budget green.

- AC11 (G3 round 1, DEC-118; cheap fixes in reused pieces made in this task, DEC-088): (a) QA F-1: the chunk-error copy follows the
  connection while the page is shown (an `online`/`offline` listener: offline copy while offline, couldn't-load copy once online), Retry
  unchanged; (b) UX-1: the offline and couldn't-load pages have their own `h1` and document title ("You're offline" / "Bạn đang ngoại
  tuyến", "This page couldn't load" / "Không tải được trang này" or equivalent), the generic error keeps its title; (c) UX-2: Retry and the
  generic Reload use the primary button style, the start-page link stays the quiet link; (d) UX-5: the progress line's animation duration is a
  motion token in `tokens.css`; (e) SEC S4-1: a user or role change clears the other queries with `resetQueries` (observers are notified and
  refetch) instead of `removeQueries`, with a unit test of a student-to-student switch while a page using a query stays mounted; (f) SEC
  S4-2: a page restored from the back/forward cache (`pageshow` with `persisted`) runs the same steps as a received channel message (drop the
  cache, read the session, follow it), with a unit test; T19 in security.md says so. Tests for each; existing assertions change only where
  (b) or (c) changes a title or a button style.

## Test plan
- Implementation: component tests (`ProgressLine`, `RootLayout` delay with fake timers, `RouteError` chunk/offline variants and Retry), unit
  tests (`client.ts` `FORBIDDEN_ROLE` reporting; `connectAuthProblems` refetch, dedupe, changed vs unchanged session; `authChannel` post and
  receive with a `BroadcastChannel` stub), E2E `navigation.spec.ts` (AC1–AC6, AC8 at phone-small, tablet, laptop), axe.
- Independent QA focus: throttled and offline navigations between every shell route and the public pages for both roles; Retry repeatedly,
  online/offline flapping; two and three tabs with logout, sign-in, user switch (tutor ↔ student) and a forced password change; browser Back
  after a cross-tab sign-out (must not show cached tutor content); a tab left on `/login` while another signs in a must-change user; a tab in the background during the broadcast; reduced motion; vi/en.
  Exploratory charter: find a sequence of tabs and network states in which a tab shows a previous user's data or loops.
- SEC: **triggered** (DEC-112): session handling, the API client's auth-problem reactions and a cross-tab channel. UX: **triggered** (new
  feedback states and the UX-9 layout).

## Evidence required
- `evidence/T-M2.12/summary.md`, gate logs (both runs), screenshots (360×740, 768×1024, 1280×800) under `evidence/T-M2.12/impl/`: progress
  line during a slow navigation, the offline and the couldn't-load chunk pages (vi and en), the narrow top-bar meta error (UX-9) for tutor and
  student, `/dev/ui` `ProgressLine`; axe results. QA report via `qa/T-M2.12`; the UX and SEC verdicts as PR records (reviewer evidence never
  on the feature branch).

## Docs to update
- `frontend-architecture.md` §2 (`FORBIDDEN_ROLE` reaction; the auth channel; the session is no longer changed only by this tab), §3
  (navigation progress line; chunk-load errors and Retry; `/login` does not revalidate) and §6 (the chunk and offline error variants show no
  request ID), `security.md` (threat T19: stale session in another tab on a shared device →
  `FORBIDDEN_ROLE` refetch + `BroadcastChannel`, data-free messages), `design-system.md` §3 (`ProgressLine`), `interaction-states.md` §1
  (implemented note for navigation loading and the chunk-offline page), backlog (T-M2.12 done note), `progress.json`.

## Risks & assumptions
- **Split line:** if AC1–AC7 are not green by about 1.5 agent-days, the `/dev/ui` polish of `ProgressLine` beyond its basic states moves to a
  follow-up recorded by a DEC; the session items (AC4–AC7) never move.
- React Router memoises a rejected `lazy()` (DOCS-REVIEW D-1): Retry is a full load when online. Engine differences in the dynamic-import error are covered by also
  treating any route error while offline as the offline case; QA runs Chromium (Firefox/WebKit when this device has their host libraries).
- Two-tab E2E shares one browser context (one cookie jar), as real tabs do; it signs in as `e2e-tutor` (`.data/e2e/`) and creates its own
  student through the API.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.12 ./scripts/gate.sh && ENGLMS_TASK=T-M2.12 ./scripts/gate.sh
git checkout -- evidence/T-M2.12   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.12-nav-feedback-cross-tab
```
