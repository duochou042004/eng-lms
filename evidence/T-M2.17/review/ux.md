# UX review — T-M2.17 (combined QA+UX pass)

> Recorded by the LC from the reviewer's returned text (DEC-131). Full text: `evidence/T-M2.17/qa/report.md` (on `qa/T-M2.17`, PR #124).

UX-REVIEW T-M2.17: APPROVED (round 1 CHANGES REQUESTED on `978f201`: UX-1 = QA-1 (S2) the first pointer or touch press on Save lost after a blur error; AC10 fix `830d778`, DEC-142; delta re-check APPROVED on `646e670`)

## UX rulings (round 1)

- **Hierarchy and system:** The section is placed correctly. The heading row follows the house pattern: the button sits under the `h2` at 360 and at the row's end from 768. The column layout and chips match the other sections.
- **States:** Loading, error with retry, empty, filled, 404 and 500 all look right. Offline does not apply (no autosave).
- **Forms:** The ErrorSummary, the mapping and the discard guard are good, but QA-1 breaks the main action for pointer and touch users. CHANGES REQUESTED.
- **Copy:** vi reads natively ("Huỷ", "Xoá", "Hồ sơ học tập"), en is correct, and there is no generic error text. One wording note: the summary items "Tối đa 40 ký tự." do not name their field; this is the house pattern, not a finding.
- **Responsive and a11y:** See AC8. Screen-reader names match the packet.
- **Budgets:** F12 takes 3 steps.
- **Scope:** Nothing untraced.


## Delta re-check (round 2)

QA-VERDICT T-M2.17: PASS WITH MINOR
UX-REVIEW T-M2.17: APPROVED

The S2 is fixed: Save now works on the first click or tap at every viewport I tried. The only open finding is QA-2 (S4), which the LC moved to T-M2.20. This was a delta re-check (qa-protocol §2b) on 646e670, the fix being 830d778. The checkout was already at 646e670 (`git log -1`); I did not pull.

## Round-1 findings

| ID | Sev | Status | Proof |
|---|---|---|---|
| QA-1 / UX-1 | S2 | **Closed** | I ran the three repros at 360, 768 and 1280, in vi and en, with mouse and touch (36 runs): (A) a row with Value "650", Label typed then cleared, Save pressed with focus still in the Label; (B) 30 fields with field 2's Label cleared, then Save; (C) fix the label after the failed submit, then the first press on Save. In every run the first press showed the ErrorSummary and focused it, with 0 PUTs. After the fix, the first press sent exactly 1 PUT and focus moved to Edit learning profile. |
| QA-3 | S4 | **Closed** | After a failed submit, the inline "Hãy nhập nhãn." / "Enter a label." error clears while typing, in all 36 runs. No checks run on blur any more: a cleared Label and a 45-character level, each left with Tab, show 0 `aria-invalid` fields until Save. |
| QA-2 | S4 | Open, moved to T-M2.20 by the LC (DEC-142) | Not re-checked, as instructed. |

