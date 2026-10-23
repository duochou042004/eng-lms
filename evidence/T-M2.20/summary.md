# T-M2.20 summary: M2 polish batch (S4 findings)

> Recorded by the LC from the frontend-implementer's returned text (lessons-learned L-07); its report is copied verbatim below the
> rulings. Packet `docs/tasks/T-M2.20-m2-polish.md` (DEC-144, DEC-145); PO start signal in chat on 2026-10-23 (DEC-146).

## Gate (G1)
- `ENGLMS_TASK=T-M2.20 ./scripts/gate.sh` once on the product head `2adcc1a`: **PASS** (13 steps, 912 s; backend and contract-drift
  skipped for the web-only diff; changed specs `checks`, `shells`, `students` ×3): `evidence/T-M2.20/gate-20261023T030742Z.log`. The pushed
  head `831fe65` adds only that log and the E2E records.
- Diff vs `develop` (LC check): no `backend/`, `api/`, PNG, `review/` or `qa/` path.

## LC rulings on the implementer's open questions
1. **OQ-1** (AC6: on Playwright 1.64's Chromium 156 focus already drops to `body` when the focused control turns `visibility: hidden`,
   so the old helper fails the new fixture too): accepted (DEC-146); the rule change and the fixture stay, AC6's "passes on `develop`"
   clause is dropped from the packet.
2. **Deviation 2** (`TagInput` shows its own entry reasons in place of the form message after Save; identical text in that flow):
   accepted (DEC-146), then superseded by G3 QA-1 → AC10 (DEC-147).

## G3 cost
| Round | Reviewer | Head | Verdict | Findings | Full/delta | Tokens | Minutes | Gate runs |
|---|---|---|---|---|---|---|---|---|
| G1 | frontend-implementer | `2adcc1a` | gate PASS | OQ-1 | — | 193,922 | 34.0 | 1 (912 s) |
| G3 round 1 | combined QA+UX (fresh) | `ae1f950` (code `2adcc1a`) | QA PASS WITH MINOR / UX APPROVED | S3 QA-1 → AC10 (DEC-147) | full | 128,312 | 19.7 | 0 |
| AC10 fix | frontend-implementer (resumed) | `9095577` | gate PASS | — | — | 14,192 | 20.8 | 1 (950 s) |
| G3 round 2 | combined QA+UX (resumed) | `3af1658` (code `9095577`) | QA PASS WITH MINOR / UX APPROVED | QA-1 closed; new S4 QA-2 → M2 G5 (DEC-148) | delta | 15,244 | 9.9 | 0 |
| **Total** | 2 agents | | | | | 351,670 | 84.4 | 2 (1,862 s) |

## AC10 fix report (verbatim, round 2)

## T-M2.20 AC10: report

AC10 is fixed: after a failed Save, the Strengths field now shows both reasons, just as the summary does. The gate passed once on the code commit, and the branch is pushed. I posted no PR comments.

- **New head:** `3af1658`, which only adds the gate log and the E2E records.
- **Code commit:** `9095577`, `fix(ui): TagInput: a new caller error wins over the last entry's reasons (AC10)`.

**Fix** (`web/src/ui/TagInput.tsx`, a few lines): `TagInput` remembers the last `errorMessage` it was given. When that changes (a failed Save, or a revalidation), it clears its own `entryErrors` during render. The form's message then shows, and the entry error of a later commit shows again. No other kept assertion was changed. I also added one clause to the `TagInput` entry in design-system §3 so the doc says the same.

### AC10 proof
Each test below fails without the fix and passes with it; I checked this by reverting `TagInput.tsx`.
- **Component tests**, `StudentLearningProfile.test.tsx`, "T-M2.20 AC10: text %s: after a failed Save the field shows both reasons; a later commit shows its own", run for both paths:
  - **one-event insert with a comma:** `fireEvent.change` with "NGHE, Bad\u0007x", the same kind of event as `fill`, a drop or an IME insert;
  - **edited after a paste:** paste, then type "y".
  - Each asserts that before Save only "Đã thêm rồi." shows. After Save the summary link and the field description both read "Đã thêm rồi. Thẻ không được chứa ký tự điều khiển.". The text stays in the input. A later "Nghe" + Enter shows its own reason again.
- **Unit test**, `ui/TagInput.test.tsx`, "a new caller error wins over the last entry's reasons; a later refused commit shows its own again (T-M2.20 AC10)".
- **E2E**, `students.spec.ts` "M2 polish (T-M2.20) › AC10: text filled in one input event (a comma inside), then Save: the field shows both reasons (vi)":
  - It saves Strengths ["Nghe"] through the API, `fill`s "NGHE, Bad\u0007x", then Saves.
  - It checks the h3 summary takes focus, the link text, and that the field error is visible.
  - It runs `expectNoMidWordBreak` on the error and `expectSettledAccessible`.
  - It passes at 360, 768 and 1280. At 360 (phone-small) it fails on a rebuild without the fix.
  - Screenshot, local only: `evidence/T-M2.20/impl/<viewport>/t-m2-20-tag-fill-save-vi.png`.

### Gate
- `ENGLMS_TASK=T-M2.20 ./scripts/gate.sh` run once on `9095577`: **PASS, 13 steps, 950 s**.
- E2E: 960 passed. The ×3 repeat ran the checks, shells and students specs. The only failure line is the designed `test.fail` in `guards.spec.ts:100`.
- Log: `evidence/T-M2.20/gate-20261023T035043Z.log`, trimmed to 296 lines; the full log is in `raw/`, which is git-ignored.
- Unit tests: 818 passed. `check-docs` and `check-path-ownership` pass.
- CI not checked yet.

### Limitation (not fixed)
If two Saves in a row give exactly the same form message, and the user commits a refused entry between them, the second Save does not clear that entry error. The field then shows the entry's reason rather than the joined message. This only happens with an edit between two identical failed Saves.

**subagent_tokens (cumulative):** about 207k.

## Implementer report (verbatim)

## T-M2.20: summary for the LC to record

All nine ACs are implemented, the gate passed once, and the PR is open. AC6 could not be proven exactly as the packet describes; that is deviation 1 and an open question for you.

**PR:** https://github.com/duochou042004/eng-lms/pull/136 · head `831fe65` on `feature/T-M2.20-m2-polish`.
- `1bd8dee`: web changes.
- `2adcc1a`: E2E and docs (the gate ran on this commit).
- `831fe65`: the gate log and E2E records only.

### AC → proof
| AC | Proof |
|---|---|
| AC1 | `students.json` vi/en: 8 keys each now use `{{max, number}}`. The two allowed assertions are updated (`StudentGuardians.test.tsx`, `StudentLearningProfile.test.tsx`: "Tối đa 2.000 ký tự."). E2E `students.spec.ts` "M2 polish (T-M2.20) › AC1/AC2: a 2,001-character note… (vi)" and "…(en)" at all three viewports. 30/40/120 limits read as before (kept assertions green). |
| AC2 | `ErrorSummary.test.tsx` "renders its title as an h3 with headingLevel 3, with the same class…" (the default-h2 test is kept). One heading-level assertion is added, after the existing focus check, in `StudentProfileEdit`, `StudentGuardians` and `StudentLearningProfile` (h3), and in `AddStudentPage` and `ChangePasswordPage` (h2). The `/dev/ui` sample passes `headingLevel={3}`. |
| AC3 | New `web/src/app/sessionBoundaries.test.tsx`: sign-in (`getAll()` is `[]`, and the redirect to `/tutor/today` still works), sign-out with 204 and with a failed call, 401, and a cross-tab message (`dropAllButSession`). All 5 fail on the old code. The DEC-127 held-promise tests and `session.test.tsx` stay green. |
| AC4 | New `features/students/api/students.test.tsx`: a held create answered with the tutor session cached invalidates the list; answered after a student signed in, or with no session cached, it invalidates nothing. The last two fail on the old code. |
| AC5 | `checks.spec.ts`: "passes on a box whose visible words fit and that holds a display: none child" and "passes on "one<br>two"…" both failed on the old helper and pass now. "still fails on a forced mid-word break beside a display: none child", "still fails on "one<br>" followed by a word forced…" and "measures the text of a display: contents child" all reject. Every existing proof is kept. |
| AC6 | `checks.spec.ts` "fails after a button that hides itself (visibility: hidden)". See deviation 1. |
| AC7 | `students.spec.ts:266` now calls `expectSettledAccessible`. In `shells.spec.ts`, the `expectAccessible` body is now `expectSettledAccessible(page)`. |
| AC8 | The `addTags` table (rows changed `error` → `errors`; the last row gains `'duplicate'`) plus new rows for too long + too many and QA's paste. New `TagInput` test for QA's paste showing both messages. Two new two-reason rows in `learningProfileSchema.test.ts`. `StudentLearningProfile.test.tsx` "T-M2.20 AC8: …two reasons…" fails with the old form code. E2E "AC8: a pasted tag list refused for two reasons…" runs at 360/768/1280 in vi, with `expectNoMidWordBreak` on the error and `expectSettledAccessible`. |
| AC9 | Gate PASS, 951 E2E passed. Step budgets: F2 6/6; F10, F11 and F12 3/3 at all three viewports. Bundle budget OK. No diff in `backend/` or `api/`. No new dependency. |

### Gate
- `ENGLMS_TASK=T-M2.20 ./scripts/gate.sh` passed: 13 steps, 912 s, on `2adcc1a`.
- Backend and contract-drift were skipped (web-only diff). The ×3 repeat ran `checks`, `shells` and `students` specs.
- Log: `evidence/T-M2.20/gate-20261023T030742Z.log` (trimmed to 296 lines). The full log is in `raw/`, which is git-ignored.
- The only failure line is the designed `test.fail` in `guards.spec.ts:100`.
- A separate full E2E run at the three viewports before the gate: 512 passed. The stricter helpers found no defects in the kept specs, so there is no L-10 OQ.
- CI is not checked yet.

### frontend-standards self-check
- [x] The packet's UI rules are met: no layout change; the joined error wraps at spaces only; the h3 summary is still the focus target.
- [x] `expectSettledAccessible` and `expectNoMidWordBreak` run on the changed screens at 360/768/1280.
- [x] `expectFocusNotLost`: n/a, no new action removes or disables the focused element.
- [x] Async state is read through polling assertions, and each new check was seen failing (AC6 caveat below).
- [x] vi verbs unchanged, heading levels never invert, counters unchanged.
- [x] The docs named in the packet are in sync: design-system §3, frontend-architecture §2, security.md T19.

### AC7: bare `expectNoAxeViolations` calls left (re-grepped; same as the packet's list)
- **No overlay opens before the call:** `navigation.spec.ts` :138, :220, :262, :455, :474; `polish.spec.ts` :348, :402; `smoke.spec.ts:58`; `shells.spec.ts:701`.
- **`auth.spec.ts:50`, inside its local `expectAccessible` helper:** most callers open no overlay; the "Forgot your password?" caller opens a `<details>` disclosure with no fade. The caller at ≈ line 504 comes after `openAccountSection`, which already waits for `[data-entering]` to go.
- **`smoke.spec.ts:91`:** after `revealSwitcher`, which waits for the fade.
- **The helpers' own failing proofs:** `guards.spec.ts:36` and `checks.spec.ts:166`.

### Screenshots (local, not committed)
`evidence/T-M2.20/impl/{phone-small,tablet,laptop}/`:
- `t-m2-20-notes-limit-vi.png` and `t-m2-20-notes-limit-en.png`: the learning-profile form with its h3 summary and the notes error.
- `t-m2-20-tag-two-reasons-vi.png`
- `t-m2-20-tag-two-reasons-summary-vi.png`

The gate also wrote the existing specs' impl shots there.

### Deviations
1. **AC6, "passes today" cannot be shown.** Playwright 1.64's Chromium (156) moves focus to `body` as soon as a focused control turns `visibility: hidden`. I probed both the control itself and its parent, at 0, 50 and 500 ms. So the old helper already fails the new fixture.
   - The `checkVisibility({ visibilityProperty: true })` change is in, and the fixture stays as the proof that the rule rejects. A comment in `checks.spec.ts` explains this.
   - With this engine I found no fixture where the new helper behaves differently from the old one.
2. **AC8 field error after Save.** `TagInput` still shows its own last-entry reasons in place of the form's message. In QA's flow both texts are identical, so the field and the summary match.
3. **Gate head.** The gate ran on `2adcc1a`. The head `831fe65` adds only the gate log and the E2E records, which are evidence files.

### Open questions
- **OQ-1 (AC6):** accept the deviation as is, or record a DEC? The other option is to drop the "passes on develop" clause, since Chromium already blurs on `visibility: hidden`.

### Cost
About 190k tokens cumulative (estimated from my context budget).

Not checked: CI on the PR, and the ×20 repeats (those are QA's).