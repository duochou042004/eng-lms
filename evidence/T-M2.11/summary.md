# T-M2.11 App shells: implementation evidence

(Recorded by the LC from the frontend-implementer's returned text; the agent could not write this file.)

Branch `feature/T-M2.11-app-shells`. Commits: `d02b5fd` (ui), `6da76f0` (shells), `67e1097` (E2E), `b9154e8` (docs, progress), `1c9f2a7`
(evidence). Both gate runs ran on `b9154e8`, one after the other, against the same dev database (signed in as `e2e-tutor` from `.data/e2e/`).

## Commands
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd web && pnpm install --frozen-lockfile && pnpm lint && pnpm typecheck && pnpm test --run && pnpm build && pnpm budget)
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop
ENGLMS_TASK=T-M2.11 ./scripts/gate.sh && ENGLMS_TASK=T-M2.11 ./scripts/gate.sh
```
The `/dev/ui` screenshots need the development build: the packaged jar on :8080 plus `pnpm dev` on :5173, then
`E2E_BASE_URL=http://localhost:5173 pnpm exec playwright test tests/shells.spec.ts -g "dev/ui"`. The `polish.spec.ts` dev cases also passed
there (9). `e2e-run.sh` always targets :8080, so these dev-only tests are skipped in the gate.

## Gates
| Run | Log | Result |
|---|---|---|
| 1 | `gate-20261012T035449Z.log` | PASS (13 steps, 572 s) |
| 2 | `gate-20261012T040430Z.log` | PASS (13 steps, 570 s) |

- Backend: 466 tests. Web: 31 test files, 320 tests; lint, typecheck and build pass.
- Budget: student 173.4 KB gz (limit 200; was 155.7), tutor 173.4 KB gz (limit 300). The growth is React Aria's modal and popover code. A new
  check fails if the tutor shell is in the student's first-visit chunks.
- Contrast: PASS (32 pairs). E2E (phone-small, tablet, laptop): 216 passed, 24 skipped per run (dev-server-only cases and laptop-only guard
  self-tests, as before).

## AC status
| AC | Proof |
|---|---|
| AC1 | `shells.test.tsx` "AC1" (incl. the guard running before the index redirect); E2E `shells.spec.ts` "AC1/AC2/AC3" |
| AC2 | E2E "AC1/AC2/AC3" and "account section in its tutor place"; `shells.test.tsx` "AC2"; `Sheet.test.tsx`, `NavList.test.tsx` |
| AC3 | E2E: tabs ≥ 44 px, safe-area rule, content clear of the tab bar, More sheet; `shells.test.tsx` "AC3"; `BottomTabs.test.tsx` |
| AC4 | E2E: Change password and Log out have identical computed styles; Change password then Cancel returns; Log out in 2 steps at 360/768/1280; `shells.test.tsx` "AC4" |
| AC5 | E2E: name once in the shell and on the public pages, loading and error states, Retry outside the home link, session before meta on `/login`; `shells.test.tsx` "AC5" |
| AC6 | `app.test.tsx`, `shells.test.tsx` (vi and en) |
| AC7 | E2E: one-row top bars in vi and en, 60-character name truncates with a `title`, no horizontal scroll at 320–1280 px with overlays closed and open |
| AC8 | `loading.spec.ts`: CLS ≤ 0.0051, skeleton end-control deltas 0 px; `RouteLoading.test.tsx` per breakpoint |
| AC9 | axe with every overlay open at three viewports, keyboard path to Log out, focus on the `h1` after nav items, no slide animation with reduced motion |
| AC10 | Both gates; budgets; `ShellLayout` and the unused `auth:header.changePassword` key removed |

## Measurements (`records/`)
- Log out: 2 steps for both roles at all three viewports, from the home page and from a 404 page (`steps-logout-*`).
- Language: 1 step on `/login`, 2 steps on `/tutor` and `/student` (`steps-switch-language`, DEC-112 (5)).
- First-load CLS: tutor 0.0001–0.0014, student 0.0002–0.001, login 0–0.0051.
- End-control skeleton vs the real control: 0 px width and end deltas (menu button: tutor < 1024 px; account button: tutor ≥ 1024 px, student
  ≥ 768 px; none: student < 768 px).
- A 60-character name truncates at 360 px for both roles. Reduced motion: no `slide-*` animation starts.

## Deviations from the packet (for the LC and reviewers)
1. Retargeted inputs beyond scope 11: the shell 404 made `/tutor/students` and `/student/x` 404 pages, so `auth.spec.ts` AC1/AC2 use
   `/tutor/today` (expected URLs change with it) and the `smoke.spec.ts` deep link uses `/student/home`; `smoke.spec.ts` presses Esc to close
   the modal account section before reading the page. Other assertions unchanged.
2. Unit tests adjusted: the T-M2.4 header-control test in `RouteLoading.test.tsx` is replaced by a per-breakpoint frame test;
   `LoginPage.test.tsx` expects `GET /api/v1/meta` after the logout; `guards.test.tsx` expects `next=%2Ftutor%2Ftoday` (`/tutor` redirects).
3. Additions: `ButtonLink` in `ui/` (Change password stays a link styled like Log out); `NavList`, `BottomTabs`, `ButtonLink` import React
   Router; route focus also moves on a navigation to the page already shown; overlays close on every navigation.
4. Bug found in own change: parent and child loaders run in parallel, so the index redirect beat the role guard (anonymous `/student` →
   `next=%2Fstudent%2Fhome`); the index loader now awaits the guard (`router.tsx`); the guard functions are unchanged; a unit test covers it.

## Known limitations
- Today and Home keep their placeholder titles ("Không gian gia sư", "Trang của học viên") while the nav items read "Hôm nay" / "Trang chủ"
  (the real pages come with T-M2.7 / M6).
- The drawer slides from the left only (LTR; `shortcut:` comment). No manual screen-reader pass. The dev workspace is named "Eng-LMS"; the
  long-name case is mocked.

## Screenshots (`impl/<project>/`)
Tutor: `tutor-default-vi`, `tutor-404-vi`, `tutor-long-name-en`, `tutor-drawer-open-vi` (360, 768), `tutor-account-open-vi` (1280),
`tutor-workspace-name-loading-vi`, `tutor-workspace-name-error-vi`. Student: `student-default-vi`, `student-404-vi`, `student-long-name-en`,
`student-more-open-vi` (360), `student-account-open-vi` (768, 1280). Public: `login-workspace-name-vi`, `login-workspace-name-error-vi`, the
T-M2.4 set re-shot. `/dev/ui`: `devui-entries-vi`, `devui-sheet-start-open-vi`, `devui-sheet-bottom-open-vi`, `devui-popover-open-vi`.

## Accessibility
axe clean on every changed route and state at three viewports; the skip link is the first Tab stop; the drawer, sheet and popover trap focus,
close with Esc and return focus; route focus lands on the `h1` after nav items, the home link and Back; one `header`, one `main`, one
labelled `nav` per shell.

## Round 2 fixes (G3 round 1, AC11, DEC-114)

(Recorded by the LC from the implementer's returned text.)

Commits: `f12116b` (fixes and unit tests), `879ba96` (E2E), `f05384a` (docs), `2ec015e` (evidence, progress). Both gate runs ran on `f05384a`,
one after the other, against the same dev database.

| Run | Log | Result |
|---|---|---|
| 1 | `gate-20261012T081104Z.log` | PASS (13 steps, 494 s) |
| 2 | `gate-20261012T081927Z.log` | PASS (13 steps, 490 s) |

Web: 31 test files, 328 tests (was 320). Budget: student and tutor 173.8 KB gz. E2E (phone-small, tablet, laptop): 228 passed, 24 skipped per run.

| Item | Fix | Proof |
|---|---|---|
| (a) UX-1 / F-1, F-4, F-2 public | Public toolbar below 480 px: a fixed two-line identity row (name or error wraps to ≤ 2 lines, with `title`), then the end-aligned switcher row; same in `RouteLoading`; one row at ≥ 480 px; the 12rem `:has` rule is removed | E2E `shells.spec.ts` "AC11 (a)" at 320 and 360 px: 59 of 60 characters visible; `h1` top 155.6 px in loading, loaded and error; CLS ≤ 0.005; skeleton line 2 px from the heading (`records/*/ac11a-*`) |
| (b) UX-2 | Today/Home `h1` and document title = "Hôm nay"/"Today", "Trang chủ"/"Home" | Title assertions updated in unit tests and E2E specs |
| (c) UX-3 / F-2 shell | Container query on the error alert (`workspace-error`, under 22rem, not ~16rem on the identity: at 360 px the identity is 17rem): icon and Retry; the message is visually hidden inside the alert and describes Retry | `shells.test.tsx` "AC11 (c)"; screenshot `tutor-workspace-name-error-vi` |
| (d) UX-4 / F-3 | The shell skeleton sits in the full-height `.shell` frame | `RouteLoading.test.tsx`; `loading.spec.ts`: sidebar skeleton bottom = viewport height |
| (e) UX-5 | `.dialog:focus-visible` ring inset by the ring width, following the panel's corners (`Sheet`, `Popover`) | CSS; Sheet and Popover tests and axe pass |
| (f) UX-6 | `useFrameFocus`: a frame change across `md`/`lg` with focus on `body` focuses the new frame's trigger | `shells.test.tsx` "AC11 (f)": 4 directions plus a leave-alone case; they fail without the hook |
| (g) UX-7 | The shell 404 link reads "Về Hôm nay"/"Back to Today", "Về Trang chủ"/"Back to Home"; the top-level 404 is unchanged | `shells.test.tsx` (vi, en); `shells.spec.ts` |
| (h) UX-8 | `shell:home` removed (vi, en) | i18n completeness test |

New screenshots (`impl/<project>/`): `login-{320,360}-{name-loading,long-name,name-error,route-loading}-vi`; all other impl screenshots re-shot
with the new titles and states. Docs: IA §4 (public frame rows), responsive-standards §3 items 5 and 8, design-system §3 (dialog ring).

## Round 3 fixes (QA round 2, AC11 (i), (j), DEC-114)

(Recorded by the LC from the implementer's returned text.)

Commits: `7505a03` (fix and unit tests), `846ccff` (E2E), `71086f4` (docs), `16e6d70` (evidence, progress). Both gate runs ran on `71086f4`,
one after the other, against the same dev database.

| Run | Log | Result |
|---|---|---|
| 1 | `gate-20261012T095504Z.log` | PASS (13 steps, 525 s) |
| 2 | `gate-20261012T100349Z.log` | PASS (13 steps, 528 s) |

Each run: 330 web tests in 31 files; E2E 240 passed, 24 skipped.

| Item | Fix | Proof |
|---|---|---|
| (i) N-1 | `useOverlay(frame)` resets its open state when the shell frame changes, so the drawer or More sheet does not come back open | `shells.test.tsx` "AC11 (i)": tutor 768 → 1280 → 768 and student 360 → 800 → 360; afterwards no dialog open, `aria-expanded="false"`, focus on the trigger; both fail without the fix |
| (j) N-2 | Public frame two rows below 768 px (`md`), one row at ≥ 768 px, in `PublicPage` and `RouteLoading` | E2E "AC11 (a), (j)" at 320, 360, 568 and 740 px: 59–60 of 60 characters visible; `h1` top 155.6 px in loading, loaded and error; CLS ≤ 0.005; skeleton line 2 px from the heading (`records/*/ac11a-*`); one row at ≥ 768 px |

New screenshots in `impl/<project>/`: `login-{568,740}-{name-loading,long-name,name-error,route-loading}-vi`; 320 and 360 px re-shot. Docs: IA
§4 and responsive-standards §3 item 8 (768 px).
