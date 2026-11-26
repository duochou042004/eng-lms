# T-M2.7 security review (security-reviewer, parts A and B; recorded by the LC)

SEC-REVIEW T-M2.7: APPROVED (S4-1, S4-2 non-blocking; re-confirmed on e2bfd78, only an evidence file removed since the review head 9fbc6c4)

Head reviewed: the PR #240 head at review time (`origin/develop...HEAD`, b79f986 base). No S1, S2 or S3.

## Findings
- **S4-1 (OQ-2 weighed):** a successfully read body can reach the logs at DEBUG (`AbstractMessageConverterMethodArgumentResolver` logs it
  through `toString()`) if an operator sets `org.springframework.web` to DEBUG in production. Not reachable by default (`application.properties`
  sets no DEBUG logger); the credential DTOs already drop the password in `toString()`; `deployment.md:46` names the rule. Fix later: a prod
  startup guard against DEBUG/TRACE on those loggers, or pin `org.springframework.web.servlet.mvc.method.annotation` to INFO.
  **LC: a backlog follow-up, recorded in the records PR.**
- **S4-2:** `RedactedJsonReadErrorsConfiguration.java:63-68` keeps no cause chain, so a 400's log shows only the Jackson exception's simple
  name (no field path). The intended trade; optional: the JSON path without values. **LC: no change.**

## Verified
- Part A: `StudentAccountController` takes only a bare `CurrentStudent me`; `@Audience(STUDENT)` in `students.internal.web.student`;
  `StudentService.account(UUID)` loads only the caller's row (404 if missing); the DTO has exactly `fullName`, `username`; `PolicyRegistry`
  401/403/200/NA/403; must-change 403, archived 401 and `no-store` asserted; `api/openapi.json` lists no parameters for the path (the
  `addRequestWrapperToIgnore(CurrentStudent.class)` fix, asserted in `OpenApiContractTest`); no new log statements; web: `routes/account/*`
  imports nothing from `routes/settings`, `studentAccount.ts` sends no ID, the query key is cleared on sign-out (`app/guards.ts`).
- Part B: the customizer runs after Boot's `@Order(0)` one and replaces only the server JSON converter, built on the same `JsonMapper`, so the
  strict scalars and `maxDocumentLength` still apply everywhere; each read error is wrapped once (spring-web 7.0.10 bytecode); the 400
  `MALFORMED_REQUEST` body is unchanged; `MismatchedScalarLoggingTest` proves the values never appear with DEBUG on.

## Ran
`StudentAccountApiTest` 3, `MismatchedScalarLoggingTest` 2, `StrictJsonScalarsApiTest` 19, `StrictJsonIntegersConfigurationTest` 26,
`AuthApiIntegrationTest` 59, `AuthzMatrixTest` 94, `IsolationTest` 24, `StudentIsolationRulesTest` 3, `AudienceVerifierTest` 36,
`OpenApiContractTest` 1, `ProblemDetailsAdviceTest` 3: 270 tests, 0 failures. Not run: gate, E2E, full verify.
