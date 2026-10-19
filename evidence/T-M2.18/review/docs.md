# Docs review — T-M2.18

> Recorded by the LC from the reviewers' returned text.

## Round 1 (full)

DOCS-REVIEW T-M2.18: CHANGES REQUESTED

**Checks run**
- `./scripts/check-docs.sh` passed (288 files).
- `bash scripts/tests/gate.test.sh` passed: 50 cases, 0 failed, 12 of them new for DEC-131.
- `./scripts/check-path-ownership.sh docs/T-M2.18-quality-process` passed.
- `git ls-files 'evidence/**/*.png'` lists 61 files, all under `evidence/*/qa/`. `git check-ignore` confirms new `evidence/**/*.png` files are ignored.

**What is met**
- Every change traces to DEC-131 (2)–(9) or to scope item 10. I found nothing beyond scope.
- AC1–AC8 are met in the edited files. AC9 depends on CI and is still open.
- The tier table in quality-gates.md matches DEC-131 (4). S1/S2 still cannot be deferred, SEC stays separate for tier H, and reviewers stay independent (agent-roles.md:19-20). The S4 change supersedes DEC-088 consistently.
- gate.sh handles these cases correctly:
  - no git, no base ref, or no merge base: `changed_files` returns 1, so nothing is skipped;
  - untracked files are counted (`--exclude-standard`);
  - deleted specs are filtered by `[[ -f ]]`;
  - paths with spaces work (quoted arrays, `read -r`);
  - the repeat arguments fit `e2e-run.sh`: `--no-build` is consumed there, and the specs are passed relative to `e2e/`, which is where Playwright runs.

The problem is leftover text in files the branch did not fully update. It still says reviewers write files and post PR comments, which contradicts the new rule "reviewers return text only, the LC records and posts" (agent-roles.md:20, qa-protocol §2 step 6).

| ID | Sev | file:line | Issue | Concrete fix |
|---|---|---|---|---|
| D-1 | S3 | docs/09-harness/git-governance.md:38 | "QA, SEC and UX post verdicts as PR comments". This contradicts agent-roles.md:20, where the LC posts the verdict lines after CI is green on the final head. | Change it to: "Reviewers return their verdict line as text; the LC posts each line as a PR comment after CI is green on the final head (DEC-131)". Add `DOCS-REVIEW` to the list of prefixes. |
| D-2 | S3 | .claude/agents/ux-reviewer.md:16-17; .claude/agents/security-reviewer.md:17-18 | Each file says "Write `evidence/<task-id>/review/….md`" and then "Return text only: … no files in the tree". The instructions contradict each other within one paragraph. | Change it to "Return the findings (…) as text starting with `…`; the LC records them in `evidence/<task-id>/review/….md` on the merge". This is the wording security-review/SKILL.md:22 already uses. |
| D-3 | S3 | .claude/skills/ux-review/SKILL.md:23-24 | The same sentence says the verdict is "the final line" and "first line of the returned text". It also names `evidence/<task>/review/ux.md` as the output, as if the reviewer writes that file. | Change it to "Return a findings table (…) with `UX-REVIEW …` as the first line; the LC records it in `evidence/<task>/review/ux.md`". |
| D-4 | S3 | .claude/agents/docs-reviewer.md:16-17 (not edited by this branch); docs/06-quality/quality-gates.md:54 | The docs reviewer still "Write[s] `evidence/<task-id>/review/docs.md`" and puts the verdict at the end. quality-gates says the docs reviewer "posts `DOCS-REVIEW`". Both contradict agent-roles.md:20 and the first-line rule. | docs-reviewer.md: change to "return the findings as text starting with `DOCS-REVIEW <task-id>: …` (the LC records `review/docs.md` and posts the line)". quality-gates.md:54: change "posts" to "returns … ; the LC posts". Add docs-reviewer.md to the packet's scope item 7 / AC6. |
| D-5 | S4 | docs/06-quality/quality-gates.md:33 | The heading "Owners: QA (always), SEC (if triggered), UX (if the UI changed)" conflicts with the tier table: tier L has no QA, and tier M has one combined reviewer. | Change it to "Owners: the reviewers of the packet's risk tier (table below)". |
| D-6 | S4 | docs/09-harness/agent-roles.md:32 | The QA column of the permissions matrix still reads "✓ (qa/ branch or PR comments)". | Change it to "✓ (qa/ branch only)". |
| D-7 | S4 | .claude/skills/qa-evaluation/SKILL.md:17,20 | "Text only" and "Write only in `qa/**` and `evidence/<task-id>/qa/**`" leave unclear who commits the qa/ report. | Add "on a `qa/<task>` branch when the LC asks; otherwise text only". |
| D-8 | S4 | scripts/gate.sh:520-521, 533 | git's default `core.quotePath` quotes non-ASCII paths. A spec with a Vietnamese file name would fail `[[ -f ]]` and be dropped from the ×3 repeat without any message. | Run git with `-c core.quotePath=false` in `changed_files`. |
| D-9 | S4 | scripts/tests/gate.test.sh:574-617 | Scope item 8 promises "no base → run everything", but no test covers a git repo whose base ref is missing. Only the no-git case is tested. AC7 itself only names "outside git", so it is still met. | Add a case with `ENGLMS_GATE_BASE=missing`: it should run both `backend` and `contract-drift` and print "e2e repeat skipped (changed files unknown)". |
| D-10 | S4 | docs/03-architecture/architecture-overview.md:143 | `/evidence` is still described as "small text + key screenshots". | Change it to "text evidence (PNGs git-ignored, DEC-131)". |
| D-11 | S4 | docs/handoff/HANDOFF.md:59 | "the LC first adds the findings to the packet as an AC (DEC-088)" does not mention the new rule for S4. | Add "S1/S2 and cheap S3 only; S4 to the milestone polish packet (DEC-131 (5))". |

D-1 to D-4 are S3 findings that make the posting and recording rule contradictory, which is why the verdict is CHANGES REQUESTED. Once they are fixed, a delta re-check of those four files is enough.

I did not check CI on PR #113 (AC9), the PNG deletions one by one (I trusted the count and the DEC-131 (8) intent), or a real `gate.sh` run.

Wall-clock: about 2 minutes.

## Round 2 (delta, fresh reviewer)

DOCS-REVIEW T-M2.18: PASS. D-1..D-11 closed; new S4 N-1, N-2 (skill descriptions, skills-catalog) fixed by the LC in a13585e; N-3 no change.
