# T-M2.19: Automated UI checks from the G3 measurement

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | ready |
| Owner role | FE (frontend-implementer) |
| Branch | `feature/T-M2.19-ui-checks` (from `develop`) |
| Depends on | T-M2.18 (`5dab35e`), T-M2.15 (`9b9e133`): merged |
| Estimate | 1 agent-day |
| Risk tier | M (E2E and lint tooling plus two motion tokens in `ui/`; no SEC trigger): one combined QA+UX reviewer, its UX part limited to the Spinner and Skeleton motion |
| Trace | DEC-131 (1) (the prevent lever), DEC-134 (this packet), T-M2.18 measurement (layout/wrapping 15 of 47 findings, a11y-focus 2, flaky 2); test-strategy §1; responsive-standards §3 items 1 and 8 (no horizontal scroll; usernames and URLs may break anywhere); accessibility.md (focus management); design-system §2 Motion (120–200 ms ease-out, tokens only, ADR-0013) |

## Goal
The finding types that cost T-M2.5 and T-M2.14 most of their G3 rounds are caught by the implementer's own E2E and lint run at G1: a long
word broken mid-word or a page that scrolls sideways with realistic long data, focus dropped to `body` after an action, an axe check taken
during a fade-in, and raw motion values. Each check is proven to fail on a violating page.

## Scope
- In:
  1. `e2e/support/checks.ts`:
     - `expectNoMidWordBreak(locator)`: no word of the element's text (split at white space) lies on more than one line box. Method (D-1): wait
       for `document.fonts.ready`; the locator must be visible and its text non-empty; for each word take a `Range` over its offsets in the
       element's text nodes and count the distinct `Math.round(rect.top)` of `range.getClientRects()`: exactly 1 passes, 0 (no rect) or ≥ 2
       fails. The existing `lineCount` of `students.spec.ts` moves into `checks.ts` and is reused. For human-language text (names, headings,
       labels, button text); usernames, emails, URLs and phones are excluded by the caller (responsive-standards §3 item 8 lets them break anywhere).
     - `expectFocusNotLost(page)`: polls (`expect.poll`, 5 s) until `document.activeElement` is neither `body`, `html` nor `null` (D-3: a
       transient `body` while a dialog closes is not a failure; staying there is).
     - `expectSettledAccessible(page)`: waits until no element has `data-entering` or `data-exiting`, then `expectNoAxeViolations` and
       `expectNoHorizontalScroll` (moves the local `expectAccessible` of `students.spec.ts` here; its callers use the shared one).
  2. `e2e/support/longData.ts`: a factory `longData(token)` (D-6: unique per run, the dev database is kept) returning fictitious values: a
     30-character, five-word vi full name, a 28-character username (`e2e-long-<token>` padded to 28), a 60-character email at `example.com`,
     a 120-character guardian name of vi words, a 30-character guardian relationship.
  3. `e2e/tests/checks.spec.ts` (`page.setContent` fixtures; a failure is asserted with `await expect(helper(...)).rejects.toThrow()` under a
     short `expect` timeout, never `test.fail`):
     - `expectNoMidWordBreak` fails on a word forced across two lines (a narrow box with `overflow-wrap: anywhere`), on a hidden element and on
       an empty element; passes on a box where every word fits on its line.
     - `expectFocusNotLost` fails after clicking a button that removes itself; passes after one that moves focus to a heading before removal.
     - `expectSettledAccessible` (D-2): (a) an element whose `data-entering` is removed after about 300 ms and which then has low contrast →
       fails on axe; (b) an element at part opacity (failing axe) only while `data-entering`, full contrast after → passes, while calling
       `expectNoAxeViolations` straight away on the same fixture fails; (c) a page wider than the viewport → fails on horizontal scroll.
     Runs on the three mandatory projects.
  4. `e2e/tests/students.spec.ts`, a new `describe('Long data (T-M2.19)')`: with the fixture, at 360×740, 768×1024 and 1280×800 in vi and
     en: the Students list (filtered to the new student), the workspace Profile view with one guardian, the Edit profile form, the guardian
     form, and Add student with the long values typed: `expectSettledAccessible` on each, and `expectNoMidWordBreak` on the full name in the
     list row, the `h1`, the guardian `h3`, the section `h2`s and the action buttons.
  5. `expectFocusNotLost`, called after the action's end state is visible (dialog gone, toast shown, row removed, list loaded), after each
     action of the students screens that removes or disables the focused element. Inclusion rule (N-1): every pressed control in
     `web/src/features/students/**` that unmounts, or becomes disabled, as a result of its own press. The list below is the LC's reading of that
     rule; the implementer greps the feature for more and adds any it finds (named in the summary), so AC4 cannot pass by omission:
     - the pager's last Next; Edit profile Save and Cancel; guardian form Save and Cancel; the guardian Remove confirm and the remove dialog's
       Cancel; the Archive Undo in the toast; the Reset password confirm; the conflict dialog's Reload and Cancel; Discard in the unsaved
       changes dialog; the contact-handle Remove (`StudentFields`); the list and workspace error-state Try again (`StudentsListPage`,
       `StudentWorkspacePage`); the guardian form's Add guardian row control: add the assertion where an E2E test already presses the
       control, otherwise add the press;
     - **new** (D-4; no E2E test performs them today): the guardians **Try again** (`page.route('**/api/v1/tutor/students/*/guardians', …)`
       answering 503 until the alert shows, then passing through), and the Add student guardian-row **Remove** of the first, a middle and the
       last row (three rows typed, each removed in turn).
  6. Lint: `web/stylelint.config.*` rejects a `ms`/`s` unit in `transition*` and `animation*` declarations outside `src/ui/tokens.css`
     (`declaration-property-unit-disallowed-list`). New tokens `--motion-duration-spin: 800ms` and `--motion-duration-pulse: 1.4s` in
     `tokens.css` (under Motion, with their use as a comment); `Spinner.module.css` and `Skeleton.module.css` use them; the reduced-motion
     rules are unchanged. The same rule rejects `ms`/`s` in custom properties declared outside `tokens.css` (`'/^--/'`, D-8; no module
     declares one today). A Vitest test (`// @vitest-environment node`; `web/scripts/` or `web/src/ui/`) lints sample CSS strings with the
     project config through the stylelint Node API: it fires for `transition: opacity 120ms` and for `--x: 1s`, passes for
     `transition: opacity var(--motion-duration)`.
  7. Docs: test-strategy §1 E2E row (the shared checks and the long-data walk); responsive-standards §3 item 1 (the helper compares with
     `documentElement.clientWidth`, not `innerWidth`; D-7); design-system §2 Motion (the two tokens; durations only from
     tokens, enforced by stylelint); `.claude/skills/frontend-standards` self-check names the helpers (LC, in the packet PR).
- Out of scope: new checks on screens other than the students screens (later packets reuse the helpers); changing any product behaviour or
  copy; the M2 polish findings (T-M2.20); a CI workflow change; `qa/`.

## UI rules (DEC-131 (2))
- No layout, focus, copy or validation change, and no visual change: the Spinner and Skeleton keep their durations, now through tokens.

## Guardrail answers (scope.md §6)
1. Trace: DEC-131 (1), DEC-134. 2. Drifts toward excluded scope? No (test tooling). 3. Mandatory setup added? No. 4. Weekly use? Every UI task's
gate. 5. Hard-coded semantics? None.

## Acceptance criteria
- AC1: the three helpers of scope 1 exist with a one-line doc comment each; `students.spec.ts` uses the shared `expectSettledAccessible`.
- AC2: `checks.spec.ts` proves each helper fails on its violating fixture and passes on the clean one (every case, three projects).
- AC3: the long-data walk of scope 4 passes at the three viewports in vi and en; the fixture lives in `longData.ts` and is fictitious.
- AC4: `expectFocusNotLost` runs after each action listed in scope 5 and passes.
- AC5: the stylelint rule fires on a raw duration and on a module custom property (Vitest proof) and `pnpm lint` passes with the two new tokens
  in place; the rendered Spinner and Skeleton keep 800 ms and 1.4 s and stop under reduced motion as before, asserted in E2E (computed
  `animation-duration` in the packaged app: the Skeleton in the Students list loading state (the list request held with `page.route` past the
  150 ms delay) and the Spinner in a pending Button (a held guardian Save); `/dev/ui` is not in the production build; jsdom does not resolve
  CSS modules or `var()`, D-5, N-2).
- AC6: docs of scope 7 updated.
- AC7: `./scripts/gate.sh` green once on the final head and CI green; every existing assertion kept (DEC-131 (6)); the gate's changed-spec ×3
  run passes for `students.spec.ts` and `checks.spec.ts`; the bundle budget unchanged.

## Test plan
- Implementation: `checks.spec.ts` (AC2), the long-data `describe` (AC3), the focus assertions (AC4), the Vitest stylelint test and the computed
  duration assertion (AC5); the gate.
- Independent QA focus (combined QA+UX, tier M): mutate each helper's input mentally and with a scratch spec: does each check really fail on a
  violation (no vacuous pass: e.g. a hidden element, an empty text, focus inside an `inert` region)? Are the scope 5 actions all covered? The
  Spinner and Skeleton look and stop as before (reduced motion). No product behaviour change (diff outside `e2e/` limited to the tokens, the two
  CSS files, the lint config and its test).

## Evidence required
- `evidence/T-M2.19/summary.md` (AC → proof, self-check, G3 cost table), one gate log on the final head + green CI, the review of tier M.
- The gate AC reads: "`./scripts/gate.sh` green once on the final head and CI green; existing assertions kept".

## Docs to update
- test-strategy §1; responsive-standards §3 item 1; design-system §2 Motion; `.claude/skills/frontend-standards` (LC).

## Risks & assumptions
- Line-box measurement can be brittle with fonts loading late: the helper waits for `document.fonts.ready` first.
- A check that is too strict blocks valid layouts (usernames break by design): the caller chooses the elements; the helper never scans the page.
- Long-data students stay in the dev database (fictitious, `e2e-long-*` usernames), as other E2E data does.

## Commands (reproducible)
```bash
ENGLMS_TASK=T-M2.19 ./scripts/gate.sh
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop tests/checks.spec.ts tests/students.spec.ts
(cd web && pnpm lint && pnpm test --run)
```
