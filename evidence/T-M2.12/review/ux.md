# T-M2.12 UX review record (fresh reviewer; recorded by the LC from the returned text)

Final verdict: **APPROVED** at `5ed3f4d` (round 2). Reviewer scratchpad paths are session-local and not kept.

---

## Round 2


Round 2 on head `5ed3f4d`. AC11 (a)–(d) all work as specified, and I found nothing at S1–S3. There is one new S4 copy note (UX-6).

**How I checked:** I ran the packaged jar (it includes the round-2 strings) on port 8090. The stored e2e sessions had expired, so I refreshed them by running `smoke.spec.ts` on the laptop project against 8090; that is the harness's own global setup and it wrote nothing to tracked files. I checked 320×640, 360×740, 768×1024, 1024×768 and 1280×800 in vi and en with Playwright and axe. I posted no PR comment, made no commit and wrote no repo files. The app is stopped and the tree is clean.

The dev database (`englms-dev-db`) was down today, so I started it with `scripts/dev-up.sh` (no purge). It is still running.

**Round 1 recap** (head `57ce8df`, APPROVED): five S4 findings, no blockers. The progress line, the chunk and offline error pages and the UX-9 top-bar layout all passed. Axe was clean, there was no horizontal scroll, targets were at least 44 px and focus behaved correctly.

**Status of round-1 findings**

| ID | Sev | Status | Verified |
|---|---|---|---|
| UX-1 | S4 | **Fixed** (AC11 b) | The pages now have their own h1 and document title: "Bạn đang ngoại tuyến" / "You're offline" and "Không tải được trang này" / "This page couldn't load", each followed by " · Eng-LMS". The generic page keeps "Không hiển thị được trang này" / "This page couldn't be displayed". |
| UX-2 | S4 | **Fixed** (AC11 c) | Retry and the generic "Reload page" now use the primary style (white on `rgb(47,93,140)`). The start-page link stays a quiet link with a transparent background. The focus ring on the primary Retry is clearly visible (`offline-retry-focus-w360-vi.png`). |
| UX-3 | S4 | Deferred to backlog T-M2.13 | Not re-checked; that code did not change in round 2. |
| UX-4 | S4 | Deferred to backlog T-M2.13 | Not re-checked; no visible change. |
| UX-5 | S4 | **Fixed** (AC11 d) | The animation uses `--motion-duration-progress: 1.2s` from `tokens.css`; the computed duration is 1.2s. Axe is clean with the line showing. |
| QA F-1 | S4 | **Fixed** (AC11 a) | At every viewport and in both languages the page follows the connection while it is shown. Offline shows the offline h1 and title. When the connection returns, the page switches to the couldn't-load h1 and title, and Retry keeps focus. Going offline again switches back. Retry while offline keeps focus and re-announces the message; Retry online loads `/student/home` with the language kept. |

**New finding**

| ID | Sev | Screen / viewport | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| UX-6 | S4 | Offline and couldn't-load pages, all viewports, vi and en | Each description now starts by repeating its h1: "You're offline" then "You're offline. This page needs…", and "Không tải được trang này" then "Không tải được trang này. Hãy kiểm tra…". It reads as an echo. | `r2/shots/offline-w320-en.png`, `r2/shots/flip-online-w320-vi.png` | Drop the first sentence of each description: "Trang này cần kết nối mạng để tải." / "This page needs a connection to load." and "Hãy kiểm tra kết nối mạng rồi thử lại." / "Check your connection and try again." Then make the offline Retry announcement read the title plus the description, so it still says "you're offline". Fine as a T-M2.13 note. |

Two smaller things I saw and am not filing:
- When the connection comes back, the h1 changes without an announcement. Retry works in either state, so nothing is lost.
- At 320 vi the longer couldn't-load h1 wraps to two lines, which moves Retry down 30 px when the copy flips. The user's own reconnect causes it, so it is not a load-time layout shift.

**Checklist**
- [x] **Hierarchy:** one h1 that names the cause, then the description, then one primary action (Retry or Reload) and the quiet start-page link.
- [x] **System:** `ui/` Button `primary` and the new motion token; no raw values were added.
- [x] **States:** offline, couldn't-load and generic (with request ID) all render. The copy follows `online`/`offline` events. Nothing reloads on its own.
- [x] **Responsive:** horizontal overflow was 0 in all 30 runs (5 viewports × vi/en × 3 states). At 320 en the start-page link wraps below Retry without clipping.
- [x] **A11y:**
  - Axe found no violations in any of those 30 runs, nor with the progress line showing.
  - Targets: Retry 86–106×44 px, Reload 124–134×44 px, start-page link 116–177×44 px.
  - Focus: after a client-side navigation it lands on the h1. Retry keeps focus through the offline re-announcement and the online flip.
  - On a first-load error focus stays on `body`, the same as before round 2.
- [x] **Copy:** vi and en titles read naturally and are correct (see UX-6 for the repetition).
- [x] **Budgets:** recovery is still one step (Retry).

Screenshots and the full measurement log are in `<reviewer-scratch>/r2/shots/` (`offline-*`, `flip-online-*`, `failed-*`, `generic-*`, `offline-retry-focus-*`, `log.txt`). Round-1 screenshots are in `.../scratchpad/shots/`.

Not checked: AC11 (e) and (f) (query reset on a user switch, back/forward cache resync), which have no visible UI and belong to SEC/QA; Firefox and WebKit; the `/dev/ui` entry (it did not change in round 2).

---

## Round 1 (`57ce8df`)


I found no S1, S2 or S3 issues. I ran the packaged jar from head `57ce8df` on port 8090 and drove it with Playwright, using the stored e2e-tutor and e2e-student sessions. I checked five viewports (320×640, 360×740, 768×1024, 1024×768, 1280×800) in both vi and en. For `/dev/ui` I used the dev server already running on :5173, with its API calls routed to my instance. As you asked, I wrote nothing to the repo, posted no PR comment and made no commit. The app is stopped and the tree is clean.

**Findings** (all S4, none blocking)

| ID | Sev | Screen / viewport | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| UX-1 | S4 | Chunk error page, all viewports, vi and en | The h1 is still the generic "This page couldn't be displayed" / "Không hiển thị được trang này". Only the line under it gives the cause (offline or couldn't load). The packet allows this (implementer decision), but the cause is not visible at a glance. | `shots/offline-w360-vi.png`, `shots/failed-w1280-en.png` | Later copy pass: give the chunk and offline cases their own h1, e.g. "You're offline" / "Bạn đang ngoại tuyến". |
| UX-2 | S4 | Chunk error page, all | Retry is the page's main action but uses the secondary button style, so the page has no primary action. This copies the existing Reload button, so it is not new. | same | Make Retry (and the generic Reload) the primary button; keep "Go to the start page" as the quiet link. |
| UX-3 | S4 | Narrow shell top bar meta error (tutor 320/360; student 320/360/768) | The UX-9 fix works: Retry sits 8 px from the icon, and the icon's `title` holds the `meta.error` text. Left over: `title` only shows on mouse hover. On touch phones, which is exactly where this compact mode appears, a sighted user sees "!" and "Thử lại" with no subject (design-system §6.5, hover-only information). Screen readers are fine. | `shots/meta-tutor-w360-vi.png`, `shots/meta-student-w768-en.png` | Follow-up: make the icon open a small Popover with the message on tap, or show a short visible label such as "Tên lỗi" / "Name failed". |
| UX-4 | S4 | Cross-tab sign-out, tab A | Tab A lands on `/login?next=…` with no explanation. A user returning to that tab just finds the sign-in form, with nothing saying they were signed out from another tab. The packet says "no other copy changes", so this is out of scope here. | `evidence/T-M2.12/impl/phone-small/cross-tab-signed-out-tab-a-vi.png` | Follow-up packet: a quiet info line on `/login` after a cross-tab sign-out, e.g. "Bạn đã đăng xuất ở một thẻ khác." |
| UX-5 | S4 | `ProgressLine.module.css` | The animation length is a raw `1.2s` and the travel distances are raw percentages. This is allowed (§6.11 covers colours, spacing and z-index only, and stylelint passed), but it is a motion value outside the tokens. | source | Optionally add `--motion-duration-progress: 1.2s` to `tokens.css`. |

On the QA items: I agree with F-1 at S4. While the copy is stale, Retry still recovers with one press. O-1 and O-2 are outside this review.

**Checklist**
- [x] **Hierarchy:** both the chunk and offline pages have one h1 (focused when the error shows), a specific description, then Retry and the start-page link. The progress line keeps the current page visible and usable. Focus stays on the link that was activated, then moves to the new page's h1.
- [x] **System:** only `ui/` components and tokens. The line uses `--color-accent`, `--z-toast` and the new `--size-progress-line` token. No §6 anti-patterns: no spinner page, no layout shift, the line is fixed and ignores pointer events.
- [x] **States:**
  - A slow navigation shows the line and the "Đang tải trang" / "Loading the page" status. They appeared after about 150 ms and were removed afterwards.
  - Offline shows the offline copy and Retry. Pressing Retry while offline keeps focus on Retry and announces the message again in the status region.
  - When the chunk request is aborted online, the couldn't-load copy shows.
  - Reduced motion gives a static line across the full width (animation `none`, width = viewport); I checked this in `/dev/ui` at 360 and 1280.
- [x] **Forms:** not affected.
- [x] **Responsive:** horizontal overflow was 0 at all five widths for every state. At 320 en the start-page link wraps below Retry without clipping.
- [x] **A11y:**
  - axe found 0 violations on the progress, offline, failed and meta-error states (all five viewports, vi and en) and on `/dev/ui`, with motion on and reduced.
  - The line is `aria-hidden` and cannot take focus.
  - Retry is 86–106×44 px and the start-page link 116–177×44 px.
  - The meta Retry is 44 px tall.
  - The meta error does not rely on colour alone: a screen reader gets the visually hidden message and the icon has a `title`.
  - From the keyboard: Retry, then Tab to the start-page link.
- [x] **Copy:**
  - vi reads naturally: "Bạn đang ngoại tuyến. Trang này cần kết nối mạng để tải.", "Không tải được trang này. Hãy kiểm tra kết nối mạng rồi thử lại.", "Thử lại".
  - en is correct, with no "Something went wrong".
  - The `/dev/ui` strings are present in both languages.
- [x] **Budgets:** recovering from a failed chunk takes one step (Retry), and the language is kept after the full reload. Cross-tab handling adds no steps.
- [x] **UX-9 (AC8):** the gap is 8 px at tutor 320/360 and student 320/360/768; `title` equals `meta.error`. From 1024 up, the wide layout is the same as T-M2.11 approved.

Screenshots are in `<reviewer-scratch>/shots/` (`progress-*`, `offline-*`, `failed-*`, `meta-{tutor,student}-*`, `devui-*`, plus `log.txt` with all the measurements). They are outside the repo; copy them into `evidence/T-M2.12/review/` if the PR record needs them.

What I didn't check: Firefox and WebKit, any in-shell navigation slowed by a loader (all shell routes share one chunk today), and two-tab runs by hand (I relied on the implementer's cross-tab screenshot and the e2e assertions).
