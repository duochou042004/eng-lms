# CLAUDE.md — Agent entry point for Eng-LMS

Eng-LMS is a **private 1:1 teaching workspace for one tutor and their students**. It is a flexible LMS: *not* a school or centre LMS, SaaS, marketplace, booking,
payment, chat, conferencing, Drive clone or AI tutor. Product source of truth: `docs/00-sources/personal_english_tutor_teaching_workspace_spec.md` (immutable).

## Read order at every session start (no exceptions)
1. `progress.json`: the current phase, task, branch, status, blockers and pending PO decisions.
2. `docs/handoff/HANDOFF.md`: the narrative state and next steps.
3. The current task packet in `docs/tasks/`, then the docs it lists.
4. `docs/09-harness/coding-agent-rules.md`: the binding rules (the summary below is not a substitute).

If there is no `ready` or `in_progress` packet, you may only do Lead-Coordinator planning work. **Never start product code without a ready packet
and the PO-approved planning baseline** (quality gate G0).

## Non-negotiables (summary)
- **Scope:** implement only the packet's ACs. Anything untraced → an open question, not code (`docs/01-product/scope.md` §6).
- **No hard-coded curricula or exam semantics** (TOEIC, IELTS, THPT…). These are tutor data. Generic engines only.
- **Student isolation:** `/api/v1/student/**` handlers never take a `studentId`. Owner-scoped queries return 404. Audience DTOs. Private tutor data is never exposed (ADR-0016).
- **Git:** branch from `develop` (`feature/|fix/|docs/|chore/<task-id>-<slug>`). Never commit to `develop` or `master`. No force-push. Only the Lead Coordinator merges, via `scripts/merge-gate.sh`.
- **Quality:** `./scripts/gate.sh` green; tests with every change; never weaken tests; evidence in `evidence/<task-id>/`; independent QA before merge.
- **Frontend:** `web/src/ui/` components and tokens only; all states; vi + en strings; verify at 360 / 768 / 1280; WCAG 2.2 AA.
- **Stack:** Java 25 + Spring Boot 4.1 (Modulith, JPA, Flyway, PostgreSQL 18), React + TS + Vite, Podman. No new infrastructure without an ADR.
- **Memory:** the repo is the memory. Update `progress.json` + the handoff before stopping. Near ~500k tokens of context, follow `docs/09-harness/session-handoff-protocol.md`.
- **Outward-facing actions** (creating repos, pushing to new remotes, deploying, host settings, paid services) need explicit PO approval.

## Shell notes
Every Bash call is a fresh shell: `source ~/.sdkman/bin/sdkman-init.sh` (JDK 25, Boot CLI) and `source ~/.nvm/nvm.sh` (Node 24) as needed.
Podman is rootless. Use fully qualified image names (`docker.io/library/postgres:18`).

## Map
Docs index: `docs/README.md` · Roles: `docs/09-harness/agent-roles.md` · Gates: `docs/06-quality/quality-gates.md` · Subagents: `.claude/agents/` · Skills: `.claude/skills/`.
