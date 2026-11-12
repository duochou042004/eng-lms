#!/usr/bin/env bash
# T-M2.23 AC4 (constraints 1, 4, 5, 8): the five heavy workflows are wired to scripts/ci-scope.sh exactly as ci-cd.md §1 says, and
# docs-check / secrets-scan always run in full. A line scanner (the docs-check job has no YAML library), run on the real workflows
# and on mutated copies: every rule is seen failing (lessons-learned L-01).
set -uo pipefail
source "$(dirname "$0")/lib.sh"
echo "ci-scope workflow wiring"
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT

check() { # <workflow dir> → exit 1 and one line per problem
  python3 - "$1" <<'PY'
import re, sys
from pathlib import Path
HEAVY = {"backend.yml", "web.yml", "contract-drift.yml", "e2e-smoke.yml", "container.yml"}
ALWAYS_FULL = {"docs-check.yml", "secrets-scan.yml"}
COND = "steps.scope.outputs.scope != 'fast-path'"
ALLOWED_IF = {COND, "always() && " + COND}
EXEMPT_IF = re.compile(r"^(failure\(\)|always\(\) && steps\.[A-Za-z0-9_-]+\.outcome == 'failure')$")
MARKER_NAME = "Full run on ${{ github.base_ref || github.ref_name }}"
MARKER_IF = "steps.scope.outputs.verdict != 'fast-path'"
problems = []
def key(step, k):  # values of a step-level key (8 spaces, or on the "- " line)
    return [m.group(1).strip() for l in step for m in [re.match(rf"""^      (?:- |  )["']?{k}["']?\s*:(.*)$""", l)] if m]
for path in sorted(Path(sys.argv[1]).glob("*.y*ml")):
    name, text = path.name, path.read_text(encoding="utf-8")
    lines = text.splitlines()
    def bad(msg): problems.append(f"{name}: {msg}")
    if name in ALWAYS_FULL:
        if re.search(r"steps\.scope\.|id:\s*scope\b|ci-scope\.sh", text):
            bad("an always-full workflow must not use the CI scope")
        continue
    if name not in HEAVY:
        bad("a workflow that is neither heavy nor always-full (add it to this test and wire it, or list it as always-full)")
        continue
    wf = next((l.split(":", 1)[1].strip() for l in lines if l.startswith("name:")), "?")
    if re.search(r"""^\s*["']?paths(-ignore)?["']?\s*:""", text, re.M): bad("a paths filter (a required check must always report)")
    if re.search(r"CI_SCOPE_ALLOW_FILE|CI_SCOPE_MODE_FILE|GH_BIN", text): bad("a test override of ci-scope.sh (CI_SCOPE_ALLOW_FILE, CI_SCOPE_MODE_FILE, GH_BIN) must not be set in a workflow")
    if re.search(r"""\bshell["']?\s*:""", text): bad("a shell: override is not allowed (it can turn a run step into a no-op)")
    # G3 N-2: YAML spellings a line scanner cannot read reliably are refused outright
    if re.search(r""""[^"\n]*\\[^"\n]*"\s*:""", text): bad("a quoted key with an escape is not allowed")
    if re.search(r"^\s*(- )?\?(\s|$)", text, re.M): bad("a complex key (? ) is not allowed")
    if re.search(r"^\s*(- )?(<<|[!&*])", text, re.M): bad("a tagged, anchored, aliased or merge key is not allowed")
    if re.search(r"(?<![${])\{(?!\{)", "\n".join(l for l in lines if not l.lstrip().startswith("#"))): bad("a flow mapping ({ ... }) is not allowed")
    if not re.search(r"^permissions:\n(  .*\n)*?  actions: read\b", text, re.M): bad("permissions lacks 'actions: read'")
    group = f"  group: {wf}-${{{{ github.event_name == 'push' && github.sha || github.ref }}}}"
    if group not in lines: bad("the concurrency group must hold github.sha for pushes: " + group.strip())
    if "jobs:" not in lines: bad("no jobs"); continue
    body = lines[lines.index("jobs:") + 1:]
    jobs = [l for l in body if re.match(r"^  [A-Za-z0-9_-]+:\s*$", l)]
    if len(jobs) != 1: bad(f"exactly one job expected, found {len(jobs)}")
    for l in body:
        m = re.match(r"""^    ["']?(if|strategy|uses|continue-on-error)["']?\s*:""", l)
        if m: bad("job-level '" + m.group(1) + "' is not allowed")
    steps, cur = [], None
    for l in body:
        if re.match(r"^      - ", l):
            if cur is not None: steps.append(cur)
            cur = [l]
        elif cur is not None and not re.match(r"^      #", l):
            cur.append(l)
    if cur is not None: steps.append(cur)
    # G3 P-1: key() reads one line, so a plain scalar continued on a more-indented line is refused (block scalars | and > are fine)
    prev, block = None, None
    for l in body:
        if not l.strip() or l.lstrip().startswith("#"): continue
        ind = len(l) - len(l.lstrip(" "))
        if block is not None and ind > block: continue
        block = None
        if prev is not None and ind > prev: bad("a value continued on the next line is not allowed (use | or >): " + l.strip()); prev = None; continue
        m = re.match(r"""^( *(?:- )?)[^\s#][^:]*:(?:\s+(.*))?$""", l)
        v = re.sub(r"(^|\s)#.*$", "", (m.group(2) or "") if m else l).strip()
        if m and re.fullmatch(r"[|>][-+0-9]*", v): block, prev = len(m.group(1)), None
        else: prev = (len(m.group(1)) if m else ind) if v else None
    if len(steps) < 4: bad("too few steps"); continue
    first, scope, last, middle = steps[0], steps[1], steps[-1], steps[2:-1]
    if not any(re.match(r"""^["']?actions/checkout@""", v) for v in key(first, "uses")) or key(first, "if"): bad("the first step must be an unconditional checkout")
    if not any(re.match(r"^          fetch-depth: 2\b", l) for l in first): bad("checkout needs fetch-depth: 2")
    if key(scope, "id") != ["scope"]: bad("the step after checkout must be the scope step (id: scope)")
    if key(scope, "if"): bad("the scope step must not have an if:")
    if key(scope, "continue-on-error"): bad("the scope step must not have continue-on-error")
    if key(scope, "run") != ['./scripts/ci-scope.sh "$CI_SCOPE_KIND"']: bad("the scope step must run ./scripts/ci-scope.sh \"$CI_SCOPE_KIND\"")
    if "          CI_SCOPE_KIND: ${{ github.event_name == 'pull_request' && 'pr' || 'push' }}" not in scope: bad("the scope step's CI_SCOPE_KIND is not the fixed expression")
    for s in middle:
        label = (key(s, "name") or key(s, "uses") or ["?"])[0]
        ifs = key(s, "if")
        if key(s, "id") == ["scope"]: bad("a second step with id: scope")
        if label.startswith("Full run on"): bad(f"step '{label}': only the last step may be named like the marker")
        if len(ifs) != 1: bad(f"step '{label}': exactly one if: expected, found {len(ifs)}"); continue
        diagnostic = any("actions/upload-artifact@" in v for v in key(s, "uses")) or any(re.fullmatch(r'echo "::warning[^"$`\\]*"', v) for v in key(s, "run"))
        if EXEMPT_IF.match(ifs[0]) and not diagnostic:
            bad(f"step '{label}': a failure-only if: is allowed only on an upload-artifact step or an echo \"::warning step")
        elif ifs[0] not in ALLOWED_IF and not EXEMPT_IF.match(ifs[0]):
            bad(f"step '{label}': if: must be exactly \"{COND}\" (optionally after \"always() && \") or a failure-only form, found: {ifs[0]}")
        if key(s, "continue-on-error") and not any("actions/upload-artifact@" in v for v in key(s, "uses")):
            bad(f"step '{label}': continue-on-error is allowed only on an upload-artifact step")
    if key(last, "name") != [MARKER_NAME]: bad("the last step must be the marker: " + MARKER_NAME)
    if key(last, "if") != [MARKER_IF]: bad("the marker's if: must be exactly: " + MARKER_IF)
    if key(last, "continue-on-error"): bad("the marker must not have continue-on-error")
for p in problems: print(p)
sys.exit(1 if problems else 0)
PY
}

expect_exit 0 "the real workflows are wired correctly" -- check "$ROOT/.github/workflows"

# mutate <file> <python expression over t> <expected message> <description>: one rule seen failing on a copy
mutate() {
  rm -rf "$work/wf"; mkdir "$work/wf"; cp "$ROOT"/.github/workflows/*.yml "$work/wf/"
  python3 -c 'import sys,re; p=sys.argv[1]; t=open(p).read(); n=eval(sys.argv[2]); assert n!=t, "the mutation changed nothing"; open(p,"w").write(n)' "$work/wf/$1" "$2" \
    || { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  FAIL - $4 (mutation not applied)"; return; }
  expect_exit 1 "$4" -- check "$work/wf"
  expect_output_contains "$3" "$4: names the problem"
}
C="steps.scope.outputs.scope != 'fast-path'"
mutate web.yml 't.replace("on:\n  pull_request:\n", "on:\n  pull_request:\n    paths: [web/**]\n")' "a paths filter" "constraint 1: a paths filter"
mutate web.yml 't.replace("    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    if: github.event_name == \"push\"\n")' "job-level 'if' is not allowed" "constraint 1: a job-level if:"
mutate web.yml 't.replace("    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    strategy:\n      matrix:\n        n: [1, 2]\n")' "job-level 'strategy' is not allowed" "a matrix"
mutate web.yml 't + "  second:\n    runs-on: ubuntu-24.04\n    steps:\n      - run: true\n"' "exactly one job expected, found 2" "a second job without the wiring"
mutate backend.yml 't.replace("  actions: read", "  issues: read")' "permissions lacks 'actions: read'" "constraint 8: no actions: read"
mutate e2e-smoke.yml 't.replace("github.event_name == '"'push'"' && github.sha || github.ref", "github.ref")' "the concurrency group must hold github.sha" "constraint 5: a group without the SHA for pushes"
mutate e2e-smoke.yml 't.replace("          fetch-depth: 2", "          fetch-depth: 1")' "checkout needs fetch-depth: 2" "constraint 8: fetch-depth 1"
mutate web.yml 't.replace("        id: scope\n", "        id: scope\n        continue-on-error: true\n")' "the scope step must not have continue-on-error" "constraint 4: continue-on-error on the scope step"
mutate web.yml 't.replace("        id: scope\n", "        id: scope\n        if: github.event_name == \"push\"\n")' "the scope step must not have an if:" "constraint 4: an if: on the scope step"
mutate web.yml 't.replace("        id: scope\n", "        id: classify\n")' "must be the scope step (id: scope)" "the scope step renamed"
mutate web.yml 't.replace("./scripts/ci-scope.sh \"$CI_SCOPE_KIND\"", "./scripts/ci-scope.sh \"$CI_SCOPE_KIND\" || true")' "the scope step must run" "the scope step's failure swallowed"
mutate web.yml 't.replace("&& '"'pr'"' || '"'push'"' }}", "&& '"'push'"' || '"'push'"' }}")' "CI_SCOPE_KIND is not the fixed expression" "the scope kind changed"
mutate e2e-smoke.yml 't.replace("        if: '"$C"'\n        run: ./scripts/e2e-run.sh", "        if: steps.scope.outputs.scope == '"'full'"'\n        run: ./scripts/e2e-run.sh")' "if: must be exactly" "constraint 4: reversed polarity (== 'full') on a heavy step"
mutate e2e-smoke.yml 't.replace("        if: '"$C"'\n        run: ./scripts/e2e-run.sh", "        run: ./scripts/e2e-run.sh")' "exactly one if: expected, found 0" "a heavy step without the condition"
mutate e2e-smoke.yml 't.replace("        if: '"$C"'\n        run: ./scripts/e2e-run.sh", "        if: '"$C"' && github.event_name == '"'push'"'\n        run: ./scripts/e2e-run.sh")' "if: must be exactly" "G0 D-9: an extra conjunct on a heavy step"
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw", "        if: '"$C"'\n        continue-on-error: true\n        run: ./mvnw")' "continue-on-error is allowed only on an upload-artifact step" "continue-on-error on a heavy step"
mutate web.yml 't.replace("      - name: Typecheck\n", "      - name: Full run on develop\n")' "only the last step may be named like the marker" "a heavy step named like the marker"
mutate web.yml 't.replace("        if: steps.scope.outputs.verdict != '"'fast-path'"'", "        if: always()")' "the marker's if: must be exactly" "the marker with always()"
mutate web.yml 't.replace("      - name: Full run on ${{ github.base_ref || github.ref_name }}", "      - name: Full run on develop")' "the last step must be the marker" "the marker with a fixed base name"
mutate web.yml 't + "      - name: After the marker\n        if: '"$C"'\n        run: true\n"' "the last step must be the marker" "a step after the marker"
mutate docs-check.yml 't.replace("      - name: Docs gate", "      - name: CI scope\n        id: scope\n        run: ./scripts/ci-scope.sh pr\n      - name: Docs gate")' "an always-full workflow must not use the CI scope" "docs-check with a scope step"
mutate secrets-scan.yml 't.replace("      - name: Scan full git history\n", "      - name: Scan full git history\n        if: steps.scope.outputs.scope != '"'fast-path'"'\n")' "an always-full workflow must not use the CI scope" "secrets-scan with a scope condition"
# G3 G-3: spellings and settings the first scanner did not see
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw", "        if: '"$C"'\n        \"continue-on-error\": true\n        run: ./mvnw")' "continue-on-error is allowed only on an upload-artifact step" "a quoted continue-on-error key on a heavy step"
mutate web.yml 't.replace("        id: scope\n", "        id: scope\n        \"if\": false\n")' "the scope step must not have an if:" "a quoted if key on the scope step"
mutate web.yml 't.replace("        id: scope\n", "        id: scope\n        continue-on-error : true\n")' "the scope step must not have continue-on-error" "continue-on-error with a space before the colon on the scope step"
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw", "        if: failure()\n        run: ./mvnw")' "a failure-only if: is allowed only on an upload-artifact step" "a heavy step hidden behind if: failure()"
mutate web.yml 't.replace("          GH_TOKEN: ", "          CI_SCOPE_MODE_FILE: /dev/null\n          GH_TOKEN: ")' "a test override of ci-scope.sh" "CI_SCOPE_MODE_FILE set on the scope step"
mutate web.yml 't.replace("          GH_TOKEN: ", "          CI_SCOPE_ALLOW_FILE: web/allow\n          GH_TOKEN: ")' "a test override of ci-scope.sh" "CI_SCOPE_ALLOW_FILE set on the scope step"
mutate web.yml 't.replace("permissions:\n", "env:\n  GH_BIN: /bin/true\npermissions:\n")' "a test override of ci-scope.sh" "GH_BIN set at workflow level"
mutate web.yml 't.replace("        working-directory: web\n", "        working-directory: web\n        shell: \"true {0}\"\n")' "a shell: override is not allowed" "a job default shell that runs nothing"
mutate web.yml 't.replace("    runs-on: ubuntu-24.04\n", "    runs-on: ubuntu-24.04\n    \"if\": false\n")' "job-level 'if' is not allowed" "a quoted job-level if"
# G3 round 2 (N-2): five edits the reworked scanner still let through
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw -B -ntp verify", "        if: failure()\n        run: echo \"::warning::v\" \u0026\u0026 ./mvnw -B -ntp verify")' "a failure-only if: is allowed only on an upload-artifact step" "a heavy command chained after a ::warning echo behind if: failure()"
mutate web.yml 't.replace("permissions:\n", "defaults: {run: {shell: \"true {0}\"}}\npermissions:\n")' "a shell: override is not allowed" "a flow-style default shell"
mutate web.yml 't.replace("permissions:\n", "defaults: {run: {working-directory: web}}\npermissions:\n")' "a flow mapping ({ ... }) is not allowed" "a flow mapping"
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw", "        if: '"$C"'\n        \"continue-on-erro\\u0072\": true\n        run: ./mvnw")' "a quoted key with an escape is not allowed" "an escaped quoted continue-on-error key"
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw", "        if: '"$C"'\n        ? continue-on-error\n        : true\n        run: ./mvnw")' "a complex key (? ) is not allowed" "a complex continue-on-error key"
mutate web.yml 't.replace("uses: actions/checkout@", "uses: evil/actions/checkout@", 1)' "the first step must be an unconditional checkout" "a checkout look-alike from another owner"
# G3 round 3 (P-1, P-2): plain scalars continued on the next line, and tagged or anchored keys
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw -B -ntp verify", "        if: failure()\n        run: echo \"::warning::v\"\n          \u0026\u0026 ./mvnw -B -ntp verify")' "a value continued on the next line is not allowed" "a heavy command folded onto a ::warning echo"
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw -B -ntp verify", "        if: '"$C"'\n        run: ./mvnw -B -ntp verify\n          \u0026\u0026 false")' "a value continued on the next line is not allowed" "a heavy step folded into a no-op"
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw", "        if: '"$C"'\n        !!str continue-on-error: true\n        run: ./mvnw")' "a tagged, anchored, aliased or merge key is not allowed" "a tagged continue-on-error key"
mutate backend.yml 't.replace("        if: '"$C"'\n        run: ./mvnw", "        if: '"$C"'\n        \u0026a continue-on-error: true\n        run: ./mvnw")' "a tagged, anchored, aliased or merge key is not allowed" "an anchored continue-on-error key"
rm -rf "$work/wf"; mkdir "$work/wf"; cp "$ROOT"/.github/workflows/*.yml "$work/wf/"; cp "$work/wf/web.yml" "$work/wf/new.yml"
expect_exit 1 "a new workflow that is in neither list fails" -- check "$work/wf"
expect_output_contains "neither heavy nor always-full" "a new workflow: names the problem"

finish
