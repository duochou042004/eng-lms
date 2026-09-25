# 00 — Source documents (immutable)

These files are the **original product inputs**. They are never edited. Any change to product scope is made through
[`../10-governance/decision-log.md`](../10-governance/decision-log.md) and reflected in the derived docs.

| File | Role | SHA-256 (at import, 2026-09-25) |
|---|---|---|
| `personal_english_tutor_teaching_workspace_spec.md` | **Primary product specification (source of truth for product scope).** Referenced as `SPEC §n`. | `72b023aaaafcf8af2fb3935173e01bc0365656167aade6ea83ffe42fd2ec0e62` |
| `conversation_with_AI.md` | Earlier design discussion the spec was distilled from. Supporting rationale only. Referenced as `CONV §n`. | `38c908d4de3ecc0159d187f2372ebb4ed0b6732dd3131cc0bf88b93143626472` |

## Precedence (DEC-001)

1. **Explicit instructions from the human Product Owner** in a session (for example, the stack and process directives of
   2026-09-25: JDK 25, Spring Boot, Node.js, Podman, HoH harness, git governance).
2. **SPEC** for product scope, non-goals and behaviour.
3. **Accepted decisions and ADRs** in `docs/10-governance` and `docs/03-architecture/adr`. These resolve ambiguities; they cannot widen scope without Product Owner approval.
4. **CONV**, for context and rationale only. Where CONV and SPEC differ, SPEC wins.

`docs/01-product/spec-reconciliation.md` lists every conflict found and how it was resolved.

Verify integrity: `sha256sum docs/00-sources/*.md`.
