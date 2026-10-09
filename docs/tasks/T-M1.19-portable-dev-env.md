# T-M1.19: Portable development environment (Docker or Podman; Linux, macOS, Windows via WSL2)

| Field | Value |
|---|---|
| Milestone | M1 (tooling follow-up; runs before T-M2.4) |
| Status | ready (G0; PO start signal DEC-106) |
| Owner role | BE (backend-implementer; tooling) |
| Branch | `feature/T-M1.19-portable-dev-env` (from `develop`) |
| Depends on | T-M2.9 merged (`37e8ce0`) |
| Estimate | 1.5 agent-days |
| Trace | PO requirement DEC-106 (portability; Windows = WSL2 + Docker Desktop); ADR-0012 (development bullet amended by DEC-106; production part unchanged: Podman Quadlet + Caddy); DEC-044 (rootless Podman socket), DEC-083/084 (new-machine checklist), DEC-094 (one checkout); development-setup §0–§4; tech-stack §1, §4; T-M1.4 (local stack), T-M1.5 (gate), T-M1.6 (E2E) |

## Goal
A developer or agent can clone the repository on Linux, macOS or Windows (inside WSL2) with either Docker or Podman as the container engine and get
a green `./scripts/gate.sh` (Testcontainers, dev database, E2E) after following development-setup §0 for their platform. Today the scripts require a
systemd-activated rootless Podman socket and bash ≥ 4.4 on Linux, and the agent docs name Podman and a Linux home path. The next session runs on a new
device that may be a Mac or a Windows PC with Docker; this task is implemented **and proven on that device** before T-M2.4.

## Scope
- In:
  1. **One engine detection**, `scripts/lib/engine.sh` (sourced, no side effects beyond exporting), used by `scripts/env.sh` and by
     `dev-up.sh`/`dev-down.sh`. Order:
     a. `ENGLMS_CONTAINER_ENGINE=docker|podman` forces the CLI;
     b. else, an existing `DOCKER_HOST` is kept; the CLI is `podman` when the socket path contains `podman`, else `docker`;
     c. else Docker when `docker info` succeeds **and the server is not Podman** (`docker version --format '{{.Server.Os}}/{{.Server.Version}}'` or
        `docker info` naming Podman, e.g. the `podman-docker` shim; such a server goes to the Podman path);
     d. else rootless Podman on Linux (today's socket; `ENGLMS_PODMAN_SOCK` still honoured);
     e. else a Podman machine on macOS (`podman machine inspect` socket path).
     It exports `ENGLMS_CONTAINER_ENGINE` and prints the choice; when nothing is reachable it stops with one message naming Docker and Podman.
     `systemctl` is called only on path d.
  2. **Testcontainers variables** (only `env.sh`, which `gate.sh`, `contract-drift.sh` and agents source): on Docker, when `DOCKER_HOST` is unset,
     export it from `docker context inspect --format '{{.Endpoints.docker.Host}}'` (Testcontainers Java does not read Docker contexts: Docker Desktop
     and OrbStack work without it, Colima and other non-default contexts do not); Ryuk **on**. On every Podman path (incl. a preset Podman
     `DOCKER_HOST`) `TESTCONTAINERS_RYUK_DISABLED=true`. Colima's extra overrides (`TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`,
     `TESTCONTAINERS_HOST_OVERRIDE`) are documented in development-setup §3, not automated.
  3. **`dev-up.sh` / `dev-down.sh`** source `lib/engine.sh` (they do not need the Testcontainers socket and never call `env.sh`) and run
     `<engine> compose` (v2 plugin for Docker; `docker-compose` v1 is not supported), `container inspect`, `port`, `volume inspect`/`volume rm` through
     it; behaviour and output otherwise unchanged (idempotent, `--purge`, health wait). `deploy/compose.dev.yaml` is already engine-neutral.
  4. **bash ≥ 4.4 everywhere:** one shared guard (`scripts/lib/require-bash.sh`, sourced by every executable script and by `scripts/tests/lib.sh`/
     `run-all.sh`) fails fast with "bash ≥ 4.4 required (macOS: brew install bash; Homebrew bash first on PATH)". 4.4, not 4.0: earlier versions
     abort on an empty array under `set -u` (`dev-down.sh` `"${env_args[@]}"`, `e2e-run.sh` `"${args[@]}"`), and tests use `${t,,}`. The guard takes the
     version as a parameter so it is unit-testable (`BASH_VERSINFO` is read-only). A scan of `scripts/` for GNU/BSD-divergent tools and flags (`sed -i`,
     `date -d`, `grep -P`, `readlink -f`, `stat -c`, `xargs -r`, `diff --label`, `mktemp` options, `sort -V`, `find -printf`, …) fixes or documents each hit.
  5. **Testcontainers classes:** `TestcontainersConfiguration`/`SpringContextsClosingListener` comments engine-neutral (start retry and shutdown-hook
     cleanup stay; with Ryuk on, nothing else changes).
  6. **Docs and agent config:**
     - development-setup §0 per platform (Linux: Podman or Docker; macOS: Homebrew `bash`, `jq`, `gh`, `glab`, Python with `jsonschema` (Homebrew
       Python is externally managed, PEP 668: a venv or `pipx`, and which `python3` `check-docs.sh` uses), SDKMAN, nvm, Docker Desktop/OrbStack/Colima or
       Podman machine, `ENGLMS_DEV_DB_PORT` when a local PostgreSQL holds 5432; Windows: WSL2 Ubuntu + Docker Desktop with WSL integration, clone,
       git and toolchain **inside WSL** (not `/mnt/c`), Claude Code started inside WSL); step 1 skips the Podman items when Docker is used;
     - §1–§3 engine-neutral (§3: Ryuk per engine, Colima overrides, leftover clean-up for both engines); §4 image commands as Podman examples with
       Docker equivalents (`--network host` does not reach the host on Docker Desktop or a Podman machine: use `host.docker.internal`/
       `host.containers.internal`);
     - tech-stack §1 and §4 (development engine: Docker or Podman; production Podman); architecture-overview (podman-compose line); runbooks (dev
       volume removal for both engines); agent-roles (Podman line); `CLAUDE.md` (stack line, shell notes: source SDKMAN/nvm when installed, any
       JDK 25 / Node 24.21 on `PATH`); coding-agent-rules and session-handoff-protocol (no fixed home path: "the main checkout");
     - `.claude/settings.json` **and** its mirror `docs/09-harness/claude-settings.proposed.json`: Docker equivalents of the allowed Podman commands
       **and of the deny rules** (`docker volume rm englms-pgdata:*`, `docker volume rm englms-files:*`);
     - `progress.json` `environment` and `project.repoLocal` for the new device.
- Out of scope (explicit):
  - **Native Windows** (PowerShell/cmd/Git Bash without WSL): not supported (DEC-106); `mvnw.cmd` stays as generated.
  - Production deployment (ADR-0012 production part) and `deploy/Containerfile`; CI workflows (Ubuntu runners: Docker for Testcontainers, Podman for
    the image job in `container.yml`) and the GitLab CI mirror.
  - Replacing SDKMAN/nvm or adding a toolchain manager (mise, asdf, devcontainers): the pins stay in `.sdkmanrc`/`.nvmrc`.
  - Automating Colima's Testcontainers overrides; legacy `docker-compose` v1; rootless Docker Engine set-up (documented if met).
  - Any product code or behaviour.

## Guardrail answers (scope.md §6)
1. **Trace:** DEC-106 (PO), ADR-0012 (development bullet), DEC-044/083/084/094. 2. **Drift toward excluded scope?** No; no product feature.
3. **Mandatory setup added?** None for the tutor; developers choose Docker or Podman. 4. **Weekly use?** Every development session. 5. **Hard-coded semantics?** None.

## Design notes
- `lib/engine.sh` is the only place that decides; `env.sh` adds only the Testcontainers variables; the dev scripts add nothing. Sourcing it twice is
  harmless (idempotent exports).
- `podman container exists` has no Docker equivalent: `<engine> container inspect <name> >/dev/null 2>&1` for both; volumes likewise.
- **macOS:** `/dev/tcp` (bash), `seq`, `date -u +%FT%TZ` work; bash 3.2 is refused by the guard; zsh is the default interactive shell, so `env.sh`
  (which says "bash or zsh") is tested under zsh when installed. Docker Desktop publishes `127.0.0.1:5432` as on Linux.
- **WSL2:** `.gitattributes` (`* text=auto eol=lf`) keeps scripts LF and the executable bits are in git (`100755`); cloning under `/mnt/c` breaks both
  and is slow; Playwright's Chromium needs `playwright install-deps` inside WSL (PO, `sudo`).
- **Tests:** `scripts/tests/dev-scripts.test.sh` gains a mock `docker` next to the mock `podman` (PATH-injected like `mock-gh`). Every engine case runs
  with `env -u DOCKER_HOST -u ENGLMS_CONTAINER_ENGINE -u TESTCONTAINERS_RYUK_DISABLED` (so `gate.sh`'s own `env.sh` does not leak in) and a `PATH`
  whose `docker` is a failing stub for the Podman cases (CI runners have a real `docker`). The bash guard is unit-tested with a version parameter, and
  with a real bash 3.2 when present (otherwise a recorded skip).

## Acceptance criteria
- AC1 (DEC-106): `lib/engine.sh` picks the engine in the order a–e, prints and exports it, routes a Podman-backed `docker` (shim) and a preset Podman
  `DOCKER_HOST` to the Podman path, and fails with one message naming Docker and Podman when nothing is reachable; proven by the script tests for each
  branch (mock engines, isolated environment).
- AC2: `source scripts/env.sh` exports `DOCKER_HOST` from the Docker context when unset (Docker path, Ryuk on) and `TESTCONTAINERS_RYUK_DISABLED=true`
  on every Podman path; script tests per branch.
- AC3: `dev-up.sh`/`dev-down.sh` (incl. `--purge`, nothing running, twice in a row) work with Docker and with Podman without sourcing `env.sh`
  (script tests with both mocks; a real run on the new device's engine).
- AC4: every executable script and the test runner refuse bash < 4.4 with the documented message (unit test of the guard; bash 3.2 run when available);
  the GNU/BSD scan's hits are fixed or documented in the summary.
- AC5: on the new device, `./scripts/gate.sh` is green end to end (Testcontainers, contract drift, E2E at the mandatory viewports) with its engine;
  OS, engine, bash and tool versions are recorded in `progress.json` `environment` and `evidence/T-M1.19/summary.md`.
- AC6: Linux + rootless Podman keeps working: its script-test cases stay green and CI stays 7/7.
- AC7: development-setup §0 has a checklist per platform (Linux, macOS, Windows/WSL2) a fresh agent can follow; every doc and config listed in
  scope 6 no longer assumes Podman, Linux or a fixed home path for development (a `grep -ri podman` over `docs/` (excluding history: the decision log,
  handoff archive, task packets, evidence) and `.claude/` shows only production/ADR, optional-Podman or engine-choice text).
- AC8: `scripts/tests/run-all.sh` green, `./scripts/check-docs.sh` green, `shellcheck` clean on changed scripts (when installed); no product code changed.

## Test plan
- Implementation: the script tests above; a real `dev-up.sh`/`dev-down.sh`/`gate.sh` run on the device.
- Independent QA focus: follow development-setup §0 for the device's platform from a clean shell; `source scripts/env.sh` with the engine stopped
  (clear message) and running; `ENGLMS_CONTAINER_ENGINE` override; `dev-up.sh` twice (idempotent), `dev-down.sh --purge`; the full gate; on macOS a
  script under `/bin/bash` (3.2) fails fast. Exploratory charter: find any remaining Linux- or Podman-only assumption in scripts, docs or config.
- SEC: not triggered (no identity, endpoint, file or personal-data change). UX: none.

## Evidence required
- `evidence/T-M1.19/summary.md` (platform, engine, versions, AC → proof, the GNU/BSD scan), the gate log from the device, the script-test log; QA report
  via `qa/T-M1.19`.

## Docs to update
- Scope 6 (development-setup §0–§4, tech-stack §1/§4, architecture-overview, runbooks, agent-roles, `CLAUDE.md`, coding-agent-rules,
  session-handoff-protocol, `.claude/settings.json` + `claude-settings.proposed.json`, `progress.json`), README toolchain table if it names Podman as
  required. ADR-0012's development bullet was amended with DEC-106 (packet PR).

## Risks & assumptions
- Only the new device's platform is proven end to end; the other platforms rely on the mocked script tests and CI (Linux/Docker). The first session on a
  third platform reruns §0 and records it (DEC-083 practice).
- On Linux, using Docker Engine means the `docker` group (root-equivalent): a PO decision on that machine; rootless Podman stays the Linux default.
- Docker Desktop licensing is the PO's concern (free for personal use); OrbStack/Colima are alternatives on macOS.
- If the device cannot install a tool (no `sudo`/admin), the agent stops and asks the PO (§0 rule).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh   # SDKMAN/nvm when installed
scripts/tests/run-all.sh
./scripts/dev-up.sh && ./scripts/dev-up.sh && ./scripts/dev-down.sh --purge
ENGLMS_TASK=T-M1.19 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M1.19-portable-dev-env
```
