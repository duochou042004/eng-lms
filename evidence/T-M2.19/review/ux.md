# UX review — T-M2.19 (combined QA+UX pass; UX part limited to the Spinner and Skeleton motion)

> Recorded by the LC from the reviewer's returned text (DEC-131: reviewers return text only). Full text: `evidence/T-M2.19/qa/report.md` (on `qa/T-M2.19`).

UX-REVIEW T-M2.19: APPROVED (round 1 on `d227f48`, delta re-check on `b89e147`)

## UX rulings (motion only)

- `--motion-duration-spin: 800ms` and `--motion-duration-pulse: 1.4s` are in `tokens.css` under Motion, each with a usage comment. The Spinner and Skeleton use the tokens with the same values, so they look the same as before.
- The reduced-motion rules are unchanged: `animation: none` on both, opacity 0.6 on the Spinner. The E2E asserts `1.4s` / `0.8s` and `0s` / not running under reduced motion; it passed 119 of 120 runs at ×20 (QA-3).
- Stylelint, tried with scratch CSS through the project config: it rejects `ms`/`s` (including `MS`) in `transition`, `animation`, `*-duration`, `*-delay`, inside `calc()`, and in any `--*` custom property. This holds for any file other than `src/ui/tokens.css`, including `src/ui/x/tokens.css` and `tokens.module.css`. It accepts `var(--motion-duration)` and `calc(var(...) * 2)`.
- Approved.

