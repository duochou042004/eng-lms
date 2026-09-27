Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). Deliver task T-M1.7 (merge-gate hardening: push-time freshness, negative verdicts block, stricter Dependabot path) through all quality gates, then stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then docs/tasks/T-M1.7-merge-gate-hardening.md (DEC-037/038, git-governance §4, merge-gate.sh + tests). Branch chore/T-M1.7-merge-gate-hardening holds bookkeeping only (if develop moved: gh pr update-branch). T-M1.7 NEEDS THE PO START SIGNAL: ask first, and record the approval as a DEC.

STATE: M1: T-M1.1..T-M1.6 + T-M1.11 (GitLab mirror CI) merged. Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke (container is an extra). Local: ./scripts/dev-up.sh (rerun after a reboot); ./scripts/gate.sh runs 12 steps (ENGLMS_TASK=T-M1.7 writes the log). GitHub artifact storage is FULL until ~2026-10-01: GitHub uploads are continue-on-error; reports are stored by the private GitLab mirror CI (DEC-060): run ./scripts/gitlab-sync.sh after each merge and on branches under review. Follow-ups: T-M1.8, T-M1.9 (before M2), T-M1.10 (TS 7, waits for upstream).

DO:
1. Implement T-M1.7 exactly per its packet (AC1-AC5):
   - freshness from the PR timeline push time (not committedDate), failing closed;
   - any explicit negative verdict of any type blocks;
   - Dependabot PRs: all commits by Dependabot, a narrow file allow-list, workflow edits only as uses: SHA bumps, and the Maven wrapper properties allowed;
   - mock-gh test cases for each rule (none removed or weakened); a dry run on a real PR.
2. Evidence in evidence/T-M1.7/: a summary mapping each AC to its proof, the test output, the dry-run log and CI links. Update git-governance §4, ci-cd §2, a DEC ending the manual checks, and progress.json.
3. Open the PR (template). G3 for a chore packet: ONE fresh agent (docs-reviewer or general-purpose following .claude/agents/qa-evaluator.md) that tries to forge freshness and bypass the gate. It is black-box and returns text; no commits, comments or merges; re-test via SendMessage. Fix S1/S2; defer S3/S4 only via a DEC + backlog task. After the final head commit (CI green for THAT sha), post "DOCS-REVIEW T-M1.7: <verdict>" or "QA-VERDICT T-M1.7: <verdict>" (first line), then "LC-APPROVED T-M1.7", and merge ONLY with ./scripts/merge-gate.sh from an up-to-date develop (--dry-run first). Record the review (qa/T-M1.7 branch or evidence/T-M1.7/review/ on a docs branch).
4. Post-merge: confirm the merged branches are deleted; record the merge on a new branch; write the T-M1.8 packet to G0; update progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. Agents can't run git merge or gh pr merge. Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12 (no -s). Write loops in bash, not zsh. Stage explicit paths (a user PDF sits in the repo root). Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.7 is merged via merge-gate with CI green and a PASS review verdict, the review is recorded, the T-M1.8 packet is written, and the state and handoff are committed and pushed. OR the context budget is reached and a complete handoff prompt has been printed.
