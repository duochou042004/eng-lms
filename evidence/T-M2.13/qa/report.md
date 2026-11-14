# QA Report — T-M2.13 Auth and shell feedback follow-ups
Verdict: PASS WITH MINOR · Build: 7d843d4 (code 0a01995) · Date: 2026-11-14 · Evaluator session: fresh combined QA+UX subagent (G3, tier M, qa-protocol §2a)

Recorded by the LC from the reviewer's returned text (reviewers return text only).

## Environment
- Packaged jar with the SPA (`scripts/e2e-run.sh`) on :8080, a fresh `englms_e2e` database in the dev PostgreSQL 18 container (Podman socket); the dev database was not touched.
- Playwright 1.65.0, Chromium headless shell 1254; phone-small 360×740, tablet 768×1024, laptop 1280×800; touch below 1024.
- Scenarios in a git-ignored scratch folder reusing the `e2e/support` sign-in helpers; every logout case used a fresh tutor or student sign-in.

## What was run
- Web: `pnpm lint`, `pnpm typecheck` pass; `pnpm test --run` 69 files, 846 tests passed.
- Changed E2E specs (`navigation.spec.ts`, `shells.spec.ts`) at three projects: 127 passed, 20 skipped by design, 0 failed.
- Focus specs ×20 (`--grep "T-M2.13 AC1|T-M2.13: Log out" --repeat-each=20 --retries=0`): 120 run (60 toggletip, 40 offline logout, 20 logout 500), all passed, 180 skipped by project guards, 0 flaky.
- Own black-box suite: 66 tests, 55 passed, 11 skipped by design; probes (back focus 3, short viewports 3, toggletip a11y tree 1, account-popover baseline 1) passed.
- Scope: diff 648ea0f..HEAD 41 files, none under `backend/` or `api/openapi.json`; removed test lines only scan items (a)–(e) plus the two 204-handler fixture fixes; no test weakened; check-docs and path-ownership PASS; no exam or curriculum name in `web/src`.

## AC results
| AC | Scenario(s) | Viewports | Result |
|---|---|---|---|
| AC1 toggletip | `/meta` 500, tutor and student, vi and en: trigger 44×44, 8 px to Retry, Retry described, `aria-haspopup`/`aria-expanded`; tap opens a dialog named by the message with focus inside, inside the gutters, axe clean, no mid-word break; Esc and outside tap return focus; rotation or widening closes it with focus on Retry; no trigger or Tab stop at ≥ 22rem; closes on navigation | 360 tutor and student, 768 student | Pass |
| AC2 cross-tab notice | From `/tutor/today` (vi, en), `/tutor/students`, `/tutor/students?q=an`, a dirty `/tutor/students/new` (two 401s during the follow, still one navigation), `/student/home`, forced `/change-password` (no `next`): notice, focus on h1, one navigation; hidden on a sign-in submit; no notice for a direct visit, a tab on `/login`, `signed-in`, a forged `signed-out` with a live session, own logout, a 401. `pageshow` by unit tests only | 360, 768, 1280 | Pass |
| AC3 offline logout | Alert in 61–124 ms with offline text in drawer/popover, button enabled and focused, URL unchanged, tab B unmoved; back online signs out; forced change-password the same | 360, 768, 1280 | Pass |
| AC4 500, network error, slow | 500 and abort: alert, state kept, nothing posted; slow 204 pending then `/login`; slow 500 pending then alert; second press clears it; student More sheet and popover pass | 360, 768, 1280 | Pass |
| AC5 chunk pages | Unchanged h1 and one-sentence descriptions in vi/en; offline Retry announces the full sentence | 1280; offline also 360 | Pass |
| AC6 | axe clean per new state; no mid-word breaks at 360 vi; no sideways scroll; keys in vi and en; Log out ≤ 2 steps | all three | Pass |
| AC7 | Unit 846/846; changed specs 0 failed; `backend/` and openapi unchanged; gate PASS from the implementer's log; CI 7/7 on 7d843d4 (LC) | — | Pass |

## Exploratory charter
Log out never spun without end, never failed silently, never landed on `/login` while the session lived; no notice appeared when the tab was not signed out by another tab. Short viewports: UX-1, UX-2.

## Findings
| ID | Sev | Summary | Steps | Expected | Actual |
|---|---|---|---|---|---|
| UX-1 | S3 | Drawer footer clips the logout alert at short heights | 740×360 touch, fresh tutor, drawer, logout 500, tap Log out | Whole alert visible or scrollable | Only the title shows; the sheet is 429 px in a 360 px window and nothing scrolls (`web/src/ui/Sheet.module.css:89-92`, via `ShellParts.tsx:75`); the limit predates the branch |
| UX-2 | S4 | Change-password alert below the fold at 360×740 | Forced change, logout 500, tap Log out | Alert on screen | At y 695–799; focus stays on Log out, the page scrolls, the alert is announced (`ChangePasswordPage.tsx:218`) |
| QA-1 | S4 (older than this branch) | React Aria's hidden close buttons are named "Dismiss" in vi | Open the toggletip or the account popover in vi | Vietnamese names | "Dismiss" ×2; same in `ui/Popover` on develop |

## Accessibility summary
axe clean for the open toggletip, the `/login` notice and every logout alert. The modal toggletip hides `main`, traps Tab, returns focus. The notice is `role="status"` after the h1; alerts are `role="alert"`. Targets ≥ 44 px. The trigger's description (from `title`) equals the message, but the message appears once in the alert's tree, so no double announcement. No real screen reader was used (accessibility tree only).

## Isolation / privacy
No endpoint, DTO or backend change. The cross-tab navigation carries only `{ signedOutElsewhere: true }`; the channel carries only `{ type }`; a failed logout posts nothing.

## Not checked
A real screen reader, `pageshow` end to end, Firefox and WebKit.

## Re-test log
- 2026-11-14 · 7d843d4 · round 1 · PASS WITH MINOR (S3 ×1, S4 ×2, one older than this branch).
