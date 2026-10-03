# UX review record: T-M1.16 (PR #43)

> Recorded by the LC from the ux-reviewer's returned report (the harness blocks subagents from writing files). Reviewed and merged head `fb73e87` (CI 7/7); merged as
> `1dbd7e3` via merge-gate. S4 disposition: UX-1 accepted, no change (DEC-085). Scratch probes were the reviewer's session scratchpad (not kept).

# UX review: T-M1.16 review polish (PR #43, head `fb73e87`)

No S1–S3 issues; one S4 note that does not block. Repo unchanged by the reviewer.

## What was checked
- Inputs: the packet, `summary.md`, `fe-notes.md`, the T-M1.13 UX record, `git diff origin/develop...HEAD -- web e2e`; the committed screenshots (phone-small, tablet, laptop:
  landing and shell loading states, loaded pages, `/dev/ui`).
- Live: the dev server on :5173 with Playwright probes holding the lazy route module (`Landing.tsx` / `TutorShell.tsx`) to keep the loading state; 360×740, 768×1024,
  1280×800, vi and en, `/` and `/tutor`.

## Live results (12 cases)

| Check | Result |
|---|---|
| Skeleton vs real switcher (x, width) | Identical in every case: 360 landing 106/238, 360 tutor 16/238 (header wraps, both at the start), 768 at 514/238, 1280 landing 962/238, 1280 tutor 1026/238. Inline-end Δ 0; same in vi and en. |
| Block size | Skeleton 44 px; real switcher 46 px (out of scope per the packet). Same top edge, nothing above moves. |
| Hidden sizer | 0 px tall, `visibility: hidden`, `aria-hidden`; nothing focusable; Tab while loading leaves focus on `body`; the ARIA snapshot is only the loading `status`. |
| Horizontal scroll | None while loading or after load, at all three viewports. |
| `/dev/ui` example vi → en → vi (pointer, then ArrowLeft + Space) | Segments [offset, width, height] stay [1,131,44] and [132,105,44] at all viewports (Δ 0); no `[data-visible]` elements. |
| Records | Every `ac2-switcher-widths-*.json` names each segment once. |

## Checklist
- Tokens: the sizer uses only `--space-3`, `--size-icon`, `--space-1`, `--border-width`, `--font-weight-semibold`; the block `--size-control-md`; `13rem` is gone; other skeleton shapes unchanged.
- Layout match: the sizer's padding (start = space-3 + icon + gap, end = space-3) and borders lay out like the real segment; 238 = 238 live.
- States: the loading region's label and `aria-busy` unchanged; `SegmentedControl` states untouched apart from removing `data-visible`; selection not by colour alone.
- `/dev/ui`: dev-only, minimal `.fit` flex row, no `ui/` change.
- Docblock: the "Querying" note is accurate; `polish.spec.ts` reads accessible names from the ARIA snapshot.
- Visual regressions: loaded landing, tutor, student, 404 and error pages look as in T-M1.13.
- Step budgets unchanged (switch language 1/1; reach main 1/0/0). No new copy.

## Findings

| ID | Sev | Where | Issue | Suggested fix |
|---|---|---|---|---|
| UX-1 | S4 | `web/src/app/routes/Page.module.css` `.switcherSizer` vs `web/src/ui/SegmentedControl.module.css` | The sizer copies the segment's internal layout into app-route CSS; a later padding/gap change in `SegmentedControl` would drift it silently, guarded only by the E2E Δ ≤ 8 px check in `loading.spec.ts`. Acceptable for this task. | Optional: a one-line "mirrored by `.switcherSizer`" comment in `SegmentedControl.module.css`, or a `ui/` skeleton variant when M2 adds more skeletons. |

T-M1.13 items: UX-2, UX-3, UX-4 closed; UX-1 (T-M1.13) stays accepted.

UX-REVIEW T-M1.16: APPROVED
