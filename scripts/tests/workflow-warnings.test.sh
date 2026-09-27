#!/usr/bin/env bash
# T-M1.8 AC6 (DEC-055 R2-1): every `continue-on-error: true` step in .github/workflows/*.yml has an `id`, and a LATER step of the same job
# runs `if: always() && steps.<id>.outcome == 'failure'` and prints `::warning`, so a failed best-effort upload is visible, not silent.
# A small line scanner (the docs-check job has no YAML library), checked against fixtures and then run on the real workflows.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "workflow upload warnings"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT

check() { # <workflow files...> → exit 1 and one line per problem
  python3 - "$@" <<'PY'
import re, sys
problems = []
for path in sys.argv[1:]:
    lines = open(path, encoding="utf-8").read().splitlines()
    # Steps are "- " items at one indentation level inside a job's "steps:" list; a new job ("  <name>:") resets the list.
    steps, current, step_indent = [], None, None
    for line in lines:
        if re.match(r"^  [A-Za-z0-9_-]+:\s*$", line):
            if current is not None:
                steps.append(current)
            current, step_indent = None, None
            steps.append("JOB")
            continue
        m = re.match(r"^(\s*)- ", line)
        if m and (step_indent is None or len(m.group(1)) == step_indent) and re.match(r"^\s*- (name|uses|run|id|if):", line):
            if current is not None:
                steps.append(current)
            step_indent, current = len(m.group(1)), [line]
        elif current is not None:
            current.append(line)
    if current is not None:
        steps.append(current)
    for i, step in enumerate(steps):
        if step == "JOB" or not any(re.match(r"^\s*continue-on-error:\s*true\s*$", l) for l in step):
            continue
        name = next((l.split(":", 1)[1].strip() for l in step if re.match(r"^\s*-? ?name:", l)), "?")
        ids = [re.sub(r"^\s*-?\s*id:\s*", "", l).strip() for l in step if re.match(r"^\s*-?\s*id:", l)]
        if not ids:
            problems.append(f"{path}: step '{name}' has continue-on-error but no id")
            continue
        sid, warned = ids[0], False
        for later in steps[i + 1:]:
            if later == "JOB":
                break
            text = "\n".join(later)
            if re.search(r"if:\s*always\(\)\s*&&\s*steps\." + re.escape(sid) + r"\.outcome\s*==\s*'failure'", text) and "::warning" in text:
                warned = True
                break
        if not warned:
            problems.append(f"{path}: no later '::warning' step for steps.{sid}.outcome == 'failure' (step '{name}')")
for p in problems:
    print(p)
sys.exit(1 if problems else 0)
PY
}

cat >"$work/good.yml" <<'Y'
jobs:
  a:
    steps:
      - name: Upload
        id: up
        continue-on-error: true
        uses: actions/upload-artifact@x
      - name: Warn
        if: always() && steps.up.outcome == 'failure'
        run: echo "::warning title=x::y"
Y
cat >"$work/no-id.yml" <<'Y'
jobs:
  a:
    steps:
      - name: Upload
        continue-on-error: true
        uses: actions/upload-artifact@x
Y
cat >"$work/no-warning.yml" <<'Y'
jobs:
  a:
    steps:
      - name: Upload
        id: up
        continue-on-error: true
        uses: actions/upload-artifact@x
      - name: Something else
        run: echo done
Y
cat >"$work/warning-in-other-job.yml" <<'Y'
jobs:
  a:
    steps:
      - name: Upload
        id: up
        continue-on-error: true
        uses: actions/upload-artifact@x
  b:
    steps:
      - name: Warn
        if: always() && steps.up.outcome == 'failure'
        run: echo "::warning::y"
Y
cat >"$work/warning-before.yml" <<'Y'
jobs:
  a:
    steps:
      - name: Warn
        if: always() && steps.up.outcome == 'failure'
        run: echo "::warning::y"
      - name: Upload
        id: up
        continue-on-error: true
        uses: actions/upload-artifact@x
Y
cat >"$work/no-always.yml" <<'Y'
jobs:
  a:
    steps:
      - name: Upload
        id: up
        continue-on-error: true
        uses: actions/upload-artifact@x
      - name: Warn
        if: steps.up.outcome == 'failure'
        run: echo "::warning::y"
Y

expect_exit 0 "a best-effort upload followed by its warning step passes" -- check "$work/good.yml"
expect_exit 1 "a continue-on-error step without an id fails" -- check "$work/no-id.yml"
expect_output_contains "has continue-on-error but no id" "names the missing id"
expect_exit 1 "a continue-on-error step without a warning step fails" -- check "$work/no-warning.yml"
expect_output_contains "no later '::warning' step for steps.up.outcome" "names the missing warning"
expect_exit 1 "a warning step in another job does not count" -- check "$work/warning-in-other-job.yml"
expect_exit 1 "a warning step before the upload does not count" -- check "$work/warning-before.yml"
expect_exit 1 "a warning step without always() (skipped after a failure) does not count" -- check "$work/no-always.yml"
expect_exit 0 "all real workflows warn on every failed best-effort step" -- check "$ROOT"/.github/workflows/*.yml
n=$(grep -l "continue-on-error: true" "$ROOT"/.github/workflows/*.yml | wc -l)
[[ $n -ge 2 ]] && { PASS_COUNT=$((PASS_COUNT + 1)); echo "  ok   - the scan saw the real best-effort steps ($n workflow files)"; } \
  || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - expected best-effort steps in at least 2 workflow files, found $n"; }

finish
