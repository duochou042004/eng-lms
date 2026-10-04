# M1 milestone regression (gate G5)

> Recorded by the LC from the fresh qa-evaluator's returned reports (two rounds: the full run, then the WebKit rerun after the PO installed WebKit's system
> libraries). Build: `develop` at `fc288b3`. Suite, logs and screenshots: `qa/regression/M1.spec.ts` and `evidence/M1/qa/` (PR #46, `qa/T-M1.16-m1-regression`).
> S4 dispositions: DEC-087.

## Scope and environment
- Image `englms:dev` built from `fc288b3`, run read-only with `--network host`; PostgreSQL 18.6 (dev DB), Podman 5.7.0, OpenJDK 25.0.4, Node 24.21.0.
- QA tooling: Playwright 1.63.0 and `@axe-core/playwright` 4.13.0 (already pinned in `qa/`; no new dependencies).
- Engines × viewports: Chromium, Firefox and WebKit × 360×740, 390×844, 768×1024, 1024×768, 1280×800, 1440×900. Health: `:8081/actuator/health` UP.

## Results

| Suite | Result | Evidence |
|---|---|---|
| Implementer E2E (`./scripts/e2e-run.sh`, Chromium, all 6 viewports) | 161 passed, 49 skipped (dev-build `/dev/ui` and project-specific guard demos), 0 failed; the `guards.spec.ts:76` ✘ is the designed expected failure | `qa/e2e-all-viewports.log` |
| QA regression (`QA_ENGINES=all pnpm test regression/`; 22 scenarios × 18 projects) | Chromium 132/132, Firefox 132/132, WebKit 132/132 | `qa/regression-3-engines.log`, `qa/regression-webkit.log` |
| Stability (each test 3 times) | Chromium 396/396, Firefox 396/396, WebKit 396/396; nothing flaky | `qa/regression-stability-x3.log`, `qa/regression-webkit-stability-x3.log` |
| Independent `./scripts/gate.sh` on develop | PASS, 12 steps (276 s): backend 97 (incl. `ModularityTests`, `FlywayMigrationTest`, Testcontainers 2.0.5), web 88, contract-drift OK, E2E 86 | `qa/gate.log` |
| CI on develop | 7/7 succeeded on `fc288b3` | `gh run list --branch develop` |

Regression coverage: landing and language switch (vi default; en by pointer on `/`, `/tutor`, `/student`; strings, `html lang`, title; persists across reload
and a new tab); shells (banner, skip link first Tab stop into `main`, workspace name without a stale alert); client navigation (h1 focus and title on links,
keyboard, back/forward; a direct load leaves focus on `body`); 404 and the route error page (start-page links by keyboard; a failed lazy chunk); a 500 from
`/api/v1/meta` shows the header alert; deep-link reloads (SPA fallback; `/dev/ui` is the 404 page in production); no horizontal overflow; visible targets
≥ 44×44; axe WCAG 2.2 AA clean on every route and state; no console errors; HTTP surface (CSP without `unsafe-inline`, nosniff, Referrer-Policy,
Permissions-Policy, COOP; `no-cache` HTML; `immutable` hashed assets; Problem Details 404 for unknown `/api/…`; `/actuator` 404 on :8080); isolation probes
(`/api/v1/student/**`, `/api/v1/tutor/**` → 401/403/404 with no data; no `SECRET-` marker).

## Findings

| ID | Sev | Summary | Detail | Status |
|---|---|---|---|---|
| F-1 | S4 (environment) | WebKit did not launch on the host | Missing system libraries; the PO ran `playwright install-deps webkit`; the rerun passed | Resolved |
| F-2 | S4 (test tool) | Playwright 1.63's Firefox sometimes never finishes a `page.goto` from a blank page to a page sent with `Cross-Origin-Opener-Policy: same-origin` | The document loads, Playwright waits forever: app 8/300, static COOP page 30/300, without COOP 0/300. Firefox-only workaround in the spec (COOP stripped from navigation responses in the test; the real header is still checked through the request fixture). A future Firefox job in `e2e/` will hit it | `qa/firefox-nav-flake-before-workaround.log`; DEC-087 |
| F-3 | S4 | No feedback in the shell header when a never-loaded shell chunk is requested offline | Load `/student`, go to `/`, go offline, click the student link: only "Eng-LMS", an `aria-busy` region stays busy; recovers on reconnect | → T-M2.4 (DEC-087); `qa/screenshots/chromium-phone-small-offline-lazy-nav.png` |
| F-4 | S4 | Unknown sub-paths under the shells show the shell home, not the 404 page | `/student/qa/deep/missing` shows "Student home" (same for `/tutor/…`); fine for placeholders, M2's nested routes must not keep a catch-all | → T-M2.4 (DEC-087) |
| F-5 | S4 (tracked) | Header error copy says "tên lớp"; the header repeats "Eng-LMS Eng-LMS" | Already in T-M2.4 | Tracked |
| F-6 | S4 (QA workspace) | `pnpm typecheck` in `qa/` failed on develop (3 type errors in `qa/e2e/T-M1.13.spec.ts`), and nothing runs it | Fixed on the QA branch (type-only); gate/CI step → T-M1.18 | Fixed; T-M1.18 (DEC-087) |

## Exploratory session (about 45 min; small surface)
Invalid stored languages (`fr`, empty, `EN`, `en-US`, JSON) fall back to vi with one segment selected; ten quick toggles settle correctly. `/tutor/`, `/TUTOR`,
`/index.html`, double slashes, a 3000-character path and `/%E2%9C%93` return the SPA (200, `no-cache`); `/assets/nope.js`, `/api`, `/api/`, `/actuator` and
`/robots.txt` return Problem Details 404; POST/PUT/DELETE/OPTIONS on `/tutor` return Problem Details 404 with the security headers, HEAD 200. `/api/v1/meta`
returns `{name, version, locales, displayName}` with an `X-Request-Id`. Offline navigation to a never-loaded chunk shows the error page with reload and start-page
actions (Chromium, Firefox). No horizontal overflow at 320 px; injected inline styles are blocked by CSP. A slow `/api/v1/meta` shows the header skeleton. Flyway
history: V `202609250001` "platform extensions", success. Nothing outside M1's traced features; no exam-specific content.

## M1 exit criteria (roadmap)

| Criterion | Status | Basis |
|---|---|---|
| `gate.sh` green locally and in CI | Met | `qa/gate.log` PASS; CI 7/7 on `fc288b3` |
| Backend from the Spring Boot CLI; Modulith `verify()` | Met | `ModularityTests` 2/2 in the gate; CLI origin per the T-M1.2 evidence |
| Flyway V1 applies to PostgreSQL in Podman | Met | Flyway history; `FlywayMigrationTest` 6/6 |
| SPA served same-origin by the jar | Met | Regression HTTP-surface and deep-link scenarios |
| Playwright smoke at 3 viewports with axe | Met (exceeded) | 6 viewports in both suites; axe in the regression |
| OpenAPI drift check works | Met | contract-drift in the gate and CI |
| Testcontainers on rootless Podman | Met | Gate backend step |
| Docs describe how to reproduce every command | Met (spot-checked) | development-setup §0 and its command table |
| Every M1 packet merged | Met | T-M1.10 and T-M1.17 are carried past M1 (DEC-083, DEC-085) |
| G5: full E2E on 6 viewports × Chromium, Firefox and WebKit smoke | Met | 161 passed on 6 viewports; regression 132/132 per engine, 396/396 ×3 |

QA-VERDICT T-M1.16: PASS WITH MINOR
