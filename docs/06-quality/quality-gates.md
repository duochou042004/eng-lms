# Quality Gates and Definition of Done

> A gate is **binary**: every check passes with evidence, or the gate fails. Evidence lives in `evidence/<task-id>/` (evidence-protocol.md).
> Owners: **LC** = Lead Coordinator, **PO** = Product Owner (human), **QA** = Independent QA Evaluator, **SEC** = Security Reviewer, **UX** = UX Reviewer.

## G0 Ready gate (before implementation starts). Owner: LC

- [ ] The task packet is complete (task-packet-template.md): goal, trace (SPEC/FR/NFR/DEC), scope, **out of scope**, **guardrail answers**, acceptance
      criteria, test plan (implementation + QA), evidence list, affected docs, risks, and an estimate ≤ 2 agent-days.
- [ ] Dependencies are merged. Open questions affecting the task are answered, or a default is accepted.
- [ ] The branch is created from an up-to-date `develop`: `feature/<task-id>-<slug>` (or `fix/`, `docs/`, `chore/`).
- [ ] `progress.json` has the task set to `in_progress` with the branch name.
- **Special G0 for M1 onwards:** the M0 planning baseline has been **approved by the PO** (recorded in the decision log).

## G1 Local implementation gate. Owner: Implementer

- [ ] `./scripts/gate.sh` is green (backend verify, web lint, typecheck, test and build, bundle budget, contract drift, docs check, E2E on the mandatory viewports if UI changed).
- [ ] New and changed behaviour is covered by tests at the right level. No test was deleted or disabled without a DEC entry.
- [ ] UI changes: screenshots at `phone-small`, `tablet` and `laptop` for each changed screen in its main states, plus the axe results → `evidence/<task>/impl/`.
- [ ] Docs updated in the same branch (api-catalog, data-model, module-boundaries, tech-stack, …) and `progress.json` updated.
- [ ] `evidence/<task>/summary.md` has an implementation section (commands, results, known limitations).

## G2 Pull request gate. Owner: CI + Implementer

- [ ] PR opened against `develop` with the template fully filled in (trace, checklist, evidence links).
- [ ] Required CI checks are green: `backend`, `web`, `e2e-smoke`, `contract-drift`, `docs-check`, `secrets-scan` (names fixed in ci-cd.md).
- [ ] The branch is up to date with `develop`. There are no merge conflicts.
- [ ] Conventional commit messages with a `Task: <id>` trailer.

## G3 Independent evaluation gate. Owners: QA (always), SEC (if triggered), UX (if the UI changed)

- [ ] **QA verdict PASS** (qa-protocol.md): every AC verified black-box, exploratory charter run, viewports checked, evidence in `evidence/<task>/qa/`.
- [ ] **SEC sign-off** when the PR touches `identity`, `web.student`, `files`, sanitisation, `SecurityConfig`, migrations with personal data, or adds an endpoint.
- [ ] **UX sign-off** when the PR changes UI: design-system compliance, states, responsive rules, the accessibility checklist, step budgets for affected flows.
- [ ] Findings are resolved or explicitly deferred through a DEC entry with a follow-up task ID. **Severity S1/S2 findings cannot be deferred.**
- **Docs and chore packets (no product behaviour change):** G3 is satisfied by a **docs review**. A fresh-context reviewer checks consistency, links,
  traceability and that no scope was added, and posts `DOCS-REVIEW <task-id>: PASS`. Planning baselines and scope changes additionally require
  **PO approval** (`PO-APPROVED <task-id>`, recorded in the decision log).

## G4 Merge gate. Owner: LC

- [ ] G1–G3 are satisfied. The LC reviews the diff for scope (untraced features → reject), architecture and docs.
- [ ] LC approval recorded as a PR review or comment `LC-APPROVED <task-id>`, and in `progress.json` (`approvals`).
- [ ] Merge with a merge commit (`gh pr merge --merge --delete-branch`), which is the `--no-ff` equivalent and keeps task history grouped.
- [ ] After the merge: `progress.json` on develop reflects `done` (it arrived with the branch). The next task packet is set to `ready`. The handoff is updated.

## G5 Milestone gate. Owners: LC + PO

- [ ] Every packet in the milestone is merged, and the milestone exit criteria in roadmap.md are met.
- [ ] Milestone regression: full E2E on all 6 viewports × Chromium, plus smoke on Firefox and WebKit. The QA milestone report is in `evidence/<milestone>/`.
- [ ] Risk register, decision log and roadmap reviewed (retrospective notes in `evidence/<milestone>/retro.md`).
- [ ] For user-facing milestones (M2, M3, M5, M7): the PO demo (a recorded walkthrough or a live session) is accepted, and the feedback is logged as tasks or DEC entries.

## G6 Release gate (`develop` → `master`). Owners: LC + PO

- [ ] A release branch `release/x.y.z` is cut from develop. Only fixes go in after the cut.
- [ ] The full regression (G5 level) is green on the release branch.
- [ ] Security: the checklist in security.md §11 on the whole diff since the last release; dependency scan (no critical CVEs); Trivy image scan; header scan.
- [ ] Accessibility: a manual WCAG 2.2 AA audit of F1–F9 (keyboard + NVDA + VoiceOver iOS) with no open S1/S2 issues.
- [ ] Performance: NFR-PERF budgets verified on the seeded dataset (report attached).
- [ ] Data safety: a migration dry run on a copy of production data (from M8 on). **Backup → restore drill** on a clean host (RTO measured).
- [ ] Docs: CHANGELOG, release notes, runbooks updated. The version is bumped.
- [ ] **PO approval** recorded. Then: merge `release/x.y.z` → `master` (merge commit), tag `vX.Y.Z` (annotated), merge back → `develop`, GitHub release, deploy per deployment.md.

## Finding severities (used by QA, SEC and UX)

| Sev | Meaning | Examples | Merge? |
|---|---|---|---|
| S1 Critical | Security or privacy breach, data loss, core flow broken | Student sees another student's work; lost submissions | Block |
| S2 Major | An AC is not met; a critical flow is over budget; an a11y blocker; a responsive break on a mandatory viewport | Wrap-up needs 11 steps; horizontal scroll at 360 px | Block |
| S3 Minor | Non-critical deviation from standards | Inconsistent spacing; a missing empty-state example | Merge allowed with a follow-up task |
| S4 Trivial | Polish | Copy wording | Backlog |
| SCOPE | Untraced feature or scope creep | "Added a chat widget" | Block until the PO decides |
