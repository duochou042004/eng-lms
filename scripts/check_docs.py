#!/usr/bin/env python3
"""Docs gate for Eng-LMS (quality-gates G1 for docs; CI job `docs-check` from T-M1.1).

Checks:
  1. progress.json validates against docs/09-harness/schemas/progress.schema.json
  2. Immutable sources match the SHA-256 recorded in progress.json
  3. Relative Markdown links resolve (files and directories), excluding docs/00-sources
  4. Every referenced ID exists: OQ-nn, DEC-nnn, ADR-nnnn, R-nn, A-nnn, FR-*, NFR-*
  5. docs/handoff/next-session-prompt.md is <= 4000 characters
Exit code 0 = pass, 1 = failures (listed).
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
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


def main() -> int:
    files = md_files()
    progress = check_progress()
    if progress:
        check_sources(progress)
    check_links(files)
    check_refs(files, defined_ids())
    check_prompt()
    if failures:
        print(f"docs-check: FAIL ({len(failures)} problem(s))")
        for f in failures:
            print(f"  - {f}")
        return 1
    print(f"docs-check: PASS ({len(files)} markdown files, progress.json valid, sources intact, prompt within limit)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
