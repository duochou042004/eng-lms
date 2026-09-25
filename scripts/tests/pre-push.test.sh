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
finish
