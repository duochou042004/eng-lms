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
# The mirror records the push options it receives (GitLab honours ci.skip; DEC-107).
g --git-dir="$work/mirror.git" config receive.advertisePushOptions true
printf '#!/bin/sh\n: >"%s/push-options"\ni=0\nwhile [ "$i" -lt "${GIT_PUSH_OPTION_COUNT:-0}" ]; do eval "echo \\"\\$GIT_PUSH_OPTION_$i\\"" >>"%s/push-options"; i=$((i + 1)); done\n' "$work" "$work" >"$work/mirror.git/hooks/pre-receive"
chmod +x "$work/mirror.git/hooks/pre-receive"
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
if [[ "$(cat "$work/push-options" 2>/dev/null)" == ci.skip ]]; then
  PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - pushes with -o ci.skip while GitLab CI is paused (DEC-107)"
else
  FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - push options were '$(cat "$work/push-options" 2>/dev/null)', expected ci.skip"
fi
g push -q origin "origin/develop:refs/heads/chore/T-M9.9-y" 2>/dev/null
expect_exit 0 "ENGLMS_GITLAB_CI=on pushes without ci.skip" -- env ENGLMS_GITLAB_CI=on ./scripts/gitlab-sync.sh chore/T-M9.9-y
if [[ ! -s "$work/push-options" ]]; then
  PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - no push option when ENGLMS_GITLAB_CI=on"
else
  FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - push options '$(cat "$work/push-options")' with ENGLMS_GITLAB_CI=on"
fi
expect_exit 1 "fails for a branch GitHub does not have" -- ./scripts/gitlab-sync.sh feature/T-M9.9-missing
expect_output_contains "GitHub has no branch 'feature/T-M9.9-missing'" "names the missing branch"
finish
