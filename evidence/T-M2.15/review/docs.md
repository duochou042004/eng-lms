# DOCS-REVIEW T-M2.15 (packet `docs/tasks/T-M2.15-guardians.md`, PR #111)

Fresh docs-reviewer subagent; recorded by the LC (the reviewer writes no files, posts no PR comments).

## Round 1 (fresh docs-reviewer, `a36b8fc`): DOCS-REVIEW T-M2.15: CHANGES REQUESTED

check-docs PASS. Component names and props (`ContactValue`, `DescriptionList` `emptyLabel`, `ConfirmDialog` `isPending`/`pendingLabel`/content
slot, `Disclosure`, `TextArea` counter, `InlineAlert` tones), `['auth','session']`, `SessionResponse.role`, the guardian OpenAPI schemas and the
DEC-128 split (backlog, IA §2, progress.json) confirmed.

| ID | Sev | Issue | Fix (LC, in-task, DEC-088) |
|---|---|---|---|
| D-1 | S3 | Add-form row Remove as an `IconButton` in a flex legend row: a second pattern and a `legend` that cannot share a wrapper | Contact-handle pattern: quiet `Button` "Remove guardian {n}" last in the fieldset, legend alone (scope 7, layout) |
| D-2 | S3 | Focus after removing the first row undefined | Previous row; first row → new first row; none left → Add guardian (scope 7, AC7, QA focus) |
| D-3 | S3 | AC3 "ErrorSummary on every failed submit" contradicts scope 3 | Field errors only (client, 422 other than `TOO_MANY`); `TOO_MANY` focuses its alert, no summary |
| D-4 | S4 | Guardian notes lose line breaks | `.note` class (pre-wrap); multi-line note in AC1 |
| D-5 | S4 | Long names: `h3` has no wrap rule | `overflow-wrap: anywhere` on the `h3` |
| D-6 | S4 | Add button during load/error; loading region semantics; removed-elsewhere alert lifetime | No Add until loaded; `output` `aria-busy` + label; the alert is focused and clears on the next guardian action |
| D-7 | S4 | Section position in edit mode | After the profile form, before Account |
| D-8 | S4 | "Empty"/"changed" before or after trimming | After trimming; unit table cases |
| D-9 | S4 | Divider `1px` | `var(--border-width)` |
| D-10 | S4 | Fictitious data for third-party evidence; sign-out drops guardians? | Fictitious-data rule; SEC asked to confirm the cache clear |
| D-11 | S4 | `security.md` target ambiguous | T19 |
| D-12 | S4 | progress.json `pr` null; HANDOFF stale | `pr: "111"`; HANDOFF header and next steps |
| D-13 | S4 | F2 note stale | The sentence to replace named in Docs to update |

## Round 2 (same reviewer, delta, `472c19a`): DOCS-REVIEW T-M2.15: PASS

D-1..D-13 fixed, no regressions. S4 N-1 (the cross-tab handler drops every query but the session, `dropAllButSession`, not the whole cache)
and N-2 (`0900 …` is a dialable Vietnamese mobile prefix; use `+1 555 0100`–`0199`) fixed by the LC after the PASS (wording only).
