# T-M2.17 summary: learning profile and `TagInput`

> Recorded by the LC from the frontend-implementer's returned text (lessons-learned L-07); its report is copied verbatim below the gate
> section. Packet `docs/tasks/T-M2.17-learning-profile.md` (DEC-140, DEC-141); PO start signal in chat on 2026-10-21.

## Gate (G1)
- `ENGLMS_TASK=T-M2.17 ./scripts/gate.sh` once on the product head `f72c5ae`: **PASS** (13 steps, 772 s; e2e 653 s, 492 passed, 3 skipped):
  `evidence/T-M2.17/gate-20261021T064115Z.log`. The pushed head `9e2f08c` adds only that log and the E2E records.
- Diff vs `develop` (LC check): no `backend/`, `api/`, PNG or `review/` path.

## LC rulings on the implementer's open questions
1. **OQ 1** (a first save with values answers `version` 1, not 0: the server inserts the empty row at 0 and then applies the values): the
   implementer is right; the packet's transitions row is corrected (LC, this branch). No code change.
2. **OQ 2** (a mounted page refetches once after a logout before it navigates; the signed-out server answers 401, so no data is kept):
   existing behaviour, accepted; the test mocks now answer 401 after sign-out as the server does.
3. **OQ 3** (the mutation cache keeps the last save's request body after sign-out): the T-M2.20 item (T-M2.15 SEC S-1), out of scope.

## Implementer report (verbatim)

**Head:** 9e2f08c (code at f72c5ae).

**AC → proof** (unit/component paths are under `web/src/`):

| AC | Proof |
|---|---|
| AC1 | `features/students/routes/StudentLearningProfile.test.tsx` › "Learning profile: the section (AC1)": order between Guardians and Account; rows, chips, notes; `https://…` and `<b>` shown as text; never-saved profile; loading; error + Try again → `h2`; 404. E2E `e2e/tests/students.spec.ts` › "Learning profile (T-M2.17)" › "AC1/AC3/AC8: never saved…", "AC1/AC2/AC8: 30 tags per list and 30 custom fields…", "the learning-profile error: Try again…" |
| AC2 | `ui/TagInput.test.tsx` (addTags table, Enter/comma/paste, refusals, the 31st tag, Enter never submits, exact remove names with no description, remove focus, keyboard, axe); `dev/DevUiPage.test.tsx` › "shows the T-M2.17 TagInput…"; E2E removes buttons scoped by field group (both lists hold the same tags) |
| AC3 | Component › "Learning profile: edit and save (AC3)": open + focus, `version` null and a number, trimmed body, committed tag text, unchanged Save, double click sends one request, 500 and network failure; E2E AC1/AC3 (F12) and AC3/AC4 tests |
| AC4 | `features/students/model/learningProfileSchema.test.ts`, `serverErrors.test.ts` › "mapLearningProfileErrors"; component › "validation and 422 (AC4)", including `customFields[1].label` mapped to form row 3 after the empty row was dropped |
| AC5 | Component › "every transition of the PUT (AC5, Domain rules)" (table-driven over every row) and › "conflict (AC5)"; E2E › "AC5: two pages…", covering both stale cases |
| AC6 | Component › "one form at a time and the guard (AC6)": every lock, all three hints, status/reset don't lock, uncommitted tag text counts as dirty, nav/home link, own logout, cross-tab sign-out, forced `/change-password`; E2E › "AC6: one form at a time…" |
| AC7 | `features/students/routes/StudentWriteSession.test.tsx` › "learning profile save, answered after …" (held promise, both cases); component logout and cross-tab tests assert no `['students','learningProfile',*]` data afterwards |
| AC8 | `expectSettledAccessible` on empty / 30+30 / errors / conflict / discard at 360, 768 and 1280, in vi and en (› "English UI (T-M2.17 AC8)"); `longData` extended and walked in vi and en; `expectFocusNotLost` after each focus-list control; keyboard test; F12 step log |
| AC9 | Gate PASS; changed spec ×3 green; F2, F10 and F11 kept tests green; budget green; OpenAPI unchanged |

**Numbers**
- Unit: 66 files, 794 tests passed.
- E2E: 492 passed (3 skipped) on the full run, and 492 passed on the ×3 repeat of `students.spec.ts`.
- Bundle: student 187.5 KB gz of 200, tutor 187.6 KB gz of 300.
- `check-docs.sh` PASS; `check-path-ownership.sh` PASS.

**frontend-standards self-check**
- [x] UI rules met: read view uses the `DescriptionList` columns, heading row checked by E2E, `.form` and `.stackedActions`, chips wrap whole, focus targets, layering, validation.
- [x] Long data at 360/768/1280: `expectSettledAccessible`, and `expectNoMidWordBreak` per chip, `dt`, list-free `dd`, label and legend.
- [x] `expectFocusNotLost` after every removing or disabling action.
- [x] Polling assertions only; new checks seen failing (I removed the session check, the Enter `preventDefault` and the remove-focus rule in turn; each made its tests fail).
- [x] vi buttons carry the verb; heading levels in order; counters use the existing `TextArea`.
- [x] Docs in sync: information-architecture §2, interaction-states §2.8, ux-flows F12, design-system §3 (`TagInput`/`TagList`), security.md T2, glossary.

**Screenshots** (local, git-ignored): `/home/kali/App_projects/eng-lms/evidence/T-M2.17/impl/{phone-small,tablet,laptop}/`: `learning-profile-{empty,filled,errors,discard,conflict}-{vi,en}.png`, `learning-profile-form-vi.png`, `learning-profile-form-30-vi.png`, and `long-{list,profile,edit-profile,guardian-form,learning-profile-form,add-student}-{vi,en}.png`. The `/dev/ui` `TagInput` entry has no screenshot: those E2E checks need the dev server.

**F12 step log:** 3 steps at 360, 768 and 1280: Edit learning profile → type a weakness and press Enter → Save. Records are in `evidence/T-M2.17/records/<project>/steps-f12.json`, with the keyboard log in `keyboard-learning-profile.json`.

**Deviations**
1. `TagInput` has two props the packet's list doesn't name: `inputValue` and `onInputChange`. They let Save commit the text left in the input and count it as a change.
2. The entry rules live in a separate pure function, `addTags` in `ui/tagEntry.ts`, which the form also uses on Save.
3. The field group is a `fieldset` named by its label; the linter rejects `role="group"` on a `div`.
4. The custom-field Label reads "Nhãn (bắt buộc)" ("Label (required)"), even though a row with both fields empty is simply dropped.
5. A 422 tag error reads "“tag”: message".
6. I added only the docs; the backlog note is left for you.

**Open questions (none block the work)**
1. The real server answers `version` 1, not 0, to a first save that has values (it creates an empty row, then applies them). The packet's Domain-rules table says "created (version 0)". The client doesn't depend on it; the MSW mock now matches the server, and the one E2E check accepts any version number. The table could be corrected.
2. In the logout tests, the still-mounted page refetches once after the cache is cleared and before it navigates away. With a signed-out server that request gets 401, so no data is kept; the tests now make the mock server answer 401 after sign-out, as the real one does. Existing behaviour, not a new defect.
3. The mutation cache still holds the last save's request body after sign-out. This is the T-M2.20 item, out of scope here.

**subagent_tokens:** unknown.

I didn't look at the screenshots in the browser pane; I only spot-checked two 360 px images.

## G3 cost (DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| G1 | frontend-implementer | f72c5ae | gate PASS | — | full | 360,688 | 42.3 | 1 | 12.9 |

Agent tokens and minutes are the Agent result's `subagent_tokens` and `duration_ms`.
