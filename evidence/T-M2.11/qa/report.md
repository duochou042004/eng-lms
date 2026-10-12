# T-M2.11 QA report (fresh qa-evaluators; recorded by the LC from the returned text)

Final verdict: **PASS** at `93698aa` (round 3). Rounds are listed newest first; reviewer scratchpad paths are session-local and not kept.

---

## Round 3

### QA Report: T-M2.11 App shells, round 3 (final-head re-check, G3)

**Verdict: PASS.** No findings at any severity. Both round-2 S4s are fixed: N-1 is closed by AC11 (i) and N-2 by AC11 (j). The gate passed once and the repeat runs passed.

Build `93698aa` on `feature/T-M2.11-app-shells`, 2026-10-12. Fresh evaluator session, black-box. I only listed the names of changed files and the E2E test titles to pick the repeat targets; I did not read the diff or the implementer's test bodies.

## Environment
- Packaged jar from the gate's e2e build, run with the e2e settings on :8080 against the dev PostgreSQL 18 (Podman).
- Chromium only, through the pinned QA toolchain in `qa/node_modules` (Playwright 1.63.0, @axe-core/playwright 4.13.0).
- Signed in as `e2e-tutor`. One test student was created through `POST /api/v1/tutor/students` and its password change was completed through the API.
- Scripts and screenshots are only in the scratchpad: `/tmp/claude-1000/-home-kali-App-projects-eng-lms/1a89630f-1253-4505-ba2c-f1fca784d381/scratchpad/qa3/` (`public.mjs`, `n1.mjs`, `sweep.mjs`, `extra.mjs`, `shots/`, `sweep.log`, `gate.log`, `rep3.log`, `rep20.log`).

## Status of the round-2 findings
| ID | Round 2 | Round 3 result |
|---|---|---|
| N-1 (S4) | An overlay closed by a frame change reopened when the frame changed back | **Fixed.** Tested 7 width pairs, each switched there and back twice:<br>• tutor drawer 768↔1280, 360↔1280, 1023↔1024<br>• tutor popover 1280↔768<br>• student sheet 360↔800, 767↔768<br>• student popover 1024↔390<br>After every return there were 0 dialogs. Focus always moved to the new frame's trigger (AC11 (f)). Afterwards the trigger opened the overlay with one activation, and Esc closed it with focus back on the trigger. |
| N-2 (S4) | Between 480 and about 690 px the one-row public frame cut off the meta error and a long name | **Fixed.** Tested `/login`, `/forbidden` and `/change-password` at 320, 360, 480, 568, 690, 740, 767, 768 and 1024 px, each with meta 200, 500, a 60-character name, and a delayed (loading) response:<br>• Two rows at every width ≤ 767 px, one row at ≥ 768 px.<br>• The 60-character name shows 49 of its 49 non-space characters below 768 px and 47 of 49 at 768 px; its `title` holds the full name.<br>• The error text "Không tải được tên không gian dạy học" plus Retry is never clipped (36 of 36 characters); en "Couldn't load the workspace name" checked at 740 and 768 px.<br>• The h1 top is the same in all four states and after loading completes, at every width (155.6 px on `/login` and `/change-password`, 228.6 px on `/forbidden` below 768 px).<br>• CLS ≤ 0.001 and no horizontal scroll anywhere. |

## AC results
| AC | Scenarios | Viewports | Result |
|---|---|---|---|
| AC1 | `/tutor` → `/tutor/today` and `/student` → `/student/home`.<br>`/tutor/nope` and `/student/a/b` show the 404 inside the shell (banner, "Về Hôm nay" / "Về Trang chủ" link, title "Không tìm thấy trang · Eng-LMS"). Focus lands on the h1 after a client-side Back to the 404; a cold load leaves focus on `body`, which is the documented design.<br>Anonymous users are sent to `/login?next=%2Ftutor%2Fnope` and `/login?next=%2Fstudent%2Fa%2Fb`. A watcher on the h1 saw only "Đăng nhập", so the 404 never flashes before the guard.<br>A student on `/tutor/nope` and a tutor on `/student/nope` land on `/forbidden`. | 360 / 768 / 1280 | PASS |
| AC2 | Tutor sidebar at 1280 px. Drawer at 360 and 768 px: focus moves in, Tab and Shift+Tab stay inside, Esc and Close both close it with focus back on the trigger, and the account section sits in the footer. Browser Back while it is open navigates back and the drawer is closed. | 360 / 768 / 1280 | PASS |
| AC3 | Student bottom tabs Home and More are 180×60 px. `main` has 84 px bottom padding, more than the 60 px tab height, so no content is hidden. The More sheet has a drag handle, a visible Close button and the account section. Top bar plus account popover at 768 and 1280 px. | 360 / 768 / 1280 | PASS |
| AC4 | Signed-in name, language, Change password and Log out appear in all three places, with the same button style. Change password opens `/change-password`; "Huỷ" returns to the page you came from.<br>Log out takes 2 steps from the 404 page in all 6 role/viewport combinations; the session then returns 401.<br>The language change re-renders the shell at once (h1 and title "Today" / "Home"). | 360 / 768 / 1280 | PASS |
| AC5 / AC6 | The workspace name appears once (no "Eng-LMS Eng-LMS"). The public pages show the name above the h1. The meta error copy says "workspace" in vi and en. | all | PASS |
| AC7 | Both shells' top bars are one row (69 px) at 320, 360, 768 and 1280 px in vi and en with a 60-character name; the name is truncated with the full `title`. No horizontal scroll at 320, 360, 768, 1024 and 1280 px with overlays open and closed. | all | PASS |
| AC8 | The cold-load skeleton follows each frame: the tutor sidebar runs full height at 1280 px, and the student frame shows its top bar and bottom bar at 360 px. `aria-busy` carries the label "Đang tải trang". | 360 / 1280 | PASS |
| AC9 | axe found 0 serious or critical issues for both roles at all three viewports, with overlays open and closed (12 scans). Keyboard-only path for tutor at 1280 and 360 px and student at 360 px: skip link → home link → navigation → account trigger → … → Log out ends on `/login`. The skip link is the first Tab stop. Reduced motion is covered by the E2E suite (passed ×3). | 360 / 768 / 1280 | PASS |
| AC10 | The gate passed (see Commands). The budget step passed. | n/a | PASS (single run, as briefed) |
| AC11 (a)–(j) | (a) and (j): see N-2 above.<br>(b) h1 and title equal the nav labels.<br>(d) the tutor sidebar skeleton is full height.<br>(f) and (i): see N-1 above.<br>(g) the 404 link names its destination.<br>(c), (e) and (h) are covered by the gate's unit and E2E suites. | as above | PASS |

## Findings
| ID | Sev | Summary |
|---|---|---|
| none | | No S1, S2, S3, S4 or SCOPE findings. |

Observations, not findings:
- When the skip link has keyboard focus at 360 px, it sits over the menu button and blocks a mouse click on it. The next Tab hides it, so this does not violate 2.4.11.
- On the public error row at ≥ 568 px, Retry sits at the end of the row, away from the message. This is the same pattern as UX-9, which is approved for deferral, so I am not raising it.

## Isolation and privacy
- No `SECRET-` markers in any student API response (3 sessions scanned).
- A student calling `GET /api/v1/tutor/students` or `/api/v1/tutor/students/{id}` gets 403.
- There are no per-student resources at this stage, so a student-B-against-student-A URL check has nothing to target. The guard and 404 checks above cover what exists.

## Scope
Nothing found outside the ACs. The only nav items are Today (tutor) and Home plus More (student). There is no rail, command palette or "+ New" menu.

## Commands
- `ENGLMS_TASK=T-M2.11 ./scripts/gate.sh`: **PASS**, all 13 steps in 490 s.
  - backend: 466 tests
  - web: 330 tests in 31 files
  - e2e: 240 passed, 24 skipped (the dev-only `/dev/ui` test)
- Repeat ×3, run with `./scripts/e2e-run.sh --no-build tests/shells.spec.ts --repeat-each=3 --retries=0 --project=phone-small --project=tablet --project=laptop`: 243 passed, 9 skipped (dev-only), 0 failed. `e2e/tests/shells.spec.ts` is the only E2E spec changed since `64a8f12`.
- Repeat ×20 on phone-small, tablet and laptop for the focus, keyboard and public-frame tests (`shells.spec.ts:266, :445, :583, :648` and `route-focus.spec.ts`): 1260/1260 passed. No flakiness.
- Black-box runs: `node public.mjs` (N-2 matrix, 0 failures), `node n1.mjs` (0 failures), `node sweep.mjs` (195 checks, 0 failures), `node extra.mjs`.

## Cleanup
- The app I started was stopped (exit 143 is the expected SIGTERM).
- `./scripts/dev-down.sh` was run without `--purge`; the data volume is kept.
- `git checkout -- evidence/T-M2.11` was run, and the untracked gate log my run created was removed (a copy is in the scratchpad).
- `git status` is clean on `feature/T-M2.11-app-shells` at `93698aa`. No commits, pushes or PR comments.

## Limitations
- Chromium only; Firefox and WebKit lack the host libraries.
- `env(safe-area-inset-bottom)` is 0 in Chromium emulation, so I could not observe the safe-area padding directly. The E2E suite covers it.
- The gate ran once, as briefed. AC10's "twice in a row" was not re-run by QA.
- No screen-reader check beyond names and roles in the accessibility tree.
- I created a few QA students (`qa3-*`) in the dev database.

QA-VERDICT T-M2.11: PASS
---

## Round 2

### QA Report: T-M2.11 App shells (G3 round 2)

**Verdict: PASS WITH MINOR.** No S1, S2 or SCOPE findings. There are two new S4 findings, and the four round-1 findings (F-1 to F-4) are fixed.

- Build: `feature/T-M2.11-app-shells` at `64a8f12` (PR #86). Date: 2026-10-12. Fresh evaluator context.
- Independence: I formed my verdict from the packet, DEC-114, ux-flows, IA §4 and the round-2 notes in the summary. I did not read the implementation diff or the implementer's tests before the draft. Afterwards I read only `web/src/app/shells/useOverlay.ts` and `TutorShell.tsx`, to find the cause of N-1.

## Environment
- Packaged jar (`backend/target/englms-0.0.1-SNAPSHOT.jar`, built by the gate run) on :8080, with the e2e-run.sh bootstrap env and the dev DB (podman).
- Chromium only. My checks ran from the scratchpad with QA's pinned Playwright 1.63 and axe-core 4.13.
- I signed in as `e2e-tutor` and created one student through `POST /api/v1/tutor/students`, display name "Nguyễn Thị Phương Thảo QA" (`qa2s7dcda6`). It stays in the dev DB as dev data, as in DEC-114.
- Meta states came from route interception of `/api/v1/meta`: 200 with a 60-character `displayName`, 500 (the client retries three times, so the alert appears after about 3.4 s), and slow (1.2–1.5 s).

## Commands and results
| Command | Result |
|---|---|
| `ENGLMS_TASK=T-M2.11 ./scripts/gate.sh` | **PASS**, 13 steps, 496 s; e2e 228 passed, 24 skipped |
| `e2e-run.sh --no-build` (phone-small, tablet, laptop), `--repeat-each=3 --retries=0`: auth, guards, polish, smoke | **360 passed**, 63 skipped, exit 0. The three ✘ lines are the guard's own `test.fail` "expected failure" tests. |
| Same, `--repeat-each=20 --retries=0`: shells, loading, route-focus (cover focus, loading and keyboard budgets) | **2160 passed**, 60 skipped, 0 failed, 0 flaky (14.0 min) |
| My black-box suites: `a-nav` (39 tests), `d-frame` (29), `f-skel` (15), plus probes | All pass after fixing selectors and timing in my own tests (details below) |

Specs changed since `c7ede39`: auth, guards, loading, polish, route-focus, shells, smoke. All seven are covered by the ×3 or ×20 runs.

## AC results
| AC | Scenarios | Viewports | Result |
|---|---|---|---|
| AC1 | `/tutor` → `/tutor/today` and `/student` → `/student/home`. `/tutor/nope`, `/tutor/a/b/c`, `/tutor/today/x`, `/student/a/b`, `/student/home/x/y` show the 404 inside the shell, with navigation visible, title "Không tìm thấy trang · Eng-LMS" / "Page not found · Eng-LMS", and the link to the role home. Anonymous users go to `/login?next=%2Ftutor%2Fnope` (and `…%2Fstudent%2Fa%2Fb`). Wrong role (both directions, including a client-side `pushState`) goes to `/forbidden`. A MutationObserver recorded every `h1`: no 404 `h1` ever rendered before the guard. Focus lands on the 404 `h1` on in-app navigation (Back); on a cold load focus stays on `body`, the same as every other route. | 360, 1280 | PASS |
| AC2 | Tutor sidebar at ≥ 1024 px with Today `aria-current="page"` and the account button top right. Below 1024 px the menu button (44×44) opens the drawer: focus goes inside, 14 Tab and 14 Shift+Tab presses stay inside, Esc and Close (pointer, keyboard, touch) return focus to the menu button, the nav item navigates, closes the drawer and focuses the `h1`, and Back while open closes it with no leftover inert or scroll lock. Account section is in the footer. | 320, 360, 768, 1023, 1280 | PASS |
| AC3 | Student below 768 px: Home and More tabs with visible labels, 60 px tall, safe-area rules present, and `main` has 84 px bottom padding so nothing hides behind the tabs. More opens the bottom sheet (drag handle and Close). At 768 and 1280 a top bar with Home and the account button. | 320, 360, 767, 768, 1280 | PASS |
| AC4 | Popover, drawer and sheet all show the signed-in name, the switcher, Change password and Log out. The last two share the secondary button style (`<a>` and `<button>`). Change password opens `/change-password` and Cancel returns to the same page. **Log out takes 2 steps** and ends at `/login` with session 401. **Language takes 2 steps** in a shell and re-renders at once (h1 "Today", title "Today · Eng-LMS"); **1 step** on `/login` and `/forbidden`. | 320, 360, 768, 1024, 1280 × tutor and student | PASS |
| AC5 | The shell shows the name once, as the home link. No "Eng-LMS" appears beside a loaded name. While loading, the link's accessible name is "Eng-LMS". The error shows Retry beside the link, never inside it, and Retry recovers. Public `/login` and `/forbidden` show the name above the `h1`. Network order on a cold load is session request, session done, then meta request, for `/login`, `/forbidden`, `/tutor/today` and `/student/home`. | all | PASS |
| AC6 | "Không tải được tên không gian dạy học" / "Couldn't load the workspace name" | all | PASS |
| AC7 | Both shell top bars are one row (69 px) in loaded, error and loading states, vi and en, at 320, 360, 390, 768, 1024 and 1280. The long name is ellipsised and has a full-text `title`. No horizontal scroll at 320, 360, 768, 1023/1024 or 1280 with overlays open or closed, nor after a resize. | all | PASS |
| AC8 | The skeleton follows the frame. Tutor below 1024 px: 69 px top bar. Tutor at ≥ 1024 px: a sidebar skeleton of 240×731, the same as the real sidebar. Student below 768 px: top bar plus bottom tab strip; at ≥ 768 px: top bar. The `aria-busy` label is "Đang tải trang". The retargeted `loading.spec` passed ×20. | 320–1280 | PASS |
| AC9 | axe found 0 serious or critical issues (0 issues of any impact) for both shells with drawer, sheet or popover open and closed, at 320/360/768/1023/1280, and on the shell and public error states. Keyboard order is skip link, home link, account button, nav; the skip link moves focus to `main`; Log out is reachable by Tab and Enter. With reduced motion the drawer and sheet do not move (0 animations); without it they slide. `/dev/ui` has entries for NavList (vertical and horizontal), BottomTabs, Sheet (start and bottom) and Popover; axe found 0 issues with a Sheet open. | 360, 768, 1280 | PASS |
| AC10 | Gate green. `web-budget` green. The student chunk has no tutor route. My single gate run plus the implementer's two logged runs both passed. | n/a | PASS |
| AC11 (a) | Below 480 px the public frame has two rows (name row, then switcher row) in every state. The 60-character name shows **59/60 characters** in two lines at 320, 360, 390 and 479. The **`h1` top stays at 155.6 px** in loading, loaded, error and after Retry. **CLS is 0.0000.** The error wraps to two lines, unclipped, with a `title`. At ≥ 480 px there is one row (`h1` at 94 px, CLS ≤ 0.0004). The public skeleton's heading line sits 2 px from the real `h1`. | 320–1280, vi and en | PASS (see N-2 for the band just above 480 px) |
| AC11 (b) | `h1` and title read "Hôm nay"/"Today" and "Trang chủ"/"Home", matching the nav labels | all | PASS |
| AC11 (c) | In a narrow shell bar (320/360/390 and student 768) the error shows only the icon and Retry. The message is visually hidden (`clip-path: inset(50%)`), stays in `role=alert`, and Retry's `aria-describedby` points at it. Wide bars show the full message. | 320–1280 | PASS |
| AC11 (d) | The tutor sidebar skeleton runs full height | 1024, 1280 | PASS |
| AC11 (e) | The drawer, sheet and popover focus ring is 2 px with a −2 px offset, inside the panel, and follows its corners (10 px radius on popover and sheet), checked visually | 360, 1280 | PASS |
| AC11 (f) | Resize while open: tutor 768↔1280 and 360↔1100, student 360↔800, 360→1280 and 1280→500. In every case focus lands on the new frame's trigger, never `body`; no dialog is left behind, no scroll lock, no inert `main`. | — | PASS (see N-1) |
| AC11 (g) | The 404 link reads "Về Hôm nay"/"Back to Today" and "Về Trang chủ"/"Back to Home" and points to the role home | 360, 1280 | PASS |
| AC11 (h) | The built `shell` namespace has no top-level `home` key; only `nav.home` (the student tab label) remains | n/a | PASS |

## Round-1 findings
| ID | Status | Evidence |
|---|---|---|
| F-1 (S3, public toolbar wraps in the error state, `h1` shifts) | **Fixed** | Below 480 px the layout is two rows in every state; `h1` stays at 155.6 px; CLS 0.0000 at 320, 360 and 390, vi and en |
| F-2 (S4, compact meta error cut on phones) | **Fixed for phones** | The shell shows icon + Retry with the message as hidden alert text; the public error wraps to two lines below 480 px. The same cut remains from 480 to about 690 px (N-2). |
| F-3 (S4, 1280 skeleton sidebar short) | **Fixed** | Skeleton sidebar 240×731 = real sidebar 240×731 |
| F-4 (S4, 60-character name shows about 2 characters at 320 px) | **Fixed** | 59/60 characters at 320 and 360 |

## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| N-1 | S4 | The tutor drawer and student More sheet reopen on their own when the viewport returns to the narrow frame | Tutor at 768×800: open the drawer, resize to 1280 (it closes and focus goes to the account button, correct), resize back to 768. Same for a student: open More at 360, go to 800, back to 360. | The drawer or sheet stays closed; the user did not reopen it | The modal reappears and takes focus ("Điều hướng" / "Thêm" dialog open). The popover does not do this (1280→768→1280 stays closed). Cause: `useOverlay` open state survives the frame change, and only the `Sheet` stops rendering, so it remounts open. | `shots/rotate-tutor-768-1280-768.png`, `shots/rotate-student-360-800-360.png`; log `ROTBACK` |
| N-2 | S4 | Just above the two-row breakpoint, the one-row public toolbar cuts the meta error and the long name | Open `/login` at 480–690 px with meta 500, or with a 60-character name at 480–535 px | The error message is readable, as below 480 px and at ≥ 700 px | Error ellipsised: at 480 px only "Không tải đ…" is visible (104 of 302 px in vi, 84 of 270 in en); full only from 700 px. The name shows 24 characters at 480 px and 26 at 500 px (≥ 30 from about 540 px). A `title` is present. This is within AC11 (a), which only mandates 320 and 360 px, but landscape phones (568–690 px) are in this band. | `shots/pub-480-vi-err.png`; log `BAND` |

Observation (no severity): student accounts show the username on the account button because `displayName` is null in the session. That is the specified fallback.

## Accessibility summary
- axe (WCAG 2.0/2.1/2.2 A and AA tags): 0 violations of any impact on every shell page tested, with overlays open and closed, at 320/360/768/1023/1280. Also 0 on the shell and public error states (vi and en) and on `/dev/ui`, including with a Sheet open.
- Manual checks:
  - Dialogs: names "Điều hướng", "Thêm" and "Tài khoản".
  - Triggers: `aria-haspopup="dialog"` and `aria-expanded`.
  - Focus: Tab is contained inside open overlays; focus returns to the trigger on Esc, Close and tap.
  - Skip link moves focus to `main`.
  - Reduced motion is honoured.

## Isolation and privacy
- A student on any `/tutor/**` path is sent to `/forbidden`, with no 404 rendered first. Direct `GET /api/v1/tutor/students` and `/api/v1/tutor/today` with the student session return 403.
- `SECRET-` scan over every student response (session and meta on 7 page loads, plus the More sheet): 0 hits.
- I did not test student B against student A, because this task has no student-owned resources.

## Scope
Nothing untraced. The navigation has only Today and Home, with no dead items. There is no command palette, "+ New" menu or rail.

## Limitations
- Chromium only; Firefox and WebKit lack host libraries here.
- `env(safe-area-inset-bottom)` is always 0 in emulation, so I checked that the rules exist, not a real inset.
- My skeleton timing (`busyAt` about 2.8 s) is an artifact of delaying every non-entry chunk. The "busy from 0 ms" rule rests on the implementer's `loading.spec`, which passed ×20.

## Cleanup
- The gate log was copied to the scratchpad and removed from `evidence/T-M2.11/`; tracked evidence was restored with `git checkout`.
- My jar and the Vite dev server (:5199) are stopped. I ran plain `dev-down.sh` (data volume kept).
- `git status` is clean at `64a8f12`. I wrote no files in the repo and posted no PR comment.

## Files (scratchpad)
Everything is in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/1a89630f-1253-4505-ba2c-f1fca784d381/scratchpad/qa2/`:
- Specs: `a-nav.spec.ts`, `d-frame.spec.ts`, `e-band.spec.ts`, `f-skel.spec.ts`, `b-probe.spec.ts`, `c-probe.spec.ts`
- Logs: `gate.log`, `gate-20261012T082910Z.log`, `rep3.log`, `rep20.log`, `a-nav.out`, `d-frame2.out`
- Screenshots: `shots/`

I did not check Firefox or WebKit. For the 0 ms `aria-busy` rule I relied on the implementer's ×20-green `loading.spec` instead of my own measurement.

QA-VERDICT T-M2.11: PASS WITH MINOR
---

## Round 1

### QA Report — T-M2.11 App shells (independent black-box QA, gate G3)

**Verdict: PASS WITH MINOR** (one S3 and three S4 findings; no S1, S2 or SCOPE). Build `c7ede39`, branch `feature/T-M2.11-app-shells`, PR #86, 2026-10-12. Fresh evaluator context. I drafted the verdict before reading any implementation code or the implementer's tests; I read the diff only afterwards, to check the deviations and pin down F-1.

## Environment
- Kali Linux, rootless Podman. JDK 25, Node 24.
- Packaged jar on :8080, started the same way as `scripts/e2e-run.sh` (`e2e-tutor` bootstrap, raised login throttle), against the dev database.
- Chromium only. Firefox and WebKit lack host libraries on this device (not installed, as instructed).
- QA checks lived in my scratchpad, not in `qa/`, because you asked for no files in the repo tree. My Playwright config used `qa/node_modules` and seven viewports: 320×640, 360×740, 390×844, 768×1024, 1024×768, 1280×800, plus extra landscape checks at 568×320, 740×360, 844×390 and 1024×600.
- Test students were created only through the tutor API, and their passwords changed through `/auth/password`. Credentials stayed in the scratchpad and were never printed.
- Independence note: before I started, the scratchpad already held files from another agent (`router.bak`, `shell_block.txt`, `gate1.out`, …). I did not read them and worked in a separate `qa-T-M2.11/` subdirectory.

## Commands and results
| Run | Result |
|---|---|
| `ENGLMS_TASK=T-M2.11 ./scripts/gate.sh` (once, as asked) | **PASS**, 13 steps, 574 s. Backend 466 tests; web 31 files / 320 tests; budget student 173.4 KB gz (limit 200), tutor 173.4 KB gz (limit 300); E2E 216 passed, 24 skipped |
| `e2e-run.sh --no-build --project=phone-small,tablet,laptop --repeat-each=3 --retries=0` on the 6 changed specs (auth, loading, polish, route-focus, shells, smoke) | **612 passed, 36 skipped, 0 failed** |
| Same, `--repeat-each=20` on the focus, keyboard and loading specs (shells, route-focus, loading) | **1920 passed, 60 skipped, 0 failed**, no flakes |
| QA spec `shells.qa.spec.ts` × 7 viewports (29 scenarios) | **174/174 passed** after fixing my own test bugs (listed under Exploratory notes) |
| QA exploratory specs (`explore2`, probes) | Results below |

The skipped tests are the dev-server-only `/dev/ui` cases and the laptop-only guard self-tests, as in the implementer's runs. `guards.spec.ts` is not changed in the diff, although the packet lists it for retargeting.

## AC results
| AC | Scenarios | Viewports | Result | Evidence |
|---|---|---|---|---|
| AC1 | `/tutor` goes to `/tutor/today` and `/student` to `/student/home`. These paths render the 404 inside the shell with navigation visible, a link to the role home, title "Không tìm thấy trang · Eng-LMS" and one `main`: `/tutor/nope`, `/tutor/a/b/c`, `/tutor/today/x`, `/tutor/students`, `/tutor/%E2%9C%93`, `/student/a/b`, `/student/home/x`, `/student/x`, `/student/account`. Focus goes to the `h1` on client navigation; on a fresh load it stays on `body`, the same as the top-level `/nope` (T-M1.9 rule). Anonymous visitors go to `/login?next=…` with exact encoding, including `/student/home/x?y=1` → `next=%2Fstudent%2Fhome%2Fx%3Fy%3D1`. Wrong role on unknown, deep, index and home paths of both shells goes to `/forbidden`. A MutationObserver saw no 404 `h1` before any redirect | all 7 | PASS | run-all2.log ("anon", "wrong role", "404") |
| AC2 | Tutor at ≥1024: sidebar with Today (`aria-current="page"`) and the account button top right. Below 1024: menu button opens the drawer. Focus moves in; 12 Tab and 12 Shift+Tab presses stay inside; Esc and Close close it and return focus to the button. Choosing Today navigates, closes the drawer and focuses the `h1`; choosing the current item also closes it. Account section is in the drawer footer | all 7 | PASS | `*-tutor-section-open.png` |
| AC3 | Student below 768: Home and More tabs with visible labels, ≥44×44 px, a `safe-area-inset-bottom` rule present. Probe at the end of a 2000 px page: bottom 656 px vs tab bar top 679 px, so nothing is hidden. More opens a bottom sheet with a drag handle, Close button, focus trap and Esc. At ≥768: top bar with Home in the banner nav and the account button | all 7 | PASS | `*-student-default-*.png` |
| AC4 | Each place (popover, drawer, More sheet) shows "Signed in as …", the language radios, Change password and Log out. After moving the pointer away, both buttons have identical computed styles and are 44 px tall. Log out takes 2 steps from home and from a 404 at every viewport, ends at `/login`, and Back afterwards stays on `/login?next=…`. Change password opens `/change-password`; Cancel returns to the page you came from, including a 404. A language change re-renders the shell at once (h1, title, dialog) and survives a reload | all 7 | PASS | "logout … steps 2", "cancel →" |
| AC5 | The shell shows "Eng-LMS" exactly once, never "Eng-LMS Eng-LMS". `/login`, `/forbidden` and `/change-password` show the name above the `h1`. Cold `/login` requests in this order: session request, session response, then meta request and response. Shell and public error states both offer Retry, nothing interactive is nested, and Retry recovers | all 7 | PASS (see F-1, F-2 for layout) | "order" log, `*-meta-error-*.png` |
| AC6 | vi "Không tải được tên không gian dạy học"; en "Couldn't load the workspace name" | all | PASS | "login meta.error" |
| AC7 | One-row top bars in vi and en (row spread 0 px). 60-character names (ASCII and Vietnamese) end in an ellipsis with a full-text `title`. No horizontal scroll at 320–1280 with overlays closed and open, including a 40-character username and a long name together | all 7 | PASS for the loaded state; **F-1** in the error state | `*-long-*.png`, `*-longuser-*.png` |
| AC8 | `aria-busy` with the label "Đang tải trang" while the shell chunk is held. Skeleton follows the frame: menu button at 360, sidebar and account block at 1280, Home and account blocks at 768, tab-bar area on phone. `loading.spec` ×20 green | all 7 | PASS (S4 F-3) | `*-skeleton.png` |
| AC9 | axe: no serious or critical issues with the drawer, sheet or popover open, on shell 404s, `/login`, `/forbidden`, `/nope` and `/change-password`. Keyboard: the skip link is the first Tab stop, every stop has a visible ring, and Enter on the trigger then Tab 3–5 times reaches Log out, which signs out. Nav-item click from a 404 focuses the `h1`. With reduced motion: no slide animation or transform transition | all 7 | PASS | "tab order", "axe", "reduced moving []" |
| AC10 | Gate green (my run). Budgets green. A student session fetches no `TutorShell` chunk (only the shared `index` contains the string `/tutor/today`, from the route table). `ShellLayout.tsx` was deleted | — | PASS | gate log |

## Exploratory charter: "a viewport or language where the frame overlaps, hides content or loses the way to log out"
- **Browser Back while open** (after a client-side navigation, all viewports): the overlay closes, the URL changes, focus lands on the `h1`, and nothing stays inert or scroll-locked. Forward with the overlay open behaves the same.
- **Resizing across 768/1024 while open** (360→800→1100→400→1280→700 and the reverse): the open account section either re-renders in the form for the new width (popover becomes drawer or bottom sheet, and back) or closes cleanly. There was never horizontal scroll, never a leftover `inert` or `overflow:hidden`, and Log out was always reachable afterwards.
- **Short landscape** (568×320, 740×360, 844×390, 1024×600): Log out is reachable in every overlay. At 568×320 the More sheet scrolls internally and Log out sits flush with the bottom edge (sub-pixel).
- **Long names**: a 60-character workspace name plus a 40-character username at 768 px fits in one row. The account button is capped at 192 px and carries a full-text `title`; the popover shows the full username, wrapped.
- **My own test bugs, corrected and not counted as findings**: measuring the dialog mid-animation, the en Retry label ("Try again"), a selector that used the project width after resizing (this caused an apparent 2-minute "hang"), and hover state when comparing button styles. A one-off `page.screenshot` timeout after a resize did not reproduce in 4 targeted reruns.

## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| F-1 | **S3** | The public toolbar wraps to two rows in the meta-error state on phones, which moves the `h1` down | Make `GET /api/v1/meta` return 500; open `/login` or `/forbidden` at 320, 360 or 390 px, vi or en | One toolbar row at 360×740 in vi and en (AC7), with a compact error | Error and Retry on row 1, switcher on row 2 (Retry centre y=46, switcher y=103). `h1` moves from y≈94 to 150. CLS on `/login` 0.074–0.101, above the 0.05 used by `polish.spec` AC3. Tablet and laptop stay one row (CLS ≤ 0.0013) | `phone-small-public-error-*`, `w320-login-meta-error-vi.png`. This is deliberate in `web/src/app/routes/Page.module.css` (`.toolbarName:has([role='alert']) { flex-basis: 12rem }`, whose comment says the error "wraps to a row of its own"), but it is not disclosed in the summary's deviations. Either fix it or record it as an LC decision |
| F-2 | S4 | The shell's compact error message is cut to a few characters on phones | Make meta return 500; open `/tutor/today` at 320 or 360 px | A readable compact error | 320 en shows "Eng-LMS Co… Try again"; 360 vi shows "Không tải …". Retry still works and the text has a `title` (which touch users can't reach) | `w320-tutor-meta-error-en.png`, `phone-small-tutor-meta-error-vi.png` |
| F-3 | S4 | The laptop tutor skeleton's sidebar column is shorter than the real sidebar | Hold the `TutorShell` chunk; open `/tutor/today` at 1280×800 | The skeleton frame matches the full-height sidebar | The white sidebar column ends at y≈380, then jumps to full height when loaded | `laptop-tutor-skeleton.png` vs `laptop-tutor-default-vi.png` |
| F-4 | S4 | On the public pages at 320 px, a long workspace name shrinks to about 2 characters | Mock a 60-character name; open `/login` at 320 px in en | Some recognisable part of the name | "LL…" (360: "LLLLLL…"). The `title` exists but anonymous touch users cannot reach it, and the full name is only shown in Settings (T-M2.6), which they never see | `w320-login-long.png` |

No SCOPE findings. `ButtonLink`, same-page route focus and closing overlays on navigation are implementation means for AC2, AC4 and AC9, not untraced features.

## Implementer deviations (from `evidence/T-M2.11/summary.md`)
1. **Retargeted spec inputs:** justified. `/tutor/students` and `/student/x` are correctly 404s now. The diff changes only inputs and target URLs, plus an Esc in `smoke.spec` to close the modal before reading the page. No assertion was dropped beyond the three DEC-112 (5) changes; `loading.spec` skips the end-control check only where the bar has none, as scope 11 (b) allows.
2. **Unit test adjustments:** consistent with black-box behaviour. For example, Back after logout gives `/login?next=%2Ftutor%2Ftoday`, which I observed in E2E.
3. **ButtonLink, same-page route focus, overlays closing on navigation:** behaviour verified. Possible future risk, not a finding: a same-path navigation with a new key and no hash, such as a future `navigate(..., {replace})` after a save, will now move focus to the `h1`.
4. **Index loader awaits the guard (`router.tsx`):** correct. The guard functions are unchanged; anonymous `/tutor` gives `next=%2Ftutor` and `/student` gives `next=%2Fstudent`. No file under `features/auth/**`, `lib/api/**` or `app/guards.ts` changed, so the SEC trigger condition is not met.

## Accessibility summary
- axe (wcag2a/aa, 21a/aa, 22aa): 0 serious or critical issues on both shells with every overlay open, on shell 404s and on the public pages, at all 7 viewports.
- Landmarks: one `header`, one `main`, labelled navs ("Điều hướng gia sư" / "Điều hướng học viên").
- Focus trap, Esc, focus return, visible focus rings and the skip link as first Tab stop all verified. Reduced motion verified.
- No manual screen-reader pass.

## Isolation and privacy
- Student session: no `SECRET-*` in any JSON, JS or text response.
- `GET /api/v1/tutor/students` as a student returns 403.
- Wrong role on every shell path goes to `/forbidden`, never a 404 first.
- Student B vs A: not applicable. This task adds no per-student resources.

## Limitations
- Chromium only; Firefox and WebKit can't run on this host.
- Safe-area padding was checked as a CSS rule, not on a real notched device.
- No manual screen-reader pass.
- `/dev/ui` entries were not checked (dev-server only; skipped in the E2E runs).
- The gate was run once, as instructed (AC10 asks for two consecutive runs; the implementer recorded two).

## Cleanup
- `git checkout -- evidence/T-M2.11`; the untracked gate log was copied to my scratchpad, then deleted. `git status` is clean.
- My app instance is stopped and plain `scripts/dev-down.sh` ran (data volume kept).
- No commits, pushes or PR comments.
- Three QA students now exist in the dev database (`qa-m211-a-*`, `qa-m211-long-*`, `qa.long.*`). I did not archive them; doing so is a state change for the PO or LC to decide.

Files are in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/1a89630f-1253-4505-ba2c-f1fca784d381/scratchpad/qa-T-M2.11/`:
- `shells.qa.spec.ts` (main QA spec), `helpers.ts`, `explore2.spec.ts`
- `run-all2.log` (full matrix), `e2e-x3.log`, `e2e-x20.log`, `gate.out`
- `shots/` (screenshots)

QA-VERDICT T-M2.11: PASS WITH MINOR