# Evidence — T-M2.18 Quality-process upgrade

- Branch: `docs/T-M2.18-quality-process` · PR: see progress.json · Date (UTC): 2026-10-19 · Risk tier: L (docs review)
- Measurement: the T-M2.18 packet table; LC record `.claude/scratch/lc-records/T-M2.18-measure-findings.md` (git-ignored; a sonnet subagent classified
  the 26 QA/UX/SEC reports of T-M2.5, T-M2.12, T-M2.14: 145,869 tokens, 1.8 min). PO approval: DEC-131.

## Acceptance criteria → proof
| AC | Proof | Status |
|---|---|---|
| AC1 | `docs/06-quality/quality-gates.md` G1 (one gate + CI), G3 tier table and finding rules, severity table, G5 regression note | done |
| AC2 | `docs/06-quality/qa-protocol.md` §2 steps 4–7, §2a combined pass, §2b delta re-check, §3 repeat runs, §5 | done |
| AC3 | `docs/06-quality/test-strategy.md` §1 rows and §6; `docs/07-operations/development-setup.md` §4 gate row | done |
| AC4 | `docs/09-harness/evidence-protocol.md` intro, §1 screenshot rule, §2 self-check and G3 cost table | done |
| AC5 | `docs/09-harness/task-packet-template.md` (Risk tier, UI rules, evidence/gate AC); `.claude/skills/task-packet/SKILL.md` step 6 and checklist | done |
| AC6 | `.claude/agents/{qa-evaluator,ux-reviewer,security-reviewer,frontend-implementer}.md`; skills `qa-evaluation`, `ux-review`, `security-review`, `frontend-standards` (self-check), `evidence-and-handoff`; `agent-roles.md`; `coding-agent-rules.md` §2.1, §6.4 | done |
| AC7 | `scripts/gate.sh` (`backend_changed`, `e2e_repeat`); `scripts/tests/gate.test.sh` 50 passed (17 new DEC-131 cases); `scripts/tests/run-all.sh` PASS | done |
| AC8 | `.gitignore` `evidence/**/*.png`; `git ls-files 'evidence/**/*.png'` → 61, all under `evidence/*/qa/**` (1,484 untracked, files kept; the QA-owned 61 go with `qa/T-M2.15`, path ownership); `check-docs.sh` PASS | done |
| AC9 | DEC-131, backlog T-M2.19; path ownership and CI: see the PR | in review |

## Commands run
```bash
bash scripts/tests/gate.test.sh        # 50 passed, 0 failed
./scripts/tests/run-all.sh             # script tests: PASS
./scripts/check-docs.sh
git ls-files 'evidence/**/*.png' | wc -l   # 61 (QA-owned)
```

## Deviations & known limitations
- The E2E helpers and the stylelint rule of DEC-131 (1) are T-M2.19 (FE-owned paths); the gate's changed-spec ×3 run is here.
- PNG history is kept (PO, DEC-131 (8)); the repository size on GitHub does not shrink, it stops growing.
- No gate run: no product code changed.

## Reviews
- DOCS: round 1 CHANGES REQUESTED (S3 D-1..D-4 verdict posting/recording contradictions; S4 D-5..D-11), all fixed in-task; round 2 (delta): pending

## G3 cost (DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
| 1 | docs-reviewer | aed6a52 | CHANGES REQUESTED | 0/0/4/7 | full | 70,438 | 2.2 | 0 | 0 |
