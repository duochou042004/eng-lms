#!/usr/bin/env bash
# Tests for scripts/ci-scope.sh (T-M2.23 AC1, AC2, AC3, AC7; lessons-learned L-01): fixture git repositories whose merge commits are
# built with plumbing (commit-tree), and the mocked gh for the push mode. Every "full" case is a violating input the rule must refuse.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "ci-scope.sh"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
export GH_BIN="$ROOT/scripts/tests/mock-gh"
export MOCK_DIR="$tmp/mock"; mkdir "$MOCK_DIR"
repo="$tmp/repo"; mkdir "$repo"
g() { git -C "$repo" -c user.name=fixture -c user.email=fixture@example.invalid -c core.fileMode=true "$@"; }
g init -q -b develop
mkdir -p "$repo"/{docs,evidence/T-x,web/src,backend,.claude,.github,scripts}
echo a >"$repo/docs/a.md"; echo s >"$repo/web/src/a.ts"; echo '{}' >"$repo/progress.json"; echo r >"$repo/README.md"
echo j >"$repo/backend/A.java"; echo '{}' >"$repo/.claude/settings.json"; echo t >"$repo/.github/pull_request_template.md"
echo l >"$repo/scripts/ci-text-only.paths"; echo w >"$repo/web/README.md"
g add -A; g commit -qm base; BASE=$(g rev-parse HEAD)

# pr_fixture <shell snippet run in the repo>: a head commit on top of BASE with that change, and HEAD = the merge ref (BASE, head)
pr_fixture() {
  g checkout -q --detach "$BASE" 2>/dev/null; g reset -q --hard; g clean -qffdx
  (cd "$repo" && eval "$1"); g -c advice.addEmbeddedRepo=false add -A 2>/dev/null; g commit -q --allow-empty -m head; HEADSHA=$(g rev-parse HEAD)
  MERGE=$(g commit-tree "$HEADSHA^{tree}" -p "$BASE" -p "$HEADSHA" -m merge); g checkout -q --detach "$MERGE"
}
# scope <mode> [VAR=value...]: run the classifier in the repo with a clean Actions environment
OUTF="$tmp/out"
scope() {
  local mode=$1; shift; : >"$OUTF"
  (cd "$repo" && env -u GITHUB_ACTIONS -u CI_SCOPE_ALLOW_FILE -u CI_SCOPE_MODE_FILE GITHUB_OUTPUT="$OUTF" GITHUB_STEP_SUMMARY=/dev/null \
     GITHUB_EVENT_NAME=pull_request GITHUB_BASE_REF=develop GITHUB_REF=refs/pull/7/merge GITHUB_REPOSITORY=o/r \
     GITHUB_WORKFLOW_REF=o/r/.github/workflows/web.yml@refs/heads/develop CI_SCOPE_PR_HEAD_SHA="${HEADSHA:-}" CI_SCOPE_BEFORE="${BASE:-}" \
     "$@" "$ROOT/scripts/ci-scope.sh" "$mode")
}
is() { # <fast-path|full> <description> [VAR=value...]: PR mode on the current fixture
  local want=$1 desc=$2; shift 2
  expect_exit 0 "$desc: exit 0" -- scope pr "$@"
  expect_output_contains "verdict=$want " "$desc: verdict $want"
}

echo " AC1: the text-only diff (through the PR mode)"
pr_fixture 'echo b >>docs/a.md';                         is fast-path "a changed docs/a.md"
expect_output_contains "mode=shadow" "the default mode is shadow"
pr_fixture 'mkdir -p evidence/T-x; echo s >evidence/T-x/shot.txt';              is fast-path "an added evidence file"
pr_fixture 'echo "{\"a\":1}" >progress.json';            is fast-path "a changed progress.json"
pr_fixture 'echo b >>README.md';                         is fast-path "a changed root README.md"
pr_fixture 'git rm -q docs/a.md';                        is fast-path "a deleted docs/a.md"
pr_fixture 'git mv docs/a.md docs/b.md';                 is fast-path "a rename inside docs/"
pr_fixture ':';                                          is full "an empty diff"
expect_output_contains "empty diff" "names the empty diff"
pr_fixture 'echo b >>web/src/a.ts';                      is full "web/src/a.ts"
expect_output_contains "path off the allow-list: web/src/a.ts" "names the path"
pr_fixture 'echo b >>.claude/settings.json';             is full ".claude/settings.json"
pr_fixture 'echo b >>.github/pull_request_template.md';  is full ".github/pull_request_template.md"
pr_fixture 'echo b >>scripts/ci-text-only.paths';        is full "the allow-list file itself"
pr_fixture 'echo b >>docs/a.md; echo b >>backend/A.java'; is full "docs/a.md together with a backend file"
pr_fixture 'echo b >>web/README.md';                     is full "a *.md below the root (web/README.md)"
pr_fixture 'mkdir Docs; echo b >Docs/a.md';              is full "Docs/a.md (case)"
pr_fixture 'git mv docs/a.md web/a.md';                  is full "a rename from docs/ to web/"
pr_fixture 'git mv web/src/a.ts docs/a.ts';              is full "a rename from web/ into docs/"
pr_fixture 'ln -s a.md docs/link.md';                    is full "a symlink added under docs/"
expect_output_contains "mode 120000" "names the symlink mode"
pr_fixture 'mkdir docs/sub; git -C docs/sub init -q; git -C docs/sub -c user.name=f -c user.email=f@example.invalid commit -q --allow-empty -m sub'; is full "a submodule added under docs/"
expect_output_contains "mode 160000" "names the gitlink mode"
pr_fixture 'chmod +x docs/a.md';                         is full "docs/a.md gaining the executable bit"
pr_fixture 'd=$(printf "web/x\ndocs"); mkdir -p "$d"; printf x >"$d/y.md"';   is full "a newline in a path outside the list"
pr_fixture 'printf x >"$(printf "docs/a\nb.md")"';       is full "a newline in a path under docs/ (control character)"
pr_fixture 'printf x >"web/\"q\".ts"';                   is full "a quote in a path outside the list"
pr_fixture 'echo b >>docs/a.md'
is full "a missing allow-list file" CI_SCOPE_ALLOW_FILE="$tmp/none"
expect_output_contains "allow-list missing or empty" "names the allow-list"
printf '# only a comment\n\n' >"$tmp/empty.paths"
is full "an allow-list without a pattern" CI_SCOPE_ALLOW_FILE="$tmp/empty.paths"

# G3 G-4, G-7: a base that already tracks a symlink, an executable file and a .gitmodules with ignore=all
g checkout -q --detach "$BASE" 2>/dev/null; g reset -q --hard; g clean -qffdx
(cd "$repo" && ln -s a.md docs/link && printf '#!/bin/sh\n' >docs/run.sh && chmod +x docs/run.sh \
  && printf '[submodule "docs/sub"]\n\tpath = docs/sub\n\turl = ./sub\n\tignore = all\n' >.gitmodules)
g add -A; g commit -qm base2; BASE1=$BASE; BASE=$(g rev-parse HEAD)
pr_fixture 'git rm -q docs/link';                        is full "a symlink deleted under docs/ (old mode 120000)"
expect_output_contains "mode 120000" "names the old mode"
pr_fixture 'chmod -x docs/run.sh';                       is full "docs/run.sh losing the executable bit (old mode 100755)"
pr_fixture 'echo b >>docs/a.md; mkdir docs/sub; git -C docs/sub init -q; git -C docs/sub -c user.name=f -c user.email=f@example.invalid commit -q --allow-empty -m sub'
is full "a submodule under docs/ that .gitmodules marks ignore=all (hidden from a plain diff)"
expect_output_contains "mode 160000" "names the hidden gitlink"
BASE=$BASE1
# G3 N-5: with diff.relative=true and the job in docs/, a plain diff would list only "a.md" (allowed by ^[^/]+\.md$) and hide web/src/a.ts
pr_fixture 'echo b >>docs/a.md; echo b >>web/src/a.ts'
is full "a product change hidden by diff.relative from a subdirectory" GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=diff.relative GIT_CONFIG_VALUE_0=true env -C "$repo/docs"
expect_output_contains "path off the allow-list: web/src/a.ts" "the diff is from the top level whatever the job's directory"
pr_fixture 'echo b >>docs/a.md'

echo " AC2: switch (a), pull requests"
is fast-path "a text-only PR to develop"
is full "base master" GITHUB_BASE_REF=master
is full "base feature/T-y" GITHUB_BASE_REF=feature/T-y
is full "base develop2" GITHUB_BASE_REF=develop2
is full "an event other than pull_request" GITHUB_EVENT_NAME=push
is full "a second parent that is not the event's head SHA" CI_SCOPE_PR_HEAD_SHA="$BASE"
is full "an empty head SHA" CI_SCOPE_PR_HEAD_SHA=
g checkout -q --detach "$HEADSHA"; is full "a HEAD with one parent"
g checkout -q --detach "$MERGE"
git clone -q --depth 1 "file://$repo" "$tmp/shallow" 2>/dev/null; git -C "$tmp/shallow" fetch -q --depth 1 origin "$MERGE"; git -C "$tmp/shallow" checkout -q --detach FETCH_HEAD
expect_exit 0 "a depth-1 checkout: exit 0" -- env -C "$tmp/shallow" GITHUB_EVENT_NAME=pull_request GITHUB_BASE_REF=develop CI_SCOPE_PR_HEAD_SHA="$HEADSHA" "$ROOT/scripts/ci-scope.sh" pr
expect_output_contains "verdict=full " "a depth-1 checkout (no HEAD^1): verdict full"
expect_exit 2 "no subcommand is a usage error" -- "$ROOT/scripts/ci-scope.sh"
expect_exit 2 "an unknown subcommand is a usage error" -- "$ROOT/scripts/ci-scope.sh" skip
expect_exit 2 "replay without a count is a usage error" -- "$ROOT/scripts/ci-scope.sh" replay
expect_exit 2 "replay 0 is a usage error" -- "$ROOT/scripts/ci-scope.sh" replay 0

echo " AC7: the mode file"
out_is() { if grep -qx "$1" "$OUTF"; then PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - $2"; else FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $2 (outputs: $(paste -sd' ' "$OUTF"))"; fi; }
mode_case() { # <file content (printf format)> <expected scope> <description>
  printf "$1" >"$tmp/mode"; scope pr CI_SCOPE_MODE_FILE="$tmp/mode" >/dev/null
  out_is "scope=$2" "$3: scope=$2"; out_is "verdict=fast-path" "$3: the verdict stays fast-path"
}
mode_case 'shadow\n' full "mode shadow"
mode_case '' full "an empty mode file"
mode_case 'enforce\r\n' full "enforce with a carriage return"
mode_case '\xef\xbb\xbfenforce\n' full "enforce after a byte-order mark"
mode_case 'enforce\n\n' full "enforce with two newlines"
mode_case 'Enforce\n' full "Enforce (case)"
mode_case ' enforce\n' full "enforce after a space"
mode_case 'enforce\n' fast-path "exactly enforce with a final newline"
mode_case 'enforce' fast-path "exactly enforce without a newline"
scope pr CI_SCOPE_MODE_FILE="$tmp/no-such-mode" >/dev/null; out_is "scope=full" "a missing mode file: scope=full"
pr_fixture 'echo b >>docs/a.md'; printf 'enforce\n' >"$tmp/mode"
scope pr CI_SCOPE_MODE_FILE="$tmp/mode" GITHUB_ACTIONS=true >/dev/null; out_is "scope=full" "on a runner the mode-file override is ignored (G3 G-3): scope=full"
printf '^web/\n' >"$tmp/wide.paths"; pr_fixture 'echo b >>web/src/a.ts'
scope pr CI_SCOPE_ALLOW_FILE="$tmp/wide.paths" GITHUB_ACTIONS=true >/dev/null; out_is "verdict=full" "on a runner the allow-list override is ignored: verdict=full"
scope pr CI_SCOPE_ALLOW_FILE="$tmp/wide.paths" >/dev/null; out_is "verdict=fast-path" "(control) off a runner the override works, so the two cases above test the guard"
pr_fixture 'echo b >>docs/a.md'
pr_fixture 'echo b >>web/src/a.ts'; printf 'enforce\n' >"$tmp/mode"; scope pr CI_SCOPE_MODE_FILE="$tmp/mode" >/dev/null
out_is "scope=full" "enforce mode with a full verdict: scope=full"; out_is "verdict=full" "enforce mode with a full verdict: verdict=full"
LAST_OUTPUT=$(cat "$ROOT/scripts/ci-scope.mode"); expect_output_contains "shadow" "the committed mode file holds shadow (T-M2.26 switches it)"
[[ "$(grep -vcE '^(#|$)' "$ROOT/scripts/ci-text-only.paths")" == 4 ]] && grep -qxF '^docs/' "$ROOT/scripts/ci-text-only.paths" && grep -qxF '^evidence/' "$ROOT/scripts/ci-text-only.paths" \
  && grep -qxF '^progress\.json$' "$ROOT/scripts/ci-text-only.paths" && grep -qxF '^[^/]+\.md$' "$ROOT/scripts/ci-text-only.paths" \
  && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - the allow-list holds exactly its four lines (never widened without a PO decision)"; } \
  || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - the allow-list is not the four lines of DEC-160"; }

echo " AC3: switch (b), pushes to develop"
WF=.github/workflows/web.yml
run() { jq -cn --argjson id "$1" --arg sha "$2" --arg ev "$3" --arg c "$4" --arg t "${5:-2026-11-12T10:00:00Z}" --arg path "${6:-$WF}" --arg st "${7:-completed}" \
  '{id:$id, path:$path, head_sha:$sha, event:$ev, head_branch:(if $ev == "push" then "develop" else "docs/T-x" end), status:$st, conclusion:(if $c == "" then null else $c end), created_at:$t}'; }
runs() { jq -cs '{total_count:length, workflow_runs:.}' <<<"$*"; }
job() { jq -cn --arg n "${1:-Full run on develop}" --arg c "${2:-success}" '{name:"web", steps:[{name:"Set up job",conclusion:"success"},{name:$n,conclusion:$c}]}'; }
jobs() { jq -cs '{total_count:length, jobs:.}' <<<"$*"; }
# push_fixture <snippet>: develop tip BASE, a head on top of it, HEAD = the merge commit; the mock answers "everything fine"
push_fixture() {
  pr_fixture "$1"
  rm -f "${MOCK_DIR:?}"/*; echo 0 >"$MOCK_DIR/behind.txt"
  runs "$(run 11 "$HEADSHA" pull_request success)" >"$MOCK_DIR/runs.json"
  jobs "$(job)" >"$MOCK_DIR/jobs.json"
  runs "$(run 21 "$BASE" push success)" >"$MOCK_DIR/runs-push.json"
}
pis() { local want=$1 desc=$2; shift 2
  expect_exit 0 "$desc: exit 0" -- scope push GITHUB_EVENT_NAME=push GITHUB_REF=refs/heads/develop "$@"
  expect_output_contains "verdict=$want " "$desc: verdict $want"; }

push_fixture 'echo b >>web/src/a.ts'
pis fast-path "(b1) a product merge whose head had a successful full run"
expect_output_contains "successful full run (run 11)" "(b1) names the run"
pis full "a push to master" GITHUB_REF=refs/heads/master
# G3 N-4: on a runner GH_BIN is ignored: the real gh is used (here a failing stand-in on PATH), not the mock that says "fast-path"
mkdir -p "$tmp/bin"; printf '#!/bin/sh\nexit 1\n' >"$tmp/bin/gh"; chmod +x "$tmp/bin/gh"
pis full "on a runner the GH_BIN override is ignored" GITHUB_ACTIONS=true PATH="$tmp/bin:$PATH"
pis full "a pull_request event in push mode" GITHUB_EVENT_NAME=pull_request
pis full "before is not HEAD^1 (a multi-commit push)" CI_SCOPE_BEFORE="$HEADSHA"
pis full "an empty before" CI_SCOPE_BEFORE=
pis full "an unknown workflow file" GITHUB_WORKFLOW_REF=
echo 1 >"$MOCK_DIR/behind.txt";      pis full "the merged head 1 commit behind"
: >"$MOCK_DIR/behind.txt";           pis full "an empty compare answer"
echo 0 >"$MOCK_DIR/behind.txt"; touch "$MOCK_DIR/behind.txt.fail"; pis full "a compare API error (403)"; rm "$MOCK_DIR/behind.txt.fail"
b1() { # <description>: the fixture is a product merge, so only (b1) could allow it
  pis full "(b1) $1"; expect_output_contains "no successful full run on the merged head" "(b1) $1: says why"; }
runs "$(run 11 "$HEADSHA" pull_request failure)" >"$MOCK_DIR/runs.json";                        b1 "the run failed"
runs "$(run 11 "$HEADSHA" pull_request cancelled)" >"$MOCK_DIR/runs.json";                      b1 "the run was cancelled"
runs "$(run 11 "$HEADSHA" pull_request "" "" "" in_progress)" >"$MOCK_DIR/runs.json";           b1 "the run is in progress"
runs >"$MOCK_DIR/runs.json";                                                                    b1 "no run (an empty page)"
runs "$(run 11 "$HEADSHA" pull_request success "" .github/workflows/backend.yml)" >"$MOCK_DIR/runs.json"; b1 "only another workflow's run"
runs "$(run 11 "$BASE" pull_request success)" >"$MOCK_DIR/runs.json";                           b1 "only a run on another SHA"
runs "$(run 11 "$HEADSHA" push success)" >"$MOCK_DIR/runs.json";                                b1 "only a push run on that SHA"
runs "$(run 11 "$HEADSHA" pull_request success 2026-11-12T09:00:00Z)" "$(run 12 "$HEADSHA" pull_request failure 2026-11-12T10:00:00Z)" >"$MOCK_DIR/runs.json"
b1 "an older run succeeded, the newest failed"
runs "$(run 11 "$HEADSHA" pull_request success)" | jq -c '.total_count = 101' >"$MOCK_DIR/runs.json"; b1 "an incomplete run listing"
runs "$(run 12 "$HEADSHA" pull_request failure)" "$(run 11 "$HEADSHA" pull_request success)" >"$MOCK_DIR/runs.json"
b1 "a tie on created_at: the higher run id (the failure) is the newest (G3 G-5)"
runs "$(run 11 "$HEADSHA" pull_request success)" "$(run 12 "$HEADSHA" pull_request failure | jq -c '.created_at = null')" >"$MOCK_DIR/runs.json"
b1 "a candidate run without a created_at (an unexpected shape)"
echo 'not json' >"$MOCK_DIR/runs.json";                                                         b1 "a non-JSON run listing"
runs "$(run 11 "$HEADSHA" pull_request success)" >"$MOCK_DIR/runs.json"; touch "$MOCK_DIR/runs.json.fail"
pis full "(b1) a runs API error (5xx)"; expect_output_contains "runs API error" "(b1) a runs API error: says why"; rm "$MOCK_DIR/runs.json.fail"
jobs "$(job "Full run on develop" skipped)" >"$MOCK_DIR/jobs.json";                             b1 "the marker was skipped (a fast-path run)"
jobs "$(job "Full run on feature/T-y")" >"$MOCK_DIR/jobs.json";                                 b1 "a marker for another base"
jobs "$(job "Typecheck")" >"$MOCK_DIR/jobs.json";                                               b1 "no marker step"
jobs "$(job)" "$(job "Full run on develop" skipped)" >"$MOCK_DIR/jobs.json";                    b1 "one of two jobs without a successful marker"
jobs >"$MOCK_DIR/jobs.json";                                                                    b1 "a run without jobs"
jobs "$(job)" | jq -c '.total_count = 2' >"$MOCK_DIR/jobs.json";                                b1 "an incomplete job listing"
jobs "$(job)" >"$MOCK_DIR/jobs.json"; touch "$MOCK_DIR/jobs.json.fail";                         b1 "a jobs API error"; rm "$MOCK_DIR/jobs.json.fail"
pis fast-path "(b1) the restored fixture passes again (the cases above failed for their own reason)"

# the shape of the pushed commit
g checkout -q --detach "$HEADSHA"; pis full "a one-parent commit (squash, revert, direct push)" CI_SCOPE_BEFORE="$BASE"
THIRD=$(g commit-tree "$BASE^{tree}" -p "$BASE" -m third)
OCTO=$(g commit-tree "$HEADSHA^{tree}" -p "$BASE" -p "$HEADSHA" -p "$THIRD" -m octopus); g checkout -q --detach "$OCTO"
pis full "three parents"
OTHER=$(g commit-tree "$BASE^{tree}" -p "$BASE" -p "$HEADSHA" -m other-tree); g checkout -q --detach "$OTHER"
pis full "a merge tree that differs from the second parent's"
expect_output_contains "merge tree differs" "names the tree difference"

# (b2)
push_fixture 'echo b >>docs/a.md'; runs >"$MOCK_DIR/runs.json"   # a text-only head has no full run: only (b2) can allow it
pis fast-path "(b2) a text-only merge on a green first parent"
expect_output_contains "text-only merge on a green first parent" "(b2) names the branch"
b2() { pis full "(b2) $1"; expect_output_contains "the first parent is not green" "(b2) $1: says why"; }
runs >"$MOCK_DIR/runs-push.json";                                              b2 "the first parent has no run"
runs "$(run 21 "$BASE" push "" "" "" queued)" >"$MOCK_DIR/runs-push.json";      b2 "the first parent's run is queued"
runs "$(run 21 "$BASE" push "" "" "" in_progress)" >"$MOCK_DIR/runs-push.json"; b2 "the first parent's run is in progress"
runs "$(run 21 "$BASE" push cancelled)" >"$MOCK_DIR/runs-push.json";            b2 "the first parent's run was cancelled"
runs "$(run 21 "$BASE" push failure)" >"$MOCK_DIR/runs-push.json";              b2 "the first parent's run failed"
runs "$(run 21 "$BASE" push skipped)" >"$MOCK_DIR/runs-push.json";              b2 "the first parent's run was skipped"
runs "$(run 21 "$BASE" pull_request success)" >"$MOCK_DIR/runs-push.json";      b2 "the first parent has only a pull_request run"
runs "$(run 21 "$BASE" push success | jq -c '.head_branch = "master"')" >"$MOCK_DIR/runs-push.json"; b2 "the first parent's green run is on another branch"
runs "$(run 21 "$BASE" push success 2026-11-12T09:00:00Z)" "$(run 22 "$BASE" push failure 2026-11-12T10:00:00Z)" >"$MOCK_DIR/runs-push.json"
b2 "the first parent's newest run failed after an older success"
runs "$(run 21 "$BASE" push success "" .github/workflows/backend.yml)" >"$MOCK_DIR/runs-push.json"; b2 "only another workflow is green on the first parent"
runs "$(run 21 "$BASE" push success)" >"$MOCK_DIR/runs-push.json"; touch "$MOCK_DIR/runs-push.json.fail"
pis full "(b2) a runs API error for the first parent"; rm "$MOCK_DIR/runs-push.json.fail"
push_fixture 'echo b >>web/src/a.ts'; runs >"$MOCK_DIR/runs.json"
pis full "a product merge with no full run on the head, on a green first parent"
expect_output_contains "path off the allow-list: web/src/a.ts" "says the diff is not text-only"

echo " replay"
g checkout -q -B develop "$MERGE"
LAST_OUTPUT=$(cd "$repo" && CI_SCOPE_REPLAY_REF=develop "$ROOT/scripts/ci-scope.sh" replay 5)
expect_output_contains "full (path off the allow-list: web/src/a.ts)" "replay classifies a product merge as full"
expect_output_contains "tree=same" "replay reports the tree condition"

finish
