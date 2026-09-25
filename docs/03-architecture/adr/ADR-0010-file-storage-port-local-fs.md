# ADR-0010: FileStorage port with a local filesystem adapter

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §13, §36 ("S3-compatible / MinIO"), §38; A-011

## Context
The SPEC suggests S3-compatible storage. With one host and ≤ 100 GB, a local volume is the simplest option, and it is easy to back up. MinIO's community
distribution changed in 2025, which makes it a poor default dependency.

## Decision
The `files` module defines a `FileStorage` port (`put(stream) → key`, `open(key, range)`, `delete(key)`, `size`). The MVP adapter
stores files under `${ENGLMS_STORAGE_DIR}/ab/cd/<uuid>` (sharded, random keys, no user-supplied names on disk). Uploads stream to
a temporary file, get hashed (SHA-256) and type-sniffed, and are then moved atomically. Downloads stream with HTTP Range support.
The storage directory is a Podman volume included in backups.

## Alternatives considered
- MinIO or another object store now: an extra service to run and back up, with no current need.
- Database `bytea`: bloats the database and backups, and makes streaming awkward.

## Consequences
+ Minimal infrastructure. The adapter is swappable for S3-compatible storage (e.g. a cloud bucket or Garage) with no domain change. − A single disk is a
single point of failure. Mitigated by backups (NFR-OPS-02).

## Verification
Adapter contract tests (put/open/range/delete) run against the local adapter. Any future adapter must pass the same suite.
