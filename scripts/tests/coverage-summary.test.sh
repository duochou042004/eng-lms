#!/usr/bin/env bash
# Tests for scripts/coverage-summary.sh (T-M1.8 AC7, DEC-055 R2-3) with fixture JaCoCo CSVs.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "coverage-summary.sh"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
HEADER="GROUP,PACKAGE,CLASS,INSTRUCTION_MISSED,INSTRUCTION_COVERED,BRANCH_MISSED,BRANCH_COVERED,LINE_MISSED,LINE_COVERED,COMPLEXITY_MISSED,COMPLEXITY_COVERED,METHOD_MISSED,METHOD_COVERED"
# Two packages, three classes. com.englms.b: lines 5 missed / 15 covered, branches 1/3. com.englms.a: lines 0/10, no branches.
cat >"$work/jacoco.csv" <<CSV
$HEADER
englms,com.englms.b,B1,10,40,1,1,3,7,0,2,0,2
englms,com.englms.b,B2,4,20,0,2,2,8,0,1,0,1
englms,com.englms.a,A,0,30,0,0,0,10,0,1,0,1
CSV
expected=$(cat <<'MD'
### Backend coverage (JaCoCo, report only: no threshold yet)

**Total:** lines 83.3% (25/30), branches 75.0% (3/4)

| Package | Lines | Branches |
|---|---|---|
| `com.englms.a` | 100.0% | n/a |
| `com.englms.b` | 75.0% | 75.0% |
MD
)
expect_exit 0 "summarises a fixture CSV" -- "$ROOT/scripts/coverage-summary.sh" "$work/jacoco.csv"
[[ "$LAST_OUTPUT" == "$expected" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - exact totals line and sorted per-package rows"; } \
  || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - unexpected summary:"; diff <(echo "$expected") <(echo "$LAST_OUTPUT") | sed 's/^/         /'; }

expect_exit 1 "a missing CSV exits 1" -- "$ROOT/scripts/coverage-summary.sh" "$work/nope.csv"
expect_output_contains "coverage-summary: $work/nope.csv not found (run ./mvnw verify first)" "explains the missing CSV"

echo "$HEADER" >"$work/header-only.csv"
expect_exit 0 "a header-only CSV (no classes) is not an error" -- "$ROOT/scripts/coverage-summary.sh" "$work/header-only.csv"
expect_output_contains "**Total:** lines n/a (0/0), branches n/a (0/0)" "reports n/a totals"
[[ $(grep -c '^| `' <<<"$LAST_OUTPUT") -eq 0 ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - no package rows"; } \
  || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - expected no package rows"; }

: >"$work/empty.csv"
expect_exit 0 "an empty CSV file is not an error" -- "$ROOT/scripts/coverage-summary.sh" "$work/empty.csv"
expect_output_contains "**Total:** lines n/a (0/0), branches n/a (0/0)" "reports n/a totals for an empty file"

finish
