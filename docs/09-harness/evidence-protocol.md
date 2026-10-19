# Evidence Protocol

> Evidence = reproducible proof that a task meets its gates. It is committed with the task (text only: summaries, logs, records JSON; PNGs are git-ignored since DEC-131). Bulky raw artefacts go to CI artefacts
> or `evidence/**/raw/` (git-ignored) and are **referenced** from the summary.

## 1. Layout

```text
evidence/
  README.md
  <task-id>/
    summary.md            # REQUIRED — the index (template below)
    gate-<UTC-ts>.log     # output of scripts/gate.sh (trimmed to ≤ 300 lines; full log in raw/)
    impl/                 # implementer: test reports summary, screenshots/<viewport>-<screen>-<state>.png, axe.json
    qa/                   # QA: report.md, plan link, screenshots, axe.json
    review/               # security.md, ux.md
    raw/                  # git-ignored bulky artefacts
  <milestone-id>/         # milestone regression report, retro.md, demo notes
  <release>/              # release gate evidence, restore-drill.md, perf report
```

Screenshot naming: `<viewport>-<route-slug>-<state>.png`, e.g. `phone-small-tutor-students-new-error.png`. Use PNG with a width ≤ 1440 px. Crop to the relevant region when possible.
Screenshots are **local working evidence**: `evidence/**/*.png` is git-ignored (DEC-131 (8)); the E2E helper still writes them, and reviewers look at them in the
session. The summary and the reports describe what each one shows. The PNGs tracked before DEC-131 were untracked (`git rm --cached`); history keeps them (no rewrite, PO).

## 2. `summary.md` template

```markdown
# Evidence — <task-id> <title>
- Branch: … · PR: … · Final commit: <sha> · Date (UTC): …
## Acceptance criteria → proof
| AC | Proof (test name / screenshot / log line) | Status |
## Commands run (copy-pasteable, in order)
## Results (counts: tests passed/failed/skipped; coverage; budgets; axe)
## Deviations & known limitations (with DEC/OQ refs)
## Implementer self-check (UI tasks; frontend-standards)
- [ ] UI rules block met · [ ] long-data check at 360/768/1280 · [ ] vi button verbs · [ ] heading order · [ ] counters with non-breaking spaces · [ ] docs in sync
## Reviews
- QA: <verdict> (qa/report.md) · SEC: … · UX: …
## G3 cost (one row per round; DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope (full / delta) | Agent tokens | Agent min | Gate runs | Gate min |
```

## 3. Rules

1. Evidence must be **reproducible**: commands, versions and seeds are recorded, and anyone can rerun them from the summary.
2. Record what happened, not what should happen: failed runs stay in the log history (append; don't rewrite).
3. No secrets or real personal data in evidence (synthetic fixtures only). Screenshots use fixture names.
4. The LC checks the summary completeness at G4. A missing proof for any AC blocks the merge.
