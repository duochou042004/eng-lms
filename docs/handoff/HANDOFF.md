# Handoff — 2026-10-01 (T-M1.13 and T-M1.15 merged; T-M1.14 packet on its docs PR)

Phase/Milestone: P1 / M1 · Current task: **T-M1.14 (ready; PO start signal pending)** · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- **M1 progress:** T-M1.1..T-M1.9, T-M1.11, T-M1.12, **T-M1.13** (`625c8fc`) and **T-M1.15** (`9a68eb7`) are merged through merge-gate. Open in M1: **T-M1.14** (BE flaky
  test, packet ready), **T-M1.16** (S4 polish, backlog stub, DEC-079), T-M1.10 (TS 7, waits for upstream).
- **T-M1.13 (PR #25):** QA-VERDICT PASS and UX-REVIEW APPROVED at `3ff781c`, merged at `5c169fb` (only develop's T-M1.15 merge + `progress.json` on top; verdicts
  re-posted). Records: `evidence/T-M1.13/qa/report.md` (**PR #27, `qa/T-M1.13`**, LC-only path), `evidence/T-M1.13/review/ux.md` and `review/docs.md` (this branch).
- **T-M1.15 (PR #26, DEC-078):** merge-gate refused PR #25 because `gh pr view --json files` stops at 100 files (PR had 130). Step 5 now uses the paginated REST listing,
  fails closed, ignores a removed `progress.json`. PO started it with the packet and fix in one PR. DOCS-REVIEW PASS (7 S4; F1/F2 → T-M1.16).
- **T-M1.8 AC6:** `backend-coverage` uploads again (artifact storage reset). The GitLab mirror stays until the PO decides (DEC-060).

## Next steps
1. **This branch (`docs/T-M1.14-packet`)**: a fresh docs-reviewer → `DOCS-REVIEW T-M1.14: PASS` + `LC-APPROVED T-M1.14` after CI is green; merge via merge-gate
   (`--dry-run` first). Merge PR #27 (QA record) via merge-gate too, if not yet merged.
2. Ask the PO for the **T-M1.14 start signal**; record it as a DEC. Then a backend-implementer on `fix/T-M1.14-flaky-request-id-test`; G3 = a fresh qa-evaluator.
3. T-M1.16 (S4 polish) needs a packet and a PO start; then confirm the M1 exit criteria and start M2 (T-M2.1).

## Pending PO decisions / actions
- T-M1.14 start signal. Keep or remove the GitLab mirror (DEC-060). Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- Run `./scripts/check-docs.sh` **bare** (not piped into `tail` inside an `&&` chain: the pipe hides its exit code).
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`; DOCS `PASS`; SEC and **UX `APPROVED`** (not PASS). Ask reviewers for their canonical token.
- `git merge` is denied: catch up with `gh pr update-branch <n>`. If `progress.json` conflicts, first commit develop's `progress.json` on the branch, update, then re-apply
  the task's state in a new commit; re-post the verdicts with what changed.
- merge-gate needs `progress.json` changed in feature/docs/chore PRs; after any new head, re-post the verdicts and `LC-APPROVED`.
- Subagents can't write report files: the LC records their returned text. The `backend` CI check can flake (T-M1.14): read the log, re-run once, record it.
- `./scripts/gitlab-sync.sh [branch]` after merges and before reviews. Stage explicit paths. `ENGLMS_TASK=<id>` makes E2E write evidence; don't commit it for non-UI tasks.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.14-flaky-request-id-test.md` → the backend-module skill.
