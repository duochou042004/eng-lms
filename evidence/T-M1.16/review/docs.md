# DOCS-REVIEW record: T-M1.16 packet (PR #40)

> Recorded by the LC from the fresh docs-reviewer's returned reports (the harness blocks subagents from writing files).

| Round | Head | Verdict | Findings |
|---|---|---|---|
| 1 | `cfefa4e` | **CHANGES REQUESTED** | F1, F2 S3; F3–F8 S4 |

## Round 1 dispositions
| ID | Disposition |
|---|---|
| F1 | Fixed: DEC-082 says the five PRs are *to be* merged, each only with CI 7/7; outcomes go to the next merge record |
| F2 | Fixed: DEC-082 records the LC exception for the one-line wrapper bump (agent-roles §3); the Owner row names it |
| F3 | Fixed: "the installed oxlint (1.85, or 1.86 if #32 merges)" |
| F4 | Fixed: global + property-only pairs for `XMLHttpRequest`, `EventSource`, `sendBeacon`; `window.`/`globalThis.` fixtures in AC4 |
| F5 | Fixed: AC2 measures widths and offsets from the group's inline start, at 360/768/1280 |
| F6 | Fixed: the 44 px block size stays; the 46 px switcher height is out of scope |
| F7 | Fixed: item 6 and AC5 include the Dependabot path's file listing |
| F8 | Fixed: "are still reported by `pnpm lint`" |

## Round 1 report (`cfefa4e`)

DOCS-REVIEW of T-M1.16 (PR #40, `docs/T-M1.16-packet` at `cfefa4e`). Two S3 findings block a PASS.

I made no changes to the repo. I ran `./scripts/check-docs.sh` on an export of the branch in my scratchpad, which avoided a checkout. Because this review is read-only, I did not write `evidence/T-M1.16/review/docs.md`; the LC should record this text there.

**What checks out**
- **docs-check:** PASS (157 markdown files, `progress.json` valid, sources intact, prompt within limit). No broken links.
- **G0 completeness:** every section of the packet template is present. The packet has 7 ACs, its estimate of ≤ 1 day is within the ≤ 2 day limit, and its dependencies T-M1.13 and T-M1.15 are merged.
- **Traceability:** items 1–6 match the DEC-079 sources exactly (QA F-1..F-4, UX-2..UX-4, T-M1.15 review F1/F2). UX-1 is correctly left out. Items 7–8 trace to DEC-082. Adding the shell-header skeleton to item 1 is justified: it uses the same `13rem` and interaction-states §1 is in the trace.
- **Code claims, all confirmed on develop:**
  - `RouteLoading.tsx` lines 18 and 49 both use `inlineSize="13rem"`.
  - `SegmentedSamples` in `DevUiPage.tsx` contains a `LanguageSwitcher`.
  - `SegmentedControl.tsx:65` has `data-visible`, with the inline `visibility` on line 66.
  - `polish.spec.ts:75` records `textContent`.
  - `.oxlintrc.json` has fetch-only global and property rules plus the `src/lib/api/**` override.
  - In `merge-gate.sh`, the step 0 array check is at line 70 and step 5 is at line 325.
  - The wrapper properties name 3.9.16.
  - `tech-stack.md:91` and `hoh-operating-model.md:49` say `chore/deps-YYYY-MM`. The branch regex `^[a-z]+/(T-M[0-9]+\.[0-9]+)([-_].*)?$` refuses that name and accepts `chore/T-Mx.y-deps-YYYY-MM`.
- **#31 claim verified:** the only change to `mvnw.cmd` is CRLF line endings (all 189 lines are identical once CR is removed), and `mvnw.cmd` is not in `DEPENDABOT_FILES_RE`. #31 is closed (06:07:01Z) with a comment pointing to T-M1.16.
- **FE and LC items in one PR:** this is sound. It is one feature PR, the merge path needs QA-VERDICT, QA's focus covers the gate, and the PR fits in ≤ 1 day. One ownership exception is in F2.
- **Bookkeeping:** `progress.json`, `HANDOFF.md`, the prompt (3,335 chars) and the backlog agree with each other. G0 stays `pending` and the PO start is listed as pending. The IDs in the prompt (FR-AUTH-09/10, ADR-0005, T-M2.1) exist.

**Findings**

- **F1 (S3)** `docs/10-governance/decision-log.md:90` (DEC-082): it says #29, #30, #32, #33 and #34 "are merged one at a time", which reads as done. In fact all five are OPEN right now: #32 has `e2e-smoke=fail` and #33 has `e2e-smoke` pending. If #32 never merges, the "oxlint 1.85 → 1.86" in this permanent record is also misleading.
  - **Fix:** say "are to be merged one at a time … each only with CI 7/7", and record the actual outcomes (merged or still open) in the next merge record or DEC.
- **F2 (S3)** `docs/tasks/T-M1.16-review-polish.md:7` and `:34`: item 7 changes `backend/.mvn/wrapper/maven-wrapper.properties`. Under `docs/09-harness/agent-roles.md` §3, `backend/**` is owned by BE, but the packet gives item 7 to the LC and no DEC records an exception.
  - **Fix:** either name BE (a backend-implementer) as owner of item 7, or have DEC-082 state the exception explicitly ("one-line wrapper bump by the LC, as on the Dependabot path"). Then mention it in the Owner role row.
- **F3 (S4)** packet line 29 says "oxlint 1.86", but develop pins `oxlint` 1.85.0 (`web/package.json:42`) and #32 is failing.
  - **Fix:** say "the installed oxlint (1.85, or 1.86 if #32 merges)".
- **F4 (S4)** packet lines 28 and 49 (item 5) prescribe `no-restricted-globals` for `XMLHttpRequest`/`EventSource` and `no-restricted-properties` with `object: "navigator"`. That leaves `window.XMLHttpRequest`, `globalThis.EventSource` and `window.navigator.sendBeacon` uncaught, the same gap the fetch rule closes by pairing a global rule with a property-only rule. QA's "probes beyond the listed forms" will find this, and it would be deferred again.
  - **Fix:** mirror the fetch pair, with property-only rules for `XMLHttpRequest`, `EventSource` and `sendBeacon`, and add a `window.`-prefixed fixture to AC4.
- **F5 (S4)** AC2 (lines 56–57) says "moves no segment boundary … by more than 1 px". QA F-1 showed the whole example can move when the heading wraps differently (at 768).
  - **Fix:** measure boundaries relative to the group's inline start, or measure segment widths as `devui-ac2-widths.log` did.
- **F6 (S4)** item 1 and AC1 (lines 20–21, 54–55): QA F-2 also records the real switcher as 46 px tall against the 44 px (`--size-control-md`) skeleton.
  - **Fix:** say whether the block size is in scope. "Shapes otherwise stay" suggests it is not, so state that.
- **F7 (S4)** item 6 (lines 32–33): the Dependabot path's file listing (`scripts/merge-gate.sh` lines 192–215) has the same unchecked `.[]?` page pattern as step 5.
  - **Fix:** apply the same array check there in item 6 (it is cheap), or list it under Out of scope.
- **F8 (S4)** AC4 (lines 61–62): "the T-M1.13 fetch probes still fail" is ambiguous.
  - **Fix:** say "are still reported by `pnpm lint`".

**Files reviewed**
- /home/kali/App_sources/Eng-LMS/docs/tasks/T-M1.16-review-polish.md
- /home/kali/App_sources/Eng-LMS/docs/10-governance/decision-log.md
- /home/kali/App_sources/Eng-LMS/docs/tasks/backlog.md
- /home/kali/App_sources/Eng-LMS/progress.json
- /home/kali/App_sources/Eng-LMS/docs/handoff/HANDOFF.md
- /home/kali/App_sources/Eng-LMS/docs/handoff/next-session-prompt.md
- /home/kali/App_sources/Eng-LMS/docs/handoff/archive/20261002T0430Z-T-M1.14-merged.md

DOCS-REVIEW T-M1.16: CHANGES REQUESTED
