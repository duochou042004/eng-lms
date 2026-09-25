# T-M1.3: Web skeleton (Vite + React + TS, design tokens, i18n vi/en, CI)

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **ready** (G0-complete; dependency T-M1.2 merged at `ae9ac5d`; the PO gives the start signal) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M1.3-web-skeleton` (from `develop`) |
| Depends on | T-M1.2 merged (the `api/openapi.json` contract and `GET /api/v1/meta`) |
| Estimate | 1.5–2 agent-days |
| Trace | ADR-0004, ADR-0013, ADR-0014, DEC-029, DEC-039, NFR-I18N-01, NFR-A11Y-01, NFR-A11Y-03, NFR-PERF-03, NFR-RESP-01, frontend-architecture §1–§4, design-system §2–§3 |

## Goal
A compiling, tested, accessible web skeleton in `web/`: the design tokens, a first small set of `ui/` primitives, i18n with **Vietnamese as the default and
English** (DEC-039), a router with placeholder tutor and student shells, a typed API client generated from `api/openapi.json`, and the `web` CI job.
It has **no domain features and no auth** (auth arrives with M2).

## Scope
- In:
  1. Scaffold with the official Vite template (`pnpm create vite web --template react-ts`; record the exact command, versions and output in the evidence).
     pnpm through corepack (`packageManager` pinned in `package.json`), Node 24, TypeScript `strict`. Structure per frontend-architecture §1
     (`app/`, `features/`, `ui/`, `lib/api`, `lib/i18n`, `lib/time`, `test/`); create only the folders this packet uses.
  2. Tooling: ESLint (flat config, typescript-eslint, react-hooks, jsx-a11y, the import rules from frontend-architecture §1: `react-aria-components`
     only inside `ui/`, no `fetch` outside `lib/api`), Prettier, stylelint with a token rule (no raw colours, spacing or radii outside `ui/tokens.css`).
  3. `ui/tokens.css` from design-system §2 (colour, typography, spacing, radii, elevation, motion with `prefers-reduced-motion`, z-index), the font
     Be Vietnam Pro self-hosted through Fontsource (400/500/600, Vietnamese subset), and a **contrast check script** that fails when a text/background
     token pair used for text is below 4.5:1 (3:1 for large text and UI boundaries).
  4. `ui/` primitives (React Aria Components + CSS Modules), each with all states, keyboard behaviour, an accessible-name strategy, a unit test, an axe
     test and a `/dev/ui` entry: `Button` (primary, secondary, quiet, danger; md, lg), `IconButton` (label required), `Field` + `TextField`,
     `InlineAlert`, `Skeleton`, `EmptyState`, `PageHeader`, `Stack`.
  5. i18n: i18next + react-i18next, namespaces per feature, `vi` is the default and fallback, `en` is complete. An `i18n-completeness` unit test fails when
     the vi and en key sets differ. RAC `I18nProvider` follows the active locale. A `LanguageSwitcher` in both shells keeps the choice in `localStorage`
     until account preferences exist (M2, `PATCH /auth/preferences`). `<html lang>` follows the locale.
  6. Router (React Router, lazy routes): `/` → a neutral landing page with links to both shells, `/tutor` → `TutorShell` placeholder, `/student` →
     `StudentShell` placeholder (the two bundles are split at the shell level), `/dev/ui` (the component gallery; **dev builds only**), and a 404 route. An
     app-level error boundary with an i18n message.
  7. API client: `openapi-typescript` generates `lib/api/schema.d.ts` from `../api/openapi.json` (`pnpm api:generate`); `openapi-fetch` client with
     `credentials: 'same-origin'`, and Problem Details → `ApiError {status, code, requestId}` mapping (the codes come from the contract's `ProblemCode`).
     The shells show the workspace `displayName` from `GET /api/v1/meta` through TanStack Query, with loading (Skeleton) and error (InlineAlert) states.
     Vite dev server proxies `/api` → `http://localhost:8080`.
  8. Tests and budgets: Vitest + Testing Library + vitest-axe (jsdom), MSW for `/api/v1/meta`. `pnpm budget` reads the Vite manifest and enforces
     NFR-PERF-03 (student initial JS ≤ 200 KB gz, tutor ≤ 300 KB gz).
  9. CI: `.github/workflows/web.yml` on **every** PR (no `paths:` filter, as for `backend`), actions pinned by SHA, `persist-credentials: false`:
     `pnpm install --frozen-lockfile` → lint → typecheck → test → build → budget → contrast check. Add `web` to `scripts/required-checks.txt` (and the
     merge-gate test fixture), and a Dependabot `npm` entry for `/web`.
  10. Docs: tech-stack §7 pins (Vite, React, TypeScript, React Router, TanStack Query, React Aria Components, i18next, openapi-typescript,
      openapi-fetch, Vitest, ESLint, stylelint, pnpm), development-setup (real web commands), ci-cd (`web` live), design-system §2 (the final token
      values after the contrast check).
- Out of scope: login, route guards, auth or CSRF handling (M2); domain screens; the remaining `ui/` inventory (added with the features that need it);
  the E2E harness and Playwright viewports (T-M1.6); serving the SPA from the backend and `gate.sh` (T-M1.5); dark theme (OQ-14 → P2).

## Guardrail answers
1. Trace: the ADRs and NFRs above. 2. No drift towards excluded scope (no auth, chat, payments or AI). 3. No tutor setup is added. 4. N/A (engineering).
5. No exam semantics; the placeholder copy is neutral.

## Design notes
- Verify each version in the official docs before pinning. React Aria Components is the only headless library (ADR-0013); do not add Radix/shadcn/Tailwind.
- Placeholder copy stays neutral ("Tutor workspace", "Student home"). All strings are in the vi + en catalogues, including `aria-label`s.
- Logical CSS properties only (RTL-agnostic). Layout must reflow at 320 px (NFR-A11Y-03). Check the shells at 360 / 768 / 1280 manually and add the screenshots
  to the evidence (the Playwright projects arrive in T-M1.6).
- The `/dev/ui` route must be tree-shaken from production builds (verify it is absent from the manifest).

## Acceptance criteria
- **AC1:** `web/` was produced by the Vite template with the exact command in the evidence. `pnpm install --frozen-lockfile && pnpm build` works on Node 24.
- **AC2:** `pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm build`, `pnpm budget` and the contrast check pass locally and in CI (`web` job green).
- **AC3:** The import rules fail on a fixture that imports `react-aria-components` outside `ui/` and on a `fetch` outside `lib/api` (negative demo in the evidence).
  stylelint fails on a raw hex colour in a feature CSS module (negative demo).
- **AC4:** Each primitive in scope 4 has its states, keyboard support, a unit test and a clean axe test, and it appears in `/dev/ui`.
- **AC5:** The app starts in Vietnamese. Switching to English changes every visible string and `<html lang>`, and the choice survives a reload. The
  `i18n-completeness` test fails when a key is missing from `en` (negative demo).
- **AC6:** `lib/api/schema.d.ts` is generated from `api/openapi.json`, and `pnpm api:generate` is reproducible (no diff on rerun). The shells render
  `displayName` from `/api/v1/meta` (MSW in tests) and show the Skeleton and InlineAlert states for loading and for a Problem Details error.
- **AC7:** The tutor and student shells are separate lazy chunks. The budget script reports both sizes and fails when a limit is exceeded (negative demo with a
  lowered limit). `/dev/ui` is absent from the production build.
- **AC8:** The contrast script checks every text token pair in `tokens.css` and fails for a pair below the threshold (negative demo). The final token values
  are recorded in design-system §2.
- **AC9:** The shells at 360×740, 768×1024 and 1280×800 have no horizontal scroll and a visible focus ring; screenshots are in the evidence.
- **AC10:** Docs are updated (scope 10), `web` is in `required-checks.txt`, the Dependabot npm entry exists, and `progress.json` and the evidence summary are updated.

## Test plan
- Implementation: as listed in scope 4, 5, 7 and 8 (component, axe, i18n-completeness, API error mapping and MSW-backed shell tests).
- Independent QA focus: a clean clone → `pnpm install --frozen-lockfile` and all scripts green; run `pnpm dev` against the T-M1.2 backend and check `/`,
  `/tutor`, `/student` and 404 in vi and en at 360 / 768 / 1280 (keyboard only, focus visibility, zoom 200%); verify that no domain features or hard-coded exam
  semantics exist. **UX review** (ux-reviewer) is required at G3 because this is a UI PR.

## Evidence required
`evidence/T-M1.3/summary.md` (AC → proof), the scaffold output, the negative demonstrations for AC3, AC5, AC7 and AC8, the budget report, the screenshots at 3 viewports,
the CI run link, the QA report and the UX review.

## Docs to update
tech-stack.md §7 · development-setup.md §2/§4 · ci-cd.md (`web` live) · design-system.md §2 (final token values) · `scripts/required-checks.txt`.

## Risks and assumptions
R-06 (framework habits) → verify against the docs. The React Aria Components API changes quickly: pin the version and use its docs. The budget and
contrast scripts are small local scripts (no new service).

## Commands
```bash
source ~/.nvm/nvm.sh && nvm use 24 && corepack enable
git checkout develop && git pull && git checkout -b feature/T-M1.3-web-skeleton
pnpm create vite web --template react-ts
cd web && pnpm install && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget
```
