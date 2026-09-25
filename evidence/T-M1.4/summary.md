# Evidence — T-M1.4 Local stack + Testcontainers on rootless Podman

- Branch: `feature/T-M1.4-local-stack` · PR: see `progress.json` · Date (UTC): 2026-09-25
- Entry gate: T-M1.2 merged (`ae9ac5d`); the user `podman.socket` is PO-approved and enabled (DEC-044); PO start signal (DEC-046).

## Acceptance criteria → proof

| AC | Proof | Status |
|---|---|---|
| AC1 dev-up / dev-down | `dev-up.log`: the first run creates the network, volume and container and reports healthy on `127.0.0.1:5432`; the second run changes nothing (same container, exit 0). The running image is the pinned digest (PostgreSQL 18.6). `ss` shows a loopback-only listener. `dev-down.log`: a plain down keeps `englms-dev-pgdata` (data survives a restart: 2 Flyway history rows); `--purge` removes the volume; no containers are left. `digest.txt`: the tag → index digest resolution | ✅ |
| AC2 backend on the dev DB | `spring-boot-run.log`: `set -a; source .env; set +a; ./mvnw spring-boot:run` → Flyway "Successfully applied 1 migration", Started; `GET /api/v1/meta` 200; readiness UP | ✅ |
| AC3 Testcontainers locally | `local-verify.log`: `source scripts/env.sh && (cd backend && ./mvnw -B -ntp verify)` → 52 tests, 0 skipped, BUILD SUCCESS (ApplicationIntegrationTest 16, FlywayMigrationTest 6, OpenApiContractTest 1 on the Podman socket); afterwards `podman ps -a --filter label=org.testcontainers=true` returns 0 | ✅ |
| AC4 env.sh failure + no secrets | `scripts/tests/dev-scripts.test.sh` (12 cases with stub `systemctl`/`podman`): an inactive socket or missing socket file → exit 1 with the enable command; active → exports `DOCKER_HOST` + Ryuk off; dev-down default/`--purge`/unknown argument. `script-tests.log`: all suites pass. `.env` is git-ignored (`git check-ignore`); `.env.example` has only dev placeholders; secrets-scan: CI_RUN | ⏳ CI |
| AC5 docs + progress | development-setup §2/§3 (real commands; the fallback is removed), tech-stack §7 (postgres digest, podman-compose 1.6.0), DEC-046, `progress.json` | ✅ |

## Commands (reproducible)
```bash
cp .env.example .env && ./scripts/dev-up.sh
source scripts/env.sh && (cd backend && ./mvnw -B verify)
./scripts/dev-down.sh --purge
./scripts/tests/run-all.sh
```
