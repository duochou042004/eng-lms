# ADR-0008: Immutable snapshot when assigning work to a student

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §15, §32 (C-12)

## Context
Student actions must never change original content, and later content edits must never change what a student saw or how they were
scored. Full content versioning is Phase 2.

## Decision
At assignment time, `activities` asks `questions.snapshotOf(ids)` for question content and answer keys, then stores a complete JSON
**snapshot** in `student_activity.snapshot` (schema in domain-model §3). Responses reference the stable `itemKey`s of the snapshot.
The snapshot column is immutable (a domain rule plus a DB trigger). Snapshot schema evolution uses `snapshot_schema_version` with upcasters.

## Alternatives considered
- **Question and activity revision tables** (reference immutable revisions). More normalised and deduplicated, but it is the Phase 2
  "versioning" feature, with more tables and queries. Revisit if storage grows (unlikely at ≤ 20k snapshots).
- **Reference live content:** violates SPEC §32. Rejected.

## Consequences
+ Grades stay reproducible, and the student view is self-contained and fast (one row). − Duplicated JSON (acceptable). An answer-key
mistake must be fixed per student activity (manual override in the MVP; "fix and regrade" in P2).

## Verification
An integration test edits and deletes a question and its activity after assignment, and asserts the student's view and score are unchanged.
The trigger test asserts that an UPDATE of `snapshot` fails.
