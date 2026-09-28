# Accessibility Standard (WCAG 2.2 AA)

> Trace: NFR-A11Y-01..04. Tools: React Aria Components (behaviour), axe-core (automated), manual keyboard and screen-reader passes (NVDA +
> Firefox, VoiceOver + Safari iOS) at M5 and M8. Automated checks catch about 40% of issues. The manual checklist is mandatory for UI packets.

## 1. Rules

1. **Semantics:** landmarks (`header`, `nav`, `main`, `footer`). One `h1` per page. The heading levels do not skip. Lists are real lists. Tables are only for tabular data.
2. **Names:** every interactive element has an accessible name. Icon buttons carry `aria-label` from i18n. Form fields have a `<label>`, and errors and hints are linked with
   `aria-describedby`.
3. **Keyboard:** everything is operable. Tab order follows the visual order. No keyboard traps (dialogs trap focus and release it on close, returning focus to the trigger).
   Visible focus (`:focus-visible` 2 px ring, ≥ 3:1 contrast). A **skip link** to the main content.
4. **Drag and drop** always has a keyboard path (React Aria DnD) **and** a "Move to…" menu (WCAG 2.5.7 Dragging Movements).
5. **Contrast:** text ≥ 4.5:1 (large text ≥ 3:1). UI components and focus indicators ≥ 3:1. Tokens are validated by a script in CI (`web/scripts/contrast-check`).
6. **Colour independence:** status = icon + text + colour (design-system §4).
7. **Target size:** ≥ 24 × 24 CSS px minimum (WCAG 2.5.8), 44 × 44 for primary controls.
8. **Motion:** respect `prefers-reduced-motion`. Nothing flashes more than 3 times per second.
9. **Time limits:** timed assessments are a legitimate "essential" exception, but the timer is announced (at 5 and 1 minutes remaining; `aria-live=polite`), the tutor can grant
   extra time or attempts, and the time limit is shown before starting (WCAG 2.2.1).
10. **Forms:** error identification in text; suggestions; the error summary; no information conveyed only by placeholder; `autocomplete` tokens (username,
    current-password, new-password, name, tel, email). **Redundant entry (3.3.7):** prefill known data. **Accessible authentication (3.3.8):** no
    cognitive tests; password managers and paste allowed.
11. **Language:** `<html lang>` follows the UI locale. English learning content embedded in a Vietnamese UI gets `lang="en"` on the content container.
12. **Media:** audio players have keyboard controls. Tutor-uploaded videos show a "captions not available" notice unless a VTT file is attached (P2: caption upload).
13. **Live regions:** toasts (polite), errors (assertive), save status (polite, throttled), timer (polite at thresholds only).
14. **Zoom and reflow:** usable at 200% zoom and at a 320 px width (responsive-standards §3.1).
15. **Focus not obscured (2.4.11):** sticky headers and footers must not cover the focused element (use `scroll-padding`).

## 2. Per-PR checklist (UI packets)

- [ ] axe: 0 serious or critical violations on each changed route (Playwright `checkA11y` in E2E).
- [ ] Keyboard-only pass of the changed flow (recorded as steps in the evidence).
- [ ] Focus management after route change (focus the `h1`), dialog open and close, and async errors. Route changes are handled by the app (T-M1.9):
      the root layout moves focus to `main h1` after every client-side navigation (not on a first load or reload) and each route sets its
      `document.title` with `usePageTitle` (frontend-architecture §3). A new page only has to render its `h1` through `PageHeader` (or a level-1
      `EmptyState`) and call `usePageTitle`; check both in the evidence.
- [ ] Screen-reader spot check of new components (the name, role and state announced correctly), noted in the evidence.
- [ ] Contrast script passes. No colour-only status.
- [ ] Reduced-motion mode checked for new animations.
