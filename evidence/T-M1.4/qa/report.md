# QA Report — T-M1.4 Local stack + Testcontainers on rootless Podman
Verdict: **PASS WITH MINOR** · Build: `a196077` (PR #8) · Date: 2026-09-25 · Evaluator: independent QA subagent (fresh context)

`QA-VERDICT T-M1.4: PASS WITH MINOR`

> Recorded by the Lead Coordinator from the QA agent's final message; subagents cannot write files. The content is unchanged in substance.

## Environment
Kali Linux, rootless Podman 5.8.6, podman-compose 1.6.0 (via `podman compose`), JDK 25.0.4, active user `podman.socket`. `.env` is present and git-ignored.
Start state: no containers, ports 5432/8080/8081 free, clean tree. Five unlabeled anonymous volumes already existed (created before QA). They were not touched.

## AC results
| AC | Result | Evidence |
|---|---|---|
| AC1 dev-up (development-setup §2, followed literally) | PASS | Created the network, the volume `englms-dev-pgdata` and `englms-dev-db`, then reported "healthy on 127.0.0.1:5432". The image digest is `5a5a84b1…9722`. The port binding is `127.0.0.1:5432`; `ss` shows loopback only. Version 18.6. |
| AC1 idempotence | PASS | Second run: same container ID and `StartedAt`, exit 0. |
| AC1 digest | PASS | QA's own anonymous Docker Hub query: an OCI index `sha256:5a5a84b1…9722` (matches compose). The amd64 child `0377e72c…` matches `digest.txt`. |
| AC1 keep/purge | PASS | A plain down keeps the volume, and the data survives (2 Flyway rows). `--purge` removes it. A double down exits 0. `--bogus` exits 2 with the usage. |
| AC2 | PASS | `spring-boot:run` connects to PostgreSQL 18.6 on 127.0.0.1:5432, applies 1 migration, and `/api/v1/meta` returns 200. Health is UP. The ports are freed after stopping. |
| AC3 | PASS (see F1) | `source scripts/env.sh && ./mvnw -B verify` ×2 → 52 tests, 0 failures/skipped, BUILD SUCCESS. `dockerHost` is the user socket; 3 postgres:18 containers started. Leftover containers afterwards: 0. No volume growth. |
| AC4 socket failure | PASS | `ENGLMS_PODMAN_SOCK=/nonexistent` with bash source, bash exec and zsh `source … &&` → exit 1 with a clear message and the enable command. `DOCKER_HOST` stays unset. The real socket works in bash and zsh. |
| AC4 script tests | PASS | dev-scripts 12/0. run-all PASS. |
| AC4 secrets | PASS | `.env.example` has placeholders only. Only `.env.example` is tracked, and no `.env` appears in history. The compose `:?` guard works. secrets-scan is green (run 36142655160). |
| AC5 | PASS (see F3/F4) | development-setup §2/§3 has the real commands. tech-stack §7 has the digest and podman-compose. Summary and progress are present. |
| CI | PASS | backend, web, docs-check and secrets-scan are green on `a196077`. |

## Findings
| ID | Sev | Summary | Location |
|---|---|---|---|
| F1 | S3 | On every local Podman verify, the test JVM hangs at shutdown and Surefire kills it after 30 s (`Surefire is going to kill self fork JVM…`), after Hikari "connection has been closed" warnings in the shutdown hook. The build passes, but it adds about 30 s, and a forced exit could interrupt cleanup now that Ryuk is off. Not seen in CI. The committed log was filtered and omitted the line. | local verify log |
| F2 | S4 | `dev-down.sh` with nothing running prints raw podman-compose errors before the success message (exit 0). | `scripts/dev-down.sh:25-29` |
| F3 | S4 | `progress.json` gates, nextSteps and lastCommit, and the packet status, were stale for `in_review`. | `progress.json`, `docs/tasks/T-M1.4-local-stack.md:7` |
| F4 | S4 | The evidence secrets-scan link pointed to an earlier head's run. | `evidence/T-M1.4/summary.md` |
| F5 | S4 | The documented crash cleanup doesn't remove anonymous volumes; suggest `podman volume prune` / `rm -fv`. | development-setup §3 |

No S1, S2 or SCOPE findings. No out-of-scope additions (no Containerfile, `gate.sh` or seed data).

## Isolation / privacy checks
Loopback-only database. No committed secrets. No endpoint changes.

## Re-test log
- Run 1 and run 2 at `a196077`: as above. Final state: `dev-down --purge`; no englms containers, volumes or networks; ports free; clean tree.
- LC disposition: F3, F4 and F5 fixed, and the F1 evidence corrected, in `3146cf3`. F1 and F2 deferred to T-M1.8 (DEC-047). Merged as `294d597`.
