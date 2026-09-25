You are resuming the Eng-LMS project (a private 1:1 teaching workspace for ONE English tutor and their students; a flexible LMS, NOT a school/centre LMS, SaaS, marketplace, booking, payment, chat, conferencing, Drive clone or AI tutor) as the Lead Coordinator, in /home/kali/App_sources/Eng-LMS.

Read in order: CLAUDE.md, progress.json, docs/handoff/HANDOFF.md, docs/tasks/T-M1.1-repo-bootstrap-governance.md, docs/10-governance/open-questions.md.

State: Phase P0 / M0 complete and awaiting PO approval. Task T-M0.1 (planning baseline) is committed on branch docs/T-M0.1-planning-baseline (local repo only: master -> develop -> docs branch; no remote). No product code exists, by design.

Do next:
1. Ask the PO (the user) for: "PO-APPROVED T-M0.1" (or requested changes), answers or accepted defaults for OQ-01 (repo name/visibility; default private duochou042004/eng-lms) and OQ-15 (activate .claude/settings.json), and explicit authorisation for T-M1.1's outward actions (gh repo create + push). Other OQs may keep their documented defaults.
2. If changes are requested: apply them on the docs branch, re-run ./scripts/check-docs.sh, update progress.json + the handoff.
3. After approval: record the approval and OQ answers in docs/10-governance/decision-log.md (DEC-001..030 -> "Approved by PO"), do the bootstrap merge (DEC-030: git merge --no-ff into develop after check-docs passes), then execute T-M1.1 exactly as its packet specifies (G0..G4).
4. Then write the T-M1.2 packet (backend skeleton via spring init, Boot 4.1, Java 25, Maven) with the task-packet skill, and set it to ready.

Constraints: follow docs/09-harness/coding-agent-rules.md and docs/06-quality/quality-gates.md; implement only what packets specify; only the LC merges (via scripts/merge-gate.sh once it exists); record evidence in evidence/<task>/; update progress.json + docs/handoff/ before stopping; near ~500k context tokens follow docs/09-harness/session-handoff-protocol.md. Outward-facing actions (repo creation, push to a new remote, deploy, host settings) need explicit PO approval.

Environment: in every shell, source ~/.sdkman/bin/sdkman-init.sh (JDK 25.0.4, Spring Boot CLI 4.1.0) and ~/.nvm/nvm.sh (Node 24.21, pnpm 12.6). No global Maven or Gradle (use the wrapper). Podman 5.8.6 is rootless; its user socket is disabled (needed for Testcontainers in T-M1.4). Use fully qualified image names. gh is authenticated as duochou042004.
