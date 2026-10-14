# T-M2.12 implementation summary (recorded by the LC from the frontend-implementer's report)

- **Commits:** `360dec5` ui (`ProgressLine`, shared `useDelayed`), `4bd1067` progress line and chunk-error page, `0a47ac3` 403 `FORBIDDEN_ROLE` refetch and cross-tab channel, `07a2fbf` UX-9, `8435aa5` E2E `navigation.spec.ts`, `09e5f18` docs, `cfe5780` T-M1.13 AC4 E2E locator (Reload → Retry on a failed chunk), `0e47789` evidence and progress.
- **Gates:** `gate-20261014T050444Z.log` FAIL on `09e5f18` (T-M1.13 AC4 expected the old Reload on an aborted chunk; fixed in `cfe5780`, locator only); `gate-20261014T051540Z.log` PASS and `gate-20261014T052536Z.log` PASS, both on `cfe5780`, same dev database. Contrast PASS (32 pairs).
- **Tests:** web 364 in 34 files (was 330 in 31); backend 466 unchanged; E2E 276 passed / 30 skipped per run (phone-small, tablet, laptop); `/dev/ui` E2E 6 passed (dev server). Budget: student 174.7 KB, tutor 174.8 KB gz.
- **AC proof:**
  - AC1: `RootLayout.test.tsx` (fake timers: nothing at 149 ms, line + status at 150 ms, nothing for a 100 ms navigation); E2E vi/en at three viewports (line at 158.8–171.2 ms, focus stays on the link, reduced motion static).
  - AC2, AC3: E2E offline and aborted, vi/en; Retry offline sends no request; online reloads in full, language kept. `RouteError.test.tsx`: `reload()` only, never `assign`/`replace`/`href`, also for `//evil.example/x`.
  - AC4: `sessionSync.test.tsx` "403 FORBIDDEN_ROLE", `client.test.ts`.
  - AC5, AC6: E2E two pages in one context; `sessionSync.test.tsx` receiver (cache ends as exactly `['auth','session']` = null).
  - AC7: `sessionSync.test.tsx` exact posted objects, malformed ignored, no ping-pong, no logout on revalidation; code search: the chunk Retry is the only new full-page load.
  - AC8: E2E gap 8 px at tutor 360, student 360 and 768; icon `title`; `shells.test.tsx`.
  - AC9: axe in E2E and unit tests; `ProgressLine.test.tsx`; `/dev/ui` entry.
- **Changes to existing tests (assertions kept):** (1) the root layout's status region means the "password changed" status checks look inside `main` (`ChangePasswordPage.test.tsx`, 3 lines of `auth.spec.ts`); (2) `polish.spec.ts` T-M1.13 AC4 presses Retry (the generic Reload stays covered by the `/` case); (3) `client.test.ts` uses `CSRF_INVALID` as the unreported 403 and asserts `FORBIDDEN_ROLE` is reported; (4) AC5's cache content is proved by a unit test (E2E proves URL, no shell, Back). A fake `BroadcastChannel` (`web/src/test/broadcast.ts`) isolates unit tests.
- **Implementer decisions:** the chunk/offline pages keep the generic error title with the packet's sentences as the description; the 403 and cross-tab reactions run serially so a redirect into `/login` cannot overlap a session read.
- **Not done:** Firefox/WebKit not run (Chromium only); an offline route error is caught by the offline check regardless of the engine's error text.
- Screenshots: `impl/<phone-small|tablet|laptop>/`; measurements: `records/`.

## Round 2: AC11 (a)–(f) (G3 round 1 fixes, DEC-118)
- **Gates:** `gate-20261014T064210Z.log` PASS and `gate-20261014T065157Z.log` PASS on `c4c9e02` (13 steps; backend 466, web 370 in 34 files, E2E 276 passed / 30 skipped; budget student 174.8 KB, tutor 174.9 KB gz). Unit suite ×3 more: green.
- (a) `RouteError` follows `online`/`offline` (unit + E2E `chunk-back-online-{vi,en}`); (b) own `h1` and title "Bạn đang ngoại tuyến" / "You're offline", "Không tải được trang này" / "This page couldn't load" (unit + E2E; `polish.spec.ts` T-M1.13 AC4 heading updated); (c) Retry and generic Reload primary (unit + E2E); (d) `--motion-duration-progress: 1.2s` (`ProgressLine.test.tsx`); (e) `resetQueries` for mounted queries on a user/role change, shared by the 403, channel and `pageshow` paths; student A → B test with a mounted query (fails with `removeQueries`); (f) `pageshow` `persisted` resync (unit tests); T19, frontend-architecture §2/§3, design-system, interaction-states updated.
- Flaky-test fix: `tutorTab` helper waits for the workspace name before recording requests (no assertion changed).
