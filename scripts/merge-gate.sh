#!/usr/bin/env bash
# merge-gate.sh — the ONLY way the Lead Coordinator merges a PR (git-governance.md §4, quality-gates.md G4).
# Branch protection is unavailable on this private free-plan repo (DEC-031), so this script enforces the gate.
# Run it from an up-to-date `develop` checkout (not from the PR branch), so a PR cannot weaken the gate it is judged by.
#
# Usage: scripts/merge-gate.sh [--dry-run] <pr-number>
# Env:   GH_BIN (default: gh)  — override for tests
#        REQUIRED_CHECKS_FILE (default: scripts/required-checks.txt)
#
# Merge paths (git-governance.md §4):
#   feature|fix/<task>-*   → develop : QA-VERDICT <task>: PASS[ WITH MINOR] + LC-APPROVED <task> + progress.json changed
#   docs|chore/<task>-*    → develop : DOCS-REVIEW <task>: PASS (or QA-VERDICT PASS) + LC-APPROVED <task> + progress.json changed
#   qa/<task>              → develop : LC-APPROVED <task>
#   release|hotfix/<x.y.z> → master  : QA-VERDICT <x.y.z>: PASS + PO-APPROVED <x.y.z> + LC-APPROVED <x.y.z>
#   dependabot/*           → develop : LC-APPROVED PR-<n>
# In every case: required checks pass, no check fails, branch 0 behind base, no conflicts,
# and every verdict comment must be posted AFTER the PR's head commit (stale verdicts don't count).
set -euo pipefail

GH=${GH_BIN:-gh}
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; shift; fi
PR=${1:?"usage: merge-gate.sh [--dry-run] <pr-number>"}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REQUIRED_CHECKS_FILE=${REQUIRED_CHECKS_FILE:-$SCRIPT_DIR/required-checks.txt}

problems=()
fail() { problems+=("$1"); }

pr_json=$($GH pr view "$PR" --json number,state,isDraft,baseRefName,headRefName,headRefOid,mergeStateStatus,comments,files,commits)
state=$(jq -r .state <<<"$pr_json")
draft=$(jq -r .isDraft <<<"$pr_json")
base=$(jq -r .baseRefName <<<"$pr_json")
head=$(jq -r .headRefName <<<"$pr_json")
head_oid=$(jq -r .headRefOid <<<"$pr_json")
mss=$(jq -r .mergeStateStatus <<<"$pr_json")
head_time=$(jq -r '[.commits[] | .committedDate] | max // ""' <<<"$pr_json")

# 1. PR shape and verdict id
[[ "$state" == "OPEN" ]] || fail "PR is not open (state=$state)"
[[ "$draft" == "false" ]] || fail "PR is a draft"
kind=${head%%/*}
case "$kind" in
  feature|fix|docs|chore|qa)
    id=$(sed -nE 's#^[a-z]+/(T-M[0-9]+\.[0-9]+)([-_].*)?$#\1#p' <<<"$head")
    [[ -n "$id" ]] || fail "head branch '$head' does not follow <kind>/<task-id>-<slug>"
    [[ "$base" == "develop" ]] || fail "task branches merge into develop (base=$base)";;
  release|hotfix)
    id=$(sed -nE 's#^[a-z]+/([0-9]+\.[0-9]+\.[0-9]+)$#\1#p' <<<"$head")
    [[ -n "$id" ]] || fail "head branch '$head' does not follow $kind/<x.y.z>"
    [[ "$base" == "master" ]] || fail "$kind branches merge into master (base=$base)";;
  dependabot)
    id="PR-$PR"
    [[ "$base" == "develop" ]] || fail "dependabot PRs target develop (base=$base)";;
  *) id=""; fail "branch kind '$kind' has no merge path (see git-governance.md §4)";;
esac

# 2. Mergeability and up-to-date with base
case "$mss" in
  DIRTY)   fail "merge conflicts with $base";;
  UNKNOWN) fail "GitHub has not computed mergeability yet — retry in a few seconds";;
esac
behind=$($GH api "repos/{owner}/{repo}/compare/${base}...${head}" --jq .behind_by)
[[ "$behind" == "0" ]] || fail "branch is $behind commit(s) behind $base — update it first"

# 3. CI checks: every required check present and passing; no other check failing or pending
checks_json=$($GH pr checks "$PR" --json name,bucket 2>/dev/null || true)
[[ -n "$checks_json" ]] || checks_json='[]'
while IFS= read -r req; do
  [[ -z "$req" || "$req" == \#* ]] && continue
  bucket=$(jq -r --arg n "$req" '[.[] | select(.name == $n) | .bucket][0] // "missing"' <<<"$checks_json")
  [[ "$bucket" == "pass" ]] || fail "required check '$req' is $bucket"
done <"$REQUIRED_CHECKS_FILE"
bad=$(jq -r '[.[] | select(.bucket == "fail" or .bucket == "pending" or .bucket == "cancel") | "\(.name)=\(.bucket)"] | join(", ")' <<<"$checks_json")
[[ -z "$bad" ]] || fail "non-passing checks: $bad"

# 4. Verdicts: exact tokens only, latest line of each type wins, only comments posted after the head commit count
# verdict <TYPE>  → prints the exact verdict token of the latest fresh "<TYPE> <id>: <TOKEN>" line ("" if none)
verdict() {
  jq -r --arg type "$1" --arg id "$id" --arg since "$head_time" '
    [ .comments[] | select(.createdAt >= $since) | .body | gsub("\r"; "") | split("\n")[]
      | select(startswith($type + " " + $id + ":")) | ltrimstr($type + " " + $id + ":") | gsub("^\\s+|\\s+$"; "") ]
    | last // ""' <<<"$pr_json"
}
approval_present() { # <TYPE> → exact "<TYPE> <id>" line posted after the head commit
  jq -e --arg line "$1 $id" --arg since "$head_time" '
    [ .comments[] | select(.createdAt >= $since) | .body | gsub("\r"; "") | split("\n")[] | gsub("^\\s+|\\s+$"; "")
      | select(. == $line) ] | length > 0' <<<"$pr_json" >/dev/null
}
if [[ -n "$id" ]]; then
  approval_present LC-APPROVED || fail "missing fresh 'LC-APPROVED $id' comment (posted after the head commit)"
  qa=$(verdict QA-VERDICT); docs=$(verdict DOCS-REVIEW)
  qa_pass=0; [[ "$qa" == "PASS" || "$qa" == "PASS WITH MINOR" ]] && qa_pass=1
  case "$kind" in
    feature|fix)    ((qa_pass)) || fail "needs a fresh 'QA-VERDICT $id: PASS' (latest: '${qa:-none}')";;
    docs|chore)     [[ "$docs" == "PASS" ]] || ((qa_pass)) || fail "needs a fresh 'DOCS-REVIEW $id: PASS' (latest: '${docs:-none}')";;
    release|hotfix) ((qa_pass)) || fail "needs a fresh 'QA-VERDICT $id: PASS' (latest: '${qa:-none}')"
                    approval_present PO-APPROVED || fail "missing fresh 'PO-APPROVED $id' comment";;
  esac
  for rv in SEC-REVIEW UX-REVIEW; do
    v=$(verdict "$rv")
    [[ -z "$v" || "$v" == "APPROVED" ]] || fail "latest $rv is not exactly APPROVED: '$v'"
  done
fi

# 5. Bookkeeping: progress.json must change in every task PR
case "$kind" in
  feature|fix|docs|chore|release|hotfix)
    jq -e '[.files[].path] | index("progress.json")' <<<"$pr_json" >/dev/null || fail "progress.json not updated in this PR";;
esac

if ((${#problems[@]})); then
  echo "merge-gate: REFUSED PR #$PR ($head → $base)" >&2
  printf '  - %s\n' "${problems[@]}" >&2
  exit 1
fi

echo "merge-gate: all gates passed for PR #$PR ($id: $head → $base @ ${head_oid:0:7})"
if ((DRY_RUN)); then
  echo "merge-gate: dry run — not merging"
  exit 0
fi
$GH pr merge "$PR" --merge --delete-branch --match-head-commit "$head_oid"
echo "merge-gate: merged PR #$PR with a merge commit"
