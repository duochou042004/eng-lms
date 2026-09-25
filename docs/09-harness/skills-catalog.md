# Skills Catalogue (project skills for agents)

> Skills are reusable, versioned instructions in `.claude/skills/<name>/SKILL.md`. They **point to** the docs (single source of truth) and add
> checklists and procedures. They do not duplicate the standards. A skill is updated in the same PR as the doc it summarises.

| Skill | Used by | Purpose | Key sources |
|---|---|---|---|
| `task-packet` | LC | Write a G0-complete task packet from the backlog | task-packet-template.md, scope.md §6, quality-gates G0 |
| `evidence-and-handoff` | all | Record evidence, update progress.json, and write the handoff and next-session prompt (≤ 4,000 characters) | evidence-protocol.md, session-handoff-protocol.md |
| `backend-module` | BE | Add or change a Modulith module feature: packages, API, events, migrations, tests, docs | module-boundaries.md, api-conventions.md, data-model.md, coding-agent-rules.md |
| `db-migration` | BE | Write a safe Flyway migration (naming, expand/contract, constraints, indexes, docs sync) | data-model.md §1, §4 |
| `authz-isolation` | BE, SEC | Register endpoint policies, add authz-matrix and isolation-scan cases | security.md §4, test-strategy.md §2 |
| `frontend-standards` | FE, UX | Build UI with the design system: states, responsive rules, a11y, i18n, step budgets | design-system.md, responsive-standards.md, interaction-states.md, accessibility.md |
| `ux-review` | UX | Review checklist and evidence format for UI PRs | design-system §6, responsive §3, accessibility §2, ux-flows checklist |
| `qa-evaluation` | QA | Run the independent QA protocol and write the report | qa-protocol.md |
| `security-review` | SEC | Run the security checklist and write the review | security.md §11 |

Built-in skills available in the environment (e.g. `code-review`, `security-review`, `simplify`) may be used **in addition to**, not instead of, the
project checklists. Third-party skills, plugins and MCP servers: not installed without LC + PO approval (plugin-store-spec §9).

## Skill authoring rules

1. Frontmatter: `name`, `description` (when to use it, in one sentence with trigger phrases).
2. Body: when to use it · inputs · procedure (numbered) · checklist · outputs (files and paths) · links to the docs.
3. ≤ 150 lines. Link to docs instead of copying them.
4. Every skill change is logged in `CHANGELOG.md` under "Harness".
