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
