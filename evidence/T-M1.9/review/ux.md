> Recorded by the LC from the ux-reviewer's report (PR #20, head `92e213b`; re-posted for `a55b1cb`, whose only change was `progress.json`). The reviewer's own screenshots (`R:<file>`) stayed in the session scratchpad and are not committed; the implementer's screenshots are in `evidence/T-M1.9/screenshots/`. Dispositions: DEC-073.

# UX review record: T-M1.9 (PR #20)

Reviewer: ux-reviewer, a fresh context working read-only · Branch `feature/T-M1.9-web-follow-ups` at `92e213b` · Date 2026-09-28
Packet: `docs/tasks/T-M1.9-web-follow-ups.md` · Findings being closed: `evidence/T-M1.3/review/ux.md` (F3, F5, the optional F9 items, N1–N4)

## Method
- Read the packet and the evidence summary. Checked the implementer's 57 screenshots in `evidence/T-M1.9/screenshots/` and the records in `evidence/T-M1.9/records/`.
- Ran my own live check with `pnpm dev --port 5191`, driven by Playwright scripts (Chromium 1243) at **360×740, 768×1024 and 1280×800** in vi and en. My screenshots
  are in the reviewer scratchpad (`ux19/shots/`, 55 files) and are referred to below as `R:<file>`. They are not committed. The server is stopped.
- Probes:
  - `/dev/ui` segment geometry and selection.
  - Keyboard walk of `/`, `/tutor`, `/student` and a 404: Tab order, arrows, Space, back, reload and the skip link.
  - Titles in both languages, and the title after a language switch.
  - Throttled first loads, with the lazy chunk held: `RouteLoading` shapes, the 150 ms reveal time and CLS.
  - A failed lazy navigation (the chunk aborted), which renders `RouteError`, in vi and en.
  - A `503` from `/api/v1/meta` (the header error state).
  - Horizontal overflow and the 44 px targets.
- I read the source of RAC `useToggleButtonGroup` and `useToolbar` (react-aria 3.52.1) to answer open question 1.

## Verified: closed findings
| Source | Result | Proof (mine; the implementer's records agree) |
|---|---|---|
| **F3** route focus + titles | **Closed.** After a client navigation by keyboard link, by mouse link, by browser back, and from the 404 link to `/`, `activeElement` is the new `h1` at all three viewports. The 2 px ring shows only after keyboard navigation (`:focus-visible` true), not after a mouse click. On a first load and on a reload focus stays on `body`, and the shell's first Tab stop is the skip link. Titles are `<page> · Eng-LMS` in both languages, and a language switch updates the title with no navigation. A failed lazy navigation lands on the `RouteError` `h1` with its own title. | `R:tutor-en-afternav-360.png`, `R:student-en-mousenav-*.png`, `R:route-error-en-360.png` |
| **F5** segmented language switcher | **Closed.** `radiogroup "Ngôn ngữ"` contains two `radio`s with `aria-checked`, and each endonym keeps its `lang`. The selected segment has the check icon, accent-subtle and semibold, so the state is not shown by colour alone. Segments are 44 px at all viewports. The focus ring is drawn inside the segment and stays visible on the selected (accent-subtle) segment. The contrast pairs were added to the script. Reduced motion is covered by `--motion-duration: 0ms`. The switcher appears on the landing page and in both shells. | `R:landing-en-focus-360.png`, `R:devui-*.png`, `screenshots/*/devui-segmented-*` |
| **F9** 150 ms delay | **Closed.** The region is `aria-busy` and labelled from 0 ms. Live, the skeleton appeared about 154 ms after the region mounted. CLS on held-chunk loads was 0.0001–0.002 (the limit is 0.05). | `R:loading-*-*.png`, `R:loaded-*-*.png` |
| **F9** field error icon | **Closed.** `CircleAlert` comes before the text, is `aria-hidden` and sits on the first text line. Contrast: 6.54:1 on the surface and 6.21:1 on the page background. | `screenshots/*/devui-field-error-*` |
| **N1** 404 link | **Closed.** 117×44 at all viewports. | `R:404-vi-360.png` |
| **N2** home and skip links | **Closed.** Home link 74×44, skip link 185×44. | probe log |
| **N3** `RouteLoading` block + shapes | **Closed.** It is a block with padding. On shells it has a top-bar skeleton that matches the real bar, including the wrapped two-row bar at 360: the switcher placeholder is at y 68 and the real switcher at y 68; the h1 is at 149 then 151. Elsewhere it shows only the page skeleton. | `R:loading-tutor-360.png` vs `R:loaded-tutor-360.png` |
| **N4** request-ID copy | **Closed.** Without an ID: "Reload the page. If the problem continues, try again in a few minutes." / "Hãy tải lại trang. Nếu lỗi vẫn còn, hãy thử lại sau vài phút." The ID sentence appears only with an ID. Both read naturally. | `R:route-error-{vi,en}-*.png` |

**General:**
- There is no horizontal scroll on any page at 360, 768 or 1280, and that includes the header error state at 360 (`R:tutor-meta-error-360.png`).
- Tokens only. `stylelint` is clean, and the disabled `opacity: 0.55` matches `Button` and `IconButton`.
- There are no §6 anti-patterns: no spinners for page loads, no colour-only state, and "Something went wrong" was not reintroduced.
- Each page keeps one `h1`, and `PageHeader` and `EmptyState` look the same as before.
- There were no console errors on the pages, apart from 502s on `/api` while the backend was down at the moment of the 1280 run. The UI handled them with its header error state.

**Step budgets (the packet's design notes):**
- Switching the language takes 1 step with the pointer and 1 with the keyboard: Tab into the group, arrow, Space.
- Reaching the main content takes 1 step from a fresh shell load, 0 from a fresh load of the landing or 404 page, and 0 after a client navigation.
- I confirmed these live at all three viewports, and they match `records/*/steps-*.json`. **All budgets hold.**

## Answers to the implementer's open questions
1. **Keyboard model (RAC toolbar vs the WAI-ARIA radio group): keep RAC as it is. Severity S4, non-blocking.**
   - **What RAC does:** RAC composes `useToolbar`. The group is one Tab stop, because the Tab key is re-routed out of the group. Arrows move focus without selecting, and Space or Enter selects. Focus re-enters on the segment that was last focused, or on the first segment on a forward Tab. The APG radio pattern is different: Tab lands on the checked radio, and arrows move *and* select.
   - **Is it accessible?** It passes WCAG 2.1.1, 2.4.3 and 4.1.2: it is operable, the name, role and state are correct, and a screen reader announces "English, radio, not checked", so the user knows Space is needed.
   - **Why keep it:** for this control, manual activation is the better behaviour. With selection-follows-focus, every arrow press would re-render the whole UI in the other language.
   - **Do not hand-roll a roving tabindex** on top of RAC. That would fork the `ui/` primitive and the RAC-only rule (ADR-0013).
   - **What to change (F-1):** state the deviation in design-system §3. Revisit only if a future segmented control switches *views*, where selection-follows-focus is expected. In that case build that variant on RAC `RadioGroup`, which implements the APG model, rather than patching `ToggleButtonGroup`.
2. **Width shift on selection: a real but small issue, S4 (F-2).** The group's total width stays the same, but the boundary between segments moves. In the switcher the halves go from 131/79 to 105/105. In a three-segment group "Danh sách" goes from 132 to 106 px. The label under the pointer jumps sideways by about 20–26 px after a click. It is cheap to fix, and it matters more when M2 uses this control for view switches.
3. **The landing skeleton has no switcher row: S4 (F-3).** It is not a CLS problem, because the fallback is replaced as a whole. Still, the heading lands about 70 px lower than its skeleton (skeleton at y 24, h1 at y 94), which is the "same heights" rule in interaction-states §1 being broken in a small way. The 404 path has a similar shape mismatch: a PageHeader-shaped skeleton is replaced by a centred `EmptyState` card (`R:loading-404-1280.png` vs `R:loaded-404-1280.png`). That one is acceptable, because `RouteLoading` cannot know that a path is a 404 before the chunk loads.

## Findings
| ID | Sev | Location / viewport | Problem | Screenshot | Suggested fix |
|---|---|---|---|---|---|
| F-1 | S4 | `ui/SegmentedControl`, all viewports | The keyboard model differs from the APG radio group. A forward Tab lands on the first or last-focused segment, not the checked one (with English selected, Tab on `/tutor` lands on "Tiếng Việt, not checked"). Arrows do not select. The model is operable and correctly announced, but design-system §3 does not say it deviates from the APG pattern. | `R:landing-en-focus-360.png` | Keep RAC. Add one sentence to design-system §3: "toolbar keyboard model (manual activation), intentional; for view switchers where selection-follows-focus is wanted use RAC `RadioGroup`". No code change. |
| F-2 | S4 | `ui/SegmentedControl.module.css` / `.tsx`, all viewports | The check icon is only rendered in the selected segment, so the segment boundary moves by 20–26 px on each selection (131/79 → 105/105 in the switcher). | `R:devui-360.png`, probe measurements | Reserve the icon's space in every segment: always render `<Check aria-hidden>` and give it `visibility: hidden` when not selected (or put `min-inline-size` on the icon slot). The alternative is equal-width segments (`display: grid; grid-auto-columns: 1fr`). |
| F-3 | S4 | `RouteLoading` on `/`, all viewports | The page-only skeleton has no row for the landing toolbar (the switcher), so the heading appears about 70 px below its skeleton line. | `R:loading-landing-360.png` vs `R:loaded-landing-360.png` | Add a 44 px, end-aligned toolbar-row skeleton on `/`, or make the landing toolbar row part of a shared page-header layout that the skeleton mirrors. |
| F-4 | S4 | `RouteError`, all viewports (copy, vi + en) | The copy without a request ID ends in "try again in a few minutes", which offers no way out if the problem stays. The page has only "Reload page" and no link back to the start page. | `R:route-error-en-360.png` | Optional: add a quiet "Go to the start page" / "Về trang đầu" link after the reload button, reusing `notFound.home` and the 44 px `homeLink` style. |
| F-5 | S4 (out of scope, noted for T-M2.4) | Header error state, `meta.error` (pre-existing T-M1.3 copy) | "Không tải được tên lớp" / "Couldn't load the class name" says *class*, but everywhere else (and the product, a 1:1 workspace) says *workspace* ("không gian dạy học"). | `R:tutor-meta-error-360.png` | Change it to "Không tải được tên không gian dạy học" / "Couldn't load the workspace name" when T-M2.4 rebuilds the shell header. |

There are no S1, S2 or S3 findings. Every item deferred from T-M1.3 (F3, F5, F9 optional, N1–N4) is closed and verified live. F-1 to F-4 are optional polish that the
LC can batch into a later packet or accept. F-2 is worth doing before M2 reuses `SegmentedControl` for view switching.

UX-REVIEW T-M1.9: APPROVED
