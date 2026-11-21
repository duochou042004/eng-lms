# T-M2.6: Account preferences and Settings › Account (FR-SET-02)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft |
| Owner role | BE (endpoint) then FE (pages, switcher, `ui/ComboBox`, time helpers); one implementer at a time |
| Branch | `feature/T-M2.6-account-preferences` (from `develop`) |
| Depends on | T-M2.4, T-M2.11 (merged); T-M2.34 (merged, `c5ae729`) |
| Estimate | ≤ 2 agent-days (BE ≤ 0.5, FE ≤ 1.5) |
| Risk tier | **H**: a new endpoint in `identity` (quality-gates G3: identity, new endpoint) → **SEC** as its own agent, plus QA with the UX checklist in the same pass; the new shared `ui/ComboBox` is reviewed in that pass (the LC does not split UX out: one primitive, one use) |
| Trace | SPEC §4.3 (student: login, logout, change password), §41 (Settings in the IA); FR-SET-02; api-catalog `PATCH /auth/preferences` (M2); information-architecture §1 (`/tutor/settings/*`), §5 routes; DEC-112 (shell items only for routes that exist); DEC-113 (switcher placement); DEC-187 (PO order); lessons L-03, L-04, L-10, L-12 (the time-zone shortcut); the `shortcut:` markers in `web/src/lib/time/index.ts:4` and `web/src/app/components/LanguageSwitcher.tsx:7` |

## Goal
A signed-in user's language and time zone are saved on their account, and the tutor can also set their display name, from a new
**Settings › Account** page in the tutor shell. Dates in the app are shown in the account's time zone instead of the browser's.

**Split (task-packet step 7, LC):** the backlog row "Settings v1" (FR-SET-01 + FR-SET-02) is over one PR's size once a searchable time-zone picker is
needed (no `ui/` select exists). This packet is FR-SET-02 for the tutor and the endpoint both roles use; the workspace part of FR-SET-01 (display name,
default time zone, default language: the `workspace_setting` store, `GET/PATCH /tutor/settings`, `/meta` from the store, defaults for new student
accounts, the Workspace tab) is the new backlog row **T-M2.35**, next in the PO order's T-M2.6 slot (before T-M2.32). The student's Account page
(`/student/account`, `GET /student/account`) stays in T-M2.7 and uses this packet's endpoint.

## Scope
- In (BE, `identity`):
  1. `PATCH /api/v1/auth/preferences`, audience A (any signed-in account; CSRF required; behind the must-change gate like every A endpoint except
     `/auth/password`, `/auth/session`, `/auth/logout`), body `{locale?, timeZone?, displayName?}`: absent = unchanged; at least one property, else 422
     `REQUIRED` on `locale` (the problem names the first field). Rules (validation-rules, new rows):
     - `locale`: one of `englms.meta.locales` (`vi`, `en`) → else `INVALID_VALUE`; `null` → `REQUIRED`.
     - `timeZone`: an ID in `java.time.ZoneId.getAvailableZoneIds()` (exact, case-sensitive; aliases such as `Asia/Saigon` accepted as given) → else
       `INVALID_VALUE`; `null` → `REQUIRED`.
     - `displayName` (tutor only): trimmed, 1–120 characters, no control character (the fullName rule) → `TOO_LONG` / `INVALID_FORMAT`; empty after
       trim or `null` clears it (the shell then shows the username). From a **student** account, a present `displayName` → 422 `INVALID_VALUE` on
       `displayName` (a student's name is the tutor's `fullName`, FR-STU-03).
     - Wrong JSON types → 400 `MALFORMED_REQUEST` as today (Jackson strictness of T-M2.10; scalar coercion is T-M2.33's).
  2. 200 with the **session body** (the `GET /auth/session` DTO, no new field), so the client replaces its session cache. No new DTO, no audit entry
     (FR-SET-03's security-log types do not include preferences), no event.
  3. Registered in the authorization matrix (both roles 200, anonymous 401, must-change 403 `PASSWORD_CHANGE_REQUIRED`, missing CSRF 403) and the
     student-isolation harness (no `studentId` parameter; the response secret scan); api-catalog row marked **Live**.
- In (FE):
  4. Tutor shell: a **Settings** item (`/tutor/settings`, icon `Settings`, current on every `/tutor/settings/*` page; DEC-112 list).
     `/tutor/settings` redirects to `/tutor/settings/account` (the only tab now; T-M2.35 adds Workspace and moves the redirect). A page header
     "Settings" with a tab list of the existing tabs (one tab: Account), so T-M2.35 only adds a tab.
  5. `/tutor/settings/account`: a form with **Display name** (`TextField`, the rule above), **Language** (`SegmentedControl` vi/en, like the
     switcher), **Time zone** (the new `ui/ComboBox`), and **Save**. Save sends only the changed properties; on 200 the session cache is replaced, the
     device language follows the saved `locale` (`changeLocale`), a success toast "Saved" / "Đã lưu"; 422 → field errors through `ErrorSummary` and the
     fields (interaction-states §3); other errors → the page's `InlineAlert` with retry (errors are never toasts). `UnsavedChangesGuard` on leave.
  6. `ui/ComboBox` (React Aria `ComboBox`, tokens, CSS Modules): label, description, error, a filtered list (contains, case- and accent-insensitive),
     virtualised or capped rendering so ~600 options stay smooth on a phone, keyboard per the WAI-ARIA combobox pattern; a story in `DevUiPage`, unit +
     axe tests. Time-zone options: `Intl.supportedValuesOf('timeZone')` plus the account's current value when it is missing from that list (an alias the
     engine does not list must still show and save unchanged).
  7. **The language switcher saves the account locale** (retires `LanguageSwitcher.tsx:7`'s shortcut): the device choice (`localStorage`
     `englms.locale`) stays the UI's source, as today; when a session exists and `mustChangePassword` is false, a switch also sends
     `PATCH /auth/preferences {locale}` (best effort: a failure leaves the device choice and shows nothing; the Account page shows the saved value). On a
     device **without** a stored choice, the session's `locale` is applied once the session loads (and stored). A stored choice is never overridden by
     the session (keeps the kept E2E that set `englms.locale` before signing in, Design notes).
  8. **Dates in the account's time zone** (retires `lib/time/index.ts:4`'s shortcut, L-12): `formatDate` / `formatDateTime` take a `timeZone` argument;
     their callers (`CredentialsCard`, `ProfileForm`, `StudentWorkspacePage`, `credentialsMessage`) pass the session's `timeZone`; without a session
     (none of today's callers) the browser's zone.
  9. vi + en strings for every new text; the `shell`/a new `settings` namespace; i18n completeness test.

## Out of scope (explicit)
- Workspace settings (FR-SET-01): **T-M2.35**. Attention thresholds, upload limits, embed providers, extensions, metrics: their milestones.
- The student Account page and `GET /student/account`: T-M2.7. Change password stays its own page (`/change-password`, T-M2.1); the Account page links
  to it, nothing more.
- A server-side use of the account locale (emails, notifications) or of the time zone (scheduling: M3); the security log (FR-SET-03, M8).
- A `version` on account preferences (Domain rules: last write wins per property, by design); a `user_account` migration (columns exist since
  `V202610040001`: `locale`, `time_zone`, `display_name`).
- Changing the login page, the anonymous switcher or the not-found page's language source.

## Guardrail answers (scope.md §6)
1. Trace: FR-SET-02, SPEC §41, api-catalog. 2. Drift toward excluded scope: no (no SaaS tenant settings, no profile pictures, no notifications).
3. Mandatory set-up: none (defaults exist; nothing must be filled in). 4. Weekly use: the language and dates on every page. 5. Hard-coded semantics: none.

## Design notes
- **BE placement:** `AuthController` gets the handler; `AccountService.updatePreferences(userId, PreferencesCommand)` in `internal.app`;
  `UserAccount` gains one method that applies the three values (domain checks stay in the service's validator, the students pattern). No new module
  dependency (identity stays `shared`-only).
- **Contradiction scan (L-03):**
  - Kept E2E that set `localStorage['englms.locale']` before or after signing in (`smoke.spec.ts:96,107`, `polish.spec.ts:59`,
    `students-list.spec.ts:595,652,710`, `students-polish.spec.ts:48`, `route-focus.spec.ts:54`, `loading.spec.ts:174`, `students-ui-checks.spec.ts:116`):
    unchanged, because a stored choice is never overridden (scope 7). `smoke.spec.ts:107` ("the choice survives a reload") stays true.
  - Kept E2E that click the switcher while signed in: the switch now also writes the tutor's account locale in the E2E database. Harmless for the UI
    (the device choice wins), but a spec that **asserts** the account value must set it itself.
  - Page titles `… · Eng-LMS` use the app name, not the workspace or account name: unaffected.
  - Date assertions: no kept E2E asserts a formatted date (`grep` for `formatDate`, `expiresAt`, `dd/mm` patterns in `e2e/`: none); the unit tests of
    `credentialsMessage`, `AddStudentPage`, `StudentWorkspacePage` format with the browser's zone today and are updated to pass an explicit zone (a kept
    assertion's *value* changes only where the zone was implicit; the implementer lists each in the summary).
  - interaction-states §3–4 (field errors, toasts), DEC-112 (shell items), DEC-113 (switcher stays in the account section): kept.
  - security.md T19 (stale session across tabs): a preference saved in one tab reaches another on its next session refetch (window focus); no
    cross-tab message is added.
- **Shortcut ledger:** this packet retires the two markers above and adds none expected; any new one follows the `shortcut:` form.
- **A new check that finds a real defect outside this scope** (L-10): the implementer reports it at once as an OQ, uses `test.fail` only until the LC
  rules, and the LC rules before G3.
- **E2E data hygiene:** the Account E2E changes the single tutor's display name, locale and time zone in the per-run database while specs run in
  parallel. It restores every value in `afterEach`, runs `test.describe.configure({ mode: 'serial' })`, and other specs must not assert the tutor's
  display name (today none does; the implementer re-greps).

## UI rules (fixed at G0, DEC-131 (2))
- Layout: one column, form max width 40 rem at every breakpoint; the tab list above it scrolls horizontally if it ever overflows (not now). Labels
  above fields. Display name breaks at spaces (`overflow-wrap: anywhere` for one long word); time-zone IDs never break inside an ID in the list (one
  line, ellipsis, the full ID in the option's accessible name).
- ComboBox popover: below the field, flips above when there is no room; at 360 px it is the field's width, max height 50 vh; above sheets and the
  drawer per `ui/modalStack.ts`; toasts stay under it.
- Focus: after Save success focus stays on Save; after a 422 focus goes to the `ErrorSummary`; after closing the ComboBox with Escape focus returns to
  its input; the Settings item and the tab are reachable in tab order; route focus on the page heading (route-focus rules).
- Validation per field: display name (the fullName rule, 1–120), locale (vi/en), time zone (an option from the list or the current value).
- Copy (vi verbs): **Lưu** (Save), "Đã lưu" toast; tab "Tài khoản"; item "Cài đặt"; labels "Tên hiển thị", "Ngôn ngữ", "Múi giờ".
- Viewports: 360 / 768 / 1280 (DEC-131 helpers `longD…`/no horizontal scroll); WCAG 2.2 AA (target size ≥ 24 px, focus visible, the combobox's
  `aria-expanded`/`aria-activedescendant`).

## Domain rules (fixed at G0, L-04)
- Invariants: `locale` ∈ meta locales; `time_zone` a zone ID Java resolves; `display_name` `null` or 1–120 trimmed characters without control
  characters; a student's `display_name` is never set through this endpoint. Enforced in code (the columns are `text`; no DB check is added).
- Transitions: per property, unchanged / set / cleared (`displayName` only). Table-driven test over: each property valid, invalid, `null`, absent;
  student with `displayName`; empty body; must-change account (403); anonymous (401); disabled account (the existing status filter's answer).
- Concurrency: **last write wins per property** (one owner per account; a PATCH carries only the properties it changes, so two tabs editing different
  properties both keep their change; two tabs setting the same property: the later one wins). No version, no lock. One concurrent test: two PATCHes
  of different properties in parallel both persist.
- Idempotency: a repeated identical PATCH is a no-op with the same 200 body. One transaction per request.
- Time: no instant is computed here; the stored zone is used by the client to format instants (scope 8).
- Audit: none. Audience: the session DTO only; nothing tutor-private exists on an account.

## Acceptance criteria
- AC1: `PATCH /api/v1/auth/preferences` as the tutor sets `locale`, `timeZone` and `displayName` (each alone and together) and returns the session
  body with the new values; a following `GET /auth/session` returns them.
- AC2: validation: the table of Domain rules (invalid locale/zone → 422 `INVALID_VALUE`, `null` locale/zone → `REQUIRED`, display name 121 characters
  → `TOO_LONG`, a control character → `INVALID_FORMAT`, empty display name clears it, empty body → 422, a student's `displayName` → 422
  `INVALID_VALUE`; a student's own `locale`/`timeZone` → 200).
- AC3: authz and isolation: matrix rows (anonymous 401, must-change 403 `PASSWORD_CHANGE_REQUIRED`, no CSRF 403, both roles 200); the isolation and
  secret-scan harnesses cover the endpoint; one user's PATCH never changes another account (test with two accounts).
- AC4: the concurrent test (two parallel PATCHes of different properties both persist).
- AC5: the tutor shell shows **Settings** (desktop sidebar and mobile drawer), `/tutor/settings` redirects to `/tutor/settings/account`, the tab list
  shows Account; route focus and page title follow the route rules.
- AC6: the Account page loads the session's values, saves only changed properties (verified on the request body), shows the field errors of a 422
  through `ErrorSummary`, shows a failed load/save as `InlineAlert` with retry, and the unsaved-changes guard on leave; vi + en.
- AC7: `ui/ComboBox`: keyboard (open, filter, arrows, Enter, Escape returning focus), filtering accent- and case-insensitive, the current value shown
  when it is not in the engine list, axe clean, a DevUiPage story; the time-zone list stays responsive at 360 px (no long task over 200 ms when
  typing, measured in the E2E with a performance mark or the trace).
- AC8: the switcher: signed in (not must-change) a switch sends `PATCH {locale}` and the device language changes; on the change-password page
  (must-change) it sends nothing; on a device without `englms.locale`, signing in as an account whose locale is `en` shows English; with a stored
  choice the session never overrides it.
- AC9: dates on the student workspace and the credentials card are formatted in the session's time zone (a unit test per helper with two zones; one
  E2E: tutor zone set to `Pacific/Kiritimati` (UTC+14) shows a student's created date one day later than in `Pacific/Pago_Pago` (UTC−11) for the same
  instant, values restored after).
- AC10: viewports 360/768/1280 at the Account page (open ComboBox included), no horizontal scroll, WCAG 2.2 AA checks; `./scripts/gate.sh` green;
  CI green on the final head.

## Test plan
- BE: `AuthApiIntegrationTest` (or a new `PreferencesApiIntegrationTest`) with the Domain-rules table, the two-account isolation test and the
  concurrent test; `SecurityHarness` / authz-matrix and student-isolation entries (authz-isolation skill); the OpenAPI contract regenerated
  (`api/openapi.json`, `web/src/lib/api/schema.d.ts`; contract-drift).
- FE unit/component: `ComboBox` (keyboard, filter, missing current value, axe), the Account page (load, changed-only body, 422 → fields + summary,
  failure → InlineAlert, guard), `LanguageSwitcher` (PATCH only with a non-must-change session; stored choice wins; no stored choice → session
  locale), `lib/time` with explicit zones; i18n completeness.
- E2E: a new `settings-account.spec.ts` (serial, restores values): AC5, AC6 happy path and one 422, AC7 keyboard path and timing, AC8 sign-in without a
  stored choice, AC9; the gate's ×3 repeat applies.
- **Independent QA focus:** two tabs editing different/same properties; a zone alias (`Asia/Saigon`) saved by API and shown in the ComboBox; a student
  session calling the endpoint with `displayName`; must-change flow and the switcher; the switcher on a slow or failing network (device language still
  changes, nothing shown); keyboard-only use of the ComboBox at 360 px with the drawer; date display around midnight across zones.
- **SEC focus:** the must-change gate and CSRF on the new endpoint, the student `displayName` refusal, no mass assignment (only the three properties
  are read), the response is exactly the session DTO, input length and control characters, no new log of personal data.

## Evidence required
- `evidence/T-M2.6/summary.md`: AC → proof table, the self-check list, the changed kept assertions (zone made explicit), the retired shortcut markers,
  the G3 cost table.
- One gate log on the final head (trimmed ≤ 300 lines, every `gate:` line), green CI.
- Local screenshots (not committed, DEC-131): `impl/<viewport>-settings-account-{default,error,combobox-open}.png` at phone-small, tablet, laptop.
- G3 reviews (tier H): `evidence/T-M2.6/review/security.md` (SEC agent), `evidence/T-M2.6/qa/report.md` (QA with the UX checklist).

## Docs to update
- `docs/04-backend/api-catalog.md` (the `/auth/preferences` row: body rules, response, **Live**), `docs/04-backend/validation-rules.md` (locale,
  timeZone, account displayName rows), `docs/04-backend/api-conventions.md` only if a field code is added (none planned).
- `docs/05-frontend/information-architecture.md` (Settings item as built; the tab list), `docs/05-frontend/design-system.md` (`ComboBox`),
  `docs/05-frontend/frontend-architecture.md` §4 (dates in the account's zone).
- `docs/03-architecture/module-boundaries.md` (identity as built: the preferences method).

## Risks & assumptions
- Risk: Chromium and WebKit list different zone IDs (`Intl.supportedValuesOf`; e.g. an engine lists `Asia/Saigon`, not `Asia/Ho_Chi_Minh`).
  Mitigation: the current value is always an option, the server accepts every Java ID; QA checks both engines' lists save (WebKit via the CI smoke
  only, no extra regression run).
- Risk: ~600 options on a phone. Mitigation: the ComboBox filters and renders a capped window (AC7 timing).
- Risk: the shared tutor account in parallel E2E (Design notes, data hygiene).
- Assumption: `ZoneId.getAvailableZoneIds()` of the JDK 25 runtime is the accepted set; tzdata updates come with the JDK.
- No regression run in this packet (cap 0; T-M2.7's G5 covers it, DEC-187).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
./mvnw -f backend -B -ntp verify -Dtest='*Preferences*,*Authz*,*Isolation*'
cd web && pnpm test --run && cd ..
./scripts/contract-drift.sh
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop -- tests/settings-account.spec.ts
./scripts/gate.sh
```

## Status transitions (mirrored in progress.json)
draft → ready (G0 PASS) → in_progress (PO start signal) → in_review → qa → awaiting_approval → done.
