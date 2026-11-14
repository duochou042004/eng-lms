#!/usr/bin/env bash
# gate.sh — run every local quality gate in CI order and stop at the first failure (development-setup §4, quality-gates.md).
# Usage: ./scripts/gate.sh [--list] [--from <step>] [-h|--help]
#   --list         print the steps and exit
#   --from <step>  start at <step> (resume after fixing a failure)
# With ENGLMS_TASK=<task id> (e.g. T-M1.5) the whole output is also written to evidence/<task>/gate-<UTC timestamp>.log.
# The backend and contract-drift steps need Testcontainers: Docker or Podman (scripts/env.sh is sourced here).
# The e2e step runs the packaged app on :8080/:8081 (scripts/e2e-run.sh: locally on its own per-run database), then the new or changed specs x3,
# with every spec that imports a changed e2e/support/ file (all specs when its importers cannot be known, DEC-170, or when it
# reaches e2e/support/global-setup.ts, T-M2.28).
# Path-aware (DEC-131 (6)): backend and contract-drift are skipped when nothing under backend/, api/ or scripts/contract-drift.sh
# changed since ${ENGLMS_GATE_BASE:-origin/develop} (committed, staged, unstaged or untracked); CI still runs them. ENGLMS_GATE_FULL=1 runs every step.
source "$(dirname "$0")/lib/require-bash.sh"
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)

STEPS=(docs scripts backend web-install web-lint web-typecheck web-test web-build web-budget web-contrast contract-drift qa-typecheck e2e)

usage() { sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; }

# changed_files: every path changed against the base, or exit 1 when that cannot be known (no git, no base): then nothing is skipped.
changed_files() {
  local base=${ENGLMS_GATE_BASE:-origin/develop}
  git -C "$ROOT" rev-parse --verify -q "$base" >/dev/null || return 1
  local g=(git -C "$ROOT" -c core.quotePath=false)
  # --no-renames: a renamed file shows its old path as deleted (the e2e support rule repeats all specs for it).
  { "${g[@]}" diff --no-renames --name-only "$base"...HEAD && "${g[@]}" diff --no-renames --name-only HEAD \
    && "${g[@]}" ls-files --others --exclude-standard; } 2>/dev/null || return 1
}
backend_changed() {
  [[ "${ENGLMS_GATE_FULL:-}" == 1 ]] && return 0
  local files
  files=$(changed_files) || return 0
  grep -qE '^(backend/|api/|scripts/contract-drift\.sh$)' <<<"$files"
}
# norm_path <path>: drops "." and resolves ".." segments (e2e/tests/../support/a -> e2e/support/a).
norm_path() {
  local IFS=/ part parts out=()
  read -ra parts <<<"$1"
  for part in "${parts[@]}"; do
    case $part in
      '' | .) ;;
      ..) if ((${#out[@]})) && [[ ${out[-1]} != .. ]]; then unset 'out[-1]'; out=("${out[@]}"); else out+=(..); fi ;;
      *) out+=("$part") ;;
    esac
  done
  printf '%s' "${out[*]}"
}
# resolve_ts <repo path>: the file a specifier names (moduleResolution bundler, e2e/tsconfig.json): the exact path, <p>.ts, a .js
# ending mapped to .ts, then <p>/index.ts; prints nothing when none exists.
resolve_ts() {
  local c
  for c in "$1" "$1.ts" "${1%.js}.ts" "$1/index.ts"; do
    [[ -f "$ROOT/$c" ]] && { printf '%s' "$c"; return 0; }
  done
}
# import_specifiers <file>: every relative specifier of from '…', import '…' and import('…') (either quote; a multi-line import counts
# by its last line, export … from and import type included).
import_specifiers() {
  tr '\n' ' ' <"$1" | grep -oE "(from|import)[[:space:]]*(\([[:space:]]*)?['\"]\.\.?(/[^'\"]*)?['\"]" | sed -E "s/^[^'\"]*['\"]//; s/['\"]$//"
}
# e2e_support_specs <changed e2e/support/ path>...: prints "<spec>\t<why>" for each spec that imports a changed support file, directly or
# through other modules, and "*\t<why>" when the importers cannot be known (then every spec repeats; PO-9, DEC-170).
e2e_support_specs() {
  local -A rdeps=() seen=()
  local nodes=() queue=() f s p r x imp found
  mapfile -t nodes < <(cd "$ROOT" && find e2e/tests e2e/support -type f -name '*.ts' 2>/dev/null | sort)
  for f in "${nodes[@]}"; do
    while IFS= read -r s; do
      p=$(norm_path "$(dirname "$f")/$s")
      r=$(resolve_ts "$p")
      [[ $f == e2e/support/* && ${r:-$p} == e2e/tests/* ]] && printf '*\t%s imports from e2e/tests/ (%s)\n' "$f" "$s"
      [[ -z $r && $p == e2e/support/* ]] && printf '*\t%s: %s resolves to no file\n' "$f" "$s"
      [[ $r == e2e/support/* ]] && rdeps[$r]+="$f"$'\n'
    done < <(import_specifiers "$ROOT/$f")
  done
  for s in "$@"; do
    [[ -f "$ROOT/$s" ]] || { printf '*\t%s was deleted or renamed\n' "$s"; continue; }
    [[ $s == *.ts ]] || { printf '*\t%s is not a .ts file\n' "$s"; continue; }
    seen=(["$s"]=1); queue=("$s"); found=0
    while ((${#queue[@]})); do
      x=${queue[0]}; queue=("${queue[@]:1}")
      while IFS= read -r imp; do
        [[ -n $imp && -z ${seen[$imp]:-} ]] || continue
        seen[$imp]=1; queue+=("$imp")
        # Global setup (playwright.config.ts globalSetup) runs before every spec (T-M2.28 (g2)).
        [[ $imp == e2e/support/global-setup.ts ]] && printf '*\t%s reaches %s, which runs before every spec\n' "$s" "$imp"
        [[ $imp == e2e/tests/*.spec.ts ]] || continue
        found=1
        if [[ $x == "$s" ]]; then printf '%s\timports %s\n' "$imp" "$s"; else printf '%s\timports %s through %s\n' "$imp" "$s" "$x"; fi
      done <<<"${rdeps[$x]:-}"
    done
    ((found)) || printf '*\t%s is imported by no spec\n' "$s"
  done
}
# The new or changed specs and the importers of a changed e2e/support/ file (paths relative to e2e/), ×3 without retries on the
# mandatory viewports (DEC-131 (1), DEC-170; qa-protocol §3).
e2e_repeat() {
  local files f p why specs=() support=() all=()
  files=$(changed_files) || { echo "gate: e2e repeat skipped (changed files unknown)"; return 0; }
  while IFS= read -r f; do [[ -f "$ROOT/$f" ]] && specs+=("$f"); done < <(grep -E '^e2e/tests/.*\.spec\.ts$' <<<"$files" | sort -u)
  mapfile -t support < <(grep -E '^e2e/support/' <<<"$files" | sort -u)
  if ((${#specs[@]} + ${#support[@]})); then
    while IFS=$'\t' read -r p why; do
      if [[ $p == '*' ]]; then all+=("$why"); else specs+=("$p"); echo "gate: e2e repeat: ${p#e2e/} $why"; fi
    done < <(e2e_support_specs "${support[@]}")
  fi
  if ((${#all[@]})); then
    printf 'gate: e2e repeat: all specs: %s\n' "${all[@]}"
    mapfile -t specs < <(cd "$ROOT" && find e2e/tests -type f -name '*.spec.ts')
  fi
  ((${#specs[@]})) || { echo "gate: e2e repeat: no new or changed spec"; return 0; }
  mapfile -t specs < <(printf '%s\n' "${specs[@]#e2e/}" | sort -u)
  echo "gate: e2e repeat x3: ${specs[*]}"
  "$ROOT/scripts/e2e-run.sh" --no-build --project=phone-small --project=tablet --project=laptop --repeat-each=3 --retries=0 "${specs[@]}"
}

run_step() {
  case "$1" in
    docs) "$ROOT/scripts/check-docs.sh" ;;
    scripts) "$ROOT/scripts/tests/run-all.sh" ;;
    backend)
      backend_changed || { echo "gate: backend skipped: no backend/ or api/ change (CI runs it; ENGLMS_GATE_FULL=1 forces it)"; return 0; }
      (cd "$ROOT/backend" && ./mvnw -B -ntp verify) ;;
    web-install) (cd "$ROOT/web" && pnpm install --frozen-lockfile) ;;
    web-lint) (cd "$ROOT/web" && pnpm lint) ;;
    web-typecheck) (cd "$ROOT/web" && pnpm typecheck) ;;
    web-test) (cd "$ROOT/web" && pnpm test --run) ;;
    web-build) (cd "$ROOT/web" && pnpm build) ;;
    web-budget) (cd "$ROOT/web" && pnpm budget) ;;
    web-contrast) (cd "$ROOT/web" && pnpm contrast) ;;
    contract-drift)
      backend_changed || { echo "gate: contract-drift skipped: no backend/ or api/ change (CI runs it)"; return 0; }
      "$ROOT/scripts/contract-drift.sh" ;;
    # The QA suite's specs typecheck, so they cannot rot unnoticed (T-M1.18, M1 G5 QA F-6).
    qa-typecheck) (cd "$ROOT/qa" && pnpm install --frozen-lockfile && pnpm typecheck) ;;
    # The mandatory viewports against the packaged app (T-M1.6); needs ports 8080/8081 free and the dev DB.
    e2e) "$ROOT/scripts/e2e-run.sh" --project=phone-small --project=tablet --project=laptop && e2e_repeat ;;
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
