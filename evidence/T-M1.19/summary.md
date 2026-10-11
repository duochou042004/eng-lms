# T-M1.19: Portable development environment — evidence (implementation)

Recorded by the LC from the backend-implementer's report (the agent could not write this file).

## Device
- Kali GNU/Linux Rolling 2026.3, kernel 7.1.5+kali-amd64, x86_64, 16 cores, 22 GB RAM, 103 GB free. Clone at `/home/kali/App_projects/eng-lms`.
- **Engine:** rootless Podman 5.8.6 with podman-compose 1.6.0; the user `podman.socket` is enabled; no `docker` CLI installed.
- **`env.sh` here:** `engine: podman (socket /run/user/1000/podman/podman.sock)`, then
  `DOCKER_HOST=unix:///run/user/1000/podman/podman.sock TESTCONTAINERS_RYUK_DISABLED=true`.
- **Shells:** bash 5.3.15, zsh 5.9.2.
- **Toolchain:** Temurin 25.0.4 and Boot CLI 4.1.0 (SDKMAN), Maven 3.10.0 (wrapper), Node 24.21.0 (nvm), pnpm 12.6.0 (corepack 0.36.0),
  Python 3.14.7 with jsonschema 4.26.0, jq 1.8.2, gh 2.102.0, glab 1.118.0, git 2.53.0. shellcheck not installed.
- **Playwright:** Chromium headless shell installed (e2e). Firefox and WebKit downloaded for `qa/`; their host libraries are missing (PO `sudo`
  `playwright install-deps`).

## What changed
- `scripts/lib/engine.sh` is the only place that picks the engine, in the packet's order a–e. It exports `ENGLMS_CONTAINER_ENGINE` (plus
  `ENGLMS_PODMAN_SOCK` on the Podman socket paths) and prints `engine: <cli> (<reason>)`; when nothing is reachable it prints one line naming Docker and
  Podman. `systemctl` is called only on path d; a missing `systemctl` (e.g. WSL without systemd) counts as "not reachable". Works in bash 3.2 and zsh.
- `env.sh` sources `engine.sh`, then sets only the Testcontainers variables. `ENGLMS_DOCKER_DEFAULT_SOCK` is a test-only override for the macOS
  `/var/run/docker.sock` check.
- `dev-up.sh`/`dev-down.sh` source `engine.sh` (not `env.sh`) and run compose, `container inspect`, `port`, `volume inspect`/`volume rm` through the
  chosen engine. `dev-down.sh` hides the engine line so its output stays one `dev-down:` line (T-M1.8 AC5).
- `scripts/lib/require-bash.sh` defines `englms_require_bash <major> <minor>`, sourced first by every executable script except `hooks/pre-push`.
- No change under `backend/src/main`.

## AC → proof

| AC | Proof |
|---|---|
| AC1 | `dev-scripts.test.sh` "engine.sh": a (docker, podman, invalid value), b (preset Podman and Docker `DOCKER_HOST`), c (Docker reachable; a podman-docker shim and a Podman server go to Podman; no `systemctl`), d (`systemctl --user is-active --quiet podman.socket`), e (`podman machine inspect`; no `systemctl`), nothing reachable on Linux and macOS (one line), sourcing twice. |
| AC2 | Same file, "env.sh": Docker default endpoints export nothing and drop a stale Ryuk flag; another endpoint exports `DOCKER_HOST`, plus `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` on macOS only (mocked `uname`); macOS with `/var/run/docker.sock` exports nothing; a preset Docker `DOCKER_HOST` is kept with Ryuk on; every Podman path turns Ryuk off; also under zsh. This device's values are in development-setup §3. |
| AC3 | Both mocks: dev-up twice, health via `container inspect`, compose without `env.sh`'s `DOCKER_HOST`, the other engine untouched, every dev-down case (default, `--purge`, nothing running, no volume, `--purge` twice). Real run: `dev-scripts-podman.log`. |
| AC4 | `require-bash.test.sh`: 3.2, 4.0, 4.3 refused with the documented message; 4.4, 5.0, 5.3 pass; every executable bash script sources the guard first (tests via `lib.sh`); `pre-push` has none. No host bash 3.2 (recorded skip); `docker.io/library/bash:3.2/4.3/4.4` containers (`bash-versions.log`): under 3.2 dev-down, run-all and gate are refused while `pre-push` runs and still blocks master; 4.3 refused; 4.4 runs; `env.sh` sources under 3.2. |
| AC5 | `gate-20261011T083455Z.log`: PASS, 13 steps, 675 s; backend 466/0 incl. Testcontainers on Podman; web 88; contract drift OK; E2E 86 passed at phone-small, tablet, laptop. |
| AC6 | Linux Podman cases green; the real gate ran on rootless Podman; CI 7/7 on the PR. |
| AC7 | development-setup §0 has Linux, macOS and Windows/WSL2 blocks and engine-neutral steps 1–8; the Podman grep (history excluded) leaves production/ADR text, dated records, engine-choice text and the `podman` permission rules next to their `docker` equivalents. |
| AC8 | `run-all.sh` PASS (`script-tests.log`, 568 checks); `check-docs.sh` PASS; shellcheck not installed; no `src/main` change. |

## GNU/BSD scan of `scripts/`

| Hit | Where | Handling |
|---|---|---|
| `paste -sd' '` without a file operand (BSD needs one) | `tests/gate.test.sh` ×3 | **Fixed**: `paste -sd' ' -` |
| `diff --label` | `contract-drift.sh` | Documented: GNU and macOS diff accept it |
| `mktemp` without a template | several | Unchanged: macOS uses `$TMPDIR` |
| `wc -l` (BSD pads) | two tests | Unchanged: compared arithmetically in `[[ ]]` |
| `xargs -r` | development-setup §3 only | Documented: macOS accepts `-r` |
| `head -c`, `grep -m`, `env -u`, `seq`, `sleep 0.1`, `date -u +%FT%TZ`, `sed -nE`, `cp -r`, POSIX `awk` | various | Portable; no change |
| bash-4 features (`mapfile`, `${x,,}`, empty `"${a[@]}"` under `set -u`) | several | Covered by the bash ≥ 4.4 guard |
| `sed -i`, `date -d`, `grep -P`, `readlink -f`, `stat -c`, `sort -V`, `find -printf`, `timeout`, `sha256sum` | — | Not found |

## Limitations
- Only Linux + rootless Podman is proven end to end; Docker, macOS and WSL2 rely on the mocked script tests and CI (Ubuntu/Docker).
- Colima's `TESTCONTAINERS_HOST_OVERRIDE` is documented, not automated (packet).
- A forced Podman engine with a stale socket file named by `ENGLMS_PODMAN_SOCK` is accepted by `env.sh`; Testcontainers then fails at connect time.
- shellcheck not run (not installed). `deployment.md` got one dev-row phrase and the `--network host` remark (outside the scope-6 list) to keep the AC7 grep clean.

## References
- https://java.testcontainers.org/supported_docker_environment/
- https://docs.podman.io/en/latest/markdown/podman-machine-inspect.1.html
- https://docs.docker.com/engine/manage-resources/contexts/

## Commands
```bash
scripts/tests/run-all.sh
./scripts/dev-up.sh && ./scripts/dev-up.sh && ./scripts/dev-down.sh --purge
ENGLMS_TASK=T-M1.19 ./scripts/gate.sh
./scripts/check-docs.sh
./scripts/check-path-ownership.sh feature/T-M1.19-portable-dev-env
```
