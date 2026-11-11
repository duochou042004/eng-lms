# Evidence — T-M2.22 QA and delivery strategy review
- Branch: `docs/T-M2.22-qa-strategy-review` · PR: #155 · Date (UTC): 2026-11-11

## Acceptance criteria → proof
| AC | Proof | Status |
|---|---|---|
| AC1 | [baseline.md](baseline.md) §2 (CI split, 120 runs per workflow), §3 (failures), §4 (gate steps), §5 (reviews), §2 and §6 (duplicates, per task), §9 (not measured) | done |
| AC2 | baseline.md §1 (10 claims, all hold on `d5908fa`) | done |
| AC3 | packet "The answer" and "What is sound and must stay" | done |
| AC4 | packet "What is promised but missing" (5 rows) | done |
| AC5 | packet U1..U10 and "PO decisions requested" (PO-1..PO-10); U7 is an experiment | done |
| AC6 | `git diff --stat origin/develop...HEAD` | see the PR |
| AC7 | `./scripts/check-docs.sh`, `./scripts/check-path-ownership.sh`, CI, `review/docs.md` | see the PR |

## Commands run (copy-pasteable, in order)
The packet's Commands block. The analysis grouped `gh run view --json jobs` output by head branch kind and step name with a throwaway
script in the session scratchpad (not committed); every table in baseline.md names its source command.

## Results
See baseline.md. No test, gate or build ran: the PR changes text only.

## Deviations & known limitations
- Job and step data were analysed for `e2e-smoke`, `backend` and `web`; the other four workflows use run-level durations from `gh run list`.
- Billing, the 31 skips, per-viewport behaviour and the late-error share are not measured (baseline.md §9).

## Reviews
- DOCS-REVIEW: see `review/docs.md` (G0, DEC-157). Merged as PR #155 (`c93d128`, CI 7/7 on `ccfebbf`); the PO accepted PO-1..PO-10 (DEC-158).

## G3 cost (one row per round; DEC-131 (9))
| Round | Reviewer | Head | Verdict | Findings | Full/delta | Tokens | Minutes | Gate runs |
|---|---|---|---|---|---|---|---|---|
| G0 round 1 | docs-reviewer (fresh, adversarial brief) | `ae91d7b` | CHANGES REQUESTED | S2 D-1..D-4; S3 D-5..D-14; S4 D-15, D-16; attacks A-1..A-12 (all fixed) | full | 141,204 | 7.9 | 0 |
| G0 round 2 | docs-reviewer (resumed) | `d106600` | PASS WITH MINOR | D-1..D-16 closed; S3 N-1..N-3, S4 N-4..N-6 (all fixed) | delta | 39,511 | 2.5 | 0 |
| **Total** | 1 review agent | | | | | 180,715 | 10.4 | 0 |
