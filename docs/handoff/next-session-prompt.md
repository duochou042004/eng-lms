You are resuming Eng-LMS (a private 1:1 teaching workspace for ONE English tutor and their students; a flexible LMS, NOT a school/centre LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor) in /home/kali/App_sources/Eng-LMS. Remote: https://github.com/duochou042004/eng-lms (private, default branch develop).

Read in order: CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, then the current task packet in docs/tasks/.

State: the M0 planning baseline is PO-approved and merged. M1 is in progress. T-M1.1 (repo governance + README) is in PR #1 or merged: check progress.json and `gh pr list --state all`. T-M1.2 (backend skeleton via spring init, Boot 4.1, Java 25, Maven) is READY.

Do next:
1. If PR #1 is open: make sure CI is green, that a DOCS-REVIEW T-M1.1 and an LC-APPROVED T-M1.1 comment exist, then run ./scripts/merge-gate.sh --dry-run <n> and ./scripts/merge-gate.sh <n>. Record the merge commit and CI URLs.
2. Start T-M1.2 on feature/T-M1.2-backend-skeleton from an updated develop, following its packet exactly (the backend-implementer role and the backend-module and db-migration skills). Then open a PR, get an independent QA verdict, and have the LC merge through merge-gate.
3. Before T-M1.4, ask the PO to approve enabling the persistent user service podman.socket.

Rules: docs/09-harness/coding-agent-rules.md and docs/06-quality/quality-gates.md. Implement only the packet's scope. Never push develop/master directly (pre-push hook: run ./scripts/install-hooks.sh). Only the LC merges, via scripts/merge-gate.sh (branch protection is unavailable, DEC-031). Put evidence in evidence/<task>/ and update progress.json + docs/handoff before stopping. Near ~500k context tokens, follow docs/09-harness/session-handoff-protocol.md. Outward-facing actions need PO approval.

Environment: in each shell, source ~/.sdkman/bin/sdkman-init.sh (JDK 25.0.4, Boot CLI 4.1.0) and ~/.nvm/nvm.sh (Node 24.21, pnpm 12.6). No global Maven (use the wrapper). Podman 5.8.6 is rootless; its user socket is disabled. Use full image names (docker.io/library/postgres:18). gh is authenticated as duochou042004.
