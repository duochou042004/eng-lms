# QA report — T-M2.17 (combined QA+UX pass, round 1 + delta re-check)

> Recorded by the LC from the reviewer's returned text (DEC-131: reviewers return text only). Round 1 on `978f201` (112,406 tokens, 22.1 min); delta re-check on `646e670` after AC10 (19,014 tokens, 6.9 min; DEC-142).

## Round 1

QA-VERDICT T-M2.17: FAIL
UX-REVIEW T-M2.17: CHANGES REQUESTED

The verdict is FAIL because of one S2 finding (QA-1). Everything else held up. The tests ran on build f72c5ae (head 978f201), using the packaged jar with the e2e tutor and fictitious students, Chromium only. Firefox and WebKit could not run because their system libraries are missing on this host.

## Findings

| ID | Sev | Summary | Steps | Expected | Actual | Viewport / locale |
|---|---|---|---|---|---|---|
| QA-1 / UX-1 | **S2** | The first click or tap on **Save** is lost when the field the user just left fails its check | Edit learning profile → Add field → Value "650" → type a Label, then clear it → click or tap **Save** straight from the Label. Also: open a profile that has 30 fields → clear field 2's Label → click Save. Also at 360: get the label error, type a fix, click Save. | The submit runs. A failed submit shows the ErrorSummary and focuses it (AC4, interaction-states §2.3). A fixed form saves (AC3). | Leaving the field shows or hides an inline error, which moves Save up or down before the mouse is released. The release lands on the form, so no click and no submit happen. No summary appears, focus stays on Save, and no request is sent. With 30 fields at 1280 the error is off-screen, so to the user nothing happens at all. After fixing the error at 360, the first Save press sends nothing; the second one works. Pressing Enter on Save works. | Mouse: 360 and 1280, vi and en. Touch tap: 360 and 768. The fix-then-Save case fails at 360 and works at 1280. |
| QA-2 | S4 | A pasted list refused for two different reasons shows only one message | Paste `Nghe, Đọc\nViết\tNGHE,  ,Bad<BEL>x` into Strengths | Every refused part has a visible reason | Nghe, Đọc and Viết are added. "NGHE, Bad␇x" stays in the input with only "Đã thêm rồi." The control-character reason is never shown. | 1280 vi |
| QA-3 | S4 | The inline Label error stays visible while the user types the fix | Get "Hãy nhập nhãn." → type a label without leaving the field | The error clears when the field becomes valid | It clears only when the field is left. This feeds the moving-button effect in QA-1. | all |

**Cause of QA-1 (read after the verdict draft):** `web/src/features/students/components/LearningProfileForm.tsx:114` sets `mode: 'onBlur'`. ProfileForm, GuardianForm and AddStudentForm all use `mode: 'onSubmit'`, and the same test on Edit profile (clear Full name, click Save) submits normally. However, the packet's UI rules ask for "client checks on blur and on submit", so this is a spec conflict and the LC needs to rule. Possible fixes are to drop the blur check (house pattern), or to keep the button from moving when an error appears or clears. Either way, a test is needed that clicks Save while focus is still in a field that fails its check. The E2E suite does not catch this because its Saves happen after the field has already been left, or by keyboard.

## AC results

| AC | Result | Evidence |
|---|---|---|
| AC1 | PASS | `h2` order is Thông tin cá nhân, Liên hệ, Ghi chú, Phụ huynh, Hồ sơ học tập, Tài khoản. A never-saved profile shows four rows "Chưa có" and no custom rows. `<b>x</b>` and `https://example.com` show as plain text (0 `a`, 0 `b` elements). Notes keep their line breaks. Loading shows an `output aria-busy` labelled "Đang tải hồ sơ học tập" with no Edit button. A 503 shows "Không tải được hồ sơ học tập." with Thử lại inside the section while Edit profile stays usable. After Try again, focus is on the section `h2`. |
| AC2 | PASS | Enter and a typed comma add a tag and keep focus in the input. A whitespace-only entry is ignored. A different-case duplicate gives "Đã thêm rồi.", a 41-character tag gives "Tối đa 40 ký tự.", and in both the text is kept. Paste splits at commas, tabs and line breaks. Remove names are exactly "Xoá {tag}" with no `aria-describedby`. Removing the last chip focuses the input. Enter never sent a request. `/dev/ui` has the TagInput entry and full-page axe finds 0 issues. I did not check the 31st-tag refusal by hand; the E2E 30-tag test covers it. |
| AC3 | **FAIL (QA-1)** | The rest passes. Focus lands on Current level. The first save sends `version:null`, with trimmed values, uncommitted tag text committed by Save, and the empty and whitespace-only custom rows dropped. A double click sends exactly one PUT. The toast "Đã lưu hồ sơ học tập" shows and focus goes to Edit learning profile. A whitespace-only edit sends no request, closes the form and moves focus correctly. A 500 shows the InlineAlert and keeps the input. The failure: after fixing an error at 360, the first Save press sends nothing. |
| AC4 | **FAIL (QA-1)** | The 422 mapping passes: currentLevel; `strengths[2]` gives "“ba”: Tối đa 40 ký tự."; `customFields[1].label` marks form row 3 after the empty row 1 was dropped; `TOO_MANY` goes to the summary, which is focused. With 30 rows, Add field is hidden and "Tối đa 30 mục." / "Up to 30 fields." shows. The failure: a pointer or touch Save from a field that fails its check produces no submit and no summary focus. |
| AC5 | PASS | Two pages, both stale cases: a first save after the other page created the profile, and a save with an older version. Both show the dialog with "hồ sơ học tập" in the text. Copy my learning notes appears only when the notes changed, and the clipboard held the typed notes. Cancel keeps the typed values and focuses Save. Reload shows the other tab's values and focuses Edit learning profile. An unknown student id shows the not-found view. Charter: a focus or visibility event while the form was open triggered no refetch, so the stale save still got the dialog. I found no way to overwrite another tab silently. |
| AC6 | PASS | Each of the profile, add-guardian and learning-profile forms disables every other trigger and the Account actions. The hints count is 3, 2 and 2 as specified (the Guardians hint also shows for the learning-profile form). Uncommitted tag text alone triggers "Bỏ các thay đổi?" on Cancel and on shell navigation. Discard and a clean Cancel focus Edit learning profile. I did not walk the sign-out and forced `/change-password` paths or the status-request case. |
| AC7 | PASS (QA part) | I used a marker `SECRET-LP-<random>` in level, tag, notes and label. localStorage had only `englms.locale`; sessionStorage, the URL and the console never held the marker. A student session got 403 on GET and PUT of `/api/v1/tutor/students/{sid}/learning-profile` and on the other tutor endpoints. The tutor URL redirected to `/forbidden`. 0 of 68 student-session responses contained the marker. The held-promise and cache checks are left to SEC and the unit tests. |
| AC8 | PASS except QA-1 | 30 tags per list and 30 fields, with a 40-character level, a 40-character tag with no space, 60-character labels, 500-character values and a 2,000-character note: no horizontal scroll and no element overflowing the section at 360, 768 and 1280, vi and en. axe found 0 issues on the read view, the form with errors, and the discard dialog in all six combinations. The keyboard-only F12 run took 3 steps. Removing a chip by keyboard moved focus correctly. |
| AC9 | Partial | `students.spec.ts` ×3 on phone-small, tablet and laptop: 492 passed, 3 skipped, 0 failed. Focus and loading learning-profile tests ×20: 300 of 300 passed, no flakes. I did not run `gate.sh`, CI, the openapi diff or the forbidden-identifier test; those come from the LC's gate log. |

## UX rulings
- **Hierarchy and system:** The section is placed correctly. The heading row follows the house pattern: the button sits under the `h2` at 360 and at the row's end from 768. The column layout and chips match the other sections.
- **States:** Loading, error with retry, empty, filled, 404 and 500 all look right. Offline does not apply (no autosave).
- **Forms:** The ErrorSummary, the mapping and the discard guard are good, but QA-1 breaks the main action for pointer and touch users. CHANGES REQUESTED.
- **Copy:** vi reads natively ("Huỷ", "Xoá", "Hồ sơ học tập"), en is correct, and there is no generic error text. One wording note: the summary items "Tối đa 40 ký tự." do not name their field; this is the house pattern, not a finding.
- **Responsive and a11y:** See AC8. Screen-reader names match the packet.
- **Budgets:** F12 takes 3 steps.
- **Scope:** Nothing untraced.

## Screenshots (local, not committed)
- s1-tags-l: the form at 1280 vi with 6 strength chips, the refused paste text in the input and "Đã thêm rồi."
- s7-l-err: 30 fields at 1280 after the lost click; no summary and no visible error.
- s6-read-vi-s: the 360 read view with 30 chips stacked, nothing overflowing.
- s3-conflict-s: the conflict dialog at 360 with "Sao chép ghi chú học tập của tôi".
- s12-*: the loading, error and 422 states at 768.

## Not verified
- Firefox and WebKit (system libraries missing).
- A real screen reader; I only checked accessible names.
- The sign-out and forced `/change-password` guard paths, the scope 7 held-promise check, and the student-session cache after sign-out (SEC's part).
- The gate, CI, bundle budget and openapi diff.
- The 31st-tag refusal by hand (E2E covers it).

## Cleanup and cost
- `git checkout -- evidence/T-M2.17` was run and `git status --short` is clean on 978f201. No PR comments were posted.
- The app and the Vite server are stopped.
- Scratch scripts and screenshots are in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/648e2cc1-dc0c-48bd-9a7a-86445466257d/scratchpad/`, outside the repo.
- The dev DB keeps about 20 extra fictitious `qa-lp-*` students.
- Wall-clock: about 22 minutes. subagent_tokens: not known to me (about 110k context used).

## Round 2 (delta re-check)

QA-VERDICT T-M2.17: PASS WITH MINOR
UX-REVIEW T-M2.17: APPROVED

The S2 is fixed: Save now works on the first click or tap at every viewport I tried. The only open finding is QA-2 (S4), which the LC moved to T-M2.20. This was a delta re-check (qa-protocol §2b) on 646e670, the fix being 830d778. The checkout was already at 646e670 (`git log -1`); I did not pull.

## Round-1 findings

| ID | Sev | Status | Proof |
|---|---|---|---|
| QA-1 / UX-1 | S2 | **Closed** | I ran the three repros at 360, 768 and 1280, in vi and en, with mouse and touch (36 runs): (A) a row with Value "650", Label typed then cleared, Save pressed with focus still in the Label; (B) 30 fields with field 2's Label cleared, then Save; (C) fix the label after the failed submit, then the first press on Save. In every run the first press showed the ErrorSummary and focused it, with 0 PUTs. After the fix, the first press sent exactly 1 PUT and focus moved to Edit learning profile. |
| QA-3 | S4 | **Closed** | After a failed submit, the inline "Hãy nhập nhãn." / "Enter a label." error clears while typing, in all 36 runs. No checks run on blur any more: a cleared Label and a 45-character level, each left with Tab, show 0 `aria-invalid` fields until Save. |
| QA-2 | S4 | Open, moved to T-M2.20 by the LC (DEC-142) | Not re-checked, as instructed. |

## Regression pass (360, vi)
The change did not break the form behaviours it touches:
- **Refused tag text:** a duplicate tag left in the input blocks Save. The summary is focused, the text is kept, and no PUT is sent.
- **422 mapping:** `currentLevel` and `customFields[0].label` map to the right fields and the summary is focused. Changing a field clears only that field's server error.
- **500:** the InlineAlert shows.
- **Double click:** a double click on Save sends one PUT, shows the toast and focuses Edit learning profile.
- **Discard guard:** uncommitted tag text still asks "Bỏ các thay đổi?" on Cancel and on in-app navigation.

## AC10 (b), from reading the tests
`StudentWriteSession.test.tsx` gains a 409 row in the held-promise table, plus a test for 409, 404 and 500. Each removes the session entry while the page is still mounted, then checks there is no dialog, no "Không lưu được" alert and no not-found heading, and that the form is still there. That matches AC10 (b) and the early return in `LearningProfileForm.tsx`. One small gap: the new test does not first show that the dialog appears when a session exists; the existing transitions-table tests cover that case.

## E2E
- Learning profile describe plus the English UI test, ×3 on phone-small, tablet and laptop: 81 of 81 passed.
- The AC10 (a) test ×20 on the same three viewports: 60 of 60 passed, no flakes.

## New findings
None.

## Not verified
- Firefox and WebKit (system libraries missing on this host).
- I did not run AC10 (b) in a browser; I read its tests.
- No gate run, as the scope said.
- Touch was Playwright's `tap()` emulation, not a real device.

## Cleanup and cost
- `git checkout -- evidence/T-M2.17` was run; `git status --short` is clean on 646e670. The app is stopped. Scratch files stay outside the repo in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/648e2cc1-dc0c-48bd-9a7a-86445466257d/scratchpad/`.
- The dev DB has about 40 more fictitious `qa-lp-*` students.
- Wall-clock: about 12 minutes this round, about 34 in total. Cumulative subagent_tokens: not known to me (about 130k context used).
