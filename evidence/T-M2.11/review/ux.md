# T-M2.11 UX review record (fresh reviewers; recorded by the LC from the returned text)

Final verdict: **APPROVED** at `93698aa` (round 2). Reviewer scratchpad paths are session-local and not kept.

---

## Round 2

I re-checked every round-1 finding on the live app at `93698aa` and all eight are fixed, along with the two QA follow-ups (i) and (j). The whole change shows no regressions, and I found one new minor (S4) issue, so the verdict is APPROVED.

**How I tested:** the packaged jar on :8080, started the way `scripts/e2e-run.sh` starts it, with the `e2e-tutor` session and the shared student created through the tutor API by the e2e global setup. I drove it with Playwright scripts in the scratchpad at 320×640, 360×740, 390×844, 568×320, 740×360, 768×1024, 1024×768 and 1280×800. I covered `/login`, `/tutor/today` and `/student/home` in vi and en, with `/api/v1/meta` returning 200, a 60-character name, 500, and a 60 s hang.

## Round-1 findings

| ID | Sev | Status | What I saw on the live app |
|---|---|---|---|
| UX-1 (+ QA F-1, F-4, F-2 public) | S2 | **Fixed** | Below 768 px the public frame has a two-line name row, then the language switcher row. The 60-character name shows in full or nearly in full at 320, 360, 390, 568 and 740 (`vi_login-long-320.png`, `en_login-long-568.png`). The error message is never cut at any width. `h1` top is 155.6 px in all four meta states below 768 and 94 px at 768 and above. At 768 and above it is one row, with ≥ 30 characters plus an ellipsis at 768. The carried T-M2.4 note "no identity on public pages" is closed at every width. |
| UX-2 | S3 | **Fixed** | The `h1` and document title match the nav labels in both languages: "Hôm nay · Eng-LMS" / "Today · Eng-LMS" and "Trang chủ · Eng-LMS" / "Home · Eng-LMS". |
| UX-3 (+ QA F-2 shell) | S4 | **Fixed** | In a narrow shell top bar (tutor 320–390; student 320–390 and 768) only an icon and Retry show. The message stays in the alert as visually hidden text and Retry's `aria-describedby` points to it. Above 22rem the full message shows. Layout detail in UX-9 below. |
| UX-4 (+ QA F-3) | S4 | **Fixed** | At 1280 the tutor skeleton sidebar runs to the viewport bottom (sidebar bottom 800 = viewport height). The skeleton title sits at 93 px, the same as the real `h1` (`skel-_tutor_today-1280.png`). |
| UX-5 | S4 | **Fixed** | The focus ring is 2 px with a −2 px offset, inside the drawer, sheet and popover, and follows their corners (`ring-tutor-360.png`, `ring-student-768.png`). |
| UX-6 | S4 | **Fixed** | Opening an overlay, then resizing across the breakpoint, moves focus to the new frame's trigger, never `body`. I tried tutor 768↔1280 and 360↔1280, popover 1280↔768, student More 360↔800, and student popover 1024↔390. |
| UX-7 | S4 | **Fixed** | The shell 404 link reads "Về Hôm nay" / "Về Trang chủ" at 360, 768 and 1280. |
| UX-8 | S4 | **Fixed** | The unused `shell:home` key is gone from both locale files. |
| QA N-1 / (i) | S4 | **Fixed** | An overlay closed by a frame change stays closed when the frame changes back (0 dialogs, `aria-expanded=false`). Enter reopens it and Esc returns focus to the trigger. |
| QA N-2 / (j) | S4 | **Fixed** | The public frame has two rows at 568 and 740, one row at 768, 1024 and 1280. |

## New findings

| ID | Sev | Screen / viewport | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| UX-9 | S4 | Shell top bar with a meta error, compact mode: tutor 320–390, student 320–390 and 768 | Retry is pushed to the far end of the identity area, away from its icon. At tutor 360 the icon is at x≈165 and "Thử lại" at x≈300. At student 768, "Try again" sits right next to the "Home" nav item and reads like a nav entry. Nothing visible says what failed: the icon has no `title`, so a sighted mouse user sees "!" and "Try again" with no subject. | `vi_tutor_today-error-360.png`, `en_student_home-error-768.png` | Inside `@container workspace-error (width < 22rem)`, reset `.error > :last-child { margin-inline-start: 0 }` so Retry sits beside the icon. Give the icon wrapper `title={t('meta.error')}`. Non-blocking; fine to carry as a follow-up note. |

## Checklist

- [x] **Hierarchy:** one `h1` per page, titles equal the nav labels, no competing primary action in the frame.
- [x] **System:** the round 2/3 CSS uses only tokens. The only raw values are the documented `768px` breakpoint and the 1 px visually-hidden pattern. No design-system §6 anti-patterns.
- [x] **States:** meta loading, loaded, long name, error and hang; route-loading skeletons for tutor 1280/768, student 360 and login 320/360/740.
  - Skeleton title vs real `h1`: 0–2 px apart.
  - The 500 error shows after about 3.3 s because of the query library's default retries. That is existing behaviour, noted for information only.
- [x] **Responsive:** no horizontal scroll at any of the 8 widths, in any language or meta state, or with an overlay open during a resize. Shell top bars stay one row; long names truncate with a `title`.
- [x] **Targets:** every frame control is ≥ 44 px (Retry is 86/106×44). The only hit was the native 13×13 "remember me" checkbox inside its 44 px label, which predates T-M2.4.
- [x] **Keyboard and focus:**
  - The skip link is the first Tab stop, and the tab order is logical.
  - Opening an overlay focuses the dialog, Tab is trapped inside it, and Esc returns focus to the trigger.
  - Frame changes behave as in UX-6.
- [x] **Colour independence:** the public error is text, the shell error is icon plus Retry plus alert text.
- [x] **Accessibility (axe, wcag2a/aa, 21aa, 22aa):** 0 violations on login 320 (error), tutor 360 (error, closed and drawer open), student 360 (More open), student 768 (error) and tutor 1280 (popover open).
- [x] **Copy:** "Không tải được tên không gian dạy học" / "Couldn't load the workspace name" is specific and reads naturally; "Về Hôm nay" / "Back to Today" are correct.
- [x] **Step budgets:**
  - Log out: 2 steps (trigger, then Đăng xuất) in every shell frame.
  - Language: 1 step on public pages, 2 from a shell.
- [x] **Carried T-M2.4 note "no identity on public pages":** closed at 320 through 1280.

## Not checked

- `/dev/ui` on the Vite dev server: I only saw the Sheet and Popover ring changes in the live shells.
- `/change-password` and `/forbidden` public frames: they share `PublicPage` with `/login`, which I covered.
- A manual screen-reader pass.
- Reduced motion.
- Browsers other than Chromium.
- Real-device rotation: I used viewport resizes.
- I did not re-run the gate or the e2e suite.

**Housekeeping:**
- My screenshots and metric files are only in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/1a89630f-1253-4505-ba2c-f1fca784d381/scratchpad/pw/shots/`. Nothing was written to the repo and no PR comment was posted.
- The jar is stopped, plain `scripts/dev-down.sh` ran (data volume kept), and `git status` is clean.
- The e2e global setup created one more shared student in the dev database through the tutor API.

UX-REVIEW T-M2.11: APPROVED

---

## Round 1

### UX review: T-M2.11 App shells (G3)

**Verdict: changes requested.** There is one S2: on phones the public pages still don't really show the workspace name, which is one of the four T-M2.4 notes this task must close. There are two S3s and five S4s. The shells themselves are good: one row, no horizontal scroll anywhere, focus traps work, and both step budgets are met. The fix for the S2 also covers QA's F-1, F-2 (public part) and F-4.

PR #86, `feature/T-M2.11-app-shells` at `c7ede39`.

**How I checked:**
- I read the packet, DEC-112/113, the T-M2.4 carried notes, `summary.md`, about a dozen implementer screenshots and the frontend docs.
- I rebuilt the packaged JAR the way `e2e-run.sh` does and ran it against the dev DB. Sign-in used `e2e-tutor` from `.data/e2e/`. I created one student through the tutor API and did its forced password change through the API.
- My Playwright scripts (scratchpad only) covered 320, 360, 390, 768, 1024 and 1280 in vi and en, for both shells and `/login`. States: default, overlay open, 404, `/api/v1/meta` returning 500, and a mocked long workspace name. I also ran slowed lazy chunks for the skeletons, language switch, Change password then Cancel, Back with an overlay open, and resizing across 768/1024 with an overlay open.
- Screenshots are in the scratchpad `shots/` folder (not kept in the repo).

## Findings

| ID | Sev | Screen / viewport | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| UX-1 (QA F-1, F-4, public part of F-2) | **S2** | `/login`, `/change-password`, `/forbidden`; 320–390 px; vi and en | **Public pages show almost none of the workspace name on phones.** The language switcher takes about 240 px, so the name gets 38 / 78 / 108 px at 320 / 360 / 390. At 360 (a mandatory viewport, and the main student device): "Tiếng Anh cô Lan" (16 chars) shows as "Tiếng A…", and "Lớp tiếng Anh cô Phương Lan" fares no better. At 320 even the dev name "Eng-LMS" shows as "En…", and a 60-char name shows 2 chars (QA F-4; the cause is all names, not just long ones). The full text is only in a `title`, which touch can't reach (design-system §6 items 5 and 10). In the meta-error state the row wraps: the h1 moves from 94 to 150 px (+56) at 320–390, after the default retries finish (~7 s), so the form jumps while the user may be typing (QA F-1 confirmed; CLS 0.07–0.10). The message is cut to "Không tải được tên k…" (F-2). The code meets the AC wording (truncation + `title`), but not the purpose of the carried note "the public pages show no workspace identity". | `shots/login-name-16-360.png`, `login-ok-320-vi.png`, `login-long-320-*.png`, `login-err-360-en.png` (h1Top 94 → 150) | Below `sm` (480 px), give the public frame **two fixed rows in every state**: (1) the identity row at full width, where the name wraps to at most 2 lines (`overflow-wrap: anywhere`, line-clamp 2 + `title`) and the compact error's message may also wrap to 2 lines, with Retry at the end; (2) the switcher row, end-aligned. `RouteLoading` draws the same two rows below `sm`. At ≥ 480 px keep today's single row. Remove the `.toolbarName:has([role='alert']) { flex-basis: 12rem }` rule, since no state changes the row count any more. The LC records a DEC rewording AC7 for the public frame ("one row at ≥ sm; below sm a name row and a switcher row, the same in every state"); the shell top bars stay one row. Add E2E at 320/360: a 60-char name shows ≥ 30 characters, and the h1 top is equal in loading, loaded and error states (CLS ≤ 0.05). No one-row variant works at 320, because the switcher alone leaves 38 px. |
| UX-2 | S3 | Tutor Today and student Home, all viewports, vi and en (the summary's open question) | The h1 and document title ("Không gian gia sư" / "Tutor workspace", "Trang của học viên" / "Student home") don't match the current nav item ("Hôm nay" / "Today", "Trang chủ" / "Home"). The page the user lands on doesn't confirm where they are, and screen-reader users hear two names for one place. | `shots/tutor-1280-*.png`, `student-768-en.png` | **Recommendation:** make the h1 and `usePageTitle` match the nav label now: "Hôm nay" / "Today" and "Trang chủ" / "Home". That means changing `shell:tutor.title` and `shell:student.title` in vi and en and updating the assertions that read them. The placeholder empty-state copy can stay until the real pages. Rule for later tasks: a nav item's label equals its page's h1. |
| UX-3 (QA F-2, shell part) | S4 (QA's rating confirmed) | Shell top bar with a meta error; tutor 320–390, student 320 | The compact error beside "Eng-LMS" is cut to "Khôn…" / "Không tải được tên k…" (56–126 px). The meaning is only in a hover `title`. | `shots/tutor-err-320-vi.png`, walk data | Add a container query on `.identity`: when the room is under about 16rem, visually hide the message but keep it as visually-hidden text in the `role="alert"` region, show an `AlertCircle` icon (aria-hidden) before Retry, and link the message to Retry with `aria-describedby`. The visible "⚠ Thử lại" next to "Eng-LMS" is enough. Above 16rem, keep today's text. |
| UX-4 (QA F-3) | S4 (confirmed) | Tutor loading skeleton at 1024 and 1280 | The sidebar skeleton column is 311 px tall on an 800 px viewport; the real sidebar runs the full height. The skeleton's frame is not wrapped in `.shell` (`min-block-size: 100dvh`, flex column), so `.body` doesn't stretch. | `shots/skel-tutor-1280.png` vs `skel-tutor-1280-done.png` | In `RouteLoading.tsx` `ShellSkeleton`, wrap the returned fragment in `<div className={shellStyles.shell}>`. Add a `RouteLoading` test or E2E check that the sidebar skeleton's bottom edge equals the viewport height. |
| UX-5 | S4 | Drawer, More sheet and account popover opened by keyboard, all viewports | Focus lands on the dialog container (fine). Its focus ring draws a square frame around the rounded popover, and on the drawer a stray 2 px blue line along its inner edge at x≈322, because the rest of the ring is off-screen. It looks like a rendering glitch. | `shots/tutor-1280-en-open.png`, `tutor-768-vi-open.png`, `student-360-en-open.png` | In `Sheet.module.css` and `Popover.module.css`, set `.dialog:focus-visible { outline-offset: calc(-1 * var(--focus-ring-width)); border-radius: inherit; }` so the ring sits inside the panel and follows its corners. Don't remove the ring. |
| UX-6 | S4 | Overlay open, then resize or rotate across `lg` (tutor) or `md` (student), e.g. an iPad rotating 768 ↔ 1024 | The overlay unmounts with the frame and focus falls to `body` (WCAG 2.4.3). | flows probe: "after resize: dialogs 0, focus BODY", at 1280 → 800 and 360 → 1100 | In both shells, when `wide` changes and `document.activeElement` is `body`, focus the new frame's trigger (account button or menu button). Add a component test. |
| UX-7 | S4 | Shell 404, both roles, vi and en | The link reads "Về trang đầu" while the destination's nav item is "Trang chủ" / "Hôm nay", so one place has two names. | `shots/student-404-360-vi.png` | `ShellNotFound` passes a label naming the destination: "Về Hôm nay" / "Back to Today", "Về Trang chủ" / "Back to Home". The top-level 404 keeps `notFound.home`. |
| UX-8 | S4 | i18n | `shell:home` ("Trang đầu" / "Start page") is not used anywhere. AC10 asks for unused keys to be removed. | grep of `web/src` | Delete the key in vi and en. |

## Checklist

| Item | Result |
|---|---|
| Hierarchy | Pass. One h1 per page (also on 404s), no competing primary action, quiet frame. Title mismatch is UX-2. |
| System | Pass. Only `ui/` components and tokens. The current item is marked by colour plus a bar (NavList, BottomTabs). No §6 anti-patterns except the truncation-only-in-`title` cases (UX-1, UX-3). |
| States | Pass with notes. Loading skeletons match the frame at every breakpoint except the sidebar height (UX-4). The meta error state exists in both places but shifts the layout on public phones (UX-1). Nested 404 works for both roles, including deep paths. |
| Responsive | Pass at all six widths with overlays closed and open: no horizontal scroll (`scrollWidth ≤ innerWidth`). Shell top bars are one row (69 px) at every width in vi and en, including the 60-char name. The public row is UX-1. The drawer is a start-edge sheet below 1024 and the More sheet is a bottom sheet with handle and Close. Content is clear of the tab bar. |
| A11y | Pass. The skip link is the first Tab stop. Order is skip → menu/home/account → nav. Focus is trapped in the drawer, sheet and popover (cycles verified) and returns to the trigger on Esc. Route focus lands on the h1 after Change password → Cancel. Back with an overlay open closes it and navigates. A language switch keeps the popover open and focus on the chosen radio, and `html lang` updates. Every target I measured is at least 44 px (React Aria's hidden Dismiss buttons and the visually hidden checkbox input are excluded). Gaps: UX-5, UX-6. |
| Copy | Pass apart from UX-2 and UX-7. vi reads natively ("Đã đăng nhập: …", "Mở điều hướng", "Thêm"). `meta.error` now says workspace, in vi and en (AC6). |
| Budgets | Log out: 2 steps at every viewport for both roles (account button, menu button or More, then Log out); this matches the `steps-logout-*` records. Language: 1 step on public pages, 2 in the shells. Both are within ux-flows.md and DEC-112 (5). |

**Carried T-M2.4 notes:**
- Three-row header at 360: closed.
- "Eng-LMS Eng-LMS": closed.
- Change password and Log out look different: closed (same secondary kind).
- No identity on public pages: closed on tablet and laptop, **not on phones** (UX-1).

**Observations (not findings):**
- Students see their username in the account button and in "Đã đăng nhập: …" rather than their full name, because the session's `displayName` is empty for students. This belongs to T-M2.7.
- At 768 the student's nav items sit at the end of the bar, next to the account button. When Work, Lessons and Plan arrive, check how much room the workspace name keeps.

## Not checked
- axe and reduced motion: I relied on the gate's E2E runs.
- No screen-reader pass.
- `/dev/ui`: implementer screenshots only, Vite not run.
- Change password and Log out were not run end to end at every viewport; the Log out step counts are the E2E records plus visual confirmation.
- Swipe on real touch hardware.

## Cleanup
- I stopped my JAR and ran plain `scripts/dev-down.sh`; the data volume is kept.
- I didn't run the gate or the E2E suite, so `evidence/T-M2.11` is untouched, and `git status` is clean.
- No PR comment posted, no files written in the repo.

UX-REVIEW T-M2.11: CHANGES REQUESTED