# T-M2.13 UX record
UX-REVIEW T-M2.13: APPROVED

Combined QA+UX pass (qa-protocol §2a) on 7d843d4, the same app session as the QA run, at 360×740, 768×1024 and 1280×800, vi and en. Recorded by the LC from the reviewer's returned text.

| ID | Sev | Screen / viewport | Issue | Suggested fix | LC ruling |
|---|---|---|---|---|---|
| UX-1 | S3 | Tutor drawer, 740×360 sideways phone | The logout alert overflows the footer, which cannot scroll; its text cannot be reached (`ui/Sheet.module.css:89-92`) | `ui/Sheet` footer max height with `overflow-y: auto`, or a scrolling dialog | To T-M2.28 (h): touches the shared `ui/Sheet`, which this packet keeps untouched; the three mandatory viewports pass; the alert is announced in full |
| UX-2 | S4 | Forced change-password, 360×740 | The alert renders below the fold | `scrollIntoView({ block: 'nearest' })` on mount, without moving focus | To T-M2.28 (h) |
| QA-1 | S4 (older than this branch) | Toggletip and account popover, vi | React Aria's hidden close buttons are named "Dismiss" | React Aria vi strings | Open question OQ T-M2.13-1 |

Checklist: hierarchy pass (one h1; notice between header and form; chunk pages no longer repeat the h1); system pass (only `ui/` parts, no error toast, popover 286 px within the gutters); states pass (pending, failure, success; offline copy; no layout shift on the meta error); forms n/a; responsive pass at the three mandatory sizes (UX-1 at short heights only); a11y pass (keyboard and touch, focus visible and returned, named icon buttons, axe clean, ≥ 44 px); copy pass (vi "Xem lỗi", "Chưa đăng xuất được", "Bạn vẫn đang đăng nhập. Hãy thử lại.", "Bạn đã đăng xuất ở một thẻ khác."); budgets pass (Log out ≤ 2 steps).

Screenshots: local and git-ignored (DEC-131), not committed.
