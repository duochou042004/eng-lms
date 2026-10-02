> Recorded by the LC from the fresh qa-evaluator's returned report (the harness blocks subagents from writing files). Verdict posted on PR #37 at `0de5bb0` (the merged head; CI 7/7, e.g. backend run https://github.com/duochou042004/eng-lms/actions/runs/36964447084). Merged as `3a405ce`. Scratch files named below were the evaluator's session scratchpad (not kept).

I found no S1, S2 or S3 issues, so T-M1.14 (PR #37) passes, with one open item: the `e2e-smoke` CI check was still pending. Checked at head `0de5bb0` against packet ACs 1–5; repo untouched apart from two temporary mutations, both reverted, and `git status` is clean.

**Diff and scope.** The only backend change is `backend/src/test/java/com/englms/ApplicationIntegrationTest.java` (+22/−2). Nothing changed in `backend/src/main` or `pom.xml`, and there is no new dependency (Jackson 3 `JsonMapper` was already on the test classpath). The rest of the PR is `evidence/T-M1.14/**` and `progress.json`, which the packet allows. No SCOPE findings, and no retry, `@Disabled` or `@RepeatedTest` workaround was added.

**No assertion was dropped or loosened (AC1, AC2):**

| Check | develop | This branch |
|---|---|---|
| Valid incoming ID `it-rejected-1` | reused in the header | reused in the header, plus the body's `requestId` (read as JSON) equals it |
| Replacement ID format | `[0-9a-f-]{36}` | strict UUIDv7 pattern, plus `UUID.version()==7` and `variant()==2` (stricter) |
| Bad ID not echoed | body `doesNotContain("bad")` | header and body `doesNotContain("bad<id>","<")`, plus body `requestId` equals the header |

The one-line comment explaining why the generated digits can't fail the test is present (AC1).

**Mutation runs I did myself (AC2), each reverted with `git checkout`:**
- **Mutation A:** `RequestIds.resolve` returns any non-null incoming value. The test fails at line 217 because the header `"bad<id>"` doesn't match the pattern. This is the same result as the implementer's `mutation-demo.log`.
- **Mutation B (my own addition):** the valve writes the raw incoming header into the body while the response header stays a fresh ID. This is the case only the old `doesNotContain("bad")` would have caught. The test still fails, on line 222 (expected `01a0fadd-…`, but was `"bad<id>"`).

So both the header path and the body-only path are guarded.

**Determinism (AC3):**
- **Reasoning:** `Ids.newId()` always fixes the version nibble to 7 and the variant bits to 10, and `UUID.toString()` is lowercase hex, so the strict pattern matches every possible ID. The equality check doesn't depend on any digits, and hex never contains `<`, which every banned string includes. The valve builds the body from constants plus the ID, so it is always valid JSON.
- **Scratch program:** it ran the new assertions on 1,000,003 IDs: three edge cases (all zero bits, all one bits, the packet's `01a0e646-0000-7bad-8bad-000000000bad`) and 1M random ones. The new assertions failed 0 times. 5,844 of the IDs contain `bad`, about 1 in 171, so the old assertion would have failed on each of them.
- **Evidence log:** `determinism-demo.log` is consistent with this: the old assertion fails on the `-7bad-` body and the new ones pass.

**Other generated-ID substring assertions (AC4):** my grep found the same three `doesNotContain` calls as `scope2-grep.log`.
- Line 205's banned strings (`<`, `html`, `Tomcat`, `Exception`, `instance`, `meta`, `%2f`) each contain a non-hex character, so a generated ID can never trip them.
- Lines 184 and 202 (`[0-9a-f-]{36}`) can't fail because of the digits either.
- Nothing else needed fixing.

**Runs and CI (AC5):**
- I ran `./mvnw -B -q test -Dtest=ApplicationIntegrationTest` 3 times: all passed (31 tests, 0 failures).
- `runs-50.log` has 50 runs with 0 `FAIL`.
- The gate log ends with `gate: PASS (12 steps, 143s)`.
- `gh pr checks 37` showed 6 of 7 passing, with `e2e-smoke` still pending.

**Findings:**

| ID | Sev | AC | Finding |
|---|---|---|---|
| F-1 | S4 | AC5 | `e2e-smoke` was still pending when I checked, so "CI 7/7" isn't proven yet, and `summary.md` says only "CI: see PR #37" with no run links. The Lead Coordinator should confirm 7/7 before merging and ideally put the links in the summary. |
| F-2 | S4 | AC2 | Note only, no change needed. The body check now bans the exact `bad<id>` and `<` rather than the substring `bad`. A hypothetical "cleaned" echo such as `badid` would only be caught through `requestId`, by the header pattern and the body-equals-header check. That's enough today because the valve's body has no other field that comes from the request; this is what the packet asked for. |
| F-3 | S4 | — | Note only: `bodyRequestId` builds a new `JsonMapper` on every call. Trivial in a test. |

I didn't write `evidence/T-M1.14/qa/report.md` or post a PR comment, because you asked for text only. The Lead Coordinator should record this on `qa/T-M1.14` and post the verdict line to PR #37. Scratch files are in /tmp/claude-1000/-home-kali-App-sources-Eng-LMS/1df9a53f-30b6-4dda-9b00-44ad1b966024/scratchpad/qa14 (`Det.java`, `mutA.log`, `mutB.log`).

QA-VERDICT T-M1.14: PASS