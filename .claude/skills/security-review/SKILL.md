---
name: security-review
description: Run the Eng-LMS security and privacy review checklist on a PR (identity, student API, files, sanitisation, endpoints, personal-data migrations) and write evidence/<task>/review/security.md with a verdict.
---

# Security review

**Read:** `docs/04-backend/security.md` (threats T1–T18, §11 checklist), ADR-0005, ADR-0016, `files-and-storage.md`.

1. `git diff --stat develop...HEAD`, then read every changed file in `identity`, `**/web/student/**`, `files`, `shared` (sanitiser, security), migrations and config.
2. Run `cd backend && ./mvnw -B verify` (or the security test group) and confirm the matrix and isolation suites cover the new handlers.
3. Walk security.md §11:
   - [ ] `@Audience` + policy registry for every handler; matrix coverage.
   - [ ] Student handlers: no `studentId`; owner-scoped queries; 404 on mismatch; audience DTOs only.
   - [ ] No private field reachable from student DTOs (ArchUnit green; the mappers read).
   - [ ] Input limits; rich text sanitised; URLs validated; embed allow-list respected.
   - [ ] Files: purpose set; resolver updated; download headers correct.
   - [ ] Logs: no secrets or personal data beyond IDs.
   - [ ] Migrations: constraints not weakened; sensitive columns documented.
   - [ ] New dependencies: justified; no known critical CVE.
4. For each finding, give a concrete exploit or failure scenario (inputs → wrong outcome) and file:line.
5. Return the report text starting with `SEC-REVIEW <task-id>: APPROVED | CHANGES REQUESTED` (the LC records it in `evidence/<task>/review/security.md` on the merge
   and posts the line; no PR comments). Runs for risk tier H; a re-check covers only the findings and `git diff <verdict head>..HEAD` (DEC-131 (5)).
