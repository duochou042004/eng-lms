#!/usr/bin/env bash
# Tests for scripts/gate.sh (T-M1.5 AC4): arguments, step order, fail-fast and the evidence log, against a stub repo
# (every gate command is a stub that records its name; no Maven, pnpm or containers run).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "gate.sh"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
repo="$work/repo"
mkdir -p "$repo/scripts/tests" "$repo/backend" "$repo/web" "$work/bin"
cp "$ROOT/scripts/gate.sh" "$repo/scripts/gate.sh"
calls="$work/calls"
# A stub records "<name> <args>" and fails when its name equals $GATE_FAIL_AT.
stub() {
  printf '#!/usr/bin/env bash\necho "%s $*" >>"%s"\n[[ "${GATE_FAIL_AT:-}" == "%s" ]] && exit 7\nexit 0\n' "$2" "$calls" "$2" >"$1"
  chmod +x "$1"
}
stub "$repo/scripts/check-docs.sh" docs
stub "$repo/scripts/tests/run-all.sh" scripts
stub "$repo/backend/mvnw" backend
stub "$repo/scripts/contract-drift.sh" contract-drift
printf 'echo "env.sh: stub"\n' >"$repo/scripts/env.sh"
# pnpm stub: its name is "web-<script>" ("web-install" for install), matching the gate's step names.
cat >"$work/bin/pnpm" <<STUB
#!/usr/bin/env bash
name="web-\$1"; [[ "\$1" == test ]] && name=web-test
echo "\$name \$*" >>"$calls"
[[ "\${GATE_FAIL_AT:-}" == "\$name" ]] && exit 7
exit 0
STUB
chmod +x "$work/bin/pnpm"
gate() { env PATH="$work/bin:$PATH" "$repo/scripts/gate.sh" "$@"; }

: >"$calls"
expect_exit 0 "passes when every step passes" -- gate
expect_output_contains "gate: PASS (11 steps" "reports PASS with the step count"
LAST_OUTPUT=$(cut -d' ' -f1 "$calls" | paste -sd' ')
expect_output_contains "docs scripts backend web-install web-lint web-typecheck web-test web-build web-budget web-contrast contract-drift" \
  "runs every step in CI order"
LAST_OUTPUT=$(cat "$calls")
expect_output_contains "backend -B -ntp verify" "backend runs ./mvnw -B -ntp verify"
expect_output_contains "web-install install --frozen-lockfile" "web install uses the frozen lockfile"
expect_output_contains "web-test test --run" "web tests run once (no watch mode)"

: >"$calls"
expect_exit 1 "fails fast on the first failing step" -- env GATE_FAIL_AT=web-typecheck PATH="$work/bin:$PATH" "$repo/scripts/gate.sh"
expect_output_contains "gate: FAIL at step 'web-typecheck' (exit 7)" "names the failing step and its exit code"
expect_output_contains "./scripts/gate.sh --from web-typecheck" "tells how to resume"
LAST_OUTPUT=$(cut -d' ' -f1 "$calls" | paste -sd' ')
expect_output_contains "web-lint web-typecheck" "ran the steps up to the failure"
if grep -qE '^(web-test|web-build|contract-drift) ' "$calls"; then
  FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - steps after the failure must not run"
else
  PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - no step after the failure ran"
fi

: >"$calls"
expect_exit 1 "a failing first step stops everything" -- env GATE_FAIL_AT=docs PATH="$work/bin:$PATH" "$repo/scripts/gate.sh"
LAST_OUTPUT=$(cat "$calls")
[[ "$LAST_OUTPUT" == "docs " ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - only docs ran"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - only docs should run, got: $LAST_OUTPUT"; }

: >"$calls"
expect_exit 0 "--from resumes at a step" -- gate --from web-budget
LAST_OUTPUT=$(cut -d' ' -f1 "$calls" | paste -sd' ')
[[ "$LAST_OUTPUT" == "web-budget web-contrast contract-drift" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - --from runs that step and the rest"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - --from ran: $LAST_OUTPUT"; }

expect_exit 0 "--list prints the steps" -- gate --list
expect_output_contains "contract-drift" "--list includes contract-drift"
expect_exit 2 "--from without a step is a usage error" -- gate --from
expect_exit 2 "--from with an unknown step is a usage error" -- gate --from nope
expect_output_contains "unknown step: nope" "names the unknown step"
expect_exit 2 "unknown arguments are rejected" -- gate --fast
expect_exit 2 "a malformed ENGLMS_TASK is rejected" -- env ENGLMS_TASK=../../etc PATH="$work/bin:$PATH" "$repo/scripts/gate.sh"

: >"$calls"
expect_exit 1 "ENGLMS_TASK writes the evidence log, including the failure" -- \
  env ENGLMS_TASK=T-X1.1 GATE_FAIL_AT=backend PATH="$work/bin:$PATH" "$repo/scripts/gate.sh"
logs=("$repo"/evidence/T-X1.1/gate-*.log)
if [[ -f "${logs[0]}" ]] && grep -q "gate: FAIL at step 'backend'" "${logs[0]}"; then
  PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - evidence/<task>/gate-<timestamp>.log holds the run and the failure"
else
  FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - no gate log with the failure under evidence/T-X1.1/"
fi

finish
