#!/usr/bin/env bash
# dev-down.sh — stop the local database. Keeps the data volume unless --purge is given.
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

env_args=()
[[ -f "$ROOT/.env" ]] && env_args=(--env-file "$ROOT/.env")
cd "$ROOT"
# The password is only needed to create the container; a placeholder lets `down` run without .env.
export ENGLMS_DEV_DB_PASSWORD=${ENGLMS_DEV_DB_PASSWORD:-unused-for-down}
if ((purge)); then
  podman compose "${env_args[@]}" -f "$COMPOSE_FILE" down -v
  echo "dev-down: stopped and removed the englms-dev-pgdata volume"
else
  podman compose "${env_args[@]}" -f "$COMPOSE_FILE" down
  echo "dev-down: stopped (data volume englms-dev-pgdata kept; use --purge to delete it)"
fi
