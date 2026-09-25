# ADR-0009: Question types as registered handlers with jsonb content

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §16, §17 ("can be extended later"), §33; plugin-store-spec

## Context
There are 10+ question types, each with a different structure (options, blanks, pairs, media). New types will come in P2. Separate tables
per type would multiply the schema. A single `QuestionOption` table does not fit blanks, matching or audio.

## Decision
- `question.type` stores an **extension ID** (`core.single-choice`, …) and `question.content` stores type-specific **jsonb** that includes the
  answer key. `type_schema_version` enables upcasting.
- Each type is a `QuestionTypeHandler` extension (plugin-store-spec §4.1) with a JSON Schema, validation, student-view redaction, response
  validation, auto-grading, and a `needsManualGrading(content)` flag. The frontend has a matching editor, renderer and reviewer.
- No switch statements over type IDs anywhere outside the registry (architecture test).

## Alternatives considered
- A table per type: rigid, with migration churn per type. Rejected.
- EAV options table: awkward for non-option types. Rejected.

## Consequences
+ New types need no schema migration. Behaviour per type is isolated and table-testable. − jsonb must be validated rigorously (JSON Schema
plus handler validation). Querying inside content is rare and discouraged.

## Verification
Each handler has table-driven tests: valid and invalid content, redaction (no answer-key fields leak), grading matrix. A registry test covers
unique IDs, schemas and front/back parity.
