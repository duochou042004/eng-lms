# CI/CD

> GitHub Actions. Workflows live in `.github/workflows/`. Created incrementally: `docs-check` + `secrets-scan` in **T-M1.1**, `backend` in T-M1.2,
> `web` in T-M1.3, `e2e-smoke` in T-M1.6, release in M8.

## 1. Workflows and required checks

| Workflow (job name = required check) | Trigger | Steps | Required on |
|---|---|---|---|
| `docs-check` | PR, push to develop/master | `scripts/check-docs.sh`: markdown relative-link check, `progress.json` schema validation, next-session prompt ≤ 4,000 chars, no untracked OQ references | develop, master |
| `secrets-scan` | PR, push | gitleaks (pinned action by SHA) | develop, master |
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

**Caveat (R-08):** GitHub branch protection and rulesets on **private** repositories need a paid plan (Pro or Team) for personal accounts. If the repository is
private on a free plan (OQ-01), the enforcement moves into the harness:
- `scripts/merge-gate.sh <pr>` (created in T-M1.1): refuses to merge unless `gh pr checks` are all green, the PR has the `LC-APPROVED` comment and
  a `QA-VERDICT … PASS` comment, and the branch is up to date. The LC merges **only** through this script.
- A local `pre-push` hook (installed by `scripts/install-hooks.sh`) blocks direct pushes to `master` and `develop`.

## 3. Versioning and release

Semantic versioning. The version lives in `backend/pom.xml` and `web/package.json` (kept in sync by `scripts/bump-version.sh`). Changelog: `CHANGELOG.md`
(Keep a Changelog format; updated per PR under "Unreleased"). Release flow: quality-gates.md G6.
