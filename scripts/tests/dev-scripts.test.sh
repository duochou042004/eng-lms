#!/usr/bin/env bash
# Tests for scripts/env.sh and scripts/dev-down.sh (T-M1.4 AC4) with stub `systemctl`/`podman` on PATH (no real containers).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "dev scripts"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin"
stub() { printf '#!/usr/bin/env bash\n%s\n' "$2" >"$work/bin/$1"; chmod +x "$work/bin/$1"; }
sock="$work/podman.sock"
python3 -c "import socket,sys; socket.socket(socket.AF_UNIX).bind(sys.argv[1])" "$sock"

# env.sh
stub systemctl 'exit 3'
expect_exit 1 "env.sh fails when podman.socket is inactive" -- \
  env PATH="$work/bin:$PATH" ENGLMS_PODMAN_SOCK="$sock" bash -c "source '$ROOT/scripts/env.sh'"
expect_output_contains "systemctl --user enable --now podman.socket" "env.sh tells how to enable the socket"

stub systemctl 'exit 0'
expect_exit 1 "env.sh fails when the socket file is missing" -- \
  env PATH="$work/bin:$PATH" ENGLMS_PODMAN_SOCK="$work/missing.sock" bash -c "source '$ROOT/scripts/env.sh'"

expect_exit 0 "env.sh exports DOCKER_HOST and disables Ryuk when the socket is active" -- \
  env PATH="$work/bin:$PATH" ENGLMS_PODMAN_SOCK="$sock" \
  bash -c "source '$ROOT/scripts/env.sh' >/dev/null && echo \"\$DOCKER_HOST|\$TESTCONTAINERS_RYUK_DISABLED\""
expect_output_contains "unix://$sock|true" "env.sh exports the expected values"

# dev-down.sh: the stub podman records its arguments
stub podman "echo \"\$*\" >>'$work/podman.args'"
: >"$work/podman.args"
expect_exit 0 "dev-down.sh keeps the volume by default" -- env PATH="$work/bin:$PATH" "$ROOT/scripts/dev-down.sh"
LAST_OUTPUT=$(cat "$work/podman.args")
expect_output_contains "compose.dev.yaml down" "dev-down.sh runs compose down"
if grep -q -- " -v" "$work/podman.args"; then FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - default down must not pass -v"; else PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - default down does not delete the volume"; fi

: >"$work/podman.args"
expect_exit 0 "dev-down.sh --purge" -- env PATH="$work/bin:$PATH" "$ROOT/scripts/dev-down.sh" --purge
LAST_OUTPUT=$(cat "$work/podman.args")
expect_output_contains "down -v" "--purge removes the volume"

expect_exit 2 "dev-down.sh rejects unknown arguments" -- env PATH="$work/bin:$PATH" "$ROOT/scripts/dev-down.sh" --everything
expect_output_contains "usage: dev-down.sh" "prints usage"

finish
