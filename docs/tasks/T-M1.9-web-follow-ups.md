# T-M1.9: Web a11y/UX follow-ups (T-M1.3 UX and QA items, T-M1.6 QA F3)

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **ready** (G0: DOCS-REVIEW on PR #19, round 2 PASS; dependencies merged; PO start signal given, DEC-072) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M1.9-web-follow-ups` (from `develop`) |
| Depends on | T-M1.3, T-M1.6 (merged); T-M1.8 merged (`01dfc5d`) |
| Estimate | 1–1.5 agent-days |
| Trace | DEC-043 (T-M1.3 UX round 1: F3, F5, the optional F9 items), DEC-045 (T-M1.3 UX round 2: N1–N4; T-M1.3 QA F-1, F-2), DEC-058 (T-M1.6 QA F3); sources: the PR #4 UX-REVIEW comments, rounds 1–2 (recorded in `evidence/T-M1.3/review/ux.md`), `evidence/T-M1.3/qa/report.md`, `evidence/T-M1.6/qa/report.md`; NFR-A11Y-01, NFR-A11Y-02, NFR-A11Y-04, NFR-I18N-01, accessibility.md §1 (items 3, 15) and §2 (checklist "focus management after route change"), interaction-states.md §1 (the 150 ms skeleton delay), design-system.md §3, frontend-architecture §1 (no `fetch` outside `lib/api`) |

## Goal
Close the web findings deferred from the T-M1.3 and T-M1.6 reviews **before M2 adds real routes**, so every M2 page inherits them: route changes move focus to the
page `h1` and set a per-route `document.title`; the language switcher becomes a proper segmented `ui/` control; loading skeletons appear only after 150 ms; field errors
are not signalled by colour alone; the remaining small targets and copy issues are fixed; the dev-only strings leave the production bundle; the `fetch` lint rule has no
`window.`/`globalThis.` loophole; and the E2E console guard sees errors raised just after a test body ends.

## Scope
- In:
  1. **Route focus and titles (UX F3, DEC-043).** A small `app/` hook or component (e.g. `useRouteAnnouncement`) that, on every **client-side navigation** (not on the first
     load, including a full reload of a page first reached by client navigation), moves focus to the page's `h1` (`tabIndex={-1}`, focus ring per accessibility §1 item 3)
     and sets `document.title` to `<page title> · <app name>` from the i18n catalogues. On a first load focus stays on `body`: on the shells the skip link is the first Tab
     stop; the landing, 404 and error pages have no header before `main`, so their first Tab stop is already inside the main content. Every route sets a title: landing,
     tutor shell, student shell, 404, the route error page and `/dev/ui` (dev only; its title key lives in the `dev` namespace, so it never ships in production).
     The title follows a language change without a navigation. `PageHeader` and `EmptyState` (heading level 1) accept the focus target without changing their visual design.
  2. **`ui/SegmentedControl` (UX F5, DEC-043).** A new `ui/` component on React Aria Components `ToggleButtonGroup` + `ToggleButton` (single selection, empty selection
     disallowed), CSS Modules and tokens only. In `react-aria` 3.52.1 a single-selection group renders `role="radiogroup"` with `role="radio"` + `aria-checked` segments
     (no `aria-pressed`); that is the expected semantics. The selected segment uses the accent-subtle background **and** a check icon (lucide `Check`, `aria-hidden`), so the state is
     not conveyed by colour alone. It has a required accessible group name, 44 px segments (`--size-control-md`), all states (default, hover, pressed, selected, focus-visible,
     disabled), keyboard support as RAC provides it (Tab into the group, arrow keys between segments, Space/Enter to select), a unit test, an axe test and a `/dev/ui` entry
     (vi + en). `LanguageSwitcher` is rebuilt on it (the `lang` attribute on each endonym stays); the `fieldset`/`legend` markup is replaced by the group label.
  3. **Skeleton delay (UX F9 optional, DEC-043; interaction-states §1).** Loading regions (`RouteLoading`, `WorkspaceName`) show their `Skeleton`s only after **150 ms**; before
     that the region is already `aria-busy` with its label and reserves the same size (no layout shift when the skeleton or the data appears). The delay is one shared
     mechanism in `ui/` (a `Skeleton` `delayMs` prop or a `DelayedSkeleton` wrapper; the implementer chooses and documents it in design-system §3).
  4. **Field error icon (UX F9 optional, DEC-043).** `FieldErrorMessage` renders a decorative error icon (lucide `CircleAlert`, `aria-hidden`) before the text; the error's
     accessible text and the `aria-describedby` wiring are unchanged. The icon/text pair passes the contrast check (UI component ≥ 3:1).
  5. **Round-2 items (DEC-045).** **N1:** the 404 "go to the start page" link is a ≥ 44 px target (block size), styled as a link or a secondary button-link from `ui/`.
     **N2:** the shell home link and the skip link have a ≥ 44 px minimum block size. **N3:** `RouteLoading` is a block-level region (the page padding applies). On shell
     paths (`/tutor/*`, `/student/*`) it includes a header-shaped skeleton that matches the shell top bar; on the other paths (landing, 404), which have no top bar, it
     shows the page-only skeleton, so no route's first load jumps. **N4:** the route error copy mentions the request ID **only** when one is
     shown; without one, it uses a separate string without that sentence (vi + en).
  6. **Dev strings out of production (T-M1.3 QA F-1, DEC-045).** The `dev` i18n namespace is loaded only in development builds (e.g. registered with `addResourceBundle` from
     the lazily imported `/dev/ui` module, or behind `import.meta.env.DEV`), so no `dev` string is in `dist/`. The `i18n-completeness` test still covers `dev` (vi = en).
  7. **`fetch` lint loophole (T-M1.3 QA F-2, DEC-045).** Linting fails on `window.fetch(`, `globalThis.fetch(` and `self.fetch(` outside `src/lib/api/**`, as it already
     does on a bare `fetch(`. Use oxlint's `no-restricted-properties` if the pinned oxlint supports it; otherwise the smallest equivalent that runs in `pnpm lint` (record the
     choice in the evidence; no new linter without a DEC).
  8. **Late console errors in E2E (T-M1.6 QA F3, DEC-058).** The `consoleGuard` fixture waits for a short, bounded settle before it asserts (e.g. a fixed ≤ 500 ms quiet
     window, or `requestIdleCallback`/network-idle with a ≤ 500 ms cap), so an error raised up to 300 ms after the test body's last action fails the test. Add a permanent
     self-test in `e2e/tests/guards.spec.ts` that proves it (an expected-failure test, e.g. `test.fail()`, with `setTimeout(() => console.error('late'), 300)` as its last
     statement, run in the page: `page.evaluate(() => setTimeout(() => console.error('late'), 300))`, as QA probe P15). Record the E2E wall time before and after in the
     evidence.
- Frontend docs this packet may change: design-system §3 (the `SegmentedControl` row, the skeleton delay mechanism), accessibility.md checklist (route focus + titles are now
  provided by the app), frontend-architecture §3 (the route-title and route-focus convention) and §4 (where the dev namespace is registered), qa-protocol/test-strategy
  only if the guard's settle time needs a note. Nothing else.

## Out of scope (explicit)
- New routes, navigation (sidebar, drawer, bottom tabs), auth or route guards (T-M2.4); account-stored language preferences (M2, `PATCH /auth/preferences`); a dark theme
  (OQ-14 → P2); new `ui/` components other than `SegmentedControl` (and `DelayedSkeleton`, if chosen for scope 3); the duplicated "Eng-LMS Eng-LMS" in the shell
  header (brand link + the default workspace name, noted in `evidence/T-M1.6/qa/report.md`; not a DEC item, it belongs to the real shells in T-M2.4); changes to `backend/`, `api/`, CI workflows, `required-checks.txt` or `merge-gate.sh`; the T-M1.12
  merge-gate items; TypeScript 7 (T-M1.10); any `qa/**` change (QA-owned).

## Guardrail answers (scope.md §6)
1. Trace: DEC-043, DEC-045, DEC-058 and the accessibility/interaction-state rules above. 2. No drift towards excluded scope: no chat, payments, booking or AI; a language
switcher and loading states only. 3. No mandatory tutor setup is added. 4. Weekly use: every M2+ page inherits route focus, titles and loading behaviour; the language
switcher is used by the tutor and students. 5. No hard-coded exam or curriculum semantics; all copy is neutral and in the vi + en catalogues.

## Design notes
- `web/src/app/router.tsx` holds the lazy routes; the hook/component for scope 1 lives in `app/` (it knows about routes and i18n), not in `ui/`. React Router is
  **8.4.0** (tech-stack §7). Detect the first load with a mounted ref (or a module-level flag set after the first committed location), **not** with `useNavigationType`
  (the initial location is `POP`, the same as browser back, which AC1 must handle) and not with `location.key` (after a reload, `history.state` keeps a real key). With lazy routes, focus must move **after** the new route's `h1` exists (e.g. in an
  effect of the route component, or by querying `main h1` after commit); a test must cover a lazy route.
- `document.title` strings go into the catalogues (`common` for app-wide pages, `shell` for the shells); `app.name` stays the brand suffix.
- RAC `ToggleButtonGroup` is in the pinned `react-aria-components` 1.21.1; check its docs for the selection props (`selectedKeys`, `onSelectionChange`,
  `disallowEmptySelection`) before use. RAC stays inside `ui/` only (ADR-0013).
- The skeleton delay must not affect the tests' ability to see the loading state: the component tests use fake timers to show "nothing before 150 ms, skeleton after".
- `lucide-react` is already a dependency (1.48.0); no new dependency is expected. Any new dependency needs an LC-approved DEC first.
- **UX step budgets** (ux-flows.md conventions; there is no numbered critical flow for these, so the packet sets them): **switch the language** from any page = **1 step**
  (activate the other segment; with the keyboard: Tab into the group, arrow, Space); **reach the main content** from a fresh load of a shell = **1 step** (Tab to the skip
  link, Enter), from a fresh load of the landing/404/error pages = **0 steps** (no header before `main`), and after a client-side navigation = **0 steps** (focus is
  already on the `h1`). The budgets must hold at 360, 768 and 1280 and are recorded with `e2e/support/steps.ts` (AC10).

## Acceptance criteria
- **AC1 (F3):** After a client-side navigation (landing → tutor, landing → student, any → 404, via links and via browser back), `document.activeElement` is the new page's `h1`
  and `document.title` is `<page title> · Eng-LMS` in the active language. On a first load, including a full reload of `/tutor` after a client navigation, focus stays on
  `body` (on the shells the skip link is the first Tab stop). Switching the language updates the title without a navigation. Covered by component tests (including one
  lazy route and the reload case) and an E2E check at the three mandatory viewports.
- **AC2 (F5):** `ui/SegmentedControl` exists with the states, keyboard behaviour, accessible group name, 44 px segments, a unit test and a clean axe test listed in scope 2, and
  appears in `/dev/ui` in vi and en. The selected segment shows the check icon and the accent-subtle background (screenshots of both locales selected).
- **AC3 (F5):** `LanguageSwitcher` uses `SegmentedControl` in both shells and on the landing page. Switching still changes every visible string and `<html lang>`, the choice
  survives a reload (localStorage, as in T-M1.3 AC5), and the endonyms keep their `lang` attribute. The T-M1.3 unit tests (`app.test.tsx`) and the T-M1.6 E2E smoke
  (`smoke.spec.ts`) are adapted to the `radio`/`aria-checked` semantics and still assert the checked state (adapted, not weakened).
- **AC4 (F9):** Loading skeletons appear only after 150 ms (component tests with fake timers show none at 149 ms and one at 150 ms); the region is `aria-busy` with its label
  from 0 ms. The reserved size prevents layout shift: CLS ≤ 0.05 (design-system §6 item 7; ideally 0), measured in the E2E with a `PerformanceObserver('layout-shift')`
  on a throttled first load of `/tutor`, `/student` and `/` (recorded in the evidence).
- **AC5 (F9):** Field errors show a decorative icon before the message; the `TextField` tests still find the error by its accessible description, the axe test is clean,
  and the contrast script covers the icon colour on its background.
- **AC6 (N1–N4):** The 404 link, the shell home link and the skip link each measure ≥ 44 px block size at 360/768/1280 (Playwright `boundingBox` in the E2E at the three
  projects, recorded). `RouteLoading` is block-level, with the header-shaped skeleton on shell paths and the page-only skeleton elsewhere (scope 5 N3). The route error page shows the request-ID sentence only when a request ID is shown; both strings exist in vi and en.
- **AC7 (QA F-1):** After `pnpm build`, no `dev` namespace string (vi or en) appears in `dist/` (a grep in the evidence for unique strings: the en "Component gallery",
  the en "UI components and their states" and the vi gallery title, and the `/dev/ui` title, plus the manifest check that `/dev/ui`
  is still absent). In `pnpm dev`, `/dev/ui` still shows its translated strings. The completeness test still compares the `dev` namespace.
- **AC8 (QA F-2):** `pnpm lint` fails on fixtures with `window.fetch(`, `globalThis.fetch(` and `self.fetch(` in `src/features/` (negative demo in the evidence) and passes
  for the same code in `src/lib/api/`. The bare `fetch(` and `react-aria-components` rules still fail as before.
- **AC9 (DEC-058 F3):** The console guard catches an error raised 300 ms after the test body's last action (the permanent expected-failure self-test runs in the laptop
  project and passes as an expected failure); the other guard self-tests stay green; the added settle is ≤ 500 ms per test, and the E2E wall time before/after is recorded.
- **AC10:** `./scripts/gate.sh` is green locally (log in the evidence via `ENGLMS_TASK=T-M1.9`) and CI is green (7 checks); vi + en are complete; screenshots at 360×740,
  768×1024 and 1280×800 of the landing page, both shells, 404, `RouteLoading` (a throttled load) and `/dev/ui`'s `SegmentedControl` and field-error entries, in vi and en; the
  docs in scope are updated; the UX step budgets (design notes) are recorded with `e2e/support/steps.ts` at the three viewports; `evidence/T-M1.9/summary.md` maps each
  AC to its proof.

## Test plan
- Implementation: component tests for the route announcement (first load vs navigation, a lazy route, the title in both locales and after a language change);
  `SegmentedControl` unit + keyboard + axe tests; `LanguageSwitcher` (adapted T-M1.3 tests); skeleton delay with fake timers; `FieldErrorMessage` icon + accessible
  description; the error-copy variants; the i18n completeness test; lint negative fixtures (run and removed, output in the evidence); E2E: route focus/title and the 44 px
  target measurements at the mandatory viewports, and the late-error guard self-test.
- Independent QA focus: keyboard-only walk of `/`, `/tutor`, `/student`, a 404 and back navigation in vi and en at 360/768/1280 (focus lands on the `h1`, titles
  correct, skip link first on a fresh load); the switcher with keyboard and pointer, and with a screen-reader-style check of its name/state (accessibility tree); throttled
  loads (Chrome DevTools "Slow 4G" or a delayed `/api/v1/meta`) to see the delay and no layout jump; `dist/` greps for dev strings; the lint loophole fixtures; a late
  console error in a scratch spec. Exploratory charter: anything that makes focus jump unexpectedly (initial load, a language change, a failed lazy load) or a title stuck
  in the other language.
- **UX review** (ux-reviewer) is required at G3 (UI PR): the new component against design-system §3, all states, the step budgets above, and the screenshots.

## Evidence required
`evidence/T-M1.9/summary.md` (AC → proof), the gate log, the lint negative demo (AC8), the `dist/` grep (AC7), the 44 px measurements (AC6), the E2E wall times and the
self-test run (AC9), the step-budget records and the CLS measurement, the screenshots listed in AC10 under `evidence/T-M1.9/screenshots/` (the T-M1.3/T-M1.6
precedent; the `/dev/ui` ones are taken from `pnpm dev`, because the packaged build that `e2e-run.sh` serves has no `/dev/ui`), the CI run link, the QA report (on `qa/T-M1.9`) and the UX review
(`evidence/T-M1.9/review/ux.md`, committed on the next docs branch).

## Docs to update
design-system.md §3 · accessibility.md (checklist note) · frontend-architecture.md (dev namespace registration, route-title convention) · `progress.json` and the evidence summary.

## Risks and assumptions
- R-06 (framework habits): verify RAC `ToggleButtonGroup` and React Router 8 (8.4.0) APIs in their docs for the pinned versions.
- Focus management with lazy routes and React 19 strict-mode double effects can move focus twice or too early. The app renders under `StrictMode`, but the shared test
  helper (`web/src/test/render.tsx`) and `app.test.tsx` do not today: wrap the render helper (or at least the route-announcement tests) in `<StrictMode>`.
- A fixed settle in the console guard slows every E2E test; keep it ≤ 500 ms and record the wall time. If a deterministic idle signal works, prefer it.
- If oxlint lacks `no-restricted-properties`, scope 7's fallback must still run inside `pnpm lint` (so CI enforces it) and have its own negative demo.

## Commands (reproducible)
```bash
source ~/.nvm/nvm.sh && nvm use 24 && corepack enable
git checkout develop && git pull --ff-only && git checkout -b feature/T-M1.9-web-follow-ups
cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget
cd .. && ./scripts/dev-up.sh && ./scripts/e2e-run.sh
ENGLMS_TASK=T-M1.9 ./scripts/gate.sh
cd web && pnpm dev   # /dev/ui screenshots (SegmentedControl, field error) at 360/768/1280, vi + en
```
