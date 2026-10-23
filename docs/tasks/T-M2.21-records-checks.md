# T-M2.21: Records consistency in check-docs

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | in_review (PO start signal 2026-10-23; G0 DEC-151; G1 gate PASS on `f866c09`) |
| Owner role | LC (implements the scripts and the record fixes; G3 by a fresh docs-reviewer) |
| Branch | `chore/T-M2.21-records-checks` (from `develop`); this packet on `docs/T-M2.21-records-checks` |
| Depends on | T-M2.20 (`f3a77fa`) and its records (PRs #137, #138, `995d047`): merged |
| Estimate | 0.5 agent-day |
| Risk tier | **L**: scripts, tests and docs only (`scripts/check_docs.py`, a new `scripts/tests/` file, record fixes in Markdown). No product code, endpoint, UI or data change. G3 = one fresh docs-reviewer that also runs the new fixtures and mutates each check (DEC-150 (1)) |
| Trace | lessons-learned L-09 (LC record slips) and L-01 (a check is proven failing); DEC-139 (4) (backlog T-M2.21, whose row names the code-span `\|` case); evidence-and-handoff part C step 1 and part B step 3; session-handoff-protocol §3 step 2 (the archive); coding-agent-rules §4.5; DEC-150 (this packet's decisions) |

## Goal
Make `./scripts/check-docs.sh` catch the record slips that the LC made by hand at merges (L-09). Three slips become automated failures:
a completed task whose backlog row or packet Status was never set to done; a `HANDOFF.md` rewritten without archiving the old one; and a
table row whose code span holds a bare `|`, which splits the row on GitHub. Each check is proven failing on a fixture. The same PR fixes
every stale record that the checks find today, so `develop` stays green.

## Scope
- In:
  1. **Completed tasks are done in the backlog.** For each `id` in `progress.json` `completed[]`, the first row of
     `docs/tasks/backlog.md` whose ID cell is that ID (`| T-M2.20 |`, `| **T-M1.1** ✅ |`) has a cell that starts with `**done**` in lower case (G3 G-3), so `**Done**` or a `**done**` inside the prose fails (part C step 1:
     `**done** (`<sha>`, DEC-<n>, packet link)`). The check fails when there is no such row or the row has no `**done**`.
  2. **Completed tasks are done in their packet.** For each such `id` that has a packet file `docs/tasks/<id>-*.md`, the value of its first
     `| Status |` row outside a fenced block starts with `done` once `*` and spaces are stripped (`done (…)`, `**done**: …`). The check fails when the packet
     has no Status row or the value starts with anything else (`ready`, `in_progress`, `in_review`, `blocked`, …). A completed task with
     no packet file (T-M0.1, T-M1.20, T-M2.8) is checked in the backlog only.
  3. **A rewritten handoff is archived.** The check fails when `docs/handoff/HANDOFF.md` changed against the merge base of the base ref
     and no new file was added under `docs/handoff/archive/`. Changed means committed since the merge base, staged, unstaged or untracked:
     the `changed_files` pattern of `scripts/gate.sh` (`git diff --name-status <base>...HEAD`, `git diff --name-status HEAD`,
     `git ls-files --others --exclude-standard`), all with `--no-renames`, so an archive made with `git mv` and a fresh `HANDOFF.md` still
     counts as an added archive file. The base ref is `${ENGLMS_DOCS_BASE:-${ENGLMS_GATE_BASE:-origin/develop}}` (so the gate's `docs` step follows `ENGLMS_GATE_BASE`); the CI `docs-check` job sets `ENGLMS_DOCS_BASE=origin/${{ github.base_ref }}` only when `github.event_name == 'pull_request'` (unset on pushes, where `base_ref` is empty, so the default applies). Pushes to `develop` or `master` use `origin/develop` (accepted: on `master` the check fails only if a release edits the handoff without an archive). When the base does not resolve, the
     check **fails** and names the unresolved ref and the variable it came from (it fails closed, L-01). On `develop` itself the diff is empty and the check passes.
  4. **No bare `|` in a table-row code span.** In every Markdown file the other checks read, minus the files git ignores (the LC's
     `.claude/scratch/` copies, `evidence/*/raw/`), a line outside a fenced block that starts with `|` (after leading spaces) fails when a
     code span on it (one or more backticks, the same number closing it) holds a `|` not preceded by `\`. The message names the file,
     the line and the span.
  5. **Fixtures** (L-01, coding-agent-rules §4.5): `scripts/check_docs.py` reads its root from `ENGLMS_DOCS_ROOT` (default: the
     repository). A new `scripts/tests/check-docs.test.sh`, which `scripts/tests/run-all.sh` picks up, builds each fixture as a temporary
     git repository from the committed tree (`git archive HEAD`, committed once as the base with the `git -c user.name=… -c user.email=…`
     pattern of `scripts/tests/gate.test.sh`, as the CI runner has no identity) and adds one violation. Every run sets
     `ENGLMS_DOCS_ROOT` to the fixture and `ENGLMS_DOCS_BASE` to the fixture's base commit (a fixture has no `origin/develop`), and runs the
     **working-tree** `scripts/check_docs.py`, not the fixture's archived copy, so the AC5 mutation run tests the edited script. All git
     calls of the checks run in the root (`git -C <root>`). For each check, the
     clean fixture passes (exit 0), and each violating fixture fails (exit 1) with that check's message and no other failure. Cases:
     scope 1, a completed row without `**done**` and a completed ID with no row; scope 2, a packet Status `ready (G0)` and a packet with
     no Status row; scope 3, `HANDOFF.md` changed and committed without an archive file (fails), the same change uncommitted (fails), with
     a committed new archive file (passes), with an untracked new archive file (passes), and an unknown `ENGLMS_DOCS_BASE` (fails); scope 4,
     `` `a|b` `` in a table row (fails), `` `a\|b` `` in a table row, `` `a|b` `` in a paragraph and inside a fenced block (all three
     pass), a double-backtick span ``` `` a|b `` ``` in a table row (fails), and `` `a|b` `` in a table row of a git-ignored
     `.claude/scratch/x.md` (passes).
  6. **Stale records fixed** (found by the LC's scan at 2026-10-23 on `995d047`; the implementer re-runs the new checks and fixes
     whatever else they find, listing it in the summary):
     - Packet Status of eight completed tasks → `done (`<mergeCommit>`, PR #<n>)`, with the SHA copied from `progress.json` `completed[]`
       `mergeCommit` and the PR from its `note` or the git merge subject: T-M1.2 (`ae9ac5d`, PR #2), T-M1.3 (`8b9d938`, PR #4), T-M1.17 (`077f4e4`, PR #50), T-M1.18 (`20625d9`, PR #51),
       T-M1.19 (`8be6d9f`, PR #78), T-M2.4 (`9fcc992`, PR #82), T-M2.15 (`9b9e133`, PR #112), T-M2.18 (`5dab35e`, PR #113).
     - Backlog rows without `**done**`: T-M0.1 (its Status cell becomes `**done** (PO-APPROVED, merge a14caae)`), T-M1.1 (`(done, …)`
       becomes `**done** (…)`), T-M2.14 (its trailing `**Done** (`6073e71`, DEC-127; …)` moves to the start of the title cell as
       `**done**`, the part C format).
     - Four table-row code spans with a bare `|`, each escaped as `\|` (the rendered text is unchanged):
       `docs/05-frontend/design-system.md:31`, `docs/04-backend/engines.md:27`, `evidence/T-M1.17/review/docs.md:17`,
       `evidence/T-M1.12/review/docs.md:33`.
  7. **Docs**: the `check_docs.py` docstring and its PASS message list the three new checks (the docstring also the two variables);
     `ci-cd.md` §1 (`docs-check` row), `session-handoff-protocol.md` §3 step 1 (what `check-docs.sh` validates; step 2 notes that
     `check-docs` fails without the archive), `README.md` (the `check-docs.sh` comment in the clone block) and
     `.claude/agents/docs-reviewer.md` step 1 name them; the `docs-check.yml` step name gains "records";
     lessons-learned L-09 "automation: backlog T-M2.21" becomes "enforced by `check-docs` (T-M2.21)"; evidence-and-handoff part C step 1
     and part B step 3 each say that `check-docs` fails when they are skipped.

## Out of scope (explicit)
- Checking that `progress.json` `completed[]` holds every merged task, or that an open task is not marked done: neither is in the backlog
  row, and no slip of that kind was seen.
- Checking numbers in DECs or the handoff against their sources (L-09's second half): not mechanical; part C step 4 stays a checklist.
- Checks on the content of an archive file, its name format, or that the archive equals the previous `HANDOFF.md`.
- Rewording any record beyond the fixes in scope 6; other format differences between backlog rows (M1's `✅`, link style) stay.
- PR #100 (held, DEC-139); T-M2.10, T-M2.13, T-M2.16.

## Guardrail answers (scope.md §6)
1. **Trace:** DEC-139 (4) asked for this row after the T-M2.19 record slips (L-09). 2. **Drift toward excluded scope?** No: governance
tooling in the existing docs gate. 3. **Mandatory setup added?** None: the checks use `git` and Python 3 like the gate already does; no new
package (`jsonschema` stays the only one). 4. **Weekly use?** Yes: `check-docs` runs at every LC commit, in `gate.sh` and in CI.
5. **Hard-coded semantics?** None: no curriculum or exam text.

## Design notes
- **Files**: `scripts/check_docs.py` (three check functions, the two variables), `scripts/tests/check-docs.test.sh` (new),
  `.github/workflows/docs-check.yml` (the step name and `ENGLMS_DOCS_BASE` on pull requests), the record fixes of scope 6, and the docs of scope 7.
- **Where the checks run**: `check-docs.sh` runs bare by the LC, in the `docs` step of `gate.sh` and in the CI `docs-check` job
  (`fetch-depth: 0`, so `origin/develop` is there for the merge base on PRs and pushes). On a pull request CI checks out the merge commit,
  whose merge base with `origin/$BASE_REF` (the `develop` tip for PRs into `develop`) is the base tip, so the diff is the PR's own changes.
- **Contradiction scan (lessons L-03)**, each resolved here and in DEC-150:
  (a) The backlog row says "fail when a task … still reads `ready`/`in progress` in its backlog row". The scan found T-M2.14's row,
  which reads neither and carries `**Done**` at its end. The check is therefore the positive rule (the row holds `**done**`, part C's
  format), which catches that row too. For packets the positive rule is the same: the Status starts with `done`.
  (b) The backlog header says "Status lives in `progress.json`". Part C step 1 already mirrors the done state into the row and the packet,
  and the check enforces that mirror. It does not make the backlog the source.
  (c) Session-handoff protocol §3 step 2 and part B step 3 already require the archive at every handoff, so the check adds no new duty. A second
  edit of `HANDOFF.md` on the same branch (a records fix after a docs review) passes, because the branch's diff still holds its archive file.
  (d) Two of the escaped pipes are in reviewer records (`evidence/T-M1.12/review/`, `evidence/T-M1.17/review/`). Escaping changes no rendered
  text, and path ownership allows `chore/` branches to change `evidence/*/review/**` (`check-path-ownership.sh`: only `qa/` paths are refused).
  (e) Kept tests: the `scripts/tests/*.test.sh` suites do not run `check_docs.py`, and every existing suite stays unchanged.
- **Shortcut ledger** (lessons L-12; `grep -rnE '(shortcut|ponytail):'` at 2026-10-23: the 8 markers of lessons-learned, none in
  `scripts/`): none fires; no package is bumped.
- **Implementer**: the LC on `chore/T-M2.21-records-checks`, after the PO's start signal. The LC records `evidence/T-M2.21/summary.md`.
  The fresh docs-reviewer returns its text only, and the LC records `evidence/T-M2.21/review/docs.md` on the chore branch, which a docs or
  chore branch may hold (path ownership).

## UI rules
- Not applicable: no UI change.

## Domain rules
- Not applicable: no data written by the product.

## Acceptance criteria
- AC1 (scope 1): with a completed ID whose backlog row lacks `**done**`, or that has no backlog row, `check-docs.sh` exits 1 and names the
  ID and `docs/tasks/backlog.md`. The clean fixture passes (fixture tests).
- AC2 (scope 2): with a completed ID whose packet Status starts with anything but `done`, or whose packet has no Status row,
  `check-docs.sh` exits 1 and names the packet file and its Status. `**done**: …` and `done (…)` both pass (fixture tests).
- AC3 (scope 3): a `HANDOFF.md` change without a new `docs/handoff/archive/` file fails, both committed and uncommitted. With a new
  archive file, committed or untracked, it passes. An unknown `ENGLMS_DOCS_BASE` fails and the message names the variable (fixture tests).
- AC4 (scope 4): a table-row code span with a bare `|`, with one backtick or two, fails and names file:line. `\|` in a table row, a bare
  `|` outside a table, and one inside a fenced block pass. Git-ignored Markdown is not read (fixture tests).
- AC5 (scope 5, L-01): `scripts/tests/check-docs.test.sh` runs from `run-all.sh` and holds every case of scope 5. With any one of the
  three new check functions made to return early, at least one of its cases fails. The summary shows that run's output for each check.
- AC6 (scope 6): the eight packet Status lines, the three backlog rows and the four code spans are fixed as listed. `./scripts/check-docs.sh`
  passes on the final head, and the summary lists any other record the new checks found with its fix.
- AC7 (scope 7): the docstring and PASS message, `ci-cd.md`, `session-handoff-protocol.md`, `README.md`, `docs-reviewer.md`,
  `docs-check.yml`, lessons-learned L-09 and the evidence-and-handoff skill say what the new checks enforce.
- AC9 (G1, DEC-153): the kept test `RouteError.test.tsx` "the copy follows the connection while shown (AC11 (a))" reads the heading
  and text after the `online` and `offline` events through `await findByRole` / `findByText` (same names and texts; no assertion
  removed); the web suite passes in the gate.
- AC8: `ENGLMS_TASK=T-M2.21 ./scripts/gate.sh` green once on the final head and CI green (7/7). The gate's `docs` and `scripts` steps
  cover the change; `backend` and `contract-drift` are skipped for this diff. Every existing script test and assertion is kept.

## Test plan
- Implementation: the fixture suite of scope 5 (bash, `scripts/tests/lib.sh` helpers `expect_exit` and `expect_output_contains`); a
  mutation run per check (AC5); `check-docs.sh` bare on the branch before each commit; the gate once on the final head.
- **When a new check finds a real defect** outside this packet's listed fixes (lessons L-10), such as a record that cannot be fixed
  without a decision (a completed task whose merge SHA or PR is unknown), the LC rules on it at once: the fix with a DEC, or a narrower
  check with a DEC. The ruling comes before G3.
- Independent review focus (docs-reviewer, tier L): run `scripts/tests/check-docs.test.sh` and mutate each check (comment out its call) to
  see its cases fail. Try to fool each check: a `**done**` that sits in another task's row, a Status row in a code block, an archive file
  deleted rather than added, a pipe in a span that crosses a cell boundary, CRLF line ends. Confirm `develop`-style runs (`HEAD` equal to
  the base) pass, and that every scope 6 fix copies its SHA from `progress.json` `mergeCommit` and its PR from the `note` or merge subject.
- **Isolation**: not applicable (no endpoint).

## Evidence required
- `evidence/T-M2.21/summary.md` (LC: AC → proof, the AC5 mutation output, the list of fixed records, the G3 cost table), one gate log on
  the final head + green CI. G3: `evidence/T-M2.21/review/docs.md`, recorded by the LC from the reviewer's returned text.

## Docs to update
- Scope 7, plus at the records merge the backlog row (`**done**`), this packet's Status (`done (…)`, which the new check requires) and
  `progress.json` (LC).

## Risks & assumptions
- **Size**: 8 ACs, about half a day. **Split line**: none expected.
- **False failures locally**: a stale local `origin/develop` makes the merge base older, so more files count as changed. That widens the
  handoff check only when `develop` itself rewrote `HANDOFF.md` without an archive, which the check forbids. `git fetch` before
  `check-docs` remains the habit.
- **Fixture cost**: `git archive HEAD` of the whole tree takes a few seconds per fixture. The suite builds each fixture once and keeps it
  well under the `docs-check` job's 10-minute limit.
- The checks parse the record formats in use at 2026-10-23 (the backlog ID cell, the packet `| Status |` row). A new format must keep
  these, or the check must change in the same PR.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
git fetch origin
./scripts/check-docs.sh
bash scripts/tests/check-docs.test.sh
./scripts/tests/run-all.sh
ENGLMS_DOCS_BASE=origin/does-not-exist ./scripts/check-docs.sh   # must fail closed
ENGLMS_TASK=T-M2.21 ./scripts/gate.sh
./scripts/check-path-ownership.sh chore/T-M2.21-records-checks
```
