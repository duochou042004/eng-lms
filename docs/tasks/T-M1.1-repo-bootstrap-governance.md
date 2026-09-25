# T-M1.1: Remote repository bootstrap and governance automation

| Field | Value |
|---|---|
| Milestone | M1 (first gated task after planning) |
| Status | **draft**. Becomes `ready` when the entry gate passes |
| Owner role | Lead Coordinator (LC) |
| Branch | `chore/T-M1.1-repo-governance` (from `develop`, after the baseline merge in step 1) |
| Depends on | T-M0.1 approved by the PO |
| Estimate | 0.5–1 agent-day |
| Trace | PO goal (git governance, gh CLI), DEC-020, DEC-028, DEC-030, ci-cd.md, git-governance.md, OQ-01, OQ-15, R-08 |

## Entry gate (G0; all required)
1. **PO approval of the planning baseline T-M0.1** (`PO-APPROVED T-M0.1`), recorded in the decision log (baseline DEC-001..029 → "Approved by PO").
2. **OQ-01 answered** (repository name and visibility) or its default explicitly accepted.
3. **OQ-15 answered** (activate the proposed Claude Code permission settings).
4. The PO explicitly authorises this packet's outward-facing actions: creating the GitHub repository and pushing to it.

## Goal
Put the repository under the agreed governance on GitHub, so that every later task runs through branch → PR → CI → verdicts → LC merge,
with the rules enforced by tooling rather than memory.

## Scope
- In:
  1. **Bootstrap merge (one-time exception, DEC-030):** no remote or CI exists yet, so the LC merges `docs/T-M0.1-planning-baseline` into `develop` locally
     with `git merge --no-ff`, after `scripts/check-docs.sh` passes locally (the log goes to the evidence). The branch is then deleted. This is the only merge ever made outside `merge-gate.sh`.
  2. Create the GitHub repository per OQ-01 (`gh repo create`). Push `master` and `develop`. Set the default branch to `develop`. Enable merge commits
     only, and delete-branch-on-merge.
  3. On `chore/T-M1.1-repo-governance`:
     - Workflows: `.github/workflows/docs-check.yml` (runs `scripts/check-docs.sh` + `scripts/tests/*.sh`) and `.github/workflows/secrets-scan.yml`
       (gitleaks; actions pinned by commit SHA; minimal `permissions`).
     - `.github/dependabot.yml` (github-actions now; maven and npm are added by T-M1.2 and T-M1.3).
     - Scripts: `scripts/merge-gate.sh` (with `--dry-run`), `scripts/check-path-ownership.sh`, `scripts/install-hooks.sh` (a pre-push hook that blocks
       direct pushes to `master`/`develop` and force-pushes).
     - If OQ-15 = yes: `docs/09-harness/claude-settings.proposed.json` → `.claude/settings.json`.
  4. Open **PR #1** (this packet) → `develop`. CI runs. Verdicts are posted (`DOCS-REVIEW T-M1.1: PASS` from a fresh-context reviewer, `LC-APPROVED T-M1.1`).
     Merge **through `scripts/merge-gate.sh`**, its first real use.
  5. Branch protection on `master` and `develop` via `gh api` **if the plan supports it** (required checks: `docs-check`, `secrets-scan`; PR required;
     no force-push). Otherwise record **DEC-031** (harness enforcement only) with the API response as evidence.
- Out of scope: backend or web code; CI jobs for backend and web (T-M1.2 and T-M1.3); deployment; product doc changes other than bookkeeping.

## Guardrail answers
1. Trace: DEC-020, DEC-028, the PO governance directive. 2. No drift towards excluded scope. 3. No tutor-facing setup. 4. N/A (engineering). 5. N/A.

## Acceptance criteria
- **AC1:** `develop` contains the planning baseline as a `--no-ff` merge commit. `docs/T-M0.1-planning-baseline` is deleted. DEC-030 is recorded. (Evidence: `git log --graph` excerpt, local check-docs log.)
- **AC2:** The remote exists with the chosen visibility. `master` and `develop` are pushed. The default branch is `develop`. Only merge commits are allowed. (Evidence: `gh repo view --json name,visibility,defaultBranchRef,mergeCommitAllowed,squashMergeAllowed,rebaseMergeAllowed`.)
- **AC3:** `docs-check` and `secrets-scan` run on PR #1 and are green. (Evidence: run URLs.)
- **AC4:** `merge-gate.sh --dry-run` refuses when (a) a required check is failing or pending, (b) `LC-APPROVED` is missing, (c) the required verdict comment is missing,
  or (d) the branch is behind its base. It passes when all hold. (Evidence: `scripts/tests/merge-gate.test.sh` with a mocked `gh` via `GH_BIN`, plus a real dry run on PR #1.)
- **AC5:** After `scripts/install-hooks.sh`, the pre-push hook blocks `git push origin develop`, `git push origin master` and `git push --force`. (Evidence: terminal output.)
- **AC6:** `check-path-ownership.sh` fails for a `qa/T-X` diff touching `backend/`, and for a `feature/T-X` diff touching `qa/`. It passes for valid diffs. (Evidence: test output.)
- **AC7:** PR #1 is merged with a merge commit via `merge-gate.sh`, and the branch is deleted. (Evidence: PR URL, `git log --graph`.)
- **AC8:** Branch protection is configured (evidence: `gh api repos/{owner}/{repo}/branches/develop/protection`), **or** DEC-031 documents the fallback, with the API error as evidence.
- **AC9:** `progress.json` (T-M1.1 done; T-M1.2 packet written and `ready`), `docs/handoff/*` and `evidence/T-M1.1/summary.md` are updated. `scripts/check-docs.sh` passes.

## Test plan
- Implementation: plain-bash test scripts in `scripts/tests/*.sh` (no new dependencies) with fixture diffs and a mocked `gh` binary (`GH_BIN` override), run by `docs-check` in CI.
- Independent check (docs/chore packet, quality-gates G3): a fresh-context reviewer re-runs the evidence commands and checks AC1–AC9.

## Evidence required
`evidence/T-M1.1/summary.md` · local check-docs log (bootstrap merge) · `gh` outputs (repo view, protection API) · workflow run links · script test logs · hook demo output.

## Docs to update
`docs/07-operations/ci-cd.md` (actual check names, protection result) · `docs/09-harness/git-governance.md` §7 (the remote now exists) ·
`docs/10-governance/decision-log.md` (PO approval, DEC-030, DEC-031 if needed, OQ answers → DECs) · `docs/10-governance/open-questions.md` (close OQ-01, OQ-15) · `README.md` (remote URL).

## Risks and assumptions
- R-08 (protection unavailable on a private free plan) → AC8 fallback.
- `gh` has the `repo` and `workflow` scopes (verified 2026-09-25: yes; account `duochou042004`).
- The bootstrap merge has no CI. This is accepted once only (DEC-030), because CI cannot exist before the remote does.

## Commands (reproducible; `<owner>/<name>` per OQ-01, default `duochou042004/eng-lms`)
```bash
# 1. bootstrap merge (after PO approval)
./scripts/check-docs.sh | tee evidence/T-M1.1/bootstrap-check-docs.log
git checkout develop && git merge --no-ff docs/T-M0.1-planning-baseline -m "Merge T-M0.1 planning baseline (bootstrap, DEC-030)"
git branch -d docs/T-M0.1-planning-baseline
# 2. remote
gh repo create <owner>/<name> --private --source . --remote origin --description "Private 1:1 teaching workspace"
git push -u origin master develop
gh repo edit <owner>/<name> --default-branch develop --delete-branch-on-merge \
  --enable-merge-commit --enable-squash-merge=false --enable-rebase-merge=false
# 3–4. governance branch and PR #1
git checkout -b chore/T-M1.1-repo-governance develop
# … implement the scope items, run tests …
gh pr create --base develop --title "chore(governance): CI docs/secrets checks, merge gate, hooks [T-M1.1]" --body-file .github/pull_request_template.md
./scripts/merge-gate.sh --dry-run <pr> && ./scripts/merge-gate.sh <pr>
```
