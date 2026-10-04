Resume Eng-LMS as Lead Coordinator. M1 is done (DEC-088). Start M2: write the T-M2.1 packet to G0 and ask the PO for its start signal; then do T-M1.17 (first of the carried items, DEC-086) end to end; stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, docs/tasks/backlog.md (M2 and "Carried past M1"), docs/01-product/roadmap.md (M2 exit criteria), docs/06-quality/quality-gates.md and qa-protocol.md (new repeat-run rule, DEC-088), and the task-packet skill.

STATE: develop is clean; no open PRs (check `gh pr list`). Device set up (DEC-084): gh 2.102, Podman 5.7, WebKit deps installed. Milestone M2 not started. Carried items: T-M1.17 first, then T-M1.18, T-M1.10 upstream-gated.

DO:
1. T-M2.1 (identity core: accounts, tutor bootstrap, login/logout/session with Spring Session JDBC + persistent_logins (DEC-036), CSRF for the SPA, lockout + IP throttle, must-change gate, audit v1, security headers into Spring Security, plus the DEC-054/069/070 items in its backlog row; trace FR-AUTH-01..06, 09, 10, ADR-0005). Write the packet with the task-packet skill (ACs, test plan, SEC review required at G3, db-migration and authz-isolation skills referenced). Branch docs/T-M2.1-packet, fresh DOCS-REVIEW, merge via merge-gate, then ask the PO for the start signal (record a DEC). Do not start implementation without it.
2. T-M1.17 (LC): a short packet (merge-gate fails loudly when `gh pr checks --json` errors or gh is too old, instead of "required check missing"; tests with the mocked gh; development-setup §0 states the needed gh), then implement on chore/T-M1.17-<slug>, gate green, fresh DOCS-REVIEW (or QA) per the gates, merge via merge-gate, gitlab-sync.
3. If time remains: T-M1.18 the same way.

RULES: implement only a packet's scope. Branch names <kind>/<task-id>-<slug>. Never push develop/master or force-push. git merge is denied: gh pr update-branch. Agents can't merge or write report files (record their text yourself). Give each subagent its own git worktree. Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing. Feature/docs PRs must change progress.json. Use date -u for timestamps. .env files are unreadable by rule (the PO handles them). Verdicts are posted after CI is green for the final head; then LC-APPROVED, ./scripts/merge-gate.sh --dry-run <pr>, then without it; ./scripts/gitlab-sync.sh. Outward-facing actions and host settings need PO approval.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: the T-M2.1 packet is merged and the PO start signal has been requested, T-M1.17 is merged via merge-gate, and state and handoff are pushed. OR the context budget is reached and a complete handoff prompt has been printed.
