#!/usr/bin/env bash
# contract-drift.sh — the API contract and the web types must match the code (ADR-0014; CI job `contract-drift`, gate.sh).
# Regenerates api/openapi.json (OpenApiContractTest with -Dcontract.write=true) and web/src/lib/api/schema.d.ts
# (pnpm api:generate), then fails if either differs from what was there before. The regenerated files are left in
# place so a deliberate change can be reviewed and committed. Needs Docker/Podman for Testcontainers (source env.sh
# locally) and `pnpm install` in web/. Usage: ./scripts/contract-drift.sh
source "$(dirname "$0")/lib/require-bash.sh"
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
FILES=(api/openapi.json web/src/lib/api/schema.d.ts)
before=$(mktemp -d); trap 'rm -rf "$before"' EXIT
cd "$ROOT"
for f in "${FILES[@]}"; do
  mkdir -p "$before/$(dirname "$f")"
  cp "$f" "$before/$f"
done

(cd backend && ./mvnw -B -ntp -q test -Dtest=OpenApiContractTest -Dcontract.write=true -Dsurefire.failIfNoSpecifiedTests=false)
(cd web && pnpm api:generate)

status=0
for f in "${FILES[@]}"; do
  if ! diff -u --label "$f (before)" --label "$f (regenerated)" "$before/$f" "$f"; then
    status=1
  fi
done
if ((status != 0)); then
  echo "contract-drift: FAIL: the API contract or the web types are stale. Review the diff above, then commit the regenerated files." >&2
  exit 1
fi
echo "contract-drift: OK (api/openapi.json and web/src/lib/api/schema.d.ts match the code)"
