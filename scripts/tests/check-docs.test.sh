#!/usr/bin/env bash
# Tests for the records and code-span checks of scripts/check_docs.py (T-M2.21, lessons-learned L-01, L-09).
# Each fixture is a clone of a git repository built from the committed tree (git archive HEAD); the working-tree check_docs.py
# runs against it with ENGLMS_DOCS_ROOT and ENGLMS_DOCS_BASE set to the fixture's base commit (`diff.renames copies` in one case).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "check-docs.sh (records, handoff archive, table code spans)"
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
g() { git -C "$1" -c user.name=fixture -c user.email=fixture@example.invalid -c init.defaultBranch=develop "${@:2}"; }

mkdir "$tmp/base"
git -C "$ROOT" archive HEAD | tar -x -C "$tmp/base"
g "$tmp/base" init -q && g "$tmp/base" add -A && g "$tmp/base" commit -qm base
base_sha=$(git -C "$tmp/base" rev-parse HEAD)
n=0
fixture() { n=$((n + 1)); FX="$tmp/f$n"; git clone -q "$tmp/base" "$FX"; }
check() { env -u ENGLMS_GATE_BASE ENGLMS_DOCS_ROOT="$FX" ENGLMS_DOCS_BASE="${BASE:-$base_sha}" python3 "$ROOT/scripts/check_docs.py"; }
# edit <file> <python expression over t>: rewrite a fixture file
edit() { python3 -c 'import sys,re; p=sys.argv[1]; t=open(p).read(); open(p,"w").write(eval(sys.argv[2]))' "$FX/$1" "$2"; }
one_problem() { expect_output_contains "FAIL (1 problem(s))" "$1: no other failure"; }

fixture
expect_exit 0 "clean tree passes (HEAD = base, as on develop; '**done**: …' and 'done (…)' Status forms)" -- check

# Scope 1: the backlog row of a completed task
fixture; edit docs/tasks/backlog.md 't.replace("| T-M2.20 | **done** (", "| T-M2.20 | (", 1)'
expect_exit 1 "completed task whose backlog row has no **done** fails" -- check
expect_output_contains "T-M2.20 is completed in progress.json but its row in docs/tasks/backlog.md has no cell starting with **done**" "names the task and the backlog"; one_problem "row without done"
fixture; edit docs/tasks/backlog.md 't.replace("| T-M2.20 | **done** (", "| T-M2.20 | **Done** (", 1)'
expect_exit 1 "**Done** (capital) does not count as **done**" -- check
fixture; edit docs/tasks/backlog.md 't.replace("| T-M2.20 | **done** (", "| T-M2.20 | (after T-M2.19, **done**) (", 1)'
expect_exit 1 "**done** inside the row's prose (not starting a cell) does not count" -- check
fixture; edit docs/tasks/backlog.md '"\n".join(l for l in t.split("\n") if not l.startswith("| **T-M1.1** "))'
expect_exit 1 "T-M1.1 with no row fails: the T-M1.1x rows do not match it" -- check
expect_output_contains "T-M1.1 is completed in progress.json but has no row" "names T-M1.1"; one_problem "ID prefix"
fixture; edit docs/tasks/backlog.md '"\n".join(l for l in t.split("\n") if not l.startswith("| T-M2.20 |"))'
expect_exit 1 "completed task with no backlog row fails" -- check
expect_output_contains "T-M2.20 is completed in progress.json but has no row in docs/tasks/backlog.md" "names the missing row"; one_problem "missing row"

# Scope 2: the packet Status of a completed task
fixture; edit docs/tasks/T-M2.20-m2-polish.md 're.sub(r"(?m)^\| Status \|.*\|$", "| Status | ready (G0) |", t, count=1)'
expect_exit 1 "completed task whose packet Status reads ready fails" -- check
expect_output_contains "docs/tasks/T-M2.20-m2-polish.md Status reads: ready (G0)" "names the packet and its Status"; one_problem "ready Status"
fixture; edit docs/tasks/T-M2.20-m2-polish.md 're.sub(r"(?m)^\| Status \|.*\|\n", "", t, count=1)'
expect_exit 1 "completed task whose packet has no Status row fails" -- check
expect_output_contains "docs/tasks/T-M2.20-m2-polish.md has no Status row" "names the packet"; one_problem "no Status row"
fixture; edit docs/tasks/T-M2.20-m2-polish.md 're.sub(r"(?m)^\| Status \|.*\|$", "| Status | ready |", t, count=1)'
edit docs/tasks/T-M2.20-m2-polish.md '"```\n| Status | done |\n```\n" + t'
expect_exit 1 "a done Status row in a fenced block before the real one does not count" -- check

# Scope 3: HANDOFF.md changed without a new archive file
fixture; echo "x" >>"$FX/docs/handoff/HANDOFF.md"
expect_exit 1 "uncommitted HANDOFF.md change without an archive file fails" -- check
expect_output_contains "docs/handoff/HANDOFF.md changed since $base_sha without a new file under docs/handoff/archive/" "names the handoff and the base"; one_problem "uncommitted handoff"
g "$FX" commit -qam "handoff only"
expect_exit 1 "committed HANDOFF.md change without an archive file fails" -- check
echo "old" >"$FX/docs/handoff/archive/29991231T0000Z-T-X.md"
expect_exit 0 "with an untracked new archive file it passes" -- check
g "$FX" add -A && g "$FX" commit -qm archive
expect_exit 0 "with a committed new archive file it passes" -- check
rm "$FX/docs/handoff/archive/29991231T0000Z-T-X.md"
expect_exit 1 "an archive file committed, then deleted in the working tree, does not count" -- check
fixture; old=$(git -C "$FX" ls-files docs/handoff/archive | head -n 1); g "$FX" rm -q "$old"; echo "x" >>"$FX/docs/handoff/HANDOFF.md"
g "$FX" commit -qam "an old archive file removed"
expect_exit 1 "deleting an old archive file is not archiving" -- check
fixture; echo "x" >>"$FX/docs/handoff/HANDOFF.md"; touch "$FX/docs/handoff/archive/.DS_Store"
expect_exit 1 "a git-ignored file in the archive folder (.DS_Store) is not an archive file" -- check
fixture; g "$FX" config diff.renames copies
g "$FX" mv docs/handoff/HANDOFF.md docs/handoff/archive/29991231T0000Z-T-X.md && echo "# new" >"$FX/docs/handoff/HANDOFF.md"
g "$FX" add -A && g "$FX" commit -qm "git mv archive"
expect_exit 0 "git mv to the archive plus a new HANDOFF.md passes" -- check
fixture; BASE=origin/does-not-exist expect_exit 1 "an unknown ENGLMS_DOCS_BASE fails closed" -- check
expect_output_contains "cannot diff against base ref 'origin/does-not-exist' (ENGLMS_DOCS_BASE)" "names the ref and the variable"
expect_exit 1 "an unknown ENGLMS_GATE_BASE (no ENGLMS_DOCS_BASE) fails closed" -- \
  env -u ENGLMS_DOCS_BASE ENGLMS_GATE_BASE=origin/nope ENGLMS_DOCS_ROOT="$FX" python3 "$ROOT/scripts/check_docs.py"
expect_output_contains "cannot diff against base ref 'origin/nope' (ENGLMS_GATE_BASE)" "names ENGLMS_GATE_BASE"

# Scope 4: a bare pipe in a table-row code span
fixture; printf '| a | `a|b` |\n|---|---|\n' >"$FX/docs/fixture-pipe.md"
expect_exit 1 "a bare pipe in a table-row code span fails" -- check
expect_output_contains "docs/fixture-pipe.md:1: \`a|b\`" "names file:line and the span"; one_problem "bare pipe"
fixture; printf '| a | ``a|b`` |\n|---|---|\n' >"$FX/docs/fixture-pipe.md"
expect_exit 1 "a bare pipe in a double-backtick span fails" -- check
fixture; printf '| a | `a\\|b` |\n|---|---|\n\nA paragraph with `a|b`.\n\n```\n| a | `a|b` |\n```\n' >"$FX/docs/fixture-pipe.md"
expect_exit 0 "an escaped pipe in a table, a bare one in a paragraph and one in a fenced block pass" -- check
fixture; mkdir -p "$FX/.claude/scratch" && printf '| a | `a|b` |\n' >"$FX/.claude/scratch/x.md"
expect_exit 0 "a git-ignored Markdown file is not read" -- check
# T-M2.23 AC6 (T-M2.22 U2 constraint 7, attack A-7): the standing check behind the text-only CI fast path
to() { expect_output_contains "text-only CI: $1" "$2"; one_problem "$2"; }
fixture; ln -s a.md "$FX/docs/link.md"; g "$FX" add -A
expect_exit 1 "a tracked symlink fails" -- check
to "tracked symlink 'docs/link.md'" "symlink"
fixture; g "$FX" update-index --add --cacheinfo "160000,$base_sha,docs/sub"
expect_exit 1 "a tracked submodule (gitlink) fails" -- check
to "tracked submodule 'docs/sub'" "gitlink"
fixture; echo "export const guide = await fetch('../docs/guide.md')" >"$FX/web/src/reads-docs.ts"; g "$FX" add -A
expect_exit 1 "a new web/ file that mentions docs/ fails" -- check
to "web/src/reads-docs.ts mentions an allow-listed path (1 line(s)) and is not in scripts/ci-text-only.known-mentions" "new mention"
fixture; echo "const p = join(ROOT, 'docs', name)" >"$FX/e2e/support/reads.ts"; g "$FX" add -A
expect_exit 1 "join(ROOT, 'docs', name) in a new e2e/ file fails (a path built from quoted parts, G0 D-7)" -- check
to "e2e/support/reads.ts mentions an allow-listed path" "quoted token"
fixture; echo "steps: [{ run: cat progress.json }]" >"$FX/.github/workflows/reads.yml"; g "$FX" add -A
expect_exit 1 "a workflow that mentions progress.json fails" -- check
to ".github/workflows/reads.yml mentions an allow-listed path" "workflow mention"
fixture; echo "const notes = 'CHANGELOG.md'" >"$FX/backend/Notes.java"; g "$FX" add -A
expect_exit 1 "a backend file that names a root *.md fails" -- check
to "backend/Notes.java mentions an allow-listed path" "root md name"
fixture; echo "// see docs/x.md" >>"$FX/e2e/support/evidence.ts"
expect_exit 1 "a listed file that gains one more mentioning line fails (G0 D-6)" -- check
to "e2e/support/evidence.ts has 5 line(s) mentioning an allow-listed path, scripts/ci-text-only.known-mentions records 4" "count changed"
fixture; echo "// see docs/x.md" >>"$FX/scripts/gate.sh"
expect_exit 0 "a scripts/ tooling file listed with '*' may gain a mention" -- check
fixture; echo '^api/' >>"$FX/scripts/ci-text-only.paths"
expect_exit 1 "an allow-list line without a token set fails (the two cannot drift, G0 D-8)" -- check
expect_output_contains "allow-list line '^api/' has no mention tokens" "names the allow-list line"
fixture; : >"$FX/scripts/ci-text-only.paths"
expect_exit 1 "an empty allow-list fails" -- check
to "scripts/ci-text-only.paths is missing or holds no pattern" "empty allow-list"
fixture; echo "web/src/none.ts 1 comments only" >>"$FX/scripts/ci-text-only.known-mentions"
expect_exit 1 "a listed path that is not tracked fails (the list cannot rot)" -- check
to "lists web/src/none.ts, which is not tracked or no longer mentions" "rotten entry"
fixture; edit scripts/ci-text-only.known-mentions 're.sub(r"(?m)^(e2e/support/evidence\.ts) 4 ", r"\1 * ", t)'
expect_exit 1 "'*' outside scripts/ fails" -- check
to "'*' is allowed only for scripts/" "star outside scripts"
fixture; echo "e2e/support/evidence.ts" >>"$FX/scripts/ci-text-only.known-mentions"
expect_exit 1 "a known-mentions line without a count and a reason fails" -- check
expect_output_contains "expected '<path> <count|*> <reason>'" "names the format"

finish
