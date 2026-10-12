# Responsive Standards

> Trace: NFR-RESP-01..03, NFR-A11Y-03, A-003. Approach: **content-first, fluid, component-level adaptation** (container queries) plus a few
> layout breakpoints for the shells. Student UI is designed mobile-first; tutor UI is designed desktop-first but must be **fully usable**
> on a phone (wrap-up, schedule, review).

## 1. Breakpoints (shell-level only; `web/src/ui/breakpoints.ts`)

| Name | Min width | Shell behaviour |
|---|---|---|
| `xs` | 0 | Phone. Tutor: top bar + drawer nav. Student: bottom tabs |
| `sm` | 480 | Large phone. As `xs`, with 2-column form rows allowed for short fields |
| `md` | 768 | Tablet portrait. Tutor: top bar + drawer nav while the nav has few items (a collapsible rail once it has enough items to need one, DEC-112). Student: top nav |
| `lg` | 1024 | Tablet landscape / small laptop. Tutor: persistent sidebar (labels); split views allowed |
| `xl` | 1280 | Laptop. Optional secondary column; builder 3-pane |
| `2xl` | 1536 | Desktop. Content max width stays 1200 px (reading comfort), centred |

The values live in `ui/breakpoints.ts` (`BREAKPOINTS`, and `useMinWidth(name)`, which the shells use to pick their frame). There is no
custom-media plugin: a stylesheet that needs a breakpoint repeats its value with a comment naming that file (T-M2.11).

Components adapt with **container queries** (`@container`) against their own width, not the viewport. For example, `DataList` switches
from a table to a list below a 640 px container width wherever it is placed.

## 2. Reference viewports (Playwright projects; evidence screenshots)

| Project | Size | Represents |
|---|---|---|
| `phone-small` | 360 × 740 | Budget Android (the most common student device class) |
| `phone` | 390 × 844 | Modern iPhone / Android |
| `tablet` | 768 × 1024 | iPad portrait |
| `tablet-land` | 1024 × 768 | iPad landscape / small laptop |
| `laptop` | 1280 × 800 | Tutor laptop |
| `desktop` | 1440 × 900 | Tutor desktop |

**Mandatory for every UI packet:** `phone-small`, `tablet` and `laptop` screenshots of each changed screen in its main states. Critical flows run
E2E on all six (nightly) and on the three mandatory ones per PR.

## 3. Rules

1. No horizontal page scroll at any reference viewport, or at 320 px with 400% zoom (reflow). An E2E helper asserts `document.scrollingElement.scrollWidth <= innerWidth`.
2. Fluid containers (`max-width` + `%`/`min()`). No fixed pixel widths for content. Images and media use `max-width: 100%`.
3. **Tables:** below a 640 px container width, `DataList` renders each row as a list item: the primary field is the title, 2–3 secondary fields sit on a meta line,
   and actions move into a `⋯` menu. A table that must stay tabular (e.g. the grading rubric) scrolls **inside its own container** with a sticky first
   column and a visible scroll affordance.
4. **Forms:** a single column below `md`. Labels always sit above inputs. Inputs are ≥ 44 px tall, with `font-size ≥ 16px` (prevents iOS zoom). The primary action sits in a
   `StickyFooter` on `xs`/`sm` for long forms. Correct `inputmode` and `autocomplete` for keyboards.
5. **Dialogs:** `Sheet` = a bottom sheet on `xs`/`sm` (drag handle plus a visible Close button), a side panel or centred dialog at ≥ `md`. Long forms never go in a small dialog.
   Navigation drawers are start-edge sheets (`placement="start"`) at every width below `lg` (item 6); other sheets stay bottom sheets on `xs`/`sm` (T-M2.11).
   When a resize or rotation across `md`/`lg` unmounts an open overlay, focus moves to the new frame's trigger, not `body` (AC11 (f)).
6. **Navigation:** the tutor sidebar collapses into a drawer below `lg`. The student bottom tabs respect `env(safe-area-inset-bottom)`.
7. **Touch:** primary targets ≥ 44 × 44 px, ≥ 8 px apart. Swipe gestures are never the only way to do something.
8. **Text:** line length 45–80 characters for reading areas. The workspace name: one line with an ellipsis in the shell top bars and in the
   public toolbar at ≥ `md`; at most two lines in the public toolbar's own row below `md` (T-M2.11 AC11 (a), (j)). In a narrow shell top bar the compact
   meta error shows an icon and Retry, its message kept as visually hidden alert text that describes Retry (AC11 (c)). Long names wrap (`overflow-wrap: anywhere` for usernames and URLs). Truncated text has a full-text tooltip **and** is visible on the detail view.
9. **Orientation:** both are supported. An attempt in landscape on a phone keeps the timer visible.
10. **Viewport height:** use `dvh` units for full-height sheets. Sticky footers must not cover inputs when the on-screen keyboard is open (use `visualViewport` handling in `Sheet`).

## 4. Per-screen responsive notes (critical screens)

| Screen | xs–sm | md | lg+ |
|---|---|---|---|
| Today | Stacked sections: Lessons first, then Attention, Review, Recent | Same, wider | Two columns: Lessons + Attention on the left, Review + Recent on the right |
| Student workspace | Tabs scroll horizontally, with an overflow "More" | Same | Overview split into 2 columns |
| Wrap-up | Full-screen sheet, sticky Save | Side panel 560 px | Side panel 640 px over the lesson |
| Grading | Response, then key and rubric, stacked; sticky score bar | Stacked | Side by side (response / key + rubric) |
| Activity builder | Outline list → item editor page; bank = full sheet | Outline + editor | Outline · editor · bank drawer |
| Attempt (student) | One item per screen with Prev/Next, plus an item grid in a sheet | 1 section per page | Section page with a sticky mini-map |
| Schedule | Day-grouped list | Day-grouped list | Week agenda columns (7 days) |
