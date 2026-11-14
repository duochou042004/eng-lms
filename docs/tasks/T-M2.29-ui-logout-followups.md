# T-M2.29: UI follow-ups from T-M2.13 and the own-logout race

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready (G0 PASS, DEC-176; waits for the PO start signal) |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.29-ui-logout-followups` (from `develop`) |
| Depends on | T-M2.13 (`e3ce22c`), T-M2.28 (`a1bcf12`): merged |
| Estimate | 1–1.5 agent-days |
| Risk tier | **M**: UI and client behaviour (`ui/Sheet`, `LogoutFailedAlert`, the logout navigation and the API client's 401 reaction). No endpoint, DTO, migration, CSP, cookie or server session change, so no SEC trigger (as T-M2.13, DEC-155). G3 = **one combined QA+UX `qa-evaluator`** with `QA-VERDICT` and `UX-REVIEW` (a `feature/` branch merges on `QA-VERDICT T-M2.29: PASS` or `PASS WITH MINOR`) |
| Trace | DEC-172 (T-M2.13 G3: UX-1 S3, UX-2 S4, QA-1 S4 / OQ T-M2.13-1), DEC-173 (split from T-M2.28), DEC-174 (3) (OQ T-M2.28-1 → (j)), DEC-176 ((i) accepted as is, G0); FR-AUTH-04 (log out); design-system §3 (`ui/Sheet`); interaction-states §1; accessibility.md §2; frontend-architecture §2 (auth-problem reactions); lessons L-01, L-03, L-05, L-10; backlog row T-M2.29 |

## Goal
Close the two UI gaps T-M2.13's review found and the logout race T-M2.28 diagnosed: the logout failure alert is fully readable in the
tutor drawer on a phone held sideways and is on screen on the forced change-password page, and after the user's own Log out they always land on `/login`, never on `/login?next=<page>`.

## Scope
- In:
  - **(h1) UX-1 (S3):** the `ui/Sheet` footer cannot scroll, so at 740×360 the tutor drawer's logout failure alert shows only its title
    (`web/src/ui/Sheet.module.css` `.footer`, rendered by `ShellParts.tsx:75`; the sheet is 429 px in a 360 px window). Fix in `ui/Sheet` so
    a footer taller than its share scrolls while the body keeps its own scroll; the sheet stays inside the
    viewport. One shared fix for every `ui/Sheet` (drawer and bottom sheet).
  - **(h2) UX-2 (S4):** on the forced change-password page at 360×740 the logout failure alert renders below the fold (`ChangePasswordPage.tsx:218`).
    Fix: `LogoutFailedAlert` scrolls itself into view on mount with `scrollIntoView({ block: 'nearest' })`, without moving focus (focus stays on
    Log out). In the drawer at short heights it scrolls the footer (UI rules); elsewhere where the alert is visible `nearest` does nothing.
  - **(i) OQ T-M2.13-1 (S4): ruled "accept as is" (DEC-176), no change here.** React Aria 3.52.1 ships no `vi` strings for
    `@react-aria/overlays`, so the visually hidden dismiss buttons of `ui/Toggletip`, `ui/Popover` and `ui/Sheet` (`isDismissable`,
    `Sheet.tsx:33`) are named "Dismiss" in vi. Its only global override (`window[Symbol.for('react-aria.i18n.strings')]`, read by
    `@internationalized/string`) holds one locale per package and makes every package left out throw at render (`ui/Toast` needs
    `@react-aria/toast`), so it would put a crash trap on every future React Aria component for a screen-reader-only English word (G0 S2-1).
  - **(j) OQ T-M2.28-1 (DEC-174 (3)):** after one's own Log out the user can land on `/login?next=<page>`. Order on today's code
    (`evidence/T-M2.28/summary.md` AC7): `useLogout` clears the query cache (`web/src/features/auth/api/session.ts:97`), then
    `await navigate('/login')` (`:100`); while `/login` loads, the current route's enabled queries (on Add student:
    `features/students/api/students.ts:58`, `:69`) refetch, their 401 raises UNAUTHENTICATED (`lib/api/client.ts:65-66`), and
    `connectAuthProblems` (`web/src/app/guards.ts:126-130`) navigates to `loginPath(pathname + search)` before `/login` commits. Fix the
    order so that the user's own successful logout always ends on `/login` (no `next`), for any route and any number of in-flight 401s,
    while a real session loss (a 401 with no logout in flight) still goes to `/login?next=<path>` and the cross-tab `signed-out` path is unchanged.
    The mechanism is the implementer's (for example an "own logout in flight" signal that the UNAUTHENTICATED reaction honours, as it
    already honours `followingSignOut`), within these rules:
    1. The signal starts in `useLogout`'s `onSuccess` (after `POST /auth/logout` succeeded), before the first cache clear; never in
       `mutationFn`, `onMutate` or the shared `logout()`: a logout answered 401 (the session had already expired) is a real session loss and
       still goes to `/login?next=<path>` through the normal reaction.
    2. While the signal is on, the UNAUTHENTICATED reaction does nothing (no navigation and no further clear: a second clear re-renders,
       refetches and 401s again until `/login` commits).
    3. The signal ends when the logout's navigation settles (`try`/`finally`, so also on a failed or interrupted navigation); then
       `useLogout` removes the queries left by the race (`removeQueries` on everything but the session, as `useLogin` does at
       `session.ts:65`), so nothing of the earlier session stays in the cache.
    4. Both caches are still cleared on success; a failed logout changes nothing (DEC-155); the FORBIDDEN_ROLE and forced-change
       reactions and the cross-tab `signed-out` path (`followingSignOut`; a `BroadcastChannel` never receives its own tab's message) are unchanged.
## Out of scope (explicit)
- Any server, cookie, CSP or session-lifetime change; React Aria strings (the (i) ruling, DEC-176); a `react-aria` or `react` bump (Dependabot
  #135, #165 stay held); the drawer's RTL shortcut; T-M2.30; new UI components beyond `ui/` changes named here.

## Guardrail answers (scope.md §6)
1. **Trace:** backlog row T-M2.29 (DEC-172, DEC-173, DEC-174). 2. **Drift toward excluded scope?** No: fixes of existing screens. 3. **Mandatory
setup added?** None. 4. **Weekly use?** Log out and the shells, every session. 5. **Hard-coded semantics?** None.

## Design notes
- **Files:** `web/src/ui/Sheet.module.css` and `Sheet.test.tsx`; `web/src/features/auth/components/LogoutFailedAlert.tsx` (+ test);
  `web/src/features/auth/api/session.ts` and/or `web/src/app/guards.ts` (+ `guards.test.tsx`, `sessionSync.test.tsx` or a new test);
  E2E in the existing specs (`e2e/tests/shells.spec.ts`, `navigation.spec.ts` or `students-list.spec.ts`); no new spec file unless needed.
- **Contradiction scan (L-03):** kept assertions that must still hold: `Sheet.test.tsx` (focus containment order heading → link → Close →
  footer; the footer below the body, `:59-71`); `web/src/features/auth/api/session.test.tsx:39` ("Logout: the whole cache is forgotten (useLogout)"); `sessionBoundaries.test.tsx` "sign-out,
  the call answered 204" (≈ line 43); `guards.test.tsx:103` (after logout, Back goes to `/login?next=%2Ftutor%2Ftoday`) and
  `sessionSync.test.tsx:345` (no notice after this tab's own logout), which bound where the (j) signal ends;
  `navigation.spec.ts:354` (log out in tab B: tab A goes to `/login?next=%2Ftutor%2Ftoday`, the cross-tab path, AC5 of T-M2.12);
  `students-list.spec.ts:207` "sign-out never asks" (expects `/login`); T-M2.13's logout-failure tests (alert, no navigation, focus on
  Log out). None changes; (j) makes `:207` deterministic. The guard's comment block (`guards.ts:95-108`) is updated to name the new rule.
- **Shortcut ledger (L-12):** none fires; the `ui/Sheet.module.css:37` RTL shortcut is untouched.

## UI rules
- **Sheet (h1), one rule:** `.footer { max-block-size: 50%; overflow-y: auto }` (or the same with a `dvh` cap if the implementer shows the
  percentage fails); the header and body keep their structure (the body keeps its own scroll). The percentage works in the drawer
  (`block-size: 100dvh`); no bottom sheet has a footer today (`StudentShell.tsx:58` puts the account section in the body), so the bottom
  sheet is only checked for not regressing. The logout alert's title and text are both reachable by scroll at 740×360 and 568×320 (the
  sideways `phone-small`), the sheet stays within the viewport, no horizontal scroll.
- **Alert (h2):** `LogoutFailedAlert` calls `scrollIntoView?.({ block: 'nearest' })` on mount (the optional call, as `StudentsListPage.tsx:309`
  and `Toast.tsx:121`: jsdom has no `scrollIntoView`); in the drawer at short heights this scrolls the footer (wanted); elsewhere where the
  alert is visible it does nothing.
- **Focus:** no focus move from (h2) or (j); after a failed logout focus stays on Log out (as today); after a successful one `/login`'s own
  focus rule applies (route focus, T-M1.9).
- **Copy:** no string changes.
- **Layering:** unchanged (alerts inside the sheet or popover; no toast).

## Acceptance criteria
- AC1 ((h1)): at 740×360 and 568×320, tutor drawer, logout answered 500: the whole `LogoutFailedAlert` (title and text) can be scrolled into
  view inside the sheet, the sheet stays within the viewport, no horizontal scroll; seen failing first on today's `ui/Sheet` (L-01). The
  student More sheet at 568×320 does not regress (all of its content reachable). `Sheet.test.tsx`'s kept assertions pass.
- AC2 ((h2)): at 360×740 on the forced change-password page, logout answered 500: the alert is within the viewport (polling read, L-05) and
  focus is still on Log out; seen failing first. In the popover, drawer and More sheet the alert's appearance does not scroll the page.
- AC3 ((j)): after one's own successful Log out from a page whose mounted, enabled queries answer 401 before `/login` commits, the URL is
  exactly `/login` (no `next`) and no "signed out in another tab" notice shows. Proven by a deterministic test that holds the race open (a unit
  test with a held navigation or a held session read, or an E2E with the session read held as in `evidence/T-M2.28/f-diag-held-session.log`),
  seen failing first on today's code; plus `students-list.spec.ts` "sign-out never asks" `--repeat-each=50 --retries=0` on laptop: 50/50.
- AC4 ((j) kept behaviour): a 401 with no own logout in flight still goes to `/login?next=<path>` (existing guard tests), and so does a
  logout whose `POST /auth/logout` is answered 401 (new case); while the signal is on a second 401 neither navigates nor clears again (new
  case); after the navigation settles no query but the session is in the cache; the cross-tab
  `signed-out` path (`navigation.spec.ts:354`) and its notice are unchanged; on success both caches are cleared and no query of the earlier
  session is in the cache after `/login` loads (`sessionBoundaries.test.tsx` kept, plus one assertion for a 401 during the logout); a failed
  logout clears, posts and navigates nothing (T-M2.13 tests kept).
- AC5: axe clean and no mid-word break (`expectNoMidWordBreak`) in each changed state at 360 vi; vi + en; screenshots at phone-small, tablet,
  laptop and 740×360 kept locally (not committed).
- AC6: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept.

**When a new check finds a real defect** outside this packet's allowed change (L-10): the implementer reports it at once as an OQ,
`test.fail` only until the LC rules, and the LC rules before G3.

## Test plan
- Implementation: `Sheet.test.tsx` (the footer's overflow rule; jsdom cannot measure, so the layout proof is the E2E),
  `LogoutFailedAlert` test (`scrollIntoView` called with `{ block: 'nearest' }`, focus unchanged), a guard/logout race test (AC3) and the
  kept-behaviour tests (AC4); E2E at 740×360, 568×320 and 360×740 for AC1/AC2 (custom viewports in the
  existing specs, `page.setViewportSize`), the AC3 ×50; the mandatory three projects in the gate.
- Independent QA focus (combined QA+UX): short heights (740×360, 568×320) in both shells with the logout failing; the forced change-password
  page at 360×740; own logout from `/tutor/students/new` with a
  filled name ×20 and from the other shells' pages; cross-tab logout and a server-side session loss still landing on `/login?next=`.

## Evidence required
- `evidence/T-M2.29/summary.md` (recorded by the LC from the implementer's text, L-07): AC → proof, each failing-first observation, the
  frontend-standards self-check list and the G3 cost table; one gate log on the final head (trimmed) + green CI; local screenshots (not
  committed); the QA report on `qa/T-M2.29`, the UX record in `review/ux.md` on the records branch.

## Docs to update
- `docs/05-frontend/design-system.md` §3 `ui/Sheet` entry (≈ lines 104-105): add the footer rule; `docs/05-frontend/frontend-architecture.md` §2
  (the auth-problem reactions: own logout in flight); backlog (LC at merge).

## Risks & assumptions
- (j) must not turn a real session loss during a logout into a silent `/login`: rule 1 above (the signal starts only after a successful POST).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
pnpm --dir web test --run src/ui src/features/auth src/app
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop tests/shells.spec.ts tests/navigation.spec.ts tests/students-list.spec.ts
./scripts/e2e-run.sh --project=laptop --repeat-each=50 --retries=0 -g 'sign-out never asks' tests/students-list.spec.ts
ENGLMS_TASK=T-M2.29 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.29-ui-logout-followups
```
