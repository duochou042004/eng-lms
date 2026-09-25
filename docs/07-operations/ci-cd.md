# CI/CD

> GitHub Actions. Workflows live in `.github/workflows/`. Created incrementally: `docs-check` + `secrets-scan` in **T-M1.1** (live), `backend` in **T-M1.2** (live),
> `web` in **T-M1.3** (live), `contract-drift` and the `container` build check in **T-M1.5** (live), `e2e-smoke` in T-M1.6, release in M8. The required checks for `merge-gate.sh` are listed in `scripts/required-checks.txt`.
> Repository: https://github.com/duochou042004/eng-lms (private; default branch `develop`; merge commits only; branches deleted on merge).

## 1. Workflows and required checks

| Workflow (job name = required check) | Trigger | Steps | Required on |
|---|---|---|---|
| `docs-check` | PR, push to develop/master | `scripts/check-docs.sh` (progress.json schema, relative links, ID references, source checksums, prompt ≤ 4,000 chars) + `scripts/tests/run-all.sh` (governance script tests) + `check-path-ownership.sh` on PRs | develop, master |
| `secrets-scan` | PR, push | gitleaks CLI 8.30.1 (MIT), downloaded with a pinned SHA-256; scans the full git history. The EULA-licensed gitleaks-action is deliberately not used | develop, master |
| `backend` | every PR (no path filter: required checks must always report), push | `.github/workflows/backend.yml` (live, T-M1.2): checkout (`persist-credentials: false`) → setup-java Temurin 25 (Maven cache) → `./mvnw -B -ntp verify` (Testcontainers uses the runner's Docker; includes the modularity, ArchUnit, forbidden-identifier, Flyway and OpenAPI contract tests) → upload the JaCoCo report (`backend-coverage`, always; no threshold yet, OQ-16 answered by T-M1.5) → upload surefire reports on failure | develop, master |
| `contract-drift` | every PR (no path filter), push | `.github/workflows/contract-drift.yml` (live, T-M1.5): checkout → setup-java 25 + setup-node 24 → `pnpm install --frozen-lockfile` → `scripts/contract-drift.sh` (regenerates `api/openapi.json` with `OpenApiContractTest -Dcontract.write=true` and `web/src/lib/api/schema.d.ts` with `pnpm api:generate`, then diffs both) → `git diff --exit-code` | develop, master |
| `container` (job `container-build`) | every PR, push | `.github/workflows/container.yml` (live, T-M1.5): `podman build --format docker -f deploy/Containerfile` (**build only, no push**; registry push and Trivy are M8) → checks uid 10001, no JDK/Node in the runtime image | — (reported; not required) |
| `web` | every PR (no path filter, as for backend), push | `.github/workflows/web.yml` (live, T-M1.3): setup-node 24 → corepack pnpm → `pnpm install --frozen-lockfile` → lint (oxlint, stylelint, Prettier) → typecheck → API types match `api/openapi.json` → test (unit, component, axe, i18n completeness) → build → bundle budget → contrast check | develop, master |
| `e2e-smoke` | PR | Build the jar with the SPA → start PostgreSQL as a service → run the app (e2e profile) → Playwright mandatory viewports (Chromium) → upload the report on failure | develop, master |
| `e2e-nightly` | schedule (daily) | All 6 viewports × Chromium + smoke on Firefox and WebKit; PIT mutation (grading) | — (reported) |
| `release` | tag `v*` | Build the image → Trivy scan (fail on CRITICAL) → push to GHCR → attach the SBOM → draft the GitHub release | master |

Actions are pinned by commit SHA. Workflow `permissions:` are minimal (read by default, `packages: write` only in release). Dependabot is enabled for GitHub Actions
(weekly, grouped). Maven and npm entries are added by T-M1.2, T-M1.3 and T-M1.6. Dependabot PRs merge through merge-gate with `LC-APPROVED PR-<n>` (git-governance §4).

## 2. Branch protection (target configuration)

| Branch | Rules |
|---|---|
| `master` | PR required; required checks: all of the above; linear history **off** (merge commits); no force push; no deletion; tags `v*` protected |
| `develop` | PR required; required checks: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke (as they come into existence); no force push |

**Result (R-08, DEC-031): branch protection is NOT available.** The API returned 403 on 2026-09-25 (private repo, free plan), so the target configuration above
is not applied, and the enforcement lives in the harness:
- `scripts/merge-gate.sh [--dry-run] <pr>`: refuses unless every required check in `scripts/required-checks.txt` passes and no other check fails; `LC-APPROVED <task>`
  is present; the latest `QA-VERDICT` (feature/fix/release) or `DOCS-REVIEW` (docs/chore) says PASS; no SEC/UX review requests changes; the branch is 0 commits behind its base
  and has no conflicts; and `progress.json` changed. It then runs `gh pr merge --merge --delete-branch`. The LC merges **only** through this script.
- A `pre-push` hook (`scripts/install-hooks.sh` sets `core.hooksPath=scripts/hooks`) blocks direct pushes to `master`/`develop` and non-fast-forward pushes.
- `check-path-ownership.sh` runs in `docs-check` on every PR. `.claude/settings.json` denies `gh pr merge`, force pushes and direct pushes for agents.
- All of these are covered by `scripts/tests/*.test.sh` (34 cases) in CI.

## 3. Versioning and release

Semantic versioning. The version lives in `backend/pom.xml` and `web/package.json` (kept in sync by `scripts/bump-version.sh`). Changelog: `CHANGELOG.md`
(Keep a Changelog format; updated per PR under "Unreleased"). Release flow: quality-gates.md G6.
