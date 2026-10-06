# T-M2.2: Authorization matrix + student-isolation harness

| Field | Value |
|---|---|
| Milestone | M2 |
| Status | draft (G0 pending: DOCS-REVIEW, PO start signal) |
| Owner role | BE (backend-implementer; SEC review at G3) |
| Branch | `feature/T-M2.2-authz-isolation-harness` (from `develop`) |
| Depends on | T-M2.1 (merged, `a93bcc1`, DEC-093) |
| Estimate | 1.5 agent-days |
| Trace | SPEC §26, §37; NFR-SEC-01, NFR-SEC-02, NFR-SEC-03; ADR-0016; security.md §2 (T1, T2, T11), §4, §11.1; test-strategy §1, §2, §4 (rules 3, 4); api-conventions §1, §9 (every handler has `@Audience` and a matrix entry); api-catalog "auth, meta"; module-boundaries (shared); DEC-093 (hand-over); evidence/T-M2.1/summary.md "Endpoints T-M2.2 must register" |

## Goal
Isolation becomes structural and mechanically tested before the first student or tutor endpoint exists (ADR-0016). Every handler carries an `@Audience`
that a startup verifier checks against its path namespace; every handler has an entry in a test-side policy registry; an authorization-matrix test
calls every handler as each actor and fails the build for any handler without an entry; an isolation harness with a fixture world (tutor, students A, B, C)
scans every student-reachable response for B's identifiers and `SECRET-*` markers; ArchUnit enforces the student rules. The four T-M2.1 auth endpoints and
`/meta` are registered. Later packets only add annotations, registry entries and fixture rows (authz-isolation skill).

## Scope
- In:
  1. **`@Audience`** (`com.englms.shared.web`): values `TUTOR`, `STUDENT`, `PUBLIC`, `AUTHENTICATED` (ADR-0016 §5); on the handler method or its class (method wins).
     Annotate `AuthController` (`session`, `login`, `logout`: `PUBLIC`; `password`: `AUTHENTICATED`; per api-catalog) and `MetaController` (`PUBLIC`).
     **`@TutorPrivate`** (same package; marks a type or field holding private tutor data, NFR-SEC-02), used by the ArchUnit rule of AC5; no production use yet.
  2. **Startup verifier** (L2, security.md §4): at startup, enumerates `RequestMappingHandlerMapping` and refuses to start (an exception naming every offending
     handler) when the rules of AC2 are broken.
  3. **Policy registry** (test sources, `com.englms.security`): one entry per handler mapping (HTTP method + path pattern) with a sample request (path
     variables, body; CSRF added by the harness for unsafe methods) and the expected status for each actor: anonymous, tutor, student A, student B on A's
     resource, and a must-change student. Entries for the five live mappings (AC3).
  4. **Authz-matrix test** (`@Tag("security")`): completeness check (registry keys = live mappings, both directions) and the per-actor calls (AC3, AC4).
  5. **Isolation harness** (`@Tag("security")`): the fixture world of test-strategy §2 as far as identity exists today (tutor; students A and B `ACTIVE`;
     C `DISABLED`; the must-change student), an extension point for later modules to add A-owned and B-owned resources and `SECRET-*` markers, and the
     response scan (AC6, AC7).
  6. **ArchUnit student rules** (test-strategy §4 rules 3 and 4, `@Tag("security")`), proven against test-only fixture classes (AC5).
  7. Docs and the authz-isolation skill updated to the as-built names and commands.
- Out of scope (explicit):
  - Any new endpoint, and any change to the behaviour of the existing ones (statuses, bodies, headers) or to the L1 URL gate.
  - `CurrentStudent` and its argument resolver, `findByIdAndStudentId` repositories, student-owned resources and their fixture rows (T-M2.3, which creates the
    `students` module and the first `/api/v1/tutor/**` handlers; first `/api/v1/student/**` handlers later in M2/M3).
  - `FileAccessResolver` (files, M3+). Answer-key release scans (activities, M5).
  - Repository secret scanning (gitleaks is CI's `secrets-scan`, unchanged). "Secret scan" here is the response scan of NFR-SEC-02.
  - Login racing a disable (SEC S4-1 → T-M2.3); any UI.

## Guardrail answers (scope.md §6)
1. **Trace:** NFR-SEC-01..03, ADR-0016, security.md §4 and the T-M2.1 hand-over (DEC-093); nothing else.
2. **Drift toward excluded scope?** No. Test harness and one annotation-checked startup rule; no feature.
3. **Mandatory setup added?** None.
4. **Weekly use?** Indirect: it protects every student session (the M2 exit criterion "harnesses fail on any unregistered endpoint").
5. **Hard-coded semantics?** None. Audiences are platform roles; no curriculum or exam data.

## Design notes
- **Packages:** `com.englms.shared.web.Audience`, `com.englms.shared.web.TutorPrivate`, the verifier in `com.englms.shared.web` (shared is open; it reads only
  Spring MVC metadata, no module's business rules; module-boundaries "shared" lists `Audience` and is amended to the four values). Test harness in
  `backend/src/test/java/com/englms/security/` (registry, matrix test, world, isolation test); ArchUnit fixtures under `backend/src/test/java/fixture/archunit/`
  (outside `com.englms`, like the existing `fixture.modulith`).
- **Namespace rules** (the verifier, AC2): a handler is in scope when its bean class is in `com.englms..` or any of its patterns starts with `/api/`.
  `/api/v1/tutor/**` → `TUTOR` only; `/api/v1/student/**` → `STUDENT` only; `/api/v1/auth/**` → `PUBLIC` or `AUTHENTICATED`; `/api/v1/meta` → `PUBLIC`;
  `TUTOR`/`STUDENT` outside their prefix, any other `/api/**` prefix, or a `com.englms` handler outside `/api/**` → error. `PUBLIC` is allowed only where
  the L1 gate permits anonymous access (today `/api/v1/auth/**` and `/api/v1/meta`). Third-party handlers outside `/api/**` (Boot's `/error`; springdoc's
  `/v3/api-docs` when enabled) are ignored. A handler with several patterns must satisfy the rule for each.
- **Registry shape** (latitude: a Java class or a test resource; one place): key `METHOD /path/{pattern}` as Spring reports it; expected status per actor
  as a single code. "Student B on A's resource" applies only to entries whose sample request names a student-owned resource; otherwise the entry marks it
  not applicable and B is not called. Sample requests must not leave state the per-test fixture reset does not clear.
- **Expected statuses for the live mappings** (from T-M2.1, AC3): `GET /api/v1/auth/session` anonymous 401, tutor/student/must-change 200;
  `POST /api/v1/auth/login` (sample: the acting user's own valid credentials; anonymous uses student A's) 200 for anonymous/tutor/student, 403 for the
  must-change student; `POST /api/v1/auth/logout` 204 for all; `POST /api/v1/auth/password` (sample: correct current password, a too-short new password)
  anonymous 401, others 422; `GET /api/v1/meta` 200 for all. `HEAD /api/v1/meta` is covered by T-M2.1's test and is not a separate mapping.
- **Isolation scan** (AC6): for every registry entry whose expected status for student A is 2xx, call it as A and search the response body and headers
  (case-insensitive) for each of B's identifiers (user ID, username; later: every B-owned resource ID the world contributes) and for the pattern
  `SECRET-[A-Z0-9-]+`. Tutor identifiers are not scanned (the tutor's name is not private). Login responses legitimately echo A's own data.
- **Extension point:** an interface (e.g. `IsolationWorldContributor`) that later modules implement in test sources to insert A-owned and B-owned rows
  and declare their IDs and secret markers; the harness picks implementations up from the classpath or the Spring test context (latitude).
- **ArchUnit rule 3** needs parameter names: Boot's parent compiles with `-parameters`; the rule may use reflection where ArchUnit lacks names.
  Rules over packages that are empty today use `allowEmptyShould(true)` and are proven against the fixtures.
- **Test tagging:** matrix, isolation and the student ArchUnit rules carry `@Tag("security")`, so `./mvnw -B verify -Dgroups=security` runs them alone;
  they also run in the normal `verify` (gate and CI).

## Acceptance criteria
- AC1 (NFR-SEC-03, ADR-0016 §5): `@Audience` exists with the four values; the five live handler methods carry the audiences listed in Scope 1;
  `@TutorPrivate` exists (type and field targets, runtime retention).
- AC2 (security.md §4 L2): the application refuses to start, naming each offending handler, for each of: a handler without `@Audience`; `STUDENT` on a
  `/api/v1/tutor/**` path; `TUTOR` on `/api/v1/student/**`; `TUTOR` or `STUDENT` on `/api/v1/auth/**`; `PUBLIC` on a path the L1 gate does not open;
  a `com.englms` handler under an unknown `/api/**` prefix or outside `/api/**`. The real application starts. Each case is proven by a test context with a
  test-only controller.
- AC3 (NFR-SEC-03): the policy registry has entries for exactly the five live mappings with the statuses in the design notes, and the matrix test makes
  every call (each actor signed in through `POST /api/v1/auth/login`, CSRF for unsafe methods) and asserts each status.
- AC4 (NFR-SEC-03, M2 exit criterion): the completeness check fails, naming the mapping, when a handler mapping has no registry entry, and also when a
  registry entry has no live mapping. Proven by a test that adds a test-only controller to the context (missing entry) and one with a stale entry.
- AC5 (test-strategy §4 rules 3, 4): ArchUnit rules fail for a `..web.student..` handler method with a parameter named `studentId` or a `@PathVariable`
  whose name ends in `StudentId`, and for a `..web.student..` class depending on `com.englms.notes..`, a `LearningProfile*` type or a `@TutorPrivate` type;
  each failure is proven against a fixture class under `fixture.archunit`, and the rules pass on `com.englms`.
- AC6 (NFR-SEC-01, NFR-SEC-02): the isolation test builds the world (tutor; A and B active; C disabled; a must-change student), signs in as A and scans
  every A-reachable registry entry as in the design notes; it passes today. A meta-test proves detection: a test-only student-audience handler that
  returns B's user ID, and one that returns a `SECRET-` marker, each make the scan fail naming the endpoint and the hit.
- AC7 (ADR-0016 §3): for an entry with a student-owned sample resource, the harness calls it as B on A's resource and expects 404; proven with a
  test-only fixture handler and contributor (no production resource exists yet). C (disabled) cannot sign in (401), so C is never an acting student.
- AC8 (api-conventions §9, authz-isolation skill): `./mvnw -B verify -Dgroups=security` runs the matrix, isolation and student ArchUnit tests and is
  green; the full `./mvnw verify` and `./scripts/gate.sh` are green; no existing test changed except to add `@Audience` expectations.

## Test plan
- Implementation: unit tests of the verifier's rules on synthetic mappings plus context-start tests (AC2); the matrix test against the real app on a random
  port with PostgreSQL (Testcontainers or CI's database), fixtures reset per test (AC3); completeness meta-tests (AC4); ArchUnit rules + fixture classes
  (AC5); isolation scan + meta-tests (AC6, AC7). Reuse `IdentityFixtures` and the `Browser` test client from T-M2.1 rather than a second client.
- Authz/isolation: this task is the harness; its own registry entries are AC3.
- Timing: none of these tests measures time; no ×20 repeat set needed (qa-protocol §3) unless the implementer adds one.
- Independent QA focus: add a throwaway unannotated controller and an unregistered one on a scratch copy and confirm the startup failure and the matrix
  failure (then discard); check that the registry statuses match black-box calls with curl for all five mappings × five actors; confirm `-Dgroups=security`
  runs the three suites and that the meta-tests really fail when the detection is broken (e.g. scan pattern emptied). Exploratory: multi-pattern handlers,
  class-level vs method-level `@Audience`, `HEAD`/`OPTIONS` on `/meta`.
- SEC (triggered: `shared.web`, identity controllers, security harness): review the namespace rules against security.md §4 and ADR-0016, the scan's
  coverage (body and headers, case), and that nothing weakens the L1 gate.

## Evidence required
- `evidence/T-M2.2/summary.md` (implementation section: AC → proof table, commands, results, limitations), gate log, the `-Dgroups=security` run log.
- QA report (`evidence/T-M2.2/qa/report.md`, via a `qa/T-M2.2` PR) and SEC review (`evidence/T-M2.2/review/security.md`, via the merge-record PR).
  No screenshots (no UI change).

## Docs to update
- security.md §4 (L2 verifier rules as built; registry location), §11.1 wording if needed; test-strategy §2 (fixture world location, C = disabled account
  until the students module adds archived), §4 (rules 3 and 4 implemented, `@Tag("security")`); module-boundaries "shared" (`Audience` four values,
  `TutorPrivate`, verifier; `CurrentStudent` still to come in T-M2.3); api-catalog line 6 (registered); traceability-matrix row 37;
  `.claude/skills/authz-isolation/SKILL.md` (as-built class names, registry location, contributor interface); `progress.json`.

## Risks & assumptions
- Assumption: Spring MVC reports `HEAD` implicitly for `GET` mappings and Boot's `/error` is outside `/api/**`; the verifier ignores both as described.
- Risk: the matrix grows to handlers × 5 actors of signed-in calls; each actor signs in once per test class (bcrypt cost 12), not per call.
- Risk: login samples could trip the per-IP throttle or lockout; the fixture reset and the throttle's test configuration must keep runs independent.
- Split line (if > 2 agent-days): AC6/AC7 (isolation harness) can move to a follow-up packet before T-M2.3 merges; AC1–AC5 and AC8 stay.

## Commands (reproducible)
```bash
source ~/.sdkman/bin/sdkman-init.sh && source ~/.nvm/nvm.sh
(cd backend && ./mvnw -B -ntp verify -Dgroups=security)
(cd backend && ./mvnw -B -ntp verify)
ENGLMS_TASK=T-M2.2 ./scripts/gate.sh
```
