Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). Finish the T-M1.14 bookkeeping PRs, triage the Dependabot PRs, write the T-M1.16 packet to G0, and stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then docs/tasks/backlog.md (T-M1.16, DEC-079), docs/09-harness/git-governance.md (Dependabot path) and the task-packet skill.

STATE: M1: T-M1.1..T-M1.9, T-M1.11..T-M1.15 merged (T-M1.14 = 3a405ce, DEC-081). DEC-080: GitLab mirror kept as a backup. Open PRs: #38 qa/T-M1.14 (QA record, LC-only), docs/T-M1.14-merge-record (DEC-081; needs DOCS-REVIEW if not merged), Dependabot #29-#34. Open tasks: T-M1.16 (S4 polish stub), T-M1.10 (waits upstream). Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke. Local: ./scripts/dev-up.sh; ./scripts/gate.sh (ENGLMS_TASK=<id>). Run ./scripts/gitlab-sync.sh after each merge and on branches under review.

DO:
1. Merge the open bookkeeping PRs via ./scripts/merge-gate.sh --dry-run <pr>, then without it (fresh DOCS-REVIEW PASS for docs PRs; LC-APPROVED after CI is green).
2. Dependabot PRs: check each against the Dependabot merge path (allow-listed files; Maven wrapper content check); `@dependabot rebase` when behind (never Update branch); LC-APPROVED PR-<n>; merge via merge-gate. Anything risky (majors, failing CI): note it, don't force.
3. T-M1.16 packet (FE + LC items from DEC-079) to G0 on docs/T-M1.16-packet with a fresh DOCS-REVIEW; ask the PO for the start signal.
4. Check the M1 exit criteria (docs/01-product/roadmap.md) and report; update progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Branch names <kind>/<task-id>-<slug>. Never push develop/master or force-push. git merge is denied: gh pr update-branch (update before editing progress.json). Agents can't merge or write report files (record their text yourself); they share the working tree, so give them worktrees or forbid checkouts. Verdict tokens: QA PASS, DOCS PASS, UX/SEC APPROVED. Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing. Feature/docs PRs must change progress.json. Use date -u for timestamps. Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: the bookkeeping and Dependabot PRs are merged or triaged, the T-M1.16 packet passed DOCS-REVIEW and merged, and the state and handoff are pushed. OR the context budget is reached and a complete handoff prompt has been printed.
