# Development Setup

> §1–§5 were verified on the first development machine on 2026-09-25 (tech-stack.md §1); on a new machine run §0 first. Commands marked *(M1)* start working once their M1 packet has merged.

## 0. New machine checklist (DEC-083)

The PO clones the repository; the agent does the rest, in this order, and stops to ask the PO for anything that needs `sudo`, an account or a credential.
Every step is idempotent; check each one with the command after `→`.

1. **Toolchain present:** `source ~/.sdkman/bin/sdkman-init.sh && sdk env install && sdk default java 25.0.4-tem && sdk default springboot 4.1.0`
   (`.sdkmanrc`; the defaults matter because `sdkman_auto_env` may be off) → `java -version` **in a new shell** shows 25.0.4;
   `source ~/.nvm/nvm.sh && nvm install && corepack enable` (`.nvmrc`: Node 24.21.0; pnpm 12.6.0 from `packageManager`) → `pnpm -v`;
   Podman 5.7+ rootless (5.8.6 on the first machine, 5.7.0 from Ubuntu 26.04 on the second, DEC-084) → `podman info --format '{{.Host.Security.Rootless}}'` = `true`, and its compose provider (`podman-compose`) → `podman compose version`;
   `jq`, `curl` (E2E readiness probe), `python3` with `jsonschema` (check-docs), `gh`, `glab`, `git` (`shellcheck` optional).
   If SDKMAN, nvm, Podman, `podman-compose` or any other tool is missing, ask the PO to install it: agents don't run `sudo` or download-and-run installers.
2. **Accounts (PO):** `gh auth status` (repo, workflow scopes) and `glab auth status` (gitlab.com) must show `duochou042004`; git identity
   (`git config user.name` / `user.email`) as on GitHub; git push credentials for both hosts (the PO runs `gh auth setup-git` and sets glab's helper, e.g.
   `git config --global credential.https://gitlab.com.helper '!glab auth git-credential'`; with a snap `glab`, give its full path `!/snap/bin/glab`; the agent may set the helper with the PO's OK, no secret is entered, DEC-084) → `git config --get-regexp '^credential\.'`. Agents never enter credentials.
3. **Clone setup:** `./scripts/install-hooks.sh` → `git config --get core.hooksPath` = `scripts/hooks`; `git remote add gitlab https://gitlab.com/duochou042004/eng-lms.git`
   (if missing) → `git remote -v`; `cp .env.example .env` (dev-only values; **the PO runs it**: the agent deny rule `Read(./.env.*)` blocks the copy) → `test -f .env`.
4. **Podman socket (once per machine, as DEC-044):** `systemctl --user enable --now podman.socket` → `source scripts/env.sh` prints `DOCKER_HOST=…`.
5. **Dev database:** `./scripts/dev-up.sh` (pulls the digest-pinned `postgres:18`, waits for health) → `podman ps` shows it healthy.
6. **Installs:** `(cd web && pnpm install --frozen-lockfile)`, `(cd e2e && pnpm install --frozen-lockfile && pnpm browsers)`, `(cd qa && pnpm install --frozen-lockfile)`.
   If Chromium fails to launch for missing system libraries, ask the PO to run `(cd e2e && pnpm exec playwright install-deps chromium)` (needs `sudo`).
7. **Image (optional; not part of the gate, checks the Containerfile):** `podman build --format docker -f deploy/Containerfile -t englms:dev .` → `podman images englms`.
8. **Verify:** `./scripts/gate.sh` (all steps green, including Testcontainers and E2E) and `./scripts/gitlab-sync.sh` (mirror reachable). Record the versions and the
   host in `progress.json` `environment`, the clone path in `project.repoLocal`, and the result in the handoff.

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

Shutdown order (fixed in T-M1.8): with Ryuk off, Testcontainers' JVM shutdown hook and Spring's run at the same time, and Spring Modulith queries the database while
its context closes. `SpringContextsClosingListener` (test sources) therefore closes the Spring test contexts as soon as the test plan ends, while the database still runs.
Keep new `@SpringBootTest` classes on the default context cache; no per-test shutdown handling is needed.

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
| E2E (mandatory viewports) | `./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop` (live, T-M1.6): builds the jar with the SPA, starts it on :8080/:8081 against the dev DB, runs Playwright, always stops it. `--no-build` reuses the jar; other args go to Playwright. Once: `(cd e2e && pnpm install && pnpm browsers)` |
| E2E (all six viewports) | `./scripts/e2e-run.sh` (with `ENGLMS_TASK=T-Mx.y`, screenshots go to `evidence/<task>/screenshots/<project>/`) |
| E2E against a running app | `(cd e2e && E2E_BASE_URL=http://localhost:8080 pnpm test:pr)` |
| Docs check | `./scripts/check-docs.sh` |
| GitLab mirror CI (backup copy, DEC-060, DEC-080) | Once: `git remote add gitlab https://gitlab.com/duochou042004/eng-lms.git` (glab/https auth). Then `./scripts/gitlab-sync.sh [branch...]` after a merge or before a review; pipelines and 5-day artifacts: `glab ci list -R duochou042004/eng-lms` |
| Stop the DB | `./scripts/dev-down.sh` |

## 5. Editor settings

`.editorconfig` is authoritative. Recommended: IntelliJ IDEA (Java 25 language level) and VS Code with the oxc (oxlint), Stylelint and Prettier extensions (listed in
`.vscode/extensions.json` in M1).
