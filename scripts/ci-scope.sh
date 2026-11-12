#!/usr/bin/env bash
# ci-scope.sh — decides whether a heavy CI job may skip its heavy steps (T-M2.23, DEC-158 PO-1/PO-2, DEC-160; ci-cd.md §1).
#
# Usage: scripts/ci-scope.sh pr | push | replay <n>      (run from the repository root; anything else exits 2)
#   pr      switch (a): a pull request to `develop` whose merge ref differs from its first parent only in allow-listed text
#   push    switch (b): a push to `develop` of one merge commit whose tree was already tested (b1) or is text on a green parent (b2)
#   replay  offline: classify the last <n> first-parent merges of ${CI_SCOPE_REPLAY_REF:-origin/develop} with the same diff rule
# Env (pr, push): GITHUB_EVENT_NAME, GITHUB_BASE_REF, GITHUB_REF, GITHUB_REPOSITORY, GITHUB_WORKFLOW_REF, GITHUB_OUTPUT,
#   GITHUB_STEP_SUMMARY; CI_SCOPE_PR_HEAD_SHA (github.event.pull_request.head.sha), CI_SCOPE_BEFORE (github.event.before);
#   GH_BIN (default gh; tests), CI_SCOPE_ALLOW_FILE / CI_SCOPE_MODE_FILE (tests; default beside this script). All three are
#   ignored when GITHUB_ACTIONS is set.
# Outputs: verdict (fast-path|full), why, scope. `scope` is `fast-path` only when the verdict is and scripts/ci-scope.mode is
# `enforce`; the heavy steps run unless scope is exactly `fast-path`, the marker step runs unless verdict is exactly `fast-path`.
# Fail closed: every doubt, error or unexpected value gives verdict=full (exit 0). Only a usage error exits non-zero.
source "$(dirname "$0")/lib/require-bash.sh"
set -uo pipefail
export LC_ALL=C   # case-sensitive, byte-wise matching whatever the caller's locale

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
ALLOW_FILE=${CI_SCOPE_ALLOW_FILE:-$SCRIPT_DIR/ci-text-only.paths}
MODE_FILE=${CI_SCOPE_MODE_FILE:-$SCRIPT_DIR/ci-scope.mode}
GH=${GH_BIN:-gh}
# On a runner the test overrides are ignored: a workflow cannot swap the allow-list, the mode file or gh through `env:` (G3 G-3).
if [[ -n "${GITHUB_ACTIONS:-}" ]]; then ALLOW_FILE=$SCRIPT_DIR/ci-text-only.paths; MODE_FILE=$SCRIPT_DIR/ci-scope.mode; GH=gh; fi
MARKER_DEVELOP="Full run on develop"
usage() { printf 'usage: ci-scope.sh pr | push | replay <n>\n' >&2; exit 2; }

ALLOW=()
load_allow() { # → 1 when the allow-list is missing or holds no pattern
  local line
  ALLOW=()
  [[ -f "$ALLOW_FILE" ]] || return 1
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" == \#* ]] && continue
    ALLOW+=("$line")
  done <"$ALLOW_FILE"
  ((${#ALLOW[@]} > 0))
}
path_allowed() { # <path>
  local re
  [[ "$1" != *[[:cntrl:]]* ]] || return 1   # bash and jq disagree on `$` before a final newline (G0 D-15): off the list for both
  for re in "${ALLOW[@]}"; do [[ "$1" =~ $re ]] && return 0; done
  return 1
}
# text_only <old> <new> → 0 when the tree diff is text-only (packet "Terms"); otherwise 1 with WHY set
WHY=""
text_only() {
  local raw meta path old_mode new_mode n=0
  load_allow || { WHY="allow-list missing or empty"; return 1; }
  raw=$(mktemp)
  if ! git -c core.quotePath=false diff --raw -z --no-renames --no-abbrev --ignore-submodules=none --no-relative --no-ext-diff "$1" "$2" >"$raw" 2>/dev/null; then
    rm -f "$raw"; WHY="cannot diff $1..$2"; return 1
  fi
  while IFS= read -r -d '' meta; do
    if ! IFS= read -r -d '' path; then rm -f "$raw"; WHY="unreadable diff entry"; return 1; fi
    n=$((n + 1))
    read -r old_mode new_mode _ <<<"${meta#:}"
    case "$old_mode" in 100644|000000) ;; *) rm -f "$raw"; WHY="mode $old_mode on a changed path"; return 1;; esac
    case "$new_mode" in 100644|000000) ;; *) rm -f "$raw"; WHY="mode $new_mode on a changed path"; return 1;; esac
    path_allowed "$path" || { rm -f "$raw"; WHY="path off the allow-list: $(printf '%q' "${path:0:80}")"; return 1; }
  done <"$raw"
  rm -f "$raw"
  ((n > 0)) || { WHY="empty diff"; return 1; }
}
enforcing() { # the mode file is exactly `enforce`, with or without one final newline
  [[ -f "$MODE_FILE" ]] && { cmp -s "$MODE_FILE" <(printf 'enforce') || cmp -s "$MODE_FILE" <(printf 'enforce\n'); }
}
emit() { # <verdict> <why> → the outputs, the notice and the summary line; never returns
  local verdict=$1 why=${2//[$'\n\r']/ } mode=shadow scope=full line
  enforcing && mode=enforce
  [[ "$verdict" == fast-path && "$mode" == enforce ]] && scope=fast-path
  line="ci-scope: mode=$mode verdict=$verdict why=$why"
  if [[ -n "${GITHUB_OUTPUT:-}" ]]; then printf 'scope=%s\nverdict=%s\nwhy=%s\n' "$scope" "$verdict" "$why" >>"$GITHUB_OUTPUT"; fi
  if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then printf '%s\n' "$line" >>"$GITHUB_STEP_SUMMARY"; fi
  [[ -n "${GITHUB_ACTIONS:-}" ]] && printf '::notice title=ci-scope::%s\n' "$line"
  printf '%s (scope=%s)\n' "$line" "$scope"
  exit 0
}
full() { emit full "$1"; }
parents_of_head() { # sets P1, P2; → 1 unless HEAD has exactly two parents
  local -a p
  read -r -a p < <(git rev-list --parents -n 1 HEAD 2>/dev/null) || return 1
  ((${#p[@]} == 3)) || return 1
  P1=${p[1]}; P2=${p[2]}
}

mode_pr() {
  [[ "${GITHUB_EVENT_NAME:-}" == pull_request ]] || full "event is not pull_request"
  [[ "${GITHUB_BASE_REF:-}" == develop ]] || full "base is not develop"
  parents_of_head || full "HEAD is not a two-parent merge ref (or the checkout is too shallow)"
  [[ -n "${CI_SCOPE_PR_HEAD_SHA:-}" && "$P2" == "$CI_SCOPE_PR_HEAD_SHA" ]] || full "second parent is not the PR head"
  text_only "$P1" HEAD || full "$WHY"
  emit fast-path "text-only pull request"
}

api() { "$GH" api "$@" 2>/dev/null; }
# newest_run <runs-json> <sha> <event> → the newest run (by created_at) of this workflow file for that SHA and event, as JSON;
# empty when the listing is incomplete or malformed (a candidate without a time or an id included), or there is none; a tie on
# created_at goes to the higher run id
newest_run() {
  jq -c --arg path "$WF_PATH" --arg sha "$2" --arg ev "$3" '
    if (type == "object") and (.workflow_runs | type == "array") and (.total_count == (.workflow_runs | length))
    then [.workflow_runs[] | select(.path == $path and .head_sha == $sha and .event == $ev)]
         | if all(.[]; (.created_at | type == "string") and (.id | type == "number")) then sort_by(.created_at, .id) | last // empty else empty end
    else empty end' <<<"$1" 2>/dev/null
}
mode_push() {
  local repo=${GITHUB_REPOSITORY:-} behind runs run id jobs
  [[ "${GITHUB_EVENT_NAME:-}" == push ]] || full "event is not push"
  [[ "${GITHUB_REF:-}" == refs/heads/develop ]] || full "ref is not refs/heads/develop"
  parents_of_head || full "HEAD is not a two-parent merge commit"
  [[ -n "${CI_SCOPE_BEFORE:-}" && "$P1" == "$CI_SCOPE_BEFORE" ]] || full "the push did not add exactly this merge commit"
  [[ "$(git rev-parse 'HEAD^{tree}' 2>/dev/null)" == "$(git rev-parse "$P2^{tree}" 2>/dev/null)" && -n "$(git rev-parse 'HEAD^{tree}' 2>/dev/null)" ]] \
    || full "the merge tree differs from the merged head's tree"
  WF_PATH=${GITHUB_WORKFLOW_REF:-}; WF_PATH=${WF_PATH#"$repo"/}; WF_PATH=${WF_PATH%%@*}
  [[ -n "$repo" && "$WF_PATH" == .github/workflows/* ]] || full "cannot tell the repository or the workflow file"
  behind=$(api "repos/$repo/compare/$P1...$P2" --jq .behind_by) || full "compare API error"
  [[ "$behind" == 0 ]] || full "the merged head was behind develop (behind_by=${behind:0:20})"

  # (b1) a successful full pull_request run of this workflow on the merged head
  local b1_why="no successful full run on the merged head"
  if runs=$(api "repos/$repo/actions/runs?head_sha=$P2&event=pull_request&per_page=100"); then
    run=$(newest_run "$runs" "$P2" pull_request)
    if [[ -n "$run" && "$(jq -r '.status + "/" + (.conclusion // "")' <<<"$run")" == completed/success ]]; then
      id=$(jq -r '.id' <<<"$run")
      if [[ "$id" =~ ^[0-9]+$ ]] && jobs=$(api "repos/$repo/actions/runs/$id/jobs?per_page=100") \
         && jq -e --arg m "$MARKER_DEVELOP" '(type == "object") and (.jobs | type == "array") and (.total_count == (.jobs | length)) and (.jobs | length > 0)
              and (.jobs | all(any(.steps[]?; .name == $m and .conclusion == "success")))' <<<"$jobs" >/dev/null 2>&1; then
        emit fast-path "merged tree had a successful full run (run $id)"
      fi
    fi
  else
    b1_why="runs API error"
  fi

  # (b2) text on top of a green first parent
  text_only "$P1" HEAD || full "$b1_why; $WHY"
  runs=$(api "repos/$repo/actions/runs?head_sha=$P1&event=push&branch=develop&per_page=100") || full "$b1_why; runs API error for the first parent"
  run=$(newest_run "$runs" "$P1" push)
  [[ -n "$run" && "$(jq -r '(.head_branch // "") + "/" + .status + "/" + (.conclusion // "")' <<<"$run")" == develop/completed/success ]] \
    || full "$b1_why; text-only, but the first parent is not green"
  emit fast-path "text-only merge on a green first parent"
}

mode_replay() {
  local n=$1 ref=${CI_SCOPE_REPLAY_REF:-origin/develop} m a tree
  while IFS= read -r m; do
    if text_only "$m^1" "$m^2"; then a="text-only"; else a="full ($WHY)"; fi
    if [[ "$(git rev-parse "$m^{tree}")" == "$(git rev-parse "$m^2^{tree}")" ]]; then tree=same; else tree=differs; fi
    printf '%s\t%s\ttree=%s\t%s\n' "${m:0:7}" "$a" "$tree" "$(git log -1 --format=%s "$m")"
  done < <(git rev-list --first-parent --merges -n "$n" "$ref")
}

case "${1:-}" in
  pr)     (($# == 1)) || usage; mode_pr;;
  push)   (($# == 1)) || usage; mode_push;;
  replay) [[ $# -eq 2 && "$2" =~ ^[1-9][0-9]*$ ]] || usage; mode_replay "$2";;
  *)      usage;;
esac
