> Recorded by the LC from the fresh qa-evaluator's returned report (the harness blocks subagents from writing files). Verdict posted on PR #43 at `fb73e87` (the merged head; CI 7/7). Merged as `1dbd7e3` via merge-gate. Scratch files named below were the evaluator's session scratchpad (not kept). S4 disposition: F-1 accepted, no change (fails safe; DEC-085).

# QA report: T-M1.16 review polish (PR #43, head `fb73e87`)

All eight ACs pass. The only finding is one S4 (cosmetic); there is nothing at S1–S3 and nothing out of scope. Tested in the branch worktree against the packaged jar on :8080 and
the evaluator's own Vite dev server on :5174. The verdict was formed before reading the implementation, which was read only afterwards to describe the finding.

## AC results

| AC | Result | What was run |
|---|---|---|
| AC1 skeleton widths | PASS | Slowed first loads of `/`, `/tutor` and `/student` at 360, 768 and 1280, in vi and en, three ways. Lazy chunks held back: skeleton and switcher both 238 px, same inline-end. Chunks and fonts held back: both 236.92 px; the switcher grows by 1.08 px when the font arrives. Network throttling (~400 ms, 50 KB/s): identical widths and inline-end before the font swap, 238 px after. CLS ≤ 0.00069 (limit 0.05). At 360 px the shell skeleton puts the switcher on its own row on the left, where the real switcher goes. `RouteLoading` unit tests pass. |
| AC2 `/dev/ui` | PASS | vi → en → vi: the language-switcher groups move 0.00 px in segment width and offset at all three viewports; no horizontal scroll. The other segmented samples (List/Week/Month) change width by up to 54 px because their labels are translated; outside item 2. |
| AC3 names, dead markup | PASS | Records name each segment once. The "Querying" note is in the `SegmentedControl` docblock. `data-visible` appears 0 times in the built bundle. `SegmentedControl` test files unchanged; those tests plus `RouteLoading`'s pass (20/20). |
| AC4 lint | PASS | 20 network-call probes in `src/features/` all refused: the listed forms plus `self.EventSource`, `globalThis.navigator.sendBeacon`, `new window.XMLHttpRequest()`, `const { sendBeacon } = navigator`, renamed destructuring, `window["XMLHttpRequest"]`, `typeof`, `.bind`, an aliased navigator, optional chaining, `as Window`, `document.defaultView!`. Same code in `src/lib/api/` passes; a dynamic key and `Reflect.get(window, "fetch")` pass as intended. 17 directive probes: 16 refused (incl. `.tsx` JSX comments, `eslint-disable-line`, a multi-line block, `.mts`/`.js`); `eslint-enable` passes (harmless). Seven prose/string probes containing "eslint-disable" pass. Inline config comments (`/* eslint rule: off */`) are not honoured by oxlint, so no loophole. Lint passes on the current code. |
| AC5 merge-gate | PASS | 311 passed, 0 failed; the branch's tests against develop's gate give exactly the 6 new failures. 25 extra mocked probes: refused — pages that are `null`, a string, a number, `true` or invalid JSON; a zero-byte listing; an empty array; a gh 502; an array of strings or with a `null` element; `progress.json` with status `removed`, `MODIFIED` or `null`; a rename away from `progress.json`; `sub/progress.json`. Accepted — an empty first page followed by a valid one; `progress.json` on page 2. The Dependabot path matches. |
| AC6 Maven, docs | PASS | `./mvnw -v`: Apache Maven 3.10.0; `backend/` differs from develop by one line (`distributionUrl`). Both docs say `chore/<task-id>-deps-YYYY-MM`; merge-gate reads `T-M2.9` from `chore/T-M2.9-deps-2026-11`. The old name appears nowhere else. |
| AC7 step budget | PASS | Own cold-load test (fresh context, cache off, wait for h1, one Tab, focus on a radio and still there 600 ms later): 120/120 (20 runs × 3 viewports × CPU 1x and 4x). The implementer's test, 20 × per project, 6 workers, no retries: 60/60. |
| AC8 gate, CI, evidence | PASS | `gh pr checks 43`: 7/7 pass. Required screenshots present; the summary maps each AC to its proof. The full `gate.sh` was not re-run by QA (implementer's gate log + green CI). |

## Findings

| ID | Sev | Summary | Repro | Expected | Actual |
|---|---|---|---|---|---|
| F-1 | S4 | The directive check flags two comments that aren't real directives (errs on the safe side). | In `src/features/`, a JSDoc whose middle line is ` * eslint-disable no-console`, or a template literal with a line `// eslint-disable-next-line`; run `sh scripts/no-lint-directives.sh`. | Pass (neither is a directive for ESLint or oxlint). | Exit 1: the pattern `(^\|//\|/\*)[[:space:]*]*(eslint\|oxlint)-disable` matches any line starting with `*` or `//`, even inside a string. |

F-1 lets nothing through, and ordinary prose passes. Fine to defer.

## Other checks
- Scope: changed files match items 1–9; the tech-stack version-table row (3.10.0) is under the packet's "Docs to update".
- Keyboard: nothing focusable in the loading skeleton; the hidden sizer is `visibility: hidden` and `aria-hidden`.
- i18n: vi and en loading states look the same (the switcher labels are endonyms).
- Isolation and `SECRET-*` scan: not applicable (no student data, no API).
- Housekeeping: probe fixtures in the scratchpad or deleted; `git status --short` clean; ports 8080, 8081, 5174 free.

QA-VERDICT T-M1.16: PASS WITH MINOR
