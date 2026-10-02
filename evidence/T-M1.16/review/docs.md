# DOCS-REVIEW record: T-M1.16 packet (PR #40)

> Recorded by the LC from the fresh docs-reviewer's returned reports (the harness blocks subagents from writing files).

| Round | Head | Verdict | Findings |
|---|---|---|---|
| 1 | `cfefa4e` | **CHANGES REQUESTED** | F1, F2 S3; F3–F8 S4 |
| 2 | `ca427c3` | **PASS** | R2-1, R2-2 S4 (fixed in the next commit: the item 6 design note; this record) |
| 3 | `3dc3561` | **CHANGES REQUESTED** | new scope item 9 (flaky route-focus test): R3-1 S3 (DEC-082 / item 9 misstated the CI facts), R3-2..R3-5 S4; all fixed in the next commit |

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

## Round 2 report (`ca427c3`)

Round 2 at head `ca427c3`: **PASS**. All eight round-1 findings are fixed, and I found two small S4 notes, neither blocking.

`check-docs.sh` passes at `ca427c3` (158 markdown files, `progress.json` valid, sources intact, prompt within limit). I ran it on an export of that commit in my scratchpad, with no checkout of the main tree and no repo changes.

**Round-1 findings**
| ID | Status at `ca427c3` |
|---|---|
| F1 (S3) | Fixed. DEC-082 now says the five PRs are "**to be** merged … each only after `@dependabot rebase` and CI 7/7", with outcomes going to the next merge record. That matches GitHub: they are still open and #32's E2E is red. |
| F2 (S3) | Fixed. DEC-082 records the LC exception to `backend/**` being BE-owned (agent-roles §3) for the one-line wrapper bump, and the packet's Owner row cites it. |
| F3 | Fixed: "the installed oxlint (1.85, or 1.86 if Dependabot #32 merges)". |
| F4 | Fixed. Item 5 and the design note now use a global rule plus a property-only rule for each name, as the `fetch` rule does. AC4 adds `window.XMLHttpRequest`, `globalThis.EventSource` and `window.navigator.sendBeacon(` fixtures. |
| F5 | Fixed. AC2 now checks segment widths and offsets from the group's inline start at 360, 768 and 1280, and says the whole example may move. |
| F6 | Fixed. The block size stays 44 px; the real switcher's 46 px is explicitly out of scope. |
| F7 | Fixed. Item 6 and AC5 now cover the Dependabot path's file listing as well. |
| F8 | Fixed: "are still reported by `pnpm lint`". |

**New findings**
- **R2-1 (S4)** The item 6 design note in `docs/tasks/T-M1.16-review-polish.md` still names only "step 5". Since the scope now also covers the Dependabot listing, the note should point the implementer to it as well (`scripts/merge-gate.sh`, about lines 192–215, the `.[]?` reads of `files_out`). One shared array check could serve both listings. This is not blocking, because the scope line and AC5 already state the requirement.
- **R2-2 (S4)** `evidence/T-M1.16/review/docs.md` currently ends with the round-1 line `DOCS-REVIEW T-M1.16: CHANGES REQUESTED`. Add this round-2 report and its final PASS line to the record before merging, so the file's last verdict matches the PR.

**Files reviewed**
- /home/kali/App_sources/Eng-LMS/docs/tasks/T-M1.16-review-polish.md
- /home/kali/App_sources/Eng-LMS/docs/10-governance/decision-log.md
- /home/kali/App_sources/Eng-LMS/evidence/T-M1.16/review/docs.md

DOCS-REVIEW T-M1.16: PASS

## Round 3 report (`3dc3561`, after item 9 was added)

Round 3 at head `3dc3561`: **CHANGES REQUESTED**, for one S3. DEC-082 misstates what happened on #32's first run, and the new item 9 says the test passed on re-run, which no run has shown yet.

Adding the flaky test as item 9 is sound in itself. The race is real, the fix is test-only, and the flaky policy in `docs/06-quality/test-strategy.md:40` (a DEC entry plus a fix within one milestone) is met. `check-docs.sh` passes at `3dc3561` (158 markdown files, `progress.json` valid, sources intact, prompt within limit). I ran it on an export in my scratchpad and changed nothing in the repo.

**What the CI logs show**
- **#30, attempt 1 (run 36973007377):** "1 failed, 85 passed". The failure is `[laptop] route-focus.spec.ts:139`, step 1, `toBeFocused` "Received: inactive". Attempt 2 is still running.
- **#32 (run 36958901028):** also "1 failed, 85 passed". The failure is `[tablet] route-focus.spec.ts:139`, same error. The other ✘ is `guards.spec.ts:76`, "the console guard fails on an error raised 300 ms after the test body ends (**expected failure**)", which is a designed failure and counts as passed. #30's log shows the same line. #32 has not been re-run and still shows `e2e-smoke=fail`.
- **Merged so far:** #29 and #33. #30, #32 and #34 are open.
- **The race is confirmed in the code:** in `route-focus.spec.ts`, `page.goto('/')` is followed immediately by `keyboard.press('Tab')`, with no wait for the landing page to render.

**R3 findings**
- **R3-1 (S3)** in `docs/10-governance/decision-log.md` (DEC-082) and `docs/tasks/T-M1.16-review-polish.md:33-35` (item 9):
  - DEC-082 still says #32's first run had "two E2E failures on a stale base, a timing guard and a tablet step budget, that pass on develop". There was only one real failure, the flaky step-budget test. The "timing guard" is the designed expected failure, not a failure. The same entry now also says the cause is the flaky test, so it contradicts itself.
  - Item 9 says "failed on #30 and #32 … passed on re-run". #30's re-run has not finished and #32 was never re-run.
  - **Fix:**
    - DEC-082: "#32's first run had one E2E failure, the flaky `route-focus.spec.ts:139` on tablet; the `guards.spec.ts:76` ✘ is its designed expected failure".
    - Item 9: "re-run requested for #30; outcomes in the next merge record".
- **R3-2 (S4)** packet line 7: the Owner row does not mention item 9, although it sits under "In (FE)". **Fix:** "FE for items 1–5 and 9".
- **R3-3 (S4)** packet line 78: the Test plan still says "the full gate (AC6)". **Fix:** change it to AC8.
- **R3-4 (S4)** packet line 72 (AC7): "each of the three projects" does not name them, and the Playwright config has six projects. **Fix:** name `phone-small`, `tablet` and `laptop`, for example `--project=phone-small --project=tablet --project=laptop --repeat-each=20`.
- **R3-5 (S4)** packet line 11 (Trace) and the Goal: neither mentions the flaky test. **Fix:** add "flaky route-focus test (DEC-082; test-strategy flaky policy)" to the Trace row and a short clause to the Goal.

**Files reviewed**
- /home/kali/App_sources/Eng-LMS/docs/10-governance/decision-log.md
- /home/kali/App_sources/Eng-LMS/docs/tasks/T-M1.16-review-polish.md
- /home/kali/App_sources/Eng-LMS/docs/tasks/backlog.md
- /home/kali/App_sources/Eng-LMS/e2e/tests/route-focus.spec.ts

DOCS-REVIEW T-M1.16: CHANGES REQUESTED
