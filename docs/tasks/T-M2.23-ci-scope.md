# T-M2.23: CI runs the heavy jobs only where the diff can affect them (built and merged in shadow mode)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 pending) |
| Owner role | LC (implements the scripts, workflows and docs; G3 by a fresh docs-reviewer with an adversarial brief) |
| Branch | `chore/T-M2.23-ci-scope` (from `develop`); this packet on `docs/T-M2.23-ci-scope` |
| Depends on | T-M2.22 (`c93d128`) and the PO's decision DEC-158 (PO-1, PO-2): done |
| Estimate | 2 agent-days |
| Risk tier | **L**: scripts, script tests, workflows and docs only; no product code, endpoint, UI or data. It changes merge assurance, so G0 and G3 each carry an adversarial brief (DEC-157, the T-M2.22 backlog row) |
| Trace | T-M2.22 U2 and its nine design constraints (packet `T-M2.22-qa-strategy-review.md`); attacks A-1..A-12 and N-1..N-3 (`evidence/T-M2.22/review/docs.md`); DEC-157, DEC-158 (PO-1, PO-2), DEC-160 (this packet's decisions); DEC-031 (no branch protection); lessons-learned L-01; coding-agent-rules §4.5; ci-cd.md §1, §2; git-governance §4 |

## Goal
41 % of the `e2e-smoke` minutes go to runs that cannot find a product defect: runs on PRs that change only text, and runs after a merge
on a tree that had just passed ([baseline](../../evidence/T-M2.22/baseline.md) §2). This task builds the two switches the PO accepted
(DEC-158 PO-1, PO-2) and proves them with fixtures, an offline replay and an adversarial review. **It merges in shadow mode:** the
classifier decides and reports, and every heavy step still runs. Nothing is skipped until T-M2.26 switches it on, after at least 10 PRs
in shadow mode without a wrong decision.

## Terms (used by every section below)
- **Heavy job:** `e2e-smoke`, `backend`, `web`, `contract-drift`, `container-build`. **Always-full job:** `docs-check`, `secrets-scan`.
- **Allow-list:** `scripts/ci-text-only.paths`, one anchored extended regular expression per line (`#` comments and empty lines
  ignored). Its four lines: `^docs/`, `^evidence/`, `^progress\.json$`, `^[^/]+\.md$`. Matching is byte-exact (`LC_ALL=C`), so
  `Docs/x.md` and `.claude/x.md` are off the list.
- **Text-only diff** between two trees: `git diff --raw -z --no-renames <old> <new>` (with `core.quotePath=false`) lists at least one
  entry, every path matches the allow-list, and every old and new mode is `100644` or `000000`. So a symlink (`120000`), a submodule
  (`160000`), an executable bit or any other mode change is not text-only, and a rename counts as a deletion plus an addition, each
  judged by its own path.
- **Fast path:** a heavy job that ends green without its heavy steps. **Full run:** a heavy job whose marker step concluded `success`.
- **Marker step:** the last step of each heavy job, named `Full run on <base>`, where `<base>` is `github.base_ref` on a pull request
  and `github.ref_name` on a push. It runs only on the full path and only when every earlier step passed. Its conclusion (`success` or
  `skipped`) is how a machine tells a full run from a fast path (A-6).
- **Verdict:** what the classifier decided, `fast-path` or `full`, with a reason. **Mode:** `scripts/ci-scope.mode`, one word. Only
  the exact content `enforce` lets a `fast-path` verdict skip anything; this task commits `shadow`.

## Scope
- In:
  1. **The allow-list file and the classifier** `scripts/ci-scope.sh` (bash, `git`, `jq`, `gh`; no new tool). It runs as the first
     step after checkout in every heavy job (step id `scope`) and writes three step outputs: `scope` (`fast-path` or `full`),
     `verdict` and `why`. It also prints one line, `ci-scope: mode=<mode> verdict=<verdict> why=<why>`, as a `::notice` and to the job
     summary. In shadow mode `scope` is always `full`. The script exits non-zero only on a usage error; every other problem gives
     `verdict=full` with the reason.
  2. **Switch (a), pull requests.** The verdict is `fast-path` only when all of these hold; anything else is `full`:
     - the event is `pull_request` and `github.base_ref` is exactly `develop` (PRs to `master` and to any other branch run in full);
     - `HEAD` (the PR merge ref) has exactly two parents and its second parent is the PR head SHA of the event;
     - the diff from `HEAD^1` (the `develop` commit GitHub merged the PR with) to `HEAD` is text-only.
     This mode uses no API and no token, so it works on Dependabot PRs. The checkout of the heavy jobs gets `fetch-depth: 2`.
  3. **Switch (b), pushes to `develop`.** The verdict is `fast-path` only when all of these hold; anything else is `full`:
     - the event is `push` and the ref is exactly `refs/heads/develop` (`master` always runs in full);
     - `HEAD` has exactly two parents, `HEAD^1` equals the event's `before` SHA (the push added this one merge commit), and the tree
       of `HEAD` equals the tree of `HEAD^2`;
     - `HEAD^2` is 0 commits behind `HEAD^1` (compare API, `behind_by == 0`);
     - and one of:
       **(b1)** the latest `pull_request` run of the same workflow with head SHA `HEAD^2` concluded `success` (its latest attempt) and
       that run's job has the step `Full run on develop` with conclusion `success`; or
       **(b2)** the diff from `HEAD^1` to `HEAD` is text-only **and** `HEAD^1` is green: the latest attempt of the same workflow's
       `push` run on `develop` with head SHA `HEAD^1` concluded `success`, in full or by a fast path. A missing, queued, running,
       cancelled, skipped or failed run is not green.
     An API error, an unexpected response shape or a listing that is not complete means `full`.
  4. **The workflows** (`backend.yml`, `web.yml`, `contract-drift.yml`, `e2e-smoke.yml`, `container.yml`): checkout with
     `fetch-depth: 2`; the `scope` step (no `if:`, no `continue-on-error`, `GH_TOKEN` from `github.token`); every later step carries
     `steps.scope.outputs.scope != 'fast-path'` in its `if:` (joined with `&&` to a condition it already has, such as `always()`),
     except the upload and warning steps that run only on a failure; the marker step last. `permissions:` gains `actions: read` beside
     `contents: read`. The concurrency group becomes `<workflow>-${{ github.event_name == 'push' && github.sha || github.ref }}`, so
     two pushes to `develop` never share a group and no post-merge run is cancelled or dropped (constraint 5). `docs-check.yml` and
     `secrets-scan.yml` do not change, apart from the standing check below running inside `docs-check`.
  5. **`merge-gate.sh`** (it runs from the `develop` checkout and reads the allow-list beside it):
     - It recomputes text-only itself from the paginated PR files API: the base is `develop`; the listing has as many entries as the
       PR's `changedFiles`, at least 1 and fewer than 3,000; every `filename` and every `previous_filename` matches the allow-list; and
       every `status` is `added`, `modified`, `removed` or `renamed`. Anything else, or an API error, is "not text-only".
     - For a PR that is **not** text-only, every check on the head other than `docs-check` and `secrets-scan` must be a full run: its
       job (from the check's own run, with the job's head SHA equal to the PR head) has the step `Full run on <base>` with conclusion
       `success`. A missing step, another conclusion, a marker for another base or an API error refuses the merge and names the check.
       This holds on every merge path, including `release/`, `hotfix/` and `dependabot/`.
     - For a text-only PR the existing rules alone apply (every required check `pass`, nothing failing or pending).
     - On success it prints one more line: `merge-gate: scope <text-only|full>; checks: <n> full, <m> fast-path`.
  6. **The standing check in `check-docs`** (constraint 7; `docs-check` always runs in full): it fails when the tree tracks a symlink
     or a submodule (`git ls-files -s` mode `120000` or `160000`), and when a tracked file under `backend/`, `web/`, `e2e/`, `qa/`,
     `deploy/`, `api/`, `scripts/` or `.github/workflows/` mentions an allow-listed path (`docs/`, `evidence/`, `progress.json` or a
     root `*.md` name) and is not listed in `scripts/ci-text-only.known-mentions`. That file holds one path and one reason per line
     ("comment only", "writes only", "runs in docs-check or locally only"); it starts with the files found today. A new mention
     therefore fails until a reviewer accepts it, on a PR that is not text-only because the list is under `scripts/`.
  7. **Offline replay:** `scripts/ci-scope.sh replay <n>` classifies the last `n` first-parent merge commits of `origin/develop` with
     the same diff function (text-only between `M^1` and `M^2`; tree of `M` equal to the tree of `M^2`) and prints one line per merge.
     The LC runs it over the last 60 merges and records the table in the summary, with every merge it calls text-only checked by
     `git diff --name-only M^1 M^2`.
  8. **Fixtures** for every rule above (L-01): see "Constraint to fixture map". Each rule is also mutated off once and seen failing.
  9. **Docs:** ci-cd.md §1 (the two switches, shadow mode, the marker, the concurrency group, the `actions: read` permission) and §2
     (the merge-gate rule); git-governance §4 (one sentence on the scope line and the marker rule); quality-gates G2 and G4 ("green"
     means full or fast-path, and merge-gate says which); the header comments of the five workflows; evidence-and-handoff part C
     (records write "CI 7/7 (m fast-path)" from the merge-gate line); lessons-learned (a row only if the work teaches one).

## Out of scope (explicit)
- **Switching it on.** `scripts/ci-scope.mode` stays `shadow`. T-M2.26 changes it to `enforce` after the shadow report.
- Any change to what a heavy job runs when it runs in full, to `required-checks.txt`, to the verdict tokens or to the local `gate.sh`.
- `paths:` filters, sharding (U9), fewer viewports (U7), one records PR (U6, PO-5), Dependabot grouping or ignoring (U5, the PO's).
- The manually started full run on `develop` (the `regression` workflow, T-M2.25). Until it exists the replacement sample for flaky
  tests is `gh run rerun` of a `develop` run.
- T-M2.13 (held), T-M2.24, T-M2.25. GitLab CI (paused, DEC-107).

## Guardrail answers (scope.md §6)
1. **Trace:** DEC-158 PO-1, PO-2; T-M2.22 U2. 2. **Drift toward excluded scope?** No: delivery tooling only. 3. **Mandatory setup
added?** None: `git`, `jq`, `gh`, bash as today; no new infrastructure, secret or repository setting. 4. **Weekly use?** Every PR and
every merge. 5. **Hard-coded semantics?** None.

## Design notes
- **Why (a) is sound.** The PR run tests the merge ref `T`. If the diff from the `develop` commit `D` to `T` is text-only, then `T` is
  `D` plus text that no build input reads (standing check, scope 6). A stale `D` is covered by merge-gate, which wants the head 0
  commits behind `develop`: an update makes a new head and a new run.
- **Why (b1) is sound** (A-10, N-6): a head that contains `HEAD^1` contains every earlier `develop` tip, so each PR run on that head
  tested a merge ref whose tree is the head's tree, which is the tree of the merge commit. Tree equality alone is not enough: a head
  that was behind when it ran was tested merged with other content, hence the `behind_by == 0` condition.
- **Why (b2) is sound:** the merge commit's tree is a green tree plus text. A text-only merge cannot paint green over a red or
  untested `develop`, because then `HEAD^1` is not green and the run is full (A-3). The LC triages a red `develop` before the next merge.
- **What the switches do not cover, unchanged from today:** a PR that edits a workflow or a script can make a job pass without
  testing. Such a PR is never text-only, so it gets the full run and the review of its tier; merge-gate is read from `develop`, not
  from the PR.
- **Contradiction scan (lessons L-03), each resolved here and in DEC-160:**
  (a) T-M2.22 constraint 3 says the classifier diffs against `origin/develop`. The heavy jobs check out with
  `persist-credentials: false`, so a later `git fetch` of this private repository has no credentials. The first parent of the merge
  ref is the `develop` commit when the base is `develop`, and `fetch-depth: 2` already holds it. The rule keeps its meaning: never the
  PR's own base branch; a base other than `develop` runs in full.
  (b) T-M2.22 constraint 2 says merge-gate requires "the heavy step" to have succeeded. A marker named after the base is stricter: a
  PR retargeted to `develop` (A-4) keeps runs whose marker names the old base, so merge-gate refuses until a new push runs against
  `develop` (a re-run keeps the old event). The message says so.
  (c) T-M2.22 validation (5) names T-M2.13 as "the measurement after adoption", and PO-8 runs shadow mode during T-M2.13. Both cannot
  hold. Resolution: T-M2.13 gives the **projection** (the shadow notices: which runs would have skipped, and their minutes); the first
  task after T-M2.26 gives the measured figure. PO-5 (one records PR) is asked after that figure.
  (d) ci-cd.md §1 and the workflow headers say "every PR (no path filter: required checks must always report)". That stays true:
  the jobs always start and report; the switch is inside the job (constraint 1).
  (e) `container-build` is a heavy job but not a required check. merge-gate does not start requiring it to exist; it requires the
  marker of every non-always-full check that reports on the head, so a future job without a marker is refused until it gets one.
  (f) `backend.yml` has `if: always()` steps (coverage summary, uploads) and `scripts/tests/workflow-warnings.test.sh` pairs each
  `continue-on-error` step with a warning step. The coverage summary gets the scope condition; the failure-only upload and warning
  steps keep their conditions, and the kept test stays green unchanged.
  (g) merge-gate step 0 needs a `pull_request` run for the head to date its arrival. A fast-path run is still a run: unchanged.
  (h) Open PRs whose runs predate this change have no marker. After the merge each needs `gh pr update-branch` (a new run) before
  merge-gate accepts it. Dependabot PRs that the PO merges in the GitHub UI are outside merge-gate as before (DEC-031); switch (b)
  covers them: merged behind, or on a head without a successful full run, the post-merge run is full (A-1).
- **Shortcut ledger** (L-12; `grep -rnE '(shortcut|ponytail):'`): no marker in `scripts/` or `.github/`; none fires.
- **Size and split (DEC-160):** the switch-on is its own small task, T-M2.26, because it waits for at least 10 PRs of other work.
  If the work passes 2 agent-days, the split line is switch (b) (scope 3 and its fixtures) into a follow-up; (a) and merge-gate stay together.

## UI rules
- Not applicable: no UI change.

## Domain rules
- Not applicable: no data written by the product.

## Constraint to fixture map (T-M2.22 U2 constraints 1 to 9; each fixture must be seen failing, L-01)

| # | Constraint | Where it is met | Failing fixture (the violating input and what must happen) |
|---|---|---|---|
| 1 | The job still reports and passes | scope 4, AC4 | A workflow copy with a job-level `if:` or a `paths:` filter fails the workflow test |
| 2 | merge-gate recomputes text-only and wants a full run otherwise | scope 5, AC5 | mock PR with one product file and marker `skipped` on `e2e-smoke`: refused. The same PR with the marker `Full run on feature/T-y`: refused (A-4) |
| 3 | Diff against `develop`; other bases in full | scope 2, AC2 | PR event with base `feature/T-y` and a text-only diff: `full`. Base `master`: `full` |
| 4 | Fail closed, fixed polarity, one allow-list | scopes 1, 2, 4; AC1, AC2, AC4 | Each row of the AC1 table; a `scope` step with `continue-on-error`, or a heavy step whose `if:` reads `== 'full'`, fails the workflow test; an empty or missing `scope` output runs the heavy steps |
| 5 | A fast path never cancels or replaces a full run | scope 4, AC4 | A workflow copy whose group lacks `github.sha` for pushes fails the workflow test |
| 6 | Green first parent is defined | scope 3, AC3 | (b2) with the first parent's run missing, queued, in progress, cancelled or failed, or only a `pull_request` run: `full` each time |
| 7 | Standing check in `docs-check` | scope 6, AC6 | A fixture tree with a tracked symlink, one with a gitlink, and one with a new `web/` file that mentions `docs/`: `check-docs` exits 1 each time |
| 8 | Permissions stated; failure means full | scope 4, AC3, AC4 | The API answering 403 in push mode: `full`. A workflow copy without `actions: read` fails the workflow test |
| 9 | Records say how many checks were fast-path | scope 5, AC5, AC9 | merge-gate output on a mock text-only PR with five skipped markers must read `5 fast-path`; a miscount fails |

## Acceptance criteria
- AC1 (allow-list and diff, constraint 4): `scripts/ci-text-only.paths` holds exactly the four lines above and is the only place the
  list exists (the classifier, merge-gate and `check-docs` read it). On fixture repositories the diff function says text-only for:
  a changed `docs/a.md`; an added `evidence/T-x/shot.txt`; a changed `progress.json`; a changed root `README.md`; a deleted `docs/a.md`;
  a rename inside `docs/`. It says **not** text-only for each of: an empty diff; `web/src/a.ts`; `.claude/settings.json`;
  `.github/pull_request_template.md`; `scripts/ci-text-only.paths`; `docs/a.md` together with one `backend/` file; `web/README.md`
  (a `*.md` below the root); `Docs/a.md`; a rename from `docs/a.md` to `web/a.md` and the reverse; a symlink added under `docs/`; a
  submodule added under `docs/`; `docs/a.md` gaining the executable bit; a path with a newline or a quote in its name outside the
  list; and an allow-list file that is missing or empty.
- AC2 (switch (a), constraints 3, 4): on fixture repositories with a real two-parent merge commit, the PR mode gives `fast-path` for a
  text-only PR to `develop` and `full` for: base `master`; base `feature/T-y`; an event other than `pull_request`; a `HEAD` with one
  parent; a second parent that is not the event's head SHA; a checkout without `HEAD^1` (depth 1); any AC1 "not text-only" diff.
- AC3 (switch (b), constraints 6, 8; A-1, A-2, A-3, A-9): with the mock `gh`, the push mode gives `fast-path` for (b1) and for (b2)
  as defined in scope 3, and `full` for each of: a push to `master`; a one-parent commit (squash, revert, direct push); three parents;
  `before` not equal to `HEAD^1`; a tree that differs from the second parent's; `behind_by` 1; (b1) with the run failed, cancelled, in
  progress, missing, a marker `skipped`, a marker for another base, or only an older attempt successful; (b2) with each not-green
  state of constraint 6; a diff that is not text-only with no full run on the head; an API error (403, 5xx, non-JSON, an empty page).
- AC4 (workflows, constraints 1, 4, 5, 8): a new script test reads the five heavy workflows and fails unless each has: `fetch-depth: 2`;
  the `scope` step right after checkout without `if:` or `continue-on-error`; the exact condition
  `steps.scope.outputs.scope != 'fast-path'` on every later step except failure-only upload and warning steps; the marker step last,
  named `Full run on ${{ github.base_ref || github.ref_name }}`, with the same condition and no `always()`; no job-level `if:` and no
  `paths:` filter; `actions: read`; and the concurrency group of scope 4. Each of these has a mutated workflow copy that fails the test.
  `docs-check.yml` and `secrets-scan.yml` hold no `scope` step (also tested).
- AC5 (merge-gate, constraints 2, 9; A-4, A-6): with the mock `gh`, merge-gate refuses a not-text-only PR when any non-always-full
  check has no marker, a marker `skipped` or `failure`, a marker for another base, a job for another head SHA, or when the jobs API
  fails; it accepts the same PR when every marker is `success`. It accepts a text-only PR with skipped markers. It treats as not
  text-only: a file off the list; a rename from or to a path off the list; a `changedFiles` count that differs from the listing; 3,000
  files; status `copied`; a files API error. The scope line reads as in scope 5 with correct counts. All existing merge-gate cases pass
  with their mock gaining markers; no existing assertion is removed or weakened.
- AC6 (standing check, constraint 7; A-7): `check-docs` fails on a tracked symlink, on a gitlink, and on a file under a scanned
  directory that mentions an allow-listed path and is not in `scripts/ci-text-only.known-mentions`; it passes on the real tree with
  every listed file carrying a reason, and fails on a listed path that no longer exists or no longer has a mention (the list cannot rot).
- AC7 (shadow mode): with `scripts/ci-scope.mode` holding `shadow`, an empty file, a missing file or any other content, the `scope`
  output is `full` whatever the verdict; only the exact content `enforce` passes a `fast-path` verdict through (fixtures). The file
  committed by this task holds `shadow`. On this task's own PR every heavy job runs in full and prints its notice line.
- AC8 (offline replay; A-12): the summary holds the replay over the last 60 merges of `develop`: per merge the PR, the verdict for (a)
  and for the tree condition of (b), and the LC's check of every text-only verdict against `git diff --name-only`. No merge that
  changed a path off the list is called text-only. The 17 task merges of the T-M2.22 window give 12 text-only, 4 full and PR #121
  full, or the summary explains each difference.
- AC9 (docs and records, constraint 9): the docs of scope 9 describe the built behaviour, state that it is in shadow mode, and say
  that T-M2.26 switches it on; evidence-and-handoff part C tells the LC to copy the fast-path count from the merge-gate line.
- AC10 (gate): `ENGLMS_TASK=T-M2.23 ./scripts/gate.sh` green once on the final head and CI green with every heavy job in full;
  `scripts/tests/run-all.sh` passes; every existing script test and assertion is kept; the mutation run of scope 8 is in the summary.

## Test plan
- Implementation: fixture repositories built in a temporary directory (the `git -c user.name=… -c user.email=…` pattern of
  `scripts/tests/gate.test.sh`), `scripts/tests/mock-gh` extended for the runs, jobs and compare endpoints, and a line scanner for the
  workflows in the style of `scripts/tests/workflow-warnings.test.sh` (the `docs-check` job has no YAML library). New suites:
  `scripts/tests/ci-scope.test.sh` (AC1 to AC3, AC7) and `scripts/tests/ci-scope-workflows.test.sh` (AC4); cases added to
  `merge-gate.test.sh` (AC5) and `check-docs.test.sh` (AC6). A mutation run per rule: the rule is commented out and at least one of its
  cases fails.
- **When a new check finds a real defect** outside this packet's allowed change (L-10), such as a build input that does read an
  allow-listed path, or a replay merge that the rules misjudge: the LC records it as an open question at once and rules before G3
  (narrow the allow-list, or fix the reader, with a DEC). The allow-list is never widened in this task.
- Independent review focus (fresh docs-reviewer, tier L, adversarial): run every new suite and the mutations; then try to make a
  change to `backend/`, `web/`, `e2e/`, `scripts/` or a workflow reach `develop` with a `fast-path` verdict or past merge-gate without
  a full run, at least through: A-1 to A-12; a retarget; a force-push between the run and the gate; a re-run of an old attempt; a
  crafted file name; a workflow step renamed to the marker's name on a non-text PR (expected: possible only on a PR that is itself
  full and reviewed, as today); an allow-list edited in the PR (expected: merge-gate reads `develop`'s copy). Check that shadow mode
  cannot skip anything, and that no rule beyond DEC-158 PO-1 and PO-2 changed.
- **Isolation:** not applicable (no endpoint).

## Evidence required
- `evidence/T-M2.23/summary.md` (LC: AC → proof, the constraint map with each fixture's failing output, the mutation run, the replay
  table, the self-check list, the G3 cost table), one gate log on the final head and green CI, and the G3 record
  `evidence/T-M2.23/review/docs.md` written by the LC from the reviewer's returned text.

## Docs to update
- Scope 9; `docs/tasks/backlog.md` (T-M2.23 row, the new T-M2.26 row); `docs/10-governance/decision-log.md` (DEC-160, and the merge
  DEC); `progress.json`; the handoff.

## Risks & assumptions
- **A wrong `fast-path` verdict** is the risk of the whole item. In this task it can skip nothing (shadow mode); the fixtures and
  the adversarial review carry the proof, and shadow mode is a regression check on real PRs, not proof (A-12).
- **merge-gate becomes stricter at once**, also in shadow mode: every not-text-only PR needs its markers. A bug there refuses a
  legitimate merge (it cannot allow a wrong one). Rollback: revert the merge-gate commit.
- **The standing check is a text search**, so a reader that builds a path at run time escapes it. Mitigation: the scanned
  directories hold no such code today (G0 review of T-M2.22), the container build context excludes `docs` and `evidence`
  (`.containerignore`), and reviewers of non-text PRs see new readers.
- **About 46 % of the suite's executions disappear after T-M2.26**, so a flaky test surfaces later, on an implementation head (T-M2.22 U2 risk).
- Assumptions to verify during implementation, each with a fixture or a recorded API response: the Actions jobs API returns
  `steps[].name` with the expression already expanded; a `pull_request` run's `head_sha` is the PR head, not the merge ref; a re-run
  keeps the original event. If one is false the LC stops and rules (L-10).
- **Rollback:** revert the workflow and merge-gate commits; every job runs in full again and merge-gate reads checks as before.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
export CONTAINER_HOST=unix:///run/user/1000/podman/podman.sock
git fetch origin
bash scripts/tests/ci-scope.test.sh
bash scripts/tests/ci-scope-workflows.test.sh
bash scripts/tests/merge-gate.test.sh
bash scripts/tests/check-docs.test.sh
./scripts/tests/run-all.sh
./scripts/ci-scope.sh replay 60
./scripts/check-docs.sh
ENGLMS_TASK=T-M2.23 ./scripts/gate.sh
./scripts/check-path-ownership.sh chore/T-M2.23-ci-scope
```
