# ADR-0007: One Activity engine for assignments and assessments

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §17, §18, §19, §33, §34 (C-02); DEC-004

## Context
SPEC §17 (assignment) and §18 (assessment) describe the same mechanics: questions, points, pass mark, time limit and attempts. They differ only
in emphasis (homework with a deadline and a file or text response, versus a sectioned timed test). SPEC §33 says not to build separate
types that only differ in data.

## Decision
A single aggregate `Activity` with `kind ∈ {ASSIGNMENT, ASSESSMENT}` and the same sections, items, settings and rubric. `kind` drives **only**
UI presentation defaults (assignments: one implicit section, due date prominent; assessments: explicit sections, timer
prominent) and list grouping. The engine (assign, snapshot, attempt, grade, feedback, release) is the same code.

## Alternatives considered
- Separate Assignment and Assessment modules (SPEC §35 example). This would duplicate the engine and double the test surface. Rejected.
- A generic "Task" that also covers lessons. Over-generalised: lessons have different lifecycles. Rejected.

## Consequences
+ Half the code, and consistent grading. − The code must never branch on `kind` for grading logic (an ArchUnit/grep rule plus review checklist).
The UI keeps two menu entries (DEC-010).

## Verification
Grading tests are parameterised over both kinds. The rule "no `kind ==` in `activities.internal.domain.grading`" is checked in the architecture tests.
