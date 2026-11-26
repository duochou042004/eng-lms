# QA report: T-M2.33 (recorded by the LC from the fresh qa-evaluator's returned text; raw invisible characters written as U+XXXX)

Verdict: PASS · Build: bee7fce (branch feature/T-M2.33-strict-scalars-names) · Date: 2026-11-26 · Mode: combined QA+UX (tier H, second reviewer)

## Environment
- The packaged jar with the SPA, run three times through `./scripts/e2e-run.sh` (each run got a fresh `englms_e2e` database; no `E2E_KEEP_DB`; the dev DB was not touched).
  - The first run built the app; the next two used `--no-build`.
  - Projects: phone-small 360×740, tablet 768×1024, laptop 1280×800, Chromium, `--workers=1`.
- I drove everything from a scratch spec, `e2e/tests/qa-m233.spec.ts`, which is now deleted.
  - It runs the HTTP matrix with `curl`, using the tutor and student session cookies and the `X-XSRF-TOKEN` header. Sign-in rows use an anonymous cookie jar primed by `GET /auth/session`.
  - The UI checks use Playwright: clipboard paste, accessibility tree and axe through `expectSettledAccessible`.
- I created the "stored bad name" state for scope 8 only in the E2E database, with `podman exec englms-dev-db psql -d englms_e2e`. It set U+2028 inside both the workspace name and the tutor's display name.
- Each run printed a podman message ("container name englms-dev-db already in use") because the dev DB container was already up. It did not affect the runs.
- Cleanup: no app is listening on 8080/8081, and `git status` shows no tracked changes (only the untracked `evidence/*/records|impl` folders that were there before I started).

## AC results
| AC | Scenario(s) | Viewports | Result | Evidence |
|---|---|---|---|---|
| AC1 | curl: `POST /auth/login` (`username:123`, `password:123456`, extra `password:true`); `POST /tutor/students` (`fullName:123`, `username:true`, extra `fullName:1.5`); `PATCH /tutor/students/{id}` (`fullName:1.5`, extra `fullName:true`, `note:12`); `PATCH /auth/preferences` (`locale:123`, `displayName:123`, `timeZone:false`, extra `timeZone:1.5`, `displayName:[]`, and `displayName:true` sent with a valid `locale:"en"`); `PATCH /tutor/settings` (`displayName:123`, `defaultLocale:true`, extra `defaultTimeZone:7`) | API | PASS | Every row returns 400 `MALFORMED_REQUEST` with the usual problem shape. Nothing is written: no `qa-bind-*` student exists, the student stays at version 0, the workspace stays at version 0, and the locale stays `vi` even when a valid locale is in the same body. The integer rule still holds: `version:"0"` and `version:0.0` both return 400. A student sending `displayName:123` gets 400, which comes before the 422 `INVALID_VALUE`. |
| AC2 | curl sign-in with the correct password and `rememberMe` set to `1`, `0`, `2`, `"true"`, `"false"`, `""`, `" "`, `1.0` (extra: `"TRUE"`, `[]`, `{}`) | API | PASS | All return 400 `MALFORMED_REQUEST` with no `Set-Cookie`, and a later `GET /auth/session` with the jar returns 401, so no session was created. `true` returns 200 and sets `ENGLMS_SESSION` and `ENGLMS_REMEMBER_ME`. `false`, `null` and an absent field return 200 with `ENGLMS_SESSION` only. A wrong password with correct types returns 401 `UNAUTHENTICATED`. |
| AC3 | Throttle | — | PASS (not black-box) | The E2E app raises the throttle to 100000, so I could not reproduce this from outside. Code reading: `backend/src/test/java/com/englms/identity/LoginBindingThrottleApiTest.java` is the AC3 test. The binding rows above confirm the 400 happens before any credential check. |
| AC4 | curl on both names: all 20 AC4 code points at start, middle and end. I added 30 more: U+0000, U+001F, U+0080, U+009F, U+200C, U+200F, U+202A–U+202D, U+2061–U+2063, U+2067–U+2069, U+206A, U+206F, U+FFF9–U+FFFB, U+0600, U+0605, U+06DD, U+070F, U+0890, U+08E2, U+110BD, U+110CD, U+13430, U+1343F, U+1BCA0, U+1D173, U+1D17A, U+E0001, U+E0020, U+E007F, a lone U+DC00 and a lone U+DBFF. Also raw UTF-8 bytes instead of JSON escapes, several bad characters in one name, an echo check, accepted names, blanks, ends, lengths, and check order. | API | PASS | 354 of 354 rows return 422 `INVALID_FORMAT` on `displayName`, and the `message` names the exact code point ("Invisible or control character U+XXXX is not allowed", 4–6 hex digits). Nothing is saved in any row.<br>With several bad characters the first one is named (U+200E before U+200B; U+E0041 before a tab). A value containing a marker string is never echoed: not in the body, and not in `backend/target/e2e-app.log` (0 hits).<br>Accepted: "Nguyễn Thị Lan" (precomposed), "Le" + U+0301 + " Lan", U+2764 U+FE0F, and interior U+00A0 / U+1680 / U+2000 / U+2007 / U+200A / U+202F / U+205F / U+3000.<br>Blank: U+00A0-only, U+3000-only, spaces-only, U+2007+U+202F+U+205F, `""` and `null` give workspace `REQUIRED` and clear the account name. A tab-only or `" \n "` value gives `INVALID_FORMAT` (the forbidden check runs before the blank check, as the docs state).<br>Ends: U+00A0 + "Lan" + U+202F is stored as "Lan". The same holds for U+1680, U+2000, U+205F, U+3000 and ASCII space at both ends; U+000B, U+000C and U+001C–U+001F at the ends give `INVALID_FORMAT`.<br>Lengths: 120 ASCII, 120 emoji (supplementary) and 60×(e+U+0301) = 120 code points are accepted; 121 of each gives `TOO_LONG`; 120 plus U+00A0 at both ends is accepted. 120 + U+200B gives `INVALID_FORMAT`.<br>Order: a bad name with a stale version gives 422, not 409. A bad name with a bad locale or time zone gives one 422 with both problems. |
| AC5 | UI: paste U+200B on both forms in vi and en. The server-only 422 is forced by a Playwright route that puts U+2060 into the PATCH body. 16 client edge cases on laptop. Scope 8 through the E2E database. | 360 / 768 / 1280 | PASS | Client rule: the message names U+200B in vi and en, and no PATCH is sent (0 requests). Server-only case: the `INVALID_FORMAT` text appears with no code point.<br>Client edge cases match the server: U+2028, U+E0041, U+206A, U+13430, U+0600, a ZWJ emoji (U+200D) and the two-character case (U+200E named) are all blocked with the right code point. A tab-only workspace name gives INVALID_CHARACTER U+0009. U+00A0-only and U+3000-only give workspace REQUIRED. 121 characters gives TOO_LONG; 120 + U+200B gives INVALID_CHARACTER. U+00A0 Lan U+202F is sent as "Lan". U+1680 at both ends is sent as "Lan". U+3164 inside is accepted (the documented known gap).<br>Scope 8: with U+2028 stored in both names, a workspace locale-only save returns 200 with body `{version, defaultLocale}` and no name error, and an account time-zone-only save returns 200 with body `{timeZone}` and the toast "Đã lưu". Editing either name afterwards shows the error naming U+2028. Checked at phone-small and laptop. |
| AC6 | E2E-equivalent check at all three viewports | 360 / 768 / 1280 | PASS | The message naming U+200B appears both in the field description and in the ErrorSummary. `expectSettledAccessible` (axe clean, no horizontal scroll) passed in all 12 combinations (3 viewports × 2 forms × 2 languages). |
| AC7 | Docs | — | PASS | api-conventions §5 400 row, validation-rules "account" and "workspace" rows plus the new "name rule" row, and the customizer Javadoc that lists the three rules. |
| AC8 | Out-of-scope defects | — | PASS | I found none. |
| AC10 | Linear strip | — | PASS (code reading plus unit test) | `Names.strip` is a code-point walk from both ends with no regex. The 1,000,000-space row is at `backend/src/test/java/com/englms/shared/NamesTest.java:49`. Over HTTP, 1 MB name bodies are refused with 400 `MALFORMED_REQUEST` in 20–28 ms before binding (a body or string size limit), so that path is not reachable over HTTP at that size anyway. I did not check whether the two orphaned Javadocs were removed. |
| AC9 | Gate and CI | — | Not re-run | I did not run the gate myself (no reviewer gate run). The gate log for b18ea19 is on the branch; CI 7/7 on bee7fce is as reported by the coordinator. |

## Exploratory charter and notes (about 35 min)
Charter: invisible and odd characters entered by paste and by API, consistency between the client and server rules, the stored-bad-name path, error accessibility, and i18n.
- **O-1, client paste cannot carry a lone surrogate.** The clipboard turns U+D800 into U+FFFD, which is a symbol and is accepted. A lone surrogate can only arrive through the API, where it is refused (rows U+D800, U+DC00 and U+DBFF all give 422). Not a defect.
- **O-2, account form with a tab-only value and an empty stored name.** The field holds U+0009, Save stays disabled and no error shows. The form treats the stripped value ("") as unchanged (`web/src/app/routes/settings/accountForm.ts:19` and `:36`). Nothing is sent and the outcome matches "blank clears", so I do not count it as a finding. It differs slightly from the workspace form, which names U+0009. A tab cannot be typed into the field; it can only be pasted.
- Known and accepted gaps behave as documented: emoji ZWJ sequences are refused (U+200D), and U+3164, U+2800, U+E000 and U+FFFF are accepted.

## Findings
| ID | Sev | Summary |
|---|---|---|
| — | — | None. O-1 and O-2 are notes, not findings. |

## Accessibility summary (axe and manual)
- axe: 0 violations in all 12 viewport/language/form error states.
- The input has `aria-invalid="true"`, and its accessible description is the hint followed by the error text, including "(U+200B)".
- After a failed submit, focus goes to the ErrorSummary (`role="alert"`, `tabindex="-1"`, labelled "Chưa lưu được cài đặt" / "Your settings were not saved"). Its link moves focus to the field (checked at all viewports).
- Keyboard only on laptop: Tab reaches the field, the paste works, Enter submits, and the summary gets focus.
- Server-only 422: the same summary gets focus with the `INVALID_FORMAT` text.

## Isolation and privacy
- A student gets 403 `FORBIDDEN_ROLE` on `GET` and `PATCH /tutor/settings`, and 422 `INVALID_VALUE` for any `displayName` (also `null`).
- The student's `/auth/session` and `/meta` responses contain no `SECRET-*` markers.
- 400 and 422 bodies never echo the value.

## UX checklist (UX-REVIEW: APPROVED)
- **Hierarchy:** one h1 ("Cài đặt" / "Settings") and one primary Save; the layout is unchanged.
- **System:** only the existing field error and ErrorSummary, from the `ui/` components.
- **States:** client error, server error and saved toast checked; the loading and offline states are unchanged by this packet.
- **Forms:** inline and summary errors, focus handling, and only a changed name is checked.
- **Responsive:** no horizontal scroll at 360. "(U+200B)" stays on one line, and the vi message wraps only at spaces in both the summary and the field.
- **A11y:** see above.
- **Copy:** the vi and en strings match scope 7 exactly; the vi reads naturally.
- **Budgets:** unchanged.

Screenshots (local only, not committed), in `the reviewer's scratchpad (local, not kept) `:
- `phone-small-workspace-vi-client.png`: at 360, the red summary "Chưa lưu được cài đặt" with the linked message naming (U+200B); the field shows "LanAnh" with a red border and the same message under the hint; no overflow.
- `laptop-account-en-server.png`: the en summary "Your settings were not saved" with the `INVALID_FORMAT` text (no code point), and the same text under the Display name field.
- `laptop-scope8-ac.png`: after a time-zone-only save with the stored U+2028 name, Asia/Bangkok is selected, the "Đã lưu" toast shows, there is no error, and the header shows the stored name.
- The other screenshots cover each viewport, form and language for the client case, the server case and scope 8.

## Re-test log
- Run 1: discovery only.
- Run 2: phone-small and tablet passed (9 tests). The laptop API test failed because the scratchpad had been cleared during the usage-limit pause; this was my tooling, not the product.
- Run 3: laptop, 6 of 6 passed.

G3 cost: QA+UX wall clock about 55 minutes, not counting the usage-limit pause.

QA-VERDICT T-M2.33: PASS
UX-REVIEW T-M2.33: APPROVED