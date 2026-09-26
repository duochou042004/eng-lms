#!/usr/bin/env bash
# T-M1.5 AC2/AC3 probe of a running image (app on :8080, management on :8081). Usage: bash evidence/T-M1.5/probe.sh [base]
set -u
BASE="${1:-http://localhost:8080}"
MGMT="${MGMT:-http://localhost:8081}"
NAV='Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
body=$(mktemp)
probe() { # method path [header]
  echo "================ $1 $BASE$2 ${3:+[$3]}"
  if [ "$1" = HEAD ]; then
    curl -sS -I ${3:+-H "$3"} "$BASE$2"
  else
    curl -sS -D - -o "$body" ${3:+-H "$3"} "$BASE$2"
    echo "--- body (first 200 bytes):"; head -c 200 "$body"; echo
  fi
}
echo "# probe.sh $(date -u +%FT%TZ) base=$BASE"
asset=$(curl -s -H "$NAV" "$BASE/" | grep -o '/assets/index-[^"]*\.js' | head -n 1)
probe GET / "$NAV"
probe GET /tutor "$NAV"
probe GET /student/x "$NAV"
probe HEAD /tutor "$NAV"
probe GET "$asset"
probe GET /favicon.svg
probe GET /api/v1/meta 'Accept: application/json'
probe GET /api/v1/x "$NAV"
probe GET /actuator/health
probe GET /tutor 'Accept: application/json'
probe GET /missing.png "$NAV"
probe GET /assets/missing-00000000.js
echo "================ GET $MGMT/actuator/health/liveness"; curl -sS -D - "$MGMT/actuator/health/liveness"; echo
echo "================ GET $MGMT/actuator/env -> $(curl -sS -o /dev/null -w '%{http_code}' "$MGMT/actuator/env")"
rm -f "$body"
