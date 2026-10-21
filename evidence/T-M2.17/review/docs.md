# Docs review — T-M2.17 packet (G0)

> Recorded by the LC from the reviewer's returned text (DEC-131). Cost: round 1 full 132,067 tokens / 7.2 min; round 2 delta 12,410 / 0.4 (cumulative 144,477). N-1 (S4) fixed in the packet (E2E scopes remove-button locators by the field group); N-2 (S4, line widths) left as is.

## Round 1 (full)

DOCS-REVIEW T-M2.17: CHANGES REQUESTED

`./scripts/check-docs.sh` passed (312 markdown files, progress.json valid, sources intact, prompt within limit). I compared the diff against origin/develop: the packet, DEC-140, the backlog row and progress.json. The trace is complete and correct (SPEC §8, FR-STU-04, A-008, the validation-rules rows, the api-catalog row, and every DEC, NFR and ux-flows ID exists). Out of scope, the guardrail answers, the evidence list, the risk tier, the Domain rules block and the 9 ACs are all there. No curriculum or exam semantics are hard-coded. The "Target · 650" and "B1" hints are generic examples, and FR-STU-04 itself uses B1. The contradiction scan's claims (a) to (g) hold against the code. The findings below are what it missed or got wrong.

**D-1 (S2): the claim "the only changed kept assertion" is false.** Location: packet Design notes, contradiction scan (a), lines 110–113; decision-log.md:148, DEC-140 (1).
- Playwright matches `getByRole(..., { name })` as a case-insensitive substring unless `exact: true`. The new vi button "Sửa hồ sơ học tập" therefore also matches every non-exact `getByRole('button', { name: 'Sửa hồ sơ' })`. Playwright stops with a strict-mode error because two buttons match.
- Affected lines in `/home/kali/App_projects/eng-lms/e2e/tests/students.spec.ts`: 856, 959, 991, 994, 997, 1043, 1053, 1395, 1714, 1903, 1911, and the vi run of the long-data walk at 2504 (`name: copy.editProfile`).
- **Fix:** amend scan (a) and DEC-140 (1) to say these locators gain `exact: true`. This tightens the locators without changing what they assert. List the lines in the packet. Alternatively, pick a vi label that does not start with "Sửa hồ sơ", but the glossary fixes "Hồ sơ học tập", so `exact: true` is the realistic option.
- Unit tests are not affected: Testing Library matches name strings exactly.

**D-2 (S3): the vi copy breaks the house spelling.** Location: UI rules, Copy (line 150); scope 8 (line 83).
- The packet writes "Hủy", "Xóa mục {n}", "Xóa {tag}" and "Mục tùy chỉnh".
- `web/src/lib/i18n/locales/vi/students.json` consistently uses "Huỷ" and "Xoá" (e.g. "Xoá liên hệ {{number}}", "Xoá phụ huynh"), and the E2E specs assert "Huỷ".
- **Fix:** use Huỷ, "Xoá mục {n}", "Xoá {tag}" and "Mục tuỳ chỉnh", and reuse the existing Cancel key.

**D-3 (S3): the TagGroup naming and description claims don't work as written.** Location: scope 2 (lines 35–37); AC2.
- In react-aria 3.52.1, `useTag` gives the remove button `aria-labelledby = "${buttonId} ${rowId}"`. An `IconButton` labelled "Remove {tag}" in the `slot="remove"` position would therefore be announced as "Remove {tag} {tag}".
- `useTag` also puts `aria-describedby` "Press Delete or Backspace to remove" on the chip in keyboard mode. That string comes from React Aria's built-in strings, which cover 34 locales and not vi-VN, so vi users hear English. It can't be overridden through Tag props, because it is merged last.
- **Fix:** state the naming approach (label "Remove"/"Xoá" combined with the tag through the labelledby, or override `aria-labelledby` to the button alone). Then decide the description: either implement Delete/Backspace without `onRemove`'s built-in description, or accept the English fallback by a DEC. Add a unit test that checks the exact accessible name and description in vi.

**D-4 (S3): AC7's "no query is left after any sign-out path" can't be met on one path.** Location: AC7 (line 210); scope 7.
- `dropAllButSession` (`/home/kali/App_projects/eng-lms/web/src/app/guards.ts:103-106`) calls `resetQueries` on mounted queries and only removes inactive ones. On the cross-tab role-change path, the `['students','learningProfile',sid]` entry stays, without data.
- Meeting the AC literally would mean changing auth code, which is out of scope.
- **Fix:** reword to "no such query holds data". `useLogout` and a 401 clear the cache; `dropAllButSession` resets it.

**D-5 (S3): one focus target is missing.** Location: UI rules, Focus targets (lines 139–144); scope 3 and 4.
- An unchanged Save "closes the form without a request", which unmounts Save, but no focus target is given for it.
- The packet also never says that **Edit learning profile** is hidden while its form is open, even though it is the target after the form closes.
- **Fix:** add "unchanged Save → **Edit learning profile**, no toast", and state that the trigger is hidden while the form is open (as Edit profile is).

**D-6 (S3): the form layout rule is ambiguous and names the wrong class.** Location: UI rules, Columns (lines 131–133).
- "Every field full width of the column" conflicts with every existing form, which uses `.form` capped at `--size-reading-max` (`/home/kali/App_projects/eng-lms/web/src/features/students/components/Students.module.css:64-70`). The packet does not say whether the cap applies.
- "Save/Cancel as T-M2.14 `.actions`" is wrong: `.actions` never stacks. The stacking behaviour described is `.stackedActions` (line 135ff).
- **Fix:** state whether the form uses `.form` (capped) or is uncapped, and name `.stackedActions`.

**D-7 (S3): the mid-word-break check has no stated target and gives false failures on lists.** Location: UI rules, Break rules (lines 134–135); AC8.
- `expectNoMidWordBreak` (`/home/kali/App_projects/eng-lms/e2e/support/checks.ts:39-66`) joins adjacent text nodes with no separator. Run on a chip list, a whole `dd` or the section, it reads "TagATagB" as one word that spans two chips, and the check fails.
- **Fix:** say it is called once per chip and once per `dd` (and per label or legend), never on the list or the section.

**D-8 (S4): one transitions row is imprecise.** Location: Domain rules, transitions row "exists | n" (line 165).
- `LearningProfile.apply` (`LearningProfile.java:60-61`) keeps `version` when the values equal the stored ones.
- **Fix:** write "200 (`version` n + 1; n when unchanged)".

**D-9 (S4): the field validation rules leave out two existing rules.** Location: UI rules, Validation per field (lines 147–149); scope 2.
- Lengths count code points (validation-rules header), and free text refuses C0 control characters other than tab, LF and CR (`createSchema.ts` `length` and `noControl`). Neither is stated.
- **Fix:** add both. `TagInput` in `ui/` counts `[...s].length`. Reuse the existing `form.errors.TOO_LONG` text ("Use at most {{max}} characters.") instead of a new "At most…" string.

**D-10 (S4): the packet's lists of docs and files are incomplete.** Location: Docs to update; Design notes, Files.
- The glossary lacks the new vi terms (Trình độ hiện tại, Điểm mạnh, Điểm yếu, Ghi chú học tập, Mục tuỳ chỉnh).
- `web/src/test/students.ts` `workspaceApi` will need GET and PUT learning-profile handlers.

**Checked, no conflict:** the hint assertions are all scoped to their region; the "Chưa có"/"Not added" assertions are scoped; `main a[href]` gains no links; the not-a-uuid no-request check still holds; ConflictDialog's `copy.label` prop exists; the `OpenForm`, lock and hint rules match the code; the backend transitions and 422 paths match `LearningProfileService` and `StudentFields`; the SECRET-* harness covers the profile fields.

I did not check the React Aria behaviour at runtime: D-3 comes from reading the installed source, not from running it. I also did not check the English E2E specs outside `students.spec.ts` for substring collisions.

DOCS-REVIEW T-M2.17: CHANGES REQUESTED

## Round 2 (delta)

DOCS-REVIEW T-M2.17 (delta re-check, round 2): PASS

All ten round-1 findings are closed by commit 6fcde1d, and the changed lines bring in no new S1–S3 problem. `./scripts/check-docs.sh` still passes (313 markdown files).

**Round-1 findings:**
- **D-1 closed.** Contradiction scan (a) and DEC-140 (1) now list every non-exact `'Sửa hồ sơ'` locator, including the long-data walk at 2504. Each gains `exact: true`. The sentence "only changed kept assertions" is now true.
- **D-2 closed.** The copy uses "Huỷ" (the existing key), "Xoá mục {n}", "Xoá {tag}" and "Mục tuỳ chỉnh". No "Hủy", "Xóa" or "tùy" is left in the packet.
- **D-3 closed.** `TagInput` is now a plain `ul` of chips, each with one "Remove {tag}" `IconButton` in the tab order. There is no Delete/Backspace and no `TagGroup`. DEC-140 (4), the shortcut ledger, AC2 (exact accessible name, no English description in vi) and the Risks entry (up to 60 tab stops, accepted) all agree. The packet now mentions TagGroup and Delete/Backspace only to say they are not used.
- **D-4 closed.** Scope 7 and AC7 now say "holds data" and describe what `dropAllButSession` actually does.
- **D-5 closed.** The unchanged Save now moves focus to **Edit learning profile** with no toast, in the UI rules and in AC3. **Edit learning profile** is hidden while its form is open.
- **D-6 closed.** The form uses `.form` (capped at the reading width) and Save/Cancel use `.stackedActions`.
- **D-7 closed.** The packet says to call the mid-word-break check once per chip, per `dd`, and per label, legend and term, never on a whole list or section.
- **D-8 closed.** The transitions row now says the version stays n when the values are unchanged.
- **D-9 closed.** Lengths count code points (`[...s].length`), the existing `length` and `noControl` helpers are reused, and the existing `form.errors.TOO_LONG` text replaces the new "At most…" string.
- **D-10 closed.** The glossary terms are in Docs to update, and the `workspaceApi` handlers are in Design notes.

**New findings:**
- **N-1 (S4).** Location: scope 2 and AC2.
  - Tags only have to be unique within one list, so the same tag can be in both Strengths and Weaknesses. Then two buttons share the name "Remove Reading" on one form.
  - E2E locators then need scoping to the right field, and screen-reader users can't tell the two buttons apart from the name alone.
  - **Fix (optional):** say the tests scope by the field's group or label. Or include the list label in the name ("Remove Reading from Strengths"). This doesn't block G0.
- **N-2 (S4).** Some edited lines run past the packet's usual width (lines 38, 89, 147, 154 and 207, up to 206 characters). This is cosmetic: check-docs passes.

I re-read only the diff and grepped the packet for leftovers; I did not do a full re-review. Cumulative subagent_tokens: about 142,500 for both rounds. That is an estimate from my remaining context budget, not a measured count.

DOCS-REVIEW T-M2.17: PASS
