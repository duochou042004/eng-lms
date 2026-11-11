# T-M2.22 measured baseline (QA and delivery)

Measured by the LC on 2026-11-11 on `develop` at `d5908fa`. Every number below comes from the command named with it; nothing is restated
from memory. Raw JSON stayed in the session scratchpad (not committed); the commands reproduce it while GitHub keeps the runs.

## 1. Does the external review still describe the repository?

The review describes a snapshot of 2026-10-23. Since `d890aae` (T-M2.21 merge) `develop` gained only Dependabot bumps, the T-M2.13 packet
and records (`git log --since=2026-10-23T13:40 --no-merges origin/develop`). The workflows, `scripts/gate.sh`, `scripts/e2e-run.sh` and
`e2e/playwright.config.ts` changed only by action SHA bumps (`git log -3 -- .github/workflows scripts/gate.sh scripts/e2e-run.sh e2e/playwright.config.ts`).

| Review claim | Live check | Result |
|---|---|---|
| `e2e-smoke` runs the whole suite, no smoke filter, `fullyParallel`, `retries: 0` | `.github/workflows/e2e-smoke.yml`, `e2e/playwright.config.ts` | holds |
| CI uses 2 workers, 546 instances (515 passed, 31 skipped) | run 43032395546 log: "Running 546 tests using 2 workers" | holds |
| The gate repeats every changed spec **file** ×3 | `scripts/gate.sh` `e2e_repeat` | holds |
| No nightly workflow | 7 workflows, none with `schedule:` | holds |
| JaCoCo has no `check` goal; web has no coverage | `backend/pom.xml` (`prepare-agent`, `report` only); no `coverage` in `web/package.json` or `web/vite.config.ts` | holds |
| `qa/` holds M1 specs only | `qa/e2e/T-M1.9.spec.ts`, `qa/e2e/T-M1.13.spec.ts`, `qa/regression/M1.spec.ts` (775 lines); 24 QA reports under `evidence/*/qa/` | holds |
| `scripts/seed-e2e` and the `e2e` profile do not exist | `ls scripts/`; `grep -rn 'Profile("e2e")'` finds docs only | holds |
| E2E projects are Chromium only | `e2e/playwright.config.ts` (`devices['Desktop Chrome']` for all six) | holds |
| merge-gate also refuses on any non-required check that fails, is pending or is cancelled | `scripts/merge-gate.sh` step 3 | holds |
| `students.spec.ts` dominates | 3,305 of 6,379 spec lines; 58 of 146 `test(` declarations | holds |

New facts the review did not have: sections 2 to 6.

## 2. CI: where the wait goes

Source: the last 120 runs of each workflow (`gh run list --workflow <w>.yml --limit 120 --json …`), 2026-10-20T08:29Z to 2026-11-11T13:48Z,
and `gh run view <id> --json jobs` for every `e2e-smoke`, `backend` and `web` run (step start and end times).

| Workflow | Success / failure / cancelled | Duration p50 / p90 / max (min, successes) | Wall minutes (success + failure) |
|---|---|---|---|
| `e2e-smoke` | 83 / 16 / 21 | 16.0 / 17.7 / 24.9 | 1,558 |
| `backend` | 106 / 1 / 13 | 4.3 / 5.3 / 9.4 | 469 |
| `web` | 109 / 0 / 11 | 2.4 / 3.2 / 6.6 | 277 |
| `container` | 115 / 0 / 5 | 1.3 / 2.2 / 6.4 | 173 |
| `docs-check` | 117 / 0 / 3 | 1.2 / 1.6 / 5.9 | 162 |
| `contract-drift` | 115 / 0 / 5 | 1.1 / 1.4 / 6.0 | 146 |
| `secrets-scan` | 120 / 0 / 0 | 0.3 / 0.4 / 5.1 | 60 |
| **Total** | | | **2,844** in 22 days |

Run durations are `updatedAt − startedAt` of the run. `e2e-smoke` is 55 % of all CI minutes and is the critical path of every PR: the
next slowest required check takes 4.3 min.

**Split of the `e2e-smoke` job (83 successful runs, per step):**

| Part | p50 | p90 | max |
|---|---|---|---|
| Queue (run created → job started; first attempts) | 4 s | 83 s | 283 s |
| Set up job, checkout, Java, Node, pnpm | about 8 s | | |
| Initialize containers (PostgreSQL service) | 14 s | 17 s | 24 s |
| Install e2e dependencies and Chromium | 23 s | 34 s | 595 s (one run) |
| Typecheck `e2e/` and `qa/` | about 3 s | | |
| The test step (`e2e-run.sh`) | 880 s | 920 s | 958 s |
| Report upload | skipped on success | | |

Inside the test step (three latest successful runs, log timestamps): packaging 16 to 29 s, application start 9 to 16 s, Playwright 11.0 to
14.5 min. **Browser test execution is about 90 % of the job. Queue, set-up, packaging and uploads together are under 1.5 minutes at the
median.** The PO's measured wait of more than 19 minutes fits the tail: p90 17.7, max 24.9, plus a queue of up to 4.7 minutes.

**Growth** (`gh run list --workflow e2e-smoke.yml --limit 700 --status success`, median run duration per day):

| Day | 09-26 | 10-04 | 10-12 | 10-16 | 10-18 | 10-19 | 10-20 | 10-21 | 10-23 | 11-11 |
|---|---|---|---|---|---|---|---|---|---|---|
| Median (min) | 2.3 | 4.3 | 7.7 | 8.9 | 11.4 | 12.6 | 14.1 | 15.1 | 16.4 | 16.0 |

From T-M2.4 (10-11) to T-M2.20 (10-23), nine UI tasks added about 13 minutes: roughly 1.5 minutes per UI task, linear. M2 is the first user-facing milestone.

**Which heads the suite ran on** (118 `e2e-smoke` runs with job data):

| Head | Runs | Job minutes | Share of minutes |
|---|---|---|---|
| Dependabot PR branches | 36 | 567 | 35 % |
| Push to `develop` (post-merge) | 36 | 546 | 34 % |
| `docs/*` PR branches | 30 | 294 | 18 % |
| `feature/*` PR branches | 10 | 128 | 8 % |
| `qa/*` PR branches | 3 | 47 | 3 % |
| `chore/*` PR branches | 3 | 45 | 3 % |

Only 13 of 118 runs (11 % of the minutes) were on a `feature/` or `chore/` head, the only heads that changed product, test or script
files. The 33 `docs/*` and `qa/*` runs carried Markdown, `progress.json` and evidence text only.

**Post-merge duplicate.** For the last 40 merge commits on `develop` (`git log --merges --first-parent -40`), the merge commit's tree
equals the PR head's tree in **22 of 22** merges made through `merge-gate.sh` (it requires the branch 0 commits behind). The post-merge
`push` run therefore tests byte-identical content that the PR run just passed. The other **18 of 18** are Dependabot PRs merged while 2 to
131 commits behind `develop`, which `merge-gate.sh` refuses, so they did not go through it; for those the post-merge run is the only run
on the merged content. Of the 36 post-merge `e2e-smoke` runs in the window, 21 (319 job minutes) were on a tree identical to the
PR head and 15 (227 minutes) were not. Text-only heads plus identical post-merge trees are 660 of 1,626 job minutes (41 %).

**Per task** (`e2e-smoke` PR runs grouped by the task ID in the branch name, cancelled and failed runs included):

| Task | PR runs | Minutes | Of which on `docs/*` and `qa/*` heads |
|---|---|---|---|
| T-M2.17 | 13 | 140 | 9 runs, 87 min |
| T-M2.19 (from 10-20) | 7 | 71 | 6 runs, 58 min |
| T-M2.20 | 11 | 138 | 6 runs, 76 min |
| T-M2.21 | 7 | 86 | 4 runs, 41 min |
| T-M2.13 (packet only) | 4 | 42 | 4 runs, 42 min |

Each task also triggers one post-merge run per merged PR (three or four).

## 3. CI failures, first attempts

Source: `gh run view <id> --log-failed` for each failed run in the window.

| Workflow | Failed runs | Product or dependency | Flaky test | Infrastructure |
|---|---|---|---|---|
| `e2e-smoke` on our branches | 3 | 0 | 3 | 0 (one run also logged a Playwright download DNS error, retried) |
| `e2e-smoke` on Dependabot PR #135 | 13 | 13 (axe violations, console errors, focus checks after the react group bump) | 0 | 0 |
| `backend` | 1 (push to `develop`) | 0 | 1 | 0 |
| `web` and the other four | 0 | | | |

- The three flaky `e2e-smoke` failures: `students.spec.ts` "AC6: leaving a dirty form asks…" on tablet twice (runs 39547482154 on a
  docs-only head and 39558521233; fixed in T-M2.20) and `students.spec.ts` "Guardians AC4: two pages…" on tablet once (run 43017673796,
  a docs-only head; **still open**).
- The `backend` failure is `AuthApiIntegrationTest.anUnrelatedLoginStaysFastDuringABurstOnOneUsername` (run 40818762069), the wall-clock
  bound already recorded for T-M2.10 (DEC-144 (3)); **still open**.
- In this window the CI suite caught **no product defect on a branch we wrote**: the local gate had already run the same suite. It did
  catch a real incompatibility on the Dependabot react bump, 13 times, because each rebase of that open PR re-ran everything (about 208
  minutes of `e2e-smoke`).
- Only one `e2e-smoke` run has `attempt > 1`; failures were usually cleared by the next push, not a re-run.

## 4. Local gate (`evidence/*/gate-*.log`)

Command: the `<== <step> OK (<n>s)` lines of every kept gate log.

| Step | T-M1.6 | T-M2.1 | T-M2.11 | T-M2.14 | T-M2.21 (no repeat) | T-M2.20 (with ×3 repeat) |
|---|---|---|---|---|---|---|
| `scripts` | 4 s | 56 s | 48 s | 46 s | 74 s | 49 s |
| `backend` | 58 s | 130 s | 258 s | 254 s | skipped | skipped |
| `web-test` | 3 s | 5 s | 15 s | 39 s | 55 s | 58 s |
| `contract-drift` | 49 s | 52 s | 56 s | 56 s | skipped | skipped |
| `e2e` | 26 s | 110 s | 182 s | 266 s | 280 s | 825 s |
| **Gate total** | 150 s | 364 s | 572 s | 677 s | 428 s | 950 s |

- The main E2E pass grew from 26 s to 280 s (8 local workers); it is 65 % of a gate with no backend change.
- The changed-spec ×3 repeat adds 240 to 545 s whenever `students.spec.ts` changes (T-M2.15 518 s, T-M2.19 580 to 593 s, T-M2.17 649 to
  653 s, T-M2.20 785 to 825 s for the `e2e` step): the file holds 58 of the suite's 146 test declarations, so one new test replays all 58
  on three viewports three times.
- Failed gates among the kept logs: 5 (the T-M1.5 fail-fast demonstration; one `e2e` in T-M2.12; three `web-test`: one in T-M2.19 and two in
  T-M2.21, the latter the `RouteError` flake fixed by DEC-153).
- `web/dist` is built twice per gate (`web-build`, then inside `e2e-run.sh`): about 6 s.

## 5. Reviews (G0 and G3) since DEC-131

Source: the G3 cost tables in `evidence/<task>/summary.md` and DEC-151, DEC-154, DEC-155.

| Task (tier) | G3 review agents and rounds | Review tokens / minutes | Findings S2 / S3 / S4 | Implementer tokens / minutes | Gate runs |
|---|---|---|---|---|---|
| T-M2.15 (H) | QA+UX 1 round; SEC 1 round | 157,030 / 25.5 | 0 / 3 / 4 | fix round 51,765 / 23.9 | 1 after G1 |
| T-M2.19 (M) | QA+UX 1 round + 1 delta | 132,392 / 28.5 | 0 / 3 / 5 | 265,704 / 84.4 | 4 |
| T-M2.17 (H) | SEC 1 round; QA+UX 1 round + 1 delta | 179,469 / 30.9 | 1 / 0 / 4 | 377,064 / 60.4 | 2 |
| T-M2.20 (M) | QA+UX 1 round + 1 delta | 143,556 / 29.6 | 0 / 1 / 1 | 208,114 / 54.8 | 2 |
| T-M2.21 (L) | docs review 1 round + 1 delta | 94,000 / 14.4 | 0 / 0 / 13 | the LC | 5 (2 failed on the flake) |

Before DEC-131 the same work took 6 to 12 review rounds and 21 to 87 gate minutes per UI task (T-M2.18 packet). G0 packet reviews:
T-M2.21 91,180 tokens in two rounds (3 S3, 7 S4), T-M2.13 116,290 tokens in two rounds (1 S2, 11 S4), T-M2.19 three rounds.

Per round: a combined QA+UX pass costs 112,000 to 128,000 tokens and 15 to 24 minutes; a delta re-check 12,000 to 19,000 tokens; SEC
43,000 to 48,000 tokens and 2 minutes. Review is now smaller than implementation in tokens on every UI task.

## 6. Wall-clock per task and the PR count

Source: `gh pr list --state all --limit 60 --json number,headRefName,createdAt,mergedAt`. A product task opens four PRs: the packet
(`docs/`), the implementation (`feature/`), the QA report (`qa/`) and the merge records (`docs/`).

| Task | First PR opened → last PR merged | Time the docs-only PRs were open (union) | Share |
|---|---|---|---|
| T-M2.17 | 231 min | 77 min (#122 38; #124 and #125 together 39) | 33 % |
| T-M2.20 | 172 min | 65 min (#126 24; #137 and #138 together 40) | 38 % |
| T-M2.21 (three PRs) | 118 min | 43 min (#139 26; #141 17) | 37 % |

A docs-only PR cannot merge before one 16-minute browser run on its head, and a second PR opened beside it must be updated and run again
after the first merges (#138: 39 minutes for a records change). The packet PR's time includes its G0 review (5 to 6 agent minutes per first round),
which runs while CI runs.

## 7. Size of the records every session reads

`wc -c`: `progress.json` 68,700 bytes (1,377 lines, 121 `history` entries; the Read tool counts about 34,000 tokens),
`docs/10-governance/decision-log.md` 158,192 bytes for 156 entries (recent entries are 2,000 to 3,500 characters each),
`docs/tasks/backlog.md` 33,683, `docs/handoff/HANDOFF.md` 12,801. Of the 37 completed tasks, 13 changed only the harness or the process
(T-M1.1, T-M1.7, T-M1.11, T-M1.12, T-M1.14, T-M1.15, T-M1.17, T-M1.18, T-M1.20, T-M2.8, T-M2.18, T-M2.19, T-M2.21); `scripts/tests/`
holds 325 merge-gate cases and the gate's `scripts` step grew from 4 s to 74 s.

## 8. Coverage as measured today

The log of the `backend` push run on `d5908fa` (2026-11-11T13:52Z, `scripts/coverage-summary.sh`): lines 95.4 % (1,715 / 1,797),
branches 88.7 % (690 / 778); the lowest package is `identity.internal.web` at 75.0 % branches. The documented floor (80 % line, 70 %
branch on domain and application packages) is not enforced, and is met. Web coverage has never been measured.

## 9. Not measured

- GitHub Actions billing and the plan's included minutes (`gh api /users/…/settings/billing/actions` needs the `user` scope; the PO can read it under Settings → Billing).
- The reasons for each of the 31 skipped E2E instances (the review inspected them; not re-audited here).
- How many E2E tests behave differently per viewport (needed for plan item U6; its experiment measures it).
- The share of the 500 ms late-error window in a run: an estimate only (515 executed instances × 0.5 s ÷ 2 workers ≈ 129 s of the 880 s test step).
- The first full gate on the new device (it runs with T-M2.13 G1).
