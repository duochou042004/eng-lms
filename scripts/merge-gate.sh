#!/usr/bin/env bash
# merge-gate.sh — the ONLY way the Lead Coordinator merges a PR (git-governance.md §4, quality-gates.md G4).
# Branch protection is unavailable on this private free-plan repo (DEC-031), so this script enforces the gate.
# Run it from an up-to-date `develop` checkout (not from the PR branch), so a PR cannot weaken the gate it is judged by.
#
# Usage: scripts/merge-gate.sh [--dry-run] <pr-number>   (--dry-run may also follow the number; any other argument exits 2 before any API call)
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
export LC_ALL=C  # [0-9] must mean ASCII digits whatever the caller's locale (T-M1.12 review F3)

GH=${GH_BIN:-gh}
DRY_RUN=0
PR=""
# Strict arguments (T-M1.12 AC4, DEC-074): `--dry-run` may come before or after the PR number; anything else (an unknown option, a second or
# non-numeric PR, no PR) is refused with exit 2 BEFORE any API call, so a mistyped flag can never turn a dry run into a merge.
usage() { printf 'usage: merge-gate.sh [--dry-run] <pr-number>   (--dry-run may also follow the number)\n' >&2; exit 2; }
while (($#)); do
  case "$1" in
    --dry-run) DRY_RUN=1;;
    *) if [[ -z "$PR" && "$1" =~ ^[1-9][0-9]*$ ]]; then PR=$1; else printf 'merge-gate: unexpected argument: %q\n' "$1" >&2; usage; fi;;
  esac
  shift
done
[[ -n "$PR" ]] || usage
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REQUIRED_CHECKS_FILE=${REQUIRED_CHECKS_FILE:-$SCRIPT_DIR/required-checks.txt}

problems=()
fail() { problems+=("$1"); }

pr_json=$($GH pr view "$PR" --json number,state,isDraft,author,baseRefName,headRefName,headRefOid,mergeStateStatus,comments,commits)
state=$(jq -r .state <<<"$pr_json")
draft=$(jq -r .isDraft <<<"$pr_json")
base=$(jq -r .baseRefName <<<"$pr_json")
head=$(jq -r .headRefName <<<"$pr_json")
head_oid=$(jq -r .headRefOid <<<"$pr_json")
mss=$(jq -r .mergeStateStatus <<<"$pr_json")
author=$(jq -r '.author.login // ""' <<<"$pr_json")

# Timestamps are compared as whole-second UTC strings: fractions are cut off (never later than the real time) and any other format is
# INVALID, which a freshness source treats as missing (fail closed) and a comment treats as not fresh (review T-M1.7 S4-1).
TS_DEF='def ts: if type == "string" and test("^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?Z$") then sub("\\.[0-9]+Z$"; "Z") else "INVALID" end;'

# 0. Freshness baseline: when did the head commit ARRIVE on the PR? (T-M1.7 AC1, R2-2, DEC-063)
# committedDate is committer-controlled (a commit can be back-dated), and the PR timeline carries no push time for ordinary pushes
# (Commit.pushedDate is null; REST "committed" events have no created_at). Server-side times are used instead, and the LATEST one wins:
#   - the repository Activity API: the latest push/force_push/branch_creation on refs/heads/<head> whose `after` is the head SHA (required);
#   - the latest `pull_request` workflow run GitHub created for the head SHA on the PR's head branch (opened/synchronize/reopened; required,
#     every workflow runs on every PR, ci-cd.md §1);
#   - the latest force-push on the PR timeline (HEAD_REF_FORCE_PUSHED_EVENT);
#   - the newest committedDate (a floor; an empty commit list fails closed).
# A missing required source, an unparsable time or an API error fails closed.
commit_time=$(jq -r "$TS_DEF"' [.commits[] | .committedDate | ts] | if length == 0 then "" elif any(. == "INVALID") then "INVALID" else max end' <<<"$pr_json")
[[ -n "$commit_time" ]] || fail "cannot determine the head commit time (empty commit list)"
[[ "$commit_time" != "INVALID" ]] || { fail "unparsable commit time (fail closed)"; commit_time=""; }
# Every page of a paginated REST listing must be a JSON array (an error object or other JSON fails closed; review T-M1.15 F1).
pages_are_arrays() { jq -en '[inputs | type == "array"] | length > 0 and all' <<<"$1" >/dev/null 2>&1; }
act_out=""; act_time=""
branch_uri=$(jq -rn --arg b "refs/heads/$head" '$b | @uri')
if act_out=$($GH api --paginate "repos/{owner}/{repo}/activity?ref=${branch_uri}&per_page=100" 2>/dev/null) \
   && pages_are_arrays "$act_out"; then
  act_time=$(jq -rn --arg sha "$head_oid" "$TS_DEF"' [inputs | .[] | select(.after == $sha) | .timestamp | ts] | if any(. == "INVALID") then "" else (max // "") end' <<<"$act_out")
  [[ -n "$act_time" ]] || fail "cannot determine when head ${head_oid:0:7} arrived: no push of it to '$head' in the repository activity (fail closed)"
else
  act_out=""; fail "cannot read the repository activity for '$head' (fail closed)"
fi
run_time=""
if runs_out=$($GH api --paginate "repos/{owner}/{repo}/actions/runs?event=pull_request&head_sha=${head_oid}&per_page=100" 2>/dev/null); then
  run_time=$(jq -rn --arg b "$head" --arg sha "$head_oid" "$TS_DEF"' [inputs | .workflow_runs[]? | select(.event == "pull_request" and .head_sha == $sha and .head_branch == $b) | .created_at | ts]
    | if any(. == "INVALID") then "" else (max // "") end' <<<"$runs_out") || run_time=""
  [[ -n "$run_time" ]] || fail "cannot determine when head ${head_oid:0:7} arrived on the PR: no pull_request workflow run for it on '$head' (fail closed; wait for CI to start)"
else
  fail "cannot list workflow runs for head ${head_oid:0:7} (fail closed)"
fi
fp_time=""
if fp_out=$($GH api graphql -F owner='{owner}' -F name='{repo}' -F pr="$PR" -f query='
    query($owner: String!, $name: String!, $pr: Int!) { repository(owner: $owner, name: $name) { pullRequest(number: $pr) {
      timelineItems(last: 100, itemTypes: [HEAD_REF_FORCE_PUSHED_EVENT]) { nodes { ... on HeadRefForcePushedEvent { createdAt } } } } } }' 2>/dev/null) \
   && jq -e '.data.repository.pullRequest.timelineItems.nodes | type == "array"' <<<"$fp_out" >/dev/null 2>&1; then
  fp_time=$(jq -r "$TS_DEF"' [.data.repository.pullRequest.timelineItems.nodes[] | .createdAt | ts] | if any(. == "INVALID") then "INVALID" else (max // "") end' <<<"$fp_out")
  [[ "$fp_time" != "INVALID" ]] || { fail "unparsable force-push time on the PR timeline (fail closed)"; fp_time=""; }
else
  fail "cannot read the PR timeline (force-push events) (fail closed)"
fi
head_time=$(printf '%s\n' "$commit_time" "$act_time" "$run_time" "$fp_time" | sort | tail -n 1)

# Dependabot path (T-M1.7 AC3, R3-1, R3-3). Allowed files: dependency manifests and lockfiles, the Maven wrapper properties, and workflow files whose
# only change is a `uses: <action>@<40-hex sha>` bump. Keep DEPENDABOT_FILES_RE in sync with check-path-ownership.sh.
DEPENDABOT_FILES_RE='^((.*/)?pom\.xml|(.*/)?package\.json|(.*/)?pnpm-lock\.yaml|backend/\.mvn/wrapper/maven-wrapper\.properties|\.github/workflows/[^/]+\.ya?ml)$'
# group 1: everything between the diff sign and "@" (indentation, "- ", "uses:", the action); group 3: the SHA
USES_LINE_RE='^[-+]([[:space:]]*(-[[:space:]]+)?uses:[[:space:]]*[A-Za-z0-9_.-]+/[A-Za-z0-9_./-]+)@([0-9a-f]{40})([[:space:]]+#.*)?$'
# uses_bump_problem <patch> → prints why the patch is not a pure SHA bump ("" if it is). Each change block must replace N `uses:` lines by N lines,
# pairwise: the same text up to "@" (same indentation, step and action), a different SHA; only the trailing "# comment" may differ (review T-M1.7 S2-1).
uses_bump_problem() {
  local line i rp rs ap as n=0
  local -a rem=() add=()
  say() { printf '%s\n' "$1"; }  # never echo: a diff line such as "-n" would be taken as an option (review T-M1.7 round 2, S3-A)
  while IFS= read -r line; do
    case "$line" in
      '\'*) continue;;  # "\ No newline at end of file"
      -*) if ((${#add[@]})); then say "a removed line after an added one: ${line:0:120}"; return; fi; rem+=("$line"); continue;;
      +*) add+=("$line"); continue;;
      ' '*|'@@'*) ;;    # context line or hunk header (the appended "@@ end" closes the last block)
      *) say "an unexpected diff line: ${line:0:120}"; return;;  # fail closed on anything else (S4-A)
    esac
    # context line, hunk header or the end: judge the change block collected so far
    if ((${#rem[@]} || ${#add[@]})); then
      if ((${#rem[@]} != ${#add[@]})); then say "a change block removes ${#rem[@]} and adds ${#add[@]} line(s) (not a 1:1 replacement)"; return; fi
      for i in "${!rem[@]}"; do
        [[ "${rem[i]}" =~ $USES_LINE_RE ]] || { say "not a uses: SHA line: ${rem[i]:0:120}"; return; }
        rp=${BASH_REMATCH[1]}; rs=${BASH_REMATCH[3]}
        [[ "${add[i]}" =~ $USES_LINE_RE ]] || { say "not a uses: SHA line: ${add[i]:0:120}"; return; }
        ap=${BASH_REMATCH[1]}; as=${BASH_REMATCH[3]}
        [[ "$rp" == "$ap" ]] || { say "'${rp:0:60}' became '${ap:0:60}' (a bump keeps the line up to '@')"; return; }
        [[ "$rs" != "$as" ]] || { say "'${ap:0:60}' keeps its SHA (not a bump)"; return; }
        n=$((n + 1))
      done
      rem=(); add=()
    fi
  done <<<"$1"$'\n@@ end'
  ((n > 0)) || say "no uses: bump in the diff"
}
# wrapper_bump_problem <patch> → prints why a maven-wrapper.properties patch is not a pure version bump ("" if it is) (OQ-17 = yes, DEC-075).
# Each change block must replace N lines by N lines, pairwise with the same key; only `wrapperVersion=<x.y.z>` and
# `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/<v>/apache-maven-<v>-bin.zip` may change. Anything else fails closed.
WRAPPER_VERSION_RE='^[0-9]+\.[0-9]+\.[0-9]+$'
WRAPPER_DIST_RE='^https://repo\.maven\.apache\.org/maven2/org/apache/maven/apache-maven/([0-9]+\.[0-9]+\.[0-9]+)/apache-maven-([0-9]+\.[0-9]+\.[0-9]+)-bin\.zip$'
wrapper_bump_problem() {
  local line i rk ak av n=0
  local -a rem=() add=()
  say() { printf '%s\n' "$1"; }
  while IFS= read -r line; do
    case "$line" in
      '\'*) continue;;
      -*) if ((${#add[@]})); then say "a removed line after an added one: ${line:0:120}"; return; fi; rem+=("${line:1}"); continue;;
      +*) add+=("${line:1}"); continue;;
      ' '*|'@@'*) ;;
      *) say "an unexpected diff line: ${line:0:120}"; return;;
    esac
    if ((${#rem[@]} || ${#add[@]})); then
      if ((${#rem[@]} != ${#add[@]})); then say "a change block removes ${#rem[@]} and adds ${#add[@]} line(s) (keys may not be added or removed)"; return; fi
      for i in "${!rem[@]}"; do
        rk=${rem[i]%%=*}; ak=${add[i]%%=*}; av=${add[i]#*=}
        [[ "${rem[i]}" == *=* && "${add[i]}" == *=* && "$rk" == "$ak" ]] || { say "'${rem[i]:0:60}' became '${add[i]:0:60}' (a bump keeps the key)"; return; }
        case "$ak" in
          wrapperVersion) [[ "$av" =~ $WRAPPER_VERSION_RE ]] || { say "not a wrapperVersion=<x.y.z> line: ${add[i]:0:120}"; return; };;
          distributionUrl)
            [[ "$av" =~ $WRAPPER_DIST_RE && "${BASH_REMATCH[1]}" == "${BASH_REMATCH[2]}" ]] \
              || { say "not a Maven Central apache-maven distributionUrl: ${add[i]:0:120}"; return; };;
          *) say "only wrapperVersion and distributionUrl may change: ${add[i]:0:120}"; return;;
        esac
        n=$((n + 1))
      done
      rem=(); add=()
    fi
  done <<<"$1"$'\n@@ end'
  ((n > 0)) || say "no wrapperVersion/distributionUrl change in the diff"
}
dependabot_checks() {
  local commits_out files_out bad f patch why
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
  # b) every push to the branch since it was (last) created was made by dependabot[bot] (repository activity; review T-M1.7 S3-3)
  if [[ -n "$act_out" ]]; then
    # The window starts at the branch's latest creation and includes every entry stamped at or after that second (not an order-dependent slice:
    # a push in the same second as the creation must count; review T-M1.7 round 2, S3-B). An unparsable time counts as inside the window.
    bad=$(jq -rn "$TS_DEF"' [inputs | .[]] as $a
                  | ([$a[] | select(.activity_type == "branch_creation") | .timestamp | ts | select(. != "INVALID")] | max) as $c
                  | if $c == null then "no branch creation recorded"
                    else [$a[] | select((.timestamp | ts) as $t | $t == "INVALID" or $t >= $c) | select((.actor.login // "") != "dependabot[bot]")
                          | "\(.activity_type) by \(.actor.login // "none") at \(.timestamp)"] | join(", ") end' <<<"$act_out")
    [[ -z "$bad" ]] || fail "dependabot branch has activity not by Dependabot: $bad"
  fi
  # c) the file allow-list, modifications only, and workflow edits limited to `uses:` SHA bumps (judged on the diff content)
  if ! files_out=$($GH api --paginate "repos/{owner}/{repo}/pulls/${PR}/files?per_page=100" 2>/dev/null) \
     || ! pages_are_arrays "$files_out" || [[ $(jq -rn '[inputs | .[]] | length' <<<"$files_out") -eq 0 ]]; then
    fail "cannot list the dependabot PR's files (fail closed)"; return
  fi
  bad=$(jq -rn --arg re "$DEPENDABOT_FILES_RE" '[inputs | .[]? | .filename | select(test($re) | not)] | join(", ")' <<<"$files_out")
  [[ -z "$bad" ]] || fail "dependabot PR changes files outside the allow-list (manifests, lockfiles, wrapper properties, workflow uses: bumps): $bad"
  bad=$(jq -rn '[inputs | .[]? | select(.status != "modified" or .previous_filename != null) | "\(.filename) (\(.status))"] | join(", ")' <<<"$files_out")
  [[ -z "$bad" ]] || fail "dependabot PR may only modify existing files (no adds, removals, renames or copies): $bad"
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    patch=$(jq -rn --arg f "$f" '[inputs | .[]? | select(.filename == $f) | .patch // empty][0] // ""' <<<"$files_out")
    if [[ -z "$patch" ]]; then fail "workflow $f: no diff available to verify (fail closed)"; continue; fi
    why=$(uses_bump_problem "$patch")
    [[ -z "$why" ]] || fail "workflow $f: only 'uses: <action>@<sha>' SHA bumps may change on the dependabot path; found: $why"
  done < <(jq -rn '[inputs | .[]? | select(.filename | test("^\\.github/workflows/")) | .filename] | .[]' <<<"$files_out")
  # d) the Maven wrapper properties: only version bumps (OQ-17 = yes, DEC-075)
  f=backend/.mvn/wrapper/maven-wrapper.properties
  if jq -en --arg f "$f" '[inputs | .[]? | select(.filename == $f)] | length > 0' <<<"$files_out" >/dev/null; then
    patch=$(jq -rn --arg f "$f" '[inputs | .[]? | select(.filename == $f) | .patch // empty][0] // ""' <<<"$files_out")
    if [[ -z "$patch" ]]; then fail "$f: no diff available to verify (fail closed)"
    else
      why=$(wrapper_bump_problem "$patch")
      [[ -z "$why" ]] || fail "$f: only wrapperVersion/distributionUrl version bumps (Maven Central) may change on the dependabot path; found: $why"
    fi
  fi
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
  # An exact "<TYPE> <id>: <TOKEN>" first line gives its token. A NON-exact negative ("qa-verdict  <id> : fail", "**QA-VERDICT <id>: FAIL**",
  # "> QA-VERDICT <id>: FAIL", "## QA VERDICT <id> - FAIL", CHANGES_REQUESTED …) also counts, as a negative, so a sloppy FAIL still blocks; sloppy positives never count (review T-M1.7 S3-1).
  # T-M1.12: Unicode spaces, colons and dashes are normalised before the ASCII filter; leading list markers ("1.", "1)", "(1)", "- - ", "+ ", "[x] ") and a colon
  # after the type are allowed. After any run of ":", "-" and spaces that contains a colon or a space (": ", " - ", "- ", "-: ", " : - ") any word starting with
  # FAIL is a negative, as before; only a word glued to the id by dashes alone must end (FAIL, FAILS, FAILED, FAILURE(S), FAILING(S)), so "<id>-FAILOVER: PASS" is
  # not a negative (T-M1.7 R3 S4-1, S4-2; T-M1.12 review F1, R2-1).
  jq -r --arg type "$1" --arg id "$id" --arg since "$head_time" "$TS_DEF"'
    ($id | ascii_upcase | gsub("(?<c>[.+*?()\\[\\]{}|^$\\\\])"; "\\\(.c)")) as $idre
    | [ .comments[] | select((.createdAt | ts) as $t | $t != "INVALID" and $t > $since) | .body | gsub("\r"; "") | split("\n")[0] | gsub("^\\s+|\\s+$"; "")
      | if startswith($type + " " + $id + ":") then ltrimstr($type + " " + $id + ":") | gsub("^\\s+|\\s+$"; "")
        elif (gsub("[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]"; " ") | gsub("[\uff1a\ufe13\ufe55]"; ":")
              | gsub("[\u2010-\u2015\u2212\u2e3a\u2e3b\ufe58\ufe63\uff0d]"; "-")
              | [explode[] | select(. < 128)] | implode | gsub("[*`>#]"; "") | gsub("_"; " ") | gsub("\\s+"; " ")
              | ascii_upcase | sub("^ ?(([0-9]+[.)]|\\([0-9]+\\)|[-+]|\\[[ X]?\\]) ?)*"; "")
              | ("^" + ($type | sub("-"; "[ -]?")) + ":? " + $idre) as $p
              | test($p + "[ :-]*[ :][ :-]*(FAIL|CHANGES[ -]?REQUESTED)")
                or test($p + "-+(FAIL(S|ED|URES?|INGS?)?|CHANGES[ -]?REQUESTED)(?![A-Z0-9])"))
        then "NEGATIVE (non-exact line: \(.[0:80]))"
        else empty end ]
    | last // ""' <<<"$pr_json"
}
approval_present() { # <TYPE> → a fresh comment whose first line is exactly "<TYPE> <id>"
  jq -e --arg line "$1 $id" --arg since "$head_time" "$TS_DEF"'
    [ .comments[] | select((.createdAt | ts) as $t | $t != "INVALID" and $t > $since) | .body | gsub("\r"; "") | split("\n")[0] | gsub("^\\s+|\\s+$"; "")
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

# 5. Bookkeeping: progress.json must change in every task PR. `gh pr view --json files` returns only the first 100 files, so the
# paginated REST listing is used (T-M1.15); an API error or a page that is not an array fails closed, and only a status that
# changes the file counts (added, modified, renamed, copied, changed; not removed, unchanged or missing; review T-M1.15 F1, F2).
case "$kind" in
  feature|fix|docs|chore|release|hotfix)
    if ! all_files=$($GH api --paginate "repos/{owner}/{repo}/pulls/${PR}/files?per_page=100" 2>/dev/null) || ! pages_are_arrays "$all_files"; then
      fail "cannot list the PR's files (fail closed)"
    else
      jq -en '[inputs | .[] | select(.filename == "progress.json" and ((.status // "") | IN("added", "modified", "renamed", "copied", "changed")))] | length > 0' <<<"$all_files" >/dev/null \
        || fail "progress.json not updated in this PR"
    fi;;
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
