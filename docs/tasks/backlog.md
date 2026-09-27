# Backlog — Task Packets by Milestone

> The LC writes a full packet (task-packet-template.md) just in time, usually 1–2 packets ahead. Lines here are **packet stubs**: ID · title · owner role ·
> trace · dependencies. Status lives in `progress.json`. Order within a milestone is the intended execution order.

## M0 — Planning baseline (P0)
| ID | Title | Owner | Trace | Deps | Status |
|---|---|---|---|---|---|
| T-M0.1 | Planning baseline: docs system, ADRs, harness, progress.json | LC | PO goal, SPEC §52, §60 | — | done (PO-APPROVED, merge a14caae) |

## M1 — Walking skeleton and delivery pipeline
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| **T-M1.1** ✅ | **Remote repository bootstrap and governance automation** (done, `f1e3caa`) (full packet: [T-M1.1](T-M1.1-repo-bootstrap-governance.md)) | LC | DEC-020, DEC-028, OQ-01, OQ-15 | T-M0.1 approved |
| T-M1.2 | **done** (`ae9ac5d`) ([packet](T-M1.2-backend-skeleton.md)) Backend skeleton via `spring init` (Boot 4.1, Java 25, Maven): Modulith, `shared` + `meta` endpoint, Flyway V1 (extensions + text-search config + Modulith event registry; the session tables move to T-M2.1, DEC-036), Actuator :8081, JSON logs, ModularityTests, ArchUnit base + forbidden-identifier scan, OpenAPI contract test, `backend` CI | BE | ADR-0001/2/3/14 | T-M1.1 |
| T-M1.3 | **done** (`8b9d938`) ([packet](T-M1.3-web-skeleton.md)) Web skeleton: Vite + React + TS strict, pnpm, ESLint, Prettier, stylelint (tokens), `tokens.css`, first `ui/` primitives, i18n vi/en + completeness test, router + shells (placeholders), API client generation, Vitest + axe, bundle budget, contrast check, `/dev/ui`, `web` CI | FE | ADR-0004/13/14, DEC-029 | T-M1.1 |
| T-M1.4 | **done** (`294d597`) ([packet](T-M1.4-local-stack.md)) Local stack + Testcontainers on rootless Podman: `compose.dev.yaml` (pinned postgres:18), `scripts/env.sh`, `dev-up/down`, user-level podman.socket (**PO approval: persistent user service**), Testcontainers proof or the fallback profile | BE | ADR-0012, R-07 | T-M1.2 |
| T-M1.5 | **done** (`a96dcf7`, [packet](T-M1.5-single-image.md)) Single image + same-origin serving: Containerfile (multi-stage), SPA fallback controller, cache and security headers baseline, a complete `scripts/gate.sh`, `contract-drift` CI | BE (+FE) | ADR-0004, NFR-SEC-08 | T-M1.2, T-M1.3 |
| T-M1.7 | **ready** ([packet](T-M1.7-merge-gate-hardening.md)) Merge-gate hardening: judge verdict freshness by the head-commit **push time** (PR timeline `HeadRefForcePushed`/`PullRequestCommit` events or the check-run start), not by `committedDate` (review R2-2, DEC-037). Also: every explicit negative verdict of any type blocks (R3-2); dependabot PRs require all commits to be authored by Dependabot, with a narrower allow-list (R3-1); allow `.mvn/wrapper/maven-wrapper.properties` (R3-3) (DEC-038) | LC | DEC-037, DEC-038, R-08 | T-M1.1 |
| T-M1.8 | Backend error-surface follow-ups from the T-M1.2 QA (DEC-041): request IDs and Problem Details on the management port (F1); Problem Details instead of Tomcat's HTML page for requests rejected before the app (F3); align the forbidden-identifier list between test-strategy rule 6 and coding-agent-rules §7 (`ExamType`, `Part5`) and extend the scan (F4); from the T-M1.4 QA (DEC-047): the local Podman test JVM hangs 30 s at shutdown (a shutdown hook; Hikari warnings), and Surefire force-kills it; make `dev-down.sh` quiet when nothing is running; from the T-M1.5 QA (DEC-054): **F2** requests that Tomcat rejects with a 400 before the filter chain (e.g. an encoded `%2f` or `..%2f` in the path) get Tomcat's HTML page **without** the security.md §5 headers; give them the headers (and Problem Details, with F3 above); from the T-M1.5 QA round 2 (DEC-055): **R2-1** make a failed (`continue-on-error`) report upload visible (a `::warning::` on `steps.<id>.outcome == 'failure'`) and confirm `backend-coverage` appears once the PO frees the account's artifact storage; **R2-3** a fixture-CSV script test for `scripts/coverage-summary.sh` | BE | api-conventions §5, test-strategy §4, DEC-041 | T-M1.2 |
| T-M1.9 | Web a11y/UX follow-ups from the T-M1.3 UX review (DEC-043): focus the page `h1` and set `document.title` per route (F3); a `ui/` SegmentedControl (RAC ToggleButtonGroup) for the language switcher, with the selected state = accent-subtle + check icon (F5); a 150 ms skeleton delay; an icon on field errors (F9); UX round 2 N1 (the 404 link is a 44 px target), N2 (44 px home/skip links), N3 (`RouteLoading` block layout + header skeleton), N4 (error copy without a request ID); QA F-1 (lazy-load the dev-only i18n namespace so it is not in production) and F-2 (`no-restricted-properties` for `window.fetch`/`globalThis.fetch`); from the T-M1.6 QA (DEC-058): **F3** the e2e console guard misses errors raised after the test body ends (e.g. a late timer); consider a short settle or an idle wait in the fixture teardown | FE | accessibility §2, design-system §3, DEC-043, DEC-058 | T-M1.3 |
| T-M1.10 | TypeScript 7 (native compiler) migration, once `openapi-typescript` (or a replacement) works without the TS JS compiler API: bump `typescript`, drop the Dependabot major-ignore, keep `pnpm api:generate`, typecheck and contract-drift green (Dependabot PR #6 was closed, DEC-056). **Not an M1 exit criterion**; schedule when upstream is ready | FE | tech-stack §7, DEC-056 | upstream support |
| T-M1.11 | **in_review** ([packet](T-M1.11-gitlab-ci.md)) GitLab mirror + GitLab CI storing the CI reports while GitHub's artifact storage is exhausted (temporary, DEC-060) | LC | DEC-053, DEC-056, DEC-060 | T-M1.6 |
| T-M1.6 | **done** (`5f193e6`, [packet](T-M1.6-e2e-harness.md)) E2E harness: `/e2e` Playwright (6 viewport projects), helpers (axe, no-horizontal-scroll, step counter, screenshots), smoke test, `e2e-smoke` CI; `/qa` skeleton + README | FE | NFR-RESP-01, qa-protocol | T-M1.5 |

## M2 — Identity and students
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| T-M2.1 | Identity core: accounts, tutor bootstrap, login/logout/session (Spring Session JDBC tables + `persistent_logins` migration, DEC-036), CSRF SPA, lockout + IP throttle, must-change gate, audit module v1; the security headers move into Spring Security's header writers (keep the T-M1.5 tests green) and a regression test shows that raw dot-segment paths (`/./api/v1/meta`, `/x/../actuator/health`) are rejected by the firewall, not answered with the SPA shell (T-M1.5 QA F3, DEC-054) | BE | FR-AUTH-01..06, 09, 10; ADR-0005 | M1 |
| T-M2.2 | Authz matrix + isolation harness: `@Audience`, policy registry + verifier, matrix test, fixture world, secret scan, ArchUnit student rules | BE (+SEC) | NFR-SEC-01..03, ADR-0016 | T-M2.1 |
| T-M2.3 | Students backend: student, guardians, learning profile, create-with-account, username suggestion and availability, status, password reset, accent-insensitive search | BE | FR-STU-01..05, FR-AUTH-07 | T-M2.2 |
| T-M2.4 | Auth UI + shells: login, forgot info, forced and voluntary password change, role redirect, tutor sidebar/drawer, student bottom tabs | FE | FR-AUTH-03..08, IA §1–4 | T-M2.1 |
| T-M2.5 | Students UI: list (responsive DataList), **Add student flow F2** + credentials card, workspace shell (header, Overview, Profile), edit profile, guardians, learning profile, status, reset password | FE | FR-STU-01..07, ux-flows F2 | T-M2.3, T-M2.4 |
| T-M2.6 | Settings v1 (workspace name, time zone, language; account preferences) | BE+FE | FR-SET-01, 02 | T-M2.4 |
| T-M2.7 | Student Home v0 + Account page; M2 regression + milestone gate | FE+QA | FR-DASH-03 (shell) | T-M2.5 |

## M3 — Schedule, lessons and notes
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| T-M3.1 | Lessons backend: sessions, transitions (state machine), range queries, overlap warning, student lessons API + isolation | BE | FR-LES-02..05, 07, 08 | M2 |
| T-M3.2 | Notes backend: teacher notes, lesson-linked endpoint, secret-scan fixtures | BE | FR-NOTE-01..03 | T-M3.1 |
| T-M3.3 | Schedule UI: week agenda, month overview, create/edit lesson (F3), lesson detail, transitions | FE | FR-LES-02..05 | T-M3.1 |
| T-M3.4 | Today v1: schedule, upcoming, quick actions (composition + UI) | BE+FE | FR-DASH-01 | T-M3.3 |
| T-M3.5 | Workspace Lessons and Notes tabs; student Lessons pages | FE | FR-LES-07, 08, FR-NOTE-02 | T-M3.2, T-M3.3 |
| T-M3.6 | *(conditional on OQ-13)* Duplicate lesson to next week | BE+FE | OQ-13 | T-M3.3 |

## M4 — Library and files
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| T-M4.1 | Files module: storage port + local adapter, streaming upload/download with Range, Tika sniffing, limits, orphan sweep, resolver SPI, usage | BE | FR-FILE-01..04, ADR-0010 | M2 |
| T-M4.2 | Library backend: folders, materials (4 kinds), sanitiser, embed providers (first extension point), tags, full-text search, shares, student materials + resolvers | BE | FR-LIB-01..06 | T-M4.1 |
| T-M4.3 | Rich-text editor spike (TipTap) + `RichTextEditor`, `FileDrop`, `UploadList` components | FE | tech-stack §3 | M2 |
| T-M4.4 | Library UI: folder tree, materials list/detail/editor, share dialog; student Materials; workspace Materials tab | FE | FR-LIB-01..05 | T-M4.2, T-M4.3 |
| T-M4.5 | Lesson templates (backend + UI); attach materials to lessons | BE+FE | FR-LES-01, 05 | T-M4.4, M3 |
| T-M4.6 | File/XSS security corpus, SEC review, M4 regression | SEC+QA | NFR-SEC-09/10 | T-M4.5 |

## M5 — Assignments v1 and after-lesson wrap-up
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| T-M5.1 | Activities core: assignment kind (text/file response modes), ad-hoc vs library, assign with snapshot, work-item lifecycle, excuse/withdraw/reopen | BE | FR-ACT-01, 04..07, ADR-0007/8 | M4 |
| T-M5.2 | Attempts (text/file): start, autosave, submit, late; student work APIs; file resolver | BE | FR-ATT-01..03, 05, 07 | T-M5.1 |
| T-M5.3 | Grading and feedback v1: manual grading, draft/publish, review queue, grade audit | BE | FR-GRD-02, 03, 06 | T-M5.2 |
| T-M5.4 | Wrap-up composite command (atomic, idempotent) | BE | FR-LES-06 | T-M5.1, M3, M4 |
| T-M5.5 | Assignment builder v1 UI, assign dialog (F6), workspace Work tab | FE | FR-ACT-01, 05, 06 | T-M5.1 |
| T-M5.6 | Student work UI: My work, attempt (text/file), save indicator + local buffer, result and feedback view | FE | FR-ATT-01..03, 07, NFR-OPS-05 | T-M5.2 |
| T-M5.7 | Review UI v1 (F5), **Wrap-up UI (F1)**, Today review section; **tutor UAT #1** | FE (+PO) | FR-GRD, FR-LES-06, A-019 | T-M5.3..6 |

## M6 — Question bank and assessments
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| T-M6.1 | Extension registry core + catalogue API and UI | BE+FE | FR-EXT-01..03 | M5 |
| T-M6.2 | 8 question-type handlers: schemas, validation, redaction, grading tests, PIT | BE | FR-QB-05, FR-GRD-01, ADR-0009 | T-M6.1 |
| T-M6.3 | Question bank backend: CRUD, search, bulk, duplicate, archive, preview | BE | FR-QB-01..04 | T-M6.2 |
| T-M6.4 | Frontend editors, renderers and reviewers for 8 types + parity test | FE | FR-EXT-03 | T-M6.2 |
| T-M6.5 | Question bank UI | FE | FR-QB-01..04 | T-M6.3, T-M6.4 |
| T-M6.6 | Assessment engine backend: sections, settings, snapshot with questions, auto-grade on submit, timer and deadline, auto-submit sweep, attempts and scoring policy | BE | FR-ACT-02, 03, FR-ATT-04, 06 | T-M6.3 |
| T-M6.7 | Assessment builder UI (F4) + timed attempt UI (timer, navigation, audio recorder) | FE | FR-ACT-02, 03, FR-ATT-02..04 | T-M6.6 |
| T-M6.8 | Rubric + anchored comments + full review queue | BE+FE | FR-GRD-04, 05 | T-M6.7 |

## M7 — Goals, plans, progress, dashboards v2
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| T-M7.1 | Goals and metrics backend (+ `recordResultAs` recorder) | BE | FR-GOAL-01..05 | M6 |
| T-M7.2 | Goals and metrics UI (settings metrics, workspace goals, observations, first goal in add-student) | FE | FR-GOAL-01..03 | T-M7.1 |
| T-M7.3 | Plans backend (phases, items, order, move, links, validation) | BE | FR-PLAN-01..05 | T-M7.1 |
| T-M7.4 | Plans UI (keyboard-accessible DnD editor; student plan view) | FE | FR-PLAN-01..06 | T-M7.3 |
| T-M7.5 | Progress backend (per student, overview, fixture-verified calculations) | BE | FR-PROG-01..04 | T-M7.3 |
| T-M7.6 | Progress UI (tutor, student, overview; Meter/ScoreLine) | FE | FR-PROG-01..04 | T-M7.5 |
| T-M7.7 | Attention rules + Today v2 + Student Home v2 | BE+FE | FR-DASH-01..03 | T-M7.5 |

## M8 — Hardening and Release 1.0
| ID | Title | Owner | Trace | Deps |
|---|---|---|---|---|
| T-M8.1 | Security hardening: final CSP and headers, security log UI, dependency and image scans, full security checklist | SEC+BE | NFR-SEC, FR-SET-03 | M7 |
| T-M8.2 | Accessibility audit (NVDA, VoiceOver) + fixes | UX+FE | NFR-A11Y | M7 |
| T-M8.3 | Performance: seeded dataset, load run, Lighthouse, fixes | BE+FE | NFR-PERF | M7 |
| T-M8.4 | Deployment: Quadlet, Caddy, backup/restore/upgrade scripts, staging rehearsal, restore drill (**PO: host, domain**) | LC+BE | ADR-0012, NFR-OPS | OQ-03 |
| T-M8.5 | *(conditional on OQ-07)* Student data export + permanent delete | BE+FE | OQ-07, R-12 | M7 |
| T-M8.6 | Tutor UAT #2 → release/1.0.0 → G6 → master + tag v1.0.0 → deploy | LC+PO | roadmap M8 | T-M8.1..5 |
