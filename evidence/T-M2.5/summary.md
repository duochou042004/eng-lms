# T-M2.5 summary: Students list, Add student (F2) and the workspace header

Recorded by the LC from the frontend-implementer's report (the agent cannot write report files).

## Commits
`b3578ce` ui components (DataList, StatusBadge, Disclosure, TextArea, CopyButton, ConfirmDialog, DescriptionList, SearchField; `ui/status/statusMap.ts`) ·
`1f36811` students feature (nav item, three lazy pages, model, API hooks, strings, route focus, bundle-budget check) · `433f227` E2E-found fixes ·
`f044934` `e2e/tests/students.spec.ts` · `7c0b30a` docs · `fa7534f` temporary password masked in evidence screenshots · `c2c63a0` evidence + progress.

## Gates and tests
- `gate-20261016T021454Z.log` and `gate-20261016T022521Z.log`: PASS (13 steps) on `fa7534f`, same dev database. Contrast PASS (32 pairs). `api/openapi.json` unchanged.
- Web 519 tests in 50 files (was 370 in 34); backend 466; E2E 306 passed / 30 skipped per run (students.spec: 10 tests × 3 viewports).
- Bundle: student first visit 180.5 KB gz (limit 200), tutor 180.7 KB gz.

## Acceptance criteria (implementer's proof)
- AC1: Students item (sidebar/drawer, `aria-current`); one lazy chunk per page from the router; `bundle-budget.mjs` fails on any `src/features/students/` key in the student or tutor first visit.
- AC2: search/archived/sort/page in the URL (1-based page); `nguyen thi dau` finds "Nguyễn Thị Dấu"; 26 students page through reload/Back/Forward; `page=-1`, `page=abc`, `sort=x` → defaults; `page=99` → last page; control characters dropped from `q`.
- AC3: list at 360 px without horizontal scroll; table with headers at 768/1280; long values wrap.
- AC4: skeleton after 150 ms, refetch line, first use, "No active or paused students", filtered empty + Clear filters, error + Retry (component tests).
- AC5: suggestion, availability states, no request below 3 letters/digits, clear and stop rules, stale answers ignored; no `password` in a minimal create; contact + note shown on the workspace (E2E).
- AC6: 409 inline + focus; 422 to fields or the focused summary; 500/network keep inputs; one request on double click; guard asks on nav, home link, Change password, never on sign-out (own or cross-tab).
- AC7: focus on the card heading; Copy message vi/en (clipboard read in E2E); refused clipboard → manual-copy text; Back after Open workspace → empty form; password absent from storage, `history.state`, URL (E2E) and query/mutation caches (unit).
- AC8: header + Profile view; `contactHref` 36-row table; only `tel:`, `mailto:`, `https:` links; refused values as text + copy; unknown and non-UUID id → not-found in the shell (non-UUID sends no request).
- AC9: F2 = 6 counted steps at 360/768/1280 (`records/<project>/steps-f2.json`); wall time 3.2 / 3.0 / 3.1 s, reported, not asserted (DEC-093).
- AC10: axe clean on the listed states at three viewports (vi; main screens en); keyboard-only F2 (`records/<project>/keyboard-f2.json`).
- AC11: gate green twice; existing assertions kept.

## Screenshots
`impl/<phone-small|tablet|laptop>/`, 17 per viewport: list (populated vi/en, first use, filtered empty, long name), add form (empty, suggestion, filled, errors vi/en, discard dialog), credentials card (vi/en, password masked), workspace (vi/en, refused contact values, not-found).

## Deviations
- F2 counts "expand Contact → phone" as one step (ux-flows F2 [3]); as single actions it is 7.
- DataList switches at the 768 px viewport (packet), not responsive-standards' 640 px container width.
- A URL change that only touches search params on the same page no longer moves route focus to the `h1` (keeps focus in search/sort/paging; new test).
- `usePageTitle` moved to `lib/i18n/pageTitle.ts` (re-exported from `app/`); new `lib/navigation.ts`, `lib/time`.
- `ChangePasswordPage.test.tsx` "Cancel goes back" now starts on the Students list instead of the shell 404 at `/tutor/students` (same assertion).
- 20 s timeouts on the `/dev/ui` and new page tests; `evidenceShot` takes an optional mask.

## Open points
1. The `ui/index.ts` barrel ships tutor-only components in the student first visit (+5.8 KB gz, under budget).
2. Dates use the browser's time zone, not the account's (`shortcut:` in `lib/time`).
3. First use is screenshotted with a stubbed API in E2E; "only archived" by component tests only.
4. Each E2E run adds ~20–25 students to the dev database (paging students reused).
5. Some component tests wait up to 1 s after a 300 ms debounce.
6. Chromium only (Firefox/WebKit host libraries pending, PO `sudo`).

## Round 2: AC12 (a)–(o) (G3 round 1 fixes, DEC-122)
- Commits: `cee33ff` contactHref (j, k), `6dde9af` ui (d, e, g, h), `3485f65` students (a–c, f, h, i, l, m), `ca98c09` E2E + named step log (o), `7915a95` docs (n), `be0daf7` evidence and progress.
- Gates: `gate-20261016T084230Z.log` and `gate-20261016T085300Z.log` PASS on `7915a95` (13 steps; web 538 in 51 files, backend 466, E2E 306 passed / 30 skipped; budget student 180.6, tutor 180.8 KB gz; contrast 32 pairs). The round-1 logs were replaced.
- (a)–(c) pager: focus to the enabled pager button, list top scrolled into view, "Trang n / m" announced politely; Previous/Next at the row's ends at 360 (`impl/*/list-pager-vi.png`). (d), (e) phone and status `nowrap`; badge in the title row at 360.
- (f) neutral greeting vi/en (no name, no "em"); expiry and Added on "10:25, 23/10/2026" (`lib/time`). (g) "Copied" visually hidden, icon swap, no shift (E2E).
- (h), (i) quick-link kind icons (`aria-hidden`), baseline-aligned `DescriptionList`, handle label above value. (j), (k) https with userinfo refused; email refuses `: / < > " \` and needs a dotted domain.
- (l) forced `/change-password` carries `state.forced` and passes the guard; the user's own link still asks. (m) `pagehide` drops the card. (n) responsive-standards §1, §3.3. (o) `steps-f2.json` lists the 6 named steps; wall time 3.4 / 3.5 / 3.1 s, reported (DEC-093).
- Deviations: (g) icon swap only (label kept to avoid a width change); Added on uses the new date format too; the gate refreshed other specs' `impl/` screenshots.

- AC12 (p) (QA-R2-1, DEC-122): `685b89f`, `85ba128`. The Username column has a minimum width (`--size-column-id`, 15rem): a 20-character username and its header stay on one line at 768 and 1280 (E2E line count); a 40-character username wraps, fully visible, no horizontal scroll. Gates `gate-20261016T095006Z.log` and `gate-20261016T100028Z.log` PASS on `85ba128` (web 539; E2E 306 passed / 30 skipped). Trade-off at 768: Name and Email get less room and wrap (full value visible).

- AC12 (q), (r) (UX-11, UX-12, DEC-122): `9d74cf8`, `7815c35`, `4b73018`. No Username column: `@username` is a muted second line of the Name cell (the narrow list title row carries it); the (p) minimum width and its token removed. E2E at 768/1280: a three-word name and a 20-character email ≤ 2 lines, a 20-character username 1 line, no horizontal scroll. Pager position with non-breaking spaces. Gates `gate-20261016T134641Z.log` and `gate-20261016T135803Z.log` PASS on `4b73018` (web 538; E2E 306 passed / 30 skipped). A first gate on `7815c35` failed once at web-test (a 1 s wait for a list link after Next; the rerun passed); `4b73018` gives those lookups a 5 s wait, assertions unchanged.
