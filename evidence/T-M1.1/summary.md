# Evidence — T-M1.1 Remote repository bootstrap and governance automation

- Branch: `chore/T-M1.1-repo-governance` · PR: #1 (URL in `progress.json`) · Date (UTC): 2026-09-25
- Entry gate: PO-APPROVED T-M0.1 + OQ-01/OQ-15 defaults + README request (DEC-032..035), given in the session on 2026-09-25

## Acceptance criteria → proof

| AC | Proof | Status |
|---|---|---|
| AC1 bootstrap merge | `bootstrap-merge-graph.log` (merge `a14caae`, `--no-ff`); `bootstrap-check-docs.log` (PASS before the merge); DEC-030 approved; branch deleted | ✅ |
| AC2 remote and settings | `github-setup.log`: private `eng-lms`, default branch `develop`, merge commits only, squash and rebase disabled, delete-branch-on-merge on | ✅ |
| AC3 CI green on PR #1 | docs-check https://github.com/duochou042004/eng-lms/actions/runs/36106314080 · secrets-scan https://github.com/duochou042004/eng-lms/actions/runs/36106314347 (logs checked: 34 tests, path ownership on 37 files, 6 commits scanned, no leaks) | ✅ |
| AC4 merge gate refuses/accepts | Real PR: `merge-gate-dryrun-before-verdicts.log` (refused only for the missing LC-APPROVED and DOCS-REVIEW). `script-tests.log`: 31 merge-gate cases after the review fixes (19 originally), including (a) failing, pending or missing checks, (b) no LC-APPROVED, (c) missing or failing verdicts, (d) behind base; plus conflicts, no progress.json, bad branch name. The mutation check (2 rules disabled → 4 assertions fail) was run in scratch and caught | ✅ |
| AC5 pre-push hook | `script-tests.log`: 7 cases on a throwaway bare remote (direct develop/master blocked; force push blocked; feature and fast-forward allowed) | ✅ |
| AC6 path ownership | `script-tests.log`: 10 cases, incl. the F5 fail-closed cases (qa→backend fails, feature→qa fails, reviewer evidence protected, 00-sources immutable, …) | ✅ |
| AC7 PR merged through merge-gate | PR #1 merged by `scripts/merge-gate.sh 1` as merge commit `f1e3caa` (2026-09-25T07:38:06Z), pinned to head `4c1eb37`, branch deleted. Bootstrap note: `develop` had no merge-gate yet, so the PR's own (reviewed) copy was run. From now on it runs from `develop`. develop CI green (runs 36108643040, 36108643020). Recorded post-merge on the T-M1.2 branch | ✅ |
| AC8 protection or fallback | `github-setup.log`: protection and rulesets API → **403 "Upgrade to GitHub Pro or make this repository public"** → DEC-031 fallback recorded | ✅ |
| AC9 bookkeeping | `progress.json`: T-M1.1 `done` with its PR URL (the merge commit is recorded post-merge); the T-M1.2 packet is written and `ready`; handoff updated; `check-docs.sh` PASS | ✅ |
| AC10 README (DEC-035) | 15 shields.io URLs each returned HTTP 200, and every requested logo loaded (command below); 2 Mermaid diagrams; relative links pass `check-docs.sh` | ✅ |

## Commands run (reproducible)

```bash
./scripts/check-docs.sh                                   # before the bootstrap merge (PASS)
git checkout develop && git merge --no-ff docs/T-M0.1-planning-baseline && git branch -d docs/T-M0.1-planning-baseline
gh repo create duochou042004/eng-lms --private --source . --remote origin --description "…"
git push -u origin master develop
gh repo edit duochou042004/eng-lms --default-branch develop --delete-branch-on-merge --enable-merge-commit --enable-squash-merge=false --enable-rebase-merge=false
gh api -X PUT repos/duochou042004/eng-lms/branches/develop/protection --input <json>     # → 403 (DEC-031)
gh api repos/{owner}/{repo}/releases/latest …             # resolved the action SHAs and the gitleaks 8.30.1 checksum
./scripts/tests/run-all.sh                                # 34/34 PASS at first push; 48/48 after the review fixes
/tmp/…/gitleaks git --redact --exit-code 1 . && gitleaks dir --redact --exit-code 1 .   # no leaks (local run)
for u in $(grep -oE 'https://img\.shields\.io/badge/[^)]+' README.md); do curl -s -o b.svg -w '%{http_code}' "$u"; done   # all 200
```

## Deviations and known limitations

- **No branch protection** (platform limitation, DEC-031). A human with write access could still push directly from a clone without hooks. The residual risk is recorded in R-08.
- The **GitHub Actions status badges** in the README are served by github.com for a private repository. They render for signed-in users with access, not for anonymous viewers.
- `secrets-scan` downloads the gitleaks binary from GitHub releases at runtime, verified by SHA-256. We chose it over the EULA-licensed `gitleaks-action` (tech-stack §4).
- Independent review: this is a chore packet, so G3 = a fresh-context docs review (`DOCS-REVIEW T-M1.1`). Its output is in `review/docs.md`.

## CI

First push (head `a570ec0`): docs-check ✅ run 36106314080; secrets-scan ✅ run 36106314347. Re-runs after the review fixes are listed in the PR checks.

## Review round 1 → fixes

DOCS-REVIEW T-M1.1 round 1 (`review/docs.md`): **CHANGES REQUESTED**, with 2 S2 findings (F1: a verdict line containing `: PASS` anywhere counted as a pass; F2: AC9 bookkeeping) and 11 S3/S4 findings.
All were addressed in the follow-up commit: exact-token verdicts plus a verdict-after-head-commit rule and `--match-head-commit` (F1, F3); merge paths for dependabot, release and hotfix (F4);
path ownership fails closed and the docs claim is narrowed (F5); extra deny rules and the residual risk in R-08 (F6); T-M1.2's backend job runs on every PR (F7); DEC-036 for the session tables (F8);
this evidence (F9); stale text (F10); `persist-credentials: false` (F11); packet wording (F12); README tense (F13).

## Review round 2 → fixes

DOCS-REVIEW T-M1.1 round 2: **CHANGES REQUESTED**. All round-1 findings were verified fixed, but the F4 fix introduced **R2-1 (S2)**: any branch named `dependabot/*` could merge with only
`LC-APPROVED PR-<n>`. Fixed: the PR author must be the Dependabot app, and dependabot PRs may change only manifests, lockfiles and workflows (in both merge-gate and path ownership).
Also fixed: R2-4 (an explicit DOCS-REVIEW CHANGES REQUESTED can't be overridden by QA PASS), R2-5 (only a comment's first line counts as a verdict), R2-7 (an empty commit list is refused), R2-8 (git stderr is
kept out of the file list), R2-3 (the `gh pr update-branch` catch-up is documented), R2-6 (handoff). **Deferred:** R2-2 (S3) → T-M1.7 (DEC-037).
Script tests: 56/56 (merge-gate 37, path ownership 12, pre-push 7).

## Review round 3

DOCS-REVIEW T-M1.1 round 3: **PASS** at head `4219701` (CI runs 36108332593 and 36108332605 green; 56/56 script tests). Deferred S3/S4: R3-1, R3-2, R3-3 → T-M1.7 (DEC-038); R3-4 fixed (roadmap count).
The final commit after the review is bookkeeping only (DEC-038, backlog, roadmap count, the committed review file, progress/evidence). No script or workflow changes.

## Reviews
- DOCS-REVIEW T-M1.1: **PASS** (round 3), in `review/docs.md` (rounds 1 and 2 CHANGES REQUESTED, all addressed)
- LC-APPROVED T-M1.1: PR comment
