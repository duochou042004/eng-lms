# Development Setup

> §1–§5 were verified on the first development machine on 2026-09-25 (tech-stack.md §1) and made portable in T-M1.19 (DEC-106: Linux, macOS, Windows via WSL2;
> Docker or Podman). On a new machine run §0 first. Commands marked *(M1)* start working once their M1 packet has merged.

## 0. New machine checklist (DEC-083, DEC-106)

The PO clones the repository; the agent does the rest, in this order, and stops to ask the PO for anything that needs `sudo`/admin rights, an account or a
credential. Every step is idempotent; check each one with the command after `→`. Paths are relative to the clone ("the main checkout", wherever it is).

**Platform first** (then steps 1–8 are the same everywhere):

- **Linux:** the distribution's packages. Container engine: **rootless Podman** (the default; DEC-044) or Docker Engine (the `docker` group is
  root-equivalent: a PO decision on that machine; rootless Docker Engine is possible, set it up by Docker's guide).
- **macOS:** Homebrew: `brew install bash jq gh glab` (+ `git` if wanted). macOS ships bash 3.2, which every script refuses: Homebrew's bash must come first
  on `PATH` → `env bash -c 'echo $BASH_VERSION'` ≥ 4.4 (`/bin/bash` stays 3.2; zsh stays the login shell, `source scripts/env.sh` works in zsh).
  Python with `jsonschema`: Homebrew's Python is externally managed (PEP 668), so use a venv (`python3 -m venv ~/.venvs/englms && ~/.venvs/englms/bin/pip install
  jsonschema`, and put `~/.venvs/englms/bin` first on `PATH`) or `pipx`; `check-docs.sh` runs the first `python3` on `PATH` → `python3 -c 'import jsonschema'`.
  Container engine: **Docker Desktop**, **OrbStack** or **Colima** (each provides `docker`, with the Compose v2 plugin), or a **Podman machine**
  (`podman machine init && podman machine start`). If a local PostgreSQL already listens on 5432, set `ENGLMS_DEV_DB_PORT` (e.g. 5433) in `.env` and in
  the `SPRING_DATASOURCE_URL` there.
- **Windows:** only via **WSL2** (native PowerShell/cmd/Git Bash is not supported, DEC-106). Install WSL2 Ubuntu and **Docker Desktop with WSL integration** for
  that distribution (PO, admin). Clone, git, the toolchain and Claude Code all live **inside WSL** (`~/…`, not `/mnt/c/…`: the Windows file system breaks
  LF endings and executable bits and is slow) → `uname -r` names `microsoft`, `docker info` works inside WSL. From here on, follow the Linux steps with Docker.
  Playwright's Chromium needs `pnpm exec playwright install-deps chromium` inside WSL (PO, `sudo`).

1. **Toolchain present:** `source ~/.sdkman/bin/sdkman-init.sh && sdk env install && sdk default java 25.0.4-tem && sdk default springboot 4.1.0`
   (`.sdkmanrc`; the defaults matter because `sdkman_auto_env` may be off) → `java -version` **in a new shell** shows 25.0.4;
   `source ~/.nvm/nvm.sh && nvm install && corepack enable` (`.nvmrc`: Node 24.21.0; pnpm 12.6.0 from `packageManager`) → `pnpm -v`
   (any JDK 25 / Node 24.21 on `PATH` works; SDKMAN and nvm are how the pins are installed here);
   **bash ≥ 4.4** → `env bash -c 'echo $BASH_VERSION'`;
   **a container engine**, one of:
   - **Docker** (Docker Desktop, OrbStack, Colima or Docker Engine) with the Compose v2 plugin → `docker info` works and `docker compose version` (legacy
     `docker-compose` v1 is not supported); skip the Podman items here and in step 4;
   - **Podman** 5.7+ (5.8.6 on the first machine, 5.7.0 from Ubuntu 26.04 on the second, DEC-084) and its compose provider (`podman-compose`) →
     `podman compose version`; on Linux rootless → `podman info --format '{{.Host.Security.Rootless}}'` = `true`;
   `jq`, `curl` (E2E readiness probe), `python3` with `jsonschema` (check-docs), `gh` **≥ 2.101** (merge-gate needs `gh pr checks --json`; distribution packages can be older, e.g. Ubuntu 26.04's 2.46.0, so use GitHub's apt repository, DEC-084), `glab`, `git` (`shellcheck` optional).
   If SDKMAN, nvm, the container engine or any other tool is missing, ask the PO to install it: agents don't run `sudo` or download-and-run installers.
2. **Accounts (PO):** `gh auth status` (repo, workflow scopes) and `glab auth status` (gitlab.com) must show `duochou042004`; git identity
   (`git config user.name` / `user.email`) as on GitHub; git push credentials for both hosts (the PO runs `gh auth setup-git` and sets glab's helper, e.g.
   `git config --global credential.https://gitlab.com.helper '!glab auth git-credential'`; give `glab`'s full path, e.g. `!/snap/bin/glab` or `!/usr/bin/glab`; the agent may set the helper with the PO's OK, no secret is entered, DEC-084) → `git config --get-regexp '^credential\.'`. Agents never enter credentials.
3. **Clone setup:** `./scripts/install-hooks.sh` → `git config --get core.hooksPath` = `scripts/hooks`; `git remote add gitlab https://gitlab.com/duochou042004/eng-lms.git`
   (if missing) → `git remote -v`; `cp .env.example .env` (dev-only values; agents may run it during development, DEC-094) → `test -f .env`.
4. **Engine reachable:** Docker: nothing to do. Podman on Linux, once per machine (DEC-044): `systemctl --user enable --now podman.socket`. Podman on macOS:
   `podman machine start`. → `source scripts/env.sh` prints `engine: docker|podman (…)` and the Testcontainers variables (§3).
   To pick one engine when both are installed: `export ENGLMS_CONTAINER_ENGINE=docker` (or `podman`).
5. **Dev database:** `./scripts/dev-up.sh` (pulls the digest-pinned `postgres:18`, waits for health) → `docker ps` / `podman ps` shows it healthy.
6. **Installs:** `(cd web && pnpm install --frozen-lockfile)`, `(cd e2e && pnpm install --frozen-lockfile && pnpm browsers)`, `(cd qa && pnpm install --frozen-lockfile)`.
   If Chromium fails to launch for missing system libraries, ask the PO to run `(cd e2e && pnpm exec playwright install-deps chromium)` (needs `sudo`).
7. **Image (optional; not part of the gate, checks the Containerfile):** `podman build --format docker -f deploy/Containerfile -t englms:dev .` → `podman images englms`
   (Docker: `docker build -f deploy/Containerfile -t englms:dev .` → `docker images englms`).
8. **Verify:** `./scripts/gate.sh` (all steps green, including Testcontainers and E2E) and `./scripts/gitlab-sync.sh` (mirror reachable). Record the OS, engine,
   bash and tool versions in `progress.json` `environment`, the clone path in `project.repoLocal`, and the result in the handoff.

## 1. Toolchain

```bash
# Java 25 + Spring Boot CLI (SDKMAN). Non-interactive shells must source SDKMAN explicitly:
source "$HOME/.sdkman/bin/sdkman-init.sh"
sdk env            # reads .sdkmanrc (java=25.0.4-tem, springboot=4.1.0)

# Node 24 (nvm). Non-interactive shells must source nvm explicitly:
source "$HOME/.nvm/nvm.sh" && nvm use   # reads .nvmrc (24.21.0)
corepack enable                          # pnpm version pinned in web/package.json "packageManager"

# Container engine: Docker, or Podman (Linux: once, `systemctl --user enable --now podman.socket`; macOS: `podman machine start`) — see §0 and §3.
source scripts/env.sh                    # picks the engine and sets the Testcontainers variables
```

Agents: every `Bash` call is a fresh shell. Prefix toolchain commands with the `source …` lines (when SDKMAN/nvm are installed; any JDK 25 / Node 24.21 on
`PATH` also works) and `source scripts/env.sh` before Testcontainers runs.

## 2. Repository bootstrap *(M1)*

Live since T-M1.4. The dev database is PostgreSQL 18 from `deploy/compose.dev.yaml` (pinned by digest, `127.0.0.1:5432` only, volume `englms-dev-pgdata`).
The backend reads `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD` (no default).

```bash
cp .env.example .env                          # dev-only values; .env is git-ignored
./scripts/dev-up.sh                           # docker|podman compose up -d, then waits for the healthcheck (idempotent)
set -a; source .env; set +a                   # export the SPRING_DATASOURCE_* values
(cd backend && ./mvnw spring-boot:run)        # API :8080 (GET /api/v1/meta) ; actuator :8081 (health, info)
(cd web && pnpm install && pnpm dev)          # http://localhost:5173 (proxies /api → :8080)
./scripts/dev-down.sh                         # stop; keeps the data volume
./scripts/dev-down.sh --purge                 # stop and delete the data volume
```

**Dev tutor (T-M2.1).** The local tutor is created like in production, from a secret file (FR-AUTH-02; there is no `scripts/dev-bootstrap`). Once per database:

```bash
mkdir -p .data && umask 077 && printf '%s' 'choose-a-local-password' > .data/tutor-password   # git-ignored; 10–128 characters, not a common password
ENGLMS_BOOTSTRAP_TUTOR_USERNAME=tutor ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE=$PWD/.data/tutor-password (cd backend && ./mvnw spring-boot:run)
```

The first start creates `tutor` with `mustChangePassword=true` (log: `Tutor account created from the bootstrap secret`); later starts ignore the variables. Lost the
password: runbooks §4 (`java -jar backend/target/englms-*.jar --englms.cli=reset-tutor-password --spring.main.web-application-type=none` with the `SPRING_DATASOURCE_*` values).
Sign-in needs the CSRF handshake (`GET /api/v1/auth/session` sets `XSRF-TOKEN`, send it back as `X-XSRF-TOKEN`).

**Cookies on `http://localhost`.** Session, remember-me and CSRF cookies are `Secure` (NFR-SEC-04). Chromium and Firefox keep Secure cookies from `http://localhost`.
For an engine that refuses them (WebKit), start with the `local` profile and `SERVER_SERVLET_SESSION_COOKIE_SECURE=false`
(`SPRING_PROFILES_ACTIVE=local`); without the `local` profile that setting stops startup. Nothing else uses the `local` profile.

Planned: `./scripts/seed-dev.sh` (sample students, dev profile only, not domain seed data) arrives with the students module (M2).

## 3. Testcontainers on Docker or Podman

`scripts/env.sh` (bash or zsh; `gate.sh` and `contract-drift.sh` source it) picks the engine with `scripts/lib/engine.sh`, in this order:
`ENGLMS_CONTAINER_ENGINE=docker|podman` → an existing `DOCKER_HOST` (Podman when its path contains `podman`) → Docker when `docker info` works and the server
is not Podman (a `podman-docker` shim counts as Podman) → rootless Podman on Linux (the user socket, `ENGLMS_PODMAN_SOCK` overrides its path) → a Podman
machine on macOS. Nothing reachable: it stops with one message. `dev-up.sh`/`dev-down.sh` use the same detection but not `env.sh`. Then, per shell:

```bash
source scripts/env.sh                         # prints the engine and the variables below
(cd backend && ./mvnw -B verify)              # all tests, including the `container`-tagged ones
```

| Engine | What `env.sh` exports | Ryuk |
|---|---|---|
| Docker, context endpoint `unix:///var/run/docker.sock` or Docker Desktop's `~/.docker/run/docker.sock` (or `/var/run/docker.sock` exists on macOS) | nothing: Testcontainers finds the socket itself (exporting a host path would break Docker Desktop's discovery) | on |
| Docker, any other context endpoint (Colima, OrbStack without the default link, Docker Desktop on Linux, other contexts) | `DOCKER_HOST=<endpoint>`; on macOS also `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` (the in-VM path Ryuk mounts) | on |
| Docker, `DOCKER_HOST` already set | nothing (kept) | on |
| Podman (Linux socket, macOS machine, a preset Podman `DOCKER_HOST`, a `podman-docker` shim) | `DOCKER_HOST=unix://<Podman socket>` unless set, `TESTCONTAINERS_RYUK_DISABLED=true` | off |

Ryuk is disabled on Podman because it needs privileged mode under rootless Podman (DEC-044); test containers are then removed by JVM shutdown hooks.
**Colima:** if Ryuk or container-to-host access fails, also export `TESTCONTAINERS_HOST_OVERRIDE=$(colima ls -j | jq -r .address)` (needs `colima start
--network-address`); not automated (T-M1.19 scope). Recorded on the T-M1.19 device (Kali Linux, rootless Podman 5.8.6): `engine: podman (socket
/run/user/1000/podman/podman.sock)`, `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock TESTCONTAINERS_RYUK_DISABLED=true`.

After a crash, remove leftovers (`docker` or `podman`, same flags; GNU and macOS `xargs` both accept `-r`):

```bash
podman ps -a --filter label=org.testcontainers=true -q | xargs -r podman rm -fv   # -v also removes their anonymous volumes
podman volume prune                                                           # unused anonymous volumes left by earlier crashes (asks first)
docker ps -a --filter label=org.testcontainers=true -q | xargs -r docker rm -fv   # Docker (Ryuk normally removes them)
docker volume prune
```

Shutdown order (fixed in T-M1.8): with Ryuk off (Podman), Testcontainers' JVM shutdown hook and Spring's run at the same time, and Spring Modulith queries the database while
its context closes. `SpringContextsClosingListener` (test sources) therefore closes the Spring test contexts as soon as the test plan ends, while the database still runs.
Keep new `@SpringBootTest` classes on the default context cache; no per-test shutdown handling is needed.

CI uses the Ubuntu runner's Docker without `env.sh` (Testcontainers' own discovery). The previous fallback (a `test-external-db` profile) is no longer needed.

## 4. Useful commands *(M1+)*

| Task | Command |
|---|---|
| All local gates | `./scripts/gate.sh` (live, T-M1.5): fail-fast, in CI order: docs → script tests → backend `verify` (sources `scripts/env.sh`) → web install/lint/typecheck/test/build/budget/contrast → contract-drift → `qa/` install + typecheck (T-M1.18) → E2E. `--list` shows the steps, `--from <step>` resumes. `ENGLMS_TASK=T-Mx.y ./scripts/gate.sh` also writes `evidence/<task>/gate-<UTC>.log` |
| Contract drift | `./scripts/contract-drift.sh` (regenerates the contract and the web types, fails on a diff, leaves the regenerated files for review) |
| Build the image | `podman build --format docker -f deploy/Containerfile -t englms:dev .` (`--format docker` keeps the HEALTHCHECK). Docker: `docker build -f deploy/Containerfile -t englms:dev .` |
| Run the image | Linux + Podman: `./scripts/dev-up.sh && podman run --rm --read-only --tmpfs /tmp --network host --env-file .env englms:dev` (app :8080, management :8081). `--network host` does not reach the host on Docker Desktop or a Podman machine: publish the ports and point the datasource at the host instead, e.g. `docker run --rm --read-only --tmpfs /tmp -p 127.0.0.1:8080:8080 -p 127.0.0.1:8081:8081 --env-file .env -e SPRING_DATASOURCE_URL=jdbc:postgresql://host.docker.internal:5432/englms englms:dev` (Podman machine: `host.containers.internal`) |
| Backend tests only | `source scripts/env.sh && (cd backend && ./mvnw -B verify)` (all tests, including `container`; Docker or Podman) |
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
