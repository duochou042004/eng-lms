Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). After the PO's start signal, take T-M1.16 (review polish + Maven 3.10.0) through G3 and merge it, then write the T-M2.1 packet and stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then docs/tasks/T-M1.16-review-polish.md and the frontend-standards, qa-evaluation and ux-review skills.

STATE: M1 exit criteria met; T-M1.1..T-M1.9, T-M1.11..T-M1.15 merged. DEC-080: GitLab mirror kept. DEC-082: Dependabot triage (#29/#30/#32/#33/#34 via merge-gate; #31 Maven -> T-M1.16 item 7). T-M1.16 packet: PR from docs/T-M1.16-packet (merge it first if still open; check `gh pr list` for leftover Dependabot PRs). Open: T-M1.16 (ready, PO start pending), T-M1.10 (waits upstream). Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke. Local: ./scripts/dev-up.sh; ./scripts/gate.sh (ENGLMS_TASK=<id>). Run ./scripts/gitlab-sync.sh after each merge and on branches under review.

DO:
1. Record the PO start as a DEC (on the feature branch's first commit or a docs PR). A frontend-implementer for items 1-5 in its own git worktree; the LC does items 6-8 (merge-gate step 5 hardening + tests; Maven distributionUrl; deps-batch branch name in tech-stack/hoh) on the same branch.
2. G3: a fresh qa-evaluator (QA-VERDICT) + ux-reviewer (UX-REVIEW, token APPROVED). Fix S1/S2; defer S3/S4 only via a DEC + backlog task. After CI is green for the final head: verdicts, LC-APPROVED, merge via ./scripts/merge-gate.sh --dry-run <pr> then without it; gitlab-sync. QA record on qa/T-M1.16; UX record on the next docs branch.
3. Post-merge docs branch: merge record, the T-M2.1 packet (SEC review applies; FR-AUTH-01..06, 09, 10; ADR-0005) to G0 with a fresh DOCS-REVIEW; progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Branch names <kind>/<task-id>-<slug>. Never push develop/master or force-push. git merge is denied: gh pr update-branch. Agents can't merge or write report files (record their text yourself) and share the working tree (worktrees). Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing. Feature/docs PRs must change progress.json. Use date -u for timestamps. Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.16 is merged via merge-gate with CI green and PASS/APPROVED verdicts, the reviews are recorded, the T-M2.1 packet passed DOCS-REVIEW, and the state and handoff are pushed. OR the context budget is reached and a complete handoff prompt has been printed.
