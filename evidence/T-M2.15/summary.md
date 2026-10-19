# T-M2.15 evidence summary: guardians

Packet `docs/tasks/T-M2.15-guardians.md` (G0: PR #111, `eeee2bd`; start DEC-129). Implementer: frontend-implementer; recorded by the LC (the
harness blocked the agent's write of this file).

## Commits
`487274f` feat (guardians section, guardian form, add-form rows, session check) · `8e4ef85` unit and component tests, AC8 · `16a973a` E2E ·
`7128127` docs (IA §2, interaction-states §2.8/§2.9, ux-flows F11 and F2, security.md T19, backlog) · `8f33041` evidence.

## Gate (G1)
Two runs back to back on the same dev DB, both on `7128127` (later commits only add evidence and state):
`gate-20261019T023810Z.log` (PASS, 694 s), `gate-20261019T024949Z.log` (PASS, 692 s). Web 701 tests in 62 files (67 new); E2E 380 passed /
31 skipped (36 new: 12 tests × phone-small, tablet, laptop). Bundle: student 186.6 KB gz (≤ 200), tutor 186.8 KB gz (≤ 300); no students code
in either first-visit closure. `api/openapi.json` unchanged.

## Acceptance criteria
| AC | Status | Proof |
|---|---|---|
| AC1 | pass | `StudentGuardians.test.tsx` "the section (AC1)" (order, links, line breaks, Not added, 0/10, loading region, error + Retry, 404); E2E |
| AC2 | pass | component "add (AC2)"; E2E F11; E2E two pages for `TOO_MANY` |
| AC3 | pass | component "edit (AC3)" (changed fields only, `null` clears, whitespace-only sends nothing, limits, 422, 500, network, double click); E2E |
| AC4 | pass | component; E2E two pages (409 + Copy my notes, Cancel, Reload; 404 removed-elsewhere alert focused, cleared on the next action) |
| AC5 | pass | component "remove (AC5)" (Cancel, confirm, pending not dismissible, 5xx, 404 refetch); E2E (5xx by route intercept) |
| AC6 | pass | component "one form at a time (AC6)" (locks, hints, status/reset card do not lock guardian triggers, guard cases as T-M2.14 AC8); E2E |
| AC7 | pass | `AddStudentPage.test.tsx` "guardians (T-M2.15 AC7)" (10 rows, focus first/middle/last, empty rows dropped, name error opens the section, 422 index mapping, `TOO_MANY`); E2E; F2 ≤ 6 unchanged |
| AC8 | pass | `StudentWriteSession.test.tsx` (10 cases; all fail with the check disabled), `tutorSession.test.ts` |
| AC9 | pass | axe 360/768/1280 vi+en; layout checks; keyboard-only add/edit/remove (`keyboard-guardians.json`); F11 = 3 steps (`steps-f11.json`) |
| AC10 | pass | both gates; existing assertions kept; `ConflictDialog` copy label as a prop (`copy={{text, label}}`); OpenAPI unchanged |
| AC11 | pass | `1a9d606`. (a) `StudentGuardians.test.tsx` "error: the alert with Retry inside the section, no Add guardian; Retry loads; the rest of the page works" (the `h2` has focus after Try again; fails without the fix); (b) "a stale save opens the conflict dialog: Copy my notes, Cancel keeps the input, Reload shows the other tab and closes" (guardian text, no "Học viên này") + `StudentProfileEdit.test.tsx` "a stale save opens "This was changed elsewhere"…" (student text kept); `ConflictDialog` `description` prop; (c) `.guardians` uncapped (CSS); gate `gate-20261019T082248Z.log` on `1a9d606` (PASS, 635 s; web 701 tests, E2E 380 passed / 31 skipped; contract-drift skipped, web-only) |

## Frontend-standards self-check (AC11 round)
- [x] The packet's **UI rules** block is met; AC11 (c) supersedes the layout rule's `--size-reading-max` cap (packet line 103, LC-owned, not edited).
- [x] Long data at 360/768/1280: unchanged wrapping rules; removing the cap only widens the section to the Profile column.
- [x] Focus never lands on `body` after an action that removes or disables the focused element (AC11 (a): Try again → Guardians `h2`).
- [x] vi buttons carry the verb; heading levels never invert; no new buttons or counters.
- [x] Docs named in the packet are in sync (no doc change needed for AC11).

## Screenshots (`impl/<phone-small|tablet|laptop>/`, fictitious data: invented names, example.com, +1 555 01xx)
guardians-empty, -two, -ten (vi, en); guardian-add-form-vi; guardian-edit-errors (vi, en); guardian-conflict (vi, en); guardian-remove-dialog
(vi, en); guardian-remove-error-vi; guardian-removed-elsewhere (vi, en); add-guardian-rows-error (vi, en). Records: `records/<project>/steps-f11.json`, `keyboard-guardians.json`.

## Deviations
1. `web/src/features/auth/api/session.test.tsx` (T-M2.14 AC12 (j)): the setup now caches a tutor session before the late answer (scope 8 no
   longer stores an answer without one); every assertion unchanged.
2. E2E spec: only the new block was formatted (the existing lines untouched).
3. Add-form guardian rows are focused by position after add/remove (React Aria updates a moved row's ids one render late).

## Open questions (literal / house-style reading taken)
- Add student section title "Guardians (optional)", as "Contact (optional)".
- Messages end with a period, as the existing ones.
- `TOO_LONG` numbers unformatted ("2000"), as the existing note error.
- ~~The conflict dialog description says "this student" on a guardian conflict~~: fixed by AC11 (b).
- vi term "Phụ huynh" (glossary).

## Not covered
Firefox/WebKit (host libraries pending, PO `sudo`); the create-student request is not session-gated (scope 8 lists the store hooks only;
nothing is cached to invalidate after a re-login).

## Reviews (G3 tier H, DEC-131)
- QA+UX (one combined fresh reviewer, qa-protocol §2a): **QA PASS WITH MINOR / UX APPROVED** on `7c3bfb8` (S3 QA-1, UX-1, UX-2; S4 UX-3, UX-4). SEC: **APPROVED** (S4 S-1, S-2).
- The S3 fixed through AC11 (DEC-132) in `1a9d606`, verified by the LC from the tests and the diff (DEC-131 (5): no reviewer round). The S4 → T-M2.20.
- Not verified by eye: the UX-2 column alignment after the fix (CSS diff + green E2E layout checks only).

## G3 cost (DEC-131 (9)) vs T-M2.14
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| 1 | QA+UX combined | 7c3bfb8 | PASS WITH MINOR / APPROVED | 0/0/3/2 | full | 113,942 | 23.5 | 0 | 0 |
| 1 | SEC | 7c3bfb8 | APPROVED | 0/0/0/2 | full diff | 43,088 | 2.0 | 0 | 0 |
| fix | frontend-implementer (AC11) | 1a9d606 | — | — | 3 findings | 51,765 | 23.9 | 1 | 10.6 |
| verify | LC (diff + tests) | 1a9d606 | verified | — | delta | — | — | 0 | 0 |

Agent tokens and minutes are the Agent result's `subagent_tokens` and `duration_ms` (the reviewers' own wall-clock estimates were ≈ 25 and ≈ 7 min).
Total G3: 2 review agents, 1 fix round, 1 gate run (10.6 min). T-M2.14: 8 review rounds (3 QA, 3 UX, 2 SEC) and 6 gate runs after G1 (8 in all, 87 min).
