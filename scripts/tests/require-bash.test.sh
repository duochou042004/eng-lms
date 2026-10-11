#!/usr/bin/env bash
# Tests for scripts/lib/require-bash.sh (T-M1.19 AC4): the version check (a parameter, since BASH_VERSINFO is read-only), that every
# executable bash script sources it before anything else (the bash-3.2-safe hooks/pre-push excepted), and a real bash 3.2 run when one
# is installed (macOS: /bin/bash; else ENGLMS_BASH32=<path>), otherwise a recorded skip.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "require-bash.sh"
GUARD="$ROOT/scripts/lib/require-bash.sh"
MSG="bash ≥ 4.4 required (macOS: brew install bash; Homebrew bash first on PATH)"

for v in "3 2" "4 0" "4 3"; do
  expect_exit 1 "bash ${v/ /.} is refused" -- bash -c "source '$GUARD' && englms_require_bash $v"
  expect_output_contains "$MSG" "bash ${v/ /.}: the documented message"
done
for v in "4 4" "5 0" "5 3"; do
  expect_exit 0 "bash ${v/ /.} is accepted" -- bash -c "source '$GUARD' && englms_require_bash $v"
done

# Every executable bash script in git sources the guard as its first command (lib.sh too; the *.test.sh files source lib.sh right after `set`).
missing=()
while read -r mode _ _ path; do
  [[ "$mode" == 100755 && "$path" != scripts/hooks/pre-push ]] || [[ "$path" == scripts/tests/lib.sh ]] || continue
  head -n 1 "$ROOT/$path" | grep -q bash || continue
  first=$(grep -v -m 1 '^#' "$ROOT/$path")
  [[ "$first" == source\ *"/lib/require-bash.sh\"" ]] && continue
  # *.test.sh: `set -uo pipefail` (bash-3.2-safe), then lib.sh, which sources the guard
  [[ "$path" == *.test.sh && $(grep -v '^#' "$ROOT/$path" | sed -n 2p) == 'source "$(dirname "$0")/lib.sh"' ]] || missing+=("$path")
done < <(git -C "$ROOT" ls-files -s scripts)
((${#missing[@]} == 0)) && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - every executable bash script sources the guard first"; } \
  || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - no guard as the first command in: ${missing[*]}"; }
grep -q require-bash "$ROOT/scripts/hooks/pre-push" && { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - hooks/pre-push must stay bash-3.2-safe without the guard"; } \
  || { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - hooks/pre-push has no guard (GUI git may run it with bash 3.2)"; }

bash32=""
for b in "${ENGLMS_BASH32:-}" /bin/bash; do
  [[ -n "$b" && -x "$b" ]] && [[ $("$b" -c 'echo "${BASH_VERSINFO[0]}.${BASH_VERSINFO[1]}"' 2>/dev/null) == 3.* ]] && { bash32=$b; break; }
done
if [[ -n "$bash32" ]]; then
  expect_exit 1 "real bash 3.2 ($bash32): dev-down.sh is refused" -- "$bash32" "$ROOT/scripts/dev-down.sh" --help
  expect_output_contains "$MSG" "real bash 3.2: the documented message"
  expect_exit 1 "real bash 3.2: the test runner is refused" -- "$bash32" "$ROOT/scripts/tests/run-all.sh"
  expect_output_contains "$MSG" "real bash 3.2: the runner's message"
  expect_exit 0 "real bash 3.2: hooks/pre-push still runs" -- "$bash32" "$ROOT/scripts/hooks/pre-push" origin /dev/null </dev/null
else
  echo "  skip - no bash 3.2 here (/bin/bash is $(/bin/bash -c 'echo $BASH_VERSION' 2>/dev/null)); set ENGLMS_BASH32=<path> or run on macOS"
fi

finish
