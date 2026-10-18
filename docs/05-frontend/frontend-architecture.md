# Frontend Architecture

> Trace: ADR-0004, ADR-0013, ADR-0014, tech-stack.md §3, NFR-PERF-03, NFR-I18N.

## 1. Structure (`web/`)

```text
web/
  index.html                 # no inline scripts (CSP)
  src/
    main.tsx                 # bootstrap: i18n, QueryClient, Router, RAC I18nProvider
    app/                     # shells, router, route guards (role, mustChangePassword), error boundaries, providers
      router.tsx             # lazy route modules per feature; <RoleGuard role="TUTOR|STUDENT">
      shells/TutorShell.tsx, StudentShell.tsx, FocusedShell.tsx
    features/                # one folder per domain area; mirrors backend modules
      auth/ students/ goals/ plans/ library/ files/ lessons/ notes/ questions/ activities/ review/ progress/ dashboard/ settings/
        routes/              # route components (page-level); thin
        components/          # feature components (compose ui/)
        api/                 # TanStack Query hooks: useStudents(), useCreateStudent() … built on lib/api
        model/               # feature types, Zod schemas, mappers, pure logic (unit-tested)
    extensions/              # frontend side of the plugin registry (question-type editors/renderers/reviewers)
    ui/                      # design system (ADR-0013) — the ONLY place importing react-aria-components
      tokens.css  breakpoints.ts  status/  components...
    lib/
      api/                   # openapi-fetch client, schema.d.ts (generated), problem → error mapping, CSRF handling
      i18n/                  # i18next setup; locales/vi/*.json, locales/en/*.json (namespaces per feature)
      time/                  # formatting helpers (Intl, @internationalized/date), relative time
      storage/               # draft buffer (IndexedDB/sessionStorage) for autosave
    test/                    # test utils, MSW handlers, fixtures
  e2e/ → lives at repo root /e2e (implementation-owned) ; /qa (QA-owned)
```

**Implemented feature (T-M2.5): `features/students/`**: `routes/` (the three lazy pages `StudentsListPage`, `AddStudentPage`,
`StudentWorkspacePage`, each imported by the router directly, so each is its own chunk and none is in a first-visit closure; the bundle budget
fails otherwise), `components/` (the form, the credentials card, contact values, the not-found view), `api/students.ts` (query keys
`['students','list',query]`, `['students','detail',sid]`; a create invalidates `['students','list']` and seeds nothing; the create mutation has
`gcTime: 0` and is reset once its result is in the page's state; the username suggestion and availability are queries keyed by the debounced
value, so a stale answer can never write the field), `model/` (URL list params and their fallbacks, the Zod schema, `contactHref`, the 422
mapping, the credentials message; unit-tested). The page title hook moved to `lib/i18n/pageTitle.ts` (`app/routeAnnouncement.ts` re-exports
it) and dates go through `lib/time` (`Intl.DateTimeFormat`, browser time zone), both so feature pages need nothing from `app/`.
**T-M2.14** adds to `features/students/`: `components/ProfileForm.tsx`, `AccountSection.tsx`, `ConflictDialog.tsx`, the field parts both
forms share (`StudentFields.tsx`, `useUsernameCheck.ts`), `model/editSchema.ts` (`toPatchRequest`), `model/studentFields.ts` (field ids, the
error summary), `model/useSummaryFocus.ts`; `api/students.ts` gains `useUpdateStudent`, `useChangeStatus`, `useResetPassword` (each write
replaces the detail entry with its answer and invalidates the list). Import rules unchanged.

**Import rules (oxlint `no-restricted-imports` + `no-restricted-globals` with per-path overrides, `web/.oxlintrc.json`; DEC-042):** `features/*` may import `ui`, `lib`, `extensions` and their **own** folder only.
Cross-feature needs go through `lib` or via route composition. `react-aria-components` may be imported only inside `ui/`. No `fetch` outside `lib/api`.

## 2. Data flow

- **Server state:** TanStack Query only. Query keys: `[feature, resource, params]`. Mutations invalidate precise keys. Optimistic updates **only** for
  reorder and status chips, with rollback on error.
- **Client state:** React state and context for UI state. URL search params for filters, tabs and views. No global store library.
- **Forms:** React Hook Form + Zod resolver. Schemas in `model/`, aligned with backend validation (validation-rules.md). The server remains authoritative.
- **API client:** `openapi-fetch` with `credentials: 'same-origin'`. A middleware adds `X-XSRF-TOKEN` from the cookie and `Idempotency-Key` for flagged
  commands, and maps Problem Details → `ApiError {status, code, fieldErrors}`. On 401 it clears the query cache → `/login?next=`. On 403
  `PASSWORD_CHANGE_REQUIRED` it redirects to `/change-password`.
  **Implemented (T-M2.4)** in `lib/api/client.ts`: the XSRF middleware sends `X-XSRF-TOKEN` = the `XSRF-TOKEN` cookie on every non-GET request;
  when the cookie is missing it first calls `GET /auth/session` (which primes it, also on 401; a GET, so no recursion). `ApiError` carries
  `fieldErrors` (`errors[]`) and `retryAfterSeconds` (`Retry-After`). A 401 from any call except `GET /auth/session` and `POST /auth/login`, or a
  403 `PASSWORD_CHANGE_REQUIRED`, is reported to one listener (`onAuthProblem`); `app/guards.ts` `connectAuthProblems` reacts through the router:
  401 → clear the query cache, `/login?next=<path+search>` (only when `isSafeAppPath` accepts it, else `/login`); 403 → read the session again,
  `/change-password`. (`Idempotency-Key` is not built yet.)
  **T-M2.12:** a 403 `FORBIDDEN_ROLE` is reported too (a third `AuthProblem`; the caller still gets its `ApiError`). `connectAuthProblems`
  reads the session again (`refreshSession`; concurrent 403s share one read); only when the user, role or sign-in changed (`userId`, `role`, or
  anonymous now) does it drop every cached query except the session and follow it (below); else nothing happens. **Dropping** (AC11 (e),
  DEC-118): queries of mounted pages are reset (`resetQueries`: their observers are notified and refetch for the new session), the unused
  ones removed, so a same-role user switch never leaves the previous user's data on a mounted page.
- **Cross-tab sign-in/out (T-M2.12, security.md T19):** the session is no longer changed only by this tab. `features/auth/api/authChannel.ts`
  wraps one `BroadcastChannel` named `englms-auth` (post and listen share the instance, so a tab never hears itself; nothing happens where
  `BroadcastChannel` does not exist). `useLogin` posts `{ type: 'signed-in' }` after a successful sign-in; `useLogout` (also when the call
  failed) and `guard.login` after its must-change logout post `{ type: 'signed-out' }`: only the type, no user data. `connectAuthProblems` also
  listens: on a message of exactly that shape (anything else is ignored) it drops every cached query except the session, reads the session
  again and follows it; a received message never posts. A page restored from the back/forward cache (`pageshow` with `event.persisted`,
  AC11 (f)) missed the messages sent meanwhile, so it runs the same steps. **Following a session:** on `/login` with a signed-in session the tab navigates to `/`
  (`replace`; its guard picks the role home or `/change-password`; `?next=` is not honoured there); elsewhere `router.revalidate()`, so the
  unchanged guards redirect. The reactions run one after another (a queue), so a redirect into `/login` has finished before the next session
  read. The channel is closed when the app unmounts (`App`'s effect returns the unsubscribe).
- **Session bootstrap and guards (T-M2.4, DEC-092):** `features/auth/api/session.ts` `sessionQuery` (key `['auth','session']`, `GET /auth/session`,
  `null` on 401, `staleTime: Infinity`; changed by sign-in, password change and logout, and read again after another tab's sign-in/out or a
  403 `FORBIDDEN_ROLE`, T-M2.12). The root route's loader resolves it before anything
  renders, so it completes before any other API request. The guards are route loaders (`app/guards.ts`), so protected UI never renders for the
  wrong visitor: `/tutor/*` needs `TUTOR`, `/student/*` needs `STUDENT`; anonymous → `/login?next=`; `mustChangePassword` → `/change-password`
  (checked before the role); wrong role → `/forbidden`. `/` only redirects (role home, `/change-password` or `/login`). `/login` logs out a
  session that must change its password, sends another signed-in visitor home, else shows the form. `/change-password` needs a session.
- **Return targets (security.md T18):** `features/auth/model/redirect.ts`: `isSafeAppPath(path)` (structural, no role: raw and after exactly one
  `decodeURIComponent`, a decode error refuses; starts with `/` but not `//` or `/\`; no `:` or whitespace in the path part, backslash, control character, `.`/`..`
  segment raw or `%2e`-encoded; first segment `tutor` or `student`) and `safeNext(next, role)` (safe **and** the role's namespace, else the role
  home). The redirect after sign-in and after a forced change always goes through the router's `navigate()`; table test in `redirect.test.ts`.

## 3. Routing and code splitting

React Router data routers with `lazy()` per route module. The tutor and student bundles are split at the shell level, so a student never downloads the tutor
builder or grading code. Route loaders prefetch the queries of the destination. Budget per NFR-PERF-03 is enforced by `web/scripts/bundle-budget`
(reads the Vite manifest).

**Route focus and titles (T-M1.9, accessibility §2).** The root route's `RootLayout` (`app/RootLayout.tsx`) calls `useRouteFocus()`
(`app/routeAnnouncement.ts`): after every client-side navigation (link, `navigate()`, browser back/forward) it moves focus to `main h1`, which
`PageHeader` and a level-1 `EmptyState` render with `tabIndex={-1}` (a focus target, not a Tab stop). On a first load or a reload focus stays on
`body`, so the skip link is the first Tab stop on the shells. The first load is detected with a ref holding the last seen path (not
`useNavigationType`, not `location.key`); hash-only changes are ignored. The pages sit under a pathless route with the `RouteError` boundary, so a
failed navigation also renders inside `RootLayout` and gets the same focus move. Every route component calls `usePageTitle(t('…title'))`, which sets
`document.title` to `app.documentTitle` (`<page title> · <app name>`) and follows a language change. `RouteLoading` (the hydrate fallback) shows a
top-bar-shaped skeleton on `/tutor/*` and `/student/*` and the page-only skeleton elsewhere.

**Shell routes (T-M2.11, DEC-112).** `/tutor` and `/student` are layout routes: the shell renders an `<Outlet />` in its `main`. The role guard
(`guard.requireRole`) is the **parent's** loader, so it runs before any child, unknown paths included (anonymous → `/login?next=`, must change →
`/change-password`, wrong role → `/forbidden`); React Router runs it on entering the shell, not on every child navigation (it reads the cached
session either way). Children: the index redirects (`/tutor` → `/tutor/today`, `/student` → `/student/home`), the pages (`today`, `home`), and
`*` → `ShellNotFound` (the 404 content of `NotFound`, without its own `main`, linking to the role home; `usePageTitle`; route focus on its `h1`).
Every child's `lazy()` imports its shell's module, so each shell stays one lazy chunk; the top-level `*` 404 stays for paths outside the shells.
The shells choose their frame with `useMinWidth` (tutor sidebar at ≥ `lg`, drawer below; student top bar at ≥ `md`, bottom tabs below); their
overlays (`useOverlay`) are open only while the location they were opened at is current, so any navigation (a link, Back, a redirect) closes
them in the same commit. `RouteLoading` draws the same frame per breakpoint (tutor: menu-button skeleton below `lg`, account-button skeleton
and sidebar at ≥ `lg`; student: bottom-tab bar below `md`, nav item and account-button skeletons at ≥ `md`); the public pages' skeleton has a
name-shaped line before the switcher. Route focus also moves after a navigation to the page already shown (a nav item or the home link of the
current page: a new location key without a hash); an in-page hash jump still does not move it. **A change of the search params alone** (same
pathname: a list's search, filter, sort or page, T-M2.5) is an in-page view change and keeps focus on the control that made it. A page whose
`h1` arrives with its data (the student workspace) moves focus to it once loaded, only after a client-side navigation (`lib/navigation.ts`).

**Navigation feedback and chunk errors (T-M2.12, DEC-116).** While the router navigates (`useNavigation().state !== 'idle'`: lazy chunks and
loaders) for longer than 150 ms (`useDelayed`, the timer behind `DelayedSkeleton`), `RootLayout` shows `ProgressLine` at the top edge of the
viewport and fills its one polite status region (an `<output>`) with `app.loading`; the current page stays as it is and keeps focus until the
new page renders (then route focus moves as above). A navigation that settles within 150 ms shows nothing. When a route's `lazy()` import fails
(a dynamic-import error of any engine or Vite's CSS preload error, `app/routes/chunkError.ts`), or any route error happens while
`navigator.onLine` is `false`, `RouteError` shows the offline or the couldn't-load page (its own `h1` and document title, AC11 (b)) with a
primary **Retry** and the quiet start-page link; the copy follows `online` / `offline` events while shown (AC11 (a)). Retry while
offline keeps the page and announces the offline message again (no request); online it calls `window.location.reload()`: React Router keeps a
rejected `lazy()` for the router's life, and after a failed client navigation the address bar already shows the failed URL (no URL is built, so
it cannot leave the origin). Nothing reloads by itself (no `vite:preloadError` or `online` handler). **`/login` does not revalidate** while
its URL is unchanged (`shouldRevalidate` returns `false` when `currentUrl.href === nextUrl.href`), so a revalidation caused by another tab or a
403 never runs its must-change logout; moving between `/login` URLs still runs the guard.

## 4. i18n

`i18next` namespaces per feature. Keys are semantic (`students.create.title`). The Vietnamese catalogue is the default (A-012). A missing key fails the unit test
`i18n-completeness` (the vi and en key sets must be equal). Pluralisation uses i18next plural rules. Dates and numbers are always formatted through
`lib/time` and `Intl.NumberFormat` with the user's locale and time zone. The server stores UTC.

**Where namespaces are registered:** `lib/i18n/index.ts` loads the production namespaces (`common`, `shell`, …) at start-up. The development-only
`dev` namespace (the `/dev/ui` gallery) is **not** there: `src/dev/i18n.ts` registers it with `i18n.addResourceBundle` when the lazily imported
`/dev/ui` module is evaluated, and that route exists only when `import.meta.env.DEV` is true, so no `dev` string reaches `dist/` (T-M1.9 AC7). The
`i18n-completeness` test still compares `dev` (it imports `devResources`).
The `students` namespace (T-M2.5) follows the same pattern for production: `features/students/i18n.ts` registers it when a Students page
module is evaluated, so its strings travel with the lazy tutor pages and never reach a student's first visit; the completeness test imports
`studentsResources` too. Student status labels are in `common` (`status.student.*`) and `nav.students` in `shell`.

## 5. Extensions (frontend registry)

`extensions/registry.ts` maps an extension ID → `{ Editor, StudentRenderer, Reviewer, schema? }`, lazy-loaded. It is built from
`extensions/core/*`. The parity test (FR-EXT-03) compares the IDs with the backend `/tutor/question-types` contract fixture.

## 6. Error boundaries and telemetry

A route-level error boundary shows the error state with a request ID (when the error carries one). The chunk-load and offline variants
(T-M2.12, §3) show no request ID: there is none. There is no third-party error-tracking SDK (privacy). In the MVP,
client errors are only logged to the browser console. A server-side client-error endpoint would need a DEC entry and a privacy review first. Until then,
support relies on the request ID shown to the user plus the server logs.

## 7. Testing (details: test-strategy.md)

Unit (model, mappers, pure logic) · component (ui + feature components with MSW, vitest-axe) · E2E (Playwright, `/e2e`) · visual snapshots
of `/dev/ui` and critical screens.
