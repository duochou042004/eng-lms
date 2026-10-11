# shellcheck shell=bash
# env.sh — source me: `source scripts/env.sh` (bash or zsh). Picks the container engine (scripts/lib/engine.sh) and sets the
# Testcontainers variables for it (development-setup §3, DEC-044, DEC-106):
#   Podman (every path): DOCKER_HOST=unix://<the Podman socket> unless already set, TESTCONTAINERS_RYUK_DISABLED=true (Ryuk needs
#     privileged mode under rootless Podman; containers are removed by JVM shutdown hooks, leftovers: development-setup §3).
#   Docker: Ryuk on. With DOCKER_HOST unset, the Docker context's endpoint is exported only when Testcontainers cannot find it itself
#     (not /var/run/docker.sock or Docker Desktop's ~/.docker/run/docker.sock); on macOS then also
#     TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock (the in-VM path Ryuk mounts).
# ENGLMS_DOCKER_DEFAULT_SOCK (test seam, default /var/run/docker.sock) is the default socket path checked on macOS.
_englms_lib="$(dirname "${BASH_SOURCE[0]:-$0}")/lib/engine.sh"
# shellcheck source=scripts/lib/engine.sh
if ! source "$_englms_lib"; then
  unset _englms_lib
  return 1 2>/dev/null || exit 1
fi
unset _englms_lib
if [ "$ENGLMS_CONTAINER_ENGINE" = podman ]; then
  if [ -z "${DOCKER_HOST:-}" ]; then
    if [ ! -S "${ENGLMS_PODMAN_SOCK:-}" ]; then
      echo "env.sh: Testcontainers needs the Podman socket (Linux: systemctl --user enable --now podman.socket; macOS: podman machine start)" >&2
      return 1 2>/dev/null || exit 1
    fi
    export DOCKER_HOST="unix://$ENGLMS_PODMAN_SOCK"
  fi
  export TESTCONTAINERS_RYUK_DISABLED=true
  echo "env.sh: DOCKER_HOST=$DOCKER_HOST TESTCONTAINERS_RYUK_DISABLED=true"
else
  unset TESTCONTAINERS_RYUK_DISABLED
  if [ -z "${DOCKER_HOST:-}" ]; then
    _englms_ep=$(docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null)
    _englms_default="${ENGLMS_DOCKER_DEFAULT_SOCK:-/var/run/docker.sock}"
    case "$_englms_ep" in
      "" | "unix:///var/run/docker.sock" | "unix://$HOME/.docker/run/docker.sock") ;;
      *)
        if [ "$(uname -s)" = Darwin ]; then
          if [ ! -S "$_englms_default" ]; then
            export DOCKER_HOST="$_englms_ep" TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock
          fi
        else
          export DOCKER_HOST="$_englms_ep"
        fi ;;
    esac
    unset _englms_ep _englms_default
  fi
  echo "env.sh: DOCKER_HOST=${DOCKER_HOST:-(Testcontainers default)} TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=${TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE:-(unset)} Ryuk on"
fi
