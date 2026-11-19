# T-M2.31 UX review (combined QA+UX qa-evaluator, G3)

Reviewer: one fresh combined QA+UX `qa-evaluator` (tier M): round 1 on PR #199 head `2bf2c32`, delta re-check on the final head `02d3503`.
Recorded by the LC from the reviewer's text (reviewers return text only); the full report with the QA part is `evidence/T-M2.31/qa/report.md` (PR #200).

**Verdicts:** round 1 `UX-REVIEW T-M2.31: APPROVED` (with `QA-VERDICT T-M2.31: PASS WITH MINOR`); delta `UX-REVIEW T-M2.31: APPROVED` (with `QA-VERDICT T-M2.31: PASS`).

## Checklist (round 1, re-checked in the delta where the code changed)
- `ui/` components and tokens only: the popover rule and `.logoutAlert`'s margin use tokens (`--focus-ring-width`, `--focus-ring-offset`, `--space-4`, `--size-control-md`).
- Copy and layering unchanged; vi and en correct; the alert re-renders in the other language on a language switch.
- Focus never moves after a failed logout (stays on Log out); Esc returns focus to the opener; keyboard-only completes the flow at 800×360 (9 keys to the logout attempt), focus contained in the popover.
- No horizontal scroll at any measured size (360, 768, 1280, 800×360, 844×390, 915×412, 568×320, 740×360); axe 0 violations in 14 states, vi and en; no mid-word breaks.
- The popover scrolls by wheel, keyboard (ArrowUp, End) and touch; the page behind stays scroll-locked; content width is the same before and after the alert (286 px mobile, 271 px classic scrollbars).
- Never the error page after a failed logout: Esc, Log out again, language switch, navigation, fail-then-succeed.

## Findings
| ID | Sev | Finding | Ruling |
|---|---|---|---|
| UX-1 | S4 | With classic scrollbars the always-reserved 15 px gutter leaves a wider right inset (16 px left vs ~31 px right) in the 1280×800 popover | The packet's `scrollbar-gutter: stable` rule (AC4); accepted, no change (DEC-183); `stable both-edges` only if the PO wants it (T-M2.32 (d)) |
| (QA-1, QA-2) | S3, S4 | The offline alert in the drawer at 568×320; the sub-pixel ring | QA findings, fixed in fix round 1 (AC2o, DEC-183); the 740×360 offline residual (1–2 px of the ring area) is T-M2.32 (c) |

Delta observation (not a finding): at 568×320 offline the top of the focused Log out button and its label are visibly clipped because the alert text wins; accepted by AC2o and DEC-183 (WCAG 2.4.11 met: the control is only partly hidden).
