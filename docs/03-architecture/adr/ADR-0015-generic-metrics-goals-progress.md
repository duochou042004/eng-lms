# ADR-0015: Generic metrics and observations back goals and progress

- Status: Accepted (baseline) · Date: 2026-09-25 · Deciders: LC · Trace: SPEC §8, §9, §25, §33; CONV §14 ("+ Add Metric"); C-13

## Context
Goals may be "TOEIC 570 → 650", "Speaking 5/10 → 8/10" or "Vocabulary 400 → 1000 words". Progress shows mock-test series and
skill bars. Nothing may hard-code TOEIC or IELTS.

## Decision
- `MetricDefinition` (tutor-defined: name, unit, NUMBER or SCALE with range, direction) is the only way to quantify anything.
- `MetricObservation` holds the time series per student (manual, or `ACTIVITY_RESULT` via the activity's `recordResultAs`).
- `LearningGoal` optionally references a metric, with baseline and target. Its progress is computed, never stored.
- The progress view's "skill bars" are SCALE metrics chosen by the tutor. "Mock test 550 → 585 → 610" is an observation series.

## Consequences
+ One mechanism covers every exam and skill, with no schema change per curriculum. − The tutor has to define metrics once. Mitigated by inline
"create metric" from the goal form and example text in empty states (no seeded data).

## Verification
Fixture tests compute goal progress for both directions, missing baselines and SCALE vs NUMBER. A forbidden-identifier test covers TOEIC/IELTS.
