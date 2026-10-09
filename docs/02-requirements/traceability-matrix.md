# Traceability Matrix — SPEC → Requirement → Module → Milestone → Phase

> Required by SPEC §60.I. Every SPEC section is listed. A feature with no row here **must not** be built (`scope.md` §6).
> Modules: `identity`, `students`, `goals`, `plans`, `library`, `files`, `lessons`, `notes`, `questions`, `activities`,
> `progress`, `dashboard`, `settings`, `audit`, `shared`. The web app is `web/` (feature folders use the same names).

| SPEC § | Topic | Planned implementation | Requirement IDs | Module(s) | M | Phase |
|---|---|---|---|---|---|---|
| 1 | Overview: 1:1, one tutor | Single-tenant, one-tutor deployment (live T-M2.1: `ux_user_account__single_tutor`, tutor bootstrap) | FR-AUTH-02, ADR-0006 | identity | M2 | MVP |
| 2 | Tutor builds everything; no hard-coded curriculum | Generic engines; forbidden-identifier test | FR-STU-04, FR-ACT-03 AC, coding-agent-rules §7 | all | M1+ | MVP |
| 3 | Two roles | `Role {TUTOR, STUDENT}`; one-tutor constraint (live T-M2.1: `identity.Role`, L1 URL gate) | FR-AUTH-02 | identity | M2 | MVP |
| 4.1 | No public registration | No route or endpoint (verified T-M2.1: `/api/v1/auth/register` → 404) | FR-AUTH-01 | identity | M2 | MVP |
| 4.2 | Tutor creates student account | Create student + account + credentials card (live T-M2.3: `POST /tutor/students` with server-generated credentials once, username suggestion/availability; UI T-M2.5; guardians at create live T-M2.9: `guardians?` in `POST /tutor/students`, same transaction; first goal T-M7.1/T-M7.2, DEC-102) | FR-STU-01, FR-AUTH-06 | students, identity | M2 | MVP |
| 4.3 | Login, logout, change password, forgot (later) | Session auth; tutor reset (live T-M2.1: `/auth/session`, `/auth/login`, `/auth/logout`, `/auth/password`, must-change gate, lockout, throttle, operator reset CLI FR-AUTH-09, disable FR-AUTH-10; UI in T-M2.4; tutor's student reset live T-M2.3: `POST /tutor/students/{sid}/password-reset`, FR-AUTH-07) | FR-AUTH-03..08 | identity | M2 | MVP |
| 5.1 | No enrolment | — | scope.md §4 | — | — | NEVER |
| 5.2 | No payment | — | scope.md §4 | — | — | NEVER |
| 5.3 | No marketplace or SaaS | Single tenant | ADR-0006 | — | — | NEVER |
| 5.4 | No AI | — | scope.md §3 | — | — | FUTURE |
| 5.5 | No communication tools; store meeting URL | `meetingUrl`, contact links | FR-LES-02, FR-STU-07 | lessons, students | M2–M3 | MVP |
| 5.6 | No parent portal; parent info on profile | Guardians on profile (profile and contacts live T-M2.3: `GET`/`PATCH /tutor/students/{sid}`, FR-STU-03; guardians live T-M2.9: `GET`/`POST /tutor/students/{sid}/guardians`, `PATCH`/`DELETE /tutor/guardians/{gid}`, ≤ 10, contact values only, DEC-103) | FR-STU-01, FR-STU-03 | students | M2 | MVP (portal FUTURE) |
| 6 | Student-workspace-centric model | Workspace shell + tabs | FR-STU-06 | web + all | M2–M7 | MVP |
| 7 | Workspaces differ per student | Nothing mandatory; tabs appear when data or modules exist | FR-STU-06, NFR-UX-02 | web | M2+ | MVP |
| 8 | Learning profile, flexible | Level, strengths, weaknesses, notes, custom fields (live T-M2.9: `GET`/`PUT /tutor/students/{sid}/learning-profile`, tutor-private `@TutorPrivate` types, empty profile with `version` `null`, DEC-103) | FR-STU-04 | students | M2 | MVP |
| 9 | Goal system, extensible metrics | Metric definitions, goals, observations | FR-GOAL-01..03, 05 | goals | M7 | MVP |
| 10 | Learning plan operations | Plan → phase → item, reorder, move, pause, complete | FR-PLAN-01..06 | plans | M7 | MVP |
| 11 | Plan templates | Template copy | FR-PLAN-07 | plans | — | P2 (OQ-04) |
| 12 | Content library with tutor folders | Folder tree | FR-LIB-01, 03 | library | M4 | MVP |
| 13 | Content types | Material kinds FILE, RICH_TEXT, LINK, EMBED | FR-LIB-02, FR-FILE-01 | library, files | M4 | MVP |
| 14 | Lesson builder, flexible | Lesson templates; optional blocks | FR-LES-01 | lessons | M4 | MVP |
| 15 | Reusable content → student activity | Snapshot on assign; per-student status | FR-ACT-05, ADR-0008 | activities | M5 | MVP |
| 16 | Question bank | CRUD, duplicate, archive, search, tags | FR-QB-01..05 | questions | M6 | MVP |
| 17 | Assignment engine, question types | Activity engine; MVP type set | FR-ACT-01, FR-ATT-03, A-010 | activities, questions | M5–M6 | MVP (+ matching/ordering P2) |
| 18 | Assessment engine, generic | Sections, time limit, scoring | FR-ACT-02, 03 | activities | M6 | MVP |
| 19 | Submission and grading (auto/manual) | Attempts, handlers, manual grading | FR-ATT-02, FR-GRD-01, 03 | activities | M5–M6 | MVP |
| 20 | Teacher feedback, rubric, timestamps | Rubric + anchored comments + publish | FR-GRD-04..06, DEC-018 | activities | M5–M6 | MVP |
| 21 | Vocabulary | — | scope.md §2 | vocabulary (future) | — | P2 |
| 22 | Lesson and schedule; no self-booking | Lessons CRUD, schedule views | FR-LES-02, 04, 05, 07 | lessons | M3 | MVP |
| 23 | Attendance statuses | Status state machine | FR-LES-03, DEC-017 | lessons | M3 | MVP |
| 24 | Private teacher notes with links | TeacherNote | FR-NOTE-01..03 | notes | M3 | MVP |
| 25 | Progress: multiple data types, configurable metrics | Progress read model | FR-PROG-01..04, FR-GOAL-04 | progress, goals | M7 | MVP |
| 26 | Student dashboard, own data only | Student Home | FR-DASH-03, NFR-SEC-01 | dashboard | M2, M5, M7 | MVP |
| 27 | Tutor dashboard, action-first | Today | FR-DASH-01, 02 | dashboard | M3, M5, M7 | MVP |
| 28 | Daily tutor workflow, short | Today → wrap-up | FR-LES-06, NFR-UX-01 | lessons, web | M5 | MVP |
| 29 | Student daily workflow | Home → work → submit → results | FR-DASH-03, FR-ATT-01..07 | activities, dashboard | M5–M7 | MVP |
| 30 | Per-student personalisation | Independent plans, goals and work | FR-PLAN-01, FR-GOAL-02 | plans, goals | M7 | MVP |
| 31 | Course only as a template | Lesson templates; plan templates in P2 | FR-LES-01, FR-PLAN-07 | lessons, plans | M4 / P2 | MVP / P2 |
| 32 | Content vs student activity; lesson template → instance | Snapshot; lesson copies template content | ADR-0008, FR-LES-02 | activities, lessons | M3–M5 | MVP |
| 33 | Generic engine, user-defined content | No exam-specific classes | coding-agent-rules §7 | all | all | MVP |
| 34 | Data model direction (to be re-analysed) | `docs/03-architecture/data-model.md` | — | all | M0 | MVP |
| 35 | Modular monolith | Spring Modulith | ADR-0001 | all | M1 | MVP |
| 36 | Technology must be justified | tech-stack.md + ADRs | NFR-MNT-02 | — | M0+ | MVP |
| 37 | Security: A ≠ B; private data | Namespace isolation, authz matrix, scans (T-M2.1: L1 role gate on `/api/v1/tutor/**` and `/api/v1/student/**`, CSRF, security headers via Spring Security, audit v1 NFR-SEC-11; T-M2.2: `@Audience` + startup verifier (L2), policy registry + authz matrix, isolation fixture world + response scan for B's IDs and `SECRET-*`, ArchUnit student rules 3–4; T-M2.3: `CurrentStudent` resolver + owner-scoped convention, per-request account-status check (S4-1), the students isolation contributor; student lifecycle with archive disabling sign-in, FR-STU-05: `POST /tutor/students/{sid}/status`; T-M2.9: credential stamp (S4-5), rule 3 on headers, cookies, matrix variables and bound fields, dashless B IDs in the scan, guardians and profiles with `SECRET-*` in the world) | NFR-SEC-01..03, ADR-0016, FR-STU-05 | all | M2+ | MVP |
| 38 | File and material management, not Drive | Files module, limits, access checks | FR-FILE-01..04 | files, library | M4 | MVP |
| 39 | Notifications (useful events; in-app first) | Derived dashboard items in the MVP | DEC-006 | notifications (future) | — | P2 |
| 40 | UX principles | Design system, step budgets, progressive disclosure | NFR-UX-01..04 | web | all | MVP |
| 41 | Information architecture (adjustable) | Task-based nav with a Library group; student list (live T-M2.3: `GET /tutor/students` search/filter/sort; row signals T-M3.1, T-M5.1, T-M7.7) | DEC-010, information-architecture.md, FR-STU-02 | web | M2+ | MVP |
| 42 | MVP scope | This matrix | scope.md §1 | — | — | MVP |
| 43 | Phase 2 list | scope.md §2 | — | — | — | P2 |
| 44 | Phase 3 / Future | scope.md §3 | — | — | — | FUTURE |
| 45 | What the system is NOT | Guardrail procedure | scope.md §4, §6 | — | — | NEVER |
| 46 | Tutor user stories | Covered by FR-STU, PLAN, LIB, ACT, GRD, LES, PROG | — | — | M2–M7 | MVP |
| 47 | Student user stories | Covered by FR-AUTH-03, PLAN-06, LIB-05, ATT, PROG-02, LES-07 | — | — | M2–M7 | MVP |
| 48 | Critical UX: after the lesson | Wrap-up screen | FR-LES-06, ux-flows F1 | lessons | M5 | MVP |
| 49 | Critical UX: creating a student | Add-student flow | FR-STU-01, ux-flows F2 | students | M2 | MVP (template step P2) |
| 50 | Critical UX: create an assessment | Builder flow | FR-ACT-02, 03, ux-flows F4 | activities | M6 | MVP |
| 51 | Success criteria | M8 UAT checklist | product-brief §6 | — | M8 | MVP |
| 52 | Agent design procedure (20 steps) | This docs baseline (see evidence T-M0.1 checklist) | — | — | M0 | — |
| 53 | Forbidden assumptions | coding-agent-rules §7 + review checklist | — | — | all | — |
| 54 | NFR priority order | NFR doc header; ADR trade-offs | — | — | all | — |
| 55 | Product character; 8 daily questions | product-brief §2 table | FR-DASH-01, FR-LES-08 | dashboard | M3–M7 | MVP |
| 56 | Final product model | architecture-overview.md | — | — | — | MVP |
| 57 | One-sentence definition | product-brief §1 | — | — | — | — |
| 58 | Scope guardrail | scope.md §6; task packet Guardrail section | — | — | all | — |
| 59 | Research context | Reference only; no copying | — | — | — | — |
| 60 | Planning deliverables A–I | Docs tree (see `docs/README.md` mapping) | — | — | M0 | — |
| 61 | North Star | product-brief §2; used in every Phase 2 intake | — | — | all | — |

## SPEC §52 checklist (the agent design procedure) → where each step is satisfied

| # | Step | Satisfied in |
|---|---|---|
| 1 | Read the entire document | evidence/T-M0.1/summary.md |
| 2 | Extract functional requirements | functional-requirements.md |
| 3 | Separate MVP from future | scope.md |
| 4 | Entities and relationships | domain-model.md, data-model.md |
| 5 | User workflows | ux-flows.md |
| 6 | Permissions and security boundaries | security.md, ADR-0016 |
| 7 | Reusable content vs student activity | domain-model.md §3, ADR-0008 |
| 8 | Modular architecture | architecture-overview.md, module-boundaries.md |
| 9 | Technology justification | tech-stack.md, ADRs |
| 10 | Ambiguities and assumptions | spec-reconciliation.md, assumptions.md, open-questions.md |
| 11 | Implementation order | roadmap.md, tasks/backlog.md |
| 12 | Database design | data-model.md |
| 13 | API design | api-conventions.md, api-catalog.md |
| 14 | Frontend IA | information-architecture.md |
| 15 | Validation rules | validation-rules.md |
| 16 | Test strategy | test-strategy.md |
| 17 | Deployment strategy | deployment.md |
| 18 | Technical risks | risk-register.md |
| 19 | Check the proposal against every requirement | this matrix |
| 20 | Only then implement | quality-gates.md G0 (planning approval gate) |
