---
name: evidence-and-handoff
description: Record task evidence, update progress.json, and write the session handoff and the next-session prompt (≤ 4000 chars) for Eng-LMS. Use at task end, at session end, before risky operations, or when context usage nears the warning threshold (~500k tokens).
---

# Evidence and handoff

## A. Evidence (per task), per `docs/09-harness/evidence-protocol.md`
1. `evidence/<task-id>/summary.md`: an AC → proof table, the commands run (copy-pasteable), the results (counts, coverage, budgets, axe), deviations with DEC/OQ refs, and review verdicts.
2. `gate-<UTC>.log` (trimmed ≤ 300 lines; full log in `raw/`, which is git-ignored).
3. UI: `impl/<viewport>-<route>-<state>.png` for phone-small, tablet and laptop (local only: `evidence/**/*.png` is git-ignored, DEC-131); the self-check list.
3a. The **G3 cost** table: one row per review round (reviewer, head, verdict, findings, full/delta, agent tokens and minutes from the Agent result, gate runs and minutes).
4. No secrets or real personal data. Use synthetic fixtures only.

## C. Records at every merge (LC; lessons-learned L-09)
0. Each reviewer or implementer report is copied to `.claude/scratch/lc-records/<task>-<round>.md` as soon as it returns (L-06).
1. The backlog row → `**done** (`<merge sha>`, DEC-<n>, packet link)`; the packet's Status → `done (<sha>, DEC-<n>)`. `check-docs` fails when a task in `completed[]` lacks either (T-M2.21).
2. `progress.json`: the task into `completed[]`, `currentTask`/`nextTask` moved, `gates`, `tests`, `history`.
3. The merge DEC and the review records (`evidence/<task>/review/*`) on a docs branch; the QA report on `qa/<task>`.
4. Every number in a DEC, summary or handoff is copied from its source in the same step (gate log, Agent result, query), never restated.
5. At a milestone close: the README roadmap row, `docs/09-harness/lessons-learned.md`, the `shortcut:` ledger (quality-gates G5).
6. Then part B (the handoff archive included).

## B. Handoff, per `docs/09-harness/session-handoff-protocol.md`
1. If context is near the threshold: stop starting new steps. Finish the safe step or revert to the last green commit. Commit WIP on the **feature branch** only.
2. Update `progress.json`: `currentTask.status`, `lastCommit`, `nextSteps[]`, `blockers[]`, `tests`, `gates`, `approvals`; append to `history[]`; set `updatedAt`/`updatedBy`.
3. Archive the old handoff: `mv docs/handoff/HANDOFF.md docs/handoff/archive/<UTC>-<task>.md`. Write the new `HANDOFF.md` (protocol §4 template). `check-docs` fails when `HANDOFF.md` changed without a new archive file (T-M2.21).
4. Write `docs/handoff/next-session-prompt.md` from the protocol §5 template. It **must be ≤ 4000 characters** (`wc -c`).
5. `./scripts/check-docs.sh` must pass.
6. Commit: `docs(handoff): <task> <state>`. Push if a remote exists.
7. Give the user the next-session prompt verbatim and say where the state lives.
