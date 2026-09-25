# Cross-Session Memory and Context Handoff Protocol

> Goal: any new agent session can resume work with **zero chat history**. Trace: PO directive (context monitoring, handoff prompt ≤ 4,000 characters,
> never use conversation history as the only memory).

## 1. Memory layers (from most to least authoritative)

| Layer | File(s) | Content | Updated |
|---|---|---|---|
| Machine state | `progress.json` (schema `docs/09-harness/schemas/progress.schema.json`) | Phase, milestone, current and next task, branch, status, completed work, evidence, tests, blockers, decisions, risks, approvals, history | At every status change and at session end |
| Human state | `docs/handoff/HANDOFF.md` | A narrative snapshot: where we are, what's in flight, what to do next, gotchas | At session end and at task end |
| Resume prompt | `docs/handoff/next-session-prompt.md` | A ≤ 4,000-character prompt that bootstraps the next session | At session end |
| Durable knowledge | `docs/**` (ADRs, decisions, risks, specs) | Why and what | When knowledge changes |
| Proof | `evidence/**` | What was verified | Per task |
| History | git log, PRs | What changed | Continuously |
| Archive | `docs/handoff/archive/<UTC>-<task>.md` | Previous HANDOFF.md versions | On each overwrite |

Agent-local auto-memory (for example `~/.claude/projects/.../memory`) may hold **pointers and user preferences only**. It never holds project state that is
missing from the repo.

## 2. Context monitoring and the handoff trigger

- **Thresholds:** *warning* at ≥ 500k tokens used in the session (or the harness's context warning, whichever comes first); *hard stop* at the harness's
  auto-compaction notice.
- At the warning: (1) do not start a new sub-step; (2) finish the current **safe** step (tests green, or revert to the last green commit); (3) commit the work in progress
  on the feature branch (`wip:` commits are allowed on feature branches only); (4) run the handoff procedure (§3).
- Also run the handoff procedure at every task end, before any risky operation (a migration on shared data, a release), and at the end of the working session.

## 3. Handoff procedure (skill `evidence-and-handoff`)

1. Update `progress.json`: `currentTask.status`, `currentTask.lastCommit`, `currentTask.nextSteps[]`, `blockers[]`, `tests.lastRun`, `history[]`
   (append `{at, actor, event}`), `updatedAt`, `updatedBy`. Validate with `./scripts/check-docs.sh`: schema, links, ID references, source integrity, prompt length.
2. Move the current `docs/handoff/HANDOFF.md` to `docs/handoff/archive/<UTC-ts>-<task>.md`, then write a new one (template §4).
3. Write `docs/handoff/next-session-prompt.md` (template §5). Check `wc -c` ≤ 4,000.
4. Commit on the active branch: `docs(handoff): <task> <short state>`. Push if a remote exists.
5. Tell the user: the state is saved, and here is the next-session prompt (paste it verbatim).

## 4. HANDOFF.md template

```markdown
# Handoff — <UTC timestamp>
Phase/Milestone: … · Task: <id> (<status>) · Branch: … · Last commit: <sha>
## Where we are (3–6 bullets)
## In flight / uncommitted: (should be "none")
## Next steps (ordered, each actionable)
## Blockers & pending PO decisions (IDs)
## Gotchas learned this session (env quirks, flaky things, non-obvious decisions → also record durable ones in docs)
## Files to read first
```

## 5. Next-session prompt template (≤ 4,000 characters)

```text
You are resuming the Eng-LMS project (private 1:1 tutor teaching workspace) as <ROLE> in /home/kali/App_sources/Eng-LMS.
Read in order: CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, docs/tasks/<current packet>.md.
State: <phase/milestone>, task <id> <status> on branch <branch> (last commit <sha>).
Do next: <1–5 concrete steps>.
Constraints: follow docs/09-harness/coding-agent-rules.md; gates in docs/06-quality/quality-gates.md; no scope beyond the packet;
only LC merges via scripts/merge-gate.sh; record evidence in evidence/<task>/; update progress.json + handoff before stopping.
Pending PO decisions: <OQ ids + defaults in use>.
Environment notes: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh in each shell; <other gotchas>.
```

## 6. Session start checklist

1. `git status` and `git branch --show-current`. Is it clean, and on the branch named in progress.json?
2. Read the files in the read order. Check `progress.json.blockers` and the pending approvals.
3. If the state is inconsistent (the branch is missing, or progress.json says `in_progress` but the PR is merged), reconcile from git and GitHub, record it in `history`, and tell the user.
