# Security Specification

> Status: Baseline v1.0 · Owner: Security Reviewer role · Trace: SPEC §37, NFR-SEC-*, NFR-PRIV-*, ADR-0005, ADR-0016.
> Every PR touching `identity`, any `web.student` package, `files`, sanitisation or `SecurityConfig` requires a **Security Reviewer sign-off** (G3).

## 1. Assets and actors

| Asset | Why it matters |
|---|---|
| Student personal data (names, phones, guardians; possibly minors) | Privacy law, trust |
| Tutor-private data (notes, learning profiles, unreleased grades, answer keys) | SPEC §37: students must not see it |
| Student work (responses, recordings) | Integrity of grades; privacy |
| Tutor account | Full control of the system |
| Library content | The tutor's intellectual work |

Actors: anonymous internet users, an authenticated student (curious or malicious, e.g. trying to see another student's work or answer keys), the tutor
(trusted, but can make mistakes), the operator (SSH access), supply-chain dependencies.

## 2. Threat model (STRIDE-lite) → controls

| # | Threat | Control | Verified by |
|---|---|---|---|
| T1 | Student reads another student's data by changing IDs (IDOR) | ADR-0016: student namespace without studentId; `findByIdAndStudentId`; 404 | Isolation suite |
| T2 | Student reads tutor-private fields through an over-broad DTO | Audience-specific DTOs; `@TutorPrivate`; ArchUnit; response secret scan | NFR-SEC-02 tests |
| T3 | Student obtains answer keys before or without release | Handler `toStudentView` redaction; release gate I-07 | Handler tests + scan for key fields |
| T4 | Student submits after the deadline or tampers with the timer | Server `deadlineAt` + grace; client timer is display only | Attempt tests |
| T5 | Credential stuffing or brute force | Lockout + per-IP throttle; generic errors; bcrypt cost ≥ 12 | Auth tests |
| T6 | Session hijacking (XSS → cookie theft) | HttpOnly cookie; strict CSP; sanitised HTML; no tokens in JS storage | Header + XSS corpus tests |
| T7 | CSRF on state changes | Spring Security CSRF (cookie → header) | Tests |
| T8 | Stored XSS through rich text, filenames, tags or metadata | Server allow-list sanitiser; React escaping; DOMPurify; `Content-Disposition` filename encoding | XSS corpus |
| T9 | Malicious upload (HTML or SVG script, polyglot, zip bomb, huge file) | Tika sniff + allow-list; SVG and HTML rejected; size limits; never inline except safe types; `nosniff`; no archive extraction | File tests |
| T10 | Embed injection (arbitrary iframe) | Only allow-listed providers; the URL is parsed and re-built into a canonical embed URL; iframe `sandbox`; CSP `frame-src` | Embed tests |
| T11 | Privilege escalation to tutor | No self-registration; one TUTOR (DB constraint); role never taken from the client | Authz matrix |
| T12 | Account takeover through the password reset flow | Tutor-only reset; temporary passwords expire (7 days) and require a change; sessions revoked | Tests |
| T13 | Data loss (disk failure, bad migration) | Backups + restore drill; forward-only migrations; pre-deploy backup | Release gate |
| T14 | Secrets leak (repo, logs) | gitleaks; Podman secrets; log masking; no secrets in `application.yml` | CI, review |
| T15 | Vulnerable dependency | Dependabot, `pnpm audit`, Trivy at release | Release gate |
| T16 | Enumerating usernames | Same login response and timing for unknown and wrong-password; availability check is tutor-only | Tests |
| T17 | Clickjacking | `frame-ancestors 'none'` | Header test |
| T18 | Open redirect after login | Redirect target resolved server-side by role; `?next=` accepts only relative app paths from an allow-list | Test |

## 3. Authentication

- Spring Security, JSON login (`/api/v1/auth/login`). Session per ADR-0005: `JSESSIONID`-equivalent cookie `ENGLMS_SESSION`, `HttpOnly; Secure; SameSite=Lax`.
- Session ID rotated on login and on privilege change (password change). Idle timeout 12 h (configurable). Remember-me 30 days (optional; OQ-10).
- **Password policy (NFR-SEC-06):** 10–128 characters, not in `common-passwords.txt` (top 10k, bundled), not equal to the username. No composition rules (per NIST 800-63B).
  Generated temporary passwords: 3 random words from a bundled word list + 2 digits (≥ 12 characters, easy to type on a phone), from a `SecureRandom` source.
- Hashing: `DelegatingPasswordEncoder` (default `{bcrypt}`, strength 12). Upgrading to argon2id is a later ADR (rehash on login).
- Lockout: after 10 consecutive failures → `locked_until = now + 15 min`. A successful login resets the count. The tutor sees lock status on the student page and can unlock through a password reset.
- Per-IP throttle: an in-memory sliding window (30 attempts per 5 minutes per IP). Adequate for a single instance; documented as instance-local.
- `mustChangePassword` gate: a filter lets only `/auth/session`, `/auth/password` and `/auth/logout` through.
- Tutor bootstrap (FR-AUTH-02): the password is read from a **file path** (`ENGLMS_BOOTSTRAP_TUTOR_PASSWORD_FILE`, a Podman secret), never from an env value in production.

## 4. Authorization model

| Layer | Mechanism |
|---|---|
| L1 URL gate | `/api/v1/tutor/**` → `hasRole('TUTOR')`; `/api/v1/student/**` → `hasRole('STUDENT')`; `/api/v1/auth/**` and `/meta` → permitAll/authenticated as listed; everything else under `/api/**` → deny |
| L2 Audience annotation | `@Audience` on every handler; a startup verifier cross-checks it with the path prefix |
| L3 Ownership | Student services take `CurrentStudent` and use owner-scoped queries. Tutor services can access everything (single tutor), but still validate that referenced IDs exist and belong together (e.g. a note's lesson belongs to the note's student) |
| L4 Data shaping | Audience DTOs; handler redaction; release rules |
| L5 Files | `FileAccessResolver` chain (a student is denied unless a resolver grants access) |

The **authz matrix test** enumerates `RequestMappingHandlerMapping`. For each handler it performs a request as anonymous, tutor, student A and student B
(on A's resources) and checks the expected outcome from the policy registry. A handler missing from the registry fails the build.

## 5. Transport and headers

- HTTPS only (Caddy) with HSTS `max-age=31536000; includeSubDomains`. HTTP redirects to HTTPS.
- CSP (served by the app for HTML):
  `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; font-src 'self';
  connect-src 'self'; frame-src <allow-listed embed origins>; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`.
  (`style-src` may need `'unsafe-inline'` only if a library requires it. That needs a DEC entry; the default is none.)
- `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: microphone=(self), camera=(), geolocation=(), payment=()`, `Cross-Origin-Opener-Policy: same-origin`.
- **As implemented (T-M1.5):** `shared.web.SecurityHeadersFilter` (a servlet filter; Spring Security arrives in T-M2.1) sets the CSP above with
  `frame-src 'none'` (until the embed allow-list exists) and the four headers on **every response of the application port** (HTML, API JSON, Problem Details, assets),
  including requests Tomcat rejects before the filter chain: `ProblemDetailsErrorReportValve` sets the same headers on those (T-M1.8, `SecurityHeadersFilter.apply`).
  **Known exception:** `TRACE` requests. Tomcat refuses them (`allowTrace=false`) with a 405 that Boot's `/error` page answers before the valve and outside the filters, so that
  response has no security headers or request ID, and it reflects the path JSON-encoded. Browsers can't send `TRACE`, so it isn't exploitable. This predates T-M1.8 and is closed with
  Spring Security's firewall in T-M2.1 (T-M1.8 SEC review S4-3).
  The management port (:8081, never proxied by Caddy) serves only health/info JSON and does not carry them (DEC-050). HSTS stays with Caddy.
  The SPA runs under `style-src 'self'` with no violations (evidence/T-M1.5): React Aria's runtime `<style>` injection is pre-empted by a marker in `index.html` and its rule ships in `global.css` (DEC-052). `Permissions-Policy: payment=()` disables the browser payment API; it is the one
  allowed occurrence of "payment" in production sources (ForbiddenIdentifiersTest, DEC-049).

## 6. Input handling

- Bean Validation on every DTO. Size limits on every string (validation-rules.md). JSON body limit 1 MB (except uploads).
- Rich text: OWASP Java HTML Sanitizer policy `RichTextPolicy` allows p, br, strong, em, u, s, h2–h4, ul, ol, li, blockquote, code, pre,
  a[href http/https/mailto; rel=noopener noreferrer; target=_blank], img[src=/api/v1/…/files/… only], table, thead, tbody, tr, th, td.
  Everything else is stripped. The sanitised output is stored, and sanitisation is idempotent.
- URLs (links, meeting URLs, embeds): must be `http`/`https`, ≤ 2048 characters, and are displayed with `rel="noopener noreferrer"`. Meeting URLs are opened in a new tab.
- Embed allow-list (registry, DEC-019): YouTube (`youtube.com`, `youtu.be` → `https://www.youtube-nocookie.com/embed/{id}`), Vimeo
  (`player.vimeo.com/video/{id}`), Google Drive file preview (`drive.google.com/file/d/{id}/preview`), SoundCloud (widget URL).
  An unknown provider is rejected, and the tutor is told to use the LINK kind instead.
- Markdown in notes: a minimal subset rendered on the client with a safe renderer (no raw HTML).

## 7. Files (details: files-and-storage.md)

The type is sniffed by content, then checked against the allow-list and size limit. Files are stored with random keys outside any web root. They are served only through
authorised endpoints, `inline` only for images, PDF, audio and video, `attachment` otherwise, always with `nosniff` and
`Content-Security-Policy: sandbox` on file responses. Filenames are encoded per RFC 6266.

## 8. Audit (NFR-SEC-11)

Recorded actions: `LOGIN_SUCCEEDED`, `LOGIN_FAILED`, `ACCOUNT_LOCKED`, `PASSWORD_CHANGED`, `PASSWORD_RESET_BY_TUTOR`,
`STUDENT_CREATED`, `STUDENT_STATUS_CHANGED`, `USERNAME_CHANGED`, `GRADE_OVERRIDDEN`, `RESULT_PUBLISHED`, `RESULT_UNPUBLISHED`,
`CONTENT_DELETED`, `SETTINGS_CHANGED`, `BOOTSTRAP_TUTOR_CREATED`. Details never include secrets. Retention: 365 days (a daily job purges older rows).

## 9. Privacy (NFR-PRIV)

- Collect only what the data model lists. No analytics, trackers or third-party fonts.
- Students may be minors (THPT). The tutor obtains consent outside the system (A-004). The system supports it by: tutor-only personal data,
  export and permanent delete (**pending OQ-07**), and audit logs of access-relevant changes.
- Vietnam's personal-data regulations (Decree 13/2023/ND-CP and the Personal Data Protection Law effective 2026) may apply to the tutor as data controller.
  **This document is not legal advice.** R-12 tracks it, and the PO decides on any legal review before production.
- Backups are encrypted before leaving the host (NFR-PRIV-03).

## 10. Secrets and configuration

| Secret | Source (prod) | Dev |
|---|---|---|
| DB password | Podman secret → `SPRING_DATASOURCE_PASSWORD_FILE` → read via a config property | `.env` (git-ignored); an example exists in `.env.example` |
| Tutor bootstrap password | Podman secret file | Generated by `scripts/dev-bootstrap` |
| Backup encryption key | Operator-held key file (offline copy) | n/a |

Never commit a secret. gitleaks runs in pre-commit (optional locally) and in CI (required).

## 11. Security review checklist (per PR, used by the Security Reviewer)

1. New or changed endpoints have `@Audience`, a policy registry entry and matrix coverage.
2. Student endpoints: no `studentId` parameter; owner-scoped queries; 404 on mismatch; audience DTOs only.
3. No private field is reachable from a student DTO (the ArchUnit test passes; manual read of the mappers).
4. Inputs have size limits. Rich text goes through the sanitiser. URLs are validated.
5. Files: purpose set, resolver updated when a new link to files is introduced.
6. Logs: no secrets or personal data beyond IDs.
7. Migrations: no weakening of constraints; sensitive columns documented in data-model §3.
8. Tests: an isolation test was added for any new student-visible resource.
