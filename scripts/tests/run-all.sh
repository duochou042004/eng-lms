#!/usr/bin/env bash
# Run all governance-script tests (CI: docs-check job). Exit non-zero if any test file fails.
set -uo pipefail
dir=$(cd "$(dirname "$0")" && pwd)
status=0
for t in "$dir"/*.test.sh; do
  bash "$t" || status=1
done
((status == 0)) && echo "script tests: PASS" || echo "script tests: FAIL"
exit $status
