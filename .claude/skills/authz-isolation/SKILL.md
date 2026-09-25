---
name: authz-isolation
description: Register endpoint authorization policies and add authz-matrix and student-isolation/secret-scan test cases in Eng-LMS. Use for every new or changed endpoint, and in security reviews.
---

# Authorization and isolation

**Read:** `docs/04-backend/security.md` §2 and §4, ADR-0016, `docs/06-quality/test-strategy.md` §2 and §4.

## For every new handler
1. Annotate with `@Audience(TUTOR | STUDENT | PUBLIC | AUTHENTICATED)`, matching its path namespace (`/api/v1/tutor/**`, `/api/v1/student/**`).
2. Add a policy-registry entry: expected status for {anonymous, tutor, student A, student B-on-A's-resource}. A student on a foreign resource gets **404**. The wrong role gets **403**. Anonymous gets **401**.
3. Student handler: **no** `studentId` parameter anywhere; use `CurrentStudent me`; repository calls are owner-scoped.
4. Student DTO: in `..web.student..`; no dependency on `notes`, learning-profile types or `@TutorPrivate` types.
5. Isolation fixture: if the handler exposes a new resource type, add A-owned and B-owned instances plus a `SECRET-*` marker in any tutor-private field.
   The response scan must never find B's IDs or any `SECRET-*` in student A's responses.
6. Files: if the feature references files, extend or add a `FileAccessResolver`, and add a test that B cannot read A's file (404).

## Verify
`cd backend && ./mvnw -B verify -Dgroups=security` (matrix + isolation + architecture). The matrix test fails automatically for handlers without a registry entry.
