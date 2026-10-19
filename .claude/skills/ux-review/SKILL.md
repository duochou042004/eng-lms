---
name: ux-review
description: Review an Eng-LMS UI change (PR or branch) against the design system, responsive rules, interaction states, accessibility and critical-flow step budgets, and return the findings with a verdict (the LC records evidence/<task>/review/ux.md). Use at G3 for UI PRs.
---

# UX review

1. Get the packet ACs and affected flows. Run the app (or the e2e build) and open each changed screen at **360×740, 768×1024 and 1280×800**.
2. Walk the checklist and capture a screenshot for each finding (local only, git-ignored; describe it in the finding). Usually this checklist runs inside the
   combined QA+UX pass (qa-protocol §2a, DEC-131); a re-check is a delta re-check (§2b).

## Checklist
- [ ] **Hierarchy:** one h1, one primary action, a scannable top-down order; the page answers its daily question (product-brief §2).
- [ ] **System:** only `ui/` components and tokens; status from statusMap; no anti-patterns (design-system §6).
- [ ] **States:** loading skeleton, both empty states, error + retry, offline (autosave areas), populated; no layout shift.
- [ ] **Forms:** labels, required markers, inline and summary errors, focus handling, unsaved guard, smart defaults visible.
- [ ] **Responsive:** no horizontal scroll; lists replace tables when narrow; sheets on mobile; the sticky footer doesn't cover inputs; long vi names wrap.
- [ ] **A11y:** keyboard-only completion; focus visible and returned; names for icon buttons; axe 0 serious/critical; colour independence; 44 px targets.
- [ ] **Copy:** specific and actionable; vi reads natively; en correct; no generic "Something went wrong".
- [ ] **Budgets:** the step counts of the affected flows are within ux-flows.md.

## Output
Return a findings table (ID · Sev S1–S4 · screen/viewport · issue · what the screenshot shows · suggested fix) with
`UX-REVIEW <task-id>: APPROVED | CHANGES REQUESTED` as the first line; the LC records it in `evidence/<task>/review/ux.md` and posts the line. S1/S2 findings mean CHANGES REQUESTED.
