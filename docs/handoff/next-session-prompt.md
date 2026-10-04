Resume Eng-LMS as Lead Coordinator. Close M1 with the PO's G5 sign-off, prepare T-M2.1 up to the PO start signal, then (if time) do T-M1.17; stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, evidence/M1/qa-regression.md, evidence/M1/retro.md, docs/06-quality/quality-gates.md (G5) and docs/tasks/backlog.md (M2 and "Carried past M1").

STATE: M1 is awaiting_approval. G5 regression PASS WITH MINOR (3 engines x 6 viewports; DEC-087), retro and risk review done; only the PO sign-off remains. PO priority (DEC-086): T-M1.17 first among the carried items, then T-M1.18; T-M1.10 when upstream is ready. Check `gh pr list`: PR #46 (QA suite) and the G5 docs PR should be merged; merge them via merge-gate if still open.

DO:
1. Ask the PO to sign off M1 G5; record a DEC; set milestone.status = done and gates.G5 = pass (docs branch docs/T-M1.16-<slug>, fresh DOCS-REVIEW, merge-gate).
2. T-M2.1 packet with the task-packet skill (identity core; SEC review at G3; FR-AUTH-01..06, 09, 10; ADR-0005; the DEC-054/069/070 items in its backlog row). DOCS-REVIEW, merge via merge-gate, ask the PO for the start signal.
3. If time allows: T-M1.17 packet and implementation (LC; merge-gate reports an unsupported gh; tests with the mocked gh).

RULES: implement only a packet's scope. Branch names <kind>/<task-id>-<slug>. Never push develop/master or force-push. git merge is denied: gh pr update-branch. Agents can't merge or write report files (record their text yourself). Give each subagent its own git worktree. Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing. Feature/docs PRs must change progress.json. Use date -u for timestamps. .env files are unreadable by rule (the PO handles them). Verdicts are posted after CI is green for the final head; then LC-APPROVED, ./scripts/merge-gate.sh --dry-run <pr>, then without it; ./scripts/gitlab-sync.sh. Outward-facing actions and host settings need PO approval.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: M1 is done with the PO sign-off recorded and the T-M2.1 packet is merged with the PO start signal requested, state and handoff pushed. OR the context budget is reached and a complete handoff prompt has been printed.
