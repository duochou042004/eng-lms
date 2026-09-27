# T-M1.7 evidence summary: merge-gate hardening

Branch `chore/T-M1.7-merge-gate-hardening` · Packet `docs/tasks/T-M1.7-merge-gate-hardening.md` · PO start signal DEC-062 · Design DEC-063 · Manual checks ended DEC-064

## What changed
- `scripts/merge-gate.sh`:
  - **Push-time freshness (step 0).** The head's arrival time is the latest of: the newest `pull_request` workflow run for the head SHA on the PR's branch, the latest
    `HEAD_REF_FORCE_PUSHED_EVENT` on the PR timeline, and the newest `committedDate`.
    - It fails closed with a clear message when there is no such run or an API call fails.
    - Verdicts must be posted **strictly after** that time.
    - Why not the PR timeline alone: on PR #14, `Commit.pushedDate` is `null` for every commit and the REST `committed` events have no `created_at` (DEC-063).
  - **Negative verdicts (step 4).** For each of QA-VERDICT, DOCS-REVIEW, SEC-REVIEW and UX-REVIEW, the latest fresh verdict must be that type's positive token, or absent.
    Anything else blocks on every path, and the message names it.
  - **Dependabot path (`dependabot_checks`):**
    - every commit comes from `pulls/<n>/commits`: author `dependabot[bot]`, committer `web-flow`/`dependabot[bot]`, and `verification.verified == true`;
    - the file allow-list comes from `pulls/<n>/files`: `**/pom.xml`, `**/package.json`, `**/pnpm-lock.yaml`, `backend/.mvn/wrapper/maven-wrapper.properties`, `.github/workflows/*.yml`;
    - a workflow file must be `modified` (not added or renamed), with a patch present, where every changed line is `uses: <action>@<40-hex>` and the same actions are removed and added.
- `scripts/check-path-ownership.sh`: the same Dependabot file allow-list. The broad `\.mvn/.*` is replaced by the wrapper properties file.
- `scripts/tests/mock-gh`: serves `actions/runs`, `graphql`, `pulls/<n>/commits` and `pulls/<n>/files` fixtures; a `<fixture>.fail` file simulates an API error.
- Docs: git-governance §4 (the rules as implemented), ci-cd §2, DEC-062/063/064, OQ-17, the backlog and the packet status.

## AC → proof

| AC | Result | Proof |
|---|---|---|
| **AC1** back-dated commit / force-push / no timeline data | PASS | `merge-gate-test.txt`, the "AC1:" cases (13 + 4 message checks). A back-dated commit (`committedDate` 09:00) whose run was created at 10:10 makes the 10:05 verdict stale. The same commit arriving at 10:00 passes. A later re-run for the head counts. A force-push after the verdict blocks, and one before it doesn't. No run, a run on another branch / of another SHA / of a non-`pull_request` event, a runs API error, a timeline API error and a timeline answer without data all **fail closed**. A verdict in the same second as the arrival doesn't count |
| **AC2** a negative verdict of any type blocks and is named; positive paths pass | PASS | The "AC2:" cases (9 + 3 message checks). QA FAIL blocks a chore with DOCS PASS; DOCS CHANGES REQUESTED blocks a feature with QA PASS; UX and SEC CHANGES REQUESTED block; the dependabot path is blocked too. Latest-wins within a type (FAIL then PASS passes), all four types positive pass, and a stale negative doesn't block a new head |
| **AC3** Dependabot: every commit by Dependabot, allow-list, `uses:` SHA bumps only, wrapper properties pass | PASS | The "AC3:" cases (18 + 4 message checks). These block: a human commit, an unverified Dependabot-authored commit (forged e-mail), a human committer, an empty/failed commit list, a `run:` line added to a workflow, a `uses:` swapped to another action, a bump to a tag, a bump bundled with a `with:` change, an added workflow, a workflow without a diff, a rename into an allowed path, `.mvn/extensions.xml`, the wrapper jar, and a file only the files API reports. These pass: manifests + lockfile + a `uses:` bump, and **a wrapper properties bump**. `path-ownership.test.sh` +3 cases |
| **AC4** new cases pass, old ones unchanged, `run-all.sh` green | PASS | `merge-gate-test.txt`: **87 passed, 0 failed** (37 before + 50 new). `git diff develop -- scripts/tests/merge-gate.test.sh` removes one line (the fixture cleanup now also deletes `*.fail` files); no case was removed or edited. `run-all.txt`: script tests PASS. `docs-check` CI runs `run-all.sh`, see the CI links |
| **AC5** real dry run; docs, DEC, progress, evidence | see below | `dry-run.txt`; git-governance §4, ci-cd §2, DEC-064 (ends the DEC-037/038 manual checks), `progress.json`, this file |

## Local gate
`ENGLMS_TASK=T-M1.7 ./scripts/gate.sh`: **PASS (12 steps, 174 s)**, `gate-20260927T015153Z.log` (e2e 28 passed on the mandatory three viewports; screenshots not kept, script-only task).

## Dry run on a real PR (AC5)
See `dry-run.txt`.

## CI
See the PR.

## Not done / notes
- `shellcheck` is not installed on this host, and there is no local image; downloading it needs PO approval, so it was not run. `bash -n` passes.
- OQ-17: a content check of the wrapper properties on the Dependabot path was **not** added, because the packet only allows the file. It is raised as an open question (DEC-064).
- Residual risk (not verified against GitHub): the identity check trusts GitHub's own mapping of the author/committer logins and its signature verification.
  If GitHub ever records `web-flow` as the committer and signs a commit that a write-token holder created with a Dependabot author e-mail (for example through the REST API),
  that commit would pass. The allow-list and `uses:`-only rules still apply to it, and `LC-APPROVED` stays the last control.
