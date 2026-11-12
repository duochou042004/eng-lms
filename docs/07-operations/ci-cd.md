# CI/CD

> GitHub Actions. Workflows live in `.github/workflows/`. Created incrementally: `docs-check` + `secrets-scan` in **T-M1.1** (live), `backend` in **T-M1.2** (live),
> `web` in **T-M1.3** (live), `contract-drift` and the `container` build check in **T-M1.5** (live), `e2e-smoke` in **T-M1.6** (live), release in M8. The required checks for `merge-gate.sh` are listed in `scripts/required-checks.txt`.
> Repository: https://github.com/duochou042004/eng-lms (private; default branch `develop`; merge commits only; branches deleted on merge).

## 1. Workflows and required checks

| Workflow (job name = required check) | Trigger | Steps | Required on |
|---|---|---|---|
| `docs-check` | PR, push to develop/master | `scripts/check-docs.sh` (progress.json schema, relative links, ID references, source checksums, prompt ≤ 4,000 chars, records: completed tasks `**done**` in the backlog and packet Status, `HANDOFF.md` archived against the PR's base (`ENGLMS_DOCS_BASE`), no unescaped pipe in a table-row code span, text-only CI inputs clean (§1.2)) + `scripts/tests/run-all.sh` (governance script tests) + `check-path-ownership.sh` on PRs | develop, master |
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

### 1.1 GitLab mirror CI (T-M1.11, DEC-060; kept as a backup, DEC-080) — **paused** (DEC-107)

**Paused since 2026-10-09 (PO, DEC-107):** the 400 monthly compute minutes are used up. GitHub Actions is the only CI. `scripts/gitlab-sync.sh`
still mirrors `develop`, `master` and the given branches (the repository stays current) and pushes with `-o ci.skip` unless `ENGLMS_GITLAB_CI=on`
(GitLab reads `.gitlab-ci.yml` from each pushed commit, so a branch cut before the pause would otherwise run the old config). On commits that have it,
`.gitlab-ci.yml`'s `workflow` rule also creates no pipeline unless the project CI/CD variable `ENGLMS_GITLAB_CI=on` is set. To resume (a PO decision;
the quota resets monthly): set that variable in GitLab (Settings → CI/CD → Variables, **unprotected**, or it reaches only `develop`/`master`) or revert
the rule, **and** sync with `ENGLMS_GITLAB_CI=on ./scripts/gitlab-sync.sh` (or remove the script's `ci.skip` default). Never push to the mirror with plain `git push` while paused.

Added while GitHub's Actions artifact storage was exhausted (until the 2026-10-01 reset; uploads are `continue-on-error`, DEC-053). Since the reset GitHub
stores the reports again; the PO keeps the mirror as a second copy of the repository and its CI as a precaution (DEC-080). The private mirror `gitlab.com/duochou042004/eng-lms`, when CI is enabled, runs `.gitlab-ci.yml` on every branch push:

| Job | Image (digest-pinned) | What it runs | Artifacts (5 days) |
|---|---|---|---|
| `backend` | `eclipse-temurin:25-jdk` + `docker:29.8.1-dind` service | `./mvnw -B -ntp verify` (Testcontainers over DinD) + `coverage-summary.sh` | JaCoCo HTML/XML, surefire reports; JUnit + JaCoCo coverage reports in the UI |
| `web` | `node:24-slim` | install, lint, typecheck, API types, test, build, budget, contrast; `qa/` install + typecheck (T-M1.18) | — |
| `e2e-smoke` | `playwright:v1.63.0-noble` + Temurin 25 tarball (SHA-256) + `postgres:18` service | `scripts/e2e-run.sh` on the mandatory viewports | Playwright report, test results, app log |

GitHub remains the source of truth: the GitLab pipeline is **not** a required check and GitLab is not a merge path (merge requests are disabled; develop/master are protected: Maintainers push only, no merges, no force push; DEC-061). The mirror is fed by
`scripts/gitlab-sync.sh` (GitHub's commits only). Budget: GitLab.com free tier, 400 compute minutes/month; sync develop and the branches under review only.
The GitLab images are outside Dependabot: bump their digests by hand with the monthly dependency batch (tech-stack.md).

### 1.2 CI scope: where the heavy steps may be skipped (T-M2.23, DEC-158 PO-1/PO-2, DEC-160) — **shadow mode**

**State: built, in shadow mode.** `scripts/ci-scope.mode` holds `shadow`: the classifier decides and reports, and every heavy step
still runs. T-M2.26 changes the file to `enforce` after at least 10 PRs without a wrong verdict. Nothing below skips anything until then.

- **Heavy jobs:** `e2e-smoke`, `backend`, `web`, `contract-drift`, `container-build`. **Always-full jobs:** `docs-check`, `secrets-scan`.
  Every job always starts and reports (no `paths:` filter, no job-level `if:`); the switch is inside the job.
- **The classifier** `scripts/ci-scope.sh` is the first step after checkout (`fetch-depth: 2`) of each heavy job, step id `scope`. It
  gives a verdict, `fast-path` or `full`, with a reason (a `::notice` and the job summary: `ci-scope: mode=… verdict=… why=…`). Every
  doubt or error gives `full`. Its `scope` output is `fast-path` only when the verdict is and the mode file is exactly `enforce`.
- **Text-only** means: every changed path matches the allow-list `scripts/ci-text-only.paths` (`docs/`, `evidence/`, `progress.json`,
  root `*.md`; not `.claude/`), with no symlink, submodule or mode change. The list is one file, read by the classifier, by
  `merge-gate.sh` (from the `develop` checkout) and by `check-docs`. Widening it needs a PO decision.
- **Switch (a), pull requests:** `fast-path` only for a PR whose base is exactly `develop` and whose merge ref differs from its first
  parent (the `develop` commit) only in text. Any other base, `master` included, is `full`.
- **Switch (b), pushes to `develop`:** `fast-path` only when the push added exactly one two-parent merge commit whose tree equals the
  merged head's tree, the merged head was 0 commits behind, and either (b1) the newest `pull_request` run of the same workflow on that
  head succeeded with the marker `Full run on develop` on every job, or (b2) the merge is text-only and the newest `push` run of the
  same workflow on the first parent succeeded. A squash, a revert, a direct push, a head merged while behind or without a successful
  full run, and any API error are `full`. Pushes to `master` are always `full`. This needs `actions: read` in the five workflows.
- **The steps:** every step after `scope` runs unless the `scope` output is exactly `fast-path`
  (`if: steps.scope.outputs.scope != 'fast-path'`, optionally after `always() && `); failure-only upload and warning steps keep
  their own condition. An empty or missing output therefore runs everything.
- **The marker:** the last step of each heavy job is named `Full run on <base>` (`github.base_ref` on a PR, `github.ref_name` on a
  push) and runs unless the **verdict** is `fast-path`. `success` means "a full run was asked for and every step passed"; `skipped`
  means "the classifier called this run fast-path". It follows the verdict, not the mode, so in shadow mode merge-gate and switch (b)
  already read what they will read later.
- **Concurrency:** the group is `<workflow>-<sha>` for pushes and `<workflow>-<ref>` for PRs, so a post-merge run is never cancelled
  or replaced by the next merge.
- **Enforced by tests** (`scripts/tests/ci-scope.test.sh`, `ci-scope-workflows.test.sh`, `merge-gate.test.sh`, `check-docs.test.sh`):
  each rule has a violating fixture. `scripts/ci-scope.sh replay <n>` classifies the last merges offline.
- **Standing check** (`check-docs`, always full): no tracked symlink or submodule; a file under `backend/`, `web/`, `e2e/`, `qa/`,
  `deploy/`, `api/`, `scripts/` or `.github/` that mentions an allow-listed path must be listed in
  `scripts/ci-text-only.known-mentions` with its exact count of mentioning lines and a reason (`*`, any count, only under
  `scripts/tests/`, which run in `docs-check` alone). A new mention anywhere else fails until the count is updated on a reviewed PR.
  No build input may read those paths. It is a text search: it cannot see a path built at run time from other parts.
- **No overrides on a runner:** `ci-scope.sh` ignores its test variables (`CI_SCOPE_ALLOW_FILE`, `CI_SCOPE_MODE_FILE`, `GH_BIN`) when
  `GITHUB_ACTIONS` is set, and the workflow test refuses them, a `shell:` override and a failure-only `if:` on anything but an upload
  or warning step.

## 2. Branch protection (target configuration)

| Branch | Rules |
|---|---|
| `master` | PR required; required checks: all of the above; linear history **off** (merge commits); no force push; no deletion; tags `v*` protected |
| `develop` | PR required; required checks: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke (as they come into existence); no force push |

**Result (R-08, DEC-031): branch protection is NOT available.** The API returned 403 on 2026-09-25 (private repo, free plan), so the target configuration above
is not applied, and the enforcement lives in the harness:
- `scripts/merge-gate.sh [--dry-run] <pr>`: refuses unless every required check in `scripts/required-checks.txt` passes and no other check fails; a PR
  that is **not text-only** (recomputed by the gate from the PR's file list and `develop`'s allow-list; always the case for a base other than `develop`) has a
  **full run** of every check except `docs-check` and `secrets-scan`, i.e. the check's job is for this head and its marker step `Full run on <base>` concluded
  `success` (§1.2, T-M2.23; a run from before a retarget names the old base and does not count: push again); a real merge (not `--dry-run`) runs only
  when this checkout's `HEAD` is `origin/develop`, so the gate and the allow-list are `develop`'s copies, never the PR's; `LC-APPROVED <task>`
  is present; the latest `QA-VERDICT` (feature/fix/release) or `DOCS-REVIEW` (docs/chore) says PASS; **no review type's latest verdict is negative** (FAIL, CHANGES REQUESTED or
  any other non-positive token blocks on every path); the branch is 0 commits behind its base and has no conflicts; and `progress.json` changed. Every verdict must be posted
  **after the head commit arrived on the PR** (push time from the repository activity, the PR's `pull_request` workflow runs and force-push events; fails closed without them).
  Dependabot PRs need Dependabot-authored, GitHub-verified commits, only Dependabot pushes to the branch, and modifications of a narrow set of files where workflow edits are
  pairwise `uses:` SHA bumps (git-governance §4, T-M1.7, DEC-063..066).
  It then runs `gh pr merge --merge --delete-branch --match-head-commit <sha>`. The LC merges **only** through this script.
- A `pre-push` hook (`scripts/install-hooks.sh` sets `core.hooksPath=scripts/hooks`) blocks direct pushes to `master`/`develop` and non-fast-forward pushes.
- `check-path-ownership.sh` runs in `docs-check` on every PR. `.claude/settings.json` denies `gh pr merge`, force pushes and direct pushes for agents.
- On success the gate prints `merge-gate: scope <text-only|full>; checks: <n> full, <m> fast-path` (the heavy checks by their marker); records copy it.
- All of these are covered by `scripts/tests/*.test.sh` in CI (`run-all.sh` in `docs-check`; merge-gate alone has 131 cases since T-M1.7).

## 3. Versioning and release

Semantic versioning. The version lives in `backend/pom.xml` and `web/package.json` (kept in sync by `scripts/bump-version.sh`). Changelog: `CHANGELOG.md`
(Keep a Changelog format; updated per PR under "Unreleased"). Release flow: quality-gates.md G6.
