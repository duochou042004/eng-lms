Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop). Get the T-M1.12 packet (merge-gate polish) through its docs review and merge the bookkeeping branch, then (with the PO start signal) deliver T-M1.12, then write the next packet (T-M1.13 or T-M1.14) and stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. NOT a school LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json and docs/handoff/HANDOFF.md, then docs/tasks/T-M1.12-merge-gate-polish.md, scripts/merge-gate.sh and scripts/tests/merge-gate.test.sh.

STATE: M1: T-M1.1..T-M1.9 + T-M1.11 merged (T-M1.9 = e20e8ec: route focus/titles, SegmentedControl, skeleton delay, dev strings out of prod, fetch lint, late console errors; DEC-072..074). Branch docs/T-M1.12-packet (pushed) holds the T-M1.9 UX record, DEC-073/074, backlog T-M1.13 (FE web polish) + T-M1.14 (BE flaky test), and the T-M1.12 packet. Open in M1: T-M1.12, T-M1.13, T-M1.14, T-M1.10 (waits upstream). Required CI: docs-check, secrets-scan, backend, web, contract-drift, e2e-smoke. The backend check can flake (T-M1.14): read the log, re-run once, record it. Local: ./scripts/dev-up.sh; ./scripts/gate.sh (ENGLMS_TASK=<id>). After 2026-10-01 check backend-coverage uploads (T-M1.8 AC6). Run ./scripts/gitlab-sync.sh after each merge and on branches under review.

DO:
1. Open the PR for docs/T-M1.12-packet (template). One fresh docs-reviewer reviews it; fix findings; after CI is green for the final head, post "DOCS-REVIEW T-M1.12: PASS" then "LC-APPROVED T-M1.12"; merge ONLY via ./scripts/merge-gate.sh --dry-run <pr> (the flag FIRST: a trailing --dry-run merges, DEC-074), then without it, from an up-to-date develop; gitlab-sync.
2. The PO start signal is DEC-075. Implement on chore/T-M1.12-merge-gate-polish (LC), AC1-AC5 exactly, with tests; evidence/T-M1.12/.
3. G3: a fresh docs-reviewer (DOCS-REVIEW), read-only, text report; re-test via SendMessage. Fix S1/S2; defer S3/S4 only via a DEC + backlog task. After CI is green for the final head: verdict, LC-APPROVED, merge-gate. The review record goes to evidence/T-M1.12/review/docs.md on the next docs branch.
4. Post-merge: the merge recorded on a new branch; the next packet (T-M1.13 or T-M1.14) to G0; progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. Agents can't run git merge or gh pr merge, and can't write report files (record their text yourself). Each Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12. Bash loops, not zsh. Stage explicit paths. Run ./scripts/check-docs.sh bare before committing (no forward DEC references; progress.json schema). Feature/docs PRs must change progress.json. Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: at ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.12 is merged via merge-gate with CI green and PASS/APPROVED verdicts, the review is recorded, the next packet is written, and the state and handoff are committed and pushed. OR the context budget is reached and a complete handoff prompt has been printed.
