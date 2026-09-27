# T-M1.11: GitLab mirror + GitLab CI for CI artifacts (temporary)

| Field | Value |
|---|---|
| Milestone | M1 |
| Status | **in_progress** (PO request 2026-09-27, DEC-060; done in the same session) |
| Owner role | LC (CI/governance; no product code) |
| Branch | `chore/T-M1.11-gitlab-ci` (from the T-M1.7 bookkeeping branch; it merges that bookkeeping too) |
| Depends on | T-M1.6 merged |
| Estimate | 0.5 agent-day |
| Trace | DEC-053, DEC-056, DEC-060, R-08, ci-cd §1, git-governance §1/§4 |

## Goal
The GitHub account's Actions artifact storage is still exhausted after the PO's cleanup. Usage is billed over the month, so it is expected to reset on
2026-10-01. Until then no CI report (JaCoCo, JUnit, the Playwright report) can be stored. This task adds a **private GitLab mirror**
(`gitlab.com/duochou042004/eng-lms`) whose **GitLab CI** re-runs the checks and **stores the reports for 5 days**.
GitHub stays the source of truth: PRs, the required checks and `merge-gate.sh` are unchanged.

## Scope
- In:
  1. The private GitLab project (created with `glab`, the PO's GitLab account) and a local `gitlab` remote.
  2. `.gitlab-ci.yml`: `backend` (`./mvnw verify` with Testcontainers on Docker-in-Docker, JaCoCo + JUnit reports, coverage), `web` (the web checks),
     `e2e-smoke` (Playwright's image + a checksum-pinned Temurin 25 JDK + a PostgreSQL 18 service; `scripts/e2e-run.sh` on the mandatory viewports).
     All images are pinned by digest. Every artifact has `expire_in: 5 days`.
  3. `scripts/gitlab-sync.sh`: pushes **GitHub's** commits (`origin/develop`, `origin/master`, and any named branch) to the mirror, fast-forward only.
     `scripts/hooks/pre-push` gets one exception: develop/master may be pushed **to the mirror URL only**, and only as exactly `origin/<branch>`.
  4. Tests for the hook exception and the sync script; docs (ci-cd, development-setup, git-governance, tech-stack §7); DEC-060.
- Out of scope: making GitLab a required check or a merge path; GitLab MRs; a self-hosted runner (it would need a runner token and host changes);
  moving off GitHub; changes to the GitHub workflows (their uploads stay non-blocking, DEC-053).

## Guardrail answers
1. Trace: DEC-053/056/060. 2. No product drift. 3. No tutor setup. 4. N/A (engineering). 5. No exam semantics.

## Acceptance criteria
- **AC1:** A GitLab pipeline on the mirror is green for `backend`, `web` and `e2e-smoke` on the task branch **and** on `develop` after the merge.
- **AC2:** The JaCoCo HTML/XML report, the JUnit reports and the Playwright report are **stored** as GitLab artifacts that expire in 5 days, and a download is shown in the evidence.
- **AC3:** `gitlab-sync.sh` mirrors GitHub's commits only. The hook still blocks develop/master to GitHub, a non-GitHub commit to the mirror, and deleting develop on the mirror (tests).
- **AC4:** The docs and DEC-060 are updated, `progress.json` and `evidence/T-M1.11/summary.md` are updated, and the GitHub CI stays green.

## Evidence required
`evidence/T-M1.11/summary.md`: pipeline links, the artifact listing and download proof, the script test output, CI links, the review.

## Risks
- GitLab.com free tier: 400 compute minutes/month for private projects. One pipeline takes about 10–15 min, so sync only develop and branches under review.
- Docker Hub pull limits inside Docker-in-Docker (Testcontainers pulls `postgres:18`).
- Remove or keep the mirror after the GitHub storage resets: a PO decision recorded in progress.json (`pendingPO`).
