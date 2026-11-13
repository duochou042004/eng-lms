#!/usr/bin/env bash
# e2e-run.sh — run the Playwright suite (e2e/) against the packaged app: the Boot jar with the SPA under static/, the
# same layout as the image (deploy/Containerfile), on :8080 (management :8081) against PostgreSQL 18. The app is always
# stopped afterwards, also when a test or the build fails. Usage:
#   ./scripts/e2e-run.sh [--no-build] [playwright args...]     e.g. --project=phone-small --project=tablet --project=laptop
# Database: with a .env file (local), .env is loaded, the dev DB is started with scripts/dev-up.sh, and the run uses its own
# database E2E_DB_NAME (default englms_e2e) in the dev container, dropped and created at the start of every run (Flyway builds
# the schema) and left in place afterwards; its data folder is .data/e2e/fresh/. E2E_KEEP_DB=1 uses the .env database and
# .data/e2e/ instead (the G5 run on a large data set). Both are read from the caller's environment only; .env cannot set them.
# Without .env (CI), the SPRING_DATASOURCE_* variables must already be set. E2E_READY_TIMEOUT (default 120) bounds the startup
# wait; E2E_CHECK_PORTS (default "8080 8081") lists the ports that must be free.
# Sign-in (T-M2.4): the app starts with its own tutor bootstrap (username e2e-tutor, password file
# <data folder>/tutor-bootstrap-password, generated once, git-ignored, dev-only) and a raised per-IP login throttle; both
# override .env for this process only. Playwright's global setup signs in and keeps the changed password in the data folder.
source "$(dirname "$0")/lib/require-bash.sh"
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
READY_TIMEOUT=${E2E_READY_TIMEOUT:-120}
APP_LOG="$ROOT/backend/target/e2e-app.log"

usage() { sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; }
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

E2E_DATA="$ROOT/.data/e2e"
if [[ -f "$ROOT/.env" ]]; then
  # The two inputs come from the caller only (T-M2.25): saved before .env is sourced, restored after it.
  name_set=${E2E_DB_NAME+1} db_name=${E2E_DB_NAME-englms_e2e} keep_set=${E2E_KEEP_DB+1} keep_db=${E2E_KEEP_DB-}
  # G3 F3: a .env line that assigns one of these fails ("readonly variable") and the caller's value stays.
  readonly name_set db_name keep_set keep_db
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
  unset E2E_DB_NAME E2E_KEEP_DB
  [[ -n "$name_set" ]] && export E2E_DB_NAME="$db_name"
  [[ -n "$keep_set" ]] && export E2E_KEEP_DB="$keep_db"
  fresh=0
  if [[ "$keep_db" != 1 ]]; then
    fresh=1
    refuse() { echo "e2e-run: E2E_DB_NAME='$db_name' refused: $1 (set E2E_KEEP_DB=1 to use the .env database)" >&2; exit 1; }
    db_user=${ENGLMS_DEV_DB_USER:-englms} dev_name=${ENGLMS_DEV_DB_NAME:-englms} dev_port=${ENGLMS_DEV_DB_PORT:-5432}
    [[ "$db_name" =~ ^[a-z][a-z0-9_]{0,62}$ ]] || refuse "the name must match ^[a-z][a-z0-9_]{0,62}\$"
    [[ "$db_user" =~ ^[a-z_][a-z0-9_]*$ ]] || refuse "ENGLMS_DEV_DB_USER '$db_user' is not a plain identifier"
    [[ "${SPRING_DATASOURCE_URL:-}" =~ ^jdbc:postgresql://([^/:?]+)(:([0-9]+))?/([^/?]+)(\?.*)?$ ]] ||
      refuse "the .env SPRING_DATASOURCE_URL is not a jdbc:postgresql://host:port/database URL"
    url_host=${BASH_REMATCH[1]} url_port=${BASH_REMATCH[3]:-5432} url_db=${BASH_REMATCH[4]} url_params=${BASH_REMATCH[5]}
    # G3 F2: pgjdbc lets URL parameters (PGHOST or host, PGPORT or port, PGDBNAME or dbname, service) override the host, port
    # and database, and decodes %-escapes in the name.
    [[ ! "${url_params^^}" =~ [?\&](PG)?(HOST|PORT|DBNAME|SERVICE)= ]] ||
      refuse "the .env SPRING_DATASOURCE_URL sets the host, port, database or service as a parameter"
    [[ "$url_db" != *%* ]] || refuse "the database name in the .env SPRING_DATASOURCE_URL holds a % escape"
    [[ "$url_host" == 127.0.0.1 || "$url_host" == localhost ]] && [[ "$url_port" == "$dev_port" ]] ||
      refuse "the .env SPRING_DATASOURCE_URL points at $url_host:$url_port, not the dev container on 127.0.0.1:$dev_port"
    for other in "${dev_name,,}" "${url_db,,}" postgres template0 template1; do
      [[ "$db_name" != "$other" ]] || refuse "it is the dev database or a system database ($other)"
    done
  fi
  "$ROOT/scripts/dev-up.sh" || exit 1
  if ((fresh)); then
    # dev-up exports the engine only in its own process.
    # shellcheck source=scripts/lib/engine.sh
    source "$ROOT/scripts/lib/engine.sh" || exit 1
    echo "e2e-run: recreating the E2E database $db_name in englms-dev-db"
    # Two statements: DROP DATABASE cannot run inside a transaction block.
    "$ENGLMS_CONTAINER_ENGINE" exec englms-dev-db psql -U "$db_user" -d postgres -v ON_ERROR_STOP=1 \
      -c "DROP DATABASE IF EXISTS $db_name WITH (FORCE)" -c "CREATE DATABASE $db_name OWNER $db_user" ||
      { echo "e2e-run: could not recreate the E2E database $db_name" >&2; exit 1; }
    export SPRING_DATASOURCE_URL="jdbc:postgresql://$url_host:$url_port/$db_name$url_params"
    E2E_DATA="$ROOT/.data/e2e/fresh"
    mkdir -p "$E2E_DATA" && chmod 700 "$ROOT/.data/e2e" "$E2E_DATA"
    rm -rf "${E2E_DATA:?}/tutor-password" "${E2E_DATA:?}/state"
  fi
elif [[ -z "${SPRING_DATASOURCE_URL:-}" ]]; then
  echo "e2e-run: no .env and no SPRING_DATASOURCE_URL; create .env (cp .env.example .env) or export the datasource variables" >&2
  exit 1
fi

mkdir -p "$E2E_DATA" && chmod 700 "$E2E_DATA"
if [[ ! -s "$E2E_DATA/tutor-bootstrap-password" ]]; then
  # 24 random URL-safe characters: passes the password policy (10–128, not common, not the username).
  (umask 077 && head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 24 >"$E2E_DATA/tutor-bootstrap-password")
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
ENGLMS_BOOTSTRAP_TUTOR_USERNAME=e2e-tutor \
  ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE="$E2E_DATA/tutor-bootstrap-password" \
  ENGLMS_SECURITY_LOGINTHROTTLE_MAXATTEMPTS=100000 \
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

(cd "$ROOT/e2e" && pnpm install --frozen-lockfile >/dev/null && E2E_BASE_URL=http://localhost:8080 E2E_DATA_DIR="$E2E_DATA" pnpm exec playwright test "${args[@]}")
status=$?
echo "e2e-run: playwright exit $status"
exit $status
