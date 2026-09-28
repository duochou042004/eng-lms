# DOCS-REVIEW record: T-M1.12 (PR #23)

> Recorded by the LC from the fresh docs-reviewer's returned reports (the harness blocks subagents from writing files). The reviewer probed the gate adversarially with the
> mocked `gh` only (scratch harness, not committed). Dispositions: DEC-076.

| Round | Head | Verdict | Findings |
|---|---|---|---|
| 1 | `ebc23cb` | **CHANGES REQUESTED** | F1 S3, F2–F5 S4 |
| 2 | `539ad0c` | **CHANGES REQUESTED** | R2-1 S3 (new), R2-2 S4 note |
| 3 | `d901291` | **PASS** | R3-1 S4 (fixed in the evidence-only commit `0123d7f`) |

## Round 1 (`ebc23cb`)
AC1–AC4 met; AC5 mostly met. CI 7/7; `docs-check` ran merge-gate 263/263 with the runner's jq (the look-ahead works in CI).

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| F1 | S3 | The `(?![A-Z0-9])` whole-word rule applied to every loose negative, so loose `FAILURES`, `FAILINGS`, `FAIL2`, `FAILSAFE`, `FAILÉD` (blocked on develop) were ignored: the gate became easier to pass | Fixed in `539ad0c`: two patterns (prefix match after a separator; strict only when glued to the id) |
| F2 | S4 | Only U+2010–2015/U+2212 normalised; NBSP/U+2009/U+3000 spaces, fullwidth colon and other dashes dropped by the ASCII filter; `+ `, `[x] `, `(1)` markers not stripped | Fixed; tests; git-governance §4 lists them |
| F3 | S4 | Bash `[0-9]` is locale-dependent: under `en_US.UTF-8`, `merge-gate.sh ７` passed the parser and called `gh` (still failed closed); `wrapperVersion=３.3.5` passed | Fixed: `export LC_ALL=C`; tests run the gate under `en_US.UTF-8` |
| F4 | S4 | The AC2 twin assertion grepped only `QA-VERDICT` | Fixed: exact "needs a fresh … (latest: 'none')" message |
| F5 | S4 | `progress.json` `pr: null`; CI links and the dry-run output missing | Fixed (`pr: "#23"`; evidence-only commit before the merge, accepted by the reviewer) |

Bypass families refused already in round 1: wrapper URL tricks (userinfo, `host@evil`, port, `http`, `../`, fragment, query, trailing space, CRLF, `\` continuation), CR-injected or
escaped keys, `:` separator, duplicate/reordered/moved keys, remove and re-add, `++`/`--` content, file headers, context-only hunks, added/blank lines, missing patch; argument
edge cases (`=`, `--`, whitespace, newline, `+7`, `0`, `07`, `0x7`, `7.0`, `''`, `-h`, `--DRY-RUN`, `-n`). Develop's gate merged on `7 --dry-run`, `--dry-run=1 7` and `-- 7`.

## Round 2 (`539ad0c`)
F2–F5 fixed and verified. 118 negative probes vs develop / round 1 / round 2; 20 positive, 38 wrapper, 29 argument probes.

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| R2-1 | S3 | The F1 separator needed a colon or a space *before* the dashes, so `<id>- FAIL`, `<id>-  FAILED`, `**<id>- CHANGES REQUESTED**` and `<id>-: FAIL` (blocked by develop / round 1) were ignored | Fixed in `d901291`: the loose separator is any run of `:`, `-` and spaces containing a colon or a space; glued list adds `URES?`/`INGS?`; tests |
| R2-2 | S4 note | Forms ignored by every version (e.g. `a.` markers, HTML tags, `=`/`,`/`|` separators, invisible characters between type and id) | Out of scope; the LC reads every verdict before `LC-APPROVED` |

## Round 3 (`d901291`)
merge-gate 295/295. 138 negative lines against develop and rounds 1–3: only 6 lines blocked by develop are ignored now, all a word glued to the id (`<id>-FAILOVER…`,
`<id>-FAILURESX`), i.e. the accepted carve-out; nothing blocked by round 1 or 2 was lost. Newly blocked: stacked separators, `<id>-FAILURES`, `<id>--FAILINGS`, a bare space,
separators the ASCII filter drops. No new false refusals for other ids (`<id>-x: FAIL`, `T-M9.99: FAIL`, `<id>_x`, `<id>.1`). Positives byte-identical to develop (only exact
lines count). Wrapper and argument probes as in round 2; all 25 invalid argument sets exit 2 with no `gh` call under `en_US.UTF-8`.

| ID | Sev | Finding | Disposition |
|---|---|---|---|
| R3-1 | S4 | `progress.json` history timestamps out of order | Fixed in `0123d7f` (evidence-only, `git diff --stat d901291 0123d7f` = evidence + progress) |

DOCS-REVIEW T-M1.12: PASS
