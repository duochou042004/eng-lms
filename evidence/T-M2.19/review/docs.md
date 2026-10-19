# Docs review — T-M2.19 packet (G0)

> Recorded by the LC from the reviewers' returned text (DEC-131). Cost: round 1 full 52,403 tokens / 2.1 min; round 2 delta 21,187 / 0.3; round 3 delta 18,836 / 0.3.

## Round 1 (full)

DOCS-REVIEW T-M2.19: CHANGES REQUESTED

`./scripts/check-docs.sh` passed (296 markdown files, progress.json valid, sources intact). Every scope item traces to DEC-131 (1) or DEC-134, the guardrail answers are there, out of scope is explicit and the size is about one agent-day. Tier M is right: test tooling plus two motion tokens in `ui/`, no SEC trigger.

The stylelint rule is correct. Under the existing `declaration-property-unit-disallowed-list` it would be the key `'/^(transition|animation)/': ['ms','s']`. I grepped `web/src` and the only raw durations are `Spinner.module.css:7` (`800ms`) and `Skeleton.module.css:4` (`1.4s`). Every other `transition`/`animation` already uses `var(--motion-*)`, and `tokens.css` already turns this rule off in its override. Nothing else breaks. The field length limits allow the fixture: guardian name max 120, relationship max 40.

**D-1 · S3 (makes AC2/AC3 ambiguous and open to a vacuous pass) · `docs/tasks/T-M2.19-ui-checks.md:22-24`**
The packet does not say how "a word lies on more than one line box" is measured, or that the helper must fail when it has nothing to check. As written, a hidden element, empty text or a word with no client rects passes.
Fix: state the method. For each word, take a `Range` over its offsets in the element's text nodes and count the distinct `Math.round(rect.top)` of `getClientRects()`. This is the same approach as the existing `lineCount` in `e2e/tests/students.spec.ts:66-71`, which should move into `checks.ts`. Also require that the locator is visible, that its text is not empty, and that every word has at least one rect. Add a hidden element and an empty element to AC2's violating fixtures.

**D-2 · S3 (vacuous proof) · `:30-32`, AC2**
The `expectSettledAccessible` fixture is "an element still `data-entering` with a low-contrast colour". It can only fail by timing out on the wait, so it proves neither the axe call nor that waiting matters.
Fix: use two fixtures.
- (a) An element whose `data-entering` is removed after about 300 ms and which then has low contrast. The helper must fail on axe.
- (b) An element that is at part opacity, and so fails axe, only while `data-entering`, then becomes full contrast. The helper must pass, while calling `expectNoAxeViolations` straight away fails on it.

Also state how "fails" is asserted, for example `await expect(helper(page)).rejects.toThrow()` with a short `expect` timeout, not `test.fail`.

**D-3 · S3 (AC4 timing makes it vacuous) · `:37-40`**
`expectFocusNotLost` called right after the click can run before the element is removed. For example, the guardian Remove confirm button stays in the DOM until the DELETE answers. It can also catch a short moment where focus is on `body`.
Fix: call it after the action's end state is visible (dialog gone, toast shown, row removed). Or make the helper poll with `expect.poll` until focus is not `body`/`html`/`null`, with a stated timeout.

**D-4 · S3 · `:37-40`**
Several scope 5 actions are not performed by any E2E test today:
- The guardians Try again exists only in Vitest (`StudentGuardians.test.tsx`). `students.spec.ts` has no "Thử lại".
- The add-form row Remove (first, middle, last) is only measured (`:1928`), never clicked.

The list also leaves out actions that do remove the focused element and are already tested: Edit profile Save/Cancel, guardian form Save, the Archive and Reset password confirms, the conflict dialog Copy/Reload, and Discard in the dirty guard.
Fix: mark which actions are new tests and how to produce them (for Try again, `page.route('**/api/v1/tutor/students/*/guardians', …)` returning 503 once). Then either say the list is exhaustive and why, or add the missing actions.

**D-5 · S4 · `:63-64` (AC5)**
jsdom does not compute `animation-duration` from CSS modules or `var()`, so a component test cannot prove 800 ms / 1.4 s.
Fix: require E2E, or a Vitest test that reads the token values from `tokens.css`. Add `// @vitest-environment node` to the stylelint test, because `environment: 'jsdom'` is the global default in `web/vite.config.ts:16`.

**D-6 · S4 · `:28-29`, `:87`**
A fixed 28-character username collides across repeated runs: the dev database is kept and the changed specs run ×3.
Fix: make `longData.ts` a factory that takes a token while keeping the lengths (for example `e2e-long-${token()}` padded to 28).

**D-7 · S4 · `:12`, `:24`, DEC-134**
"responsive-standards §3.1" is cited for "usernames may break anywhere", but that rule is §3 item 8. Item 1 also still says `scrollWidth <= innerWidth`, while `checks.ts:20-27` uses `clientWidth`.
Fix: cite §3 items 1 and 8, and add the item 1 wording to Docs to update.

**D-8 · S4 · `:41`**
The rule can be bypassed with a custom property declared in a module (`--x: 120ms`).
Fix: add `'/^--/': ['ms','s']` to the same rule outside `tokens.css`, or accept and record the gap.

I did not check the SPEC traceability matrix (this is a tooling packet with no SPEC feature), the full template text, or the CI workflow. The shell timer gave about 1 minute for this review, which is probably too low.

## Round 2 (delta)

DOCS-REVIEW T-M2.19: CHANGES REQUESTED

- **D-1 closed.** The method is now defined: wait for fonts, require a visible element with non-empty text, take a `Range` per word and count distinct `rect.top` values. It passes only on exactly 1. The empty and hidden fixtures are in checks.spec.
- **D-2 closed.** Fixture (b) passes through the settle wait but fails on an immediate axe call. Fixture (a) fails on axe after the entering state ends, and (c) fails on horizontal scroll. Failures are asserted with `rejects.toThrow` under a short timeout.
- **D-3 closed.** `expectFocusNotLost` now polls for 5 s. Scope 5 says to call it after the end state is visible.
- **D-4 partly closed.** Try again (`GuardiansSection.tsx:168`) and the guardian-row Remove (`GuardianForm.tsx:153`) exist and are now listed as new E2E actions. The list is called "exhaustive", but it is not (see N-1).
- **D-5 closed.** AC5 asserts the computed `animation-duration` in E2E, and the stylelint test is marked `@vitest-environment node`.
- **D-6 closed.** `longData(token)` makes the username unique per run.
- **D-7 closed.** The citation is now §3 items 1 and 8, and responsive-standards §3 item 1 is added to the docs list. `checks.ts:16-17` already compares against `clientWidth`, so the item 1 edit is a wording update.
- **D-8 closed.** The rule now also rejects `ms`/`s` in custom properties outside `tokens.css`. The Vitest test covers `--x: 1s`.

**New findings**
- **N-1 · S3 · docs/tasks/T-M2.19-ui-checks.md, scope 5.** "Exhaustive for M2" is false. These unmounting controls are unlisted:
  - The contact-handle Remove (`StudentFields.tsx:231`).
  - The list and workspace retry buttons (`StudentsListPage.tsx:130,143`, `StudentWorkspacePage.tsx:63`).
  - The Add guardian row in the guardian form.

  Fix: add them to the list, marking each as already performed or new. Alternatively, drop the word "exhaustive" and state the inclusion rule, so AC4 cannot pass vacuously.
- **N-2 · S4 · scope 4/AC5.** The packet doesn't say which `/dev/ui` state or loading state carries the Spinner and Skeleton for the computed-duration assertion. Fix: name the route and the state.

`./scripts/check-docs.sh` passes (297 files).

Wall-clock: about 3 minutes.

I did not run any E2E specs. I only grepped the app for the actions and did not check which of them an existing test already performs.

## Round 3 (delta)

DOCS-REVIEW T-M2.19: PASS

**N-1: closed.**
- Scope 5 now has an inclusion rule: every pressed control in `web/src/features/students/**` that unmounts or becomes disabled on its own press. It no longer calls the list exhaustive.
- The implementer must grep for more controls and name any found in the summary, so AC4 can't pass by omission.
- The missing controls are added, and each exists in the code:
  - the contact-handle Remove, at `StudentFields.tsx:230`;
  - the list Try again, at `StudentsListPage.tsx:129` and `:142`;
  - the workspace Try again, at `StudentWorkspacePage.tsx:62`;
  - the Add guardian row control, in `GuardianForm.tsx` (the comment at `:115` says it is hidden at 10 rows).
- The D-4 "new" sub-list is untouched.

**N-2: closed.**
- AC5 now names the states:
  - The Skeleton in the Students list loading state, with the request held past the 150 ms delay. The code matches: `SKELETON_DELAY_MS = 150` in `useDelayed.ts`, `ListSkeleton` with `DelayedSkeleton` in `StudentsListPage.tsx:339`.
  - The Spinner in a pending Button, via a held guardian Save. `Button.tsx:70` renders `<Spinner />` on `isPending`, and `GuardianForm.tsx:328` passes `isPending`.
- The durations match the CSS: 800ms in `Spinner.module.css` and 1.4s in `Skeleton.module.css`. Both are set to `none` under reduced motion.
- The packet's claim that `/dev/ui` is not in the production build is not checked.

**New findings (S1–S3):** none.

The decision-log DEC-134 entry records both fixes consistently.

Wall-clock: about 2 minutes.

Not checked: I did not run `check-docs.sh`, and I did not confirm that `/dev/ui` is excluded from the production build.

LC note: `/dev/ui` is excluded from production builds (`web/src/app/router.tsx:107`, `import.meta.env.DEV`).
