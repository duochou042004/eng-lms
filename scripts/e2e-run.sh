#!/usr/bin/env bash
# e2e-run.sh — run the Playwright suite (e2e/) against the packaged app: the Boot jar with the SPA under static/, the
# same layout as the image (deploy/Containerfile), on :8080 (management :8081) against PostgreSQL 18. The app is always
# stopped afterwards, also when a test or the build fails. Usage:
#   ./scripts/e2e-run.sh [--no-build] [playwright args...]     e.g. --project=phone-small --project=tablet --project=laptop
# Database: with a .env file, the dev DB is started with scripts/dev-up.sh and .env is loaded; without one (CI), the
# SPRING_DATASOURCE_* variables must already be set. E2E_READY_TIMEOUT (default 120) bounds the startup wait;
# E2E_CHECK_PORTS (default "8080 8081") lists the ports that must be free.
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
READY_TIMEOUT=${E2E_READY_TIMEOUT:-120}
APP_LOG="$ROOT/backend/target/e2e-app.log"

usage() { sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; }
build=1
args=()
for arg in "$@"; do
  case "$arg" in
    --no-build) build=0 ;;
    -h | --help) usage; exit 0 ;;
    *) args+=("$arg") ;;
  esac
done

port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
for port in ${E2E_CHECK_PORTS:-8080 8081}; do
  if port_busy "$port"; then
    echo "e2e-run: port $port is already in use; stop whatever is listening there (e.g. a running englms container)" >&2
    exit 1
  fi
done

if [[ -f "$ROOT/.env" ]]; then
  "$ROOT/scripts/dev-up.sh" || exit 1
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
elif [[ -z "${SPRING_DATASOURCE_URL:-}" ]]; then
  echo "e2e-run: no .env and no SPRING_DATASOURCE_URL; create .env (cp .env.example .env) or export the datasource variables" >&2
  exit 1
fi

app_pid=""
cleanup() {
  if [[ -n "$app_pid" ]] && kill -0 "$app_pid" 2>/dev/null; then
    kill "$app_pid" 2>/dev/null
    for _ in $(seq 1 30); do kill -0 "$app_pid" 2>/dev/null || break; sleep 1; done
    kill -9 "$app_pid" 2>/dev/null
    echo "e2e-run: app stopped (pid $app_pid)"
  fi
  # The SPA copy is only for the packaged jar; tests use their own fixture under src/test/resources/static.
  rm -rf "$ROOT/backend/target/classes/static"
}
trap cleanup EXIT
trap 'exit 130' INT TERM

if ((build)); then
  echo "e2e-run: building web/dist and the jar with the SPA"
  (cd "$ROOT/web" && pnpm install --frozen-lockfile && pnpm build) || exit 1
  (cd "$ROOT/backend" && ./mvnw -B -ntp -q process-resources) || exit 1
  rm -rf "$ROOT/backend/target/classes/static"
  cp -r "$ROOT/web/dist" "$ROOT/backend/target/classes/static"
  rm -rf "$ROOT/backend/target/classes/static/.vite"
  (cd "$ROOT/backend" && ./mvnw -B -ntp -q package -Dmaven.test.skip=true) || exit 1
fi
jar=$(ls "$ROOT"/backend/target/englms-*.jar 2>/dev/null | grep -v '\.original$' | head -n 1)
[[ -n "$jar" ]] || { echo "e2e-run: no jar in backend/target (run without --no-build)" >&2; exit 1; }

mkdir -p "$(dirname "$APP_LOG")"
java -jar "$jar" >"$APP_LOG" 2>&1 &
app_pid=$!
echo "e2e-run: started $(basename "$jar") (pid $app_pid, log ${APP_LOG#"$ROOT"/})"
ready=0
for _ in $(seq 1 "$READY_TIMEOUT"); do
  if ! kill -0 "$app_pid" 2>/dev/null; then
    echo "e2e-run: the app exited during startup; last log lines:" >&2
    tail -n 30 "$APP_LOG" >&2
    exit 1
  fi
  if curl -fsS -o /dev/null http://127.0.0.1:8081/actuator/health/readiness 2>/dev/null; then ready=1; break; fi
  sleep 1
done
((ready)) || { echo "e2e-run: the app was not ready within ${READY_TIMEOUT}s" >&2; tail -n 30 "$APP_LOG" >&2; exit 1; }
echo "e2e-run: app ready; running Playwright ${args[*]:-(all projects)}"

(cd "$ROOT/e2e" && pnpm install --frozen-lockfile >/dev/null && E2E_BASE_URL=http://localhost:8080 pnpm exec playwright test "${args[@]}")
status=$?
echo "e2e-run: playwright exit $status"
exit $status
