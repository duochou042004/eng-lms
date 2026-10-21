# Security review — T-M2.17

> Recorded by the LC from the reviewer's returned text (DEC-131). Fresh SEC agent on `978f201` (product code `f72c5ae`): 48,049 tokens, 1.9 min. S-1 (S4) fixed in AC10 (b) (`830d778`, DEC-142); S-2 (S4) closed by the QA `SECRET-LP` marker scan (QA report, round 1 AC7).

SEC-REVIEW T-M2.17: APPROVED

I found no S1, S2 or S3 issues in PR #123 (head 978f201, product code f72c5ae). Two S4 notes follow, neither blocking.

**Scope check.** `git diff origin/develop...HEAD -- backend api` is empty, so `backend/` and `api/openapi.json` are unchanged. The product change is frontend only (`web/src/features/students/**`, `web/src/ui/TagInput*`, `web/src/ui/tagEntry.ts`), plus e2e, docs and evidence. The §11 backend items (`@Audience` and policy entries, no `studentId` parameter, owner-scoped 404, migrations, files) therefore don't change here.

**A-008 end to end: holds.**
- `api/openapi.json` has no `/api/v1/student/**` paths, so no student-facing schema contains a learning-profile type.
- The only web caller of the profile is the tutor route `/api/v1/tutor/students/{sid}/learning-profile`, in `/home/kali/App_projects/eng-lms/web/src/features/students/api/learningProfile.ts`.
- The query key is `['students','learningProfile',sid]`, which is covered by the existing `students` cache-clearing rules.
- Nothing in the feature calls `localStorage` or `sessionStorage`, no query persister exists anywhere in `web/src`, and no route or `navigate` call is built from a profile value.
- Backend harness entries are still in place: `PolicyRegistry.java:95-96` has GET and PUT for `…/learning-profile`, and `HarnessItems.learningProfileLevelOf`, `HarnessStudentHandlers` and `StudentIsolationRulesTest` still reference the profile.

**DEC-127 session check: correct.**
- `learningProfile.ts:29`: the mutation's `onSuccess` writes the cache only when `isTutorSession(queryClient)` is true. This runs at mutation level, so it still applies after the page unmounts.
- `LearningProfileForm.tsx:170`: `onClose(true)`, which triggers the toast and the focus move in `LearningProfileSection.tsx`, is also gated on `isTutorSession`.
- The held-promise test (`StudentWriteSession.test.tsx`, new "learning profile save" row) covers both cases: signed in again as a student, and no session cached. It would fail if either guard were removed: a missing `onSuccess` guard leaves a `['students',…]` entry, and a missing form guard calls `toast.success`. The new-profile success path is covered in `StudentLearningProfile.test.tsx:181`.

**Sign-out paths: no profile data left behind.**
- `useLogout` and a 401 (`guards.ts:113`) clear the whole cache.
- The cross-tab `dropAllButSession` (`guards.ts:103-106`) resets mounted queries and removes inactive ones.
- Component tests at `StudentLearningProfile.test.tsx:625` and `:642` confirm no `['students','learningProfile',*]` data remains after own logout and after another tab's sign-out.

**Values render as text only.**
- There is no `dangerouslySetInnerHTML` in `web/src` outside tests.
- `DescriptionList`, `TagList`, the `TagInput` chips and the custom field label and value render as plain React text. There is no `href` or `contactHref` on any profile value. The test at `StudentLearningProfile.test.tsx:604` confirms a URL tag renders as text.

**No logging.** Non-test code in `web/src` has no `console.*`, `sendBeacon` or error-reporting calls. The e2e `consoleGuard` fails on any unexpected console entry.

**`TagInput` paste and split handling: safe.**
- `/home/kali/App_projects/eng-lms/web/src/ui/tagEntry.ts` splits on comma, tab, CR and LF, trims each part, and refuses any C0, DEL or C1 control character, over-length tags, case-insensitive duplicates and tags past the limit.
- The output is a plain `string[]` sent as JSON. Markup characters can't execute, because React escapes them and the server validates again.
- `/dev/ui` exists only in development builds (`router.tsx:108`).

**Findings**

- **S-1 (S4, non-blocking).** `LearningProfileForm.tsx:171-195`: the error branches (409 conflict dialog, 422 mapping, 404 `onNotFound`) are not gated by `isTutorSession`. Scenario: another tab signs out while the PUT is in flight and the page hasn't left yet. A 409 would then open the conflict dialog with the tutor's own unsaved notes in that same tab. No student can see it and nothing is stored, so DEC-127 (store, toast, focus) is still met. Fix, optional: return early from the `catch` when `!isTutorSession(queryClient)`.
- **S-2 (S4, non-blocking, evidence gap).** AC7 asks that no profile value appears in the URL, web storage or the console during the e2e run. The new learning-profile e2e tests (`e2e/tests/students.spec.ts`, describe "Learning profile (T-M2.17)") contain no `localStorage`/`sessionStorage`/`location.href` marker scan like the one at `students.spec.ts:165` and `:1421`. The code can't put values there, as checked above, and the console is covered by `consoleGuard`, but the evidence doesn't show it. Fix: the QA `SECRET-*` marker scan the packet assigns should record this, or add the one-line storage/URL assertion to one learning-profile e2e test.

**Not checked.** I ran the targeted web unit tests: StudentWriteSession, StudentLearningProfile, TagInput and students/model, 215 passed. I did not run `./mvnw verify`, because there is no backend change and you limited me to unit tests, so the authz and isolation suites were checked by reading them, not by running them. I didn't audit the 160 evidence and record files beyond `summary.md`.

SEC-REVIEW T-M2.17: APPROVED
