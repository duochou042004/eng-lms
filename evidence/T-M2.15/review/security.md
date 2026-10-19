# Security review — T-M2.15 (round 1)

> Recorded by the LC from the reviewer's returned text (DEC-131: reviewers return text only).

SEC-REVIEW T-M2.15: APPROVED

**Scope check.** Running `git diff --stat origin/develop...HEAD -- backend api` shows nothing, so this change touches no backend or OpenAPI files. I reviewed 27 files under `web`, `e2e` and `docs/04-backend/security.md` (T19 row only).

**Findings.** There are no S1 or S2 findings.

**S-1 · S4 · /home/kali/App_projects/eng-lms/web/src/features/auth/api/session.ts:91 (`useLogout`), :65 (`useLogin`), /home/kali/App_projects/eng-lms/web/src/features/students/api/guardians.ts:44-60**
- **Problem:** `useAddGuardian` and `useUpdateGuardian` use the default mutation `gcTime` of 5 minutes. Sign-out clears only the query cache, never `getMutationCache()`. So a guardian answer (name, phone, email, notes) stays in the in-memory MutationCache for up to 5 minutes after sign-out.
- **Scenario:** the tutor saves a guardian and signs out on a shared device. A student signs in in the same tab and opens TanStack or React DevTools. They can read the previous answer's `state.data`. No app code on a student route reads the mutation cache, and it never reaches storage, the URL or the network. So this is local and needs DevTools.
- **Not new:** `useUpdateStudent` and `useChangeStatus` (T-M2.14) already behave this way.
- **Fix:** add `queryClient.getMutationCache().clear()` next to the query-cache clear in `useLogout`, `useLogin`'s `onSuccess` and `dropAllButSession` (`app/guards.ts`). Or set `gcTime: 0` on these mutations, as `useCreateStudent` and `useResetPassword` already do.

**S-2 · S4 · /home/kali/App_projects/eng-lms/web/src/features/students/api/students.ts:92**
- **Problem:** `useCreateStudent.onSuccess` invalidates `studentKeys.list` without calling `isTutorSession`.
- **Scenario:** an Add student answer arrives after sign-out and a student sign-in. It invalidates a key that is not in the cache, so nothing happens. No data is stored, no toast fires and the credentials go only to component state (an unmounted page drops them). AC8 does not list create, so this is not an AC failure. It is just inconsistent with the guard used on the other write paths.
- **Fix:** optional. Guard the invalidation the same way for symmetry.

**AC8 (the DEC-127 residual), checked and OK**
- **Every write that stores an answer is guarded:** `useStoreStudent` (profile save and status), `useUpdateCache` (guardian add, edit, remove) and the `'gone'` refetch on remove.
- **No race:** the session check and the store run back to back in one synchronous call, so nothing can run in between.
- **Old answers cannot land in a new cache:** the add and edit updaters store nothing when the list entry is missing (`list ? change(list) : list`). After logout or login clears the cache, a late answer cannot create a fresh entry.
- **No toast or focus change after the session ends:** each toast and focus change is guarded right after its `await`. This covers `AccountSection` act and undo (`stored` flag), `ProfileForm`, `GuardianForm:273` and `GuardiansSection.confirmRemove`.
- **Cache keys are not a cross-session channel:** `['students','guardians',sid]` holds no session id, but every sign-in and sign-out drops all queries except the session (`session.ts:65`, `:91`, `dropAllButSession`), so one session can never read another's entries.
- **A later sign-in as the tutor stores the answer:** this is acceptable in a single-tutor product.
- **The weakened test is still sound:** `session.test.tsx` was changed to put a TUTOR session back in the cache. It still proves that login drops the stale entry.
- **Tests:** `StudentWriteSession.test.tsx` covers all five writes, after logout and after a student login, plus a control case.

**Guardian personal data, checked and OK**
- No `console.*`, `localStorage`, `sessionStorage`, `history.*State` or search-param use anywhere in `features/students` (non-test code).
- The data lives only in the query cache and component or form state.
- The guardian name appears only in a toast or dialog the tutor sees, and only while the session is the tutor's.
- Phone and email go through the existing `ContactValue` and `contactHref`, so there are no new link builders.

**Student audience, checked and OK.** Outside `features/students`, the only file that mentions guardians is the generated `lib/api/schema.d.ts` (types only). The only guardian endpoints used are `/api/v1/tutor/...` ones, and no guardian code was added to `/student` routes.

**Input limits and server errors, checked and OK**
- The limits match validation-rules: name 1–120, relationship 0–40, the shared phone and email rules, notes 0–2,000, and at most 10 guardians.
- `mapServerErrors` and `mapGuardianErrors` turn server errors into i18n keys only and never show raw server text.
- A server error on a guardian row goes to that row only if the row exists; anything else goes to the generic summary message.

**Tests run.** `pnpm test --run src/features/students src/features/auth` gave 19 files and 346 tests, all passing.

**What I did not check**
- I did not run the E2E suite, `./scripts/gate.sh` or the backend `verify`.
- I did not black-box test AC8 in a real browser across two tabs; I relied on the unit tests and reading the code.
- I did not check how the bundle splits into chunks, so I have not confirmed that the students chunk never loads for a student.
- I did not re-check `contactHref` (it was approved earlier under DEC-100).
- I read only part of `GuardianForm` (the fields and the submit path).

The main risk is S-1: guardian data from a previous session can stay in memory for up to 5 minutes after sign-out on a shared device. It is cheap to fix in a follow-up.

Wall-clock: about 7 minutes.
