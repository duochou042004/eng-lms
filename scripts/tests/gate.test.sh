#!/usr/bin/env bash
# Tests for scripts/gate.sh (T-M1.5 AC4): arguments, step order, fail-fast and the evidence log, against a stub repo
# (every gate command is a stub that records its name; no Maven, pnpm or containers run).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "gate.sh"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
repo="$work/repo"
mkdir -p "$repo/scripts/tests" "$repo/backend" "$repo/web" "$repo/qa" "$work/bin"
cp "$ROOT/scripts/gate.sh" "$repo/scripts/gate.sh"; cp -R "$ROOT/scripts/lib" "$repo/scripts/"
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
stub "$repo/scripts/e2e-run.sh" e2e
printf 'echo "env.sh: stub"\n' >"$repo/scripts/env.sh"
# pnpm stub: its name is "<dir>-<script>" ("web-install" for install in web/, "qa-typecheck" in qa/), matching the gate's step names.
cat >"$work/bin/pnpm" <<STUB
#!/usr/bin/env bash
name="\$(basename "\$PWD")-\$1"
echo "\$name \$*" >>"$calls"
[[ "\${GATE_FAIL_AT:-}" == "\$name" ]] && exit 7
exit 0
STUB
chmod +x "$work/bin/pnpm"
gate() { env PATH="$work/bin:$PATH" "$repo/scripts/gate.sh" "$@"; }

: >"$calls"
expect_exit 0 "passes when every step passes" -- gate
expect_output_contains "gate: PASS (13 steps" "reports PASS with the step count"
LAST_OUTPUT=$(cut -d' ' -f1 "$calls" | paste -sd' ' -)
expect_output_contains "docs scripts backend web-install web-lint web-typecheck web-test web-build web-budget web-contrast contract-drift qa-install qa-typecheck e2e" \
  "runs every step in CI order"
LAST_OUTPUT=$(cat "$calls")
expect_output_contains "backend -B -ntp verify" "backend runs ./mvnw -B -ntp verify"
expect_output_contains "web-install install --frozen-lockfile" "web install uses the frozen lockfile"
expect_output_contains "web-test test --run" "web tests run once (no watch mode)"
expect_output_contains "e2e --project=phone-small --project=tablet --project=laptop" "e2e runs the mandatory viewports"
expect_output_contains "qa-install install --frozen-lockfile" "T-M1.18: qa install uses the frozen lockfile"
expect_output_contains "qa-typecheck typecheck" "T-M1.18: the qa suite is typechecked"

: >"$calls"
expect_exit 1 "fails fast on the first failing step" -- env GATE_FAIL_AT=web-typecheck PATH="$work/bin:$PATH" "$repo/scripts/gate.sh"
expect_output_contains "gate: FAIL at step 'web-typecheck' (exit 7)" "names the failing step and its exit code"
expect_output_contains "./scripts/gate.sh --from web-typecheck" "tells how to resume"
LAST_OUTPUT=$(cut -d' ' -f1 "$calls" | paste -sd' ' -)
expect_output_contains "web-lint web-typecheck" "ran the steps up to the failure"
if grep -qE '^(web-test|web-build|contract-drift|e2e) ' "$calls"; then
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
LAST_OUTPUT=$(cut -d' ' -f1 "$calls" | paste -sd' ' -)
[[ "$LAST_OUTPUT" == "web-budget web-contrast contract-drift qa-install qa-typecheck e2e" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - --from runs that step and the rest"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - --from ran: $LAST_OUTPUT"; }

expect_exit 0 "--list prints the steps" -- gate --list
expect_output_contains "contract-drift" "--list includes contract-drift"
grep -qE 'contract-drift.*qa-typecheck.*e2e' <<<"$(tr '\n' ' ' <<<"$LAST_OUTPUT")" \
  && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - T-M1.18: --list shows qa-typecheck between contract-drift and e2e"; } \
  || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - T-M1.18: --list order: $LAST_OUTPUT"; }

# T-M1.18 (review F1): a failing qa install or typecheck fails the gate at qa-typecheck, and e2e does not run
for at in qa-typecheck qa-install; do
  : >"$calls"
  expect_exit 1 "T-M1.18: a failing $at fails the gate" -- env GATE_FAIL_AT=$at PATH="$work/bin:$PATH" "$repo/scripts/gate.sh"
  expect_output_contains "gate: FAIL at step 'qa-typecheck' (exit 7)" "T-M1.18: $at failure is reported at step qa-typecheck"
  grep -q '^e2e ' "$calls" && { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - T-M1.18: e2e ran after a failing $at"; } \
    || { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - T-M1.18: e2e did not run after a failing $at"; }
done
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

# DEC-131 (6): path-aware steps and the changed-spec repeat, in a git repo with a base ref. Outside git (above) nothing is skipped.
g() { git -C "$repo" -c user.name=t -c user.email=t@t "$@" >/dev/null 2>&1; }
g init -q && g add -A && g commit -qm base && g branch base
mkdir -p "$repo/e2e/tests"
gbase() { env ENGLMS_GATE_BASE=base PATH="$work/bin:$PATH" "$@" "$repo/scripts/gate.sh"; }
ran() { cut -d' ' -f1 "$calls" | paste -sd' ' -; }
check() { if eval "$1"; then PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - $2"; else FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $2 (ran: $(ran))"; fi; }

echo "x" >"$repo/web/a.ts"; g add -A; g commit -qm web
: >"$calls"
expect_exit 0 "DEC-131: a web-only diff passes" -- gbase env
expect_output_contains "gate: backend skipped: no backend/ or api/ change" "DEC-131: says why backend is skipped"
check '! grep -qE "^(backend|contract-drift) " "$calls"' "DEC-131: a web-only diff skips backend and contract-drift"
check '[[ $(grep -c "^e2e " "$calls") == 1 ]]' "DEC-131: no changed spec, no repeat run"
expect_output_contains "e2e repeat: no new or changed spec" "DEC-131: says no spec changed"

: >"$calls"
expect_exit 0 "DEC-131: ENGLMS_GATE_FULL=1 passes" -- gbase env ENGLMS_GATE_FULL=1
check 'grep -q "^backend " "$calls" && grep -q "^contract-drift " "$calls"' "DEC-131: ENGLMS_GATE_FULL=1 runs backend and contract-drift"

echo "y" >"$repo/backend/A.java"
: >"$calls"
expect_exit 0 "DEC-131: an uncommitted backend change passes" -- gbase env
check 'grep -q "^backend " "$calls" && grep -q "^contract-drift " "$calls"' "DEC-131: a backend change (untracked) runs backend and contract-drift"
rm "$repo/backend/A.java"

mkdir -p "$repo/api"; echo "z" >"$repo/api/openapi.json"
g add -A; g commit -qm api
: >"$calls"
expect_exit 0 "DEC-131: an api change passes" -- gbase env
check 'grep -q "^backend " "$calls"' "DEC-131: an api/ change runs backend"

echo "t" >"$repo/e2e/tests/new.spec.ts"; g add -A; g commit -qm spec
: >"$calls"
expect_exit 0 "DEC-131: a changed spec passes" -- gbase env
LAST_OUTPUT=$(grep '^e2e ' "$calls" | tail -1)
expect_output_contains "e2e --no-build --project=phone-small --project=tablet --project=laptop --repeat-each=3 --retries=0 tests/new.spec.ts" \
  "DEC-131: the changed spec runs x3 without retries after e2e"
check '[[ $(grep -c "^e2e " "$calls") == 2 ]]' "DEC-131: e2e then one repeat run"

g rm -q e2e/tests/new.spec.ts; g commit -qm rm
: >"$calls"
expect_exit 0 "DEC-131: a deleted spec passes" -- gbase env
check '[[ $(grep -c "^e2e " "$calls") == 1 ]]' "DEC-131: a deleted spec is not repeated"

finish
