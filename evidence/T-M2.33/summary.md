# T-M2.33 summary: strict scalar binding and one name character rule

Branch `feature/T-M2.33-strict-scalars-names` (from `develop` @ `68d870f`). Packet: [T-M2.33](../../docs/tasks/T-M2.33-strict-scalars-names.md),
DEC-200. PO start signal 2026-11-25 (chat). Risk tier **H**: SEC agent, then QA with the UX checklist. L-10 rulings: DEC-201.

## Commits
- `971c79a` chore(progress): T-M2.33 in progress (LC)
- `c422140` feat(shared): strict string/boolean binding and one name character rule (BE, scope 1–5)
- `558bbdc` docs(api): login row names the 400 for wrong JSON types (LC, BE OQ-1)
- `c02ade1` feat(web): one name character rule in both settings forms (FE, scope 6–8; gate head)
- `9516395` chore(evidence): the trimmed gate log
- `7b28649` test(shared): invisible characters in the name-rule tests written as escapes (LC, DEC-201 (4))

## AC → proof (from the implementers' reports)
| AC | Proof |
|---|---|
| AC1 | `StrictJsonScalarsApiTest.aNonStringForAStringFieldIs400AndWritesNothing`: 10 rows (login `username`/`password`, student create `fullName`/`username`, student PATCH `fullName: 1.5`, preferences `locale`/`displayName`/`timeZone`, settings `displayName`/`defaultLocale`): 400 `MALFORMED_REQUEST`, no session, nothing written; `StrictJsonIntegersConfigurationTest` rows prove `Optional<String>` and record components |
| AC2 | `aNonBooleanRememberMeIs400AndSignsNobodyIn` (`1`, `0`, `2`, `"true"`, `"false"`, `""`, `" "`, `1.0` guard); `aBooleanNullOrAbsentRememberMeKeepsItsMeaning` control |
| AC3 | `LoginBindingThrottleApiTest` (`max-attempts=2`): 3 numeric-password attempts → 400, no audit row, then a correct sign-in 200; T-M2.10 tests unchanged |
| AC4 | `NameRuleApiTest` (146 rows: 20 code points × start/middle/end × both endpoints, first-of-several, accepted, ends, blank) and `NamesTest` (41 rows) |
| AC5 | `web/src/lib/names.test.ts` (69 tests, the AC4 table); form and page tests: `INVALID_CHARACTER` with the code point in vi and en, server-only 422 → `INVALID_FORMAT`, scope 8 (stored U+2028 name: locale-/time-zone-only save sends no `displayName`) |
| AC6 | `settings-workspace.spec.ts`, `settings-account.spec.ts`: "a name with U+200B: the field and the summary name U+200B; nothing is sent", all six projects, `expectSettledAccessible` |
| AC7 | api-conventions §5, validation-rules (both `displayName` rows + a "name rule" row), the customizer's Javadoc; api-catalog login row (DEC-201 (1)) |
| AC8 | no defect outside scope found; OQs ruled in DEC-201 |
| AC9 | gate PASS on `c02ade1` (below); CI on the final head (merge-gate) |

## Red first (L-01)
- BE: on `971c79a` plus the new API tests, 152 of 166 red (all AC1 rows, 7 of 8 AC2 rows with `1.0` the guard, AC3, all 126 refused AC4 rows,
  4 ends and 4 blank rows); green-before rows are the positive controls and guards. Customizer reverted: 13 of 26 unit rows red. Log: `be-red-first.log`.
- FE: new unit/page tests with the implementation stashed: 34 of 71 red in `routes/settings`; scope-8 guard removed: exactly the 4 stored-name
  tests red; E2E stashed: 12 of 12 red (local records under `impl/`).

## Results
- Gate on `c02ade1`: `gate: PASS (13 steps, 1008s)` on its only run; backend 844 tests, 0 failures; web 1043 (79 files); E2E 616 passed /
  68 skipped; ×3 repeat of the changed specs 174 passed / 6 skipped. Log: [gate-2026-11-25.log](gate-2026-11-25.log) (254 lines).
- `7b28649` (test sources only, same strings): `NameRuleApiTest` 146 and `NamesTest` 41 pass.
- `api/openapi.json` unchanged.

## Changed kept assertions (FE; backend: none)
- `workspaceForm.test.ts`: the range-table rows `INVALID_FORMAT` → `INVALID_CHARACTER`; the schema is a factory of the saved name.
- `accountForm.test.ts`: U+0007 `INVALID_FORMAT` → `INVALID_CHARACTER`; an interior U+0009 accepted → `INVALID_CHARACTER` (packet contradiction scan).
- The two page tests and the two E2E 422 tests: the old vi `INVALID_FORMAT` strings → the scope 7 text.

## LC rulings (DEC-201)
- BE OQ-1 fixed (api-catalog); BE OQ-2 resolved by the FE commit; OQ-FE-1 (`@Schema` description) → the T-M2.7 row (S4).
- Raw invisible characters in five test literals → escapes (`7b28649`).

## Not verified
- A real screen reader; WebKit (G5).

## G3 cost
| Agent | Tokens | Duration |
|---|---|---|
| BE implementer | 131,768 | 956 s |
| FE implementer | 129,021 | 1,942 s |
