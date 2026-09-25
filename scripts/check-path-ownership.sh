#!/usr/bin/env bash
# check-path-ownership.sh — enforce path ownership by branch kind (agent-roles.md §3).
# Usage: scripts/check-path-ownership.sh <branch-name> [<base-ref>]
#   Files come from `git diff --name-only <base-ref>...HEAD` (default base: origin/develop),
#   or from the file named in FILES_FROM (one path per line; used by tests).
set -euo pipefail

branch=${1:?"usage: check-path-ownership.sh <branch> [<base-ref>]"}
base=${2:-origin/develop}
if [[ -n "${FILES_FROM:-}" ]]; then
  mapfile -t files <"$FILES_FROM"
else
  mapfile -t files < <(git diff --name-only "${base}...HEAD")
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
    release|hotfix|dependabot) : ;;
    *) violations+=("$f: unknown branch kind '$kind' (use feature|fix|docs|chore|qa|release|hotfix)");;
  esac
done

if ((${#violations[@]})); then
  echo "path-ownership: FAIL for branch '$branch'" >&2
  printf '  - %s\n' "${violations[@]}" >&2
  exit 1
fi
echo "path-ownership: PASS for branch '$branch' (${#files[@]} file(s))"
