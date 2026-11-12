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
