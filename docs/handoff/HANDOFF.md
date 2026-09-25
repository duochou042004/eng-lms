# Handoff — 2026-09-25 13:40 UTC (T-M1.3 in review; UX round 1 fixed)

Phase/Milestone: P1 / M1 · Current task: **T-M1.3 (in_review)** · Branch: `feature/T-M1.3-web-skeleton` · PR: https://github.com/duochou042004/eng-lms/pull/4

## Where we are
- T-M1.2 is merged (`ae9ac5d`), and its QA report is merged too (PR #3). The PO approved starting T-M1.3 (DEC-042).
- **T-M1.3 is implemented.** `web/` came from the Vite 9 `react-ts` template (pnpm 12, Node 24, TS strict) and has tokens + a contrast script, 8 `ui/` primitives with unit/axe tests,
  `/dev/ui` (dev only), i18next vi default + en with a completeness test, lazy tutor/student shells, an openapi-fetch client, a bundle budget (142 KB gz), and `web` CI (required check).
  CI was green on the first push. The evidence is in `evidence/T-M1.3/` (summary, negative demos for AC3/5/7/8, gate log, 13 screenshots, live viewport checks).
- **UX round 1: CHANGES REQUESTED** (F1 40 px controls, F2 "Something went wrong"). The full review is a PR #4 comment. F1, F2, F4, F6, F7, F8 and the F9 warning role
  are fixed in the latest commit. F3 (route focus/titles) and F5 (segmented language control) are deferred to **T-M1.9** (DEC-043).
- DEC-042: kept the template's **oxlint** instead of ESLint; pnpm's release-age policy pins Vitest to 5.0.1.

## Next steps
1. Wait for PR #4 CI on the new head. Run **UX round 2**: a fresh `ux-reviewer` agent at the new head, on a stack you start (podman postgres:18 + backend jar with `ENGLMS_META_DISPLAY_NAME` + `pnpm dev`). Post `UX-REVIEW T-M1.3: APPROVED` as the first line.
2. **QA**: one fresh general-purpose agent following `.claude/agents/qa-evaluator.md` (run it after UX; they share the browser pane and ports). Fix S1/S2.
3. After the final head commit: `QA-VERDICT T-M1.3: …`, then `LC-APPROVED T-M1.3`; `./scripts/merge-gate.sh --dry-run 4`, then merge, from an up-to-date `develop`.
4. Post-merge: the QA report goes on `qa/T-M1.3` (PR + LC-APPROVED). The UX review file (`evidence/T-M1.3/review/ux.md`) needs a docs/chore branch (feature branches may not write reviewer evidence). Record the merge; write the next packet.

## Pending PO decisions
The T-M1.4 persistent user-level `podman.socket`. OQ-03..OQ-14 and OQ-16 (defaults documented).

## Gotchas
- Subagents can't write files: record their reports verbatim (a PR comment and/or a commit on the right branch kind).
- pnpm 12: `pnpm -s` is invalid. Scripts fail on unreviewed build scripts (`allowBuilds` in `web/pnpm-workspace.yaml`) and on releases younger than a day.
- openapi-fetch captures `fetch` at creation, so the client passes `fetch: (r) => globalThis.fetch(r)` (for MSW).
- zsh does not word-split `$var`: use `${=var}`. Kill by PID, not `pkill -f` (it matches your own shell).
- Screenshots: `chromium --headless=new --window-size=W,H --virtual-time-budget=4000 --screenshot=…`.
- Adding a required check means also updating `OK_CHECKS` in `scripts/tests/merge-gate.test.sh`.

## Files to read first
`CLAUDE.md` → `progress.json` → this file → `docs/tasks/T-M1.3-web-skeleton.md` → the PR #4 comments.
