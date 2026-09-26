#!/usr/bin/env bash
# Tests for scripts/e2e-run.sh (T-M1.6): arguments, the busy-port and datasource checks, and that the app is always
# stopped with Playwright's exit code propagated. Stubs for java/curl/pnpm on PATH; --no-build; no real app or browser.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "e2e-run.sh"
work=$(mktemp -d)
listener_pid=""
trap '[[ -n "$listener_pid" ]] && kill "$listener_pid" 2>/dev/null; rm -rf "$work"' EXIT
repo="$work/repo"
mkdir -p "$repo/scripts" "$repo/backend/target" "$repo/e2e" "$work/bin"
cp "$ROOT/scripts/e2e-run.sh" "$repo/scripts/e2e-run.sh"
touch "$repo/backend/target/englms-0.0.1-SNAPSHOT.jar"
# java stub: a long-running "app" that records its pid; curl stub: always ready; pnpm stub: exit $PNPM_EXIT for the test run.
printf '#!/usr/bin/env bash\necho $$ >"%s/app.pid"\nexec sleep 300\n' "$work" >"$work/bin/java"
printf '#!/usr/bin/env bash\nexit 0\n' >"$work/bin/curl"
printf '#!/usr/bin/env bash\necho "pnpm $*" >>"%s/pnpm.args"\n[[ "$1" == exec ]] && exit "${PNPM_EXIT:-0}"\nexit 0\n' "$work" >"$work/bin/pnpm"
chmod +x "$work/bin/"*
run() { env PATH="$work/bin:$PATH" E2E_CHECK_PORTS="${PORTS:-}" SPRING_DATASOURCE_URL=jdbc:postgresql://stub/db "$@"; }
app_gone() { local pid; pid=$(cat "$work/app.pid" 2>/dev/null) || return 0; ! kill -0 "$pid" 2>/dev/null; }

expect_exit 0 "--help prints usage" -- run "$repo/scripts/e2e-run.sh" --help
expect_output_contains "e2e-run.sh [--no-build] [playwright args...]" "usage names the arguments"

: >"$work/pnpm.args"
expect_exit 0 "passes when Playwright passes" -- run "$repo/scripts/e2e-run.sh" --no-build --project=laptop tests/x.spec.ts
expect_output_contains "e2e-run: app stopped" "stops the app after the run"
LAST_OUTPUT=$(cat "$work/pnpm.args")
expect_output_contains "pnpm exec playwright test --project=laptop tests/x.spec.ts" "passes the Playwright arguments through"
app_gone && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - no app process is left"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - the app process is still running"; }

rm -f "$work/app.pid"
expect_exit 3 "propagates Playwright's exit code" -- env PNPM_EXIT=3 PATH="$work/bin:$PATH" E2E_CHECK_PORTS= SPRING_DATASOURCE_URL=x "$repo/scripts/e2e-run.sh" --no-build
expect_output_contains "e2e-run: app stopped" "stops the app after a failing run too"
app_gone && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - no app process is left after a failure"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - the app process is still running after a failure"; }

port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
python3 -c "import socket,time,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1',$port)); s.listen(); time.sleep(60)" &
listener_pid=$!
for _ in $(seq 1 50); do (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && break; sleep 0.1; done
expect_exit 1 "refuses to start when a port is busy" -- env PORTS="$port" bash -c "$(declare -f run); run '$repo/scripts/e2e-run.sh' --no-build"
expect_output_contains "port $port is already in use" "names the busy port"

expect_exit 1 "needs .env or SPRING_DATASOURCE_URL" -- env PATH="$work/bin:$PATH" E2E_CHECK_PORTS= SPRING_DATASOURCE_URL= "$repo/scripts/e2e-run.sh" --no-build
expect_output_contains "no .env and no SPRING_DATASOURCE_URL" "explains the datasource requirement"

finish
