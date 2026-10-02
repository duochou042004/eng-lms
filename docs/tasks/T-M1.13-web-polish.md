# T-M1.13: Web polish from the T-M1.9 reviews

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **done** (merged `625c8fc`, PR #25; DEC-079) (G0: DOCS-REVIEW on PR #24, recorded in `evidence/T-M1.13/review/docs.md`; dependencies merged; PO start signal given, DEC-077) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M1.13-web-polish` (from `develop`) |
| Depends on | T-M1.9 merged (`e20e8ec`) |
| Estimate | ≤ 1 agent-day |
| Trace | DEC-073 (T-M1.9 G3 S4 deferrals); sources: `evidence/T-M1.9/review/ux.md` (UX F-1, F-2, F-3, F-4) and `evidence/T-M1.9/qa/report.md` (QA F1, F2, F3); design-system §3 (`SegmentedControl`), interaction-states §1 (skeletons match the final layout), frontend-architecture §1 (no `fetch` outside `lib/api`), NFR-A11Y-01, NFR-I18N-01 |

## Goal
Close the five S4 polish items the T-M1.9 QA and UX reviews deferred, before M2 reuses these pieces: document the `SegmentedControl` keyboard model, keep its segment widths
stable when the selection changes, make the landing page's loading skeleton match the page, give the route error page a way back to the start page, and close the last two
`fetch` lint loopholes.

## Scope
- In:
  1. **Keyboard model note (UX F-1 / QA F1).** design-system §3 states that `SegmentedControl` uses the React Aria toolbar keyboard model **on purpose** (one Tab stop; arrows
     move focus; Space/Enter select; a forward Tab lands on the last-focused segment, otherwise the first; Shift+Tab lands on the last; never necessarily the checked one), why (selection on Space suits a language switch, which redraws the UI),
     and that view switchers where arrows should select must use React Aria `RadioGroup` instead. No behaviour change; no custom key handling (ADR-0013).
  2. **Stable segment widths (UX F-2 / QA F2).** Selecting a segment no longer moves the boundaries between segments. Two things change a segment's width today: the check
     icon (20 px + 4 px gap) and the label weight (500 → 600, `SegmentedControl.module.css`), together 25–26 px. Both must be neutralised: always render the icon slot and hide
     it with `visibility: hidden` when not selected, **and** either reserve the semibold label width (e.g. a hidden, `aria-hidden` bold copy of the label stacked in the same grid
     cell) or drop the weight change and update design-system §3 to match. Equal-width columns alone don't work (they follow the widest label, which grows when selected).
     The selected state stays check icon + accent-subtle background (not colour alone).
  3. **Landing loading skeleton (UX F-3).** On `/`, `RouteLoading`'s page-only skeleton includes a 44 px, end-aligned toolbar row for the language switcher, so the heading
     appears where its skeleton line was (no ~70 px jump). Shell paths keep the header-shaped skeleton; the 404 keeps the page-only one.
  4. **Error page way back (UX F-4).** The route error page offers a quiet "go to the start page" link after the reload button: a react-router `Link to="/"` with the
     `homeLink` class from `web/src/app/routes/Page.module.css` (tokens only, 44 px, as on the 404), text `notFound.home` (vi "Về trang đầu", en "Go to the start page"); no new
     i18n keys. The link is not shown when the failed route is `/` itself (it would go nowhere).
  5. **Two more fetch forms (QA F3).** `pnpm lint` also fails on `globalThis.window.fetch(` and `document.defaultView.fetch(` (and `?.fetch(`, `!.fetch(`) outside
     `src/lib/api/**`, without flagging unrelated members such as TanStack Query's `refetch`/`fetchQuery`. Oxlint only; no new linter without a DEC.
- Frontend docs this packet may change: design-system §3 (items 1–2), interaction-states §1 only if the landing skeleton needs a note. Nothing else.

## Out of scope (explicit)
- The T-M2.4 notes (DEC-073: loading feedback on a slow client-side lazy navigation; the "class name" copy in `meta.error`; the duplicated brand in the shell header); new routes
  or `ui/` components; a keyboard-model change of `SegmentedControl`; the flaky backend test (T-M1.14); `backend/`, `api/`, CI, `scripts/`, `qa/**`.

## Guardrail answers (scope.md §6)
1. Trace: DEC-073 and the review records above. 2. No drift towards excluded scope (UI polish and lint only). 3. No tutor setup. 4. Weekly use: the language switcher, loading
and error states are seen by every user. 5. No exam or curriculum semantics; all copy is neutral and in vi + en.

## Design notes
- `web/src/ui/SegmentedControl.tsx` / `.module.css` (item 2), `web/src/app/routes/RouteLoading.tsx` (item 3), `web/src/app/routes/RouteError.tsx` (item 4),
  `web/.oxlintrc.json` (item 5: oxlint's `no-restricted-properties` matches `object.property` only when the object is an identifier, so a nested member such as
  `globalThis.window.fetch` is missed; oxlint 1.85 has **no** `no-restricted-syntax`. The reviewer verified that a property-only entry `{ "property": "fetch" }` catches every
  listed form plus computed, destructured and sequence forms, and flags no current code outside `lib/api` (`refetch`/`fetchQuery` are not `.fetch`); use it, keep the
  `src/lib/api/**` override, and record the false-positive check in the evidence).
- `SegmentedControl.test.tsx` asserts that the unselected segment has no `svg`; with an always-rendered slot this assertion is replaced like-for-like (the unselected icon is
  present but not visible; the selected one is visible), which is not a weakened test.
- The `/dev/ui` measurement (AC2) runs against `pnpm dev` (`E2E_BASE_URL=http://localhost:5173`) as a scratch script with a log, as T-M1.9 did (`devui-screenshots.log`), or as a
  spec skipped unless the base URL is the dev server: the packaged build that `e2e-run.sh` serves has no `/dev/ui`. The language switcher is measured in the normal E2E.
- **UX step budgets:** unchanged from T-M1.9 (language switch = 1 step; reach main content = 1 on a fresh shell load, 0 on landing/404/error, 0 after navigation); the error
  page's new link makes "leave the error page for the start page" = 1 step. Record with `e2e/support/steps.ts` at 360/768/1280.

## Acceptance criteria
- **AC1 (F-1):** design-system §3 contains the keyboard-model statement of scope 1; the `SegmentedControl` keyboard tests are unchanged and green.
- **AC2 (F-2):** an E2E measurement at 360/768/1280 (Playwright `boundingBox`) shows each segment's inline start and size are identical (±1 px) before and after changing
  the selection, for the language switcher and the 3-option `/dev/ui` example (dev build, recorded); the check icon still appears only visibly on the selected segment
  (`aria-hidden` either way) and the component unit/axe tests stay green.
- **AC3 (F-3):** on a slowed first load of `/` at the three viewports, the heading's block-start position differs from its skeleton line by ≤ 8 px (recorded), and CLS stays ≤ 0.05
  (design-system §6 item 7); the shell and 404 skeletons are unchanged (`RouteLoading.test.tsx`).
- **AC4 (F-4):** the route error page (reached by a failed lazy load on a client navigation, as in T-M1.9; the pathless-child boundary inside the root layout) shows the reload
  button and a ≥ 44 px "go to the start page" link in vi and en; activating the link lands on `/` with focus on its `h1` (T-M1.9 route focus); the link is absent when the failed
  route is `/`; `RouteError.test.tsx` covers both languages, the with- and without-request-ID copies, and the link's presence/absence; axe is clean.
- **AC5 (QA F3):** `pnpm lint` fails on fixtures with `globalThis.window.fetch(`, `document.defaultView.fetch(`, `document.defaultView?.fetch(` and `document.defaultView!.fetch(` in `src/features/`, still fails on
  the T-M1.9 forms, passes for the same code in `src/lib/api/`, and passes on the current code base (no false positives such as `refetch`, `fetchQuery`); negative demo in the evidence.
- **AC6:** `./scripts/gate.sh` green (`ENGLMS_TASK=T-M1.13`, log in the evidence); CI 7/7; screenshots at 360×740, 768×1024, 1280×800 in vi and en of the switcher (both selections),
  the landing loading state and the error page; step budgets recorded; `evidence/T-M1.13/summary.md` maps each AC to its proof.

## Test plan
- Implementation: unit tests (SegmentedControl, RouteLoading, RouteError), E2E measurements (AC2, AC3, AC4), lint fixtures (AC5, removed after the demo).
- Independent QA focus: keyboard-only and pointer use of the switcher at the three viewports (no boundary movement), throttled landing load, a failed lazy load → error page →
  start page in vi and en, lint loophole probes beyond the listed forms. **UX review** (ux-reviewer) is required at G3 (UI PR).

## Evidence required
`evidence/T-M1.13/summary.md`, the gate log, the lint negative demo, the width and position measurements, the screenshots, the step-budget records, the CI links, the QA report (on
`qa/T-M1.13`) and the UX review (`evidence/T-M1.13/review/ux.md`, on the next docs branch).

## Docs to update
design-system §3 · `progress.json` · the evidence summary.

## Risks and assumptions
- A property-only `fetch` lint rule could flag legitimate members; AC5 requires the whole code base to stay clean and the choice to be recorded.
- The ±1 px width check (AC2) fails unless both the icon slot and the label weight are neutralised (scope 2); sub-pixel font rounding is why ±1 px, not 0.
- Reserving the icon slot widens the unselected segments slightly; the 360 px header must still not overflow (the T-M1.6 horizontal-scroll guard covers it).

## Commands (reproducible)
```bash
source ~/.nvm/nvm.sh && nvm use 24 && corepack enable
git checkout develop && git pull --ff-only && git checkout -b feature/T-M1.13-web-polish
cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget
cd .. && ./scripts/dev-up.sh && ./scripts/e2e-run.sh
ENGLMS_TASK=T-M1.13 ./scripts/gate.sh
cd web && pnpm dev   # /dev/ui measurements and screenshots
```
