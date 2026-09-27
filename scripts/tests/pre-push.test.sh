#!/usr/bin/env bash
# Tests for scripts/hooks/pre-push (T-M1.1 AC5) against a throwaway bare remote.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "pre-push hook"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
g() { git -c user.name=test -c user.email=test@example.invalid -c init.defaultBranch=master "$@"; }

g init -q --bare "$work/remote.git"
g clone -q "$work/remote.git" "$work/clone" 2>/dev/null
cd "$work/clone"
g commit -q --allow-empty -m init
g push -q origin HEAD:refs/heads/master 2>/dev/null          # seed remote before installing the hook
g config core.hooksPath "$ROOT/scripts/hooks"

g checkout -q -b develop
g commit -q --allow-empty -m "direct develop commit"
expect_exit 1 "blocks a direct push to develop" -- g push origin develop
expect_output_contains "direct push to 'develop' is blocked" "explains the develop block"

g checkout -q master
g commit -q --allow-empty -m "direct master commit"
expect_exit 1 "blocks a direct push to master" -- g push origin master

g checkout -q -b feature/T-M9.9-demo
g commit -q --allow-empty -m "feature work"
expect_exit 0 "allows pushing a feature branch" -- g push -q origin feature/T-M9.9-demo

g commit -q --amend --allow-empty -m "rewritten"
expect_exit 1 "blocks a force push that rewrites history" -- g push -q --force origin feature/T-M9.9-demo
expect_output_contains "non-fast-forward (force) push" "explains the force-push block"

g commit -q --allow-empty -m "more work"
g reset -q --hard origin/feature/T-M9.9-demo
g commit -q --allow-empty -m "fast-forward work"
expect_exit 0 "allows a normal fast-forward push" -- g push -q origin feature/T-M9.9-demo

# GitLab mirror exception (DEC-060): develop/master only as exactly origin's commit, and only to the mirror URL.
g init -q --bare "$work/mirror.git"
g init -q --bare "$work/other.git"
g checkout -q -B develop origin/master 2>/dev/null
g -c core.hooksPath=/dev/null push -q origin HEAD:refs/heads/develop 2>/dev/null   # "merged on GitHub" (test setup only)
g fetch -q origin
mirror_env=(env "ENGLMS_MIRROR_URL_RE=^$work/mirror\\.git\$")
expect_exit 0 "mirrors develop to the GitLab mirror when it is exactly origin/develop" -- \
  "${mirror_env[@]}" git push -q "$work/mirror.git" refs/remotes/origin/develop:refs/heads/develop
g commit -q --allow-empty -m "local develop commit not on GitHub"
expect_exit 1 "blocks develop on the mirror when the commit is not origin/develop" -- \
  "${mirror_env[@]}" git push -q "$work/mirror.git" develop:refs/heads/develop
expect_output_contains "the GitLab mirror only accepts origin/develop exactly" "points to gitlab-sync.sh"
expect_exit 1 "blocks origin's develop commit to a remote that is not the mirror" -- \
  "${mirror_env[@]}" git push -q "$work/other.git" refs/remotes/origin/develop:refs/heads/develop
expect_exit 1 "still blocks a new develop commit to origin (GitHub), even with the mirror setting" -- \
  "${mirror_env[@]}" git push -q origin develop:refs/heads/develop
expect_exit 1 "blocks deleting develop on the mirror" -- \
  "${mirror_env[@]}" git push -q "$work/mirror.git" :refs/heads/develop
finish
