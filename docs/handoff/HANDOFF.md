# Handoff — 2026-09-28 (T-M1.9 merged `e20e8ec`; T-M1.12 packet written)

Phase/Milestone: P1 / M1 · Current task: **T-M1.12 (ready; packet in review, PO start signal pending)** · Bookkeeping branch: `docs/T-M1.12-packet` · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1..T-M1.9 and T-M1.11 are merged through merge-gate. Required CI checks: docs-check, secrets-scan, backend, web, contract-drift and e2e-smoke (`container` isn't required). Open in M1: T-M1.12 (LC), T-M1.13 (FE), T-M1.14 (BE), T-M1.10 (TS 7, waits for upstream).
- **T-M1.9 (`e20e8ec`, PR #20; DEC-072..074):**
  - Client-side navigation focuses the page `h1` and sets `<page> · Eng-LMS` titles (vi/en); first loads and reloads keep focus on `body`. A root layout keeps a ref of the last path; pages sit under a pathless error route.
  - `ui/SegmentedControl` (RAC `ToggleButtonGroup`; `radiogroup`/`radio` + `aria-checked`; selected = accent-subtle + check icon) drives the language switcher.
  - `ui/DelayedSkeleton` (150 ms); a field-error icon; 44 px skip/home/404 links; a shell-shaped vs page-only `RouteLoading`; error copy without a request ID.
  - The `dev` i18n namespace is registered only in dev builds; oxlint `no-restricted-properties` blocks `window`/`globalThis`/`self.fetch` outside `lib/api`.
  - The E2E console guard waits 500 ms in teardown (late errors fail tests; permanent expected-failure self-test). E2E: 62 passed / 10 skipped on the 3 mandatory projects.
- **Reviews:** packet DOCS-REVIEW 3 rounds (PR #19). QA **PASS WITH MINOR** and UX **APPROVED** at `92e213b`, S4 only, deferred (DEC-073): web polish → **T-M1.13**; QA F4 (no loading feedback on a slow client-side lazy navigation) and the "class name" copy → **T-M2.4**. Records: `evidence/T-M1.9/qa/report.md` (PR #21) and `evidence/T-M1.9/review/ux.md` (this branch). The QA spec is `qa/e2e/T-M1.9.spec.ts`.
- **DEC-074:** a flaky T-M1.8 backend test (the random UUID can contain the hex `bad`, ≈ 0.7 %) failed CI once; re-run passed → **T-M1.14**. And `merge-gate.sh 19 --dry-run` **merged** PR #19 (only a leading `--dry-run` is parsed; gates had passed) → **T-M1.12** scope 4. **Always put `--dry-run` first until T-M1.12 lands.**
- **Deferred to T-M2.1** (backlog row): the TRACE 405 from Boot's `/error` and `Cache-Control: no-store` on API responses.

## Next steps
1. Open the PR for `docs/T-M1.12-packet` (T-M1.9 post-merge record + the **T-M1.12 packet** `docs/tasks/T-M1.12-merge-gate-polish.md`), get one fresh docs review, fix findings, then after CI is green post `DOCS-REVIEW T-M1.12: PASS` and `LC-APPROVED T-M1.12`, and merge via `./scripts/merge-gate.sh --dry-run <pr>` then without `--dry-run`.
2. Ask the PO for the T-M1.12 start signal (record it as a DEC); implement on `chore/T-M1.12-merge-gate-polish` (LC); G3 = DOCS-REVIEW.
3. Then T-M1.13 (FE) and T-M1.14 (BE) packets, then M2 (T-M2.1 first) once the M1 exit criteria are confirmed.
4. After 2026-10-01: check that `backend-coverage` uploads again (T-M1.8 AC6), and decide whether to keep the GitLab mirror (DEC-060).

## Pending PO decisions / actions
- The T-M1.12 start signal.
- Keep or remove the GitLab mirror after the storage reset (DEC-060).
- Recommended (DEC-061): `glab` deny rules in `.claude/settings.json`.
- OQ-03..OQ-14 (defaults documented). OQ-17 is answered "yes" inside T-M1.12.

## Gotchas
- Run `./scripts/check-docs.sh` **bare** before every commit (it fails on forward DEC references and on schema errors, e.g. `progress.json` `pr` must be a string like `"#20"`, and gate statuses are only n/a/pending/pass/fail).
- merge-gate needs `progress.json` changed in feature/docs PRs; after any new head, re-post the verdicts and `LC-APPROVED` (say what changed since the reviewed head).
- Subagents can't write report files (the harness blocks it): the LC records their returned text (`evidence/<task>/qa/report.md` on `qa/<task>`, `evidence/<task>/review/*.md` on a docs branch).
- A flaky `backend` failure: read the log before re-running (`gh run rerun <id> --failed`), and record it.
- Mirror: `./scripts/gitlab-sync.sh [branch]` after merges and before reviews.
- Stage explicit paths (a user PDF may sit in the repo root). `/qa/**` and `evidence/*/qa/**` only change on `qa/<task>`; `evidence/*/review/**` can't change on feature/fix branches.
- `e2e-run.sh` needs 8080/8081 free and `dev-up.sh`. Shellcheck isn't installed (installing it needs PO approval).

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.12-merge-gate-polish.md` → `scripts/merge-gate.sh` and `scripts/tests/merge-gate.test.sh`.
