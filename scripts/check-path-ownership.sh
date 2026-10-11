#!/usr/bin/env bash
# check-path-ownership.sh — enforce path ownership by branch kind (agent-roles.md §3).
# Usage: scripts/check-path-ownership.sh <branch-name> [<base-ref>]
#   Files come from `git diff --name-only <base-ref>...HEAD` (default base: origin/develop),
#   or from the file named in FILES_FROM (one path per line; used by tests).
source "$(dirname "$0")/lib/require-bash.sh"
set -euo pipefail

branch=${1:?"usage: check-path-ownership.sh <branch> [<base-ref>]"}
base=${2:-origin/develop}
if [[ -n "${FILES_FROM:-}" ]]; then
  mapfile -t files <"$FILES_FROM"
else
  errf=$(mktemp); trap 'rm -f "$errf"' EXIT
  if ! diff_out=$(git diff --name-only "${base}...HEAD" 2>"$errf"); then
    echo "path-ownership: FAIL — cannot diff against '$base': $(cat "$errf")" >&2
    exit 2
  fi
  mapfile -t files <<<"$diff_out"
fi
nonempty=0; for f in "${files[@]}"; do [[ -n "$f" ]] && nonempty=$((nonempty + 1)); done
if ((nonempty == 0)); then
  echo "path-ownership: FAIL — no changed files found (wrong base ref?)" >&2
  exit 2
fi

kind=${branch%%/*}
violations=()
for f in "${files[@]}"; do
  [[ -z "$f" ]] && continue
  if [[ "$f" == docs/00-sources/* ]]; then
    violations+=("$f: docs/00-sources is immutable"); continue
  fi
  is_qa=0; is_review=0
  [[ "$f" == qa/* || "$f" =~ ^evidence/[^/]+/qa/ ]] && is_qa=1
  [[ "$f" =~ ^evidence/[^/]+/review/ ]] && is_review=1
  case "$kind" in
    qa)
      ((is_qa)) || violations+=("$f: qa/ branches may only change qa/** and evidence/*/qa/**");;
    feature|fix)
      ((is_qa)) && violations+=("$f: implementation branches must not change QA-owned paths")
      ((is_review)) && violations+=("$f: implementation branches must not write reviewer evidence");;
    docs|chore)
      ((is_qa)) && violations+=("$f: docs/chore branches must not change QA-owned paths");;
    dependabot)
      # Same allow-list as DEPENDABOT_FILES_RE in merge-gate.sh (T-M1.7), which also checks that workflow edits are only `uses:` SHA bumps.
      [[ "$f" =~ ^((.*/)?pom\.xml|(.*/)?package\.json|(.*/)?pnpm-lock\.yaml|backend/\.mvn/wrapper/maven-wrapper\.properties|\.github/workflows/[^/]+\.ya?ml)$ ]] \
        || violations+=("$f: dependabot branches may only change dependency manifests, lockfiles, the Maven wrapper properties and workflow files");;
    release|hotfix) : ;;
    *) violations+=("$f: unknown branch kind '$kind' (use feature|fix|docs|chore|qa|release|hotfix)");;
  esac
done

if ((${#violations[@]})); then
  echo "path-ownership: FAIL for branch '$branch'" >&2
  printf '  - %s\n' "${violations[@]}" >&2
  exit 1
fi
echo "path-ownership: PASS for branch '$branch' ($nonempty file(s))"
