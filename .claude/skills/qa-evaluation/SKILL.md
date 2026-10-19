---
name: qa-evaluation
description: Run the independent black-box QA protocol for one Eng-LMS task or a milestone regression and produce a verdict with evidence. Use at gate G3 (fresh context only, never the implementer's session).
---

# QA evaluation (independent)

Authoritative: `docs/06-quality/qa-protocol.md`.

1. **Prepare:** check out the PR branch; start the DB (`./scripts/dev-up.sh`); build and run the packaged app with the `e2e` profile; seed the QA world (`./scripts/seed-e2e.sh`).
2. **Plan:** in `qa/plans/<task-id>.md`, map each AC → scenarios (happy, edge, negative, **isolation**), viewports and a11y checks, plus a 30–60 min exploratory charter.
   Do **not** read the implementation diff or the implementer's tests yet.
3. **Execute:** automated checks in `qa/e2e/<task-id>.spec.ts` (Playwright) + a manual exploratory session using the browser tools. Always include:
   student B vs A URLs (expect 404) · a `SECRET-*` scan of student network responses · keyboard-only · 360/768/1280 · the loading, empty, error and offline states · vi/en · scope check.
   **Combined mode** (tiers M/H, qa-protocol §2a): in the same session walk the `ux-review` checklist and add its verdict line.
4. **Evidence:** the report text (template §4) + an axe summary; screenshots stay local (git-ignored), described in the report. Your minutes for the G3 cost table.
5. **Verdict:** `QA-VERDICT <task-id>: PASS | PASS WITH MINOR | FAIL` as the first line (the LC posts it). Any S1/S2/SCOPE finding means FAIL. Text only: no PR comments.
6. **Delta re-check** after an S1/S2 or behaviour-changing S3 fix (qa-protocol §2b): only the findings, the changed files and their specs; append; never rewrite the history.

Write only in `qa/**` and `evidence/<task-id>/qa/**`.
