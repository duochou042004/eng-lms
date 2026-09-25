# ADR-0011: Archive instead of global soft delete

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §16 (Archive), §34 ("soft delete"), G-06

## Context
The tutor needs to "delete" content that may still be referenced by student history. A global soft-delete filter (for example Hibernate `@SoftDelete`
or `deleted=false` everywhere) creates surprising behaviour and leak risks (forgotten filters), and complicates unique constraints.

## Decision
- Library content (materials, lesson templates, questions, activities, metric definitions) has an explicit `archived_at`. **Archived means hidden
  from pickers and default lists, but still fully readable where it is referenced.** Unarchive is allowed.
- **Delete means hard delete** and is allowed only when nothing references the item (FK `RESTRICT` plus a service check that returns
  409 `IN_USE` with a usage list).
- Students use a status (`ARCHIVED`), not deletion. Permanent deletion of student data is OQ-07.
- Within an aggregate, children are hard-deleted with cascade.

## Consequences
+ No hidden global filters, and the semantics are clear to the tutor ("archive" vs "delete"). − List queries must filter `archived_at IS NULL` explicitly.
Partial indexes support this.

## Verification
Tests for: delete a referenced item → 409 with usages; an archived item stays visible in existing snapshots, lessons and shares; an archived item is absent from pickers.
