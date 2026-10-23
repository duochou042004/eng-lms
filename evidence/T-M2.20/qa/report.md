# QA report — T-M2.20 (combined QA+UX pass, round 1 + delta re-check)

> Recorded by the LC from the reviewer's returned text (DEC-131: reviewers return text only). Round 1 on `ae1f950` (code `2adcc1a`; 128,312 tokens, 19.7 min; DEC-147); delta re-check on `3af1658` after AC10 (code `9095577`; 15,244 tokens, 9.9 min; DEC-148). Screenshots stayed local (git-ignored).

## Round 1

QA-VERDICT T-M2.20: PASS WITH MINOR
UX-REVIEW T-M2.20: APPROVED

Build: `feature/T-M2.20-m2-polish` at `ae1f950` (product code `2adcc1a`). I built the packaged jar from this checkout and ran it on :8080 with the e2e profile, plus the Vite dev build on :5173 for `/dev/ui` and the mutation-cache checks. Only Chromium was used: the host lacks the Firefox and WebKit libraries. The verdict was drafted before I read the implementation or `evidence/T-M2.20/summary.md`.

There is one S3 and nothing at S1, S2 or SCOPE. The QA-2 paste case itself works exactly as specified; QA-1 is a narrower path next to it where one reason drops out of the field error.

## Findings

| ID | Sev | Viewport / lang | Steps | Expected | Actual |
|---|---|---|---|---|---|
| QA-1 | S3 | 360 / 768 / 1280, vi and en | 1. Student Profile, **Edit learning profile**. 2. Strengths: add "Nghe" (Enter). 3. Put `NGHE, Bad<BEL>x` into the input in one input event, with no trailing comma (a drop or IME-style insert; Playwright `fill`). 4. **Save**. Variant: paste the QA-2 string, then add one character to the end of the kept text, then Save. | AC8: Save with uncommitted text refused for two reasons shows both reasons in the field error and in the summary item. | The summary item reads "Đã thêm rồi. Thẻ không được chứa ký tự điều khiển." but the field error under Strengths reads only "Đã thêm rồi." (en: "Already added."). The control-character reason is missing in the field. Same with `xxx…(41), Bad<BEL>x`: the field shows only "Use at most 40 characters." |

**QA-1 cause** (`web/src/ui/TagInput.tsx`):
- When the input changes and the new text holds a comma, `TagInput` commits only the text before the last comma and keeps the rest in the input. That commit sets the `entryErrors` state.
- `entryErrors` then replaces the form's `errorMessage`, and Save does not reset it. So the form's joined message for the whole draft stays hidden.
- DEC-146's accepted deviation says "both texts are the same joined reasons in that flow, and an edit clears the entry error". That only holds when the whole text was committed, as in the paste case. Any edit to text containing a comma re-commits it and sets the entry error again.
- Suggested fix: let the form's error win after a submit (for example, clear `entryErrors` when `errorMessage` changes), or rule the gap into DEC-146.
- Per-key typing never reaches this state, because each typed comma commits on its own.

No UX findings. The h3 and h2 summary titles have identical computed styles (16px/20px, weight 600, same class and colour). The joined tag error wraps only at spaces at 360. There is no horizontal scroll, and axe found nothing in every state I checked.

## What held, per AC

- **AC1 (limits):** at 360, 768 and 1280, in vi and en, the profile note, guardian notes, learning notes and Add student note each show "Tối đa 2.000 ký tự." / "Use at most 2,000 characters." next to the counter "2.001 / 2.000" / "2,001 / 2,000". A 40 limit reads "Tối đa 40 ký tự.", 30 tags read "Tối đa 30 thẻ.", unchanged. A grep of all locale files finds no other ungrouped limit at 1,000 or more.
- **AC2 (heading outline):** this held at all three viewports in both languages, and the summary got focus after each failed submit.

  | Form | Error-summary heading | Sits under |
  |---|---|---|
  | Profile | h3 | h2 "Thông tin cá nhân", before the h3 "Liên hệ" |
  | Guardian | h3 | h2 "Phụ huynh" |
  | Learning profile | h3 | h2 "Hồ sơ học tập" |
  | Add student | h2 | h1 |
  | Change password | h2 | h1 |

  Exploratory: no form's summary heading breaks the outline.
- **AC3 (S-1):** confirmed in the code and in the live dev build by reading the query client's mutation cache through the React tree, at 1280 and 360.
  - After a guardian save the cache held the guardian's name and notes.
  - It was empty after a UI sign-out, after a sign-out whose call returned 500, after a sign-in (`[]`), in a tab whose other tab signed out, and after a server-side session end followed by in-app navigation (the 401 path).
  - Sign-in and sign-out still work. A failed logout ends on `/tutor/today` because the server session is still alive; that is existing behaviour, not this packet.
  - The kept `auth.spec.ts` and `guards.spec.ts` passed on the three projects: 78 passed, 12 skipped by design.
- **AC4 (S-2):** `useCreateStudent` checks `isTutorSession` before invalidating the list. The held-promise unit test covers three cases: tutor session, a student signed in meanwhile, and no session.
- **Unit tests:** 17 files, 367 tests passed (`sessionBoundaries`, `students.test`, `TagInput`, `ErrorSummary`, the learning-profile schema, the students routes, `ChangePasswordPage`, auth).
- **AC5 (proof by mutation):** with `origin/develop:e2e/support/checks.ts` swapped in, exactly the two new pass-fixtures fail: the `display: none` child and "one<br>two". The violating fixtures and every existing proof still behave correctly. The file was restored.
- **AC6:** with the old helper, the `visibility: hidden` fixture still fails. That confirms the DEC-146 engine fact (Chromium moves focus to `body`), so this fixture does not tell the old and new helpers apart on this engine.
- **AC7:** run at tablet, ×20 each.
  - `students.spec.ts` "AC6: leaving a dirty form asks…": 20/20.
  - `shells.spec.ts` `/dev/ui` overlay test against the dev server: 20/20.
  - My grep of bare `expectNoAxeViolations` calls matches the summary's list.
- **Changed focus/axe specs:** `checks.spec.ts` ×20 on phone-small, tablet and laptop: 1200/1200. The new `students.spec.ts` tests (en and vi limit, two-reason paste) ×20 on the same three: 180/180.
- **AC8 (pastes):**
  - The QA-2 paste adds Nghe, Đọc and Viết, keeps `NGHE, Bad<BEL>x` in the input, and shows "Đã thêm rồi. Thẻ không được chứa ký tự điều khiển." Its Save shows both reasons in the field and in the h3 summary.
  - Too long + duplicate: "Đã thêm rồi. Tối đa 40 ký tự."
  - Control + too many: "Thẻ không được chứa ký tự điều khiển. Tối đa 30 thẻ.", in first-refusal order.
  - A single reason reads as before.
  - Keyboard-only: Save leads to the summary, the summary link leads to the Strengths input, and the focus ring is 2px solid.
  - Exception: QA-1.
- **AC9:** CI is green on `ae1f950` (7 checks). There are no `backend/` or `api/` changes against `develop`. No exam names in `web/src`. The changed paths match the packet's file list.
- **Isolation:** the student session gets 403 on the tutor student, guardian and learning-profile endpoints, and the `/forbidden` page in the UI. No `SECRET-*` marker in the student's responses. This packet adds no endpoints.

## What I did not check

- Firefox and WebKit, which leaves AC6's real purpose unverified (deferred to G5 by DEC-146).
- The full gate run, since CI is green.
- A mutation proof of the S-2 unit test, because editing `web/` is outside my role; I reviewed it by reading.
- Whether AC5 rejects a parent-`checkVisibility()` variant of the helper. I relied on the `display: contents` fixture passing.
- Loading, offline and empty states, which this packet did not change.
- A screen reader, beyond the accessibility-tree heading list.

Screenshots are local and not committed, in `/tmp/claude-1000/-home-kali-App-projects-eng-lms/2c5bfa62-5107-4204-9133-6afe98d811b6/scratchpad/shots/`:
- `<project>-<lang>-{profile-note,guardian-notes,lp-notes,add-note,paste-*}.png`: full pages of each error state.
- `phone-small-vi-tag-error-el.png`: the two-reason Strengths error wrapping at a space at 360.
- `*-summary-el.png`: the h3 and h2 summaries, which look the same.

Throwaway specs are deleted, `evidence/T-M2.20` is restored, both servers are stopped, and `git status` is clean. The dev DB keeps fictitious "QA Polish / QA S1 / QA Edit" students and guardians, all with `qa-m220-*` usernames.

Wall-clock: about 20 minutes. Cumulative subagent tokens: about 125,000 (estimated from the context used).
## Round 2 (delta re-check)

QA-VERDICT T-M2.20: PASS WITH MINOR
UX-REVIEW T-M2.20: APPROVED

This is the delta re-check (qa-protocol §2b) on `3af1658`, code fix `9095577`. I rebuilt the packaged jar at that head and ran Chromium only (the host lacks the Firefox and WebKit libraries). Scope was the `TagInput.tsx` change, its unit tests, the new AC10 E2E, and QA-1's repro.

## QA-1: closed for the paths it reported

I ran each path at 360, 768 and 1280, in vi and en.

- **One-event insert, then Save:** `NGHE, Bad<BEL>x` is put into Strengths in one input event, with "Nghe" already a tag, then Save. The field now reads "Đã thêm rồi. Thẻ không được chứa ký tự điều khiển." ("Already added. Tags can't contain control characters."), the same as the summary link.
- **Edit after a paste, then Save:** paste the QA-2 string, add one character to the kept text, then Save. The field and the summary both show both reasons.
- **A different message on the next Save:** too long plus control. The field shows "Tối đa 40 ký tự. Thẻ không được chứa ký tự điều khiển." in the field and in the summary.
- **The entry error of a later commit still shows:** a later paste of `Đọc, NGHE,` shows "Đã thêm rồi." and keeps "NGHE" in the input. This is the AC10 "shows again as today" clause.

## New finding: the reported limitation

| ID | Sev | Viewport / lang | Steps | Expected | Actual |
|---|---|---|---|---|---|
| QA-2 | S4 | 360 / 768 / 1280, vi and en | 1. Strengths holds "Nghe"; put `NGHE, Bad<BEL>x` in the input and Save (both reasons shown, correct). 2. Add "y" to the end: the field shows "Đã thêm rồi." (the re-committed entry's error, allowed). 3. Save again. | AC10: after a failed Save the form's error wins, so the field shows both reasons. | The field still shows only "Đã thêm rồi." while the summary link shows both. The second Save gives the identical form message, so `TagInput` keeps the entry error. |

**My ruling on the implementer's question:** a defect, S4 rather than S3.
- **Why it is a defect:** it misses AC10's "the form's error wins after a failed Save", and it has the same symptom as QA-1.
- **Why only S4:**
  - It needs a failed Save, then an edit that re-commits a refused entry but leaves the set of reasons unchanged, then another Save.
  - The text the field shows is true, only incomplete.
  - The full text is in the summary, which gets focus on Save. Nothing is lost.
  - An edit that actually fixes one reason changes the form message, and the field is then correct (my third path above).
- **Root cause:** the fix detects a new Save by `errorMessage !== callerError`, so two identical messages in a row look like no change.
- **Suggested fix:** key the reset off a submit signal instead, for example the form's `submitCount` passed as a prop. Or record it as an accepted deviation in a DEC.

No other new findings. No layout or copy change came with this fix.

## Repeat counts

- `students.spec.ts` "AC10: text filled in one input event…" and "AC8: a pasted tag list…", ×20 on phone-small, tablet and laptop: 120/120 passed. They cover summary focus.
- `students.spec.ts` in full, ×3 on the same three: 537 passed, 3 skipped by design, 0 failed.
- Unit tests `TagInput.test.tsx` and `StudentLearningProfile.test.tsx`: 67/67 passed.
- CI on `3af1658` when I checked: six checks passed, e2e-smoke still pending.

**Not checked:** Firefox and WebKit, a full regression or gate run (out of §2b scope), and the final e2e-smoke result.

**Housekeeping:** the throwaway specs are deleted, `evidence/T-M2.20` is restored, the app is stopped, and `git status` is clean on `3af1658`. The dev DB keeps a few more fictitious "QA Delta Tag" students with `qa-m220-*` usernames.

Wall-clock for this round: about 10 minutes, about 30 minutes for both rounds. Cumulative subagent tokens: about 150,000 (estimated from the context used).