# T-M2.20: M2 polish batch (S4 findings)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.20-m2-polish` (from `develop`) |
| Depends on | T-M2.15 (`9b9e133`), T-M2.19 (`d165a4e`, the E2E checks), T-M2.17 (`ff1d2ec`, `TagInput`): merged |
| Estimate | 1 agent-day |
| Risk tier | **M**: UI and behaviour, no SEC trigger (DEC-144 (1)). S-1 and S-2 change client cache handling at the session boundaries, but only by **removing** client state or skipping a refetch: no endpoint, authz rule, server code, DTO, storage or personal-data migration changes, and both findings were S4 (readable only through DevTools, T-M2.15 SEC). G3 = **one combined fresh QA+UX reviewer** (qa-protocol §2a) that also checks S-1/S-2 from the code and the unit tests |
| Trace | DEC-131 (5) (S4 batched to one polish packet per milestone); T-M2.15 G3 UX-3, UX-4, SEC S-1, S-2 (DEC-132); T-M2.19 G3 QA-5 (DEC-136), QA-8 (DEC-137); the PR #122 CI flake (run 39547482154, tablet); T-M2.17 G3 QA-2 (DEC-142); NFR-A11Y-01, NFR-A11Y-02; interaction-states §2.3; design-system §3 (`ErrorSummary`, `TagInput`); frontend-architecture §2; security.md T19; responsive-standards §3; coding-agent-rules §4.5 (a check is proven failing); DEC-127, DEC-144 (this packet's decisions) |

## Goal
Close the eight S4 findings that M2's reviews deferred, so the M2 regression (G5) starts from a clean list: limit errors use the locale's
number format, the error summary's heading fits the outline it sits in, no write of an earlier session stays in the client's mutation
cache, the add-student answer of an ended session refreshes nothing, two shared E2E checks stop being over-strict or blind, the axe calls
that ran mid-fade wait for the fade, and a pasted tag list shows every reason it was refused. No new feature and no visible layout change.

## Scope
- In:
  1. **Limit numbers in the locale's format** (T-M2.15 UX-3): every `{{max}}` in `web/src/lib/i18n/locales/{vi,en}/students.json` becomes
     `{{max, number}}` (i18next's built-in `Intl.NumberFormat` of the current language; at 2026-10-23 eight keys per locale:
     `form.handlesFull`, `form.guardiansFull`, `form.errors.TOO_LONG`, `guardians.limit`, `guardianForm.tooMany`,
     `learningProfile.fieldsFull`, `learningProfile.errors.tagsTooMany`, `learningProfile.errors.fieldsTooMany`). So the notes limit reads
     en "Use at most 2,000 characters." and vi "Tối đa 2.000 ký tự.", the same digits as the `TextArea` counter ("0 / 2,000", "0 / 2.000").
     No code change; values below 1,000 read as before.
  2. **`ErrorSummary` heading level per use** (T-M2.15 UX-4): a prop `headingLevel?: 2 | 3` (default `2`; the `handlesHeadingLevel`
     pattern of `StudentFields.tsx`). The summaries inside a Profile view `h2` section pass `3`: `ProfileForm` (Personal information),
     `GuardianForm` (Guardians), `LearningProfileForm` (Learning profile). `AddStudentForm` and `ChangePasswordPage` (under the page `h1`)
     keep `h2`. The title keeps its look (styled by its class, not by the element).
  3. **No mutation of an earlier session stays cached** (T-M2.15 SEC S-1, DEC-144 (2)): wherever the query cache is cleared or dropped at
     a session boundary, the mutation cache is cleared too (`queryClient.getMutationCache().clear()`): sign-in success (`useLogin`),
     sign-out (`useLogout`, also when the call fails), a 401 (`onAuthProblem` `UNAUTHENTICATED`, `app/guards.ts`) and `dropAllButSession`
     (a cross-tab message, a role or user change after a 403, a back/forward-cache restore). No `gcTime` change on the hooks. A write still
     pending at that moment keeps its own observers, so its late answer is handled as today by the DEC-127 session check (unchanged).
  4. **Add student refreshes only for the tutor's session** (T-M2.15 SEC S-2): `useCreateStudent`'s `onSuccess` invalidates
     `studentKeys.list` only while `isTutorSession(queryClient)` (the rule every other students write follows, DEC-127). The credentials
     hand-over to the page (`AddStudentForm`) is unchanged.
  5. **`expectNoMidWordBreak` measures rendered text only** (T-M2.19 QA-5, `e2e/support/checks.ts`): a text node that renders no box (a `Range` over
     the node has no client rects: `display: none` on its parent or an ancestor) is skipped; text inside a `display: contents` element
     (e.g. `ui/DelayedSkeleton`) renders and is still measured (so not `checkVisibility()` on the parent, G0 D-3); a `<br>` is a word
     boundary (the joined text gains a line break there, so "one<br>two" is two words). Each change is proven in `e2e/tests/checks.spec.ts`
     (coding-agent-rules §4.5): for each of the two changes, a fixture that fails today and passes now, and a violating fixture next to it
     that still fails.
  6. **`expectFocusNotLost` sees `visibility: hidden`** (T-M2.19 QA-8): the visibility test becomes
     `active.checkVisibility({ visibilityProperty: true })`, so focus left on a control that turned `visibility: hidden` counts as lost;
     proven by a new `checks.spec.ts` fixture (a button that hides itself with `visibility: hidden`) that passes today and fails now.
  7. **Axe after an overlay opens waits for the fade** (the PR #122 CI flake, run 39547482154, tablet: `students.spec.ts` "AC6: leaving a
     dirty form asks…" ran a bare `expectNoAxeViolations` right after the discard dialog opened and caught a mid-fade `color-contrast` on its
     label): that call becomes `expectSettledAccessible`. The LC's grep of every other bare call (at 2026-10-23, `grep -n
     "expectNoAxeViolations(" e2e/tests/*.ts`) found one more path that runs axe right after an overlay opens: the local
     `expectAccessible` helper of `shells.spec.ts` (axe + no horizontal scroll), called right after each of two Sheets and one Popover opens in
     `/dev/ui` (the `devui-sheet-*-open-*` / `devui-popover-open-*` loop, about line 785); its body becomes `expectSettledAccessible(page)`. The remaining bare calls are kept: either
     no overlay opened before them (`navigation.spec.ts` ×5, `polish.spec.ts` ×2, `smoke.spec.ts:58`, `shells.spec.ts:701`; the login's
     "Forgot your password?" in `auth.spec.ts` is a `<details>` disclosure with no fade), or the overlay was opened by `openAccountSection`
     (`e2e/support/shell.ts`), which already waits for `[data-entering]` to be gone (`auth.spec.ts` ≈ line 504 through its `expectAccessible`,
     `smoke.spec.ts:91` after `revealSwitcher`); `guards.spec.ts:36` and `checks.spec.ts` ≈ line 117 are the helpers' own failing proofs. The implementer re-runs the grep and lists any new bare call with its reason in
     the summary.
  8. **A pasted tag list shows every reason** (T-M2.17 QA-2, `ui/tagEntry.ts`, `ui/TagInput.tsx`): `addTags` returns `errors:
     TagEntryError[]` (each distinct reason once, in the order of its first refusal; `[]` when all were accepted) instead of the first
     reason only; `TagInput` shows the messages of all of them in its one error text, joined by a space (each message is a sentence); on Save
     the learning-profile schema adds **one** issue per field whose message is the reasons' message keys (`TAG_ERROR`) in that order,
     joined by a single space (one reason → exactly today's single key, so `learningProfileSchema.test.ts`'s rows stay as they are; keys
     hold no spaces); `LearningProfileForm`'s tag message splits it, translates each key with its own `max` (the existing `maxOf`: 40 for
     `TOO_LONG`, 30 for too many) and joins the texts with a space, for the field error and the field's one `ErrorSummary` item (G0 D-1:
     `zodResolver` keeps only the first issue per path). QA's case: pasting
     "Nghe, Đọc\nViết\tNGHE,  ,Bad\u0007x" into an empty Strengths adds Nghe, Đọc, Viết, keeps "NGHE, Bad\u0007x" in the input and shows
     "Đã thêm rồi." and the control-character message.

## Out of scope (explicit)
- Any other S3/S4 not listed above, any new feature, any layout or copy change beyond scope 1, 2 and 8.
- Number formatting of other interpolations (`{{page}}`/`{{pages}}`, `{{number}}` legends: not found by a review, never ≥ 1,000 today).
- `gcTime` changes on the students hooks (DEC-144 (2) chose the session-boundary clear); the `/login` loader's logout of a must-change
  session (it never held tutor data; no finding).
- The backend wall-clock flake `AuthApiIntegrationTest.anUnrelatedLoginStaysFastDuringABurstOnOneUsername` (handoff gotcha): backend, so
  it joins the BE row T-M2.10 (DEC-144 (3)), not this FE packet.
- The react-aria-components bump (PR #100, held by the PO, DEC-139); T-M2.10, T-M2.13, T-M2.16, T-M2.21.

## Guardrail answers (scope.md §6)
1. **Trace:** the review findings of DEC-132, DEC-136, DEC-137, DEC-142 and the CI run above, batched by DEC-131 (5). 2. **Drift toward
excluded scope?** No: fixes to shipped screens and test helpers. 3. **Mandatory setup added?** None. 4. **Weekly use?** Yes: the forms and
the sign-in/out paths are used in every session. 5. **Hard-coded semantics?** None: no curriculum or exam text; `ForbiddenIdentifiersTest`
and the web grep stay green.

## Design notes
- **Files**: `web/src/lib/i18n/locales/{vi,en}/students.json`; `ui/ErrorSummary.tsx` (+ test; the existing `/dev/ui` sample, already inside a section `h2`, passes `headingLevel={3}`: no new dev string);
  `features/students/components/{ProfileForm,GuardianForm,LearningProfileForm}.tsx`; `features/auth/api/session.ts` (`useLogin`,
  `useLogout`), `app/guards.ts` (the 401 branch, `dropAllButSession`); `features/students/api/students.ts` (`useCreateStudent`);
  `ui/tagEntry.ts`, `ui/TagInput.tsx`, `features/students/model/learningProfileSchema.ts`, `features/students/components/LearningProfileForm.tsx`
  (the tag messages); `e2e/support/checks.ts`, `e2e/tests/checks.spec.ts`, `e2e/tests/{students,shells}.spec.ts`.
- **S-1 mechanism** (DEC-144 (2)): one clear at each of the four session boundaries rather than `gcTime: 0` on each write hook: it covers
  the guardian and learning-profile writes the finding named, the student writes, and every later feature's mutations (M3 onwards)
  without a per-hook rule, and sits next to the query-cache clear it mirrors. In `useLogin` the sign-in mutation itself may go with the
  clear; its own success handling (the login page's redirect) must keep working (the kept `auth.spec.ts` and login unit tests).
- **Contradiction scan (lessons L-03)**, each resolved here and in DEC-144:
  (a) kept unit assertions name the notes limit as "Tối đa 2000 ký tự.": `features/students/routes/StudentLearningProfile.test.tsx` (≈ line
  320) and `StudentGuardians.test.tsx` (≈ line 322) become "Tối đa 2.000 ký tự." (scope 1). `ui/TextArea.test.tsx` passes that text as
  a prop and is unchanged. No E2E assertion holds a limit ≥ 1,000 (`students.spec.ts` "Use at most 40 characters." is unchanged).
  (b) `ui/ErrorSummary.test.tsx` asserts the default `h2`: kept (the default stays). `AddStudentPage.test.tsx` "no `h2` 'Chưa tạo được
  học viên'" stays meaningful (Add student keeps `h2`). The Profile view's kept `h2`-list assertions (`students.spec.ts` AC1/AC2/AC9,
  `StudentGuardians.test.tsx`) run with no summary shown, so an `h3` summary changes nothing there. design-system §3 says "an `alert` with
  an `h2` title": updated to "`h2` by default, `h3` inside a section".
  (c) the `addTags` table test in `ui/TagInput.test.tsx` asserts `{ value, rest, error }`: its rows change to `errors` (the same reason as
  a one-item list, `[]` for `null`); the last row ("ok, x\u0001, dup, also") gains `'duplicate'` after `'control'`. With (a), these are
  the packet's **only changed kept assertions**.
  (d) frontend-architecture §2 says a 401 "clears the query cache" and that dropping keeps the session: both gain "and the mutation cache".
  security.md T19 (stale session data on a shared device) gains the mutation cache in its mitigation.
  (e) `expectSettledAccessible` also checks no horizontal scroll: the `shells.spec.ts` `expectAccessible` helper already did (axe +
  reflow), so the swap adds only the wait.
- **Shortcut ledger** (lessons L-12; `grep -rnE '(shortcut|ponytail):'` at 2026-10-23: 8 markers; the lessons-learned ledger of 2026-10-20 listed 7 and missed `ui/Sheet.module.css` (LTR-only drawer), corrected there): none fires. `ui/Toast.tsx`,
  `ui/toastQueue.ts`, `ui/Button.tsx` are not touched and no package is bumped; `lib/time` is not touched.

## UI rules (fixed at G0, DEC-131 (2))
- **Columns and breaks**: unchanged on every screen. The joined `TagInput` error (scope 8) is human-language text in the existing
  `FieldErrorMessage`: it wraps at spaces only (`expectNoMidWordBreak` on that error element at 360 with both reasons shown) and never
  scrolls the page.
- **Focus targets**: unchanged (no new removing or disabling action); an `h3` summary is still the focus target after a failed submit.
- **Layering**: unchanged.
- **Validation per field**: unchanged rules and limits; only the message text (scope 1 numbers, scope 8 joined reasons). The forms keep
  validating on submit, then on change (`mode: 'onSubmit'`, DEC-142).
- **Copy**: no new strings or verbs; vi groups thousands with "." ("2.000"), en with "," ("2,000").

## Domain rules
- Not applicable: no write path, transition or server rule changes. S-1 and S-2 only remove client state or skip a refetch; the DEC-127
  session check stays the rule for a write answered after its session ended.

## Acceptance criteria
- AC1 (scope 1, UX-3): the notes `TOO_LONG` error reads "Use at most 2,000 characters." (en) and "Tối đa 2.000 ký tự." (vi), matching the
  counter; every `{{max}}` in `students.json` (vi, en) is `{{max, number}}` and a 30/40/120 limit reads as before; the two kept assertions
  of contradiction (a) are updated (unit tests; an E2E in en and vi at one viewport shows the 2,001-character notes error).
- AC2 (scope 2, UX-4): `ErrorSummary` renders its title as `h2` by default and as `h3` with `headingLevel={3}`, with the same class and
  look; after a failed submit the profile, guardian and learning-profile forms show an `h3` summary (focused, as today), Add student and
  Change password an `h2` (unit tests per level + component tests per form).
- AC3 (scope 3, S-1): after each of the four boundaries (sign-in success, sign-out also with a failed call, a 401, `dropAllButSession` for a
  cross-tab message) the mutation cache holds no mutation of the earlier session (unit tests seed a finished students write with variables
  and data, run the boundary and assert `getMutationCache().getAll()` holds none of it; for sign-in too, `getAll()` is `[]` (the sign-in's own variables hold the password), and the redirect still works); a
  write pending across the boundary still stores nothing and shows nothing when it answers (the DEC-127 held-promise tests stay green);
  sign-in, sign-out and the cross-tab follow behave as before (kept `auth.spec.ts`, `guards.spec.ts` and unit tests).
- AC4 (scope 4, S-2): a create answered while the tutor session is cached invalidates the students list (kept); one answered after the
  cached session ended or became a student's invalidates nothing (a held-promise unit test).
- AC5 (scope 5, QA-5): in `checks.spec.ts`, `expectNoMidWordBreak` passes on a box whose visible words fit and that holds a `display:
  none` child with text, and on "one<br>two" laid out on two lines (both fail on `develop` at `6217a67`); it still fails on a forced
  mid-word break beside a `display: none` child and on "one<br>" followed by a word forced across two lines, measures the text of a
  `display: contents` child, and every existing proof is kept.
- AC6 (scope 6, QA-8): in `checks.spec.ts`, `expectFocusNotLost` fails after a button that sets `visibility: hidden` on itself (it passes
  on `develop` at `6217a67`); every existing proof is kept.
- AC7 (scope 7, CI flake): `students.spec.ts` "AC6: leaving a dirty form asks…" uses `expectSettledAccessible` after the discard dialog
  opens; the `expectAccessible` helper of `shells.spec.ts` calls `expectSettledAccessible`; the summary lists every
  bare `expectNoAxeViolations` call left in `e2e/tests` with its reason (each with the reason of scope 7).
- AC8 (scope 8, QA-2): `addTags` returns every distinct reason in first-refusal order (table test incl. control + duplicate, and
  too long + too many); QA's paste case shows both messages in the `TagInput` error and keeps the refused text; Save with uncommitted text
  refused for two reasons shows both in the field error and in that field's one `ErrorSummary` item; a single reason reads exactly as
  today (unit tests + one E2E at 360 in vi with `expectNoMidWordBreak` on the error and `expectSettledAccessible`).
- AC9: `./scripts/gate.sh` green once on the final head and CI green (DEC-131 (6)); all existing unit and E2E assertions kept except the
  changed kept assertions of contradiction (a) and (c); F2 ≤ 6, F10–F12 ≤ 3 kept; the bundle budget green; `api/openapi.json` and
  `backend/` unchanged; `ForbiddenIdentifiersTest` green and no exam or curriculum name in `web/src`.

## Test plan
- Implementation: unit (`ErrorSummary` levels; `addTags` table; the learning-profile schema's joined message; the four S-1 boundaries;
  the S-2 held promise), component tests with MSW (the three `h3` summaries; the two-reason Save), `checks.spec.ts` proofs (AC5, AC6),
  E2E (`students.spec.ts` the en/vi limit message and the two-reason paste at 360; the AC7 swaps). The gate runs the changed specs ×3;
  `checks.spec.ts` and the changed focus/axe specs ×20 by QA (DEC-131 (7)).
- **When a new check finds a real defect** outside this packet's allowed change (lessons L-10): the AC5/AC6 fixes or the AC7 waits may
  surface a real word break, a lost focus or an axe violation elsewhere in the kept specs. The implementer reports it at once as an OQ to
  the LC; `test.fail` only until the LC rules (an AC + DEC), and the LC rules before G3.
- Independent QA focus (combined QA+UX, qa-protocol §2a): the limit messages in vi and en next to the counters; the heading outline of
  each form with errors (screen-reader heading list); the QA-2 paste and other two-reason pastes (too long + duplicate, too many + control)
  and their Save; the `checks.spec.ts` proofs mutated back to the old helpers (the new fixtures must then fail, AC5/AC6); the AC7 specs
  ×20 at tablet; S-1/S-2 from the code and the unit tests (sign out with a guardian saved, sign in again, inspect the mutation cache from a
  test or the dev build). Exploratory charter: find a form whose error summary heading breaks the outline, a limit still shown without
  grouping, or a refused paste whose reason is missing.
- **Isolation**: no endpoint change; the backend harness stays green.

## Evidence required
- `evidence/T-M2.20/summary.md` (recorded by the LC from the implementer's returned text, L-07: AC → proof, the `frontend-standards`
  self-check list ticked, the bare-axe list of AC7, the **G3 cost** table), one gate log on the final head + green CI; local screenshots
  (not committed) at 360×740, 768×1024 and 1280×800 of the notes limit error (en, vi), a profile form with its `h3` summary, and the
  two-reason `TagInput` error. G3: the combined `review/ux.md` (+ QA verdict) recorded by the LC; the QA report via `qa/T-M2.20` (reviewer
  evidence never on the feature branch).

## Docs to update
- `design-system.md` §3 (`ErrorSummary` heading level; `TagInput` shows every refusal reason), `frontend-architecture.md` §2 (the mutation
  cache at the session boundaries), `security.md` T19 (the mutation cache), backlog (T-M2.20 done note), `progress.json` (LC).

## Risks & assumptions
- **Size**: 9 ACs, about 1 agent-day; each item is small and independent. **Split line**: none expected; if AC7's waits expose real
  violations in kept specs, those become OQs (test plan), not scope here.
- `checkVisibility({ visibilityProperty: true })` needs Chromium 121, Firefox 125, Safari 17.4 or later: the Playwright engines here are
  newer (development-setup), and the helper is test-only.
- i18next's `number` formatter uses the active language (`vi`/`en`); the counter uses React Aria's locale from the same provider, so the
  digits match (verified for 2,000 by the LC: en "2,000", vi "2.000").
- E2E signs in as `e2e-tutor` (`.data/e2e/`) and adds students with unique names; the dev database keeps them (never purge without asking the PO).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.20 ./scripts/gate.sh
git checkout -- evidence/T-M2.20   # only for reviewers: restore tracked evidence after a gate or e2e run
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M2.20-m2-polish
```
