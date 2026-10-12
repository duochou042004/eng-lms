# T-M2.11 docs review record (fresh docs-reviewer; recorded by the LC from the returned text)

PR #85, branch `docs/T-M2.11-app-shells`.

## Round 2 (head `d7c2cfd`; fresh reviewer)

`./scripts/check-docs.sh` (bare): `docs-check: PASS (211 markdown files, progress.json valid, sources intact, prompt within limit)`

All round 1 findings D-1..D-11 **fixed** (D-1 checked against `route-focus.spec.ts:162-199`, `loading.spec.ts:94-122`, `smoke.spec.ts:44-64`).
Also confirmed: the split agrees across DEC-112, backlog and `progress.json`; code assumptions hold (`router.tsx` splat guards, `requireRole`
builds `next` from the request URL, Cancel = `navigate(-1)`, `WorkspaceName` error has a Retry `Button`, `RouteLoading` draws the T-M2.4
controls, `meta.error` says "class", `auth:header.logout` still used by `ChangePasswordPage.tsx:206`); SEC not triggered holds; React Router
resolves a relative loader `redirect('today')` against the matched route.

| ID | Sev | Issue | LC disposition |
|---|---|---|---|
| N-1 | S3 | Tutor < 1024 px and student < 768 px have no account button or popover, yet scope 11 (b), AC9 and the evidence list assumed one at every viewport. | Fixed: per-viewport wording (drawer / More sheet below the breakpoints, popover above). |
| N-2 | S3 | IA §3 "More expanded inline" at ≥ 768 px vs the account-menu button: no DEC. | Fixed: DEC-112 (4) clause; IA §3 note in Docs to update. |
| N-3 | S3 | The public toolbar row (name + switcher) had no one-row/truncation rule; a wrap could break `polish.spec.ts` AC3. | Fixed: scope 8 and AC7 cover the public row; scope 9 adds a name-shaped line to the public toolbar skeleton. |
| N-4 | S4 | `route-focus.spec.ts:81`, `:148` find the home link by "Eng-LMS". | Fixed: scope 11 names it. |
| N-5 | S4 | Home-link design note contradicted itself. | Fixed: reworded. |
| N-6 | S4 | `Popover` is not in the design-system §3 inventory. | Fixed: "added to the §3 inventory". |
| N-7 | S4 | `HANDOFF.md:3` stale branch and PR #84 note. | Fixed. |

Not checked: the full `ux-flows.md` and `interaction-states.md` text; the 44 px target with the workspace name as the home link (runtime; AC7,
AC9, QA).

DOCS-REVIEW T-M2.11: PASS

## Round 1 (head `2fd0108`)

`./scripts/check-docs.sh` (bare): `docs-check: PASS (210 markdown files, progress.json valid, sources intact, prompt within limit)`

**What checks out (reviewer):** template and G0 sections complete, 10 ACs, 2 agent-days with a split line, T-M2.4 merged; all references exist
(SPEC §4.3, §41; FR-AUTH-04/05; NFR-RESP-01..03, NFR-A11Y-01/02, NFR-PERF-03; IA §1, §3, §4, §5; responsive-standards §1, §3 items 5 and 6;
design-system §3; DEC-073/087/109/111; the four "Carried over to T-M2.11" notes in `evidence/T-M2.4/review/ux.md`; S4-2 at
`evidence/T-M2.4/review/security.md:86`). The DEC-112 split covers every item of the original backlog row; T-M2.5 depends on T-M2.12; the four
carried UX notes map to AC4, AC5 and AC7. SEC not triggered holds (`GET /api/v1/meta` is public; `/tutor/nope` passes `isSafeAppPath`; voluntary
Cancel uses `navigate(-1)`). No scope creep; `progress.json` coherent.

| ID | Sev | Issue | LC disposition |
|---|---|---|---|
| D-1 | S2 | The shell language switcher moves into the account section, but `route-focus.spec.ts` (language 1 step on `/tutor`, `/student`, T-M1.9 budget), `loading.spec.ts:94-122` (T-M1.16 AC1 shell switcher skeleton) and `smoke.spec.ts` (shell radios) need it on the page, while the packet said every assertion is kept. | Fixed: DEC-112 (5) revises the language budget (1 step on public pages, ≤ 2 from a shell page); scope 11 names the three changed assertions; AC8/AC10 reworded; `ux-flows.md` in Docs to update. |
| D-2 | S3 | The workspace name as home link plus its error state's Retry `Button` would nest a button in a link; the link's name while loading or after an error is unspecified. | Fixed: design note (only the loaded name is the link; `app.name` fallback; Retry beside the link) and an AC5 check. |
| D-3 | S3 | responsive-standards §3 item 5 says a `Sheet` is a bottom sheet on `xs`/`sm`, but the drawer is a start-edge `Sheet`; the More sheet's drag handle is unmentioned. | Fixed: item 5 added to Docs to update; More sheet has a decorative drag handle and a Close button (item 7). |
| D-4 | S3 | `HANDOFF.md` and `next-session-prompt.md` still put the 150 ms/offline/cross-tab items under T-M2.11. | Fixed in this PR. |
| D-5 | S4 | `NotFound` renders its own `main`; reusing it inside the shell breaks "one `main`". | Fixed: extract the content; the top-level `NotFound` keeps its `main`. |
| D-6 | S4 | accessibility §2 is cited for the popover-not-menu choice but says nothing about it. | Fixed: cites the ARIA APG menu pattern and accessibility §1 rule 3. |
| D-7 | S4 | The trace cites design-system `AppShell` (inventoried in `ui/`) but the shells stay in `app/shells/`. | Fixed: Docs to update says where `AppShell` lives. |
| D-8 | S4 | responsive-standards §3 item 8 needs a full-text tooltip and the detail view; the packet allowed "the `title` or the accessible name". | Fixed: a `title` is required; the full name is in Settings › Workspace (T-M2.6). |
| D-9 | S4 | Moving the guard to a param-less parent changes when it re-runs. | Fixed: design note; stale sessions are T-M2.12 (SEC). |
| D-10 | S4 | responsive-standards §1 promises CSS custom media; no plugin exists. | Fixed: CSS repeats the values with a comment; §1 is updated by the task. |
| D-11 | S4 | Backlog row trace misses IA §4. | Fixed. |

Not checked by the reviewer: frontend-architecture/interaction-states wording beyond §3 and the skeleton rules; how React Router resolves the
relative `redirect('today')` in the sketch.

DOCS-REVIEW T-M2.11: CHANGES REQUESTED
