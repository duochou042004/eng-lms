# QA Report — T-M2.9 Students part 2 (guardians, tutor-private learning profile, rule extensions, credential stamp)
Verdict: PASS WITH MINOR · Build: `723b924` (`feature/T-M2.9-students-part-2`, PR #72) · Date: 2026-10-09 · Evaluator: independent QA subagent (fresh context, G3)

## Environment
- **App:** a jar built at `723b924`, run with `java -jar` on port 18080 (management 18081).
- **Database:** a separate PostgreSQL 18 container (`docker.io/library/postgres:18` on 127.0.0.1:55432), so the PO's dev data was not touched. All 6 migrations ran, including `202610090001` and `202610090002`. The tutor came from a bootstrap password file I generated in the scratchpad.
- **Login throttle:** after 30 of my own sign-ins the app answered 429 `RATE_LIMITED`, which is correct behaviour. I restarted with the config setting `--englms.security.login-throttle.max-attempts=100000`. No code was changed.
- **How I tested:** a small Python client (CSRF handshake, its own cookie handling), direct `psql` reads (stamp, remember-me tokens, sessions, rollback), and the operator reset through the jar's command line (`--englms.cli=reset-tutor-password`).
- **Automated runs on the same head:** `./mvnw -B -ntp verify -Dgroups=security`, then 20 back-to-back runs of the four named classes, stopping at the first failure.
- **No UI in this task (T-M2.5):** viewports, keyboard, axe and vi/en are N/A. The packet says no screenshots.
- **Independence:** the verdict comes from the packet, DEC-102/103/104, api-catalog, validation-rules, api-conventions, data-model and the running app. I read `StudentFields.java` and `application.properties` only after drafting the verdict, to pin down F1 and the S4-2 setting.

## AC results
| AC | Scenario(s) | Result | Evidence |
|---|---|---|---|
| AC1 | **Basic CRUD:** list starts empty. POST gives 201 with `Location: /api/v1/tutor/guardians/{id}` and the full guardian DTO. GET lists in insertion order. DELETE gives 204, a second DELETE gives 404. A new guardian goes last after a delete (positions not compacted). Deleting every guardian leaves an empty list. Unknown sid or gid gives 404 on all four methods.<br>**PATCH:** a missing field stays unchanged; `null` clears it. Name set to `null` or blank gives 422 `REQUIRED`. Missing `version` gives 422 `REQUIRED`, `-1` gives 422 `INVALID_VALUE`, a stale one gives 409 `STALE_VERSION`.<br>**Limits:** name 120 accepted, 121 refused. Relationship 40 accepted, 41 refused. Notes 2001 refused. Bad phone or email refused. NUL in name or notes gives `INVALID_FORMAT`; tab and newline in notes are accepted. An 11th guardian gives 422 `TOO_MANY` on `guardians`.<br>**Races:** 9 guardians plus 2 simultaneous POSTs, 15 rounds: always one 201 and one 422, ending with 10 rows. Two simultaneous PATCHes with the same version, 10 rounds: always one 200 and one 409. | PASS | `ac1.py`, `race.py` |
| AC2 | **Happy path:** creating a student with 3 guardians gives 201. Neither the response nor the student DTO includes guardians. The list comes back in request order, trimmed, with a blank relationship stored as `null`.<br>**Rollback:** a bad email at index 1 and an empty name at index 2 give 422 with `guardians[1].email INVALID_FORMAT` and `guardians[2].name REQUIRED`. Afterwards the username was still free (the same create then gave 201), and the database had no orphan guardians.<br>**Counts and shapes:** 11 guardians give 422 `TOO_MANY`; 10 give 201; 5,000 give a single `TOO_MANY`. `[]` and `null` give 201. A `null` element gives `guardians[0].name REQUIRED`.<br>**Duplicate username:** a duplicate username with guardians gives 409 and writes no guardians. | PASS | `ac2.py`, psql |
| AC3 | **Empty profile:** a never-edited student returns the exact empty profile with `version` `null`.<br>**First PUT:** with `version` `null` it gives 200 and `version` 1. Vietnamese text comes back unchanged. `["Ngữ pháp","từ vựng","NGỮ PHÁP","Từ Vựng","ngữ pháp"]` becomes `["Ngữ pháp","từ vựng"]`, keeping the first spelling.<br>**Version checks:** a second `null` PUT gives 409, and so does a PUT with no version. A full replace clears the fields left out. A stale or future version gives 409; so does a number before the first PUT.<br>**Race:** two simultaneous first PUTs, 10 rounds: always one 200 and one 409.<br>**Limits:** level 40/41, notes 2000/2001, a 41-character tag, a comma, empty/blank/null tags, 31 tags, labels empty or 61 characters, value 501, 31 custom fields, NUL and other control characters: all give 422 with the right field paths. 31 tags that deduplicate to 30 are accepted.<br>**404:** unknown sid on GET and PUT.<br>**Exception:** F1. | PASS (F1) | `ac3.py` |
| AC4 | No `SECRET`, guardian or profile value appeared in any response to students A, B or the must-change student (all six endpoints), nor in the `/student/**` paths I probed. The security run covers the rest: `IsolationTest` 20/20, `HarnessDetectionTest` 21/21. | PASS | `ac9.py`, `security.log` |
| AC5 | `StudentIsolationRulesTest` 3/3 in the security run. I did not inspect the fixtures myself. | PASS (test) | `security.log` |
| AC6 | `HarnessDetectionTest` 21/21, including the B-ID-without-dashes fixture; `IsolationTest` green. | PASS (test) | `security.log` |
| AC7 | **Tutor reset:** the stamp goes from 0 to 1. The old session gets 401 `SESSION_EXPIRED` at once. Session plus remember-me gets 401, and the remember-me cookie alone gets 401. No tokens remain. Sign-in with the temporary password works and requires a password change.<br>**Stamp raised by SQL, sessions left alive:** the session gets 401 `SESSION_EXPIRED`, and the next request with the same cookie is anonymous. With remember-me on a protected route it is also 401 `SESSION_EXPIRED`. Exactly that request's token is deleted (2 → 1), and both cookies are cancelled the same way `/auth/logout` does. Replaying the old remember-me cookie gives 401. A session signed in after the change works, and so does its new remember-me.<br>**Own password change:** the stamp does not change. The current session keeps working over 3 calls, and the other session (with remember-me) ends.<br>**Operator reset (CLI):** the tutor stamp goes from 0 to 1, and the old tutor session gets 401 `SESSION_EXPIRED`. The temporary password is not in any log.<br>**Stamp never shown:** no response body, header or the OpenAPI contract contains "stamp".<br>**Race:** student sign-in with remember-me against a tutor reset, 40 rounds. 32 sign-ins with the old password won the race, and none of them kept a usable session or token. | PASS | `ac7.py`, `ac7b.py`, race script, psql |
| AC8 | **Duplicates:** creating `QaDupZeta` when `qadupzeta` exists gives 409 `USERNAME_TAKEN`. Renaming to an existing username gives 409.<br>**Races:** 12 create races (each pair differing only in case) and 8 rename races: always one success and one 409.<br>**Log:** the log from these runs has 0 lines with any of the usernames, "already exists", "username_normalized" or "duplicate key". The only WARN all session is the expected startup warning about `forward-headers-strategy`. | PASS | `ac8.log` |
| AC9 | **Matrix:** for all 6 endpoints, anonymous gets 401 `UNAUTHENTICATED` (with or without a CSRF token). Student A, student B and a must-change student get 403 `FORBIDDEN_ROLE`. A must-change tutor (after the operator reset) gets 403 `PASSWORD_CHANGE_REQUIRED`. Refused writes changed nothing. `AuthzMatrixTest` 78/78.<br>**Log scan:** both app runs, searched for 10 guardian and profile values, have 0 hits. | PASS | `ac9.py`, log scan |
| AC10 | `-Dgroups=security` BUILD SUCCESS with 158 tests and 0 failures: AuthzMatrix 78, Isolation 20, HarnessDetection 21, StudentIsolationRules 3, AudienceVerifier 36. `check-docs.sh` PASS. `check-path-ownership.sh` PASS (65 files). `api/openapi.json` has the 3 paths and 6 operations. The traceability rows are present. `gate.sh` not re-run (see top). | PASS | `security.log` |
| ×20 | `CredentialStampTest` (8 tests), `GuardianCapRaceTest` (1), `LearningProfileFirstPutRaceTest` (1), `StudentCreateRaceTest` (3): 20 of 20 runs green, 0 failures or errors, about 70 s per run. | PASS | `x20.log` |

## Exploratory charter & notes (about 45 min)
The charter: get a guardian or learning-profile value into a student response or a log line, and keep a session alive across a tutor reset.
- **Student responses:** no `/student/**` handler exists yet; every probe gives 404. Tutor endpoints refuse students with an error body that repeats no data. Validation messages don't echo the input.
- **Logs:** request logs carry only the method, a path made of IDs, and the status. No values, usernames, stamps or temporary passwords.
- **Reset race:** 32 old-password sign-ins won the race and none survived. A remember-me token issued before a stamp change made only by SQL still signs in. That is the summary's documented limitation; a real reset deletes all tokens.
- **Search:** `q` does not match guardian name, relationship, email or phone, as the design notes say.
- **Paused and archived students:** guardian create, edit, list and delete, and profile PUT, all work.
- **Oversized or malformed input:**
  - 5,000 guardians or 20,000 tags each give one `TOO_MANY`.
  - Wrong JSON types and non-UUID path segments give 400 `MALFORMED_REQUEST`.
  - The all-zero UUID gives 404.
- **For SEC at G3:** a login racing the user's own password change can keep a session. The packet already states this; SEC decides.

## Findings
| ID | Sev | Summary | Steps to reproduce | Expected | Actual | Evidence |
|---|---|---|---|---|---|---|
| F1 | S3 | Profile strengths and weaknesses accept tab, line feed and carriage return, which the Tag rule forbids. DEL (U+007F) and C1 characters (e.g. U+0085) also get through. | `PUT /tutor/students/{sid}/learning-profile` with `{version, strengths:["a\nb"]}`, or `"x\ty"`, or `"a\rb"` | 422 `INVALID_FORMAT` on `strengths[0]`. validation-rules Tag rule: "1–40, no commas or control characters"; the packet's design notes say the same. | 200, and `"a\nb"` is stored. `\u0007` is refused correctly. Cause: `StudentFields.tags` (about lines 193–218) reuses the free-text check (`CONTROL` = C0 except tab/LF/CR), although its own javadoc says "no control characters". No test covers this. | `ac3.py` |
| F2 | S4 | `updatedAt` in a PUT or PATCH response has nanoseconds (`…418923813Z`); the GET that follows has microseconds (`…418924Z`). A client comparing them sees a change that didn't happen. The T-M2.3 student PATCH already does this; this task extends it to the profile. | PUT a profile, then GET it | The same instant in both | Different precision and rounding | `ac3.py` |
| F3 | S4 | A fractional or string `version` is quietly converted: `3.9` is treated as 3, `0.7` as 0, `"1"` as 1. validation-rules says "integer ≥ 0". This is the existing T-M2.3 student PATCH behaviour, now on the new endpoints too. | PATCH a guardian with `{version: 0.7}` | 400 or 422 | 200 | probe output |

Nothing out of scope was found: no first goal (DEC-102), no reorder endpoint, no audit rows, no student-visible profile.

## Accessibility summary (axe + manual)
N/A: no UI in this task (T-M2.5), so there were no keyboard, viewport (360/768/1280), loading/empty/error/offline or vi/en checks. API messages are English developer text; the i18n keys come with the UI.

## Isolation / privacy checks
- **Student B against A:** all six tutor endpoints give 403 to A, B and the must-change student. There is no student-scoped route yet, so B has no `/student/**` URL of A's to reach; the probes give 404.
- **`SECRET-*` scan:** I gave A's guardian and profile `SECRET-*` markers. None appeared in any non-tutor response: 30 endpoint responses, plus `/auth/session` and the `/student/**` probes. The harness scan (`IsolationTest`, `HarnessDetectionTest`, including B's ID without dashes) is green.
- **Logs:** no guardian or profile values, no usernames on duplicates or races, no stamps, and the operator's temporary password never appears.

Round 1 verdict (at `723b924`): PASS WITH MINOR

## Re-test log

### R1 — 2026-10-09 · Build `d6d2ee1` (fixes in `f7e0b37`) · same evaluator session (delta re-test)
**Setup:** a jar built at `d6d2ee1`, run with `java -jar` on port 18080 against a fresh, separate PostgreSQL 18 container (127.0.0.1:55432) with a bootstrap tutor. The login-throttle setting was raised as in round 1 (config only). Students A, B and a must-change student were created again. The code was read only to confirm the fix scope from the summary; no code was changed.

| Finding | Result | Re-test evidence |
|---|---|---|
| F1 (S3): tags accepted control characters | **FIXED** | `PUT …/learning-profile` with `["ok", <tag>]` on both `strengths` and `weaknesses`, for 11 control-character cases: `a\nb`, `x\ty`, `a\rb`, `\u0007`, DEL `\u007f`, C1 `\u0085`, `\u0080`, `\u009f`, a leading tab, a trailing LF, NUL. All 22 return 422 `INVALID_FORMAT` on `strengths[1]` / `weaknesses[1]`.<br>Nothing over-blocked: `["Ngữ pháp","Từ vựng","a b","C++ & co.","İ","日本語","😀"]` gives 200 unchanged, and `" trim me "` is stored as `"trim me"`. Free text still accepts tab and LF in `learningNotes` and in guardian `notes`. |
| F2 (S4): write response `updatedAt` differed from the next read | **FIXED** | 15 rounds of 4 writes each, every response compared with the following GET: profile PUT, guardian POST then PATCH, student PATCH, student create. 60 of 60 identical, timestamps at microseconds (e.g. `…12:33:51.924732Z`). The `ac3` check "GET equals PUT response" (FAIL in round 1) now passes. |
| F3 (S4): lenient `version` coercion | **OPEN, routed by the LC** (not part of T-M2.9; the behaviour predates this task, from T-M2.3) | Not re-tested |

**No-regression smoke, black-box at `d6d2ee1`:**
- **AC1:** 24 of 24 checks pass (CRUD, field rules, 404s, 409 stale, `TOO_MANY`, deleting the last guardian). The cap race passes 15 of 15 rounds (one 201, one 422, 10 rows). The two-PATCHes-same-version race passes 10 of 10 (one 200, one 409).
- **AC2:** 15 of 15 checks pass (create with guardians, request order, rollback on a bad guardian with `guardians[i].*` paths, username still free afterwards, 10/11 limit, duplicate username writes no guardians).
- **AC3:** 16 of 16 checks pass (empty profile with `version` `null`, first PUT, case-insensitive dedup, 409 for a second `null` PUT, an absent version and a stale number, replace semantics, 404s). Two simultaneous first PUTs pass 10 of 10 (one 200, one 409).
- **AC7:**
  - **`ac7`:** 22 of 23 checks pass. The one FAIL ("its remember-me token deleted → (0, 0)") is the known defect in my script from round 1: it counts tokens by the wrong column. `ac7b` checks the same thing correctly and passes (exactly one token fewer).
  - **`ac7b`:** 5 of 5 checks pass. A tutor reset raises the stamp, and the old session and its remember-me are refused at once. A stamp raised directly in the database gives 401 `SESSION_EXPIRED`, cancels both cookies and deletes only that token; a sign-in after the change still works. The user's own password change keeps the stamp and the current session and ends the other sessions. "stamp" appears in no response.
  - **Sign-in vs tutor reset race:** 30 rounds; 27 sign-ins with the old password won the race, and none kept a usable session or remember-me token.
- **AC9 (extra):** 26 of 26 checks pass (all 6 endpoints: anonymous 401; students A and B and the must-change student 403). No `SECRET-*` marker in any non-tutor response.
- **App log scan:** no guardian or profile values, no usernames on duplicates, and no `SECRET-` markers. Apart from `@timestamp`, the only "stamp" is Flyway's migration name. The only WARN is the expected `forward-headers-strategy` startup warning.

**Automated runs at `d6d2ee1`:**
- **Security group:** `(cd backend && ./mvnw -B -ntp verify -Dgroups=security)` BUILD SUCCESS, 158 tests, 0 failures, 0 errors.
- **×20:** `CredentialStampTest`, `GuardianCapRaceTest`, `LearningProfileFirstPutRaceTest`, `StudentCreateRaceTest`, in a loop that stops at the first failure: 20 of 20 runs green (8, 1, 1 and 3 tests per run, 0 failures or errors in all 20).

**Result:** F1 and F2 are fixed and verified; F3 stays an open S4, routed by the LC outside T-M2.9. There are no new findings and no regressions. With the round 1 findings fixed or routed, the verdict moves from PASS WITH MINOR to PASS.

QA-VERDICT T-M2.9: PASS
