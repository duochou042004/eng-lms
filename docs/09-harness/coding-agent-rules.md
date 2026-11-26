# Coding-Agent Harness Rules

> Binding for every agent that changes this repository. `CLAUDE.md` summarises these rules. This file is the full version.
> Breaking a MUST rule is an S2 finding at minimum.

## 1. Session discipline

1. MUST start every session by reading, in order: `progress.json` → `docs/handoff/HANDOFF.md` → the current task packet → the docs listed in that packet.
2. MUST work on exactly one task packet in state `ready` or `in_progress`, on its own branch. Without a packet, the only allowed work is LC planning work.
3. MUST NOT rely on chat history as memory. Anything needed later goes into the repo (session-handoff-protocol.md).
4. MUST monitor context usage. At the threshold (≥ 500k tokens used, or the harness's context warning, whichever comes first), finish the current safe step,
   persist state and write the handoff (session-handoff-protocol.md §2).

## 2. Scope and traceability

1. MUST implement only what the packet's acceptance criteria require. MUST NOT add "nice to have" features. Propose them as OQs instead. Exception: an AC
   the LC adds under quality-gates G3 for an S1/S2 or a cheap S3 fix (DEC-088, DEC-131) is in scope.
2. MUST reference FR/NFR/DEC IDs in the commit trailer (`Task: T-M2.3`, `Refs: FR-STU-01`) and in the PR.
3. MUST apply the scope guardrail (scope.md §6) whenever something seems useful but is untraced. **Stop and ask**, don't build.
4. MUST record assumptions in the packet (and in `docs/01-product/assumptions.md` if they are product-level). Never guess silently.

## 3. Git

1. Branch from an up-to-date `develop`: `feature/`, `fix/`, `docs/` or `chore/` + `<task-id>-<slug>`. Never commit to `develop` or `master` directly. Never force-push shared branches.
2. Conventional Commits (`feat(students): add credentials card`). Small commits that each build. Trailers: `Task:`, `Refs:`, plus the co-author trailer if required.
3. Only the LC merges, through the merge gate (git-governance.md).
4. **One checkout, no git worktrees** (PO, DEC-094): all work happens in the main checkout (the PO's clone on the current device; `progress.json` `project.repoLocal`), so the PO can follow it in VSCode.
   Subagents that use the checkout (implementers, QA, SEC, UX, general-purpose) run there **one at a time** on the task branch (they build and run the
   app in the shared `backend/target`, `web/dist` and ports 8080/8081); read-only agents (docs review, search) may run beside one (§11, DEC-205).
   The LC alone switches branches, never while a subagent runs.
5. **Development-phase secrets rule** (PO, DEC-094, until T-M8.7 restores it): agents may read, create and edit `.env`, `.env.*` and `.data/**` for local
   development. They hold **dev-only values**: never a real or production secret, API key or personal data. They stay git-ignored, are never committed or
   pasted into evidence, PR comments or logs, and anything that needs a real secret is a PO action.

## 4. Testing

1. MUST write tests with the change (TDD where practical: failing test → code → refactor).
2. MUST NOT delete, skip or weaken tests (or relax assertions) to make a build pass. A needed exception gets a DEC entry.
3. MUST keep `./scripts/gate.sh` green before opening a PR, and attach its log to the evidence.
4. MUST inject `Clock` for anything time-based and never call `Instant.now()` or `LocalDate.now()` directly (an ArchUnit rule enforces this).
5. MUST prove every new check, guard, validation or gate rule failing on a violating input in the same PR (a fixture, a negative case or a
   mutation); gate tooling fails closed. A check never seen red is not done (lessons-learned L-01).
6. MUST read asynchronous state through a polling assertion (`expect.poll`, `toHave*`, `waitFor`), never a single read; no wall-clock bounds (L-05).

## 5. Backend rules

1. Module boundaries per module-boundaries.md: no access to other modules' `internal`; no cross-module JPA associations; IDs as value types.
2. Controllers are thin (api-conventions.md §9). `@Transactional` belongs on application services only. Constructor injection only.
3. JPA: `spring.jpa.open-in-view=false`; no `FetchType.EAGER` on collections; list queries use explicit fetch joins or projections; add a
   statement-count assertion for new list endpoints (NFR-PERF-04).
4. Migrations: new files only (never edit applied ones), naming per data-model.md, and data-model.md updated in the same PR.
5. Student-audience code follows ADR-0016 **without exception**. New student endpoint → isolation test + matrix entry.
6. Rich text passes through `HtmlSanitizer`. URLs go through `UrlPolicy`. Files go through `FilesApi`.
7. Errors are thrown as typed domain or application exceptions that map to Problem Details codes. Never return a raw 500 on purpose.
8. Logging: no secrets or personal data (security.md §10). Use structured key-values.

## 6. Frontend rules

1. Use `ui/` components only. No raw colour or spacing values (stylelint). No direct RAC imports outside `ui/`.
2. Every data view has the states in interaction-states.md. Every form follows its form rules.
3. Every new string is an i18n key in **both** `vi` and `en`.
4. Responsive: verify the mandatory viewports and keep the screenshots locally (git-ignored, evidence-protocol §3). No horizontal scroll. Meet the packet's UI rules block and tick the `frontend-standards` self-check list in the returned summary (the LC records it, L-07).
5. Accessibility checklist (accessibility.md §2) for every UI PR.
6. Server state only via TanStack Query hooks in `features/*/api`. No ad-hoc `fetch`.
7. Before building a new component, check the `ui/` inventory (design-system.md §3). If it is missing, propose adding it to `ui/` (UX review), not inline in a feature.

## 7. Forbidden (SPEC §33, §53 and the non-goals)

- Hard-coding curricula or exam semantics: identifiers or enums like `TOEIC*`, `IELTS*`, `THPT*`, `ExamType`, `Part5`, "band" logic. These are **user data**.
  `ForbiddenIdentifiersTest` scans `src/main` (case-insensitive) for exactly the list in test-strategy §4 rule 6: `toeic`, `ielts`, `thpt`, `examtype`, `part5`, `tenant`, `payment`,
  `invoice`, `openai`, `anthropic`, `chatgpt`. "Band" logic and the other items here can't be caught by a name scan; reviews check them.
- Assuming every student has a course, every lesson has video, every assignment is multiple choice, or everyone follows the same roadmap (SPEC §53).
- Adding: public registration, payments, chat or messaging, video conferencing, AI features, multi-tenant or multi-tutor concepts, parent accounts, booking.
- Adding infrastructure (Redis, Kafka, RabbitMQ, Elasticsearch, Kubernetes, microservices) or large libraries without an ADR.
- Seeding domain content (folders, tags, metrics, questions) in migrations.

## 8. Dependencies

A new dependency MUST be listed in the packet with its justification, added to tech-stack.md (§2/§3 + §7 pinned version), and be license-compatible
(permissive: MIT, Apache-2.0, BSD, EPL for JVM, MPL acceptable). Prefer the platform or existing dependencies. A dependency that adds architecture → ADR.
A version bump (Dependabot included) of a package named in a `shortcut:` comment (`grep -rnE '(shortcut|ponytail):.*<package>'`) needs a local
verification of the screens or paths that comment names, not only green CI; the LC holds the PR until then (lessons-learned L-11, DEC-139).

## 9. Spring Boot 4 / Java 25 pitfalls (verify against the official docs; do not code from Boot 2/3 memory)

1. Boot 4 uses **Jackson 3** (`tools.jackson.*` packages, `JsonMapper`). Jackson 2 annotations under `com.fasterxml.jackson.annotation` are still used, so check the docs.
2. Starters are modularised in Boot 4. Use the starters generated by `spring init`, and don't hand-copy Boot 3 artifact IDs.
3. Test support: use `@MockitoBean`/`@MockitoSpyBean` (`@MockBean` was removed). Boot 4 offers `RestTestClient` for MVC tests. Use the JUnit version from the BOM.
4. Spring Security 7: lambda DSL only; `authorizeHttpRequests`; check the SPA CSRF configuration API of the current version.
5. Spring Modulith version must match Boot 4.1 (check the compatibility matrix). The event registry schema comes from the JDBC starter.
6. Hibernate 7: check the JSON mapping annotations and the UUID generator style for v7.
7. Java 25: records, pattern matching, sealed types and virtual threads (`spring.threads.virtual.enabled=true`) are allowed. Preview features are **not** allowed.
When unsure, read the reference documentation (built-in browser or web fetch) and cite the URL in the PR.

## 10. Definition of done (task level)

G1 + G2 passed, G3 verdicts collected, docs and progress updated, evidence summary complete, handoff updated. See quality-gates.md.

## 11. Agent orchestration and execution efficiency (PO, DEC-205)

Binding for the LC and every agent that can spawn agents or Workflows. **Enforced** rules are checked by `scripts/hooks/agent-policy.sh`
(project hooks in `.claude/settings.json`: SessionStart, PreToolUse `Agent|Task|Workflow`, SubagentStart/Stop; ledger
`.claude/scratch/agent-policy/ledger.tsv`; test `scripts/tests/agent-policy.test.sh`). **Behavioural** rules have no runtime check; the LC
self-checks them at each task's G3 cost table and in the handoff.

1. **Inline first (behavioural).** Work the LC can do with its own tools (reading, docs, packets, records, small edits, `gh`) stays inline. A subagent only
   when it is required (an independent reviewer of the risk tier, an implementer role) or clearly cheaper (a wide search whose files the LC does not need).
2. **Coarse tasks (behavioural).** One task = one outcome and one PR; batch S4s, follow-ups and verification into the task that touches the area
   instead of new rows. Split only past ~2 agent-days or when two parts need different reviewers *and* different merges (task-packet step 7).
3. **One checkout (enforced, R1, no override):** one checkout-using subagent at a time (DEC-094); read-only agents may run beside it.
4. **Caps (enforced, R2/R3/R5):** at most 5 running subagents; 6 fresh subagents per session (Agent calls plus a Workflow's declared agents;
   `SendMessage` resumes are free); a Workflow script declares `// agents: N` with N ≤ 5. Prefer 3–5 for parallel read-only work. Over a cap: a
   line `BUDGET-OVERRIDE: <reason>` (≥ 20 characters) in the prompt or script, which the hook logs; the LC names each override in the handoff.
5. **Resume, don't respawn (enforced, R4):** a second fresh reviewer of the same role for the same task (any session) is denied; a delta re-check
   resumes the first reviewer with `SendMessage` (only the findings and the changed files). An override only when it cannot be resumed (a new session or device).
6. **Verify once (behavioural).** One gate run on the final head, CI as the second (DEC-131 (6)); reuse valid evidence; re-verify only the areas a
   change touches unless it is cross-cutting; stop when the ACs are met and no S1/S2 remains (S3/S4 per quality-gates G3). Write every
   status change (`progress.json`, packet Status, handoff) into the branch **before** asking for a review, except the verdict itself, so the
   reviewed head is the final head. S3/S4 fixes the LC makes after a PASS WITH MINOR need no new round (quality-gates G0); the one exception is
   merge-gate's exact token on a `docs/`/`chore/` branch (`DOCS-REVIEW <task>: PASS`): a resumed confirmation of the fix diff, which also
   records the verdict in the statuses.
7. **Measure (behavioural):** every task's summary keeps the G3 cost table (tokens, duration per agent) and adds the agent count; the LC reads the
   ledger at each merge (`cut -f3,5,6 .claude/scratch/agent-policy/ledger.tsv | sort | uniq -c`).
8. **Limits of enforcement:** the hook cannot see an agent's purpose (rules 1, 2, 6 are behavioural); an override is a logged speed bump, not a
   stop; Workflow agents are counted by the declared `// agents: N` (a script can still spawn more at run time; SubagentStart logs them); the
   ledger is local (`.claude/scratch/`, git-ignored) and starts empty on a new device; the hook fails open on its own error. Hooks load at
   session start: a session started before a change to them runs without it. Parallel calls in one message are serialised by a lock and an
   allowed spawn reserves its slot until SubagentStart (a reservation lapses after 10 min); a running entry lapses after 12 h (a longer
   agent no longer counts); a saved Workflow started by `name` is logged only (its script is not visible to the hook).
