#!/usr/bin/env bash
# Minimal bash test helpers (no external test framework; plain bash).
PASS_COUNT=0; FAIL_COUNT=0
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)

# expect_exit <expected-code> <description> -- <command...>
expect_exit() {
  local expected=$1 desc=$2; shift 3
  local out code
  out=$("$@" 2>&1) && code=0 || code=$?
  if [[ "$code" == "$expected" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - $desc"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $desc (expected exit $expected, got $code)"; echo "$out" | sed 's/^/         /'
  fi
  LAST_OUTPUT=$out
}

# expect_output_contains <substring> <description>
expect_output_contains() {
  if grep -qF -- "$1" <<<"$LAST_OUTPUT"; then
    PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - $2"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $2 (missing: $1)"; echo "$LAST_OUTPUT" | sed 's/^/         /'
  fi
}

# expect_output_not_contains <substring> <description>
expect_output_not_contains() {
  if ! grep -qF -- "$1" <<<"$LAST_OUTPUT"; then
    PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - $2"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $2 (unexpected: $1)"; echo "$LAST_OUTPUT" | sed 's/^/         /'
  fi
}

finish() {
  echo "  -> $PASS_COUNT passed, $FAIL_COUNT failed"
  ((FAIL_COUNT == 0))
}
