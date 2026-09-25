#!/usr/bin/env bash
# merge-gate.sh — the ONLY way the Lead Coordinator merges a PR (git-governance.md §4, quality-gates.md G4).
# Branch protection is unavailable on this private free-plan repo (DEC-031), so this script enforces the gate.
#
# Usage: scripts/merge-gate.sh [--dry-run] <pr-number>
# Env:   GH_BIN (default: gh)  — override for tests
#        REQUIRED_CHECKS_FILE (default: scripts/required-checks.txt)
set -euo pipefail

GH=${GH_BIN:-gh}
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; shift; fi
PR=${1:?"usage: merge-gate.sh [--dry-run] <pr-number>"}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REQUIRED_CHECKS_FILE=${REQUIRED_CHECKS_FILE:-$SCRIPT_DIR/required-checks.txt}

problems=()
fail() { problems+=("$1"); }

pr_json=$($GH pr view "$PR" --json number,state,isDraft,baseRefName,headRefName,mergeStateStatus,comments,files)
state=$(jq -r .state <<<"$pr_json")
draft=$(jq -r .isDraft <<<"$pr_json")
base=$(jq -r .baseRefName <<<"$pr_json")
head=$(jq -r .headRefName <<<"$pr_json")
mss=$(jq -r .mergeStateStatus <<<"$pr_json")

# 1. PR shape
[[ "$state" == "OPEN" ]] || fail "PR is not open (state=$state)"
[[ "$draft" == "false" ]] || fail "PR is a draft"
kind=${head%%/*}
task=$(sed -nE 's#^(feature|fix|docs|chore|qa|release|hotfix)/(T-M[0-9]+\.[0-9]+)([-_].*)?$#\2#p' <<<"$head")
[[ -n "$task" ]] || fail "head branch '$head' does not follow <kind>/<task-id>-<slug>"
case "$kind" in
  release|hotfix) [[ "$base" == "master" ]] || fail "$kind branches merge into master (base=$base)";;
  *)              [[ "$base" == "develop" ]] || fail "task branches merge into develop (base=$base)";;
esac

# 2. Mergeability and up-to-date with base
case "$mss" in
  DIRTY)   fail "merge conflicts with $base";;
  UNKNOWN) fail "GitHub has not computed mergeability yet — retry in a few seconds";;
esac
behind=$($GH api "repos/{owner}/{repo}/compare/${base}...${head}" --jq .behind_by)
[[ "$behind" == "0" ]] || fail "branch is $behind commit(s) behind $base — update it first"

# 3. CI checks: every required check present and passing; no other check failing
checks_json=$($GH pr checks "$PR" --json name,bucket 2>/dev/null || true)
[[ -n "$checks_json" ]] || checks_json='[]'
while IFS= read -r req; do
  [[ -z "$req" || "$req" == \#* ]] && continue
  bucket=$(jq -r --arg n "$req" '[.[] | select(.name == $n) | .bucket][0] // "missing"' <<<"$checks_json")
  [[ "$bucket" == "pass" ]] || fail "required check '$req' is $bucket"
done <"$REQUIRED_CHECKS_FILE"
bad=$(jq -r '[.[] | select(.bucket == "fail" or .bucket == "pending" or .bucket == "cancel") | "\(.name)=\(.bucket)"] | join(", ")' <<<"$checks_json")
[[ -z "$bad" ]] || fail "non-passing checks: $bad"

# 4. Verdict comments (latest comment of each type wins)
latest() { jq -r --arg re "$1" '[.comments[].body | split("\n")[] | select(test($re))] | last // ""' <<<"$pr_json"; }
[[ -n "$(latest "^LC-APPROVED ${task}\\b")" ]] || fail "missing 'LC-APPROVED $task' comment"
qa=$(latest "^QA-VERDICT ${task}:")
docs=$(latest "^DOCS-REVIEW ${task}:")
case "$kind" in
  feature|fix|release|hotfix)
    [[ "$qa" =~ :\ PASS ]] || fail "missing passing 'QA-VERDICT $task: PASS' (latest: '${qa:-none}')";;
  docs|chore)
    [[ "$docs" =~ :\ PASS || "$qa" =~ :\ PASS ]] || fail "missing 'DOCS-REVIEW $task: PASS' (or QA-VERDICT PASS)";;
  qa) : ;;  # QA scenario branches: LC approval + checks suffice
esac
for rv in SEC-REVIEW UX-REVIEW; do
  v=$(latest "^${rv} ${task}:")
  if [[ -n "$v" && ! "$v" =~ :\ APPROVED ]]; then fail "latest $rv is not APPROVED: '$v'"; fi
done

# 5. Bookkeeping: progress.json must change in every task PR (except qa/ branches)
if [[ "$kind" != "qa" ]]; then
  jq -e '[.files[].path] | index("progress.json")' <<<"$pr_json" >/dev/null || fail "progress.json not updated in this PR"
fi

if ((${#problems[@]})); then
  echo "merge-gate: REFUSED PR #$PR ($head → $base)" >&2
  printf '  - %s\n' "${problems[@]}" >&2
  exit 1
fi

echo "merge-gate: all gates passed for PR #$PR ($task: $head → $base)"
if ((DRY_RUN)); then
  echo "merge-gate: dry run — not merging"
  exit 0
fi
$GH pr merge "$PR" --merge --delete-branch
echo "merge-gate: merged PR #$PR with a merge commit"
