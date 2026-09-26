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

write_fixture() { # <head> <base> <mergeState> <comments-json-array> <files-json-array> <checks-json> <behind> [author] [commits-json]
  jq -n --arg head "$1" --arg base "$2" --arg mss "$3" --argjson comments "$4" --argjson files "$5" --arg t "$HEAD_TIME" \
    --arg author "${8:-duochou042004}" --argjson commits "${9:-null}" \
    '{number:7,state:"OPEN",isDraft:false,author:{login:$author},baseRefName:$base,headRefName:$head,headRefOid:"abc1234def5678",mergeStateStatus:$mss,
      comments:$comments,files:$files,commits:($commits // [{committedDate:"2026-09-25T09:00:00Z"},{committedDate:$t}])}' >"$MOCK_DIR/pr.json"
  echo "$6" >"$MOCK_DIR/checks.json"
  echo "$7" >"$MOCK_DIR/behind.txt"
  rm -f "$MOCK_DIR/merged.txt"
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

finish
