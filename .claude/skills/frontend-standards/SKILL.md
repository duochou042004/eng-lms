---
name: frontend-standards
description: Build Eng-LMS UI to the project's design system, responsive, interaction-state, accessibility, i18n and step-budget standards (React + TS + React Aria Components + CSS Modules + tokens). Use for any frontend implementation or UI change.
---

# Frontend standards (summary; the docs are authoritative)

**Read:** `docs/05-frontend/design-system.md`, `responsive-standards.md`, `interaction-states.md`, `accessibility.md`, `information-architecture.md`,
`ux-flows.md`, `frontend-architecture.md`.

## Build rules
1. **Compose from `web/src/ui/` only.** Tokens only (stylelint enforces this). Is a component missing? Add it to `ui/` with all states + test + axe + a `/dev/ui` entry.
2. **Page anatomy:** PageHeader (h1, context line, exactly one primary action) → optional tabs/filters → content (max 1200 px). Destructive actions go in `⋯` menus.
3. **States:** skeleton (after 150 ms, layout-matched) · empty first-use (purpose + one action) · empty filtered (clear filters) · inline error + Retry · offline banner for autosave areas · populated.
4. **Forms:** visible labels; "(required)" in text; RHF + Zod; server `errors[]` mapped to fields; ErrorSummary + focus on a failed submit; no double submit; unsaved guard; conflicts dialog on a 409 STALE_VERSION.
5. **Responsive:** container queries in components; DataList becomes a list below a 640 px container; sheets on mobile; sticky footers for long forms; `font-size ≥ 16px` inputs; no horizontal scroll.
6. **A11y:** keyboard paths (including DnD alternatives); visible focus; names for icon buttons; live regions (toasts polite, errors assertive); status = icon + text + colour.
7. **i18n:** keys in vi **and** en; dates, times and numbers through `lib/time` and `Intl`; `lang="en"` on English learning content inside the vi UI.
8. **Data:** TanStack Query hooks in `features/*/api` only; no ad-hoc fetch; precise invalidation; optimistic updates only for reorder and status chips.
9. **Status labels and colours** come only from `ui/status/statusMap.ts`.

## Anti-patterns (instant UX rejection)
KPI tile rows · charts without a decision · nested cards · icon-only nav · placeholder-as-label · spinners for page loads · colour-only status · generic copy ·
horizontal scroll · raw colours or spacing · emoji as icons · modals for long forms on mobile.

## Self-check (tick it in summary.md before the PR; DEC-131 (3))
- [ ] The packet's **UI rules** block is met (column shares, break points, focus targets, layering, validation rules).
- [ ] Long data at 360/768/1280: 30-character vi names, a 28-character username, long emails; no horizontal scroll, no mid-word breaks.
- [ ] Focus never lands on `body` after an action that removes or disables the focused element.
- [ ] vi buttons carry the verb ("Bỏ thay đổi", not "Bỏ"); heading levels never invert; counters use non-breaking spaces ("1 / 133").
- [ ] Docs named in the packet are in sync (responsive-standards, design-system, api-catalog).

## Before the PR
Screenshots at 360×740, 768×1024 and 1280×800 (each changed screen × main states) → `evidence/<task>/impl/` (local, git-ignored) · axe clean · keyboard
pass notes · step counter for the affected flows · `./scripts/gate.sh` green once on the final head.
