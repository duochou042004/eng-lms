---
name: authz-isolation
description: Register endpoint authorization policies and add authz-matrix and student-isolation/secret-scan test cases in Eng-LMS. Use for every new or changed endpoint, and in security reviews.
---

# Authorization and isolation

**Read:** `docs/04-backend/security.md` §2 and §4 (as built), ADR-0016, `docs/06-quality/test-strategy.md` §2 and §4.

## Where things live (as built, T-M2.2)
- `com.englms.shared.web.Audience` (`@Audience(Audience.Kind.TUTOR|STUDENT|PUBLIC|AUTHENTICATED)`), `TutorPrivate`, `AudienceVerifier` (startup check).
- Test harness `backend/src/test/java/com/englms/security/`: `PolicyRegistry` (the entries), `AuthzMatrixTest`, `IsolationTest`, `IsolationWorld`,
  `IsolationWorldContributor`, `SecurityHarness`, `HarnessDetectionTest` (meta-tests). ArchUnit rules 3–4: `architecture/StudentIsolationRulesTest`.

## For every new handler
1. Annotate with `@Audience(...)` on the method (or the class), matching its path namespace: `/api/v1/tutor/**` → `TUTOR`, `/api/v1/student/**` →
   `STUDENT`, `/api/v1/auth/**` → `PUBLIC`/`AUTHENTICATED`, `GET /api/v1/meta` → `PUBLIC`. Name the HTTP method (`@GetMapping`, …). Otherwise the
   application refuses to start, naming the handler.
2. Add a `PolicyRegistry.ENTRIES` entry, keyed exactly as Spring reports the mapping (`Policy.of("GET", "/api/v1/student/lessons/{lessonId}", body,
   anonymous, tutor, studentA, studentBOnA, mustChange)`). A student on a foreign resource gets **404**. The wrong role gets **403**. Anonymous gets **401**.
   The must-change student gets **403** outside the must-change allow-list. `studentBOnA` is `NA` unless the path names a student-owned resource.
   Samples must not leave state the per-test world reset does not clear.
3. Student handler: **no** `studentId` parameter anywhere (name, `@PathVariable`, `@RequestParam`); use `CurrentStudent me` (T-M2.3); repository calls
   are owner-scoped.
4. Student classes: in `..web.student..`; no dependency on `notes`, `LearningProfile*` types or `@TutorPrivate` types (mark private tutor types/fields
   with `@TutorPrivate`).
5. Isolation fixture: if the handler exposes a new resource type, implement `IsolationWorldContributor` in test sources as a Spring bean (`@Component`
   under `com.englms`): insert an A-owned and a B-owned instance, call `world.ownedByA("<pathVariable>", id)` (the registry path's `{pathVariable}` is
   replaced by it), `world.ownedByB(id)`, and `world.secret("SECRET-…")` for each marker put in a tutor-private field; delete your rows in `reset()`.
   The scan fails if student A's response (headers or body, any status) contains B's IDs or any `SECRET-*`.
6. Files: if the feature references files, extend or add a `FileAccessResolver`, and add a test that B cannot read A's file (404).

## Verify
`cd backend && ./mvnw -B verify -Dgroups=security` (verifier, matrix, isolation, ArchUnit student rules). The matrix test fails for any handler without a
registry entry and for any entry without a handler.
