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
- **Session bootstrap and guards (T-M2.4, DEC-092):** `features/auth/api/session.ts` `sessionQuery` (key `['auth','session']`, `GET /auth/session`,
  `null` on 401, `staleTime: Infinity`; changed only by sign-in, password change and logout). The root route's loader resolves it before anything
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
current page: a new location key without a hash); an in-page hash jump still does not move it.

## 4. i18n

`i18next` namespaces per feature. Keys are semantic (`students.create.title`). The Vietnamese catalogue is the default (A-012). A missing key fails the unit test
`i18n-completeness` (the vi and en key sets must be equal). Pluralisation uses i18next plural rules. Dates and numbers are always formatted through
`lib/time` and `Intl.NumberFormat` with the user's locale and time zone. The server stores UTC.

**Where namespaces are registered:** `lib/i18n/index.ts` loads the production namespaces (`common`, `shell`, …) at start-up. The development-only
`dev` namespace (the `/dev/ui` gallery) is **not** there: `src/dev/i18n.ts` registers it with `i18n.addResourceBundle` when the lazily imported
`/dev/ui` module is evaluated, and that route exists only when `import.meta.env.DEV` is true, so no `dev` string reaches `dist/` (T-M1.9 AC7). The
`i18n-completeness` test still compares `dev` (it imports `devResources`).

## 5. Extensions (frontend registry)

`extensions/registry.ts` maps an extension ID → `{ Editor, StudentRenderer, Reviewer, schema? }`, lazy-loaded. It is built from
`extensions/core/*`. The parity test (FR-EXT-03) compares the IDs with the backend `/tutor/question-types` contract fixture.

## 6. Error boundaries and telemetry

A route-level error boundary shows the error state with a request ID. There is no third-party error-tracking SDK (privacy). In the MVP,
client errors are only logged to the browser console. A server-side client-error endpoint would need a DEC entry and a privacy review first. Until then,
support relies on the request ID shown to the user plus the server logs.

## 7. Testing (details: test-strategy.md)

Unit (model, mappers, pure logic) · component (ui + feature components with MSW, vitest-axe) · E2E (Playwright, `/e2e`) · visual snapshots
of `/dev/ui` and critical screens.
