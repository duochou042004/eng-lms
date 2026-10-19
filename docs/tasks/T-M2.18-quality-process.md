# T-M2.18: Quality-process upgrade (leaner, risk-based G3; screenshots out of git)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | in_review |
| Owner role | LC |
| Branch | `docs/T-M2.18-quality-process` (from `develop`) |
| Depends on | T-M2.15 at G1 (PR #112, `7128127`): met |
| Estimate | 0.5 agent-day |
| Risk tier | L (docs, skills, agents, one script, `.gitignore`): docs review |
| Trace | DEC-130 (PO observations), DEC-131 (PO approval of the proposal), DEC-088 (superseded for S4), quality-gates.md, qa-protocol.md, test-strategy.md, evidence-protocol.md, agent-roles.md |

## Goal
G3 costs far less time and quota without lowering quality (PO, DEC-130). Two levers, approved as DEC-131: **prevent** (recurring
finding types become automated checks, fixed packet rules and implementer self-checks, so they are caught at G1) and **proportion**
(review effort by risk tier; re-checks cover only what changed; no full round for minor findings). Screenshots leave git.

## Measurement (T-M2.5, T-M2.12, T-M2.14)
LC record of every report: `.claude/scratch/lc-records/T-M2.18-measure-findings.md` (git-ignored); gate times from `evidence/<task>/gate-*.log`.

| | T-M2.5 | T-M2.12 | T-M2.14 |
|---|---|---|---|
| Rounds QA / UX / SEC | 6 / 4 / 2 | 2 / 2 / 2 | 3 / 3 / 2 |
| Rounds started only by S3/S4 | 4 | 3 | 3 |
| Findings S2 / S3 / S4 (no S1) | 3 / 6 / 14 | 0 / 0 / 10 | 2 / 7 / 5 |
| Gate runs (kept logs) / minutes | 2 / 21 | 5 / 43 | 8 / 87 |
| Evidence tracked / PNGs | 15 MB / 281 | 16 MB / 234 | 28 MB / 365 |

47 findings: 15 layout/wrapping (one T-M2.5 chain of 13 findings over 8 rounds), 8 security hardening (all S3/S4), 5 each behaviour,
a11y, copy/i18n, other, 2 flaky tests. 10 could have been caught by an automated check, 8 by a fixed packet rule, 8 by an implementer
self-check; 21 needed a reviewer. Re-check rounds mostly re-ran the whole regression and their own gate. On these tasks (no backend change)
`backend` + `contract-drift` + `scripts` took ≈ 350 s of each ≈ 670 s gate run, and E2E ran three times per head (two local gates + CI).
1,949 PNGs (75 MB) were tracked. Agent tokens per round were never recorded.

## Scope
- In (DEC-131 (2)–(9); (1)'s E2E checks are **T-M2.19**):
  1. `quality-gates.md`: G1 one local gate per head + CI; the risk tiers and reviewer set at G3; finding handling (S1/S2 in-task + delta
     re-check; S3 cheap in-task, LC-verified; S4 to the milestone polish packet unless a one-line fix); the severity table's S4 column.
  2. `qa-protocol.md`: the combined QA+UX pass, the delta re-check, the repeat-run rule, no screenshots in git.
  3. `test-strategy.md` §1 and §6: the path-aware gate, the changed-spec ×3 run, the full regression at G5.
  4. `evidence-protocol.md`: PNGs git-ignored; the **G3 cost** table in summary.md; trimmed screenshot rules.
  5. `agent-roles.md`: the combined QA+UX reviewer.
  6. `task-packet-template.md` and the `task-packet` skill: **Risk tier** field, the **UI rules** block, the evidence list, the gate AC.
  7. Agents and skills: `qa-evaluator`, `ux-reviewer`, `security-reviewer`, `frontend-implementer`; `qa-evaluation`, `ux-review`,
     `security-review`, `frontend-standards` (self-check list), `evidence-and-handoff`; `coding-agent-rules.md` (screenshots, DEC-088);
     `.github/pull_request_template.md` (screenshots local, one gate run, risk tier).
  8. `scripts/gate.sh`: skip `backend` and `contract-drift` when no file under `backend/`, `api/` or `scripts/contract-drift.sh` changed
     since `origin/develop` (`ENGLMS_GATE_FULL=1` forces them; no git or no base → run everything); after `e2e`, run the new or changed
     `e2e/tests/*.spec.ts` ×3 (`--repeat-each=3 --retries=0`, the mandatory viewports, `--no-build`). Tests in `scripts/tests/gate.test.sh`.
     `development-setup.md` §4 table row.
  9. `.gitignore`: `evidence/**/*.png`; the tracked PNGs untracked with `git rm --cached` (files stay on disk; history kept, no rewrite), except the 61
     under `evidence/*/qa/**`, which a docs branch may not change (path ownership): the next `qa/` branch (`qa/T-M2.15`) untracks them.
  10. Backlog: the T-M2.18 row and the new T-M2.19 row; DEC-129, DEC-130 (as on PR #112) and DEC-131 in the decision log.
- Out of scope: the E2E helpers and the stylelint rule (T-M2.19); any product code; a history rewrite (PO: no); CI workflow changes
  (CI keeps running every required check); T-M2.15's own files (its PNGs are untracked on its branch in its G3, DEC-131 (8)).

## Guardrail answers (scope.md §6)
1. Trace: DEC-130, DEC-131. 2. Drifts toward excluded scope? No, process only. 3. Mandatory setup added? No. 4. Weekly use? Every task.
5. Hard-coded semantics? None.

## Acceptance criteria
- AC1: `quality-gates.md` G1 asks for one green local gate on the final head plus green CI; G3 names tiers H/M/L with their reviewers
  (H: QA+UX combined unless the LC splits UX, and SEC separately; M: one combined QA+UX reviewer; L: docs review) and the finding rules of
  DEC-131 (5); S1/S2 still cannot be deferred; DEC-088 is superseded for S4.
- AC2: `qa-protocol.md` describes the combined pass (one app run, the QA scenario list and the ux-review checklist, both verdict lines),
  the delta re-check (the findings + the files changed since the verdict + targeted specs; no full regression, no reviewer gate run unless
  the LC asks), ×20 repeats only for changed specs covering focus or loading, and evidence without committed screenshots.
- AC3: `test-strategy.md` and `development-setup.md` describe the path-aware gate and the changed-spec ×3 run; the full 6-viewport ×
  3-engine regression is at G5.
- AC4: `evidence-protocol.md` says PNGs are git-ignored (kept locally; text evidence, logs and records JSON stay tracked) and has the G3
  cost table (round, reviewer, verdict, findings S1–S4, agent tokens, agent minutes, gate runs, gate minutes).
- AC5: the template and the `task-packet` skill have the **Risk tier** field and the **UI rules** block (column shares and break rules,
  columns per breakpoint, the focus target after each removing or disabling action, toast/modal layering, the validation rule per field) and
  the gate AC wording "green once on the final head + CI".
- AC6: the agents and skills listed in scope 7 match AC1–AC5; reviewers return text only and never commit screenshots; `frontend-standards`
  has the self-check list (vi verbs on buttons, heading order, non-breaking spaces in counters such as "1 / 133", docs sync, the UI rules
  block met, the long-data check run).
- AC7: `gate.sh` skips `backend` and `contract-drift` (printing why) for a web-only diff, runs them for a `backend/` or `api/` diff, with
  `ENGLMS_GATE_FULL=1`, and outside git; runs changed specs ×3 after `e2e` and nothing extra when no spec changed; `gate.test.sh` proves
  each case; `scripts/tests/run-all.sh` green.
- AC8: `git ls-files 'evidence/**/*.png'` lists only the 61 QA-owned PNGs (untracked by `qa/T-M2.15`) and `.gitignore` ignores new ones; `./scripts/check-docs.sh` passes (no Markdown link to a PNG).
- AC9: DEC-131 and the T-M2.19 row exist; `./scripts/check-path-ownership.sh` passes; CI is green.

## Test plan
- `scripts/tests/run-all.sh` (gate.test.sh cases for AC7) and `./scripts/check-docs.sh`. No gate run: no product code changes.
- Docs review (tier L): consistency between the docs, agents and skills; DEC-131 traced; no scope beyond DEC-131.

## Evidence required
- `evidence/T-M2.18/summary.md` (AC → proof, commands, G3 cost table); the docs review record on the merge.

## Docs to update
- Listed in scope 1–10.

## Risks & assumptions
- A combined reviewer can miss a UX nuance: the ux-review checklist is mandatory in the pass; the LC can split UX for new shared `ui/` primitives.
- The path-aware skip trusts CI for the backend: CI's `backend` and `contract-drift` stay required checks.
- Screenshots are local only after the session: the summary, logs and records JSON stay tracked; reviewers describe what they saw.

## Commands (reproducible)
```bash
./scripts/tests/run-all.sh
./scripts/check-docs.sh
git ls-files 'evidence/**/*.png' | wc -l
./scripts/check-path-ownership.sh docs/T-M2.18-quality-process
```
