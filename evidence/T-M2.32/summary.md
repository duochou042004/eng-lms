# T-M2.32 summary: E2E console guard for fresh contexts and the T-M2.31 / T-M2.6 / T-M2.35 polish

Branch `feature/T-M2.32-guard-and-polish` (from `develop` @ `a84c753`). Packet: [T-M2.32](../../docs/tasks/T-M2.32-guard-and-polish.md),
DEC-196. PO start signal 2026-11-25 (the `/goal`). Risk tier **M**: one combined QA+UX reviewer (G3 pending). L-10 rulings: DEC-197.

## Commits
- `7d626fe` chore(progress): T-M2.32 in progress (LC)
- `a1b6a06` fix(web): block bodies for effects, a lint check against expression-bodied effects (b)
- `5cb0167` fix(web): the language switcher saves the account locale in click order (e)
- `6562b72` feat(web): React Aria's own strings in Vietnamese (f)
- `78c4b5b` test(e2e): guard every fresh browser context with the console guard (a)
- `8561cf9` fix(web): the tutor drawer fits Log out, its ring and the offline alert at 740×360 (c)
- `ad3acc8` docs: design-system §3, test-strategy §3 (gate head)
- `1a2fce7` chore(evidence): trimmed gate log

## AC → proof (from the implementer's report; verified by G3)
| AC | Proof |
|---|---|
| AC1 | `guardContext`, `accept`, `acceptStatus` exported from `e2e/support/fixtures.ts` (fixture uses it; contexts registered for the 500 ms settle); 25 `browser.newContext(` in `e2e/tests` and `e2e/support/students.ts`, 25 guarded, 0 unguarded; `guards.spec.ts` self-tests (page error, late error in a fresh context) as expected failures, seen red without the guard and without the registration (`impl/red-guard-self-tests.log`) |
| AC2 | `web/scripts/no-expression-effects.mjs` (TypeScript compiler API, in `pnpm lint`) and `.test.mjs`: red on one-line and wrapped `useEffect`/`useLayoutEffect`/`React.useEffect`, green on cleanup arrows (one-line, wrapped as `ui/Button.tsx`), block bodies; red on the unfixed tree (the 9 effects), green after |
| AC3 | `shells.spec.ts` AC2o polls `available − needed ≥ 0` at 740×360 (vi, en): −1.1875 px before (`impl/red-ac3-740x360.log`), green after; `--account-gap` lowered to `--space-3` in the tutor drawer footer only; 568×320 unchanged |
| AC4 | `LanguageSwitcher.test.tsx`: four new cases (late first answer; two mounted switchers; failed first PATCH then the second; display-name save not queued), red before; 6 kept cases pass |
| AC5 | `ui/ariaStrings.ts` (one dictionary for both locales on React Aria's full en-US base, installed in `main.tsx` before `createRoot`; `shortcut:` comment) and `ariaStrings.test.tsx` (13 cases: dismiss names "Đóng"/"Dismiss", ComboBox "Có N lựa chọn.", SearchField, ConfirmDialog, Toast render in both, vi → en → vi); red before installing |
| AC6 | design-system §3 SegmentedControl "Why" names the account-locale save; no SegmentedControl change |
| AC7 | gate PASS (below); axe via `expectSettledAccessible` on the drawer footer and the vi ComboBox at phone-small, tablet, laptop; CI on the final head (merge-gate) |

## Results
- Gate on `ad3acc8`: run 1 `gate: FAIL at step 'web-test'` (1 of 961: `DevUiPage.test.tsx` "registers the dev namespace", a 1 s `findByRole` on a lazy chunk under load; 3 of 3 alone; not touched by this packet); run 2 `./scripts/gate.sh --from web-test` on the same head `gate: PASS (7 steps, 1239s)`: web 961 passed; E2E 610 passed / 68 skipped; ×3 repeat (all 19 specs, `fixtures.ts` changed) 1830 passed / 204 skipped, 0 failed. Backend skipped (no backend/api change). Log: [gate-2026-11-25.log](gate-2026-11-25.log).
- Bundle: the student first visit 195.3 KB gz of 200 KB (192.9 without the dictionary).

## LC rulings before G3 (L-10, DEC-197)
- **OQ T-M2.32-1** (`students-list.spec.ts:207`, phone-small only): the debounced username suggestion races Log out and Chromium logs its 401; behaviour is correct (lands on /login, no dialog). **Ruling: the exact status-and-path filter stays** (a timing-dependent log; `test.fail` would turn every run without the race red). No product change.
- `students-list.spec.ts:255` (T-M2.29 AC3): the 401 is provoked on purpose; filtered exactly after polling for it. Not an OQ.
- Deviations accepted: (1) the mutation `scope` passed through `useUpdatePreferences({ scope })` (TanStack's `mutate()` cannot take one; no default scope); (2) in vi a Sheet's visible Close and React Aria's hidden dismiss share "Đóng"; tests pick the visible one (QA to judge for screen readers); (3) the exact filter for OQ-1; (4) the red-run logs committed as L-01 proof.
- The (f) mechanism also sets `window[Symbol.for('react-aria.i18n.locale')]` to `en-US` (an unset key makes every lookup miss); renders run inside `UiProvider`, so it is only the dictionary key.
- The `DevUiPage.test.tsx:12` flake → noted on the T-M2.7 row.

## G3 (tier M)
Pending: one combined QA+UX reviewer.

## Not verified
- CI (pending); WebKit (G5); a real screen reader (QA checks accessible names).

## G3 cost
| Agent | Tokens | Duration |
|---|---|---|
| FE implementer | 247,090 | 3,340 s |
