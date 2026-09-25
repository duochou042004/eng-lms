# Evidence — T-M1.3 Web skeleton (Vite + React + TS, design tokens, i18n vi/en, CI)

- Branch: `feature/T-M1.3-web-skeleton` · PR: see `progress.json` · Date (UTC): 2026-09-25
- Entry gate: T-M1.2 merged (`ae9ac5d`); PO approved the start (DEC-042). Implementation choices: DEC-042 (oxlint from the template, Vitest 5.0.1
  under pnpm's release-age policy, msw build script denied, tokens tuned for AA).

## Acceptance criteria → proof

| AC | Proof | Status |
|---|---|---|
| AC1 Vite template + install/build on Node 24 | `scaffold.txt` (the exact `pnpm create vite@9.2.1 web --template react-ts --no-interactive` command and output). `gate-local.log`: `pnpm install --frozen-lockfile` and `pnpm build` exit 0 on Node 24.21.0 / pnpm 12.6.0 | ✅ |
| AC2 all scripts green locally and in CI | `gate-local.log` (install, lint, typecheck, api:generate, test 39/39, build, budget, contrast: all exit 0). CI: CI_RUN_WEB | ⏳ CI |
| AC3 import rules + token lint fail on fixtures | `negative-ac3-lint.txt`: oxlint `no-restricted-imports` (react-aria-components in `features/`) and `no-restricted-globals` (fetch outside `lib/api`); stylelint `color-no-hex` and px `padding`; clean after removal | ✅ |
| AC4 primitives | `src/ui/`: Button (4 variants, 2 sizes, disabled, pending), IconButton (required label), Field + TextField (label/hint/error, invalid, disabled), InlineAlert (4 tones, status/alert roles), Skeleton, EmptyState, PageHeader, Stack. Tests: `Button.test.tsx`, `TextField.test.tsx`, `Display.test.tsx` (keyboard, states, axe-core clean); all in `/dev/ui` | ✅ |
| AC5 vi default, en switch, persistence, completeness | `app.test.tsx` (vi default; switch to English changes the headings, skip link and `<html lang>`, stored in localStorage), `initialLocale.test.ts`, `i18n-completeness.test.ts`. Live: `viewports-ac9.md` (still English after a full reload). Negative: `negative-ac5-i18n.txt` (missing en key → failure naming `shell:student.emptyTitle`) | ✅ |
| AC6 generated client + `/meta` states | `src/lib/api/schema.d.ts` from `api/openapi.json` (`pnpm api:generate`; CI checks for no diff). `app.test.tsx` covers the MSW-backed displayName, the Skeleton loading status and the InlineAlert on a Problem Details 500 with retry. `problem.test.ts` covers the ApiError mapping (code, requestId, unknown code, non-problem body, network error) | ✅ |
| AC7 split shells, budget, no `/dev/ui` in prod | `budget-ac7.txt`: student 142.2 KB gz ≤ 200, tutor 142.2 KB gz ≤ 300 (separate lazy chunks); `BUDGET_STUDENT_KB=100` → FAIL; `DevUiPage` is absent from the manifest and "Component gallery" from `dist/` | ✅ |
| AC8 contrast script | `negative-ac8-contrast.txt`: the initial design-system values fail 4 pairs (text-subtle 4.41:1, border-strong 1.75:1). The final tokens pass all 25 pairs. design-system §2 is updated | ✅ |
| AC9 3 viewports, no horizontal scroll, focus visible | `screenshots/` (landing, tutor, student, 404 × 360×740, 768×1024, 1280×800), `viewports-ac9.md` (0 px overflow at 320 px on 5 routes; 2 px focus ring) | ✅ |
| AC10 docs, required check, Dependabot, progress | tech-stack §3/§7, development-setup §4, ci-cd (`web` live), design-system §2, frontend-architecture §1, DEC-042; `web` in `scripts/required-checks.txt` + merge-gate fixture (script tests pass); Dependabot `npm` `/web`; `progress.json` | ✅ |

## Notes
- The shells show `displayName` from `/api/v1/meta`. The screenshots used `ENGLMS_META_DISPLAY_NAME` so it differs from the app name.
- axe-core runs in jsdom with the `color-contrast` rule disabled (no layout); the contrast script covers colour.
- Out of scope, as the packet says: auth/guards, E2E/Playwright (T-M1.6), SPA serving and `gate.sh` (T-M1.5), dark theme.

## Commands (reproducible)
```bash
source ~/.nvm/nvm.sh && corepack enable
cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget && pnpm contrast
```

## Reviews
UX review and independent QA: see the PR comments. The reports are recorded on non-implementation branches (path ownership).
