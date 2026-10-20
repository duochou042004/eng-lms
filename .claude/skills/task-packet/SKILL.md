---
name: task-packet
description: Write or refine a G0-complete task packet for Eng-LMS from the backlog (Lead Coordinator). Use when preparing the next task, splitting a large task, or when asked to "plan the next task".
---

# Task packet (Lead Coordinator)

**Inputs:** the backlog stub (`docs/tasks/backlog.md`), `progress.json`, the relevant FR/NFR/ADR docs, open questions.

## Procedure
0. Read `docs/09-harness/lessons-learned.md` and grep the touched area for `shortcut:` markers whose trigger this packet fires.
1. Copy `docs/09-harness/task-packet-template.md` → `docs/tasks/<task-id>-<slug>.md`.
2. Fill **Trace** with SPEC §, FR/NFR IDs, DEC/ADR IDs. If you can't trace a scope item, remove it or raise an OQ (`docs/10-governance/open-questions.md`).
2a. **Contradiction scan** (lessons L-03): for each touched area grep the kept E2E and unit assertions, interaction-states, api-conventions,
   module-boundaries and security.md; name every conflict and its resolution in Design notes (a kept assertion changes only by a DEC).
3. Answer the five **guardrail** questions (`docs/01-product/scope.md` §6) explicitly.
4. Write **testable ACs**. Reuse or refine the FR's ACs; don't invent new behaviour. Add UX step budgets for affected flows (`docs/05-frontend/ux-flows.md`).
4a. Say what happens when a new check finds a real defect outside the packet's allowed change: the implementer reports it as an OQ at once,
   `test.fail` only until the LC rules, and the LC rules before G3 (L-10).
5. Test plan: implementation levels + **independent QA focus** + the isolation and authz entries for any new endpoint.
6. Evidence list: summary (self-check list, G3 cost table), one gate log on the final head + green CI, local viewport screenshots for UI (not committed),
   and the reviews of the **risk tier** (quality-gates G3: H = SEC trigger → SEC + QA(+UX); M = UI/behaviour → one combined QA+UX reviewer; L = docs review).
   Set the **Risk tier** field. For UI packets fill the **UI rules** block (column shares and break rules, focus targets, layering, validation rules, vi verbs; DEC-131).
   For packets that write data fill the **Domain rules** block (invariants, transitions incl. illegal ones, concurrency, idempotency, time zone, audit, audience; L-04).
7. Size check: ≤ 2 agent-days, ≤ ~10 ACs, one PR. Split otherwise (update the backlog).
8. Dependencies merged? Blocking OQs answered or defaults accepted? Then set the status to `ready` in the packet **and** in `progress.json` (`nextTask`/`currentTask`).
9. Run `./scripts/check-docs.sh`.

## Checklist (G0)
- [ ] Trace complete · [ ] Out of scope explicit · [ ] Guardrail answered · [ ] ACs testable · [ ] Test plan incl. QA focus
- [ ] Lessons read, contradiction scan, shortcut ledger · [ ] Evidence list · [ ] Risk tier · [ ] UI rules (UI packets) · [ ] Domain rules (data-writing packets) · [ ] Docs to update · [ ] Risks and assumptions · [ ] Reproducible commands · [ ] progress.json updated

See `docs/06-quality/quality-gates.md` G0 and `docs/09-harness/hoh-operating-model.md`.
