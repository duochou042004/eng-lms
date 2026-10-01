Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). Merge the T-M1.14 packet PR and the T-M1.13 QA record PR, then (after the PO's start signal) take T-M1.14 (BE flaky test) through G3 and merge it, and stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then docs/tasks/T-M1.14-flaky-request-id-test.md and the qa-evaluation skill.

STATE: M1: T-M1.1..T-M1.9, T-M1.11..T-M1.13, T-M1.15 merged (T-M1.13 = 625c8fc; T-M1.15 = 9a68eb7: merge-gate reads all PR files; DEC-078/079). Open PRs: docs/T-M1.14-packet (packet, review records, DEC-079, T-M1.16 backlog stub; needs a fresh DOCS-REVIEW) and #27 qa/T-M1.13 (QA record, LC-only path). Open tasks: T-M1.14 (ready, PO start pending), T-M1.16 (S4 polish stub), T-M1.10 (waits upstream). Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke. Local: ./scripts/dev-up.sh; ./scripts/gate.sh (ENGLMS_TASK=<id>). Run ./scripts/gitlab-sync.sh after each merge and on branches under review.

DO:
1. Packet PR: fresh docs-reviewer (DOCS-REVIEW T-M1.14: PASS only), record it in evidence/T-M1.14/review/docs.md on the branch before the final head, LC-APPROVED after CI is green, merge via ./scripts/merge-gate.sh --dry-run <pr> then without it. Merge #27 the same way.
2. Ask the PO for the T-M1.14 start signal (record a DEC). Then a backend-implementer on fix/T-M1.14-flaky-request-id-test (no src/main change; no retries/quarantine).
3. G3: a fresh qa-evaluator (QA-VERDICT). Fix S1/S2; defer S3/S4 only via a DEC + backlog task. After CI is green for the final head: verdicts, LC-APPROVED, merge via merge-gate; gitlab-sync. QA record on qa/T-M1.14.
4. Post-merge: record the merge on a new docs branch; the T-M1.16 packet (or T-M2.1 if the PO prefers); progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. git merge is denied: use gh pr update-branch (if progress.json conflicts, commit develop's copy first, update, re-apply). Agents can't merge or write report files (record their text yourself). Verdict tokens: QA PASS, DOCS PASS, UX/SEC APPROVED. Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing. Feature/docs PRs must change progress.json. Use date -u for timestamps. Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.14 is merged via merge-gate with CI green and a PASS verdict, the records are committed, and the state and handoff are pushed. OR the context budget is reached and a complete handoff prompt has been printed.
