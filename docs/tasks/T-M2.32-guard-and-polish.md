# T-M2.32: E2E console guard for fresh contexts and the T-M2.31 / T-M2.6 / T-M2.35 polish

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | done (`a43b17b`, DEC-199; G3: QA PASS WITH MINOR, UX APPROVED, DEC-198; PO start 2026-11-25; G0: round 1 CHANGES REQUESTED (S2-1, S3-1..S3-4, S4-1..S4-4), all fixed; delta PASS WITH MINOR, S4-5 fixed, S4-6 already in place; DEC-196) |
| Owner role | FE (one implementer) |
| Branch | `feature/T-M2.32-guard-and-polish` (from `develop`) |
| Depends on | T-M2.31 (`000640e`), T-M2.6 (`160df23`), T-M2.35 (`9ad116b`): all merged |
| Estimate | ≤ 1.5 agent-days |
| Risk tier | **M**: test harness, UI behaviour and one lint check; no endpoint, migration, identity or authz change (quality-gates G3) → one combined QA+UX reviewer |
| Trace | DEC-183 (T-M2.31 OQ-1), DEC-184 (T-M2.31 follow-ups (a), (b)), DEC-176 (1) (React Aria "Dismiss" in vi, reopened), DEC-191 (T-M2.6 QA-4, UX-1r), DEC-194 (T-M2.35 QA-2), DEC-187 (PO order), DEC-196 (packet decisions); FR-SET-02 (the account locale save, (e)), NFR-A11Y-01, NFR-I18N-01, NFR-PERF-03 (bundle budget); lessons L-01, L-03, L-04, L-05, L-10 |

## Goal
Close the gap that let a page crash pass unseen in E2E (pages in a `browser.newContext()` are not guarded), stop React from receiving
an effect's return value by accident, and clear the small UI items left from T-M2.31, T-M2.6 and T-M2.35, before the M2 regression (T-M2.7) runs.

## Scope
- In:
  1. **(a) Console guard for every fresh context.** Export `guardContext(context, problems)` from `e2e/support/fixtures.ts` (the rules of the
     `consoleGuard` fixture: console errors except the anonymous session probe, uncaught page errors, CSP violations; one implementation, used by
     the fixture too) and remove the local copy in `shells.spec.ts:162`. Apply it, with the test's `consoleGuard` list, to every
     `browser.newContext()` in `e2e/tests/` and `e2e/support/students.ts:71,82`: `route-focus.spec.ts`, `students-list.spec.ts`, `auth.spec.ts`,
     `students-account.spec.ts`, `navigation.spec.ts`, `settings-account.spec.ts`, `shells.spec.ts` (all its fresh contexts, not only
     `freshSession`). The `students.ts` helpers (`studentSession`, `trySignIn`) take the guard list, so their callers change too:
     `students-account.spec.ts`, `students-profile.spec.ts`, `settings-account.spec.ts`. `global-setup.ts` is not a test and stays as is.
     A context that expects an error on purpose (a provoked 4xx/5xx the page logs, e.g. `trySignIn`'s 401 through `apiCall`) filters exactly
     that message, as `shells.spec.ts`'s local `accept`/`acceptStatus` helpers (`:61`, `:71`) do, never the whole guard; those helpers may move
     into `fixtures.ts` beside `guardContext` so every spec and `students.ts` uses the same filter (the fixture's own rule stays `isAnonymousSessionProbe`). **Late errors:** the fixture's 500 ms settle
     (`fixtures.ts:84-86`, DEC-058) also runs when a guarded fresh context still has an open page at teardown (`guardContext` registers the
     context with the test's guard, so the fixture checks its pages too).
  2. **(b) No expression-bodied effects.** Give block bodies to the effects whose arrow returns a value React would take as the cleanup:
     `ProfileForm.tsx:71`, `GuardianForm.tsx:239`, `LearningProfileForm.tsx:120`, `CredentialsCard.tsx:39`, `ui/ConfirmDialog.tsx:92`,
     `ui/Toggletip.tsx:55`, `WorkspaceSettingsPage.tsx:133`, `AccountSettingsPage.tsx:86`; `App.tsx:14` returns its cleanup explicitly
     (`{ return connectAuthProblems(…) }`). Add a check to `pnpm lint` that fails on a `useEffect` or `useLayoutEffect` whose arrow has an
     expression body, unless that expression is itself an arrow function (a cleanup, as `AccountSection.tsx:85` and the wrapped
     `ui/Button.tsx:61-62`), one-line and wrapped forms alike (Prettier `printWidth` 120 wraps them). Either a script beside
     `web/scripts/no-lint-directives.sh` that parses the source (not a line grep) or an oxlint `jsPlugins` rule; the implementer names the choice
     (no new dependency either way). A fixture test shows it red on each violating form and green on each allowed one (L-01).
  3. **(c) Tutor drawer at 740×360, logout offline:** Log out with its focus ring and the whole alert text fit in the footer (180.2 px needed,
     179 px today, DEC-183 OQ-1), e.g. a smaller gap in that footer only; 568×320 keeps the AC2o rule (the alert text wins where both cannot fit).
     The stale comment at `shells.spec.ts:1403` ("at 740×360 both fit") is corrected.
  4. **(e) Language switches in order:** the account-locale save of `LanguageSwitcher` (`LanguageSwitcher.tsx:25`) runs its PATCHes one after
     another in click order, so the stored locale is the last one chosen even on a slow network: a TanStack Query mutation `scope`
     (`{ id: 'account-locale' }`) set on the switcher's locale save only (Domain rules). The device choice still wins on that device (DEC-190 (3)).
  5. **(f) React Aria's own strings in vi:** the hidden "Dismiss" buttons of `ui/Popover`, `ui/Sheet`, `ui/Toggletip`, and the `ui/ComboBox`
     announcements ("N options available." and its other strings) are Vietnamese in the vi UI and React Aria's own English in en, switching with
     the UI language without a reload. Mechanism (DEC-196 (2)): `@internationalized/string` reads the global dictionary
     (`window[Symbol.for('react-aria.i18n.strings')]`) **once** and serves it for every locale, so it is installed once, from module code before
     the first render (`main.tsx`, before `createRoot`), and is **one dictionary for both locales**: React Aria's full `en-US` dictionary
     (`react-aria-components/i18n`), so no package is ever missing (the DEC-176 crash trap), where each key we translate is a function
     `(variables, formatter) => formatter.locale.startsWith('vi') ? <vi> : <the en-US value, called if it is a function>`; the formatter's locale
     follows `I18nProvider` (`ui/UiProvider.tsx`). `LocalizedStringProvider` / `getLocalizationScript` are not used (an inline script the CSP
     blocks). A test renders every `ui/` component that uses React Aria strings (`Toast` included) in vi and en without a throw. Only an
     unforeseen failure of this mechanism stops the implementer with an OQ (no reload hack).
- Decided without code (DEC-196):
  6. **(g) `ui/SegmentedControl` keyboard** (T-M2.35 QA-2): kept. Arrow keys move focus, Space/Enter select (React Aria's toolbar model, the
     design-system §3 decision of T-M1.9): selecting on arrow would save the account locale on every arrow press (scope 4). design-system §3's
     existing "Why" (every arrow press would redraw the UI) gains the account-locale save.
  7. **(d) the popover's classic-scrollbar inset** (DEC-183 UX-1): accepted as is; no PO request for `stable both-edges`.

## Out of scope (explicit)
- Any change to what the guard allows (no new exception), to other specs' behaviour, or to the regression workflow. Firefox (DEC-180).
- Other React Aria strings not shown in our UI today; a third locale.
- T-M2.33's items (binding, the shared name character rule, DEC-194).

## Guardrail answers (scope.md §6)
1. Trace: DEC-183, DEC-184, DEC-191, DEC-194 (all recorded follow-ups). 2. Drift toward excluded scope: no. 3. Mandatory set-up: none.
4. Weekly use: every vi screen reader user (f); every tutor switching language (e); every E2E run (a). 5. Hard-coded semantics: none.

## Design notes
- **Contradiction scan (L-03):**
  - (a) can turn kept specs red where a fresh context logs an error today: that is the point (DEC-184). Each newly revealed error is an OQ at once,
    `test.fail` only until the LC rules, and the LC rules before G3 (L-10). Budget: `fixtures.ts` changes, so the gate repeats all specs ×3.
  - (b) no behaviour change: each effect's DOM call returns `undefined` or a value React ignores today (DEC-182); the block bodies make that
    explicit. The two `reset(…)` effects return `void`, the `App.tsx` one a cleanup (kept).
  - (c) kept: `shells.spec.ts:1404` (AC2o: the text wins at 568×320) and `:1349` (Log out and its ring in the footer on a 500); the 740×360 offline
    case moves from "text wins" to "both fit" (the intended change, listed in the summary).
  - (e) kept: `LanguageSwitcher.test.tsx` (PATCH only with a non-must-change session; a 500 keeps the device language) and the E2E in-place
    answer (`answerPreferencesInPlace`); a new case: two switches with the first answer delayed → the server receives them in click order.
  - (f) DEC-176 (1) accepted "Dismiss" in vi because the global override holds one locale and a missing package throws; this packet removes both
    reasons (a full dictionary per locale, swapped with the UI language) or stops with an OQ. The vi dictionary must not push the student's first
    visit past its 200 KB gz budget (NFR-PERF-03; `web-budget` step): load it with the vi strings bundle, not in the shared chunk, if needed.
  - (g) design-system §3 already says "toolbar model on purpose"; QA-2's ARIA radio reading is answered there.
- **Shortcut ledger:** `ui/Toast.tsx` and `ui/toastQueue.ts` (`UNSTABLE_` toast API) and `ui/Button.tsx` (announcer DOM) name a react-aria bump as
  their trigger; this packet bumps nothing. A new shortcut follows the `shortcut:` form.
- **A new check that finds a real defect outside this scope** (L-10): reported at once as an OQ; `test.fail` only until the LC rules, before G3.

## UI rules (fixed at G0, DEC-131 (2))
- (c) footer at 740×360 offline: Log out (≥ 44 px) with its 2 px ring fully inside the footer's padding box and the alert text unclipped (text
  ratio 1); at 568×320 unchanged (AC2o). Only that footer's spacing changes; other viewports and the student popover keep their layout.
- (f) vi strings (React Aria's English → vi): "Dismiss" → "Đóng"; the ComboBox count "N options available." → "Có N lựa chọn."; its other
  announcements and labels in natural Vietnamese, reviewed by QA; en stays React Aria's own.
- (e) no visible change: the switcher shows the clicked language at once, as today.

## Domain rules (scope 4 writes the account locale; fixed at G0, L-04)
- Invariant: the stored account locale is the last language chosen with a signed-in, non-must-change session (FR-SET-02, DEC-190).
- Ordering: the switcher's `mutate` carries `scope: { id: 'account-locale' }`, so TanStack Query's `MutationCache` runs those PATCHes one at a
  time in call order **across every mounted switcher** (two on Settings › Account: `ShellParts.tsx:64` and `AccountSettingsPage.tsx:166`);
  per-component state would not. The scope is set on the switcher's call, not in `useUpdatePreferences` (`session.ts:90-104`), so the Account
  form's display-name save never queues behind locale PATCHes.
- Failure in the queue: a failed PATCH does not stop the next ones (each runs; best effort as today, DEC-190 (3)); the device keeps the chosen
  language, the server keeps the last PATCH that succeeded. No retry, no replay (`networkMode: 'always'` kept).
- Concurrency with other tabs: last write wins per property (DEC-190 (2)); no version. Audit: none. Audience: the account's own session.

## Acceptance criteria
- AC1 (a): `guardContext` is exported from `fixtures.ts` and used by the fixture and every fresh context listed in scope 1 (a grep in the summary
  shows no unguarded `browser.newContext(` in `e2e/tests/` or `e2e/support/students.ts`); self-tests in `guards.spec.ts`, written as expected
  failures like its teardown case (`guards.spec.ts:100-104`), prove that a page error in a fresh guarded context and a late error (300 ms after
  the body) in a fresh guarded context each fail the test; every revealed error is an OQ ruled before G3.
- AC2 (b): the listed effects have block bodies; the lint check fails on fixtures `useEffect(() => el.focus(), [])`, the wrapped
  `useEffect(\n  () => el.focus(),\n  [],\n)` and the same with `useLayoutEffect`, and passes on `useEffect(() => () => close(), [])`, the wrapped
  cleanup form of `ui/Button.tsx:61-62` and a block body; `pnpm lint` green on the tree.
- AC3 (c): E2E at 740×360 offline (vi, en) asserts explicitly that the room needed (Log out, its ring, the alert text) ≤ the room available,
  seen red before the CSS change (the kept AC2o test adapts to the space it finds, so it passes either way); 568×320 AC2o unchanged.
- AC4 (e): unit tests: two switches with the first PATCH answered late → the second is sent only after the first settles, the last choice is
  stored; the same across two mounted switchers; a failed first PATCH → the second still runs; a display-name save is not queued behind them;
  the kept switcher tests pass.
- AC5 (f): in vi, the hidden dismiss buttons of Popover, Sheet and Toggletip are named "Đóng" and the ComboBox count announcement is Vietnamese;
  in en React Aria's English; a vi → en → vi switch without reload follows; every React Aria `ui/` component renders in both locales without a
  throw; the bundle budget holds.
- AC6: design-system §3's SegmentedControl "Why" adds the account-locale save (g); no SegmentedControl code change.
- AC7: `./scripts/gate.sh` green (all specs ×3); CI green on the final head; axe clean where (c) and (f) change the DOM, at 360/768/1280.

## Test plan
- E2E: the `guardContext` self-tests (`guards.spec.ts`: page error and late error in a fresh context); all specs with guarded fresh contexts; the 740×360 offline drawer case (`shells.spec.ts`).
- Unit: the lint fixture test; `LanguageSwitcher.test.tsx` ordering case; a `ui/` i18n test (each React Aria component in vi and en; the
  dismiss names; the ComboBox announcement text; the runtime switch).
- **Independent QA focus:** a screen reader-style check of the vi names (accessible names in the a11y tree) for the drawer, account popover,
  Toggletip and ComboBox; a switch vi ↔ en mid-session; rapid language switches with a throttled network (the stored locale after reload);
  the tutor drawer at 740×360 and 568×320 offline; one spec run with a deliberately crashing fresh context to see the guard fail (then removed);
  no new console error anywhere in the suite.

## Evidence required
- `evidence/T-M2.32/summary.md`: AC → proof, the unguarded-context grep, revealed errors and their rulings, the self-check list, the G3 cost table.
- One gate log on the final head (trimmed ≤ 300 lines, every `gate:` line), green CI.
- Local screenshots (not committed, DEC-131): `impl/<viewport>-drawer-offline.png` at 740×360 and 568×320; `impl/<viewport>-combobox-vi.png`.
- G3 (tier M): `evidence/T-M2.32/qa/report.md` (one combined QA+UX reviewer).

## Docs to update
- `docs/05-frontend/design-system.md` (§3 SegmentedControl "Why" gains the locale save; the React Aria vi dictionary in `ui/`).
- `docs/06-quality/test-strategy.md`: one line on the E2E console guard covering fresh contexts (no doc describes the guard today; `fixtures.ts`'s comment is updated too).
- `docs/05-frontend/frontend-architecture.md` only if the vi dictionary changes a chunk.

## Risks & assumptions
- Risk: (a) reveals several real errors and grows the task; each is an OQ, and a large set splits into its own row (LC rules).
- Risk: (f) relies on `@internationalized/string` calling function strings with the formatter (`LocalizedStringFormatter`); a React Aria bump
  that changes this breaks the vi strings: the dictionary module carries a `shortcut:` comment naming that trigger.
- No regression run in this packet (cap 0; T-M2.7's G5 covers it).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
cd web && pnpm lint && pnpm test --run && cd ..
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop tests/shells.spec.ts
./scripts/gate.sh
```

## Status transitions (mirrored in progress.json)
draft → ready (G0 PASS) → in_progress (PO start signal) → in_review → qa → awaiting_approval → done.
