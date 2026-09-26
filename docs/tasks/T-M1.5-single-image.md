# T-M1.5: Single image + same-origin SPA serving, gate.sh, contract-drift CI

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **ready** (G0-complete; T-M1.2 `ae9ac5d`, T-M1.3 `8b9d938` and T-M1.4 `294d597` merged; PO approved the start, DEC-048) |
| Owner role | BE (+FE for the web build integration) |
| Branch | `feature/T-M1.5-single-image` (from `develop`) |
| Depends on | T-M1.2, T-M1.3 merged |
| Estimate | 1.5–2 agent-days |
| Trace | ADR-0004, ADR-0012, ADR-0014, NFR-SEC-08, deployment.md §2, security.md §5, ci-cd.md §1, test-strategy §5–§6, OQ-16 |

## Goal
One OCI image that serves the SPA and the API from the same origin, with the baseline security headers. A single local command, `scripts/gate.sh`, that
runs every gate. A `contract-drift` CI check that keeps `api/openapi.json` and the web types in sync. It adds no product features, no release pipeline and no deployment.

## Scope
- In:
  1. `deploy/Containerfile` per deployment.md §2: (1) Node 24 + pnpm (corepack) builds `web/dist`; (2) Temurin 25 JDK + the Maven wrapper build the jar with
     the SPA copied to `static/`, as layered jars; (3) Temurin 25 **JRE** runtime, non-root `englms` (uid 10001), works with a read-only root filesystem
     (tmpfs `/tmp`), `HEALTHCHECK` on `:8081/actuator/health/liveness`. Base images are **pinned by digest** and fully qualified. The image is built locally with rootless Podman
     (`podman build -f deploy/Containerfile .`), and in CI as a build-only check (no push; registry publishing is M8).
  2. SPA serving in the backend (`shared` web config, not a module): static assets under `/assets/**` with `Cache-Control: public, max-age=31536000, immutable`;
     `index.html` with `no-cache`; an **SPA fallback** that returns `index.html` for non-API, non-asset GET paths that accept `text/html` (e.g. `/tutor`, `/student/x`).
     `/api/**` still returns Problem Details 404 for unknown paths, and nothing under `/api` or `/actuator` falls back to the SPA.
  3. Baseline security headers from security.md §5 on every response: CSP (exactly the documented policy; `frame-src 'none'` until the embed allow-list arrives),
     `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, `frame-ancestors 'none'`. **No Spring Security yet** (T-M2.1):
     use a servlet filter in `shared.web`. HSTS belongs to Caddy (deployment), not the app.
  4. `scripts/gate.sh`: fail-fast, runs docs-check, script tests, `backend ./mvnw -B verify` (sourcing `scripts/env.sh`), the web scripts (install --frozen-lockfile, lint,
     typecheck, test, build, budget, contrast) and the contract-drift check. It writes `evidence/<task>/gate-<timestamp>.log` when `ENGLMS_TASK` is set.
  5. `contract-drift` CI job on every PR (no `paths:` filter), required: regenerate `api/openapi.json` (the contract test with `-Dcontract.write=true`) and
     `web/src/lib/api/schema.d.ts`, then `git diff --exit-code`. Add it to `scripts/required-checks.txt` and the merge-gate fixture.
  6. JaCoCo (OQ-16 default = here): the report runs in `./mvnw verify` and CI uploads it. **No coverage threshold yet** (the floors start with the first domain module).
  7. Docs: deployment.md §2 (actual digests and build command), ci-cd.md (`contract-drift` live; container build check), development-setup §4 (`gate.sh`),
     tech-stack §7 (base image digests, JaCoCo), security.md §5 (as implemented), and OQ-16 answered.
- Out of scope: Spring Security, sessions, CSRF (T-M2.1); Caddy/Quadlet/deployment and registry push, Trivy (M8); the E2E harness (T-M1.6); fixing T-M1.8/T-M1.9 items.

## Guardrail answers
1. Trace: the ADRs above. 2. No drift. 3. No tutor setup. 4. N/A (engineering). 5. No exam semantics.

## Acceptance criteria
- **AC1:** `podman build -f deploy/Containerfile -t englms:dev .` succeeds from a clean clone. The runtime image runs as uid 10001 on a JRE (no JDK, no Node), starts with
  `--read-only --tmpfs /tmp` against the dev DB (`dev-up.sh`), and its HEALTHCHECK reports healthy. Base images are pinned by digest.
- **AC2:** From the running container, `GET /` and `GET /tutor` return the SPA `index.html` (200, `no-cache`), a hashed asset returns `immutable` caching, `GET /api/v1/meta` returns 200 JSON,
  `GET /api/v1/x` returns Problem Details 404 (not the SPA), and `:8080/actuator/health` returns 404.
- **AC3:** Every response carries the security.md §5 headers (integration test + curl evidence). The SPA works under the CSP with no console CSP violations (checked in a browser).
- **AC4:** `./scripts/gate.sh` runs every gate locally and fails fast on the first failure (negative demo); the log is in the evidence.
- **AC5:** `contract-drift` is green on the PR and fails when a handler changes without regenerating the contract and types (negative demo on a throwaway commit, reverted).
- **AC6:** The JaCoCo report is produced by `verify` and uploaded by CI. OQ-16 is recorded as answered.
- **AC7:** Docs are updated (scope 7), `contract-drift` is in `required-checks.txt` and the merge-gate fixture, and `progress.json` and the evidence summary are updated.

## Test plan
- Implementation: MockMvc/RestTestClient tests for the SPA fallback and the headers (including API and actuator exclusions), a script test for `gate.sh` argument/fail-fast
  behaviour (stubs), the container build + run smoke (logs), and a browser check of the SPA under the CSP.
- Independent QA focus: build the image from a clean clone; run it read-only; probe the fallback/API/actuator/headers/caching; run `gate.sh`; check non-root and JRE-only.

## Evidence required
`evidence/T-M1.5/summary.md`, the build log and image inspect (user, size, layers, digests), the curl header/caching evidence, the gate.sh log + fail-fast demo, the contract-drift negative demo, CI links, the QA report.

## Risks and assumptions
- CSP `style-src 'self'`: React sets inline styles through the CSSOM (allowed). If a library injects `<style>` elements, that needs a DEC (security.md §5). Verify in the browser.
- Read-only root: Tomcat and Java need a writable `/tmp` (tmpfs). Image size: prefer a slim JRE base. The CI container build adds runtime; keep it build-only.

## Commands
```bash
podman build -f deploy/Containerfile -t englms:dev .
./scripts/dev-up.sh && podman run --rm --read-only --tmpfs /tmp --network host --env-file .env englms:dev
./scripts/gate.sh
```
