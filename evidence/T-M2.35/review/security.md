# T-M2.35 security review (G3, tier H)

Fresh security-reviewer agent, head `010c16f`, 2026-11-25 (53,436 tokens, 211 s). Recorded by the LC; invisible characters the agent quoted are written as U+XXXX. Rulings: DEC-194.

SEC-REVIEW T-M2.35: APPROVED

Head reviewed: 010c16f0a3eecca93c13211caeecf8c4bd0c8d73 (the current HEAD of feature/T-M2.35-workspace-settings, not 4e0c7d5). I reviewed `git diff origin/develop...HEAD`, which is 7 commits from 02fca22 to 010c16f. There are no S1, S2 or S3 findings, and nothing blocks the merge.

Tests run on this head (targeted `./mvnw -B verify` with Testcontainers on podman): AuthzMatrixTest 90/90, IsolationTest 23/23, HarnessDetectionTest 21/21, WorkspaceSettingsApiIntegrationTest 44/44, MetaControllerTest 5/5, FlywayMigrationTest 12/12, AccountServiceTest 3/3, ModularityTests, ArchitectureRulesTest, StudentIsolationRulesTest, ForbiddenIdentifiersTest, OpenApiContractTest and AuthApiIntegrationTest. Everything passed with 0 failures. The tracked tree was not modified; only the two untracked `evidence/*/records/` directories that were already there remain.

**SEC focus and §11 checklist**
- **`/meta` error path:** if the row is missing or the DB fails, the call reaches the generic `ProblemDetailsAdvice` `Exception` handler (ProblemDetailsAdvice.java:64-73). That returns a bare 500 ProblemDetail with no detail. WorkspaceSettingsApiIntegrationTest:351-364 checks the 500 and that the body does not contain "workspace_setting" or "missing". The shell falls back to `app.name` and offers Retry (ShellParts.tsx:37-39). The log line is "Unhandled exception" with a stack trace: no personal data.
- **`/meta` exposes nothing new:** the response has the same four properties, asserted at IT:225. `displayName` is the tutor's own public label, which was already exposed from config.
- **Audience:** `@Audience(TUTOR)` is set at class level (TutorSettingsController.java:29). Policy entries for GET and PATCH `/tutor/settings` are 401 / 200 / 403 / NA / 403 (PolicyRegistry.java:101-105). The matrix covers both, and `SettingsWorldContributor` resets the seed row so the sample is never stale. There are no student handlers, so the no-`studentId` and owner-scoped-404 rules do not apply.
- **Must-change gate and CSRF:** IT:280-305 covers a must-change *tutor* getting 403 `PASSWORD_CHANGE_REQUIRED` on GET and PATCH, and a missing or forged CSRF token getting 403 `CSRF_INVALID`. Anonymous gets 401 and a student gets 403.
- **No mass assignment:** `SettingsRequest` has setters only for `version`, `displayName`, `defaultLocale` and `defaultTimeZone`. IT:139 sends `key`, `updatedBy` and `value` and shows they are ignored. `updatedBy` is not in the response.
- **Actor ID:** `Principal#getName()` (TutorSettingsController.java:57-58) resolves to `CurrentUser#getName()`, which is `userId.toString()` (CurrentUser.java:32-34, via `AuthenticatedPrincipal`). IT:198 asserts `updated_by` equals the tutor's ID. Using `Principal` avoids a settings → identity dependency, so it is justified.
- **`displayName` character rule:** the character check runs on the raw value before `strip()` (WorkspaceSettingsService.java:136-141). It covers C0, DEL and C1, U+200B–U+200F, U+202A–U+202E, U+2066–U+2069 and U+FEFF, and each class has a test (IT:146-155). NUL is rejected before it could reach jsonb. The length limit counts code points. One small gap is S4-1 below.
- **identity → settings edge:** `AccountService.createStudent` only copies `accountDefaults()` (locale and time zone) into the new student account. Neither the session DTO nor `CurrentUser` changed. Settings is still `allowedDependencies = "shared"`, so there is no cycle (ModularityTests green).
- **Logs:** the diff adds no log statements. Request logs show only the method, path and status.
- **Migration and seed:** V202611250001 is a new table: `key` is the primary key, `value` is jsonb NOT NULL, `version` is NOT NULL, and the seed row matches the `user_account` defaults. No existing constraint changes. FlywayMigrationTest checks the seed row and the upgrade path.
- **Files, rich text, URLs, new dependencies:** not affected by this PR.
- **Frontend:** the diff adds no `dangerouslySetInnerHTML` or `innerHTML`. The name is rendered as React text.

**Findings**

**S4-1 (advisory): the `displayName` rule misses some invisible and line-breaking format characters.**
- Where: backend/src/main/java/com/englms/settings/internal/WorkspaceSettingsService.java:32, and the matching documented list in docs/04-backend/validation-rules.md (the "workspace" table added in this PR).
- Scenario: the tutor PATCHes `{"version":n,"displayName":"LanU+2028Class"}` or `"LanU+2060"`. The first is a line separator; the second is a word joiner, which is zero-width. U+061C (Arabic letter mark, a bidi mark), U+00AD, U+180E and the tag characters U+E0000–E007F also get through. The request returns 200, and the value appears in the public sign-in page and the shells. It breaks the "one-line brand" or leaves invisible characters, which the rule is meant to prevent.
- Impact is low: only the single tutor can write this value, and React renders it as text. The code matches the documented list, so this is a gap in the rule, not in the code.
- Fix (for a later ticket or this PR): use `[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]`. `\p{Cf}` already includes U+200B–U+200F, U+202A–U+202E, U+2066–U+2069 and U+FEFF, and adds U+061C, U+2060–U+2064, U+00AD and the tag characters. Add one test per new class and update validation-rules.md.

**S4-2 (note, no change needed): `/meta` now does one database read per unauthenticated request.**
- Where: MetaController.java:36-40.
- Scenario: anyone can repeat `GET /api/v1/meta` and cause one primary-key lookup on `workspace_setting` per request, with no cache. That is cheap and no worse than other public endpoints. The behaviour is intended and documented ("one primary-key read per call, no cache"). Look at it again only if load or rate-limit work picks up `/meta`.

Key files:
- /home/deb/App_sources/eng-lms/backend/src/main/java/com/englms/settings/internal/WorkspaceSettingsService.java
- /home/deb/App_sources/eng-lms/backend/src/main/java/com/englms/settings/internal/web/TutorSettingsController.java
- /home/deb/App_sources/eng-lms/backend/src/main/java/com/englms/settings/internal/web/MetaController.java
- /home/deb/App_sources/eng-lms/backend/src/main/resources/db/migration/V202611250001__settings_workspace.sql
- /home/deb/App_sources/eng-lms/backend/src/test/java/com/englms/security/PolicyRegistry.java
- /home/deb/App_sources/eng-lms/backend/src/test/java/com/englms/settings/WorkspaceSettingsApiIntegrationTest.java

Not done: I did not run the full `./mvnw verify` (only the targeted suites above), the web or e2e suites, or a CVE scan (no dependencies were added). Re-read security.md §11, ADR-0005 and ADR-0016 if you need them; I worked from the checklist in the security-review skill.
