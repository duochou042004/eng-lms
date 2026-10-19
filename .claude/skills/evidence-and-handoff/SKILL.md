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

## B. Handoff, per `docs/09-harness/session-handoff-protocol.md`
1. If context is near the threshold: stop starting new steps. Finish the safe step or revert to the last green commit. Commit WIP on the **feature branch** only.
2. Update `progress.json`: `currentTask.status`, `lastCommit`, `nextSteps[]`, `blockers[]`, `tests`, `gates`, `approvals`; append to `history[]`; set `updatedAt`/`updatedBy`.
3. Archive the old handoff: `mv docs/handoff/HANDOFF.md docs/handoff/archive/<UTC>-<task>.md`. Write the new `HANDOFF.md` (protocol §4 template).
4. Write `docs/handoff/next-session-prompt.md` from the protocol §5 template. It **must be ≤ 4000 characters** (`wc -c`).
5. `./scripts/check-docs.sh` must pass.
6. Commit: `docs(handoff): <task> <state>`. Push if a remote exists.
7. Give the user the next-session prompt verbatim and say where the state lives.
