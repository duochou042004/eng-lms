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

- **Only the LC merges**, only through `scripts/merge-gate.sh <pr-number>`. The script checks that all CI checks are green (`gh pr checks`), the required verdict comments are present,
  the branch is up to date with its base, and `progress.json` changed in the PR. Then it runs `gh pr merge <n> --merge --delete-branch`.
- The merge method is a **merge commit** (the `--no-ff` equivalent): task history stays grouped, and reverting a task is one `git revert -m 1`.
- Squash merges are not used (they lose the per-step history the evidence refers to). Rebase-merging onto develop is not used.
- A local no-ff merge (e.g. release branches before the remote exists) uses `git merge --no-ff`.

## 5. Releases and tags

`release/x.y.z` → G6 → merge into `master` (merge commit) → annotated tag `vX.Y.Z` → merge `master` back into `develop` → GitHub release (`gh release create`) →
deploy. Tags are never moved or deleted.

## 6. Housekeeping

- Delete merged branches (automatic through `--delete-branch`). Weekly: `git fetch --prune`, and delete any local branches whose upstream is gone.
- Stale branch (no commits for 14 days, not merged): the LC either re-plans it or closes it, and records this in progress.json history.

## 7. Repository bootstrap state (T-M0.1)

The local repository was initialised on 2026-09-25 with `master` (initial commit: sources + hygiene files), `develop` (from master) and
`docs/T-M0.1-planning-baseline` (this baseline). **There is no remote yet.** Creating the GitHub repository, pushing and configuring protection is the
first gated task **T-M1.1**, pending PO approval and OQ-01.
