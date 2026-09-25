# Evidence — T-M1.1 Remote repository bootstrap and governance automation

- Branch: `chore/T-M1.1-repo-governance` · PR: #1 (URL in `progress.json`) · Date (UTC): 2026-09-25
- Entry gate: PO-APPROVED T-M0.1 + OQ-01/OQ-15 defaults + README request (DEC-032..035), given in the session on 2026-09-25

## Acceptance criteria → proof

| AC | Proof | Status |
|---|---|---|
| AC1 bootstrap merge | `bootstrap-merge-graph.log` (merge `a14caae`, `--no-ff`); `bootstrap-check-docs.log` (PASS before the merge); DEC-030 approved; branch deleted | ✅ |
| AC2 remote and settings | `github-setup.log`: private `eng-lms`, default branch `develop`, merge commits only, squash and rebase disabled, delete-branch-on-merge on | ✅ |
| AC3 CI green on PR #1 | `docs-check` and `secrets-scan` run links in the PR checks (recorded after CI: see the "CI" section below) | see below |
| AC4 merge gate refuses/accepts | `script-tests.log`: 19 merge-gate cases, including (a) failing, pending or missing checks, (b) no LC-APPROVED, (c) missing or failing verdicts, (d) behind base; plus conflicts, no progress.json, bad branch name. The mutation check (2 rules disabled → 4 assertions fail) was run in scratch and caught | ✅ |
| AC5 pre-push hook | `script-tests.log`: 7 cases on a throwaway bare remote (direct develop/master blocked; force push blocked; feature and fast-forward allowed) | ✅ |
| AC6 path ownership | `script-tests.log`: 8 cases (qa→backend fails, feature→qa fails, reviewer evidence protected, 00-sources immutable, …) | ✅ |
| AC7 PR merged through merge-gate | Recorded after the merge in `progress.json` (completed[T-M1.1].mergeCommit) and in the T-M1.2 branch's handoff | pending at PR time |
| AC8 protection or fallback | `github-setup.log`: protection and rulesets API → **403 "Upgrade to GitHub Pro or make this repository public"** → DEC-031 fallback recorded | ✅ |
| AC9 bookkeeping | `progress.json` updated; the T-M1.2 packet is written and `ready`; handoff updated; `check-docs.sh` PASS | ✅ |
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
./scripts/tests/run-all.sh                                # 34/34 PASS
/tmp/…/gitleaks git --redact --exit-code 1 . && gitleaks dir --redact --exit-code 1 .   # no leaks (local run)
for u in $(grep -oE 'https://img\.shields\.io/badge/[^)]+' README.md); do curl -s -o b.svg -w '%{http_code}' "$u"; done   # all 200
```

## Deviations and known limitations

- **No branch protection** (platform limitation, DEC-031). A human with write access could still push directly from a clone without hooks. The residual risk is recorded in R-08.
- The **GitHub Actions status badges** in the README are served by github.com for a private repository. They render for signed-in users with access, not for anonymous viewers.
- `secrets-scan` downloads the gitleaks binary from GitHub releases at runtime, verified by SHA-256. We chose it over the EULA-licensed `gitleaks-action` (tech-stack §4).
- Independent review: this is a chore packet, so G3 = a fresh-context docs review (`DOCS-REVIEW T-M1.1`). Its output is in `review/docs.md`.

## CI

Filled in after the PR checks complete: run URLs and results for `docs-check` and `secrets-scan`.

## Reviews
- DOCS-REVIEW T-M1.1: see `review/docs.md`
- LC-APPROVED T-M1.1: PR comment
