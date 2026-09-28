# QA plan T-M1.9 (written before reading the diff / implementer tests)
Env: scratch clone of 92e213b under qa19/repo; packaged jar on :8090/:8091 (to avoid colliding with UX reviewer), Vite dev on :5190 for /dev/ui.
QA Playwright (qa/ toolchain, copied into scratch) projects phone-small/tablet/laptop.

AC1 route focus/titles: fresh load / , /tutor, /student, /nope -> activeElement=body, title correct (vi,en); Tab#1 on shells = skip link; on landing/404 first Tab inside main.
  Client nav landing->tutor, landing->student, any->404 (link from landing? if none, history.pushState + popstate), back -> activeElement is h1, title "<h1> · Eng-LMS".
  Reload of /tutor after client nav -> body. Language switch -> title updates, focus not stolen (stays on switcher). Negative: hash change no focus move.
  Failed lazy load (block the chunk) -> error page, focus behaviour, title.
AC2 SegmentedControl in /dev/ui vi+en: roles radiogroup/radio aria-checked, group name, check icon only on selected, 44px, keyboard arrows/space, disabled segment, axe.
AC3 Switcher on landing + both shells: pointer + keyboard switch changes strings + html lang, persists reload (localStorage), endonyms lang attr.
AC4 throttle: delay /api/v1/meta and lazy chunk; skeleton not visible <150ms, visible after; aria-busy+label from 0; CLS via PerformanceObserver on /, /tutor, /student.
AC5 /dev/ui field error: icon aria-hidden before text, describedby text unchanged; run contrast script; axe.
AC6 boundingBox >=44 skip link, home link, 404 link @3 viewports; RouteLoading header-shaped on shell paths; error copy variant with/without request id (inject 500 on meta?).
AC7 pnpm build in scratch; grep dist for dev strings (vi+en, collect from web/src/i18n dev catalogue), manifest no /dev/ui. pnpm dev shows translated /dev/ui.
AC8 scratch copy: add fixtures window.fetch/globalThis.fetch/self.fetch in src/features -> pnpm lint fails; same in src/lib/api passes; bare fetch + RAC import still fail. Probe variants (window['fetch'], const {fetch}=window) as exploratory.
AC9 scratch copy of e2e: add late console.error 300ms spec without test.fail -> must fail; with test.fail passes; run implementer guards.spec in laptop; measure settle.
AC10 run gate.sh? (heavy; re-run web lint/typecheck/test/build/budget + e2e suite in scratch); check screenshots exist; docs updated; CI status via gh (read-only).
Always: isolation (no student data yet in M1 -> check /api/v1/student/** 404/401, SECRET- scan of all responses), keyboard only, 360/768/1280, loading/error/offline states, vi/en no missing keys, scope, no exam semantics grep.
Exploratory (45 min): focus jumps on language change / initial load / failed lazy load; title stuck in other language; StrictMode double-focus; back after 404; rapid navigation.
