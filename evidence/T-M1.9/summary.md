# T-M1.9 evidence summary: web a11y/UX follow-ups

Packet: `docs/tasks/T-M1.9-web-follow-ups.md` · Branch: `feature/T-M1.9-web-follow-ups` (from develop `5c78168`) · PO start: DEC-072 ·
Implementer: frontend-implementer agent (this summary was written by the LC from the implementer's report, because the harness blocked the subagent from writing it).

## Commits
| SHA | Commit |
|---|---|
| `a7adbcb` | feat(ui): SegmentedControl, DelayedSkeleton, field error icon, h1 focus target |
| `e2fa24b` | feat(web): route focus and titles, SegmentedControl language switcher, loading and error fixes, dev strings out of prod |
| `b5aada9` | chore(web): lint `window.fetch`, `globalThis.fetch` and `self.fetch` outside lib/api |
| `fce3024` | test(e2e): late console errors, route focus/titles, 44 px targets, loading CLS, step budgets |
| `76fb26a` | docs(frontend): SegmentedControl, skeleton delay, route focus/title convention, dev namespace registration |
| `21e6167` | chore(evidence): gate log, negative demos, measurements, screenshots |

## AC → proof
| AC | Proof |
|---|---|
| AC1 route focus + titles | `web/src/app/routeAnnouncement.test.tsx` (under `StrictMode`): a lazy route, student, 404, back ×2, a reload keeps focus on `body`, a hash change is ignored, the title follows a language change. Disabling the focus call fails 4 tests; removing the first-load guard fails 7. `e2e/tests/route-focus.spec.ts`: vi and en at 360/768/1280. |
| AC2 SegmentedControl | `web/src/ui/SegmentedControl.test.tsx`: roles (`radiogroup`/`radio` + `aria-checked`), check icon, keyboard, disabled, hover/pressed, 3 axe runs. Screenshots `screenshots/*/devui-segmented-*` (vi, en, focus). 44 px segments (`records/*/ac6-target-sizes.json`). |
| AC3 LanguageSwitcher | `web/src/app/app.test.tsx` asserts `radio`/`aria-checked` on both segments before and after the switch, and `lang`; `e2e/tests/smoke.spec.ts` does the same and checks the choice survives a reload. |
| AC4 150 ms delay, CLS | Fake-timer tests: nothing at 149 ms, the skeleton at 150 ms (`DelayedSkeleton`, `RouteLoading`, `WorkspaceName`); the region is busy and labelled from 0 ms. CLS ≤ 0.0015 (limit 0.05): `records/*/ac4-cls-{landing,tutor,student}.json`. The load is slowed by holding the lazy chunk and delaying `/api/v1/meta` 700 ms (stable in CI, instead of network emulation). |
| AC5 field error icon | `web/src/ui/TextField.test.tsx`: the accessible description is still exactly the text; the icon is `aria-hidden`. Contrast (`web/scripts/contrast-check.mjs`): 6.54:1 on surface, 6.21:1 on the page background. |
| AC6 N1–N4 | Skip link, shell home link, 404 link and switcher segments are 44 px at the three projects (`records/*/ac6-target-sizes.json`, Playwright `boundingBox`). `RouteLoading.test.tsx`: the shell (header-shaped) vs page-only skeletons. `RouteError.test.tsx`: both error copies (vi + en). |
| AC7 dev strings | `dist-grep-ac7.txt`: 12 `dev` strings are absent from `dist/` (the develop build shipped them); no `src/dev/` manifest entry. `DevUiPage.test.tsx` and the completeness test still cover `dev`. |
| AC8 fetch lint | `negative-ac8-lint.txt`: the old config missed all three forms; oxlint's built-in `no-restricted-properties` now fails on `window.fetch(`, `globalThis.fetch(`, `self.fetch(` (plus the existing bare `fetch(` and RAC rules) in `src/features/`, and the same code passes in `src/lib/api/`. Fixtures removed. |
| AC9 late console errors | `ac9-late-error.log`: the permanent self-test (`e2e/tests/guards.spec.ts`, laptop) passes as an expected failure; with the settle at 0 and screenshots off it fails ("Expected to fail, but passed"). Wall times (`ac9-e2e-wall-times.txt`): the same 28 tests 10.0 s before, 10.9/10.7 s after; the full suite 62 passed, 10 skipped in 17.9 s. |
| AC10 gate, screenshots, budgets | `gate-20260928T040335Z.log`: PASS (12 steps, 113 s) at `76fb26a`. 57 screenshots under `screenshots/` (19 per viewport) (360×740, 768×1024, 1280×800; vi + en; `/dev/ui` ones from `pnpm dev`, `devui-screenshots.log`). Step budgets `records/*/steps-{switch-language,reach-main}.json`: all within budget. Docs: design-system §3, accessibility §2, frontend-architecture §3–§4. CI: see the PR. |

## Implementation choices
- **Skeleton delay:** `ui/DelayedSkeleton` (default 150 ms), hiding the skeleton with `visibility: hidden` until the delay so the region keeps its size.
- **Lint:** oxlint `no-restricted-properties`, off for `src/lib/api/**`; no new linter.
- **Console-guard settle:** a fixed 500 ms wait in the fixture teardown, skipped when no page is open. Finding: the old guard caught late errors only by accident, because `screenshot: 'only-on-failure'` takes a temporary screenshot (~1.4 s) between the body and the teardown.
- **Route focus:** a new root layout keeps a ref of the last path; pages sit under a pathless error route, so a failed navigation also focuses the error page's `h1`.
- **Titles** reuse each page's `h1` text through `app.documentTitle`; `error.description` is the copy without the request-ID sentence, `error.descriptionWithRequestId` the other.
- **404 link:** a plain link at 44 px (`ui/` has no button-link; adding one is out of scope).

## Open questions from the implementer (not built)
1. Switcher keyboard: arrows move focus, Space selects, Tab lands on the first segment (RAC toolbar behaviour); the WAI-ARIA radio-group pattern differs (Tab to the checked radio, arrows select). For the UX review.
2. The check icon appears only on the selected segment, so segment widths shift slightly on selection.
3. The landing page's loading skeleton has no row for its language switcher, so the heading lands ~70 px below the skeleton line (not a layout shift).
4. On-failure screenshots add ~0.9 s per test (possible harness speed-up later).
5. The shared chunk is named `routeAnnouncement-*.js` (cosmetic); the budget is 144.9 KB gz (+2.9 KB vs develop, limits 200/300).

## Reviews
QA (qa-evaluator) and UX (ux-reviewer) at G3: see the PR comments; the QA record goes on `qa/T-M1.9`, the UX record to `evidence/T-M1.9/review/ux.md` on the next docs branch.
