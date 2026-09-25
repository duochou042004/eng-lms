# ADR-0003: PostgreSQL 18 + Spring Data JPA + Flyway

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §34, §36; NFR-I18N-03, NFR-PERF

## Context
We need relational integrity (ownership and isolation), flexible type-specific data (question content, snapshots, custom fields),
accent-insensitive Vietnamese search without a search engine, and simple operations.

## Decision
- **PostgreSQL 18** (fully qualified image `docker.io/library/postgres:18.x`, pinned by digest in production). Extensions: `unaccent`, `pg_trgm`.
- **Spring Data JPA / Hibernate** for aggregates. JSON columns are mapped with Hibernate's JSON type support. Open-session-in-view is **disabled**.
  No cross-module associations. `ddl-auto=validate` against Flyway-created schemas.
- Read-heavy projections (progress, dashboard, search) may use `JdbcClient` with SQL. This is explicitly allowed for read models.
- **Flyway** SQL migrations, forward-only, timestamp-versioned to avoid merge collisions.

## Alternatives considered
- **Spring Data JDBC:** aggregate-friendly and simpler semantics. Rejected for weaker JSON/auditing ergonomics and lower agent familiarity. It remains a
  fallback per module if JPA pitfalls hurt.
- **jOOQ:** excellent SQL, but code generation and a second paradigm add weight. `JdbcClient` covers our read models.
- **SQL Server:** licensing and heavier operations. **H2 for tests:** rejected (dialect drift). Testcontainers PostgreSQL is used instead.

## Consequences
+ One database handles relational data, JSON and search. − JPA pitfalls (N+1, lazy loading) are controlled by rules (coding-agent-rules §5) and by
statement-count assertions (NFR-PERF-04).

## Verification
Migration test on an empty database. `ddl-auto=validate` at test startup. Statement-count tests on list endpoints.
