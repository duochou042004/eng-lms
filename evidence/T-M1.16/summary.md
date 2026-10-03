# T-M1.16 evidence summary: review polish, Maven 3.10.0, deterministic step budget

Packet: `docs/tasks/T-M1.16-review-polish.md` · Branch `feature/T-M1.16-review-polish` (from `develop` `99b6ac5`) · PO start DEC-084 · Implementers: frontend-implementer
(items 1–5, 9; own worktree), LC (items 6–8). Detailed FE notes: `fe-notes.md`.

## AC → proof
| AC | Proof |
|---|---|
| AC1 | `fe-notes.md` AC1 table and `records/<project>/t-m1.16-ac1-switcher-{landing,tutor,student}.json`: on a slowed first load at 360/768/1280 the skeleton and the switcher are both 238 px (Δ 0, was 30 px), inline-end Δ 0, CLS ≤ 0.00057. Width derived from the switcher's own tokens (`.switcherSizer`), 44 px row kept. `RouteLoading.test.tsx` new case green. |
| AC2 | `ac2-devui-widths.log`: `/dev/ui` vi → en → vi at 360/768/1280, segment widths and offsets Δ 0 (develop: 24.5 px). Dev page only (`.fit` flex row). |
| AC3 | `records/<project>/ac2-switcher-widths-*.json` show "Tiếng Việt"/"English" once (accessible names); `SegmentedControl` docblock "Querying" note; `data-visible` removed; unit + axe tests unchanged and green. |
| AC4 | `ac4-lint-negative.txt`: `pnpm lint` fails on the six `XMLHttpRequest`/`EventSource`/`sendBeacon` forms and four directive forms in `src/features/`, passes in `src/lib/api/` and on the code base, still reports the T-M1.13 fetch probes. Directives: grep step `web/scripts/no-lint-directives.sh` (oxlint 1.86's `no-warning-comments` is silenced by the directive itself). Fixtures not committed. |
| AC5 | `ac5-merge-gate-tests.log`: 311 passed, 0 failed; against develop's gate 305 passed, **6 failed** (object file page in step 5 and on the Dependabot path, `progress.json` status `unchanged`/none). Shared `pages_are_arrays` check reused by step 0. |
| AC6 | `mvnw-version.log`: Apache Maven 3.10.0; only `distributionUrl` changed in `backend/`. tech-stack.md and hoh-operating-model.md name `chore/<task-id>-deps-YYYY-MM`; the tech-stack version table says 3.10.0. Full gate green with 3.10.0 (backend 97 tests). |
| AC7 | `ac7-step-budget-repeat.log`: wait for the landing h1 before the first Tab; `--repeat-each=20` on phone-small, tablet, laptop: 60 passed, 0 failed (retries 0). Same race elsewhere: none found (grep in the log). |
| AC8 | `gate-20261003T172937Z.log`: `ENGLMS_TASK=T-M1.16 ./scripts/gate.sh` PASS (12 steps, 284 s). Screenshots of the landing and shell loading states in vi and en: `screenshots/{phone-small,tablet,laptop}/` (`ac3-landing-loading-{vi,en}.png`, `route-loading-*.png`). CI: see the PR. |

## Notes
- The flaky route-focus test (item 9) failed once more on PR #42's first `e2e-smoke` run (laptop, run 37139850569); one re-run passed (flaky-test policy, DEC-082).
- New device: gh ≥ 2.101 is needed by merge-gate (DEC-084).
