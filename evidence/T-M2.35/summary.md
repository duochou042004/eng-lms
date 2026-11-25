# T-M2.35 summary: workspace settings v1 and Settings › Workspace (FR-SET-01, first section)

Branch `feature/T-M2.35-workspace-settings` (from `develop` @ `ed5dd62`). Packet: [T-M2.35](../../docs/tasks/T-M2.35-workspace-settings.md),
DEC-193. PO start signal 2026-11-25 (the `/goal`). Risk tier **H**: SEC agent, then QA with the UX checklist (G3 pending).

## Commits
- `02fca22` chore(progress): T-M2.35 in progress (LC)
- `2209fca` feat(settings): workspace settings store and GET/PATCH /tutor/settings (BE implementer)
- `70829e5` docs(settings): the workspace settings store, API and rules as built (BE implementer)
- `73a2504` feat(settings): Settings › Workspace tab, redirect and the Account Language label (FE implementer)
- `e97ff85` docs(settings): Settings as built with the Workspace tab; traceability row 41 (FE implementer)
- `0d4eed9` chore(evidence): gate log on the FE head (FE implementer)

## AC → proof (from the implementers' reports; verified by G3)
| AC | Proof |
|---|---|
| AC1 | `WorkspaceSettingsApiIntegrationTest`: `theTutorReadsTheSeededSettings`, `aPatchReturnsVersionPlusOneAndGetAndMetaShowTheNewName`, the `ok(...)` rows of `appliesTheDomainRulesTable` (each property alone and together; `updated_by`, `updated_at` from the clock) |
| AC2 | `appliesTheDomainRulesTable` (37 rows: each property valid, invalid, `null`, absent; empty body; missing, `null`, negative version; one 422 with every problem; 422 before 409; nothing saved); `aSameValuesPatchWritesNothingButAnExplicitConfiguredNameIsStored`; `aStaleVersionIs409EvenWithUnchangedValuesAndNothingIsSaved`; `wrongJsonTypesAre400`; `aMissingWorkspaceRowIsA500AndIsNeverInserted`; `FlywayMigrationTest.seedsTheWorkspaceSettingsRow` |
| AC3 | `studentIs403MustChangeIs403AnonymousIs401AndNoCsrfIs403` (`/meta` stays public); `PolicyRegistry` entries for both operations (AuthzMatrixTest 90, IsolationTest 23, secret scan over both responses) |
| AC4 | `twoConcurrentSameVersionPatchesGiveOne200AndOne409` (5 rounds; version +1 once; the winner's values stored) |
| AC5 | `newStudentAccountsTakeTheDefaultsAndExistingAccountsKeepTheirs` (`en` / `Pacific/Kiritimati`; the earlier student and the tutor unchanged); `AccountServiceTest.aNewStudentAccountTakesTheWorkspaceDefaults`; `ModularityTests` with `identity → settings` |
| AC6 | `WorkspaceSettingsPage.test.tsx` (redirect, tabs Workspace, Account, current tab, title, axe); `settings-workspace.spec.ts` (Settings item → Workspace in ≤ 2 steps, h1 focus, `ac6-settings-steps`) |
| AC7 | `WorkspaceSettingsPage.test.tsx` and `workspaceForm.test.ts` (changed-only body with `version`, Save disabled while unchanged, toast and focus on Save, the meta cache's `displayName` only, client and server 422 with the summary focused, the 409 dialog after a direct load, Reload / Keep editing focus, 500 and offline `InlineAlert` without replay, edits during a pending save kept, the guard, en, loading and load error); E2E request bodies, 422 (click and Enter), 409, ComboBox keyboard. Seen red: the meta-cache update removed; the Keep-editing refocus removed |
| AC8 | `AccountSettingsPage.test.tsx` (visible "Ngôn ngữ" names the group via `aria-labelledby`); `SegmentedControl.test.tsx` `labelVisible`; `settings-account.spec.ts` (label above the group) |
| AC9 | all E2E at phone-small, tablet, laptop with `expectSettledAccessible` (default, 422, conflict, ComboBox open with only the DEC-191 rule off); a 120-character name with `expectNoMidWordBreak`; gate PASS; CI pending |

## Results
- Gate on `e97ff85` (the last code commit): `gate: PASS (13 steps, 1732s)`; backend 621 tests; web 933 (76 files); E2E 608 passed;
  the ×3 repeat (all 19 specs, `global-setup.ts` changed) 1824 passed, 0 flaky. Log: [gate-2026-11-25.log](gate-2026-11-25.log) (102 lines, every `gate:` line).
- Contract drift OK (`api/openapi.json`, `schema.d.ts` regenerated).

## Changed kept assertions (the redirect, DEC-193 (8); not weakened)
- `AccountSettingsPage.test.tsx` AC5: opens `/tutor/settings/account` directly; the redirect check moved to `WorkspaceSettingsPage.test.tsx`.
- `settings-account.spec.ts`: the Settings item lands on Workspace, then **one click on "Tài khoản"**; the step counter and its record moved to
  `settings-workspace.spec.ts` (`ac5-settings-steps` → `ac6-settings-steps`); the keyboard test tabs through "Không gian làm việc" to "Tài khoản".

## E2E isolation (scope 9)
`global-setup.ts` GETs the settings and PATCHes only `{version, defaultLocale: 'vi', defaultTimeZone: 'Asia/Ho_Chi_Minh'}` after the tutor's
preferences reset and before the shared student; it never writes the name and fails setup on a non-200. `settings-workspace.spec.ts` answers its
requests in the page.

## LC rulings before G3 (L-10)
All accepted (no OQ, no `test.fail`):
- BE (1) `MetaControllerTest` is a `@SpringBootTest`, not a slice: no `@MockitoBean`; the seeded row gives "Eng-LMS" (packet text was wrong).
- BE (2) settings reads the tutor's ID from `Principal#getName()` (no `settings → identity` edge).
- BE (3) a test-only `SettingsWorldContributor` resets the seed row per matrix/isolation world; the matrix PATCH sample is a same-values PATCH.
- BE (4) the must-change test uses the tutor (a must-change student hits `FORBIDDEN_ROLE` first); the matrix keeps its student actor (403).
- BE (5) control characters are checked before the strip ("Lan\n" → `INVALID_FORMAT`; stricter for a public label; validation-rules says so).
- FE (1) the label reads "Tên không gian làm việc (bắt buộc)" (design-system required suffix).
- FE (2) an `INVALID_VALUE` on `defaultLocale` or a `version` error shows as a generic summary line (the control cannot send a bad locale).
- FE (3) no refetch on window focus: an open form keeps its version, so another tab's save shows the 409 dialog.
- FE (4) the time-zone hint and ComboBox labels reuse the Account tab's `account.*` strings.
- FE new `ui/SegmentedControl` prop `labelVisible` (design-system and `/dev/ui` updated) for AC8.

## G3 (tier H)
Pending: one fresh SEC agent, then one fresh QA agent with the UX checklist.

## Not verified
- The concurrent test does not force which 409 path fires (the explicit compare or the `@Version` flush); both map to `STALE_VERSION`.
- CI on the final head (pending); a manual keyboard-only walk beyond the E2E keyboard steps (QA focus).

## G3 cost
| Agent | Tokens | Duration |
|---|---|---|
| BE implementer | 152,460 | 1,418 s |
| FE implementer | 186,314 | 2,846 s |
