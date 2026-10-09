# ADR-0016: Student API namespace without a studentId parameter

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §26, §37; NFR-SEC-01..03

## Context
The top security requirement is "Student A ≠ Student B", plus hiding tutor-private data. Per-endpoint `if (owner != me)` checks get
forgotten. We want isolation to be **structural and testable**.

## Decision
1. **Two API namespaces:** `/api/v1/tutor/**` (role TUTOR) and `/api/v1/student/**` (role STUDENT), gated in the security filter chain.
   Shared endpoints: `/api/v1/auth/**` and `/api/v1/meta`.
2. **Student controllers never accept a student ID** from path, query or body. They receive `CurrentStudent me` from a method-argument
   resolver bound to the session principal. An architecture test fails if any `..web.student..` handler takes a student ID: a parameter, path variable, request
   parameter, header, cookie, matrix variable or bound field named `studentId`, ending in `StudentId`, or `sid` (as built T-M2.9; test-strategy §4 rule 3).
3. **Ownership-scoped repository methods** for the student audience: `findByIdAndStudentId(id, me)`. A mismatch returns **404** (not 403), so there is no
   enumeration oracle.
4. **Separate DTOs per audience** (`web.student.*Dto`), built by explicit mappers. ArchUnit: student DTO packages must not depend on `notes`,
   learning-profile types, or any class annotated `@TutorPrivate`.
5. **Authorization policy registry:** each handler method is annotated `@Audience(TUTOR|STUDENT|PUBLIC|AUTHENTICATED)`. A startup check
   and a test fail if a handler lacks the annotation or if the annotation contradicts its path namespace.

## Consequences
+ Isolation is visible in code structure and mechanically tested. − Some duplicate read endpoints (tutor and student views of the same
thing). This is intended.

## Verification
The authz matrix test (all handlers × {anonymous, tutor, student A}), the isolation suite (A must never see B's IDs or tutor secrets in any
response) and the architecture tests. The Security Reviewer signs off on every PR touching `web.student`.
