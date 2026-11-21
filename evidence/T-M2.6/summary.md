# T-M2.6 summary: account preferences and Settings › Account (FR-SET-02)

Branch `feature/T-M2.6-account-preferences` (from `develop` @ `c92928f`). Packet: [T-M2.6](../../docs/tasks/T-M2.6-account-preferences.md),
DEC-190. PO start signal 2026-11-21 (split kept). Risk tier **H**: SEC agent, then QA with the UX checklist (G3 pending).

## Commits
- `8ed479c` chore(progress): T-M2.6 in progress (LC)
- `ad5a8a4` feat(identity): PATCH /auth/preferences (BE implementer)
- `4c40d01` feat(settings): Settings › Account, ui/ComboBox, the switcher saving the account locale, dates in the account zone (FE implementer)
- `ec54e39` test(e2e): settings-account spec; shared accounts isolated from the preferences save
- `ec082d2` docs(frontend): Settings as built, ComboBox, language and time-zone sources; lib/time shortcut retired

## AC → proof (from the implementers' reports; verified by G3)
| AC | Proof |
|---|---|
| AC1 | `PreferencesApiIntegrationTest`: each property alone and together → DB row, PATCH body and a following `GET /auth/session`; body exactly the 7 session properties; repeated PATCH a no-op |
| AC2 | `appliesTheDomainRulesTable` (25 rows: 200 rows incl. a mass-assignment body; 422 rows `INVALID_VALUE`, `REQUIRED`, `TOO_LONG`, `INVALID_FORMAT`, student `displayName`), each 422 row checks nothing was saved |
| AC3 | anonymous 401, CSRF 403 `CSRF_INVALID`, must-change 403 `PASSWORD_CHANGE_REQUIRED`, disabled 401; `PolicyRegistry` entry (AuthzMatrixTest 82 cases, IsolationTest 21); `onePatchNeverChangesAnotherAccount` |
| AC4 | `twoConcurrentPatchesOfDifferentPropertiesBothPersist` (10 rounds); red when the row lock is removed (`findById`), reverted |
| AC5 | unit (nav, redirect, `aria-current`, title, axe, drawer focus) + E2E ×3 viewports (≤ 2 steps, route focus, redirect, Tab order) |
| AC6 | unit (changed-only body, trim, empty → `null`, toast, focus, 422 summary + fields, InlineAlert with retry, guard, cross-tab focus refetch) + E2E (request bodies, 422, guard, long name in the drawer, axe) |
| AC7 | `ComboBox.test` (keyboard, accent/case filter, `aria-activedescendant`, Escape, ≤ 50 of 600 rendered, axe), DevUiPage story; E2E Chromium phone-small long-task record `[]` while typing "ho" (observer first proven on a 250 ms task) |
| AC8 | `LanguageSwitcher.test` (PATCH only with a non-must-change session; a 500 keeps the device language, no `console.error`; no stored choice → session locale; stored choice wins) + E2E (fresh student real save, must-change sends nothing, the in-place helper's self-test) |
| AC9 | `lib/time` and `credentialsMessage` tests (Kiritimati, Honolulu, Ho Chi Minh, UTC); E2E "Ngày thêm" 22/11/2026 (Kiritimati) vs 21/11/2026 (Honolulu) on 3 projects |
| AC10 | `expectSettledAccessible` + `expectNoHorizontalScroll` at 360/768/1280 (default, 422, combobox open, long name); gate PASS; CI: pending on the PR |

## Results
- Gate on `ec082d2`: `gate: PASS (13 steps, 1469s)`; backend 565 tests; E2E 575 passed, 64 skipped; the ×3 repeat (fixture change) 1725 passed,
  192 skipped, 0 failed. Log: [gate.log](gate.log) (110 lines, every `gate:` line).
- Web unit: 891 passed (74 files), also under `TZ=UTC` and `TZ=Pacific/Kiritimati`.
- Bundle: the student's first visit 193.9 KB gz (budget 200 KB); `ComboBox` is imported from `ui/ComboBox`, not the barrel (225.6 KB with it).

## Changed kept assertions (zone made explicit, values literal; not weakened)
`StudentWorkspacePage.test.tsx` (`'Asia/Ho_Chi_Minh'`, `'01/10/2026'`), `AddStudentPage.test.tsx` and `credentialsMessage.test.ts`
(`'Asia/Ho_Chi_Minh'`, `'10:00, 23/10/2026'`). `AccountServiceTest`: constructor argument only.

## E2E isolation (scope 7a)
`global-setup.ts` stores `englms.locale = 'vi'` in both storage states and resets the tutor's preferences; `fixtures.ts` answers the preferences PATCH
in place by default (opt-in `realPreferences`); fresh-context helper `answerPreferencesInPlace` in `shells.spec.ts` (`freshSession`) and
`route-focus.spec.ts` (step-budget test). `settings-account.spec.ts` answers the shared tutor's session/PATCH in the page (deviation 1).

## LC rulings before G3 (L-10)
- BE OQ-1: the short row lock (`findForUpdateById`, as every `user_account` writer) is kept; DEC-190's "no version" means no client-sent version.
- BE OQ-2: exact locale/zone match (no trim), a student's `displayName` (even `null`) → `INVALID_VALUE`, one 422 with every problem: confirmed.
- FE deviations accepted: (1) the shared tutor is never written for real in the spec (parallel projects raced; real path covered by the
  global-setup reset, the fresh-student save and the BE tests); (2) ComboBox virtualised, not capped; (3) outside the `ui` barrel (bundle budget);
  (4) Save `aria-disabled`, not `disabled` (focus stays on Save); (5) the tab list is a horizontal `NavList` that wraps; (6) pages in
  `app/routes/settings` (cross-feature import rule); (7) session re-read on arrival and focus, client errors focus the summary, the ComboBox
  opens above the field on phone and tablet.
- FE OQ-1 (`shells.spec.ts:1032` phone-small, login 403 once, not reproduced ×2 and in the gate ×3): watched in CI and QA; a recurrence gets its own OQ.
- FE OQ-2 (the Language row has only the switcher's `aria-label`, no visible label): for the UX checklist at G3.
- QA note: Chromium's `Intl.supportedValuesOf('timeZone')` lists `Asia/Saigon`, not `Asia/Ho_Chi_Minh` or `UTC`; the current value is always an option.

## Not verified yet
CI, WebKit (CI smoke), screen readers, real two-tab editing against the server. G3 reviews and their cost table follow.

## G3 cost
| Round | Reviewer | Head | Verdict | Findings | Tokens | Duration |
|---|---|---|---|---|---|---|
| (pending) | | | | | | |

Implementers: BE 104,372 tokens / 603 s; FE 368,520 tokens / 4,061 s (from the Agent results).
