# Docs review — T-M2.20 packet (G0)

> Recorded by the LC from the reviewer's returned text (DEC-131). Cost: round 1 full 108,658 tokens / 5.4 min (324 s, on 91c6e99); round 2 delta 7,714 / 0.4 min (25 s, on 66e5cc0; cumulative 116,372). Round 1: S3 D-1, D-2 and S4 D-3..D-7 fixed in 66e5cc0 (D-3 with a stricter rule than suggested: a text node whose own Range has no client rects is skipped, so `display: contents` text is still measured); D-8 (the handoff) done by the LC in this PR.

## Round 1 (full)

**DOCS-REVIEW T-M2.20: CHANGES REQUESTED**

`./scripts/check-docs.sh` passed: 326 markdown files, `progress.json` valid, sources intact, prompt within limit.

**What I checked against the code (all correct unless a finding says otherwise)**
- **Limit keys:** the eight `{{max}}` keys match the code, in both vi and en.
- **i18next:** version 26.4.4, which has the built-in `number` formatter. The language is passed through, so vi gives "2.000" and en gives "2,000".
- **Kept assertions:** the two vi limit assertions are exactly `StudentLearningProfile.test.tsx:320` and `StudentGuardians.test.tsx:322`. The `addTags` table row is at `TagInput.test.tsx:76`.
- **ErrorSummary:** it has six users, plus `/dev/ui`. Their heading context matches the packet: three forms sit under a section `h2`, and AddStudent and ChangePassword sit under the page `h1`. `global.css:35-37` styles h1–h3 the same way, so an `h3` title keeps its look.
- **Session boundaries:** all four are where the packet says (`session.ts:63`, `:90`, `guards.ts:111-113`, `:103-106`). Clearing the mutation cache in `useLogin`'s onSuccess is feasible. TanStack 5.104.1's `MutationCache.clear()` only empties the cache. The mutation keeps its observers, and `LoginPage` uses `mutateAsync`, so its redirect keeps working.
- **`useCreateStudent`:** `students.ts:92` is correct, and `isTutorSession` is already imported.
- **Other mutation-cache tests:** `AddStudentPage.test.tsx:494` and `StudentAccount.test.tsx:343` stay compatible.
- **Summary heading tests:** no kept unit or E2E test finds a summary by heading level, so moving to `h3` breaks none.
- **Tag-error tests:** every existing tag-error test refuses for one reason only, so none breaks.
- **Records:** the packet, DEC-144, both backlog rows and `progress.json` agree.
- **Risk tier M (DEC-144 (1)) is sound.** The G3 tier-H triggers are the backend `identity` module, `web.student`, authz, endpoints, migrations, and so on; client cache removal triggers none of them. T-M2.12 was a different case: it added new cross-tab behaviour. The combined QA+UX reviewer checking S-1/S-2 from the code and the unit tests is enough. No change needed.

**Findings**

**D-1 · S3 · `docs/tasks/T-M2.20-m2-polish.md:59-60`, `:144-146` (scope 8, AC8).** "The learning-profile schema's Save check and its ErrorSummary item carry the same joined text" cannot be built as written:
- The schema has no `t()`. It stores a message key (`learningProfileSchema.ts:26-27`, `TAG_ERROR[error]`).
- The form turns each key into text through `maxOf(path, key)`, which picks a different `max` per key: 40 for TOO_LONG, 30 for tooMany (`LearningProfileForm.tsx:57`, `:122`).
- One `addIssue` per reason would be cut back to the first one, because `zodResolver` keeps only the first issue per path (no `criteriaMode: 'all'`).

The implementer has to invent a mechanism, and a reviewer has nothing to check it against.
- **Fix:** specify it. For example, the issue's message becomes the reasons' keys in first-refusal order (one issue, e.g. keys joined by a fixed separator, or passed as `params`). `tagMessage` then translates each key with `message(name, key)` and joins the results with a space. State that the single-reason key stays unchanged, so `learningProfileSchema.test.ts:121-125` is kept.

**D-2 · S3 · `T-M2.20-m2-polish.md:52-55`, `:141-142` (scope 7, AC7).** The packet says no kept bare axe call follows an overlay opening. That is false:
- `auth.spec.ts:502-504`: its `expectAccessible` runs right after `openAccountSection`, which opens the account sheet or popover.
- `smoke.spec.ts:86-91`: `revealSwitcher` calls `openAccountSection`, and the bare call at `:91` follows it.
- `checks.spec.ts:117`, the deliberate mid-fade proof, is missing from the list, although `guards.spec.ts:36` is named.

Both of the first two only look safe because `openAccountSection` already waits for `[data-entering]` count 0 (`e2e/support/shell.ts:35`). AC7 tells the implementer to repeat a reason that is wrong.
- **Fix:** list `auth.spec.ts:504` and `smoke.spec.ts:91` with the true reason ("after `openAccountSection`, which waits for `[data-entering]` = 0"), or switch them to `expectSettledAccessible`. Add `checks.spec.ts:117` as a proof. Also, the `shells.spec.ts` loop at about line 785 opens two Sheets and one Popover, not "each popover"; correct the wording.

**D-3 · S4 · `:41` (scope 5).** `!parent.checkVisibility()` is not the same as "`display: none` on it or an ancestor". The spec's `checkVisibility()` also returns false for an element with no box, which includes `display: contents`. `ui/DelayedSkeleton.module.css:2` uses `display: contents`, so text placed directly inside it would be skipped silently.
- **Fix:** use QA-5's own suggestion (`evidence/T-M2.19/qa/report.md:20`): skip a text node whose parent has no client rects. Alternatively, exclude `display: contents`.

**D-4 · S4 · `:130` (AC3).** "For sign-in, nothing but the sign-in itself" lets the sign-in mutation stay cached, and its `variables` hold the username and password. The clear in onSuccess removes that mutation anyway, so the stricter assertion costs nothing.
- **Fix:** assert `getAll()` is `[]` after sign-in, and that the redirect still works.

**D-5 · S4 · `:42-43` versus `:135-137`.** Scope 5 asks for "a violating fixture next to it" for each change. AC5 has one only for the `display: none` change, none for `<br>`.
- **Fix:** add one, for example "one<br>tw" plus a forced mid-word break, which still fails.

**D-6 · S4 · `:80` ("`/dev/ui` shows an `h3` use").** This is ambiguous. A second sample needs new dev strings, which clashes with "no new strings" (`:115`). It would also give `DevUiPage.test.tsx:27` two matches for its `getByRole('alert', {name})`.
- **Fix:** say "pass `headingLevel={3}` to the existing sample". It already sits inside a Section `h2` (`DevUiPage.tsx:393`, `:509-511`).

**D-7 · S4 · `:104`.** The ledger says 7 markers; the grep finds 8. The extra one is `web/src/ui/Sheet.module.css:37` (left-to-right only). It does not fire here.
- **Fix:** say 8, and also update the count in the lessons-learned ledger.

**D-8 · S4 · `docs/handoff/HANDOFF.md:3`, `:34`.** The handoff still says "T-M2.20 packet to write".
- **Fix:** the LC refreshes and archives it when stopping (L-09).

**Contradiction scan, otherwise complete:**
- Items (a)–(e) are correct.
- `design-system.md:93` (the `h2` title) and `:180` ("refused with its message") are covered by the "Docs to update" list.
- No interaction-states or test-strategy text goes stale.
- Nothing is untraced and nothing from the backlog row is dropped. Adding the 401 boundary to S-1 sits within the finding.

I did not check the React Aria counter's locale source in the code, did not run any E2E, and did not confirm Chromium's behaviour with `visibility: hidden` focus. That last one is AC6's premise, which I took from QA's probe in T-M2.19 QA-8.

DOCS-REVIEW T-M2.20: CHANGES REQUESTED
## Round 2 (delta)

D-1 through D-7 are all closed, and the fixes add no new S1–S3 finding. D-8 (the handoff) is LC work at session end and I did not re-check it. `./scripts/check-docs.sh` passes on 66e5cc0 (327 markdown files). I read only `git diff 91c6e99..66e5cc0` and the code it points to; I ran no E2E.

**The D-3 rule is sound.** The packet's new rule is at `/home/kali/App_projects/eng-lms/docs/tasks/T-M2.20-m2-polish.md:40-45`: skip a text node when a `Range` over that node has no client rects. That set of nodes is exactly the text that renders no box.
- **`display: none` parent or ancestor:** the text has no layout box, so the range has no rects and the node is skipped. That is the AC5 pass fixture.
- **`display: contents` parent:** the parent has no box, but its text still lays out in the grandparent's boxes, so the range has rects and the text is measured. Your objection to "parent has no client rects" is right; the new rule fixes it, and AC5 now covers that case.
- **Edge cases that come out right:**
  - Whitespace-only text between blocks may have no rects and be skipped. It holds no words, so nothing is lost.
  - Text that is `visibility: hidden` or clipped by `overflow` still has rects, so it is measured, as today.
  - The content of a closed `<details>` renders no box, so it is skipped. That is the right result.
- **Word offsets:** a skipped node simply adds no text to the joined string, so the offset mapping in `at()` still works.

**Each finding:**
- **D-1: closed.** Lines 59-67 of the packet now give the mechanism:
  - One issue per field, holding the `TAG_ERROR` keys joined by single spaces. I checked that no key contains a space.
  - With one reason the message is exactly today's single key, so the rows of `learningProfileSchema.test.ts` stay unchanged.
  - The form splits the message, translates each key with its own `maxOf` limit, and joins the texts.
  - The packet names the `zodResolver` first-issue-per-path cause.
  - Server errors, which are single keys, still split correctly.
- **D-2: closed.** Lines 49-58 and AC7 now give the true reasons:
  - `auth.spec.ts` ≈ line 504 and `smoke.spec.ts:91` follow `openAccountSection`, which already waits for the fade-in to end.
  - `checks.spec.ts` ≈ line 117 is now listed as a proof.
  - The `shells.spec.ts` loop is described as two Sheets and one Popover.
  - The AC7 line numbers match the code.
- **D-3: closed.** The fix differs from what I suggested and is better, as above.
- **D-4: closed.** AC3 now requires `getAll()` to be `[]` after sign-in (the sign-in's own variables hold the password) and the redirect to still work.
- **D-5: closed.** Scope 5 now asks for a pass and a still-failing fixture for each of the two changes. AC5 adds the still-failing `<br>` case.
- **D-6: closed.** The existing `/dev/ui` sample, already inside a section `h2`, passes `headingLevel={3}`, with no new dev string.
- **D-7: closed.** The packet says 8 markers, and the `/home/kali/App_projects/eng-lms/docs/09-harness/lessons-learned.md` ledger now has 8, including `ui/Sheet.module.css`, which matches the grep.

**Cumulative subagent tokens:** about 109,000, across round 1 and this delta. That is an estimate from my context-budget counter, not a metered figure.

DOCS-REVIEW T-M2.20: PASS