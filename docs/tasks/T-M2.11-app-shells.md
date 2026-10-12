# T-M2.11: App shells (tutor sidebar/drawer, student tabs, account menu, workspace identity, nested 404s)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | in_progress (DEC-113) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.11-app-shells` (from `develop`) |
| Depends on | T-M2.4 merged (`9fcc992`, DEC-111) |
| Estimate | 2 agent-days (split line in Risks) |
| Trace | SPEC §41 (adjustable navigation), §4.3; FR-AUTH-04, FR-AUTH-05 (reach from the account menu); NFR-RESP-01..03, NFR-A11Y-01, NFR-A11Y-02, NFR-PERF-03; information-architecture §1, §3, §4, §5; responsive-standards §1, §3 (items 5, 6); design-system §3 (`AppShell`, `Sheet`, `NavList`, `BottomTabs`); DEC-087 (M1 G5 QA F-4 nested 404s), DEC-073 (T-M1.9 UX F-5 `meta.error` copy), DEC-109 (split from T-M2.4), DEC-111 (carried UX notes), DEC-112 (this split; SEC decision); `evidence/T-M2.4/review/ux.md` "Carried over to T-M2.11" |

## Goal
A signed-in tutor and student get their real application frame. The tutor has a persistent sidebar on a laptop and a top bar with a navigation
drawer on a phone or tablet; the student has bottom tabs on a phone and a top bar on a tablet or laptop. One account menu (language, change
password, log out) replaces the placeholder header controls from T-M2.4. The workspace name is shown once, also on the public pages. Unknown
paths under `/tutor/…` and `/student/…` show the 404 page inside the shell. The lazy-navigation and offline feedback and the cross-tab session
handling of the original backlog row are **T-M2.12** (DEC-112).

## Scope
- In:
  1. **Nested routes** (`app/router.tsx`, frontend-architecture §3): `/tutor/*` and `/student/*` become layout routes (the shell renders an
     `<Outlet />`), still one lazy chunk per shell (NFR-PERF-03). The role guard stays on the **parent** route, so it runs for every child,
     including unknown ones. Children today: `/tutor` (index) → redirect `/tutor/today`; `/tutor/today` (today's placeholder content: `PageHeader`
     + `EmptyState`); `/student` (index) → `/student/home`; `/student/home` (placeholder); `*` under each shell → the 404 page **inside the shell**
     (navigation visible, a link to the role home, `usePageTitle`, focus on its `h1`). The top-level `*` 404 (outside the shells) stays.
  2. **Navigation items** come from one list per shell (label key, icon, route), so later tasks add an item by adding a row. Only routes that
     exist are listed (IA §2 rule "no dead tabs", applied to the shells): tutor **Today**; student **Home**. Students (T-M2.5), Settings (T-M2.6)
     and the rest arrive with their tasks. The current item has `aria-current="page"` and a visible non-colour marker.
  3. **Tutor shell** (IA §1, responsive-standards §3 item 6): at ≥ 1024 px a persistent sidebar (icons + labels) and a top bar with the workspace
     name and the account menu button (top right); below 1024 px a top bar with a menu button (`IconButton`, label "Open navigation") that opens a
     **drawer** from the start edge (modal: focus moves in and is contained, Esc and a visible Close button close it, focus returns to the menu
     button, a navigation closes it) holding the navigation items and, in its footer, the account section (IA §1). No collapsible rail at 768 px:
     with one or two items it adds nothing (DEC-112; responsive-standards §1 updated).
  4. **Student shell** (IA §3, responsive-standards §3 item 6): below 768 px a top bar (workspace name) and a **bottom tab bar** with labels always
     visible (Home, More), 44 px targets, padding for `env(safe-area-inset-bottom)`, and page content never hidden behind it; **More** opens a
     bottom **sheet** (a decorative drag handle and a visible Close button; swipe is never the only way, responsive-standards §3 item 7) with the
     account section (IA §3 lists Log out there; Account `/student/account` arrives with T-M2.7). At ≥ 768 px a top bar
     with the same items (Home) and the account menu button, as for the tutor at ≥ 1024 px: IA §3's "More expanded inline" puts More's account
     items (Log out, language; Account with T-M2.7) in the account menu (DEC-112 (4)).
  5. **Account menu** (IA §1, FR-AUTH-04, FR-AUTH-05): a button showing the user's display name (else the username) opens a **popover** with the
     account section: who is signed in, the `LanguageSwitcher`, "Change password" (navigates to `/change-password`, voluntary mode) and "Log out"
     (`useLogout`, unchanged). It is a dialog-type popover, not an ARIA `menu`, because it holds a segmented control (the ARIA APG menu pattern allows only menu items, not a radio group; the popover traps
     and returns focus as accessibility §1 rule 3 requires for dialogs). The same
     account section component fills the tutor drawer footer and the student More sheet. "Change password" and "Log out" have the same visual
     kind (carried UX note: a link next to a button looked inconsistent). The placeholder header controls of T-M2.4 and `ShellLayout` are removed.
     Log out takes at most 2 steps from any shell page at every viewport. **Language budget** (DEC-112 (5); was 1 step everywhere, T-M1.9): 1 step
     on the public pages, at most 2 from a shell page (open the account menu, pick a language).
  6. **Workspace identity** (carried UX notes "brand twice" and "no identity on public pages"; T-M1.6 QA note): the shell shows the workspace name
     (`GET /api/v1/meta`, public, `WorkspaceName`) once, as the home link; the product name "Eng-LMS" no longer sits next to it (it stays in the
     document title, `app.documentTitle`). The public frame (`/login`, `/change-password`, `/forbidden`) shows the workspace name above the `h1`
     in the toolbar row, with its loading and compact error states; the session bootstrap still completes first (DEC-092).
  7. **Copy** (DEC-073, T-M1.9 UX F-5): `meta.error` says "workspace", not "class" (vi + en). New strings for the navigation, drawer, sheet and
     account menu in vi + en (namespace `shell`).
  8. **Header fits** (carried UX note "header wraps to three rows at 360 px"): both shells' top bars and the public toolbar row (workspace name +
     language switcher) are one row at 360 px in vi and en; a long
     workspace name truncates with an ellipsis and has a full-text `title` tooltip (responsive-standards §3 item 8; the full name is also shown
     in Settings › Workspace, T-M2.6).
  9. **Loading skeleton** (`app/routes/RouteLoading.tsx`): the shell skeleton follows the new frame at each breakpoint (tutor: sidebar or top bar
     with the menu button; student: top bar and bottom tabs or the top bar), keeping today's rules (`aria-busy` with its label from 0 ms, the
     skeleton after 150 ms, `DelayedSkeleton`). It no longer draws the removed header controls. The public toolbar skeleton adds a name-shaped line before the switcher, so the heading
     still appears where its line was (`polish.spec.ts` AC3, CLS ≤ 0.05).
  10. **UI library** (`web/src/ui/`, design-system §3; React Aria Components): `Sheet` (modal; `placement="start"` for the drawer and
      `placement="bottom"` for the student sheet; visible Close button; reduced motion), `Popover` (dialog trigger + popover), `NavList`
      (vertical items with icon, label, current marker) and `BottomTabs`; plus `breakpoints.ts` with the responsive-standards §1 values used by
      the shells. Each with all states, tests, axe and a `/dev/ui` entry.
  11. **E2E** (`e2e/`): specs that use the T-M2.4 header controls or the shell's language switcher (`auth.spec.ts`, `loading.spec.ts`,
      `polish.spec.ts`, `route-focus.spec.ts`, `smoke.spec.ts`, `guards.spec.ts`) are retargeted to the account menu, keeping every assertion
      **except these, changed as DEC-112 (5) records**: (a) `route-focus.spec.ts` "switch the language from any page: 1 step" keeps 1 step on the
      public pages and expects at most 2 on `/tutor/…` and `/student/…`; (b) `loading.spec.ts` T-M1.16 AC1 (the switcher skeleton matches the
      switcher's width and end edge) keeps its public-page case, and its shell case checks the skeleton of the top bar's end control against that
      control: the account button (tutor ≥ 1024 px, student ≥ 768 px) or the menu button / nothing where the bar has no end control; (c) `smoke.spec.ts` reaches the shell's language radios through the account menu, drawer or More sheet (same assertions after it
      opens). `route-focus.spec.ts` finds the shell home link by the workspace name instead of "Eng-LMS". A new
      `shells.spec.ts` covers the ACs below. Specs under `qa/` are QA-owned (their update is T-M2.7, DEC-111).
- Out of scope (explicit):
  - **T-M2.12** (DEC-112): loading feedback after 150 ms during a slow client-side navigation to a lazy route (DEC-073, T-M1.9 QA F4); feedback
    when a lazy chunk cannot load offline (DEC-087, M1 G5 QA F-3); refetching the session on 403 `FORBIDDEN_ROLE` and broadcasting sign-in/out
    across tabs (T-M2.4 SEC S4-2, DEC-111).
  - Nav items for routes that do not exist yet (Students T-M2.5, Settings T-M2.6, Schedule M3, …), the student Account page (T-M2.7), the command
    palette and the "+ New" menu (IA §1 global elements; with their first targets), the collapsible rail at 768 px, the focused attempt header
    (M5), a review badge (M5).
  - Saving the language to the account (`PATCH /auth/preferences`, T-M2.6): the switcher keeps its current client-side behaviour.
  - Any backend, API client, session, guard-logic or redirect-rule change (`lib/api/client.ts`, `features/auth/**`, the guard functions in
    `app/guards.ts` stay as they are; only their placement in the route table changes).

## Guardrail answers (scope.md §6)
1. **Trace:** SPEC §41, IA §1/§3/§5, responsive-standards §3, FR-AUTH-04/05, DEC-073/087/109/111/112. 2. **Drift toward excluded scope?** No: no
chat, no notifications centre, no marketplace; only the navigation frame. 3. **Mandatory setup added?** None. 4. **Weekly use?** Every session
starts in a shell. 5. **Hard-coded semantics?** None: nav items are routes, not curricula.

## Design notes
- Route table sketch: `{ path: 'tutor', loader: guard.requireRole('TUTOR'), lazy: TutorShell, children: [{ index, loader: () => redirect('today') },
  { path: 'today', lazy: TutorToday }, { path: '*', Component: ShellNotFound }] }` (the same for `student`). The guard moves from `tutor/*` to
  `tutor` with children; a unit test proves anonymous `/tutor/unknown` → `/login?next=%2Ftutor%2Funknown` and a student on `/tutor/unknown` →
  `/forbidden` (the 404 is never shown before the guard).
  React Router runs a param-less parent loader on entering the shell, not on every child navigation (today the `tutor/*` splat re-runs it on each
  sub-path); the guard reads the cached session either way, and keeping a cached session fresh is T-M2.12 (SEC triggered).
- One `AccountSection` component (signed-in name, language, change password, log out) is used in the popover, the drawer footer and the More
  sheet; `useSession()` gives the name; no new query.
- Breakpoints: tutor sidebar at ≥ 1024 px (`lg`), student top bar at ≥ 768 px (`md`). CSS uses the same values as `breakpoints.ts` (a comment
  names the file; no custom-media plugin, responsive-standards §1 is updated to say so); stylelint's token rules apply.
- The drawer and the More sheet are `Sheet`s (responsive-standards §3 item 5); the `visualViewport` keyboard handling of item 10 is not needed
  (no inputs) and stays for the first form in a sheet.
- Home link and name states: the home link is always there; only its content changes (the skeleton with the accessible name `app.name`
  while loading, then the workspace name, or `app.name` after an error). The compact error with Retry sits **beside** the link, never inside
  (no interactive element nested in another).
- The 404 inside a shell reuses the content of `NotFound` (`EmptyState` level 1 + the home link), extracted into a component without its own
  `main`, with the role home as the link; the top-level `NotFound` keeps its own `main`.
- Landmarks: one `header`, one `nav` per navigation region with distinct labels ("Tutor navigation", "Student navigation"), one `main`; the skip
  link stays the first Tab stop.

## Acceptance criteria
- AC1 (DEC-087 F-4): `/tutor` → `/tutor/today` and `/student` → `/student/home`; `/tutor/nope` and `/student/a/b` render the 404 inside the shell
  (navigation visible, link to the role home, title set, focus on its `h1`); anonymous `/tutor/nope` → `/login?next=%2Ftutor%2Fnope` and a
  student on `/tutor/nope` → `/forbidden` (router unit test + E2E).
- AC2 (IA §1, responsive §3): tutor at 1280×800 sees a persistent sidebar with Today (`aria-current="page"`) and the account menu button top
  right; at 360×740 and 768×1024 a menu button opens the drawer (focus inside, Tab contained, Esc and Close close it, focus returns to the
  button, choosing an item navigates and closes it), with the account section in its footer (E2E at the three viewports + component tests).
- AC3 (IA §3, responsive §3): student at 360×740 sees bottom tabs Home and More with visible labels, 44 px targets, safe-area padding and no
  content hidden behind them; More opens a bottom sheet with the account section; at 768×1024 and 1280×800 a top bar with Home and the account
  menu button (E2E + component tests).
- AC4 (FR-AUTH-04, FR-AUTH-05, carried UX note): the account popover / drawer footer / More sheet each show the signed-in name, the language
  switcher, Change password and Log out in the same visual kind; Change password opens `/change-password` (voluntary mode, Cancel returns to
  the shell page); Log out takes ≤ 2 steps from any shell page at 360, 768 and 1280 and ends at `/login` (E2E step counter); a language change
  re-renders the shell in the other language at once.
- AC5 (carried UX notes, T-M1.6 QA note): the shell shows the workspace name once and no "Eng-LMS Eng-LMS"; `/login`, `/change-password` and
  `/forbidden` show the workspace name above the `h1`; both places have the loading state and a compact error with Retry (component tests with
  a mocked `/api/v1/meta`; no interactive element nested in another, e.g. the Retry button never inside the home link); on a cold load `GET /auth/session` still completes before `GET /api/v1/meta` (network-order E2E).
- AC6 (DEC-073 UX F-5): `meta.error` reads "Couldn't load the workspace name" / "Không tải được tên không gian dạy học" (or equivalent wording
  that says workspace), vi and en.
- AC7 (carried UX note, NFR-RESP-01): both shells' top bars and the public toolbar row are one row at 360×740 in vi and en (bounding-box check); a 60-character workspace
  name truncates with a full-text `title`; no horizontal scroll at 320, 360, 768, 1024 and 1280 px with the drawer, sheet and popover
  closed and open.
- AC8 (frontend-architecture §3): the shell loading skeleton matches the new frame per breakpoint and keeps today's rules (`aria-busy` and label
  from 0 ms, skeleton after 150 ms); the retargeted `loading.spec.ts` keeps all its assertions except the shell case of T-M1.16 AC1, changed as scope 11 (b) says.
- AC9 (NFR-A11Y-01, 02): axe has no serious or critical issues for both shells at 360×740, 768×1024 and 1280×800, with the tutor drawer (< 1024 px) or account
  popover (≥ 1024 px) open and the student More sheet (< 768 px) or account popover (≥ 768 px) open; keyboard only: skip link → navigation → account menu → Log out works; route focus after a nav-item navigation lands on
  the page `h1`; reduced motion removes sheet and drawer movement. `Sheet`, `Popover`, `NavList` and `BottomTabs` have `/dev/ui` entries, tests
  and axe checks.
- AC10: `./scripts/gate.sh` green twice in a row on the same dev database; all retargeted specs keep their assertions except the three changes listed in scope 11 (DEC-112 (5)); bundle budget green (the
  student chunk contains no tutor navigation code); the placeholder `ShellLayout` and the `auth` `header.*` keys that no longer have a use are
  removed.

## Test plan
- Implementation: router unit tests (AC1 redirects, guard before 404), component tests (`AccountSection`, both shells with a mocked session and
  `/api/v1/meta`, `WorkspaceName` states, `ui/` components incl. focus return and Esc), E2E `shells.spec.ts` (AC1–AC5, AC7, AC9 at the mandatory
  viewports; step counter for Log out), retargeted specs, axe.
- Independent QA focus: every shell at 320/360/390/768/1024/1280 in vi and en with a long workspace name; drawer and sheet focus trap, Esc,
  Close, browser Back while open, rotate/resize across 768 and 1024 while open; unknown and deep sub-paths for both roles, anonymous and wrong
  role; Log out and Change password from each location; keyboard only; reduced motion. Exploratory charter: find a viewport or language where
  the frame overlaps, hides content or loses the way to log out.
- SEC: **not triggered** (DEC-112): no change to identity code, the API client, session handling, redirect rules or endpoints; the guards only
  move in the route table, and AC1 plus QA cover that the guard still runs first. If the implementation must change `features/auth/**`,
  `lib/api/**` or the guard functions, the LC triggers SEC before G3. UX: **triggered** (new frame on every page).

## Evidence required
- `evidence/T-M2.11/summary.md`, gate logs (both runs), screenshots (360×740, 768×1024, 1280×800) under `evidence/T-M2.11/impl/`: tutor shell
  (default, drawer open at 360/768, account popover open at 1280, 404), student shell (default, More sheet open at 360, account popover open at
  768/1280, 404), `/login` with
  the workspace name, `/dev/ui` entries; axe results. QA report via `qa/T-M2.11`; the UX verdict as a PR record (reviewer evidence never on the
  feature branch).

## Docs to update
- `information-architecture.md` §1, §3, §4 (implemented notes: nav lists, account section, workspace name on public pages; §3: at ≥ 768 px
  More's account items sit in the account menu; remove "Until T-M2.11 …"), `responsive-standards.md` §1 (tutor at `md`: drawer until the nav has enough items for a rail, DEC-112; the breakpoint values live in
  `ui/breakpoints.ts` and CSS repeats them with a comment, no custom-media plugin) and §3 item 5 (navigation drawers are start-edge sheets at
  every width below `lg`, item 6; other sheets stay bottom sheets on `xs`/`sm`), `design-system.md` §3
  (`Sheet`, `NavList`, `BottomTabs` implemented; `Popover` added to the §3 inventory; `AppShell` is the two shells in `app/shells/`, composed from `ui/` parts), `frontend-architecture.md` §3 (nested shell routes, guard on the parent, shell
  404, skeleton), `ux-flows.md` (log out ≤ 2 steps from any shell page; language 1 step on public pages, ≤ 2 from a shell page, DEC-112 (5)), backlog (T-M2.11 done note), `progress.json`.

## Risks & assumptions
- **Split line:** if AC1–AC7 are not green by about 1.5 agent-days, the `/dev/ui` polish beyond the four components' basic states moves to a
  follow-up recorded by a DEC; nested 404s, the guard order, the account menu and the 360 px one-row header never move.
- With one nav item per shell the sidebar and tabs look sparse; that is expected until T-M2.5 and T-M2.6 add items (no dead items).
- Removing the header controls changes selectors in six E2E specs; their assertions stay, only the way to reach Log out and Change password
  changes.
- Public `GET /api/v1/meta` on `/login` is one extra request after the session bootstrap; it is cached for 5 minutes (`useMeta`).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.11 ./scripts/gate.sh && ENGLMS_TASK=T-M2.11 ./scripts/gate.sh
git checkout -- evidence/T-M2.11   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.11-app-shells
```
