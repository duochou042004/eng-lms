# Decision Log

> Append-only. Each entry: ID · date · decision · rationale · alternatives · trace · decided by · status. Architecture-level decisions link to an ADR.
> Status: `Accepted` (LC, within delegated authority) · `Proposed – needs PO` · `Approved by PO` · `Superseded by DEC-x`.
> **The whole baseline (DEC-001..029) becomes `Approved by PO` when the PO approves T-M0.1.**

| ID | Date | Decision | Rationale / alternatives | Trace | By | Status |
|---|---|---|---|---|---|---|
| DEC-001 | 2026-09-25 | Source precedence: PO instructions > SPEC (product scope) > accepted DEC/ADR > CONV (context only) | Resolves the stack conflict (C-01) without widening scope | 00-sources/README | LC | Accepted |
| DEC-002 | 2026-09-25 | Java 25 + Spring Boot 4.1 instead of the SPEC's conditional .NET suggestion | PO directive | ADR-0002, C-01 | PO/LC | Accepted |
| DEC-003 | 2026-09-25 | Modular monolith with Spring Modulith | SPEC §35; enforceable boundaries | ADR-0001 | LC | Accepted |
| DEC-004 | 2026-09-25 | One Activity engine for assignments and assessments; two UI lists | SPEC §33; halves the engine code | ADR-0007, C-02 | LC | Accepted |
| DEC-005 | 2026-09-25 | Snapshot on assign; user-visible versioning stays P2 | SPEC §32 correctness | ADR-0008, C-12 | LC | Accepted |
| DEC-006 | 2026-09-25 | Notifications → P2. MVP dashboards derive "new" items from data | SPEC §42 vs §39/§43 | C-04 | LC | Accepted |
| DEC-007 | 2026-09-25 | Vocabulary → P2. No empty Vocabulary tab in the MVP | SPEC §42 vs §7 | C-05 | LC | Accepted |
| DEC-008 | 2026-09-25 | No email in the MVP. The tutor resets student passwords. Tutor recovery via operator CLI | SPEC §4.3 "later"; no email infrastructure | C-10, FR-AUTH-07..09 | LC | Accepted |
| DEC-009 | 2026-09-25 | Tutor created by a first-run bootstrap from a secret file. Exactly one tutor, enforced by the DB | No registration (SPEC §4.1) | FR-AUTH-02, ADR-0006 | LC | Accepted |
| DEC-010 | 2026-09-25 | Tutor IA: Today · Students · Schedule · Review · Library (Materials, Lesson templates, Questions, Assignments, Assessments) · Progress · Settings | SPEC §41 is adjustable; task-based navigation; avoid 10 menus | C-06, information-architecture.md | LC | Proposed – needs PO (reversible) |
| DEC-011 | 2026-09-25 | Terms: "Lesson" = scheduled occurrence (`LessonSession`); "Lesson template" = library content | Disambiguates SPEC §14 vs §22 | C-07, glossary | LC | Accepted |
| DEC-012 | 2026-09-25 | Archive instead of global soft delete. Hard delete only when unreferenced | Clarity, no hidden filters | ADR-0011 | LC | Accepted |
| DEC-013 | 2026-09-25 | The after-lesson wrap-up ships in M5, before question-bank breadth (M6) | SPEC §48 "optimise before secondary features" | roadmap | LC | Accepted |
| DEC-014 | 2026-09-25 | Local filesystem storage behind a `FileStorage` port. No MinIO in the MVP | Simplicity; swappable later | ADR-0010 | LC | Accepted |
| DEC-015 | 2026-09-25 | Tutor-defined metric definitions + observations back goals and progress (MVP) | SPEC §9/§25 extensibility; no hard-coding | ADR-0015, C-13 | LC | Accepted |
| DEC-016 | 2026-09-25 | Questions (and other library items) can be filed in library folders and tagged. Tags are free `text[]` per table | SPEC §16 "Organize", CONV "Move" | C-09 | LC | Accepted |
| DEC-017 | 2026-09-25 | Lesson status set: SCHEDULED, COMPLETED, STUDENT_ABSENT, CANCELLED, RESCHEDULED (+ attendance note). COMPLETED implies present | SPEC §23 | C-08 | LC | Accepted |
| DEC-018 | 2026-09-25 | Feedback = rubric scores + overall text + anchored text comments (timestamp or quote). No annotation UI in the MVP. Rubric library and "fix and regrade" → P2 | SPEC §20 cost/value note | C-11 | LC | Accepted |
| DEC-019 | 2026-09-25 | Embeds only from allow-listed providers (YouTube-nocookie, Vimeo, Google Drive preview, SoundCloud), stored as a URL, sandboxed iframe | XSS risk; SPEC §13 "Embedded media" | security.md §6 | LC | Accepted |
| DEC-020 | 2026-09-25 | Git model and approvals per git-governance.md. Only the LC merges via merge-gate; PO approves the planning baseline, releases and external actions | PO directive | git-governance.md | LC | Accepted |
| DEC-021 | 2026-09-25 | Maven Wrapper (not Gradle) | Determinism, agent familiarity | ADR-0002 | LC | Accepted |
| DEC-022 | 2026-09-25 | pnpm (via corepack) for the web | Strict dependencies; installed | tech-stack §3 | LC | Accepted |
| DEC-023 | 2026-09-25 | MVP calendar = Today agenda + week agenda + month overview. No drag-to-reschedule, no recurrence | SPEC §43 "advanced calendar / recurring" in P2 | FR-LES-04 | LC | Accepted |
| DEC-024 | 2026-09-25 | Cross-module DB foreign keys allowed for integrity. No cross-module queries or JPA associations (except read-model views owned by progress/dashboard) | Correctness priority #3 with modularity | module-boundaries.md | LC | Accepted |
| DEC-025 | 2026-09-25 | Result → metric observation is a direct synchronous call from `activities` to the `goals` API inside the publish transaction (not an event) | Avoids a module cycle; simpler and consistent | module-boundaries.md | LC | Accepted |
| DEC-026 | 2026-09-25 | A lesson's copied body (the tutor's teaching plan) is tutor-only in the MVP. Students see the title, summary, materials and homework | Lesson plans often contain teaching notes; the summary is the student record | data-model.md lessons | LC | Accepted |
| DEC-027 | 2026-09-25 | No composite undo for wrap-up. Every part stays editable afterwards | Undoing a multi-module command is complex and low-value | ux-flows F1 | LC | Accepted |
| DEC-028 | 2026-09-25 | Local git repo initialised (`master`, `develop`, planning branch). No remote until the PO approves (outward-facing action) | Governance with version history, without external effects | git-governance §7 | LC | Accepted |
| DEC-029 | 2026-09-25 | i18n infrastructure from M1. vi + en catalogues; default vi (pending OQ-02) | Vietnamese users; retrofitting i18n is costly | A-012 | LC | Proposed – needs PO |
| DEC-030 | 2026-09-25 | One-time bootstrap exception: the planning baseline is merged into `develop` locally with `git merge --no-ff` (local `check-docs.sh` as evidence) before a remote or CI exists. Every later merge goes through `merge-gate.sh` | CI cannot exist before the remote; the gate is otherwise unchanged | T-M1.1 AC1 | LC | Proposed – needs PO |
| DEC-031 | — | *Reserved* for T-M1.1: the branch-protection fallback (harness-only enforcement) if the GitHub plan does not support protection on this repository | — | T-M1.1 AC8, R-08 | LC | Reserved |
