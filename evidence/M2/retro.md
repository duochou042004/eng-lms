# M2 retrospective (gate G5)

Milestone M2, "Identity and student management", 2026-10-05 (T-M2.1 merged) → 2026-11-26 (T-M2.7 merged, `63a2d54`). Written by the LC for
gate G5 (quality-gates §G5). Regression and QA: `qa/report.md`.

## Delivered
- 34 task IDs merged through merge-gate (T-M2.1 … T-M2.35 and T-M2.7, `progress.json` `completed[]`), 3 cancelled (T-M2.36..38, merged
  back into T-M2.7, DEC-205), T-M2.26 moved to the new device (not an exit criterion); decisions DEC-089..DEC-206.
- Exit criteria (roadmap §M2) met:
  - FR-AUTH-01..10 and FR-STU-01..07: built and accepted task by task (traceability matrix), the student side closed by T-M2.7 (Home v0,
    the student Account page, `GET /api/v1/student/account`).
  - The authorization-matrix and student-isolation harnesses fail on any unregistered endpoint (`AuthzMatrixTest` shown red on the first real
    student handler, T-M2.7 AC2) and now run on a real `..web.student..` handler.
  - The add-student flow runs as E2E at 360/768/1280 within its step budget (green in the regression run).
  - The security review of authentication passed (the identity tasks' SEC reviews at G3; the last, T-M2.7 SEC, APPROVED).
- G5 regression: the one PO-approved run 45817298721 on `e2bfd78`, 1,253 passed, 169 skipped, 0 failed (six Chromium viewports + WebKit
  smoke); the local `E2E_KEEP_DB=1` run 1,247 passed, 0 failed (but see "What didn't").
- Carried past M2: T-M2.39 (four S4s from the T-M2.7 G3), T-M2.26 (on the new device).

## What worked
- Isolation by structure: `CurrentStudent` resolution, the audience verifier, ArchUnit rules and the secret scan caught the first real student
  handler's one gap (springdoc listing `CurrentStudent` as a query parameter) before review.
- Fixed UI rules, Domain rules and contradiction scans at G0 (DEC-131, L-02..L-04): T-M2.7 G3 needed no fix round.
- The T-M2.7 consolidation and the agent policy (DEC-205): one task, 4 fresh agents + 1 resume, one gate run, one regression run.

## What didn't, and proposed changes
- **Fragmentation and fixed cost**: 38 M2 task IDs, a third of them follow-up or polish rows; the agents alone used ~0.5M tokens per task in
  T-M2.33/T-M2.35. Change (in place): coding-agent-rules §11 and its hook (DEC-205). Proposal for M3: S4s go into the next task that touches the
  area, not a new row, unless no such task exists (as T-M2.39 now).
- **LC slips at the last task** (L-14): wrong verdict tokens in a brief; a reviewer record on the feature branch. Change: L-14.
- **The G5 local data run was not a large-data run**: the dev DB on this device was empty (T-M2.7 QA-3; the "1,065 active students" in the
  handoff were the old device's). Change: L-14 (count before the run); the new device starts with a fresh DB anyway.

## Risk register review
Reviewed `docs/10-governance/risk-register.md`:
- **R-03** (cross-student leakage): stays Mitigating; the harnesses now run on a real student handler (T-M2.7).
- **R-09** (context loss): stays Mitigating; handoffs carried M2 across many sessions; a device move is next.
- **R-12** (personal data of minors): stays Open; SEC S4-1 (DEBUG body logging if turned on in production) is T-M2.39 (a).
- **R-18** (test theatre): stays Mitigating; every new check in T-M2.7 was shown red first (AC2, AC11, the contract assertion, C1).
- Others unchanged; nothing new reached score ≥ 12.

## Decision log, roadmap and ledger
- Decision log reviewed through DEC-206: no open contradictions; DEC-205 supersedes DEC-204 (1) (the split).
- Roadmap unchanged: M3 (schedule, lessons and private notes) is next, after the device move; T-M3.1 computes lesson dates in the account's
  time zone (L-12).
- `shortcut:` ledger: 8 markers in `backend/src` and `web/src` (`grep -rnE '(shortcut|ponytail):'`; plus 2 tooling markers in `scripts/check_docs.py`), none fires in M3 (lessons-learned ledger section); no new row.

## G5 checklist
- [x] Every M2 packet merged or cancelled by a DEC; exit criteria met (above, `qa/report.md`).
- [x] Regression run green (one run, cap 1); local run green.
- [x] Risk register, decision log, roadmap and the `shortcut:` ledger reviewed; lessons-learned updated (L-14).
- [x] README roadmap row and the roadmap status say M2 awaits the PO demo (done with it).
- [ ] PO demo (a recorded walkthrough or a live session): the PO's acceptance step.
