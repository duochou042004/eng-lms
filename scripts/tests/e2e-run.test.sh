#!/usr/bin/env bash
# Tests for scripts/e2e-run.sh (T-M1.6): arguments, the busy-port and datasource checks, and that the app is always
# stopped with Playwright's exit code propagated. Stubs for java/curl/pnpm on PATH; --no-build; no real app or browser.
# T-M2.25 (scope 4): with .env, the per-run E2E database, its guard, E2E_KEEP_DB and the inputs .env cannot set (stub podman and
# dev-up.sh, the real scripts/lib/engine.sh).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "e2e-run.sh"
work=$(mktemp -d)
listener_pid=""
trap '[[ -n "$listener_pid" ]] && kill "$listener_pid" 2>/dev/null; rm -rf "$work"' EXIT
repo="$work/repo"
mkdir -p "$repo/scripts" "$repo/backend/target" "$repo/e2e" "$work/bin"
cp "$ROOT/scripts/e2e-run.sh" "$repo/scripts/e2e-run.sh"; cp -R "$ROOT/scripts/lib" "$repo/scripts/"
touch "$repo/backend/target/englms-0.0.1-SNAPSHOT.jar"
# java stub: a long-running "app" that records its pid; curl stub: always ready; pnpm stub: exit $PNPM_EXIT for the test run.
printf '#!/usr/bin/env bash\necho $$ >"%s/app.pid"\nenv | grep -E "^ENGLMS_(BOOTSTRAP|SECURITY)" | sort >"%s/app.env"\nexec sleep 300\n' "$work" "$work" >"$work/bin/java"
printf '#!/usr/bin/env bash\nexit 0\n' >"$work/bin/curl"
printf '#!/usr/bin/env bash\necho "pnpm $*" >>"%s/pnpm.args"\n[[ "$1" == exec ]] && exit "${PNPM_EXIT:-0}"\nexit 0\n' "$work" >"$work/bin/pnpm"
chmod +x "$work/bin/"*
run() { env PATH="$work/bin:$PATH" E2E_CHECK_PORTS="${PORTS:-}" SPRING_DATASOURCE_URL=jdbc:postgresql://stub/db "$@"; }
app_gone() { local pid; pid=$(cat "$work/app.pid" 2>/dev/null) || return 0; ! kill -0 "$pid" 2>/dev/null; }

expect_exit 0 "--help prints usage" -- run "$repo/scripts/e2e-run.sh" --help
expect_output_contains "e2e-run.sh [--no-build] [playwright args...]" "usage names the arguments"

: >"$work/pnpm.args"
expect_exit 0 "passes when Playwright passes" -- run "$repo/scripts/e2e-run.sh" --no-build --project=laptop tests/x.spec.ts
expect_output_contains "e2e-run: app stopped" "stops the app after the run"
LAST_OUTPUT=$(cat "$work/pnpm.args")
expect_output_contains "pnpm exec playwright test --project=laptop tests/x.spec.ts" "passes the Playwright arguments through"
app_gone && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - no app process is left"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - the app process is still running"; }

LAST_OUTPUT=$(cat "$work/app.env")
expect_output_contains "ENGLMS_BOOTSTRAP_TUTOR_USERNAME=e2e-tutor" "starts the app with the E2E tutor bootstrap"
expect_output_contains "ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE=$repo/.data/e2e/tutor-bootstrap-password" "points the bootstrap at the generated password file"
expect_output_contains "ENGLMS_SECURITY_LOGINTHROTTLE_MAXATTEMPTS=100000" "raises the login throttle for the E2E app only"
pw=$(cat "$repo/.data/e2e/tutor-bootstrap-password")
[[ ${#pw} -eq 24 && "$(stat -c %a "$repo/.data/e2e/tutor-bootstrap-password")" == 600 ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - generates a 24-character, owner-only bootstrap password file"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - bootstrap password file (length ${#pw})"; }
expect_exit 0 "reuses the bootstrap password file on a re-run" -- run "$repo/scripts/e2e-run.sh" --no-build
[[ "$(cat "$repo/.data/e2e/tutor-bootstrap-password")" == "$pw" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - the bootstrap password is generated once"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - the bootstrap password changed on a re-run"; }

rm -f "$work/app.pid"
expect_exit 3 "propagates Playwright's exit code" -- env PNPM_EXIT=3 PATH="$work/bin:$PATH" E2E_CHECK_PORTS= SPRING_DATASOURCE_URL=x "$repo/scripts/e2e-run.sh" --no-build
expect_output_contains "e2e-run: app stopped" "stops the app after a failing run too"
app_gone && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - no app process is left after a failure"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - the app process is still running after a failure"; }

port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')
python3 -c "import socket,time,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); s.bind(('127.0.0.1',$port)); s.listen(); time.sleep(60)" &
listener_pid=$!
for _ in $(seq 1 50); do (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null && break; sleep 0.1; done
expect_exit 1 "refuses to start when a port is busy" -- env PORTS="$port" bash -c "$(declare -f run); run '$repo/scripts/e2e-run.sh' --no-build"
expect_output_contains "port $port is already in use" "names the busy port"

expect_exit 1 "needs .env or SPRING_DATASOURCE_URL" -- env PATH="$work/bin:$PATH" E2E_CHECK_PORTS= SPRING_DATASOURCE_URL= "$repo/scripts/e2e-run.sh" --no-build
expect_output_contains "no .env and no SPRING_DATASOURCE_URL" "explains the datasource requirement"

# --- T-M2.25: the per-run E2E database (local, with .env) ---
repo2="$work/repo2"; log="$work/engine.log"
mkdir -p "$repo2/scripts" "$repo2/backend/target" "$repo2/e2e" "$work/bin2"
cp "$ROOT/scripts/e2e-run.sh" "$repo2/scripts/e2e-run.sh"; cp -R "$ROOT/scripts/lib" "$repo2/scripts/"
touch "$repo2/backend/target/englms-0.0.1-SNAPSHOT.jar"
printf '#!/usr/bin/env bash\necho dev-up >>"%s"\n' "$log" >"$repo2/scripts/dev-up.sh"
# podman stub: one line per call, its arguments joined by "|"; exit $PODMAN_EXIT. java/pnpm stubs: log the call order and what the app sees.
printf '#!/usr/bin/env bash\n(IFS="|"; echo "podman|$*") >>"%s"\nexit "${PODMAN_EXIT:-0}"\n' "$log" >"$work/bin2/podman"
printf '#!/usr/bin/env bash\necho java >>"%s"\necho $$ >"%s/app.pid"\nenv | grep -E "^(SPRING_DATASOURCE_URL|ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE|E2E_DB_NAME|E2E_KEEP_DB)=" | sort >"%s/app2.env"\nexec sleep 300\n' "$log" "$work" "$work" >"$work/bin2/java"
printf '#!/usr/bin/env bash\n[[ "$1" == exec ]] && echo "E2E_DATA_DIR=$E2E_DATA_DIR" >"%s/pw.env"\nexit 0\n' "$work" >"$work/bin2/pnpm"
chmod +x "$work/bin2/"* "$repo2/scripts/dev-up.sh"
write_env() { printf 'ENGLMS_DEV_DB_USER=englms\nENGLMS_DEV_DB_PORT=5432\nSPRING_DATASOURCE_URL=%s\nSPRING_DATASOURCE_USERNAME=englms\n' "${URL:-jdbc:postgresql://127.0.0.1:5432/devdata}" >"$repo2/.env"; [[ $# -gt 0 ]] && printf '%s\n' "$@" >>"$repo2/.env"; return 0; }
erun() { : >"$log"; rm -f "$work/app2.env" "$work/pw.env"; env -u E2E_DB_NAME -u E2E_KEEP_DB -u ENGLMS_DEV_DB_NAME -u ENGLMS_DEV_DB_USER -u ENGLMS_DEV_DB_PORT -u SPRING_DATASOURCE_URL -u DOCKER_HOST -u ENGLMS_CONTAINER_ENGINE_AUTO PATH="$work/bin2:$work/bin:$PATH" E2E_CHECK_PORTS= ENGLMS_CONTAINER_ENGINE=podman "$@" "$repo2/scripts/e2e-run.sh" --no-build; }
expect_equal() { # <actual> <expected> <description>
  if [[ "$1" == "$2" ]]; then PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - $3"; else FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $3"; diff <(echo "$2") <(echo "$1") | sed 's/^/         /'; fi
}
SQL="podman|exec|englms-dev-db|psql|-U|englms|-d|postgres|-v|ON_ERROR_STOP=1|-c|DROP DATABASE IF EXISTS englms_e2e WITH (FORCE)|-c|CREATE DATABASE englms_e2e OWNER englms"

write_env
mkdir -p "$repo2/.data/e2e/fresh/state"
head -c 64 /dev/urandom >"$repo2/.data/e2e/tutor-password"; cp "$repo2/.data/e2e/tutor-password" "$work/kept-password"
echo old >"$repo2/.data/e2e/fresh/tutor-password"; echo old >"$repo2/.data/e2e/fresh/state/tutor.json"
expect_exit 0 "with .env: a run on the per-run database passes" -- erun
expect_equal "$(cat "$log")" "dev-up"$'\n'"$SQL"$'\n'"java" "with .env: drop, then create, as two statements after dev-up and before java"
expect_equal "$(cat "$work/app2.env")" "ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE=$repo2/.data/e2e/fresh/tutor-bootstrap-password"$'\n'"SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/englms_e2e" "with .env: the app sees the E2E database URL and .data/e2e/fresh/"
expect_equal "$(cat "$work/pw.env")" "E2E_DATA_DIR=$repo2/.data/e2e/fresh" "with .env: Playwright uses .data/e2e/fresh/"
cmp -s "$work/kept-password" "$repo2/.data/e2e/tutor-password" && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - a fresh run leaves .data/e2e/tutor-password byte-identical"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - a fresh run changed .data/e2e/tutor-password"; }
[[ ! -e "$repo2/.data/e2e/fresh/tutor-password" && ! -e "$repo2/.data/e2e/fresh/state" ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - a fresh run removes fresh/tutor-password and fresh/state"; } || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - fresh/tutor-password or fresh/state survived"; }
URL='jdbc:postgresql://localhost:5432/devdata?sslmode=disable' write_env
expect_exit 0 "with .env: localhost and URL parameters are accepted" -- erun
LAST_OUTPUT=$(cat "$work/app2.env"); expect_output_contains "SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/englms_e2e?sslmode=disable" "keeps the host and parameters, replaces only the database name"

refused() { # <description> <env assignments...>: exit 1, a message, and no dev-up, engine or java call
  local desc=$1; shift
  expect_exit 1 "guard: refuses $desc" -- erun "$@"
  expect_output_contains "e2e-run: E2E_DB_NAME=" "guard: $desc: says why"
  expect_equal "$(cat "$log")" "" "guard: $desc: before any engine call"
}
write_env
refused "the dev database name (ENGLMS_DEV_DB_NAME unset: englms)" E2E_DB_NAME=englms
refused "the database name in the .env URL" E2E_DB_NAME=devdata
refused "postgres" E2E_DB_NAME=postgres
refused "template0" E2E_DB_NAME=template0
refused "template1" E2E_DB_NAME=template1
refused "a quote" "E2E_DB_NAME=e2e'x"
refused "a semicolon" "E2E_DB_NAME=e2e;x"
refused "a capital" E2E_DB_NAME=Englms_e2e
refused "an empty value" E2E_DB_NAME=
write_env ENGLMS_DEV_DB_NAME=mydev
refused "ENGLMS_DEV_DB_NAME from .env" E2E_DB_NAME=mydev
write_env "ENGLMS_DEV_DB_USER='en;x'"
refused "an ENGLMS_DEV_DB_USER that is not a plain identifier" E2E_DB_NAME=englms_e2e
URL=jdbc:postgresql://db.example.org:5432/devdata write_env
refused "a non-local URL host" E2E_DB_NAME=englms_e2e
URL=jdbc:postgresql://127.0.0.1:5433/devdata write_env
refused "another port" E2E_DB_NAME=englms_e2e
# G3 F2: pgjdbc URL parameters override the host, port and database name, and it decodes %-escapes in the name
# (write_env writes the URL unquoted, so these use one parameter: a & would background the .env line)
URL='jdbc:postgresql://127.0.0.1:5432/other?PGDBNAME=devdata' write_env
refused "a PGDBNAME URL parameter" E2E_DB_NAME=englms_e2e
expect_output_contains "sets the host, port, database or service as a parameter" "guard: a PGDBNAME URL parameter: names the parameter rule"
URL='jdbc:postgresql://127.0.0.1:5432/devdata?pghost=db.example.org' write_env
refused "a lower-case pghost URL parameter" E2E_DB_NAME=englms_e2e
expect_output_contains "sets the host, port, database or service as a parameter" "guard: a pghost URL parameter: names the parameter rule"
URL='jdbc:postgresql://127.0.0.1:5432/devdata?PgPort=5433' write_env
refused "a mixed-case PgPort URL parameter" E2E_DB_NAME=englms_e2e
expect_output_contains "sets the host, port, database or service as a parameter" "guard: a PgPort URL parameter: names the parameter rule"
URL='jdbc:postgresql://127.0.0.1:5432/other?dbname=devdata' write_env
refused "a dbname URL parameter (G3 F2-bis)" E2E_DB_NAME=englms_e2e
expect_output_contains "sets the host, port, database or service as a parameter" "guard: a dbname URL parameter: names the parameter rule"
URL='jdbc:postgresql://127.0.0.1:5432/other?Host=db.example.org' write_env
refused "a mixed-case Host URL parameter (G3 F2-bis)" E2E_DB_NAME=englms_e2e
URL='jdbc:postgresql://127.0.0.1:5432/other?service=x' write_env
refused "a service URL parameter (G3 F2-bis)" E2E_DB_NAME=englms_e2e
URL='jdbc:postgresql://127.0.0.1:5432/dev%64ata' write_env
refused "a % escape in the URL database name" E2E_DB_NAME=devdata
expect_output_contains "holds a % escape" "guard: a % escape: names the rule"

write_env E2E_DB_NAME=devdata E2E_KEEP_DB=1
expect_exit 0 "E2E_DB_NAME and E2E_KEEP_DB set inside .env are ignored" -- erun
expect_equal "$(cat "$log")" "dev-up"$'\n'"$SQL"$'\n'"java" ".env inputs ignored: the default per-run database is recreated"
FRESH_ENV="ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE=$repo2/.data/e2e/fresh/tutor-bootstrap-password"$'\n'"SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/englms_e2e"
expect_equal "$(cat "$work/app2.env")" "$FRESH_ENV" "G3 F5: E2E_DB_NAME and E2E_KEEP_DB from .env do not reach the app"
# G3 F3: .env assigning the script's saved copies (readonly) changes neither the mode nor the name
write_env keep_db=1 db_name=englms_x keep_set=1 name_set=1
expect_exit 0 "G3 F3: keep_db and db_name set inside .env are ignored" -- erun
expect_equal "$(cat "$log")" "dev-up"$'\n'"$SQL"$'\n'"java" "G3 F3: still a fresh run on englms_e2e"
expect_equal "$(cat "$work/app2.env")" "$FRESH_ENV" "G3 F3: the app sees the per-run database"
write_env
expect_exit 1 "a failing psql stops the run" -- erun PODMAN_EXIT=1
expect_output_contains "could not recreate the E2E database englms_e2e" "a failing psql: says so"
expect_output_not_contains "e2e-run: started" "a failing psql: the app is not started"
expect_equal "$(grep -c '^java' "$log")" "0" "a failing psql: no java"
expect_exit 0 "E2E_KEEP_DB=1 runs on the .env database" -- erun E2E_KEEP_DB=1
expect_equal "$(cat "$log")" "dev-up"$'\n'"java" "E2E_KEEP_DB=1: no SQL"
expect_equal "$(cat "$work/app2.env")" "E2E_KEEP_DB=1"$'\n'"ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE=$repo2/.data/e2e/tutor-bootstrap-password"$'\n'"SPRING_DATASOURCE_URL=jdbc:postgresql://127.0.0.1:5432/devdata" "E2E_KEEP_DB=1: the caller's value, the .env URL and .data/e2e/"
expect_equal "$(cat "$work/pw.env")" "E2E_DATA_DIR=$repo2/.data/e2e" "E2E_KEEP_DB=1: Playwright uses .data/e2e/"
rm "$repo2/.env"
expect_exit 0 "without .env (CI): runs on SPRING_DATASOURCE_URL" -- erun SPRING_DATASOURCE_URL=jdbc:postgresql://ci/db
expect_equal "$(cat "$log")" "java" "without .env: no dev-up and no engine call"
expect_equal "$(cat "$work/app2.env")" "ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE=$repo2/.data/e2e/tutor-bootstrap-password"$'\n'"SPRING_DATASOURCE_URL=jdbc:postgresql://ci/db" "without .env: the given URL and .data/e2e/"

finish
