> Recorded by the LC from the fresh qa-evaluator's returned report (the harness blocks subagents from writing files). Verdict posted on PR #25 at `3ff781c` and re-posted for the merged head `5c169fb` (adds only develop's T-M1.15 merge and `progress.json`). Merged as `625c8fc`. S4 dispositions: the post-merge docs branch (decision log). The scratch paths below are the evaluator's session scratchpad (not kept); its spec is `qa/e2e/T-M1.13.spec.ts`.

I ran T-M1.13 black-box at head `3ff781c` and every AC holds. I found no S1, S2 or SCOPE issues, only four S4 notes, so the verdict is PASS. The repo is unchanged afterwards: `git status` is clean, the probe files and my scratch app on 8080/8081 and Vite on 5175 are stopped. One process slip: a probe script was briefly copied into `e2e/`; I deleted it before finishing.

# QA report: T-M1.13 web polish (PR #25, branch `feature/T-M1.13-web-polish`, head `3ff781c`)
Evaluator: independent G3 QA, fresh context. Date: 2026-10-02.

## Method
- I planned from the packet's ACs and its "Independent QA focus". I did not read the implementation diff or the implementer's tests before drafting the verdict. Afterwards I read only the `SegmentedControl.test.tsx` and `RouteError.test.tsx` diffs, to confirm AC1's "keyboard test unchanged".
- My own Playwright spec and probes (`.../scratchpad/qa/pw/tests/qa.spec.ts`, `probe5–8.mjs`) ran against:
  - the packaged jar on :8080 at 360×740, 768×1024 and 1280×800;
  - the Vite dev server on :5175 for `/dev/ui`.
- Lint probes ran on a copy of `web/` in the scratchpad. Logs are `run1.log`, `run3.log` and `e2e-full.log`; screenshots are in `.../scratchpad/qa/pw/shots/`.
- Regression runs:
  - `./scripts/e2e-run.sh` on all 6 projects: **161 passed, 43 skipped, 0 failed**.
  - `pnpm test --run`: 86/86 passed. `pnpm typecheck`: OK. `pnpm lint`: clean.
  - CI on PR #25: 7/7 pass.
- I did not run `./scripts/gate.sh`. The implementer's gate log plus my runs of each step and CI cover it.

## Results per AC
| AC | Result | Evidence |
|---|---|---|
| AC1 keyboard model | PASS | design-system §3, lines 65–68, has the deliberate toolbar model: one Tab stop, arrows move focus, Space/Enter select, the Tab and Shift+Tab rules, the reason, and "use `RadioGroup`" where arrows should select. The keyboard test in `SegmentedControl.test.tsx` is untouched by the diff and green. Black-box: Tab into the group landed on the last-focused segment, not the checked one, as documented. |
| AC2 stable widths | PASS | Header switcher on `/`, `/tutor` and `/student` at 360/768/1280, selected by pointer click, Arrow+Space and Arrow+Enter: change in inline start and width is **0 px** in every case. Widths are vi 131 and en 105, both 44 px high. The check icon is `visible` only on the checked segment, `hidden` on the other, `aria-hidden` on both. Accessible names are exactly "Tiếng Việt" and "English" (the hidden copy is not doubled into the name). `/dev/ui` 3-option groups (normal, one disabled option, all disabled) in vi and en, pointer and keyboard: 0 px. See F-1 for the gallery's language example. |
| AC3 landing skeleton | PASS | `Landing` chunk held, vi and en at all three viewports: the skeleton heading line is at y=92 and the real `h1` at y=94, so **2 px** (limit 8). CLS is at most **0.0021** (limit 0.05), measured at 360. The toolbar row is 44 px high and end-aligned. The shell and 404 skeleton tests are green. See F-2. |
| AC4 error page way back | PASS | `TutorShell` chunk aborted on a client navigation from `/`, vi and en at all three viewports: the error `h1` gets focus. "Tải lại trang" / "Reload page" is followed by the link "Về trang đầu" / "Go to the start page" (`href="/"`, 44 px high, in DOM order after the button). Activating the link by keyboard Tab+Enter lands on `/` with focus on its `h1`. axe is clean and there is no horizontal scroll. Offline (`setOffline`) gives the same page, and the link works. With `/` failing, either by client navigation from `/tutor` or by a fresh load, the link count is **0** in vi and en. |
| AC5 fetch lint | PASS | 28 probe forms in `src/features/`. Flagged: the 4 listed forms (`globalThis.window.fetch(`, `document.defaultView.fetch(`, `?.fetch(`, `!.fetch(`), the T-M1.9 forms (`fetch(`, `window.fetch(`, `globalThis.fetch(`, `self.fetch(`), plus computed `["fetch"]` and template-literal keys, destructuring from `window` and from `globalThis`, the sequence form `(0, window.fetch)`, `.call`, `.bind`, an aliased `w.fetch`, and `frames.`/`parent.`/`top!.fetch`. No false positives on `refetch`, `fetchQuery`, `prefetchQuery`, `fetchNextPage`, `isFetching`, `fetchStatus` or `fetchData`. The same file in `src/lib/api/` gives no fetch report. The repo's own `pnpm lint` is clean. See F-3 for what is still not caught. |
| AC6 | PASS | E2E, unit tests, lint, typecheck and CI are green as listed above. The implementer's screenshots and records are present; my own screenshots cover 360/768/1280 in vi and en for the switcher, the landing loading state and the error page. |

## Standard checks
- **Keyboard only:** the switcher, the error-page link and the route focus all work without a mouse (above).
- **Viewports:** no horizontal scroll at 360 on `/`, `/tutor`, `/student`, the error page or `/dev/ui`. The 360 header with the reserved icon slots fits; the switcher spans x 17–253 in the shell header.
- **States:** loading (the skeleton), error (aborted chunk), offline, and the 404 skeleton unchanged. There is no data state in this UI-only task, so "empty" does not apply.
- **i18n:** all new copy appears in vi and en. The link text reuses the existing `notFound.home` strings.
- **axe:** clean on `/`, `/tutor`, `/student` and the error page at every viewport (WCAG 2.2 AA tags).
- **Isolation / SECRET-\*:** there are no student APIs in M1 (`/api/v1/student/me` and `/api/v1/student/assignments` return 404), and no `SECRET-` marker appears in any SPA or API response or in `web/dist`. `scripts/seed-e2e.sh` does not exist yet, so there is no QA world to seed. The student B vs A check does not apply at this milestone.
- **Scope:** the diff outside `evidence/` touches only the packet's files (`ui/SegmentedControl*`, `routes/RouteLoading*`, `RouteError*`, `Page.module.css`, `.oxlintrc.json`, design-system §3, `e2e/tests/polish.spec.ts`) plus `progress.json` and the handoff docs. None of the excluded items (the T-M2.4 notes, backend, CI, scripts) are touched. No SCOPE finding.

## Findings
| ID | Sev | AC | Summary |
|---|---|---|---|
| F-1 | S4 | AC2 (dev gallery only) | The `/dev/ui` "Ngôn ngữ"/"Language" example's segments get 24.5 px narrower when it switches the UI language. |
| F-2 | S4 | AC3 | The landing skeleton's switcher row is 30 px narrower than the real switcher. |
| F-3 | S4 | AC5 (beyond the listed forms) | Remaining lint gaps: a computed dynamic key, `Reflect.get`, and disable comments. |
| F-4 | S4 | AC2 | The hidden bold copy doubles each segment's `textContent`. |

**F-1.**
- Steps: dev server, `/dev/ui` at 360 and 1280. Click "English" in the 5th radiogroup, the language example in the "Nút chọn phân đoạn" section.
- Expected: segment boundaries stay put.
- Actual: widths go from 173/147 to 149/123 px, so the boundary moves 24.5 px (`run3.log`, "devui … 4 … worst 24.5").
- Cause (`probe5/6`): the segments are `flex: 1 0 auto` inside a column that stretches to its widest sibling, the 3-option group. That group's label width differs between vi ("Danh sách/Tuần/Tháng") and en ("List/Week/Month").
- So the shift comes from the language change in the gallery layout, not from the selection. The selection-only groups measure 0 px, and the real header switcher sits at its natural width and measures 0 px.
- Related: at 768 the whole top `/dev/ui` switcher relocates when the language changes (y 100→38, x 17→515) because the heading wraps differently. Its widths are unchanged.
- Fix if wanted: let the example size to its content (`align-self: flex-start`) in the gallery.

**F-2.**
- Steps: packaged app, hold the `Landing-*.js` chunk, load `/`.
- Expected: the skeleton matches the final layout (interaction-states §1).
- Actual: the skeleton row is x=136, w=208 at 360 (x=992, w=208 at 1280). The real switcher is x=106, w=238 and 46 px tall.
- The heading and vertical positions match (2 px), and CLS is at most 0.0021, so it passes AC3. The summary's "switcher 0 px from its skeleton row" holds for the vertical position only.

**F-3.**
- Steps: oxlint on `src/features/qaprobe/probe.ts`.
- Not flagged:
  - `const k = "fe" + "tch"; (window as any)[k](…)`
  - `Reflect.get(window, "fetch")(…)`
  - any file with a blanket `/* eslint-disable */` or `// oxlint-disable`. My first probe run reported nothing at all because of one such comment.
- `XMLHttpRequest`, `navigator.sendBeacon` and `EventSource` are also not covered. That is outside AC5 but against the intent of frontend-architecture §1.
- None of these are among the listed forms, and dynamic keys cannot be caught statically. Suggest a later chore: forbid disable comments outside `src/lib/api`, and add `XMLHttpRequest`/`EventSource` to `no-restricted-globals`.

**F-4.**
- Each segment's `textContent` is doubled ("Tiếng ViệtTiếng Việt", "ListList").
- Accessible names are exact, so `getByRole(…, {name})` works, but a future `getByText` or `textContent` assertion would match twice.
- This confirms the implementer's open question 2. Note it for M2 test authors.

QA-VERDICT T-M1.13: PASS