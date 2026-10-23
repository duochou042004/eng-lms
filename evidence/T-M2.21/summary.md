# T-M2.21 summary: records consistency in check-docs

> Written by the LC, who implemented this tier-L packet (owner LC). Packet `docs/tasks/T-M2.21-records-checks.md` (DEC-150, G0 DEC-151);
> PO start signal in chat on 2026-10-23 ("Start T-M2.21: implement the records-checks packet under DEC-131 (tier L).").

## What changed
- `scripts/check_docs.py`: three checks after the existing five. `check_done_records` (scope 1, 2), `check_handoff_archived` (scope 3),
  `check_table_code_spans` (scope 4). `ENGLMS_DOCS_ROOT` and `ENGLMS_DOCS_BASE` (then `ENGLMS_GATE_BASE`, then `origin/develop`);
  a shared `unfenced()` line reader skips fenced blocks. The PASS line names the new checks.
- `scripts/tests/check-docs.test.sh` (new, picked up by `run-all.sh`): 32 assertions over 19 fixtures, about 19 s.
- `.github/workflows/docs-check.yml`: `ENGLMS_DOCS_BASE=origin/<base_ref>` on pull requests only (empty on pushes, so the default applies).
- Stale records fixed (scope 6), exactly the 15 failures the new checks reported on `ae24b4d`'s parent: eight packet Status lines
  (T-M1.2, T-M1.3, T-M1.17, T-M1.18, T-M1.19, T-M2.4, T-M2.15, T-M2.18 → `done (<mergeCommit>, PR #n)`, SHAs asserted against
  `progress.json` while editing), three backlog rows (T-M0.1, T-M1.1, T-M2.14) and four code spans escaped (`engines.md:27`,
  `design-system.md:31`, `evidence/T-M1.12/review/docs.md:33`, `evidence/T-M1.17/review/docs.md:17`). No other record was found.
- Docs (scope 7): the docstring and PASS line, `ci-cd.md` §1, `session-handoff-protocol.md` §3 steps 1-2, `README.md`,
  `.claude/agents/docs-reviewer.md`, lessons-learned L-09, evidence-and-handoff part C step 1 and part B step 3.

## AC → proof
| AC | Proof |
|---|---|
| AC1 | fixtures: row without `**done**`, `**Done**`, no row → exit 1, message names the task and `docs/tasks/backlog.md`, one problem |
| AC2 | fixtures: Status `ready (G0)`, no Status row, a `done` row in a fenced block before a `ready` one → exit 1; the clean tree holds both `**done**: …` (T-M1.1) and `done (…)` forms and passes |
| AC3 | fixtures: HANDOFF.md changed uncommitted and committed → exit 1; plus an untracked or committed new archive file → 0; `git mv` to the archive + new HANDOFF.md → 0; unknown `ENGLMS_DOCS_BASE` / `ENGLMS_GATE_BASE` → exit 1 naming the ref and the variable |
| AC4 | fixtures: ``a\|b`` and a double-backtick span in a table row → exit 1 with file:line; escaped, paragraph, fenced → 0; git-ignored `.claude/scratch/x.md` → 0 |
| AC5 | mutation runs below: each check (and the fence handling) disabled in turn makes its cases fail |
| AC6 | `./scripts/check-docs.sh` on the final head: PASS (343 markdown files … records consistent, handoff archived, table code spans escaped) |
| AC7 | the files listed under Docs |
| AC8 | `ENGLMS_TASK=T-M2.21 ./scripts/gate.sh` on `e5a59b9`: PASS (13 steps, 420 s; scripts 68 s incl. check-docs 32/32; web 818 tests in 68 files; e2e 515 passed / 31 skipped; backend and contract-drift skipped: no backend/api change; no changed spec) — `evidence/T-M2.21/gate-20261023T122921Z.log`. CI below. Every existing script test kept (run-all PASS) |

## AC5 mutation runs (`bash scripts/tests/check-docs.test.sh` with one change to `check_docs.py`, restored after each)
```text
== mutation: check_done_records(progress) disabled
 scripts/check_docs.py | 2 +-
  FAIL - completed task whose backlog row has no **done** fails (expected exit 1, got 0)
  FAIL - names the task and the backlog (missing: T-M2.20 is completed in progress.json but its row in docs/tasks/backlog.md has no **done**)
  FAIL - row without done: no other failure (missing: FAIL (1 problem(s)))
  FAIL - **Done** (capital) does not count as **done** (expected exit 1, got 0)
  FAIL - completed task with no backlog row fails (expected exit 1, got 0)
  FAIL - names the missing row (missing: T-M2.20 is completed in progress.json but has no row in docs/tasks/backlog.md)
  FAIL - missing row: no other failure (missing: FAIL (1 problem(s)))
  FAIL - completed task whose packet Status reads ready fails (expected exit 1, got 0)
  FAIL - names the packet and its Status (missing: docs/tasks/T-M2.20-m2-polish.md Status reads: ready (G0))
  FAIL - ready Status: no other failure (missing: FAIL (1 problem(s)))
  FAIL - completed task whose packet has no Status row fails (expected exit 1, got 0)
  FAIL - names the packet (missing: docs/tasks/T-M2.20-m2-polish.md has no Status row)
  FAIL - no Status row: no other failure (missing: FAIL (1 problem(s)))
  FAIL - a done Status row in a fenced block before the real one does not count (expected exit 1, got 0)
  -> 18 passed, 14 failed
== mutation: check_handoff_archived() disabled
 scripts/check_docs.py | 2 +-
  FAIL - uncommitted HANDOFF.md change without an archive file fails (expected exit 1, got 0)
  FAIL - names the handoff and the base (missing: docs/handoff/HANDOFF.md changed since 2f00c0dceb2a1e5cd0dc2ba66d517151f8a73ea4 without a new file under docs/handoff/archive/)
  FAIL - uncommitted handoff: no other failure (missing: FAIL (1 problem(s)))
  FAIL - committed HANDOFF.md change without an archive file fails (expected exit 1, got 0)
  FAIL - an unknown ENGLMS_DOCS_BASE fails closed (expected exit 1, got 0)
  FAIL - names the ref and the variable (missing: cannot diff against base ref 'origin/does-not-exist' (ENGLMS_DOCS_BASE))
  FAIL - an unknown ENGLMS_GATE_BASE (no ENGLMS_DOCS_BASE) fails closed (expected exit 1, got 0)
  FAIL - names ENGLMS_GATE_BASE (missing: cannot diff against base ref 'origin/nope' (ENGLMS_GATE_BASE))
  -> 24 passed, 8 failed
== mutation: check_table_code_spans() disabled
 scripts/check_docs.py | 2 +-
  FAIL - a bare pipe in a table-row code span fails (expected exit 1, got 0)
  FAIL - names file:line and the span (missing: docs/fixture-pipe.md:1: `a|b`)
  FAIL - bare pipe: no other failure (missing: FAIL (1 problem(s)))
  FAIL - a bare pipe in a double-backtick span fails (expected exit 1, got 0)
  -> 28 passed, 4 failed
== mutation: unfenced() never toggles (fence handling off)
 scripts/check_docs.py | 2 +-
  FAIL - a done Status row in a fenced block before the real one does not count (expected exit 1, got 0)
  FAIL - an escaped pipe in a table, a bare one in a paragraph and one in a fenced block pass (expected exit 0, got 1)
  -> 30 passed, 2 failed
```

## Gate notes
- The first gate on `e5a59b9` failed at `web-test` on the kept T-M2.12 test `RouteError.test.tsx:316` (one `getByRole` after an
  `online` event, L-05). This diff changes no web code; the file passed 8/8 alone and the re-run passed. Ruled by DEC-152: the fix joins
  the T-M2.13 row. The failed log is kept in the LC's local records only.

## G3 cost
| Round | Reviewer | Head | Verdict | Findings | Full/delta | Tokens | Minutes | Gate runs |
|---|---|---|---|---|---|---|---|---|
| G1 | LC (implementer) | `e5a59b9` | gate PASS (2nd run) | flake → DEC-152 | — | — | — | 2 (1st FAIL at web-test after 55 s; 2nd PASS 420 s) |
