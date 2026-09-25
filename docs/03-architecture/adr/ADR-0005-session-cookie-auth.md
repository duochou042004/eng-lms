# ADR-0005: Server-side session cookies (Spring Session JDBC), no JWT

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §4, §37; NFR-SEC-04..07; A-018, A-021

## Context
There is one first-party SPA on the same origin and no third-party API clients. The tutor must be able to cut off a student immediately
(archive, password reset). Deploys must not log everyone out.

## Decision
- Spring Security with a JSON login endpoint (`POST /api/v1/auth/login`) that creates an HTTP session. The cookie is
  `HttpOnly; Secure; SameSite=Lax; Path=/`, and the session ID is rotated at login.
- **Spring Session JDBC** persists sessions in PostgreSQL. `FindByIndexNameSessionRepository` lets us end all of a user's sessions.
- CSRF: Spring Security's SPA configuration (an `XSRF-TOKEN` cookie readable by JavaScript, echoed in the `X-XSRF-TOKEN` header).
- Optional remember-me with persistent tokens (`persistent_logins`) for 30 days (A-021, OQ-10).
- Idle timeout 12 h (configurable).

## Alternatives considered
- **JWT access + refresh tokens:** revocation needs a denylist (which is state anyway). Tokens in JS-accessible storage risk XSS theft. Rejected.
- **In-memory sessions:** logout on every deploy. Rejected.
- **Redis sessions:** extra infrastructure without need (SPEC §36).

## Consequences
+ Simple, revocable, CSRF-protected. − Session rows have to be cleaned up (Spring Session handles expiry cleanup).

## Verification
Integration tests: login rotates the session ID; password reset and archive terminate sessions; CSRF is required on POST/PUT/PATCH/DELETE;
the cookie flags are correct.
