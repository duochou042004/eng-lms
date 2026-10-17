# QA report T-M2.5 (rounds 1–6; final PASS)

Fresh qa-evaluator subagent (one evaluator, resumed for each delta round); recorded by the LC from the evaluator's returned text (the evaluator writes no files). Screenshots and scratch scripts stay in the LC's local records (`.claude/scratch/lc-records/T-M2.5-qa-*`), not in the repo; the card screenshots there show dev-only temporary passwords.

| Round | Head | Verdict | Findings → fix (DEC-122) |
|---|---|---|---|
| 1 | `24dda26` | PASS WITH MINOR | S4 QA-1 (wording), QA-2, QA-3, QA-4 → AC12 (c), (j), (k), scope 3 wording |
| 2 | `78cfae2` | PASS WITH MINOR | AC12 (a)–(o) pass; S3 QA-R2-1 → AC12 (p) |
| 3 | `b06a21a` | PASS WITH MINOR | (q), (r) pass; S3 QA-R3-1 → AC12 (s) |
| 4 | `575e7a9` | FAIL | QA-R3-1 closed; S2 QA-R4-1 (horizontal scroll at 768/1024) → AC12 (t) |
| 5 | `0b146e0` | PASS WITH MINOR | QA-R4-1 closed; S3 QA-R5-1 → AC12 (u) |
| 6 | `cec675b` | **PASS** | QA-R5-1 closed; no open findings |


## Round 6

QA-VERDICT T-M2.5: PASS

**Round 6:** final head cec675b, black-box, Chromium only. QA-R5-1 is closed, (t) still holds, and I found nothing new. No open S1–S4 or scope findings remain.

## Results
- **Students spec ×3 (DEC-088):** `--repeat-each=3 --retries=0` on phone-small, tablet and laptop: 96 out of 96 passed.
- **QA-R5-1 closed:** I checked `?q=qwokro1`, `?q=qxbif0iw` and the unfiltered list at 360, 768, 1024 and 1280, in vi and en.
  - **Emails** break only after `@` or before a `.`. At 768, for example, `binh.le.qwokro1@` / `gmail.com`, `an.qxbif0iw@` / `example.com`, and the 67-character email splits as `nguyen.thi.phuong.lan.anh` / `.hoang.qxbif0iw@` / `subdomain.example-long` / `.com`. Nothing splits inside `gmail.com` or `example.com` any more.
  - **Phones** stay on one line everywhere, including `+84 (90) 123-4567` and `+84 90-123-4567` at 768 and 1024.
- **(t) still holds:**
  - **Layout:** no horizontal scroll at any width (`scrollWidth` equals the viewport), no cell off-screen, no overflowing cell, and the Phone column is visible.
  - **Long values:** they appear in full, including the 36-character username, which wraps as allowed.
  - **axe:** no serious or critical issue.
- **QA-R2-1 / QA-R3-1:** usernames and emails of 20 characters or fewer stay on one line.
- **Copying:** selecting an email in a table cell or a 360 list row and copying it gives exactly the plain address (for example `phuongthao.qwokro1@gmail.com`). The page text contains no zero-width spaces or soft hyphens.
- **360 list:** no horizontal scroll and values are complete in both languages; the long email wraps after `@`.

## Findings
None. Earlier findings: QA-1 closed by a wording change; QA-2, QA-3, QA-4, QA-R2-1, QA-R3-1, QA-R4-1 and QA-R5-1 all verified closed.

## Not tested
- I did not run a gate this round; it was not requested, and the implementer's two gate logs on 26897a7 are in `evidence/T-M2.5/`.
- Firefox and WebKit.
- Anything outside the list layout: the round-6 diff only touches table and list wrapping. AC2–AC10 were last fully regressed in rounds 2–3, and the ×3 runs since then cover them.

## Screenshots
Directory: `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/r6/shots/`
- **768 crop:** `crop-vi-768-qxbif0iw.png`. The highlighted email in it is the selection from my copy test.
- **Full pages:** `{vi,en}-{360,768,1024,1280}-{qwokro1,qxbif0iw}.png`

Logs one level up in `r6/`: `out.txt` (all checks) and `e2e-x3.log`.

**Cleanup:** evidence restored, tree clean at cec675b, ports 8080 and 8081 free, no PR comment posted, nothing purged, and no new students added this round.

## Round 5

QA-VERDICT T-M2.5: PASS WITH MINOR

**Round 5:** final head 0b146e0, black-box, Chromium only. QA-R4-1 is closed. The fixed column widths now split common ~25-character emails awkwardly at 768 px, so I'm leaving one S3 (minor).

## Results
- **Students spec ×3 (DEC-088):** `--repeat-each=3 --retries=0` on phone-small, tablet and laptop: 96 out of 96 passed, including the new realistic-data tests.
- **QA-R4-1 closed:** I checked the `?q=qwokro1` page, the `?q=qxbif0iw` page and the unfiltered list at 768, 1024 and 1280, in vi and en. No horizontal scroll anywhere: `scrollWidth` equals the viewport width. The Phone column is fully visible and never clipped. The long values (`@nguyenhoangphuongthaoqwokro1`, the 36-character username and the 67-character email) all appear in full. axe finds no serious or critical issue.
- **QA-R2-1 / QA-R3-1 still closed:** at 768, 1024 and 1280, every username of 20 characters or fewer and every email of 20 characters or fewer stays on one line. That includes `@nguyenvanan.qxbif0iw` on the qxbif0iw page at 768 in vi. Longer usernames wrap and stay fully visible.
- **360 list:** no horizontal scroll, and values show in full in both languages. My automated check flagged the "Email:" and "Điện thoại:" / "Phone:" labels as clipped, but those are the intentionally visually-hidden labels, so that is a false positive.

## Findings

| ID | Sev | Steps | Expected | Actual |
|---|---|---|---|---|
| QA-R5-1 | S3 | Open `/tutor/students?q=qwokro1` or `?q=qxbif0iw` at 768×1024 (vi or en). | Common emails stay readable; you asked in round 4 that short emails not break before ".com". | Emails of 23–25 characters now break inside the domain: `binh.le.qwokro1@gmail.co` / `m`, `an.qxbif0iw@example.co` / `m`, `phuongthao.qwokro1@gma` / `il.com`. Phone numbers split at a hyphen: `+84 (90) 123-` / `4567`. At 1024, the 28-character Gmail address still wraps. Values stay complete and AC12 (q)'s 20-character limits hold. Possible fix: allow breaks only after `@` and `.` (for example, insert `<wbr>`), or keep the phone together with non-breaking characters. |

## Not tested
- I did not run a gate this round; it was not requested.
- Firefox and WebKit.
- Anything outside the list layout, since the round-5 diff only touches the table.

## Screenshots
Directory: `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/r4q/r5/`
- **QA-R5-1:** `crop-vi-768-qwokro1.png`, `crop-vi-768-qxbif0iw.png`
- **Full pages:** `{vi,en}-{360,768,1024,1280}-{qwokro1,qxbif0iw}.png`

The ×3 run log is `r4q/r5-e2e-x3.log`.

**Cleanup:** evidence restored, tree clean at 0b146e0, ports 8080 and 8081 free, no PR comment posted, nothing purged, and no new students added this round.

## Round 4

QA-VERDICT T-M2.5: FAIL

**Round 4:** final head 575e7a9, black-box, Chromium only. QA-R3-1 is closed, but the fix for it causes a new S2: with ordinary data, the 768 px Students table is wider than the screen and the page scrolls sideways.

## What passes
- **Students spec ×3 (DEC-088):** `--repeat-each=3 --retries=0` on phone-small, tablet and laptop: 90 out of 90 passed.
- **QA-R3-1 closed:** on your exact repro (vi, 768, `/tutor/students?q=qxbif0iw`), every username of 20 characters or fewer stays on one line, `@nguyenvanan.qxbif0iw` included. The same holds at 360 and 1280, in vi and en, on that page and on the unfiltered list.
- **Short emails:** every email of 32 characters or fewer stays on one line, so none breaks before ".com", at all three widths in both languages.
- **Long values:** the 36-character username and the 67-character email are always shown in full. The 67-character email wraps (2–3 lines).
- **No horizontal scroll:** at 360 and 1280 on every page, at 768 on the unfiltered list, and on the student page at all widths.
- **axe:** no serious or critical issue on the list.

## Findings

| ID | Sev | Steps | Expected | Actual |
|---|---|---|---|---|
| QA-R4-1 | S2 | Create "Nguyễn Hoàng Phương Thảo" with username `nguyenhoangphuongthaoqwokro1` (28 characters), email `phuongthao.qwokro1@gmail.com` (28 characters) and a phone, plus "Lê Văn Bình" with `binh.le.qwokro1@gmail.com`. Open `/tutor/students?q=qwokro1` at 768×1024. | The table fits the viewport and there is no horizontal scroll (responsive standards; the AC3 table at 768). | `scrollWidth` is 853 against 768 in vi (832 in en), and the Phone column is cut off past the right edge. The same happens at 1024 px (1093 against 1024) and on your repro page (888 against 768). Likely cause: the AC12 (s) `break-word` rule stops a long username or email from wrapping, so the Name and Email columns can't shrink and the table outgrows the screen. 1280 fits. A tutor can hit this with one long name and one ordinary Gmail address. |

QA-R3-1 (S3) is closed; QA-R4-1 is the new blocker. A fix needs to stop the table outgrowing the screen at 768 and 1024 (for example, let long values break again, or cap the column widths) while keeping usernames of 20 characters or fewer and short emails on one line. A regression check should include a row with a username of 28 or more characters and a Gmail address of about 28 characters.

## Not tested
- I did not run a gate this round (it was optional).
- Firefox and WebKit.
- Anything outside the list layout: the round-4 diff only touches table wrapping.

## Screenshots
Directory: `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/r4q/shots/`
- **QA-R4-1:** `realistic-768-vi.png` (Phone column cut off), `realistic-768-en.png`, `realistic-1024-{vi,en}.png`, `realistic-1280-{vi,en}.png`, `hscroll-768-repro.png`
- **List:** `list-{vi,en}-{360,768,1280}.png`
- **Student page:** `ws-long-{vi,en}-{360,768,1280}.png`

The ×3 run log is `r4q/e2e-x3.log`.

**Cleanup:** evidence restored, tree clean at 575e7a9, ports 8080 and 8081 free, and no PR comment posted. This round added two `qwokro1` students to the dev database; nothing was purged.

## Round 3

QA-VERDICT T-M2.5: PASS WITH MINOR

**Round 3** on `feature/T-M2.5-students-list-add` at b06a21a, black-box, Chromium only. QA-R2-1 is closed in normal lists, but one case remains: a 20-character username can still break mid-word at 768 px in Vietnamese when a long email is on the same page. That is an S3, so the verdict stays PASS WITH MINOR; everything else passes.

## Gate and repeat runs
- **Gate:** `ENGLMS_TASK=T-M2.5 ./scripts/gate.sh` passed once (13 steps, 636 s). e2e 306 passed, 30 skipped. Bundle: student 180.6 KB gz, tutor 180.7 KB gz. Contract drift OK.
- **Students spec ×3 (DEC-088):** `tests/students.spec.ts --repeat-each=3 --retries=0` on phone-small, tablet and laptop: 90 of 90 passed, nothing flaky.

## Results

**QA-R2-1 (short usernames breaking mid-word):** mostly closed.
- Without a very long email on the page, no username of 20 characters or less wraps at 768 or 1280, in vi or en. That covers the full first page of all students and pages filtered to one student.
- A 36-character username wraps but stays fully visible.
- No horizontal scroll at 360, 768 or 1280 in vi or en.
- The one exception is below (QA-R3-1).

**(q) Username moved into the Name cell:** PASS.
- At 768 and 1280 the table has 4 columns (Name, Status, Email, Phone) and each header fits on one line.
- Every row shows `@username` as a second line under the name, in a muted colour (rgb 87,82,74 against the link's 47,93,140).
- Three-word names take at most 2 lines; a 16-character email and the ~31-character `an.qxbif0iw@example.com` each fit on one line; phone numbers stay on one line.
- At 360 the title row carries the name, `@username` and the badge. The meta line holds only email and phone, labelled for screen readers, with no username label.

**(r) Pager position:** PASS.
- "Trang 1 / 146" and "Page 1 of 146" use non-breaking spaces around the slash, so the number group never splits.
- At vi 360 the text wraps to two lines, but only between "Trang" and the numbers, which (r) allows.
- Previous stays at the start and Next at the end.

**Regression:** PASS at 360, 768 and 1280.
- **AC2/AC3 search:** "nguyen van an", "NGUYỄN VĂN ÂN" and "tran thi mai" each find the right student; searching by username works too.
- **AC2/AC3 paging:** 26 results show 25 rows and "1 / 2". Next goes to `page=2` with 1 row and focus stays on a pager button, and Back returns to page 1. `page=99` lands on page 2. `page=-1`, `page=abc` and `sort=x` fall back to the default view with no alert, and control characters are stripped from `q`.
- **AC2/AC3 sort:** Newest puts the last-created student first.
- **AC8 links:** only `tel:`, `mailto:`, `https:` and internal links; https opens in a new tab with `noopener noreferrer`. The `zalo.me@evil` userinfo URL, `javascript:`, `http:`, `data:` and `//evil` values are not links. Not-found still works.
- **axe:** no serious or critical issues on the list in vi and en at all three widths.

## Findings

| ID | Sev | Steps | Expected | Actual |
|---|---|---|---|---|
| QA-R3-1 | S3 | In vi at 768×1024, open `/tutor/students?q=qxbif0iw`. The page includes a row with a long email (`nguyen.thi.phuong.lan.anh.hoang.qxbif0iw@subdomain.example-long.com`). | AC12 (q): a 20-character username stays on one line at 768. | `@nguyenvanan.qxbif0iw` (a 20-character username) breaks as "…qxbif0i" / "w". The Name column shrinks to 191 px because the long email takes the width. The same row on its own (223 px) and the en layout (207 px) stay on one line. The value is still fully visible, so nothing is lost, but it is a residual QA-R2-1 case. Fix idea: a small minimum width on the Name cell, or `overflow-wrap: break-word` instead of `anywhere` on the username line. Screenshot: `shots/wrap-vi-768-q.png`. |

QA-R2-1 is otherwise closed.

## Not tested
- Firefox and WebKit.
- Screen-reader output beyond roles, names and live regions.
- The F2 ×20 repeat: it last ran in round 2. The round-3 change touches list layout only, and the students spec ×3 passed.
- A full rerun of AC5–AC7 and AC9/AC10. They were last verified in round 2 and covered this round only by the gate's e2e.

## Screenshots
All under `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/r3q/shots/`:
- QA-R3-1: `wrap-vi-768-q.png`
- List: `list-{vi,en}-{360,768,1280}.png`
- Narrow rows: `narrow-{vi,en}-{mai,long}.png`
- Pager: `pager-vi-360.png`, `pager-en-360.png`
- Workspace: `ws-{360,768,1280}.png`

The logs (`gate.log`, `e2e-x3.log`) are in `r3q/` itself.

The scratchpad root also holds files I did not create (`r3.mjs`, `lib.mjs`, `gate9-12.out`, `shots3/`). Another session appears to share this folder, so I worked only in `r3q/`, stopped only my own app (by PID), and touched nothing else.

**Cleanup:** evidence restored and new untracked files removed, the tree is clean at b06a21a, ports 8080/8081 are free, and I posted no PR comment and wrote no repo files. This round added 31 students (prefix `qxbif0iw`) to the dev database. Nothing was purged.

## Round 2

QA-VERDICT T-M2.5: PASS WITH MINOR

**Round 2:** `feature/T-M2.5-students-list-add` at 78cfae2, black-box, Chromium only (Firefox and WebKit host libraries are missing). All 15 AC12 items pass and my round-1 findings QA-2 to QA-4 are fixed. One new S3: the AC12 (d) change makes usernames break in the middle at 768 px, a regression from round 1. Nothing at S1, S2 or scope, so the verdict is PASS WITH MINOR.

## Gate, e2e and flakiness
- **Gate:** `ENGLMS_TASK=T-M2.5 ./scripts/gate.sh` passed once on 78cfae2 (13 steps, 626 s). e2e 306 passed, 30 skipped. Bundle: student 180.6 KB gz, tutor 180.8 KB gz. Contract drift OK.
  - My first gate attempt failed at the `scripts` step only because my own QA app was still holding port 8080. After I stopped it, the rerun passed.
- **Students spec ×3 (DEC-088):** `tests/students.spec.ts --repeat-each=3 --retries=0` on phone-small, tablet and laptop: 90 out of 90 passed.
- **F2 specs ×20 (DEC-088):** the "F2 from the Students list" and "keyboard-only F2" tests, `--repeat-each=20 --retries=0`, on the same three viewports: 120 out of 120 passed. No flakiness.

## AC12 delta (black-box)

| Item | Result | Evidence |
|---|---|---|
| (a) pager focus | PASS | Keyboard Next to the last page moves focus to Previous; Previous back to page 1 moves focus to Next. Never `body`. Checked in vi and en at 360, 768 and 1280. |
| (b) scroll and announcement | PASS | After a page change the list top is at y≈0. A visually hidden `<output>` (polite, role status) holds "Trang 2 / 3" / "Page 2 of 3". |
| (c) pager at 360 (QA-4) | PASS | Previous at the start and Next at the end, in vi and en at all three widths. No horizontal scroll. |
| (d) nowrap columns | PASS, but see QA-R2-1 | Phone and status stay on one line at 768 and 1280. |
| (e) narrow list row | PASS | At 360 the badge sits in the title row; the meta line holds username, email and phone, each with its label. |
| (f) message wording and expiry | PASS | vi greeting is "Xin chào," with "bạn" (no full name, no "em"); en is "Hello,". Expiry reads "16:13, 23/10/2026" on the card and in the message, in both languages. |
| (g) "Copied" | PASS | No element moves in page coordinates and CLS is 0 at all widths. "Copied" is announced. My first 360 px run looked like a shift, but that was the page scrolling. |
| (h) quick-link icons and alignment | PASS | Phone, mail and link icons all carry `aria-hidden="true"`. At 768 each `dd` is aligned with its `dt` (same y); at 360 they are stacked. |
| (i) handle rows at 360 | PASS | All 13 handle rows put the label above the value. |
| (j) userinfo in https (QA-2) | PASS | `https://zalo.me@evil.example/`, `https://user:pw@evil.example/`, `https://user@…` and `https://%40@…` render as text with no link. The Zalo link still opens in a new tab with `noopener noreferrer`. |
| (k) email check (QA-3) | PASS | With stubbed detail responses, none of these became `mailto:`: `a:b@`, `a/b@`, `a<b@`, `a>b@`, `a"b@`, `a\b@`, `a@localhost`, `javascript:alert(1)//@x.co`, `?cc=`, `,`, `;`, `#`, `@@`, a space, `%0a`. `ok.name+tag@example.com` is still linked. |
| (l) forced redirect | PASS | Dirty form, then a 403 `PASSWORD_CHANGE_REQUIRED` with the session stubbed to `mustChangePassword` lands on `/change-password` with no dialog (360 and 1280). The user's own "Change password" link still asks. |
| (m) back/forward cache | PASS | Card → navigate to another document → Back: the form shows and the password is not in the DOM, storage or `history.state` (vi and en). |
| (n) docs | PASS | `responsive-standards.md` §1 and §3.3 describe the 768 px viewport switch and the 640 px container target. |
| (o) step record | PASS | `steps-f2.json` lists the 6 named steps. |

## Regression of AC2–AC10 on the final head

| AC | Result | What I checked |
|---|---|---|
| AC2 | PASS | Diacritic search. Paging with exactly 50 results (25 + 25, "1 / 2"). Bad `page` and `sort` params fall back; `page=99` goes to the last page; control characters are stripped from `q`; Newest sorts correctly; reload keeps the page; Clear filters resets the URL. |
| AC3 | PASS | No horizontal scroll at 360, 768 or 1280 with long Vietnamese names and emails. |
| AC4 | PASS | List error then Retry recovers. First-use state shows. |
| AC5 | PASS | Suggestion and "Available"; fewer than 3 letters sends no request; emptying the name clears an untouched username. A slow suggestion (1.5 s) never overwrites a typed username; an out-of-order suggestion response is ignored; failing username endpoints don't block typing. A double click sends one POST with no `password` key. |
| AC6 | PASS | 409 focuses Username; 500 keeps every input. The guard asks on the nav link, home link, Cancel, browser Back and own "Change password"; Escape and Keep editing stay; reload fires `beforeunload`; a clean form or a created student leaves without asking; own logout goes to `/login` with no dialog (360 and 1280). |
| AC7 | PASS | Focus on the card's h2. Copy message and Copy password work. A refused clipboard shows the manual-copy text. Back after Open workspace shows an empty form. A cross-tab sign-out removes the card. |
| AC8 | PASS | Only `tel:`, `mailto:`, `https:` and internal hrefs. Not-found works for unknown ids and non-UUIDs. |
| AC9 / AC10 | PASS | Keyboard-only F2 completes at 360, 768 and 1280 (16 to 18 Tabs, about 4 s). axe: no serious or critical issue in 48 scans (list, filtered empty, first use, add form with errors, card, workspace, empty workspace, not-found × 3 viewports × vi/en). No raw i18n keys and no language leaks. |

**Isolation:** my own student account gets 403 on `/tutor/students`, on its own detail and on the username suggestion endpoint. In the UI, `/tutor/students` goes to `/forbidden`. None of the student's network responses contained the `SECRET-*` note.

## Findings

| ID | Sev | Steps | Expected | Actual |
|---|---|---|---|---|
| QA-R2-1 | S3 | Open `/tutor/students` at 768×1024, with or without long values on the page. | Short usernames such as `qy83xh0ap1` (10–11 characters) stay readable on one line, as they did in round 1. | The Username column is squeezed, so usernames break in the middle (`qy83xh0a` / `p1`, `qy83x` / `h0alo` / `ng`). Its header wraps to 3 lines and ordinary emails break before `.com`. The implementer's own round-2 evidence shows the same (`impl/tablet/list-populated-vi.png` at 78cfae2), while the round-1 version at 24dda26 kept usernames on one line. Likely cause is the AC12 (d) change (phone and status set to `nowrap`). The full value is still visible, so nothing is lost. Fix idea: give the username column a minimum width or `nowrap`. |

QA-1 is closed as a packet wording change; QA-2, QA-3 and QA-4 are verified fixed above.

**Observation (no finding):** `https://:@evil.example/` and `https:\\evil.example` still render as links. Their href is `https://evil.example/`, which matches the host shown in the visible text, and empty userinfo carries no username or password, so (j) holds and there is no host disguise.

## Not tested
- Firefox and WebKit.
- Real screen-reader output (I checked roles, names and live regions only).
- The `/dev/ui` entries beyond what the gate tests cover.
- (l) against a real must-change session: I triggered it with a stubbed 403 and session, not a real account in that state.
- (m) with a real back/forward-cache restore: headless Chromium may have reloaded the page instead, so I relied on the result (no password shown) rather than proving the `pagehide` path ran.

## Screenshots
Directory: `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/r2/shots/`
- **Pager:** `pager-{vi,en}-{360,768,1280}.png`
- **List rows and layout:** `list-row-{vi,en}-360.png`, `list-long-{vi,en}-{360,768,1280}.png`
- **QA-R2-1:** `table-768-top.png`, `table-768-pager-top.png`, `table-long-768.png`, plus the round-1 vs round-2 implementer evidence crops `crop-r1-impl-tablet-list.png` and `crop-r2-impl-tablet-list.png`
- **Card:** `card-{vi,en}-{360,768,1280}.png` (password masked), `card-clip-refused-1280.png`
- **Workspace:** `ws-contacts-{360,768,1280}.png`, `ws-contacts-userinfo-1280.png`
- **Guard:** `guard-forced-change-{360,1280}.png`

Logs and data are in the `r2/` folder above `shots/`: the axe summary `a11y.json`, `gate.log`, `e2e-x20.log`, and `../r2-e2e.log` (the ×3 run).

**Cleanup:** I restored the evidence files and removed the new untracked ones, the tree is clean at 78cfae2, ports 8080 and 8081 are free, and I posted no PR comment. My runs added about 90 more students (prefix `qy83xh0a`, plus `QA …`, `Bàn Phím R2 …` and `Trần Văn Bình …`) and one student account to the dev database; nothing was purged.

## Round 1

QA-VERDICT T-M2.5: PASS WITH MINOR

**Build:** `feature/T-M2.5-students-list-add` at 24dda26 (PR #94). Date 2026-10-16. Fresh evaluator session.

**Environment:** the packaged jar with the SPA, started the same way `e2e-run.sh` starts it, on the dev PostgreSQL 18, signed in as `e2e-tutor`. My black-box checks were Playwright scripts kept in the scratchpad, plus axe-core from `qa/node_modules`. Chromium only, because the host is missing the Firefox and WebKit libraries.

**Gate:** I ran `ENGLMS_TASK=T-M2.5 ./scripts/gate.sh` once and it passed (13 steps, 627 s; e2e 306 passed, 30 skipped). Bundle budget passed: student first visit 180.5 KB gz, tutor 180.7 KB gz. Contract drift is OK and `api/openapi.json` is unchanged. Before that, `e2e-run.sh` on phone-small, tablet and laptop also gave 306 passed.

**Working tree:** I restored the evidence files with `git checkout -- evidence/T-M2.5` and removed the new gate log. `git status` is clean, no app is left running, and I posted no PR comment and wrote no repo files.

## Per-AC results

| AC | Result | Evidence (my own checks) |
|---|---|---|
| AC1 | PASS | Students sits after Today in the tutor nav, with `aria-current="page"` on the list, add and workspace pages. Each page loads as its own lazy chunk (StudentsListPage, AddStudentPage, StudentWorkspacePage). The student and tutor first-visit chunks contain no students-feature strings (I grepped `dist/`). Budget step in the gate is green. |
| AC2 | PASS | I seeded my own world (prefix `qzwq01rm`, 34 students) through the API. **Search:** "nguyen thi anh", "NGUYỄN THỊ ÁNH", "ánh" and "nguyễn thị anh" all find "Nguyễn Thị Ánh"; `%`, `_`, `'` and `"` match literally. Typing sends one debounced request. **Archived:** hidden by default and shown with Include archived (badge "Đã lưu trữ", `archived=1`). **Sort and paging:** Newest puts the last-created first. Exactly 25 results give one page with no Next; 34 give "Trang 1 / 2". URL page 2 maps to API `page=1`, and reload, Back and Forward all keep the state. **Bad params:** `page=-1`, `abc`, `0`, `1.5`, `sort=x` and `archived=yes` each fall back to the default view, with no 422 and no alert. `page=99` replaces the URL with page 2. Control characters in `q` (`%07`, `%01`, `%7F`, `%09`, `%0A`, `%00`) are stripped before the request. All of this passed at 360, 768 and 1280. |
| AC3 | PASS | **360:** rows render as a list, not a table, and `scrollWidth == clientWidth`. **768 and 1280:** a table with 5 column headers. A 60+ character Vietnamese name and a very long email wrap inside the viewport, with no horizontal scroll and the full text visible. |
| AC4 | PASS | **Skeleton:** absent at 40 ms and shown at 340 ms (screenshots). **First use:** "Thêm học viên đầu tiên" with one Add action, decided by exactly one count request (`status=ACTIVE&PAUSED&ARCHIVED&size=1`); with archived on, it shows directly with no count request. **Only archived:** "Không có học viên đang học hoặc tạm nghỉ"; its Include archived button sets `archived=1`. **Refetch:** rows stay and the ProgressLine appears. **Filtered empty:** quotes the query, and Clear filters resets the URL. **Error:** a 500 shows the alert and Retry recovers. Offline: inconclusive within 5 s; covered by the error case. |
| AC5 | PASS | **Suggestion:** "Nguyễn Văn An xxx" fills `nguyenvananxxx` and shows "Có thể dùng". "Ạn", "A B", "!!" and "Ả.-" send no suggestion request; "Ánh Bé" sends one. Emptying the name clears an untouched username. Once Username is edited, the suggestion stops and the value survives emptying the name. **Availability:** "Đã có người dùng" for a taken name, "Tên đăng nhập không hợp lệ" for "Bad Name!". **Request body:** the minimal create sends only `{fullName, username}`, with no `password` key; a typed password is sent. Contact and note values appear on the workspace page. |
| AC6 | PASS | **409:** a username created through the API ("other tab") before Create shows the inline error and focuses `#student-username`. **Pending and double submit:** while pending the button reads "Đang tạo…" and is disabled. A double click plus a forced click plus Enter sends exactly one POST. **422** (stubbed): `contactHandles[1].value` marks row 2's value invalid and leaves row 1 alone; an unknown field becomes a generic line in the ErrorSummary, which gets focus. **500 and network failure:** an alert, with every input kept. **Client checks:** empty submit focuses the summary. Bad email or phone, a 61-character label and a short password are rejected on the client. The 30-row limit is reached and Add is then disabled. **Unsaved changes guard:** asks on the nav link, the home link, Change password, Cancel and browser Back. Escape and Keep editing stay; Discard leaves. Reload and tab close fire `beforeunload`. A clean form, or one after a successful create, leaves without asking. **Sign-out while dirty:** own Log out, a cross-tab Log out and a forced 401 each land on `/login` with no dialog. |
| AC7 | PASS | **Card:** focus moves to the H2 "Đã tạo học viên". The card shows name, username, a 21-character monospace selectable password (text, not an input), the expiry 7 days out, `http://localhost:8080/login` and the shown-only-now notice. **Copying:** Copy message puts a localised vi or en text with all the values on the clipboard and shows "Đã sao chép". Copy password copies exactly the password. A rejected or undefined `navigator.clipboard` shows "Không sao chép được…" with no page error. **Credentials hygiene:** the password is not in localStorage, sessionStorage, `history.state`, the URL, cookies, the console, the DOM after leaving, or anything reachable from `window` globals. The POST answers `Cache-Control: no-store` and there is no service worker. **Leaving the card:** Open workspace, then Back, shows an empty form, and Forward/Back again stays empty. Reload on the card drops it. A cross-tab sign-out while the card is open sends the tab to `/login`, and Back does not bring the card back. |
| AC8 | PASS | **Header:** h1 is the name, with the status badge (icon + text) and `@username`. No tab bar. **Profile:** shows "Chưa có" / "Not added" for empty values; the note keeps its line breaks, and `<b>` is shown as text. **Links:** phone becomes `tel:+84901234567`; email becomes `mailto:`; `https://zalo.me/…` opens in a new tab with `rel="noopener noreferrer"`. These render as text plus a copy button with no `<a>`: `http:`, `javascript:` (also with a leading space or a tab), `data:`, `//evil.example`, `zalo://`, `blob:`, `vbscript:`, `file:`, `tel:` as a handle, bare `https:`, a non-URL handle, and `mailto:a@b?cc=c`. A stubbed detail with hostile emails (containing `?`, `,`, `;`, `#`, `%0a`, a space or `@@`) produced no `mailto:` link. **Not found:** an unknown UUID shows the in-shell "Không tìm thấy học viên" with a link back. Non-UUIDs (`abc`, `1234`, a 35-character id, an injection string) show the same view and send no request. **Error:** Retry works. Back to students restores `q`, `sort` and `page`. |
| AC9 | PASS | F2 (Add → name → expand Contact and enter phone → Create → Copy message → Open workspace) is 6 counted steps, 7 raw actions. Wall time is about 1.8 s pointer and about 4.2 s keyboard at each of 360, 768 and 1280, well under the 90 s budget. |
| AC10 | PASS | axe found no serious or critical issue in 54 scans: list, filtered empty, first use, empty add form, add form with errors, card, workspace, empty workspace and not-found, at 360, 768 and 1280, in vi and en. Keyboard-only F2 (Tab and Enter) completes at all three viewports with visible focus. No English leaks into the vi UI, no Vietnamese into the en UI, and no raw i18n keys. Status always has icon + text. I did not audit the `/dev/ui` entries myself; only the gate's tests cover them. |
| AC11 | PASS (with a gap) | My one gate run passed, and the implementer's two runs are recorded. I did not do a second run myself. All existing e2e assertions pass. |

**Isolation:**
- A student account I created signed in, changed its temporary password, and then got **403** on GET `/tutor/students`, on another student's detail, on its own detail, on both username endpoints and on POST `/tutor/students`.
- In the student's browser, `/tutor/students`, `/new` and `/:sid` all go to `/forbidden`.
- None of the student's network responses contained the `SECRET-TUTOR-NOTE` marker I put in the tutor note.

## Findings

| ID | Sev | Steps | Expected | Actual |
|---|---|---|---|---|
| QA-1 | S4 | Load the list, then type in search to trigger a refetch. | Packet scope 3 places the ProgressLine "under the page header". | It is the existing top-edge line (y=0, full width) from RootLayout. That matches design-system §ProgressLine ("top edge of the viewport"), so the packet wording and the design system disagree. Wording fix or LC call; not a defect. |
| QA-2 | S4 | Add the handle `https://user:pw@evil.example/` (or `https://zalo.me@evil.example`). | Allowed by DEC-100 (https with a host). | It renders as a link. The visible text is the full value, but userinfo can make the real host look like a different one. Suggestion: refuse https URLs that carry `username`/`password`. Tutor-entered data, low risk. |
| QA-3 | S4 | Stub an email value `javascript:alert(1)//@x.co` (the server would refuse it). | Only a single plain address becomes `mailto:`. | It becomes `mailto:javascript:alert(1)//@x.co`. The scheme is still `mailto:`, so it is harmless, but the client check does not reject `:` or `/` in the local part. Defence in depth only. |
| QA-4 | S4 | Open the list at 360 px with two pages. | Pager on one row. | "Trang sau" wraps onto a second row below Previous and "Trang 1 / 2". Cosmetic. |

There are no S1, S2, S3 or scope findings. Nothing outside the ACs is present: no guardians, no first goal, no tabs, no quick actions.

## Exploratory notes (charter)
- **Getting the temporary password back after leaving the card:** I tried Back, Forward, reload, Open workspace then Back, "Add another student", a cross-tab sign-out then Back, storage and history scans, a walk of `window` globals, HTTP caching and a service worker. All failed to bring it back.
- **Making a student value produce a non-allowed link:** about 20 scheme variants, including case tricks, a leading control character, a tab inside `javascript`, `blob:`, `file:` and a protocol-relative URL. None produced an href outside `tel:`, `mailto:` or `https:`.
- **Slow or failing suggestion and availability endpoints:** covered only indirectly by the debounce and race behaviour above. I did not run a dedicated stub with delayed suggestion or availability responses.
- **Focus on a direct load of the not-found URL:** focus stays on body. After in-app navigation it lands on the h1, which is consistent with the app's route-focus pattern.

## Not tested
- Firefox and WebKit (missing host libraries).
- Real screen-reader output; I did spot checks of roles and names only.
- Dedicated delayed or failing suggestion and availability stubs (see above).
- The repeat runs DEC-088 asks for (×3 / ×20).
- A second gate run of my own.
- The `/dev/ui` entries for the new components.
- An exact-50 paging case: I tested 25 and 34 results, not 50.

## Screenshots and scratchpad
Directory: `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/shots/`
- **Language and viewport matrix:** `{vi,en}-{360,768,1280}-{list,filtered-empty,first-use,add-empty,add-errors,card,workspace,workspace-empty,notfound}.png`. The card shots show dev-only temporary passwords; keep them out of the repo.
- **List states:** `state-skeleton-40ms-1280.png`, `state-skeleton-340ms-1280.png`, `state-refetch-800ms-1280.png`, `state-first-use-1280.png`, `state-only-archived-1280.png`, `state-error-1280.png`, `list-long-{360,768,1280}.png`.
- **Add form:** `add-409-1280.png`, `add-422-1280.png`, `add-500-1280.png`, `guard-dialog-1280.png`.
- **Card clipboard refusal:** `card-clip-reject-1280.png`, `card-clip-undefined-1280.png`.
- **Workspace:** `ws-contacts-1280.png`, `ws-notfound-1280.png`, `ws-error-1280.png`.

Other files in the scratchpad: the axe summary is `a11y.json`, my gate log is `gate-20261016T030931Z.log`, and the scripts are `*.mjs`.

My QA runs added about 120 students (prefix `qzwq01rm` and `QA …` names) and one student account to the dev database. That is dev data and I purged nothing.
