# UX-REVIEW T-M2.5 (PR #94; rounds 1–4; final APPROVED at `cec675b`)

Fresh ux-reviewer subagent (resumed for each delta round); recorded by the LC from the reviewer's returned text (the reviewer writes no files). Round-1 screenshots were lost when `/tmp` was emptied during an API-limit pause; rounds 2–4 screenshots stay in the LC's local records (`.claude/scratch/lc-records/T-M2.5-ux-*`), not in the repo.

| Round | Head | Verdict | Findings → fix (DEC-122) |
|---|---|---|---|
| 1 | `24dda26` | CHANGES REQUESTED | S2 UX-1; S3 UX-2..UX-4; S4 UX-5..UX-10 → AC12 (a)–(i), (n), (o) |
| 2 | `f00d6f9` | CHANGES REQUESTED | UX-1..UX-10 fixed; S2 UX-11 (the (p) Username minimum squeezed Name at 768), S4 UX-12 → AC12 (q), (r) |
| 3 | `b06a21a` | APPROVED | UX-11, UX-12 fixed; S4 UX-13 (email breaks before its last letter) → AC12 (s), then (u) |
| 4 | `cec675b` | **APPROVED** | Fixed column shares (t) and natural break points (u) read well; UX-13 closed; no new findings |


## Round 4

UX-REVIEW T-M2.5: APPROVED

Round 4 at cec675b: the fixed-width table reads well, UX-13 is closed, and nothing regressed. I rebuilt the jar, ran the app on :8080 and checked 360×740, 768×1024, 1024×768 and 1280×800 in vi and en. Each combination covered `?q=qwokro1`, `?q=qxbif0iw`, the unfiltered list (192 pages), and three students I added through the API with Include archived on. Those three are Active, Paused (with a long email on an `.edu.vn` subdomain and the phone "+84 (90) 123-4567") and Archived, so the widest badges are tested.

The column widths in code are 29 / 16.5 / 31 / 23.5 %, not the 31 / 17 / 31 / 21 % in your message; I judged what is built.

## Verification

| Check | Result |
|---|---|
| Horizontal scroll | None in all 32 combinations (4 viewports, 2 languages, 4 queries). No cell's content is wider than its cell. |
| Readability at 768 | Name 213 px, Status 121 px, Email 228 px, Phone 173 px. Normal names fit on 1 line and 3–5-word names on 2. Normal emails fit on 1–2 lines and the longest on 3–4. |
| Readability at 1024 and 1280 | At 1024 the widths are much the same as 768 (218 / 124 / 233 / 177 px). At 1280, Name is 292 px and Email 312 px; most values fit on 1 line. |
| Badges | "Đang học", "Tạm nghỉ" and "Đã lưu trữ" (and Active, Paused, Archived) each fit their column on one line. "Đã lưu trữ" is the tightest at 768, but fits. |
| Phones | Groups stay whole and every phone is on 1 line at all table widths, including "+84 (90) 123-4567" at 768. |
| Header alignment | Headers and cells share the same 8 px inline padding, so header text lines up with the values. Headers stay on one line and none overflow. |
| UX-13 | Closed. Emails now wrap only after "@" or before a dot: "binh.le.qwokro1@ / gmail.com", "tran.hoang.bao.ngoc / .uxjpq3l@truongthpt- / chuyen.edu.vn". Short domains like `gmail.com` and `outlook.com` never split, and short addresses stay on one line. |
| List at 360 | No row overflows. Title row shows name, then badge, then `@username`, wrapping cleanly; the meta line shows email and phone. |
| Pager | Previous stays at the start and Next at the end at every viewport (Next's right edge is at 344, 752, 1008 and 1264). Next then Previous via the keyboard leaves focus on Next and announces "Trang 1 / 192" / "Page 1 of 192". |
| axe | No issues of any severity on the unfiltered list in all 8 viewport and language combinations. |

## Findings

No new findings. Two observations that need no action:
- A username longer than the Name column still breaks mid-word (e.g. "@nguyenthiphuonglananhho / angbaoqxbif0i" at 768). It can't be avoided without overflow, and the full value is on the workspace page.
- An email domain longer than 16 characters can leave ".com" alone on its last line. This is the intended behaviour of (u).

## Screenshots

In `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/shots4/`:
- **All statuses:** `list-mine-{p360,t768,tl1024,l1280}-{vi,en}.png`
- **`?q=qwokro1`:** `list-qwokro1-{p360,t768,tl1024,l1280}-{vi,en}.png`
- **`?q=qxbif0iw`:** `list-qxbif0iw-{p360,t768,tl1024,l1280}-{vi,en}.png`
- **Unfiltered (vi only):** `list-all-{p360,t768,tl1024,l1280}-vi.png`

This round I did not re-check the add form, the credentials card or the workspace page; their code didn't change in this diff. The dev database now has 3 more test students, one Paused and one Archived. The app is stopped and the working tree is clean at cec675b.

## Round 3

UX-REVIEW T-M2.5: APPROVED

Round 3 at b06a21a: UX-11 and UX-12 are both fixed, and nothing else regressed. I rebuilt the jar, ran the app on :8080 and checked 360×740, 768×1024 and 1280×800 in vi and en. To test with realistic data I added three students through the API: a short name, a 3-word Vietnamese name, and a long name with a long email.

## Verification

| ID | Status | What I saw |
|---|---|---|
| UX-11 (S2) | Fixed | The table now has 4 columns. At 768, Name is 228–243 px wide (was 99), Email 223–229 px and Phone 159 px. "Hai Mươi Ký Tự …" and "Nguyễn Thị Dấu …" fit on 1 line, each with `@username` on 1 line beneath. The longest name takes 3 lines in vi and 2 in en (was 9). At 1280, Name is about 372–384 px and normal values take 1 line. Headers stay on one line (38 px tall). |
| UX-12 (S4) | Fixed | At 360 vi the position reads "Trang" / "1 / 141": the number group no longer splits. In en, "Page 1 of 141" fits on one line. |

## Spot checks for regressions
- **List at 360:** each row's title shows the name link, the badge and `@username`; the meta line shows email and phone. No duplicated username.
- **Pager:** Previous stays at the start and Next at the end at every viewport. Next then Previous via the keyboard moves focus to the still-enabled button. "Page 1 of 141" is announced, and the list top scrolls into view (scrollY 292–428).
- **Horizontal scroll:** none on any page in any of the 6 viewport and language combinations.
- **axe:** no issues of any severity on the default list and the filtered list, at 3 viewports in vi and en.

## Findings

| ID | Sev | Location / viewport | Issue | Suggested fix |
|---|---|---|---|---|
| UX-13 | S4 (doesn't block) | List table, Email column, 768 vi | "dau.1qqxq@example.com" breaks before its last letter ("…example.co / m"). `overflow-wrap: anywhere` lets the column shrink below the address's natural width even when there is room. | Use `overflow-wrap: break-word` for the Email cells; long addresses still wrap but short ones keep their width. Alternatively add break opportunities after "@" and ".". Can go to T-M2.14. |

## Screenshots

In `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/shots3/`:
- **UX-11 and UX-13:** `list-long-t768-vi.png` and `list-long-t768-en.png`
- **Long-data list at 360 and 1280:** `list-long-{p360,l1280}-{vi,en}.png`
- **UX-12:** `pager-p360-vi.png`
- **Pager, other viewports:** `pager-{p360-en,t768-vi,t768-en,l1280-vi,l1280-en}.png`

This round I did not re-check the card, the workspace page or the add form beyond the round-2 checks; their code didn't change in this diff. The dev database now has 3 more test students. The app is stopped and the working tree is clean at b06a21a.

## Round 2

UX-REVIEW T-M2.5: CHANGES REQUESTED

Round 2 at f00d6f9. I rebuilt the jar and ran the packaged app on :8080, then checked 360×740, 768×1024 and 1280×800 in vi and en. UX-1 to UX-10 and AC12 (n) and (o) are verified fixed. One problem blocks approval: the AC12 (p) fix (the 15rem minimum on the Username column) leaves the Name column too narrow at 768 (UX-11, S2). So no, the trade-off isn't acceptable: a column has to drop or merge at 768.

Also verified:
- No horizontal scroll anywhere.
- axe found no issues of any severity on the list, filtered list, add form and workspace at all three viewports in vi and en.

## Round-1 findings

| ID | Status | What I saw |
|---|---|---|
| UX-1 (S2) | Fixed | Next onto the last page moves focus to Previous; Previous onto page 1 moves it to Next. Focus never lands on `body`, at all 6 viewport and language combinations. Shift+Tab from Previous goes to the last row link. |
| UX-2 | Fixed | After a page change the list top scrolls into view (at 360, scrollY goes from about 2800 to 406–428). "Trang 2 / 133" / "Page 2 of 133" is announced through a polite `output`. |
| UX-3 | Fixed | At 360, Previous is at the start and Next at the end in both languages (vi: Next at x=235, ending at 344). There is one leftover S4, see UX-12. |
| UX-4 | Fixed for phone | Phone and status stay on one line at 768 and 1280. The Username minimum width it brought in causes UX-11. |
| UX-5 | Fixed | `responsive-standards.md` §1 and §3.3 now describe the 768 px viewport switch, with the container query kept as the target for narrower placements. |
| UX-6 | Fixed | At 360 the badge sits beside the title, and the meta line holds username, email and phone. |
| UX-7 | Fixed | The message now opens "Xin chào," / "Hello," and uses "bạn" instead of "em". Expiry reads "17:16, 23/10/2026" and "Added on" reads "16/10/2026", in both languages. I checked the clipboard text, with the password redacted. |
| UX-8 | Fixed | Copy password no longer moves when "Copied" appears at 768 and 1280. "Đã sao chép" is announced but not shown. At 360 the button moved only because the click scrolled the page. |
| UX-9 | Fixed | Quick links now have Phone, Mail and Link icons. Email and phone values line up with their terms at 768 and 1280 (the -10 px box offset is just the centred 44 px link). |
| UX-10 | Fixed | Handle labels sit above their values at 360 and 768, including a long label. |
| Ruling (a), AC12 (o) | Fixed | `steps-f2.json` now lists the 6 named steps. |

## New findings

| ID | Sev | Location / viewport | Issue | Suggested fix |
|---|---|---|---|---|
| UX-11 | S2 | List table, 768 (vi and en; 1024 with the sidebar is likely the same, not checked) | Five columns don't fit about 736 px of realistic data. The fixed 15rem Username minimum (253 px) plus the nowrap Status and Phone columns (about 260 px) leave Name with 99–117 px and Email with about 123 px. Ordinary names wrap one word per line: "Nguyễn Thị Dấu" takes 3 lines and a long name 9 (223 px tall). Even a short email such as "hm.9dcd38@example.com" breaks into 3 pieces. Name is the row's link and the main thing the tutor scans for, so it is the wrong column to squeeze. | Drop or merge a column at 768, don't just shrink. Preferred: show `@username` as a muted second line in the Name cell and remove the Username column. That frees about 250 px, keeps every value, and needs no DataList change. In the narrow list, drop username from the meta line so it isn't shown twice. Alternative: add a DataList column option to hide Email below `lg` (email is still on the workspace page and searchable), plus a small minimum width on Name. Either way, add an E2E check at 768 that a 3-word Vietnamese name and a 20-character email each fit on at most 2 lines. |
| UX-12 | S4 | Pager, 360 vi | "Trang 1 / 133" wraps after the "/" in its 71 px middle cell, so the number ends up alone on the second line. Realistic counts like "Trang 1 / 8" wrap the same way. | Put non-breaking spaces around the "/" in the `list.page` strings, or let the position text take its own row below the buttons. |

## The 768 trade-off

Not acceptable as built. The implementer's evidence shot `evidence/T-M2.5/impl/tablet/list-long-name-vi.png` shows it with ordinary data: names of 3–4 words wrap word by word, and normal emails break inside the address.

The 15rem minimum fixed a cosmetic username wrap by squeezing the primary column. At 768, five columns of real data don't fit, so a column needs to drop or merge, not shrink. Merging the username into the Name cell is my recommendation. 1280 is fine as is: Name gets 211–226 px and Email 255–260 px.

## Screenshots

All in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/a897d22c-2813-446f-9573-dd2ed496cc38/scratchpad/shots2/` (the password is blurred in every card shot):
- **UX-11:** `list-long-t768-vi.png`, `list-long-t768-en.png`; compare with `list-long-l1280-vi.png` and `list-long-l1280-en.png`
- **UX-12:** `pager-p360-vi.png`
- **Pager, all viewports:** `pager-{p360,t768,l1280}-{vi,en}.png`
- **Scroll after Next:** `after-next-p360-en.png`
- **List at 360:** `list-long-p360-{vi,en}.png`
- **Card:** `card-copied-{p360-vi,t768-en,t768-vi,l1280-vi}.png`
- **Workspace:** `ws-{p360-vi,p360-en,t768-en,l1280-vi}.png`

I did not check the 1024 viewport (`tablet-land`) or the `/dev/ui` entries, and I did not re-test the SEC and QA items (j)–(m). I added about 5 test students to the dev database. The app is stopped and the working tree is clean at f00d6f9.

## Round 1

UX-REVIEW T-M2.5: CHANGES REQUESTED

(Recorded by the LC from the reviewer's returned text at 24dda26; the reviewer's scratch screenshots were lost when /tmp was emptied during an API-limit pause.)

Passes: one h1 and one primary per page (card: Copy message); status icon + text; no horizontal scroll at 360/768/1280; axe clean (all severities) on the four pages, three viewports, vi/en; focus to h1 after navigation and to "Student created" after Create; discard dialog opens on Keep editing; targets ≥ 44 px; input types email/tel/new-password.

| ID | Sev | Location | Issue | Suggested fix |
|---|---|---|---|---|
| UX-1 | S2 | List pager, all viewports | Next onto the last page (or Previous onto page 1) disables the pressed button and focus drops to body (WCAG 2.4.3); consequence of ruling (c) | Move focus to the other pager button or the list region (or aria-disabled); unit test both ends |
| UX-2 | S3 | List pager | A page change announces nothing and the view stays scrolled at the bottom (rows 20–25) | Scroll the list top into view and announce "Page n of m" politely (role=status or focus a labelled list container) |
| UX-3 | S3 | Pager, 360 vi | "Trang sau" wraps under "Trang trước" (Next ends up left); en fits | Page text on its own full-width row, buttons below at opposite ends (or short labels with full accessible names) |
| UX-4 | S3 | Table, 768 (and 1280) | Phone wraps to 3 lines at 768 (2 at 1280); usernames/emails break mid-word into 3–4 lines | DataList `nowrap` column option for phone and status |
| UX-5 | S4 | responsive-standards §1, §3.3 | Still describe a 640 px container switch; design-system §3 says 768 px viewport | Align with the 768 px rule (DEC-120); container query when DataList sits in a narrower column |
| UX-6 | S4 | List rows, 360 | Meta line holds 4 secondary fields + badge (standard 2–3); badge on its own line | StatusBadge in the title row; meta = username, email, phone |
| UX-7 | S4 | Card/message, vi | "Chào {{name}}" with full name and the "em" form; expiry "10:25 23 thg 10, 2026" not §7 style | Neutral greeting (or PO vi review at M5); date "10:25, 23/10/2026" |
| UX-8 | S4 | CopyButton, 1280 | Inline "Đã sao chép" pushes "Sao chép mật khẩu" sideways | Swap label/icon inside the button, announcement visually hidden |
| UX-9 | S4 | Workspace header, 360/768 | Quick links are bare values (no Phone/Mail icon); at 768 values sit ~10 px below their terms | aria-hidden Phone/Mail icons; align DescriptionList rows centre/first baseline |
| UX-10 | S4 | "Other contacts", 360 | Handle rows wrap inconsistently | Always stack label above value, or a two-column grid |

Rulings: (a) "expand Contact → phone" as one F2 step: accepted (doc's own counting; required path 5 steps); ask: steps-f2.json lists the named steps. (b) DataList switch at 768 px viewport: accepted; doc mismatch = UX-5. (c) search-param-only changes keep focus: accepted for search, archived, sort; not for paging (UX-1, UX-2). (d) Pager wrap at 360: confirmed vi only = UX-3.

Not checked by the reviewer: /dev/ui, offline/5xx, first use, error states, 409 (relied on implementer evidence). ~4 long-named students added to the dev DB.
