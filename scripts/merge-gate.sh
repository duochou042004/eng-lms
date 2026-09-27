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
#   dependabot/*           → develop : LC-APPROVED PR-<n>; the PR author and EVERY commit are Dependabot's (verified); only manifests, lockfiles,
#                                      the Maven wrapper properties and workflow `uses: <action>@<sha>` bumps may change (T-M1.7)
# In every case: required checks pass, no check fails, branch 0 behind base, no conflicts, no review type's latest fresh verdict is negative,
# and every verdict comment must be posted AFTER the head commit ARRIVED on the PR (push time, not committedDate; stale verdicts don't count).
set -euo pipefail

GH=${GH_BIN:-gh}
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then DRY_RUN=1; shift; fi
PR=${1:?"usage: merge-gate.sh [--dry-run] <pr-number>"}
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REQUIRED_CHECKS_FILE=${REQUIRED_CHECKS_FILE:-$SCRIPT_DIR/required-checks.txt}

problems=()
fail() { problems+=("$1"); }

pr_json=$($GH pr view "$PR" --json number,state,isDraft,author,baseRefName,headRefName,headRefOid,mergeStateStatus,comments,files,commits)
state=$(jq -r .state <<<"$pr_json")
draft=$(jq -r .isDraft <<<"$pr_json")
base=$(jq -r .baseRefName <<<"$pr_json")
head=$(jq -r .headRefName <<<"$pr_json")
head_oid=$(jq -r .headRefOid <<<"$pr_json")
mss=$(jq -r .mergeStateStatus <<<"$pr_json")
author=$(jq -r '.author.login // ""' <<<"$pr_json")

# 0. Freshness baseline: when did the head commit ARRIVE on the PR? (T-M1.7 AC1, R2-2)
# committedDate is committer-controlled (a commit can be back-dated), and the PR timeline carries no push time for ordinary pushes
# (Commit.pushedDate is null; REST "committed" events have no created_at). Server-side times are used instead, and the latest one wins:
#   - the latest `pull_request` workflow run GitHub created for the head SHA on the PR's head branch (opened/synchronize/reopened);
#     every workflow runs on every PR (ci-cd.md §1), so a head without such a run means its arrival is unknown → fail closed;
#   - the latest force-push on the PR timeline (HEAD_REF_FORCE_PUSHED_EVENT; a force-push back to an older, already-run SHA);
#   - the newest committedDate (a floor; an empty commit list fails closed).
commit_time=$(jq -r '[.commits[] | .committedDate] | max // ""' <<<"$pr_json")
[[ -n "$commit_time" ]] || fail "cannot determine the head commit time (empty commit list)"
run_time=""
if runs_out=$($GH api --paginate "repos/{owner}/{repo}/actions/runs?event=pull_request&head_sha=${head_oid}&per_page=100" 2>/dev/null); then
  run_time=$(jq -rn --arg b "$head" --arg sha "$head_oid" \
    '[inputs | .workflow_runs[]? | select(.event == "pull_request" and .head_sha == $sha and .head_branch == $b) | .created_at] | max // ""' <<<"$runs_out") || run_time=""
  [[ -n "$run_time" ]] || fail "cannot determine when head ${head_oid:0:7} arrived on the PR: no pull_request workflow run for it on '$head' (fail closed; wait for CI to start)"
else
  fail "cannot list workflow runs for head ${head_oid:0:7} (fail closed)"
fi
fp_time=""
if fp_out=$($GH api graphql -F owner='{owner}' -F name='{repo}' -F pr="$PR" -f query='
    query($owner: String!, $name: String!, $pr: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $pr) {
      timelineItems(last: 100, itemTypes: [HEAD_REF_FORCE_PUSHED_EVENT]) { nodes { ... on HeadRefForcePushedEvent { createdAt } } } } } }' 2>/dev/null) \
   && jq -e '.data.repository.pullRequest.timelineItems.nodes | type == "array"' <<<"$fp_out" >/dev/null 2>&1; then
  fp_time=$(jq -r '[.data.repository.pullRequest.timelineItems.nodes[].createdAt // empty] | max // ""' <<<"$fp_out")
else
  fail "cannot read the PR timeline (force-push events) (fail closed)"
fi
head_time=$(printf '%s\n' "$commit_time" "$run_time" "$fp_time" | sort | tail -n 1)

# Dependabot path (T-M1.7 AC3, R3-1, R3-3). Allowed files: dependency manifests and lockfiles, the Maven wrapper properties, and workflow files whose
# only change is a `uses: <action>@<40-hex sha>` bump of the same actions. Keep DEPENDABOT_FILES_RE in sync with check-path-ownership.sh.
DEPENDABOT_FILES_RE='^((.*/)?pom\.xml|(.*/)?package\.json|(.*/)?pnpm-lock\.yaml|backend/\.mvn/wrapper/maven-wrapper\.properties|\.github/workflows/[^/]+\.ya?ml)$'
USES_LINE_RE='^[-+][[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*([A-Za-z0-9_.-]+/[A-Za-z0-9_./-]+)@[0-9a-f]{40}([[:space:]]+#.*)?$'
dependabot_checks() {
  local commits_out files_out bad f status patch line removed added
  # a) every commit: authored by dependabot[bot], committed by GitHub for it (web-flow or dependabot[bot]), and signature-verified by GitHub
  if commits_out=$($GH api --paginate "repos/{owner}/{repo}/pulls/${PR}/commits?per_page=100" 2>/dev/null) \
     && [[ $(jq -rn '[inputs | .[]?] | length' <<<"$commits_out") -gt 0 ]]; then
    bad=$(jq -rn '[inputs | .[]? | select(((.author.login // "") != "dependabot[bot]")
                     or (((.committer.login // "") | IN("dependabot[bot]", "web-flow")) | not)
                     or (.commit.verification.verified != true))
                   | "\(.sha[0:7]) (author=\(.author.login // "none"), committer=\(.committer.login // "none"), verified=\(.commit.verification.verified))"]
                  | join(", ")' <<<"$commits_out")
    [[ -z "$bad" ]] || fail "dependabot PR has commits not made by Dependabot: $bad"
  else
    fail "cannot list the dependabot PR's commits (fail closed)"
  fi
  # b) the file allow-list and c) workflow edits limited to `uses:` SHA bumps (judged on the diff content)
  if ! files_out=$($GH api --paginate "repos/{owner}/{repo}/pulls/${PR}/files?per_page=100" 2>/dev/null) \
     || [[ $(jq -rn '[inputs | .[]?] | length' <<<"$files_out") -eq 0 ]]; then
    fail "cannot list the dependabot PR's files (fail closed)"; return
  fi
  bad=$(jq -rn --arg re "$DEPENDABOT_FILES_RE" '[inputs | .[]? | .filename | select(test($re) | not)] | join(", ")' <<<"$files_out")
  [[ -z "$bad" ]] || fail "dependabot PR changes files outside the allow-list (manifests, lockfiles, wrapper properties, workflow uses: bumps): $bad"
  bad=$(jq -rn '[inputs | .[]? | select(.previous_filename != null) | .filename] | join(", ")' <<<"$files_out")
  [[ -z "$bad" ]] || fail "dependabot PR renames files: $bad"
  while IFS=$'\t' read -r f status; do
    [[ -z "$f" ]] && continue
    if [[ "$status" != "modified" ]]; then fail "dependabot PR may only modify workflow $f, not '$status' it"; continue; fi
    patch=$(jq -rn --arg f "$f" '[inputs | .[]? | select(.filename == $f) | .patch // empty][0] // ""' <<<"$files_out")
    if [[ -z "$patch" ]]; then fail "workflow $f: no diff available to verify (fail closed)"; continue; fi
    removed=(); added=(); bad=""
    while IFS= read -r line; do
      case "$line" in
        @@*|' '*|'') continue;;
        '\'*) continue;;  # "\ No newline at end of file"
      esac
      if [[ "$line" =~ $USES_LINE_RE ]]; then
        [[ "$line" == -* ]] && removed+=("${BASH_REMATCH[2]}") || added+=("${BASH_REMATCH[2]}")
      else
        bad="$line"; break
      fi
    done <<<"$patch"
    if [[ -n "$bad" ]]; then fail "workflow $f: only 'uses: <action>@<sha>' bumps may change on the dependabot path; found: ${bad:0:120}"; continue; fi
    if [[ ${#added[@]} -eq 0 || "$(printf '%s\n' "${removed[@]}" | sort)" != "$(printf '%s\n' "${added[@]}" | sort)" ]]; then
      fail "workflow $f: a uses: bump must keep the same actions (removed: ${removed[*]:-none}; added: ${added[*]:-none})"
    fi
  done < <(jq -rn '[inputs | .[]? | select(.filename | test("^\\.github/workflows/")) | "\(.filename)\t\(.status)"] | .[]' <<<"$files_out")
}

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
    # The branch name is not proof: only PRs actually opened by the Dependabot app use this path (review R2-1).
    [[ "$author" == "app/dependabot" || "$author" == "dependabot[bot]" ]] || fail "dependabot/* branch not authored by Dependabot (author=$author)"
    [[ "$base" == "develop" ]] || fail "dependabot PRs target develop (base=$base)"
    dependabot_checks;;
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

# 4. Verdicts: exact tokens only; the latest fresh comment of each type wins within its type
# A verdict/approval is the FIRST line of a comment (so quoted or code-block text never counts), posted strictly after the head commit arrived (step 0).
# verdict <TYPE>  → prints the exact verdict token of the latest fresh "<TYPE> <id>: <TOKEN>" comment ("" if none)
verdict() {
  jq -r --arg type "$1" --arg id "$id" --arg since "$head_time" '
    [ .comments[] | select(.createdAt > $since) | .body | gsub("\r"; "") | split("\n")[0] | gsub("^\\s+|\\s+$"; "")
      | select(startswith($type + " " + $id + ":")) | ltrimstr($type + " " + $id + ":") | gsub("^\\s+|\\s+$"; "") ]
    | last // ""' <<<"$pr_json"
}
approval_present() { # <TYPE> → a fresh comment whose first line is exactly "<TYPE> <id>"
  jq -e --arg line "$1 $id" --arg since "$head_time" '
    [ .comments[] | select(.createdAt > $since) | .body | gsub("\r"; "") | split("\n")[0] | gsub("^\\s+|\\s+$"; "")
      | select(. == $line) ] | length > 0' <<<"$pr_json" >/dev/null
}
# The positive tokens of each review type (.claude/agents/*.md). Any other latest fresh verdict — an explicit negative such as FAIL or
# CHANGES REQUESTED, or an unrecognised token — blocks the merge on EVERY path, even if another review type passed (T-M1.7 AC2, R3-2).
positive() { # <TYPE> <token>
  case "$1:$2" in
    "QA-VERDICT:PASS"|"QA-VERDICT:PASS WITH MINOR"|"DOCS-REVIEW:PASS"|"SEC-REVIEW:APPROVED"|"UX-REVIEW:APPROVED") return 0;;
    *) return 1;;
  esac
}
if [[ -n "$id" ]]; then
  approval_present LC-APPROVED || fail "missing fresh 'LC-APPROVED $id' comment (posted after the head commit arrived)"
  declare -A latest=()
  for rv in QA-VERDICT DOCS-REVIEW SEC-REVIEW UX-REVIEW; do
    latest[$rv]=$(verdict "$rv")
    [[ -z "${latest[$rv]}" ]] || positive "$rv" "${latest[$rv]}" \
      || fail "blocked by a negative verdict: latest '$rv $id: ${latest[$rv]}' (any review type's negative blocks the merge)"
  done
  qa=${latest[QA-VERDICT]}; docs=${latest[DOCS-REVIEW]}
  qa_pass=0; positive QA-VERDICT "$qa" && qa_pass=1
  case "$kind" in
    feature|fix)    ((qa_pass)) || fail "needs a fresh 'QA-VERDICT $id: PASS' (latest: '${qa:-none}')";;
    docs|chore)     [[ "$docs" == "PASS" ]] || ((qa_pass)) || fail "needs a fresh 'DOCS-REVIEW $id: PASS' (or QA-VERDICT PASS) (latest: '${docs:-none}')";;
    release|hotfix) ((qa_pass)) || fail "needs a fresh 'QA-VERDICT $id: PASS' (latest: '${qa:-none}')"
                    approval_present PO-APPROVED || fail "missing fresh 'PO-APPROVED $id' comment";;
  esac
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
