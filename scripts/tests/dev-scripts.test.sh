#!/usr/bin/env bash
# Tests for scripts/lib/engine.sh, scripts/env.sh, dev-up.sh and dev-down.sh (T-M1.4 AC4, T-M1.8 AC5, T-M1.19 AC1-AC3, AC6) with mock
# `docker`/`podman`/`systemctl`/`uname` on PATH (no real containers). Every case runs in an isolated environment (`iso`): the engine
# variables of the caller (gate.sh sources env.sh) are removed, and `docker` is a failing stub unless a case makes it reachable
# (CI runners have a real Docker).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "dev scripts"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin" "$work/repo/scripts" "$work/repo/deploy" "$work/home"
stub() { printf '#!/usr/bin/env bash\n%s\n' "$2" >"$work/bin/$1"; chmod +x "$work/bin/$1"; }
sock="$work/podman.sock"; msock="$work/machine.sock"; dsock="$work/docker.sock"
for s in "$sock" "$msock" "$dsock"; do python3 -c "import socket,sys; socket.socket(socket.AF_UNIX).bind(sys.argv[1])" "$s"; done
ok() { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - $1"; }
ko() { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $1"; }

# A stub repo with the real dev scripts, a dummy compose file and .env (dev-up.sh needs one; CI has none).
cp "$ROOT/scripts/dev-up.sh" "$ROOT/scripts/dev-down.sh" "$work/repo/scripts/"; cp -R "$ROOT/scripts/lib" "$work/repo/scripts/"
: >"$work/repo/deploy/compose.dev.yaml"; : >"$work/repo/.env"

# Mock engines. Each records "<args> [DOCKER_HOST=…]" in $work/<name>.args and keeps the container/volume state in files.
# docker: unreachable unless MOCK_DOCKER=ok; MOCK_DOCKER_VERSION is its `docker version` text, MOCK_DOCKER_ENDPOINT its context endpoint.
# podman: `machine inspect` prints MOCK_MACHINE_SOCK; `info` fails with MOCK_PODMAN_INFO=fail (no Podman at all). Both fail like the real CLIs when the container/volume does not exist.
engine_stub() {
  stub "$1" "echo \"\$* [DOCKER_HOST=\${DOCKER_HOST:-}]\" >>'$work/$1.args'
[[ '$1' == docker && \"\${MOCK_DOCKER:-fail}\" != ok ]] && exit 1
case \"\$1 \${2:-}\" in
  'info '*) [[ '$1' == podman && \"\${MOCK_PODMAN_INFO:-ok}\" != ok ]] && exit 1; echo 'Server Version: 1' ;;
  'version '*) echo \"\${MOCK_DOCKER_VERSION:-Server: Docker Engine - Community}\" ;;
  'context inspect') echo \"\${MOCK_DOCKER_ENDPOINT:-unix:///var/run/docker.sock}\" ;;
  'machine inspect') echo \"\${MOCK_MACHINE_SOCK:-}\" ;;
  'container inspect') [[ -f '$work/running' ]] || { echo 'Error: no such container englms-dev-db' >&2; exit 1; }; echo healthy ;;
  'volume inspect') [[ -f '$work/volume' ]] || exit 1 ;;
  'volume rm') rm -f '$work/volume' ;;
  'port '*) echo 127.0.0.1:5432 ;;
  compose*)
    case \"\$*\" in
      *' up -d') touch '$work/running' '$work/volume' ;;
      *' down -v') [[ -f '$work/running' ]] || echo 'Error: no container with name or ID \"englms-dev-db\" found' >&2; rm -f '$work/running' '$work/volume' ;;
      *' down') [[ -f '$work/running' ]] || echo 'Error: no pod with name or ID pod_englms-dev found' >&2; rm -f '$work/running' ;;
    esac ;;
esac
exit 0"
}
engine_stub docker; engine_stub podman
stub systemctl "echo \"\$*\" >>'$work/systemctl.args'; exit \${MOCK_SYSTEMCTL:-0}"
stub uname "echo \${MOCK_UNAME:-Linux}"
reset() { : >"$work/docker.args"; : >"$work/podman.args"; : >"$work/systemctl.args"; }
iso() {
  env -u DOCKER_HOST -u ENGLMS_CONTAINER_ENGINE -u TESTCONTAINERS_RYUK_DISABLED -u ENGLMS_PODMAN_SOCK -u TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE \
    -u ENGLMS_ENGINE_SOCK -u ENGLMS_CONTAINER_ENGINE_AUTO \
    PATH="$work/bin:$PATH" HOME="$work/home" "$@"
}
# show <file to source>: prints the exported values after sourcing it with bash
show() { echo "source '$1' && echo \"=\$ENGLMS_CONTAINER_ENGINE|\${DOCKER_HOST:-}|\${TESTCONTAINERS_RYUK_DISABLED:-}|\${TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:-}\""; }
ENGINE="$ROOT/scripts/lib/engine.sh"; ENV="$ROOT/scripts/env.sh"

echo " engine.sh (AC1)"
reset
expect_exit 0 "a: ENGLMS_CONTAINER_ENGINE=docker forces docker" -- iso ENGLMS_CONTAINER_ENGINE=docker bash -c "$(show "$ENGINE")"
expect_output_contains "=docker|" "a: exports ENGLMS_CONTAINER_ENGINE=docker"
expect_output_contains "engine: docker (ENGLMS_CONTAINER_ENGINE)" "a: prints the choice"
expect_exit 0 "a: ENGLMS_CONTAINER_ENGINE=podman wins over a reachable Docker" -- \
  iso ENGLMS_CONTAINER_ENGINE=podman MOCK_DOCKER=ok ENGLMS_PODMAN_SOCK="$sock" bash -c "$(show "$ENGINE")"
expect_output_contains "=podman|" "a: exports ENGLMS_CONTAINER_ENGINE=podman"
expect_exit 1 "a: any other value is refused" -- iso ENGLMS_CONTAINER_ENGINE=nerdctl bash -c "source '$ENGINE'"
expect_output_contains "ENGLMS_CONTAINER_ENGINE must be docker or podman" "a: says which values are allowed"

expect_exit 0 "b: a preset Podman DOCKER_HOST goes to Podman even when Docker is reachable" -- \
  iso DOCKER_HOST=unix:///run/user/1000/podman/podman.sock MOCK_DOCKER=ok bash -c "$(show "$ENGINE")"
expect_output_contains "=podman|unix:///run/user/1000/podman/podman.sock|" "b: podman, DOCKER_HOST kept"
expect_exit 0 "b: any other preset DOCKER_HOST is Docker" -- iso DOCKER_HOST="unix://$dsock" bash -c "$(show "$ENGINE")"
expect_output_contains "=docker|unix://$dsock|" "b: docker, DOCKER_HOST kept"

reset
expect_exit 0 "c: a reachable Docker is chosen" -- iso MOCK_DOCKER=ok bash -c "$(show "$ENGINE")"
expect_output_contains "=docker|" "c: docker"
expect_output_contains "engine: docker (docker info)" "c: prints the choice"
[[ ! -s "$work/systemctl.args" ]] && ok "c: systemctl is not called off path d" || ko "c: systemctl was called: $(cat "$work/systemctl.args")"
expect_exit 0 "c: a Podman-backed docker (podman-docker shim) goes to the Podman path" -- \
  iso MOCK_DOCKER=ok MOCK_DOCKER_VERSION="Client: Podman Engine" ENGLMS_PODMAN_SOCK="$sock" bash -c "$(show "$ENGINE")"
expect_output_contains "=podman|" "c: shim → podman"
expect_exit 0 "c: a Docker CLI talking to a Podman server goes to the Podman path" -- \
  iso MOCK_DOCKER=ok MOCK_DOCKER_VERSION="Server: Podman Engine" ENGLMS_PODMAN_SOCK="$sock" bash -c "$(show "$ENGINE")"
expect_output_contains "=podman|" "c: Podman server → podman"

reset
expect_exit 0 "d: rootless Podman on Linux (active socket)" -- iso ENGLMS_PODMAN_SOCK="$sock" bash -c "$(show "$ENGINE")"
expect_output_contains "=podman|" "d: podman"
expect_output_contains "engine: podman (socket $sock)" "d: prints the socket"
LAST_OUTPUT=$(cat "$work/systemctl.args")
expect_output_contains "--user is-active --quiet podman.socket" "d: systemctl is asked about podman.socket"

reset
expect_exit 0 "e: a Podman machine on macOS" -- iso MOCK_UNAME=Darwin MOCK_MACHINE_SOCK="$msock" bash -c "$(show "$ENGINE")"
expect_output_contains "=podman|" "e: podman"
expect_output_contains "engine: podman (socket $msock)" "e: uses the machine's socket"
[[ ! -s "$work/systemctl.args" ]] && ok "e: systemctl is not called on macOS" || ko "e: systemctl was called"
grep -q "machine inspect --format {{.ConnectionInfo.PodmanSocket.Path}}" "$work/podman.args" && ok "e: asks podman machine inspect" || ko "e: podman machine inspect not called"

expect_exit 1 "nothing reachable (Docker down, Podman socket inactive, podman info fails) fails" -- iso MOCK_SYSTEMCTL=3 MOCK_PODMAN_INFO=fail ENGLMS_PODMAN_SOCK="$sock" bash -c "source '$ENGINE'"
[[ $(printf '%s\n' "$LAST_OUTPUT" | wc -l) -eq 1 ]] && ok "nothing reachable: one message" || ko "nothing reachable: expected one line, got: $LAST_OUTPUT"
expect_output_contains "start Docker" "nothing reachable: names Docker"
expect_output_contains "systemctl --user enable --now podman.socket" "nothing reachable: names Podman and how to enable its socket"
expect_exit 1 "nothing reachable on macOS (no Podman machine socket) fails" -- iso MOCK_UNAME=Darwin MOCK_MACHINE_SOCK="$work/none.sock" bash -c "source '$ENGINE'"
expect_output_contains "podman machine start" "nothing reachable on macOS: names podman machine start"
expect_output_not_contains "is not a socket" "nothing reachable without ENGLMS_PODMAN_SOCK: no socket note"
# QA F-4: a set ENGLMS_PODMAN_SOCK that is not a socket is named in the message
expect_exit 1 "F-4: nothing reachable with ENGLMS_PODMAN_SOCK pointing at no socket" -- \
  iso MOCK_PODMAN_INFO=fail ENGLMS_PODMAN_SOCK="$work/missing.sock" bash -c "source '$ENGINE'"
expect_output_contains "ENGLMS_PODMAN_SOCK=$work/missing.sock is not a socket" "F-4: names the variable and the path"
[[ $(printf '%s\n' "$LAST_OUTPUT" | wc -l) -eq 1 ]] && ok "F-4: still one message" || ko "F-4: expected one line, got: $LAST_OUTPUT"
# QA F-1: Linux Podman without an active API socket (never enabled, or no systemd as on WSL2) still serves dev-up/dev-down
for sc in 3 127; do
  expect_exit 0 "F-1: socket inactive (systemctl exit $sc) but podman info works: podman without a socket" -- iso MOCK_SYSTEMCTL=$sc bash -c "$(show "$ENGINE")"
  expect_output_contains "engine: podman (podman info; no API socket)" "F-1: says there is no API socket"
  expect_output_contains "=podman|" "F-1: exports podman"
done
reset
expect_exit 0 "F-1: macOS does not fall back to podman info" -- iso MOCK_UNAME=Darwin MOCK_MACHINE_SOCK="$work/none.sock" ENGLMS_CONTAINER_ENGINE= bash -c "source '$ENGINE' 2>/dev/null; echo rc=\$?"
expect_output_contains "rc=1" "F-1: macOS without a machine socket is still not reachable"
grep -q "^info" "$work/podman.args" && ko "F-1: podman info was called on macOS" || ok "F-1: podman info is not called on macOS"
[[ ! -s "$work/systemctl.args" ]] && ok "F-1: systemctl stays on Linux path d" || ko "F-1: systemctl was called on macOS"
expect_exit 0 "sourcing twice gives the same engine" -- iso MOCK_DOCKER=ok bash -c "source '$ENGINE' >/dev/null && $(show "$ENGINE")"
expect_output_contains "=docker|" "sourcing twice: still docker"
# QA F-3: a detected choice is not "forced": sourcing again, or a child script, detects again; a user's choice still forces
expect_output_not_contains "(ENGLMS_CONTAINER_ENGINE)" "F-3: the second sourcing is not reported as forced"
expect_exit 0 "F-3: sourcing again after Docker stopped detects Podman" -- iso ENGLMS_PODMAN_SOCK="$sock" bash -c \
  "export MOCK_DOCKER=ok; source '$ENGINE' >/dev/null; MOCK_DOCKER=fail; $(show "$ENGINE")"
expect_output_contains "=podman|" "F-3: re-detected podman"
expect_exit 0 "F-3: a child script detects again" -- iso MOCK_DOCKER=ok bash -c "source '$ENGINE' >/dev/null; bash -c \"source '$ENGINE'\""
expect_output_contains "engine: docker (docker info)" "F-3: the child reports detection, not a forced choice"
expect_exit 0 "F-3: a user's ENGLMS_CONTAINER_ENGINE after a detection still forces" -- iso MOCK_DOCKER=ok bash -c \
  "source '$ENGINE' >/dev/null; export ENGLMS_CONTAINER_ENGINE=podman; source '$ENGINE' >/dev/null; $(show "$ENGINE")"
expect_output_contains "engine: podman (ENGLMS_CONTAINER_ENGINE" "F-3: the user's choice is reported as forced"
expect_output_contains "=podman|" "F-3: and kept"

echo " env.sh (AC2, AC6)"
# T-M1.4 cases, now through the engine detection (Docker unreachable).
expect_exit 1 "env.sh fails when podman.socket is inactive" -- iso MOCK_SYSTEMCTL=3 ENGLMS_PODMAN_SOCK="$sock" bash -c "source '$ENV'"
expect_output_contains "systemctl --user enable --now podman.socket" "env.sh tells how to enable the socket"
expect_exit 1 "F-1: env.sh on Podman without a socket (no systemd) fails with one clear message" -- iso MOCK_SYSTEMCTL=127 bash -c "source '$ENV' >/dev/null"
expect_output_contains "env.sh: Testcontainers needs the Podman API socket: enable it with systemctl --user enable --now podman.socket" "F-1: names the socket and how to enable it"
[[ $(printf '%s\n' "$LAST_OUTPUT" | wc -l) -eq 1 ]] && ok "F-1: one message" || ko "F-1: expected one line, got: $LAST_OUTPUT"
expect_exit 1 "env.sh fails when the socket file is missing" -- iso ENGLMS_PODMAN_SOCK="$work/missing.sock" bash -c "source '$ENV'"
expect_output_contains "ENGLMS_PODMAN_SOCK=$work/missing.sock is not a socket" "F-4: env.sh names a bad ENGLMS_PODMAN_SOCK"
expect_exit 0 "env.sh exports DOCKER_HOST and disables Ryuk when the socket is active" -- iso ENGLMS_PODMAN_SOCK="$sock" bash -c "$(show "$ENV")"
expect_output_contains "=podman|unix://$sock|true|" "env.sh exports the expected values"
expect_exit 0 "Podman machine (macOS): DOCKER_HOST is its socket, Ryuk off" -- iso MOCK_UNAME=Darwin MOCK_MACHINE_SOCK="$msock" bash -c "$(show "$ENV")"
expect_output_contains "=podman|unix://$msock|true|" "Podman machine: the expected values"
expect_exit 0 "preset Podman DOCKER_HOST: kept, Ryuk off" -- iso DOCKER_HOST="unix://$work/podman/podman.sock" MOCK_DOCKER=ok bash -c "$(show "$ENV")"
expect_output_contains "=podman|unix://$work/podman/podman.sock|true|" "preset Podman DOCKER_HOST: the expected values"
expect_exit 0 "podman-docker shim: Ryuk off" -- iso MOCK_DOCKER=ok MOCK_DOCKER_VERSION="Client: Podman Engine" ENGLMS_PODMAN_SOCK="$sock" bash -c "$(show "$ENV")"
expect_output_contains "=podman|unix://$sock|true|" "podman-docker shim: the expected values"
expect_exit 1 "forced Podman without a socket: env.sh fails (Testcontainers needs it)" -- \
  iso ENGLMS_CONTAINER_ENGINE=podman MOCK_SYSTEMCTL=3 bash -c "source '$ENV'"
expect_output_contains "Testcontainers needs the Podman API socket" "forced Podman without a socket: says why"

# QA F-2: Docker Desktop on Linux (~/.docker/desktop/docker.sock) is a default endpoint too. QA F-7: a stale socket override is cleared.
for ep in "unix:///var/run/docker.sock" "unix://$work/home/.docker/run/docker.sock" "unix://$work/home/.docker/desktop/docker.sock"; do
  expect_exit 0 "Docker, default endpoint $ep: nothing exported, Ryuk on" -- \
    iso MOCK_DOCKER=ok MOCK_DOCKER_ENDPOINT="$ep" TESTCONTAINERS_RYUK_DISABLED=true TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/stale bash -c "$(show "$ENV")"
  expect_output_contains "=docker|||" "Docker, default endpoint: no DOCKER_HOST, no (stale) override, Ryuk not disabled"
done
expect_exit 0 "Docker, other endpoint on Linux: DOCKER_HOST only" -- iso MOCK_DOCKER=ok MOCK_DOCKER_ENDPOINT="unix://$dsock" bash -c "$(show "$ENV")"
expect_output_contains "=docker|unix://$dsock||" "Docker on Linux: DOCKER_HOST, no socket override"
expect_exit 0 "Docker, other endpoint on macOS (no /var/run/docker.sock): DOCKER_HOST + socket override" -- \
  iso MOCK_UNAME=Darwin MOCK_DOCKER=ok MOCK_DOCKER_ENDPOINT="unix://$dsock" ENGLMS_DOCKER_DEFAULT_SOCK="$work/none.sock" bash -c "$(show "$ENV")"
expect_output_contains "=docker|unix://$dsock||/var/run/docker.sock" "Docker on macOS (Colima-like): DOCKER_HOST and TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE"
expect_exit 0 "Docker, other endpoint on macOS with /var/run/docker.sock present: nothing exported" -- \
  iso MOCK_UNAME=Darwin MOCK_DOCKER=ok MOCK_DOCKER_ENDPOINT="unix://$dsock" ENGLMS_DOCKER_DEFAULT_SOCK="$dsock" bash -c "$(show "$ENV")"
expect_output_contains "=docker|||" "Docker on macOS with the default link: Testcontainers' own discovery"
expect_exit 0 "Docker, preset DOCKER_HOST: kept, Ryuk on" -- \
  iso MOCK_DOCKER=ok DOCKER_HOST="tcp://127.0.0.1:2375" TESTCONTAINERS_RYUK_DISABLED=true bash -c "$(show "$ENV")"
expect_output_contains "=docker|tcp://127.0.0.1:2375||" "Docker, preset DOCKER_HOST: the expected values"
if command -v zsh >/dev/null; then
  expect_exit 0 "zsh: env.sh on Podman" -- iso ENGLMS_PODMAN_SOCK="$sock" zsh -fc "$(show "$ENV")"
  expect_output_contains "=podman|unix://$sock|true|" "zsh: the expected values on Podman"
  expect_exit 0 "zsh: env.sh on Docker (other endpoint)" -- iso MOCK_DOCKER=ok MOCK_DOCKER_ENDPOINT="unix://$dsock" zsh -fc "$(show "$ENV")"
  expect_output_contains "=docker|unix://$dsock||" "zsh: the expected values on Docker"
else
  echo "  skip - zsh is not installed (env.sh under zsh)"
fi

echo " dev-up.sh / dev-down.sh (AC3, T-M1.8 AC5)"
UP="$work/repo/scripts/dev-up.sh"; DOWN="$work/repo/scripts/dev-down.sh"
for engine in docker podman; do
  other=podman; [[ $engine == podman ]] && other=docker
  # docker: auto-detected via `docker info`; podman: via the Linux socket (Docker unreachable).
  if [[ $engine == docker ]]; then run() { iso MOCK_DOCKER=ok "$@"; }; else run() { iso ENGLMS_PODMAN_SOCK="$sock" "$@"; }; fi
  reset; rm -f "$work/running" "$work/volume"
  expect_exit 0 "$engine: dev-up.sh starts the database" -- run "$UP"
  expect_output_contains "engine: $engine" "$engine: dev-up.sh prints the engine"
  expect_output_contains "englms-dev-db is healthy on 127.0.0.1:5432" "$engine: dev-up.sh waits for health and prints the port"
  expect_exit 0 "$engine: dev-up.sh twice in a row" -- run "$UP"
  expect_output_contains "is healthy" "$engine: second dev-up.sh is healthy too"
  LAST_OUTPUT=$(cat "$work/$engine.args")
  expect_output_contains "compose --env-file $work/repo/.env -f $work/repo/deploy/compose.dev.yaml up -d [DOCKER_HOST=]" "$engine: compose up through $engine, without env.sh's DOCKER_HOST"
  expect_output_contains "container inspect --format {{.State.Health.Status}} englms-dev-db" "$engine: health via container inspect"
  grep -q compose "$work/$other.args" && ko "$engine: $other must not run compose" || ok "$engine: $other runs nothing"

  : >"$work/$engine.args"
  expect_exit 0 "$engine: dev-down.sh keeps the volume by default" -- run "$DOWN"
  expect_output_contains "dev-down: stopped (data volume englms-dev-pgdata kept" "$engine: says the volume is kept"
  LAST_OUTPUT=$(cat "$work/$engine.args")
  expect_output_contains "compose.dev.yaml down" "$engine: dev-down.sh runs compose down"
  grep -q -- "down -v" "$work/$engine.args" && ko "$engine: default down must not pass -v" || ok "$engine: default down does not delete the volume"
  [[ -f "$work/volume" ]] && ok "$engine: the volume is still there" || ko "$engine: the volume is gone"

  # T-M1.8 AC5: nothing running.
  : >"$work/$engine.args"
  expect_exit 0 "AC5 $engine: dev-down.sh with nothing running exits 0" -- run "$DOWN"
  if [[ $(printf '%s\n' "$LAST_OUTPUT" | wc -l) -eq 1 && "$LAST_OUTPUT" == dev-down:* ]]; then ok "AC5 $engine: stdout+stderr is exactly one 'dev-down:' line"; else ko "AC5 $engine: expected one 'dev-down:' line, got:"; echo "$LAST_OUTPUT" | sed 's/^/         /'; fi
  expect_output_contains "nothing is running" "AC5 $engine: says nothing is running"
  grep -q compose "$work/$engine.args" && ko "AC5 $engine: compose down must not run when nothing is running" || ok "AC5 $engine: compose down is not run"
  expect_exit 0 "AC5 $engine: dev-down.sh --purge with nothing running still removes the volume" -- run "$DOWN" --purge
  expect_output_contains "removed the englms-dev-pgdata volume" "AC5 $engine: reports the removed volume"
  [[ ! -f "$work/volume" ]] && ok "AC5 $engine: the volume is gone" || ko "AC5 $engine: the volume was not removed"
  expect_exit 0 "AC5 $engine: dev-down.sh --purge with no volume" -- run "$DOWN" --purge
  expect_output_contains "there is no englms-dev-pgdata volume" "AC5 $engine: says there is no volume"

  run "$UP" >/dev/null 2>&1; : >"$work/$engine.args"
  expect_exit 0 "$engine: dev-down.sh --purge" -- run "$DOWN" --purge
  expect_output_contains "stopped and removed the englms-dev-pgdata volume" "$engine: --purge reports it"
  LAST_OUTPUT=$(cat "$work/$engine.args")
  expect_output_contains "down -v" "$engine: --purge removes the volume"
  expect_exit 0 "$engine: dev-down.sh --purge twice in a row" -- run "$DOWN" --purge
  expect_output_contains "there is no englms-dev-pgdata volume" "$engine: second --purge has nothing to do"
  # QA F-5: nothing running and no volume: do not claim the volume was kept
  expect_exit 0 "F-5 $engine: dev-down.sh with nothing running and no volume" -- run "$DOWN"
  expect_output_contains "dev-down: nothing is running and there is no englms-dev-pgdata volume" "F-5 $engine: says there is no volume"
  expect_output_not_contains "kept" "F-5 $engine: does not say kept"
done
# QA F-1: dev-up/dev-down on Linux Podman without the API socket (as before T-M1.19)
rm -f "$work/running" "$work/volume"; reset
expect_exit 0 "F-1: dev-up.sh works with podman but no API socket" -- iso MOCK_SYSTEMCTL=127 "$UP"
expect_output_contains "engine: podman (podman info; no API socket)" "F-1: dev-up.sh names the choice"
expect_exit 0 "F-1: dev-down.sh works with podman but no API socket" -- iso MOCK_SYSTEMCTL=127 "$DOWN"
expect_output_contains "dev-down: stopped" "F-1: dev-down.sh stopped the database"
grep -q compose "$work/podman.args" && ok "F-1: compose ran through podman" || ko "F-1: podman compose not called"

expect_exit 1 "dev-up.sh stops when no engine is reachable" -- iso MOCK_SYSTEMCTL=3 MOCK_PODMAN_INFO=fail "$UP"
expect_output_contains "no container engine is reachable" "dev-up.sh: the engine message"
expect_exit 1 "dev-down.sh stops when no engine is reachable" -- iso MOCK_SYSTEMCTL=3 MOCK_PODMAN_INFO=fail "$DOWN"
expect_output_contains "no container engine is reachable" "dev-down.sh: the engine message"
expect_exit 2 "dev-down.sh rejects unknown arguments" -- iso "$DOWN" --everything
expect_output_contains "usage: dev-down.sh" "prints usage"

finish
