# Development Setup

> Verified against this machine on 2026-09-25 (tech-stack.md §1). Commands marked *(M1)* start working once their M1 packet has merged.

## 1. Toolchain

```bash
# Java 25 + Spring Boot CLI (SDKMAN). Non-interactive shells must source SDKMAN explicitly:
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk env            # reads .sdkmanrc (java=25.0.4-tem, springboot=4.1.0)

# Node 24 (nvm). Non-interactive shells must source nvm explicitly:
source "$HOME/.nvm/nvm.sh" && nvm use   # reads .nvmrc (24.21.0)
corepack enable                          # pnpm version pinned in web/package.json "packageManager"

# Podman (rootless). One-time, user-level (needed by Testcontainers) — see §3:
systemctl --user enable --now podman.socket
```

Agents: every `Bash` call is a fresh shell. Prefix toolchain commands with the `source …` lines, or use `scripts/env.sh` *(M1)*, which does both.

## 2. Repository bootstrap *(M1)*

Available now (T-M1.2). The backend reads `SPRING_DATASOURCE_URL` (default `jdbc:postgresql://localhost:5432/englms`), `SPRING_DATASOURCE_USERNAME`
(default `englms`) and `SPRING_DATASOURCE_PASSWORD` (no default). Until `dev-up.sh` exists (T-M1.4), a throwaway database works without the Podman socket:

```bash
podman run -d --rm --name englms-dev-pg -e POSTGRES_DB=englms -e POSTGRES_USER=englms -e POSTGRES_PASSWORD=devonly \
  -p 127.0.0.1:5432:5432 docker.io/library/postgres:18
(cd backend && SPRING_DATASOURCE_PASSWORD=devonly ./mvnw spring-boot:run)   # API :8080 (GET /api/v1/meta) ; actuator :8081 (health, info)
```

Planned (the scripts arrive with T-M1.3 … T-M1.5):

```bash
./scripts/dev-up.sh          # podman compose -f deploy/compose.dev.yaml up -d  (PostgreSQL 18 on 127.0.0.1:5432, volume englms-dev-pgdata)
cp .env.example .env         # dev-only values; .env is git-ignored
(cd backend && ./mvnw spring-boot:run -Dspring-boot.run.profiles=dev)   # http://localhost:8080 ; actuator :8081
(cd web && pnpm install && pnpm dev)                                     # http://localhost:5173 (proxies /api → :8080)
./scripts/seed-dev.sh        # dev tutor + sample students (dev profile only; not domain seed data)
```

The dev tutor credentials are printed by `seed-dev.sh` (random each time, stored in the git-ignored `.data/dev-credentials.txt`).

## 3. Testcontainers on rootless Podman

```bash
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"
export TESTCONTAINERS_RYUK_DISABLED=true        # Ryuk needs privileged mode under rootless Podman; cleanup via podman label prune instead
```

`scripts/env.sh` sets both. **T-M1.4** verifies this works and records the evidence. If it fails, the documented fallback is: tests connect to the compose
PostgreSQL through a `test-external-db` profile (a separate database per test run, dropped afterwards). The fallback is local only; CI uses GitHub's Docker.

## 4. Useful commands *(M1+)*

| Task | Command |
|---|---|
| All local gates | `./scripts/gate.sh` |
| Backend tests only | `(cd backend && ./mvnw -B verify)` (needs a Docker-compatible socket for the `container`-tagged tests) |
| Backend tests without containers | `(cd backend && ./mvnw -B verify -DexcludedGroups=container)` (until T-M1.4 enables the Podman socket; CI runs everything) |
| One backend test | `(cd backend && ./mvnw -B -Dtest=ClassName#method test)` |
| Regenerate the OpenAPI file | `(cd backend && ./mvnw -B -Dtest=OpenApiContractTest -Dcontract.write=true test)` |
| Regenerate API types | `(cd web && pnpm api:generate)` |
| Web checks | `(cd web && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget && pnpm contrast)` (live, T-M1.3) |
| Web dev server | `(cd web && pnpm install && pnpm dev)`: http://localhost:5173, proxies `/api` → :8080; component gallery at `/dev/ui` (dev builds only) |
| E2E (mandatory viewports) | `(cd e2e && pnpm e2e:pr)` |
| Docs check | `./scripts/check-docs.sh` |
| Stop the DB | `./scripts/dev-down.sh` |

## 5. Editor settings

`.editorconfig` is authoritative. Recommended: IntelliJ IDEA (Java 25 language level) and VS Code with the oxc (oxlint), Stylelint and Prettier extensions (listed in
`.vscode/extensions.json` in M1).
