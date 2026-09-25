---
name: backend-module
description: Add or change a feature inside an Eng-LMS Spring Modulith module (packages, public API, events, persistence, controllers per audience, tests, docs). Use for any backend implementation packet.
---

# Backend module work

**Read:** `docs/03-architecture/module-boundaries.md`, `docs/04-backend/api-conventions.md`, `docs/03-architecture/data-model.md`,
`docs/09-harness/coding-agent-rules.md` §5 and §9.

## Package layout (per module `com.englms.<module>`)
`<module>` (API: `*Api`, records, enums) · `<module>.events` · `internal.domain` · `internal.app` (@Transactional services) ·
`internal.persistence` · `internal.web.tutor` / `internal.web.student` (controllers + DTOs per audience).

## Procedure
1. Check the allowed dependency graph (module-boundaries.md). If you need a new cross-module dependency, stop and ask the LC (it may create a cycle).
2. Domain first: aggregate methods that enforce invariants, with unit tests (`Clock` injected; `BigDecimal` for scores).
3. Persistence: a migration (skill `db-migration`), an entity mapping, repository methods (owner-scoped for the student audience: `findByIdAndStudentId`).
4. Application service: one public method per use case, `@Transactional`, typed exceptions → Problem codes.
5. Web: a thin controller per audience; `@Audience(...)`; Bean Validation on the DTOs; `@Operation` summary; documented errors.
6. Tests: unit, module (`@ApplicationModuleTest` + Testcontainers), API (status codes, problem JSON), **authz matrix + isolation** (skill `authz-isolation`),
   and a statement-count assertion for list endpoints.
7. Contract: regenerate `api/openapi.json` (`-Dcontract.write=true`) and commit it.
8. Docs: api-catalog rows, data-model tables, module-boundaries (if the API or events changed).
9. `./scripts/gate.sh` green → evidence → PR.

## Red flags (stop)
Importing another module's `internal` · a JPA association to another module's entity · `studentId` in a student handler · returning an entity from a controller ·
`Instant.now()` · exam-specific names · a new library without approval.
