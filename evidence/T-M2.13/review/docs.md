# Docs review — T-M2.13 packet (G0)

> Recorded by the LC from the reviewer's returned text (DEC-131). One fresh docs-reviewer. Cost: round 1 (full) 104,400 tokens / 6.0 min
> (359.8 s, on `7738687`); round 2 (delta) 11,890 tokens / 0.8 min (51.0 s, on `435a723`; cumulative 116,290). Round 1: S2 D-1 and S4
> D-2..D-10 fixed in `435a723`. Round 2: S4 N-1 and N-2 fixed by the LC in the G0 records commit.

## Round 1 (full)

DOCS-REVIEW T-M2.13: CHANGES REQUESTED

`./scripts/check-docs.sh`: PASS (274 markdown files). One S2 (D-1) blocks G0; the rest are S4.

**What held:** scope matches the backlog row exactly (UX-3, UX-4, O-1/O-2, UX-6), out of scope explicit; the changed kept assertions (a)–(e)
exist at the cited places (`guards.test.tsx:116`, `sessionSync.test.tsx:240-254`, `sessionBoundaries.test.tsx:45-46`,
`RouteError.test.tsx:186-196`, `navigation.spec.ts:29-50` and `:438`, `shells.test.tsx:522`), and the grep found no other kept unit, E2E or
`qa/` assertion that breaks; the AC5 Back step holds; `networkMode: 'always'` is valid on a mutation and a fetch error maps to
`ApiError(0, 'NETWORK_ERROR')`; `isOffline` exists (`chunkError.ts:9`); `blocksNavigation` lets `/login` through; `loginPath('/change-password')`
returns `/login`; tier M is justified (T-M2.12 SEC asked for this fix; no DEC-131 (4) H trigger is touched); DEC-155, the backlog row and
`progress.json` agree.

| ID | Severity | Where | Finding | Fix (LC, `435a723`) |
|---|---|---|---|---|
| D-1 | S2 | packet scope 2; `guards.ts:103-104, 113-117, 133-136` | The notice decision races the 401 path: `resync` drops and resets first, so a mounted authenticated query (e.g. `/tutor/students`) refetches, answers 401, and the `UNAUTHENTICATED` handler navigates to `/login?next=` without the flag; AC2 would pass on `/tutor/today` only | Scope 2 steps (i)–(iii): read the session before dropping; on signed-in → anonymous clear the caches without a reset, set the session to `null`, navigate with the flag; the 401 handler stands down; a unit case with a mounted 401 query, an E2E and QA step on `/tutor/students`; kept `sessionSync.test.tsx:112` checked |
| D-2 | S4 | scope 3 (d); `ShellParts.tsx:56`, `ChangePasswordPage.tsx:41`, `lib/i18n/index.ts:57-58` | `logout.*` in `common` but the callers use `shell` / `auth`; no fallback namespace | One shared `features/auth/components/LogoutFailedAlert.tsx` reading `common` |
| D-3 | S4 | AC3 | "fresh tutor sign-in" vs the student's More sheet | Tutor drawer at phone-small, popover at laptop; the More sheet by a component test |
| D-4 | S4 | scope 1, AC1 | No mechanism for "the trigger stops rendering a box"; React Aria returns focus to a `display: none` trigger | A `ResizeObserver` on the trigger; on 0 × 0 close and focus Retry explicitly |
| D-5 | S4 | Docs to update; `security.md:43` | T19 still says the mutation cache is cleared at sign-out "(also a failed call)" | Drop that clause; add the rule; ux-flows Log out note |
| D-6 | S4 | scope 3 (c) | The global auth-problem reactions still apply to a 401/403 from `POST /auth/logout` | One sentence added |
| D-7 | S4 | UI rules copy | en "You signed out in another tab." is wrong for the must-change logout | "You were signed out in another tab." |
| D-8 | S4 | scope 2, AC2 | A `role="status"` filled at mount is often not announced | The intended result is stated (read after the `h1`); the reviewer confirms it in the screen-reader walk |
| D-9 | S4 | AC5 | "kept E2E AC2/AC3" collides with this packet's AC numbers | The two `navigation.spec.ts` tests named |
| D-10 | S4 | Commands | `CONTAINER_HOST` needed on this device only in `progress.json` | Export added to the Commands block |

## Round 2 (delta, `435a723`)

DOCS-REVIEW T-M2.13: PASS WITH MINOR

D-1..D-10 closed. D-1: steps (i)–(iii) can be built in `guards.ts` (`resync` runs inside `serially`; the `onAuthProblem` listener and
`resync` share the `connectAuthProblems` closure, so a local flag lets the `UNAUTHENTICATED` branch return early, as on `/login`);
`getQueryCache().clear()` makes no observer refetch, and `setQueryData(SESSION_KEY, null)` leaves exactly `[SESSION_KEY] → null`, as the
kept `sessionSync.test.tsx:112-127` expects; `:129-137` holds too.

| ID | Severity | Where | Finding | Fix (LC, G0 records commit) |
|---|---|---|---|---|
| N-1 | S4 | scope 2 | The stand-down window covered only step (ii): an in-flight 401 during the step (i) read, or a mounted query refetching after the clear while `/login`'s loader runs, could still navigate | The handler stands down from the start of a `signed-out` resync until its navigation has settled |
| N-2 | S4 | DEC-155 (2) | Still says a "polite" notice | "an info notice (`role="status"`, read after the `h1`)" |
