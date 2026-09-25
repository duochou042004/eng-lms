# shellcheck shell=bash
# env.sh — source me: `source scripts/env.sh` (bash or zsh). Points Testcontainers at the rootless Podman user socket
# (development-setup §3, DEC-044). Ryuk needs privileged mode under rootless Podman, so it is disabled; containers are
# removed by JVM shutdown hooks (leftovers after a crash: see development-setup §3).
_englms_sock="${ENGLMS_PODMAN_SOCK:-${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock}"
if ! systemctl --user is-active --quiet podman.socket || [ ! -S "$_englms_sock" ]; then
  echo "env.sh: the rootless Podman socket is not active ($_englms_sock)." >&2
  echo "env.sh: enable it once with: systemctl --user enable --now podman.socket (DEC-044)" >&2
  unset _englms_sock
  return 1 2>/dev/null || exit 1
fi
export DOCKER_HOST="unix://$_englms_sock"
export TESTCONTAINERS_RYUK_DISABLED=true
echo "env.sh: DOCKER_HOST=$DOCKER_HOST TESTCONTAINERS_RYUK_DISABLED=true"
unset _englms_sock
