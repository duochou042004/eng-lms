Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop) and deliver task T-M1.4 (local stack + Testcontainers on rootless Podman) through all quality gates, then stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. Flexible LMS, NOT a school/centre LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, then docs/tasks/T-M1.4-local-stack.md and the docs it lists (development-setup §2/§3, ADR-0012). Work on branch feature/T-M1.4-local-stack (it holds only bookkeeping; if develop moved: gh pr update-branch, never a local git merge). T-M1.4 needs the PO start signal: confirm it if this prompt doesn't carry it.

STATE: M1: T-M1.1 (f1e3caa), T-M1.2 (ae9ac5d; backend skeleton) and T-M1.3 (8b9d938; web skeleton) are merged. Required CI: docs-check, secrets-scan, backend, web. The user podman.socket is ENABLED (DEC-044): for local Testcontainers, export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock TESTCONTAINERS_RYUK_DISABLED=true (52/52 pass). Deferred follow-ups: T-M1.7, T-M1.8, T-M1.9 (T-M1.9 before the M2 routes).

DO:
1. Implement T-M1.4 exactly per its packet (AC1-AC5): deploy/compose.dev.yaml with postgres:18 pinned by DIGEST on 127.0.0.1:5432 plus a healthcheck and volume; .env.example (+ .env git-ignored); scripts/env.sh (fails clearly if the socket is inactive); scripts/dev-up.sh / dev-down.sh (--purge); script tests with stubs in scripts/tests (run by run-all.sh); the local verify proof with no leftover containers. Update development-setup §2/§3 and tech-stack §7.
2. Evidence in evidence/T-M1.4/ (summary AC->proof, digest resolution, dev-up/down logs, local verify log, script tests, CI links). Update progress.json.
3. Open the PR (template). QA: spawn ONE fresh general-purpose agent following .claude/agents/qa-evaluator.md (black-box; it returns text; no commits, comments or merges). Fix S1/S2; defer S3/S4 only via a DEC + backlog task. After the final head commit, post "QA-VERDICT T-M1.4: <verdict>" (first line, exact token), then "LC-APPROVED T-M1.4", and merge ONLY with ./scripts/merge-gate.sh from an up-to-date develop checkout (--dry-run first). Commit the QA report on qa/T-M1.4 (PR, LC-APPROVED, merge-gate).
4. Post-merge: record the merge on a new branch for the next task, write the T-M1.5 packet (single image + same-origin SPA serving, gate.sh, contract-drift CI; OQ-16 JaCoCo default = here) to G0, and update progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. Agents can't run git merge or gh pr merge. Every Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12 (no -s). Fully qualified images. Outward-facing actions and host settings need PO approval: ask, don't do.

CONTEXT BUDGET: keep context lean. At ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.4 is merged via merge-gate with CI green and a PASS QA verdict, the QA report committed, the T-M1.5 packet written, and state and handoff committed and pushed. OR the context budget is reached and a complete handoff prompt has been printed.
