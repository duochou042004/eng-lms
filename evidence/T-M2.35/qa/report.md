QA-VERDICT T-M2.35: PASS WITH MINOR
UX-REVIEW T-M2.35: APPROVED

T-M2.35 passes. There are no S1, S2 or SCOPE findings, only four S4s. Two of them are gaps in the spec rather than defects in the code, and one is older behaviour in a shared `ui/` component.

Head reviewed: `010c16f0a3eecca93c13211caeecf8c4bd0c8d73` on `feature/T-M2.35-workspace-settings`. Date 2026-11-25. Mode: combined QA+UX (qa-protocol §2a), fresh context.

# QA Report — T-M2.35 Workspace settings v1 and Settings › Workspace

## Environment
- Every run used `./scripts/e2e-run.sh`: the packaged jar with the SPA, on the per-run `englms_e2e` database that the script drops and recreates each run. No `E2E_KEEP_DB`, the PO's dev database was never touched, nothing was purged.
- Built once, then `--no-build`. Chromium, `--workers=1`, projects phone-small (360×740), tablet (768×1024) and laptop (1280×800).
- My checks were throwaway specs `e2e/tests/zz-qa-*.spec.ts`. All are deleted. `git checkout -- evidence/T-M2.35` was run. `git status --short` shows only the two untracked `evidence/*/records/` folders that were there before.
- Every write to the workspace was restored to `Eng-LMS` / `vi` / `Asia/Ho_Chi_Minh` (last restore answered 200).
- The plan was written from the packet, the ACs and the specs before I read any implementation code. I read only part of the diff, after the verdict draft, to pin down the findings (`SegmentedControl.tsx`, and the character rule in `WorkspaceSettingsService.java:32`).
- Logs: `/home/deb/App_sources/eng-lms/.claude/scratch/qa-T-M2.35/{discover,api,ui,ui2,ui3,focus,last,restore}.log`.

## AC results
| AC | Scenario(s) | Viewports | Result | Evidence |
|---|---|---|---|---|
| AC1 | GET on a fresh database gives `Eng-LMS`/`vi`/`Asia/Ho_Chi_Minh`, version 0, exactly the 5 keys. PATCH bumps version by 1. A following GET and anonymous `/meta` show the new name. Leading and trailing spaces are removed. | API | PASS | api.log |
| AC2 | 35 table cases (all codes below). All problems come back in one 422. 422 is checked before 409. A stale version with unchanged values gives 409. A PATCH with the same values keeps `version` and `updatedAt`. Nothing is saved on a 422 or 409. A 120-character Vietnamese name (precomposed) gives 200. The same name decomposed (154 code points) gives `TOO_LONG`, so length is counted in code points. Extra properties (`updatedBy`, `extra`) are ignored, so no mass assignment. | API | PASS | api.log |
| AC3 | Student GET/PATCH 403 `FORBIDDEN_ROLE`. Anonymous 401. No CSRF header 403 `CSRF_INVALID`. A must-change student gets 403 (expected, per BE ruling 4). `/meta` stays public. Secret scan of a student's own session (11 API responses, with `SECRET-QA-*` in the tutor note and learning profile): 0 hits. Student B on `/tutor/students/{A}` gets 403. | API | PASS | api.log |
| AC4 | Two PATCHes from separate tutor contexts, same version, different names: one 200, one 409. The winner's name is stored and version went up by exactly 1. | API | PASS | api.log |
| AC5 | Through the UI, set `en` + `Pacific/Kiritimati`. The PATCH body was `{"version":3,"defaultLocale":"en","defaultTimeZone":"Pacific/Kiritimati"}`. A student created afterwards, signed in on a fresh device with browser locale `vi-VN` and no stored choice: session `en`/`Pacific/Kiritimati`, `<html lang="en">`, h1 "Home". A student created earlier keeps `vi`/HCM, h1 "Trang chủ". The tutor and the shared student are unchanged. | laptop | PASS | ui2.log, laptop-student-{after,before}-defaults.png |
| AC6 | `/tutor/settings` redirects to `/workspace`. Tabs are Workspace then Account. Title "Cài đặt không gian làm việc · Eng-LMS". Route focus lands on h1 "Cài đặt" (sampled 50 ms to 2 s) after a click or Enter on the Settings item, after each tab, and after a pushState to `/tutor/settings`. | all 3 | PASS | focus.log |
| AC7 | Detail below this table. | all 3 / laptop | PASS | ui*.log |
| AC8 | The Account tab shows a visible "Ngôn ngữ"/"Language" label above the switcher. `radiogroup "Language"` resolves by accessible name. | all 3 | PASS | discover.log, *-account-label.png |
| AC9 | No horizontal scroll and 0 axe violations in every state checked: default, client 422, server 422, conflict, load error, offline, and a 120-character name in the tutor shell, student shell and sign-in page. The open ComboBox ran with only `aria-hidden-focus` disabled (DEC-191) and was also clean. Listbox is field-width at 360 and 768. Listbox height 370 of 740 px = 50 vh. | all 3 | PASS | ui.log |

AC7 detail:
- **Request bodies:** only `version` plus the changed properties are sent, e.g. `{"version":16,"displayName":"Lớp cô Hương"}`.
- **Save button:** `aria-disabled="true"` while the form is unchanged. It turns disabled again when the original value is retyped. A name that differs only by surrounding spaces counts as unchanged.
- **Save success:** toast "Đã lưu", focus stays on Save, and the shell name updates without a reload.
- **422:** both client errors (empty, 121 characters) and server errors (zero-width) show the field error plus an ErrorSummary, and focus moves to the summary.
- **409:** the dialog has translated strings even on a direct load of `/workspace`. "Tiếp tục sửa" (keep editing) returns focus to the field last edited. "Tải lại" (reload) reloads the values and focuses Save.
- **500 and offline:** an InlineAlert with "Thử lại". There was no replay after coming back online; only a click on Retry saved.
- **Edits during a pending save:** kept ("…3" stays in the field after the server stored "…2"), and Save is enabled again.
- **Unsaved guard:** the dialog "Bỏ các thay đổi?" blocks tab navigation. On a browser reload, `beforeunload` fired.
- **Loading and load error:** `aria-busy` skeleton while loading. Load error shows "Chưa tải được cài đặt không gian làm việc." with Retry, and Retry recovers.
- **English:** all strings checked; no raw keys and no English in the vi UI.

## Exploratory charter and notes (about 13 minutes of runs plus review)
- **Two tabs:** tab A saved the name. Tab B, which still held version 16, changed the language and got the 409 dialog. Keep editing kept B's edit. Saving again gave the dialog again. Reload showed A's name with the language back to vi. B then saved `en` successfully (version 18).
- **Keyboard only at 360:** skip link, then "Mở điều hướng", Enter opens the drawer (focus inside). Tab moves Đóng, Hôm nay, Học viên, Cài đặt; Enter lands on the Workspace tab. Tab order is tabs, name, language, time zone, Save. Ctrl+A and typing work; Enter on Save gives "Đang lưu…" then the toast, with focus kept on Save. Typing "Tokyo" in the ComboBox, ArrowDown and Enter selects `Asia/Tokyo`. Enter in the name field submits. A 2 px solid focus ring was visible on every stop.
- **Sign-in page and both shells with a 120-character Vietnamese name:** the sign-in page clamps to 2 lines with an ellipsis. The tutor and student top bars clamp to 1 line. No horizontal scroll at any viewport.

Screenshots (local, under `/home/deb/App_sources/eng-lms/.claude/scratch/qa-T-M2.35/`):
- `<vp>-default.png`: the form at that viewport.
- `<vp>-combobox-open.png`: the list above the field, within 50 vh.
- `<vp>-error-client.png` and `<vp>-error-zw.png`: the red summary and the field error; the zero-width name shows as "LanAnh".
- `<vp>-conflict.png`: taken mid fade-in. Use `phone-small-conflict-settled.png` and `tablet-conflict-settled.png` instead: the dialog "Đã có thay đổi ở nơi khác" with "Tải lại" and "Tiếp tục sửa".
- `<vp>-{tutor,student,login}-longname.png`: the clamped long name.
- `laptop-{loading,load-error,save-500,offline,en-error}.png`.
- `phone-small-keyboard-{saved,edit}.png`.
- `phone-small-account-label.png`: the "Ngôn ngữ" label above the switcher.

## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| QA-1 | S4 (spec gap; the code matches the spec) | Some invisible or direction characters not in the packet's list are accepted in the public name: U+061C (Arabic letter mark, a bidi control), U+2060 (word joiner, zero width), U+2028 (line separator, which can break the one-line label). The rule is `[\p{Cc}U+200B-U+200FU+202A-U+202EU+2066-U+2069U+FEFF]` (`WorkspaceSettingsService.java:32`, mirrored in `workspaceForm.ts`). | PATCH `displayName: "aU+061Cb"` (also `U+2060`, `U+2028`) | Refused, if the intent is "no bidi or zero-width" | 200, stored | api.log, ui.log ("extra chars") |
| QA-2 | S4 (older behaviour, not from this PR) | `ui/SegmentedControl` reports itself as radios, but an arrow key only moves focus; Space or Enter selects. The ARIA radio pattern selects on arrow. The diff only adds `labelVisible`; the underlying button group is unchanged. | Focus "Tiếng Việt", press ArrowRight | "English" checked | Focus moves, still unchecked; Space checks it | ui3.log, last.log |
| UX-1 | S4 | An invisible-character error points at a name that looks clean ("LanAnh"), so the tutor cannot see what to delete. | Paste a name containing U+200B, then Save | Some way to find or remove the character | Only the message; the tutor must retype the name | phone-small-error-zw.png |
| UX-2 | S4 (note) | The conflict dialog opens with focus on the secondary "Tiếp tục sửa", not the primary "Tải lại". This is defensible because Reload throws away edits. I flag it only so it can be checked against the students' ConflictDialog. | Trigger a 409 | Same as the students' pattern | Focus on keep editing | ui.log |

Suggested handling:
- QA-1: extend validation-rules in a later packet to cover the Unicode Bidi_Control set plus U+2060–U+2064 and U+2028/U+2029 on both the server and client sides; otherwise accept as specified.
- QA-2: batch with T-M2.32.
- UX-1: optional. Either strip these characters with a hint, or have the message name the position.
- UX-2: no change if the students' ConflictDialog does the same.

These are not findings:
- The document title keeps "· Eng-LMS" (the app name) after the workspace name changes. That matches frontend-architecture (`app.documentTitle`).
- Tab B's shell name does not update until it reloads. Packet ruling FE (3) covers this.
- The 409, 500 and offline console errors were provoked on purpose.

## Accessibility summary
- **Automated:** axe (wcag2a/aa, 21a/aa, 22aa) found 0 violations in the 18+ states listed in AC9 across the three viewports. Only the open-list run disabled one rule (`aria-hidden-focus`, DEC-191).
- **Manual keyboard:** every flow can be done by keyboard, the focus ring is visible, and focus returns correctly after dialogs and saves.
- **Targets:** Save is 44×62 px.
- **Names:** the Language label names its group.

## Isolation and privacy checks
- `/tutor/settings` refuses students (403), anonymous users (401), must-change accounts (403) and requests without CSRF (403).
- No `SECRET-*` markers appear in any student response.
- `/meta` exposes only `{name, version, locales, displayName}`.

## UX checklist
| Item | Result |
|---|---|
| Hierarchy | One h1, one primary action |
| System | `ui/` components only |
| States | Loading, error with retry, offline, 422, 409 all present |
| Forms | Required marker, inline errors and summary, unsaved guard |
| Responsive | Long Vietnamese name clamps or wraps, no horizontal scroll |
| Copy | vi reads natively, en correct, no generic error text |
| Budget | Settings item reaches Workspace in 1 step; the Account tab is 1 more |

## Re-test log
None; this is the first round.

## G3 cost
QA+UX agent: about 13 minutes wall clock.

Not checked:
- WebKit and Firefox.
- The ×20 repeat of the implementer's specs.
- The 360 sticky-footer check with the soft keyboard open.
- Screen-reader announcements beyond accessible names.
- `/meta` on a database failure (that is the SEC review's job).

Risk: none blocking.
