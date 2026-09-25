# ADR-0006: Single tenant: one deployment, one tutor

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §3, §5.3, §34 ("multi-tenancy necessity"), §45

## Context
SPEC §34 asks whether multi-tenancy is necessary. SPEC §5.3 and §45 exclude multiple tutors, marketplaces and SaaS.

## Decision
No tenant concept exists: no `tenant_id`, no organisation table. A deployment has **exactly one** TUTOR account, enforced by the partial
unique index `ux_user_account__single_tutor`. Another tutor would get their own deployment and database.

## Alternatives considered
- `tenant_id` "just in case": it adds a filter to every query, a new leak vector and test burden, and the SPEC explicitly rejects it.

## Consequences
+ Simpler queries and security model. − Hosting several tutors means several deployments (acceptable, and it is a non-goal).

## Verification
A DB test proves that a second TUTOR insert fails. An ArchUnit/grep test finds no `tenant` identifiers.
