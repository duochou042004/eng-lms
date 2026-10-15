# QA report T-M2.12 (rounds 1–2; final PASS)

Fresh qa-evaluator subagent; recorded by the LC from the evaluator's returned text (the evaluator writes no files). Round-1 scratch specs, plan and screenshots were kept in the LC's local records; the round-2 scratch files were lost when the scratchpad was cleared during an API-limit pause (the round-2 numbers are the evaluator's reported results).

## Round 2 (head `5ed3f4d`)


# QA Report: T-M2.12 Navigation feedback and cross-tab session (round 2)
Verdict: **PASS**. All of AC1–AC11 pass, including AC11 (a)–(f). There are no open S1, S2, S3, S4 or SCOPE findings, and round-1 F-1 is fixed. · Build: `5ed3f4d` (PR #90) · Date: 2026-10-14/15 · Evaluator: the same independent QA subagent as round 1

**Artifact files are gone.** Every round-2 run below finished before the API-limit stop. While the work was paused, the scratchpad in `/tmp` was emptied: the logs, screenshots and QA spec files no longer exist. The numbers here come from the run outputs I saw in this session. If the LC needs the files themselves, the round-2 runs have to be repeated (about 45 min). As before, nothing was written to the repo: no `evidence/T-M2.12/qa/report.md` and no PR comment. HEAD is `5ed3f4d`, `evidence/T-M2.12` was restored, the tree is clean, and nothing is listening on 8080, 8090, 8091 or 5199.

## Round-1 recap (head `57ce8df`)
- Verdict was **PASS WITH MINOR**. AC1–AC10 all passed. `gate.sh` passed twice in a row (backend 466, web 364, E2E 276 passed and 30 skipped).
- Repeat runs had 0 failures and 0 flaky: QA specs ×3 (162 passed), QA timing checks ×20 (360), implementer's changed specs ×3 (378), implementer's timing-sensitive specs ×20 (1500).
- **F-1 (S4):** after the connection came back, the offline chunk page still said "You're offline" until Retry was pressed.
- Observations, not filed:
  - O-1: Log out while offline spins with no message.
  - O-2: A logout that fails with a 500 gives no feedback.
  - O-3: 50 channel messages cause 50 serial session reads.
- DEC-118 sent F-1, UX-1, UX-2, UX-5, SEC S4-1 and SEC S4-2 into AC11 (a)–(f). UX-3, UX-4, O-1 and O-2 went to the T-M2.13 backlog, and O-3 was accepted.

## Environment
- Packaged jar from the round-2 gate build; it contains the new `pageshow` handler. It ran on :8090/:8091 against the dev PostgreSQL.
- Chromium only; Firefox and WebKit host libraries are missing.
- Test students were created through the tutor API.
- I wrote the AC11 verdict before reading any code. Afterwards I read only the test names in `sessionSync.test.tsx` and the `guards.ts` hunk.

## AC11 results (black-box, at 360, 768 and 1280)
| AC11 | What I checked | Result |
|---|---|---|
| (a) F-1 | Offline chunk page, then online: within 0.8 s the h1, title and text switch to the couldn't-load version. Going offline again switches back to the offline version. Flapping ×5 ends on the correct state. Retry while offline sends 0 requests and does not reload (marker kept); the `online` event does not reload. Retry once online does a full load to `/student/home`. vi and en. | PASS |
| (b) UX-1 | Each page has its own h1 and title. Offline: "You're offline" / "Bạn đang ngoại tuyến" (title "… · Eng-LMS"). Couldn't load (online, or chunk aborted): "This page couldn't load" / "Không tải được trang này". The generic error (session request returning 500) keeps "This page couldn't be displayed" / "Không hiển thị được trang này". | PASS |
| (c) UX-2 | Retry and the generic "Reload page" have the same computed style as the primary "Sign in" button (`rgb(47,93,140)` background, white text). The start-page link is still a quiet underlined link with no background. | PASS |
| (d) UX-5 | The progress line's animation is `var(--motion-duration-progress) var(--motion-easing)`, and the `:root` token is `--motion-duration-progress: 1.2s` (measured duration 1200 ms). With reduced motion the line is still static (AC1 regression). | PASS |
| (e) SEC S4-1 | Student 1 → student 2 with tab A mounted on `/student/home`. I logged out silently through the API (no broadcast) and signed student 2 in through the UI in tab B. A stayed in the same document with no navigation, then showed student 2's username and never student 1's. The variant through logout and sign-in also passes; its last session response is student 2's. | PASS |
| (f) SEC S4-2 | Cannot be reproduced from the outside here. Even with Playwright's `--disable-back-forward-cache` removed, `pageshow.persisted` was never true; the page reloaded fully instead. In that case Back after a cross-tab switch to a student still ended on `/forbidden` with no tutor content. I checked the coverage only after the verdict draft: unit tests for a `persisted` pageshow (resync) and a normal pageshow (no change). | PASS (unit test plus safe fallback) |

axe (WCAG 2.0, 2.1 and 2.2, A and AA) found **0 violations** on the offline, couldn't-load and generic error pages, in vi and en, at all three widths.

## Regression of AC1–AC10 at `5ed3f4d`
- **Gate, run once:** `gate.sh` **PASS** (13 steps, 587 s). Backend 466 with 0 failures, web **370** passed (up from 364), budget PASS, contrast PASS (32 pairs), E2E 276 passed and 30 skipped.
- **Repeat runs** at phone-small, tablet and laptop, no retries:
  - Implementer's changed specs (`navigation`, `polish`) ×3: **180 passed**, 45 skipped, 0 failed.
  - Timing-sensitive specs (`navigation`, `route-focus`, `loading`) ×20: **1500 passed**, 120 skipped, 0 failed, 0 flaky.
  - QA specs (round-1 AC1–AC10, isolation, AC11) ×3: **234 passed**, 9 skipped (AC8 runs only at its own widths), 0 failed.
  - QA timing checks (AC1, the 50 ms case, keyboard, AC11 a/b/c) ×20: **480 passed**, 0 failed. The line and status first appeared 170–224 ms after the click.
- **Cross-tab exploratory sequences**, run again at laptop: 12 passed. These were:
  - Back after a cross-tab sign-out.
  - A frozen background tab.
  - A slow session read.
  - A Retry whose chunk keeps failing (one load, then the couldn't-load page).
  - A second navigation while a slow one is pending.
  - `/login?next` while a student signs in elsewhere.
  - Sign-out and sign-in from the same tab, with no requests afterwards (no loop).
  - Logout while the whole device is offline, which completes on reconnect.

  The one failure is E4, a known problem in my own script (it clicks an "Eng-LMS" link that `/forbidden` doesn't have). Its product behaviour was correct: the tab went to `/forbidden` on reconnect.
- **Isolation:** unchanged from round 1. No `SECRET-*` markers in student responses, and student calls to `/tutor/**` get 403 `forbidden-role` with no data.

## Findings
| ID | Sev | Status |
|---|---|---|
| F-1 | S4 | **Fixed** at `5ed3f4d` (AC11 (a)). Re-test passed at 3 widths in vi and en, ×20 at three viewports. |

No new findings in round 2. O-1 and O-2 stay with T-M2.13 and O-3 stays accepted, as DEC-118 decided.

## Accessibility summary
- The new h1 values become the document title. Focus still lands on the h1 of the error pages, and Tab goes to Retry, then to the start link.
- The Retry announcement region is unchanged. The progress line is still `aria-hidden` and not focusable.
- axe was clean in every state.

I did not check Firefox or WebKit, a real screen reader, or a true back/forward-cache restore: headless Chromium never restored the page from cache here, so AC11 (f) rests on its unit test plus the safe full-reload path. The round-2 logs and screenshots were lost when `/tmp` was cleared; the results above are from the outputs seen in this session.

## Round 1 (head `57ce8df`)


# QA Report: T-M2.12 Navigation feedback and cross-tab session
Verdict: **PASS WITH MINOR** (one S4; no S1, S2 or SCOPE findings) · Build: `57ce8df` on `feature/T-M2.12-nav-feedback-cross-tab` (PR #90) · Date: 2026-10-14 · Evaluator: an independent QA subagent with a fresh context

## Environment
- I tested the packaged jar (SPA included, built from this head) on its own ports, :8090 and :8091, against the dev PostgreSQL. That left :8080 free for the two `gate.sh` runs. The Vite dev server ran only for the `/dev/ui` check.
- Browser: Chromium, using QA's pinned Playwright 1.63 and axe 4.13. **Firefox and WebKit were not run** because this device lacks their host libraries. I did not try sudo.
- I created test students through the tutor API in the dev DB, some "ready" (password already changed) and some still required to change their password. I also seeded `SECRET-*` markers: a learning profile and a guardian for student A.
- I wrote the plan and verdict before reading any implementation code or tests. Afterwards I read only `RouteError.tsx` and the test names in `sessionSync.test.tsx` and `client.test.ts`, to confirm F-1 and the AC4, AC5 and AC7 coverage.
- Your rules said not to commit and not to leave files in the repo, so `evidence/T-M2.12/qa/report.md` was **not written** and there is **no PR comment**. This message is the report. The working tree is clean, `evidence/T-M2.12` was restored, and the QA app, Vite and the temporary proxy are all stopped.

## AC results
| AC | Scenarios | Viewports | Result | Evidence |
|---|---|---|---|---|
| AC1 | `/forbidden` → home link with the shell chunk delayed 1.5 s, in vi and en. "Loading the page" / "Đang tải trang" and the line first appeared 171–252 ms after the click, across 60 timed runs. The old h1 stayed, focus stayed on the link, then focus moved to the new h1 and the line and status cleared. A fast redirect navigation (×5 per run) and a 50 ms chunk delay showed nothing. With reduced motion the line is full width with no running animation. No layout shift (CLS 0) and no horizontal scroll while it animates. Also seen on the student shell → `/change-password` and on sign-in from `/login`. | 360/768/1280 | PASS | `shots/*-ac1-line-{en,vi}.png`, `*-ac1-reduced-motion.png` |
| AC2 | Student and tutor, offline, `/forbidden` → shell chunk never loaded. The offline copy, the Retry button ("Try again" / "Thử lại") and "Go to the start page" appeared within 53–88 ms; no busy state was left; focus is on the h1. An aborted chunk while online shows the "couldn't load" copy. vi and en text is exact and no English leaks into vi. | 360/768/1280 | PASS | `*-ac2-offline-{en,vi}.png`, `*-ac2-chunk-{en,vi}.png` |
| AC3 | Retry pressed 5 times while offline: zero requests and no reload (an in-page marker survived), and the hidden `<output>` gets the offline message again. Offline/online flapping ×3 and the `online` event caused no automatic reload. After going online, Retry does a full reload (navigation type `reload`), lands on `/student/home` and keeps the chosen language. Retry by keyboard (Enter) works. If the chunk still fails, Retry reloads once and shows the error again, with no loop. | 360/768/1280 | PASS | QA spec log, E6 |
| AC4 | Cannot be tested from the outside: no M2 shell screen calls a tutor-only API, so the app never receives a 403 `FORBIDDEN_ROLE` through its own client. A student calling `/tutor/**` does get 403 `forbidden-role` problems with no data leak. After my draft verdict I confirmed unit tests cover: changed role or anonymous, unchanged session, three concurrent 403s causing one session read, and no logout. Gate web tests: 364/364. | n/a | PASS (unit tests) | `sessionSync.test.tsx`, `client.test.ts` |
| AC5 | Two pages on `/tutor/today`; B logs out and A goes to `/login?next=%2Ftutor%2Ftoday` with no action from me (only GET session and GET meta, no POSTs). Back shows no tutor content. The cache content is covered by a unit test. | 360/768/1280 | PASS | `*-ac5-after-back.png` |
| AC6 | (a) A on `/login`, B signs in as tutor: A goes to `/tutor/today`. (b) A on `/tutor/today`, B logs out and signs in as a student: A goes `/login?next…` → `/student/home`, and a MutationObserver found no tutor text after the student's sign-in. Back from there lands on `/forbidden`, still with no tutor content. (c) A on `/login`, B signs in a user who must change the password: A goes to `/change-password`, B's session stays 200 and B completes the change. Three tabs: tutor → student → tutor switches all settle correctly. | 360/768/1280 | PASS | `*-ac6b-a-final.png`, `*-ac6c-a.png` |
| AC7 | A listener on `englms-auth` in another page saw exactly `{type:'signed-in'}` for a sign-in and exactly `{type:'signed-out'}` for a logout. None of the 60 messages I injected caused a reply from any tab, so there is no ping-pong. Malformed messages (`'signed-out'`, wrong case, unknown type, null, 42, [], array type, `kind`, and an extra `userId` field) caused no requests. A fake `signed-out` while the session is valid: one session read, the tab stays, no logout. Code check after the draft: the only new `location.reload()` is the chunk Retry (the generic Reload already existed). | 360/768/1280 | PASS | QA spec log |
| AC8 | `/api/v1/meta` returning 500: the gap between Retry and the icon is 8.0 px (within the 8 px limit), the icon's `title` is the `meta.error` text, Retry's `aria-describedby` points to that text, and `role=alert` is there. Checked for the tutor at 360 and the student at 360 and 768. | 360, 768 | PASS | `*-ac8-{tutor,student}.png` |
| AC9 | axe (WCAG 2/2.1/2.2 A and AA) found **0 violations** with the line showing and on the offline and chunk pages, in vi and en at all three widths. The line sits under `aria-hidden` and is not focusable. The `/dev/ui` "Đang tải" section has a "show progress line" demo, is static with reduced motion, and passes axe. | 360/768/1280 | PASS | `*-devui-loading-*.png` |
| AC10 | `gate.sh` passed twice in a row on `57ce8df`, same dev DB (585 s and 586 s). Each run: backend 466/0, web 364, budget PASS, contrast PASS (32 pairs), E2E 276 passed and 30 skipped. | n/a | PASS | scratch `gate1.log`, `gate2.log` |

## Findings
| ID | Sev | Summary | Steps | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| F-1 | S4 | The offline copy does not update when the connection comes back | 1. Student on `/forbidden`, go offline, click "Về trang chính của bạn". 2. The offline chunk page shows. 3. Go back online and wait 3 s. | The copy follows the connection (or at least stops saying you are offline). | `navigator.onLine` is true, but the page still says "Bạn đang ngoại tuyến…" until Retry is pressed. Retry then reloads correctly. The text is computed once at render and nothing listens for the `online` event. The packet does not require the copy to update live, so this is polish only. | `shots/laptop-reconnected-offline-copy.png` |

No SCOPE findings: everything I saw traces to scope items 1–7.

## Repeat-run results (no retries)
- QA spec plus the isolation spec, ×3 at phone-small, tablet and laptop: **162 passed**, 9 skipped (AC8 runs only at its own widths), 0 failed.
- QA timing checks (AC1, the 50 ms case, keyboard), ×20 at the three viewports: **360/360 passed**.
- Implementer's changed specs (`navigation`, `polish`, `auth`), ×3 at the three viewports: **378 passed**, 45 skipped, 0 failed.
- Implementer's timing-sensitive specs (`navigation`, `route-focus`, `loading`), ×20 at the three viewports: **1500 passed**, 120 skipped, 0 failed, 0 flaky.

## Accessibility summary
- axe: 0 violations in every state tested.
- The status region is one polite `<output>` in `RootLayout` and is empty when idle.
- The line is `aria-hidden` and not focusable.
- On the error page, focus starts on the h1; Tab goes to Retry, then to the start link. Both have a visible 2 px solid outline. Space or Enter on Retry while offline keeps focus on Retry.
- I did not test with a real screen reader. Re-announcement relies on a keyed `<output>` span.

## Isolation and privacy
- I signed in as a tutor, then student A, then student B in shared tabs, with A's profile and guardian holding `SECRET-*` markers. No `SECRET-*` appeared in any student-tab API response, and A's username did not appear in the tab after B signed in.
- The last session response in the follower tab belonged to B.
- A student calling `/tutor/students[/{id}[/learning-profile]]` gets 403 `forbidden-role` with no body data.
- A student visiting `/tutor/*` lands on `/forbidden`.
- Channel messages carry only `{type}`.

## Exploratory notes (90 min charter: stale user data, loops, logging out a fresh session)
I found no sequence that shows a previous user's data once the tab is online, loops, or ends a fresh session. Sequences tried:
- **Background tab:** a frozen tab (CDP lifecycle state `frozen`) missed a logout and a student sign-in, then after resuming went to `/student/home`.
- **Back after a full navigation (bfcache-style):** returning to the tutor page after leaving it with a full page load showed no tutor content.
- **Slow session read in the follower tab** (2.5 s delay while B logs out and a student signs in): the tab ended on `/forbidden`, and B's session stayed valid.
- **Logout then sign-in from the same tab:** the follower followed, with zero requests in the following 3 s.
- **`/login?next=/tutor/today` while a student signs in elsewhere:** the tab goes to `/student/home`; `next` is not honoured, as designed.
- **A tab sitting on `/forbidden` across user switches:** its "home" link and wording follow the current session (tutor, anonymous, student).
- **Must-change user:** completing the change in the follower tab works. Visiting `/login` afresh with a must-change session logs it out and broadcasts; that is the documented behaviour.
- **One tab offline on its own** (CDP, while another tab logs out and a student signs in): that tab keeps the tutor shell while offline. Its session read waits for the connection and it lands on `/forbidden` within about 2 s of reconnecting. This needs one tab offline while another is online, which doesn't happen on a real device, so I am not filing it.
- **Message flood** (50 valid messages): 50 sequential session reads, then the tab stays put with no loop and no logout. Messages are not coalesced, but only a same-origin page could send them. Not filed.

Two things outside this task's scope, likely existing logout behaviour from T-M2.4, for the LC to consider for the backlog:
- Logging out while the whole device is offline shows an endless spinner with no offline message. It finishes and other tabs follow once back online.
- A logout that fails with a 500 leaves the tab on `/tutor/today` with no alert. The session is correctly still valid and the other tab correctly stays.

## Files
All in the scratchpad `<qa-scratch>/`; nothing in the repo.
- Plan: `qa/plans/T-M2.12.md`
- Specs: `qa/e2e/T-M2.12.spec.ts`, `qa/e2e/iso.spec.ts`, `qa/e2e/explore2.spec.ts`, `qa/e2e/explore3.spec.ts`
- Screenshots: `shots/`
- Logs: `gate1.log`, `gate2.log`, `impl-x3.log`, `impl-x20.log`, `qa-x3.log`, `qa-x20.log`

I did not check Firefox or WebKit (no host libraries), a real screen reader, or AC4 from the outside (no UI path in M2; unit tests only). To keep the QA spec on the `qa/T-M2.12` branch, someone needs to copy it from the scratchpad and switch it back to port 8080.
