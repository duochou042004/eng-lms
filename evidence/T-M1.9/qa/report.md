# QA Report — T-M1.9 Web a11y/UX follow-ups
Verdict: **PASS WITH MINOR** · Build: `92e213b` (PR #20, `feature/T-M1.9-web-follow-ups`) · Date: 2026-09-28 · Evaluator: independent qa-evaluator, fresh context

> Recorded by the LC from the evaluator's returned report text: the harness blocks subagents from writing report files. The content is unchanged in substance.
> The evaluator's QA spec is committed as `qa/e2e/T-M1.9.spec.ts` (one non-null assertion added by the LC so it typechecks under `qa/tsconfig.json`; no behaviour change) and its plan as `qa/plans/T-M1.9.md`.

Independence: the plan and the verdict draft were written before reading the diff or the implementer's tests. The diff was read only afterwards, for the scope check and the AC3 "adapted, not weakened" check.

## Environment
- Scratch clone of `92e213b`, with `.env` copied from the working tree. Node 24.21, pnpm 12.6, JDK 25.
- App: the packaged jar from `scripts/e2e-run.sh` on :8080/:8081 against `englms-dev-db` (PostgreSQL 18, Podman); `/dev/ui` from `vite --port 5190` in the scratch clone.
- QA tooling: the pinned `qa/` Playwright 1.63.0 and @axe-core/playwright 4.13.0. Projects phone-small 360×740, tablet 768×1024, laptop 1280×800.
- Chromium only (Firefox/WebKit not installed on this host); enough for a per-task G3, the multi-engine run belongs to the milestone regression.

## AC results
| AC | Scenario(s) | Viewports | Result |
|---|---|---|---|
| AC1 route focus + titles | First load of `/`, `/tutor`, `/student`, a 404 in vi and en: focus on `body`, title `<h1> · Eng-LMS`, all four titles differ; first Tab = skip link on the shells, inside `main` on landing/404. Client navigation (keyboard Enter landing→tutor, back, forward, home link→landing, landing→student, student→404 via history + popstate, 404 link→landing, back→404): `h1` focused and title correct every time. Reload of `/tutor` after a client navigation: focus on `body`, first Tab = skip link. Language change: title follows, URL unchanged, focus stays on the switcher. 2 px ring on the `h1` after keyboard navigation. Exploratory: exactly one `focusin` per navigation (no StrictMode double focus); a fast second navigation wins; the skip link doesn't trigger the announcer; a failed lazy load on client navigation focuses the error page `h1` with a translated title; production `/dev/ui` renders the 404 | 360/768/1280 | **PASS** |
| AC2 SegmentedControl | `/dev/ui` vi/en: `radiogroup` "Chế độ xem"/"View" with `radio` + `aria-checked`; 44 px segments; `Check` icon (`aria-hidden`) only on the selected segment with the accent-subtle background; arrows move focus, Space/Enter select; re-selecting keeps it selected; a disabled segment is skipped and ignores clicks; the whole group can be disabled; axe 0 violations; the contrast script covers the selected label, icon, hover label and inner focus ring | 360/768/1280 | **PASS** (F1, F2) |
| AC3 LanguageSwitcher | Landing and both shells: keyboard (Tab, arrow, Space) or pointer switches every visible string and `<html lang>`; persists across a reload; endonyms keep `lang`; no English leaks into vi (innerText scan). From the diff: `app.test.tsx` and `smoke.spec.ts` assert both segments' `aria-checked` before/after, `lang` and reload persistence — stronger than before | 360/768/1280 | **PASS** |
| AC4 150 ms delay, CLS | Lazy chunks held 900 ms, `/api/v1/meta` 700 ms, on `/`, `/tutor`, `/student`, a 404: the busy region (`aria-label` "Đang tải trang") exists from the first frame; the skeleton becomes visible 156–170 ms later (12/12 runs, per animation frame); CLS 0.00009–0.0020 (limit 0.05); `WorkspaceName` the same; the pulse stops under `prefers-reduced-motion` | 360/768/1280 | **PASS** |
| AC5 field error icon | lucide `circle-alert` with `aria-hidden` before the text; `aria-describedby` resolves to exactly the message (vi/en); axe clean; 6.54:1 on surface, 6.21:1 on the page background | 360/768/1280 | **PASS** |
| AC6 N1–N4 | `boundingBox` ≥ 44 px at all viewports: skip link, shell home link, 404 link, switcher segments. `RouteLoading` block-level; the top-bar skeleton only on `/tutor` and `/student`. The error page without a request ID has no request-ID sentence in vi or en; both strings exist in both catalogues. The request-ID variant isn't reachable from the M1 UI; `RouteError.test.tsx` covers it | 360/768/1280 | **PASS** |
| AC7 dev strings | Fresh `pnpm build`: none of the 72 `dev` strings (vi + en) is a literal in `dist/` (the only hit, "Delete", is React's key-name table; other raw matches are substrings of `common` strings). No `src/dev/*` in the manifest; production `/dev/ui` renders the 404; `pnpm dev` `/dev/ui` fully translated; the completeness test covers `dev` and asserts it isn't in the shipped resources | — | **PASS** |
| AC8 fetch lint | Fixtures in `src/features/`: `pnpm lint` exits 1 on `window.fetch(`, `globalThis.fetch(`, `self.fetch(` (`no-restricted-properties`), bare `fetch(` and the RAC import; also catches `window['fetch']`, `(0, window.fetch)`, `const { fetch } = window`, `const j = window.fetch`. The same code in `src/lib/api/` exits 0. Fixtures removed | — | **PASS** (F3) |
| AC9 late console errors | The implementer's self-test passes as an expected failure. Own probe with `screenshot: 'off'`: `console.error` at 0/300/450 ms after the last action, a thrown error and an unhandled rejection at 300 ms all fail the test; 1500 ms passes (outside the window, by design); control passes. `LATE_ERROR_SETTLE_MS = 500`. Full suite: 113 passed, 31 skipped in 32.5 s (6 projects) | laptop | **PASS** |
| AC10 gate, CI, docs, budgets | `gate.sh` in the scratch clone PASS (12 steps, 116 s); CI 7/7 green at `92e213b`; budget 144.9/145.0 KB gz; step budgets re-checked (language switch 1; reach main 1 on a fresh shell, 0 on landing/404, 0 after navigation) at 360/768/1280; evidence complete; only the three allowed frontend docs changed | 360/768/1280 | **PASS** |

QA spec: 54/54 passed at phone-small, tablet and laptop (after one fix to the spec itself: it wrongly expected a switcher on the 404 page).

## Exploratory charter (≈ 45 min)
Charter: anything that makes focus jump unexpectedly (initial load, a language change, a failed lazy load), or a title stuck in the other language.
- Language change: focus doesn't move, the title updates; not stuck after going back; a fresh 404 in en has an en title.
- Failed lazy load: first load → error page with focus on `body`; client navigation (or offline) → error `h1` focused; back returns to the landing `h1`.
- Rapid navigation: with a slow tutor chunk and a student click 150 ms later, the student page wins; nothing steals focus later.
- Headers are static, so focus is never obscured (2.4.11). No horizontal scroll at 360. The keyboard walk is identical in all six locale/viewport combinations.
- Observations, not findings: `/dev/ui` has two radiogroups named "Ngôn ngữ" (dev only); "Eng-LMS Eng-LMS" in the shell header is left to T-M2.4 by the packet.

## Findings
| ID | Sev | Summary | Repro | Expected | Actual |
|---|---|---|---|---|---|
| F1 | S4 | The switcher uses the RAC toolbar keyboard model while exposing `radiogroup`/`radio` | In en, load `/` fresh and Tab (or Shift+Tab from the tutor `h1`) | WAI-ARIA radio group: Tab lands on the checked radio, arrows select (the packet accepts "keyboard support as RAC provides it", so not an AC failure) | Tab lands on the first (unchecked) segment, Shift+Tab on the last; arrows move focus only; Space/Enter select |
| F2 | S4 | Segment widths change on selection (check icon only on the selected segment) | `/dev/ui`, first SegmentedControl (vi), select "Tháng" | Segment positions stay put | 132/64/75 → 106/64/100 px; on the landing switcher the segment under the pointer moves after a click (user-initiated, no CLS) |
| F3 | S4 | The fetch rule misses two unusual forms outside AC8's list | `globalThis.window.fetch('/x')`, `document.defaultView!.fetch('/x')` in `src/features/x.ts` | Optionally flagged | Not flagged (everything AC8 lists is caught) |
| F4 | S4 (pre-existing) | No loading feedback during a slow client-side navigation to a lazy route | Slow `TutorShell-*.js` by 1.5 s; on `/` click "Khu vực gia sư" | Feedback after 150 ms (interaction-states §1/§3) | URL, page and focus stay on the landing page for 1.5 s with no `aria-busy` region; `develop` (`5c78168`) behaves the same. Suggest T-M2.4 |

No S1, S2, S3 or SCOPE findings.

## Accessibility summary
axe: no serious/critical violations on `/`, `/tutor`, `/student`, the 404 and the error page in vi and en at 360/768/1280; `/dev/ui` (vi) none of any impact. Keyboard-only walk of every route: focus ring on every stop and on the `h1` after keyboard navigation. Accessibility tree: `radiogroup "Ngôn ngữ"` with `radio "Tiếng Việt" [checked]` / `radio "English"`; loading region `status "Đang tải trang"` busy; the field error is only the input's description. Reduced motion stops the pulse; contrast 32/32 pairs.

## Isolation / privacy
No student data or endpoints in M1; `/api/v1/student/lessons`, `/api/v1/student/students/<uuid>` and `/api/v1/tutor/students` return 401/403/404 without data. No `SECRET-` in any response body across 54 runs. Changed paths only `web/`, `e2e/`, `evidence/T-M1.9/` and the three allowed frontend docs. No new dependency; RAC only in `web/src/ui/`. No exam/curriculum strings.

## Cleanup
The working tree was untouched (clean at `92e213b`; no commits, pushes or PR comments). The packaged app and Vite :5190 stopped; ports free. `englms-dev-db` was started by `e2e-run.sh` and stopped with `dev-down.sh` (volume kept). Fixtures removed; the scratch clone left for reference.

## Re-test log
(none)

QA-VERDICT T-M1.9: PASS WITH MINOR
