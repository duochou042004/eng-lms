Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). First merge the bookkeeping branch docs/T-M1.8-packet, then deliver T-M1.8 (backend error-surface and tooling follow-ups) through all quality gates, then stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then docs/tasks/T-M1.8-backend-follow-ups.md (DEC-041/047/054/055). The PO start signal for T-M1.8 is given (DEC-068).

STATE: M1: T-M1.1..T-M1.7 + T-M1.11 merged (T-M1.7 = 41beac7: merge-gate push-time freshness via repository activity + pull_request runs, fail closed; negatives of any type block; strict Dependabot path; DEC-062..067). Branch docs/T-M1.8-packet (pushed; open a PR if none) holds the T-M1.7 merge and review record, DEC-067, backlog T-M1.12, the T-M1.8 packet and the handoff. Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke. Local: ./scripts/dev-up.sh (after a reboot); ./scripts/gate.sh (12 steps; ENGLMS_TASK=<id> writes the log). GitHub artifact storage may reset ~2026-10-01; until then the reports live in the GitLab mirror CI: run ./scripts/gitlab-sync.sh after each merge and on branches under review.

DO:
1. Bookkeeping PR (docs/T-M1.8-packet): one fresh docs-reviewer reviews the T-M1.8 packet (G0 quality, traceability, scope). Fix the findings; post "DOCS-REVIEW T-M1.8: PASS" then "LC-APPROVED T-M1.8" after CI is green for the final head; ./scripts/merge-gate.sh --dry-run <pr> from an up-to-date develop, then merge; gitlab-sync.
2. Implement T-M1.8 on feature/T-M1.8-backend-follow-ups via the backend-implementer agent (or yourself), AC1-AC8 exactly. Tests at the right levels; no test removed or weakened; evidence in evidence/T-M1.8/.
3. G3: a fresh qa-evaluator (QA-VERDICT) and a security-reviewer (SEC-REVIEW; error surface and headers). Black-box; re-test via SendMessage; fix S1/S2; defer S3/S4 only via a DEC + backlog task. The QA record goes on a qa/T-M1.8 branch. After CI is green for the final head: the verdict comments, then LC-APPROVED T-M1.8, then merge ONLY with merge-gate (--dry-run first). The gate fails closed until the head's pull_request runs and activity entry exist.
4. Post-merge: confirm the branches are deleted; record the merge on a new branch; write the T-M1.9 packet to G0; update progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. Agents can't run git merge or gh pr merge. Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12. Write loops in bash, not zsh. Stage explicit paths (a user PDF sits in the repo root). Run ./scripts/check-docs.sh bare (not piped) before committing. Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: the bookkeeping PR and T-M1.8 are merged via merge-gate with CI green and PASS/APPROVED verdicts, the reviews are recorded, the T-M1.9 packet is written, and the state and handoff are committed and pushed. OR the context budget is reached and a complete handoff prompt has been printed.
