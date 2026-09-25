# ADR-0004: React + Vite SPA served same-origin from the backend jar

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §36 (React/Next.js suggested), NFR-PERF-03, ADR-0005

## Context
The app is private and authenticated, so SEO is irrelevant. We want one deployable version, cookie authentication without CORS, and no second server runtime.

## Decision
- `web/` is a React + TypeScript SPA built by Vite into static assets.
- The container build runs `pnpm build` and copies `web/dist` into the backend's `classpath:/static`. Spring serves the assets with
  long-cache immutable headers for hashed files and `no-cache` for `index.html`. A fallback controller returns `index.html` for non-API
  GET routes (`/tutor/**`, `/student/**`, `/login`, …).
- Development uses the Vite dev server with a proxy for `/api` → `localhost:8080`, so it is also same-origin from the browser's view.

## Alternatives considered
- **Next.js (SSR):** adds a Node runtime in production, and a server-rendering model we don't need. Rejected.
- **Caddy serves the SPA and the backend serves only the API:** also same-origin, but produces two artifacts and two versions to keep aligned. Kept as a fallback.

## Consequences
+ One image = one version, simple rollback, strict CSP possible (no inline scripts). − A frontend-only change still means
rebuilding the image (acceptable at this scale).

## Verification
The E2E suite runs against the packaged jar (not the dev server) in CI. A header test checks the caching and CSP headers.
