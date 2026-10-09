# ADR-0012: Podman Quadlet + Caddy on a single host

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: PO directive (Podman), SPEC §35 (easy deployment), §36 (no Kubernetes); A-013

## Context
A single tutor needs one small server. Podman is mandated. We want automatic restarts, TLS and simple upgrades without an orchestrator.

## Decision
- The production host runs **rootless Podman** with **Quadlet** units: `englms-db.container` (PostgreSQL 18, volume `englms-pgdata`),
  `englms-app.container` (app image, volume `englms-files`, secrets through Podman secrets), and `englms-caddy.container` (ports 80 and 443, automatic
  HTTPS). They share a user-defined network `englms.network`. Units live in `deploy/quadlet/`.
- The image is built in CI and pushed to GHCR (private). The host pulls it by tag and digest. Upgrades use a scripted `deploy/upgrade.sh`:
  backup → pull → restart → health check → automatic rollback to the previous digest on failure.
- Development: `deploy/compose.dev.yaml` (PostgreSQL only) through `docker compose` or `podman compose`, on Linux, macOS or Windows via WSL2
  (amended by DEC-106, built in T-M1.19; originally podman-compose only). The app runs locally with `./mvnw spring-boot:run`. Production is unchanged.

## Alternatives considered
- Docker Compose in production: acceptable, but the PO mandates Podman, and Quadlet integrates with systemd.
- Kubernetes or k3s: unjustified complexity (SPEC §36).
- PaaS (e.g. Fly or Render): possible later. Hosting is an open question (OQ-03).

## Consequences
+ Restarts, logs via journald, simple rollback. − Rootless ports < 1024 need `net.ipv4.ip_unprivileged_port_start=80` or a
rootful Caddy. This host-level setting requires PO or operator approval and is documented in deployment.md.

## Verification
M8 deployment rehearsal on a fresh VM: install → deploy → upgrade → rollback → restore, all from the runbooks.
