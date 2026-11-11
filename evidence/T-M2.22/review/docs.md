# DOCS-REVIEW record — T-M2.22 (G0)

One fresh docs-reviewer with an adversarial brief for the gate and CI proposals (U2). The LC records the returned text (DEC-131); the
reviewer wrote no file and posted nothing.

## Round 1 (full) at `ae91d7b` — 141,204 tokens, 471.6 s

DOCS-REVIEW T-M2.22: CHANGES REQUESTED
Four S2 findings (D-1 to D-4) and twelve S3/S4. The measurements largely hold; the U2 description and two PO decision rows do not yet give the PO the full risk.

## Check results
- `./scripts/check-docs.sh`: PASS (282 markdown files, exit 0).
- `./scripts/check-path-ownership.sh docs/T-M2.22-qa-strategy-review`: PASS (6 files).
- **AC6:** met. `git diff --stat origin/develop...HEAD` shows six files: the decision log, the packet, `backlog.md`, the two files under `evidence/T-M2.22/`, and `progress.json`. No workflow, script, test or quality doc changed.
- **AC7:** not yet met. PR #155 had `e2e-smoke=pending` when I checked; the other six checks pass.
- **AC1:** partly met (see D-12). **AC2 to AC5:** met in form, with the findings below.

## Findings

| ID | Sev | File:line | Finding | Suggested fix |
|---|---|---|---|---|
| D-1 | S2 | `evidence/T-M2.22/baseline.md:84-88`; packet `:33-34`, `:70`, `:143-144`; DEC-157 | "22 of 22 merges made through `merge-gate.sh`" is wrong. Of the 22 identical-tree merges, 17 are task PRs and 5 are Dependabot PRs (#104, #132, #148, #149, #150) merged 0 behind with no `LC-APPROVED PR-<n>` comment, so outside merge-gate. The last 40 merges hold 23 Dependabot merges, not 18; 18 were behind. For those 5, nothing guaranteed a green head (they happened to be green). | State "22 identical: 17 via merge-gate, 5 Dependabot merged up to date outside it; 18 Dependabot behind". Correct U5 and DEC-157. Carry the consequence into U2 (b), see D-2. |
| D-2 | S2 | packet `:107-108`, `:113-115`, `:187` | U2 (b) infers "already tested" from tree equality alone. Equality proves the content matches the PR head, not that a full green run exists for it. PO-2 carries no shadow-mode or adversarial condition (PO-1 does), and the Risk bullet names only "a wrongly listed path". Three holes are listed in the adversarial section (A-1 to A-3). | Rewrite (b): skip only when the API shows a successful, non-fast-path run of the same workflow for the second-parent SHA; exactly two parents; never cancel a running full run on `develop`. Add these to Risk. Give PO-2 the same conditions as PO-1. |
| D-3 | S2 | packet `:109-115` | U2 (a) makes a check result depend on (head, base), while `scripts/merge-gate.sh` step 3 reads `gh pr checks` by head only and cannot tell a fast-path pass from a real one. "merge-gate is unchanged" is listed as a mitigation; it is the gap. This departs from external review §6.3 ("make a final gate verify the execution plan rather than trusting a generic green/skipped status") without saying so. A concrete bypass is A-4. | Add a constraint: merge-gate recomputes text-only from the PR files API against the current base, and otherwise requires the heavy step's conclusion to be `success`, not `skipped` (`gh run view --json jobs`). The classifier always diffs against `develop`, never the PR's base. State the departure from §6.3 or adopt it. |
| D-4 | S2 | packet `:82`, `:188` | PO-3 presents the G5 matrix as two docs disagreeing and recommends the cheaper one. It omits that the PO-approved DEC-131 (7) says "the full 6-viewport × 3-engine regression stays at G5", which agrees with `qa-protocol.md:81`, not `quality-gates.md:68`. The external review §4.4 says not to choose the cheaper reading silently. | Say in the row and in PO-3 that the recommendation narrows DEC-131 (7) from three engines on six viewports to Chromium on six plus Firefox/WebKit smoke, with what is lost. |
| D-5 | S3 | packet `:129-132` | U3 says "no rule changes; PO decision none". The gate's repeat matches only `^e2e/tests/.*\.spec\.ts$` (`scripts/gate.sh`). `students.spec.ts` has about 33 in-file helpers; moved to `e2e/support/`, a helper change triggers no ×3 repeat at all, where today it replays all 58 tests. The external review §5.4 names this blind spot. | State the effect. Either add "a change under `e2e/support/` repeats the importing specs" (a gate change, so a DEC) or flag the narrowing for the PO. |
| D-6 | S3 | packet `:83` | "Measure web coverage once, then set its floor from the measurement" can lower the documented floor (`test-strategy.md:85`: web `model/` and `ui/` ≥ 80 % line) with no PO decision. The backend floor's scope is also unstated; the doc says domain and application packages, per module (`test-strategy.md:83`). | "The floor stays 80 %; if the measurement is below it, the PO decides." Name the JaCoCo check scope (per package or module, not the bundle). |
| D-7 | S3 | packet `:85`, `:136-140` | The separate local E2E database reverses DEC-139 (3) (dev database kept; "E2E designed for a kept DB") and changes what the local gate runs against. It is marked "PO decision: none" and DEC-139 is not cited. Striking `seed-e2e` and the `e2e` profile, and moving PIT off "nightly", appear in no PO row. | Cite DEC-139 (3) as superseded and put it in a PO row or a DEC in the U4 packet. Add the `seed-e2e` strike and the PIT move to PO-3. |
| D-8 | S3 | packet `:22-25`, `:53`; baseline `:192-198` | "The checks themselves are the right ones" rests on defect-finding anecdotes. The external review's §4A audit (risk → assertion → lane map, assertion quality, mutation sample) and the §4.3 shared-state audit were not done and are not under "Not measured". "Where they cannot find anything" is too strong: 2 of the 3 flaky E2E failures were found on docs-only heads, and the backend flake on a post-merge push run. | Add §4A and §4.3 to baseline §9. Soften to "cannot find a product defect". State that U2 removes about 46 % of the suite's executions (54 of 118), so flakes surface later, on implementation heads. |
| D-9 | S3 | baseline `:119`; packet `:49-51` | "CI caught no product defect on a branch we wrote: the local gate had already run the same suite" is a causal claim on 13 runs (10 feature, 3 chore; 8 green) over 22 days and four tasks. CI also differs from local (empty database, 2 workers vs 8). | State n and drop "because", or mark it as a hypothesis. |
| D-10 | S3 | packet `:44-45`; baseline `:151`, `:161` | "A review now costs fewer tokens than the implementation on every UI task" is unsupported for T-M2.15. Its row shows review 157,030 against only the fix round, 51,765; the G1 implementer tokens are absent from `evidence/T-M2.15/summary.md`. G0 packet reviews (91,180 to 116,290 tokens) are also excluded. | "On the three UI tasks with full data (T-M2.17, T-M2.19, T-M2.20), G3 only." |
| D-11 | S3 | packet `:47`; baseline `:182` | "13 of the 37 completed tasks": `progress.json` `completed[]` holds 36. | 36. |
| D-12 | S3 | packet `:208-209`, `:233`; baseline §2 | AC1 asks for the wait split "by change type". The split table is over all 83 successes; by head kind there are only run and minute counts. The Risks line cites "per-kind medians for `feature/` heads" that the baseline never shows. | Add p50/p90 and the test-step share per head kind, or reword AC1 and the risk. |
| D-13 | S3 | baseline `:81-82`; packet `:31-32`, `:69` | "The 33 `docs/*` and `qa/*` runs carried … text only": PR #121 (2 runs in the window) changed `.github/pull_request_template.md`, which is off the allow-list and would run in full. The packet also lists Dependabot heads among "the rest", although they change product dependencies. | Count 31, or note the exception. Say "branches we wrote". |
| D-14 | S3 | packet `:196`, `:230`; `docs/handoff/HANDOFF.md:3` | Scope and "Docs to update" list the handoff, but the branch does not change it; it still reads "T-M2.22 (LC, draft)". `progress.json` has `currentTask.pr: null` while `summary.md:2` says "PR: see `progress.json`". | Update and archive the handoff here, or say it follows in the records PR. Set the PR number. |
| D-15 | S4 | baseline `:196` | "plan item U6" should be U7 (the viewport experiment). | Fix the ID. |
| D-16 | S4 | packet `:97`, `:114`, `:11` | "The changed spec ×20" reads as the whole file (58 tests × 3 viewports × 20). "`.claude/**` holds agent rules only" is inaccurate: `.claude/settings.json` holds the deny rules for `gh pr merge`, `git merge` and pushes to `develop`. "Were reviewed with an adversarial brief" is past tense for a review not yet recorded. | "The changed test by title"; describe `.claude/settings.json` correctly; fix the tense. |

**Ranking:** the stated order (packet `:89`) is "first make a green result trustworthy", yet U4 (unenforced floors, false promises) and the 23 of 40 merges outside merge-gate (U5, "no LC change proposed") sit after U2, a throughput item. The review's §8 puts the selector last, at step 7. The packet's data justifies moving it up, but it should say it inverts that order and why. No separate finding.

**Plain enough for the PO:** yes for the answer section. U2's design constraints need one sentence on what "green" will mean afterwards.

## Figures re-derived

| # | Figure | Result |
|---|---|---|
| 1 | `e2e-smoke` 83 / 16 / 21 over 120 runs, 2026-10-20T08:29Z to 11-11T13:48Z | match (one later run, this PR's, excluded) |
| 2 | p50 16.0, p90 17.7, max 24.9; 1,558 wall minutes | match (15.97 / 17.7 / 24.9 / 1,558.3) |
| 3 | Share by head kind | match on run-level minutes: Dependabot 36 runs, push 36, feature 10, chore 3, qa 3, docs 32 against 30 with job data |
| 4 | Three non-Dependabot E2E failures are flakes (43017673796, 39558521233, 39547482154) | match: Guardians AC4 on tablet once, AC6 dirty form on tablet twice; the other ✘ is the expected-failure guard; the DNS error is present in 39558521233 |
| 5 | Backend failure 40818762069 | match: `anUnrelatedLoginStaysFastDuringABurstOnOneUsername`, 3,249 ms, push to `develop` at `e7c4337` |
| 6 | 13 Dependabot failures, all PR #135's branch; one run with `attempt > 1` | match |
| 7 | 22 identical trees, 18 differing, behind 2 to 131 | counts match; the "through merge-gate" attribution is wrong (D-1) |
| 8 | 21 identical post-merge runs in the window, 15 not | match by merge dates |
| 9 | Gate step times (T-M1.6 to T-M2.20; ×3 repeat 518 / 579-593 / 649-653 / 785-825 s) | match (T-M2.19 low end is 579, not 580) |
| 10 | Review token and minute sums for T-M2.15, .17, .19, .20; per-round ranges | match; the "every UI task" conclusion does not follow (D-10) |
| 11 | Wall-clock: 231 / 172 / 118 min; docs-only 77 / 65 / 43 | match within a minute |
| 12 | `students.spec.ts` 3,305 of 6,379 lines; "58 of 146" declarations | lines match; declarations are 57 of 138 or 60 of 149 by regex, so close, but the counting rule is unstated |
| 13 | Coverage 95.4 % (1,715 / 1,797) and 88.7 % (690 / 778); lowest 75.0 % branches | match (run 43032395476) |
| 14 | Record sizes; 121 history entries; 37 completed | sizes match; completed is 36 (D-11) |
| 15 | External claims marked "holds" | hold: no `schedule:`, JaCoCo `prepare-agent` and `report` only, no web coverage, `qa/` three files (775 lines), 24 reports, no seed script, Chromium only, `retries: 0`, `fullyParallel`, merge-gate step 3 |

Not re-derived: the growth table, the per-step split, the per-task run table.

## Adversarial results

| # | Attack | Covered by the packet? | What the U2 packet must add |
|---|---|---|---|
| A-1 | A PR merged in the GitHub UI while 0 behind with red, pending or cancelled checks (no branch protection, DEC-031). The tree is identical, so (b) skips, and `develop` gets no run on content that never passed. | No. 5 of the 22 identical merges already went outside merge-gate. | Skip only on API evidence of a successful full run for the second-parent SHA; otherwise run in full. |
| A-2 | A behind Dependabot merge starts the only full run; an identical-tree merge within 16 minutes starts a fast-path run in the same `cancel-in-progress` group and cancels it. `develop` ends green and untested. | No. Cancellation on `develop` is real: run 39961950852 (`d890aae`) was cancelled at 19 minutes when #141 merged. | `cancel-in-progress` false for pushes to `develop`, or a fast-path run never cancels a full run; a fixture for it. |
| A-3 | A text-only PR merges on a `develop` whose last full run failed, was cancelled or never ran. Today its PR run fails and blocks; after (a) and (b), `develop`'s tip shows green over red. | No. | The fast path on push requires the previous `develop` commit's run to have succeeded; state who triages a red `develop`. |
| A-4 | Base retarget: `docs/T-x` cut from an unmerged `feature/T-y`, PR opened against `feature/T-y`, so the diff is text and the fast path is green on the head. Retarget to `develop`: no new run (the workflows use default `pull_request` types, which exclude `edited`). merge-gate sees pass by head SHA, 0 behind, base `develop`; path ownership lets `docs/` branches change product paths. Product code merges with no suite. | No. "Unknown base" is listed; a different base is not. | Diff against `origin/develop` regardless of the PR base; a non-`develop` base means full; merge-gate re-check as in D-3; a fixture. |
| A-5 | Classifier output missing. With `if: steps.classify.outputs.heavy == 'true'`, an empty output skips the suite and the job is green. | Partly ("any error means the full job"). | Fix the polarity: heavy steps run unless the output is exactly `text_only=true`; the classify step has no `continue-on-error`; fixtures for empty output and a skipped step. |
| A-6 | Green fast path is indistinguishable from a real pass. `gh pr checks` gives bucket `pass` for both; the job summary is not machine-read; "CI 7/7" in records becomes ambiguous. | No (a summary line only). | A machine-readable marker (step conclusion or annotation), read by merge-gate; records say how many checks were fast-path. |
| A-7 | An allow-listed path becomes build input later. | Partly (proved once in the packet). | A standing check in `docs-check` (it always runs): no tracked symlink or gitlink, and no reference to an allow-listed path from `backend/`, `web/`, `e2e/`, `qa/`, `deploy/` or the workflows. |
| A-8 | Renames, deletions, mode changes, odd filenames, more than 3,000 files. | Renames and deletions yes; the rest no. | `git diff --no-renames -z` with `core.quotePath=false`; fail closed on API truncation; root `*.md` anchored to the root; exact-case match. |
| A-9 | Squash, fast-forward, octopus or direct push, a revert, a multi-commit push. | Implicit only. | "Exactly two parents, else full"; only the pushed tip is judged, so require API evidence for its second parent (A-1). |
| A-10 | `gh pr update-branch`; a PR that is behind. | Sound. A new head gets a new run; a 0-behind head contains the base, so the PR merge ref's tree equals the head's tree. | Record this argument in the U2 packet; it is the basis of (b) and is not written down. |
| A-11 | Classifier needs history or API access. Workflows check out depth 1 with `contents: read`; Dependabot runs get a read-only token. | No. | State the mechanism (`fetch-depth` or `pull-requests: read`) as a permission change; failure means full. |
| A-12 | Shadow mode of 10 PRs proves soundness. | Overstated; the review §6.3 says a small sample with no misses is not proof. | Present shadow mode as a regression check; the fixtures and the adversarial review carry the proof. |

I found nothing in the build, tests, workflows or gate that reads an allow-listed path today, apart from `check_docs.py` and `scripts/tests/`, which run in `docs-check`. `.containerignore` excludes `docs`, `evidence` and `.claude`; the `e2e/support` code only writes under `evidence/`; there are no tracked symlinks or submodules.

**Other plan items**
- **U1:** adds an AC to a packet that already passed G0 (DEC-155); the DEC-153 precedent covers it. No assurance weakening. Fix the ×20 scope (D-16).
- **U6 and U8 (a):** correctly marked for the PO.
- **U8 (b):** safe for the schema (`history` needs `minItems: 1`); `check_docs.py` scans `progress.json` for ID references, so the archive file must stay inside what it checks.

**Cheaper alternatives the plan should mention**
- **Offline replay of the classifier:** over the last 17 task merges it gives 12 text-only, 4 full, and 1 docs PR that goes full (#121). It costs nothing and should precede shadow mode.
- **Fewer pushes to docs PRs:** 16 of the 32 docs-head runs were cancelled by a later push.
- **Open the records PR after the `qa/` PR merges:** avoids the forced update and second run.
- **Dependabot grouping:** it is the largest slice (35 % of minutes, more than text-only heads at 21 %) but has no estimated saving.
- **A manually started full run on `develop`:** replaces the flake sampling U2 removes and keeps a known-green baseline.

Files: `/home/linux/Projects/eng-lms/docs/tasks/T-M2.22-qa-strategy-review.md`, `/home/linux/Projects/eng-lms/evidence/T-M2.22/baseline.md`, `/home/linux/Projects/eng-lms/evidence/T-M2.22/summary.md`, `/home/linux/Projects/eng-lms/docs/10-governance/decision-log.md` (DEC-157), `/home/linux/Projects/eng-lms/scripts/merge-gate.sh`, `/home/linux/Projects/eng-lms/scripts/gate.sh`, `/home/linux/Projects/eng-lms/.github/workflows/e2e-smoke.yml`.

## LC response to round 1

All findings accepted and fixed in the packet and the baseline: D-1 (17 through merge-gate, 5 up-to-date Dependabot merges outside it,
18 behind; U5 and DEC-157 corrected); D-2, D-3 and A-1..A-12 (U2 rewritten: API evidence of a successful full run for switch (b),
merge-gate recomputes text-only and requires the heavy step to have run, diff always against `develop`, fixed polarity, no cancelling
of full runs, standing check, offline replay before shadow mode; PO-2 on the same conditions as PO-1; `.claude/**` off the allow-list);
D-4 (the matrix row and PO-3 say the recommendation narrows DEC-131 (7)); D-5 (U3 states the helper blind spot and adds the
`e2e/support/` repeat rule, PO-9); D-6 (the web floor stays 80 %; JaCoCo scope named); D-7 (DEC-139 (3) cited as superseded, PO-10;
the `seed-e2e` strike and PIT in PO-3); D-8, D-9, D-10 (claims softened, sample sizes stated, the external review §4A and §4.3 audits
listed as not done); D-11 (36); D-12 (duration by head kind added); D-13 (PR #121 noted); D-14 (handoff and PR number in this PR);
D-15, D-16 (IDs, wording). The ranking note now states the departure from the external review §8 order and why.

## Round 2 (delta, the same reviewer resumed) at `d106600` — 39,511 tokens (180,715 cumulative − 141,204), 149.7 s

DOCS-REVIEW T-M2.22: PASS
PASS WITH MINOR: all four S2 are closed; three S3 and three S4 are new in the round 2 text (N-1 to N-6).

## Check results
- `./scripts/check-docs.sh`: PASS (284 markdown files, exit 0).
- **AC7 is not met yet:** `e2e-smoke` failed on `d106600` (run 43042804940) in the Playwright browser install step ("Installation process exited with code: 100"), before any test ran. The other six checks pass; it needs a re-run.
- `evidence/T-M2.22/review/docs.md` is a faithful record of round 1; the LC response matches what the commit changed.

## D-1 to D-16

| ID | State | Where |
|---|---|---|
| D-1 (S2) | closed | packet `:34-35`, `:52-53`, `:72`, `:177-179`; baseline §2 post-merge paragraph; DEC-157 ("all 17 task merges…; 23 of the last 40… 18 behind") |
| D-2 (S2) | closed | packet `:114-117` (two parents, tree equality, API evidence of a successful full run), `:132-133` (no cancelling), `:155` and `:228` (PO-2 on PO-1's conditions); see N-1 |
| D-3 (S2) | closed | packet `:123-128` (merge-gate recomputes, heavy step `success` not `skipped`, diff against `origin/develop`, §6.3 adopted), `:118-119`, `:227` |
| D-4 (S2) | closed | packet `:84` (narrows DEC-131 (7); what is lost), `:229` |
| D-5 | closed | packet `:161-164`, `:235` (PO-9) |
| D-6 | closed | packet `:85`, `:169-170` |
| D-7 | closed | packet `:87`, `:229`, `:236` (PO-10) |
| D-8 | closed | packet `:25-26`, `:55`, `:142-144`, `:245-246`; baseline §9 |
| D-9 | closed | baseline §3; packet `:278-279` |
| D-10 | closed | packet `:45-47`; baseline §5 |
| D-11 | closed | packet `:49`; baseline §7 |
| D-12 | closed | baseline "Job duration by head kind"; packet `:253-254`, `:278-279` |
| D-13 | closed | packet `:32-33`, `:71`; baseline §2 |
| D-14 | accepted-pending | PR number set (`progress.json`, `summary.md:2`); the handoff follows in the records commit |
| D-15 | closed | baseline §9 (U7) |
| D-16 | closed | packet `:103`, `:112-113`, `:11` |

## Attack coverage

| # | Covered by | State |
|---|---|---|
| A-1 | switch (b) `:114-117` | covered |
| A-2 | constraint 5 | covered only together with constraint 6; see N-2 |
| A-3 | constraint 6 | covered in intent; not yet well defined, see N-2 |
| A-4 | constraints 2 and 3 | covered |
| A-5 | constraint 4 | covered |
| A-6 | `:118-119`, constraints 2 and 9 | covered. merge-gate can see a step conclusion: `gh run view <id> --json jobs` returns `steps[].conclusion`, which is `skipped` for a skipped step |
| A-7 | constraint 7 | covered |
| A-8 | constraint 4 | mostly covered; `-z`/quoting, exact case and root-anchoring of `*.md` are left to the U2 packet |
| A-9 | `:114`, `:116-117` | covered |
| A-10 | not written down | open, S4 (N-6) |
| A-11 | constraint 8 | covered |
| A-12 | Validation `:148-152` | covered |

## New findings

| ID | Sev | File:line | Finding | Suggested fix |
|---|---|---|---|---|
| N-1 | S3 | packet `:114-117`, `:142`, `:153-154`, `:228`; baseline §2 ("54 of 118 runs") | (b) as written contradicts the stated effect. A text-only PR head has only fast-path runs, so "a successful full (not fast-path) run on the second-parent SHA" is never true for it, and its post-merge run goes full. By my replay that is 12 of the 17 task merges; only about 9 of the 21 identical-tree runs would skip. The 46 % and "runs per task fall to those on the implementation branch" then overstate. The error is in the safe direction, but if the LC means the wider rule, PO-2 does not approve it as worded. | Choose one and write it in (b) and PO-2. Either keep the rule and lower the expected effect, or add: "or the second parent is text-only against the first parent and the first parent's run is green (constraint 6)". |
| N-2 | S3 | packet `:132-135` | Constraint 6 is not well defined: which commit (first parent?), which run (push event, same workflow, latest attempt?), and whether a fast-path green counts. It should also say that missing, in-progress, pending, cancelled and failed all mean full. Constraint 5 alone is not enough: with `cancel-in-progress` off, GitHub still replaces a *pending* run in the group when a newer one queues, so a queued full run can be dropped. Constraint 6 rescues this only if "cancelled" counts as not green. | Define it in one sentence as above. For constraint 5, put the SHA in the concurrency group for pushes to `develop`, or state the reliance on constraint 6. |
| N-3 | S3 | packet `:120-140` | The round 1 sentence "the allow-list is a file under `scripts/` with tests in `scripts/tests/`" was dropped. The classifier and merge-gate now both compute "text-only"; two copies of the list can drift. | Restore it: one list file, read by both; merge-gate reads it from the `develop` checkout. Say that release and hotfix PRs to `master` always require the full run. |
| N-4 | S4 | packet `:92-96`, `:234` | "The external review puts … enforcement of floors before throughput" is not its §8 order: sharding (throughput) is step 2 and floors are step 4. The "untrustworthy assurance first" line is a principle in its §4A. "U4 before U2, the external review's order" is therefore not the review's order either. | "Puts selection last (step 7), after floors (step 4), and states the principle in §4A"; in PO-8 say "U4 before U2". |
| N-5 | S4 | baseline "Job duration by head kind" and §2 split paragraph | "The test step is about 93 % of the job" sits next to "browser test execution is about 90 % of the job"; the two measure different things (the `e2e-run.sh` step against Playwright alone). The table itself is consistent with my run-level figures (83 successes: 6 / 2 / 14 / 3 / 23 / 35; job p50 plus queue matches run p50 and p90 per kind). | Name what each percentage measures. |
| N-6 | S4 | packet U2 | The argument that makes (b) sound is still unwritten: a 0-behind head contains the base, so the PR run's merge ref has the head's tree. | One sentence under (b). |

Nothing added this round weakens merge assurance without a PO row: the gate change in U3 is PO-9, the local database is PO-10, the merge-gate change is in PO-1, and the matrix is PO-3.

Not checked: the job-level numbers in the new head-kind table (I compared against run-level durations only), and the 141,204-token / 7.9-minute cost row. Risk to know: N-1 decides how much PO-2 actually saves, so fix it before the PO reads the row.

## LC response to round 2

N-1: switch (b) and PO-2 now state the wider rule (a text-only second parent on a green first parent also skips). N-2: constraint 6
defines green (first parent, same workflow, `push` run, latest attempt, `success`; anything else means full) and constraint 5 puts the
SHA in the concurrency group. N-3: one allow-list file read by the classifier and merge-gate; PRs to `master` always run in full.
N-4, N-5, N-6: wording. The failed `e2e-smoke` run 43042804940 was a browser-install failure before any test; the next head re-ran it.
No further re-check: S3 and S4 only (DEC-131 (5)).
