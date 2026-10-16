# DOCS-REVIEW T-M2.5 (packet `docs/tasks/T-M2.5-students-list-add.md`, PR #93)

Fresh docs-reviewer subagent; recorded by the LC (the reviewer writes no files).

## Round 1 (fresh docs-reviewer, `8629987`): DOCS-REVIEW T-M2.5: CHANGES REQUESTED

check-docs PASS. Live API, `ui/` reuse, E2E helpers and the DEC-100 S4-8 allow-list confirmed. No files written, no PR comments.

| ID | Sev | Issue | Fix (LC, in-task, DEC-088) |
|---|---|---|---|
| D-1 | S3 | "First use" cannot be told from the default list (all-archived workspace → 0 rows) | First use only when a `size=1` count over all statuses is 0; else "No active or paused students" + **Include archived** (scope 3, AC4) |
| D-2 | S3 | Paging under-specified: 0-based API `page`, `page` past the end, control-character `q` → 422 | URL `page` 1-based (→ `page − 1`), past-the-end → last page, control characters stripped from `q` (scope 2, AC2) |
| D-3 | S3 | `features/` cannot import `app/`'s `ShellNotFound` | The feature renders its own not-found view from `ui/` (scope 6, design notes) |
| D-4 | S3 | UI cap of 10 handles vs API/validation-rules 30 | 30 rows, validation-rules limits named (scope 4) |
| D-5 | S3 | Workspace Overview of the original row unowned after the split | DEC-120 (8): Overview arrives with its first content in M3; IA §2 Overview M3→M7 |
| D-6 | S3 | interaction-states §2.5 success toast not recorded as replaced | DEC-120 (7): the credentials card (focused heading) is the success feedback (scope 5, AC7, docs to update) |
| D-7 | S4 | Chunk wording ambiguous; `FORBIDDEN_IN_CLOSURE` checks only `TutorShell.tsx` | One lazy chunk per page from the router; AC1 extends `FORBIDDEN_IN_CLOSURE` to `src/features/students/` |
| D-8 | S4 | `useBlocker` may block sign-out redirects | Guard blocks only paths under `/tutor/`; sign-out/guard redirects pass (scope 4, design notes, AC6, QA focus) |
| D-9 | S4 | Short names get the `student` fallback suggestion | No request below 3 letters/digits; emptying the name clears an untouched username (scope 4, AC5) |
| D-10 | S4 | Refetch progress line missing | Existing `ProgressLine` under the header during a refetch (scope 3, AC4) |
| D-11 | S4 | Profile at index vs IA `/profile` | Route plan stated (scope 6, IA §2) |
| D-12 | S4 | Icon naming mixed | §4 naming + lucide component names (scope 8) |
| D-13 | S4 | 11 ACs at the 2-day limit | Accepted with the split line; cut order named (Risks) |
| D-14 | S4 | Empty-value rendering undefined | "Not added", editing with T-M2.14 (scope 6, AC8) |
| D-15 | S4 | `ready` before PASS; uncommitted `pr`; HANDOFF stale | `pr` committed; HANDOFF updated; `ready` kept per the T-M2.12 precedent (the packet merges only after PASS) |

## Round 2 (same reviewer, delta, `e9f426d`): DOCS-REVIEW T-M2.5: CHANGES REQUESTED

D-1..D-7, D-9..D-14 correct; D-15 accepted. check-docs PASS.

| ID | Sev | Issue | Fix (LC) |
|---|---|---|---|
| N-1 | S3 | The D-8 `useBlocker` rule (`/tutor/` only) lets the home link `/` and "Change password" drop a dirty form | Block every pathname change except `/login` and `/forbidden` (scope 4, design notes, AC6) |
| N-2 | S4 | Include archived + no `q` + empty would fall to filtered-empty | That case is first use directly, no count request (scope 3) |
| N-3 | S4 | IA §2 docs item cites only DEC-120 (3) | Cites (3), (8) |
