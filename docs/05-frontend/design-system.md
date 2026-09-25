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

| Token | Role | Value (initial; tuned in T-M1.3 with contrast checks) |
|---|---|---|
| `--color-bg` | App background (paper) | `#FAF9F7` |
| `--color-surface` | Panels, sheets | `#FFFFFF` |
| `--color-surface-sunken` | Wells, table headers | `#F3F1ED` |
| `--color-border` / `--color-border-strong` | Hairlines / inputs | `#E4E0D8` / `#C9C3B8` |
| `--color-text` / `--color-text-muted` / `--color-text-subtle` | Text | `#1F1D1A` / `#57524A` / `#7A7469` (≥ 4.5:1 on bg for text) |
| `--color-accent` / `--color-accent-strong` / `--color-accent-subtle` | Ink blue: primary actions, links, focus | `#2F5D8C` / `#234A70` / `#E6EEF6` |
| `--color-success|warning|danger|info` (+ `-subtle`, `-text`) | Status only, always paired with icon and text | green `#2E7D4F`, amber `#9A6700`, red `#B3261E`, blue `#2F5D8C` |
| `--color-focus` | Focus ring | `#2F5D8C` (2 px ring + 2 px offset) |

**Typography:** `Be Vietnam Pro` (400, 500, 600) with fallback `system-ui`. Scale (rem @ 16 px): 0.75 · 0.875 · 1 · 1.125 · 1.25 · 1.5 · 1.875.
Body 1 rem / line-height 1.55. Headings 600 weight, tight line height 1.25. `font-variant-numeric: tabular-nums` for scores, times and counts.
Use at most **3 sizes per screen region**.

**Spacing:** 4 px grid → `--space-1..10` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. **Radii:** `--radius-sm` 6, `--radius-md` 10, `--radius-full`.
**Elevation:** only `--shadow-overlay` (menus, popovers, sheets). Resting surfaces use borders, not shadows. **Motion:** 120–200 ms ease-out. Honour
`prefers-reduced-motion` (no movement, fade only). **Z-index:** `--z-sticky`, `--z-overlay`, `--z-toast` only.

## 3. Components (inventory, all in `ui/`; feature code imports only from here)

| Group | Components |
|---|---|
| Layout | `AppShell` (tutor, student), `PageHeader`, `Section`, `Stack`, `Cluster`, `Split`, `Sheet` (bottom sheet on mobile / side panel on desktop), `StickyFooter` |
| Navigation | `NavList`, `BottomTabs`, `Tabs` (scrollable, overflow menu), `Breadcrumbs`, `CommandPalette`, `Pagination` |
| Actions | `Button` (primary, secondary, quiet, danger; sizes md and lg), `IconButton` (label required), `Menu`, `SplitButton`, `CopyButton` |
| Forms | `Form`, `Field` (label + hint + error wrapper), `TextField`, `TextArea` (auto-grow, counter), `NumberField`, `Select`, `ComboBox`, `StudentPicker`, `DatePicker`, `TimeField`, `DurationField`, `Checkbox`, `RadioGroup`, `Switch`, `TagInput`, `FileDrop` + `UploadList`, `RichTextEditor`, `AudioRecorder`, `PasswordField` (reveal), `ErrorSummary` |
| Data display | `DataList` (responsive table ↔ list), `Timeline`, `DescriptionList`, `StatusBadge`, `Meter` (labelled bar), `ScoreLine`, `Sparkline`, `Avatar` (initials), `EmptyState`, `KeyValueSummary`, `Countdown` |
| Feedback | `Toast` (polite live region), `InlineAlert`, `Skeleton` (shape-matched), `Spinner` (only for actions under 1 s), `ProgressBar` (uploads), `ConfirmDialog`, `UnsavedChangesGuard`, `SaveIndicator` |
| Reorder | `ReorderableList` (React Aria DnD with keyboard, plus a "Move to…" menu fallback) |

Every component ships with: its states (default, hover, focus-visible, active, disabled, invalid, loading), keyboard behaviour, an accessible name
strategy, an RTL-agnostic layout (logical properties), a unit test, an axe test and a `/dev/ui` entry.

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
