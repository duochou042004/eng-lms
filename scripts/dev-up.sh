#!/usr/bin/env bash
# dev-up.sh — start the local PostgreSQL 18 (deploy/compose.dev.yaml) and wait until it is healthy. Idempotent.
# Docker or Podman, as picked by scripts/lib/engine.sh (ENGLMS_CONTAINER_ENGINE forces one).
source "$(dirname "$0")/lib/require-bash.sh"
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
COMPOSE_FILE="$ROOT/deploy/compose.dev.yaml"
CONTAINER=englms-dev-db
TIMEOUT=${ENGLMS_DEV_UP_TIMEOUT:-90}

if [[ ! -f "$ROOT/.env" ]]; then
  echo "dev-up: $ROOT/.env is missing. Create it with: cp .env.example .env" >&2
  exit 1
fi
# shellcheck source=scripts/lib/engine.sh
source "$ROOT/scripts/lib/engine.sh"
engine=$ENGLMS_CONTAINER_ENGINE

# `docker compose` is the v2 plugin; `podman compose` delegates to podman-compose. Run from the repo root so .env is picked up.
cd "$ROOT"
"$engine" compose --env-file "$ROOT/.env" -f "$COMPOSE_FILE" up -d

for ((i = 0; i < TIMEOUT; i++)); do
  status=$("$engine" container inspect --format '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo missing)
  if [[ "$status" == healthy ]]; then
    echo "dev-up: $CONTAINER is healthy on $("$engine" port "$CONTAINER" 5432)"
    exit 0
  fi
  sleep 1
done
echo "dev-up: $CONTAINER did not become healthy within ${TIMEOUT}s (last status: $status)" >&2
exit 1
