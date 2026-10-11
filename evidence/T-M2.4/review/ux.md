# T-M2.4 UX review record (fresh reviewer; recorded by the LC from the returned text)

## Round 2

### UX review round 2: T-M2.4 Auth UI (G3)

**Verdict: approved.** All seven round 1 findings are fixed, and I checked each one on the live app at 360×740, 768×1024 and 1280×800. I found no new problems.

**Branch:** `feature/T-M2.4-auth-ui` at `4b403a7`. The fixes are in `073c71d` and `6aefd73`; `4b403a7` only adds evidence.

**How I checked:**
- I ran the packaged JAR the same way `e2e-run.sh` starts it, without rebuilding. The JAR came from the gate run on `6aefd73`, and its SPA bundle contains the new copy. There are no web changes after `6aefd73`.
- Signed-in screens used the harness's stored tutor and student sessions. I created three new students through the tutor API (one per viewport), as the harness does.
- At the end I stopped the app and ran `dev-down.sh` without `--purge`. The data volume is kept. The tree is clean at `4b403a7`. I made no PR comments.

My screenshots are in (session-local scratchpad, not kept). The results were the same at all three viewports.

## Round 1 findings

| ID | Was | Result | What I saw |
|---|---|---|---|
| UX-1 | S2 | **Fixed** | The first failed submit now moves focus to the error summary (`DIV role=alert`), by click and by Enter, in both modes:<br>• voluntary (tutor): empty fields, and too short plus mismatch;<br>• forced (new student): empty fields.<br>Login keeps its documented behaviour: an empty submit focuses the first invalid field (`#login-username`). |
| UX-2 | S3 | **Fixed** | The "Forgot your password?" disclosure now has a chevron that points right when closed and down when open. Enter opens it, the focus ring is visible, and the target is still 44 px tall. It uses tokens only, and the movement is 0 ms under reduced motion. |
| UX-3 | S3 | **Fixed** | The shared-device hint now uses the suggested wording in both languages (vi says "thiết bị dùng chung"). It reads naturally and states the actual risk: the next person is signed in as you. SEC owns the wording sign-off. |
| UX-4 | S3 | **Fixed** | Forced mode now has a quiet "Đăng xuất" button (117×44) after the submit. It is the next Tab stop, and Enter logs out:<br>• the app goes to `/login` with focus on its `h1`;<br>• visiting `/student/home` afterwards goes to `/login?next=%2Fstudent%2Fhome`, so the session has ended.<br>Voluntary mode still shows Cancel and no Log out. |
| UX-5 | S3 | **Fixed** | Tabbing through an empty login or password form no longer marks any field invalid. After a failed submit, an error clears as soon as its field is fixed. For example, typing a current password clears that error, and the other two stay. |
| UX-6 | S4 | **Fixed** | The login description now speaks to both roles: "Đăng nhập vào không gian dạy học của bạn." / "Sign in to your teaching workspace." |
| UX-7 | S4 | **Fixed** | `/forbidden` now names the other area:<br>• tutor: "Trang này thuộc khu vực của học viên."<br>• student: "Trang này dành cho gia sư." / "This page is for your tutor."<br>The success link "Về trang chính" now lines up with the column edge and is still 44 px tall. |

## Anything new
- **Updated implementer screenshots** in `evidence/T-M2.4/impl/`: I looked at forced change, success, the student's 403 page and the default login. They match what I saw live: the chevron, the new copy, the forced Log out and the aligned link.
- **CSS added in this round:** tokens only (`.disclosureIcon`, `.flush`).
- **Horizontal scroll:** none on login or change password at any viewport.
- **Unchanged since round 1 and still passing:** target sizes (reveal toggles 44×44, submit and Log out 44 px tall), the login Tab order, and the sign-in step budget (3 steps).
- **No new findings.** Leaving the forced Log out as a quiet button is right, since the change itself must stay the primary action.

## Carried over to T-M2.11 (not findings against this task)
- The header wraps to three rows at 360 px.
- The brand shows twice ("Eng-LMS Eng-LMS").
- "Đổi mật khẩu" is an underlined link while "Đăng xuất" is a quiet button.
- The public pages show no workspace identity.

## Not checked
- I did not run axe myself; I relied on the gate's E2E axe runs.
- No screen-reader pass (planned for M5/M8).
- The new `isSafeAppPath` whitespace rule is a security change, so it is for SEC to review, not UX.

UX-REVIEW T-M2.4: APPROVED

## Round 1

### UX review: T-M2.4 Auth UI (G3)

**Verdict: changes requested.** One S2 (an AC isn't met), four S3 and two S4. Copy, tokens, targets, reflow and the sign-in step budget are all fine. The S2 is a small focus fix.

**Branch / PR:** `feature/T-M2.4-auth-ui` at `c1e05e0`, PR #82.

**How I checked:**
- I read all 14 implementer screenshots in `evidence/T-M2.4/impl/` (looked at 22 of the 42 files across the three viewports).
- I ran the packaged JAR the same way `e2e-run.sh` starts it, plus the Vite dev server for `/dev/ui`.
- I drove the app with my own Playwright scripts in the scratchpad at 360×740, 768×1024 and 1280×800, plus 320 px for reflow.
- Signed-in screens used the harness global setup's stored sessions. Students were created through the tutor API, and the scripts ran the forced change, a voluntary change and logout with them.
- At the end I stopped the app and Vite and ran `dev-down.sh` without `--purge`. The repo tree is clean.

My screenshots are in (session-local scratchpad, not kept), shortened to `shots/` below.

## Findings

| ID | Sev | Screen / viewport | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| UX-1 | **S2** | Change password (forced and voluntary), all 3 viewports | **The first failed submit that fails client checks doesn't move focus to the `ErrorSummary`.** Triggers: empty fields, too short, or the two new passwords don't match. After clicking the button, focus stays on the button. After pressing Enter, focus stays in the field. A second failed submit, and any server error, do focus the summary. This breaks the packet (scope 6: "`ErrorSummary` + focus on a failed submit"; AC5) and interaction-states §2.3. Screen readers still hear the error because the summary is a `role="alert"`, but keyboard and screen-magnifier users don't get the required focus move. Likely cause: on the first invalid submit, the effect keyed on `focusSummary` runs before the summary is in the DOM, so `summaryRef.current` is null. | `shots/*/cp-empty-submit.png`: the summary shows with no focus ring. Probe on laptop: Enter on empty → `INPUT#password-current`; click on empty → the submit `BUTTON`; second click → `DIV role=alert`; wrong current password → `DIV role=alert`. | Move focus once the summary has content. Two options: run the effect on `[focusSummary, summaryItems.length]`, or focus it in a `requestAnimationFrame` after `setSummaryShown`. Add a component test: "the first empty submit focuses the summary" (by click and by Enter). The current tests only cover server errors. |
| UX-2 | S3 | Login, "Forgot your password?" disclosure, all viewports | The `<summary>` has `display: flex`, which removes the browser's built-in disclosure triangle. It looks like a plain link, so sighted users can't tell it expands, or whether it is open. The 401 error tells users to look at it ("see 'Forgot your password?' below"), so it needs to look like a disclosure. | `impl/*/login-default-vi.png`, `impl/laptop/login-forgot-open-vi.png` | Add a lucide `ChevronRight` icon (`aria-hidden`) that rotates 90° on `details[open]`. Respect reduced motion. Use tokens only (`Page.module.css` `.disclosureSummary`). |
| UX-3 | S3 | Login, shared-device hint, vi and en, all viewports | The hint is repetitive and abstract in both languages. It says "on a shared device" twice. "người được ghi nhớ" / "a remembered person" is unclear. It never states the actual risk: the next person opens the app as you. The packet asks UX to check this copy (DEC-093). | `impl/phone-small/login-default-vi.png`, `login-forgot-open-en.png` | vi: "Không chọn mục này trên máy dùng chung. Dùng xong hãy đăng xuất, nếu không người sau mở ứng dụng sẽ vào thẳng tài khoản của bạn." en: "Leave this unticked on a shared device, and log out when you finish. Otherwise the next person who opens the app is signed in as you." SEC should confirm the wording, as the packet requires. |
| UX-4 | S3 | Change password, **forced** mode, all viewports | There is no way out of the forced screen other than closing the tab. On it, the only controls are the language switcher, the three reveal toggles and Change password. Someone who signed in on the wrong account, or on a shared device, can't log out. Their session stays parked on `/change-password` for the next person. | `impl/*/change-password-forced-vi.png`; probe lists the forced page's controls | Add a quiet "Đăng xuất / Log out" button beside the submit, in forced mode only. It logs out and goes to `/login`. This isn't a Cancel, so "no cancel" still holds. If the LC thinks this goes beyond the packet, record it as a follow-up. |
| UX-5 | S3 | Change password, field errors, all viewports | Tabbing through the empty form without typing marks each field invalid with red text, because validation runs `onTouched`. On the login page, just tabbing from the username to the password shows "Hãy nhập tên đăng nhập." before the user has tried to submit. The behaviour follows the documented "validate on blur" rule, but here it feels like scolding. | `shots/phone-small/focus-summary.png`: both login fields are red after one Tab pass | For empty required fields, show "required" errors only on submit. Keep blur validation for format errors (length, mismatch). One option: `mode: 'onSubmit'` with `reValidateMode: 'onChange'`. |
| UX-6 | S4 | Login description, vi and en | The description speaks only to students ("…mật khẩu gia sư đã cấp" / "…the password from your tutor"), but the tutor signs in on the same screen. | `impl/*/login-default-vi.png` | Use something that fits both roles, e.g. "Đăng nhập vào không gian dạy học của bạn." / "Sign in to your teaching workspace." |
| UX-7 | S4 | `/forbidden`, both roles; change-password success | 1) The 403 text is system jargon ("thuộc khu vực của một vai trò khác" / "belongs to another role's area"). 2) On the success screen, "Về trang chính" is indented 8 px from the column edge, so it doesn't line up with the alert above it (`.homeLink` has `padding-inline`). | `shots/phone-small/forbidden-en.png`, `success-en.png` | 1) Name the area from the session's role: "Trang này dành cho gia sư." / "This page is part of your tutor's workspace." (for a tutor: "…the student area"). This reveals nothing new. 2) Put the link in the `InlineAlert` `action` slot, or cancel the inline padding in this context. |

## Checklist results
- **Hierarchy:** pass. Each page has one `h1` and one primary action. Read from top to bottom: language switcher, title and description, error, form, then the disclosure. `/forbidden` uses a level-1 `EmptyState`, as accessibility §2 allows. Each page sets its document title through `usePageTitle`.
- **System and tokens:** pass. The new CSS contains no raw colours, px values or inline styles. All three new `ui/` components are in `/dev/ui` (in vi, with default, hint, invalid, disabled and selected examples). The checked state shows a check icon, not just colour. Errors always have an icon plus text.
- **States:** pass, apart from UX-1. I saw every state on the live app: default, pending ("Đang đăng nhập…" with the double submit blocked), generic 401, 429 with the wait time, network error with Retry, client errors, server field errors, success and 403.
- **Responsive:** pass. No horizontal scroll at 360, 768 or 1280, or on login at 320. The column is at most 400 px, inputs are 44 px tall, and long Vietnamese hints wrap.
- **Targets:** pass. All are at least 44 px, measured live:
  - login: the switcher segments, the reveal toggle, the whole checkbox row (307×44), the submit and the disclosure summary;
  - header: "Đổi mật khẩu" (121×44) and "Đăng xuất" (117×44);
  - the error summary links, the 403 home link and the success link.
- **Keyboard and focus:** pass, apart from UX-1.
  - Login Tab order: switcher, username, password, reveal, remember-me, Sign in, Forgot.
  - Enter submits, and Enter opens the disclosure.
  - Focus moves to the `h1` after the forced change, after a header navigation to Change password, and after logout to `/login`. The success message takes focus. The summary links focus their fields.
  - The focus ring shows on the checkbox, the reveal toggle and the disclosure summary.
  - Cancel returns to `/tutor/today`.
- **Colour independence:** pass.
- **Copy:** mostly specific and natural, in both languages: the generic 401 hints at the lockout without saying which part was wrong, 429 gives a wait time, and the password rules are stated. See UX-3, UX-6 and UX-7.
- **Step budget F0 (at most 3 steps):** pass. Username, password, then Enter. This matches `records/*/steps-login.json`, and I repeated it live on all three viewports.
- **Anti-patterns (§6):** none found. No KPI tiles, modals, spinner page loads, placeholder-only labels, or generic "Something went wrong" copy.

## T-M2.11 notes (not findings against this task)
- At 360 px the placeholder header wraps to three rows: brand, then account links, then the switcher.
- The brand shows twice ("Eng-LMS Eng-LMS"). This is the header brand fix already planned.
- "Đổi mật khẩu" is an underlined link while "Đăng xuất" is a quiet button with no underline, which looks inconsistent. The account menu should merge them.
- The public pages (`/login`, `/forbidden`, `/change-password`) show no product or workspace identity. A student can't see whose workspace they're signing in to. Consider showing the workspace name above the `h1` when the brand and public frame are redesigned.

## Not checked
- I did not run axe myself; I relied on the implementer's E2E axe runs.
- No screen-reader pass (planned for M5/M8).
- Reduced motion: the new components add no animation except the checkbox colour transition.

My scripts created one student per viewport in the dev database (three in total), as the harness design does. I did not write `evidence/T-M2.4/review/ux.md` or post the PR comment, as the brief asked.

UX-REVIEW T-M2.4: CHANGES REQUESTED
