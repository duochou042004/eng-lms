Resume Eng-LMS as Lead Coordinator. Close milestone M1 through gate G5, then prepare M2's first task (T-M2.1) up to the PO start signal; stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, docs/06-quality/quality-gates.md (§G5), docs/01-product/roadmap.md (M1, M2) and docs/tasks/backlog.md (M2).

STATE: device set up and verified (DEC-084; clone /home/kali/App_sources/eng-lms). All M1 packets merged; T-M1.16 merged as 1dbd7e3 (DEC-085). M1 is in_review for G5. T-M1.10 upstream-gated; T-M1.17 (merge-gate: report an unsupported gh) is a small LC backlog chore. No open PRs expected (check `gh pr list`).

DO:
1. M1 G5: a fresh qa-evaluator runs the milestone regression (full E2E on all 6 viewports with Chromium; smoke on Firefox and WebKit; install those browsers in e2e if missing: ask the PO if system deps need sudo) and returns a QA milestone report; you record it in evidence/M1/ and write evidence/M1/retro.md (risk register, decision log, roadmap reviewed). Commit on a docs/T-M1.16-m1-g5 (or qa/M1) branch per git-governance, fresh DOCS-REVIEW, merge via merge-gate. Ask the PO to sign off M1 (record a DEC); then milestone.status = done.
2. T-M2.1 packet with the task-packet skill (identity core; SEC review required at G3; trace FR-AUTH-01..06, 09, 10; ADR-0005; the DEC-054/069/070 items listed in the backlog row). DOCS-REVIEW on the packet PR, merge via merge-gate, then ask the PO for the start signal.
3. Optional if time allows: T-M1.17 (packet first).

RULES: implement only a packet's scope. Branch names <kind>/<task-id>-<slug>. Never push develop/master or force-push. git merge is denied: gh pr update-branch. Agents can't merge or write report files (record their text yourself). Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing. Feature/docs PRs must change progress.json. Use date -u for timestamps. .env files are unreadable by rule (the PO handles them). Verdicts are posted after CI is green for the final head; then LC-APPROVED, ./scripts/merge-gate.sh --dry-run <pr>, then without it; ./scripts/gitlab-sync.sh. Outward-facing actions and host settings need PO approval.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: M1 is done (G5 passed, PO sign-off recorded) and the T-M2.1 packet is merged and ready with the PO start signal requested, with state and handoff pushed. OR the context budget is reached and a complete handoff prompt has been printed.
