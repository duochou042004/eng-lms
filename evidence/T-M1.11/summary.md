# T-M1.11 evidence summary: GitLab mirror + GitLab CI storing the CI reports (temporary)

Branch `chore/T-M1.11-gitlab-ci` · Packet `docs/tasks/T-M1.11-gitlab-ci.md` · PO decision DEC-060 · Mirror https://gitlab.com/duochou042004/eng-lms (private, project 86941168)

## Why
The GitHub account's Actions artifact storage stayed "quota hit" after the PO deleted artifacts in other repos (latest check: the `develop` backend run
after the T-M1.6 merge still logged `Artifact storage quota has been hit`). Usage is billed over the month, so it is expected to reset on 2026-10-01.

## AC → proof

| AC | Result | Proof |
|---|---|---|
| **AC1** GitLab pipeline green (backend, web, e2e-smoke) on the branch and on develop after the merge | branch: PASS; develop: after the merge | Pipeline 2886164985 (branch @ `725b97b`): **success**. backend 101 s https://gitlab.com/duochou042004/eng-lms/-/jobs/16758929292, web 29 s https://gitlab.com/duochou042004/eng-lms/-/jobs/16758929293, e2e-smoke 148 s https://gitlab.com/duochou042004/eng-lms/-/jobs/16758929294. Testcontainers ran over Docker-in-Docker; e2e used Playwright's image + the SHA-256-verified Temurin 25 tarball + a PostgreSQL 18 service. The final-head and develop pipelines are listed below |
| **AC2** reports stored as 5-day artifacts, download shown | PASS | `artifacts-download.txt`: backend archive 361,477 bytes, 91 files (JaCoCo `index.html`, `jacoco.xml`, `jacoco.csv`, surefire `TEST-*.xml`), plus JUnit and JaCoCo report artifacts; coverage 90.3% parsed by GitLab; e2e archive 265,755 bytes (`playwright-report/index.html`, the app log). Both expire 2026-10-02 (5 days) |
| **AC3** sync mirrors GitHub's commits only; hook exceptions are narrow | PASS | `scripts/tests/gitlab-sync.test.sh` (8 cases: the mirror equals `origin/*`, not the local commit; a missing remote and a missing branch are refused). `scripts/tests/pre-push.test.sh` (+6 cases: develop to the mirror only as exactly origin/develop; blocked for a local commit, for a non-mirror remote, to GitHub, and for deleting develop on the mirror) |
| **AC4** docs, DEC, progress, GitHub CI green | see PR | ci-cd §1.1, git-governance §4, development-setup §4, tech-stack §7 (DinD, Playwright image, Temurin tarball, glab), backlog T-M1.11, DEC-060, `progress.json` |

## Pipelines
- Branch, first run: 2886164985 at `725b97b` (success; backend 101 s, web 29 s, e2e-smoke 148 s).
- Branch head `b4a4eef`: 2886169118 (success; backend 82 s, web 29 s, e2e-smoke 98 s; artifacts expire 2026-10-02). GitHub PR #14 at `b4a4eef`: all 7 checks green.
- Final head and develop after the merge: recorded in the merge record (docs/handoff) because they happen after this file is committed.

## Review
`review/docs.md`: **DOCS-REVIEW T-M1.11: PASS WITH MINOR** (F1 S3, F2–F7 S4; handled by DEC-061: GitLab branch protection + MRs disabled, the hook's
test-only override limited to local paths, wording fixed, statuses aligned; the `.claude/settings.json` glab deny rules are recommended to the PO).
