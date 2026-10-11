#!/usr/bin/env bash
# dev-down.sh — stop the local database. Keeps the data volume unless --purge is given. Docker or Podman (scripts/lib/engine.sh).
source "$(dirname "$0")/lib/require-bash.sh"
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
COMPOSE_FILE="$ROOT/deploy/compose.dev.yaml"

usage() { echo "usage: dev-down.sh [--purge]   (--purge also deletes the englms-dev-pgdata volume)" >&2; }

purge=0
for arg in "$@"; do
  case "$arg" in
    --purge) purge=1 ;;
    -h | --help) usage; exit 0 ;;
    *) echo "dev-down: unknown argument '$arg'" >&2; usage; exit 2 ;;
  esac
done

# The engine's choice line is not printed: the output stays one "dev-down:" line (T-M1.8 AC5); errors still go to stderr.
# shellcheck source=scripts/lib/engine.sh
source "$ROOT/scripts/lib/engine.sh" >/dev/null
engine=$ENGLMS_CONTAINER_ENGINE

env_args=()
[[ -f "$ROOT/.env" ]] && env_args=(--env-file "$ROOT/.env")
cd "$ROOT"
# The password is only needed to create the container; a placeholder lets `down` run without .env.
export ENGLMS_DEV_DB_PASSWORD=${ENGLMS_DEV_DB_PASSWORD:-unused-for-down}
# Nothing running: `compose down` would only print engine errors about the missing container (T-M1.8 AC5).
# `container inspect`/`volume inspect`, not Podman's `exists`, which Docker lacks.
if ! "$engine" container inspect englms-dev-db >/dev/null 2>&1; then
  if ((purge)) && "$engine" volume inspect englms-dev-pgdata >/dev/null 2>&1; then
    "$engine" volume rm englms-dev-pgdata >/dev/null
    echo "dev-down: nothing was running; removed the englms-dev-pgdata volume"
  elif ((purge)); then
    echo "dev-down: nothing was running and there is no englms-dev-pgdata volume"
  elif "$engine" volume inspect englms-dev-pgdata >/dev/null 2>&1; then
    echo "dev-down: nothing is running (data volume englms-dev-pgdata kept; use --purge to delete it)"
  else
    echo "dev-down: nothing is running and there is no englms-dev-pgdata volume"
  fi
  exit 0
fi
if ((purge)); then
  "$engine" compose "${env_args[@]}" -f "$COMPOSE_FILE" down -v
  echo "dev-down: stopped and removed the englms-dev-pgdata volume"
else
  "$engine" compose "${env_args[@]}" -f "$COMPOSE_FILE" down
  echo "dev-down: stopped (data volume englms-dev-pgdata kept; use --purge to delete it)"
fi
