# T-M2.13: Auth and shell feedback follow-ups

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready (held: starts after T-M2.27, T-M2.25 and T-M2.24 are merged, DEC-163) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.13-auth-shell-followups` (from `develop`) |
| Depends on | T-M2.12 (`b5596d3`), T-M2.20 (`f3a77fa`, the mutation-cache boundaries), T-M2.21 (`d890aae`): merged; T-M2.27, T-M2.25, T-M2.24 (DEC-163): not yet |
| Estimate | 1–1.5 agent-days |
| Risk tier | **M**: UI and behaviour, no SEC trigger. Scope 3 changes what the client does after a **failed** `POST /auth/logout` (it no longer pretends the user is signed out), but no endpoint, server code, cookie, CSRF rule, authz rule, DTO, storage or migration changes, and the failure path now keeps only what the server still holds (the live session); T-M2.12 SEC rated O-2 S4. Scope 2 adds a navigation `state` flag with no user data. G3 = **one combined fresh QA+UX reviewer** (qa-protocol §2a) that also checks scope 2 and 3 from the code and the unit tests |
| Trace | DEC-163 (AC8 moved to T-M2.27), DEC-118 (UX-3, UX-4, QA O-1, O-2 deferred here), DEC-119 (UX-6 deferred here), T-M2.12 reviews (`evidence/T-M2.12/review/ux.md` UX-3, UX-4, UX-6; `review/security.md` O-2; `qa/report.md` O-1, O-2); FR-AUTH-04; NFR-A11Y-01, NFR-A11Y-02; design-system §6 item 5 (no hover-only information), §3 (inventory); interaction-states §1 (Error (recoverable), Offline: never a silent failure or an endless busy state); frontend-architecture §2; security.md T19; ux-flows (Log out ≤ 2 steps); DEC-131 (tier M, UI rules); DEC-155 (this packet's decisions) |

## Goal
Close the four feedback gaps the T-M2.12 reviews deferred. On a touch phone, the compact workspace-name error says what failed. After a
sign-out in another tab, `/login` says why it is showing. Log out never spins without end and never fails silently, so on a shared device
nobody walks away thinking they signed out when they did not. The offline and couldn't-load pages stop repeating their heading in the
description. No new feature, no endpoint change.

## Scope
- In:
  1. **The compact meta error is readable on touch** (UX-3). In the narrow top bar (the `workspace-error` container under 22rem,
     `WorkspaceName.module.css`) the decorative icon `span` becomes a **button** that opens the message. It uses a new `ui/Toggletip`:
     a quiet icon button (≥ 44 × 44 px target, `--size-control-md`; the danger-coloured `CircleAlert` icon; required accessible name,
     here `meta.errorDetails`; `aria-haspopup="dialog"`, `aria-expanded`; it keeps the message as its `title` for mouse hover) that opens a
     small dialog-type popover. The popover holds the message text (`meta.error`), its accessible name comes from that text, and it uses
     the `ui/Popover` surface tokens and React Aria's `DialogTrigger` + `Popover` + `Dialog`. It behaves as `ui/Popover` does: focus moves in,
     Esc and an outside tap close it, focus returns to the trigger, and it is layered and inert-handled like `ui/Popover`. Retry stays right
     beside the trigger (≤ 8 px between the trigger's box and Retry, UX-9) and stays described by the message. The visually hidden message
     stays inside the `role="alert"`, so screen readers hear it as today. At ≥ 22rem nothing changes: the message is shown and the trigger is
     not rendered as a box (`display: none`, so it is not a Tab stop). The toggletip closes on a navigation and when its trigger stops
     rendering a box (the container widens, e.g. on rotation). A container query cannot be read with `matchMedia`, so `Toggletip` watches
     its trigger with a `ResizeObserver`: a 0 × 0 box while open closes it and moves focus **explicitly** to Retry. React Aria's own focus
     return would land on the now `display: none` trigger, and focus would be lost (G0 D-4). Both shells use it wherever the container rule
     applies (T-M2.12 UX saw it at tutor 320/360 and student 320/360/768).
  2. **`/login` explains a cross-tab sign-out** (UX-4). When a tab gets the `signed-out` channel message, `connectAuthProblems` must know the
     message type: the listener receives `{ type }` (today `resync` ignores it). The tab shows the notice when all of these hold: it had a
     signed-in session cached before the read, the read returns anonymous, and it is on a page that needs a session (`/tutor/**`,
     `/student/**`, `/change-password`). **The order matters** (G0 D-1). Today `resync` drops first, and `resetQueries` refetches every
     mounted query in parallel with the session read. On a data page (e.g. `/tutor/students`) such a refetch answers 401, and the
     `UNAUTHENTICATED` handler then navigates to `/login?next=` without the flag. So, for a `signed-out` message only, inside the existing
     serial queue:
     (i) capture `before` (the cached session) and read the session (`refreshSession`) **before** dropping anything;
     (ii) if the notice conditions hold: clear the query and mutation caches with **no reset** (so nothing refetches), set the session to
     `null`, and navigate to `loginPath(pathname + search)` (the same `?next=` the guard builds today) with
     `state: { signedOutElsewhere: true }` and no user data;
     (iii) otherwise run today's steps (`dropAllButSession`, then `followSession`).
     A 401 meanwhile (a request already in flight, or a mounted query that refetches after the clear while `/login`'s loader runs) does
     not navigate: the `UNAUTHENTICATED` handler stands down **from the start of a `signed-out` resync until its navigation has settled**,
     as it already does on `/login`. This is harmless, because the resync itself navigates when the session is anonymous (G0 N-1). The `signed-in` message and `pageshow` keep today's order. The
     kept `sessionSync.test.tsx` "signed-out: the tab goes to /login?next=, with only the anonymous session cached (AC5)" still holds with
     this sequence (the cache holds only `SESSION_KEY` → `null`).
     `/login` always passes the unsaved-changes guard (`ui/blocksNavigation.ts`), as today. `/login` shows an `InlineAlert` (tone `info`,
     `role="status"`) with the title `login.signedOutElsewhere` between the `PageHeader` and the form, while the location state carries the
     flag. It is rendered at mount, so screen readers read it in order after the `h1` (where the route focus lands) rather than announce it
     as a live update. That is the intended result (G0 D-8), and the reviewer confirms it in the screen-reader walk. It hides when a sign-in
     submit starts. These show no notice: a `signed-in` message, a back/forward-cache restore (`pageshow`: the cause is unknown, it may be
     this tab's own logout), a 401, this tab's own logout, a tab already on `/login`, a direct visit to `/login`, and a read that still
     returns a session. Every other case keeps today's path (revalidate and the guards).
  3. **Log out gives feedback when it fails** (QA O-1, O-2; SEC O-2). `useLogout`:
     (a) the mutation runs with `networkMode: 'always'`, so offline it is sent and fails at once with a network error instead of
     pausing. Today it pauses and the button spins with no end (O-1).
     (b) **On success** (204), the same steps as today: clear the query and mutation caches, post `signed-out`, navigate to `/login`.
     (c) **On failure** (any thrown error: a network error, a 5xx, a 4xx), nothing is cleared, nothing is posted and nothing navigates. The
     user is still signed in on the server, so the page, the caches and the open account overlay stay. The hook exposes the error. This
     supersedes the "also when the call fails" clause of T-M2.4, T-M2.12 and DEC-144 (2) for the failure path only (DEC-155). This is
     about `useLogout`'s own handlers. The API client's global auth-problem reactions (`lib/api` `onAuthProblem`: a 401, or a 403
     `FORBIDDEN_ROLE` / `PASSWORD_CHANGE_REQUIRED`) still apply to the logout call as to any call (G0 D-6). That is unlikely, since FR-AUTH-04
     answers 204 also for an absent session.
     (d) Both places that call `useLogout` show the failure: the `AccountSection` (popover, tutor drawer footer, student More sheet), below
     its actions, and the forced change-password page's Log out (`ChangePasswordPage`), below its form actions. Each shows an
     `InlineAlert` (tone `danger`, so `role="alert"`) with the title `logout.failedTitle` and the text `logout.offline` when `isOffline()`
     (`app/routes/chunkError.ts`) at the moment of failure, else `logout.failed`. Log out stays where it is and is the retry, so there is no
     second button. The alert goes away when Log out is pressed again or the section unmounts (the overlay closes). The two callers use the
     `shell` and `auth` namespaces and i18next has no fallback namespace, so both render **one shared component**,
     `features/auth/components/LogoutFailedAlert.tsx`, which reads the `common` keys (`useTranslation('common')`; G0 D-2).
  4. **The chunk pages stop repeating their `h1`** (UX-6, DEC-119). `error.offlineDescription` and `error.chunkDescription` lose their first
     sentence: vi "Trang này cần kết nối mạng để tải." and "Hãy kiểm tra kết nối mạng rồi thử lại.", en "This page needs a connection to
     load." and "Check your connection and try again.". The offline Retry announcement (`RouteError`'s `output`) still says the user is
     offline: it uses a new key `error.offlineAnnouncement` holding today's full text (vi "Bạn đang ngoại tuyến. Trang này cần kết nối mạng
     để tải.", en "You're offline. This page needs a connection to load."). The titles do not change.

## Out of scope (explicit)
- Any other S3/S4 finding, new feature or copy beyond the keys listed in UI rules. (The Guardians AC4 polling read, AC8 by DEC-159,
  moved to T-M2.27 by DEC-163.)
- The `/login` loader's own must-change logout when its call fails (`guards.ts` `login`: there is no finding, and it never held tutor data).
- A request timeout for a logout that hangs without an answer (the fetch has no timeout today; no finding).
- The global offline banner for autosave areas (interaction-states §1, M5); O-3 (accepted, DEC-118).
- T-M2.7's S4 (DEC-148 QA-2); T-M2.10, T-M2.16; PR #100 (held by the PO, DEC-139); no package bump.

## Guardrail answers (scope.md §6)
1. **Trace:** the T-M2.12 review findings deferred by DEC-118 and DEC-119 (backlog row T-M2.13). 2. **Drift toward excluded scope?** No:
feedback on shipped screens (sign-in, sign-out, shell header, error pages). 3. **Mandatory setup added?** None. 4. **Weekly use?** Yes:
sign-in and sign-out run every session; the error and offline states protect them. 5. **Hard-coded semantics?** None: no curriculum or exam
text; `ForbiddenIdentifiersTest` and the web grep stay green.

## Design notes
- **Files**: `ui/Toggletip.tsx` (+ `.module.css`, test, `ui/index.ts` export, a `/dev/ui` sample with vi/en dev strings);
  `app/components/WorkspaceName.tsx` and `.module.css`; `features/auth/api/authChannel.ts` (unchanged API: the listener already gets the
  message), `app/guards.ts` (`connectAuthProblems`: `resync` takes the message type; `followSession` takes the notice decision);
  `app/routes/LoginPage.tsx`; `features/auth/api/session.ts` (`useLogout`); `app/shells/ShellParts.tsx` (`AccountSection`);
  `app/routes/ChangePasswordPage.tsx`; `features/auth/components/LogoutFailedAlert.tsx` (shared, D-2); `app/routes/RouteError.tsx`; `lib/i18n/locales/{vi,en}/{common,auth}.json`; tests next to each;
  `e2e/tests/{navigation,shells,auth}.spec.ts` as needed.
- **Why a toggletip and not a visible label** (UX-3 offered both): at 320–360 px the identity container holds "Eng-LMS" and leaves less
  than 22rem. A short visible label next to Retry would truncate there and say less than the message. A tap target shows the full text
  and keeps the bar's layout. `ui/Popover` cannot be reused because its trigger is the fixed-width labelled account button. The new
  primitive is small: it uses React Aria parts with no `UNSTABLE_` API.
- **Why the failure path keeps state** (scope 3): the server session is still alive after a failed call. Clearing the client state and
  going to `/login` does not end it: the `/login` loader reads the session again and sends the user home with no message (the O-2 shared
  device risk). Saying "you're still signed in" is the honest state, and nothing stays visible that the user could not see before the
  press.
- **Contradiction scan (lessons L-03)**: these are the **changed kept assertions** (DEC-155), and no other kept assertion changes:
  (a) `app/guards.test.tsx` "still goes to /login when the logout call fails" becomes: a failing call stays on the page, the account
  section shows the `logout.failed` alert, the path is unchanged and the session stays cached.
  (b) `app/sessionSync.test.tsx` "a logout that %s posts exactly { type: "signed-out" }": the `succeeded` row is kept and the `failed`
  row becomes "a failed logout posts nothing".
  (c) `app/sessionBoundaries.test.tsx` "sign-out, the call %s: the earlier write is gone": the `answered 204` row is kept. The `failing`
  row becomes "a failing call keeps the session's caches" (the seeded write is still there, no navigation), because the session is
  still alive (scope 3 (c)).
  (d) `app/routes/RouteError.test.tsx` (≈ lines 188–196) and `e2e/tests/navigation.spec.ts` (`COPY`, ≈ lines 31–50): the `offline` and
  `chunk` description strings become the second sentence only. Every assertion on the offline Retry announcement expects the
  `error.offlineAnnouncement` text, which is today's full sentence, so it reads as before.
  (e) `app/shells/shells.test.tsx` AC11 (c) (≈ line 522: the icon's wrapper `span` has the message as `title`) and
  `navigation.spec.ts` AC8 (≈ line 430: `span[title]` with an `svg`, the gap to Retry ≤ 8 px) find the trigger button by its name
  (`meta.errorDetails`) instead. Its `title` and the ≤ 8 px gap are still asserted, and the decorative `svg` stays `aria-hidden`.
  Kept and unchanged: the AC5 cross-tab E2E (`navigation.spec.ts` "log out in tab B: tab A … goes to /login?next=%2Ftutor%2Ftoday",
  including its Back step), the `steps-logout-*` step budget (`shells.spec.ts`), and the `sessionSync` cases for unknown messages,
  no ping-pong, `/login` unchanged, and `pageshow`. Docs that change: FR-AUTH-04's AC gains the failure rule; frontend-architecture §2
  (lines ≈ 70 and 74) drops "also when the call fails" for sign-out; security.md T19 drops "(also a failed call)" and gains the failed-logout rule; design-system §3 gains
  `Toggletip` (Feedback row, with a bullet); interaction-states §1's "Implemented" note gains the logout failure. `ui/blocksNavigation.ts`
  already lets `/login` through, so there is no conflict.
- **Shortcut ledger** (lessons L-12; `grep -rnE '(shortcut|ponytail):'` on 2026-11-11 found 8 markers): none fires. `ui/Toast.tsx`,
  `ui/toastQueue.ts`, `ui/Button.tsx` and `lib/time` are not touched (the logout `Button`'s `isPending` announcer is used as it is), no
  package is bumped, and `ui/Sheet.module.css` is not touched.

## UI rules (fixed at G0, DEC-131 (2))
- **Columns and breaks**: no tables. The new texts are human language and wrap at spaces only: the logout alert in the 18rem popover, in
  the drawer footer and in the More sheet at 360; the `/login` notice; the toggletip message (popover at most `--size-popover` wide, and
  never wider than the viewport minus the 16 px gutters). `expectNoMidWordBreak` runs on each at 360 in vi. Nothing scrolls the page
  sideways.
- **Focus targets**: after a failed Log out, focus stays on Log out (it is pending, then enabled again; `expectFocusNotLost`). When the
  toggletip opens, focus goes into its dialog; Esc or an outside tap returns it to the trigger; a frame change closes it and focus goes to
  Retry. After the cross-tab navigation, the route focus lands on `/login`'s `h1`, as for every navigation. The `/login` notice never
  takes focus. A success Log out goes to `/login` as today.
- **Layering**: the toggletip layers like `ui/Popover` (above the top bar; a modal popover, so the rest of the page is outside its focus
  scope). The logout alert renders inside the open overlay, never as a toast (errors are never toasts, interaction-states §4).
- **Validation per field**: none (no form changes).
- **Copy** (new keys; vi verbs: "Xem", and the existing "Đăng xuất" and "Thử lại"): `common` `meta.errorDetails` vi "Xem lỗi", en "Show
  the error"; `auth` `login.signedOutElsewhere` vi "Bạn đã đăng xuất ở một thẻ khác.", en "You were signed out in another tab." (it also covers the `/login` guard's must-change logout, where the user did nothing; G0 D-7); `common`
  `logout.failedTitle` vi "Chưa đăng xuất được", en "Couldn't log out"; `logout.failed` vi "Bạn vẫn đang đăng nhập. Hãy thử lại.", en
  "You're still signed in. Try again."; `logout.offline` vi "Bạn đang ngoại tuyến và vẫn đang đăng nhập. Hãy đăng xuất lại khi có mạng.",
  en "You're offline and still signed in. Log out again when you're back online."; `common` `error.offlineAnnouncement` (scope 4). The
  changed `error.offlineDescription` and `error.chunkDescription` are listed in scope 4.

## Domain rules
- Not applicable: there is no write path or server rule change. The logout endpoint keeps answering 204 also for an expired or absent
  session (FR-AUTH-04). Scope 3 only changes what the client does when the call **fails**.

## Acceptance criteria
- AC1 (scope 1, UX-3): below the 22rem container rule, at 360 (tutor and student) and at 768 (student), after a `/meta` 500, tapping the
  icon trigger (≥ 44 × 44 px) opens a popover showing "Không tải được tên không gian dạy học" (vi) or "Couldn't load the workspace name"
  (en), with the page free of horizontal scroll. Esc and an outside tap close it, and focus returns to the trigger. A frame change
  (widening past the rule) closes it, with focus on Retry. Retry stays ≤ 8 px beside the trigger and is described by the message. At
  ≥ 22rem the message shows and the trigger is not a Tab stop. Tested by `ui/Toggletip` unit tests (open, close, focus return, name), the
  changed kept tests (e), and an E2E at phone-small (tutor, student) and tablet (student) using `tap` on the touch projects, with
  `expectSettledAccessible` while open.
- AC2 (scope 2, UX-4): log out in tab B; tab A on `/tutor/today` lands on `/login?next=%2Ftutor%2Ftoday`, as the kept AC5 test expects,
  and shows "Bạn đã đăng xuất ở một thẻ khác." as a status above the form. The same holds from `/tutor/students` (a page with an
  authenticated query that answers 401 while the follow runs): tab A lands on `/login?next=%2Ftutor%2Fstudents` **with** the notice, and
  navigates once (G0 D-1). Starting a sign-in hides it. No notice for a direct
  `/login` visit, a 401, this tab's own logout, a `signed-in` message, a `pageshow` restore, or a read that still returns a session.
  Tested by unit tests per case in `sessionSync.test.tsx` (including a mounted query that answers 401, like its `Probe`) and `LoginPage`
  tests, by the kept AC5 E2E extended with the notice assertion, in vi and en, and by an E2E from `/tutor/students` at laptop in vi.
- AC3 (scope 3, O-1): offline (`context.setOffline(true)`), Log out stops being busy within 1 s and shows "Chưa đăng xuất được" with the
  offline text inside the open account section. The user is still on the same page and signed in, the cache is kept, and nothing is
  posted on the channel. Back online, Log out signs out as today. Tested by a unit test (offline: the mutation is not paused, and the
  offline copy shows) and by an E2E on a fresh tutor sign-in (the stored sessions are never logged out, T-M2.4 scope 10) at phone-small
  (the tutor's drawer footer) and laptop (the account popover). The student's More sheet renders the same `AccountSection`, and it is
  covered by a component test (G0 D-3).
- AC4 (scope 3, O-2): a logout answered with a 500 (and, in unit tests, with a network error while online) shows the `logout.failed`
  alert, keeps the page, the caches and the session, posts nothing and navigates nowhere. Focus stays on Log out
  (`expectFocusNotLost`). Pressing Log out again with a 204 answer clears the alert and signs out as today. The forced change-password
  page's Log out shows the same alert on failure. Tested by unit tests (the changed kept tests (a)–(c), plus `ChangePasswordPage`) and by
  an E2E with `page.route` returning 500 at laptop in vi.
- AC5 (scope 4, UX-6): the offline and couldn't-load pages show their unchanged `h1` and the one-sentence descriptions of scope 4 (vi and
  en). An offline Retry announces `error.offlineAnnouncement` (today's full sentence). Tested by the changed kept tests (d) and the kept
  E2E specs in `navigation.spec.ts` "[vi/en] offline: the offline page with Retry …" and "[vi/en] online, the chunk request fails: the
  couldn't-load page …" (T-M2.12's AC2/AC3) with the new copy (G0 D-9).
- AC6 (all): the step budgets hold (Log out ≤ 2 steps, `steps-logout-*`; sign-in unchanged). axe runs clean after each new state:
  toggletip open, logout alert, `/login` notice (`expectSettledAccessible`). `expectNoMidWordBreak` runs on each new text at 360 in vi.
  Every new string exists in vi and en.
- AC7: `./scripts/gate.sh` green once on the final head and CI green (DEC-131 (6)). All existing unit and E2E assertions are kept except
  the changed kept assertions (a)–(e) of the contradiction scan. The bundle budget is green, `api/openapi.json` and `backend/` are
  unchanged, and `ForbiddenIdentifiersTest` is green with no exam or curriculum name in `web/src`.
- AC8: moved to T-M2.27 (DEC-163: the PO wants the known unstable E2E tests fixed before T-M2.13 starts).

## Test plan
- Implementation: unit (`Toggletip`; `useLogout` success and failure, offline not paused; `connectAuthProblems` notice decision per case;
  `LoginPage` notice shown and hidden; `RouteError` copy and announcement), component tests with MSW (`AccountSection` failure in each
  overlay, `ChangePasswordPage` failure), E2E (AC1 to AC5 as listed; `tap` on the touch projects). The gate runs the changed specs ×3.
  The changed focus specs (the toggletip and the failed logout) run ×20 by QA (DEC-131 (7)).
- **When a new check finds a real defect** outside this packet's allowed change (lessons L-10): the implementer reports it at once as an
  OQ to the LC, `test.fail` only until the LC rules (an AC + a DEC), and the LC rules before G3.
- Independent QA focus (combined QA+UX, qa-protocol §2a): the compact error on a touch phone (tap, Esc, outside tap, rotation) in both
  shells; the toggletip with a screen-reader heading/landmark walk (no double announcement beyond today's alert). For the cross-tab
  notice: a two-tab sign-out from each page that needs a session (tutor, student, forced change-password), including data pages
  whose queries answer 401 during the follow (`/tutor/students`, a student workspace: one navigation, notice shown), and every no-notice case.
  For logout: offline, 500, a slow answer (pending state, then the result), and then a real sign-out. On a shared device after a failed
  logout, the page must say "still signed in" and never land on `/login` while the session is alive. Then the chunk-page copy in vi and
  en and the offline Retry announcement. Exploratory charter: find a path where Log out spins without end, fails silently, or shows the
  cross-tab notice when the tab was not signed out by another tab.
- **Isolation**: no endpoint change; the backend harness stays green.

## Evidence required
- `evidence/T-M2.13/summary.md`, recorded by the LC from the implementer's returned text (L-07): AC → proof, the `frontend-standards`
  self-check list ticked, and the **G3 cost** table. Plus one gate log on the final head and green CI, and local screenshots (not
  committed) at 360×740, 768×1024 and 1280×800 of the open toggletip (vi, en), the `/login` notice, the logout failure alert (offline and
  500) in each overlay, and the offline page. G3: the combined `review/ux.md` (+ QA verdict), recorded by the LC on a docs branch; the QA
  report via `qa/T-M2.13` (reviewer evidence never on the feature branch).

## Docs to update
- FR-AUTH-04 AC (functional-requirements.md: a failed logout keeps the page and says the user is still signed in), frontend-architecture §2
  (sign-out on failure; the channel message type reaches the receiver), security.md T19 (drop "(also a failed call)" from its T-M2.20
  sentence and add the failed-logout rule; G0 D-5), design-system §3 (`Toggletip`), interaction-states §1 "Implemented" note (logout
  failure and offline), ux-flows Log out (a failed call keeps the page and says so), backlog (T-M2.13 done note), `progress.json` (LC).

## Risks & assumptions
- **Size**: 7 ACs, about 1–1.5 agent-days. **Split line**: if `ui/Toggletip` grows (for example positioning problems at 320 px), scope 1
  can move to its own packet and leave scopes 2–4 here. The LC decides at G1, with a DEC.
- `location.state` survives a reload of that history entry, so a reload of `/login` right after a cross-tab sign-out shows the notice
  again. That is accepted: it is still true, and it goes away with the first sign-in submit or any navigation.
- A logout whose answer is lost after the server ended the session shows "still signed in" although the session is gone. The next Log out
  answers 204 (FR-AUTH-04) and signs out as usual. This is accepted and rare.
- React Aria's modal `Popover` hides the rest of the page from assistive technology while open, as `ui/Popover` does today. The toggletip
  holds only text, so this is acceptable; the reviewer confirms it with a screen-reader walk.
- E2E signs in as `e2e-tutor` (`.data/e2e/`). The logout cases use a fresh sign-in. The dev database keeps test data (never purge it
  without asking the PO).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
# On this device agent shells run with NoNewPrivs: Podman goes through the user socket (progress.json environment; G0 D-10)
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.13 ./scripts/gate.sh
git checkout -- evidence/T-M2.13   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.13-auth-shell-followups
```
