# Independent QA Protocol

> Purpose: separate *building* from *judging*. Implementation tests prove the code does what the implementer thinks. QA proves the product does what the
> **spec** says, from the outside. Trace: PO directive (HoH, "separate implementation tests from independent QA").

## 1. Independence rules

1. The QA Evaluator runs in a **fresh agent context** (a new session or subagent) and gets **only**: the task packet (goal and ACs), the relevant docs (FRs,
   ux-flows, design standards), and the running app / branch build. It **does not read** the implementation diff or the implementer's tests before
   forming its verdict. It may read them afterwards to write precise findings.
2. QA writes checks only under `/qa` and evidence only under `evidence/<task>/qa/`. QA **never edits** `backend/`, `web/` or `e2e/` (path-ownership check,
   agent-roles.md §3).
3. The implementer never edits `/qa`. A disagreement about an AC's interpretation goes to the LC, who records a DEC.
4. QA may be the same model family as the implementer, but never the same session.

## 2. Procedure per task

```text
1. Prepare   : verify the checkout is on the PR head (the LC switches branches, DEC-094); ./scripts/dev-up (DB) ; build & run packaged app with e2e profile ; seed QA world (scripts/seed-e2e)
2. Plan      : write qa/plans/<task-id>.md — each AC → scenario(s) (happy, edge, negative, isolation), viewports, a11y checks, exploratory charter
3. Execute   : automated scenarios (qa/e2e/<task-id>.spec.ts, Playwright) + manual exploratory session (timeboxed 30–60 min) with notes
4. Evidence  : evidence/<task-id>/qa/{report.md, playwright-report link or summary, a11y.json}; screenshots stay local (git-ignored PNGs, DEC-131 (8)):
               the report describes what each one shows
5. Cost      : one row per round in the summary's G3 cost table (evidence-protocol §2): agent tokens and minutes from the Agent result
6. Verdict   : PASS | PASS WITH MINOR (S3/S4 only) | FAIL (any S1/S2/SCOPE) — the first line of the returned text; the LC records it and posts
               "QA-VERDICT <task-id>: PASS|FAIL" after CI is green on the final head (reviewers return text only: no PR comments, no files in the tree)
7. Re-check  : a delta re-check (§2b), only after an S1/S2 fix or a behaviour-changing S3 fix; append to the report (never overwrite history)
```

### 2a. Combined QA+UX pass (tiers M and H, DEC-131 (4))

One fresh reviewer runs the procedure above **and** the `ux-review` checklist in the same app session (same build, same seeded data, the three
mandatory viewports, vi and en). It returns one text with two verdict lines first, `QA-VERDICT <task-id>: …` and `UX-REVIEW <task-id>: …`, a
single findings table (ID prefix `QA-` or `UX-`), and the UX rulings. Independence is unchanged (no implementation reading before the verdict
draft). For tier H the SEC review is a separate agent; the LC may split UX into its own agent for new shared `ui/` primitives.

### 2b. Delta re-check

Scope: the findings being closed, the files changed since the verdict (`git diff <verdict head>..<new head> --stat`) and the specs covering
them. Run the changed specs ×3 (and ×20 when they cover focus, loading or keyboard behaviour). No full AC regression, no reviewer gate run
(CI on the new head is the regression), unless the LC names a wider scope because the fix touched a shared piece.

**Tooling (T-M1.6, DEC-057):** `qa/` has its own pinned Playwright package and config, independent of the implementer's `e2e/`
(6 reference viewports; `QA_ENGINES=all` adds Firefox and WebKit for the milestone regression). See `qa/README.md`. The packaged app for step 1
comes from `scripts/e2e-run.sh` (the jar with the SPA) or the image; the e2e profile and `scripts/seed-e2e` arrive with the first data (M2).

## 3. Standard scenario checklist (apply what is relevant)

- **Happy path** per AC, at `phone-small`, `tablet` and `laptop`.
- **Validation:** empty, too long, invalid formats, boundary values (from validation-rules.md).
- **State:** loading (throttled network), empty (first use and filtered), error (kill the backend / 500 injection in the e2e profile), offline (for autosave areas), stale version (two tabs).
- **Isolation:** log in as student B and try student A's URLs (lessons, work, files, materials): expect the 404 page. Look for tutor-private data in network responses (DevTools / HAR scan for the `SECRET-*` markers).
- **Keyboard only:** complete the flow. Check visible focus and focus return.
- **Screen reader spot check:** new components announce the correct name, role and state.
- **Responsive:** no horizontal scroll; sticky footers do not cover inputs with the keyboard open (mobile emulation); long Vietnamese names wrap.
- **i18n:** switch to en and vi. No missing keys, and no English leaking into the vi UI.
- **Budgets:** step count for the affected critical flows.
- **Repeat runs (DEC-088, DEC-131 (7)):** the gate already runs the new or changed specs ×3 (`--repeat-each=3`, no retries); QA reruns them ×20
  on `phone-small`, `tablet` and `laptop` only when they cover changed focus, loading or keyboard behaviour (step budgets). An intermittent failure is a
  flaky-test finding under test-strategy §3; a consistent failure is a defect.
- **Scope:** anything present that is not in the ACs is flagged `SCOPE`.

## 4. Report template (`evidence/<task-id>/qa/report.md`)

```markdown
# QA Report — <task-id> <title>
Verdict: PASS | PASS WITH MINOR | FAIL · Build: <commit sha> · Date: · Evaluator session: <id>
## Environment
## AC results
| AC | Scenario(s) | Viewports | Result | Evidence |
## Exploratory charter & notes
## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
## Accessibility summary (axe + manual)
## Isolation / privacy checks
## Re-test log
```

## 5. Milestone regression

The milestone regression is the only full regression (per-task QA runs targeted specs, DEC-131 (7)). At each milestone gate, QA runs `qa/regression/*.spec.ts` (accumulated scenarios) on all six viewports and three engines, plus a 90-minute exploratory
session on the milestone's user journeys. The report goes to `evidence/<milestone>/qa-regression.md`.
