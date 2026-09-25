# Non-Functional Requirements

> Priority order (SPEC §54): Simplicity > Flexibility > Correctness > Security > Maintainability > UX > Performance > Scalability.
> Each NFR has a **verification** method. If an NFR cannot be verified, it is not accepted.

## Security (details: `docs/04-backend/security.md`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-SEC-01 | **Student isolation:** a student can read or write only resources they own. Foreign or unknown IDs return **404**, never 403 | Isolation test suite (A vs B fixtures) on every student endpoint; runs in CI |
| NFR-SEC-02 | **Private tutor data** (notes, learning profile, unreleased grades and feedback, answer keys before release, plan item notes, attention reasons) never appears in student responses | Response-scan test comparing fixture secrets with all student endpoint payloads; ArchUnit rules on student DTO packages |
| NFR-SEC-03 | Every endpoint is covered by the authorization-policy registry. A CI test fails for an endpoint without a policy | Authz matrix test (enumerates handler mappings) |
| NFR-SEC-04 | Server-side sessions (Spring Session JDBC), cookie `HttpOnly; Secure; SameSite=Lax`, ID rotated at login. Disabling an account or resetting its password ends that account's sessions | Integration tests |
| NFR-SEC-05 | Brute-force protection: account lockout (10 fails / 15 min) plus per-IP throttling (default 30 login attempts / 5 min) | Integration tests |
| NFR-SEC-06 | Passwords: 10–128 characters, not in the bundled common-password list, hashed with the Spring `DelegatingPasswordEncoder` (bcrypt, cost ≥ 12; argon2id may be adopted via ADR) | Unit tests; config review |
| NFR-SEC-07 | CSRF protection on all state-changing requests (SPA cookie-to-header token) | Integration tests |
| NFR-SEC-08 | Security headers: strict CSP (no inline script; `frame-src` limited to embed providers), HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (microphone=self, camera=()), `frame-ancestors 'none'` | Header test plus an external scan at release |
| NFR-SEC-09 | Rich text is sanitized **on the server** with an allow-list (OWASP Java HTML Sanitizer), plus DOMPurify on render | Unit tests with an XSS payload corpus |
| NFR-SEC-10 | File uploads: content sniffed (Apache Tika core), extension and MIME allow-list, size limits, random storage keys, never executed or served as HTML/SVG | File security tests |
| NFR-SEC-11 | Audit log for security-relevant events (append-only; 1 year retention) | Integration tests |
| NFR-SEC-12 | Secrets are never committed (gitleaks in CI and pre-commit). Runtime secrets come from Podman secrets or env files with 0600 permissions | CI and runbook |
| NFR-SEC-13 | Dependencies: Dependabot alerts; `pnpm audit --prod` and a Trivy image scan on release; no known **critical** CVE at release | Release gate |
| NFR-SEC-14 | The database user has least privilege (the app user cannot create roles; migrations run as the same owner role in the MVP, documented) | Deployment review |
| NFR-SEC-15 | Logs never contain passwords, session IDs, temporary passwords or file contents; personal data in logs is limited to user IDs | Log review; unit test on the masking converter |

## Privacy

| ID | Requirement | Verification |
|---|---|---|
| NFR-PRIV-01 | Data minimisation: only the fields in the data model are collected. No tracking or analytics scripts. Fonts are self-hosted (no third-party requests except user-chosen embeds) | CSP review; network log in E2E |
| NFR-PRIV-02 | Personal data of students (possibly minors) is handled per `security.md` §9. Export and delete are pending OQ-07 | PO decision |
| NFR-PRIV-03 | Backups are encrypted at rest when stored off-site | Runbook check |

## Performance (target data: A-001 × 3 years ≈ 200 students, 20k student activities, 100k responses, 5k library items)

| ID | Requirement | Verification |
|---|---|---|
| NFR-PERF-01 | API p95 ≤ 300 ms for reads and ≤ 500 ms for writes (excluding uploads) at the target data volume. Today and Home p95 ≤ 500 ms | Seeded performance dataset (`scripts/seed-perf`) plus a scripted HTTP load run. The load tool is chosen in the M8 packet (candidates: `oha`, Gatling) and justified in `tech-stack.md` |
| NFR-PERF-02 | Activity builder with 100 items loads in < 1 s and saves in < 500 ms | E2E timing assertion |
| NFR-PERF-03 | Frontend: JavaScript for the initial student route ≤ 200 KB gzipped, tutor route ≤ 300 KB gzipped; routes lazy-loaded. LCP ≤ 2.5 s and INP ≤ 200 ms on a mid-range phone profile (4× CPU throttle, Fast 4G) | Bundle budget check in CI; Lighthouse run at M8 |
| NFR-PERF-04 | No N+1 queries on list endpoints (the number of statements is bounded) | Hibernate statistics assertions in integration tests |
| NFR-PERF-05 | Audio and video are streamed with Range support. Uploads are streamed to disk (no full buffering in memory) | Tests; heap observation during a 200 MB upload |

## Accessibility (details: `docs/05-frontend/accessibility.md`)

| ID | Requirement | Verification |
|---|---|---|
| NFR-A11Y-01 | WCAG 2.2 level AA for all tutor and student flows | axe-core in E2E (no serious or critical issues); manual keyboard and screen-reader audit at M8 |
| NFR-A11Y-02 | Everything is operable by keyboard, including drag-reorder alternatives and the audio recorder | E2E keyboard-only scripts for critical flows |
| NFR-A11Y-03 | Reflow at 320 CSS px and 200% zoom without loss of content or function | Viewport E2E |
| NFR-A11Y-04 | Status is never conveyed by colour alone | UX review checklist |

## Responsive and compatibility

| ID | Requirement | Verification |
|---|---|---|
| NFR-RESP-01 | Critical flows work at the reference viewports 360×740, 390×844, 768×1024, 1024×768, 1280×800 and 1440×900 | Playwright projects; screenshots stored as evidence |
| NFR-RESP-02 | No horizontal page scroll at any reference viewport. Wide tables either reflow into lists or scroll inside their own container | E2E assertion `scrollWidth ≤ clientWidth` |
| NFR-RESP-03 | Touch targets ≥ 44×44 px for primary controls (≥ 24×24 px minimum for all, per WCAG 2.5.8) | Automated check + UX review |
| NFR-COMPAT-01 | Browsers per A-014 | Playwright on Chromium, Firefox and WebKit (WebKit is the stand-in for Safari) |

## Internationalisation

| ID | Requirement | Verification |
|---|---|---|
| NFR-I18N-01 | Every UI string is externalised (no hard-coded copy). Locales: `vi` and `en`. Missing keys fail the build | i18n lint in CI |
| NFR-I18N-02 | Dates and times are shown in the viewer's time zone with locale formats. Storage is UTC `timestamptz`. Date-only values (target dates) are stored as `date` | Unit tests |
| NFR-I18N-03 | Search is accent-insensitive and case-insensitive for Vietnamese text | Integration tests using the `unaccent` configuration |
| NFR-I18N-04 | The font fully supports Vietnamese diacritics (Be Vietnam Pro, self-hosted) | Visual snapshot |

## Reliability and operations

| ID | Requirement | Verification |
|---|---|---|
| NFR-OPS-01 | Single-host deployment with automatic restart (systemd/Quadlet). Health endpoints for liveness and readiness | Deployment test |
| NFR-OPS-02 | Backups: nightly database dump + file snapshot; 14 daily and 8 weekly kept; off-site copy; **restore drill before every release** (RPO ≤ 24 h, RTO ≤ 4 h) | Release gate evidence |
| NFR-OPS-03 | Zero data loss on routine deploys: forward-only migrations, pre-deploy backup, rollback procedure documented | Runbook + drill |
| NFR-OPS-04 | Structured JSON logs with a request/correlation ID. Actuator health and info exposed on the management port only | Config review |
| NFR-OPS-05 | Student work is never lost to network blips: autosave with retry and local draft buffering until the server acknowledges | E2E with network interruption |

## Maintainability

| ID | Requirement | Verification |
|---|---|---|
| NFR-MNT-01 | Module boundaries are enforced (Spring Modulith `verify()`, ArchUnit rules). No cyclic module dependencies | CI |
| NFR-MNT-02 | Every new dependency is justified in its packet and in `tech-stack.md`; architectural ones need an ADR | PR review |
| NFR-MNT-03 | Test coverage: ≥ 80% line coverage on domain/application packages (JaCoCo); ≥ 70% mutation score on grading | CI report |
| NFR-MNT-04 | The OpenAPI contract is generated and committed. Drift fails CI. The frontend client is generated from it | CI |
| NFR-MNT-05 | Docs are updated in the same PR as the behaviour change (PR checklist) | PR review |

## UX quality

| ID | Requirement | Verification |
|---|---|---|
| NFR-UX-01 | Step budgets for critical flows (`ux-flows.md`): wrap-up ≤ 7 steps, add student ≤ 6 steps, assign existing work ≤ 4 steps | E2E step counters |
| NFR-UX-02 | No mandatory setup before first use: a student with only a name is fully functional | E2E |
| NFR-UX-03 | Every data view implements loading, empty, error and populated states per `interaction-states.md` | Component tests + UX review |
| NFR-UX-04 | Visual consistency: only design-system components and tokens; stylelint forbids raw colours and spacing values | Lint in CI |
