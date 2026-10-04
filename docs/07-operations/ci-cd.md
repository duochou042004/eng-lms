# CI/CD

> GitHub Actions. Workflows live in `.github/workflows/`. Created incrementally: `docs-check` + `secrets-scan` in **T-M1.1** (live), `backend` in **T-M1.2** (live),
> `web` in **T-M1.3** (live), `contract-drift` and the `container` build check in **T-M1.5** (live), `e2e-smoke` in **T-M1.6** (live), release in M8. The required checks for `merge-gate.sh` are listed in `scripts/required-checks.txt`.
> Repository: https://github.com/duochou042004/eng-lms (private; default branch `develop`; merge commits only; branches deleted on merge).

## 1. Workflows and required checks

| Workflow (job name = required check) | Trigger | Steps | Required on |
|---|---|---|---|
| `docs-check` | PR, push to develop/master | `scripts/check-docs.sh` (progress.json schema, relative links, ID references, source checksums, prompt ≤ 4,000 chars) + `scripts/tests/run-all.sh` (governance script tests) + `check-path-ownership.sh` on PRs | develop, master |
| `secrets-scan` | PR, push | gitleaks CLI 8.30.1 (MIT), downloaded with a pinned SHA-256; scans the full git history. The EULA-licensed gitleaks-action is deliberately not used | develop, master |
| `backend` | every PR (no path filter: required checks must always report), push | `.github/workflows/backend.yml` (live, T-M1.2): checkout (`persist-credentials: false`) → setup-java Temurin 25 (Maven cache) → `./mvnw -B -ntp verify` (Testcontainers uses the runner's Docker; includes the modularity, ArchUnit, forbidden-identifier, Flyway and OpenAPI contract tests) → JaCoCo totals and per-package coverage in the **job summary** (`scripts/coverage-summary.sh`; no threshold yet, OQ-16 answered by T-M1.5) → upload the HTML report (`backend-coverage`) → upload surefire reports on failure. The uploads are `continue-on-error`: an account-wide artifact storage quota must not fail the required check (DEC-053) | develop, master |
| `contract-drift` | every PR (no path filter), push | `.github/workflows/contract-drift.yml` (live, T-M1.5): checkout → setup-java 25 + setup-node 24 → `pnpm install --frozen-lockfile` → `scripts/contract-drift.sh` (regenerates `api/openapi.json` with `OpenApiContractTest -Dcontract.write=true` and `web/src/lib/api/schema.d.ts` with `pnpm api:generate`, then diffs both) → `git diff --exit-code` | develop, master |
| `container` (job `container-build`) | every PR, push | `.github/workflows/container.yml` (live, T-M1.5): `podman build --format docker -f deploy/Containerfile` (**build only, no push**; registry push and Trivy are M8) → checks uid 10001, no JDK/Node in the runtime image | — (reported; not required) |
| `web` | every PR (no path filter, as for backend), push | `.github/workflows/web.yml` (live, T-M1.3): setup-node 24 → corepack pnpm → `pnpm install --frozen-lockfile` → lint (oxlint, stylelint, Prettier) → typecheck → API types match `api/openapi.json` → test (unit, component, axe, i18n completeness) → build → bundle budget → contrast check | develop, master |
| `e2e-smoke` | every PR (no path filter), push | `.github/workflows/e2e-smoke.yml` (live, T-M1.6): PostgreSQL 18 service (digest-pinned) → setup-java 25 + setup-node 24 → `pnpm install` + `playwright install --with-deps chromium` in `e2e/` → typecheck → `qa/` install + typecheck (T-M1.18) → `scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop` (builds the jar with the SPA, starts it, runs the smoke + guard self-tests, always stops it) → upload the report on failure (`continue-on-error`, 5 days). The e2e profile/seed endpoint arrives with the first data (M2) | develop, master |
| `e2e-nightly` | schedule (daily) | All 6 viewports × Chromium + smoke on Firefox and WebKit; PIT mutation (grading) | — (reported) |
| `release` | tag `v*` | Build the image → Trivy scan (fail on CRITICAL) → push to GHCR → attach the SBOM → draft the GitHub release | master |

Artifacts serve CI only: every `upload-artifact` step keeps them **5 days** (`retention-days: 5`) and is `continue-on-error` (DEC-053, DEC-056).
Every `continue-on-error` step has an `id` and is followed, in the same job, by a step with `if: always() && steps.<id>.outcome == 'failure'` that prints a `::warning`,
so a failed upload shows as an annotation instead of passing silently (T-M1.8, DEC-055 R2-1). `scripts/tests/workflow-warnings.test.sh` enforces this for every workflow.
Actions are pinned by commit SHA. Workflow `permissions:` are minimal (read by default, `packages: write` only in release). Dependabot is enabled for GitHub Actions
(weekly, grouped). Maven and npm entries are added by T-M1.2, T-M1.3 and T-M1.6. Dependabot PRs merge through merge-gate with `LC-APPROVED PR-<n>` (git-governance §4).

### 1.1 GitLab mirror CI (T-M1.11, DEC-060; kept as a backup, DEC-080)

Added while GitHub's Actions artifact storage was exhausted (until the 2026-10-01 reset; uploads are `continue-on-error`, DEC-053). Since the reset GitHub
stores the reports again; the PO keeps the mirror as a second copy of the repository and its CI as a precaution (DEC-080). The private mirror `gitlab.com/duochou042004/eng-lms` runs `.gitlab-ci.yml` on every branch push:

| Job | Image (digest-pinned) | What it runs | Artifacts (5 days) |
|---|---|---|---|
| `backend` | `eclipse-temurin:25-jdk` + `docker:29.8.1-dind` service | `./mvnw -B -ntp verify` (Testcontainers over DinD) + `coverage-summary.sh` | JaCoCo HTML/XML, surefire reports; JUnit + JaCoCo coverage reports in the UI |
| `web` | `node:24-slim` | install, lint, typecheck, API types, test, build, budget, contrast; `qa/` install + typecheck (T-M1.18) | — |
| `e2e-smoke` | `playwright:v1.63.0-noble` + Temurin 25 tarball (SHA-256) + `postgres:18` service | `scripts/e2e-run.sh` on the mandatory viewports | Playwright report, test results, app log |

GitHub remains the source of truth: the GitLab pipeline is **not** a required check and GitLab is not a merge path (merge requests are disabled; develop/master are protected: Maintainers push only, no merges, no force push; DEC-061). The mirror is fed by
`scripts/gitlab-sync.sh` (GitHub's commits only). Budget: GitLab.com free tier, 400 compute minutes/month; sync develop and the branches under review only.
The GitLab images are outside Dependabot: bump their digests by hand with the monthly dependency batch (tech-stack.md).

## 2. Branch protection (target configuration)

| Branch | Rules |
|---|---|
| `master` | PR required; required checks: all of the above; linear history **off** (merge commits); no force push; no deletion; tags `v*` protected |
| `develop` | PR required; required checks: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke (as they come into existence); no force push |

**Result (R-08, DEC-031): branch protection is NOT available.** The API returned 403 on 2026-09-25 (private repo, free plan), so the target configuration above
is not applied, and the enforcement lives in the harness:
- `scripts/merge-gate.sh [--dry-run] <pr>`: refuses unless every required check in `scripts/required-checks.txt` passes and no other check fails; `LC-APPROVED <task>`
  is present; the latest `QA-VERDICT` (feature/fix/release) or `DOCS-REVIEW` (docs/chore) says PASS; **no review type's latest verdict is negative** (FAIL, CHANGES REQUESTED or
  any other non-positive token blocks on every path); the branch is 0 commits behind its base and has no conflicts; and `progress.json` changed. Every verdict must be posted
  **after the head commit arrived on the PR** (push time from the repository activity, the PR's `pull_request` workflow runs and force-push events; fails closed without them).
  Dependabot PRs need Dependabot-authored, GitHub-verified commits, only Dependabot pushes to the branch, and modifications of a narrow set of files where workflow edits are
  pairwise `uses:` SHA bumps (git-governance §4, T-M1.7, DEC-063..066).
  It then runs `gh pr merge --merge --delete-branch --match-head-commit <sha>`. The LC merges **only** through this script.
- A `pre-push` hook (`scripts/install-hooks.sh` sets `core.hooksPath=scripts/hooks`) blocks direct pushes to `master`/`develop` and non-fast-forward pushes.
- `check-path-ownership.sh` runs in `docs-check` on every PR. `.claude/settings.json` denies `gh pr merge`, force pushes and direct pushes for agents.
- All of these are covered by `scripts/tests/*.test.sh` in CI (`run-all.sh` in `docs-check`; merge-gate alone has 131 cases since T-M1.7).

## 3. Versioning and release

Semantic versioning. The version lives in `backend/pom.xml` and `web/package.json` (kept in sync by `scripts/bump-version.sh`). Changelog: `CHANGELOG.md`
(Keep a Changelog format; updated per PR under "Unreleased"). Release flow: quality-gates.md G6.
