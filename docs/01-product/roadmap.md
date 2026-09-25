# Roadmap — Phases, Milestones, Exit Criteria

> Status: Baseline v1.0. Task-level breakdown: [`../tasks/backlog.md`](../tasks/backlog.md). Gates: [`../06-quality/quality-gates.md`](../06-quality/quality-gates.md).
> Ordering principle: **the critical tutor loop first** (SPEC §48: "optimize before adding secondary features"), then breadth.
> Estimates are in *task packets*. Each packet is ~0.5–2 agent-days and produces one PR.

## Phase overview

```text
P0 Planning & Harness ──► P1 Foundation ──► P2 Core teaching loop (MVP) ──► Release 1.0 ──► P3 Phase-2 backlog ──► P4 Future (new decisions)
   M0                        M1, M2             M3 → M4 → M5 → M6 → M7            M8
```

| Milestone | Theme | Outcome (user-visible) | Packets | Depends on |
|---|---|---|---|---|
| **M0** | Planning baseline and harness | Docs system, ADRs, harness, progress.json. *No product code* | 1 | — |
| **M1** | Walking skeleton and delivery pipeline | App boots on the chosen stack with an empty shell. CI, gates, E2E harness and a Podman stack all work | 7 | M0 approved |
| **M2** | Identity and student management | Tutor logs in, adds a student (credentials card), student logs in and sees an empty Home | 7 | M1 |
| **M3** | Schedule, lessons and private notes | Tutor schedules lessons, sees Today; student sees upcoming lessons; private notes | 6 | M2 |
| **M4** | Library and files | Folders, materials (file, rich text, link, embed), lesson templates, sharing with a student | 6 | M2 (M3 for attaching to lessons) |
| **M5** | Assignments v1 and **after-lesson wrap-up** | Tutor wraps up a lesson in one screen and assigns homework (text/file response). Student submits. Tutor grades and publishes feedback | 7 | M3, M4 |
| **M6** | Question bank and assessments | Question types, auto-grading, sections, timed attempts, rubric, anchored comments, review queue | 8 | M5 |
| **M7** | Goals, plans, progress and dashboards v2 | Metrics and goals, learning plans, progress views, attention rules, student Home v2 | 7 | M5 (M6 for result → metric) |
| **M8** | Hardening and **Release 1.0** | Security, accessibility and performance audits, backup/restore drill, deployment, UAT, v1.0.0 on `master` | 6 | M7 |

## Exit criteria per milestone

**M0 (planning):** all documents in `docs/README.md` exist and link correctly. `progress.json` validates against its schema.
The PO has approved the baseline, and each OQ is either answered or its recommended default is accepted.

**M1 (skeleton):** `scripts/gate.sh` runs green locally and in CI. The backend is generated with the Spring Boot CLI and passes
Spring Modulith `verify()` over the placeholder modules. Flyway V1 applies to PostgreSQL in Podman. The SPA is served
same-origin by the backend jar. Playwright runs one smoke test at 3 viewports, with axe. The OpenAPI drift check works.
Testcontainers runs on rootless Podman (or the documented fallback). The docs describe how to reproduce every command.

**M2 (identity & students):** FR-AUTH-01..10 and FR-STU-01..07 are accepted. The authorization-matrix and student-isolation test
harnesses exist and fail on any unregistered endpoint. The add-student flow runs as E2E at 360/768/1280 px within its step budget.
The security review of authentication has passed.

**M3 (schedule):** FR-LES-02..05, 07, 08 and FR-NOTE-01..03 are accepted. Today v1 shows the schedule. A student sees only their own lessons.
The isolation tests cover lessons and notes. Notes never appear in any student response (automated scan).

**M4 (library):** FR-LIB-01..06, FR-FILE-01..04 and FR-LES-01 are accepted. File access tests pass (another student's file returns 404;
an unshared material returns 404). Rich-text sanitization and embed allow-list tests pass.

**M5 (assignments v1 + wrap-up):** FR-ACT-01, 04..07 (assignment kind, without questions), FR-ATT-01..03 (text/file), FR-GRD-03, 06 and
FR-LES-06 are accepted. **The wrap-up E2E completes in ≤ 7 steps at all 3 viewports.** First tutor UAT session (A-019).

**M6 (questions & assessments):** FR-QB-01..05, FR-ACT-02..03, FR-ATT-02..07, FR-GRD-01..05 and FR-EXT-01..03 are accepted.
Table-driven grading tests exist for every question type. Timer and auto-submit tests pass. The mutation score on the grading package is ≥ 70% (PIT).

**M7 (goals, plans, progress):** FR-GOAL-01..05, FR-PLAN-01..06, FR-PROG-01..04 and FR-DASH-01..03 are accepted. Plan reordering is keyboard-accessible.
Progress numbers are verified against fixture calculations.

**M8 (release):** the release gate passes (`quality-gates.md` §G6): full regression, security checklist, WCAG 2.2 AA audit on the
critical flows, performance budgets, a backup → restore drill on a fresh host, a production deployment, and PO UAT sign-off. Then
`develop → master` with tag `v1.0.0`.

## Phase 2 intake (after Release 1.0)

Candidates come from `scope.md` §2. The PO ranks them using UAT and usage feedback. Each candidate needs a decision entry before it becomes a packet.
Recommended first slice, subject to OQ-04 and OQ-13: plan templates → recurring lessons → matching/ordering question types → in-app notifications.

## Replanning rule

After each milestone the Lead Coordinator runs a short retrospective (`docs/09-harness/hoh-operating-model.md` §5) and updates this
roadmap, the backlog and the risk register. Scope changes need a DEC entry and PO approval.
