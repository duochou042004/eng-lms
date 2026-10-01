# T-M1.13 evidence summary: web polish from the T-M1.9 reviews

Packet: `docs/tasks/T-M1.13-web-polish.md` (G0 on PR #24, `6c8d1d4`) · Branch `feature/T-M1.13-web-polish` (from `develop` `6c8d1d4`) · PO start: DEC-077 · Trace: DEC-073.
Implementer: frontend-implementer agent (this summary was written by the LC from the implementer's report, because the harness blocked the subagent from writing it).

## Commits
| SHA | Subject |
|---|---|
| `e5a195e` | feat(ui): stable SegmentedControl segment widths; document its keyboard model |
| `60fdbb3` | feat(web): landing loading toolbar row; start-page link on the route error page |
| `197a430` | chore(web): lint any .fetch member outside src/lib/api |
| `67177f8` | test(e2e): segment widths, landing skeleton position, error page way back |
| `1fa265f` | docs(evidence): T-M1.13 gate log, records and screenshots |

## AC → proof
| AC | Proof |
|---|---|
| AC1 keyboard model | design-system §3 `SegmentedControl` paragraph: the toolbar model is deliberate (one Tab stop; arrows move focus; Space/Enter select; forward Tab to the last-focused segment or the first; Shift+Tab to the last; not necessarily the checked one), why (a language switch redraws the UI), and "use React Aria `RadioGroup`" where arrows should select. No behaviour change; the keyboard test in `web/src/ui/SegmentedControl.test.tsx` is unchanged and green. |
| AC2 stable widths | `e2e/tests/polish.spec.ts` (Playwright `boundingBox`, ±1 px): the language switcher on `/` and `/tutor`, pointer and keyboard selection, 360/768/1280: `records/*/ac2-switcher-widths-{landing,tutor}.json` (identical x and width both ways). The 3-option `/dev/ui` example on the dev server (`E2E_BASE_URL=http://localhost:5173`; skipped on the packaged build): `devui-ac2-widths.log` (6/6), `records/*/ac2-devui-widths-{vi,en}.json`. Each measurement asserts the check icon is visible only on the checked segment. Before-demo `before-ac2-ac3-e2e.log`: develop's component fails with a 26 px size change. Unit: the unselected icon is present, `aria-hidden`, not visible; the selected one is visible (the like-for-like replacement of the old "no svg" assertion); the reserve label copy is `aria-hidden` and not in the accessible name; axe green. |
| AC3 landing skeleton | `polish.spec.ts` AC3, vi and en at 360/768/1280 (Landing chunk held): the heading is 2 px from its skeleton line (limit 8), the switcher 0 px from its skeleton row, CLS ≤ 0.0011 (limit 0.05): `records/*/ac3-landing-skeleton-{vi,en}.json`. Before-demo: 70 px without the toolbar row. `RouteLoading.test.tsx`: the toolbar row only on `/` (44 px, end-aligned); the shell and 404 skeletons unchanged. The T-M1.9 CLS records still pass. |
| AC4 error page way back | `polish.spec.ts` AC4, vi and en at 360/768/1280: TutorShell chunk aborted, a client navigation from `/` shows the error page (pathless-child boundary, focus on its `h1`) with the reload button and a 44 px start-page link (`records/*/ac4-error-page-*.json`), axe clean, no horizontal scroll; the link lands on `/` with focus on its `h1` in 1 step (pointer and keyboard); the link is absent when `/` fails. `RouteError.test.tsx`: vi and en × with/without request ID, link presence (href `/`, `homeLink`, after the reload button), absence on `/`, focus after activation, axe. Removing the `/` condition fails 2 tests. |
| AC5 fetch lint | `negative-ac5-lint.txt`: develop's config passes the four listed forms; after the change `pnpm lint` fails on `globalThis.window.fetch(`, `document.defaultView.fetch(`, `?.fetch(`, `!.fetch(` in `src/features/` and on computed, destructured and sequence probes, still fails on the T-M1.9 forms, and does not report `refetch`, `fetchQuery`, `prefetchQuery`, `fetchNextPage`; the same code passes in `src/lib/api/`; the current code base passes. Fixtures deleted (never committed). |
| AC6 | `gate-20260928T121046Z.log`: **PASS** (12 steps, 145 s; E2E 86 passed, 16 skipped: the dev-only `/dev/ui` specs and laptop-only guards). Screenshots `screenshots/{phone-small,tablet,laptop}/`: `ac2-switcher-{landing,tutor}-{vi,en}.png`, `ac2-devui-segmented-{vi,en}.png`, `ac3-landing-loading-{vi,en}.png`, `ac4-error-page-{vi,en}.png` (plus the unchanged T-M1.9 specs' screenshots and records, kept as regression evidence). Step budgets: language switch 1, reach main 1/0/0 and 0 on the error page, error page → start page 1 (`records/*/steps-*.json`, `ac4-error-page-*.json`). CI: see the PR. |

## Choices
- **Width fix:** the check icon is always rendered and hidden with an inline `visibility: hidden` when unselected (as `DelayedSkeleton` does; testable in jsdom; CSSOM is allowed by the CSP). The label shares an `inline-grid` cell with an `aria-hidden`, hidden semibold copy, so each segment is always as wide as its selected label. The selected look (semibold + check + accent-subtle) is unchanged.
- **Lint:** one property-only `no-restricted-properties` entry `{ "property": "fetch" }` replaces the three object-specific entries; `no-restricted-globals` and the `src/lib/api/**` override are unchanged. False-positive check: a fixture with `refetch`, `fetchQuery`, `prefetchQuery`, `fetchNextPage` is not flagged; a grep finds only `meta.refetch()` outside `lib/api` (not flagged).
- **AC4 E2E:** aborting a chunk makes the browser log `Failed to load resource: net::ERR_FAILED`; the test removes exactly that message from the console guard and asserts it was logged; any other console error still fails.

## Open questions (for the UX review)
1. The always-rendered (hidden) icon slot places unselected labels about 12 px right of centre (`screenshots/phone-small/ac2-devui-segmented-vi.png`).
2. The hidden label copy appears in the DOM text twice; a future `getByText` query could match it. No current test is affected.
