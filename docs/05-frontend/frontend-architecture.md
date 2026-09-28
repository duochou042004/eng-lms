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
