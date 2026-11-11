# T-M2.22: QA and delivery strategy review (answer to the PO and a ranked upgrade plan)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | awaiting_approval (PO decisions PO-1..PO-8 below; G0 review DEC-157) |
| Owner role | LC |
| Branch | `docs/T-M2.22-qa-strategy-review` (from `develop`) |
| Depends on | — |
| Estimate | 0.5 agent-day (this review); each adopted item becomes its own packet |
| Risk tier | L (docs only). The gate and CI proposals (U2) were reviewed with an adversarial brief, and get one again in their own packets |
| Trace | DEC-156 (PO request), DEC-131 (current process), DEC-157, quality-gates.md, test-strategy.md, qa-protocol.md, ci-cd.md, lessons-learned L-01, L-05, L-13 |

## Goal
The PO asked (DEC-156) whether the testing and QA process is wrong, over-built or over-meticulous, because delivery has slowed and the
tests cost more with every feature. This packet answers from measurements ([baseline](../../evidence/T-M2.22/baseline.md)), audits the
external review of 2026-10-29 against the live repository, and proposes a ranked plan. **It changes no workflow, script, test or quality
rule.** Every change to merge assurance needs a PO decision, listed at the end.

## The answer

**1. Is the approach wrong? No.** The checks themselves are the right ones for a product that holds students' private data, and they keep
finding real defects: the combined QA+UX reviewer found an unmet AC on T-M2.17 (S2); the T-M2.19 focus check found four real defects
before any review; the G0 review of T-M2.13 found a race (S2); the M2 reviews found a lock held across bcrypt (DEC-092) and a lost
update (DEC-104). Backend coverage is 95.4 % lines and 88.7 % branches. These stay (next section).

**2. Is it over-built? Yes, but in how often the checks run, not in what they check.** Three measured facts explain most of the slowdown:

- **The browser suite runs on everything.** `e2e-smoke` takes 16.0 minutes at the median (17.7 at p90, 24.9 at worst), and about 90 % of
  that is test execution; queueing, set-up, packaging and uploads are under 1.5 minutes together. Of 118 recent runs, only 13 (11 % of the
  minutes) were on a branch that changed product, test or script files. The rest ran on documentation branches (18 %), QA report branches
  (3 %), Dependabot branches (35 %) and again after every merge (34 %).
- **The run after each merge repeats the run before it.** For all 22 of our last merges the merged content is byte-identical to the PR
  head that had just passed.
- **A task opens four PRs** (packet, implementation, QA report, records), and three of them contain only text. Each still waits for a full
  browser run, and the last two block each other. On T-M2.17, T-M2.20 and T-M2.21 the text-only PRs were open for 33 to 38 % of the task's
  whole wall-clock time.

Why it gets worse with every feature: the suite grows by about 1.5 minutes per UI task (2.3 minutes on 2026-09-26, 16.0 now), and a task
runs it 7 to 13 times on PRs plus 3 or 4 times after merges. The cost of each new task therefore includes every earlier feature, many
times over. Locally the same shape appears in the gate: one new test in `students.spec.ts` replays all 58 of that file's tests three
more times (the `e2e` step goes from 280 s to 825 s).

**3. Is it over-meticulous? In three smaller places.** Since DEC-131 the reviews are proportionate (a review now costs fewer tokens than
the implementation on every UI task, in one round plus at most one delta). What remains: S4 wording findings on packets still get their
own fix-and-re-check round at G0; the records are long (`progress.json` is about 34,000 tokens to read at every session start, recent
decision entries run to 3,500 characters); and 13 of the 37 completed tasks built or hardened the harness itself.

**4. What is under-built.** Five promises in the quality docs have no implementation (table below), and two known flaky tests sit on the
required path with zero retries: all three `e2e-smoke` failures on our own branches in the window were flaky tests, none a product
defect.

In one sentence: **keep the checks, stop running them where they cannot find anything, and make the docs promise only what exists.**

## What is sound and must stay
- Independent QA in a fresh context that reads the ACs before the code; SEC as its own agent for tier H (2 minutes and 43,000 to 48,000
  tokens per round: cheap for what it guards).
- The authz matrix, the student-isolation scan and the ArchUnit rules on every backend build, against real PostgreSQL.
- "A check is not done until it has been seen failing" (L-01) and gate tooling that fails closed.
- The full browser suite on the three mandatory viewports **before a change to product, test or build files merges**, with zero retries.
- G0 packets with the UI rules and Domain rules blocks, and the contradiction scan (L-02 to L-04).
- DEC-131 as it stands: risk tiers, the combined QA+UX pass, delta re-checks, S4 batching, one local gate per head, the G3 cost table.
- S1 and S2 are never deferred. No check moves to after the merge.

## What is over-built or duplicated (evidence in the baseline)

| # | Finding | Evidence | Plan item |
|---|---|---|---|
| 1 | Full CI on text-only heads | 33 of 118 `e2e-smoke` runs on `docs/*` and `qa/*` heads, 341 minutes; the T-M2.13 packet alone took 4 runs, 42 minutes | U2 |
| 2 | Identical post-merge run | 22 of 22 merge-gate merges: merge tree = PR head tree; 21 such `e2e-smoke` runs in the window, 319 minutes | U2 |
| 3 | Whole-file ×3 repeat | `students.spec.ts` holds 58 of 146 test declarations; the gate's `e2e` step is 518 to 825 s when it changes, 280 s otherwise | U3 |
| 4 | Two text-only PRs after each merge | the QA report and the records PRs merged one after the other in 39 to 40 minutes on T-M2.17 and T-M2.20 | U6 |
| 5 | Every test on three viewports | 546 instances = 182 tests × 3, including tests of validation and server errors | U7 (experiment) |
| 6 | A known-red Dependabot PR re-run on every rebase | PR #135: 13 failed runs, about 208 minutes | U5 (PO) |
| 7 | Records and harness weight | baseline §7 | U8 |

## What is promised but missing

| Promise (where) | State | Recommendation |
|---|---|---|
| `e2e-nightly`: 6 viewports, Firefox, WebKit, PIT (ci-cd §1, test-strategy §1, responsive-standards) | No scheduled workflow exists | Do not build a nightly now: nobody would triage it. Replace the promise with a **manually started `regression` workflow** (6 viewports on Chromium, smoke on Firefox and WebKit) that the LC runs at G5 and before a risky browser change. It also solves this device's missing Firefox and WebKit libraries. PIT stays planned for the grading module, not "nightly" (PO-3) |
| Browser matrix at G5: quality-gates says 6 viewports × Chromium + Firefox/WebKit smoke; qa-protocol §5 says 6 viewports × 3 engines | The two docs disagree; nothing runs either | Adopt the quality-gates wording and align qa-protocol §5 (PO-3) |
| Coverage floors (test-strategy §5) | JaCoCo reports only; no web coverage at all | Add the JaCoCo `check` at the documented 80 % line / 70 % branch: it passes today (95.4 / 88.7) and is proven failing with a fixture. Measure web coverage once, then set its floor from the measurement (U4) |
| `qa/regression` accumulates independent scenarios (qa-protocol §5) | `qa/` holds M1 only; since DEC-131 reviewers return text and write no files | Decide between two honest options (PO-4): **(a, recommended)** independent findings are retained as implementation E2E tests through their fix ACs (the practice since T-M2.15), `qa/` stays as the reviewer's tooling, and G5 is the full matrix plus the exploratory session; **(b)** each tier-H review returns a spec file that the LC commits under `qa/e2e` (a second suite to maintain; cost not measured) |
| `scripts/seed-e2e` and an `e2e` profile reset the data (test-strategy §2, qa-protocol §2) | Neither exists; local E2E writes into the PO's dev database (about 15,000 test students by DEC-139); CI starts from an empty database | Strike the claim. Give local E2E its own database in the dev PostgreSQL container, recreated per run, so the dev data is never touched and local runs start like CI (U4) |

## Ranked upgrade plan

Order: first make a green result trustworthy, then remove the largest measured waste at the lowest risk, then experiments. "DEC" marks
an item that changes merge assurance or a governance rule and so needs the PO.

### U1. Fix the two open flaky tests on the required path
- **Weakness:** `students.spec.ts` "Guardians AC4: two pages…" reads the list once after an alert (L-05); `AuthApiIntegrationTest.anUnrelatedLoginStaysFastDuringABurstOnOneUsername` has a wall-clock bound.
- **Evidence:** runs 43017673796 and 40818762069; 3 of 3 `e2e-smoke` failures on our branches were flaky tests; each costs a 15-minute re-run.
- **Proposal:** the E2E one becomes a polling read with the same assertion, ruled into T-M2.13 as an AC (the DEC-153 precedent). The backend one stays in the T-M2.10 row, moved ahead of the next backend task.
- **Risk:** low; a polling read cannot pass a state that never arrives. **Alternatives:** retries (rejected: hides regressions, test-strategy §3); quarantine (a DEC and a deadline).
- **Validation:** the changed spec ×20 on the three viewports; `backend` ×20 for the changed test. **Rollback:** revert the test commit.
- **PO decision:** none for the E2E fix (no assertion weakened); the backend bound changes an assertion and takes a DEC in its packet.

### U2. CI runs the heavy jobs only where the diff can affect them (DEC)
- **Weakness:** findings 1 and 2: 41 % of all `e2e-smoke` minutes in the window (660 of 1,626) went to text-only heads (33 runs, 341
  minutes) and to post-merge runs on a tree identical to the tested PR head (21 runs, 319 minutes).
- **Proposal, two independent switches in one packet:**
  - **(a) Text-only PRs:** each heavy job (`e2e-smoke`, `backend`, `web`, `contract-drift`, `container-build`) starts with one shared
    classification step. When **every** changed path is on a short allow-list (`docs/**`, `evidence/**`, `progress.json`, root `*.md`,
    `.claude/**`), the job ends green without its heavy steps and says so in the job summary. `docs-check` and `secrets-scan` always run in full.
  - **(b) Post-merge runs:** on a push to `develop`, when the merge commit's tree equals its second parent's tree, the heavy steps are
    skipped. A merge of a branch that was behind (the Dependabot case) still runs everything.
- **Design constraints found in this review:** the job must still **report and pass** (merge-gate needs bucket `pass` for each required
  check; a skipped job is not `pass`, and a `paths:` filter leaves the check missing), so the switch is a step inside the job. The
  classifier fails closed: unknown base, a failed diff, a rename from or to a path off the list, a deleted file off the list, or any
  error means the full job. The allow-list is a file under `scripts/` with tests in `scripts/tests/`.
- **Risk:** a wrongly listed path lets a product-affecting change merge without the suite. Mitigations: allow-list not deny-list; the
  packet proves that no build, test or workflow reads an allow-listed path (`.claude/**` holds agent rules only; if that cannot be
  shown for a path, it leaves the list); merge-gate is unchanged; the local gate is unchanged.
- **Alternatives:** keep everything and add shards (U9: shorter wait, more minutes, nothing saved); a `paths:` filter (breaks the
  required checks); put the records on the feature branch (path ownership forbids reviewer evidence there).
- **Validation:** (1) fixtures proving each fail-closed case and each mixed diff runs in full (L-01); (2) **shadow mode** for at least 10
  PRs: the classifier prints its verdict while everything still runs, and the LC compares; (3) an adversarial reviewer tries to make it
  skip a product change (renames, a symlink, a workflow edit, a file added under `docs/` that the build reads, a force-pushed base);
  (4) after adoption, the T-M2.13 task is the measurement: PR runs, minutes and docs-PR open time against baseline §2 and §6.
- **Expected effect (to be validated, not promised):** a text-only PR is merge-ready after `docs-check` (p50 1.2 min) instead of 16;
  `e2e-smoke` runs per task fall from 7 to 13 plus 3 or 4 post-merge to the runs on the implementation branch.
- **Rollback:** revert one commit; every job runs in full again. **PO decision:** PO-1 (a) and PO-2 (b), separately.

### U3. Split `students.spec.ts` into cohesive files
- **Weakness:** finding 3: the ×3 repeat replays 58 tests for a one-test change.
- **Proposal:** one spec file per feature group (list and add, profile, account, guardians, learning profile, focus checks, long data,
  polish), shared helpers under `e2e/support/`. The repeat rule ("new or changed specs ×3") is unchanged.
- **Risk:** a moved test loses a hook or an ordering it relied on. **Alternatives:** repeat only the changed tests by title (needs diff parsing; fragile); lower the repeat count (an assurance change; not proposed).
- **Validation:** `playwright test --list` before and after gives the same set of test titles per project (546 instances); the full suite ×3 green; no assertion text changes (`git diff` moves only). **Rollback:** revert.
- **PO decision:** none (no rule changes). Tier L with the inventory proof.

### U4. Make the docs true and enforce what is already met
- **Proposal:** the three "implement" rows of the promises table: the JaCoCo `check` at the documented floor with a negative proof; a
  one-off web coverage measurement; a separate local E2E database (`e2e-run.sh` creates and drops it; the dev database is no longer
  written); and the doc corrections for nightly, the matrix, `seed-e2e` and `qa/` after PO-3 and PO-4.
- **Risk:** a floor encourages shallow tests (R-18): the floor stays a floor, reviewers still judge assertions. A fresh local database can hide data-volume defects: the G5 regression keeps one run against a large seeded set.
- **Validation:** the build fails with a fixture class below the floor; local suite time and results compared on the fresh and the kept database. **Rollback:** remove the `check` execution; point `e2e-run.sh` back at `.env`.
- **PO decision:** PO-3, PO-4 for the doc changes; none for enforcing a floor that is already documented.

### U5. Dependabot hygiene (PO-owned)
- **Evidence:** PR #135 failed `e2e-smoke` 13 times as it was rebased (about 208 minutes); the 18 Dependabot merges in the last 40 landed
  2 to 131 commits behind `develop`, so outside `merge-gate.sh`; Dependabot heads took 35 % of `e2e-smoke` minutes.
- **Options for the PO:** close or `@dependabot ignore` a bump that is held; group each ecosystem into one weekly PR; update the branch
  before merging so the tested content is the merged content. **PO decision:** PO-8. No LC change proposed.

### U6. One records PR after the merge instead of two (DEC)
- **Weakness:** finding 4. **Proposal:** the LC commits the QA report with the merge records on one `docs/` branch. The separation of
  `qa/` branches no longer separates authors: since DEC-131 reviewers return text and the LC commits both.
- **Risk:** the path-ownership rule for `evidence/*/qa/**` loosens for `docs/` branches (implementer branches stay forbidden).
  **Alternatives:** keep two PRs (after U2 each is short). **Validation:** path-ownership tests for the new rule, both directions. **Rollback:** restore the rule.
- **PO decision:** PO-5; decide after U2's measurement, the gain may then be small.

### U7. Experiment: which tests need three viewports?
- **Weakness:** finding 5. Evidence cannot decide whether behaviour-only tests gain anything from three viewports.
- **Smallest discriminating experiment (changes nothing that gates a merge):** tag each test in two spec files as layout-sensitive or
  behaviour-only by a written rule (anything touching a breakpoint-dependent component, focus, overflow or axe is layout-sensitive);
  from the JSON results of the next 20 CI runs count behaviour-only tests whose result differed between viewports; seed 10 faults in
  behaviour code and check that one viewport catches each.
- **Adopt only if** no behaviour-only result ever differed and every seeded fault is caught; then a DEC proposes one viewport for that
  tag. **Risk if adopted:** a behaviour that does depend on the viewport (drawer or sidebar, sheet or dialog) is tagged wrongly.
  **Rollback:** remove the tag filter.

### U8. Lighter records and G0 (partly DEC)
- **Proposal:** (a) at G0 a delta re-check only after an S1/S2 packet finding; the LC fixes S3/S4 and records them (the DEC-131 (5) rule
  applied to G0); (b) `progress.json` `history` moves to an archive file, keeping the last 10 entries; (c) a decision entry states the
  decision, the reason and the references, with the detail in the evidence summary; (d) no new harness-hardening task unless a failure
  was observed.
- **Risk:** a wrong S3 fix in a packet goes unreviewed (the implementer and the G3 reviewer still read the packet). **Validation:** session-start read size before and after; G0 tokens per packet. **Rollback:** restore the rules.
- **PO decision:** PO-6 for (a); (b) to (d) are LC working rules.

### U9. Two shards for the implementation-branch run (only if still needed)
- **When:** only if, after U2, U3 and U7, the run on an implementation head is still above the PO's target. **Proposal and proofs:** as the
  external review §5.2 (same inventory, one database and app per shard, one aggregate `e2e-smoke` check that fails on a failed, missing,
  cancelled or empty shard). **Risk:** more runner minutes (billing not readable by the LC, baseline §9), aggregation errors.
  **PO decision:** PO-7 (target and budget).

### U10. The 500 ms late-error window: measure, do not change
- An estimated 129 s of the 880 s test step. It has a proven negative test (T-M1.9). Record its real share with the U2 measurement; no change proposed.

## PO decisions requested

| ID | Decision | LC recommendation |
|---|---|---|
| PO-1 | U2 (a): text-only PRs skip the heavy steps of the heavy jobs, after shadow mode and the adversarial review | Yes |
| PO-2 | U2 (b): skip the post-merge heavy steps when the merged tree equals the tested PR head | Yes |
| PO-3 | Nightly struck; a manually started `regression` workflow for G5; the G5 matrix is 6 viewports × Chromium + Firefox and WebKit smoke | Yes |
| PO-4 | `qa/` retention: option (a) or (b) | (a) |
| PO-5 | U6: one records PR after the merge | Decide after U2's measurement |
| PO-6 | U8 (a): at G0 a delta re-check only for S1/S2 | Yes |
| PO-7 | A target for the wait on an implementation PR (for U7 and U9), and whether more runner minutes may be spent | Target 10 minutes; no extra minutes before U2, U3, U7 are measured |
| PO-8 | Order: U1 into T-M2.13; the U2 packet next (tier L, adversarial review, shadow mode during T-M2.13); then U3 and U4; Dependabot hygiene (U5) | As written |

## Scope
- In: the baseline (`evidence/T-M2.22/baseline.md`), this packet, DEC-157, the backlog row, `progress.json`, the handoff.
- Adopted items become their own packets with their own G0 after the PO decides.

## Out of scope (explicit)
- Any change to `.github/workflows/`, `scripts/`, `e2e/`, `qa/`, `backend/`, `web/` or the quality docs (`docs/06-quality/`, `docs/07-operations/ci-cd.md`).
- Implementing any pilot or experiment; starting T-M2.13 (held, DEC-156).

## Guardrail answers (scope.md §6)
1. Trace: DEC-156, DEC-131. 2. Drifts toward excluded scope? No, process only. 3. Mandatory setup added? No. 4. Weekly use? Every task.
5. Hard-coded semantics? None.

## Acceptance criteria
- AC1: `evidence/T-M2.22/baseline.md` gives, each with its command or source: the CI wait split (queue, set-up, packaging, tests,
  uploads) over at least 20 runs by change type; first-attempt failures classified; local gate step times; review rounds, tokens and
  minutes per tier; repeat amplification and duplicate runs; and a list of what was not measured.
- AC2: the external review's claims are checked against `develop` and each is marked as holding or not.
- AC3: the packet answers the PO's three questions with numbers found in the baseline, and lists what must stay.
- AC4: each of nightly, coverage floors, browser matrix, `qa/` retention and `seed-e2e` has a state and a recommendation.
- AC5: each plan item states weakness, evidence, risk, alternatives, validation and rollback, and whether it needs a PO decision; where
  evidence cannot decide, an experiment is defined instead of a choice.
- AC6: the PR changes only `docs/tasks/`, `docs/10-governance/decision-log.md`, `docs/handoff/`, `evidence/T-M2.22/` and `progress.json`.
- AC7: `./scripts/check-docs.sh` and `./scripts/check-path-ownership.sh` pass; CI green; DOCS-REVIEW PASS by one fresh docs-reviewer with
  the adversarial brief for U2.

## Test plan
- `./scripts/check-docs.sh`; `./scripts/check-path-ownership.sh docs/T-M2.22-qa-strategy-review`. No gate run: no product, test or script file changes.
- Docs review (tier L): the numbers in this packet against the baseline and the baseline against its commands (spot checks); the
  adversarial brief: find a way U2 as described lets a product-affecting change merge without the suite, and whether any item weakens
  merge assurance without being marked as a PO decision.

## Evidence required
- `evidence/T-M2.22/baseline.md`, `evidence/T-M2.22/summary.md` (AC → proof, commands, G3 cost table), the review record `evidence/T-M2.22/review/docs.md`.

## Docs to update
- `docs/tasks/backlog.md` (the T-M2.22 row), `docs/10-governance/decision-log.md` (DEC-157), `progress.json`, the handoff. No quality doc changes until the PO decides.

## Risks & assumptions
- The window (2026-10-20 to 2026-11-11) holds few implementation runs (13): the per-kind medians for `feature/` heads rest on 6 successes.
- Expected effects are estimates until T-M2.13 is measured under U2.
- GitHub Actions billing was not readable; the minute totals are wall minutes, not billed minutes.
- Assumption: the PO's wait of more than 19 minutes was an `e2e-smoke` run (p90 17.7, max 24.9, queue up to 4.7 minutes); the run was not identified.

## Commands (reproducible)
```bash
gh run list --workflow e2e-smoke.yml --limit 120 --json databaseId,event,headBranch,headSha,conclusion,createdAt,startedAt,updatedAt,attempt
gh run view <id> --json jobs,attempt,createdAt,event,headBranch,conclusion      # step start and end times
gh run view <id> --log-failed                                                   # failure classification
gh run list --workflow e2e-smoke.yml --limit 700 --status success --json createdAt,startedAt,updatedAt   # growth
for m in $(git log --merges --first-parent -40 --format=%H origin/develop); do [ "$(git rev-parse $m^{tree})" = "$(git rev-parse $m^2^{tree})" ] && echo same || echo differs; done
grep -oE '<== [a-z0-9-]+ OK \([0-9]+s\)' evidence/*/gate-*.log                    # local gate step times
gh pr list --state all --limit 60 --json number,headRefName,createdAt,mergedAt
./scripts/check-docs.sh
./scripts/check-path-ownership.sh docs/T-M2.22-qa-strategy-review
```
