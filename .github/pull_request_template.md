## Task
<!-- e.g. T-M2.3 — link the packet -->
Packet: docs/tasks/<task-id>-<slug>.md

## Trace
SPEC §… · FR-… · NFR-… · DEC-… · ADR-…

## Summary
<!-- What changed and why (2–5 bullets). No untraced features. -->

## Screenshots (UI changes: phone-small 360×740, tablet 768×1024, laptop 1280×800)
<!-- Local only, never committed (DEC-131): list the screens and states checked, or "n/a". Risk tier: H / M / L -->

## Checklist
- [ ] Only the packet's acceptance criteria are implemented (scope guardrail answered in the packet)
- [ ] `./scripts/gate.sh` green once on the final head; log in `evidence/<task-id>/`; UI: the self-check list ticked in the summary
- [ ] Tests added or updated at the right levels; none removed or weakened
- [ ] New endpoints: `@Audience` + authz-matrix + isolation cases
- [ ] UI: design-system components and tokens only; all states; vi + en; axe clean; keyboard pass; 3 viewports
- [ ] Docs updated (api-catalog, data-model, module-boundaries, tech-stack, … as applicable)
- [ ] `progress.json` updated; `evidence/<task-id>/summary.md` complete
- [ ] New dependency? Justified in the packet + tech-stack.md (+ ADR if architectural)

## Evidence
evidence/<task-id>/summary.md

## Reviews (posted as comments)
`QA-VERDICT <task-id>: …` · `SEC-REVIEW <task-id>: …` (if triggered) · `UX-REVIEW <task-id>: …` (if UI) · `LC-APPROVED <task-id>`
