# Runbooks

> Each runbook: **When** · **Pre-checks** · **Steps** · **Verify** · **Rollback**. The scripts named here are created in M1 (dev) and M8 (prod). Until then
> this file is the specification for them. Operator actions on production hosts require PO approval (external/outward-facing).

## 1. First production install
**When:** go-live (M8). **Steps:** deployment.md §4. **Verify:** HTTPS works, tutor login and password change succeed, the backup timer is active, and a restore drill (§3) has passed.

## 2. Backups (nightly, `englms-backup.timer` at 02:30 local)
**Steps (script `deploy/backup.sh`):**
1. `podman exec englms-db pg_dump -Fc -U englms englms > $BK/db-<ts>.dump`
2. `tar --zstd -cf $BK/files-<ts>.tar.zst -C <files volume mountpoint> .` (the blobs are immutable, so a live copy is consistent enough; the reconcile job repairs any drift)
3. Write a manifest (versions, sizes, sha256). Encrypt (`age` recipient key) → `*.age`.
4. Retention: keep 14 daily and 8 weekly (Sunday) copies locally. Copy off-site (the target depends on OQ-03: second host, object storage, or the tutor's cloud drive over rclone).
**Verify:** the script exits 0, the manifest checksums match, the off-site listing shows today's set. Failure → the timer's `OnFailure=` unit logs an error and shows a Settings banner.

## 3. Restore drill / disaster recovery (RTO ≤ 4 h)
1. Provision a clean host per deployment.md §4 (skip the bootstrap secret).
2. Fetch the latest backup set; decrypt; verify the checksums.
3. `podman volume create englms-pgdata`; start the db; `pg_restore -d englms --clean --if-exists db-<ts>.dump`.
4. Restore the files: extract into the `englms-files` volume.
5. Start the app with the **same version** as recorded in the manifest. Run the file reconcile job (`/actuator` internal op or CLI flag `--englms.reconcile=true`).
6. **Verify:** log in as the tutor; open 3 random students; open a material file and a submission audio; compare the row counts in the manifest.
Record the timings in `evidence/<release>/restore-drill.md`.

## 4. Tutor password reset (FR-AUTH-09)
**When:** the tutor has lost their password. **Steps:** on the host, run
`podman exec -it englms-app java -jar /app/app.jar --englms.cli=reset-tutor-password --spring.main.web-application-type=none`,
which prints a one-time temporary password (`mustChangePassword=true`) and writes an audit event. **Verify:** login forces a password change. **Note:** the CLI
refuses to run when the database has no tutor. It never creates a second tutor.

## 5. Student cannot log in
Check the student's status in the tutor UI (ARCHIVED → reactivate). If the account is locked (`locked_until`), a tutor password reset unlocks it. If a temporary password
expired, reset again. Check the security log for `LOGIN_FAILED` bursts (a possible attack → consider IP throttling logs).

## 6. Deploy / upgrade / rollback
See deployment.md §5. **Rollback trigger:** readiness fails for 120 s, the smoke test fails, or an S1 is found within 24 h. **Rollback:** `deploy/upgrade.sh --rollback`
(previous digest). If the migration is incompatible, restore the pre-upgrade dump (§3 steps 3 and 5).

## 7. Disk almost full
Check `podman system df` and the volume usage. Actions: prune old images (`podman image prune`, keeping the last 2 versions), check the backup retention, check the
file storage breakdown (Settings → Storage), and ask the tutor to archive or delete large unused videos (suggest links instead). Grow the disk if needed.

## 8. Rotate the DB password
Create a new podman secret → `ALTER ROLE englms PASSWORD …` → update the app unit to the new secret → restart the app → remove the old secret.

## 9. Suspected security incident
1. Contain: stop the app unit (the site goes offline) or restrict it at Caddy. 2. Preserve: copy the journald logs, `audit_event`, and the Caddy access logs. 3. Assess the
security log for affected accounts. 4. Reset affected passwords (sessions end automatically). 5. Patch, redeploy, then notify the PO. The PO handles any
notification obligations (R-12). 6. Write a post-incident note in `evidence/incidents/`.

## 10. Local dev database reset
`./scripts/dev-down.sh && podman volume rm englms-dev-pgdata && ./scripts/dev-up.sh` (dev only; deletes all local data).
