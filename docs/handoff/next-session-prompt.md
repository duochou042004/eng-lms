Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). Write the T-M1.13 packet (FE web polish) to G0 and merge the bookkeeping branch, then (with the PO start signal) deliver T-M1.13 through all quality gates, then write the next packet (T-M1.14) and stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then the T-M1.13 row in docs/tasks/backlog.md (DEC-073; sources evidence/T-M1.9/review/ux.md and evidence/T-M1.9/qa/report.md) and the frontend-standards skill.

STATE: M1: T-M1.1..T-M1.9, T-M1.11, T-M1.12 merged (T-M1.12 = 9866f26: merge-gate strict args, more loose negatives, wrapper check; DEC-075/076). Branch docs/T-M1.13-packet (pushed, no PR) holds the T-M1.12 review record + DEC-076. Open: T-M1.13 (FE), T-M1.14 (BE flaky test), T-M1.10 (waits upstream). Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke; backend can flake (T-M1.14): read the log, re-run once, record it. Local: ./scripts/dev-up.sh; ./scripts/gate.sh (ENGLMS_TASK=<id>). After 2026-10-01 check backend-coverage uploads (T-M1.8 AC6). Run ./scripts/gitlab-sync.sh after each merge and on branches under review.

DO:
1. On docs/T-M1.13-packet write docs/tasks/T-M1.13-*.md with the task-packet skill (G0; FE; UX step budgets; screenshots 360/768/1280; vi+en). Open the PR (template). One fresh docs-reviewer; fix findings; after CI is green for the final head post "DOCS-REVIEW T-M1.13: PASS" then "LC-APPROVED T-M1.13"; merge ONLY via ./scripts/merge-gate.sh --dry-run <pr>, then without it, from an up-to-date develop; gitlab-sync.
2. Ask the PO for the T-M1.13 start signal (record a DEC). Implement on feature/T-M1.13-web-polish (frontend-implementer agent or yourself), the ACs exactly; tests; evidence/T-M1.13/.
3. G3: a fresh qa-evaluator (QA-VERDICT) + ux-reviewer (UX-REVIEW). Black-box, read-only, text reports; re-test via SendMessage. Fix S1/S2; defer S3/S4 only via a DEC + backlog task. After CI is green for the final head: verdicts, LC-APPROVED, merge-gate. QA record on qa/T-M1.13; UX record to evidence/T-M1.13/review/ on the next docs branch.
4. Post-merge: the merge recorded on a new branch; the T-M1.14 packet to G0; progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. Agents can't run git merge or gh pr merge, and can't write report files (record their text yourself). Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12. Bash loops, not zsh. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing. Feature/docs PRs must change progress.json; DOCS-REVIEW accepts only PASS. Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.13 is merged via merge-gate with CI green and PASS/APPROVED verdicts, the reviews are recorded, the T-M1.14 packet is written, and the state and handoff are committed and pushed. OR the context budget is reached and a complete handoff prompt has been printed.
