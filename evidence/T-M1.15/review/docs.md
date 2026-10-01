# DOCS-REVIEW record: T-M1.15 (PR #26)

> Recorded by the LC from the fresh docs-reviewer's returned report. One review covers G0 and G3 (packet and fix in one PR, DEC-078). Head `dc42050`; merged as `9a68eb7`.
> Dispositions: F1, F2 (optional gate hardening) deferred to T-M1.16 (DEC-079); F3, F4, F6, F7 fixed on `docs/T-M1.14-packet`; F5 (handoff) fixed there too. Scratch paths
> are the reviewer's session scratchpad (not kept).

DOCS-REVIEW T-M1.15 covers PR #26 at head `dc42050`, with G0 and G3 in one review (DEC-078). I found no fail-open, so it passes, with seven S4 notes.

**Checks I ran (read-only)**
- `./scripts/check-docs.sh`: PASS (146 markdown files, `progress.json` valid, sources intact).
- `bash scripts/tests/merge-gate.test.sh`: 301 passed, 0 failed. This matches `evidence/T-M1.15/merge-gate-after.log`. The before log shows 295 passed and 6 failed against develop's gate: the 4 new tests plus 2 message checks. So the negative demo holds.
- `GH_DEBUG=api gh pr view 26 --json comments,files,commits` with gh 2.102.0: `comments(first: 100)` comes with `pageInfo`, so gh pages it. `files(first: 100)` and `commits(first: 100)` have no `pageInfo`. The packet's scope-3 claim is correct.
- CI on PR #26: docs-check and secrets-scan pass. backend, web, contract-drift, e2e-smoke and container-build were still pending when I checked. merge-gate enforces them, so this does not change the verdict.

**Can the change make the gate easier to pass?** I probed the new step-5 jq filter directly:
- **Error bodies fail closed.** An empty body, `null` or a string gives rc=1. An error object such as `{"message":"Not Found",...}` gives rc=5: `.[]?` walks the object's values and `.filename` on a string errors out. A non-2xx response or a failure mid-pagination makes `gh api` exit non-zero, which hits "cannot list the PR's files (fail closed)". Trailing garbage after valid JSON also gives rc=5, which refuses.
- **Pagination works.** Several arrays, whether concatenated (`][`) or on separate lines, are all read by `-n` + `inputs`. More files are seen than before, never fewer.
- **Removed and renamed files.** `removed` does not count, which is stricter than develop's gate. Renaming `progress.json` away (`filename` is the new name) does not count. Renaming something onto `progress.json` counts, as it did before.
- **Exact match.** `filename == "progress.json"` matches the root file only; `sub/progress.json` does not match.
- **Dropping `files` from `gh pr view` is safe.** Nothing else in `scripts/merge-gate.sh` reads `.files` from `pr_json`. The Dependabot path has its own paginated listing (lines 194-208), and no other script calls `pr view`.
- **The capped `commits` list does no harm.** It only feeds `commit_time`, a lower bound under the required activity and workflow-run times. Missing commits can only lower that bound, and the required server-side times still decide freshness. No change is needed.
- **Comments are paged by gh,** so a later negative verdict past comment #100 is still seen.

Overall the new step 5 is at least as strict as before: stricter on `removed`, on API errors and on files past #100.

**Packet against G0** (`docs/06-quality/quality-gates.md` §G0): goal, trace (DEC-078), scope, out of scope, guardrail answers, ACs, test plan, evidence, docs to update, risks and an estimate of ≤ 0.25 agent-day are all present. The dependency (T-M1.12, `9866f26`) is merged. The single-PR waiver is recorded in DEC-078 as a PO decision. A harness task needs no SPEC § trace, and I found no scope creep: the diff touches only step 5, its tests and the bookkeeping.

**Findings**
- **F1 (S4)** `scripts/merge-gate.sh:325`: the filter does not check that each page is an array, unlike the activity check at line 70. An object whose values are file-like objects would pass. GitHub never returns that shape, so this is not exploitable today. Suggested fix: `[inputs | if type == "array" then .[] else error("not an array") end | select(...)]`, or reuse the line-70 pattern. Optional hardening, so it can wait for a later task.
- **F2 (S4)** `scripts/merge-gate.sh:325`: the check lets in `status` values such as `unchanged` or a missing status. Develop's gate also accepted any listed path, so nothing got weaker. Suggested fix: optionally allow only `added`, `modified`, `renamed`, `copied` and `changed`.
- **F3 (S4)** `progress.json`, `gates.G0`: it is set to `pass` with the note "T-M1.15 packet in its own fix PR", but T-M1.15's G0 is this review. G1–G3 also carry T-M1.13's status while `currentTask` is T-M1.15, so the gates block mixes two tasks. Suggested fix: label each note with its task ID, and set T-M1.15's G0 to pass only once this verdict is posted.
- **F4 (S4)** `progress.json:20`: `updatedBy` still says "session 2026-09-28 #1", but `updatedAt` is 2026-10-02. Update it.
- **F5 (S4)** `docs/handoff/HANDOFF.md:1-16`: it still describes the T-M1.13 packet as unreviewed and does not mention T-M1.15 or blocker B-T-M1.13-merge. An agent starting with no chat history would get conflicting state from it and `progress.json`. Update it after merging, or before the session stops, as session-handoff-protocol requires.
- **F6 (S4)** `docs/tasks/backlog.md:25`: the T-M1.13 row still says **ready**, while `progress.json` records G3 passed and the merge blocked. Update the row when T-M1.13 merges, at the latest.
- **F7 (S4)** `evidence/T-M1.15/summary.md:15`: it says "CI: see the PR" for AC4. Record the run link and the 7/7 result before merging.

None of these blocks the merge: F1 and F2 are optional hardening, and F3–F7 are bookkeeping fixes the LC can make in the post-merge bookkeeping. Because this review was read-only, I did not write `evidence/T-M1.15/review/docs.md`. The LC should record this text there.

DOCS-REVIEW T-M1.15: PASS