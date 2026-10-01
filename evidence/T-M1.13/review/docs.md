# DOCS-REVIEW record: T-M1.13 packet (PR #24)

> Recorded by the LC on the next docs branch, as planned. The reviewer's full round-1 and round-2 texts were not kept by the previous session (it handed off on its context
> budget right after the merge); this record is reconstructed from the PR #24 comments, the round-1 fix commit and the packet history. Merged as `6c8d1d4`.

| Round | Head | Verdict | Findings |
|---|---|---|---|
| 1 | `3d7803d` | **CHANGES REQUESTED** | F1 S3: the label weight (500 → 600) also shifts segment widths, so hiding the check icon alone could not meet AC2. F2 S3: no `ui/` link style for the error page's way back. F3–F10: 8 × S4 |
| 2 | `d55d993` | **PASS** | R2-1 S4: `progress.json` timestamps (fixed on the T-M1.13 feature branch, `42d88f1`) |

- Round-1 fixes: `d55d993` "fix DOCS-REVIEW round 1 findings (F1-F10)". F1 → scope 2 now neutralises both the icon and the weight (a hidden bold label copy, or no weight
  change); F2 → scope 4 uses the `homeLink` class from `web/src/app/routes/Page.module.css`.
- PR comments: `DOCS-REVIEW T-M1.13: PASS` and `LC-APPROVED T-M1.13` at `d55d993`, CI 7/7.
