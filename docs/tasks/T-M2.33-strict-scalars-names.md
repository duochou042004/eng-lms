# T-M2.33: Strict scalar binding and one name character rule

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | in_progress (PO start 2026-11-25; G0: round 1 CHANGES REQUESTED (S2-1, S3-1, S3-2, S4-1..S4-6), all fixed; delta PASS WITH MINOR, S4 fixed; DEC-200; waiting for the PO start signal) |
| Owner role | BE (binding, the shared name rule, both services, docs) then FE (the two forms' client rule and messages); one implementer at a time |
| Branch | `feature/T-M2.33-strict-scalars-names` (from `develop`) |
| Depends on | T-M2.10 (merged, `6cca511`, DEC-186), T-M2.6 (merged, `160df23`, DEC-192), T-M2.35 (merged, `9ad116b`, DEC-195), T-M2.32 (merged, `a43b17b`, DEC-199) |
| Estimate | ≤ 1.5 agent-days (BE ≤ 0.75, FE ≤ 0.5) |
| Risk tier | **H**: the sign-in body's binding and the `identity` preferences rule change (quality-gates G3: identity, authentication) → **SEC** as its own agent, then **QA with the UX checklist** (two existing form messages change) |
| Trace | api-conventions §5 (400 `MALFORMED_REQUEST`: wrong types); validation-rules "account" `displayName`, "workspace" `displayName`; FR-SET-01, FR-SET-02; OQ T-M2.10-1 (DEC-186); T-M2.6 SEC S4-1, QA-6 (DEC-191); T-M2.35 SEC S4-1, QA-1, UX-1 (DEC-194); PO order DEC-187; packet decisions DEC-200 |

## Goal
A JSON request body binds a `String` field only from a JSON string and a `Boolean`/`boolean` field only from a JSON boolean: anything else is
400 `MALFORMED_REQUEST`, as for integers since T-M2.10. The workspace name and the tutor's account display name follow **one** character rule,
on the server and in both forms, that refuses every control, format, surrogate and line/paragraph separator code point and, in the form,
tells the tutor which one it found.

## Scope
- In (BE):
  1. **Strict textual and boolean binding.** The existing `shared.web.StrictJsonIntegersConfiguration` customizer (one `JsonMapperBuilderCustomizer`,
     not a second bean) also sets coercion `Fail` for `LogicalType.Textual` from `Integer`, `Float` and `Boolean` shapes, and for
     `LogicalType.Boolean` from `Integer`, `Float`, `String` and `EmptyString` shapes (blank not accepted as empty). `null` and an absent field
     keep their current meaning. Its Javadoc names the three rules; the class name stays (no rename churn).
  2. **One name rule** in `shared` (e.g. `com.englms.shared.Names`; public, no Spring): `firstForbidden(String)` returns the first code point in
     `[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]` (C0, DEL, C1; every format character: bidi marks, overrides and isolates, zero-width, word joiner and
     invisible operators U+2060–U+2064, U+061C, U+00AD, U+180E, U+FEFF, tags U+E0001 and U+E0020–U+E007F; lone surrogates; U+2028, U+2029) or none;
     `isBlank(String)`: empty after `strip()` or made only of `\p{Z}` (U+00A0, U+3000 and the other space separators); and `strip(String)`:
     removes leading and trailing `\p{Z}` and whitespace (Java `strip()` keeps U+00A0, U+2007, U+202F at the ends; JS `trim()` removes them),
     so the server and the client trim alike and count the same 120 code points.
  3. **Workspace `displayName`** (`WorkspaceSettingsService`): its own `FORBIDDEN` pattern is replaced by the shared rule; blank (rule above)
     → `REQUIRED`; the shared `strip`, the rest unchanged (1–120 code points, `TOO_LONG`).
  4. **Account `displayName`** (`AccountService`, tutor only): the shared rule replaces the C0-only `CONTROL` check, so tab, LF and CR are now
     refused too; blank → clears it (as empty today); the shared `strip`; the rest unchanged (1–120, `TOO_LONG`, students → `INVALID_VALUE`).
  5. A refused name's `FieldProblem` (`{field, code, message}`) keeps code `INVALID_FORMAT`; its developer `message` names the first offending
     code point as `U+XXXX` (4–6 upper-case hex digits) and never echoes the value. No new problem property: the web client keeps reading
     `{field, code}` only (api-conventions: `message` is for developers), so the code point in the UI comes from the client rule (scope 7).
- In (FE):
  6. **One client rule** (e.g. `web/src/lib/names.ts`): `firstForbidden` with the same classes (`/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u`) and
     `isBlank` (`/^\p{Z}*$/u` after `trim()`); `workspaceForm.ts` (drops its range table) and `accountForm.ts` (drops `hasControl`) use it.
  7. **Messages** (`settings` namespace, vi + en), for `workspace.errors.displayName.*` and `account.errors.displayName.*`:
     - `INVALID_CHARACTER` (the client rule, with the found code point): en "This name contains an invisible or control character
       ({{codePoint}}). Delete it and type the name again." · vi "Tên này chứa ký tự ẩn hoặc ký tự điều khiển ({{codePoint}}). Hãy xoá ký tự
       đó và gõ lại tên."
     - `INVALID_FORMAT` (a server-only 422, no code point): en "This name contains an invisible or control character. Delete it and type the
       name again." · vi "Tên này chứa ký tự ẩn hoặc ký tự điều khiển. Hãy xoá ký tự đó và gõ lại tên." (replaces today's strings).
  8. **Only a changed name is checked in the form** (as the server checks only a sent name): a stored name that breaks the new rule (saved
     before it) does not block a time-zone- or locale-only save; editing the name applies the rule.

## Out of scope (explicit)
- Student `fullName`, guardian names, notes, tags and other text fields: they keep their rules (validation-rules); the account `displayName`
  stops being "the fullName rule" (the row is reworded). A wider rule is a new backlog row if the PO wants one.
- Rewriting stored names: no migration; a stored name that breaks the new rule still reads and shows; the rule applies when the name itself
  is next sent (scope 8).
- Invisible letters and symbols outside `C*`/`Zl`/`Zp` stay accepted (known gap): Hangul fillers U+115F, U+1160, U+3164, U+FFA0 and the
  braille blank U+2800 (a name of only U+3164 still shows blank). A later row if the PO wants them.
- Other logical types (enums are bound from strings by hand today; UUID, dates, lists) and query parameters (not JSON).
- Jackson's mismatch message quoting the value at DEBUG (DEC-186 SEC S4-1, pre-existing).
- No new endpoint, no migration, no UI layout change, no regression run (cap **0**).

## Guardrail answers (scope.md §6)
1. Trace: OQ T-M2.10-1 (DEC-186), DEC-191, DEC-194, api-conventions §5. 2. No drift: input hygiene of existing fields. 3. No setup added.
4. The tutor edits both names rarely; the binding protects every write. 5. No hard-coded curriculum or exam semantics.

## Design notes
- Lessons read (L-01: every new rule is seen red first; L-03: the scan below; L-10). Shortcut ledger: no `shortcut:`/`ponytail:` marker in
  `shared/web`, `settings`, `identity/internal/app` or `web/src/app/routes/settings` fires.
- **Contradiction scan:**
  - api-conventions §5 already says "wrong types → 400"; the row gains the String/Boolean sentence (as T-M2.10's integer sentence).
  - validation-rules "account" `displayName` says "the fullName rule … a C0 control character other than tab/LF/CR"; "workspace" lists the
    T-M2.35 ranges: both rows are rewritten to the shared rule (a kept-doc change by this packet's DEC).
  - Kept tests that assert the old behaviour change only by this packet's DEC, each named in the summary: an account `displayName` with an
    interior tab/LF/CR accepted (if a test asserts it), the workspace form's range table cases, any backend or web test that sends a number or
    `"true"` where a string or boolean is expected. The implementer lists every changed assertion with its old and new expectation.
  - The sign-in body: `LoginThrottle.tryAcquire` runs in `AuthenticationService` after binding, so a binding 400 never counts. The behaviour
    change: a numeric `username` or `password` is today coerced, throttled, checked and answered 401; after this packet it is 400, not
    counted, and no credential check runs (no guess is evaluated). The malformed-body test (`AuthApiIntegrationTest:391` area) is the reference.
  - `\p{Cf}` includes U+200C/U+200D (ZWNJ/ZWJ): emoji ZWJ sequences and some scripts' joiners are refused in these two names. Accepted (two
    one-line labels; the tutor writes Vietnamese/English); combining marks (`\p{Mn}`, e.g. U+0301) and variation selectors (U+FE0F) stay allowed.
- Java `Pattern` matches by code point, so tags and other supplementary characters are found; the client uses the `u` flag for the same reason.
- Unicode versions differ (Java 25: Unicode 16; Node 24 and browsers newer or older): the server is the authority; the AC5 client table uses
  only the AC4 code points, which are stable across these versions.

## UI rules (fixed at G0, DEC-131 (2))
- No layout change; the existing field error and `ErrorSummary` show the message; focus behaviour unchanged (T-M2.6 AC11).
- The code point is written as `U+200B` (ASCII, no break opportunity inside it); the message may wrap at its spaces.
- Copy: the vi and en strings in scope 7 (two keys per name); the existing `REQUIRED`/`TOO_LONG` strings unchanged.

## Domain rules (fixed at G0, L-04)
- No new data, state or transition. The checks keep their order (422 with every problem at once, then 409 `STALE_VERSION`); a 400 binding
  failure happens before the controller, writes nothing and is not audited. No event, no audience change (ADR-0016 unaffected).

## Acceptance criteria
- AC1 (strict textual): a JSON integer, fraction or boolean for a `String` field → 400 `MALFORMED_REQUEST`, nothing written. One table test
  over at least: `POST /auth/login` (`username: 123`, `password: 123456`), `POST /tutor/students` (`fullName: 123`, `username: true`), a
  `PATCH /tutor/students/{id}` (`fullName: 1.5`), `PATCH /auth/preferences` (`locale: 123`, `displayName: 123`, `timeZone: false`),
  `PATCH /tutor/settings` (`displayName: 123`, `defaultLocale: true`); each row seen red before the change (L-01).
- AC2 (strict boolean): `rememberMe` as `1`, `0`, `2`, `"true"`, `"false"`, `""`, `" "` (each seen red first) and `1.0` (already 400:
  a guard row, green before and after) → 400 `MALFORMED_REQUEST` and no session;
  `true`, `false`, `null` and absent keep today's behaviour (tests kept).
- AC3 (kept): all T-M2.10 integer tests and every valid-body test pass unchanged; the 400 body is the existing problem shape; a binding 400 on
  the sign-in body is not counted by `LoginThrottle` (a test: the test profile's configured throttle limit + 1 numeric-password attempts from one client, then a correct sign-in succeeds).
- AC4 (name rule, server): a table test over both names with at least U+0009, U+000A, U+000D, U+007F, U+0085, U+00AD, U+061C, U+180E,
  U+200B, U+200D, U+200E, U+2028, U+2029, U+202E, U+2060, U+2064, U+2066, U+FEFF, U+E0041 and a lone U+D800, each at the start, middle and end:
  422 `INVALID_FORMAT` on `displayName` with `message` naming that code point (first one when several), nothing saved; accepted: Vietnamese with
  precomposed and combining marks (U+0301), an emoji with U+FE0F, an interior ASCII space. Blank: U+00A0-only, U+3000-only and space-only →
  workspace `REQUIRED`, account cleared. Ends: a name sent as U+00A0 + "Lan" + U+202F is stored as "Lan".
- AC5 (name rule, client): `lib/names` unit table with the AC4 cases (same results); both forms block the submit and show `INVALID_CHARACTER`
  with the code point in vi and en; a server-only 422 (client rule bypassed in a component test) shows `INVALID_FORMAT`; with a stored name
  containing U+2028, a time-zone-only (account) and a locale-only (workspace) save succeeds without a name error (scope 8).
- AC6 (E2E): the Workspace and Account forms at phone-small, tablet and laptop: typing a name with U+200B shows the message naming U+200B in
  the field and the summary; `expectSettledAccessible` passes.
- AC7 (docs): api-conventions §5, validation-rules (both rows) and the customizer's Javadoc state the new rules.
- AC8 (L-10): a real defect a new test finds outside this scope is reported as an OQ at once (`test.fail` only until the LC rules, before G3).
- AC9: `./scripts/gate.sh` green once on the final head and CI green; existing assertions kept except those listed under the contradiction scan.

## Test plan
- BE: `@WebMvcTest`/integration table tests for AC1–AC4 (Testcontainers where the existing tests do); unit table for `Names`.
- FE: `lib/names.test.ts`; `workspaceForm`/`accountForm` tests; the two pages' component tests for the message and the server-only case.
- E2E: extend the existing settings specs (no `e2e/support` change, so the repeat runs only the changed specs).
- **Independent QA focus:** send every AC1/AC2 row with `curl` (CSRF) against a running app; try characters outside the AC4 list from
  `\p{Cf}` and `\p{Z}`; paste-in of an invisible character on both forms with a screen reader name check; vi/en at three viewports.
- **SEC focus:** the sign-in body and throttle, that no value is echoed in 400/422 bodies or INFO logs, the authz matrix unchanged.

## Evidence required
- `evidence/T-M2.33/summary.md` (AC → proof, changed kept assertions, self-check list, G3 cost table), one gate log on the final head + green
  CI, local screenshots (not committed) of both forms' error at phone-small/tablet/laptop, the SEC and QA(+UX) reports (on `docs/`/`qa/` branches).

## Docs to update
- [api-conventions](../04-backend/api-conventions.md) §5, [validation-rules](../04-backend/validation-rules.md) ("account" and "workspace" `displayName`), the customizer's Javadoc.

## Risks & assumptions
- A client or test that relied on coercion (e.g. a number in a string field) starts getting 400: the gate's full suite finds them; each fix is
  listed. The web client already sends JSON types matching the OpenAPI schema (assumption; contract-drift checks it).
- Jackson 3's coercion config for `Textual` covers `Optional<String>` content and record components (to be proven by the AC1 rows).

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh; source ~/.nvm/nvm.sh; source scripts/env.sh
(cd backend && ./mvnw -B verify)
(cd web && pnpm test --run)
./scripts/gate.sh
```

## Status transitions (mirrored in progress.json)
`draft → ready` (LC, G0) → `in_progress` → `in_review` → `qa` → `awaiting_approval` → `done`.
