# Spec Reconciliation — conflicts, gaps and their resolutions

> Method: all 61 SPEC sections and all 25 CONV sections were read in full on 2026-09-25 (evidence: `evidence/T-M0.1/summary.md`).
> Each finding is resolved by a decision (DEC), an assumption (A) or an open question (OQ). **No finding is resolved silently.**

## 1. Conflicts between sources

| # | Finding | Sources | Resolution |
|---|---|---|---|
| C-01 | SPEC suggests a .NET stack (ASP.NET Core, EF Core, React/Next.js). The PO directive mandates JDK 25, Spring Boot, Node.js and Podman | SPEC §36 vs PO goal | PO directive wins (DEC-001). Stack is Java 25 + Spring Boot 4.1 + PostgreSQL + React/Vite SPA (ADR-0002, 0003, 0004). SPEC §36's "only add technology with a clear reason" rule is kept |
| C-02 | SPEC §34/§35 list separate `Assignment*` and `Assessment*` entity sets and modules. SPEC §17/§18/§33 require generic engines, and assignments also have questions, time limits and pass marks | SPEC §17, §18, §33, §34 | **One Activity engine** with `kind ∈ {ASSIGNMENT, ASSESSMENT}`; the UI keeps separate "Assignments" and "Assessments" lists (ADR-0007, DEC-004). §34 says the model is "not final" |
| C-03 | The critical add-student flow includes "Optional: choose template", but Learning Plan Templates are Phase 2 | SPEC §49 vs §43 | Templates stay in P2. The step is hidden until P2. OQ-04 asks whether a minimal version belongs in Release 1.1 |
| C-04 | Notification entity and module are listed (§34, §35) and in-app notifications are described (§39), but notifications are absent from the MVP list and present in Phase 2 | SPEC §34, §35, §39, §42, §43 | Notifications are **P2** (DEC-006). In the MVP, the dashboards derive "new" items from data (new work, released results, upcoming lessons) |
| C-05 | Vocabulary appears in the Student Workspace (§6, §7) and in CONV's student portal, but not in the MVP list; "Vocabulary tools" is Phase 2 | SPEC §6, §7, §21, §42, §43; CONV §20 | Vocabulary is **P2** (DEC-007). In the MVP the tutor uses materials and questions for vocabulary. The workspace shows no empty Vocabulary tab |
| C-06 | The IA lists 10 top-level tutor menus, including Question Bank, Assignments, Assessments and Learning Plans. §41 also says "don't create a menu per entity" and that the IA may be adjusted after UX research | SPEC §41, §40.6 | Reusable content is grouped under **Library** (Materials · Lesson templates · Questions · Assignments · Assessments). Learning plans live inside the student workspace. Grading gets a **Review** menu (DEC-010). This change is reversible |
| C-07 | "Lesson" means both reusable lesson content (§14 Lesson Builder) and a scheduled occurrence (§22 "Lesson Session", student "upcoming lessons") | SPEC §14, §22, §32 | UI: **Lesson** = a scheduled occurrence; **Lesson template** = library content. Code: `LessonSession` and `LessonTemplate` (DEC-011) |
| C-08 | Attendance statuses mix lesson state and presence: "Scheduled, Completed, Absent, Cancelled, Rescheduled" plus "Attendance: Present" | SPEC §23 | One status field, `SCHEDULED, COMPLETED, STUDENT_ABSENT, CANCELLED, RESCHEDULED`. COMPLETED implies present. An optional attendance note covers "late" and similar (DEC-017) |
| C-09 | The CONV question bank has a "Move" action; the SPEC has "Organize" | SPEC §16, CONV §10 | Questions can be filed in library folders (move) and tagged (DEC-016) |
| C-10 | Forgot Password is "can be implemented later", and there is no email infrastructure | SPEC §4.3 | MVP: the tutor resets a student password (a new temporary password is shown once). The login page tells students to contact their tutor. Tutor recovery uses an operator command (runbook) (DEC-008) |
| C-11 | Advanced annotation UI is "not required in the MVP if too complex", but timestamped comments are shown | SPEC §20 | MVP: **anchored text comments** per response (the anchor can be "00:12" or a quote). Timestamps are clickable to seek audio. There is no drawing or inline-highlight UI (DEC-018) |
| C-12 | Versioning is in Phase 2, but §32 requires that student results never change the original content, which needs some immutability | SPEC §32, §43 | **Snapshot on assign** in the MVP (ADR-0008). User-visible version history stays P2 |
| C-13 | "Learning Plan / Goals" is in the MVP, and "metrics should be extensible". Metric definitions are not listed explicitly | SPEC §9, §25, §42; CONV §14 ("+ Add Metric") | Tutor-defined **metric definitions + observations** are MVP; they back goals and progress (ADR-0015) |
| C-14 | The PO goal lists a "plugin-store specification". The SPEC forbids marketplaces and has no plugin concept | PO goal, SPEC §5.3 | Interpreted as an **internal build-time extension registry** (question types, material kinds and embed providers, metric value types) with a settings catalog to enable or disable types (A-016, OQ-08). No third-party code, no runtime downloads |
| C-15 | The SPEC's architecture folders (`src/Web`, `Modules/…`) use .NET conventions | SPEC §35 | These map to Java packages `com.englms.<module>` with Spring Modulith verification (ADR-0001) |
| C-16 | Students "cannot edit the learning plan if not permitted", which implies a possible permission | SPEC §37 | MVP: students are read-only (A-009). OQ-12 asks about a per-item "student can check off" option |

## 2. Gaps (the SPEC is silent, so a default was chosen)

| # | Gap | Default chosen | Ref |
|---|---|---|---|
| G-01 | Tutor account creation (there is no registration) | First-run bootstrap from an operator-provided secret. The database enforces exactly one tutor | DEC-009, FR-AUTH-02 |
| G-02 | UI language | vi + en; default vi | A-012, OQ-02 |
| G-03 | Time zones | Stored in UTC; displayed in each user's zone (default Asia/Ho_Chi_Minh) | A-002 |
| G-04 | Upload limits and allowed types | Configurable; defaults in A-011; allow-list of types | A-011, files-and-storage.md |
| G-05 | Embeds (XSS risk) | Only allow-listed providers (YouTube, Vimeo, Google Drive preview, SoundCloud), stored as a URL and never as raw iframe HTML | DEC-019 |
| G-06 | Deleting content that is in use | Archive (hide) instead. Hard delete only when unreferenced | ADR-0011 |
| G-07 | Student removal and privacy | Archive in the MVP. Permanent delete and export are an OQ | OQ-07, R-12 |
| G-08 | "Students requiring attention" / "falling behind" definition | Deterministic, configurable rules (overdue work, no lesson in N days, scores below the pass mark, phase past its target date) | FR-DASH-02 |
| G-09 | Retakes and scoring policy | `maxAttempts` (default 1) and `attemptScoring` (LATEST or HIGHEST) | FR-ATT-06 |
| G-10 | When results are shown to students | `resultPolicy`: `IMMEDIATE` (fully auto-graded), `AFTER_REVIEW` (default when any item needs manual grading) or `HIDDEN` | FR-ATT-07 |
| G-11 | Backups | Nightly database dump + file snapshot, off-site copy | A-020, runbooks.md |
| G-12 | Accessibility level | WCAG 2.2 AA | NFR-A11Y-01 |
| G-13 | Search for Vietnamese names | Accent-insensitive search (PostgreSQL `unaccent` + `pg_trgm`) | NFR-I18N-03 |
| G-14 | Scheduling conflicts | The tutor gets a warning (not a block) when lessons overlap | FR-LES-02 |

## 3. Items confirmed as consistent (no action needed)

Two roles only · no public registration · no payment, AI, chat or marketplace · meeting URL only · no parent portal (guardian info on
the profile only) · content separated from activity · generic assessment engine · tags are tutor data · modular monolith, no
microservices, Kafka, RabbitMQ, Elasticsearch or Kubernetes · action-first dashboards · student isolation · private notes · plans are not a curriculum ·
template is an accelerator, never a rule.
