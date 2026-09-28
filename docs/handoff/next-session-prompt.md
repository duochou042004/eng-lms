Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). Finish the T-M1.9 packet's docs review (PR #19) and merge it, then (with the PO start signal) deliver T-M1.9 through all quality gates, then stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then docs/tasks/T-M1.9-web-follow-ups.md and the frontend-standards skill.

STATE: M1: T-M1.1..T-M1.8 + T-M1.11 merged (T-M1.8 = 01dfc5d: :8081 request IDs, Problem Details valve for Tomcat rejections, no local 30 s stall, upload warnings; DEC-068..071). Branch docs/T-M1.9-packet (PR #19) holds the T-M1.8 merge + SEC review record, DEC-071 and the T-M1.9 packet (DOCS-REVIEW round 2 PASS; PO start signal given, DEC-072). Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke. Local: ./scripts/dev-up.sh (after a reboot); ./scripts/gate.sh (12 steps; ENGLMS_TASK=<id> writes the log). GitHub artifact storage may reset ~2026-10-01 (then check that backend-coverage uploads, T-M1.8 AC6); the GitLab mirror CI stores reports meanwhile: run ./scripts/gitlab-sync.sh after each merge and on branches under review.

DO:
1. PR #19: after CI is green for the final head, post "DOCS-REVIEW T-M1.9: PASS" then "LC-APPROVED T-M1.9"; merge ONLY via ./scripts/merge-gate.sh from an up-to-date develop (--dry-run first); gitlab-sync.
2. The PO start signal is DEC-072. Implement on feature/T-M1.9-web-follow-ups (frontend-implementer agent or yourself), the ACs exactly; tests; evidence/T-M1.9/.
3. G3: a fresh qa-evaluator (QA-VERDICT) + ux-reviewer (UX-REVIEW). Black-box, read-only, text reports; re-test via SendMessage. Fix S1/S2; defer S3/S4 only via a DEC + backlog task. After CI is green for the final head: the verdicts, then LC-APPROVED, then merge-gate. The QA record goes on qa/T-M1.9; the UX record goes to evidence/T-M1.9/review/ on the next docs branch.
4. Post-merge: branches deleted; the merge recorded on a new branch; the next packet (T-M1.12 or M2's first) to G0; progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. Agents can't run git merge or gh pr merge. Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12. Bash loops, not zsh. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing (no forward DEC references). Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.9 is merged via merge-gate with CI green and PASS/APPROVED verdicts, the reviews are recorded, the next packet is written, and the state and handoff are committed and pushed. OR the context budget is reached and a complete handoff prompt has been printed.
