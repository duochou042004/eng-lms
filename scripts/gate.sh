#!/usr/bin/env bash
# gate.sh — run every local quality gate in CI order and stop at the first failure (development-setup §4, quality-gates.md).
# Usage: ./scripts/gate.sh [--list] [--from <step>] [-h|--help]
#   --list         print the steps and exit
#   --from <step>  start at <step> (resume after fixing a failure)
# With ENGLMS_TASK=<task id> (e.g. T-M1.5) the whole output is also written to evidence/<task>/gate-<UTC timestamp>.log.
# The backend and contract-drift steps need Testcontainers: Docker or Podman (scripts/env.sh is sourced here).
# The e2e step runs the packaged app on :8080/:8081 against the dev DB (scripts/e2e-run.sh).
source "$(dirname "$0")/lib/require-bash.sh"
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)

STEPS=(docs scripts backend web-install web-lint web-typecheck web-test web-build web-budget web-contrast contract-drift qa-typecheck e2e)

usage() { sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; }

run_step() {
  case "$1" in
    docs) "$ROOT/scripts/check-docs.sh" ;;
    scripts) "$ROOT/scripts/tests/run-all.sh" ;;
    backend) (cd "$ROOT/backend" && ./mvnw -B -ntp verify) ;;
    web-install) (cd "$ROOT/web" && pnpm install --frozen-lockfile) ;;
    web-lint) (cd "$ROOT/web" && pnpm lint) ;;
    web-typecheck) (cd "$ROOT/web" && pnpm typecheck) ;;
    web-test) (cd "$ROOT/web" && pnpm test --run) ;;
    web-build) (cd "$ROOT/web" && pnpm build) ;;
    web-budget) (cd "$ROOT/web" && pnpm budget) ;;
    web-contrast) (cd "$ROOT/web" && pnpm contrast) ;;
    contract-drift) "$ROOT/scripts/contract-drift.sh" ;;
    # The QA suite's specs typecheck, so they cannot rot unnoticed (T-M1.18, M1 G5 QA F-6).
    qa-typecheck) (cd "$ROOT/qa" && pnpm install --frozen-lockfile && pnpm typecheck) ;;
    # The mandatory viewports against the packaged app (T-M1.6); needs ports 8080/8081 free and the dev DB.
    e2e) "$ROOT/scripts/e2e-run.sh" --project=phone-small --project=tablet --project=laptop ;;
  esac
}

from=${STEPS[0]}
while (($# > 0)); do
  case "$1" in
    --list) printf '%s\n' "${STEPS[@]}"; exit 0 ;;
    --from)
      [[ $# -ge 2 ]] || { echo "gate: --from needs a step name (see --list)" >&2; exit 2; }
      from=$2; shift 2 ;;
    -h | --help) usage; exit 0 ;;
    *) echo "gate: unknown argument: $1" >&2; usage >&2; exit 2 ;;
  esac
done
start=-1
for i in "${!STEPS[@]}"; do [[ "${STEPS[$i]}" == "$from" ]] && start=$i; done
((start >= 0)) || { echo "gate: unknown step: $from (see --list)" >&2; exit 2; }

if [[ -n "${ENGLMS_TASK:-}" ]]; then
  [[ "$ENGLMS_TASK" =~ ^T-[A-Za-z0-9.]+$ ]] || { echo "gate: ENGLMS_TASK must look like T-M1.5 (got: $ENGLMS_TASK)" >&2; exit 2; }
  mkdir -p "$ROOT/evidence/$ENGLMS_TASK"
  log="$ROOT/evidence/$ENGLMS_TASK/gate-$(date -u +%Y%m%dT%H%M%SZ).log"
  exec > >(tee -a "$log") 2>&1
  echo "gate: logging to ${log#"$ROOT"/}"
fi

# Testcontainers on Docker or Podman (DEC-044, DEC-106). No reachable engine fails the backend step, not the fast steps before it.
# shellcheck source=scripts/env.sh
source "$ROOT/scripts/env.sh" || echo "gate: warning: scripts/env.sh failed; the backend and contract-drift steps need it" >&2

echo "gate: $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo no-git) $(date -u +%FT%TZ), steps: ${STEPS[*]:start}"
total_start=$SECONDS
for step in "${STEPS[@]:start}"; do
  echo "gate: ==> $step"
  step_start=$SECONDS
  run_step "$step"
  code=$?
  if ((code != 0)); then
    echo "gate: FAIL at step '$step' (exit $code) after $((SECONDS - step_start))s; later steps were not run. Resume with: ./scripts/gate.sh --from $step" >&2
    exit 1
  fi
  echo "gate: <== $step OK ($((SECONDS - step_start))s)"
done
echo "gate: PASS ($((${#STEPS[@]} - start)) steps, $((SECONDS - total_start))s)"
