# SEC-REVIEW T-M2.14 (PR #108; rounds 1–2; final APPROVED at `d1e5fbd`)

Fresh security-reviewer subagent (resumed for round 2); recorded by the LC from the reviewer's returned text (the reviewer writes no files).

| Round | Head | Verdict | Findings → outcome |
|---|---|---|---|
| 1 | `982bb71` | APPROVED | S3 S-1 (a write answered after sign-out re-seeds the cleared query cache), S4 S-2 (a toast queued after sign-out shows next session) → AC12 (j), (k) (DEC-126) |
| 2 | `d1e5fbd` | **APPROVED** | S-1, S-2 fixed and tested; no regressions in the toast/modal changes. Residual (no finding): a write answer slower than the whole next sign-in → backlog note on T-M2.15 (DEC-127) |

## Round 2

SEC-REVIEW T-M2.14: APPROVED

Round 2 on head `d1e5fbd`. Both round-1 findings are fixed and tested, and the new diff introduces no security or privacy regressions. The diff since `982bb71` changes no backend or API files. I ran `npx vitest run src/ui src/features/students src/features/auth src/app/guards.test.tsx`: 42 files and 414 tests, all green. I wrote no files and posted no comments, and `git status` is clean.

### Round-1 findings: verified fixed
- **S-1 (fixed):** `web/src/features/auth/api/session.ts:64`. `useLogin`'s onSuccess now removes every query except the session before it stores the new one.
  - The new test `web/src/features/auth/api/session.test.tsx` covers the race: a write is held, the cache is cleared as logout does, then the write's answer arrives and the student is back in the cache. After login, the only query left is `['auth','session']`.
- **S-2 (fixed):** `web/src/ui/Toast.tsx:43-46`. The region now calls `toast.clear()` both when it mounts and when it unmounts. `clear()` also empties the new `timed` set.
  - Toast.test.tsx:167 checks that a toast queued while no region is mounted never shows in the next region.

**Remaining limit (no finding):** both fixes cover a write answer that arrives between sign-out and the next sign-in. An answer slower than the whole sign-in (typing the credentials) could still put the record into the cache, or a toast into the queue, after the clear. That window is a few seconds at most, and nothing in the student UI renders that data. If you want it closed completely, skip `setQueryData` in `useStoreStudent` when the cached session is not a tutor.

### New diff: checked and clean
- **`ui/modalStack.ts` and `inert`:**
  - The only thing made inert or hidden is the toast region, and only while a `ConfirmDialog` or `Sheet` is open.
  - The count goes up and down in the same effect, so it stays balanced. Even if it got stuck above zero, the only effect would be hidden and paused toasts. It cannot trap focus, hide a dialog, or hide sign-out or the auth reactions.
  - Hiding Undo while a dialog is open has no security effect, and a sign-out still unmounts the region, which clears it.
- **Scroll-clear (`Toast.tsx` `publish`):**
  - It reads only bounding boxes and calls `scrollIntoView({block:'nearest'})` on the element that already has focus.
  - It writes only a whole-pixel number into a CSS variable, and the DOM is never written from data.
  - There is no injection or leak path.
- **Queue sweep (`toastQueue.ts`):**
  - It holds only toast keys, and it only closes toasts that are no longer among the visible three.
  - This also prevents a late toast from showing on another student's page.
  - Messages still render as React text.
- **Focus after Undo (`AccountSection.tsx`):** `closest('[data-toast-region]')` is used only to decide where focus goes. Nothing is removed.
- **Data across sessions:**
  - Sign-in starts from a cache that holds only the session.
  - The toast queue is cleared when a region mounts and when it unmounts.
  - The reset credentials are still component state only, and they are dropped on Done, on unmount, on a change of student and on `pagehide`. Nothing here changed since round 1.
- **The rest:** the vi copy, the heading-level prop and the CSS hold no data. The `e2e` diff touches tests only.

I did not run the e2e suite or the live app, and I did not re-check backend isolation; this round has no backend change, and QA and CI cover those.

## Round 1

SEC-REVIEW T-M2.14: APPROVED

There are no S1 or S2 findings. The two below (S3, S4) don't block the merge, and under quality-gates.md they may be deferred through a DEC entry with a follow-up task. I checked that `git diff origin/develop...HEAD -- backend api` is empty, so the PR changes the frontend only. The targeted unit tests pass: `npx vitest run src/ui src/features/students src/app/guards.test.tsx` ran 39 files and 333 tests, all green. I wrote no files, posted no PR comment, and `git status` is clean.

### Findings

**S-1 (S3): a write that finishes after sign-out puts tutor-private student data back into the cleared query cache**
- **Where:** `web/src/features/students/api/students.ts:365-371` (`useStoreStudent`, the `onSuccess` of `useUpdateStudent` at :374 and `useChangeStatus` at :384). Related: `web/src/features/auth/api/session.ts:54-66` (`useLogin` does not clear old queries).
- **Problem:** `useLogout` clears the query cache and then goes to `/login`. A PATCH or status POST sent just before that still gets its 200, because the request carried the old cookie. Its `onSuccess` then calls `setQueryData(['students','detail',sid], student)` with no check, so the full `StudentResponse` (note, email, phone, handles) goes back into the cache after it was cleared. Sign-in never clears other queries.
- **Scenario:** on a shared device, the tutor saves a profile or presses Archive, then signs out within one round trip. A student signs in on the same tab, which is a client-side navigation with no reload. The student shell never shows the record, but it stays in JS memory for that student's session, where browser devtools or a heap snapshot can reach it. This is tutor-private data present in a student session (ADR-0016, SPEC §37). It is new in this PR: before it, writes only invalidated the cache.
- **Fix (one line in one place):** in `useLogin`'s `onSuccess`, remove every query except the session before `setQueryData(SESSION_KEY, …)`, so each sign-in starts clean. Add a test: a late write answer, then logout, then login, and assert that `students/detail` is absent.

**S-2 (S4): a toast queued after sign-out survives into the next tutor session, with a working Undo**
- **Where:** `web/src/features/students/components/AccountSection.tsx:108-116` and `web/src/features/students/routes/StudentWorkspacePage.tsx:163`, which call `toast.success` after an `await`. Also `web/src/ui/Toast.tsx:153`, which clears the queue only on unmount, and `web/src/ui/toastQueue.ts:96`, the module-level singleton.
- **Problem:** this is the same race as S-1. The shell has already unmounted and cleared the queue, then the resolved promise adds "Archived <name>" with an Undo closure to the singleton queue. The next `ToastRegion` mount shows it.
- **Scenario:** the tutor signs out and signs back in on the same tab. The stale toast appears, and its Undo sends status writes under the new session. Only `TutorShell` mounts a region and there is a single tutor, so nothing reaches a student. That is why this is S4, not S3.
- **Fix:** also call `queue.clear()` on mount (`useEffect(() => { queue.clear(); return () => queue.clear() }, [])`), or call `toast.clear()` in `useLogout`/`useLogin`.

### Checked and clean
1. **The one-time temporary password (T12, AC7)**
   - `useResetPassword` has `gcTime: 0`, seeds no query, and calls `reset.reset()` on both success and failure.
   - The credentials live only in `Workspace` state (`StudentWorkspacePage.tsx:101`).
   - They are dropped on Done, on unmount, on a change of student (the page is keyed by `studentId`) and on `pagehide` (`flushSync`).
   - They are not in the URL, history state or storage; a test asserts that for `localStorage`, `sessionStorage` and `history.state`. No `console` calls were added.
   - The refactored `CredentialsCard` keeps the F2 behaviour. The password is plain text (no input), the heading takes focus, and `AddStudentPage` still drops the card on `pagehide`. The card's actions only moved to a prop.
2. **The unsaved-changes guard (DEC-123 S4-5)**
   - `blocksNavigation.ts:19-24`: `/login` and `/forbidden` always pass, and a `forced` mark passes only to `/change-password`. This is tighter than the old inline guard, which let a forced mark through to any target. It is tested.
   - A dirty form cannot hold a signed-out page open:
     - The 401 reaction navigates to `/login…`, whose pathname passes.
     - `useLogout` navigates to `/login`.
     - Another tab's sign-out, a role change or bfcache `pageshow` go through `router.revalidate()`. The loader redirects that follow use `startRedirectNavigation`, which skips `shouldBlockNavigation` (react-router 8.4.0, `router.js:1018-1060` and `:1219`), so the guard cannot block them.
3. **Personal data and username**
   - `toPatchRequest` sends `version` plus only the changed, trimmed fields. An emptied email, phone or note becomes `null`. Handles are sent as a whole list when any row changed. Nothing changed means no request.
   - Edit mode renders input fields only. Links are built only from the server's answer, through the unchanged `ContactValue`/`contactHref` (DEC-100). The diff adds no `href` outside tests.
4. **The Account section**
   - Status always comes from the server's `StudentResponse`: `setQueryData` with the answer, never an optimistic update.
   - The version comes from the cache, with a refetch fallback. Stale-version, invalid-transition and 404 answers lead to the conflict dialog, a refetch plus an alert, or the not-found view.
   - Undo from Paused takes two requests, and a failure partway shows its own alert. A reset on an archived student gets 409, which triggers a refetch.
5. **Toast**
   - Messages and labels render as React text children. The `escapeValue: false` setting is safe because React escapes text; there is no HTML sink.
6. **The `Button.tsx` MutationObserver**
   - `isEntryFor` removes a node only when it sits inside `[data-live-announcer]` and its first `aria-labelledby` token equals that button's id.
   - It disconnects after 500 ms, so it cannot remove or hide unrelated nodes.
7. **The rest of the diff**
   - It adds no `dangerouslySetInnerHTML`, `innerHTML`, `window.open`, storage or `console` use in product code.
   - `DevUiPage` is only routed under `import.meta.env.DEV`.
   - `BackLink`'s `listSearch` is re-serialised through `URLSearchParams`. That code is unchanged.

I did not run the backend `./mvnw verify` (there is no backend change), the live e2e app, or QA's 403 and `SECRET-*` isolation check. I did not reproduce S-1 or S-2 in a test; both come from reading the code and the react-router and TanStack internals.
