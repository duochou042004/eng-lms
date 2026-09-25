# T-M1.4: Local stack + Testcontainers on rootless Podman

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **done** (merged `294d597`, PR #8; G0-complete; T-M1.2 merged `ae9ac5d`; PO approved the user `podman.socket`, which is already enabled, DEC-044) |
| Owner role | BE (backend-implementer) |
| Branch | `feature/T-M1.4-local-stack` (from `develop`) |
| Depends on | T-M1.2 merged |
| Estimate | 0.5–1 agent-day |
| Trace | ADR-0012, R-07, DEC-044, development-setup §2/§3, NFR-OPS-04 |

## Goal
One-command local development on rootless Podman: a pinned PostgreSQL 18 dev database, an environment script, up/down scripts, and a documented, repeatable
proof that the Testcontainers tests run locally through the user `podman.socket`. No product features.

## Scope
- In:
  1. `deploy/compose.dev.yaml`: PostgreSQL 18 pinned by **digest** (`docker.io/library/postgres:18@sha256:…`; record the tag → digest resolution), bound to
     `127.0.0.1:5432`, named volume `englms-dev-pgdata`, healthcheck (`pg_isready`), credentials from the git-ignored `.env`.
  2. `.env.example` (dev-only values, no real secrets) and a `.gitignore` entry for `.env`. `scripts/env.sh` exports `DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock`
     and `TESTCONTAINERS_RYUK_DISABLED=true`, and fails with a clear message if the socket is inactive.
  3. `scripts/dev-up.sh` / `scripts/dev-down.sh` (`podman compose` or podman-compose 1.6.0; `dev-down` keeps the volume unless `--purge`). Idempotent; they wait for health.
  4. The Testcontainers proof: `source scripts/env.sh && (cd backend && ./mvnw -B verify)` runs all tests, including the `container` tag, with no containers left afterwards.
     Leftover cleanup without Ryuk: document `podman ps -a --filter label=org.testcontainers=true` and a prune command.
  5. Script tests (in `scripts/tests/`, run by `run-all.sh`) for `env.sh` (inactive socket → exit ≠ 0 with a message) and `dev-down.sh` argument handling (no real containers needed; use a
     stub `podman` on PATH as in the existing mock-gh pattern).
  6. Docs: development-setup §2/§3 (the real commands; remove "planned" where done), tech-stack §7 (the postgres digest, podman-compose), and ci-cd if anything changes (CI keeps GitHub's Docker).
- Out of scope: the Containerfile, the app image and SPA serving (T-M1.5); `gate.sh` (T-M1.5); seed data (`scripts/seed-dev.sh` arrives with auth in M2); any host setting beyond the already-enabled user socket.

## Guardrail answers
1. Trace: ADR-0012, R-07. 2. No drift. 3. No tutor setup. 4. N/A (engineering). 5. No exam semantics.

## Acceptance criteria
- **AC1:** `./scripts/dev-up.sh` on a clean machine state starts PostgreSQL 18 (the pinned digest) on 127.0.0.1:5432 and reports it healthy. Running it again changes nothing. `./scripts/dev-down.sh` stops it and keeps the volume; `--purge` removes it.
- **AC2:** With `dev-up` running and `.env` from `.env.example`, `(cd backend && ./mvnw spring-boot:run)` starts, Flyway V1 applies, and `GET /api/v1/meta` returns 200 (log in the evidence).
- **AC3:** `source scripts/env.sh && (cd backend && ./mvnw -B verify)` passes **locally** with all 52+ tests, including the `container` tests. Afterwards `podman ps -a --filter label=org.testcontainers=true` is empty (evidence log).
- **AC4:** `scripts/env.sh` fails clearly when the socket is inactive (script test with a stub). No secrets are committed (secrets-scan green; `.env` ignored).
- **AC5:** Docs updated (development-setup §2/§3, tech-stack §7 digest), `progress.json` and the evidence summary.

## Test plan
- Implementation: script tests (stubbed podman/systemctl), local runs of dev-up/down and verify, with logs.
- Independent QA focus: follow development-setup §2/§3 literally from a clean state; check the port binding is loopback-only, the volume behaviour, the absence of leftover containers, and that no secrets are in the repo.

## Evidence required
`evidence/T-M1.4/summary.md`, the digest resolution, dev-up/down logs, the local verify log (container tests included), script-test log, CI links, the QA report.

## Risks and assumptions
R-07: Testcontainers on rootless Podman needs Ryuk disabled; cleanup relies on the JVM shutdown hooks, and the documented prune covers crashes. podman-compose 1.6.0 vs `podman compose`: prefer whichever exists; document it.

## Commands
```bash
./scripts/dev-up.sh && source scripts/env.sh && (cd backend && ./mvnw -B verify) && ./scripts/dev-down.sh
```
