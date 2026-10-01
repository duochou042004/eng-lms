# UX review record: T-M1.13 (PR #25)

> Recorded by the LC from the fresh ux-reviewer's returned report (the harness blocks subagents from writing files). Reviewed head `3ff781c`; merged as `625c8fc` at head
> `5c169fb` (adds only develop's T-M1.15 merge and `progress.json`; verdicts re-posted). The LC's prompt asked for a PASS/FAIL line by mistake; the reviewer restated its
> verdict in the canonical token as **`UX-REVIEW T-M1.13: APPROVED`** for the same head (DEC-078). S4 dispositions: DEC-079. Scratch paths are the reviewer's session
> scratchpad (not kept).

# UX review: T-M1.13 web polish (PR #25, head `3ff781c`)

Reviewer: ux-reviewer (G3, independent, fresh context). I did not edit the repo. Scratch files are in `/tmp/claude-1000/-home-kali-App-sources-Eng-LMS/1df9a53f-30b6-4dda-9b00-44ad1b966024/scratchpad/ux/`.

**What I checked:**
- **Inputs:** the packet, `evidence/T-M1.13/summary.md`, the diff `git diff develop...HEAD -- web/ docs/` and design-system §3 and §6.
- **Committed screenshots** in `evidence/T-M1.13/screenshots/{phone-small,tablet,laptop}/` (ac2, ac3 and ac4, in vi and en).
- **Live checks:** a Vite dev server on port 5174 (since stopped) and a scratch Playwright probe (`probe.mjs`) at 360×740, 768×1024 and 1280×800. The probe covered Chromium's accessibility tree, segment boxes before and after a keyboard selection, how far the label sits from the segment centre, innerText, horizontal scroll, the error page reached through an aborted lazy chunk, and Tab focus.
- **Live screenshots (scratch):** `phone-focus-en-unselected.png`, `phone-error-link-focus.png`, `{phone,tablet,laptop}-switcher-en.png` and `{phone,tablet,laptop}-error-en.png`.

## Live results
| Check | 360 | 768 | 1280 |
|---|---|---|---|
| Switcher boxes [x, w, h], vi selected → en selected (keyboard Space) | [107,131,44] [238,105,44] → identical | [515,131,44] [646,105,44] → identical | [963,131,44] [1094,105,44] → identical |
| Accessible names (Chromium aria snapshot) | `radio "Tiếng Việt" [checked]`, `radio "English"`, not doubled | same | same |
| `innerText` of the group | "Tiếng Việt\nEnglish", not doubled | same | same |
| Horizontal scroll (`/`, `/dev/ui`) | none | none | none |
| Focus ring on a segment | 2 px solid `--color-focus`, drawn inside the segment, visible on the unselected segment | same | same |
| Error page: focus on arrival | `h1` | `h1` | `h1` |
| Error page: reload button / start-page link height | 44 / 44 px; link 177 px wide (en) | 44 / 44 | 44 / 44 |
| Error page: Tab ×2 reaches the link, focus ring visible | yes | yes | yes |

The committed records agree with these numbers: `records/phone-small/ac2-switcher-widths-landing.json`, and `ac4-error-page-vi.json` with the link at 117×44 and both budgets at 1 step.

## Checklist
- **Hierarchy:** the error page has one `h1`, the reload button (secondary) and a quiet text link. That ordering is right for an error state: no competing primary action, and the way back is visibly lower-weight. The landing page is unchanged.
- **Design system:**
  - Spacing and sizes use tokens only (`--space-3`, `--space-2`, `--size-control-md`, `--font-weight-semibold`).
  - The only inline style is `visibility: hidden` on the `Check` icon, which follows the `DelayedSkeleton` precedent.
  - `.actions` is a flex row that wraps.
  - I found no §6 anti-patterns.
- **States:**
  - Switcher: selected, focus-visible and disabled all render in `/dev/ui`. The disabled example keeps its check plus a muted look.
  - Landing loading: the toolbar row appears only on `/`, the shell and 404 skeletons are unchanged, and the recorded heading delta is 2 px with CLS ≤ 0.0011.
  - Error page: with and without a request ID, and the link is absent on `/`.
- **Colour independence:** the selected segment still shows the check icon, semibold weight and the accent-subtle background (screenshot `phone-small/ac2-devui-segmented-vi.png`).
- **Targets:**
  - Every segment is 44 px tall and at least 105 px wide.
  - The error link is 44 px tall.
  - At 360 px the reload button and the link sit 12 px apart (`--space-3`) and do not overlap.
- **Keyboard:**
  - The toolbar model matches the new design-system §3 note: one Tab stop, the arrows only move focus, and Space selects.
  - On the error page, focus lands on the `h1`, then Tab reaches reload, then Tab reaches the link.
  - Following the link lands on `/` with focus on its `h1` (unit test and E2E).
- **Copy:** "Về trang đầu" / "Go to the start page" reuse `notFound.home`. Both read naturally, and vi wraps cleanly at 360 px.
- **Step budgets:**
  - Language switch: 1 step.
  - Reach main content: 0 on the error page.
  - Error page to the start page: 1 step, by pointer and by keyboard.
  - All are within ux-flows / packet budgets.
- **Docs:** the design-system §3 keyboard note is accurate, explains why, and names `RadioGroup` as the alternative. The "Stable widths" paragraph matches the code.

## Findings
| ID | Sev | Screen / viewport / lang | Issue | Evidence | Suggested fix |
|---|---|---|---|---|---|
| UX-1 | S4 | Switcher and `/dev/ui` segmented control, all viewports, vi + en | (Open question 1) Every segment's label sits 12–13 px right of the segment centre, because the hidden icon slot (20 px + 4 px gap) is always laid out. The offset is the same whether a segment is selected or not, so the label never moves when the selection changes. It reads like a "checkmark column" (as in a menu), not like an error. The cost is a slightly lopsided unselected segment, most visible on wide segments such as `English` at 360. It breaks no standard: AC2's stable boundaries hold. | `phone-small/ac2-devui-segmented-vi.png`, `ac2-switcher-landing-en.png`; probe offsets [12, 13] at all three viewports | **Acceptable; ship as is.** Two alternatives each break something else: reserving the slot on both sides adds ~24 px per segment and would make the 3-option control wrap at 360; centring the unselected label makes it jump 12 px when selected. If a later visual pass still wants a change, try `padding-inline-end` trimmed by half the slot, and only together with the 360 px overflow guard. No action in this task. |
| UX-2 | S4 | SegmentedControl, DOM text / tests | (Open question 2) Each label's text is in the DOM twice. Users do not see or hear the copy twice: the Chromium accessible name is exact, `innerText` and copy-paste skip `visibility: hidden` text, and find-in-page skips it in Chromium. Tests are the risk. `getByText('English')` would throw "multiple elements", and `textContent` is already doubled in the committed records (`"name": "Tiếng ViệtTiếng Việt"` in `records/*/ac2-switcher-widths-*.json`). | `records/phone-small/ac2-switcher-widths-landing.json` | **Acceptable.** Queries should use `getByRole('radio', { name })`, which tests already do. Follow-up, not blocking: record `name` from the accessible name in `polish.spec.ts` (e.g. `getAttribute('aria-label')` / `ariaSnapshot`, not `textContent`) so evidence files don't show doubled labels. Also add a one-line note in the component docblock: "query segments by role; the text appears twice". |
| UX-3 | S4 | Landing loading skeleton, all viewports | The toolbar skeleton is `13rem` (208 px) wide, but the real switcher is now 236 px (131 + 105) because of the reserved slot and weight. Both are end-aligned, so the only difference is a ~28 px change in width at the start edge. There is no block-axis shift (recorded switcher delta 0 px, CLS ≤ 0.0011). This is a minor gap against interaction-states §1, which asks that skeletons match the final layout. | `phone-small/ac3-landing-loading-vi.png` compared with `ac2-switcher-landing-vi.png` | Set the skeleton to roughly `15rem`, or leave it, since vi/en label widths differ anyway. Optional. |
| UX-4 | S4 | `SegmentedControl.tsx` (code hygiene) | `data-visible` on the `Check` icon is not referenced by CSS, unit tests or E2E (grep finds no use). This is dead markup in a `ui/` primitive. | `web/src/ui/SegmentedControl.tsx:65` | Remove it, or use it as the hook for the hidden state (`.check:not([data-visible]) { visibility: hidden }`). The inline style was chosen for jsdom testability, so removing the attribute is simpler. |

There are no S1, S2 or S3 findings.

## Answers to the implementer's open questions
1. **Hidden icon slot offsetting labels about 12 px: acceptable (S4, UX-1).** The offset is the same in both states, so nothing moves on selection, which was the point of F-2. Both alternatives cost more: symmetric reservation causes wrap or overflow at 360, and a centred unselected label jumps on selection. No change requested.
2. **Hidden semibold copy in the DOM text: acceptable (S4, UX-2).** It is invisible to users and assistive tech (exact accessible name, not in innerText). The only exposure is to test queries by text, and the project standard is role-based queries. Optionally record accessible names rather than `textContent` in the E2E records, and add a one-line docblock note.

UX-REVIEW T-M1.13: PASS

Restated (canonical token, same head `3ff781c`): `UX-REVIEW T-M1.13: APPROVED`
