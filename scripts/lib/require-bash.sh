# shellcheck shell=bash
# require-bash.sh — sourced first by every executable script (not the bash-3.2-safe hooks/pre-push) and the test runner:
# stops under bash < 4.4 (macOS ships 3.2). 4.4, not 4.0: earlier versions abort on an empty "${array[@]}" under set -u,
# and the tests use ${var,,} (T-M1.19, DEC-106). Keep this file bash-3.2-parseable.
englms_require_bash() { # <major> <minor>; a function so it is unit-testable (BASH_VERSINFO is read-only)
  if (($1 < 4 || ($1 == 4 && $2 < 4))); then
    echo "bash ≥ 4.4 required (macOS: brew install bash; Homebrew bash first on PATH); this is bash $1.$2" >&2
    return 1
  fi
}
englms_require_bash "${BASH_VERSINFO[0]:-0}" "${BASH_VERSINFO[1]:-0}" || exit 1
