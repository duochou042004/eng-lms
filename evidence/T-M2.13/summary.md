# T-M2.13 summary: auth and shell feedback follow-ups
Branch feature/T-M2.13-auth-shell-followups · code 0a01995 (+ 93cb41a gate log) · trace DEC-155, DEC-163, DEC-164, DEC-118, DEC-119.
PO start signal 2026-11-14T09:40:30Z (chat: "Start T-M2.13"). Recorded by the LC from the implementer's returned text (L-07).

## Gate (G1)
`ENGLMS_TASK=T-M2.13 ./scripts/gate.sh` on 0a01995: `gate: PASS (13 steps, 763s)`; web unit 69 files, 846 tests; e2e 381 passed, 60 skipped;
changed specs ×3 (`navigation.spec.ts`, `shells.spec.ts`) 525 passed; budget student 188.7 KB, tutor 188.9 KB; contract-drift pass;
`backend/` and `api/openapi.json` unchanged. Log: `evidence/T-M2.13/gate-20261114T100859Z.log`.

## AC → proof
- AC1 (toggletip): `ui/Toggletip.test.tsx` (name, `aria-haspopup`, `title`, axe; tap opens a dialog named by the message; Esc and outside tap return
  focus; 0×0 trigger box closes it and focus goes to Retry; an Esc close is not a hidden-trigger close). `shells.test.tsx` changed kept test (e) and
  open/close-on-navigation. E2E `navigation.spec.ts` "T-M2.13 AC1 …" at phone-small (tutor, student) and tablet (student) with `tap()`: ≥ 44×44,
  Retry described, `expectSettledAccessible` + `expectNoMidWordBreak` while open, inside the gutters, vi and en, widening closes with focus on Retry
  (`expectFocusNotLost`), then not a Tab stop. Changed kept AC8 (e): trigger by name; `title` and ≤ 8 px gap still asserted.
- AC2 (cross-tab notice): `sessionSync.test.tsx` "cross-tab sign-out: the /login notice" (from `/tutor/today`, `/tutor/students?q=an`,
  `/student/home`, forced `/change-password`; D-1: a 401 in flight + a mounted 401 query during a slow read → one navigation with the notice; every
  no-notice case; status between h1 and form, focus on h1). Kept AC5 unit test unchanged. `LoginPage.test.tsx` (vi/en + axe; hidden on submit;
  direct visit none). E2E: kept AC5 extended with the vi notice; new "[en] …" at three projects; "/tutor/students … one navigation" at laptop vi.
  Mutation: removing the 401 stand-down fails the D-1 unit test.
- AC3 (offline logout): `shells.test.tsx` "offline: … not paused" (status error, isPaused false, offline copy; seen failing without
  `networkMode`). E2E `shells.spec.ts` "T-M2.13 … offline" at phone-small (drawer) and laptop (popover), fresh sign-in: not busy within 1 s, alert in
  the section, URL unchanged, nothing on the channel, focus kept; back online signs out. Student More sheet by component test (G0 D-3).
- AC4 (500 logout): changed kept tests (a) `guards.test.tsx`, (b) `sessionSync.test.tsx`, (c) `sessionBoundaries.test.tsx`; `shells.test.tsx` per
  overlay (popover 1024, tutor drawer 360, student More sheet 360); `ChangePasswordPage.test.tsx`; E2E "a 500 …" at laptop vi.
- AC5 (chunk copy): changed kept tests (d) `RouteError.test.tsx` and `navigation.spec.ts` `COPY`; offline Retry announces `error.offlineAnnouncement`.
- AC6: `steps-logout-*` ≤ 2 steps; axe after each new state; `expectNoMidWordBreak` at 360 vi on each new text (the logout alert's title and text
  measured separately); all new keys in vi and en.
- AC7: gate PASS above; CI pending (after push).

## Self-check (frontend-standards)
[x] UI rules block [x] axe + mid-word checks per changed screen where the state exists (the toggletip exists only under 22rem, so no 1280 case)
[x] `expectFocusNotLost` after a failed Log out and the frame change [x] polling reads; each new check seen failing [x] vi verbs as given; no
heading/counter change [x] docs in sync.

## Docs changed
functional-requirements FR-AUTH-04 AC; frontend-architecture §2; security.md T19; design-system §3 (`Toggletip`); interaction-states §1;
ux-flows Log out. Backlog done note: at merge (LC).

## Deviations and LC rulings
1. **Environment (PO action):** `e2e/` Playwright 1.65.0 (the PO's Dependabot merge) expects headless Chromium build 1254; only 1248 is installed.
   The implementer ran the e2e and the gate through a temporary symlink 1254 → 1248 (Chromium 156.0.8078.4) and removed it afterwards (LC verified:
   only `chromium_headless_shell-1248` remains). Installing the browser is a download: the PO runs `pnpm --dir e2e browsers` before the next
   local E2E or gate. CI installs its own browsers, so CI is the authority on 1.65's build.
2. **Fixture fixes outside the contradiction scan (LC: accepted, not a weakened test):** `StudentAccount.test.tsx` "own Log out leaves no toast"
   and `StudentProfileEdit.test.tsx` "own Log out and another tab's sign-out pass a dirty form" never mocked `POST /auth/logout` and passed only
   because a failed call used to sign out. Each gains a 204 logout handler; every assertion is unchanged (LC read the diff).
3. `Toggletip` sets `title` through an effect (React Aria `Button` drops the prop), so the trigger's accessible description is the message: for
   the G3 screen-reader walk.
4. The AC2 laptop E2E saw no 401 during the follow (the new order clears without a reset); the 401 case is proved by the unit test.
5. No L-10 OQ; no flaky test seen.

## Screenshots (local, git-ignored)
`evidence/T-M2.13/impl/<phone-small|tablet|laptop>/`: toggletip open (vi, en), cross-tab notice, logout failure (offline drawer/popover, 500
popover), chunk pages (vi, en). Not shot: the student More-sheet failure and the tablet drawer failure (component tests only).

## LC notes
- Implementer: `frontend-implementer`, 270,308 tokens, 2,507.8 s (41.8 min), 132 tool uses; one gate run (763 s).

## G3 cost (DEC-131 (9))
| Round | Reviewer | Head | Verdict | S1/S2/S3/S4 | Scope | Agent tokens | Agent min | Gate runs | Gate min |
|---|---|---|---|---|---|---|---|---|---|
