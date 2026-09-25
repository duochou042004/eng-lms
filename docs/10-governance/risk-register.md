# Risk Register

> Scale: Likelihood (L) and Impact (I) 1–5. Score = L×I. Review at each milestone gate. Owner = accountable role.
> Status: Open · Mitigating · Accepted · Closed.

| ID | Risk | L | I | Score | Mitigation (planned or active) | Trigger / early signal | Owner | Status |
|---|---|---|---|---|---|---|---|---|
| R-01 | **Frontend quality drift**: a generic "AI dashboard" look, brittle layouts, inconsistent components | 4 | 5 | 20 | ADR-0013 design system; stylelint token enforcement; the `ui/`-only import rule; UX reviewer gate; mandatory viewport screenshots; E2E no-horizontal-scroll; anti-pattern list | UX findings of S2 or above in 2 consecutive PRs | LC/UX | Mitigating |
| R-02 | **Scope creep** towards a centre LMS, SaaS, chat, AI or payments | 3 | 5 | 15 | scope.md guardrail in every packet; `SCOPE` findings block merges; traceability matrix; forbidden-identifier test | An untraced feature appears in a PR | LC | Mitigating |
| R-03 | **Cross-student data leakage** or private notes exposed | 2 | 5 | 10 | ADR-0016 structure; authz matrix; isolation secret scans; ArchUnit DTO rules; SEC gate | Any isolation test failure (S1) | SEC | Mitigating |
| R-04 | Generic engine complexity: jsonb schema sprawl, grading edge cases | 3 | 4 | 12 | Handler contract + JSON Schema; MVP type subset; table-driven tests; PIT ≥ 70% | Grading bugs found by QA | BE/LC | Mitigating |
| R-05 | Data loss (disk failure, bad migration, no tested backup) | 2 | 5 | 10 | Nightly encrypted off-site backups; restore drill in G6; forward-only migrations; pre-upgrade dump | A backup job fails; a drill exceeds its RTO | LC/PO | Open |
| R-06 | New stack (Boot 4.1, Java 25, Jackson 3, Security 7) versus agents' Boot 3 habits | 4 | 3 | 12 | Pitfalls list (coding-agent-rules §9); M1 spikes; cite docs in PRs; pinned versions | Repeated compile or config errors from outdated APIs | LC | Mitigating |
| R-07 | Testcontainers friction with rootless Podman | 3 | 3 | 9 | T-M1.4 spike; env settings; documented fallback profile | Tests can't start containers locally | BE | Open |
| R-08 | Branch protection unavailable (private repo on a free plan): **confirmed 2026-09-25** (API 403) | 3 | 3 | 9 | Active: `merge-gate.sh` (tested), pre-push hook (tested), path-ownership CI check, agent deny rules (DEC-031). Residual: (1) a human with repo access can still push directly from a clone without hooks; (2) deny rules are prefix-based and can't catch every git flag combination; (3) **all agents share one `gh` account**, so the author of a verdict comment can't be verified mechanically. Mitigations: verdicts must postdate the head commit (merge-gate), evaluators run in fresh contexts, and reviewer evidence files are committed with their output (review F6) | A merge without `LC-APPROVED` found in the history | LC | Mitigating |
| R-09 | Context loss between agent sessions leads to rework or contradictions | 4 | 3 | 12 | progress.json + HANDOFF + prompt ≤ 4,000 characters; docs as memory; session start checklist | The same question is re-asked, or decisions contradict each other | LC | Mitigating |
| R-10 | Large media (video) strains a small host's disk and bandwidth | 3 | 3 | 9 | Upload limits; encourage links and embeds; storage warnings; Range streaming | Storage > 60% within 3 months | LC/PO | Open |
| R-11 | Timed assessment integrity (clock skew, reloads, network loss) | 3 | 3 | 9 | Server-authoritative deadline; autosave + local buffer; grace window; auto-submit sweep | QA finds lost answers | BE | Open |
| R-12 | **Privacy and legal**: personal data of minors under Vietnamese regulations | 3 | 4 | 12 | Data minimisation; tutor-only personal data; export and delete decision (OQ-07); encrypted backups; the PO considers a legal review before go-live | Go-live without a decision on OQ-07 | PO | Open |
| R-13 | XSS or file-upload attack through rich text, embeds or files | 2 | 5 | 10 | Server sanitiser + DOMPurify; CSP; Tika sniffing; allow-lists; nosniff/sandbox headers | XSS corpus test failure | SEC | Mitigating |
| R-14 | **Adoption**: the tutor finds the system slower than Zalo + Drive | 3 | 5 | 15 | Step budgets; smart defaults; wrap-up in M5; UAT at M5 and M8; North Star review at Phase 2 intake | UAT timings over budget; tutor feedback | LC/PO | Mitigating |
| R-15 | Tutor lockout or lost password with no email recovery | 2 | 4 | 8 | Operator CLI reset runbook; document it for the tutor | — | LC | Accepted |
| R-16 | Poor performance on low-end student phones | 3 | 3 | 9 | Route splitting; bundle budgets; skeletons; Lighthouse at M8; `phone-small` viewport in every PR | Budget check failures | FE | Open |
| R-17 | Solo-owner operations burden (updates, certificates, backups) | 3 | 3 | 9 | Quadlet + Caddy automation; timers; runbooks; monthly dependency batch | Missed updates | LC/PO | Open |
| R-18 | "Test theatre": agent tests that assert little | 3 | 4 | 12 | Independent QA; mutation testing on grading; review of assertion quality; fixture secret scans | QA finds defects that implementation tests "covered" | LC/QA | Mitigating |
| R-19 | Supply chain: third-party agent plugins, MCP servers or npm packages | 2 | 4 | 8 | No third-party agent plugins without approval; pinned actions; lockfiles; Dependabot; Trivy | Unexpected new dependency in a PR | LC/SEC | Mitigating |
| R-20 | Vietnamese UI copy quality (awkward machine translation) | 3 | 2 | 6 | Native vi copy written first; PO review at M5 and M8 | Tutor feedback | FE/PO | Open |

**Top risks (score ≥ 12):** R-01, R-02, R-14, R-04, R-06, R-09, R-12, R-18.
