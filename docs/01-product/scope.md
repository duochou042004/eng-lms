# Scope — MVP, Phase 2, Future, Never

> Status: Baseline v1.0 · Sources: SPEC §5, §42–§45, §53, §58, §60.I · Every row traces to a SPEC section or a decision.
> Every row is marked with one of these tags: **MVP** · **P2** (Phase 2) · **FUTURE** (Phase 3+, needs a new product decision) · **NEVER** (non-goal) ·
> **OPTIONAL / REQUIRES PRODUCT DECISION** (not in the core until a Product Owner decision; see `docs/10-governance/open-questions.md`).

## 1. MVP (SPEC §42, as reconciled in `spec-reconciliation.md`)

| Capability | Notes | Trace |
|---|---|---|
| Authentication: login, logout, change password, forced first-login change, tutor-driven password reset | No public registration. No email. | SPEC §4, DEC-008 |
| Student management: create with account, edit, contacts, guardian info, status (active/paused/archived) | Credentials card to paste into Zalo | SPEC §4.2, §5.6, §8 |
| Student workspace (tutor view) | Sections light up progressively | SPEC §6, §7 |
| Learning profile (level, strengths, weaknesses, notes, custom fields) | Tutor-only by default (A-008) | SPEC §8 |
| Goals and metrics (tutor-defined metric definitions, observations) | Generic; no hard-coded TOEIC/IELTS fields | SPEC §8, §9, §25, DEC-015/ADR-0015 |
| Learning plans (plan → phases → items), with reorder, move, pause, complete and priority | No templates in MVP (OQ-04) | SPEC §10 |
| Library: folders, materials (file, rich text, link, allow-listed embed), tags, search | Not a Drive clone | SPEC §12, §13, §38 |
| Files: upload, view, download, with access control | Local storage behind a port | SPEC §38, ADR-0010 |
| Lesson templates (Lesson Builder) | Reusable lesson content | SPEC §14, §31, §32 |
| Lessons (sessions): schedule, reschedule, cancel, absent, complete, meeting link, attendance | Agenda and week list; no booking | SPEC §22, §23, DEC-017, DEC-023 |
| **After-lesson wrap-up** (one screen, one save) | Critical flow, ≤ 7 steps | SPEC §28, §48, DEC-013 |
| Private teacher notes linked to student, lesson or activity | Never visible to students | SPEC §24, §37 |
| Question bank: CRUD, duplicate, archive, search, filter, tags, preview | MVP type set (below) | SPEC §16 |
| Activity engine: assignments and assessments (sections, time limit, points, pass mark, attempts) | One engine, two presentations | SPEC §17, §18, ADR-0007 |
| Assign to student(s) with a frozen snapshot | Content ≠ activity | SPEC §15, §32, ADR-0008 |
| Student attempts: autosave, timer, submit, file and audio responses | Server-authoritative timer | SPEC §19, §29 |
| Grading: auto and manual, rubric scores, anchored comments, draft/publish feedback | No advanced annotation UI | SPEC §19, §20, DEC-018 |
| Progress: per student (tutor and student views) and a cross-student overview | Data-driven, not "course %" | SPEC §25 |
| Tutor "Today" dashboard and student Home | Action-first; few charts | SPEC §26, §27 |
| Settings: workspace, account, metrics, extension catalog, security log, storage usage | | SPEC §41, plugin-store-spec |

**MVP question types (A-010, OQ-05):** single choice, multiple choice, true/false, fill in the blank, short answer, long answer,
file upload, audio response. *Matching and ordering → P2.*

## 2. Phase 2 (SPEC §43; order decided after MVP feedback)

| Capability | Trace |
|---|---|
| Learning plan templates (create a plan from a template, save a plan as a template) | SPEC §11, §43; OQ-04 may pull a minimal version into Release 1.1 |
| Recurring lessons; advanced calendar (month grid interactions, drag to reschedule) | SPEC §43 |
| More question types: matching, ordering (then others by demand) | SPEC §17, §43 |
| In-app notification system (new assignment, upcoming lesson, deadline, feedback, result) | SPEC §39, §43, DEC-006 |
| Vocabulary tools (items, sets, assign to student, word status) | SPEC §21, §43, DEC-007 |
| Better file management (bulk operations, replace a file version) | SPEC §43 |
| Advanced progress analytics and more powerful reporting | SPEC §43 |
| Content versioning (user-visible history of edits) | SPEC §32, §43 (activity snapshots are already MVP, ADR-0008) |
| Regrade after an answer-key fix in a student snapshot | DEC-018 note |
| Reusable rubric library | DEC-018 note |
| Email channel for notifications and password reset | SPEC §4.3, §39 |

## 3. Future (SPEC §44; each needs a new explicit product decision)

AI assistant, AI-generated questions, AI writing or speaking analysis · public landing page · external tool integrations ·
payment integrations · parent portal · more sophisticated analytics.

## 4. NEVER (non-goals; SPEC §5, §45, §53)

| Area | Excluded |
|---|---|
| Enrolment | Public sign-up, trial-lesson registration, online admission, lead management, marketing funnel, self-enrolment |
| Payment | Gateway, invoices, subscriptions, recurring billing, tuition collection, payment status, accounting |
| Marketplace / SaaS | Multiple tutors, tutor discovery or listing, multiple centres or branches, organisations, staff accounts, complex roles |
| Communication | In-app chat, messenger, voice or video calls, whiteboard, conferencing, recording servers (only a **meeting URL** is stored) |
| Content | Pre-built TOEIC/IELTS/THPT content, a built-in dictionary, a mandatory curriculum, hard-coded exam engines or enums |
| Booking | Student self-booking or availability slots |

## 5. OPTIONAL / REQUIRES PRODUCT DECISION

| Proposal | Why it is proposed | Tracked |
|---|---|---|
| Permanent student deletion and data export (JSON/CSV zip) | Privacy law and data portability; minors' data | OQ-07 |
| Students may check off self-study plan items | SPEC §37 hints "if permitted" | OQ-12 |
| "Duplicate lesson to next week" quick action | Few clicks (SPEC §40.2) without full recurrence | OQ-13 |
| Minimal plan templates in MVP | SPEC §49 flow mentions "choose template" | OQ-04 |
| Dark theme | Tokens make it cheap; not requested | OQ-14 |

## 6. Scope guardrail procedure (SPEC §58)

Before any feature is added to a task packet, the Lead Coordinator answers these questions in the packet's **Guardrail** section:

1. Which SPEC section or decision ID requires it? (No trace means it cannot be added.)
2. Does it move the product towards a centre LMS, a marketplace, booking, payments, a social platform, AI, conferencing or an enterprise school system? If it does, **stop** and log an open question.
3. Does it add mandatory setup for the tutor? If it does, redesign it as optional or progressive.
4. Would the tutor use it every week? If not, defer it to P2 or later.
5. Does it hard-code English or exam semantics? If it does, redesign it as data.

A reviewer (QA or Security) who finds untraced scope files a finding of type `SCOPE`. It blocks the merge.
