# T-M2.7 QA report (qa-evaluator with the UX checklist, parts A–C; recorded by the LC)

QA-VERDICT T-M2.7: PASS WITH MINOR
UX-REVIEW T-M2.7: APPROVED

Head `e2bfd78`, Chromium only (WebKit in the regression workflow). Packaged jar from the part D run, then `--no-build` on a fresh
`englms_e2e`. Black box: the implementation diff and the implementers' tests were not read. Scratch spec `e2e/tests/qa-scratch-m27.spec.ts`
(11 tests), deleted.

## Findings (no S1, S2 or scope)
| ID | Sev | Finding | LC ruling |
|---|---|---|---|
| QA-1 | S4 | Home is not held to the UI rule's 40 rem: at 1280 the greeting and the empty state are 1120 px wide (Account keeps 640 px). | follow-up row (records PR) |
| UX-1 | S4 | At ≥ 768 px the account popover dialog is named "Tài khoản" and its first link is "Tài khoản": a screen reader hears the name twice. Suggest a distinct link name (PO copy call). | PO copy call, follow-up row |
| QA-2 | S4, outside T-M2.7 | After a shell chunk fails, the error page's start-page link leads to the same failed chunk; only "Try again" recovers. | follow-up row |
| QA-3 | S4, part D | The `.env` database `englms` was empty (no tables), so the `E2E_KEEP_DB=1` run was not a large-data run; it bootstrapped `e2e-tutor` and its students there. | reported to the PO |

**DescriptionList deviation: accepted.** At 768/1280 the list is 640 px, label 156 px / value 468 px (24/73); at 360 label above value; a
120-character Vietnamese name has no broken word; a 40-character username wraps to 2 lines at 360 only (`overflow-wrap: anywhere`); real
`dl`/`dt`/`dd`.

## UX checklist
- 360: one `h1`, greeting a `<p>`; `ui/` components only; sheet links 328×44; Change password ends at y 656, clear of the tab bar at 679; the
  "Đã lưu" toast above the tabs (bottom 643); ComboBox list below the field; no horizontal scroll; error block "Không tải được thông tin
  tài khoản." with "Thử lại".
- 768: popover links 254×44, two-column `dl`, axe clean, focus back on the opener after Esc.
- 1280: popover links 239×44; QA-1 applies.
- All: vi and en complete; open-list axe finding only `aria-hidden-focus` (DEC-191); AC9a 2 steps at 360/768/1280.

## AC → result
| AC | Result | Evidence |
|---|---|---|
| AC1 | PASS | HTTP: anonymous 401 `UNAUTHENTICATED`; tutor 403 `FORBIDDEN_ROLE`; active 200 exactly `{fullName, username}` + `no-store`; PAUSED 200; archived old session 401 `SESSION_EXPIRED`; after a tutor reset the old session 401 and the temporary session 403 `PASSWORD_CHANGE_REQUIRED`; student B with `?studentId=<A>` gets B; `/student/account/<A>`, `/student/students/<A>`, `/student/accounts` 404; POST/PUT/PATCH/DELETE 405 |
| AC2 | PASS (black box) | `SECRET-*` markers in A's and B's profile, guardians, note, email: none in any student response, nor the other student's name |
| AC3 | PASS | Pacific/Kiritimati (+14) with the browser in America/Los_Angeles, Pacific/Pago_Pago (−11) with the browser in Asia/Tokyo: 03:59 evening, 04:00 morning, 11:59 morning, 12:00 afternoon, 17:59 afternoon, 18:00 evening, vi and en; `h1` stays |
| AC4 | PASS | held: name-less greeting, no alert, then the name; 500: no name, 0 alerts after 3 s; no product `console.error` |
| AC5 | PASS | Account link in sheet and popover, closes the overlay, focuses the `h1`; tutor has none; student nav Home (+ More) |
| AC6 | PASS | skeleton; error block + Retry with the ComboBox usable; Retry focus on the `div[tabindex=-1]` block; body `{"timeZone":"Asia/Tokyo"}`; Save disabled while unchanged and after saving; 422 → `ErrorSummary` focus + `aria-invalid`; 500 → "Chưa lưu được cài đặt. Hãy thử lại."; guard "Bỏ các thay đổi?"; Change password → `/change-password`; no Display name; offline notice |
| AC7 | PASS | tutor Settings › Account shows Display name; kept specs green in the part D run |
| AC8 | PASS | keyboard save persists (`/auth/session` `timeZone` Asia/Tokyo) |
| AC9/AC9a | PASS | UX checklist |
| AC10–AC12 | not re-run | gate, SEC, unit tests; the part D run green |
| Rename while open | PASS | tutor PATCH → focus regained → refetch → new name; Home on the next visit |
| Keyboard only | PASS | 360: sheet → Tài khoản → ComboBox → Lưu, "Đã lưu", focus stays on Lưu; same through the account menu at 768/1280 |

## Commands
`./scripts/e2e-run.sh --no-build --project=phone-small --project=tablet --project=laptop tests/qa-scratch-m27.spec.ts` (final: 11/11 at each
applicable viewport). DEC-198 QA-1 reproduction: 20 rounds student + 20 tutor at laptop, focus on the opener 40/40. About 30 min wall clock.
