# CI/CD

> GitHub Actions. Workflows live in `.github/workflows/`. Created incrementally: `docs-check` + `secrets-scan` in **T-M1.1** (live), `backend` in T-M1.2,
> `web` in T-M1.3, `e2e-smoke` in T-M1.6, release in M8. The required checks for `merge-gate.sh` are listed in `scripts/required-checks.txt`.
> Repository: https://github.com/duochou042004/eng-lms (private; default branch `develop`; merge commits only; branches deleted on merge).

## 1. Workflows and required checks

| Workflow (job name = required check) | Trigger | Steps | Required on |
|---|---|---|---|
| `docs-check` | PR, push to develop/master | `scripts/check-docs.sh` (progress.json schema, relative links, ID references, source checksums, prompt ≤ 4,000 chars) + `scripts/tests/run-all.sh` (governance script tests) + `check-path-ownership.sh` on PRs | develop, master |
| `secrets-scan` | PR, push | gitleaks CLI 8.30.1 (MIT), downloaded with a pinned SHA-256; scans the full git history. The EULA-licensed gitleaks-action is deliberately not used | develop, master |
| `backend` | PR, push (paths: backend/**, api/**) | setup-java Temurin 25 → `./mvnw -B verify` (Testcontainers uses the runner's Docker) → JaCoCo summary → upload surefire reports | develop, master |
| `contract-drift` | PR (backend or web) | Regenerate `api/openapi.json` + web types; `git diff --exit-code` | develop, master |
| `web` | PR, push (paths: web/**) | Node 24 + pnpm (frozen lockfile) → lint → typecheck → test → build → bundle budget → i18n completeness → contrast check | develop, master |
| `e2e-smoke` | PR | Build the jar with the SPA → start PostgreSQL as a service → run the app (e2e profile) → Playwright mandatory viewports (Chromium) → upload the report on failure | develop, master |
| `e2e-nightly` | schedule (daily) | All 6 viewports × Chromium + smoke on Firefox and WebKit; PIT mutation (grading) | — (reported) |
| `release` | tag `v*` | Build the image → Trivy scan (fail on CRITICAL) → push to GHCR → attach the SBOM → draft the GitHub release | master |

Actions are pinned by commit SHA. Workflow `permissions:` are minimal (read by default, `packages: write` only in release). Dependabot is enabled for Maven, npm
and GitHub Actions (weekly, grouped).

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
