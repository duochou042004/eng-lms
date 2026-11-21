# T-M2.6 QA report (combined QA + UX checklist, tier H)

Round 1 and the delta re-check by one fresh qa-evaluator agent; the LC recorded its returned text (DEC-131). Rulings: DEC-191.

## Round 1 (head `d5426b5`, 2026-11-21)

Cost: 167,016 tokens, 55 tool uses, 1,391 s.

QA-VERDICT T-M2.6: PASS WITH MINOR
UX-REVIEW T-M2.6: APPROVED

No S1/S2. Five S3 (one UX), five S4. FE OQ-2 ruled S4.

## Environment
Packaged jar via scripts/e2e-run.sh on a fresh englms_e2e DB each run (PO dev DB untouched). Chromium phone-small 360×740, tablet 768×1024, laptop 1280×800, vi + en. Black-box checks from a temporary raw @playwright/test spec (real PATCH), deleted after. git status restored; no app left running.

## Runs
- settings-account.spec.ts ×1 on 3 projects: 31 passed, 2 skipped.
- ×20: 620 passed, 0 failed.
- shells.spec.ts ×3 phone-small: 114 passed. FE OQ-1 (shells.spec.ts:1032) did not recur.
- Web unit / gate not run (CI 7/7).

## AC results
| AC | Result | Evidence |
|---|---|---|
| AC1 | PASS | each property alone + all three → 200 session body; GET session matches; trim; repeat same body |
| AC2 | PASS | fr/EN/' en' INVALID_VALUE; null REQUIRED; asia/saigon, +07:00, Z, UTC+7, EST INVALID_VALUE; GMT0, SystemV/AST4, Asia/Saigon 200; 121 TOO_LONG; 120×"ầ" 200; \u0007 INVALID_FORMAT; '   ' clears; {} 422 REQUIRED locale; object/array 400; several bad → one 422 with all; student displayName (X, null, with locale) 422, nothing saved; student own locale/zone 200 |
| AC3 | PASS | anon 401; must-change 403; no CSRF 403 CSRF_INVALID; text/plain 415; PUT 405; A's PATCH (also with ?studentId&userId) changes only A; mass assignment ignored; no SECRET-* marker; student on /tutor/settings/account → /forbidden |
| AC4 | PASS | 10 rounds two-tab parallel PATCH, both persisted |
| AC5 | PASS | sidebar + drawer, redirect, tab current, h1 focus, title, drawer tab order |
| AC6 | PASS (QA-1..3) | values, aria-disabled Save, changed-only bodies, toast + focus on Save, 422 summary focus, 500 InlineAlert + retry, guard dialog focus, en strings |
| AC7 | PASS (UX-1, UX-2) | keyboard, accent/case filter, empty state, 13–17 options rendered, tap at 360, current value kept, long-task 20/20 |
| AC8 | PASS | PATCH on switch; must-change sends nothing; fresh device student en → English, no extra PATCH; stored vi wins; student saves for real |
| AC9 | PASS | Kiritimati/Etc/GMT-14 22/11 vs Honolulu 21/11; midnight Brisbane/Tokyo vs Intl reference; credentials expiry at Kiritimati correct; aliases format |
| AC10 | PASS WITH MINOR (UX-2) | no h-scroll in all states ×3 viewports; axe 0 default/422; serious aria-hidden-focus with list open; targets ≥ 44 px; focus ring visible; CI green |

## Findings
| ID | Sev | Summary | Evidence |
|---|---|---|---|
| QA-1 | S3 | A client-side validation failure (121 chars, Save) shows the ErrorSummary but focus stays on Save in a real browser (3 projects); a server 422 does focus it. Unit test passes only in jsdom; E2E does not cover a client error | AccountSettingsPage.tsx:101-103,129 |
| QA-2 | S3 | Text typed while a save is pending is thrown away: the field resets to the saved answer, Save disabled, guard no longer protects it (also after the offline replay) | AccountSettingsPage.tsx:113 `reset(accountValues(answer))` without keepDirtyValues (line 86 uses it) |
| QA-3 | S3 | Saving offline: "Đang lưu…" forever, then a silent replay online; expected the InlineAlert network error | session.ts:92 useUpdatePreferences default networkMode 'online'; logout uses 'always' (session.ts:114,128) |
| UX-1 | S3 | English in the vi UI for screen readers: ComboBox button "Show suggestions Múi giờ", listbox "Suggestions" (React Aria has no vi strings) | ComboBox.tsx:89, :97; drawer "Dismiss" is pre-existing, out of scope |
| UX-2 | S3 | axe aria-hidden-focus (serious) with the list open at 360/768/1280: React Aria aria-hides outside the popover while skip link, top bar, sidebar, tabs, Language row and Save stay focusable; Tab closes the list. The spec's axe calls (:92/:132/:181/:225/:332) all run with the list closed; :301 only checks h-scroll | LC to rule: fix or a recorded axe exception |
| QA-4 | S4 | Quick switches on a slow network can save the wrong account locale (no request ordering) | LanguageSwitcher.tsx:23 |
| QA-5 | S4 | Packet wording: "the Account page shows the saved value" cannot hold when the row is the switcher (device choice) | packet scope 7 |
| QA-6 | S4 | displayName accepts tab, LF, lone U+200B, U+202E (matches validation-rules row 47); a U+200B-only name shows blank | T-M2.33 candidate |
| UX-3 | S4 | FE OQ-2: no visible Language label; passes WCAG 3.3.2 and 2.5.3 (radio names = visible text); intended by the packet; suggest a visible label with T-M2.35 | |
| UX-4 | S4 | Alt+ArrowDown does not open the list; ArrowDown does (APG met, Alt+Down optional) | |

## Exploratory
Two tabs: unsaved edit survives the focus refetch; tab 2 sends only displayName; both kept (DEC-190). Asia/Saigon, Asia/Ho_Chi_Minh, GMT0, SystemV/AST4 shown unchanged. Free text "Nowhere/City" reverts on blur. Failed session refetch on arrival: cached values, no visible warning (harmless). Keyboard-only at 360 with drawer: full save path, focus stays on Save. 360 open list: above the field, field width, 370/740 px, toast under it. Nothing untraced.

Not checked: WebKit, screen readers, web unit tests and gate locally.
Screenshots: local only (not committed, DEC-131).

---

## Delta re-check (same agent, head d6d70ba, 2026-11-21)
QA-VERDICT T-M2.6: PASS WITH MINOR
UX-REVIEW T-M2.6: APPROVED
QA-1 FIXED (summary focused after client error, click + Enter, 3 projects; server 422 still focuses). QA-2 FIXED (typing during a 2.5 s save kept and dirty; guard opens; trimmed answer shown when no further typing; zone change during a name save kept dirty, unsent). QA-3 FIXED (offline InlineAlert at once with Thử lại, no replay after reconnect; switcher offline: nothing shown, no replay). UX-1 FIXED for the two names (vi "Hiện các múi giờ"/"Các múi giờ"; en "Show time zones"/"Time zones"). UX-2 FIXED under DEC-191 (open-list axe: only aria-hidden-focus; checks.spec.ts:175-200 proves only the named rule is off).
New UX-1r S3: vi ComboBox still has React Aria default English: hidden popover button "Dismiss" and live log "398 options available." (library string tables; same class as the pre-existing drawer "Dismiss"). Proposed S4 batch or DEC beside DEC-191. Minor: listbox computed name "Các múi giờ Múi giờ" (aria-label + linked label).
Regression of the Account page on 3 projects OK. settings-account.spec.ts ×20 ×3 projects: 680 passed, 0 failed; checks.spec.ts ×3 ×3 projects: 216 passed. Diff 1b286cc..d6d70ba matches the rulings; nothing out of scope.
