#!/usr/bin/env bash
# dev-up.sh — start the local PostgreSQL 18 (deploy/compose.dev.yaml) and wait until it is healthy. Idempotent.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
COMPOSE_FILE="$ROOT/deploy/compose.dev.yaml"
CONTAINER=englms-dev-db
TIMEOUT=${ENGLMS_DEV_UP_TIMEOUT:-90}

if [[ ! -f "$ROOT/.env" ]]; then
  echo "dev-up: $ROOT/.env is missing. Create it with: cp .env.example .env" >&2
  exit 1
fi
command -v podman >/dev/null || { echo "dev-up: podman is not installed" >&2; exit 1; }

# `podman compose` delegates to podman-compose (1.6.0 here); run from the repo root so .env is picked up.
cd "$ROOT"
podman compose --env-file "$ROOT/.env" -f "$COMPOSE_FILE" up -d

for ((i = 0; i < TIMEOUT; i++)); do
  status=$(podman inspect --format '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo missing)
  if [[ "$status" == healthy ]]; then
    echo "dev-up: $CONTAINER is healthy on $(podman port "$CONTAINER" 5432)"
    exit 0
  fi
  sleep 1
done
echo "dev-up: $CONTAINER did not become healthy within ${TIMEOUT}s (last status: $status)" >&2
exit 1
