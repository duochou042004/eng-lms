Resume Eng-LMS as Lead Coordinator in /home/kali/App_sources/Eng-LMS (private repo github.com/duochou042004/eng-lms, default branch develop) and finish task T-M1.3 (web skeleton, PR #4) through the remaining quality gates, then stop with a fresh handoff.

PRODUCT: a private 1:1 teaching workspace for ONE English tutor and their students. Flexible LMS, NOT a school/centre LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor. No hard-coded TOEIC/IELTS curricula. Source of truth: docs/00-sources/ (immutable).

START: read CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, docs/tasks/T-M1.3-web-skeleton.md and the PR #4 comments (UX round 1). Branch feature/T-M1.3-web-skeleton (if develop moved: gh pr update-branch 4, never a local git merge).

STATE: T-M1.2 merged (ae9ac5d). The PO approved T-M1.3 (DEC-042). T-M1.3 is implemented and CI was green (docs-check, secrets-scan, backend, web). UX round 1 = CHANGES REQUESTED (F1 44px controls, F2 error copy): fixed. F3/F5 deferred to T-M1.9 (DEC-043). UX round 2 and QA are NOT done yet.

DO:
1. Check PR #4 CI on the head. Start a local stack for reviewers: podman run docker.io/library/postgres:18 on 127.0.0.1:55432 (no socket needed); the backend jar (cd backend && ./mvnw -B -q package -DexcludedGroups=container) with SPRING_DATASOURCE_URL/PASSWORD and ENGLMS_META_DISPLAY_NAME="Lớp tiếng Anh cô Lan"; (cd web && pnpm dev --host 127.0.0.1 --port 5173). Kill by PID afterwards.
2. UX round 2: spawn ONE fresh ux-reviewer agent (read-only; returns text) at the new head, verifying F1/F2/F4/F6-F9 and re-checking 360/768/1280. Post its result to PR #4 with "UX-REVIEW T-M1.3: <APPROVED|CHANGES REQUESTED>" as the first line.
3. THEN QA: spawn ONE fresh general-purpose agent following .claude/agents/qa-evaluator.md (black-box vs AC1-AC10; the stack is running; it returns the report as text). Fix S1/S2; defer S3/S4 only via a DEC + backlog task.
4. After the final head commit, post "QA-VERDICT T-M1.3: <verdict>" (first line, exact token), then "LC-APPROVED T-M1.3", and merge ONLY with ./scripts/merge-gate.sh from an up-to-date develop checkout (--dry-run first).
5. Post-merge: commit the QA report on qa/T-M1.3 (PR, LC-APPROVED, merge-gate). The UX review file goes to evidence/T-M1.3/review/ux.md on a docs/ or chore/ branch (feature branches may not write reviewer evidence). Record the merge on a new branch for the next task, write the next packet (T-M1.4 if the PO approved the podman.socket, else T-M1.5) to G0, and update progress.json + docs/handoff/.

RULES: implement only the packet's scope; untraced ideas become open questions. Never push develop/master or force-push. Agents can't run git merge or gh pr merge. Every Bash call is a fresh shell: source ~/.sdkman/bin/sdkman-init.sh and ~/.nvm/nvm.sh. pnpm 12 (no -s flag). Use fully qualified images. Outward-facing actions and host settings (e.g. enabling podman.socket) need PO approval: ask, don't do.

CONTEXT BUDGET: keep context lean. At ~300-400k tokens or any context warning: finish the safe step, commit, update progress.json + HANDOFF.md, write a new goal-mode prompt (<= 4000 chars) to docs/handoff/next-session-prompt.md, run ./scripts/check-docs.sh, push, and print the prompt in chat.

DONE WHEN: T-M1.3 is merged via merge-gate with CI green (docs-check, secrets-scan, backend, web), UX APPROVED and a PASS QA verdict, the reports committed, the next packet written, and state and handoff committed and pushed. OR the context budget is reached and a complete handoff prompt has been printed.
