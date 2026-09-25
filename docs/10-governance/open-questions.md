# Open Questions — Product Owner decisions needed

> Every question has a **recommended default**. If the PO does not answer, the default is used once the planning baseline is approved,
> and it is recorded as a DEC entry. The "Needed by" column is the latest point at which the answer changes the work.

| ID | Question | Options | Recommended default | Needed by | Blocks |
|---|---|---|---|---|---|
| **OQ-01** | GitHub repository: name and visibility? | (a) private `eng-lms` (free plan, branch protection enforced by the harness scripts) · (b) public · (c) private on a Pro plan (real branch protection) | **(a) private `eng-lms`**, upgrading to (c) if convenient | **T-M1.1 (first gated task)** | T-M1.1 |
| OQ-02 | Default UI language, and are both vi and en needed in the MVP? | vi default + en · vi only · en only | **vi default + en available** (i18n from M1) | T-M1.3 | copy work from M2 |
| OQ-03 | Hosting target, domain and off-site backup location? | VPS (region SG/VN) · home server · PaaS; backup target: second VPS, object storage, the tutor's cloud drive | **Small VPS in Singapore + object-storage backups** | M8 (and T-M8.x) | deployment |
| OQ-04 | Learning plan templates: keep them in Phase 2, or add a minimal version (create from template, save as template) in Release 1.1? | P2 as in the SPEC · Release 1.1 · MVP | **Release 1.1** (right after 1.0) | End of M7 | — |
| OQ-05 | Confirm the MVP question types (8 types; matching and ordering in P2) | as proposed · add matching/ordering to the MVP | **As proposed** | M6 | M6 scope |
| OQ-06 | Can students see their learning profile (level, strengths, weaknesses)? | tutor-only · visible · per-field toggle | **Tutor-only** (goals are visible) | M2 | FR-STU-04 |
| OQ-07 | Permanent student deletion and a data export feature in the MVP? (privacy, minors) | include both in M8 · export only · neither | **Include both in M8** (small effort, reduces legal risk) | M7 | R-12 |
| OQ-08 | Is the "plugin store" meant as the internal extension registry described in plugin-store-spec.md? | yes · something else (please describe) | **Yes** | M6 | FR-EXT |
| OQ-09 | Upload limits and storage budget (video sizes; legacy .doc/.ppt support)? | defaults per A-011 · larger · smaller | **Defaults per A-011; no legacy .doc/.ppt** | M4 | FR-FILE-01 |
| OQ-10 | Session policy: 12 h idle, with an optional 30-day "keep me signed in"? | as proposed · shorter · no remember-me | **As proposed** | M2 | FR-AUTH-03 |
| OQ-11 | Product name or brand shown in the UI (workspace display name)? | free text in Settings | **Configurable; default "Eng-LMS"** | M2 | — |
| OQ-12 | May students check off self-study (TASK) items in their plan? | no · per-item toggle | **No in the MVP** (read-only) | M7 | FR-PLAN-06 |
| OQ-13 | Add a "Duplicate lesson to next week" quick action in the MVP (not full recurrence)? | yes · no (wait for P2 recurrence) | **Yes** (small; big daily saving) | M3 | FR-LES scope |
| OQ-14 | Dark theme? | MVP · P2 · never | **P2** (tokens make it cheap later) | — | — |
| OQ-15 | Activate the proposed Claude Code permission settings (`docs/09-harness/claude-settings.proposed.json` → `.claude/settings.json`)? | yes · adjust · no | **Yes, at T-M1.1** | T-M1.1 | harness enforcement |
