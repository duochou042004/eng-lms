# Design System — "The Teacher's Desk"

> Trace: SPEC §40 (tutor-first, few clicks, avoid enterprise UI), §55 ("a private teacher's digital workspace"), PO directive (avoid
> generic AI dashboards), ADR-0013, NFR-UX-04. Implementation: `web/src/ui/` + `web/src/ui/tokens.css`. The catalogue is at `/dev/ui`.

## 1. Character

The product should feel like **a well-kept teacher's notebook on a clean desk**: calm, legible, warm and quietly confident. Information comes first and decoration last.
Hierarchy comes from **typography and spacing**, not from boxes, shadows or colour.

| We are | We are not |
|---|---|
| Calm, paper-like neutrals, one ink-blue accent | Gradient heroes, neon accents, glassmorphism |
| Lists and timelines that read top-down | Walls of equal cards and KPI tiles |
| Words that say what happened ("2 overdue assignments") | Vanity numbers and charts without a decision attached |
| Dense where the tutor works (lists, grading), airy where the student reads | Uniform padding everywhere |
| Labels on every icon in the navigation | Icon-only mystery meat |

## 2. Tokens (`tokens.css`; the only source of visual values)

**Colour (light theme, MVP):**

| Token | Role | Value (final after the T-M1.3 contrast check, `web/src/ui/tokens.css`) |
|---|---|---|
| `--color-bg` | App background (paper) | `#FAF9F7` |
| `--color-surface` | Panels, sheets | `#FFFFFF` |
| `--color-surface-sunken` | Wells, table headers | `#F3F1ED` |
| `--color-border` / `--color-border-strong` | Hairlines / inputs | `#E4E0D8` / `#8F887C` (was `#C9C3B8`: 1.75:1, below the 3:1 needed for input boundaries) |
| `--color-text` / `--color-text-muted` / `--color-text-subtle` | Text | `#1F1D1A` / `#57524A` / `#6B655B` (was `#7A7469`: 4.41:1 on bg; all ≥ 4.5:1 on bg, surface and sunken) |
| `--color-accent` / `--color-accent-strong` / `--color-accent-subtle` | Ink blue: primary actions, links, focus | `#2F5D8C` / `#234A70` / `#E6EEF6` |
| `--color-success|warning|danger|info` (+ `-subtle`, `-text`) | Status only, always paired with icon and text | success `#2E7D4F` / `#E7F3EC` / `#1F5C39` · warning `#9A6700` / `#FBF1DC` / `#6B4800` · danger `#B3261E` / `#FBE9E7` / `#8C1D18` (+ `--color-danger-strong` `#8C1D18`) · info `#2F5D8C` / `#E6EEF6` / `#234A70` |
| `--color-on-accent` · `--color-skeleton` | Label on accent/danger fills · loading placeholder | `#FFFFFF` · `#E9E5DE` |
| `--color-focus` | Focus ring | `#2F5D8C` (2 px ring + 2 px offset) |

**Typography:** `Be Vietnam Pro` (400, 500, 600) with fallback `system-ui`. Scale (rem @ 16 px): 0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 1.875.
Body 1 rem / line-height 1.55. Headings 600 weight, tight line height 1.25. `font-variant-numeric: tabular-nums` for scores, times and counts.
Use at most **3 sizes per screen region**.

**Spacing:** 4 px grid → `--space-1..10` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. **Controls:** `--size-control-md` 44 px (2.75rem; inputs and primary targets), `--size-control-lg` 48 px. **Radii:** `--radius-sm` 6, `--radius-md` 10, `--radius-full`.
**Elevation:** only `--shadow-overlay` (menus, popovers, sheets). Resting surfaces use borders, not shadows. **Motion:** 120–200 ms ease-out. Honour
`prefers-reduced-motion` (no movement, fade only). **Z-index:** `--z-sticky`, `--z-overlay`, `--z-toast` only.

## 3. Components (inventory, all in `ui/`; feature code imports only from here)

| Group | Components |
|---|---|
| Layout | `AppShell` (tutor, student), `PageHeader`, `Section`, `Stack`, `Cluster`, `Split`, `Sheet` (bottom sheet on mobile / side panel on desktop), `StickyFooter` |
| Navigation | `NavList`, `BottomTabs`, `Tabs` (scrollable, overflow menu), `Breadcrumbs`, `CommandPalette`, `Pagination` |
| Actions | `Button` (primary, secondary, quiet, danger; sizes md and lg), `IconButton` (label required), `Menu`, `SplitButton`, `CopyButton` |
| Forms | `Form`, `Field` (label + hint + error wrapper), `TextField`, `TextArea` (auto-grow, counter), `NumberField`, `Select`, `ComboBox`, `StudentPicker`, `DatePicker`, `TimeField`, `DurationField`, `Checkbox`, `RadioGroup`, `SegmentedControl` (one of a few options, always one selected; e.g. the language switcher), `Switch`, `TagInput`, `FileDrop` + `UploadList`, `RichTextEditor`, `AudioRecorder`, `PasswordField` (reveal), `ErrorSummary` |
| Data display | `DataList` (responsive table ↔ list), `Timeline`, `DescriptionList`, `StatusBadge`, `Meter` (labelled bar), `ScoreLine`, `Sparkline`, `Avatar` (initials), `EmptyState`, `KeyValueSummary`, `Countdown` |
| Feedback | `Toast` (polite live region), `InlineAlert`, `Skeleton` (shape-matched) + `DelayedSkeleton` (the 150 ms delay), `Spinner` (only for actions under 1 s), `ProgressBar` (uploads), `ConfirmDialog`, `UnsavedChangesGuard`, `SaveIndicator` |
| Reorder | `ReorderableList` (React Aria DnD with keyboard, plus a "Move to…" menu fallback) |

Every component ships with: its states (default, hover, focus-visible, active, disabled, invalid, loading), keyboard behaviour, an accessible name
strategy, an RTL-agnostic layout (logical properties), a unit test, an axe test and a `/dev/ui` entry.

**`SegmentedControl`** (T-M1.9): React Aria `ToggleButtonGroup` in single selection with empty selection disallowed, so the group is a `radiogroup` and
each segment a `radio` with `aria-checked`. Props: a required `label` (the group's accessible name), `options` (`id`, `label`, optional `lang` for an
endonym, optional `isDisabled`), `selected`, `onChange`, `isDisabled`. Segments are ≥ 44 px (`--size-control-md`). States: hover (`--color-surface-sunken`),
pressed and selected (`--color-accent-subtle`; the selected label is `--color-accent-strong`, semibold, with a lucide `Check` icon, so selection is never
colour alone), focus-visible (the 2 px ring drawn inside the segment), disabled. **Stable widths** (T-M1.13): selecting a segment never moves the boundaries
between segments. The icon slot is always laid out and hidden (`visibility: hidden`) on unselected segments, and each label shares its grid cell with an
invisible, `aria-hidden` semibold copy, so the cell is always as wide as the semibold label.
**Keyboard model (on purpose):** React Aria's toolbar model, as `ToggleButtonGroup` provides it, with no custom key handling (ADR-0013). The group is one
Tab stop; the arrow keys only move focus between segments; Space or Enter selects the focused segment. A forward Tab into the group lands on the segment that
last had focus, otherwise the first; Shift+Tab lands on the last segment. Focus does not necessarily land on the checked segment. Why: selection waits for an
explicit Space/Enter, which suits a switch whose change redraws the UI (the language switcher re-renders every string), so arrowing through the options does
not redraw the page on each key press. A view switcher where the arrow keys should select at once (the usual radio-group behaviour) uses React Aria
`RadioGroup` instead, not a `SegmentedControl`.

**Skeleton delay** (interaction-states §1, T-M1.9): wrap a loading region's `Skeleton`s in `DelayedSkeleton` (default `SKELETON_DELAY_MS` = 150 ms). The
skeletons are laid out at once but stay `visibility: hidden` until the delay has passed, so the region already has its final size (no layout shift when the
skeleton or the data appears); the wrapper generates no box (`display: contents`). The region itself (`<output aria-busy="true" aria-label=…>`) is busy
and labelled from 0 ms. Used by `RouteLoading` and `WorkspaceName`; new loading regions use the same wrapper, not their own timers.

**`PasswordField`, `Checkbox`, `ErrorSummary`** (T-M2.4; tests, axe and `/dev/ui` entries):
- `PasswordField`: a React Aria `TextField` (label, hint, error as `TextField`) whose input sits beside a reveal toggle (`ToggleButton`, a fixed
  accessible name such as "Show password" from the `revealLabel` prop, `aria-pressed`, `type="button"`, after the input in the Tab order).
  `autoComplete` is required (`current-password` or `new-password`); paste and password managers work (WCAG 3.3.8). States: hover,
  focus-visible, invalid, disabled, revealed.
- `Checkbox`: React Aria `CheckboxField` + `CheckboxButton`; the whole row (box and label) is the ≥ 44 px target; selected = a check icon in an
  accent box (not colour alone); an optional `hint` is the description; `errorMessage` when invalid. States: hover, pressed, focus-visible,
  selected, invalid, disabled.
- `ErrorSummary`: the errors of a form above it (interaction-states §2.3): an `alert` with an `h2` title, a programmatic focus target
  (`tabIndex={-1}`, `ref` prop); a field error is a ≥ 44 px link (`#<input id>`) that moves focus to its input; an error without a field is
  plain text. Renders nothing without errors.
- `Button` (T-M2.4 addition): React Aria announces a focused button's pending state with a live-announcer entry that points at the button's id
  for 7 s; when the button unmounts first (a submit that navigates or swaps the form for its result), `Button` removes that entry, so the live
  region never points at a missing element (an axe `role-img-alt` violation otherwise).
- Token `--size-form-max` (25rem, 400 px): the one-column sign-in and password forms.

## 4. Status vocabulary (one mapping, used everywhere)

| Domain status | Label (en / vi) | Tone | Icon |
|---|---|---|---|
| Work: ASSIGNED | To do / Cần làm | neutral | circle |
| Work: overdue (derived) | Overdue / Quá hạn | danger | alert-circle |
| Work: IN_PROGRESS | In progress / Đang làm | info | timer |
| Work: SUBMITTED / NEEDS_REVIEW | Submitted / Đã nộp | info | inbox |
| Work: GRADED (unreleased) | Graded (not published) / Đã chấm (chưa công bố) | warning | eye-off |
| Work: RELEASED | Returned / Đã trả bài | success | check-circle |
| Work: EXCUSED / WITHDRAWN | Excused / Miễn · Withdrawn / Đã thu hồi | neutral | minus-circle |
| Lesson: SCHEDULED / COMPLETED / STUDENT_ABSENT / CANCELLED / RESCHEDULED | Scheduled / Completed / Absent / Cancelled / Rescheduled | neutral / success / warning / neutral / neutral | calendar / check / user-x / x / repeat |
| Plan item: NOT_STARTED / IN_PROGRESS / COMPLETED / PAUSED / SKIPPED | ○ / ▶ / ✓ / ‖ / ↷ with text | neutral / info / success / warning / neutral | as shown |

The mapping lives in `web/src/ui/status/statusMap.ts`. Features must not invent their own colours or labels for these statuses.

## 5. Layout patterns (use these; don't invent new ones without a UX review)

1. **List → detail** (students, library, review): a filterable `DataList`. At ≥ 1280 px the detail may open in a split view; below that it opens as its own page.
2. **Workspace** (student): `PageHeader` with the identity line + tabs + one content column. The Overview uses a 2-column split at ≥ 1024 px (main: timeline and work; aside: goals and plan position).
3. **Focused task** (wrap-up, attempt, grading, builder): minimal chrome, a sticky action footer, an explicit exit, and the save state always visible.
4. **Agenda** (Today, Schedule): a vertical time list grouped by day; the current time is marked; each row has its actions inline.

## 6. Anti-patterns (UX review rejects these)

1. A KPI tile row as the first thing on a page (counts belong in a sentence or a header line).
2. Charts that do not support a decision (SPEC §27: "not many charts").
3. Nested cards (card in card), or cards used as mere borders around everything.
4. Icon-only buttons without visible labels in primary navigation or primary actions.
5. Placeholder text used as a label. Hover-only affordances. Tooltips holding essential information.
6. Modals for long forms on mobile (use a full-screen sheet or a page). Modals stacked on modals.
7. Spinners for page loads (use skeletons that match the layout). A layout shift when data arrives (CLS > 0.05).
8. Colour as the only status carrier. Low-contrast grey text on grey.
9. Generic copy ("Welcome back! 🎉", "Lorem ipsum", "Something went wrong"). Copy must be specific and actionable.
10. Horizontal page scroll. Fixed pixel widths on content containers. Text truncation that hides meaning without a way to see the full text.
11. Raw colours, spacing or z-index values in feature CSS (stylelint blocks them).
12. Emoji used as icons. Mixed icon sets. Decorative illustrations in work areas (empty states may use one small, quiet illustration).

## 7. Content and voice

Direct, friendly and specific. Tutor copy is efficient ("3 submissions to review"). Student copy is encouraging, not childish ("Nice work: 8/10 on
Present Perfect #3"). Dates are relative plus absolute ("Tomorrow, 19:00 · 26/09"). Every piece of copy lives in the i18n catalogues. The Vietnamese copy is written
natively, not machine-translated from English, and is reviewed by the PO at M5 and M8.
