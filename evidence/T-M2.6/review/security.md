# T-M2.6 security review (G3, tier H)

Fresh security-reviewer agent, head `d5426b5`, 2026-11-21; the LC recorded its returned text (DEC-131). Rulings: DEC-191.

Cost: 55,162 tokens, 12 tool uses, 152 s.

SEC-REVIEW T-M2.6: APPROVED

Scope: PR #222, full `git diff origin/develop...HEAD` (backend, FE auth/i18n/switcher/test-server, E2E support/fixtures) against security.md §11, the packet's SEC focus and DEC-190.

## Findings
- S1/S2/S3: none.
- S4-1 (advisory, no change): `AccountService.java:55`, `:232` — the tutor `displayName` follows the documented fullName rule (rejects C0 controls except tab/LF/CR), so interior tab/LF/CR, DEL, C1 and bidi/zero-width (e.g. U+202E) are accepted. Only the trusted tutor writes it on their own account; React escapes it (no XSS). Follow-up idea: the stricter Tag-style rule if the name is ever a single-line label shown to students. Matches validation-rules.md "account": not a defect here.

## Verified
- Audience/policy: `@Audience(AUTHENTICATED)` (AuthController.java:140-152); PolicyRegistry.java:72-74 (anon 401, tutor/student 200, B-on-A n/a, must-change 403); HarnessDetectionTest passes.
- Must-change gate: MustChangePasswordFilter allow-list unchanged → 403 PASSWORD_CHANGE_REQUIRED (matrix + PreferencesApiIntegrationTest); FE switcher skips the PATCH when mustChangePassword.
- CSRF: global filter; no-token 403 tested; `consumes` application/json.
- Isolation: no studentId/path ID, principal `me.userId()` only; null principal/vanished account 401; `onePatchNeverChangesAnotherAccount`; IsolationTest 21 green.
- Student displayName (null included) → 422 INVALID_VALUE; a valid locale alongside is not saved (problems collected before the write).
- No mass assignment: setters only for locale/timeZone/displayName; body with role/mustChangePassword/username saves only locale.
- Response exactly SessionResponse (7 properties asserted); no credentialStamp/hash.
- Inputs: exact locale in meta locales, exact ZoneId, ≤ 120 code points after strip, C0 rejected (NUL, ESC tested); linear regex; messages never echo input; no migration.
- Logs: no new logger calls; `PreferencesRequest.toString()` redacted.
- Concurrency: `findForUpdateById` row lock; concurrent-PATCH test passes.
- FE: no dangerouslySetInnerHTML/innerHTML/console.* in product diff; best-effort PATCH through problem-details middleware; failed save shows nothing, no console.error (unit test); `useUpdatePreferences` replaces the cache only on matching userId (DEC-127); `applyAccountLocale` never overrides a stored choice.
- E2E: `answerPreferencesInPlace` (fixtures.ts:34-56) answers only PATCH /auth/preferences from a real GET session, passes non-200 through; console guard and anonymous probe untouched; global-setup reset fails hard if not 200; no security assertion removed or loosened.

## Tests run
`./mvnw -B -ntp verify -Dtest='PreferencesApiIntegrationTest,AccountServiceTest,AuthzMatrixTest,IsolationTest,HarnessDetectionTest,*Arch*'`: BUILD SUCCESS, 161 tests, 0 failures (AuthzMatrix 82, Isolation 21, HarnessDetection 21, Preferences 29, AccountService 2, ArchitectureRules 6). One Testcontainers create retried after a transient broken pipe.

Not checked: full backend verify, web unit, E2E (CI 7/7 relied on); no new dependencies.
