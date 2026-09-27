#!/usr/bin/env bash
# Tests for scripts/check-path-ownership.sh (T-M1.1 AC6).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "check-path-ownership.sh"
tmp=$(mktemp); trap 'rm -f "$tmp"' EXIT
run() { printf '%s\n' "${@:2}" >"$tmp"; FILES_FROM="$tmp" "$ROOT/scripts/check-path-ownership.sh" "$1"; }

expect_exit 1 "qa/ branch touching backend/ fails"            -- run qa/T-M2.3 qa/e2e/a.spec.ts backend/src/main/X.java
expect_exit 0 "qa/ branch touching qa/ and qa evidence passes" -- run qa/T-M2.3 qa/e2e/a.spec.ts evidence/T-M2.3/qa/report.md
expect_exit 1 "feature/ branch touching qa/ fails"            -- run feature/T-M2.3-add-student web/src/a.tsx qa/plans/x.md
expect_exit 1 "feature/ branch writing reviewer evidence fails" -- run feature/T-M2.3-add-student evidence/T-M2.3/review/ux.md
expect_exit 0 "feature/ branch with backend, web, impl evidence passes" -- run feature/T-M2.3-add-student backend/a.java web/b.tsx evidence/T-M2.3/impl/x.png progress.json
expect_exit 1 "any branch touching docs/00-sources fails"     -- run docs/T-M9.9-x docs/00-sources/personal_english_tutor_teaching_workspace_spec.md
expect_exit 0 "chore/ branch with docs and scripts passes"    -- run chore/T-M1.1-repo-governance docs/README.md scripts/merge-gate.sh .github/workflows/docs-check.yml
expect_exit 1 "unknown branch kind fails"                     -- run random/thing README.md
expect_exit 1 "R2-1: dependabot branch touching source code fails"   -- run dependabot/maven/backend/x backend/pom.xml backend/src/main/A.java
expect_exit 0 "dependabot branch touching manifests/workflows passes" -- run dependabot/npm_and_yarn/web/x web/package.json web/pnpm-lock.yaml .github/workflows/web.yml
expect_exit 0 "T-M1.7/R3-3: dependabot branch bumping the Maven wrapper properties passes" -- run dependabot/maven/backend/x backend/.mvn/wrapper/maven-wrapper.properties backend/pom.xml
expect_exit 1 "T-M1.7: dependabot branch touching other .mvn files fails" -- run dependabot/maven/backend/x .mvn/extensions.xml
expect_exit 1 "T-M1.7: dependabot branch touching the wrapper jar fails" -- run dependabot/maven/backend/x backend/.mvn/wrapper/maven-wrapper.jar
expect_exit 2 "F5: an empty change list fails (no silent PASS)" -- run chore/T-M1.1-x ""
expect_exit 2 "F5: an unknown base ref fails (no silent PASS)" -- env -u FILES_FROM "$ROOT/scripts/check-path-ownership.sh" chore/T-M1.1-x origin/does-not-exist
finish
