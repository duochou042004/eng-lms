# T-M2.35: Workspace settings v1 and Settings › Workspace (FR-SET-01, first section)

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 pending) |
| Owner role | BE (store, endpoints, `/meta`, student defaults) then FE (Workspace tab, redirect, the Account tab's Language label); one implementer at a time |
| Branch | `feature/T-M2.35-workspace-settings` (from `develop`) |
| Depends on | T-M2.6 (merged, `160df23`, DEC-192) |
| Estimate | ≤ 2 agent-days (BE ≤ 0.75, FE ≤ 1) |
| Risk tier | **H**: a new tutor endpoint, a migration and a new module edge (`identity → settings`) (quality-gates G3: new endpoint, migration) → **SEC** as its own agent, then QA with the UX checklist in the same pass (one new tab, reused `ui/` parts) |
| Trace | SPEC §41 (Settings); FR-SET-01 AC "Workspace: display name (brand), default time zone, default language" (the later items: their milestones); api-catalog `GET / PATCH /tutor/settings` (M2+), `GET /meta`; data-model §settings (`workspace_setting`); module-boundaries §settings (`SettingsApi`), §identity ("Depends on: shared, settings"); information-architecture §1, §5 (`/tutor/settings/{workspace\|account\|…}`); DEC-187 (PO order), DEC-190 (1) (the split), DEC-191 (T-M2.6 UX-3, SEC S4-1); lessons L-03, L-04, L-10 |

## Goal
The tutor sets the workspace's **display name** (the brand shown in the shells and on the sign-in page), its **default language** and its
**default time zone** on a new **Settings › Workspace** tab. The display name replaces the configured one in `GET /meta`; new student accounts
start with the default language and time zone.

## Scope
- In (BE, `settings`, plus one call from `identity`):
  1. **Store:** a forward-only migration `V2026112xxxxx__settings_workspace.sql` creates `workspace_setting (key text PK, value jsonb NOT NULL,
     version bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL, updated_by uuid NULL)` (data-model §settings gains `version`) and inserts
     the one row `key = 'workspace'`, `value = {"defaultLocale": "vi", "defaultTimeZone": "Asia/Ho_Chi_Minh"}` (the `user_account` column
     defaults of `V202610040001`; no `displayName` property = the configured `englms.meta.display-name`). A structural row, not domain content
     (coding-agent-rules §7). JPA entity in `settings.internal`, `@Version` on `version`.
  2. `GET /api/v1/tutor/settings` (audience TUTOR): `{displayName, defaultLocale, defaultTimeZone, version, updatedAt}`; `displayName` is the
     effective name (stored, else the configured one).
  3. `PATCH /api/v1/tutor/settings` (audience TUTOR; CSRF; behind the must-change gate): body `{version, displayName?, defaultLocale?,
     defaultTimeZone?}`; absent = unchanged; `version` required (absent/`null` → 422 `REQUIRED`, below 0 → `INVALID_VALUE`, api-conventions);
     at least one other property, else 422 `REQUIRED` on `displayName`; a stale `version` → 409 `STALE_VERSION` (the optimistic-lock mapping in
     `ProblemDetailsAdvice`). Rules (validation-rules, new rows):
     - `displayName`: trimmed, 1–120 characters, **no control character of any kind** (tab/LF/CR, DEL and C1 included: the Tag-row wording; it is a
       public one-line label, DEC-191 SEC S4-1) and no bidi override/isolate or zero-width character (U+200B–U+200F, U+202A–U+202E, U+2066–U+2069,
       U+FEFF) → `INVALID_FORMAT`; > 120 → `TOO_LONG`; empty after trim or `null` → `REQUIRED` (the brand cannot be cleared; the tutor types the
       configured name to return to it).
     - `defaultLocale`: one of `englms.meta.locales` (exact) → else `INVALID_VALUE`; `null` → `REQUIRED`.
     - `defaultTimeZone`: an ID in `ZoneId.getAvailableZoneIds()` (exact; aliases accepted as given) → else `INVALID_VALUE`; `null` → `REQUIRED`.
     - Wrong JSON types: object/array → 400 `MALFORMED_REQUEST`; scalars coerced until T-M2.33 (its table tests add this body, as for
       `/auth/preferences`). Absent-vs-`null` binding: the `TutorStudentDtos.java:45-61` setter pattern, as `PreferencesRequest`.
     - All problems in one 422 (the T-M2.6 BE OQ-2 rule); nothing is saved on a 422 or 409.
     200 with the GET body. One transaction. No audit entry (FR-SET-03's types exclude settings), no event.
  4. **`GET /meta` `displayName`** reads the store's effective name (config as the default; the response shape is unchanged). Public by design
     (the sign-in page shows it; api-conventions §1 "workspace display name (no secrets)").
  5. **New student accounts take the workspace defaults:** `SettingsApi.accountDefaults()` → `{locale, timeZone}` (the module's public API; the
     generic `get(Key<T>)` of module-boundaries is not built: one caller, YAGNI; module-boundaries records the as-built API).
     `AccountService.createStudentAccount` reads it and `UserAccount.newStudent` takes the two values (identity's allowed dependencies gain
     `settings`; Modulith-verified). Existing accounts and the tutor's account are never changed by a workspace PATCH.
  6. Authorization matrix rows (tutor 200, student 403, anonymous 401, must-change 403 `PASSWORD_CHANGE_REQUIRED`, no CSRF 403), the
     student-isolation secret scan over both responses; api-catalog rows **Live** with the body rules.
- In (FE):
  7. **Settings › Workspace** (`/tutor/settings/workspace`, first tab; `/tutor/settings` now redirects here; tab order Workspace, Account):
     an `h2` and one form of at most 40rem: **Display name** (`TextField`, required), **Default language** (`SegmentedControl` Tiếng Việt / English
     with a visible label), **Default time zone** (`ui/ComboBox`, the T-M2.6 options rule: `Intl.supportedValuesOf('timeZone')` plus the current
     value), a hint under the two defaults that they apply to students added from now on, and **Save** (`aria-disabled` while unchanged, the
     T-M2.6 pattern). Save sends `version` and only the changed properties; on 200 the settings query and `['settings','meta']` are replaced from
     the answer (the shells and the sign-in page show the new name at once), a "Saved"/"Đã lưu" toast, focus stays on Save; 422 → fields and
     `ErrorSummary` (focus to the summary, client and server errors alike: T-M2.6 QA-1); 409 → the students' stale-version pattern
     (`ConflictDialog`: reload the saved values or keep editing; the implementer reuses it, moving it to a shared place only if the import rules
     require it, and says which); other errors and offline → the page `InlineAlert` with retry (`networkMode: 'always'`, T-M2.6 QA-3); edits typed
     during a pending save are kept (T-M2.6 QA-2); `UnsavedChangesGuard`. Loading and load-error states per interaction-states.
  8. **Account tab:** a visible "Ngôn ngữ"/"Language" label above the Language row (the switcher), associated with its group (T-M2.6 UX-3,
     DEC-191); nothing else on that tab changes.
  9. **E2E isolation of the shared workspace** (as T-M2.6 scope 7a): kept specs assert the home link named "Eng-LMS" (`shells.spec.ts:758,771`)
     and sign in fresh students expecting Vietnamese, and the suite is `fullyParallel`, so no spec writes the workspace for real:
     `global-setup.ts` resets the row (display name "Eng-LMS", `vi`, `Asia/Ho_Chi_Minh`) through the endpoint with the current version, and
     `settings-workspace.spec.ts` answers `GET`/`PATCH /tutor/settings` and `/meta` in the page (`page.route`, asserting the request bodies);
     the real round trip, `/meta` and the student defaults are proven by the BE integration tests.
  10. vi + en strings in the `settings` namespace; i18n completeness test.

## Out of scope (explicit)
- The other FR-SET-01 items (attention thresholds, upload limits, embed providers, extensions, metrics): their milestones. FR-SET-03 (M8).
- A workspace logo, colours, or any per-student override; changing existing accounts' language or zone when a default changes.
- The anonymous UI language (the sign-in page keeps the device/browser choice; T-M2.6 kept it out of scope too); a server-side use of the
  defaults beyond new accounts (emails, scheduling: M3+).
- T-M2.6's batched S4s other than UX-3 (T-M2.32, T-M2.33).

## Guardrail answers (scope.md §6)
1. Trace: FR-SET-01 (first three items), SPEC §41, api-catalog. 2. Drift toward excluded scope: no (one workspace, no tenant settings, no
branding beyond a name). 3. Mandatory set-up: none (the seeded row and the configured name work untouched). 4. Weekly use: the brand on every
page; the defaults at every new student. 5. Hard-coded semantics: none.

## Design notes
- **BE placement:** `settings.internal` gets the entity, repository, `WorkspaceSettingsService` (`@Transactional`), the request DTO (setter
  pattern) and `TutorSettingsController`; `MetaController` reads the service; `settings` keeps depending on `shared` only. `SettingsApi` (public,
  `com.englms.settings`) exposes `accountDefaults()`. Identity reads it in `createStudentAccount`'s transaction.
- **Contradiction scan (L-03):**
  - `/meta` displayName: `MetaControllerTest`/contract tests that expect "Eng-LMS" stay true (no stored name in the seed). The OpenAPI shape is
    unchanged; the two new operations regenerate `api/openapi.json` and `schema.d.ts` (contract-drift).
  - module-boundaries says identity is "shared only (no `settings` use yet)" (line 32) and plans `identity → settings` (line 175): this packet
    makes the planned edge real; no cycle (settings never reads identity).
  - Kept E2E: `shells.spec.ts:758,771` (home link "Eng-LMS"), `shells.spec.ts:430-431` (no doubled name), every fresh-student sign-in expecting
    vi: kept by scope 9. The T-M2.6 `settings-account.spec.ts` navigates to `/tutor/settings` → now lands on Workspace: the implementer updates
    the redirect assertion (an intended change; listed in the summary) and keeps the Account assertions on `/tutor/settings/account`.
  - information-architecture §1 "Settings as built" names Account the only tab and the redirect: updated.
  - api-conventions' version rule applies (unlike DEC-190 (2)): the workspace document is shared state with a version.
  - interaction-states (§3 form errors, §4 toasts, stale-version dialog): kept.
- **Shortcut ledger:** none fired; none expected. A new one follows the `shortcut:` form.
- **A new check that finds a real defect outside this scope** (L-10): the implementer reports it at once as an OQ, `test.fail` only until the LC
  rules, and the LC rules before G3.

## UI rules (fixed at G0, DEC-131 (2))
- Layout: as the Account tab (one column, ≤ 40rem, labels above fields); the hint text under the defaults wraps; display name breaks at spaces
  (`overflow-wrap: anywhere` for one long word); in the shells the long name keeps the existing clamp (`WorkspaceName`).
- Tabs: Workspace, Account (horizontal `NavList`, `aria-current="page"`), wrapping as built.
- ComboBox popover: the T-M2.6 rules (field width at 360 px, ≤ 50 vh, layering per `ui/modalStack.ts`).
- Focus: after Save success on Save; after a 422 on the `ErrorSummary`; after the conflict dialog closes, on Save (reload) or the field last
  edited (keep editing), per the students' pattern; route focus on the page heading.
- Validation: display name per scope 3 (1–120, no control/bidi/zero-width), the locale from the control, the zone from the list or the current
  value. Save `aria-disabled` while the form equals the saved values.
- Copy (vi): tab "Không gian làm việc"; labels "Tên hiển thị", "Ngôn ngữ mặc định", "Múi giờ mặc định"; hint "Áp dụng cho học viên thêm từ nay
  về sau."; **Lưu**, "Đã lưu"; the Account tab label "Ngôn ngữ".
- Viewports 360 / 768 / 1280; WCAG 2.2 AA (target ≥ 24 px, focus visible); an open-ComboBox axe check uses only the DEC-191 exception.

## Domain rules (fixed at G0, L-04)
- Invariants: exactly one `workspace` row (seeded; never deleted, never inserted by the app); `defaultLocale` ∈ meta locales; `defaultTimeZone` a
  Java zone ID; `displayName` absent (config) or 1–120 trimmed characters without control, bidi or zero-width characters.
- Transitions: per property unchanged / set (no clear). Table-driven test over: each property valid, invalid, `null`, absent; empty body; missing,
  negative and stale `version`; student (403); must-change (403); anonymous (401).
- Concurrency: **optimistic, version → 409 `STALE_VERSION`** (api-conventions). One concurrent test: two PATCHes with the same `version` in
  parallel → exactly one 200, one 409, the row holds the winner's values and `version` +1.
- Idempotency: a PATCH whose values equal the stored ones returns 200 with the same body and does **not** bump `version` (no dirty write).
- Time: `updated_at` from the injected `Clock`.
- Audit: none; `updated_by` = the tutor's user ID.
- Audience: tutor DTO for `/tutor/settings`; `/meta` exposes only the effective `displayName` (public by design). Student accounts created after a
  change carry the new defaults; earlier ones keep theirs (tested).

## Acceptance criteria
- AC1: `GET /tutor/settings` as the tutor returns the seeded values (`displayName` "Eng-LMS" from config, `vi`, `Asia/Ho_Chi_Minh`, `version` 0);
  `PATCH` sets each property alone and together, returns the GET body with `version` +1; a following GET and `GET /meta` show the new name.
- AC2: validation: the Domain-rules table (scope 3 codes; all problems in one 422; nothing saved on 422/409); a same-values PATCH keeps `version`.
- AC3: authz and isolation: matrix rows (tutor 200, student 403, anonymous 401, must-change 403, no CSRF 403); secret scan over both responses;
  `GET /meta` stays public and returns the stored name.
- AC4: concurrency: the parallel same-version test (one 200, one 409, version +1 once).
- AC5: new student accounts take the defaults: after a PATCH to `en` and `Pacific/Kiritimati`, a created student's session shows them; a student
  created before keeps `vi`/`Asia/Ho_Chi_Minh`; the tutor's account is unchanged; Modulith verification passes with the new edge.
- AC6: the tutor shell: `/tutor/settings` redirects to `/tutor/settings/workspace`; tabs Workspace, Account; route focus and title follow the route rules.
- AC7: the Workspace tab loads the values, sends `version` + only changed properties (request body), Save disabled while unchanged; 200 → toast,
  focus on Save, the shell's workspace name updates without a reload; 422 → fields + `ErrorSummary` focused (client and server); 409 → the
  conflict dialog; other error and offline → `InlineAlert` with retry, no replay; edits during a pending save kept; unsaved guard; vi + en.
- AC8: the Account tab shows a visible "Language" label associated with the switcher group (accessible name check); nothing else changes there.
- AC9: viewports 360/768/1280 (default, 422, conflict, open ComboBox), no horizontal scroll, axe clean (DEC-191 exception only with the list open);
  `./scripts/gate.sh` green; CI green on the final head.

## Test plan
- BE: `WorkspaceSettingsApiIntegrationTest` (Domain-rules table, concurrency, idempotent PATCH, `/meta`), an `AccountService`/students create
  test for the defaults (before/after), `PolicyRegistry` + authz-matrix + isolation entries (authz-isolation skill), the migration test
  (db-migration skill: forward-only, the seed row), Modulith `verify()`; OpenAPI regenerated (contract-drift).
- FE unit/component: the Workspace page (load, changed-only body with version, 422 → fields + summary focus, 409 → dialog, offline/500 →
  InlineAlert, guard, edits during save, meta cache replaced), the redirect and tab order, the Account Language label, i18n completeness.
- E2E: `settings-workspace.spec.ts` (page-answered requests per scope 9; asserts bodies; AC6, AC7 happy path, one 422, one 409, AC9 at 3
  viewports); the `settings-account.spec.ts` redirect assertion updated; `global-setup.ts` reset (all specs repeat ×3 in the gate: budget it).
- **Independent QA focus:** two tabs saving the workspace (409 and recovery); the name with Vietnamese diacritics, 120 characters, a bidi or
  zero-width character (refused); the sign-in page and both shells showing a new name (QA may write the real workspace on its own fresh E2E DB,
  restoring it); a student created after a defaults change (fresh device: its UI follows the account locale, T-M2.6 rule); student and
  must-change access to the endpoint; keyboard-only at 360 with the drawer.
- **SEC focus:** tutor-only audience and the must-change gate, CSRF, no mass assignment (only the three properties and `version`), the
  `displayName` character rule (public label: control, bidi, zero-width), `/meta` exposing nothing new, the `identity → settings` edge
  (no settings data leaking into the session DTO beyond the account's own values), no personal data in logs.

## Evidence required
- `evidence/T-M2.35/summary.md`: AC → proof, the self-check list, the changed kept assertions (the redirect), the G3 cost table.
- One gate log on the final head (trimmed ≤ 300 lines, every `gate:` line), green CI.
- Local screenshots (not committed, DEC-131): `impl/<viewport>-settings-workspace-{default,error,conflict,combobox-open}.png` at phone-small,
  tablet, laptop; `impl/<viewport>-settings-account-label.png`.
- G3 (tier H): `evidence/T-M2.35/review/security.md` (SEC agent), `evidence/T-M2.35/qa/report.md` (QA with the UX checklist).

## Docs to update
- `docs/03-architecture/data-model.md` (`workspace_setting.version`, the seed row), `docs/03-architecture/module-boundaries.md` (settings and
  identity as built: `SettingsApi.accountDefaults()`, the edge).
- `docs/04-backend/api-catalog.md` (`/tutor/settings` rows **Live**, `/meta` displayName source), `docs/04-backend/validation-rules.md` (the
  workspace rows).
- `docs/05-frontend/information-architecture.md` (Settings as built: tabs, redirect), `docs/05-frontend/ux-flows.md` only if a step budget is added.

## Risks & assumptions
- Risk: parallel E2E and the shared workspace row (scope 9). Risk: a mis-seeded row breaks every student create: the migration test and the AC5
  test cover it.
- Assumption: one row is enough until the later FR-SET-01 sections; each later section adds properties to the same document (same version) or its
  own key, decided by its packet.
- No regression run in this packet (cap 0; T-M2.7's G5 covers it, DEC-187).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd backend && ./mvnw -B -ntp verify -Dtest='*WorkspaceSettings*,*Meta*,AccountServiceTest,AuthzMatrixTest,IsolationTest,*Modul*')
cd web && pnpm test --run && cd ..
./scripts/contract-drift.sh
./scripts/e2e-run.sh --project=phone-small --project=tablet --project=laptop tests/settings-workspace.spec.ts
./scripts/gate.sh
```

## Status transitions (mirrored in progress.json)
draft → ready (G0 PASS) → in_progress (PO start signal) → in_review → qa → awaiting_approval → done.
