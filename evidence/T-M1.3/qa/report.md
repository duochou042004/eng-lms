# QA Report — T-M1.3 Web skeleton (Vite + React + TS, design tokens, i18n vi/en, CI)
Verdict: **PASS WITH MINOR** · Build: `f113908` (PR #4 head) · Date: 2026-09-25 · Evaluator: independent QA subagent (fresh context)

`QA-VERDICT T-M1.3: PASS WITH MINOR`

> Recorded by the Lead Coordinator from the QA agent's final message; the harness does not let subagents write files. The content is unchanged in substance.

## Environment
Node v24.21.0, pnpm 12.6.0 (corepack). The checkout on `feature/T-M1.3-web-skeleton` was clean at start and end. Live stack: Vite :5173 proxying to the backend
(`displayName` "Lớp tiếng Anh cô Lan"). Browser pane (Chromium) at 320×640, 360×740, 768×1024 and 1280×800. CI: web (run 36139346092), backend, docs-check and secrets-scan all pass.

## AC results
| AC | Result | Evidence |
|---|---|---|
| AC1 | PASS | `pnpm install --frozen-lockfile` exits 0. The build exits 0. `scaffold.txt` has the template command. `packageManager` is pnpm@12.6.0; engines are `>=24 <25`. |
| AC2 | PASS | lint, typecheck, test (39/39), build, budget and contrast all exit 0. The CI web job is green. The workflow has SHA pins, no `paths:` filter and `persist-credentials: false`. |
| AC3 | PASS | Negative fixtures, reproduced: `react-aria-components` imported in `features/` and in `app/`, and `fetch(` in `features/`, fail oxlint. `#ff0000`, `rgb()`, `red`, `black`, `12px`, `7px` and `1rem` in a feature CSS module fail stylelint. (See F-2.) |
| AC4 | PASS | `/dev/ui` shows every primitive in every state, in vi and en. Unit, keyboard and axe tests pass. |
| AC5 | PASS | A fresh load is `lang="vi"`. Enter on "English" switches every string, and the choice persists after a reload. vi→en→vi works. A missing en key and an extra en-only key each fail the completeness test. |
| AC6 | PASS | `pnpm api:generate` shows no diff. The live `displayName` appears in both shells (one call, no refetch loop). The loading and error states are covered by the MSW tests. |
| AC7 | PASS | Student 142.0 and tutor 142.1 KB gz, with separate shell chunks. Lowered limits give FAIL, exit 1. The DevUi route is not in the manifest. (See F-1.) |
| AC8 | PASS | Degrading the tokens fails the pairs (text-subtle 2.67–3.01:1; a light focus colour). Every foreground/background combination used in the CSS modules is in `PAIRS`. The doc values match `tokens.css`. |
| AC9 | PASS | 0 overflow on every route and width. A 2 px focus ring everywhere. Logical tab order. The skip link works. 404 has an h1 and a link to `/`. |
| AC10 | PASS | `web` is in `required-checks.txt` and the merge-gate fixture, and the script tests pass. Dependabot npm `/web`, the docs updates and DEC-042 are in place. |

Exploratory notes: no exam or curriculum identifiers and no out-of-scope features. No hard-coded UI strings: the only mixed-language items are the endonyms with `lang` and the brand name. RAC is used only in `ui/`, and RAC `I18nProvider` follows the locale. No console errors.

## Findings
| ID | Sev | Summary | Evidence |
|---|---|---|---|
| F-1 | S4 | The dev-only `dev` i18n namespace strings ("Component gallery"…) ship in the production bundle. The route and component are tree-shaken. The evidence summary wrongly said the strings were absent. | `web/src/lib/i18n/index.ts`; `budget-ac7.txt` (1 file) |
| F-2 | S4 | The fetch rule catches bare `fetch(` only. `window.fetch(` and `globalThis.fetch(` pass lint. | `web/.oxlintrc.json` (`no-restricted-globals`); fix with `no-restricted-properties` |
| F-3 | S4 | tech-stack line 65 says "vitest-axe", but the implementation uses axe-core directly. | `docs/03-architecture/tech-stack.md:65` |

No S1, S2 or SCOPE findings.

## Accessibility summary
axe-core is clean in the component and app tests. Colour contrast is covered by the verified contrast script. Landmarks, the heading order, visible focus, `aria-pressed` + `lang` on the switcher, `aria-invalid` + `aria-describedby` on fields, and 320 px reflow were all checked. No screen-reader run.

## Isolation / privacy checks
N/A: no auth and no student data. The only API call is public `GET /api/v1/meta`. The only localStorage key is `englms.locale`.

## Re-test log
- 2026-09-25, initial evaluation at `f113908`: PASS WITH MINOR. All negative fixtures were restored and the tree was clean at the end.
- LC disposition: F-3 and the F-1 evidence wording were fixed in `82db93c`. F-1 (code) and F-2 were deferred to T-M1.9 (DEC-045). Merged as `8b9d938`.
