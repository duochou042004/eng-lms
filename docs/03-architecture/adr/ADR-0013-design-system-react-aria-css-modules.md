# ADR-0013: In-house design system on React Aria Components + CSS Modules + tokens

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: PO directive ("frontend is a major quality risk; avoid generic AI dashboards"), SPEC §40, NFR-A11Y, NFR-UX-04

## Context
The biggest product risk is a UI that looks generic, breaks at some viewport, or is inaccessible (R-01). The product needs accessible
complex widgets: date and time pickers, a combobox (student picker), **keyboard-accessible drag reorder** (plans, builder), dialogs and
sheets, and tables. Agents tend to scatter ad-hoc styles.

## Decision
- **React Aria Components** (RAC) provide unstyled, accessible behaviour. We wrap them in our own `web/src/ui/*` components. **Feature
  code may import only from `ui/`**, never directly from RAC or with raw styling (ESLint `no-restricted-imports`).
- Styling is **CSS Modules** per component, using only **design tokens** (CSS custom properties in `ui/tokens.css`). **stylelint**
  forbids raw colours, raw spacing and z-index values outside the token files.
- The visual language and anti-patterns are defined in `docs/05-frontend/design-system.md`. Component states are defined in `interaction-states.md`.
- The component catalogue is a `/dev/ui` route (dev builds only), used for visual snapshots. Storybook is not needed now.

## Alternatives considered
- shadcn/ui + Tailwind: fast to start, but tends to produce the generic look the PO wants to avoid. It also lacks keyboard DnD and a date picker, and utility sprawl is hard to review.
- MUI or Ant Design: heavy, with an enterprise-looking default aesthetic (SPEC §40.6 "avoid enterprise UI").

## Consequences
+ Strong accessibility baseline, a consistent look, a reviewable surface (≈ 40 components). − More up-front component work in M1 and M2
(budgeted in T-M1.3 and T-M2.x).

## Verification
Lint rules in CI. The `/dev/ui` catalogue has visual snapshots. axe runs on the catalogue. The UX reviewer checklist is applied per PR.
