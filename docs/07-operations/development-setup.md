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
| Backend tests only | `(cd backend && ./mvnw -B verify)` |
| One backend test | `(cd backend && ./mvnw -B -Dtest=ClassName#method test)` |
| Regenerate the OpenAPI file | `(cd backend && ./mvnw -B -Dtest=OpenApiContractTest -Dcontract.write=true test)` |
| Regenerate API types | `(cd web && pnpm api:generate)` |
| Web checks | `(cd web && pnpm lint && pnpm typecheck && pnpm test --run)` |
| E2E (mandatory viewports) | `(cd e2e && pnpm e2e:pr)` |
| Docs check | `./scripts/check-docs.sh` |
| Stop the DB | `./scripts/dev-down.sh` |

## 5. Editor settings

`.editorconfig` is authoritative. Recommended: IntelliJ IDEA (Java 25 language level) and VS Code with the ESLint, Stylelint and Prettier extensions (listed in
`.vscode/extensions.json` in M1).
