QA-VERDICT T-M2.32: PASS WITH MINOR
UX-REVIEW T-M2.32: APPROVED

# QA Report: T-M2.32, E2E console guard for fresh contexts and the T-M2.31 / T-M2.6 / T-M2.35 polish
Verdict: PASS WITH MINOR (S4 only). Build: head `d589168404952bd5876e2b067f2757e9945fa43e` on `feature/T-M2.32-guard-and-polish`. Date: 2026-11-25. Mode: combined QA+UX (tier M). Fresh session.

## Environment
- Debian 13, rootless podman, JDK 25 and Node 24 from sdkman/nvm, `scripts/env.sh` sourced.
- Packaged app run through `./scripts/e2e-run.sh` on the fresh `englms_e2e` DB. No `E2E_KEEP_DB`, no purge.
- No branch switch, commit or push. No files written in the tree.
- My scratch specs ran briefly under `e2e/tests/`. They are now moved to `.claude/scratch/qa-T-M2.32/`, which is git-ignored.
- Final `git status --short` shows only the three pre-existing untracked `evidence/*/records/` dirs. I ran `git checkout -- evidence/T-M2.32` as a precaution.
- Independence: the verdict draft came from the packet, DEC-196, DEC-197 and the summary, plus black-box runs. I read the diff (ariaStrings.ts, LanguageSwitcher, session.ts, Shell.module.css, TutorShell, the lint script) only after the draft.
- One exception: to write my harness checks I read `e2e/support/fixtures.ts`, `shell.ts` and `students.ts`. While looking for the 740×360 selectors I also glimpsed the implementer's AC2o test in `shells.spec.ts`. My footer measurement is my own.

## AC results
| AC | Scenario(s) | Viewports | Result | Evidence |
|---|---|---|---|---|
| AC1 | Scratch `qa-scratch-crash.spec.ts`: (1) a page error in a fresh guarded context; (2) `console.error` 300 ms after the body, page left open; (3) a crash in a `studentSession()` helper context; (4) control: the same crash in an unguarded fresh context. | phone-small, tablet, laptop | PASS. (1)–(3) fail on all 3 projects with `pageerror: QA-CRASH-NOW`, `console.error: QA-LATE` and `pageerror: QA-STUDENT-CRASH`. (4) passes, which shows what the guard adds. Grep: 25 `browser.newContext(` calls in code, all followed by `guardContext` (the 26th match is a comment at `guards.spec.ts:113`). | run1.log |
| AC2 | A temporary violating file at `web/src/QaScratchViolation.tsx` (deleted right after), checked with `node scripts/no-expression-effects.mjs`. | n/a | PASS. Exit 1, with exactly the 4 bad forms flagged: one-line `useEffect`, wrapped `useLayoutEffect`, `React.useEffect(() => void …)`, and a ternary. The one-line cleanup, the wrapped cleanup (Button.tsx form) and the block body were not flagged. `pnpm lint` on the tree: exit 0. | web.log, inline output |
| AC3 | My own measurement, tutor drawer, logout while offline, keyboard focus on Log out then Enter. | 740×360 and 568×320, vi and en | PASS. At 740×360 (vi and en), Log out (44 px) plus its 4 px ring (2 px outline + 2 px offset) are inside the footer, the alert text is not clipped and Log out keeps focus. At 568×320 the text wins and only the top of Log out is cut, as before (AC2o). axe and the no-horizontal-scroll check pass in each state. | drawer-offline-*.png |
| AC4 | Fresh student, real server, CDP throttle (1200 ms latency, 20 kB/s up): 5 rapid clicks en, vi, en, vi, en. Tutor on Settings › Account, real server, 1000 ms latency: page switcher en, popover switcher vi, page switcher en. Tutor locale restored to `vi` afterwards (PATCH 200). | 3 projects (student); laptop (two switchers) | PASS. On every project each PATCH is sent only after the previous one finished, in click order. Server `locale` is `en` (the last choice), the reload stays `en`, and a new device without a stored choice shows `vi` before sign-in. The two-switcher case is also strictly in order (send en, done, send vi, done, send en, done) and the server keeps `en`. The display-name save not queuing behind locale saves is covered by the unit test only; I did not check it in a browser. | run1.log |
| AC5 | Accessible names from the a11y tree and the DOM; the live announcer text; the shipped dictionary dumped in the page; switching vi ↔ en ↔ vi without reload (`performance.timeOrigin` unchanged). | 3 projects | PASS. vi: the hidden dismiss buttons of the account popover (two, around the dialog), the drawer Sheet (one), the Toggletip (two) and the ComboBox list popover are named "Đóng". en: "Dismiss". The ComboBox announces "Có 7 lựa chọn.", "Có 3 lựa chọn." and "Có 0 lựa chọn."; after a switch to en it announces "7 options available.", and back in vi "Có …" again. Dictionary vi strings: focusAnnouncement "Đã vào nhóm {g}, có {n} lựa chọn. {option}, đã chọn", selectedAnnouncement "{option}, đã chọn", buttonLabel "Hiện gợi ý", listboxLabel "Gợi ý". Our own labels still win where passed (ComboBox "Hiện các múi giờ", SearchField "Xoá nội dung tìm kiếm", Toast "Đóng thông báo", region "Thông báo"). No throws for 294 keys × 2 locales. Bundle: student 195.3 KB gz ≤ 200, tutor 195.6 KB gz ≤ 300, `budget: PASS`. | run1.log, run2.log, run5.log, run6.log, *-combobox-*.png, phone-small-toggletip-*.png |
| AC6 | Docs only (design-system §3) | n/a | Not separately verified beyond the summary. No SegmentedControl code in the diff stat. | |
| AC7 | `pnpm lint` and `pnpm test --run`; full E2E suite once on the three mandatory projects; axe and no horizontal scroll where (c) and (f) change the DOM. | 3 projects | PASS. web: 78 files, 961 tests passed. E2E full suite: 610 passed, 68 skipped, 0 failed (4.8 min), 0 console-guard failures. axe and no-scroll pass for the account popover/drawer (vi, en), the open ComboBox in vi and en (with only `aria-hidden-focus` disabled, per DEC-191), the Toggletip in vi and en on phone-small, and the drawer offline states. I did not run gate.sh or CI, as instructed. | full-suite.log, web.log |

## Exploratory notes
- **Keyboard only.** Path: Tab to the account opener, Enter, Tab to the switcher, arrows move focus, Space selects, Esc. Focus returns to the opener ("e2e-tutor" on laptop, "Mở điều hướng" / "Open navigation" on phone and tablet). After Esc, focus returns to the Toggletip trigger "Xem lỗi". Arrow keys never select (DEC-196 (3) holds).
- **"Đóng" duplicate name in the drawer, judged as asked.** In vi the drawer has a visible Close "Đóng" (44×44, inside the dialog) and React Aria's hidden dismiss "Đóng" (tabindex −1, 16×6 visually hidden, outside the `role=dialog` element).
  - Both do the same thing (close), so the same name is semantically right. It is not reachable by Tab, and it sits outside the modal dialog, so a screen-reader virtual cursor rarely meets it.
  - en reads "Close" plus "Dismiss", which is equally redundant.
  - Ruling: acceptable, no finding.
- **vi wording.** Natural Vietnamese, and Vietnamese has no plural, so one form is right. One optional polish is QA-2 below.
- **Unchanged pre-existing behaviour, noted only.**
  - The ComboBox button name concatenates to "Hiện các múi giờ Múi giờ" (from T-M2.6).
  - At 740×360 the alert box's bottom border and padding sit about 11 px below the viewport, while the text itself is fully visible. That meets the "text unclipped" rule.
  - The live announcer accumulates messages (React Aria's own behaviour).
  - Option focus and selection announcements fire on Apple devices only (React Aria's behaviour), so in Chromium on Linux only the count is spoken.

## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| QA-1 | S4 | Intermittent focus loss after Esc on the laptop account popover, seen only when axe ran while the popover was open after a language switch. Likely a harness interaction; not seen for a user. | laptop 1280×800: open the account popover, click English, run `expectSettledAccessible`, click Tiếng Việt, press Esc. | Focus returns to the "e2e-tutor" opener. | `document.activeElement` is `<body>` in 2 of 12 axe-variant runs (run1 and run3). In 40 runs without axe (no wait, 1.5 s wait, screenshot) and on phone-small and tablet it was always correct. Not reproducible without axe, and the cause was not isolated. | run1.log ("laptop focus after Esc <body>"), run3.log, run4.log |
| QA-2 | S4 (copy, optional) | With no matching options the vi count reads "Có 0 lựa chọn.". "Không có lựa chọn nào." would sound more natural. en "0 options available." has the same shape, so this is optional polish. | Settings › Account, Time zone, type `zzzz-nothing`. | n/a | "Có 0 lựa chọn." | run1.log ("vi announce none") |

No S1, S2, S3 or SCOPE findings. Nothing outside the ACs is present in the diff stat apart from the docs, evidence and progress files.

## Accessibility summary
- axe shows 0 violations in every state above, at 360, 768 and 1280, and at the two landscape sizes.
- Every changed control has a 44 px target, and focus stays visible: the ring stays inside the footer at 740×360.
- Names were checked through `ariaSnapshot` and the DOM, not a real screen reader.

## Isolation and privacy
On a fresh student session (3 projects):
- `GET /api/v1/tutor/students` returns 403.
- The `/tutor/students/<id>` URL lands on `/forbidden` ("You don't have access to this page").
- The 13 API response bodies scanned per run contain no `SECRET-` marker.
- No endpoint or authz change in this packet.

## Commands
```
cd web && pnpm lint && pnpm test --run          # LINT_EXIT=0; 961 passed
node scripts/no-expression-effects.mjs          # with a temporary violating file: EXIT=1, 4 hits
pnpm build && pnpm budget                       # budget: PASS (student 195.3 / tutor 195.6 KB gz)
./scripts/e2e-run.sh [--no-build] --project=phone-small --project=tablet --project=laptop tests/qa-scratch-*.spec.ts
./scripts/e2e-run.sh --no-build --project=phone-small --project=tablet --project=laptop   # 610 passed / 68 skipped
```

## Evidence files
Everything is in `/home/deb/App_sources/eng-lms/.claude/scratch/qa-T-M2.32/`. Logs: `web.log`, `run1.log` … `run6.log`, `full-suite.log`; scratch specs: `qa-scratch-main.spec.ts`, `qa-scratch-crash.spec.ts`. Screenshots (local only):
- `drawer-offline-740x360-vi.png` / `-en.png`: tutor drawer, logout failed offline. Log out with its full focus ring sits above the red alert; title and three lines of text are fully visible.
- `drawer-offline-568x320-vi.png` / `-en.png`: the alert text is fully visible and Log out's top edge is cut under the nav list (AC2o, text wins).
- `{phone-small,tablet,laptop}-account-{vi,en}.png`: drawer or popover with the switcher in each language.
- `{phone-small,tablet,laptop}-combobox-{vi,en}.png`: the Time zone list open after typing "Asia/S".
- `phone-small-toggletip-{vi,en}.png`: the workspace-name error Toggletip open in the top bar (meta answered 500).

## Not verified
- CI on the final head.
- WebKit.
- A real screen reader.
- The display-name save not queuing behind locale saves, in a browser (unit test only).
- AC6 doc wording, beyond the summary.

Head SHA reviewed: d589168404952bd5876e2b067f2757e9945fa43e
Wall-clock: about 16 minutes (from the shell clock).
