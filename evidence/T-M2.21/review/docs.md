# Docs review — T-M2.21 packet (G0)

> Recorded by the LC from the reviewer's returned text (DEC-131). One fresh docs-reviewer. Cost: round 1 (full) 78,905 tokens / 4.8 min
> (286.8 s, on `c92d5b6`); round 2 (delta) 12,275 tokens / 0.4 min (25.4 s, on `f34144a`; cumulative 91,180). Round 1: S3 D-1..D-3 and S4
> D-4..D-8 fixed in `f34144a`. Round 2: S4 N-1 and N-2 fixed by the LC in the G0 records commit.

## Round 1 (full)

DOCS-REVIEW T-M2.21: PASS WITH MINOR

There are no S1, S2 or SCOPE findings. Three S3 findings should be fixed in the packet before LC-APPROVED. They are cheap doc edits.

**What I checked**
- **`./scripts/check-docs.sh` (bare, head `c92d5b6`):** `docs-check: PASS (339 markdown files, progress.json valid, sources intact, prompt within limit)`, exit 0. The diff against `develop` is four files: the packet, DEC-150, the backlog row and `progress.json`.
- **Stale records:** I re-ran the proposed done rules over all 35 `completed[]` entries. The result is exactly the packet's list:
  - eight packet Status lines (T-M1.2, T-M1.3, T-M1.17, T-M1.18, T-M1.19, T-M2.4, T-M2.15, T-M2.18);
  - three backlog rows (T-M0.1, T-M1.1, T-M2.14; T-M2.14 has a trailing `**Done**`).
  - The scan missed nothing.
- **SHAs and PRs:** all eight `mergeCommit` values and PR numbers match the git merge subjects (#2, #4, #50, #51, #78, #82, #112, #113) and the `completed[].note` text. T-M0.1 is `a14caae` and the "Depends on" line (#137, #138, `995d047`) is correct.
- **Pipe scan:** I applied the scope 4 rule to the 269 Markdown files git does not ignore. It finds exactly the four listed locations and no others. `engines.md:27` holds two bare pipes (`|correct|`), and both need escaping.
- **Fetch depth and merge base:** `docs-check.yml` uses `fetch-depth: 0`. For a PR into `develop`, the merge commit's merge base is the `develop` tip, so the diff is the PR's own changes. On a `develop` push the diff is empty.
- **LC handoff workflow:** part B step 3 archives with a plain `mv`, then writes a new `HANDOFF.md`. Uncommitted, this gives `M HANDOFF.md` plus an untracked archive, which passes. Committed, it gives `M` + `A`, which passes.
- **History of the archive rule:** 13 past PRs (#75–#111) changed `HANDOFF.md` without an archive. None did after DEC-139, and `develop` stays green because its diff is empty. So design note (c), "no new duty", holds against the written rule.
- **Path ownership:** `chore/` may change `evidence/*/review/**`; only QA paths are refused.
- **Kept tests:** `gate.test.sh:17` stubs `check-docs.sh`, so no existing suite runs `check_docs.py`.
- **Shortcut ledger:** 8 markers, none in `scripts/`.
- **Fixture cost:** building from `git archive HEAD` (51 MB), then `git init`/commit, then `check_docs.py` took 1.5 s per fixture.
- **G0:** every template section is present and tier L is justified.
- **Consistency:** packet, DEC-150, backlog row and `progress.json` agree. Status is `draft` in both packet and `progress.json`, and G0 is `pending`.

**Findings**

**D-1 (S3) — wrong section pointers to the handoff protocol.**
- Where: `docs/tasks/T-M2.21-records-checks.md:12`, `:90`, `:60`.
- Problem: lines 12 and 90 say "session-handoff-protocol §4" requires the archive, but §4 is the HANDOFF.md template. The archive step is §3 step 2 (`session-handoff-protocol.md:33`), plus the §1 "Archive" row. Line 60 (scope 7, AC7) says to update "step 2 (what `check-docs.sh` validates)", but that list is in §3 step 1 (`:32`).
- Fix: cite "§3 step 2" for the archive. In scope 7, name "§3 step 1 (the check-docs list)", and optionally add a note to step 2 that check-docs fails without the archive.

**D-2 (S3) — scope 7 misses two docs that list what check-docs covers.**
- Where: `docs/tasks/T-M2.21-records-checks.md:59-62`, `:120`.
- Problem: `README.md:176` and `.claude/agents/docs-reviewer.md:11` both enumerate the check-docs coverage ("schema, links, ID references, source integrity…"). The second file is the procedure of this task's own G3 reviewer. Both would go stale. The PASS line in `check_docs.py` `main()` also lists only the old checks.
- Fix: add both files, and the PASS message, to scope 7 and AC7.

**D-3 (S3) — the fixture spec leaves out things the implementer needs to build it correctly.**
- Where: `docs/tasks/T-M2.21-records-checks.md:39-47`, `:115`.
- Problems and fixes:
  - (a) A fixture repository has no `origin/develop`, so the default base fails closed and even the clean fixture would fail. Fix: state that every fixture sets `ENGLMS_DOCS_BASE` to the fixture's base commit.
  - (b) It does not say that all git calls run in `ENGLMS_DOCS_ROOT` (`git -C "$root"`). It also does not say that the suite runs the working-tree `scripts/check_docs.py` against the fixture, not the archived copy. Without that, the AC5 mutation run proves nothing. Fix: state both.
  - (c) AC4 claims "Git-ignored Markdown is not read (fixture tests)", but scope 5 has no such case. Fix: add a case where `.claude/scratch/x.md` holds a table row with `` `a|b` `` and the run passes.
  - (d) The CI runner has no commit identity. Fix: say to use the `git -c user.name=… -c user.email=…` pattern of `scripts/tests/gate.test.sh:101`.

**D-4 (S4) — parse rules are underspecified, and the no-packet list is incomplete.**
- Where: `docs/tasks/T-M2.21-records-checks.md:22-28`, `:131-133`.
- Problems:
  - The test plan asks the reviewer to try "a Status row in a code block", but scope 2 never says which `| Status |` row counts.
  - Nothing says the `**done**` match is case-sensitive, yet T-M2.14's `**Done**` must fail before its fix.
  - Line 28 lists T-M0.1 and T-M2.8 as completed tasks with no packet, but T-M1.20 has none either.
- Fix: say "the first `| Status |` row outside a fenced block", "`**done**`, lower case", and add T-M1.20 to the list.

**D-5 (S4) — the base ref outside PRs into `develop`.**
- Where: `docs/tasks/T-M2.21-records-checks.md:33`, `:81-83`.
- Problem:
  - Pushes to `master`, and PRs into `master` or `release/*`, diff against `origin/develop`, not their real base. This is harmless today: the check fails only when such a diff edits the handoff without an archive.
  - Separately, `gate.sh` honours `ENGLMS_GATE_BASE`, but its docs step would ignore it.
- Fix: either pass `ENGLMS_DOCS_BASE=origin/$BASE_REF` in the docs step on PRs (the same way the path-ownership step does), or note this as accepted. Also consider defaulting to `${ENGLMS_DOCS_BASE:-${ENGLMS_GATE_BASE:-origin/develop}}`, or say why not.

**D-6 (S4) — DEC-150 (4) reads backwards in raw Markdown.**
- Where: `docs/10-governance/decision-log.md:158`.
- Problem: in raw Markdown, "a code span holding a `\|` not preceded by a backslash fails" names the allowed form. It reads correctly only when rendered. Agents read the raw text.
- Fix: write "a code span holding an unescaped pipe fails".

**D-7 (S4) — the trace points to a file a fresh agent cannot read.**
- Where: `docs/tasks/T-M2.21-records-checks.md:12`.
- Problem: "DEC-139 … its review D-8" exists only in the git-ignored `.claude/scratch/lc-records/DEC-139-docs-review-all.txt:76`. CI and a fresh clone cannot follow it.
- Fix: cite the backlog row, or quote the finding in one line in Design notes.

**D-8 (S4) — small record-keeping gaps.**
- Where: `docs/tasks/T-M2.21-records-checks.md:50`, `:134`, `:142`.
- Problems:
  - `completed[]` has no `pr` field; the PR numbers live in `note` and the git merge subjects, yet lines 50 and 134 say the PR is copied "from `progress.json`".
  - "Docs to update" leaves out T-M2.21's own packet Status (`done (…)`), which the new check will require at the records merge.
- Fix: say "SHA from `mergeCommit`, PR from `note` or the merge subject", and add the packet Status to line 142.

Not checked: I did not build the checks or run the mutation runs, since nothing is implemented yet. I did not verify the "7/7" CI count against branch protection, or the `ci-cd.md` §1 wording beyond line 11. Risk: the stray-backtick case, where an unmatched backtick pairs across a cell boundary, could give a false failure. The scan shows no such line today.

## Round 2 (delta)

DOCS-REVIEW T-M2.21: PASS

I checked round 2 as a delta, against `git diff c92d5b6 f34144a`. The commit changes two files: the packet and DEC-150. Bare `./scripts/check-docs.sh` passes (340 Markdown files, `progress.json` valid, sources intact, prompt within limit), exit 0.

**Round-1 findings, each checked in the diff**
- **D-1 closed.** Trace, design note (c) and scope 7 now point to §3 step 2 for the archive and §3 step 1 for what check-docs validates.
- **D-2 closed.** Scope 7 and AC7 now include `README.md`, `.claude/agents/docs-reviewer.md` step 1 and the PASS message.
- **D-3 closed.** The four gaps are filled: commit identity (the `gate.test.sh` pattern), `ENGLMS_DOCS_ROOT` plus `ENGLMS_DOCS_BASE` set to the fixture's base commit, the working-tree script runs against the fixture, `git -C <root>` for the checks' git calls, and a new git-ignored `.claude/scratch/x.md` case that passes.
- **D-4 closed.** It now says "first `| Status |` row outside a fenced block", that `**Done**` fails, and T-M1.20 is in the no-packet list.
- **D-5 closed as the LC chose.** The base is `${ENGLMS_DOCS_BASE:-${ENGLMS_GATE_BASE:-origin/develop}}`, CI sets `origin/$BASE_REF` on PRs, and master pushes are accepted as-is. The design note's file list now includes the workflow env change.
- **D-6 closed.** DEC-150 (4) now says "an unescaped pipe".
- **D-7 closed.** The trace now points to the backlog row, which does name the code-span `\|` case.
- **D-8 closed.** The PR number now comes from `note` or the merge subject, and "Docs to update" names this packet's own Status.

**New findings (both S4, optional)**

**N-1 (S4) — the CI wiring on push events is not spelled out.**
- Where: `docs/tasks/T-M2.21-records-checks.md:33`.
- Problem: `github.base_ref` is empty on push events. A step-level `ENGLMS_DOCS_BASE: origin/${{ github.base_ref }}` would become `origin/`, which does not resolve. The check fails closed, so every push to `develop` would go red. Also, today `BASE_REF` is only set in the path-ownership step's own `env`, so the docs step does not have it.
- Fix: one clause: "set only when `github.event_name == 'pull_request'` (empty or unset on pushes, so the default applies)".

**N-2 (S4) — two leftovers from the D-5 change.**
- Where: `docs/tasks/T-M2.21-records-checks.md:34` and `:88-90`.
- Problem:
  - The fail-closed message "names `ENGLMS_DOCS_BASE`", but the unresolved base may now come from `ENGLMS_GATE_BASE`.
  - The design note "Where the checks run" still describes the PR merge base as being against `origin/develop`.
- Fix: say the message names the unresolved ref and the variable it came from. Say "against `origin/$BASE_REF` (the `develop` tip for PRs into `develop`)".

The fixes introduced nothing else new: no contradiction with DEC-150 or the backlog row, and no new scope.

Cumulative subagent_tokens: about 80,000 across both rounds. This is an estimate from my remaining context budget; I have no exact meter.

Not checked: round 2 was a delta only, so I re-read just the changed lines and did not re-scan the repository records. Several new packet lines run past the file's usual wrap width. That is cosmetic and check-docs does not enforce it.


# G3 review — T-M2.21 implementation (tier L)

> Recorded by the LC from the reviewer's returned text (DEC-131). One fresh docs-reviewer. Cost: round 1 (full) 72,125 tokens / 9.1 min
> (543.8 s, on `b536b20`); round 2 (delta) 21,875 tokens / 5.3 min (319.1 s, on `21aa682`; cumulative 94,000). Round 1: S4 G-1..G-8, G-10
> fixed in `0ce387c`/`9715628`/`f866c09`, G-9 by the gate on the final code head; round 2: S4 N-1..N-3 fixed in `d08454c` (gate PASS, 428 s).

## Round 1 (full)

DOCS-REVIEW T-M2.21: PASS WITH MINOR

I found no S1–S3 problems. The three checks do what the packet asks, every AC is met on `b536b20` (AC8 caveat in G-9), and the scope 6 fixes are correct. The findings below are test gaps, edge cases, and a few wrong numbers in the records.

## What I checked
- **State:** branch `chore/T-M2.21-records-checks`, head `b536b20`, `origin/develop` at `b34c0a6`. The tree was clean when I started and is clean now. `scripts/check_docs.py` was put back with `git checkout --` after each mutation, and I deleted my scratch directory `/tmp/claude-1000/t-m221-rev`.
- **`bash scripts/tests/check-docs.test.sh`:** 32 passed, 0 failed, 21 s.
- **`./scripts/check-docs.sh` (bare):** PASS (346 markdown files, records consistent, handoff archived, table code spans escaped).
- **`ENGLMS_DOCS_BASE=origin/does-not-exist ./scripts/check-docs.sh`:** exit 1, and the message names the ref and the variable.
- **Mutation runs** (one edit to `check_docs.py`, suite re-run, file restored each time):

| Mutation | Result |
|---|---|
| `check_done_records` call removed | 14 cases fail |
| `check_handoff_archived` call removed | 8 cases fail |
| `check_table_code_spans` call removed | 4 cases fail |
| untracked files not counted | 1 fails |
| `(?<!\\)` escape check removed | 12 fail |
| fences ignored in the span check | 1 fails |
| fences ignored in the Status check | 1 fails |
| `.lower()` added to the `**done**` test | 1 fails |
| `--exclude-standard` removed | 1 fails |
| **`[ \|]` ID boundary removed** | **all 32 pass (survives)** |
| **`--no-renames` removed from the committed diff** | **all 32 pass (survives)** |
| **any git status counts as an archive file** (so a deletion counts) | **all 32 pass (survives)** |
| fences ignored in the backlog row search | all 32 pass (survives) |

- **Attempts to fool the checks** (fixtures built from `git archive HEAD`):

| Case | Result | Correct? |
|---|---|---|
| T-M1.1 row without `**done**` while the T-M1.10+ rows have it | FAIL | correct |
| CRLF line ends in the backlog, a packet, and a pipe-span file | only the real span fails | correct |
| Archive file deleted plus a `HANDOFF.md` change | FAIL | correct |
| Span crossing a cell boundary (`` `x \| y` ``) | FAIL | correct |
| `HEAD` equal to the base (develop-style) | PASS | correct |
| `**done**` only in the row's prose | PASS | false pass (G-3) |
| A `~~~` fenced `done` Status before the real `ready` one | PASS | false pass (G-4) |
| Archive committed, then deleted in the working tree | PASS | false pass (G-5) |
| Stray backticks in two separate cells | FAIL | false failure (G-6) |
| Table-like line in an indented code block | FAIL | false failure (G-6) |

- **CI expression:** `pull_request` gives `origin/<base_ref>`. A push gives `''`, which `os.environ.get` treats as unset, so `origin/develop` applies. `fetch-depth: 0` makes `origin/develop` available. Correct.
- **Scope 6:** each of the eight packet SHAs equals `progress.json` `completed[].mergeCommit`, and each PR number equals the `Merge pull request #n` subject of that commit:

| Task | Merge commit | PR |
|---|---|---|
| T-M1.2 | `ae9ac5d` | #2 |
| T-M1.3 | `8b9d938` | #4 |
| T-M1.17 | `077f4e4` | #50 |
| T-M1.18 | `20625d9` | #51 |
| T-M1.19 | `8be6d9f` | #78 |
| T-M2.4 | `9fcc992` | #82 |
| T-M2.15 | `9b9e133` | #112 |
| T-M2.18 | `5dab35e` | #113 |

  The three backlog rows changed only as the packet lists (word-diff). The T-M2.14 evidence pointer is kept. All four spans now use `\|`, which GitHub renders as `|` inside a table cell. The bare run of `check-docs.sh` finds nothing else stale.
- **Scope 7:** the docstring, the PASS line, `ci-cd.md` §1, `session-handoff-protocol.md` §3 steps 1–2, `README.md`, `docs-reviewer.md`, `docs-check.yml`, L-09 and the evidence-and-handoff skill (parts C1 and B3) all match what the code enforces. The DEC-150/151/152 entries, the packet, the T-M2.13 backlog row and `progress.json` agree with each other. No scope creep.

## Findings

**G-1 (S4)**, `scripts/tests/check-docs.test.sh:32`, test gap. Nothing guards the ID boundary `[ |]` at `check_docs.py:163`, which is the T-M1.1 vs T-M1.10 case the packet asked about.
- Reproducer: delete the T-M1.1 backlog row. With the boundary in place it fails ("no row"). Without the boundary the regex matches the `| T-M1.11 |` row, which has `**done**`, and it passes.
- Fix: add that case: `edit docs/tasks/backlog.md` to drop `^| **T-M1.1** ✅`, expect exit 1 and "T-M1.1 … has no row".

**G-2 (S4)**, `scripts/tests/check-docs.test.sh:57-58`, the `git mv` case does not test `--no-renames`.
- Problem: `HANDOFF.md` still exists after the move, so git never reports a rename, and the case passes with or without the flag. The flag matters when `diff.renames=copies` is set: the archive then shows as `C`, not `A`. There is also no case for a deleted archive file, so the "any status counts" mutation survives.
- Fix: in the `git mv` fixture, run `g "$FX" config diff.renames copies` before the check. Add a fixture that removes an existing archive file with `git rm`, changes `HANDOFF.md`, commits, and expects exit 1.

**G-3 (S4)**, `scripts/check_docs.py:165`, `**done**` anywhere in the row counts.
- Reproducer: `| T-M2.20 | (follows T-M2.19, **done**) (…` passes.
- Problem: this matches the packet's "holds the marker", but it leaves the "done in another task's text" hole the review focus names.
- Fix (optional, a narrower rule): require `**done**` at the start of a cell after the ID cell, e.g. `re.search(r"\|\s*(\(?)\*\*done\*\*", row)`, or note the limit as a `shortcut:` comment.

**G-4 (S4)**, `scripts/check_docs.py:152`, `unfenced()` only knows backtick fences.
- Problem: `~~~` fences are not recognised, and fence lengths are not matched, so a ```` ```` ```` fence that contains ```` ``` ```` flips the state.
- Reproducer: put `~~~\n| Status | done |\n~~~` before a real `| Status | ready |` row. The check passes.
- Fix: also recognise `~~~`, and close a fence only with the same character and at least the opening length. Or add a `shortcut:` comment, since no repo doc uses `~~~` today.

**G-5 (S4)**, `scripts/check_docs.py:191-194`, the committed and working-tree statuses are merged without netting them out.
- Reproducer: commit a `HANDOFF.md` change together with a new archive file, then `rm` the archive file without committing. The diffs show `A` (committed) and `D` (working tree), and the check passes even though no archive file exists.
- Fix: decide "added" from the end state: a path under `docs/handoff/archive/` that is not in `git ls-tree -r --name-only <merge-base>` but exists on disk. Or accept the gap and add a `shortcut:` comment.

**G-6 (S4)**, `scripts/check_docs.py:198,212`, false failures. Both fail closed, so they only create noise.
- Stray backticks: GitHub splits cells before it parses code spans, but `SPAN_RE` scans the whole line. `| it`s | that`s |` is reported as span `` `s | that` ``.
- Indented code: a 4-space indented code block whose line starts with `|` is treated as a table row.
- Fix: none needed now. Optionally mention both in the docstring as known limits.

**G-7 (S4)**, `evidence/T-M2.21/summary.md:10,27`, the summary's numbers are wrong (L-09).
- "32 assertions over 19 fixtures": the suite creates 14 fixtures (`grep -cE '(^|; )fixture'` gives 14), and it calls `expect_*` 27 times for 32 results.
- AC6 quotes "343 markdown files" "on the final head". 343 is the `e5a59b9` count from the gate log. Bare on `b536b20` it is 346, and the count includes git-ignored files, so it varies by machine.
- Fix: say 14 fixtures. Quote the AC6 line from a run on the final head, or drop the file count.

**G-8 (S4)**, `progress.json:39-40`, `currentTask` is stale.
- Problem: `"pr": null` although PR #140 is open, and `"lastCommit": "e5a59b9"` while the head is `b536b20`.
- Fix: set `pr` to `"140"` and `lastCommit` to the final head in the next records commit.

**G-9 (S4)**, AC8 and the packet Status: the gate log is from `e5a59b9`, not the final head.
- Problem: AC8 asks for the gate "green once on the final head". `b536b20` added only docs and evidence, and I confirmed the `docs` step's check passes on it. But any G3 fix commit makes the head change again.
- Fix: run `ENGLMS_TASK=T-M2.21 ./scripts/gate.sh` on the final head after the fixes, and update the summary and the Status line.

**G-10 (S4)**, `docs/tasks/backlog.md:63` and `decision-log.md:160` (DEC-152): the ruling is sound, but the follow-up names too little of the test.
- The ruling is sound under L-10: the LC ruled before G3, with a DEC, and sent the fix to a backlog row rather than widening a tier-L chore branch. The diagnosis also fits L-05, a single synchronous `getByRole` right after the `online` event.
- Problem: the same test reads synchronously after the `offline` event too (`RouteError.test.tsx:321-322`), and the `online` branch's `getByText` at `:317` has the same pattern. Both rows cite only `:316`.
- Fix: word the T-M2.13 addition as "the AC11 (a) test `RouteError.test.tsx:310-325` reads both transitions through `findBy*` / `waitFor`".
- Minor: the failed gate log is "kept in the LC's local records only", so the "8/8 runs alone" figure in DEC-152 has no trace in the repo. Either commit a trimmed failure excerpt under `evidence/T-M2.21/impl/` or soften the sentence.

---
What I did not check: CI on PR #140 (7/7) and the full `run-all.sh` and `gate.sh`, which I did not re-run. I did not confirm the exact GitHub rule for `\\|` inside a span, so it is not reported. There is no risk to `develop`: every gap above is S4, and except for G-6 (noisy false failures) they can only let a record slip through, not change data.

## Round 2 (delta)

DOCS-REVIEW T-M2.21: PASS WITH MINOR

All ten round-1 findings are fixed, and AC9 (DEC-153) is sound. There is one new S4 (N-1). It comes from the G-5 fix and only affects local runs; CI would still catch the slip.

## What I checked (delta `b536b20..21aa682`, head `21aa682`)
- **Fixture suite** (`bash scripts/tests/check-docs.test.sh`): 38 passed, 0 failed.
- **`./scripts/check-docs.sh` bare:** PASS (347 markdown files, records consistent, handoff archived, table code spans escaped).
- **Mutations** (each one restored with `git checkout --`):

| Mutation | Result |
|---|---|
| `check_done_records` call removed | 18 cases fail |
| `check_handoff_archived` call removed | 10 fail |
| `check_table_code_spans` call removed | 4 fail |
| ID boundary `[ \|]` removed (G-1) | 3 fail; survived in round 1 |
| any archive file counts, not only new ones (G-2) | 6 fail; survived in round 1 |
| archive judged from git history instead of the files on disk (G-5) | 1 fails |
| `**done**` matched anywhere in the row again (G-3) | 1 fails |
| fence handling removed from the backlog row search | survives; low value, not raised |

- **The fixes:**
  - **G-1, G-2:** the new fixtures are present and work. The `diff.renames copies` case is in. `--no-renames` no longer matters, because the archive is now judged by `ls-tree` of the merge base against the files on disk.
  - **G-3:** the backlog rule is now `\|\s*\*\*done\*\*`. The T-M1.1 row was reworded to `**done** (`f1e3caa`) …`.
  - **G-4, G-6:** `shortcut:` comments are added, worded correctly.
  - **G-5:** the add-then-delete case now fails.
  - **G-8:** `progress.json` has `pr` "140" and `lastCommit` `f866c09`.
  - **G-10:** the DEC-152 wording is fixed. The failed log `gate-20261023T122611Z.log` (on `e5a59b9`) shows the RouteError failure.
- **Gate logs:** `125112Z` on `9715628` fails on the same test. `125431Z` on `f866c09` passes (13 steps, 426 s). Between `f866c09` and `21aa682` only evidence and `progress.json` change, so AC8 holds for the final code head.
- **AC9 / DEC-153:** the diff only turns four `getBy*` reads into `await findBy*`. The names, texts and matchers are the same, nothing was removed, and the `waitFor` and Retry assertions are unchanged. `RouteError.test.tsx` passed 3 of 3 runs alone (22 tests each).
  - The ruling is sound under L-10 and L-05: it failed 2 of 3 local gates, it is a test-only fix, and it was ruled before G3, as with DEC-135.
  - Tier L still fits. `check-path-ownership.sh` passes (31 files).
  - The DEC-152 text in the T-M2.13 row is fully removed.

## New findings

**N-1 (S4)**, `scripts/check_docs.py` `check_handoff_archived` (the `archive_now` line): git-ignored files in the archive folder count as a new archive file.
- Problem: the folder is listed with `glob("*")`, which includes files that git ignores. On macOS, a `.DS_Store` (ignored by `.gitignore:2`) or a `*.swp` editor file (`.gitignore:4`) makes the check pass. This is a local false pass (L-01). CI's checkout has no ignored files, so the merge itself is still guarded.
- Reproducer: in a fixture, run `echo x >> docs/handoff/HANDOFF.md`. The check fails, as it should. Then `touch docs/handoff/archive/.DS_Store`, and the check passes.
- Fix (one line): build `archive_now` from `git("ls-files", "--cached", "--others", "--exclude-standard", "--", "docs/handoff/archive/")`, keeping only paths where `(ROOT / p).is_file()`. Add a fixture: `touch …/archive/.DS_Store` with the handoff changed, expect exit 1.

**N-2 (S4)**, `docs/tasks/T-M2.21-records-checks.md:23` (scope 1) and `:93`: the packet still says the backlog row "holds the marker `**done**`".
- Problem: since the G-3 fix, the code requires a cell that starts with `**done**`. DEC-153 does not record that change.
- Fix: change scope 1 to "a cell of that row starts with `**done**`", and add one clause to DEC-153 (or the review record) noting the narrowing.

**N-3 (S4)**, `evidence/T-M2.21/summary.md:10`: it says "38 results over 18 fixtures".
- Problem: there are 17 `fixture` calls (lines 22–84). The 18th is probably the base repository.
- Fix: write 17, or "17 fixtures plus the base".

Cumulative subagent_tokens: about 92,000. That is an estimate from my context counter (round 1 plus this delta); I have no exact meter.

---
I did not re-run the full gate or CI 7/7 myself; I relied on the committed gate logs. The only live risk is N-1: before a push, a local `check-docs` can pass a `HANDOFF.md` rewrite that has no archive, and the problem then only shows up in CI.
