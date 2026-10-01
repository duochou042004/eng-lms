# Git Governance

> Trace: PO directive (master = releases; develop = integration; feature and fix branches from develop; merge only after green checks, updated docs and progress,
> and LC approval; `--no-ff` when useful; delete obsolete branches). Tooling: git + GitHub CLI (`gh`).

## 1. Branch model

```text
master   ●────────────────────────────●──────────────── (tags v1.0.0, v1.1.0 …)  releases only
          \                          / (merge commit)
develop    ●───●───────●───────●────●──────●───────────   integration (always green)
                \     / \     /    / \    /
feature/T-M1.2   ●──●    \   /    /   ●──●   fix/T-M5.9-...
docs/T-M1.1          ●───●  /    release/1.0.0 ●──● (fixes only) ─► master + back-merge to develop
hotfix/1.0.1   (from master) ───────────────► master + develop
```

| Branch | From | Into | Naming | Lifetime |
|---|---|---|---|---|
| `master` | — | — | — | permanent; only release/hotfix merges |
| `develop` | master (initial) | — | — | permanent |
| `feature/<task-id>-<slug>` | develop | develop | `feature/T-M2.3-add-student` | deleted after merge |
| `fix/<task-id>-<slug>` | develop | develop | `fix/T-M5.9-autosave-retry` | deleted after merge |
| `docs/…`, `chore/…` | develop | develop | `docs/T-M0.1-planning-baseline` | deleted after merge |
| `qa/<task-id>` | develop | develop (QA scenarios only) | `qa/T-M2.3` | deleted after merge |
| `release/<x.y.z>` | develop | master + develop | `release/1.0.0` | deleted after release |
| `hotfix/<x.y.z>` | master | master + develop | `hotfix/1.0.1` | deleted after release |

## 2. Commits

Conventional Commits: `feat|fix|docs|test|refactor|perf|build|ci|chore(scope): summary` (≤ 72 characters, imperative). The body explains *why*.
Trailers: `Task: T-M2.3`, `Refs: FR-STU-01, DEC-012`, and the co-author attribution line required by the environment when an agent authored the commit.

## 3. Pull requests

- One task → one PR → one merge. Template: `.github/pull_request_template.md` (trace, summary, screenshots, checklist, evidence).
- Titles follow the commit convention and include the task ID: `feat(students): add student with credentials card [T-M2.3]`.
- Reviews: QA, SEC and UX post verdicts as PR comments using fixed prefixes (`QA-VERDICT T-M2.3: PASS`, `SEC-REVIEW T-M2.3: APPROVED`, `UX-REVIEW T-M2.3: APPROVED`).
  The LC approves with `LC-APPROVED T-M2.3` (or a formal review when branch protection is available).

## 4. Merging

- **Only the LC merges**, only through `scripts/merge-gate.sh [--dry-run] <pr-number>` (`--dry-run` may also follow the number; any other argument, a second or non-numeric PR, or no PR exits 2 before any API call, so a mistyped flag never merges: T-M1.12, DEC-074). The script checks that all CI checks are green (`gh pr checks`), the required verdict comments are present,
  the branch is up to date with its base, and `progress.json` changed in the PR (judged on the paginated REST file listing, since `gh pr view` stops at 100 files: T-M1.15). Then it runs `gh pr merge <n> --merge --delete-branch`.
- The merge method is a **merge commit** (the `--no-ff` equivalent): task history stays grouped, and reverting a task is one `git revert -m 1`.
- Squash merges are not used (they lose the per-step history the evidence refers to). Rebase-merging onto develop is not used.
- There are no local merges into `develop` or `master`. The only exception ever made was the one-time bootstrap merge (DEC-030). Back-merges from `master` into `develop` go through a
  `chore/<task-id>-backmerge-x.y.z` branch created from `master` and a normal PR.
- **Merge paths** (implemented in `merge-gate.sh`): feature/fix → QA-VERDICT; docs/chore → DOCS-REVIEW (or QA); qa/ → LC only; release/hotfix → master with
  QA-VERDICT + PO-APPROVED + LC-APPROVED `<x.y.z>`; dependabot/* → `LC-APPROVED PR-<n>`. The merge is pinned to the head SHA seen at gate time (`--match-head-commit`),
  so nothing pushed after the gate check can be merged. The rules below are enforced by the script (T-M1.7, DEC-063/064) and covered by `scripts/tests/merge-gate.test.sh`:
  - **Exact tokens, first line.** A verdict or approval counts only as the exact token on a comment's first line (`QA-VERDICT <id>: PASS`, `LC-APPROVED <id>`).
  - **Freshness by push time.** A comment counts only if posted **strictly after the head commit arrived on the PR**, not after its (committer-controlled) `committedDate`.
    The arrival time is the latest of: the newest push, force-push or branch creation of the head SHA to the PR branch in the **repository activity**
    (`GET /repos/{owner}/{repo}/activity`), the newest `pull_request` workflow run GitHub created for the head SHA on the PR's branch, the latest force-push on the PR timeline, and
    the newest `committedDate`. Times are compared as whole-second UTC. If the activity entry or the run is missing (CI hasn't started), a time can't be parsed, or an API call fails,
    the gate **fails closed**; wait for CI to start and retry. A back-dated commit or a force-push after a review therefore makes every verdict stale: re-post them.
  - **Negative verdicts block.** For each review type (QA-VERDICT, DOCS-REVIEW, SEC-REVIEW, UX-REVIEW) the latest fresh comment wins within its type. If it is anything but that
    type's positive token (QA `PASS`/`PASS WITH MINOR`, DOCS `PASS`, SEC/UX `APPROVED`), for example `FAIL` or `CHANGES REQUESTED`, the merge is refused on **every** path, even if another
    review type passed, and the message names the verdict. A negative written loosely still counts as a negative: other case, extra spaces, markdown
    (`**`, `` ` ``, `>`, `#`, `_`, leading list markers such as `- `, `- - `, `+ `, `[x] `, `1.`, `1)`, `(1)`), emoji, Unicode spaces (e.g. NBSP), fullwidth colons and
    Unicode dashes (`<id> — FAIL`), `QA VERDICT`, `QA-VERDICT: <id>`, `<id> - FAIL`, `CHANGES_REQUESTED`/`CHANGES-REQUESTED`. After a separator (any run of `:`, `-` and
    spaces with a colon or a space, e.g. `: `, `- `, ` : - `) any word starting with `FAIL` counts (`FAILED`, `FAILURES` …); only a word glued to the id by dashes alone must end at
    `FAIL`/`FAILS`/`FAILED`/`FAILURE(S)`/`FAILING(S)`, so an id with a suffix
    (`QA-VERDICT <id>-FAILOVER: …`) is not a negative (T-M1.12). The script runs with `LC_ALL=C`, so digits are ASCII digits whatever the caller's locale. Positives must be exact.
  - **Dependabot PRs.** The PR author is the Dependabot app; **every** commit is authored by `dependabot[bot]`, committed by `web-flow` (or `dependabot[bot]`) and
    signature-verified by GitHub; and every repository-activity entry stamped at or after the branch's latest creation was made by `dependabot[bot]`. So a human "Update branch" disqualifies
    the PR: ask Dependabot to rebase (`@dependabot rebase`) instead. Only **modifications** of existing `**/pom.xml`, `**/package.json`, `**/pnpm-lock.yaml`,
    `backend/.mvn/wrapper/maven-wrapper.properties` and `.github/workflows/*.yml` files are allowed (no adds, removals, renames or copies). In a workflow, every change block must replace
    `uses: <action>@<40-hex sha>` lines one for one, keeping each line identical up to `@` (indentation, step and action) and changing the SHA; only the trailing `# comment` may
    also change. A workflow without a diff, or with a diff line of an unknown kind, is refused. In `maven-wrapper.properties` (OQ-17, DEC-075) every change block must replace
    lines one for one with the same key, and only `wrapperVersion=<x.y.z>` and
    `distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/<v>/apache-maven-<v>-bin.zip` (the same `<v>` twice) may change; any other key, an added or
    removed key, another host, path, userinfo or query, or a missing diff is refused. `check-path-ownership.sh` applies the same file-name allow-list in CI.
  - The manual LC checks of DEC-037/038 ended with T-M1.7 (DEC-064). The LC still reads the PR timeline and all verdicts before `LC-APPROVED` as part of the review.
- **Catching up with `develop`:** agents may not run `git merge` (deny rule). Use `gh pr update-branch <n>`, which creates the merge commit on GitHub, or ask the LC.
  The update is a new head commit, so every verdict and approval must be re-posted afterwards.

**GitLab mirror (DEC-060, temporary):** `origin` (GitHub) is the only place where work is merged. `scripts/gitlab-sync.sh` copies GitHub's
`develop`, `master` and named branches to the `gitlab` remote. The pre-push hook allows develop/master there only as exactly the local `origin/<branch>` tracking ref (as last fetched
from GitHub), and GitLab protects both branches (Maintainers push, no merges, no force push; merge requests disabled), so the mirror follows merge-gate's result. Never push local commits to the mirror's develop/master and never force-push it.

## 5. Releases and tags

`release/x.y.z` → G6 → merge into `master` (merge commit) → annotated tag `vX.Y.Z` → merge `master` back into `develop` → GitHub release (`gh release create`) →
deploy. Tags are never moved or deleted.

## 6. Housekeeping

- Delete merged branches (automatic through `--delete-branch`). Weekly: `git fetch --prune`, and delete any local branches whose upstream is gone.
- Stale branch (no commits for 14 days, not merged): the LC either re-plans it or closes it, and records this in progress.json history.

## 7. Repository bootstrap state (T-M0.1)

The local repository was initialised on 2026-09-25 with `master` (initial commit: sources + hygiene files), `develop` (from master) and
`docs/T-M0.1-planning-baseline`. After `PO-APPROVED T-M0.1` (DEC-032), the baseline was merged into `develop` with `--no-ff` as a one-time bootstrap
(DEC-030, merge `a14caae`). The remote **https://github.com/duochou042004/eng-lms** (private, DEC-033) was then created, with default branch `develop`, merge commits only
and delete-on-merge. Branch protection is unavailable on this plan, so the harness enforces the rules (DEC-031, ci-cd.md §2).
Every clone must run `./scripts/install-hooks.sh`.
