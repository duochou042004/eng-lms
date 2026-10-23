#!/usr/bin/env python3
"""Docs gate for Eng-LMS (quality-gates G1 for docs; CI job `docs-check` from T-M1.1).

Checks:
  1. progress.json validates against docs/09-harness/schemas/progress.schema.json
  2. Immutable sources match the SHA-256 recorded in progress.json
  3. Relative Markdown links resolve (files and directories), excluding docs/00-sources
  4. Every referenced ID exists: OQ-nn, DEC-nnn, ADR-nnnn, R-nn, A-nnn, FR-*, NFR-*
  5. docs/handoff/next-session-prompt.md is <= 4000 characters
  6. Records (T-M2.21, lessons-learned L-09): a task in progress.json completed[] has `**done**` in its backlog row and a packet
     Status starting with `done`; a changed docs/handoff/HANDOFF.md comes with a new file under docs/handoff/archive/
  7. No table-row code span holds an unescaped pipe (it splits the row on GitHub)
Env: ENGLMS_DOCS_ROOT (default: this repository), ENGLMS_DOCS_BASE (the handoff check's base ref; default ENGLMS_GATE_BASE,
then origin/develop; an unknown base fails).
Exit code 0 = pass, 1 = failures (listed).
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("ENGLMS_DOCS_ROOT") or Path(__file__).resolve().parent.parent).resolve()
failures: list[str] = []


def fail(msg: str) -> None:
    failures.append(msg)


def md_files() -> list[Path]:
    skip_parts = {".git", "node_modules", "00-sources"}
    return [p for p in ROOT.rglob("*.md") if not (skip_parts & set(p.relative_to(ROOT).parts))]


def check_progress() -> dict:
    try:
        import jsonschema  # type: ignore
    except ImportError:
        fail("python package 'jsonschema' is not installed (pip install jsonschema)")
        return {}
    progress_path = ROOT / "progress.json"
    schema_path = ROOT / "docs/09-harness/schemas/progress.schema.json"
    try:
        progress = json.loads(progress_path.read_text(encoding="utf-8"))
        schema = json.loads(schema_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"progress/schema unreadable: {exc}")
        return {}
    validator = jsonschema.Draft202012Validator(schema)
    for err in sorted(validator.iter_errors(progress), key=lambda e: list(e.path)):
        loc = "/".join(str(p) for p in err.path) or "<root>"
        fail(f"progress.json: {loc}: {err.message}")
    return progress


def check_sources(progress: dict) -> None:
    for src in progress.get("project", {}).get("sources", []):
        path = ROOT / src["path"]
        if not path.exists():
            fail(f"source missing: {src['path']}")
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != src["sha256"]:
            fail(f"source modified (immutable!): {src['path']} sha256={digest}")


LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)")


def check_links(files: list[Path]) -> None:
    for md in files:
        text = md.read_text(encoding="utf-8")
        # ignore fenced code blocks
        text = re.sub(r"```.*?```", "", text, flags=re.S)
        for target in LINK_RE.findall(text):
            if re.match(r"^(https?:|mailto:|tel:|#)", target):
                continue
            path_part = target.split("#", 1)[0]
            if not path_part:
                continue
            resolved = (md.parent / path_part).resolve()
            if not resolved.exists():
                fail(f"broken link in {md.relative_to(ROOT)} -> {target}")


def _ids_in_table(rel: str, pattern: str) -> set[str]:
    """IDs defined as the first cell of a Markdown table row in the given doc."""
    path = ROOT / rel
    if not path.exists():
        fail(f"definition file missing: {rel}")
        return set()
    return set(re.findall(pattern, path.read_text(encoding="utf-8"), flags=re.M))


def defined_ids() -> dict[str, set[str]]:
    adr_dir = ROOT / "docs/03-architecture/adr"
    return {
        "OQ": _ids_in_table("docs/10-governance/open-questions.md", r"^\| \**(OQ-\d{2})"),
        "DEC": _ids_in_table("docs/10-governance/decision-log.md", r"^\| (DEC-\d{3})"),
        "R": _ids_in_table("docs/10-governance/risk-register.md", r"^\| (R-\d{2})"),
        "A": _ids_in_table("docs/01-product/assumptions.md", r"^\| (A-\d{3})"),
        "ADR": {m.group(1) for f in adr_dir.glob("ADR-*.md") if (m := re.match(r"(ADR-\d{4})", f.name))},
        "FR": _ids_in_table("docs/02-requirements/functional-requirements.md", r"^\| (FR-[A-Z]+-\d{2})"),
        "NFR": _ids_in_table("docs/02-requirements/non-functional-requirements.md", r"^\| (NFR-[A-Z0-9]+-\d{2})"),
    }


REF_PATTERNS = {
    "OQ": r"\bOQ-\d{2}\b",
    "DEC": r"\bDEC-\d{3}\b",
    "R": r"\bR-\d{2}\b",
    "A": r"\bA-\d{3}\b",
    "ADR": r"\bADR-\d{4}\b",
    "FR": r"\bFR-[A-Z]+-\d{2}\b",
    "NFR": r"\bNFR-[A-Z0-9]+-\d{2}\b",
}


def check_refs(files: list[Path], defined: dict[str, set[str]]) -> None:
    for md in files + [ROOT / "progress.json"]:
        text = md.read_text(encoding="utf-8")
        for kind, pattern in REF_PATTERNS.items():
            for ref in set(re.findall(pattern, text)):
                if ref not in defined[kind]:
                    fail(f"undefined reference {ref} in {md.relative_to(ROOT)}")


def check_prompt() -> None:
    p = ROOT / "docs/handoff/next-session-prompt.md"
    if not p.exists():
        fail("docs/handoff/next-session-prompt.md missing")
        return
    n = len(p.read_text(encoding="utf-8"))
    if n > 4000:
        fail(f"next-session prompt is {n} chars (> 4000)")


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", str(ROOT), "-c", "core.quotePath=false", *args],
                          capture_output=True, text=True, check=True).stdout


def unfenced(text: str):
    """(line number, line) for each line outside a ``` fenced block."""
    fenced = False
    for n, line in enumerate(text.splitlines(), 1):
        if line.lstrip().startswith("```"):
            fenced = not fenced
        elif not fenced:
            yield n, line


def check_done_records(progress: dict) -> None:
    backlog = (ROOT / "docs/tasks/backlog.md").read_text(encoding="utf-8")
    for task in progress.get("completed", []):
        tid = task["id"]
        row = next((l for _, l in unfenced(backlog) if re.match(rf"^\| \**{re.escape(tid)}\**[ |]", l)), None)
        if row is None:
            fail(f"records: {tid} is completed in progress.json but has no row in docs/tasks/backlog.md")
        elif "**done**" not in row:
            fail(f"records: {tid} is completed in progress.json but its row in docs/tasks/backlog.md has no **done**")
        for packet in sorted((ROOT / "docs/tasks").glob(f"{tid}-*.md")):
            rel = packet.relative_to(ROOT)
            status = next((m.group(1) for _, l in unfenced(packet.read_text(encoding="utf-8"))
                           if (m := re.match(r"^\| Status \|(.*)\|\s*$", l))), None)
            if status is None:
                fail(f"records: {tid} is completed but {rel} has no Status row")
            elif not status.strip(" *").startswith("done"):
                fail(f"records: {tid} is completed but {rel} Status reads: {status.strip()}")


HANDOFF = "docs/handoff/HANDOFF.md"


def check_handoff_archived() -> None:
    var, base = next(((v, os.environ[v]) for v in ("ENGLMS_DOCS_BASE", "ENGLMS_GATE_BASE") if os.environ.get(v)),
                     ("default", "origin/develop"))
    try:
        git("rev-parse", "--verify", "-q", f"{base}^{{commit}}")
        committed = git("diff", "--no-renames", "--name-status", f"{base}...HEAD")
        worktree = git("diff", "--no-renames", "--name-status", "HEAD")
        untracked = git("ls-files", "--others", "--exclude-standard")
    except (OSError, subprocess.CalledProcessError):
        fail(f"handoff: cannot diff against base ref '{base}' ({var}); set ENGLMS_DOCS_BASE to a resolvable ref")
        return
    changes = [l.split("\t", 1) for l in (committed + worktree).splitlines() if "\t" in l]
    changes += [["?", path] for path in untracked.splitlines()]
    if any(path == HANDOFF for _, path in changes) and not any(
            status in ("A", "?") and path.startswith("docs/handoff/archive/") for status, path in changes):
        fail(f"handoff: {HANDOFF} changed since {base} without a new file under docs/handoff/archive/ (archive the old one)")


SPAN_RE = re.compile(r"(?<!`)(`+)(?!`)(.+?)(?<!`)\1(?!`)")


def check_table_code_spans() -> None:
    try:
        listed = git("ls-files", "--cached", "--others", "--exclude-standard", "--", "*.md")
    except (OSError, subprocess.CalledProcessError) as exc:
        fail(f"code spans: cannot list Markdown files with git: {exc}")
        return
    for rel in sorted(set(listed.splitlines())):
        path = ROOT / rel
        if rel.startswith("docs/00-sources/") or not path.is_file():
            continue
        for n, line in unfenced(path.read_text(encoding="utf-8")):
            if not line.lstrip().startswith("|"):
                continue
            for m in SPAN_RE.finditer(line):
                if re.search(r"(?<!\\)\|", m.group(2)):
                    fail(f"code span in a table row holds an unescaped pipe (write \\|): {rel}:{n}: {m.group(0)}")


def main() -> int:
    files = md_files()
    progress = check_progress()
    if progress:
        check_sources(progress)
    check_links(files)
    check_refs(files, defined_ids())
    check_prompt()
    if progress:
        check_done_records(progress)
    check_handoff_archived()
    check_table_code_spans()
    if failures:
        print(f"docs-check: FAIL ({len(failures)} problem(s))")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"docs-check: PASS ({len(files)} markdown files, progress.json valid, sources intact, prompt within limit, records consistent, "
          "handoff archived, table code spans escaped)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
