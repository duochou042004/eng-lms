#!/usr/bin/env bash
# Install the repository's git hooks for this clone (git-governance.md §4). Idempotent.
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath scripts/hooks
chmod +x scripts/hooks/*
echo "hooks installed: core.hooksPath=scripts/hooks ($(ls scripts/hooks | tr '\n' ' '))"
