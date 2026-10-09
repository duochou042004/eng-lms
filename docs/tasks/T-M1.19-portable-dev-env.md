# T-M1.19: Portable development environment (Docker or Podman; Linux, macOS, Windows via WSL2)

| Field | Value |
|---|---|
| Milestone | M1 (tooling follow-up; runs before T-M2.4) |
| Status | ready (G0; PO start signal DEC-106) |
| Owner role | BE (backend-implementer; tooling) |
| Branch | `feature/T-M1.19-portable-dev-env` (from `develop`) |
| Depends on | T-M2.9 merged (`37e8ce0`) |
| Estimate | 1 agent-day |
| Trace | PO requirement DEC-106 (portability; Windows = WSL2 + Docker Desktop); NFR-OPS-04; ADR-0012 (production stays Podman Quadlet + Caddy; this task is development only); DEC-044 (rootless Podman socket), DEC-083/084 (new-machine checklist), DEC-094 (one checkout); development-setup §0–§3; tech-stack §1; T-M1.4 (local stack), T-M1.5 (gate), T-M1.6 (E2E) |

## Goal
A developer or agent can clone the repository on Linux, macOS or Windows (inside WSL2) with either Docker or Podman as the container engine and get
a green `./scripts/gate.sh` (Testcontainers, dev database, E2E) after following development-setup §0 for their platform. Today the scripts require a
systemd-activated rootless Podman socket and bash 4 on Linux, and the agent docs name a Linux home path. The next session runs on a new device that
may be a Mac or a Windows PC with Docker; this task is implemented **and proven on that device** before T-M2.4.

## Scope
- In:
  1. **Engine detection** in `scripts/env.sh` (sourced by `gate.sh`, `contract-drift.sh` and agents): an existing `DOCKER_HOST` is kept; else
     `ENGLMS_CONTAINER_ENGINE=docker|podman` forces one; else Docker when `docker info` succeeds (Docker Desktop, OrbStack, Colima, Docker Engine,
     WSL2 integration): `DOCKER_HOST` left to Docker's own context, Ryuk **on**; else rootless Podman on Linux (today's socket, Ryuk off); else Podman
     machine on macOS (`DOCKER_HOST` from `podman machine inspect`, Ryuk off). It exports `ENGLMS_CONTAINER_ENGINE` and prints the choice; when nothing
     is reachable it stops with one message naming both options. `systemctl` is called only on the Linux Podman path.
  2. **`dev-up.sh` / `dev-down.sh`** run `docker compose` or `podman compose` (and `inspect`, `port`, `container exists`/`ps`, `volume rm`) through
     the detected engine; behaviour and output unchanged otherwise (idempotent, `--purge`, health wait). `deploy/compose.dev.yaml` is already
     engine-neutral (fully qualified, digest-pinned image).
  3. **bash ≥ 4 guard:** the scripts that use bash-4 features (`mapfile`, `declare -A`: `check-path-ownership.sh`, `gitlab-sync.sh`, `merge-gate.sh`,
     and any other found) fail fast on bash 3.2 with "bash ≥ 4 required (macOS: brew install bash)"; every script keeps `#!/usr/bin/env bash`.
     A scan of the scripts for GNU-only flags (`sed -i`, `date -d`, `grep -P`, `readlink -f`, `stat -c`, …) finds none or fixes them.
  4. **Testcontainers:** `TestcontainersConfiguration`/`SpringContextsClosingListener` comments and behaviour are engine-neutral (the start retry and
     the shutdown-hook cleanup stay; with Ryuk on, nothing else changes).
  5. **Docs and agent config:** development-setup §0 per platform (Linux: Podman or Docker; macOS: Homebrew `bash`, `jq`, `gh`, `glab`, Python
     `jsonschema`, SDKMAN, nvm, Docker Desktop/OrbStack/Colima or Podman machine; Windows: WSL2 Ubuntu + Docker Desktop with WSL integration, the clone
     inside the WSL file system (not `/mnt/c`), git and the toolchain installed inside WSL) and §1–§3 engine-neutral; tech-stack §1 (engine: Docker or
     Podman for development); `CLAUDE.md` (stack line, shell notes: source SDKMAN/nvm when installed, any JDK 25 / Node 24.21 on `PATH` is fine);
     `docs/09-harness/coding-agent-rules.md` and `session-handoff-protocol.md` (no fixed home path: "the main checkout"); `.claude/settings.json`
     (Docker equivalents of the allowed Podman commands); `progress.json` `environment` and `project.repoLocal` for the new device.
- Out of scope (explicit):
  - **Native Windows** (PowerShell/cmd/Git Bash without WSL): not supported (DEC-106); `mvnw.cmd` stays as generated.
  - Production deployment (ADR-0012: Podman Quadlet + Caddy) and the `deploy/Containerfile` build, CI workflows (already Docker on Ubuntu runners),
    the GitLab CI mirror.
  - Replacing SDKMAN/nvm or adding a toolchain manager (mise, asdf, devcontainers): the pins stay in `.sdkmanrc`/`.nvmrc`.
  - Any product code or behaviour.

## Guardrail answers (scope.md §6)
1. **Trace:** DEC-106 (PO), NFR-OPS-04, DEC-044/083/084/094, ADR-0012 (unchanged). 2. **Drift toward excluded scope?** No; no product feature.
3. **Mandatory setup added?** None for the tutor; developers choose Docker or Podman. 4. **Weekly use?** Every development session. 5. **Hard-coded semantics?** None.

## Design notes
- **Detection order** is the scope order; `ENGLMS_PODMAN_SOCK` keeps working for the Linux Podman path. Docker needs no `DOCKER_HOST` export
  (Testcontainers reads the Docker context); Ryuk stays enabled on Docker because it runs unprivileged there.
- **One engine function**, e.g. `engine() { "${ENGLMS_CONTAINER_ENGINE}" "$@"; }`, used by `dev-up.sh`/`dev-down.sh`; `podman container exists`
  has no Docker equivalent: use `<engine> container inspect <name> >/dev/null 2>&1` for both. `docker compose` (v2 plugin) is required; the legacy
  `docker-compose` binary is not supported.
- **macOS specifics:** `/dev/tcp` (bash), `seq`, `date -u +%FT%TZ` work on macOS; bash 3.2 does not run `mapfile`/`declare -A` (guard). Docker
  Desktop on macOS publishes `127.0.0.1:5432` as on Linux.
- **WSL2 specifics:** clone and run inside the WSL file system (`~/…`), never under `/mnt/c` (slow I/O, CRLF and permission problems); the
  `.gitattributes` (`* text=auto eol=lf`) already keeps scripts LF; Playwright's Chromium needs `playwright install-deps` inside WSL (PO, `sudo`).
- **Tests:** `scripts/tests/dev-scripts.test.sh` gains a mock `docker` next to the mock `podman` (PATH-injected, like `mock-gh`) so both engine paths
  of `env.sh`, `dev-up.sh` and `dev-down.sh` are covered on any machine; a test runs a bash-4 script under a fake `BASH_VERSINFO` or a bash 3.2 if
  present, otherwise the guard is unit-tested by sourcing it.

## Acceptance criteria
- AC1 (DEC-106): `source scripts/env.sh` picks the engine in the documented order, prints it, exports `ENGLMS_CONTAINER_ENGINE` (and `DOCKER_HOST`/
  `TESTCONTAINERS_RYUK_DISABLED=true` only on the Podman paths), honours an existing `DOCKER_HOST` and the override, and fails with one message naming
  Docker and Podman when no engine is reachable; proven by the script tests for each branch (mock engines).
- AC2: `dev-up.sh`/`dev-down.sh` (incl. `--purge`) work with Docker and with Podman (script tests with both mocks; a real run on the new device's engine).
- AC3: the bash-4 scripts fail fast with the documented message under bash < 4 (test); no GNU-only flag remains in `scripts/` (scan recorded in the summary).
- AC4: on the new device, `./scripts/gate.sh` is green end to end (Testcontainers, contract drift, E2E at the mandatory viewports) with its engine;
  the OS, engine and versions are recorded in `progress.json` `environment` and `evidence/T-M1.19/summary.md`.
- AC5: Linux + rootless Podman keeps working: the script tests for that path stay green, and CI (Docker on Ubuntu) stays 7/7.
- AC6: development-setup §0 has a checklist per platform (Linux, macOS, Windows/WSL2) that a fresh agent can follow, and §1–§3, tech-stack, `CLAUDE.md`,
  coding-agent-rules, session-handoff-protocol and `.claude/settings.json` no longer assume Podman, Linux or a fixed home path.
- AC7: `scripts/tests/run-all.sh` green, `./scripts/check-docs.sh` green, `shellcheck` clean on changed scripts (when installed); no product code changed.

## Test plan
- Implementation: the script tests above (mock `docker`/`podman`, each detection branch, both engines for dev-up/down, the bash guard); a real
  `dev-up.sh`/`dev-down.sh`/`gate.sh` run on the device.
- Independent QA focus: follow development-setup §0 for the device's platform from a clean shell; `source scripts/env.sh` with the engine stopped
  (clear message) and running; `ENGLMS_CONTAINER_ENGINE` override; `dev-up.sh` twice (idempotent), `dev-down.sh --purge`; the full gate; on macOS,
  a bash-4 script under `/bin/bash` (3.2) fails fast. Exploratory charter: find any remaining Linux- or Podman-only assumption in scripts or docs.
- SEC: not triggered (no identity, endpoint, file or personal-data change). UX: none.

## Evidence required
- `evidence/T-M1.19/summary.md` (platform, engine, versions, AC → proof, GNU-flag scan), the gate log from the device, the script-test log; QA report via
  `qa/T-M1.19`.

## Docs to update
- development-setup §0–§3, tech-stack §1, `CLAUDE.md`, coding-agent-rules, session-handoff-protocol, `.claude/settings.json`, `progress.json`
  (`environment`, `project.repoLocal`), README toolchain table if it names Podman as required.

## Risks & assumptions
- Only the new device's platform is proven end to end; the other platforms rely on the mocked script tests and CI (Linux/Docker). The first session on a
  third platform reruns §0 and records it (DEC-083 practice).
- Docker Desktop licensing is the PO's concern (free for personal use); OrbStack/Colima are alternatives on macOS.
- If the device cannot install a tool (no `sudo`/admin), the agent stops and asks the PO (§0 rule).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh   # SDKMAN/nvm when installed
scripts/tests/run-all.sh
./scripts/dev-up.sh && ./scripts/dev-down.sh
ENGLMS_TASK=T-M1.19 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M1.19-portable-dev-env
```
