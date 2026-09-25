# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning: SemVer.

## [Unreleased]

### Added
- Planning baseline (T-M0.1): the documentation system (product, requirements, architecture + ADR-0001..0016, backend, frontend, quality, operations,
  plugin-store spec, harness, governance), `progress.json` + schema, the docs gate (`scripts/check-docs.sh`), and the backlog M0–M8 with the first gated task T-M1.1.

### Governance (T-M1.1)
- Private GitHub repository `duochou042004/eng-lms` (default branch `develop`, merge commits only).
- CI: `docs-check` (docs gate, script tests, path ownership) and `secrets-scan` (gitleaks CLI, checksum-pinned); Dependabot for GitHub Actions.
- `scripts/merge-gate.sh`, `scripts/check-path-ownership.sh`, pre-push hook (`scripts/install-hooks.sh`), with 34 tests. Agent permission settings activated.
- Branch protection is unavailable on this plan, so the harness enforces the rules instead (DEC-031).

### Documentation
- The README was redesigned: badges, Mermaid architecture and delivery diagrams, roadmap, docs map (DEC-035).

### Harness
- Agent definitions: backend-implementer, frontend-implementer, qa-evaluator, security-reviewer, ux-reviewer, docs-reviewer.
- Project skills: task-packet, evidence-and-handoff, backend-module, db-migration, authz-isolation, frontend-standards, ux-review, qa-evaluation, security-review.
