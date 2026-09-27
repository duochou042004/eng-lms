#!/usr/bin/env bash
# gitlab-sync.sh — mirror GitHub's state to the private GitLab mirror (T-M1.11, DEC-060; temporary while GitHub's
# artifact storage is exhausted). Fetches origin, then pushes origin's develop, master and any given branches to the
# `gitlab` remote. It pushes GitHub's commits (refs/remotes/origin/*), never local ones, fast-forward only; the
# pre-push hook allows develop/master on the mirror only for exactly those commits. Each push runs .gitlab-ci.yml.
# Usage: ./scripts/gitlab-sync.sh [branch...]      Env: ENGLMS_MIRROR_REMOTE (default: gitlab)
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
REMOTE=${ENGLMS_MIRROR_REMOTE:-gitlab}
case "${1:-}" in -h | --help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;; esac

git remote get-url "$REMOTE" >/dev/null 2>&1 || {
  echo "gitlab-sync: no '$REMOTE' remote; add it once with: git remote add gitlab https://gitlab.com/duochou042004/eng-lms.git" >&2
  exit 1
}
git fetch -q origin
declare -A seen=()
refspecs=()
for branch in develop master "$@"; do
  [[ -n "${seen[$branch]:-}" ]] && continue
  seen[$branch]=1
  if ! git rev-parse -q --verify "refs/remotes/origin/$branch" >/dev/null; then
    echo "gitlab-sync: GitHub has no branch '$branch' (push it to origin first)" >&2
    exit 1
  fi
  refspecs+=("refs/remotes/origin/$branch:refs/heads/$branch")
done
echo "gitlab-sync: pushing ${!seen[*]} from origin to $REMOTE"
git push "$REMOTE" "${refspecs[@]}"
