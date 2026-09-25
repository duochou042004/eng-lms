# Handoff — 2026-09-25 (end of the planning session)

Phase/Milestone: P0 / M0 · Task: **T-M0.1 (awaiting_approval)** · Branch: `docs/T-M0.1-planning-baseline` · Last commit: see `progress.json`

## Where we are
- Both project specs were read in full. SPEC = the source of truth (immutable, in `docs/00-sources/`). CONV = context only.
- The complete documentation baseline exists (see `docs/README.md`): scope, 60+ FRs with ACs, NFRs, traceability, architecture + 16 ADRs, backend, frontend and security specs, quality gates,
  operations, plugin-store spec, harness (roles, skills, rules, handoff), governance (30 decisions, 20 risks, 15 open questions).
- There is a local git repo with `master` → `develop` → this docs branch. **No remote** (outward-facing; needs PO approval).
- **No product code has been written, by design.**

## In flight / uncommitted
None (everything is committed on the docs branch).

## Next steps (in order)
1. **PO:** review the baseline (reading path in `docs/README.md`). Answer or accept the defaults for `docs/10-governance/open-questions.md`. Minimum for proceeding: **OQ-01, OQ-15**.
2. **PO:** record `PO-APPROVED T-M0.1` and authorise T-M1.1's outward actions (`gh repo create`, push).
3. **LC:** optionally run the `docs-reviewer` subagent → `evidence/T-M0.1/review/docs.md`.
4. **LC:** the bootstrap merge into `develop` (DEC-030), then execute **T-M1.1** (`docs/tasks/T-M1.1-repo-bootstrap-governance.md`).
5. **LC:** write the T-M1.2 packet (backend skeleton via `spring init`) and set it to ready.

## Blockers and pending PO decisions
B-001 (baseline approval), B-002 (remote creation). OQ-01..OQ-15 (defaults documented). DEC-010, DEC-029 and DEC-030 are proposed.

## Gotchas learned this session
- The working directory path is `/home/kali/App_sources/Eng-LMS` (underscore, not a slash).
- Non-interactive shells: `source ~/.sdkman/bin/sdkman-init.sh` and `source ~/.nvm/nvm.sh`. Node is not on the default PATH.
- There is no global Maven or Gradle: use the wrapper. Podman is rootless, and its user socket is **disabled** (Testcontainers needs it; T-M1.4).
- Podman has no unqualified-search registries: always use full image names.
- Initializr defaults to Boot 4.1.1 and offers Java 25 (and 27). Use 25 (PO directive; LTS).
- Branch protection may be unavailable on a private free-plan repo (R-08). The harness fallback is designed (ci-cd.md §2).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.1-repo-bootstrap-governance.md` → `docs/10-governance/open-questions.md`.
