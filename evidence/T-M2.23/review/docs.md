# DOCS-REVIEW record — T-M2.23 (G0)

One fresh docs-reviewer with an adversarial brief (DEC-157, DEC-160). The LC records the returned text (DEC-131); the reviewer wrote no
file and posted nothing.

## Round 1 (full) at `ca1ca19` — 141,820 tokens, 556.3 s

DOCS-REVIEW T-M2.23: PASS
PASS WITH MINOR: I found no way for a product change to reach `develop` without a full run and no rule that contradicts DEC-158, but 14 S3 and 6 S4 findings should be fixed before the packet is set to `ready`.

## Check results

- `./scripts/check-docs.sh` (bare): PASS, exit 0 (289 markdown files).
- `./scripts/check-path-ownership.sh docs/T-M2.23-ci-scope`: PASS (4 files).
- Diff `origin/develop...HEAD`: the packet, `backlog.md`, `decision-log.md` (DEC-160) and `progress.json`. No script, workflow or test changed.

| G0 item | Result |
|---|---|
| Trace complete | Yes. All cited sections exist (coding-agent-rules §4.5, ci-cd §1 and §2, git-governance §4, lessons L-01, L-03, L-10, L-12). |
| Out of scope explicit | Yes. |
| Guardrail answers | Yes, all five. |
| ACs testable, each scope item covered | Mostly. Scope 1 to 9 map to AC1 to AC10. Gaps: D-3, D-4, D-9, D-10. |
| Test plan with review focus, L-10 path | Yes. |
| Lessons read, contradiction scan | Scan (a) to (h) is real and checked against the files; (f) and (h) are incomplete (D-9, D-18). |
| Shortcut ledger | Wrong as stated (D-1). |
| Evidence list, risk tier, risks, commands | Present. Tier L matches the quality-gates G3 table (scripts and tests only). |
| Docs to update | Present; one path is not named (D-20). |
| Size | 10 ACs, one PR, estimate exactly 2 agent-days. At the limit (D-19). |
| Records consistent | Backlog rows, DEC-160 and `progress.json` agree with the packet. The handoff does not (D-14); `pr` is null (D-17). |

## Findings

| ID | Sev | File:line | Finding | Suggested fix |
|---|---|---|---|---|
| D-1 | S3 | packet `:141` | "No marker in `scripts/` or `.github/`" is false. `scripts/check_docs.py:150` and `:199` carry `shortcut:` markers, and this task edits that file. Neither fires (fence parsing, table code spans). | Name the two markers and say why neither fires. |
| D-2 | S3 | packet `:46-47`, `:108-110`, `:120-123`, `:245-247`; DEC-160 (3) | The classifier never checks that `HEAD^1` is a `develop` commit; it trusts `github.base_ref` and that GitHub rebuilt the merge ref for the current base. If the ref is stale after a retarget, a text diff against the old base gives `fast-path` on a head with product code. merge-gate's own recompute and switch (b) both still refuse it, so this is a wrong verdict, not a merge hole. "Why (a) is sound" does not say that, and the assumption is not in the list at `:245`. The "(b1) is sound" argument uses the same assumption. | Add the assumption to `:245` with a live probe (retarget, then reopen and push; record the parents of `github.sha`). State that the PR-mode verdict alone is not the proof; merge-gate and (b) are. Optionally check ancestry with the compare API (the `scope` step already has a token) and fail to `full`. |
| D-3 | S3 | packet `:69`, `:156-157`, `:188-193` | Scope 5 says merge-gate's text-only needs base `develop`, but no fixture shows it failing. The map's row 3 covers the classifier only, and AC5's "treats as not text-only" list has no "base is not `develop`" case. A mutation that drops the base check survives. The realistic case: a `release/` PR opened against `develop` with text only, fast path, then retargeted to `master`. | Add to AC5 and row 2: an all-text PR with base `master` is not text-only and is refused on skipped markers. |
| D-4 | S3 | packet `:72-74`, `:188-190` | "Its job (from the check's own run)" does not say how a check maps to a job, or what happens when two runs exist for one head (close and reopen, retarget plus push, a push run on the same SHA) or when a check is not an Actions job. AC3 has "only an older attempt successful"; AC5 has no such case. | State the mapping (for example the `link` field of `gh pr checks`, then the jobs API with `head_sha` and steps). Add AC5 fixtures: newest run's marker skipped while an older run's is `success` gives refused; a check with no job gives refused. |
| D-5 | S3 | packet `:55-56` | (b1) says "that run's job has the step". With a second job or a matrix in a workflow, one marked job would satisfy it. "Latest run" and "same workflow" are also undefined (by `created_at` or `run_number`; by workflow file path or name), and so is "a listing that is not complete". | "Every job of the run has the marker with `success`". Define latest, same workflow (the file path) and the completeness test (`total_count` equals the items read). |
| D-6 | S3 | packet `:78-83`, `:194-196` | The known-mentions list is per file. Once `e2e/support/evidence.ts` or a large spec is listed as "writes only", a later read added to the same file passes silently. Today 17 files match, 9 of them outside `scripts/`, so the list is small enough to be a real control, but only for new files. | Record a mention count (or the matching lines) per entry; a changed count fails until re-accepted. |
| D-7 | S3 | packet `:80-81`, `:241-243` | "The scanned directories hold no such code today" is not accurate. `e2e/support/evidence.ts:23` and `:38` build the path at run time with `join(REPO_ROOT, 'evidence', …)`. They only write, but a reader written in the same house style (`join(REPO_ROOT, 'docs', …)`) has no `docs/` substring and escapes the check. The file is found today only through its comments. | Match the bare quoted tokens too (`'docs'`, `"evidence"`), or match whole words. Correct the risk sentence. |
| D-8 | S3 | packet `:80-81`, `:166-167` | AC1 says the allow-list file is "the only place the list exists" and that `check-docs` reads it. The standing check needs mention tokens (`docs/`, `evidence/`, `progress.json`, root `*.md` names), which cannot be derived from four regular expressions. That is a second copy that can drift (N-3). "A root `*.md` name" is also undefined: the four tracked names today, or any `*.md` token. | Say how the tokens are derived, or add a test that fails when the allow-list has a line with no matching token. Define root names as the tracked root `*.md` files. |
| D-9 | S3 | packet `:63-64`, `:134-136`, `:183-185` | Scope 4 lets the condition be "joined with `&&`"; AC4 wants "the exact condition". The test must then say which conjuncts are allowed, or a heavy step with `… && github.event_name == 'push'` passes it and the marker still succeeds. "Failure-only upload and warning steps" has no mechanical definition. `backend.yml` "Upload coverage report" (`if: always()`, not failure-only) is not named in (f). | Allow exactly two forms: the bare condition, or `always() && ` plus the condition. Define exempt as `if: failure()` or `if: always() && steps.<id>.outcome == 'failure'`. Name "Upload coverage report" as getting the condition. |
| D-10 | S3 | packet `:158` | Row 4's third fixture ("an empty or missing `scope` output runs the heavy steps") cannot be run offline; a line scanner can only check the text of the `if:`. | Say it is proven by the exact-text rule, or record one live run in the summary. |
| D-11 | S3 | packet `:30-33`, `:42`, `:197-199`; T-M2.26 row | In shadow mode `scope` is always `full`, so every marker is `success`. Real PRs therefore never show merge-gate or (b1) a skipped marker, (b2) is never the deciding branch, and the merge-gate line always reads "0 fast-path". The shadow report tests the classifier's verdict only. The error direction is safe (a misread refuses or runs in full), but the packet and the T-M2.26 row read as if shadow exercised the whole chain. | State the limit in Risks and in the T-M2.26 row. Or let the marker follow `verdict` instead of `scope`, so a wrong `fast-path` on a product PR is refused by merge-gate during shadow. |
| D-12 | S3 | packet `:39-43`, `:210-211` | The classifier's call contract is missing: how the event name, base ref, PR head SHA, `before` SHA and the `gh` override reach it, and what a "usage error" is. Two implementers would build two interfaces. | One line: the subcommands (`pr`, `push`, `replay <n>`), the environment variables, and `GH_BIN` as in merge-gate. |
| D-13 | S3 | packet `:76-77`, `:163`, `:192` | The scope line "`<n> full, <m> fast-path`" does not say which checks are counted (5 heavy, or 7 as in "CI 7/7"). It also does not say whether merge-gate reads the jobs API for a text-only PR just to count, or what a failed read does there. | Count the non-always-full checks; for a text-only PR a failed read prints "unknown" and does not refuse, or refuses. Pick one and add a fixture. |
| D-14 | S3 | packet `:127-129`; DEC-160 (7); `docs/handoff/HANDOFF.md:3`, `:22`, `:24` | DEC-160 (7) moves the U2 measurement, and so the PO-5 question, from T-M2.13 to the first task after T-M2.26. This is forced by logic and matches the packet's literal PO-5 text, so the LC may resolve it. But DEC-158 (PO-approved) and the handoff still say "T-M2.13 under T-M2.23", and the handoff says "packet not written". The PO is not told. | Update the handoff in this PR or the records commit. Tell the PO when asking for the start signal. |
| D-15 | S4 | packet `:24`, `:70` | "Byte-exact" matching holds for bash only. I ran jq: `"progress.json\n" \| test("^progress\\.json$")` and `"README.md\n" \| test("^[^/]+\\.md$")` are true; bash `[[ =~ ]]` says no. The classifier is the stricter one, so this is a disagreement, not a hole. | In merge-gate treat a filename with a control character as off the list; one fixture. |
| D-16 | S4 | packet `:34-35`, `:197-198` | "The exact content `enforce`" does not say whether a final newline counts. A byte-exact reader would never enforce after `echo enforce > file`. | "One line; the final newline is stripped; CRLF or a BOM means shadow." |
| D-17 | S4 | `progress.json` `currentTask.pr` | Null while PR #157 is open (same as D-14 of the T-M2.22 review). | Set it. |
| D-18 | S4 | packet `:138-140` | (h) says every open PR needs `gh pr update-branch`. For a Dependabot PR that disqualifies it on the merge-gate path (git-governance §4); the right step is `@dependabot rebase`. | Say so. |
| D-19 | S4 | packet `:10`, `:65-66`, `:142-143` | The estimate sits at the limit. Unique concurrency groups also mean post-merge runs that are cancelled today now finish, so the shadow period costs more minutes than today. | Keep the stated split line; add the minutes note to Risks. |
| D-20 | S4 | packet `:91-92` | "evidence-and-handoff part C" is `.claude/skills/evidence-and-handoff/SKILL.md` §C, not a file under `docs/`. | Give the path. |

## Attack coverage

| # | Covered where | Fixture named? | State |
|---|---|---|---|
| A-1 | Scope 3 (b1), (h) | AC3: run failed, cancelled, in progress, missing | Covered |
| A-2 | Scope 4 group with `github.sha`; "cancelled is not green" | Row 5; AC3 | Covered |
| A-3 | Scope 3 (b2), row 6 | Row 6, AC3 | Covered |
| A-4 | Scope 2, scope 5, the base-named marker | Row 2, row 3, AC5 "marker for another base" | Covered for a retarget to `develop`; the reverse has no merge-gate fixture (D-3) |
| A-5 | Scope 4 polarity, AC7 | Row 4, AC4, AC7 | Covered; one fixture is not runnable (D-10) |
| A-6 | Marker step, scope 5 | AC5 | Covered; the mapping is under-specified (D-4, D-13) |
| A-7 | Scope 6 | Row 7, AC6 | Covered for new files; weak inside listed files and for built paths (D-6, D-7) |
| A-8 | Terms, AC1, AC5 (3,000 files, `copied`) | AC1 list | Covered; jq and bash differ on a trailing newline (D-15) |
| A-9 | Scope 3 | AC3: one parent, three parents, `before` mismatch | Covered |
| A-10 | Design notes "Why (b1) is sound" | Not applicable | Covered; rests on D-2's assumption |
| A-11 | `fetch-depth: 2`, `actions: read`, 403 means full | Row 8 | Covered |
| A-12 | Risks `:237-238` | Not applicable | Covered; shadow's reach is overstated (D-11) |
| N-1 | (b2) | AC3 | Covered |
| N-2 | Scope 3 defines green; SHA in the group | Row 5, row 6 | Covered |
| N-3 | One file, read from `develop` by merge-gate | AC1 | Partly: the standing check's tokens are a second copy (D-8) |

My own attacks:

| Attack | Result |
|---|---|
| Stale merge ref after a retarget (first parent not on `develop`) | The verdict can be wrong. merge-gate's file recompute refuses; a UI merge gets a full post-merge run because (b1) sees a skipped marker and (b2) sees product paths. No hole (D-2). |
| Merge conflict, so no merge ref | GitHub starts no `pull_request` run; checks are missing; merge-gate refuses. |
| `fetch-depth: 2` | Gives the merge commit, both parents and their trees. At depth 1 the commit shows no parents, so `full`. Sound. |
| Retarget `develop` to `master` | Task branch kinds are refused by the existing kind rule. Release and hotfix rely on the base check, which has no fixture (D-3). |
| Base named `develop2`, tag `develop`, fork branch `develop` | Exact match on `base_ref`; tag pushes do not trigger the workflows. No path. |
| Marker succeeds after a heavy step was skipped or soft-failed | Possible only through a workflow edit (extra conjunct, `continue-on-error` on a heavy step). That PR is never text-only, as today. The workflow test should close the conjunct case (D-9). |
| Second job, matrix, new workflow | The job runs in full with no marker, so merge-gate refuses non-text PRs. (b1) wording allows one marked job (D-5). |
| `github.base_ref \|\| github.ref_name` | Correct on PR and push. A re-run keeps the event, so an old base stays in the name. There is no `workflow_dispatch`. |
| Two runs for one head, old attempts | Pending and cancelled are blocked by the existing rule. The "older run has the marker" case has no fixture (D-4). |
| Zero files, 3,000 files, `copied`, count mismatch | All "not text-only" as written. |
| Symlink, submodule or executable bit under `docs/` | The files API does not show modes, so merge-gate says text-only. The classifier says full, and `docs-check` fails on a symlink or gitlink. No hole. |
| Newline in a path (`web/x\ndocs/y`) | bash: no match. jq: no match. Line-based `grep -E` would match, so the `-z` rule and its AC1 fixture matter. |
| `docs/../` | Git paths are normalised. No path. |
| Switch (b): force-push, squash, UI merge on a red or behind head, a run against another base, a failed re-run | Each gives `full` as written. |
| (b2) chain on a red tree | The first text merge on a red parent runs in full; a chain cannot start from red. |
| A wrong fast path on the first parent | It needs a wrong (b1) or (b2) earlier; no base case found. |
| Mode file flipped by a text-looking PR | `scripts/` is off the list. No path. |
| Empty, missing or malformed values | All read as "run": scope output, mode, allow-list, API replies. |
| Shadow mode skipping something | Not possible: only the content `enforce` passes `fast-path` through. |
| merge-gate stricter at once | Open PRs are behind after the merge anyway, so they need a new run. Dependabot, `qa/` and release PRs run in full with a marker. Nothing legitimate breaks, except the wording in D-18. |
| Mandate | Nothing in the packet, DEC-160 or the T-M2.26 row goes beyond PO-1, PO-2 and the nine constraints. Everything that takes effect at once is stricter. The split is inside the PO's "after … shadow mode" condition. Every constraint has a failing fixture in the map, with the gaps in D-3 and D-10. |

## Facts re-derived

- **Workflows:** all five heavy workflows check out with `persist-credentials: false` and no `fetch-depth`, have `contents: read` only, and use group `<name>-${{ github.ref }}` with `cancel-in-progress: true`.
- **`backend.yml`:** two `if: always()` steps (coverage summary, coverage upload) plus the failure-only pair.
- **Required checks:** `scripts/required-checks.txt` has six names; `container-build` is not one.
- **merge-gate:** it reads checks by name and bucket only, needs a `pull_request` run in step 0, and resolves files beside itself.
- **Kept test:** `workflow-warnings.test.sh` pins only the warning step's `if:` text, so (f) "stays green unchanged" holds.
- **Container build:** `.containerignore` excludes `docs`, `evidence` and `.claude`. `deploy/Containerfile` copies only `web/` and `backend/` paths, so root `*.md` and `progress.json` never enter the image.
- **Tracked modes:** no symlink or submodule. `evidence/T-M1.5/probe.sh` is `100755`, so a change to it runs in full.
- **Mentions today:** 17 files in the scanned directories (backend 1, deploy 1, e2e 5, qa 1, web 1, scripts 8). All are comments, writers or docs-check tooling; none is a reader in a heavy job.
- **T-M2.22 text:** the nine constraints, validation (5), PO-1, PO-2, PO-5 and PO-8 read as the packet quotes them. The "12 text-only, 4 full, #121 full" figure matches the G0 record.
- **Test tooling:** `run-all.sh` picks up any new `*.test.sh`; the `git -c user.name` fixture pattern exists in `gate.test.sh:101`.

## Not checked, and risks for the LC

- I did not run `gate.sh`, any script test or the offline replay, and I did not re-derive the baseline figures.
- I did not test GitHub's behaviour live: expanded step names in the jobs API, the merge ref after a retarget, `head_sha` on PR runs. I did not read the product SPEC, as instructed.
- **Risk:** D-2 and D-11 together mean that shadow mode tests less than it appears to, and the classifier's PR verdict rests on one unverified GitHub behaviour. Merge assurance holds only because merge-gate and switch (b) each recompute independently. Keep both, and do not let T-M2.26 treat a clean shadow report as proof of the marker chain.

Files:
- `/home/linux/Projects/eng-lms/docs/tasks/T-M2.23-ci-scope.md`
- `/home/linux/Projects/eng-lms/docs/tasks/backlog.md`
- `/home/linux/Projects/eng-lms/docs/10-governance/decision-log.md`
- `/home/linux/Projects/eng-lms/progress.json`
- `/home/linux/Projects/eng-lms/docs/handoff/HANDOFF.md`
- `/home/linux/Projects/eng-lms/scripts/merge-gate.sh`
- `/home/linux/Projects/eng-lms/scripts/check_docs.py`
- `/home/linux/Projects/eng-lms/e2e/support/evidence.ts`
- `/home/linux/Projects/eng-lms/.github/workflows/backend.yml`

## LC response to round 1

All 20 findings accepted and fixed in the same PR; no S1 or S2, so no delta re-check (DEC-131 (5)).
D-1: the two `shortcut:` markers of `scripts/check_docs.py` are named. D-2: "the PR verdict alone is not the proof" is stated, with the
merge-ref assumption and a live probe added to the assumptions. D-3: merge-gate fixture for a text-only PR with base `master`.
D-4: the check-to-job mapping (`link` of `gh pr checks`, then the jobs API) and its fixtures. D-5: (b1) wants every job's marker;
"same workflow", "latest" and "complete" are defined. D-6, D-7, D-8: `known-mentions` records a count per file; the tokens include the
quoted words `'docs'` and `'evidence'`; one token set per allow-list line, and a line without one fails. D-9: two allowed `if:` forms,
a mechanical definition of the exempt steps, "Upload coverage report" named, the extra-conjunct mutation. D-10: the empty-output case
is stated as following from the pinned text. D-11: the marker now follows the **verdict**, not the mode, so in shadow mode merge-gate
and switch (b) read the markers they will read in `enforce` mode; the limit of shadow mode is in Risks and in the T-M2.26 row.
D-12: the call contract. D-13: which checks are counted, and `checks: unknown` on a text-only PR. D-14: the handoff is updated in this
PR and the PO is told about DEC-160 (7) with the start-signal question. D-15: a path with a control character is off the list for
every reader. D-16: the mode file's reading rule. D-17: `progress.json` `pr`. D-18: `@dependabot rebase`. D-19: the minutes note.
D-20: the skill's path.

# G3 (implementation, PR #158)

One fresh docs-reviewer with an adversarial brief; it ran the suites, mutated the scripts in a private copy and probed the real API
read-only. The LC records the returned text (DEC-131); the reviewer wrote no file and posted nothing.

## G3 round 1 (full) at `162fc02` — 191,738 tokens, 1,644.0 s

DOCS-REVIEW T-M2.23: CHANGES REQUESTED
No way found for a product, test, build, script or workflow change to reach `develop` without a full run once enforced (no S1), but one case listed in AC6 has no test (S2) and eight S3 gaps should be closed, most before T-M2.26.

## Check results

| Check | Result |
|---|---|
| `scripts/tests/run-all.sh` | PASS, exit 0 |
| `ci-scope.test.sh` | 218 passed, 0 failed |
| `ci-scope-workflows.test.sh` | 47 passed, 0 failed |
| `merge-gate.test.sh` | 402 passed, 0 failed (325 earlier + 77 tagged T-M2.23, counted in the log) |
| `check-docs.test.sh` | 74 passed, 0 failed |
| `./scripts/check-docs.sh` | PASS (295 markdown files, "text-only CI inputs clean") |
| `./scripts/check-path-ownership.sh chore/T-M2.23-ci-scope` | PASS (25 files) |
| `./scripts/ci-scope.sh replay 60` (`origin/develop` = `c090d40`) | 60 lines: 23 text-only, 37 full (22 `tree=differs`, 15 `tree=same`) |
| My own re-check of the replay (`git diff --name-only M^1 M^2` plus raw modes) | 60 of 60 agree; the 17-merge window gives 12 text-only and 5 full, as the summary says |
| Gate log | `gate: PASS (13 steps, 598s)` on `2e855e0`; `162fc02` adds only the log and one summary line |
| Live, PR #158 | all five heavy jobs print `ci-scope: mode=shadow verdict=full why=path off the allow-list: .claude/skills/evidence-and-handoff/SKILL.md`; the `web` job has step `Full run on develop` = success and `head_sha` = `162fc02a…` |
| `merge-gate.sh --dry-run 158` (read-only, real API) | no step 3b problem; refused only for the missing verdict comments |
| `merge-gate.sh --dry-run 135` (read-only) | each of the five heavy checks refused with "has no full run for head c30cfcb" (runs predate the marker) |
| `git status --short` of the real repo at the end | empty; branch `chore/T-M2.23-ci-scope` at `162fc02`; private copies deleted |

## AC table

| AC | Verdict | Proof |
|---|---|---|
| AC1 | met | Four allow-list lines pinned by a test; every listed text-only and not-text-only input has a case in `ci-scope.test.sh`. The Terms rule "every old mode" has no case (G-7). |
| AC2 | met | Every listed input has a case (base `master`, `feature/T-y`, `develop2`, other event, one parent, wrong or empty head SHA, depth 1). |
| AC3 | met | Every listed input has a case. "Only an older attempt successful" is tested as an older run, which is the nearest thing a mock can show. |
| AC4 | met as listed | Each listed rule has a mutated copy that fails (22 copies). The scanner can be bypassed in ways the list does not name (G-3). |
| AC5 | met | Every listed case exists. No earlier assertion was removed. With step 3b's refusals disabled, 61 cases fail and all 61 are T-M2.23 cases, so no old case passes or refuses for a new reason. The mock's `serve behind.txt` only adds a `.fail` path that no old case uses. |
| AC6 | **not fully met** | "A listed path … whose count is too high" has no test (G-1). "Every listed file carrying its count" holds only as amended by DEC-161 (2): 10 of 19 entries carry `*` (G-2). All other listed cases exist. |
| AC7 | met | Nine mode-file contents plus a missing file; committed file is `shadow`; live notices seen on PR #158. |
| AC8 | met in substance | Counts and the 17-merge claim verified independently. The table has 32 rows, not 60 (G-9). |
| AC9 | met with gaps | ci-cd §1.2 matches the code sentence by sentence except the standing-check bullet, which omits `*` (G-2). Other scope 9 docs are present. |
| AC10 | met | Gate PASS, CI 7/7 with full markers, run-all PASS, 37 mutations recorded. The log is on the parent of the final head (unavoidable, since the last commit adds the log). |

## Findings

| ID | Sev | File:line | Finding | Suggested fix |
|---|---|---|---|---|
| G-1 | S2 | `scripts/tests/check-docs.test.sh:109` (rule at `scripts/check_docs.py:294`) | AC6 lists "fails on a listed path … whose count is too high"; no fixture exists. Changing `!=` to `<` in the count comparison passes all 74 cases. A recorded count above the real one leaves room for an unreviewed mention line. | Add one fixture: set `e2e/support/evidence.ts 4` to `5` in the fixture's known-mentions, expect exit 1 and "has 4 line(s) … records 5". |
| G-2 | S3 | `docs/10-governance/decision-log.md:169`; `scripts/check_docs.py:286`; `docs/07-operations/ci-cd.md:80` | DEC-161 says each ruling is "stricter than or equal to" the packet. Ruling (2) is looser: packet scope 6 and AC6 want a count for every listed file, and `*` drops that for 10 `scripts/` files. Its safety premise (no `*` file is called by a heavy job) is true today (I checked `e2e-run.sh`, `contract-drift.sh`, `coverage-summary.sh`, `ci-scope.sh`, `lib/`) but nothing enforces it. ci-cd §1.2 does not mention `*`. | Reword DEC-161 (2) as a relaxation with its reason. Make `check_text_only_inputs` fail when a `*` file's name appears in a heavy workflow or in a script one calls. Add the `*` rule to §1.2. |
| G-3 | S3 | `scripts/tests/ci-scope-workflows.test.sh:18,23,69` | Edits that weaken the wiring and still pass "the real workflows are wired correctly" (each run in my copy): (a) `"continue-on-error": true` with a quoted key on `Verify`; (b) `"if": false` or `continue-on-error : true` on the scope step; (c) `if: failure()` on `Verify`, because exempt forms are accepted on any step; (d) `CI_SCOPE_ALLOW_FILE` / `CI_SCOPE_MODE_FILE` on the scope step, or `GH_BIN` at workflow level, which switches enforce on or swaps the allow-list without touching the pinned files; (e) job `defaults.run.shell: "true {0}"`. All need a workflow PR, which is full and reviewed, so not S1; but (d) bypasses the single allow-list and the mode file silently. | Let `key()` accept quoted keys and spaces before the colon. Allow exempt forms only on `upload-artifact` steps and `echo "::warning` steps. Fail on any `CI_SCOPE_ALLOW_FILE`, `CI_SCOPE_MODE_FILE`, `GH_BIN` or `shell:` in a heavy workflow, or have `ci-scope.sh` ignore the overrides when `GITHUB_ACTIONS` is set. |
| G-4 | S3 | `scripts/ci-scope.sh:48` | `git diff --raw` honours `.gitmodules` `ignore = all`. With that file already on the base, a PR adding a gitlink under `docs/` plus a docs edit gets `verdict=fast-path` (reproduced; `git ls-tree` shows the 160000 entry). The Terms rule "a submodule is not text-only" is broken under that precondition. Impact is limited: the standing check in `docs-check` still fails on the gitlink. `diff.relative=true` with a sub-directory cwd also hides a `web/` change, but needs runner git config. | Add `--ignore-submodules=none --no-relative` (I confirmed the first flag shows the gitlink) and a fixture. |
| G-5 | S3 | `scripts/ci-scope.sh:99-100` | "Latest" breaks on a `created_at` tie: with the API's newest-first order (failure id 12, success id 11, same second) the older success is chosen and the result is `fast-path` (reproduced). A newest run with a non-string `created_at` is dropped, not treated as `full`, although scope 3 says an unexpected shape means `full` (reproduced; removing the guard is not caught either). No product bypass: the chosen run is a real successful full run on the same tree. | `sort_by(.created_at, .id)`; return empty when any candidate lacks a string `created_at`; two fixtures. |
| G-6 | S3 | `evidence/T-M2.23/summary.md:21` | The AC10 row points to a section "G2 and the GitHub assumptions" that does not exist. The packet's Risks require each of the four assumptions to be recorded with a fixture or an API response; none is. Two are not probed at all. | Add the section: the two observed (expanded marker name; job `head_sha` = PR head), plus runs `path` = `.github/workflows/<file>` and `/jobs` `total_count`, which I also saw live. State the two unprobed ones as entry conditions in the T-M2.26 backlog row. |
| G-7 | S3 | `scripts/ci-scope.sh:55,136`; `scripts/merge-gate.sh:290` | Rules with no fixture (my mutations survive): the old-mode check (deleting a symlink or dropping an exec bit under `docs/`); `head_branch == develop` in (b2); "at least 1 file" in merge-gate. The summary's self-check "every rule has a violating fixture and a mutation" is overstated. | Three fixtures; correct the self-check line. |
| G-8 | S3 | `scripts/merge-gate.sh:282`; `docs/07-operations/ci-cd.md` §2; `docs/09-harness/git-governance.md` §4 | The docs state merge-gate reads "`develop`'s copy" of the allow-list. Nothing enforces it: the script reads the file beside itself in whatever is checked out (this repo is on the PR branch now). The "allow-list edited in the PR" defence is therefore procedural, as it already was for `merge-gate.sh` itself. | Refuse unless `HEAD` equals `origin/develop` (with `--dry-run` exempt), or read the list with `git show origin/develop:scripts/ci-text-only.paths`; otherwise say "procedural" in the docs. |
| G-9 | S4 | `evidence/T-M2.23/summary.md:91` | AC8 asks for the table per merge over 60; it holds 32 rows and the 28 Dependabot merges are one bullet. | Add the 28 rows or note the aggregation as a deviation. |
| G-10 | S4 | `scripts/merge-gate.sh:313` | The refusal says "push a new commit or update the branch" on Dependabot PRs too (seen live on #135), where a human update disqualifies the PR (packet note (h)). | For `kind=dependabot` say `@dependabot rebase`. |
| G-11 | S4 | `scripts/check_docs.py:226` | `SCAN_DIRS` omits `.github/actions/` (none exists yet) and root build files; dropping `api/` from the scan is not caught by any test. | Scan `.github/` whole; add an `api/` fixture. |

## My mutations

| # | What | File | Result |
|---|---|---|---|
| R1 | PR event check off | `ci-scope.sh` | caught: "an event other than pull_request" |
| R2 | old-mode check off | `ci-scope.sh` | **SURVIVED** (G-7) |
| R3 | `--no-renames` dropped | `ci-scope.sh` | caught: "a rename inside docs/" |
| R4 | `scope` follows the mode only | `ci-scope.sh` | caught: "enforce mode with a full verdict" |
| R5 | run `path` filter off | `ci-scope.sh` | caught, 4 cases |
| R6 | run `head_sha` filter off | `ci-scope.sh` | caught: "only a run on another SHA" |
| R7 | run `event` filter off | `ci-scope.sh` | caught: "only a push run on that SHA" |
| R8 | jobs listing completeness off | `ci-scope.sh` | caught |
| R9 | jobs non-empty off | `ci-scope.sh` | caught: "a run without jobs" |
| R10 | (b2) `head_branch` not required | `ci-scope.sh` | **SURVIVED** (G-7; the query also filters `branch=develop`) |
| R11 | marker conclusion ignored (b1) | `ci-scope.sh` | caught, 4 cases |
| R12 | `enforcing` as a substring match | `ci-scope.sh` | caught, 4 cases |
| R13 | allow-list patterns unanchored | `ci-scope.sh` | caught, 4 cases |
| R14 | run status `completed` not required | `ci-scope.sh` | survived; equivalent (conclusion is null until completed) |
| R15 | `created_at` type guard off | `ci-scope.sh` | **SURVIVED** (G-5) |
| R16 | workflow-file sanity check off | `ci-scope.sh` | survived; equivalent (an empty path matches no run) |
| H1 | link regex end anchor off | `merge-gate.sh` | caught: "a link with a trailing path" |
| H2 | two markers accepted | `merge-gate.sh` | caught |
| H3 | `container-build` exempted | `merge-gate.sh` | caught, 6 cases |
| H4 | "at least 1 file" off | `merge-gate.sh` | **SURVIVED** (G-7) |
| H5 | step 5 fail-closed off | `merge-gate.sh` | caught by 3 earlier cases, so the old behaviour is kept |
| H6 | status `changed` allowed | `merge-gate.sh` | caught |
| H7 | step 3b never refuses | `merge-gate.sh` | 61 fail, all T-M2.23; no old assertion depends on 3b |
| H8 | `$pats` non-empty check off | `merge-gate.sh` | survived; equivalent (`-f` and grep's exit code already cover it) |
| K1 | count too high accepted | `check_docs.py` | **SURVIVED** (G-1) |
| K2 | `api/` not scanned | `check_docs.py` | **SURVIVED** (G-11) |
| K3 | `progress.json` token off | `check_docs.py` | caught, 23 cases |
| K4 | root `*.md` tokens off | `check_docs.py` | caught |
| K5 | `evidence` tokens off | `check_docs.py` | caught, 24 cases |
| K6 | `.github/workflows/` not scanned | `check_docs.py` | caught |
| W1–W7, W9, W11, W12, W14, W15 | workflow edits (see G-3; also `run: true`, `types: [opened]`, `cancel-in-progress: false`, push branches without `develop`) | workflow YAML | **pass the scanner**; W1, W2, W3, W5, W6, W11 weaken the wiring; the rest fail closed at merge-gate or are harmless |
| W8, W10, W13 | trailing comment on `if:`; second job with a comment after its id; `if: >-` | workflow YAML | caught |

## Attacks tried

| Attack | How tested | Result |
|---|---|---|
| Odd paths under `docs/` (leading `-`, backslash, non-UTF-8, 400 characters) | fixture repo | handled correctly; `fast-path` is right, they are under `docs/` |
| Root name with DEL; newline in a path; injecting `scope=fast-path` into `GITHUB_OUTPUT` through a path | fixture repo | `full`; the output file holds exactly three lines, the path is `%q`-escaped |
| `mktemp` failure, bogus `GIT_DIR`, unwritable `GITHUB_OUTPUT`, graft/replace ref, `GITHUB_BASE_REF="develop "`, empty repository, foreign workflow ref | fixture repo | `full`, exit 0 each time (an unwritable output leaves `scope` empty, so everything runs) |
| Exit paths that skip `emit` | read line by line | only usage (exit 2) and a failed `require-bash`; both fail the job, which skips the marker |
| `.gitmodules ignore=all`; `diff.relative` | fixture repo | **hidden gitlink gives `fast-path`** (G-4) |
| (b1) ties, null `created_at`, offset timestamps, `steps: null`, two-line `behind_by` | mock gh | tie and null: G-5; the rest `full` |
| Runs API shape: `path`, `head_sha` filter, `total_count`; jobs default attempt | real `gh api` on PR #158 | `path` is `.github/workflows/<file>` for all five; 7 of 7 listed; a short SHA returns 0 runs (the code uses full SHAs) |
| Same head SHA in a second PR to another base | reasoning plus the "marker for another base" cases | newest run for another base gives `full`; both readers compare the full marker name exactly |
| Forged marker through a branch name; expression injection | read the YAML | only `base_ref == develop` yields the develop marker; expressions appear in a step name and in `env:`, never in a `run:` body; `CI_SCOPE_KIND` is a fixed expression |
| Push run's marker accepted for a PR | reasoning | impossible: a PR head that had a `develop` push run is already in `develop`; (b1) filters `event == pull_request` (R7 caught) |
| merge-gate: job skipped (`skipping`), pending non-required heavy check on a text-only PR, duplicate check names, absent or string `changedFiles`, invalid regex, CRLF allow-list, zero files, `qa/` PR with a `qa/` file, null head OID, files API error | mock gh | all refused, except duplicates that are both full (accepted, 6 full) and a text-only `qa/` PR (accepted, correct) |
| Link to a job in another repository | mock gh, reasoning | the mock accepts it; on GitHub a foreign job id under this repo returns 404, so it is refused. The regex could pin owner and repo. |
| Does merge-gate now accept anything it refused before? | diff, H5, H7 | no |
| Marker `success` while a heavy step did not run | YAML semantics | not possible without a workflow edit: heavy steps skip only on `scope == 'fast-path'`, which needs a `fast-path` verdict, which skips the marker; a failed or cancelled job skips it through the implicit `success()` |
| Shadow mode skips something | traced `emit` | `scope=fast-path` only when the mode file is byte-for-byte `enforce`; no workflow sets `CI_SCOPE_MODE_FILE` (but see G-3 (d)) |
| First push run after this PR merges | reasoning on live data | (b1): PR #158's runs carry successful markers, so the verdict is `fast-path`, the steps still run, the push run's marker is `skipped`. That is consistent: (b2) reads only the run conclusion. |
| The 19 known-mentions entries | opened each non-script file | all 9 non-script entries are comments, prose or writes, as stated; `e2e/support/evidence.ts` only writes |
| Readers the token search misses | grep for `Files.walk`, `Path.of("..")`, `readFileSync`, Vite and Playwright config, Containerfile `COPY` | none today. `ForbiddenIdentifiersTest` walks `src/main` only; the Containerfile copies `web/` and `backend/` only. An unquoted YAML `docs`, globs such as `*.md`, and repo-root walks would escape. Residual risk acceptable: such a PR is never text-only and gets a full run and review. |
| `actions: read` on Dependabot PRs | reasoning | read-only token either way; it adds reading this repo's runs and logs, no secret involved |
| Mandate | DEC-158, DEC-160, DEC-161 against the diff | allow-list not widened; no other quality rule changed; nothing in scope unbuilt; only DEC-161 (2) is looser than the packet (G-2) |

## Not checked; risks for the LC

- **Unprobed assumptions.** "A re-run keeps the original event" and "after a retarget plus a push the merge ref's first parent is the new base's tip" are not probed. Merging in shadow mode is acceptable: nothing is skipped and merge-gate is strictly stricter than today. T-M2.26 must probe both on a throwaway PR before `enforce`, and must see one re-run's attempt handling in the runs and jobs APIs. If the re-run assumption fails, merge-gate would accept a develop-named marker earned on a merge with the old base.
- **Not runnable offline.** The Actions `if:` semantics for an empty output, a failed scope step and cancellation come from documented behaviour only. I also did not run `gate.sh`, Maven, pnpm or containers, did not read the product SPEC, and did not check the glossary.
- **`develop` is red now.** The `e2e-smoke` push run on `c090d40` failed (run 43165176510). (b1) will still call the #158 merge `fast-path`, correctly, since that tree passed in full on the PR. Any text-only merge on a red tip gets `full` through (b2). Triage it before the next merge.
- **Behaviour change once enforced.** A text-only PR can pass and merge onto a red `develop`; today its own `e2e-smoke` run would fail. The post-merge run then goes full and red, so this rests on the rule that the LC triages a red `develop`.
- **Open PR #135** needs `@dependabot rebase` before merge-gate can accept it.
- Skipped: no fix was applied and no file written in the repo, as instructed. The S2 is a one-line fixture; a delta re-check of G-1 to G-8 is enough.

## LC response to G3 round 1

All eleven findings accepted and fixed at `fa5a0a0` and the records commit after it; the rulings are in DEC-161.
G-1 (S2): fixture "a recorded count above the real one fails"; mutation D8 is caught. G-2: DEC-161 (2) now calls itself a relaxation,
and `*` is narrowed from `scripts/` to `scripts/tests/` (every other script records its exact count; a name-based "can a heavy job
run it" closure was tried and dropped, because workflow comments name nearly every script); ci-cd §1.2 says so. G-3: the scanner
reads quoted keys and a space before the colon, allows a failure-only `if:` only on an upload or warning step, and refuses
`CI_SCOPE_ALLOW_FILE`, `CI_SCOPE_MODE_FILE`, `GH_BIN` and `shell:`; `ci-scope.sh` ignores the three overrides when `GITHUB_ACTIONS`
is set; nine new mutated copies. G-4: `--ignore-submodules=none --no-relative --no-ext-diff`, with a fixture whose base holds a
`.gitmodules` with `ignore = all`. G-5: runs sort by `created_at` then `id`, and a candidate without a string time or a numeric id
gives `full`; two fixtures. G-6: the summary gains "G2 and the GitHub assumptions"; the two unprobed ones are entry conditions in
the T-M2.26 row. G-7: fixtures for a deleted symlink, a dropped executable bit, a green run on another branch and a PR without
files; the self-check line is corrected. G-8: a real merge is refused unless the checkout's `HEAD` is `origin/develop` (a dry run is
exempt; `MERGE_GATE_DEVELOP_REF` for tests), four cases. G-9: the replay table holds all 60 merges. G-10: a Dependabot PR is told
`@dependabot rebase`. G-11: the scan covers `.github/` whole (the PR template is listed) and `api/` has a fixture.
A second mutation set of 11 (C18 to D10) covers every rule the reviewer found unprotected: all caught.
The red `develop` run 43165176510 (`loading.spec.ts` "the loading region in English", phone-small, on the docs-only merge `c090d40`)
was a flaky test: the failed job was re-run; it is reported to the PO, not ruled in this task.

## G3 round 2 (delta) at `82c2553` — 108,504 tokens, 754.0 s

A fresh reviewer (the first attempt was cut off by an API limit with no result). Scope `git diff 162fc02..82c2553`.

`DOCS-REVIEW T-M2.23: CHANGES REQUESTED`: no S1; one new step-6 test passes on PR runs for another reason than the one it names and
would fail on `develop`'s first push run (S2), and the reworked workflow scanner has five more bypasses (S3).

**G-1..G-11:** G-1, G-2, G-4 to G-7, G-9 to G-11 closed; G-3 partly (N-2, N-4); G-8 partly (N-1, N-3). The replay was re-run and all
60 SHA→verdict pairs match. **Checks:** suites 238 / 65 / 413 / 86 pass; `check-docs` and `check-path-ownership` pass; PR #158 7/7.
**Round 1's surviving mutations re-applied in a private clone:** R2, R10, R15, H4, K1, K2 and the workflow edits (a) to (e) are all
caught; three new ones survived (`GH=gh` dropped from the runner guard, `--no-relative` alone dropped, step 6's default ref).

| ID | Sev | File:line | Finding | Suggested fix |
|---|---|---|---|---|
| N-1 | S2 | `scripts/tests/merge-gate.test.sh:587-588` | `git commit-tree` needs an identity; a runner has none ("Author identity unknown" in run 43266658125), so `OTHER_COMMIT` was empty and the case fell back to `origin/develop`. On a PR run it still exits 1 (HEAD is the merge ref), but on a `develop` push run HEAD is `origin/develop` and the case fails (reproduced: 412 passed, 1 failed). | Give `commit-tree` an identity, check the result is non-empty, assert the step-6 message |
| N-2 | S3 | `scripts/tests/ci-scope-workflows.test.sh` | Five edits pass: a heavy command chained after a `::warning` echo behind `if: failure()`; a flow-style `defaults` with `shell:`; an escaped quoted key (`"continue-on-erro\u0072"`); a `?` complex key; `uses: evil/actions/checkout@…`. Each needs a reviewed, full workflow PR, so not S1. | Tighten each rule, one mutated copy each; say in ci-cd §1.2 that the scanner is a heuristic |
| N-3 | S3 | `scripts/merge-gate.sh:395-398`, ci-cd §2, git-governance §4 | Step 6 compares HEAD with a local, unfetched `origin/develop` and cannot see local edits; the docs claim more. The suite sets `MERGE_GATE_DEVELOP_REF=HEAD` globally, so the default ref is never exercised. | Soften the docs or fetch and check the tree; add a case with the variable unset |
| N-4 | S4 | `scripts/ci-scope.sh:24` | The runner guard's `GH=gh` has no case. | One runner case with a mock that must not be used |
| N-5 | S4 | `scripts/ci-scope.sh:51` | `--no-relative` has no fixture. | A `diff.relative=true` fixture from a subdirectory |

**Not checked:** whether the runner refuses `env: GITHUB_ACTIONS: ""`; duplicate-key and anchor tricks against GitHub's own parser;
`gate.sh`, containers, Maven, pnpm; no live `develop` push run (N-1 rests on a local simulation and the PR run log).

## LC response to G3 round 2

All five accepted and fixed. N-1: `commit-tree` gets its own identity and a fixed date, a separate assertion checks the commit
exists, and the case asserts the step-6 message. The suite was re-run in a private clone with `origin/develop` = HEAD and no git
identity (as on a `develop` push run): 418 passed. N-3: the docs now say "`origin/develop` as last fetched (`git pull --ff-only`
first, with no local edits under `scripts/`)" and that the script neither fetches nor reads the working tree; the code is unchanged
(fetching or comparing with the PR's live base would add a network step to the gate, beyond the mandate's need). A new case runs a
copy of the gate in a throwaway repository with the variable unset, refused and then accepted (mutation E3 caught). N-2: the scanner
refuses `shell` anywhere, quoted keys with an escape, `?` keys and flow mappings, needs the checkout to start with
`actions/checkout@`, and accepts a failure-only `if:` only on a lone `echo "::warning…"` (no `"`, `$`, backtick or backslash inside);
six mutated copies. ci-cd §1.2 calls the scanner a heuristic backed by the full run and review of every workflow PR. N-4: a runner
case whose `gh` on `PATH` fails, so the mock's `fast-path` must not be used (E2 caught). N-5: a fixture run from `docs/` with
`diff.relative=true` (E1 caught). Suites: 243 / 77 / 418 / 86. As an S2 was found, a further delta re-check follows.
