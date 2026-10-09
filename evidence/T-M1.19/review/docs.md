# DOCS-REVIEW T-M1.19 (packet PR #75)

> Recorded by the LC from the docs-reviewer agent's returned text (fresh context; three rounds at `11e3295`, `2701bbd`, `e3773ad`).

## Round 1

I'm requesting changes. The packet is well put together and right-sized: 7 ACs, a 1 agent-day estimate, and every G0 checklist item is present. But it has two S2 problems. It says ADR-0012 stays unchanged when that ADR prescribes podman-compose for development. And its Testcontainers design note on Docker is wrong for some Docker setups. The S3 items are gaps in the list of Linux/Podman assumptions and in the new-device handover.

**Checks run**
- `./scripts/check-docs.sh` passes (201 markdown files, `progress.json` valid, sources intact, prompt within limit).
- `docs/handoff/next-session-prompt.md` is 3927 characters, under the 4000 limit.
- No product scope drift. The SPEC non-goals are not touched, and the scope.md §6 guardrail answers are present.
- Per your instruction, I wrote no files (no `evidence/T-M1.19/review/docs.md`), posted no PR comments, made no commits and did not switch branches.

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| D1 | S2 | packet:11, 42; DEC-106 (decision-log:114); ADR-0012:14; tech-stack.md:74-75 | The packet and DEC-106 say "ADR-0012 unchanged". But ADR-0012's Decision section says "Development: `deploy/compose.dev.yaml` … through podman-compose". tech-stack §4 also gives Podman for containers ("PO directive") and `podman compose` for the local stack. DEC-106 changes the development part of both, so the ADR, the DEC and the docs contradict each other. | Add ADR-0012 and tech-stack §4 (not just §1) to the packet's docs to update. Amend ADR-0012's Development bullet to "Docker or Podman (DEC-106)", with production unchanged. Reword "ADR-0012 unchanged" as "production part unchanged". |
| D2 | S2 | packet:22-23, 52-53; AC1 (66-68) | Design note: "Docker needs no `DOCKER_HOST` export (Testcontainers reads the Docker context)". Testcontainers Java does not resolve Docker contexts. Docker Desktop (`~/.docker/run/docker.sock` or `/var/run/docker.sock`) and OrbStack work. Colima, other non-default contexts and rootless Docker set up outside the defaults do not: Colima needs `DOCKER_HOST=unix://$HOME/.colima/<profile>/docker.sock` plus `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` for Ryuk, and `TESTCONTAINERS_HOST_OVERRIDE` with `--network-address`. AC1 also forbids exporting `DOCKER_HOST` on the Docker path. A fresh agent on Colima, which the packet names as supported, would fail AC4. | On the Docker path, when `DOCKER_HOST` is unset, export it from `docker context inspect --format '{{.Endpoints.docker.Host}}'`. Document the Colima overrides in §0/§3 (or drop Colima from the supported list). Reword AC1 to match. |
| D3 | S3 | packet:21-27, 54-56 | Ambiguous core design in three places. (a) `dev-up.sh`/`dev-down.sh` are run directly by users and by `e2e-run.sh` without sourcing `env.sh`, so where do they get `ENGLMS_CONTAINER_ENGINE`? Calling `env.sh` there would fail when the Podman socket is down, although compose doesn't need it. (b) When `DOCKER_HOST` is already set, which engine CLI is used and is Ryuk on or off? A preset Podman socket must keep Ryuk off. (c) The `podman-docker` shim on Linux makes `docker info` succeed against Podman, which would select Docker with Ryuk on, and Ryuk fails under rootless Podman. | Put detection in one function sourced by `env.sh` and the dev scripts; the dev scripts must not need the socket. State the engine and Ryuk choice for a preset `DOCKER_HOST`. Detect Podman behind `docker` (e.g. `docker version` reports Podman) and route it to the Podman path. |
| D4 | S3 | packet:29-31, 57; AC3 | The bash-3.2 inventory is too narrow. Beyond `mapfile`/`declare -A`: (1) `merge-gate.test.sh:403` uses `${t,,}`, and `run-all.sh` runs every test with `bash` from `PATH`. (2) Before bash 4.4, an empty array expanded under `set -u` aborts with "unbound variable": `dev-down.sh:36,39` (`"${env_args[@]}"` when there is no `.env`) and `e2e-run.sh:193` (`"${args[@]}"` with no args). Guarding only "the bash-4 scripts" leaves those scripts failing late. | Require bash ≥ 4.4 everywhere: one shared guard (or a check in `gate.sh`, `run-all.sh` and `lib.sh`), plus a §0 macOS check `env bash -c 'echo $BASH_VERSION'` showing Homebrew bash first on `PATH`. Add these patterns to the AC3 scan. |
| D5 | S3 | packet:61-63; AC1/AC5 | Test isolation is not addressed. `gate.sh` sources `env.sh` before the `scripts` step, so `DOCKER_HOST` and `ENGLMS_CONTAINER_ENGINE` leak into `dev-scripts.test.sh`. Every detection test would then take the "keep existing `DOCKER_HOST`" branch. CI runners also have a real `docker`, which would win over the existing Podman-path tests. | Require the tests to run with `env -u DOCKER_HOST -u ENGLMS_CONTAINER_ENGINE -u TESTCONTAINERS_RYUK_DISABLED` and a `PATH` with a failing `docker` stub on the Podman-path cases. Also run the `env.sh` tests under zsh when installed, since the header says "bash or zsh" and zsh is the macOS default shell. |
| D6 | S3 | packet:90-92 (docs to update), AC6 | Several Podman-only references are not listed, so AC6 would pass while they stay: development-setup §4 table (`podman build --format docker`, and `podman run --network host`, which does not reach the host on Docker Desktop or Podman machine), §3 leftover-cleanup commands (`podman ps … \| xargs -r podman rm`), runbooks.md:65 (`podman volume rm englms-dev-pgdata`), architecture-overview.md:39 ("through podman-compose"), agent-roles.md:36 ("Podman (dev containers)"), and `docs/09-harness/claude-settings.proposed.json` (mirror of `.claude/settings.json`). | Add these to the docs to update and to AC6. The §4 table could keep its Podman image commands, labelled as optional Podman examples, plus a Docker equivalent. |
| D7 | S3 | packet:38-39 | `.claude/settings.json` only gets "Docker equivalents of the allowed Podman commands". The deny rules `podman volume rm englms-pgdata` and `podman volume rm englms-files` (lines 27-28) also need Docker equivalents, or the safety rail disappears on Docker. | Add `docker volume rm englms-pgdata:*` and `docker volume rm englms-files:*` to `deny`. |
| D8 | S3 | packet:11; backlog.md:38 | Wrong trace: NFR-OPS-04 is "Structured JSON logs with a request/correlation ID…", unrelated to portability. | Drop NFR-OPS-04. Trace DEC-106 and NFR-MNT-02 (tooling/dependency justification), or DEC-106 alone. |
| D9 | S3 | HANDOFF.md:24; next-session-prompt.md (START) | "Do §0 steps 1-3 and 6". But step 1 requires "Podman 5.7+ rootless" and `podman compose`, and says to ask the PO to install anything missing. On a Docker-only Mac or WSL machine the agent would ask for Podman or stall. | Say: "in step 1, skip the Podman items when `docker info` works". |
| D10 | S3 | packet:34-35; HANDOFF.md:13-21 | macOS `jsonschema`: Homebrew Python is externally managed (PEP 668), so `pip install jsonschema` fails. Gate step 1 (`check-docs.sh` → `python3`) then fails before any engine work. | §0 macOS: a venv or `pipx`-provided interpreter, or `pip3 install --user --break-system-packages jsonschema`, and say which `python3` `check-docs.sh` must find. Add it to the handover. |
| D11 | S3 | HANDOFF.md:13-21 | The list of what does not travel with `git clone` is incomplete. Missing: `.claude/settings.local.json` (local permission grants), the Playwright browser caches (`pnpm browsers` in `e2e`, plus chromium, firefox and webkit for `qa`), a stray `~/.testcontainers.properties`, SSH/GPG keys if used, and on Linux Docker Engine the `docker` group (root-equivalent, a PO decision). | Add them to the list. |
| D12 | S4 | next-session-prompt.md (START) | No instruction for the native-Windows case. | Add: "If this is native Windows (not WSL), stop and ask the PO to start Claude Code inside WSL2 (DEC-106)." |
| D13 | S4 | packet:62 | "a fake `BASH_VERSINFO`": `BASH_VERSINFO` is read-only and cannot be faked. | Have the guard compare a version passed as a parameter (unit-testable), or use a real bash 3.2 when present and otherwise record a skip. |
| D14 | S4 | packet:42; DEC-106 | "CI workflows (already Docker on Ubuntu runners)" is not quite accurate: `.github/workflows/container.yml` builds with Podman. | Reword to "CI (Ubuntu runners: Docker for Testcontainers, Podman for the image job)". |
| D15 | S4 | packet:57 | "Docker Desktop on macOS publishes `127.0.0.1:5432` as on Linux" is true, but a local Homebrew PostgreSQL commonly already holds port 5432. | Mention `ENGLMS_DEV_DB_PORT` in §0 macOS. |

The rest checks out:
- The coupling claims for `env.sh` (`id -u`, `/run/user`, `systemctl`), `dev-up.sh`/`dev-down.sh` and the three scripts that use `mapfile`/`declare -A` are correct.
- `compose.dev.yaml` is engine-neutral: a fixed volume `name:` and the health-status format work on both engines.
- `.gitattributes` keeps scripts LF.
- The executable bits are recorded in git (`100755`).
- `/dev/tcp`, `seq` and `date -u +%FT%TZ` work on bash 3.2 and macOS.
- The `progress.json` `environment` field accepts free-form string keys.

I did not check: actual macOS/BSD tool behaviour (I reasoned from known differences; `diff --label` and `xargs -r` on macOS are untested), or Testcontainers 2.x provider strategies against its source. D2's detail rests on documented Testcontainers behaviour, not a run.

Round 1 verdict: CHANGES REQUESTED

## Round 2

I'm requesting changes again, but only on one S3 item. All 15 round-1 findings (D1–D15) are fixed. The remaining blocker is that the new rule for setting `DOCKER_HOST` could break the gate on a Mac with Docker Desktop, which is the most likely new device.

**Checks run**
- `./scripts/check-docs.sh` passes (201 markdown files, `progress.json` valid, sources intact, prompt within limit).
- The delta `11e3295..2701bbd` changes 6 files: the packet, ADR-0012, DEC-106, the backlog row, `HANDOFF.md` and `next-session-prompt.md`.
- The prompt is 3999 characters, against a 4000 limit.
- Per the rules, I made no branch switch, commit, push, PR comment or file.

**Round-1 findings, verified at 2701bbd**

| ID | Status | Where it's fixed |
|---|---|---|
| D1 | Fixed | ADR-0012 line 14 is amended (development bullet only, production unchanged). DEC-106, the packet trace (line 11) and the backlog trace now say the same. |
| D2 | Fixed, with a new problem (see R2-1) | Packet scope 2 exports `DOCKER_HOST` from the Docker context and documents the Colima overrides in §3; AC2 matches. |
| D3 | Fixed | `scripts/lib/engine.sh` does the detection in order a–e. A preset `DOCKER_HOST` is handled, the Podman shim is routed to the Podman path, and the dev scripts do not source `env.sh`. |
| D4 | Fixed | A shared bash ≥ 4.4 guard, with the empty-array and `${t,,}` reasons stated; AC4. |
| D5 | Fixed | Tests run with `env -u …` and a failing `docker` stub; `env.sh` is also tested under zsh. |
| D6, D7 | Fixed | The full docs and config list in scope 6, including the deny rules and the proposed-settings mirror; AC7 adds a grep check. |
| D8 | Fixed | NFR-OPS-04 is dropped from the packet and the backlog. |
| D9, D12 | Fixed | `HANDOFF.md` and the prompt: skip step 1's Podman items when Docker is used, and stop on native Windows. |
| D10, D11, D15 | Fixed | `HANDOFF.md` "New device" section and packet scope 6. |
| D13 | Fixed | The guard takes the version as a parameter. |
| D14 | Fixed | The CI wording in the packet and DEC-106. |

The packet now has 8 ACs and a 1.5 agent-day estimate, which is still within limits.

**Round-2 findings**

| ID | Sev | Location | Finding | Recommendation |
|---|---|---|---|---|
| R2-1 | S3 | packet:31-35 (scope 2), AC2 (89-90) | The rule is: export `DOCKER_HOST` from the Docker context whenever it is unset. On macOS Docker Desktop the context is `unix:///Users/<u>/.docker/run/docker.sock`; on OrbStack it is `~/.orbstack/run/docker.sock`. With `DOCKER_HOST` set, Testcontainers stops using its Docker Desktop discovery. It then mounts the host socket path into the Ryuk container, and that path does not exist inside the VM. With Ryuk on, startup is likely to fail. The packet itself says Docker Desktop and OrbStack already work without the export. So the rule can break the configurations that work today, on the likely target device. AC5 would catch it, but the packet prescribes the faulty behaviour. This is from known Testcontainers behaviour; I did not run it. | Export from the context only when Testcontainers' default discovery would miss the endpoint, e.g. when the endpoint is not `unix:///var/run/docker.sock` and `~/.docker/run/docker.sock` is absent. Or, on macOS, whenever a non-default unix socket is exported, also export `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` (the in-VM path for Docker Desktop, OrbStack and Colima). Do not do that on Linux, where rootless Docker's host path is real. Add an AC2 test case for each, and record the device result in §3. |
| R2-2 | S4 | packet:39-41 (scope 4) | "Sourced by every executable script" includes `scripts/hooks/pre-push`. Git runs that hook with the `PATH` of the calling program. VS Code's git on macOS may not have Homebrew on `PATH`, so it would get bash 3.2 and the guard would block every push. The hook only uses features that work in 3.2. | Exempt the hook, keeping it bash-3.2-safe, or state that GUI git needs Homebrew bash on its `PATH`. |
| R2-3 | S4 | DEC-106 (decision-log:114) | DEC-106 says "The packet passed DOCS-REVIEW after round-1 fixes". That claim was written before this round's verdict. | Update it to the actual round count and verdict once the review passes. |
| R2-4 | S4 | `docs/handoff/next-session-prompt.md` | At 3999 of 4000 characters, any future edit, such as the R2-3 fix or a new DEC, will fail `check-docs`. | Trim some text, e.g. the T-M2.4 detail that is already in the backlog. |

I did not check Testcontainers 2.x's provider-strategy source; R2-1 is reasoned from known Testcontainers behaviour, not tested.

Round 2 verdict: CHANGES REQUESTED

## Round 3

The packet passes on round 3. All four round-2 findings are fixed at `e3773ad` and the delta introduces nothing new.

**Checks run**
- `./scripts/check-docs.sh` passes (201 markdown files, `progress.json` valid, sources intact, prompt within limit).
- The delta `2701bbd..e3773ad` changes 3 files: the packet, DEC-106 and the prompt.
- The prompt is now 3855 characters against the 4000 limit (you said 3859; the difference doesn't matter).
- Per the rules, I made no branch switch, commit, push, PR comment or file.

| ID | Sev (round 2) | Status | Verification |
|---|---|---|---|
| R2-1 | S3 | Fixed | Scope 2 and AC2 now leave `DOCKER_HOST` unset for `unix:///var/run/docker.sock`, Docker Desktop's `~/.docker/run/docker.sock`, or when `/var/run/docker.sock` exists on macOS. That keeps Testcontainers' own discovery for Docker Desktop, OrbStack's default link and WSL2 Docker Desktop. Any other endpoint gets `DOCKER_HOST`, plus `TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock` on macOS only. That covers Colima. Rootless Docker on Linux keeps its real host path with no override, which is correct. AC2 is testable: per-case script tests with a mocked `uname`, and the device result recorded in §3. |
| R2-2 | S4 | Fixed | Scope 4 and AC4 exempt `scripts/hooks/pre-push` and require it to stay bash-3.2-safe. It already is (it only uses `[[ =~ ]]` and parameter expansion). |
| R2-3 | S4 | Fixed | DEC-106 no longer claims a pass. It now says rounds 1–2 were CHANGES REQUESTED and fixed in-task per DEC-088, and that the final verdict is the PR #75 record. |
| R2-4 | S4 | Fixed | The prompt was trimmed (T-M2.4 detail now points at the backlog row and the frontend-standards skill), leaving 145 characters of headroom. |

**New findings in this round:** none at S1–S3.

Scope item 4 in the packet is now a single very long source line. That's only a formatting nit and doesn't need a fix.

I did not run the R2-1 behaviour against a real Docker Desktop or Colima. It depends on Testcontainers' discovery as documented, and AC5's real gate run on the device is what proves it.

DOCS-REVIEW T-M1.19: PASS
