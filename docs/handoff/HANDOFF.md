# Handoff — 2026-09-25 07:40 UTC (T-M1.1 merged; T-M1.2 ready)

Phase/Milestone: P1 / M1 · Current task: **T-M1.2 (ready, not started)** · Branch: `feature/T-M1.2-backend-skeleton` · Remote: https://github.com/duochou042004/eng-lms

## Where we are
- M0 is done (PO-APPROVED, DEC-032). **T-M1.1 is done**: PR #1 was merged through `scripts/merge-gate.sh` as `f1e3caa`, after 3 independent docs-review rounds (the final PASS was at `4219701`).
- Governance is live: CI `docs-check` + `secrets-scan` (green on develop), the merge gate (56 script tests), the pre-push hook, path ownership, agent deny rules.
  Branch protection is unavailable on this plan (DEC-031). Residual risks are in R-08. The follow-up hardening is **T-M1.7** (DEC-037, DEC-038).
- The README was redesigned (badges, Mermaid diagrams, roadmap), as requested by the PO (DEC-035).
- No product code yet. T-M1.2 (backend skeleton) is the next packet.

## In flight
Nothing. This branch only has the post-merge bookkeeping commit.

## Next steps
1. Execute T-M1.2 on this branch (backend-implementer role; the packet has the `spring init` command and AC1–AC9). Then open a PR, get an independent QA-VERDICT, and have the LC merge through merge-gate (run from `develop`).
2. Write the T-M1.3 packet (OQ-02 answered: vi default + en, DEC-039).
3. Ask the PO to approve enabling the user-level `podman.socket` (T-M1.4). Schedule T-M1.7 (merge-gate hardening) early in M1.

## Pending PO decisions
OQ-02 is ANSWERED (vi default + en, DEC-039). The PO approved starting T-M1.2 in the next session. OQ-03..OQ-14 are still open (defaults documented). T-M1.4 needs approval for the persistent user service.

## Gotchas
- Run `./scripts/install-hooks.sh` per clone. Never push `develop` or `master` directly. Agents can't run `git merge` or `gh pr merge`: use `gh pr update-branch <n>` to catch up (then re-post the verdicts).
- Verdict comments count only if the verdict is the comment's **first line**, the token is exact, and the comment was posted after the head commit.
- Private-repo Actions badges render only for signed-in collaborators.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.2-backend-skeleton.md`.
