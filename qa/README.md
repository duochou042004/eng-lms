# qa/ — Independent QA workspace

Owned by the **QA Evaluator** (qa-protocol §1, agent-roles §3). Implementers never edit this folder, and QA never edits `backend/`, `web/` or `e2e/`
(enforced by `scripts/check-path-ownership.sh`). Changes arrive on `qa/<task-id>` branches together with the QA report.

## Layout (qa-protocol §2)

| Path | Content |
|---|---|
| `plans/<task-id>.md` | The QA plan: each AC → scenarios (happy, edge, negative, isolation), viewports, a11y checks, exploratory charter |
| `e2e/<task-id>.spec.ts` | Automated black-box scenarios for one task (Playwright) |
| `regression/*.spec.ts` | Accumulated scenarios for the milestone regression (all six viewports × three engines) |

Evidence goes to `evidence/<task-id>/qa/` (`report.md`, screenshots, a11y results), never here.

## Running

QA has its own pinned toolchain (separate from `e2e/`, DEC-057). Start the packaged app first, for example with the image
(`podman run --read-only --tmpfs /tmp --network host --env-file .env englms:dev`) or the jar built by `scripts/e2e-run.sh`.

```bash
cd qa && pnpm install --frozen-lockfile && pnpm browsers   # once
pnpm test                                                 # all six viewports, Chromium (QA_BASE_URL, default http://localhost:8080)
pnpm test --project=phone-small --project=tablet --project=laptop
QA_ENGINES=all pnpm test regression/                      # milestone regression: Chromium, Firefox, WebKit
```

Tests run with no retries. A flaky scenario is a finding, not something to retry.
