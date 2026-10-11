# shellcheck shell=bash
# engine.sh — source me (bash or zsh): picks the container engine for scripts/env.sh, dev-up.sh and dev-down.sh (T-M1.19,
# DEC-106) and exports ENGLMS_CONTAINER_ENGINE=docker|podman (and ENGLMS_ENGINE_SOCK, the verified Podman API socket, when found). Order:
#   a. ENGLMS_CONTAINER_ENGINE=docker|podman forces the CLI;
#   b. else an existing DOCKER_HOST is kept: podman when its socket path contains "podman", else docker;
#   c. else Docker when `docker info` works and the server is not Podman (a podman-docker shim goes on to d/e);
#   d. else rootless Podman on Linux: the systemd user socket (ENGLMS_PODMAN_SOCK overrides its path), or without a socket
#      when `podman info` works (enough for dev-up/dev-down; env.sh then asks for the socket, which Testcontainers needs);
#   e. else a Podman machine on macOS (`podman machine inspect` socket).
# Nothing reachable: one message naming Docker and Podman, status 1. A detected (not forced) choice is marked in
# ENGLMS_CONTAINER_ENGINE_AUTO, so sourcing again (or a child script) detects again instead of treating it as forced.
# bash-3.2- and zsh-safe on purpose: env.sh is sourced by interactive shells (no [[ == ]], arrays or ${x,,}).

_englms_podman_sock() { # paths d and e: an active Podman API socket in ENGLMS_ENGINE_SOCK
  command -v podman >/dev/null 2>&1 || return 1
  case "$(uname -s)" in
    Linux)
      _englms_sock="${ENGLMS_PODMAN_SOCK:-${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/podman/podman.sock}"
      systemctl --user is-active --quiet podman.socket 2>/dev/null || return 1 ;; # inactive or no systemd (e.g. WSL): `podman info` is tried next
    Darwin) _englms_sock=$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}' 2>/dev/null) ;;
    *) return 1 ;;
  esac
  [ -S "$_englms_sock" ] || return 1
  export ENGLMS_ENGINE_SOCK="$_englms_sock"
}

_englms_docker_ok() { # path c: a reachable Docker server that is not Podman
  command -v docker >/dev/null 2>&1 || return 1
  _englms_info=$(docker info 2>/dev/null) || return 1
  case "$_englms_info $(docker version 2>/dev/null)" in *[Pp]odman*) return 1 ;; esac
}

_englms_engine() {
  if [ -n "${ENGLMS_CONTAINER_ENGINE:-}" ] && [ "$ENGLMS_CONTAINER_ENGINE" = "${ENGLMS_CONTAINER_ENGINE_AUTO:-}" ]; then
    unset ENGLMS_CONTAINER_ENGINE # our own earlier detection, not a user's choice
  fi
  unset ENGLMS_CONTAINER_ENGINE_AUTO ENGLMS_ENGINE_SOCK
  _englms_forced=${ENGLMS_CONTAINER_ENGINE:+1}
  case "${ENGLMS_CONTAINER_ENGINE:-}" in
    docker) _englms_how="ENGLMS_CONTAINER_ENGINE" ;;
    podman)
      _englms_how="ENGLMS_CONTAINER_ENGINE"
      if [ -z "${DOCKER_HOST:-}" ] && _englms_podman_sock; then _englms_how="$_englms_how, socket $ENGLMS_ENGINE_SOCK"; fi ;;
    "")
      if [ -n "${DOCKER_HOST:-}" ]; then
        case "$DOCKER_HOST" in *podman*) ENGLMS_CONTAINER_ENGINE=podman ;; *) ENGLMS_CONTAINER_ENGINE=docker ;; esac
        _englms_how="DOCKER_HOST=$DOCKER_HOST"
      elif _englms_docker_ok; then
        ENGLMS_CONTAINER_ENGINE=docker; _englms_how="docker info"
      elif _englms_podman_sock; then
        ENGLMS_CONTAINER_ENGINE=podman; _englms_how="socket $ENGLMS_ENGINE_SOCK"
      elif [ "$(uname -s)" = Linux ] && command -v podman >/dev/null 2>&1 && podman info >/dev/null 2>&1; then
        ENGLMS_CONTAINER_ENGINE=podman; _englms_how="podman info; no API socket"
      else
        _englms_note=""
        if [ -n "${ENGLMS_PODMAN_SOCK:-}" ] && [ ! -S "$ENGLMS_PODMAN_SOCK" ]; then
          _englms_note=" (ENGLMS_PODMAN_SOCK=$ENGLMS_PODMAN_SOCK is not a socket)"
        fi
        echo "engine: no container engine is reachable: start Docker (\`docker info\` must work) or Podman (Linux: systemctl --user enable --now podman.socket; macOS: podman machine start), or set ENGLMS_CONTAINER_ENGINE=docker|podman (development-setup §0)$_englms_note" >&2
        return 1
      fi ;;
    *) echo "engine: ENGLMS_CONTAINER_ENGINE must be docker or podman (got: $ENGLMS_CONTAINER_ENGINE)" >&2; return 1 ;;
  esac
  if ! command -v "$ENGLMS_CONTAINER_ENGINE" >/dev/null 2>&1; then
    echo "engine: $ENGLMS_CONTAINER_ENGINE is not installed (chosen by $_englms_how)" >&2
    [ -n "$_englms_forced" ] || unset ENGLMS_CONTAINER_ENGINE # only a forced choice stays
    return 1
  fi
  export ENGLMS_CONTAINER_ENGINE
  [ -n "$_englms_forced" ] || export ENGLMS_CONTAINER_ENGINE_AUTO="$ENGLMS_CONTAINER_ENGINE"
  echo "engine: $ENGLMS_CONTAINER_ENGINE ($_englms_how)"
}

_englms_engine
_englms_rc=$?
unset -f _englms_podman_sock _englms_docker_ok _englms_engine
unset _englms_sock _englms_info _englms_how _englms_forced _englms_note
eval "unset _englms_rc; return $_englms_rc"
