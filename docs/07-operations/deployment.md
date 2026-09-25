# Deployment Strategy

> Trace: ADR-0012, NFR-OPS-*, A-013, OQ-03. Target: **one small Linux host** (VPS; 2 vCPU / 4 GB RAM / ≥ 80 GB SSD) running rootless Podman. The concrete
> host and domain are pending OQ-03. Everything below is host-agnostic.

## 1. Topology

```text
Internet :443/:80 → englms-caddy (TLS, HSTS, compression) → englms-app:8080 ─ JDBC → englms-db:5432
                                                          └─ volume englms-files (/var/lib/englms/files)
Volumes: englms-pgdata, englms-files, englms-caddy-data     Network: englms.network (internal)
Secrets (podman secret): englms-db-password, englms-bootstrap-tutor-password (first run only), englms-backup-key (for backups)
```

## 2. Image

- `deploy/Containerfile` (multi-stage): (1) Node 24 + pnpm → `web/dist`; (2) Temurin 25 JDK + Maven wrapper → `app.jar` with `static/` from stage 1,
  using Spring Boot layered jars; (3) Temurin 25 **JRE** runtime, non-root user `englms` (uid 10001), read-only root filesystem, `HEALTHCHECK` on
  `:8081/actuator/health/liveness`.
- Built in CI on tags or release branches, scanned with Trivy, pushed to `ghcr.io/<owner>/englms:<version>` (private) and referenced by digest in the Quadlet units.

## 3. Configuration (12-factor; defaults in `application.yml`, overrides via env)

| Variable | Purpose | Example |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` | `prod` |
| `SPRING_DATASOURCE_URL` / `_USERNAME` | DB | `jdbc:postgresql://englms-db:5432/englms` / `englms` |
| `ENGLMS_DB_PASSWORD_FILE` | Secret file | `/run/secrets/englms-db-password` |
| `ENGLMS_STORAGE_DIR` | Files volume | `/var/lib/englms/files` |
| `ENGLMS_PUBLIC_BASE_URL` | Credential messages, CSP | `https://lop.example.vn` |
| `ENGLMS_BOOTSTRAP_TUTOR_USERNAME` / `_PASSWORD_FILE` | First run only | `colan` / `/run/secrets/englms-bootstrap-tutor-password` |
| `ENGLMS_EMBED_PROVIDERS` | Allow-list override | `youtube,vimeo,gdrive,soundcloud` |
| `JAVA_TOOL_OPTIONS` | Memory | `-XX:MaxRAMPercentage=70` |

## 4. First install (runbook summary; full steps in runbooks.md §1)

1. Harden the host (SSH keys only, firewall 22/80/443, unattended security upgrades). **Operator action; requires PO approval.**
2. Create the `englms` user, enable lingering (`loginctl enable-linger englms`), install Podman.
3. Allow rootless binding to 80/443: `sysctl net.ipv4.ip_unprivileged_port_start=80` (persisted in `/etc/sysctl.d/`), or run Caddy rootful. **This is a host
   security setting, so the operator decides; it is documented, not automated.**
4. Create the Podman secrets. Copy `deploy/quadlet/*` to `~/.config/containers/systemd/`. Run `systemctl --user daemon-reload`, then start the units.
5. The first boot creates the tutor. Log in, change the password, then remove the bootstrap secret.
6. Configure the backup timer (runbooks.md §2) and run a **restore drill** before real use.

## 5. Upgrade procedure (`deploy/upgrade.sh <version>`)

```text
pre-flight (disk space, health) → backup now (DB dump + files snapshot) → pull image by digest → stop app → start app (Flyway migrates)
→ wait for readiness (≤ 120 s) → smoke (GET /api/v1/meta, login page 200) → success: record version
                                                                         → failure: restart previous digest; if migration applied → restore DB from pre-upgrade dump
```

Migrations are forward-only and backwards-compatible within a minor release (expand → migrate → contract), so the previous app version can usually run on
the new schema. A rollback that needs a DB restore is documented as the exception path.

## 6. Observability (NFR-OPS-04)

- Logs: JSON to stdout → journald (`journalctl --user -u englms-app`). The request ID is in every line. Retention follows journald settings (≥ 14 days).
- Health: `:8081/actuator/health/{liveness,readiness}` (internal port, not proxied by Caddy). An external uptime check hits `https://…/api/v1/meta` (optional; OQ-03).
- Disk: a weekly timer warns (log + tutor Settings banner) when any volume exceeds 80%.

## 7. Environments

| Env | Where | Data |
|---|---|---|
| dev | Developer machine (podman compose DB) | Seeded dev data |
| ci | GitHub Actions (service container PostgreSQL) | Test fixtures |
| staging (optional, M8) | The same host under a separate user and ports, or a cheap second VM | Anonymised copy (script) or synthetic data |
| prod | The tutor's host | Real data (backups!) |
