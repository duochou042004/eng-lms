# T-M1.16 FE notes (items 1–5, 9): AC → proof

Frontend implementer's input for the LC's `summary.md`. Runs on the worktree of `feature/T-M1.16-review-polish` (base `e855d18`), oxlint 1.86.0,
Playwright 1.63.0, viewports phone-small 360×740, tablet 768×1024, laptop 1280×800.

## AC1 (item 1): switcher skeleton widths

- Change: `RouteLoading` renders `SwitcherSkeleton` in the landing toolbar row and the shell header. The skeleton is a 44 px block (`--size-control-md`) whose
  inline size comes from an invisible, zero-height row of the two endonyms (`t('language.vi')`, `t('language.en')`) laid out in the switcher's own chrome
  (`Page.module.css` `.switcherSizer`: per segment `--space-3` inline padding plus the `--size-icon` check slot and its `--space-1` gap, the semibold label weight,
  `--border-width` around the group and between the segments, as in `SegmentedControl.module.css`). No magic number; the row stays 44 px; the brand, title and
  404 skeleton shapes are unchanged.
- Measurement (slowed first load: the route chunk held until the skeleton is photographed, `/api/v1/meta` delayed 700 ms), `e2e/tests/loading.spec.ts`, records
  `records/<project>/t-m1.16-ac1-switcher-{landing,tutor,student}.json`:

  | Viewport | Page | Skeleton px | Switcher px | Inline-size Δ (≤ 8) | Inline-end Δ (≤ 1) | CLS (≤ 0.05) |
  |---|---|---|---|---|---|---|
  | 360 | landing / tutor / student | 238 / 238 / 238 | 238 / 238 / 238 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0.00057 / 0.00023 |
  | 768 | landing / tutor / student | 238 / 238 / 238 | 238 / 238 / 238 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0.00010 / 0.00004 |
  | 1280 | landing / tutor / student | 238 / 238 / 238 | 238 / 238 / 238 | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0.00006 / 0.00003 |

  (Before: `13rem` = 208 px, a 30 px gap.) The test asserts both limits; the T-M1.13 AC3 landing test (heading Δ, CLS) still passes in vi and en.
- Unit: `RouteLoading.test.tsx` new case (landing and shell): the sizer is `aria-hidden` and holds both endonyms; the block is `100%` × `--size-control-md`. 15 files /
  88 tests green.
- Screenshots (loading states): `screenshots/<project>/ac3-landing-loading-{vi,en}.png` (landing), `route-loading-{tutor,student,landing}-vi.png` and
  `route-loading-tutor-en.png` (shell), for phone-small, tablet and laptop. Loaded pages: `landing-{vi,en}.png`, `tutor-{vi,en}.png`, `student-{vi,en}.png`.
- Log: `fe-e2e-mandatory.log` (86 passed, 19 skipped (the 9 dev-server-only cases and the guards spec's laptop-only cases on phone-small and tablet); the one `✘` is the guards spec's expected failure).

## AC2 (item 2): the `/dev/ui` example keeps its width

- Change: `DevUiPage.tsx` puts the gallery's `LanguageSwitcher` example in a `display: flex` row (`.fit`), so it sizes to its content instead of stretching with
  the `Stack` column (whose width follows the 3-option examples' labels, i.e. the UI language). No `ui/` change.
- Proof: `ac2-devui-widths.log` (dev server :5173, new test in `polish.spec.ts`, records `records/<project>/t-m1.16-ac2-devui-switcher.json`): vi → en → vi at 360,
  768, 1280: "Tiếng Việt" offset 1 px / 131 px wide, "English" offset 132 px / 105 px wide in all three states (Δ 0). Before (develop's `DevUiPage.tsx`, same log):
  fails at all three viewports, segment 0's inline size changes by 24.5 px. Screenshot: `screenshots/<project>/t-m1.16-ac2-devui-switcher-en.png`.

## AC3 (items 3–4): accessible names, docblock, dead markup

- `polish.spec.ts` `segmentBoxes` records each segment's accessible name (`accessibleName()`, read from the ARIA snapshot) instead of `textContent`. Records
  `records/<project>/ac2-switcher-widths-{landing,tutor}.json` now show `"Tiếng Việt"` / `"English"` once (before: `"Tiếng ViệtTiếng Việt"`).
- `SegmentedControl.tsx` docblock: "Querying: the label text is in the DOM twice … Query segments by role and accessible name".
- `data-visible` removed from the check icon (the inline `visibility` stays); `grep -rn data-visible web/src e2e` → no hits. `SegmentedControl.test.tsx` unchanged
  and green (incl. its axe case).

## AC4 (item 5): lint loopholes

- `web/.oxlintrc.json`: `no-restricted-globals` += `XMLHttpRequest`, `EventSource`; property-only `no-restricted-properties` += `XMLHttpRequest`, `EventSource`,
  `sendBeacon` (the `fetch` pair pattern); the `src/lib/api/**` override turns both off, as before. `sendBeacon` is not a global, so it has no globals entry.
- Directives: oxlint 1.86 has no rule that bans them; its `no-warning-comments` is silenced by a file-wide `/* oxlint-disable */` itself (probe, section 0 of the
  demo). So one grep step: `web/scripts/no-lint-directives.sh`, run by `pnpm lint` after oxlint. Anchored on the directive forms (right after `//`, `/*` or at the
  start of a block-comment line); prose and strings containing the word do not match; `src/lib/api/` is skipped (AC4 "passes for the same code in src/lib/api/").
- Proof: `ac4-lint-negative.txt`: before (develop config) the six network forms and the directives pass; after, `pnpm lint` fails on all six forms and on each of
  four directive forms (`eslint-disable-next-line`, `oxlint-disable-line`, `/* oxlint-disable */`, a multi-line `eslint-disable` block), still reports the T-M1.13
  fetch probes, passes for the same files in `src/lib/api/` plus accepted forms (dynamic key, `Reflect.get(window, 'fetch')`, a string `'eslint-disable'`), and
  passes on the code base. Fixtures created and deleted by the demo script; none committed.

## AC7 (item 9): deterministic keyboard step budget

- `route-focus.spec.ts` "switch the language from any page": `await expect(h1(page, COPY.vi.landing)).toBeVisible()` after `page.goto('/')`, before the first Tab.
- `ac7-step-budget-repeat.log`: `--project=phone-small --project=tablet --project=laptop --repeat-each=20 -g "switch the language"` → 60 passed, 0 failed
  (retries 0).
- Same race elsewhere: none found. The grep at the end of the log lists every `goto` and Tab; each other first Tab follows a wait for lazy content:
  route-focus 124 (shell h1 visible), 176 and 189 (`main` visible: `main` exists only in the lazy shells/pages, not in `RouteLoading`), 198 (the loop's
  `link.evaluate` auto-waits for the landing link before any Tab); polish 279 and 297 (after the error page's h1 is focused).

## Other checks (FE)

`pnpm lint`, `typecheck`, `test --run` (88), `build`, `budget` (student 145.1 KB, tutor 145.2 KB gz), `contrast` (32 pairs): pass. e2e `pnpm typecheck`: pass.
Accessibility: the new skeleton parts are `aria-hidden` and `visibility: hidden` (no focusable or announced content); the loading region's label and `aria-busy`
are unchanged; RouteLoading's axe case green. Step budgets: switch language 1/1 (pointer/keyboard), reach main 1/0/0 (unchanged). Full `gate.sh` not run (LC).
