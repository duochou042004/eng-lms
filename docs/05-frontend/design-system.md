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
`prefers-reduced-motion` (no movement, fade only). Durations come only from the motion tokens in `tokens.css` (stylelint rejects `ms`/`s` in `transition*`, `animation*` and custom properties elsewhere; T-M2.19): `--motion-duration`, `--motion-duration-progress` (1.2 s), `--motion-duration-spin` (800 ms, one Spinner turn) and `--motion-duration-pulse` (1.4 s, one Skeleton pulse); the Spinner and Skeleton stop under reduced motion. **Z-index:** `--z-sticky`, `--z-overlay`, `--z-toast` only.

## 3. Components (inventory, all in `ui/`; feature code imports only from here)

| Group | Components |
|---|---|
| Layout | `AppShell` (tutor, student), `PageHeader`, `Section`, `Stack`, `Cluster`, `Split`, `Sheet` (bottom sheet on mobile / side panel on desktop), `Popover` (dialog-type, from a button), `StickyFooter` |
| Navigation | `NavList`, `BottomTabs`, `Tabs` (scrollable, overflow menu), `Breadcrumbs`, `CommandPalette`, `Pagination` |
| Actions | `Button` (primary, secondary, quiet, danger; sizes md and lg), `ButtonLink` (a router link that looks like a `Button`), `IconButton` (label required), `Menu`, `SplitButton`, `CopyButton` |
| Forms | `Form`, `Field` (label + hint + error wrapper), `TextField`, `TextArea` (auto-grow, counter), `NumberField`, `Select`, `ComboBox`, `StudentPicker`, `DatePicker`, `TimeField`, `DurationField`, `Checkbox`, `RadioGroup`, `SegmentedControl` (one of a few options, always one selected; e.g. the language switcher), `Switch`, `TagInput`, `FileDrop` + `UploadList`, `RichTextEditor`, `AudioRecorder`, `PasswordField` (reveal), `ErrorSummary` |
| Data display | `DataList` (responsive table ↔ list), `Timeline`, `DescriptionList`, `StatusBadge`, `Meter` (labelled bar), `ScoreLine`, `Sparkline`, `Avatar` (initials), `EmptyState`, `KeyValueSummary`, `Countdown` |
| Feedback | `Toast` (polite live region), `InlineAlert`, `Skeleton` (shape-matched) + `DelayedSkeleton` (the 150 ms delay), `ProgressLine` (navigation), `Spinner` (only for actions under 1 s), `ProgressBar` (uploads), `ConfirmDialog`, `UnsavedChangesGuard`, `SaveIndicator` |
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
The timer itself is `useDelayed(active, delayMs = SKELETON_DELAY_MS)` (`ui/useDelayed.ts`): `true` once `active` has held for the delay,
`false` at once when it ends; other delayed feedback (the progress line) uses it too.

**`ProgressLine`** (T-M2.12; test, axe and `/dev/ui` entry): a thin indeterminate line at the top edge of the viewport
(`position: fixed`, `--size-progress-line` = 3 px, `--color-accent`, `--z-toast`, no pointer events), so the page under it keeps its layout and
stays usable. A 40 % bar travels across (`--motion-duration-progress` = 1.2 s, `--motion-easing`); with `prefers-reduced-motion: reduce` it is a static full-width line.
Decorative: `aria-hidden="true"`, never focusable; its owner announces the state (in `RootLayout`, one polite status region saying
`app.loading`). Shown by `RootLayout` after 150 ms of a router navigation (frontend-architecture §3).

**`PasswordField`, `Checkbox`, `ErrorSummary`** (T-M2.4; tests, axe and `/dev/ui` entries):
- `PasswordField`: a React Aria `TextField` (label, hint, error as `TextField`) whose input sits beside a reveal toggle (`ToggleButton`, a fixed
  accessible name such as "Show password" from the `revealLabel` prop, `aria-pressed`, `type="button"`, after the input in the Tab order).
  `autoComplete` is required (`current-password` or `new-password`); paste and password managers work (WCAG 3.3.8). States: hover,
  focus-visible, invalid, disabled, revealed.
- `Checkbox`: React Aria `CheckboxField` + `CheckboxButton`; the whole row (box and label) is the ≥ 44 px target; selected = a check icon in an
  accent box (not colour alone); an optional `hint` is the description; `errorMessage` when invalid. States: hover, pressed, focus-visible,
  selected, invalid, disabled.
- `ErrorSummary`: the errors of a form above it (interaction-states §2.3): an `alert` with an `h2` title by default, `h3` inside a section
  (`headingLevel={3}`: the Profile view's profile, guardian and learning-profile forms, T-M2.20; same look either way), a programmatic focus target
  (`tabIndex={-1}`, `ref` prop); a field error is a ≥ 44 px link (`#<input id>`) that moves focus to its input; an error without a field is
  plain text. Renders nothing without errors.
- `Button` (T-M2.4 addition): React Aria announces a focused button's pending state with a live-announcer entry that points at the button's id
  for 7 s; when the button unmounts first (a submit that navigates or swaps the form for its result), `Button` removes that entry, so the live
  region never points at a missing element (an axe `role-img-alt` violation otherwise).
- Token `--size-form-max` (25rem, 400 px): the one-column sign-in and password forms.

**App shells** (T-M2.11, DEC-112; tests, axe and `/dev/ui` entries). `AppShell` is not one `ui/` component: it is the two shells in
`app/shells/` (`TutorShell`, `StudentShell`), composed from these `ui/` parts:
- `Sheet`: a React Aria modal (`ModalOverlay` + `Modal` + `Dialog`) with `placement="start"` (full-height navigation drawer from the inline-start
  edge, at most `--size-drawer`) or `placement="bottom"` (bottom sheet, a decorative drag handle, at most `--size-sheet-max`, safe-area padding).
  A visible heading names it; a visible Close button (`IconButton`), Esc and a tap on the scrim (`--color-scrim`) close it; focus moves in, is
  contained and returns to the opener. An optional `footer` is pinned below the scrolling body. The focused dialog's ring sits inside the panel and follows its corners (AC11 (e)). It slides in on entry only (closing is
  immediate, so a navigation from inside lands focus on the new page at once); with reduced motion nothing moves.
- `Popover`: a button (`aria-haspopup="dialog"`, `aria-expanded`; the label truncates with a full-text `title`, the button is
  `--size-account-button` wide so a skeleton can take its shape) opening a dialog-type popover (not an ARIA `menu`, so it may hold any
  control, e.g. the language `SegmentedControl`). Modal: focus in and contained, Esc and an outside click close it, focus returns. Fixed width
  (`--size-popover`), so a language change never moves its content. Controlled (`isOpen`, `onOpenChange`).
- `NavList`: a labelled `nav` with a list of router links (icon + always-visible label), vertical (sidebar, drawer) or horizontal (student top
  bar). The current item (its route or one below it) has `aria-current="page"`, the accent-subtle background, a semibold label and a bar on its
  inline-start (vertical) or block-end (horizontal) edge (`--size-marker`), so the state is not colour alone. `onNavigate` lets a drawer close first.
- `BottomTabs`: a labelled `nav` fixed to the bottom edge (`--size-tabbar` tall plus `env(safe-area-inset-bottom)`): equal tabs, icon above an
  always-visible label, ≥ 44 px; an optional last tab is an action (`aria-haspopup="dialog"`, `aria-expanded`), e.g. More. The current tab has
  `aria-current="page"` with a bar on its top edge and a semibold label. While it is on the page, the document's scroll padding keeps a focused
  element clear of it (accessibility §1 rule 15).
- `ButtonLink`: a React Router `Link` with the classes of a `Button` of the same variant and size (hover, active and focus-visible through CSS),
  so a navigation keeps link semantics next to buttons ("Change password" beside "Log out").
- `breakpoints.ts`: `BREAKPOINTS` (responsive-standards §1) and `useMinWidth(name)`.
- `NavList`, `BottomTabs` and `ButtonLink` import React Router's links: the design system targets this app's router only.
- Tokens: `--size-sidebar` (15rem), `--size-drawer` (20rem), `--size-popover` (18rem), `--size-account-button` (12rem), `--size-tabbar`
  (3.75rem), `--size-sheet-max` (85dvh), `--size-marker` (3px), `--color-scrim`.

**Profile and account components** (T-M2.14; tests, axe and `/dev/ui` entries):
- `Toast` (`ToastRegion` + the `toast` queue): React Aria's `UNSTABLE_Toast*` wrapped in `ui/Toast.tsx` and `ui/toastQueue.ts` only
  (`shortcut:` comment). Placement, timing and the `--toast-stack-size` room: interaction-states §4. Token `--size-toast` (24rem). The region
  remounts when it gets its first toast, so React Aria registers it as an F6 landmark (its label is fixed). Under an open modal
  (`ConfirmDialog`, `Sheet` report themselves through `ui/modalStack.ts`) it is hidden, inert and paused (AC12 (a), DEC-126);
  `--z-toast` is now 150, below `--z-overlay`.
- `UnsavedChangesGuard`: `useBlocker` + `beforeunload` rendering the `ConfirmDialog` while `isDirty`; the predicate `blocksNavigation` (own
  module): every move to another pathname except `/login` and `/forbidden`; a navigation with `state.forced === true` passes only to
  `/change-password` (DEC-123 SEC S4-5). Used by Add student ("Discard this student?") and Edit profile ("Discard your changes?").
- `Button`: the cleanup of a vanished button's pending announcement runs again after React Aria's 100 ms first-announcement delay.

**Students components** (T-M2.5, DEC-120 (5); tests, axe and `/dev/ui` entries):
- `DataList`: a semantic `table` (caption, `th scope="col"`, the first cell a row header) at ≥ 768 px (`md`), below that a `ul` of rows
  (the first column as the title, the other values on a wrapping meta line, each led by its visually hidden header). The structure is chosen with
  `useMinWidth('md')` (one DOM at a time, nothing duplicated for assistive technology) rather than a 640 px container query: the packet fixes
  the switch at the 768 px viewport, and a structural switch cannot be done in CSS without rendering both. Values wrap (`overflow-wrap:
  anywhere`), so 360 px never scrolls horizontally; an empty value is left out of the list row. AC12 (DEC-122): a column may have a `width`
  (a share such as `31%`; then the table uses `table-layout: fixed`, so its width never depends on the content, AC12 (t), superseding the
  (d) `nowrap` and (s) `break-word` sizing) and may be `inTitle` (beside the list row's title: the status badge). The Students table uses
  Name 29 %, Status 16.5 %, Email 31 %, Phone 23.5 % with 8 px inline cell padding, so the longest badge (vi, en), a phone and a 20-character
  email or username fit one line at 768 px. Emails wrap after `@` or before a dot of the local part (`<wbr>`; a domain over 16 characters
  before its dots too) and phones only between their space-separated groups (AC12 (u), `features/students/model/lineBreaks.ts`). The Students list has no Username column (AC12 (q), superseding (p)'s minimum width): `@username` is a muted
  second line of the Name cell, so at 768 px names and emails keep room.
- `StatusBadge`: icon + text + tone from `status/statusMap.ts` (§4); the label is passed translated (`ui/` has no i18n). Not interactive.
- `Disclosure`: React Aria `Disclosure`: a button with `aria-expanded` inside a heading (level 2 or 3), a turning chevron (no movement with
  reduced motion); the panel stays mounted while collapsed (`hidden`), so field values survive; controllable (a form opens the section that
  holds an error).
- `TextArea`: React Aria `TextField` + `TextArea`, grows with its content (`field-sizing: content`, from three lines); an optional
  `maxLength` shows a counter ("120 / 2.000" in the UI locale, code points) in the description; past it the counter turns danger and typing is
  not blocked (validation reports it).
- `CopyButton`: `navigator.clipboard.writeText`; "Copied" announced in a polite `output` but visually hidden (the button's icon turns to a
  check for 4 s, so nothing moves, AC12 (g)); where the
  clipboard is missing (insecure context) or refuses, the manual-copy message stays until the next attempt. `accessibleLabel` may extend the
  visible label ("Copy Zalo", WCAG 2.5.3).
- `ConfirmDialog`: the WAI-ARIA alert dialog pattern on a React Aria modal `Dialog` (`role="alertdialog"`): a named heading, the consequence,
  a danger confirm and a safe cancel that has focus on open; Esc cancels; an outside click does nothing; focus returns. Also the unsaved
  changes guard's dialog. **T-M2.14:** `confirmVariant` (`danger` default, `primary` for a safe confirm such as Reload), `isPending` +
  `pendingLabel` (the confirm shows the pending label; Esc, Cancel and the overlay do nothing meanwhile) and a `children` content slot under
  the description (an `InlineAlert`, a `CopyButton`).
- `DescriptionList`: a `dl`; two columns (term `--size-term`, baseline-aligned with its value) when its own container is ≥ 32rem, else the
  term above the value; an empty
  value shows the given label ("Not added") in subtle text.
- `SearchField`: React Aria `SearchField` (role `searchbox`) with a visible label, a decorative icon, a ≥ 44 px clear button while filled,
  Esc clears; 16 px text. The owner debounces.
- `PageHeader` gained `meta` (an identity line under the title: status badge, `@username`). Tokens: `--size-reading-max` (40rem, the Add
  student form and the credentials card), `--size-field-min` (18rem), `--size-term` (8rem), `--font-family-mono` (the temporary password).
- Bundle note: every `ui/` module is reached through the `ui/index.ts` barrel, so the components used only by tutor pages ship in the shared
  chunk too (the student first visit grew from 174.7 to 180.5 KB gz of its 200 KB budget with these eight).

**`TagInput` and `TagList`** (T-M2.17, DEC-140 (4); tests, axe and a `/dev/ui` entry): a labelled field in a `fieldset` named by its
label (so a page with two tag fields can scope to each): the current tags as a plain list (`ul`, no bullets) of chips, each its text and a
quiet `IconButton` (X) whose accessible name is the caller's "Remove {tag}" (in the tab order; no React Aria `TagGroup`, so no grid keys and
no English-only description), then one text input with the hint and the error. **Enter** or a typed **comma** adds the input's text; a
pasted text with commas, tabs or line breaks adds each part. Each entry is trimmed; an empty one is ignored; a control character, more than
`maxLength` code points, a tag already present ignoring case or one past `maxTags` is refused with its message (the caller's strings) and its
text kept in the input (a pasted list adds its valid parts and keeps the refused ones, comma-joined). An entry refused for several reasons
shows every reason's message, each once in the order of its first refusal, joined by a space (`addTags` returns `errors`, T-M2.20); a new caller error (a failed Save) replaces them until the next commit (AC10). The rules are the pure `addTags`
(`ui/tagEntry.ts`), so a form can commit the input's text on Save. The input is controlled (`inputValue`), stays enabled at `maxTags`, and
Enter never submits the form. Removing a chip focuses the next chip's button, else the previous one's, else the input. Chips wrap as whole
chips (`gap: var(--space-2)`); a long tag wraps inside its chip (`overflow-wrap: anywhere`). `TagList` shows the same chips read-only.
States: default, hover, focus-visible, invalid, disabled.

## 4. Status vocabulary (one mapping, used everywhere)

| Domain status | Label (en / vi) | Tone | Icon |
|---|---|---|---|
| Student: ACTIVE | Active / Đang học | success | check-circle (`CircleCheck`) |
| Student: PAUSED | Paused / Tạm nghỉ | warning | pause-circle (`CirclePause`) |
| Student: ARCHIVED | Archived / Đã lưu trữ | neutral | archive (`Archive`) |
| Work: ASSIGNED | To do / Cần làm | neutral | circle |
| Work: overdue (derived) | Overdue / Quá hạn | danger | alert-circle |
| Work: IN_PROGRESS | In progress / Đang làm | info | timer |
| Work: SUBMITTED / NEEDS_REVIEW | Submitted / Đã nộp | info | inbox |
| Work: GRADED (unreleased) | Graded (not published) / Đã chấm (chưa công bố) | warning | eye-off |
| Work: RELEASED | Returned / Đã trả bài | success | check-circle |
| Work: EXCUSED / WITHDRAWN | Excused / Miễn · Withdrawn / Đã thu hồi | neutral | minus-circle |
| Lesson: SCHEDULED / COMPLETED / STUDENT_ABSENT / CANCELLED / RESCHEDULED | Scheduled / Completed / Absent / Cancelled / Rescheduled | neutral / success / warning / neutral / neutral | calendar / check / user-x / x / repeat |
| Plan item: NOT_STARTED / IN_PROGRESS / COMPLETED / PAUSED / SKIPPED | ○ / ▶ / ✓ / ‖ / ↷ with text | neutral / info / success / warning / neutral | as shown |

The mapping lives in `web/src/ui/status/statusMap.ts` (student statuses since T-M2.5: `STUDENT_STATUS`, labels in the `common` namespace under
`status.student.*`; the other rows join with their modules). Features must not invent their own colours or labels for these statuses.

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
