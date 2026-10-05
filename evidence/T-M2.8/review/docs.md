# DOCS-REVIEW — T-M2.8 development-phase harness (PR #55, DEC-094)

Reviewer: docs-reviewer (fresh context, main checkout, read-only). Recorded by the LC from the reviewer's replies.

## Round 1 — head `49a8cc9` (base `ceb3f1e`) — CHANGES REQUESTED
Checks passed: check-docs; path ownership (11 files); `git worktree list` shows only the main checkout; prompt 3951 characters; archived handoff byte-identical
to `ceb3f1e`. `.claude/settings.json` removes exactly `Read(./.env)`, `Read(./.env.*)`, `Read(./.data/**)`; every other deny rule (push/force-push/merge,
hooksPath, `gh pr merge`, `sudo`, volume rm, `docs/00-sources`) intact. `.env.example` holds no real secret. DEC-094 scope, constraints and restore trigger
stated; T-M8.7 re-adds exactly the removed rules; no agent definition, skill, quality-gates or CLAUDE.md text still prescribes worktrees or PO-only `.env`.
Independent QA stays possible without worktrees (independence = separate session). No scope creep.

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| F1 | S3 | "QA and SEC may run together on a fixed head" is unsafe: both build/run the app in the shared `backend/target`, `web/dist` and ports 8080/8081 | Fixed: QA and SEC run one after the other (coding-agent-rules §3.4, DEC-094, HANDOFF, prompt) |
| F2 | S3 | hoh-operating-model §4 still allows parallel BE/FE packets and QA of N while N+1 is implemented | Fixed: §4 rewritten (one subagent at a time; parallel work needs a new PO decision) |
| F3 | S3 | "at the latest before T-M8.4" not enforced (T-M8.4 deps only OQ-03) | Fixed: T-M8.4 depends on T-M8.7 |
| F4 | S4 | DEC-094 cites DEC-090 for the worktree practice; it is DEC-085/DEC-091 | Fixed |
| F5 | S4 | T-M8.7 does not revert development-setup §0 step 3 | Fixed |
| F6 | S4 | `claude-settings.proposed.json` now differs from `settings.json` without a note | Fixed: DEC-094 and T-M8.7 name it as the restore baseline |
| F7 | S4 | R-21 (score 8) in `progress.json` `risks.top` (top = score ≥ 12) | Fixed: removed |
| F8 | S4 | R-21 trigger misses tutor UAT #1 (T-M5.7) with real content | Fixed |
| F9 | S4 | qa-protocol "checkout the PR branch" conflicts with LC-only branch switches | Fixed: "verify the checkout is on the PR head" |
| — | note | CLAUDE.md Git non-negotiables could name the rule | Done: "One checkout, no git worktrees (DEC-094)" |

## Round 2 — delta `49a8cc9..83bba21` — PASS
check-docs PASS; path ownership PASS (15 files); prompt 3917 characters. F1–F9 and the CLAUDE.md note verified fixed (QA/SEC strictly sequential and stated
consistently in coding-agent-rules §3.4, DEC-094, HANDOFF and the prompt; operating model §4; T-M8.4 depends on T-M8.7; DEC-085/DEC-091 cited; T-M8.7
reverts development-setup §0 step 3; restore baseline named; R-21 out of `risks.top`; R-21 trigger includes T-M5.7; qa-protocol prepare step). The round-1
record is accurate. No new findings; `.claude/settings.json` untouched by the delta.

Verdict line: `DOCS-REVIEW T-M2.8: PASS`
