# M1 retrospective (gate G5)

Milestone M1, "Walking skeleton and delivery pipeline", 2026-09-25 → 2026-10-03. Written by the LC for gate G5 (quality-gates §G5). Regression: `qa-regression.md`.

## Delivered
- 15 packets merged through merge-gate (T-M1.1..T-M1.9, T-M1.11..T-M1.16; PRs #1–#46), each with independent G3 reviews; decisions DEC-033..DEC-087.
- The exit criteria are met (table in `qa-regression.md`): backend skeleton (Boot 4.1 / Java 25, Modulith, Flyway V1), same-origin SPA in one image, `gate.sh`
  (12 steps) green locally and in CI (7 checks), E2E on 6 viewports with axe, contract drift, Testcontainers on rootless Podman, a reproducible new-machine setup.
- Carried past M1: T-M1.17 first (PO, DEC-086), T-M1.18 (DEC-087), T-M1.10 when upstream is ready (DEC-083).

## What worked
- Independent fresh-context reviews found real defects before merge (e.g. T-M1.5 QA round 1 FAIL, T-M1.6 overflow guard blind under `isMobile`, T-M1.7 review
  rounds); merge-gate, path ownership and the pre-push hook kept every change on the reviewed path.
- The repo as memory: `progress.json`, the handoff and goal-mode prompts carried the work across sessions and onto a new device (DEC-083/084) without rework.

## What didn't, and what changes
- **Flaky tests** reached develop twice (the request-ID test, DEC-074 → T-M1.14; the route-focus keyboard test, DEC-082 → T-M1.16). Both were fixed within
  the milestone under the flaky-test policy. Change: QA keeps repeat runs (×3 stability, ×20 for timing-sensitive tests) in G3 for E2E changes.
- **Environment drift on a new machine** (Ubuntu's `gh` 2.46.0 made merge-gate see "all checks missing"; the `.env` deny rule; snap `glab`; WebKit libraries).
  Change: development-setup §0 now names these (DEC-084); T-M1.17 makes merge-gate say what is wrong.
- **Tooling rot outside the gate** (`qa/` typecheck broken on develop, M1 G5 F-6). Change: T-M1.18 adds it to the gate.
- **Review-polish churn**: two polish packets (T-M1.13, T-M1.16) came from S4 deferrals. Acceptable for a skeleton; for M2, S4s that touch reused pieces
  are fixed in the task when cheap.

## Risk register review
Reviewed `docs/10-governance/risk-register.md` at G5:
- **R-07** (Testcontainers friction with rootless Podman): **Closed**. Containers tests run in `gate.sh` on both machines (T-M1.4, DEC-084).
- **R-06** (new stack vs agents' habits): stays Mitigating; no outdated-API incidents in M1 beyond those caught by the gate.
- **R-09** (context loss): stays Mitigating; worked across a device move.
- **R-18** (test theatre): stays Mitigating; QA mutation checks (T-M1.14) and the ×3 regression support it.
- **R-16** (low-end phones): stays Open; bundle budgets hold (≈145 KB gz per shell).
- Others unchanged; nothing new reached score ≥ 12.

## Decision log and roadmap
- Decision log reviewed through DEC-087: no open contradictions; DEC-085 refines DEC-083 (closing M1 needs G5).
- Roadmap unchanged: M2 (identity and students) is next, starting with the T-M2.1 packet (SEC review at G3). M2 is user-facing, so its G5 includes a PO demo.

## G5 checklist
- [x] Every packet in the milestone merged; exit criteria met (`qa-regression.md`).
- [x] Milestone regression: 6 viewports × Chromium, Firefox and WebKit (`qa-regression.md`, `qa/`).
- [x] Risk register, decision log and roadmap reviewed (this file).
- [ ] PO sign-off (M1 is not user-facing, so no demo is required).
