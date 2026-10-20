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

- [ ] `./scripts/gate.sh` is green **once on the final head** (backend verify, web lint, typecheck, test and build, bundle budget, contract drift, docs check, E2E on the
      mandatory viewports, then the new or changed specs ×3). CI is the second run; no second local run (DEC-131 (6)). The gate skips `backend` and
      `contract-drift` when nothing under `backend/` or `api/` changed (CI still runs them).
- [ ] New and changed behaviour is covered by tests at the right level. No test was deleted or disabled without a DEC entry.
- [ ] UI changes: screenshots at `phone-small`, `tablet` and `laptop` for each changed screen in its main states, plus the axe results → `evidence/<task>/impl/`
      (PNGs are git-ignored and stay local, evidence-protocol §3); the packet's **UI rules** block is met and the `frontend-standards` self-check list is ticked (in the returned summary text).
- [ ] Docs updated in the same branch (api-catalog, data-model, module-boundaries, tech-stack, …).
- [ ] The implementer returns the implementation summary (AC → proof, commands, results, self-check, known limitations); the LC records it in
      `evidence/<task>/summary.md` and updates `progress.json` before G2 (the harness blocks subagent summary writes, lessons-learned L-07).

## G2 Pull request gate. Owner: CI + Implementer

- [ ] PR opened against `develop` with the template fully filled in (trace, checklist, evidence links).
- [ ] Required CI checks are green: `backend`, `web`, `e2e-smoke`, `contract-drift`, `docs-check`, `secrets-scan` (names fixed in ci-cd.md).
- [ ] The branch is up to date with `develop`. There are no merge conflicts.
- [ ] Conventional commit messages with a `Task: <id>` trailer.

## G3 Independent evaluation gate. Owners: the reviewers of the packet's risk tier (table below)

Review effort follows the packet's **risk tier** (set by the LC at G0, DEC-131 (4)):

| Tier | When | Reviewers (each a fresh context, never the implementer) |
|---|---|---|
| **H** | The PR touches `identity`, `web.student`, `files`, sanitisation, `SecurityConfig`, migrations with personal data, authz, or adds an endpoint; or the LC triggers SEC in the packet | **SEC** as its own agent, plus QA (with the UX checklist in the same pass when the UI changed; the LC may split UX into its own agent for new shared `ui/` primitives) |
| **M** | The UI or product behaviour changed, no SEC trigger | **One combined QA+UX reviewer** (qa-protocol §2a): one app run, both checklists, both verdict lines |
| **L** | Docs, chore, scripts, tests only | Docs review (below) |

- [ ] **QA verdict PASS** (qa-protocol.md): every AC verified black-box, exploratory charter run, viewports checked, evidence in `evidence/<task>/qa/`.
- [ ] **SEC sign-off** for tier H.
- [ ] **UX sign-off** when the PR changes UI: design-system compliance, states, responsive rules, the accessibility checklist, step budgets for affected flows.
- [ ] Findings are handled by severity (DEC-131 (5)); a deferral is a DEC entry with a follow-up task ID. **Severity S1/S2 findings cannot be deferred.**
  - **S1/S2:** fixed in the task (the LC adds an AC citing the finding ID, DEC-088), then a **delta re-check** by the same reviewer role in a fresh
    context: only the findings and the files changed since the verdict, with targeted specs; no full regression and no reviewer gate run unless the LC asks.
  - **S3:** fixed in the task when cheap (no new behaviour beyond the finding, about an hour or less); the LC verifies the fix from its test and the diff.
    A reviewer re-check runs only when the fix changes behaviour. Otherwise a follow-up row in the backlog.
  - **S4:** batched into one polish packet per milestone, unless it is a one-line fix the LC verifies (supersedes DEC-088 for S4).
- [ ] `evidence/<task>/summary.md` has the **G3 cost** table (evidence-protocol §2).
- **Docs and chore packets (no product behaviour change):** G3 is satisfied by a **docs review**. A fresh-context reviewer checks consistency, links,
  traceability and that no scope was added, and returns `DOCS-REVIEW <task-id>: PASS`; the LC posts it. Planning baselines and scope changes additionally require
  **PO approval** (`PO-APPROVED <task-id>`, recorded in the decision log).

## G4 Merge gate. Owner: LC

- [ ] G1–G3 are satisfied. The LC reviews the diff for scope (untraced features → reject), architecture and docs.
- [ ] LC approval recorded as a PR review or comment `LC-APPROVED <task-id>`, and in `progress.json` (`approvals`).
- [ ] Merge with a merge commit (`gh pr merge --merge --delete-branch`), which is the `--no-ff` equivalent and keeps task history grouped.
- [ ] After the merge: `progress.json` on develop reflects `done` (it arrived with the branch). The next task packet is set to `ready`. The handoff is updated.

## G5 Milestone gate. Owners: LC + PO

- [ ] Every packet in the milestone is merged, and the milestone exit criteria in roadmap.md are met.
- [ ] Milestone regression (the only full regression; per task G3 runs targeted specs, DEC-131 (7)): full E2E on all 6 viewports × Chromium, plus smoke on Firefox and WebKit. The QA milestone report is in `evidence/<milestone>/`.
- [ ] Risk register, decision log and roadmap reviewed (retrospective notes in `evidence/<milestone>/retro.md`); `docs/09-harness/lessons-learned.md`
  updated; the `shortcut:` ledger reviewed (`grep -rnE '(shortcut|ponytail):'`, or `/ponytail-debt` where installed: any trigger the next milestone fires becomes a backlog item); the README roadmap row updated.
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
| S3 Minor | Non-critical deviation from standards | Inconsistent spacing; a missing empty-state example | Merge allowed: fixed in-task when cheap, else a follow-up task |
| S4 Trivial | Polish | Copy wording | Merge allowed: the milestone polish packet (one-line fixes in-task) |
| SCOPE | Untraced feature or scope creep | "Added a chat widget" | Block until the PO decides |
