---
name: db-migration
description: Write a safe, forward-only Flyway migration for Eng-LMS PostgreSQL 18 (naming, constraints, indexes, expand/contract, docs sync). Use whenever a packet changes the schema.
---

# DB migration

**Read:** `docs/03-architecture/data-model.md` (§1 conventions, §3 sensitive fields, §4 policy) and ADR-0003 / ADR-0011.

## Rules
1. New file only: `backend/src/main/resources/db/migration/V<yyyyMMddHHmm>__<module>_<change>.sql`. **Never edit an applied migration.**
2. Standard columns on aggregate roots (`id uuid`, `created_at`, `updated_at`, `created_by`, `updated_by`, `version`).
3. Enums as `text` + `CHECK`. Name every constraint and index (`ck_`, `ux_`, `ix_`, `fk_`).
4. Index every FK used in lookups. Add partial indexes for status queues. GIN indexes for `tags` and `search_vector`.
5. Deletion semantics: `RESTRICT` across aggregates/modules; `CASCADE` only within an aggregate. Library content uses `archived_at` (no global soft delete).
6. **No domain seed data** (no folders, tags, metrics or questions).
7. Destructive changes: expand (add new) → migrate data → contract (drop old) in a **later release**.
8. Personal or private columns: add them to data-model.md §3 and make sure no student DTO maps them.

## Procedure
Write the SQL → run the module tests (Flyway applies it to Testcontainers PostgreSQL; `ddl-auto=validate` must pass) → a migration test for tricky data moves →
update data-model.md in the same PR → note it in the evidence summary.
