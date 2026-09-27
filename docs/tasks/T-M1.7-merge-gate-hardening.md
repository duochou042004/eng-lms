# T-M1.7: Merge-gate hardening (push-time freshness, negative verdicts, Dependabot rules)

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **ready** (G0-complete; T-M1.6 merged). A PO start signal is needed before implementation |
| Owner role | LC (governance scripts; no product code) |
| Branch | `chore/T-M1.7-merge-gate-hardening` (from `develop`) |
| Depends on | T-M1.1 (merge-gate), T-M1.6 merged |
| Estimate | 1 agent-day |
| Trace | DEC-037 (R2-2), DEC-038 (R3-1, R3-2, R3-3), R-08, git-governance §4, quality-gates G4, ci-cd §2 |

## Goal
`scripts/merge-gate.sh` is the only merge path, because branch protection isn't available (R-08, DEC-031). This task closes the four gaps that the T-M1.1 reviews deferred.
Today the LC covers them with manual checks (DEC-037/038). Once they are fixed, verdict freshness can't be forged with commit dates, an explicit negative verdict always blocks,
and the Dependabot path trusts only real Dependabot commits touching a narrow set of files.

## Scope
- In:
  1. **Freshness by push time (R2-2).** A verdict or approval comment counts only if it is newer than the **time the head commit arrived on the PR**, not the committer-controlled `committedDate`.
     Source: the PR timeline (GraphQL `timelineItems` `PULL_REQUEST_COMMIT` / `HEAD_REF_FORCE_PUSHED_EVENT`, or the REST events). If that time can't be determined,
     **fail closed** with a clear message. Keep `--match-head-commit`.
  2. **Negative verdicts block (R3-2).** Any fresh comment whose first line is an explicit negative of **any** review type for this task blocks the merge, even if another review type passed.
     Examples: `QA-VERDICT <id>: FAIL`, `DOCS-REVIEW <id>: FAIL`, `SEC-REVIEW <id>: CHANGES REQUESTED`, `UX-REVIEW <id>: CHANGES REQUESTED`. The latest comment of each type still wins within its type.
  3. **Dependabot path (R3-1).** *All* commits on the PR must be authored and committed by the Dependabot app, not just the PR author. The allowed files narrow to dependency manifests and lockfiles
     (`**/pom.xml`, `**/package.json`, `**/pnpm-lock.yaml`) plus `.github/workflows/*.yml` **only** for `uses:` SHA bumps. The last part is checked by diff content: only lines matching `uses: …@<sha>` may change.
  4. **Maven wrapper (R3-3).** Allow `backend/.mvn/wrapper/maven-wrapper.properties` on the Dependabot path.
  5. Tests: extend `scripts/tests/merge-gate.test.sh` (mock-gh fixtures) with a case for each rule, positive and negative:
     - a back-dated commit after the verdict (must fail)
     - a force-push after the verdict (must fail)
     - no timeline data (fails closed)
     - a negative verdict of another type (blocks)
     - a human commit on a Dependabot branch (blocks)
     - a workflow edit that isn't a `uses:` bump (blocks)
     - a wrapper properties bump (passes)

     Also update `check-path-ownership.sh` for the Dependabot allow-list, if it must match.
  6. Docs: git-governance §4 (the rules as implemented), ci-cd §2 (branch protection still unavailable; what the gate enforces), and an end to the manual checks of DEC-037/038 (a new DEC).
- Out of scope: branch protection or rulesets (a plan change, the PO's decision), new review types, auto-merge, changes to the required checks list.

## Guardrail answers (scope.md §6)
1. Trace: DEC-037, DEC-038, R-08. 2. No drift. 3. No tutor setup. 4. N/A (engineering). 5. No exam semantics.

## Acceptance criteria
- **AC1:** A verdict posted before the head commit **arrived** is stale, even if the commit's `committedDate` is older (the back-dated commit test). A force-push after the verdict invalidates it. With no timeline data, the gate fails closed.
- **AC2:** An explicit negative verdict of any review type for the task blocks the merge, and the message names it. Positive paths still pass.
- **AC3:** A Dependabot PR passes only if every commit is by Dependabot and every changed file is allowed. A workflow change passes only if it is a `uses:` SHA bump. A wrapper properties bump passes.
- **AC4:** All the new cases are in `merge-gate.test.sh` and pass. The old cases still pass (none removed or weakened). `run-all.sh` is green in `docs-check`.
- **AC5:** `merge-gate.sh --dry-run` on a real open PR still reports correctly (evidence). The docs are updated, a DEC ends the manual checks, `progress.json` and `evidence/T-M1.7/summary.md` are updated.

## Test plan
- Implementation: the mock-gh fixture cases above, a dry run against a real PR, and `shellcheck` if available.
- Independent review: a **docs-reviewer** or QA agent (chore packet, G3) tries to forge freshness (back-dated commits), to sneak in a non-bump workflow edit on a Dependabot branch, and to merge past a negative verdict.

## Evidence required
`evidence/T-M1.7/summary.md`, the test output, the dry-run log, CI links, the review record.

## Risks and assumptions
- Missing or paginated timeline data: use `--paginate`/GraphQL cursors, and fail closed rather than guess.
- GitHub's Dependabot identity: check both the author and the committer login (`dependabot[bot]`) and the verified signature where available.
- The gate must stay runnable from an up-to-date `develop` checkout (a PR can't weaken the gate it's judged by).

## Commands
```bash
bash scripts/tests/merge-gate.test.sh
./scripts/merge-gate.sh --dry-run <pr-number>
```
