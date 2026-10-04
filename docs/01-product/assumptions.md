# Assumptions

> An assumption is something we act on **without confirmation**. Each one has an owner and a way to validate it. If it turns out to be wrong,
> log a decision (DEC) and update the affected docs. Assumptions linked to an open question (OQ) close when the Product Owner answers.

| ID | Assumption | Basis | Impact if wrong | Validate by | Linked |
|---|---|---|---|---|---|
| A-001 | One deployment serves exactly one tutor, with ≤ 200 student accounts, ≤ 60 active, ≤ 30 concurrent users, ≤ 100 GB of files | SPEC §3, §54 ("not enterprise scale") | Capacity sizing and indexes | PO confirmation; usage metrics after launch | ADR-0006 |
| A-002 | Tutor and most students are in Vietnam. Default time zone `Asia/Ho_Chi_Minh`; dates `dd/MM/yyyy`, 24-hour time. Each user can change their own time zone | SPEC examples (25/09/2026, 19:00) | Display formatting only (data is stored in UTC) | PO | NFR-I18N-02 |
| A-003 | Students mostly use **phones**. The tutor mostly uses a laptop, but must be able to do the after-lesson wrap-up on a phone or tablet | Zalo/Facebook-centric context (SPEC §1) | Layout priorities | UAT at M5 | NFR-RESP |
| A-004 | Enrolment, payment and communication stay outside the system. Only contact handles are stored | SPEC §1, §5 | — | — | scope.md §4 |
| A-005 | Guardian (parent) info is stored on the student profile, with 0..n guardians and no accounts | SPEC §4.2, §5.6 | — | — | FR-STU-03 |
| A-006 | The tutor sends credentials to the student manually (Zalo etc.). The system shows a copyable credentials card once | SPEC §4.2 | — | UAT | FR-STU-01 |
| A-007 | No outbound email or SMS in the MVP | SPEC §4.3, §39 | Password recovery depends on the tutor | PO | DEC-008 |
| A-008 | The learning profile (level, strengths, weaknesses, learning notes, custom fields) is **tutor-only**. Goals are student-visible by default (with a per-goal toggle) | SPEC §26 (student sees goals), §37 | Leak or omission of info | PO | OQ-06 |
| A-009 | Students have **read-only** access to learning plans. Items linked to activities reflect activity status | SPEC §37 | Student UX | PO | OQ-12 |
| A-010 | MVP question types: single choice, multiple choice, true/false, fill in the blank, short answer, long answer, file upload, audio response. Matching and ordering in P2 | SPEC §17 ("có thể hỗ trợ"), §43 ("More question types") | Builder scope | PO | OQ-05 |
| A-011 | Video is mostly shared as links or embeds. Upload limits (configurable): tutor 200 MB per file, student 50 MB per file, total storage warning at 80 GB | SPEC §38 ("not a Drive clone") | Storage and bandwidth | PO; hosting choice | OQ-09 |
| A-012 | Code, identifiers and message keys are in English. The UI ships in **Vietnamese and English** (i18n from M1), defaulting to Vietnamese | Bilingual SPEC; Vietnamese users | Translation effort | PO | OQ-02 |
| A-013 | Production is one small internet-reachable host (VPS: 2 vCPU / 4 GB / 80 GB+) with HTTPS on a tutor-owned domain | SPEC §35 ("easy to deploy") | Deployment design | PO | OQ-03 |
| A-014 | Supported browsers: the last 2 major versions of Chrome, Edge, Firefox and Safari, including iOS Safari and Android Chrome | Modern-web default | Polyfills | Analytics after launch | NFR-COMPAT-01 |
| A-015 | Audio responses are recorded with the browser MediaRecorder API and stored as produced (webm/opus or mp4/aac). No transcoding | SPEC §17 "Audio Response" | Playback compatibility on Safari | M6 spike | FR-ATT-03 |
| A-016 | "Plugin store" means an **internal, build-time extension registry and catalog**, not a public marketplace and not runtime code download | Goal directive + SPEC §5.3 (no marketplace) | Spec rewrite | PO | OQ-08 |
| A-017 | Timed assessments work on an honour system: no proctoring or anti-cheat. The server enforces the time limit | SPEC §18 (no proctoring mentioned) | Integrity expectations | PO | FR-ATT-04 |
| A-018 | Multiple concurrent sessions per user are allowed. Disabling a user or resetting a password ends all of that user's sessions | Common practice | — | — | NFR-SEC-04 |
| A-019 | Adoption success proxy: wrap-up ≤ 60 s and add-student ≤ 90 s for the real tutor in UAT | SPEC §28, §40.2, §48, §61 | Success criteria | UAT at M5 and M8 | product-brief §6 |
| A-020 | The tutor accepts a single-host backup strategy (nightly database dump + file snapshot, 14 daily / 8 weekly kept, one off-site copy): RPO ≤ 24 h, RTO ≤ 4 h | Small single-owner system | Data-loss exposure | PO | OQ-03, NFR-OPS-02 |
| A-021 | Sessions: 12 h idle timeout. Optional "keep me signed in" for 30 days. Tutor-reset temporary passwords, and the operator's tutor reset (runbooks §4; DEC-089 (8), confirmed DEC-091), expire after 7 days if unused | Usability vs. security for students on personal phones | Security posture | PO | OQ-10 |
| A-022 | The product name in the UI is configurable (workspace display name, e.g. "Cô Lan English"). Code name: **Eng-LMS**. Java base package `com.englms` | No name given in the SPEC | Branding only | PO | OQ-11 |
