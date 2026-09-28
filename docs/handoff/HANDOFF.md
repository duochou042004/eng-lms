# Handoff — 2026-09-28 (T-M1.8 merged `01dfc5d`; T-M1.9 packet in review, PR #19)

Phase/Milestone: P1 / M1 · Current task: **T-M1.9 (ready; packet in DOCS-REVIEW, PO start signal pending)** · Bookkeeping branch: `docs/T-M1.9-packet` (PR #19) · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1..T-M1.8 and T-M1.11 are merged through merge-gate. Required CI checks: docs-check, secrets-scan, backend, web, contract-drift and e2e-smoke (`container` isn't required).
- **T-M1.8 (`01dfc5d`, PR #17; DEC-068..071):**
  - :8081 carries request IDs; its security headers stay off (DEC-050).
  - Requests Tomcat rejects on :8080 get Problem Details with the headers (`ProblemDetailsErrorReportValve`).
  - `examtype`/`part5` are forbidden in `src/main`.
  - Local tests no longer stall 30 s at exit: `SpringContextsClosingListener` closes the test contexts before Testcontainers' JVM hook runs. A local verify takes ~29 s, and `gate.sh` ~110 s.
  - `dev-down` is quiet when idle.
  - Failed best-effort uploads raise a `::warning` (enforced by `workflow-warnings.test.sh`).
  - `coverage-summary.sh` has tests.
- **Reviews:** SEC round 1 found that `@ManagementContextConfiguration` classes were component-scanned, so the request-ID filter ran twice on :8080. That's fixed: `EnglmsApplication` has a local `@ComponentScan` excluding them. **Keep management-port config out of the scan.**
  - SEC round 2: APPROVED. QA: PASS WITH MINOR ×2.
  - Records: `evidence/T-M1.8/qa/report.md` (PR #18) and `evidence/T-M1.8/review/security.md` (this branch).
- **Deferred to T-M2.1** (backlog row): the TRACE 405 from Boot's `/error` (JSON or Whitelabel, without headers) and `Cache-Control: no-store` on API responses. Spring Security's firewall and default headers cover both.
- **T-M1.7 gate reminders:**
  - freshness is judged by push time; the gate fails closed until the head's `pull_request` runs and activity entry exist;
  - any negative verdict of any type blocks;
  - Dependabot PRs: use `@dependabot rebase`, not "Update branch".

## Next steps
1. The **T-M1.9 packet** is written: `docs/tasks/T-M1.9-web-follow-ups.md` (PR #19, which also carries the T-M1.8 bookkeeping). DOCS-REVIEW round 1 was CHANGES REQUESTED (4 × S3, 17 × S4), all fixed; the T-M1.3 UX record was backfilled to `evidence/T-M1.3/review/ux.md`. Next: a round-2 re-review of the fixes, then after CI is green post `DOCS-REVIEW T-M1.9: PASS` and `LC-APPROVED T-M1.9`, and merge via merge-gate (`--dry-run` first).
2. Ask the PO for the T-M1.9 start signal (record it as a DEC). It's FE: G3 is QA + **UX** review, with screenshots at 360/768/1280.
3. After 2026-10-01: check that `backend-coverage` uploads again (T-M1.8 AC6), and decide whether to keep the GitLab mirror (DEC-060).
4. T-M1.12 (merge-gate polish, LC) and T-M1.10 (TS 7, waits for upstream) are open.

## Pending PO decisions / actions
- The T-M1.9 start signal.
- OQ-17 (wrapper-properties content check; default yes, in T-M1.12).
- Keep or remove the GitLab mirror after the storage reset (DEC-060).
- Recommended (DEC-061): `glab` deny rules in `.claude/settings.json`.
- OQ-03..OQ-14 (defaults documented).

## Gotchas
- Run `./scripts/check-docs.sh` **bare** before every commit. It also fails on forward references to DECs that don't exist yet (it happened once this session).
- merge-gate refuses until the head's `pull_request` runs **and** its activity entry exist. The LC-APPROVED/verdict comments must be re-posted after every new head.
- `mvn test` doesn't delete removed resources from `target/`. When checking that a test fails without a fix, delete the stale copy too.
- Mirror: `./scripts/gitlab-sync.sh [branch]` after merges and before reviews.
- Stage explicit paths (a user PDF may sit in the repo root). `/qa/**` and `evidence/*/qa/**` only change on `qa/<task>`; `evidence/*/review/**` can't change on feature/fix branches.
- `e2e-run.sh` needs 8080/8081 free and `dev-up.sh`. Shellcheck isn't installed (installing it needs PO approval).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.9-web-follow-ups.md` → the frontend-standards skill.
