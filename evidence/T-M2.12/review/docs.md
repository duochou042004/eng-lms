# DOCS-REVIEW T-M2.12 (packet `docs/tasks/T-M2.12-nav-feedback-cross-tab.md`, PR #89)

Fresh docs-reviewer subagent; recorded by the LC (the reviewer writes no files).

## Round 1 (fresh docs-reviewer, `bf6e905`): DOCS-REVIEW T-M2.12: CHANGES REQUESTED

check-docs PASS. No files written, no PR comments.

| ID | Sev | Location | Issue | Suggested fix |
|---|---|---|---|---|
| D-1 | S2 | scope 2, design notes, AC3, Risks | The in-app Retry cannot work: React Router 8.4.0 `loadLazyRoute` caches each route's `lazy()` promise in a module-level `WeakMap` keyed by the route object, rejected promises included, never deleted (object form too). `navigate(location,{replace})` and `revalidate()` get the same rejection; AC3 can never pass. Our wrapper cannot prevent it. Browsers may also keep a failed dynamic `import()` in the module map. | Choose the mechanism: (a) load shell modules from loaders; (b) rebuild the router on Retry; (c) full reload of the failed URL for this case (needs a DEC; DEC-116 (2) and AC3/AC7 forbid it). Prove on Chromium, Firefox, WebKit. |
| D-2 | S2 | scope 4; design notes; AC7; `guards.ts:42-51` | A cross-tab sign-in can end the new session: B signs in as a must-change user and posts `signed-in`; A on `/login` revalidates, `guard.login` calls `logout()` (shared cookie) and posts `signed-out`; B is thrown out of `/change-password`. | The must-change logout in the `/login` guard runs only on a real navigation, never on a broadcast- or 403-triggered revalidation (e.g. `/login` `shouldRevalidate: () => false` and the receiver navigates `/`). Add to AC6 and QA focus. |
| D-3 | S3 | AC6 | Wrong end state: after `signed-out` A is on `/login?next=…`; the student `signed-in` then sends it to `/student/home`, not `/login?next=`. | "ends on `/forbidden` or `/student/home`, never showing tutor data". |
| D-4 | S3 | design notes vs scope 4 | "No guard code changes" contradicts the `/login` guard posting `signed-out`. | Say `guard.login` gains the post (and the D-2 rule); redirect rules unchanged. |
| D-5 | S3 | AC7 vs `RouteError.tsx:30` | The "no full-page reload (code search)" check matches the existing Reload button of the generic error page. | Scope the search to the new paths. |
| D-6 | S4 | Docs to update | `frontend-architecture.md` §6 (error boundaries show a request ID) missing. | Add §6. |
| D-7 | S4 | Trace; scope 4 | "Every browser in the support matrix has `BroadcastChannel`" has no trace. | Add A-014 / NFR-COMPAT-01. |
| D-8 | S4 | `progress.json` `currentTask.branch` | Shows the docs branch; the implementer must switch it. | Add the switch to `nextSteps`. |
| D-9 | S4 | layout | Out of scope is a sub-list, not the template's own heading. | Optional: own heading. |

Checklist: traceability pass; consistency fails on D-1, D-2, D-4; ACs 10 testable except AC3, AC6; size pass; out of scope explicit; guardrails answered; evidence complete; docs list missing §6; SEC/UX triggers correct; links pass. Not checked: whether WebKit and Firefox re-fetch a failed dynamic `import()`.

LC: all nine fixed in `38afd35` (D-1 → Retry reloads when online, DEC-116 (2); D-2 → `/login` opts out of revalidation, a tab there navigates to `/`).

## Round 2 (same reviewer, `38afd35`): DOCS-REVIEW T-M2.12: PASS WITH MINOR

D-1..D-9 fixed (verified; the must-change flow traced again: tab A goes to `/` then `/change-password`, tab B's session survives; language survives a full load via `localStorage`). check-docs PASS.

| ID | Sev | Location | Issue | Suggested fix |
|---|---|---|---|---|
| N-1 | S3 | design notes (Retry), scope 2 | Retry can leave the site: a pathname `//evil.example/x` matched by the top-level `*` route; `location.assign(path + search)` is protocol-relative, an open redirect if that chunk fails online. The packet's "never another origin" claim is false. | Use `window.location.reload()` (the address bar already shows the failed URL), or build `new URL(…, origin)` and assert the origin; unit test with a `//host` path. |
| N-2 | S4 | scope 4 `shouldRevalidate: () => false` | Also skips the `/login` guard between `/login` URLs differing in the query (Back/Forward); harmless today. | Return `false` only when the URL is unchanged. |

Checklist: traceability, consistency, 10 testable ACs (AC3 achievable), size, out of scope, guardrails, evidence and docs lists, SEC/UX triggers, links, progress/backlog/DEC: pass. Not checked in a browser: whether React Router keeps a `//` pathname as is (SEC to test).

LC: N-1 fixed (Retry = `location.reload()`, never `assign`/`href`; unit test named in the design notes) and N-2 fixed (`shouldRevalidate` returns `false` only when `currentUrl.href === nextUrl.href`), DEC-116 (2) and (4) amended. Final: **PASS**.

---

## Merge record (PR #92, fresh docs-reviewer, `f023992`): DOCS-REVIEW T-M2.12: PASS

Git facts, CI, DEC-119 vs DEC-116..118 and the QA/UX/SEC records, deferrals to T-M2.13, packet/backlog, progress.json, handoff and next-session prompt (3980 chars): consistent. check-docs PASS. Optional S4s:

| ID | Sev | Location | Issue | Fix |
|---|---|---|---|---|
| D-1 | S4 (pre-existing) | `progress.json` `tests.suites` | Suite details are old (backend 83, web 41, T-M1.5 gate log). | Update to the T-M2.12 numbers and logs. |
| D-2 | S4 (pre-existing) | `HANDOFF.md` gotchas, merge-gate tokens | `UX-REVIEW <task>: APPROVED` missing. | Add it. |
| D-3 | S4 | `evidence/T-M2.12/review/ux.md` | Cited UX screenshots are not in the repo; DEC-119 mentions only the lost QA artifacts. | Say so in DEC-119. |

LC: D-1..D-3 fixed in this PR.
