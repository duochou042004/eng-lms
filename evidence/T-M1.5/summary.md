# T-M1.5 evidence summary: single image + same-origin SPA, gate.sh, contract-drift CI

Branch `feature/T-M1.5-single-image` · PR https://github.com/duochou042004/eng-lms/pull/10 · Packet `docs/tasks/T-M1.5-single-image.md`

## AC → proof

| AC | Result | Proof |
|---|---|---|
| **AC1** image builds from a clean clone; uid 10001, JRE only; runs `--read-only --tmpfs /tmp` against the dev DB; HEALTHCHECK healthy; bases pinned by digest | PASS | `build-clean-clone.log` (fresh `git clone`, `podman build --no-cache --format docker`, exit 0; the Maven/pnpm **cache mounts** persist between builds, so dependency downloads were cached); `build.log`; `image-inspect.txt` (User 10001:10001, 416 MB, no javac/jshell/jar/node/npm/pnpm/curl/wget, `/app` root-owned, ReadonlyRootfs=true, tmpfs /tmp, `touch /app/probe` → read-only, health `healthy`, `podman healthcheck run` healthy); digests in `deploy/Containerfile` and tech-stack §7. The first attempt failed (`build-attempt1-failed-offline.log`: `mvnw -o` missed the annotation processor) and was fixed by dropping `-o` |
| **AC2** `/` and `/tutor` → index.html 200 `no-cache`; hashed asset `immutable`; `/api/v1/meta` 200 JSON; `/api/v1/x` Problem 404; `:8080/actuator/health` 404 | PASS | `curl-headers.txt` (from `probe.sh` against the running image): `/`, `/tutor`, `/student/x`, HEAD `/tutor` → 200 `text/html` `no-cache`; `/assets/index-*.js` → `max-age=31536000, public, immutable`; `/favicon.svg` → `no-cache`; `/api/v1/meta` → 200 JSON; `/api/v1/x` (with an HTML Accept) → 404 `application/problem+json`; `/actuator/health` → 404 problem; `/tutor` with `Accept: application/json`, `/missing.png`, `/assets/missing-*.js` → 404; `:8081/actuator/health/liveness` → 200. Tests: `SpaServingTest` (25) and `ApplicationIntegrationTest` (+7 real-server cases) |
| **AC3** security.md §5 headers on every response; SPA works under the CSP with no console violations | PASS | Every app-port response in `curl-headers.txt` carries the exact CSP (`frame-src 'none'`), `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `COOP`; tests assert them on HTML, assets, API and Problem responses. `browser-csp.md`: round 1 found **5 violations** (React Aria's injected `<style>`), fixed without changing the CSP (DEC-052); round 2: **no console logs**. The management port (:8081, internal only) does not carry them (DEC-050) |
| **AC4** `gate.sh` runs every gate and fails fast | PASS | `gate-20260925T143131Z.log` (11 steps PASS at `2d3d6e1`) and `gate-20260925T144216Z.log` (11 steps PASS at `427d394`, 125 s); `gate-failfast-demo-20260925T143814Z.log` (a broken doc link: the `docs` step fails, nothing after it runs, exit 1); `scripts/tests/gate.test.sh` (24 stub-based cases: order, fail-fast, `--from`, `--list`, usage errors, `ENGLMS_TASK` validation, log file) |
| **AC5** `contract-drift` green on the PR; fails on a handler change without regeneration | PASS | Negative: throwaway commit `11f7e02` (`/meta` → `/meta-info`): `contract-drift-negative-local.log` and `contract-drift-negative-ci.log` (run 36148976036, failure, with the diff of both files); reverted by `a972299`. Positive: CI on the final head (below) |
| **AC6** JaCoCo report from `verify`, uploaded by CI; OQ-16 answered | PASS (after QA F1 fix) | `jacoco-maven-plugin` 0.8.15 (`prepare-agent` + `report` at `verify`); the gate logs show `jacoco:0.8.15:report`. **QA round 1 found F1 (S2):** on `427d394` and `6c15fa1` the `backend` check was red because the artifact upload hit the account-wide storage quota; no run had delivered a report. Fix (DEC-053): `scripts/coverage-summary.sh` writes the totals + per-package table to the CI **job summary** (no storage needed); the artifact uploads are `continue-on-error`. The CI link with the summary is recorded below. OQ-16 → DEC-051 |
| **AC7** docs, required checks, fixture, progress | PASS | deployment §2, ci-cd §1 (contract-drift + container live), development-setup §4, tech-stack §7 (3 base digests, JaCoCo, Podman), security §5 (as implemented), open-questions (OQ-16), decision log DEC-049..052; `scripts/required-checks.txt` + `OK_CHECKS` in `merge-gate.test.sh` include `contract-drift`; `progress.json` |

## Decisions made during the task
- DEC-049: `ForbiddenIdentifiersTest` allows exactly `payment=()` (the mandated `Permissions-Policy` directive), with a fixture test proving that anything else still fails.
- DEC-050: `--format docker` (keeps HEALTHCHECK); headers on the app port only; Ubuntu JRE base; bash `/dev/tcp` healthcheck; SPA fallback rules.
- DEC-051: OQ-16 answered (report, no threshold).
- DEC-052: React Aria `<style>` injection pre-empted; CSP unchanged.
- DEC-053: coverage in the CI job summary; report uploads non-blocking (QA F1).
- DEC-054: QA F2 → T-M1.8, F3 → T-M2.1 (comment fixed now), F4 fixed (no `.vite/manifest.json` in the image).

## CI (PR #10)
- Throwaway head `11f7e02`: contract-drift **failure** (expected), backend failure (expected, same drift), docs-check, secrets-scan and web success.
- `427d394` and `6c15fa1`: backend **failure** (artifact storage quota, QA F1); every other check success (contract-drift, container, web, docs-check, secrets-scan).
- Final head after the QA fixes: see below.

## Files
`build.log`, `build-clean-clone.log`, `build-attempt1-failed-offline.log`, `image-inspect.txt`, `probe.sh`, `curl-headers.txt`, `browser-csp.md`,
`gate-*.log`, `gate-failfast-demo-*.log`, `contract-drift-negative-local.log`, `contract-drift-negative-ci.log`.
