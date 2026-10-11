#!/usr/bin/env bash
# Docs gate (quality-gates.md G1 for docs; CI job `docs-check`). Usage: ./scripts/check-docs.sh
source "$(dirname "$0")/lib/require-bash.sh"
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/check_docs.py
