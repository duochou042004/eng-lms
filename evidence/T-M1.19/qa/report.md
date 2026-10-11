# T-M1.19 QA record (independent G3; recorded by the LC from the qa-evaluator's returned text)

Final verdict: **PASS** (round 2 at `ba8f0be`); merged via merge-gate as `8be6d9f` (PR #78).

## Round 2 (re-test of the round-1 fixes)

### QA report: T-M1.19 round 2 (independent G3 re-test of 787c457 / ba8f0be, PR #78)

**Result: PASS.** All seven round-1 findings are fixed, every regression check passed, and I found three new S4 items (minor, nothing blocking).

## Environment
- Kali Linux, kernel 7.1.5. bash 5.3.15, zsh 5.9.2.
- Rootless Podman 5.8.6 with podman-compose 1.6.0. The user `podman.socket` was active at the start and is active again now. No `docker` CLI on this machine.
- Repo on `feature/T-M1.19-portable-dev-env` at `ba8f0be`. Working tree clean before and after; I created no files in the repo.
- **Docker, macOS and Docker Desktop cases used my own fake commands.** I put stand-ins for `docker`, `podman`, `uname` and `systemctl` first on `PATH`, behind a toolset with the real podman and docker removed. I ran each case in an empty environment (`env -i`) and checked both bash and zsh where it matters. A fake socket stood in for the Podman socket.
- Logs (session-local, not kept in the repo): `env.txt`, `f1-real.log`, `matrix.log`, `f3.log`, `devscripts-mock.log`, `real-regression.log`, `bash32.log`, `extra.log`, `run-all.log`, `check-docs.log`.

## Round-1 fixes

| # | Verdict | Evidence |
|---|---|---|
| F-1 (S3) | **Fixed** | **Real test on this machine:** I stopped `podman.socket` and `podman.service`. `dev-up.sh` then printed `engine: podman (podman info; no API socket)` and the database came up healthy, twice in a row. `dev-down.sh` stopped it, and a second run said nothing was running. `source scripts/env.sh` returned 1 with one line naming `systemctl --user enable --now podman.socket`, in bash and zsh, and also when Podman was forced. After restarting the socket, env.sh was OK again. With fakes: systemctl failing (exit 3 or 127) falls back to `podman info`; if `podman info` also fails, you get the single "nothing reachable" message. On macOS (stopped machine) there is no fallback and `systemctl` is never called. |
| F-2 (S3) | **Fixed** | With `unix://$HOME/.docker/desktop/docker.sock` on Linux, env.sh exports nothing, clears a stale `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` and keeps Ryuk on. The §3 table row matches. |
| F-3 (S4) | **Fixed** (but see N-1) | Detect Docker, then stop Docker and source env.sh again: switches to Podman (bash and zsh). A child `dev-down.sh` also detects again. A user's `ENGLMS_CONTAINER_ENGINE=podman` set after a Docker detection is forced (`(ENGLMS_CONTAINER_ENGINE, …)`, no marker left). A leftover marker on its own does no harm. |
| F-4 (S4) | **Fixed** | With `ENGLMS_PODMAN_SOCK=/nope`, the engine message and env.sh's message each add `(ENGLMS_PODMAN_SOCK=/nope is not a socket)` and stay one line. Confirmed on the real machine and with fakes. |
| F-5 (S4) | **Fixed** | Real machine and both fake engines: `dev-down: nothing is running and there is no englms-dev-pgdata volume`. With `--purge` it says `nothing was running and there is no …`. |
| F-6 (S4) | **Fixed** | §0 step 1 shows `(cd web && pnpm -v)`; running it gives 12.6.0. |
| F-7 (S4) | **Fixed** | The Docker default-endpoint path clears a stale override and a stale `TESTCONTAINERS_RYUK_DISABLED`. `progress.json` `environment` now has `containerEngine` and no `podman` key. check-docs passes. |

## Regression checks (all passed)
- **Engine order a–e** (fakes): forced docker / podman / invalid (`Docker`, `nerdctl`, `foo`) / docker with no CLI. Preset `DOCKER_HOST` pointing at Podman or at `tcp://…`, including with no CLI. Docker found via `docker info` with these endpoints:
  - the default socket;
  - Docker Desktop on macOS;
  - Colima on Linux (exports `DOCKER_HOST` only);
  - Colima on macOS (`DOCKER_HOST` plus `OVERRIDE=/var/run/docker.sock`);
  - macOS with `/var/run/docker.sock` present (exports nothing).

  A `podman-docker` shim goes to the Podman path with Ryuk off. Podman via the Linux socket and via a macOS machine both work. With nothing reachable you get one message naming Docker and Podman. zsh gives the same results.
- **Real machine:** `ENGLMS_CONTAINER_ENGINE=docker` with no CLI gives `engine: docker is not installed (chosen by ENGLMS_CONTAINER_ENGINE)`, exit 1. An invalid value exits 1. A preset Podman `DOCKER_HOST` and a valid `ENGLMS_PODMAN_SOCK` both work.
- **Dev scripts, real Podman:** `dev-up` twice, `dev-down`, `dev-down` with nothing running, `dev-up` then `dev-down --purge` (volume gone), then `dev-down` and `dev-down --purge` with no volume. All exit 0 with the expected lines.
- **Dev scripts, fake Docker and fake Podman:** healthy start, health timeout (exit 1), stop, stop with purge, nothing running with and without a volume, and an unknown argument (exit 2). Each engine got the expected `compose`, `container inspect`, `volume inspect`/`rm` and `port` commands.
- **bash 3.2** (`docker.io/library/bash:3.2` container): every guarded script refuses with exit 1 and the documented message. That covers all top-level scripts, `tests/lib.sh` and `run-all.sh`; the other test files source `lib.sh`. The `pre-push` hook still parses under 3.2.
- `scripts/tests/run-all.sh`: PASS. `./scripts/check-docs.sh`: PASS (204 files).
- I did not rerun the full gate: nothing I saw gives a reason to doubt the implementer's run at 787c457.

## New findings

| ID | Sev | Finding | Repro |
|---|---|---|---|
| N-1 | S4 | **Forcing the engine you already have doesn't force it.** If you set `ENGLMS_CONTAINER_ENGINE` to the same value the shell detected earlier, the scripts treat it as their own detection and detect again. That contradicts §3 ("only a user's `ENGLMS_CONTAINER_ENGINE` forces one") and §0 step 4 ("To pick one engine… `export ENGLMS_CONTAINER_ENGINE=docker`"). | Docker and Podman both up. `source scripts/env.sh` (shows `engine: docker (docker info)`, marker set to docker). `export ENGLMS_CONTAINER_ENGINE=docker`. Stop Docker. `source scripts/env.sh` now prints `engine: podman (socket …)` and exports a Podman `DOCKER_HOST`; `ENGLMS_CONTAINER_ENGINE=docker ./scripts/dev-up.sh` also runs on Podman. Expected: Docker stays forced (and fails clearly). Same in bash and zsh (`f3.log`). Impact is small: it only bites when the chosen engine is down, and then you land quietly on a working engine. One fix: drop the marker whenever the user sets a value, or document that you need `unset ENGLMS_CONTAINER_ENGINE_AUTO` first. |
| N-2 | S4 | **A Podman detection sticks.** The §3 sentence "A detected engine is detected again on every sourcing" is not fully true. After env.sh picks Podman it exports `DOCKER_HOST=unix://…podman.sock`. The next sourcing takes that as a user-set `DOCKER_HOST` (rule b) and stays on Podman even after Docker starts and the Podman socket stops. env.sh then exports a stale socket with Ryuk off. A Colima `DOCKER_HOST` sticks the same way. This follows the packet's rule b, but the §3 sentence and the F-3 claim overstate it. | Fakes: Docker down, `source scripts/env.sh` picks podman. Start Docker, source again: `engine: podman (DOCKER_HOST=unix://…podman.sock)`. Workaround: `unset DOCKER_HOST`. Fix the wording in §3, or mark env.sh's own `DOCKER_HOST` the same way as the engine. |
| N-3 | S4 | **A valid `ENGLMS_PODMAN_SOCK` is ignored without the systemd unit.** On Linux, a hand-started `podman system service` socket is not used unless the `podman.socket` unit is active. env.sh then says to run `systemctl --user enable --now podman.socket`, which a WSL2 setup without systemd cannot do. This was already the case on `develop`, so it is not a regression. The F-1 fallback just makes it visible. | Fakes: systemctl exits 127, `ENGLMS_PODMAN_SOCK=<a live socket>`, then `source scripts/env.sh` returns 1 with the systemctl message. Same when Podman is forced. Workaround that works: `export DOCKER_HOST=unix://<sock>`. Either use `ENGLMS_PODMAN_SOCK` when it is a socket regardless of the unit, or mention the `DOCKER_HOST` workaround in §3. |

Also seen, not counted as findings: a stale `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` survives on the non-default Docker path and on Podman paths, because F-7 only clears it on the default path as claimed. It's harmless in practice since the leftover value is the right in-VM path or Ryuk is off. Forced `docker` doesn't check that Docker is reachable, which matches the packet.

## Side effects of this run
- Running `dev-down --purge` from the packet's test plan deleted the existing dev volume `englms-dev-pgdata`. The next `dev-up.sh` creates an empty database (Flyway migrates it again, and the dev tutor has to be bootstrapped again).
- At the end I ran `./scripts/dev-down.sh`: nothing running, no volume. `podman.socket` is active, no containers remain, and I removed the temporary fake socket.

Not done: the full gate (no reason to doubt the implementer's run at 787c457) and real Docker, macOS or WSL2 runs (only faked).

QA-VERDICT T-M1.19: PASS

## Round 1

### QA Report: T-M1.19, portable development environment (Docker or Podman; Linux, macOS, WSL2)

**Verdict: PASS WITH MINOR.** I found no S1, S2 or SCOPE issues. There are two S3 findings: one is a regression for Linux Podman when the user socket is off; the other is a likely Ryuk failure on Docker Desktop for Linux, which I could not test here. There are five S4 findings.

Build: `feature/T-M1.19-portable-dev-env` at a66bde1 (PR #78). Date: 2026-10-11. Independent G3 black-box evaluation. I did not read the implementer's tests before drafting this verdict; I only ran them.

## Environment
- Kali Linux rolling 2026.3, kernel 7.1.5, x86_64. bash 5.3.15, zsh 5.9.
- Rootless Podman 5.8.6, podman-compose 1.6.0, user `podman.socket` active. No docker CLI.
- Temurin 25.0.4 (SDKMAN), Node 24.21.0 (nvm), pnpm 12.6.0 inside the projects, jq 1.8.2, Python with jsonschema 4.26.0, gh 2.102.0, glab 1.118.0, git 2.53.0. shellcheck is not installed.
- Bash containers used: `docker.io/library/bash:3.2`, `:4.3` and `:4.4`.
- The macOS, Docker and podman-docker-shim paths were tested with my own PATH-injected mocks (`docker`, `podman`, `uname`, `systemctl`, real unix sockets), not with the implementer's mocks.
- Logs (session-local, not kept in the repo): `gate.log`, `gate-20261011T084942Z.log`, `run-all.log`, `mock/`, `dmock/`.

## AC results

| AC | What I did | Result |
|---|---|---|
| **AC1** engine detection (order a–e) | **Real device:** auto-detection picks `engine: podman (socket /run/user/1000/podman/podman.sock)` in bash and zsh, and from another working directory.<br>**Overrides:** `ENGLMS_CONTAINER_ENGINE=docker` (no docker CLI) gives "docker is not installed (chosen by ENGLMS_CONTAINER_ENGINE)", rc 1. `=podman` works. `=Docker` (invalid) gives "must be docker or podman", rc 1. An empty value falls back to auto-detection. A preset Podman `DOCKER_HOST` routes to podman; a preset tcp `DOCKER_HOST` routes to docker.<br>**Nothing reachable** (`ENGLMS_PODMAN_SOCK=/nonexistent`, and `podman.socket` actually stopped then restarted): exactly one line naming Docker and Podman, rc 1, and the calling shell survives (also under `set -e`, `set -u` and zsh `nounset`).<br>**Mocks, 16 cases:** each path a–e behaves as specified. A podman-docker shim (`docker info` mentions Podman) goes to Podman on both Linux and macOS. On macOS a Podman machine is found via `podman machine inspect`. `systemctl` is called only on path d. Sourcing twice leaves no `_englms*` functions or variables behind. | PASS |
| **AC2** Testcontainers variables | **Docker (mocks):** `/var/run/docker.sock` exports nothing. macOS `~/.docker/run/docker.sock` exports nothing. Linux Colima exports `DOCKER_HOST` with no override. macOS Colima exports `DOCKER_HOST` plus `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock`, and nothing if `/var/run/docker.sock` exists. A stale `TESTCONTAINERS_RYUK_DISABLED` is removed on Docker, so Ryuk is on. A preset Docker `DOCKER_HOST` is kept.<br>**Podman:** every path (Linux socket, macOS machine, shim, preset `DOCKER_HOST`) sets `TESTCONTAINERS_RYUK_DISABLED=true`.<br>The device result is recorded in development-setup §3. | PASS (see F-2) |
| **AC3** dev-up / dev-down | **Real Podman:** `dev-up` twice (idempotent, healthy on 127.0.0.1:5432); `dev-down`; `dev-down` with nothing running; `dev-up` → `dev-down --purge` (volume removed); `--purge` again ("nothing was running and there is no … volume"); unknown argument gives rc 2.<br>**Stateful docker mock:** the same sequence works through `docker compose`, `container inspect`, `port`, `volume inspect` and `volume rm`. Neither script sources `env.sh`. | PASS (see F-1) |
| **AC4** bash ≥ 4.4 guard | **bash:3.2 container:** all 16 executable scripts and test entry points refuse, rc 1, with the documented message. **4.3** refused, **4.4** runs.<br>**pre-push hook on bash 3.2:** parses, blocks a push to `develop`, allows a new branch and a deletion.<br>**My GNU/BSD scan** of `scripts/` agrees with the summary: no `sed -i`, `date -d`, `grep -P`, `readlink -f`, `stat -c`, `sort -V`, `find -printf` or `timeout`. `diff --label`, `sed -nE`, `date -u +%F`, `mktemp -d` and `seq` are portable. | PASS |
| **AC5** gate green on the device | `ENGLMS_TASK=T-M1.19 ./scripts/gate.sh`: **PASS, 13 steps, 484 s**. Backend 466/0/0 with Testcontainers on Podman; web steps OK; contract-drift OK; qa-typecheck OK; E2E 86 passed (phone-small, tablet, laptop). No Testcontainers containers left behind. `progress.json` `environment` and `project.repoLocal` record this device. | PASS |
| **AC6** Linux + Podman still works, CI 7/7 | The Linux Podman script cases are green. `gh pr checks 78`: 7/7 pass (backend, container-build, contract-drift, docs-check, e2e-smoke, secrets-scan, web). | PASS |
| **AC7** docs / config | **§0 for Linux from a clean shell:** I ran every check step 1–3 and step 4 lists; all pass except optional shellcheck. A fresh agent can follow it (one nit, F-6).<br>**`grep -ri podman` over docs/ and .claude/** (history excluded): the remaining hits are production/ADR text (ADR-0012, deployment, runbooks prod sections, security, NFR-SEC-12), dated first-machine records (tech-stack), engine-choice text, and the `podman` permission and deny rules next to their new `docker` equivalents in both settings files. `roadmap.md` M1 lines still say "Podman stack"; I treat that as milestone history (F-7).<br>No fixed `/home/kali` path is left outside the handoff notes. | PASS |
| **AC8** tests, docs, no product code | `scripts/tests/run-all.sh` PASS (568 ok, one recorded bash-3.2 skip). `dev-scripts.test.sh` still passes 125/0 even with a polluted environment (`DOCKER_HOST`, `ENGLMS_CONTAINER_ENGINE=docker`, `ENGLMS_PODMAN_SOCK`, Ryuk and override variables set). `check-docs.sh` PASS. `check-path-ownership.sh` PASS (44 files). `git diff origin/develop --stat -- backend/src/main web/src` is empty; the two `backend/src/test` classes changed in comments only. shellcheck was not run (not installed). | PASS |

## Findings

| ID | Sev | Summary | Steps to reproduce | Expected | Actual |
|---|---|---|---|---|---|
| F-1 | S3 | On Linux with Podman, `dev-up.sh`/`dev-down.sh` now need the systemd user socket, which the Podman CLI does not need. Before this change they called `podman` directly. This affects WSL2 without systemd, or a machine where the socket was never enabled. | `systemctl --user stop podman.socket; ./scripts/dev-down.sh` | Works as before (packet scope 3: "behaviour … otherwise unchanged") | "engine: no container engine is reachable…", rc 1. It only works with `ENGLMS_CONTAINER_ENGINE=podman`. The message gives a workaround and §0 step 4 makes the socket a one-time step, so this is not blocking. Fix: on Linux, let the dev scripts fall back to the `podman` CLI when the socket is inactive. |
| F-2 | S3 (not verifiable here) | Docker Desktop **on Linux** (endpoint `unix://$HOME/.docker/desktop/docker.sock`) gets `DOCKER_HOST` exported with no socket override. development-setup §3 names this case explicitly. Docker Desktop on Linux runs in a VM, so Ryuk would mount a host path that does not exist in the VM. That is the same problem the packet avoids on macOS. Testcontainers' own Docker Desktop strategy handles this socket itself. | Mock: `QA_DOCKER_EP=unix://$HOME/.docker/desktop/docker.sock`, then `source scripts/env.sh` | Export nothing (add it to the default-endpoint list), or set the override | `DOCKER_HOST=…/.docker/desktop/docker.sock`, no override, Ryuk on. This follows the packet's literal rule ("on Linux the host path is real"), so it is a spec gap rather than an implementation error. |
| F-3 | S4 | After an auto-detection, re-sourcing `env.sh` (or running dev-up inside `gate.sh`) labels the choice as forced, and the choice sticks for that shell. | `source scripts/env.sh; source scripts/env.sh`; or look at the gate log's e2e step | `engine: podman (socket …)` | `engine: podman (ENGLMS_CONTAINER_ENGINE)`. If Docker or Podman is started or stopped later in the same shell, it is not re-detected. |
| F-4 | S4 | The "nothing reachable" message does not mention `ENGLMS_PODMAN_SOCK`, even when that override is the cause. | `ENGLMS_PODMAN_SOCK=/nonexistent source scripts/env.sh` while the socket is active | A hint about the wrong socket path | Tells the user to start a socket that is already running |
| F-5 | S4 | `dev-down.sh` says "data volume englms-dev-pgdata kept" when no volume exists. This was already there before T-M1.19. | `dev-down.sh --purge; dev-down.sh` | "…and there is no volume" | "nothing is running (data volume englms-dev-pgdata kept…)" |
| F-6 | S4 | §0 step 1 checks pnpm with `pnpm -v` in the repo root, which shows corepack's global version (12.10.1), not the pinned 12.6.0. | `pnpm -v` vs `(cd web && pnpm -v)` | 12.6.0 | 12.10.1. The check should run `(cd web && pnpm -v)`. |
| F-7 | S4 | Leftover naming. `progress.json` `environment.podman` holds the engine record (it should probably be called `containerEngine`). `roadmap.md` M1 still says "Podman stack" and "Testcontainers runs on rootless Podman"; this is defensible as history. A stale `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE` left in the shell is not cleared on the Docker default path (mock case 15). | Inspect the files | Engine-neutral key; consistent variables | Minor inconsistencies |

## Exploratory notes (charter: anything still Linux- or Podman-only)
- `scripts/`: the only Linux-specific calls are `systemctl` and `/run/user/$(id -u)`, both confined to path d (and the forced-podman case on Linux) in `lib/engine.sh`. `xargs -r` appears only in the docs and is documented as macOS-compatible.
- `.claude/settings.json` and its proposed mirror have matching Docker allow rules and deny rules (`docker volume rm englms-pgdata` and `englms-files`, the production volumes, as the packet specifies).
- `deploy/compose.dev.yaml` is engine-neutral, and the explicit `name:` fields keep the volume name identical under both compose implementations.
- Real Docker, macOS and WSL2 were not run end to end on this device. As the packet allows, those rely on mocks and CI.
- **Side effects of this QA run:**
  - The dev DB volume was purged and recreated as instructed, so earlier local dev data is gone.
  - `podman.socket` was stopped and restarted, and is active again.
  - `dev-down.sh` was run at the end.
  - The gate's untracked `records/`, `screenshots/` and gate log were moved out of or deleted from `evidence/T-M1.19/`; `git status` is clean.
  - Nothing was committed, pushed or posted to the PR.

Not checked: shellcheck (not installed); real Docker, macOS and WSL2 hosts; F-2 is based on known Testcontainers behaviour, not a reproduction.

QA-VERDICT T-M1.19: PASS WITH MINOR
