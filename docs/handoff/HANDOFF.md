# Handoff — 2026-10-06T05:49Z (T-M2.2 done; next: T-M2.3 packet)

Phase/Milestone: P1 / M2 (in progress) · Current task: **T-M2.3 (packet to write)** · Branch: `chore/T-M2.2-merge-record` · Last merge on develop: `35733c9` (PR #58, T-M2.2 QA record; T-M2.2 itself `04d90e4`) · Remote: https://github.com/duochou042004/eng-lms (mirror: gitlab.com/duochou042004/eng-lms)

## Where we are
- **T-M2.2 done** (`04d90e4`, PR #57; packet PR #56; DEC-095 PO start signal, DEC-096 merge). QA PASS (re-test at `4ebae29`), SEC APPROVED in two rounds; every
  finding fixed in-task (AC2a, AC9, AC10). QA report: PR #58 (`qa/T-M2.2`, merged `35733c9`). SEC record + DEC-096: the `chore/T-M2.2-merge-record` PR.
- **What T-M2.2 gives every later endpoint packet** (authz-isolation skill, security.md §4):
  - `@Audience(TUTOR|STUDENT|PUBLIC|AUTHENTICATED)` on each handler; `AudienceVerifier` refuses startup on a missing/contradicting audience, unknown `/api`
    prefix, non-literal first segment, ambiguous segments, `{…studentId}` on student paths, STUDENT handlers (declared) outside `..web.student..`,
    functional routes, URL mappings under `/api`, application-defined `HandlerMapping`s, a case-insensitive parser.
  - `backend/src/test/java/com/englms/security/PolicyRegistry.java`: one entry per `METHOD /pattern` (statuses for anonymous, tutor, A, B-on-A, must-change);
    `AuthzMatrixTest` fails on a mapping without an entry, an entry without a mapping, or one key served by two handler methods.
  - `IsolationWorld` + `IsolationWorldContributor` (A-owned/B-owned rows, `SECRET-*` markers); `IsolationTest` scans every response of A.
  - ArchUnit rules 3/4 in `architecture/StudentIsolationRulesTest`. Run: `(cd backend && ./mvnw -B -ntp verify -Dgroups=security)`.
- **Known limitations for T-M2.3** (backlog row, DEC-096): rule 3 does not inspect `@RequestBody` DTO fields, headers, cookies or catch-all binders; rule 4 is not
  transitive; the scan matches canonical UUIDs only.

## Next steps
1. If still open, merge the `chore/T-M2.2-merge-record` PR (#59) (CI green → LC-APPROVED → merge-gate → gitlab-sync).
2. Write the **T-M2.3 packet** to G0 (task-packet skill): students backend per the backlog row (student, guardians, learning profile, create-with-account,
   username suggestion/availability, status, password reset, search; `CurrentStudent` + owner-scoped repositories; SEC S4-1 login vs disable; register every
   handler; contributors; decide the DEC-096 rule-3/4 limitations). Check its size (≤ 2 agent-days, ≤ ~10 ACs): it likely needs a split. Fresh DOCS-REVIEW,
   merge, ask the PO once for the start signal.

## Pending PO decisions / actions
- Production needs `SERVER_FORWARDHEADERSSTRATEGY=native` (deployment.md §3) — at deployment time (M8).
- QA F4 (noted): the bundled common-password list rarely fires at the 10-character minimum (conforms to NFR-SEC-06); say if a stronger list is wanted.
- Recommended (DEC-061): `glab` deny rules. OQ-03..OQ-14 (defaults documented).

## Gotchas
- **One checkout, no worktrees** (DEC-094): subagents run one at a time in `/home/kali/App_sources/eng-lms` on the task branch; only the LC switches branches,
  never while a subagent runs. Resuming a finished subagent with SendMessage (implementer for fixes, QA/SEC for delta re-tests) saves context.
- Reviewer evidence (`evidence/*/review/**`) never on feature/fix branches; QA reports on `qa/<task>`. `./scripts/check-path-ownership.sh <branch>` before pushing.
- `./scripts/check-docs.sh` exit code: don't pipe it into `tail` inside an `&&` chain (a failure is hidden). `progress.json` `pr` is a string (`"#57"`).
- The gate's e2e step leaves untracked `evidence/<task>/records/` and `screenshots/`; delete them for backend-only tasks.
- Agents may not write `evidence/<task>/summary.md` at times: record their text yourself. Agents never post PR comments (outward): post verdicts yourself.
- Wall-clock bounds in tests flake on the 2-core CI runner: compare against a same-load baseline (DEC-093).
- `git merge` is denied: `gh pr update-branch <n>`; on a bookkeeping conflict restore to the merge base, update, re-apply (DEC-090). merge-gate deletes the merged branch.
- Verdict tokens: QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`; post after CI is green for the final head. `date -u`; stage explicit paths.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/09-harness/coding-agent-rules.md` §3 → `docs/tasks/backlog.md` (M2) → `evidence/T-M2.2/summary.md` →
`.claude/skills/task-packet`, `authz-isolation`, `backend-module`, `db-migration`.
