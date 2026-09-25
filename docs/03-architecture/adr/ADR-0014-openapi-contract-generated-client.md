# ADR-0014: OpenAPI generated from code, committed, drift-checked; typed client

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: NFR-MNT-04

## Context
The frontend and backend are built by different agents. Contract drift is a classic integration failure.

## Decision
- The backend generates OpenAPI 3.1 via springdoc. A test (`OpenApiContractTest`) writes `api/openapi.json` (deterministic ordering).
  CI fails if the generated file differs from the committed one. Contract changes are therefore always visible in PR diffs.
- The frontend generates `web/src/lib/api/schema.d.ts` with `openapi-typescript` from `api/openapi.json` and uses `openapi-fetch`. CI
  fails if the generated types are stale.
- Every error response is documented as `application/problem+json` with a `code` enum.

## Consequences
+ Compile-time breakage instead of runtime surprises. − Adding an endpoint touches 3 places (code, contract file, client). This is intended.

## Verification
The CI jobs `contract-drift` and `web-typecheck`.
