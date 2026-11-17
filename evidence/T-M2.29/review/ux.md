# T-M2.29 UX review (combined QA+UX qa-evaluator, G3)

Reviewer: one fresh combined QA+UX `qa-evaluator` (tier M) on PR #190 head `4ae60ff` (code `5284bc4`). Recorded by the LC from the reviewer's
text (reviewers return text only); the full report with the QA part is `evidence/T-M2.29/qa/report.md` (PR #191).

## Checklist
- `ui/` components and tokens only: the new wrapper is a plain `<div>` around `ui/InlineAlert`; the (h1) rule is token-free.
- Layering and copy unchanged; vi and en correct, no English leaking into vi.
- Focus never moves and is never lost (stays on Log out after a failed logout; `/login`'s route focus after a successful one).
- No horizontal scroll at any measured size (360, 768, 1280, 740×360, 568×320); axe clean in every changed state; no mid-word breaks.
- Page scroll unchanged when the alert appears in the popover, drawer and More sheet (opened by keyboard).

## Findings
| ID | Sev | Where | Finding | Ruling |
|---|---|---|---|---|
| UX-1 | S4 | Tutor drawer, 568×320, vi and en | The alert's `nearest` scroll aligns its bottom edge, so the top of the focused Log out button and its ring are clipped at the footer's scroll edge (90.4% visible; WCAG 2.4.11 still met; 740×360 100%). `LogoutFailedAlert.tsx:19` | T-M2.31 (b) (DEC-178) |
| QA-1 | S3 | Student account popover, 800×360 | Older than T-M2.29: `ui/Popover` has no `overflow-y`, so a failed logout's alert runs past the scroll-locked viewport (65% / 45% visible) | T-M2.31 (a) (DEC-178) |

The implementer's drawer-at-568×320 page-movement observation is a Playwright artefact (`locator.click()` scrolls the off-screen opener into
view); a real mouse click or the keyboard keep the page position. No severity.

UX-REVIEW T-M2.29: PASS WITH MINOR
