# DOCS-REVIEW T-M2.14 (packet `docs/tasks/T-M2.14-student-profile-account.md`, PR #107)

Fresh docs-reviewer subagent; recorded by the LC (the reviewer writes no files, posts no PR comments).

## Round 1 (fresh docs-reviewer, `76b9afc`): DOCS-REVIEW T-M2.14: CHANGES REQUESTED

check-docs PASS. Endpoints, OpenAPI schemas, React Aria toast exports, tokens and the S4-5 guard gap (`AddStudentForm.tsx:136`, `guards.ts:127`) confirmed.

| ID | Sev | Issue | Fix (LC, in-task, DEC-088) |
|---|---|---|---|
| D-1 | S2 | Error toasts, a timed action toast and no assertive region contradict interaction-states §4 | Follow §4: success and Undo toasts only; the archive Undo toast persists; every error is an `InlineAlert`; §4 in the Trace and docs (DEC-124 (7)) |
| D-2 | S3 | `ConfirmDialog` lacks a primary variant, pending state and content slot | Scope 9: `confirmVariant`, `isPending` + `pendingLabel` (Esc/Cancel inert), `children` slot; existing tests kept |
| D-3 | S3 | Edit profile wrap at 360 is content-driven | Fixed rule: column below 768 px, row at ≥ 768 px (design notes, AC10) |
| D-4 | S3 | "Never covering the focused row" untestable | Clause removed (see N-2) |
| D-5 | S3 | Undo after leaving the page and Undo 409s undefined | Toast removed on leaving the page; any Undo failure → refetch + `InlineAlert`, never the conflict dialog (scope 5, AC5) |
| D-6 | S3 | Username-only PATCH does not bump `version`: last write wins silently | Known server limit in Risks, excluded from the charter; backlog T-M2.16 (DEC-124 (8)) |
| D-7 | S3 | Card can show a stale username after an edit | Edit profile disabled while the card shows (scope 1, AC6) |
| D-8 | S4 | Scope cross-reference wrong | "scope 5, 6" |
| D-9 | S4 | Status and Added on in edit mode undefined | Status row dropped from Personal information; Added on read-only |
| D-10 | S4 | Second action during a pending one | All Account actions and Edit profile disabled while pending |
| D-11 | S4 | Toast does not name the student; queue survives sign-out | "{name} …"; queue cleared when the tutor shell unmounts |
| D-12 | S4 | Card placement and intro copy | Card replaces the actions until Done; vi/en intro given |
| D-13 | S4 | 404 on status/reset unhandled | Not-found view |
| D-14 | S4 | Size: unlisted `ConfirmDialog` work, shared-parts extraction | Size note; extraction in the split line |
| D-15 | S4 | "> 4 fields" condition meaningless | "as the add form", `USERNAME_TAKEN` focuses Username |

## Round 2 (same reviewer, delta, `31be529`): DOCS-REVIEW T-M2.14: CHANGES REQUESTED

D-1..D-15 fixed. check-docs PASS.

| ID | Sev | Issue | Fix (LC) |
|---|---|---|---|
| N-1 | S3 | Dropping the Status row breaks an existing assertion that AC11 keeps | AC11 names the one exception |
| N-2 | S3 | The persistent toast can hide the focused Reactivate at 360 (SC 2.4.11) | `--toast-stack-size` + end padding / scroll padding; AC9 no-overlap check |
| N-3 | S4 | Undo after Reactivate gives a false failure | Later successful actions close the archive toast (scope 5, AC5) |
| N-4 | S4 | Focus after Undo undefined | Back to the pre-region element, else the Account `h2` (scope 5, AC10) |
| N-5 | S4 | Evidence list misses the dialog variants and alert states | Added |

## Round 3 (same reviewer, delta, `4670eee`): DOCS-REVIEW T-M2.14: PASS

N-1..N-5 fixed, no new inconsistency. One S4 (N-6): the shell has no scroll container of its own; reworded by the LC to `padding-block-end` on `main` and `scroll-padding-block-end` on `:root`.
