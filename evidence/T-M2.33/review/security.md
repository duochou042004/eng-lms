# Security review: T-M2.33 (recorded by the LC from the fresh security-reviewer's returned text; raw invisible characters as U+XXXX)

## Round 1 (head `9c46f7d`)

SEC-REVIEW T-M2.33: APPROVED (one S3 to fix in this task, per quality-gates §S3: cheap and no new behaviour; plus three S4s)

I reviewed PR #235 at head 9c46f7d (`git diff origin/develop...HEAD`, 34 files; main-code changes are in 4 Java files plus web/src/lib/names.ts and the two form modules). The tree is clean of tracked changes afterwards (`git status` shows only the untracked evidence dirs that were already there).

**Tests run (fresh, all green):** LoginBindingThrottleApiTest 1, StrictJsonScalarsApiTest 19, StrictJsonIntegersConfigurationTest 26, NamesTest 41, NameRuleApiTest 146, AuthApiIntegrationTest 59, AuthzMatrixTest 90, IsolationTest 23, StudentIsolationRulesTest 3, ArchitectureRulesTest 6. I did not run the full gate.

## Findings

**S3-1: quadratic-time regex in `Names.strip` lets one request pin a CPU core for tens of minutes (a regression from the linear `String.strip()`).**
- Where: /home/deb/App_sources/eng-lms/backend/src/main/java/com/englms/shared/Names.java:18 and :31. The pattern is `^[\p{javaWhitespace}\p{Z}]+|[\p{javaWhitespace}\p{Z}]+$`, run with `replaceAll`.
- Callers: AccountService.java:254 and WorkspaceSettingsService.java:139.
- Why it is slow: for an interior run of spaces, the second branch is tried at every start position in the run. Each try scans to the end of the run and then fails at `$`, so the cost is O(n²).
- Why nothing stops it: spaces pass `firstForbidden`, and `TOO_LONG` is only checked after the strip.
- Measured on JDK 25 with `"a" + " ".repeat(n) + "b"`:

  | n | time |
  |---|---|
  | 10k | 0.31 s |
  | 20k | 1.2 s |
  | 40k | 4.8 s |
  | 80k | 18.8 s |

- Exploit: send `PATCH /api/v1/auth/preferences` or `PATCH /api/v1/tutor/settings` with `{"displayName":"a<~1,000,000 spaces>b"}`. The 1 MB JsonLimitsConfiguration cap allows this, and it extrapolates to about 45–50 minutes of CPU per request. A handful of parallel requests saturates every core of the single Podman host and holds Tomcat threads.
- Who can do it: only a tutor session with CSRF (students return INVALID_VALUE before `Names` runs). So the attacker is a stolen tutor session or a misbehaving tutor script, and the impact is availability only.
- Fix: replace the regex with a code-point loop from both ends, testing `Character.isWhitespace(cp) || Character.isSpaceChar(cp)`. That is linear and mirrors `stripName` in web/src/lib/names.ts. Add one test with a body of about 500k interior spaces that finishes under a bound such as 1 s, or 422s `TOO_LONG` quickly. The existing NamesTest/NameRuleApiTest strip rows must stay green. (A possessive `++` does not fix it.)

**S4-1: a numeric credential's value can now reach the DEBUG log.**
- The pre-existing issue (DEC-186 SEC S4-1) now extends to the credential fields.
- I confirmed with jackson-databind 3.1.7 that `{"password":987654321}` raises "Cannot coerce Integer value (987654321) to `java.lang.String` value … (through reference chain: …["password"])". Spring puts this into the HttpMessageNotReadableException message, which the resolvers log only at DEBUG.
- Before this PR a numeric password was coerced silently and never appeared in a message.
- Not exposed by default: the 400 body sets `detail` to null (ProblemDetailsAdvice handleExceptionInternal), INFO logs only "POST /api/v1/auth/login -> 400" (RequestIdFilter), and no DEBUG level is set in application.properties.
- Recommendation: widen the existing follow-up row so it explicitly covers the sign-in body. Either turn off the value quoting or redact the mismatch message before any log, and never enable DEBUG for org.springframework.web in production.

**S4-2: leftover orphaned Javadoc comments.** The pattern constants they documented were removed, so the comments now attach to the next field and are misleading.
- /home/deb/App_sources/eng-lms/backend/src/main/java/com/englms/identity/internal/app/AccountService.java:57 ("C0 control characters other than tab…")
- /home/deb/App_sources/eng-lms/backend/src/main/java/com/englms/settings/internal/WorkspaceSettingsService.java:32 ("Any control character…")
- These are hygiene only. Delete them along with the S3-1 fix.

**S4-3 (client only; the server is the authority): the two forms compare the saved name differently.**
- /home/deb/App_sources/eng-lms/web/src/app/routes/settings/workspaceForm.ts compares `stripName(v) === savedName` without stripping the saved name. accountForm.ts strips both sides.
- No security impact: the server checks every name that is sent. Noted only for consistency.

## Checklist (security.md §11 and the brief's focus)

- **Sign-in body and throttle:** OK.
  - `LoginRequest(String, String, Boolean)` (AuthController.java:169) fails at binding, before `AuthenticationService` (`throttle.tryAcquire` at :98).
  - No user lookup, bcrypt or audit runs on a 400, so the response and timing do not depend on the username: no enumeration or timing oracle (T16).
  - The 400 evaluates no guess, so uncounted 400s give an attacker nothing; every real guess is still a well-typed body and is counted (T5).
  - LoginBindingThrottleApiTest proves it: limit + 1 numeric attempts are all 400, then 0 audit rows, `failed_login_count` 0, and the correct sign-in returns 200.
- **No value echo:** OK. The 422 FieldProblem message is "Invisible or control character U+XXXX is not allowed". The 400 problem has detail null. INFO logs show only the method, path and status. The DEBUG case is S4-1.
- **Reach of the coercion config:** acceptable.
  - It applies to the Spring-managed JsonMapper, which deserializes request bodies.
  - AuditService only serializes with that mapper. Hibernate's JSON columns (LearningProfile.customFields, Student) use Hibernate's own format mapper.
  - The only request field with a string-or-number shape, CustomField(String label, String value), is sent as strings by the web client.
  - The full gate on c02ade1 is green; OpenAPI is unchanged.
- **`com.englms.shared.Names`:** correct.
  - It matches by code point. I verified: a lone U+D800 or U+DC00 gives U+D800/U+DC00; the pair U+DBFF U+DFFF (a private-use code point, category Co) is not matched; U+E0041 is found as one code point; a name sent as U+00A0 + "Lan" + U+202F strips to "Lan"; `codePoint()` prints 4–6 upper-case hex digits. [LC note: U+10FFFF is a noncharacter, category Cn, not Co; the conclusion holds.]
  - The only issue is the strip's cost (S3-1).
  - The client twin web/src/lib/names.ts uses the same classes with the `/u` flag, a linear strip, and the same whitespace set as Java (no U+0085, U+FEFF kept).
- **Trojan source:** OK. I scanned every changed file for Cf, Cs, Zl, Zp, Co and Cc other than tab: 0 hits. The test literals use escapes (7b28649).
- **Authz matrix, isolation and ADR-0016 audience DTOs:** unchanged.
  - No handler, controller, `@Audience` or DTO is in the diff, and no `studentId` was added.
  - The matrix, isolation and ArchUnit suites are green.
- **Files, sanitiser, URLs:** not touched.
- **Migrations:** none.
- **New dependencies:** none.

I did not check the e2e spec rewrites line by line beyond the invisible-character scan, or the web unit tests. I extrapolated the 1 MB S3-1 timing from the 10k–80k runs instead of running it. Merge risk: S3-1 should be fixed before the merge, because one tutor-session request can tie up the host's CPU.

SEC-REVIEW T-M2.33: APPROVED

## Confirmation (head `bee7fce`)

S3-1 (quadratic `Names.strip`) fixed as AC10 in `b18ea19`: a linear code-point walk; `NamesTest` 42/42, `NameRuleApiTest` 146/146; S4-2 fixed; S4-1 and S4-3 batched to the T-M2.7 row (DEC-202).

SEC-REVIEW T-M2.33: APPROVED
