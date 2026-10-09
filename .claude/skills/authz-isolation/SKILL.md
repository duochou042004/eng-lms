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
   `STUDENT`, `/api/v1/auth/**` → `PUBLIC`/`AUTHENTICATED`, `GET /api/v1/meta` → `PUBLIC`. Name the HTTP method (`@GetMapping`, …). **`STUDENT`
   handlers live in a `..web.student..` package** (and nothing else does); patterns start with a literal segment; no `{…studentId}` variable on
   `/api/v1/student/**`; `@RestController` handlers only (no `RouterFunction` beans or URL handler mappings for the API). Otherwise the application
   refuses to start, naming the handler.
2. Add a `PolicyRegistry.ENTRIES` entry, keyed exactly as Spring reports the mapping (`Policy.of("GET", "/api/v1/student/lessons/{lessonId}", body,
   anonymous, tutor, studentA, studentBOnA, mustChange)`). A student on a foreign resource gets **404**. The wrong role gets **403**. Anonymous gets **401**.
   The must-change student gets **403** outside the must-change allow-list. `studentBOnA` is `NA` unless the path names a student-owned resource.
   Samples must not leave state the per-test world reset does not clear. One handler per `METHOD /pattern`: two handlers told apart only by
   `params`/`headers`/`consumes`/`produces` fail the completeness check (give each its own path).
3. Student handler: **no** `studentId` parameter anywhere (name, `@PathVariable`, `@RequestParam`, `@RequestHeader`, `@CookieValue`,
   `@MatrixVariable`, body field); declare `CurrentStudent me`
   (`com.englms.shared.web.CurrentStudent`, as built T-M2.3: resolved by `CurrentStudentResolver` from the session principal through the
   `StudentPrincipals` SPI; a student account without a student row → 401 `SESSION_EXPIRED` and the session ends). Repository calls are owner-scoped:
   `findByIdAndStudentId(id, me.studentId())`, a mismatch → **404**. Reference: `fixture/harness/web/student/HarnessStudentHandlers#item`.
   **Never annotate the `CurrentStudent` parameter** (`@ModelAttribute`, `@RequestBody`, `@RequestParam`, …): Spring would bind it from the request;
   the L2 verifier refuses startup (T-M2.3 G3).
   **ArchUnit rule 3 as built (T-M2.9, DEC-097 (4) (a)):** it checks the Java parameter name and the `@PathVariable`, `@RequestParam`,
   `@RequestHeader`, `@CookieValue` and `@MatrixVariable` names, and for a `@RequestBody`, `@RequestPart` or `@ModelAttribute` parameter (or an
   unannotated one) the field/record-component names of its type with their `@JsonProperty`/`@JsonAlias` names, recursing into nested `com.englms`
   types through arrays, collections, `Optional` and `Map` values (cycle-safe); `CurrentStudent` is exempt. It cannot see catch-all binders
   (`@RequestParam Map`/`MultiValueMap`, `@RequestHeader Map`/`HttpHeaders`, `HttpServletRequest`, `WebRequest`; DEC-096): avoid them in student
   handlers; the `SECRET-*`/B-ID scan and the SEC review are the backstop. Rule 4 is direct dependencies only (DEC-097 (4) (b)).
4. Student classes: in `..web.student..`; no dependency on `notes`, `LearningProfile*` types, `@TutorPrivate` types or types with a `@TutorPrivate`
   field (mark private tutor types/fields with `@TutorPrivate`).
5. Isolation fixture: the students contributor (`com.englms.students.StudentsWorldContributor`, `@Order(HIGHEST_PRECEDENCE)`, test sources)
   already gives A, B, C (archived) and the must-change student a `student` row with `SECRET-*` markers in the note and a contact handle, and
   registers `{sid}` = A's student ID. Contributors run in `@Order` (students first; resets in reverse), so yours can read `student.id` by `user_id`.
   If the handler exposes a new resource type, implement `IsolationWorldContributor` in test sources as a Spring bean (`@Component`
   under `com.englms`): insert an A-owned and a B-owned instance, call `world.ownedByA("<pathVariable>", id)` (the registry path's `{pathVariable}` is
   replaced by it), `world.ownedByB(id)`, and `world.secret("SECRET-…")` for each marker put in a tutor-private field; delete your rows in `reset()`.
   The scan fails if student A's response (headers or body, any status) contains B's IDs (a UUID also without dashes, T-M2.9) or any `SECRET-*`.
   Since T-M2.9 the students contributor also gives A, B and C a guardian (`{gid}` = A's) and a stored learning profile with `SECRET-*` markers.
6. Files: if the feature references files, extend or add a `FileAccessResolver`, and add a test that B cannot read A's file (404).

## Verify
`cd backend && ./mvnw -B verify -Dgroups=security` (verifier, matrix, isolation, ArchUnit student rules). The matrix test fails for any handler without a
registry entry and for any entry without a handler.
