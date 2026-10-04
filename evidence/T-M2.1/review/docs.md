# DOCS-REVIEW T-M2.1 (packet, PR #49)

Recorded by the LC from the fresh-context docs-reviewer's output (agents cannot write report files).

## Round 1 — head `583f2bb` — CHANGES REQUESTED

Scope: packet `docs/tasks/T-M2.1-identity-core.md`, backlog link, DEC-089, `progress.json`. `./scripts/check-docs.sh` PASS; no broken links; `docs/00-sources` untouched.
Consistent: G0 sections, size + split line, M1 done, OQ-10 default recorded, scope = backlog row and FR-AUTH rows, out-of-scope = T-M2.2/2.3/2.4/2.6, no non-goal drift,
ADR-0005 / runbooks §4 / DEC-036/054/069/070 reflected.

| ID | Sev | Finding | Fix (LC, round 2) |
|---|---|---|---|
| S2-1 | S2 | Synchronous `AuditApi.record` from identity + audit listening to identity events = module cycle (module-boundaries §audit, graph) | Audit records identity's events in a synchronous listener with `REQUIRES_NEW`; identity never calls `AuditApi` (Design notes, DEC-089 (5)) |
| S2-2 | S2 | AC7 used 400 for `VALIDATION_FAILED` (api-conventions: 422); wrong current password unspecified; login 401 while locked overrides the 423 row silently | AC7 → 422, `CURRENT_PASSWORD_INCORRECT` counted toward lockout; 401-while-locked stated with T16 and api-conventions §5 in Docs to update; DEC-089 (6) |
| S3-1 | S3 | 429 code already exists (`RATE_LIMITED` + `Retry-After`) | Named in Design notes and AC4 |
| S3-2 | S3 | Principal name for the session index and `persistent_logins` unspecified | Principal = `userId`; mixed-case login test; DEC-089 (9) |
| S3-3 | S3 | AC9 ambiguous (register vs. anonymous 401, CSRF, "deny" semantics) | L1 matching note; register probe with a valid CSRF token; security.md §4 in Docs to update |
| S3-4 | S3 | `SESSION_EXPIRED` never tested | 401 codes note; AC6 asserts `SESSION_EXPIRED` vs `UNAUTHENTICATED` |
| S3-5 | S3 | Production could disable `Secure` with a warning | Only under a `local` profile; otherwise startup fails (AC2) |
| S3-6 | S3 | Bootstrap failure outcome unspecified | Fail-fast, no secret in the log (AC1) |
| S4-1 | S4 | T18 traced without an AC | AC2: no redirect target, `next` ignored |
| S4-2 | S4 | 7-day expiry for the operator reset extends A-021 untraced | DEC-089 (8); runbooks §4 in Docs to update |
| S4-3 | S4 | CLI context could run bootstrap / scheduled jobs | Design note + AC11 assertion |
| S4-4 | S4 | `scripts/dev-bootstrap` (security.md §10) not mentioned | Docs to update: §10 dev row, development-setup (secret file + `local` profile) |
| S4-5 | S4 | OQ-10 still looks fully open | open-questions annotated; kept in `pendingPO` |
| S4-6 | S4 | DEC-089 names the authz-isolation skill, the packet does not | Test plan names it |
| S4-7 | S4 (advisory) | `/meta` 403 under the must-change gate breaks the T-M2.4 shell | `/meta` passes the gate; FR-AUTH-06 AC amended; DEC-089 (7) |
| S4-8 | S4 (advisory) | Size at the limit; split AC11 now | Kept as a fallback split (the PO's M2 instruction keeps FR-AUTH-09 in T-M2.1) |

Verdict line: `DOCS-REVIEW T-M2.1: CHANGES REQUESTED`

## Round 2 — head `2c9bf5e` — PASS

All 15 round-1 fixes verified (S4-7 completed by updating security.md §3 in round 3; S4-8 kept as the fallback split per the PO). New, non-blocking:

| ID | Sev | Finding | Fix (LC, in-task per DEC-088) |
|---|---|---|---|
| R2 S3-1 | S3 | security.md §3 gate wording contradicts amended FR-AUTH-06 | security.md §3 updated in this PR |
| R2 S3-2 | S3 | Unmapped namespace paths, STUDENT test users and filter precedence unspecified | Design note: filter order, test fixture users |
| R2 S3-3 | S3 | security.md T18 vs. "no redirect target" | Docs to update (§2 T18); `?next=` allow-list added to the T-M2.4 backlog row |
| R2 S3-4 | S3 | Anonymous `/auth/password` and `/auth/logout` outcomes | 401 and 204 (idempotent) in the design note |
| R2 S4-1 | S4 | Two event lists disagree | One list in `identity.events` |
| R2 S4-2 | S4 | `RATE_LIMITED` missing from codes to add | Added to scope item 3 |
| R2 S4-3 | S4 | Password field codes unnamed | Named in scope item 3 |
| R2 S4-4 | S4 | Operator reset audit action unnamed | `PASSWORD_RESET_BY_OPERATOR` |
| R2 S4-5 | S4 | A-021 / T12 not updated | Docs to update; DEC-089 (10) asks the PO to confirm (6)–(8) with the start signal |
| R2 S4-6 | S4 | Lock reached via `/auth/password` during a live session | Ends all sessions and tokens (AC7) |

Verdict line: `DOCS-REVIEW T-M2.1: PASS`

## Round 3 — delta `2c9bf5e..6f4fdf4` — PASS

All 10 round-2 findings verified fixed; consistency with security.md, api-conventions §5, api-catalog, module-boundaries, FR-AUTH-05/06/09 and DEC-089 confirmed.
New, non-blocking (fixed in-task, DEC-088 rule):

| ID | Sev | Finding | Fix |
|---|---|---|---|
| D3-1 | S4 | AC8 "a tutor path and a student path" vs. L1-before-gate; must-change user on an unmapped path undefined | AC8 tests each role on its own namespace; design note: 403 `PASSWORD_CHANGE_REQUIRED` on unmapped paths and `register` |
| D4-1 | S4 | One `PasswordReset` event for two audit actions | The event carries the actor kind; audit maps it |
| D4-2 | S4 | api-conventions §5 entry lists only one of six field codes | All six + `RATE_LIMITED` listed |

Verdict line: `DOCS-REVIEW T-M2.1: PASS`

## Round 4 — delta `6f4fdf4..2057520` — PASS (merged as `bb6fbd5`)

D3-1, D4-1 and D4-2 verified fixed and consistent with AC8/AC9, security.md §8 and api-conventions §5; `check-docs.sh` PASS.

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| D5-1 | S4 | Packet L1 bullet (line 93) makes unmapped `/api/**` paths an L1 "deny" (404 for a signed-in caller) while the filter-order note says the gate runs before handler lookup; if L1 is built as `denyAll` + 404, a must-change user would get 404, contradicting AC8 | Folded into the packet by the LC when it is set to `ready` (L1 "deny" only requires authentication; the 404 comes from handler lookup after the gate), DEC-090 |

Verdict line: `DOCS-REVIEW T-M2.1: PASS`
