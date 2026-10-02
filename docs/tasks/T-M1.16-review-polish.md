# T-M1.16: S4 polish from the T-M1.13 and T-M1.15 reviews; Maven 3.10.0

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **ready** (G0: DOCS-REVIEW on the packet PR, recorded in `evidence/T-M1.16/review/docs.md`; dependencies merged); **the PO start signal is still needed** |
| Owner role | FE (frontend-implementer) for items 1–5; LC for items 6 and 8 (harness, docs) and, by the exception in DEC-082, for the one-line item 7 in `backend/.mvn/wrapper/` |
| Branch | `feature/T-M1.16-review-polish` (from `develop`) |
| Depends on | T-M1.13 (`625c8fc`), T-M1.15 (`9a68eb7`) merged |
| Estimate | ≤ 1 agent-day |
| Trace | DEC-079 (the S4 deferrals; sources `evidence/T-M1.13/qa/report.md` F-1..F-4, `evidence/T-M1.13/review/ux.md` UX-2..UX-4, `evidence/T-M1.15/review/docs.md` F1/F2); DEC-082 (Dependabot triage: Maven 3.10.0 and the dependency-batch branch name); interaction-states §1 (skeletons match the final layout); frontend-architecture §1 (no network calls outside `lib/api`); tech-stack (upgrades) |

## Goal
Close the review leftovers before M2 reuses these pieces: skeletons as wide as the real language switcher, a `/dev/ui` example that keeps its width, E2E records and a docblock
that don't trip over the hidden label copy, no dead markup, no network-call loopholes beyond `fetch` outside `src/lib/api`, a stricter merge-gate file check, and the Maven
3.10.0 bump that Dependabot could not deliver within the merge-gate's allow-list.

## Scope
- In (FE):
  1. **Skeleton widths (QA F-2, UX-3).** `RouteLoading`'s switcher skeletons (the landing toolbar row and the shell header) are as wide as the real switcher (today `13rem`
     = 208 px vs 236–238 px). Use a token or a value derived from the switcher's layout, not a magic number tuned by eye. The block size stays 44 px (`--size-control-md`; the real switcher's 46 px
     is out of scope), and the shell and 404 skeleton shapes otherwise stay.
  2. **`/dev/ui` example width (QA F-1).** The gallery's `LanguageSwitcher` example (`web/src/dev/DevUiPage.tsx`, `SegmentedSamples`) sizes to its content instead of
     stretching with its column, so changing the UI language no longer moves its segment boundaries. Dev-only page; no `ui/` change.
  3. **Accessible names in records (QA F-4, UX-2).** `e2e/tests/polish.spec.ts` records each segment's accessible name (not `textContent`, which includes the hidden bold
     copy), and the `SegmentedControl` docblock says to query segments by role and accessible name (the label text is in the DOM twice).
  4. **Dead markup (UX-4).** Remove the unused `data-visible` attribute from the check icon in `web/src/ui/SegmentedControl.tsx` (the inline `visibility` stays; tests
     already assert visibility).
  5. **More lint loopholes (QA F-3).** Outside `src/lib/api/**`, `pnpm lint` fails on `XMLHttpRequest`, `EventSource` and `sendBeacon`, both as globals and as members
     of any object (`window.XMLHttpRequest`, `globalThis.EventSource`, `window.navigator.sendBeacon`: the global + property-only pair the `fetch` rule uses), and on
     any `eslint-disable`/`oxlint-disable` comment. Oxlint first; if the installed oxlint (1.85, or 1.86 if Dependabot #32 merges) has no rule for the disable comments, one `grep`-based step in the `lint` script is
     allowed (no new linter without a DEC). Dynamic keys and `Reflect.get(window, "fetch")` stay accepted (DEC-079).
- In (LC):
  6. **merge-gate file pages (T-M1.15 review F1, F2).** Step 5 fails closed when a page of the REST file listing is not an array, and counts `progress.json` only with
     status `added`, `modified`, `renamed`, `copied` or `changed`; the Dependabot path's file listing gets the same array check; tests with the mocked `gh`.
  7. **Maven 3.10.0 (DEC-082).** `backend/.mvn/wrapper/maven-wrapper.properties` `distributionUrl` 3.9.16 → 3.10.0 (Maven Central), nothing else (Dependabot PR #31
     also rewrote `mvnw.cmd` to CRLF with identical content, which the allow-list rightly refuses). Full gate green.
  8. **Dependency-batch branch name (DEC-082).** tech-stack.md and hoh-operating-model.md name the monthly batch `chore/deps-YYYY-MM`, which merge-gate refuses
     (`<kind>/<task-id>-<slug>`); rename it to `chore/<task-id>-deps-YYYY-MM` (the batch gets a backlog task ID).

## Out of scope (explicit)
- UX-1 (labels ~12 px off-centre; accepted, DEC-079); any keyboard-model or visual change of `SegmentedControl` beyond item 4; the T-M2.4 notes; new routes or `ui/`
  components; other dependency upgrades; `.gitattributes`/line-ending policy; GitLab CI image bumps.

## Guardrail answers (scope.md §6)
1. Trace: DEC-079, DEC-082 and the review records above. 2. No drift towards excluded scope (polish, lint, harness, build tool). 3. No tutor setup. 4. Weekly use: the
switcher skeletons are seen on every first load. 5. No exam or curriculum semantics; no new copy.

## Design notes
- Item 1: `web/src/app/routes/RouteLoading.tsx` (two `inlineSize="13rem"`); the switcher's width is the same in vi and en (its labels are endonyms: "Tiếng Việt", "English").
- Item 5: `web/.oxlintrc.json` (`no-restricted-globals` and property-only `no-restricted-properties` entries, as for `fetch`); keep the `src/lib/api/**` override for all of them.
- Item 6: `scripts/merge-gate.sh` step 5 and the Dependabot path's `files_out` reads (one shared array check can serve both), and `scripts/tests/merge-gate.test.sh` (reuse the array-type check of the activity listing in step 0).
- Item 7: no other backend change; if 3.10.0 breaks the build, stop and report (a DEC decides).

## Acceptance criteria
- **AC1 (item 1):** on a slowed first load at 360/768/1280, the landing toolbar skeleton and the shell-header switcher skeleton differ from the real switcher's inline size by
  ≤ 8 px and keep their inline-end position (recorded); CLS stays ≤ 0.05; `RouteLoading.test.tsx` green.
- **AC2 (item 2):** on the dev server (`/dev/ui`), switching the UI language changes no segment's width, nor its offset from the group's inline start, by more than 1 px
  at 360, 768 and 1280 (recorded, as T-M1.13's `devui-ac2-widths.log`; the whole example may move when the heading wraps differently).
- **AC3 (items 3–4):** the polish records show the accessible names (no doubled labels); the docblock note exists; `data-visible` is gone; `SegmentedControl` unit and axe
  tests unchanged and green.
- **AC4 (item 5):** `pnpm lint` fails on fixtures in `src/features/` using `XMLHttpRequest`, `window.XMLHttpRequest`, `EventSource`, `globalThis.EventSource`,
  `navigator.sendBeacon(`, `window.navigator.sendBeacon(` and an `eslint-disable`/`oxlint-disable` comment; passes for the same code in `src/lib/api/`; passes on the current
  code base; the T-M1.13 fetch probes are still reported by `pnpm lint` (negative demo in the evidence; fixtures not
  committed).
- **AC5 (item 6):** the gate refuses a file page that is a JSON object (step 5 and the Dependabot path) and a `progress.json` with status `unchanged` or no status; all earlier merge-gate tests pass; the new
  tests fail against develop's gate.
- **AC6 (items 7–8):** the wrapper properties name Maven 3.10.0 and nothing else in `backend/` changes; `./mvnw -v` shows 3.10.0; the two docs use the new branch name.
- **AC7:** `./scripts/gate.sh` green (`ENGLMS_TASK=T-M1.16`, log in the evidence); CI 7/7; screenshots at 360×740, 768×1024, 1280×800 in vi and en of the landing and shell
  loading states; `evidence/T-M1.16/summary.md` maps each AC to its proof.

## Test plan
- Implementation: unit (RouteLoading, SegmentedControl), E2E (AC1 measurements; AC2 on the dev server), lint fixtures (AC4), merge-gate tests (AC5), the full gate (AC6).
- Independent QA focus: throttled first loads of `/` and a shell route at the three viewports; the `/dev/ui` language switch; lint probes beyond the listed forms; the gate
  with odd file pages. **UX review** (ux-reviewer) is required at G3 (UI change).

## Evidence required
`evidence/T-M1.16/summary.md`, the gate log, the AC1/AC2 measurements, the lint and merge-gate negative demos, the screenshots, the CI links, the QA report (on `qa/T-M1.16`)
and the UX review (`evidence/T-M1.16/review/ux.md`, on the next docs branch).

## Docs to update
tech-stack.md and hoh-operating-model.md (item 8), `progress.json`, the evidence summary. Nothing else.

## Risks and assumptions
- Maven 3.10.0 is a minor release; plugins pinned in `pom.xml` may warn. Warnings are recorded, failures stop the item (design notes).
- A grep-based lint step must not match the word "disable" in prose; anchor it on the directive forms.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh && nvm use 24 && corepack enable
git checkout develop && git pull --ff-only && git checkout -b feature/T-M1.16-review-polish
cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget
cd .. && bash scripts/tests/merge-gate.test.sh
(cd backend && ./mvnw -v)
./scripts/dev-up.sh && ENGLMS_TASK=T-M1.16 ./scripts/gate.sh
cd web && pnpm dev   # /dev/ui measurement (AC2)
```
