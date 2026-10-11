# Information Architecture

> Trace: SPEC §41 (adjustable), §40, §55, §56; DEC-010, DEC-011. Principle: **navigation mirrors the tutor's tasks, not the database.**
> Every screen must answer one of the 8 daily questions (product-brief §2) or support a critical flow (ux-flows.md).

## 1. Tutor navigation (MVP)

| Nav item | Route | Answers or does | Replaces SPEC §41 item |
|---|---|---|---|
| **Today** | `/tutor/today` | Who am I teaching today? What needs attention? What is pending? | Dashboard |
| **Students** | `/tutor/students` | Find a student and open their workspace | Students (+ Learning Plans and Progress per student) |
| **Schedule** | `/tutor/schedule` | Week agenda, month overview, schedule a lesson | Lessons / Calendar |
| **Review** | `/tutor/review` | Grade and publish submissions (badge = count) | (new; from SPEC §27 "Pending submissions") |
| **Library** | `/tutor/library/*` | Materials · Lesson templates · Questions · Assignments · Assessments | Content, Question Bank, Assignments, Assessments |
| **Progress** | `/tutor/progress` | Overview across students | Progress |
| **Settings** | `/tutor/settings/*` | Workspace, account, metrics, question types, security log, storage | Settings |

Rationale: this is 7 items instead of 10. Everything reusable sits under **Library** (SPEC §56 groups it as CONTENT), and all per-student
work sits in the **Student workspace** (SPEC §6). A top-level "Learning Plans" item returns in P2 if templates need a home (OQ-04).

**Global elements:** a quick-find command palette (`Ctrl/⌘+K`: students, lessons, library items) and a "+ New" menu (Student, Lesson,
Assignment, Assessment, Material, Question). The account menu (language, password, logout) sits top right on desktop and in the drawer footer on mobile.

## 2. Student workspace (tutor view): `/tutor/students/:studentId/*`

```text
Header: Name · status · next lesson (Join) · [Schedule lesson] [Assign work] [Add note] · contact links
Tabs:   Overview | Plan | Lessons | Work | Materials | Progress | Notes | Profile
        (a tab appears when its module ships; no dead tabs; the Overview answers "what does this student need?")
```

| Tab | Route suffix | Content | M |
|---|---|---|---|
| Overview | (index) | Attention reasons, goals summary, current plan phase, last lesson summary + private note, open work, recent results | M2→M7 |
| Plan | `/plan` | Plans (phases and items, reorderable) | M7 |
| Lessons | `/lessons` | History timeline + upcoming | M3 |
| Work | `/work` | Student activities grouped by status; assign | M5 |
| Materials | `/materials` | Shared and attached materials; share more | M4 |
| Progress | `/progress` | FR-PROG-01 | M7 |
| Notes | `/notes` | Private notes timeline | M3 |
| Profile | `/profile` | Personal info, contacts, guardians, learning profile, account (reset password, status) | M2 |

## 3. Student navigation (mobile-first)

| Item | Route | Content |
|---|---|---|
| **Home** | `/student/home` | Goals, To do, Next lesson, Recent results |
| **Work** | `/student/work` | To do / Submitted / Done; opens `/student/work/:id` → attempt `/student/attempts/:id` → result `/student/attempts/:id/result` |
| **Lessons** | `/student/lessons` | Upcoming + history; detail `/student/lessons/:id` |
| **Plan** | `/student/plan` | Visible plans (M7) |
| **More** | sheet | Materials `/student/materials`, Progress `/student/progress` (M7), Account `/student/account`, Log out |

At < 768 px: a bottom tab bar (Home, Work, Lessons, Plan, More), with labels always visible. At ≥ 768 px: a top bar with the same items (More is expanded inline).
**During an attempt** the navigation is hidden: a focused header shows the title, timer, save status and Exit (autosaved).

## 4. Public routes

`/login` · `/change-password` (forced, or from account) · `/` → redirect by role · `*` → 404 page (with a link home) · `/forbidden` (403).

Implemented in T-M2.4: `/` has no page (the M1 landing page is gone): it redirects a `TUTOR` to `/tutor/today`, a `STUDENT` to `/student/home`, a
session that must change its password to `/change-password` and an anonymous visitor to `/login`. `/login`, `/change-password` and `/forbidden`
share the public frame (the language switcher in a toolbar row, one 400 px column). Until T-M2.11 the "Change password" link and "Log out" sit in
the placeholder shell header, before the language switcher.

## 5. Full route inventory

```text
/tutor/today
/tutor/students                     /tutor/students/new
/tutor/students/:sid                /tutor/students/:sid/{plan|lessons|work|materials|progress|notes|profile}
/tutor/schedule?view=week|month&date=YYYY-MM-DD&student=:sid
/tutor/lessons/new?student=:sid     /tutor/lessons/:lid     /tutor/lessons/:lid/wrap-up
/tutor/review                       /tutor/review/:attemptId
/tutor/library                      → redirect /tutor/library/materials
/tutor/library/materials?folder=&q=&kind=&tag=      /tutor/library/materials/:mid
/tutor/library/lesson-templates     /tutor/library/lesson-templates/:ltid
/tutor/library/questions?q=&type=&tag=&difficulty=  /tutor/library/questions/new?type=  /tutor/library/questions/:qid
/tutor/library/assignments          /tutor/library/assignments/new   /tutor/library/assignments/:aid
/tutor/library/assessments          /tutor/library/assessments/new   /tutor/library/assessments/:aid
/tutor/progress
/tutor/settings/{workspace|account|metrics|question-types|security|storage}
/student/home  /student/work  /student/work/:saId  /student/attempts/:atId  /student/attempts/:atId/result
/student/lessons  /student/lessons/:lid  /student/plan  /student/materials  /student/materials/:mid  /student/progress  /student/account
```

URL rules: filters, tabs and views live in the URL (shareable, and Back works). IDs appear in the path, never in query strings, and never with personal data.

## 6. Page anatomy (all pages)

```text
┌ App shell (nav) ──────────────────────────────────────────────────────────────┐
│ PageHeader: [breadcrumb (≤2 levels)]  H1 title   context line   [primary action] [⋯ secondary]
│ (optional) Tabs / FilterBar
│ Content: one primary column (max 1200 px); an optional secondary column ≥ 1280 px only
└───────────────────────────────────────────────────────────────────────────────┘
```

Exactly **one** primary action per page. Destructive actions sit in the `⋯` menu or at the end of forms, never next to the primary action.
