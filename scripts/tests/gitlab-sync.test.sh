#!/usr/bin/env bash
# Tests for scripts/gitlab-sync.sh (T-M1.11, DEC-060) with local bare remotes: it mirrors origin's commits (not local
# ones) for develop, master and named branches, through the real pre-push hook.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "gitlab-sync.sh"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
g() { git -c user.name=test -c user.email=test@example.invalid -c init.defaultBranch=master "$@"; }
g init -q --bare "$work/origin.git"
g init -q --bare "$work/mirror.git"
g clone -q "$work/origin.git" "$work/repo" 2>/dev/null
cd "$work/repo"
mkdir -p scripts && cp "$ROOT/scripts/gitlab-sync.sh" scripts/
g commit -q --allow-empty -m init
g push -q origin HEAD:refs/heads/master HEAD:refs/heads/develop 2>/dev/null
g checkout -q -b chore/T-M9.9-x
g commit -q --allow-empty -m "branch work"
g push -q origin chore/T-M9.9-x 2>/dev/null
g config core.hooksPath "$ROOT/scripts/hooks"
g commit -q --allow-empty -m "local only, not on GitHub"
export ENGLMS_MIRROR_URL_RE="^$work/mirror\\.git\$"

expect_exit 1 "fails without a gitlab remote" -- ./scripts/gitlab-sync.sh
expect_output_contains "git remote add gitlab" "explains how to add the remote"
g remote add gitlab "$work/mirror.git"

expect_exit 0 "mirrors develop, master and a named branch" -- ./scripts/gitlab-sync.sh chore/T-M9.9-x develop
for b in develop master chore/T-M9.9-x; do
  if [[ "$(git --git-dir="$work/mirror.git" rev-parse "$b")" == "$(git rev-parse "origin/$b")" ]]; then
    PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - mirror $b == origin/$b (not the local commit)"
  else
    FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - mirror $b differs from origin/$b"
  fi
done
expect_exit 1 "fails for a branch GitHub does not have" -- ./scripts/gitlab-sync.sh feature/T-M9.9-missing
expect_output_contains "GitHub has no branch 'feature/T-M9.9-missing'" "names the missing branch"
finish
