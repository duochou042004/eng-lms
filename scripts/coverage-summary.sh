#!/usr/bin/env bash
# coverage-summary.sh — print the JaCoCo totals and per-package line/branch coverage as Markdown (T-M1.5 AC6, DEC-053).
# CI appends it to the job summary ($GITHUB_STEP_SUMMARY), which needs no artifact storage. No threshold (OQ-16, DEC-051).
# Usage: ./scripts/coverage-summary.sh [backend/target/site/jacoco/jacoco.csv]
set -euo pipefail
CSV=${1:-backend/target/site/jacoco/jacoco.csv}
[[ -f "$CSV" ]] || { echo "coverage-summary: $CSV not found (run ./mvnw verify first)" >&2; exit 1; }
# Columns: GROUP,PACKAGE,CLASS,INSTRUCTION_MISSED,INSTRUCTION_COVERED,BRANCH_MISSED,BRANCH_COVERED,LINE_MISSED,LINE_COVERED,...
# POSIX awk only (the CI runner's awk may be mawk): the package rows are sorted by sort(1).
totals() {
  awk -F, '
    function pct(c, m) { return (c + m) ? sprintf("%.1f%%", 100 * c / (c + m)) : "n/a" }
    NR > 1 { LM += $8; LC += $9; BM += $6; BC += $7 }
    END { printf "**Total:** lines %s (%d/%d), branches %s (%d/%d)\n", pct(LC, LM), LC, LC + LM, pct(BC, BM), BC, BC + BM }' "$CSV"
}
rows() {
  awk -F, '
    function pct(c, m) { return (c + m) ? sprintf("%.1f%%", 100 * c / (c + m)) : "n/a" }
    NR > 1 { lm[$2] += $8; lc[$2] += $9; bm[$2] += $6; bc[$2] += $7 }
    END { for (p in lc) printf "| `%s` | %s | %s |\n", p, pct(lc[p], lm[p]), pct(bc[p], bm[p]) }' "$CSV" | sort
}
echo "### Backend coverage (JaCoCo, report only: no threshold yet)"
echo
totals
echo
echo "| Package | Lines | Branches |"
echo "|---|---|---|"
rows
