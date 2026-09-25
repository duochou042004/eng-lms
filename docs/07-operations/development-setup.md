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

Live since T-M1.4. The dev database is PostgreSQL 18 from `deploy/compose.dev.yaml` (pinned by digest, `127.0.0.1:5432` only, volume `englms-dev-pgdata`).
The backend reads `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD` (no default).

```bash
cp .env.example .env                          # dev-only values; .env is git-ignored
./scripts/dev-up.sh                           # podman compose up -d, then waits for the healthcheck (idempotent)
set -a; source .env; set +a                   # export the SPRING_DATASOURCE_* values
(cd backend && ./mvnw spring-boot:run)        # API :8080 (GET /api/v1/meta) ; actuator :8081 (health, info)
(cd web && pnpm install && pnpm dev)          # http://localhost:5173 (proxies /api → :8080)
./scripts/dev-down.sh                         # stop; keeps the data volume
./scripts/dev-down.sh --purge                 # stop and delete the data volume
```

Planned: `./scripts/seed-dev.sh` (dev tutor + sample students, dev profile only, not domain seed data) arrives with auth in M2. It will print the dev tutor
credentials (random each time, stored in the git-ignored `.data/dev-credentials.txt`).

## 3. Testcontainers on rootless Podman

The user-level socket is enabled once per machine: `systemctl --user enable --now podman.socket` (PO-approved, DEC-044). Then, per shell:

```bash
source scripts/env.sh                         # exports DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock and TESTCONTAINERS_RYUK_DISABLED=true
(cd backend && ./mvnw -B verify)              # all tests, including the `container`-tagged ones (verified in T-M1.4: 52/52)
```

`env.sh` stops with a clear message when the socket is inactive. Ryuk is disabled because it needs privileged mode under rootless Podman. Test containers
are removed by JVM shutdown hooks. After a crash, remove leftovers with:

```bash
podman ps -a --filter label=org.testcontainers=true -q | xargs -r podman rm -fv   # -v also removes their anonymous volumes
podman volume prune                                                           # unused anonymous volumes left by earlier crashes (asks first)
```

Known issue (T-M1.8): on local Podman runs Surefire force-exits the test JVM 30 s after the tests (a shutdown hook hangs). The build still passes.

CI uses GitHub's Docker and needs none of this. The previous fallback (a `test-external-db` profile) is no longer needed.

## 4. Useful commands *(M1+)*

| Task | Command |
|---|---|
| All local gates | `./scripts/gate.sh` (live, T-M1.5): fail-fast, in CI order: docs → script tests → backend `verify` (sources `scripts/env.sh`) → web install/lint/typecheck/test/build/budget/contrast → contract-drift. `--list` shows the steps, `--from <step>` resumes. `ENGLMS_TASK=T-Mx.y ./scripts/gate.sh` also writes `evidence/<task>/gate-<UTC>.log` |
| Contract drift | `./scripts/contract-drift.sh` (regenerates the contract and the web types, fails on a diff, leaves the regenerated files for review) |
| Build the image | `podman build --format docker -f deploy/Containerfile -t englms:dev .` (`--format docker` keeps the HEALTHCHECK) |
| Run the image | `./scripts/dev-up.sh && podman run --rm --read-only --tmpfs /tmp --network host --env-file .env englms:dev` (app :8080, management :8081) |
| Backend tests only | `source scripts/env.sh && (cd backend && ./mvnw -B verify)` (all tests, including `container`) |
| Backend tests without containers | `(cd backend && ./mvnw -B verify -DexcludedGroups=container)` (quick run) |
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
