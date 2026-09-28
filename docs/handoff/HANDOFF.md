# Handoff — 2026-09-28 (T-M1.12 merged `9866f26`; T-M1.13 packet next)

Phase/Milestone: P1 / M1 · Current task: **T-M1.13 (draft: packet to write)** · Bookkeeping branch: `docs/T-M1.13-packet` (pushed; no PR yet) · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1..T-M1.9, T-M1.11 and T-M1.12 are merged through merge-gate. Required CI checks: docs-check, secrets-scan, backend, web, contract-drift and e2e-smoke. Open in M1: **T-M1.13** (FE web polish, DEC-073), **T-M1.14** (BE flaky test, DEC-074), T-M1.10 (TS 7, waits for upstream).
- **T-M1.12 (`9866f26`, PR #23; DEC-075, DEC-076):** `merge-gate.sh` now
  - parses `--dry-run` before or after the PR number; any other argument (or none) exits 2 **before any `gh` call**; runs under `LC_ALL=C`;
  - treats more loose negatives as blocking (Unicode spaces/colons/dashes, `1.`/`1)`/`(1)`/`+ `/`[x] ` markers, stacked separators, `QA-VERDICT: <id>`); after a separator any `FAIL…` word blocks; only a word glued to the id must end, so `<id>-FAILOVER: PASS` is no longer refused;
  - limits Dependabot's `maven-wrapper.properties` changes to `wrapperVersion` / Maven Central `distributionUrl` bumps (OQ-17 = yes).
  - Tests 131 → 295 (`merge-gate.test.sh` now takes ~2.5 min). The review found two S3 fail-opens in the new pattern (loose `FAILURES` un-blocked; `<id>- FAIL` ignored); both fixed before merge. Record: `evidence/T-M1.12/review/docs.md` (this branch).
- **T-M1.9 (`e20e8ec`)** web a11y/UX follow-ups are in; its S4s are T-M1.13 and T-M2.4 notes (DEC-073).
- **Deferred to T-M2.1** (backlog row): the TRACE 405 from Boot's `/error` and `Cache-Control: no-store` on API responses.

## Next steps
1. On `docs/T-M1.13-packet`, write the **T-M1.13 packet** (FE web polish; the backlog row lists the five items: the SegmentedControl keyboard-model note, stable segment widths, the landing switcher-row skeleton, a start-page link on the error page, two more fetch lint forms) to G0 with the task-packet skill. Open the PR (it also carries the T-M1.12 record), one fresh docs review, then `DOCS-REVIEW T-M1.13: PASS` + `LC-APPROVED T-M1.13` after CI is green, and merge via merge-gate (`--dry-run` first as a habit).
2. Ask the PO for the T-M1.13 start signal (DEC). It's FE: G3 is QA + UX review, screenshots at 360/768/1280, vi + en.
3. T-M1.14 (BE, small): fix the flaky request-ID test without relying on randomness. Then confirm the M1 exit criteria and start M2 (T-M2.1).
4. After 2026-10-01: check that `backend-coverage` uploads again (T-M1.8 AC6), and decide whether to keep the GitLab mirror (DEC-060).

## Pending PO decisions / actions
- The T-M1.13 start signal.
- Keep or remove the GitLab mirror after the storage reset (DEC-060).
- Recommended (DEC-061): `glab` deny rules in `.claude/settings.json`.
- OQ-03..OQ-14 (defaults documented).

## Gotchas
- Run `./scripts/check-docs.sh` **bare** before every commit (forward DEC references and the `progress.json` schema: `pr` is a string like `"#23"`; gate statuses n/a/pending/pass/fail).
- merge-gate needs `progress.json` changed in feature/docs/chore PRs; after any new head, re-post the verdicts and `LC-APPROVED` (say what changed since the reviewed head). DOCS-REVIEW accepts only `PASS` (not `PASS WITH MINOR`).
- Subagents can't write report files: the LC records their returned text (`evidence/<task>/qa/report.md` on `qa/<task>`, `evidence/<task>/review/*.md` on a docs branch).
- The `backend` CI check can flake (T-M1.14): read the log, re-run once (`gh run rerun <id> --failed`), record it.
- Mirror: `./scripts/gitlab-sync.sh [branch]` after merges and before reviews. Stage explicit paths (a user PDF may sit in the repo root).
- `gate.sh` with `ENGLMS_TASK=<id>` makes the E2E step write records/screenshots into `evidence/<id>/`; don't commit them for non-UI tasks.
- `e2e-run.sh` needs 8080/8081 free and `dev-up.sh`. Shellcheck isn't installed (installing it needs PO approval).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/backlog.md` (the T-M1.13 row) → `docs/09-harness/task-packet-template.md` → the frontend-standards skill.
