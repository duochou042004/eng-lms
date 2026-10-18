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

Implemented in T-M2.11 (DEC-112): the tutor shell (`app/shells/TutorShell.tsx`) takes its items from one list (label key, icon, route) and lists
only routes that exist (no dead items): **Today** and **Students** (T-M2.5: icon `Users`, `/tutor/students`, current on every students page);
Settings (T-M2.6) and the rest add a row with their task. At ≥ 1024 px
(`lg`) a persistent sidebar (`NavList`) under a top bar with the workspace name (the home link) and the account menu button top right; below
1024 px the top bar has a menu button that opens the navigation drawer (a start-edge `Sheet`) with the items and, in its footer, the account
section. The account section (`AccountSection`: who is signed in, the language switcher, "Change password", "Log out" in the same visual kind) is
one component for the account popover, the drawer footer and the student's More sheet. The command palette and "+ New" arrive with their first
targets. Unknown paths under `/tutor/…` show the 404 inside the shell.

## 2. Student workspace (tutor view): `/tutor/students/:studentId/*`

```text
Header: Name · status · next lesson (Join) · [Schedule lesson] [Assign work] [Add note] · contact links
Tabs:   Overview | Plan | Lessons | Work | Materials | Progress | Notes | Profile
        (a tab appears when its module ships; no dead tabs; the Overview answers "what does this student need?")
```

| Tab | Route suffix | Content | M |
|---|---|---|---|
| Overview | (index) | Attention reasons, goals summary, current plan phase, last lesson summary + private note, open work, recent results (until a second tab ships, the index shows the Profile view, DEC-120 (8)) | M3→M7 |
| Plan | `/plan` | Plans (phases and items, reorderable) | M7 |
| Lessons | `/lessons` | History timeline + upcoming | M3 |
| Work | `/work` | Student activities grouped by status; assign | M5 |
| Materials | `/materials` | Shared and attached materials; share more | M4 |
| Progress | `/progress` | FR-PROG-01 | M7 |
| Notes | `/notes` | Private notes timeline | M3 |
| Profile | `/profile` | Personal info, contacts, guardians, learning profile, account (reset password, status) | M2 |

**Implemented (T-M2.5, DEC-120 (3), (8)):** `/tutor/students/:studentId` shows the header (name `h1`, status, `@username`, the contact quick
links that pass `contactHref`) and the **Profile view at the index** (personal information, contacts, note; read-only), with **no tab bar**
while Profile is the only content, no quick actions and no next lesson. When a second tab ships (M3), the Profile moves to `/profile` and the
index becomes the Overview, whose first content arrives with M3. A malformed or unknown `:studentId` shows the feature's own not-found view
inside the shell. Editing, status and reset password: T-M2.14; guardians and the learning profile: T-M2.15 (DEC-124).

## 3. Student navigation (mobile-first)

| Item | Route | Content |
|---|---|---|
| **Home** | `/student/home` | Goals, To do, Next lesson, Recent results |
| **Work** | `/student/work` | To do / Submitted / Done; opens `/student/work/:id` → attempt `/student/attempts/:id` → result `/student/attempts/:id/result` |
| **Lessons** | `/student/lessons` | Upcoming + history; detail `/student/lessons/:id` |
| **Plan** | `/student/plan` | Visible plans (M7) |
| **More** | sheet | Materials `/student/materials`, Progress `/student/progress` (M7), Account `/student/account`, Log out |

At < 768 px: a bottom tab bar (Home, Work, Lessons, Plan, More), with labels always visible. At ≥ 768 px: a top bar with the same items (More is expanded inline).

Implemented in T-M2.11 (DEC-112): the student shell lists only routes that exist (**Home** for now, plus More). Below 768 px the bottom tabs
(`BottomTabs`: Home, More; safe-area padding; the page is padded so nothing sits behind them) and **More** opens a bottom `Sheet` with the account
section (language, Change password, Log out; Account `/student/account` joins with T-M2.7). At ≥ 768 px "More expanded inline" means: the items
in the top bar, and More's account items in the **account menu** (the button with the user's name, top right), as for the tutor at ≥ 1024 px.
Unknown paths under `/student/…` show the 404 inside the shell.
**During an attempt** the navigation is hidden: a focused header shows the title, timer, save status and Exit (autosaved).

## 4. Public routes

`/login` · `/change-password` (forced, or from account) · `/` → redirect by role · `*` → 404 page (with a link home) · `/forbidden` (403).

Implemented in T-M2.4: `/` has no page (the M1 landing page is gone): it redirects a `TUTOR` to `/tutor/today`, a `STUDENT` to `/student/home`, a
session that must change its password to `/change-password` and an anonymous visitor to `/login`. `/login`, `/change-password` and `/forbidden`
share the public frame (a toolbar with the workspace name and the language switcher, then one 400 px column; the workspace name since
T-M2.11, with a full-text tooltip). At ≥ 768 px (`md`) the toolbar is one row (the name at the start, truncated to one line; the switcher at the end);
below 768 px it is two fixed rows in every state (AC11 (a), (j), DEC-114): a full-width name row, two lines tall (the name or the compact error
wraps to at most two lines; the loading skeleton sits in the same box, so the `h1` never moves), then the end-aligned switcher row. "Change password" and "Log out" are in the shells' account
section (T-M2.11). The top-level `*` 404 is for paths outside the shells; `/tutor/*` and `/student/*` unknown paths render the 404 inside their
shell, after the role guard.

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
