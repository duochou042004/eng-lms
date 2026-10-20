# Agent Roles, Responsibilities and Tool Permissions

> Roles map to Claude Code subagent definitions in `.claude/agents/` (where applicable) and to project skills in `.claude/skills/`. The **Lead Coordinator**
> is the main session (the orchestrator). Other roles run as subagents or separate sessions with **fresh context**.

## 1. Roles

| Role | Mission | Owns (writes) | Must not |
|---|---|---|---|
| **Product Owner (PO)**, human | Product decisions, approvals, external actions | Answers to OQs; approvals | — |
| **Lead Coordinator (LC)** | Plan, slice and gate; keep state; approve and merge | `docs/**` (except `qa/`), `progress.json`, `evidence/<task>/summary.md` (recorded from the implementer's text, L-07), task packets, decision log, risk register, `.claude/**`, `.github/**` | Write product code in the same task it approves (no self-approval); merge without the G1–G3 evidence |
| **Backend Implementer (BE)** | Implement backend packets with tests | `backend/**`, `api/openapi.json` (generated), backend docs sections named in the packet, `evidence/<task>/impl/**` | Touch `web/`, `qa/`, `master`/`develop`; add dependencies without packet approval; edit applied migrations |
| **Frontend Implementer (FE)** | Implement UI packets to design standards | `web/**`, `e2e/**`, frontend docs sections named in the packet, `evidence/<task>/impl/**` | Touch `backend/` (except when regenerating the contract is required), `qa/`; import RAC outside `ui/`; raw styles |
| **QA Evaluator (QA)** | Independent black-box verification; for tiers M and H also the UX checklist in the same pass (combined QA+UX reviewer, qa-protocol §2a, DEC-131) | `qa/**`, `evidence/<task>/qa/**` (text; the LC posts the verdicts) | Read the implementation before the verdict; edit product code or implementer tests; approve merges |
| **Security Reviewer (SEC)** | Security and privacy review of triggered PRs | `evidence/<task>/review/security.md` (recorded by the LC) | Edit product code (proposes changes as findings) |
| **UX Reviewer (UX)** | Design-system, responsive, a11y and flow-budget review | `evidence/<task>/review/ux.md` (recorded by the LC) | Edit product code |
| **Docs Reviewer (DOC)** | Fresh-context G3 review of docs/chore packets (consistency, traceability, links, scope) | `evidence/<task>/review/docs.md` (recorded by the LC) | Edit the reviewed docs; review docs it wrote |

One agent may play several roles **across different tasks**, but never implementer + evaluator on the same task. The combined QA+UX reviewer plays QA and UX
in one fresh context on the same task (both are evaluator roles). Reviewers return text only: no PR comments and no files in the tree; the LC records the
reports and posts the verdict lines after CI is green on the final head.

## 2. Tool permissions matrix

| Capability | LC | BE | FE | QA | SEC | UX |
|---|---|---|---|---|---|---|
| Read the whole repo | ✓ | ✓ | ✓ | ✓ (implementation only **after** the verdict draft) | ✓ | ✓ |
| Write paths | docs, progress, summary, .claude, .github | backend, api, impl evidence | web, e2e, impl evidence | qa, qa evidence | review evidence | review evidence |
| Run build, tests, E2E locally | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Run the app (dev/e2e profile) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Browser automation (built-in browser / Playwright) | ✓ | – | ✓ | ✓ | ✓ | ✓ |
| `git commit` / push feature branch | ✓ (docs/chore) | ✓ | ✓ | ✓ (qa/ branch only) | – | – |
| Open PR (`gh pr create`) | ✓ | ✓ | ✓ | – | – | – |
| Comment on PR | ✓ | ✓ | ✓ | – (text to the LC) | – | – |
| **Merge PR** (`scripts/merge-gate.sh`) | ✓ **only** | – | – | – | – | – |
| Push to `develop`/`master`, force-push, delete remote branches (except the merged task branch) | – | – | – | – | – | – |
| Add a dependency | approve | propose in packet | propose in packet | – | review | – |
| Container engine for dev containers (Docker or Podman) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Host or system settings (sysctl, systemd system units, firewall) | ✗, needs the PO | ✗ | ✗ | ✗ | ✗ | ✗ |
| External or outward actions (create repo, deploy, publish, paid services) | ✗, needs the PO | ✗ | ✗ | ✗ | ✗ | ✗ |
| Delete data (DB volumes, files) outside dev | ✗, needs the PO | ✗ | ✗ | ✗ | ✗ | ✗ |

Enforcement: (1) subagent `tools` allow-lists in `.claude/agents/*.md`; (2) path-ownership check `scripts/check-path-ownership.sh`, which fails the PR if a branch
prefix touches forbidden paths (`qa/*` branches → only `qa/**` and `evidence/**/qa/**`; `feature/*` branches → not `qa/**`); (3) the `pre-push` hook; (4) branch
protection or `merge-gate.sh` (ci-cd.md §2). A proposed Claude Code permission configuration is in `claude-settings.proposed.json`. Activating it is a PO decision (OQ-15).

## 3. Path ownership

`scripts/check-path-ownership.sh` (CI, every PR) **mechanically enforces** only these rules: QA-owned paths (`qa/**`, `evidence/*/qa/**`) and reviewer evidence
(`evidence/*/review/**`) are off-limits to implementation branches; `qa/` branches may touch only QA paths; `docs/00-sources/**` is immutable; the branch
kind must be known. It fails on an empty or failing diff. The rest of the table below is enforced by **review** (LC at G4; the scope and ownership checks in the
PR template). CI runs the PR's own copy of the script, so the LC runs `merge-gate.sh` from an up-to-date `develop` checkout and reviews any change to `scripts/**`,
`.github/**` or `.claude/**` as a governance change (residual risk R-08).

| Path | Owner role | Others |
|---|---|---|
| `backend/**`, `api/**` | BE | FE may regenerate `api/*.json` only through the documented command |
| `web/**`, `e2e/**` | FE | — |
| `qa/**`, `evidence/**/qa/**` | QA | read only |
| `evidence/**/review/**` | SEC, UX | read only |
| `docs/**`, `progress.json`, `.claude/**`, `.github/**`, `scripts/**` | LC | implementers may edit the doc sections named in their packet; `scripts/` changes need LC review |
| `docs/00-sources/**` | nobody (immutable) | — |

## 4. Hand-offs between roles

```text
LC ──packet(ready)──► BE/FE ──PR + impl evidence──► QA (+SEC/UX) ──verdict + findings──► LC ──merge | return──► BE/FE
```

Every hand-off is a **written artefact** (packet, PR description, evidence file, PR comment). No hand-off relies on chat.
