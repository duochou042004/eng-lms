#!/usr/bin/env bash
# Tests for scripts/merge-gate.sh (T-M1.1 AC4) using a mocked gh.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "merge-gate.sh"

export GH_BIN="$ROOT/scripts/tests/mock-gh"
export MOCK_DIR; MOCK_DIR=$(mktemp -d)
trap 'rm -rf "$MOCK_DIR"' EXIT

write_fixture() { # <head> <mergeState> <comments-json-array> <files-json-array> <checks-json> <behind>
  jq -n --arg head "$1" --arg mss "$2" --argjson comments "$3" --argjson files "$4" \
    '{number:7,state:"OPEN",isDraft:false,baseRefName:"develop",headRefName:$head,mergeStateStatus:$mss,comments:$comments,files:$files}' \
    >"$MOCK_DIR/pr.json"
  echo "$5" >"$MOCK_DIR/checks.json"
  echo "$6" >"$MOCK_DIR/behind.txt"
  rm -f "$MOCK_DIR/merged.txt"
}
GOOD_CHECKS='[{"name":"docs-check","bucket":"pass"},{"name":"secrets-scan","bucket":"pass"}]'
GOOD_COMMENTS='[{"body":"DOCS-REVIEW T-M9.9: PASS\nall good"},{"body":"LC-APPROVED T-M9.9"}]'
FILES='[{"path":"progress.json"},{"path":"docs/README.md"}]'

write_fixture chore/T-M9.9-x CLEAN "$GOOD_COMMENTS" "$FILES" "$GOOD_CHECKS" 0
expect_exit 0 "passes when all gates hold (dry run)" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7
[[ ! -f "$MOCK_DIR/merged.txt" ]] && { PASS_COUNT=$((PASS_COUNT+1)); echo "  ok   - dry run does not merge"; } || { FAIL_COUNT=$((FAIL_COUNT+1)); echo "  FAIL - dry run merged"; }

expect_exit 0 "merges with a merge commit when not dry run" -- "$ROOT/scripts/merge-gate.sh" 7
grep -q -- "--merge --delete-branch" "$MOCK_DIR/merged.txt" && { PASS_COUNT=$((PASS_COUNT+1)); echo "  ok   - uses --merge --delete-branch"; } || { FAIL_COUNT=$((FAIL_COUNT+1)); echo "  FAIL - merge flags"; }

write_fixture chore/T-M9.9-x CLEAN "$GOOD_COMMENTS" "$FILES" '[{"name":"docs-check","bucket":"fail"},{"name":"secrets-scan","bucket":"pass"}]' 0
expect_exit 1 "(a) refuses when a required check fails" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7
expect_output_contains "required check 'docs-check' is fail" "reports the failing check"

write_fixture chore/T-M9.9-x CLEAN "$GOOD_COMMENTS" "$FILES" '[{"name":"docs-check","bucket":"pending"},{"name":"secrets-scan","bucket":"pass"}]' 0
expect_exit 1 "(a) refuses when a required check is pending" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture chore/T-M9.9-x CLEAN "$GOOD_COMMENTS" "$FILES" '[{"name":"docs-check","bucket":"pass"}]' 0
expect_exit 1 "(a) refuses when a required check is missing" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture chore/T-M9.9-x CLEAN '[{"body":"DOCS-REVIEW T-M9.9: PASS"}]' "$FILES" "$GOOD_CHECKS" 0
expect_exit 1 "(b) refuses without LC-APPROVED" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7
expect_output_contains "missing 'LC-APPROVED T-M9.9'" "reports missing LC approval"

write_fixture chore/T-M9.9-x CLEAN '[{"body":"LC-APPROVED T-M9.9"}]' "$FILES" "$GOOD_CHECKS" 0
expect_exit 1 "(c) refuses a chore PR without DOCS-REVIEW PASS" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture feature/T-M9.9-x CLEAN '[{"body":"LC-APPROVED T-M9.9"},{"body":"QA-VERDICT T-M9.9: PASS"},{"body":"QA-VERDICT T-M9.9: FAIL"}]' "$FILES" "$GOOD_CHECKS" 0
expect_exit 1 "(c) refuses a feature PR whose latest QA verdict is FAIL" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture feature/T-M9.9-x CLEAN '[{"body":"LC-APPROVED T-M9.9"},{"body":"QA-VERDICT T-M9.9: PASS"},{"body":"SEC-REVIEW T-M9.9: CHANGES REQUESTED"}]' "$FILES" "$GOOD_CHECKS" 0
expect_exit 1 "(c) refuses when the latest SEC-REVIEW requests changes" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture feature/T-M9.9-x CLEAN '[{"body":"LC-APPROVED T-M9.9"},{"body":"QA-VERDICT T-M9.9: PASS WITH MINOR"}]' "$FILES" "$GOOD_CHECKS" 0
expect_exit 0 "accepts a feature PR with QA PASS WITH MINOR" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture chore/T-M9.9-x CLEAN "$GOOD_COMMENTS" "$FILES" "$GOOD_CHECKS" 3
expect_exit 1 "(d) refuses when the branch is behind its base" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7
expect_output_contains "3 commit(s) behind develop" "reports how far behind"

write_fixture chore/T-M9.9-x DIRTY "$GOOD_COMMENTS" "$FILES" "$GOOD_CHECKS" 0
expect_exit 1 "refuses on merge conflicts" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture chore/T-M9.9-x CLEAN "$GOOD_COMMENTS" '[{"path":"docs/README.md"}]' "$GOOD_CHECKS" 0
expect_exit 1 "refuses when progress.json is not updated" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

write_fixture wip-branch CLEAN "$GOOD_COMMENTS" "$FILES" "$GOOD_CHECKS" 0
expect_exit 1 "refuses a branch without a task id" -- "$ROOT/scripts/merge-gate.sh" --dry-run 7

finish
