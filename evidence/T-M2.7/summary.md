# T-M2.7 summary: Student Home v0, the student Account page, the M2 S4s, the M2 gate (parts A–D)

Branch `feature/T-M2.7-student-home-account` · packet `docs/tasks/T-M2.7-student-home-account.md` · tier H · gate PASS on `023da0d`
(13 steps, 1157 s, `gate-20261126T104302Z.log`; the e2e repeat ×3 ran `shells.spec.ts` and `student-home-account.spec.ts`).

## AC → proof
| AC | Proof |
|---|---|
| AC1 | `StudentAccountApiTest`: `everyCallerKindGetsItsAnswer` (anonymous 401 `UNAUTHENTICATED`, tutor 403 `FORBIDDEN_ROLE`, ACTIVE and PAUSED 200, must-change 403 `PASSWORD_CHANGE_REQUIRED`, archived old session 401 `SESSION_EXPIRED`, `no-store` on each); `eachStudentReadsOnlyTheirOwnNameAndUsernameAndNothingElse` (two students, exactly `{fullName, username}`); `aRenameByTheTutorIsSeenOnTheNextRead` |
| AC2 | `PolicyRegistry` `GET /api/v1/student/account` 401/403/200/NA/403; `AuthzMatrixTest`, `IsolationTest` (secret scan), `HarnessDetectionTest`, `StudentIsolationRulesTest` (rules 3, 4), startup verifier green; handler `students.internal.web.student.StudentAccountController`, only `CurrentStudent me`. **Red once:** without the entry `AuthzMatrixTest.everyHandlerMappingHasARegistryEntryAndEveryEntryAMapping` → `Expecting empty but was: ["GET /api/v1/student/account"]` |
| AC3 | `time.test.ts` `dayPeriod` edges 03:59/04:00/11:59/12:00/17:59/18:00 in Asia/Ho_Chi_Minh and America/Los_Angeles; `StudentHome.test.tsx` (fake Date, `<p>` greeting, one `h1`, vi/en); E2E `student-home-account.spec.ts` AC3 with `page.clock.setFixedTime` on fresh students (sáng in HCM, tối in LA, en) |
| AC4 | unit pending and 500; E2E held-then-500 (only that 500 accepted by the console guard) and offline (0 requests offline, the name returns online) |
| AC5 | unit sheet at 360 and popover at 1024 (Account above Change password, overlay closes, `h1` focused), tutor has no link; E2E from Home and the shell 404, nav stays Home |
| AC6 | `StudentAccountPage.test.tsx` (9 tests: dl, skeleton, block error + Retry focus never `<body>`, changed-only body, 422 → summary focus, failed save → `InlineAlert`, guard, no Display name, Change password link); E2E AC6 |
| AC7 | `AccountSettingsPage.test.tsx`, `accountForm.test.ts` unchanged and green; `settings-account.spec.ts` green |
| AC8 | E2E real save on a fresh student: body `[{timeZone}]`, `GET /auth/session` shows it, Home then greets "buổi tối" |
| AC9 | E2E 360/768/1280, 120-character name (`expectNoMidWordBreak`), 40-character username (validation cap 40, not 50); `expectSettledAccessible` on default, error, long data; ComboBox open with only the DEC-191 rule off; i18n completeness covers `account` |
| AC9a | step log ≤ 2 (`ac9a-account-steps`); `shells.spec.ts` F0 and language step records green |
| AC10 | gate PASS once on `023da0d` (above); CI on the PR head |
| AC11 | `MismatchedScalarLoggingTest` (DEBUG on `org.springframework.web`, `com.englms`; numeric password `987654321`, numeric username, boolean workspace `displayName`; 400 body unchanged; DEBUG lines written; no value). **Red before the fix:** the DEBUG lines held `Cannot coerce Integer value (987654321)…` and `Cannot coerce Boolean value (true)…`. Fix `shared.web.RedactedJsonReadErrorsConfiguration`. B2 `deployment.md` `LOGGING_LEVEL_*` row; B3 the `displayName` `@Schema` names `shared.Names`; contract regenerated, contract-drift green |
| AC12 | C1 TagInput two failed submits with the identical message (fails on the old code); C2 `findByRole(..., { timeout: 5000 })`; C3 vi "Không có lựa chọn nào." from the live announcer, en unchanged; C4 `workspaceForm.test` " Lan " vs "Lan" → no change |
| AC13 | part D: after the PO-approved regression run and QA (`evidence/M2/qa/report.md`, records PR) |

## The extended kept assertion
`shells.spec.ts` AC4 "the same visual kind": the student's Account link is compared with Log out, and the tutor asserts no Account link (a
9-line addition; nothing else in the file changed).

## Deviations and LC rulings
- BE D1 (L-10): springdoc listed `CurrentStudent me` as a required query parameter `me` (`{studentId, userId}`) in the contract: fixed in
  `shared.web.OpenApiConfiguration` (`addRequestWrapperToIgnore`), `OpenApiContractTest` checks it (red without it). **In scope** (the packet's
  "harness fix needed for this handler"; ADR-0016).
- BE D2: every JSON body read error is logged without its content (syntax errors quote tokens too): accepted. OQ-2 (DEBUG logs read bodies
  through `toString()`): no code change, B2 rules production; for SEC.
- FE: the name block uses the house `DescriptionList` (two columns at a container ≥ 32rem, about 25/75); the student shell gained the
  `ToastRegion` for "Đã lưu", above the bottom tabs below 768 px (documented by the LC in interaction-states §4); strings in a new `account`
  namespace; the Workspace tab's time-zone strings followed the namespace move (`b078c69`, a unit test seen red; only E2E had caught it).
- LC: the T-M2.6 ComboBox case in `DevUiPage.test.tsx` had the C2 flake once under full-suite load: the same 5000 ms polling bound (`023da0d`).

## Self-check (FE)
UI rules met (deviations above); long data with `expectSettledAccessible`/`expectNoMidWordBreak` on both screens; `expectFocusNotLost` after
Save and Retry; polling assertions, each new check seen failing; vi verbs and heading order; docs in sync. Bundle: student 196.2 KB gz of 200,
tutor 195.9 of 300. Screenshots local (`impl/`, not committed).

## G3 cost table
| Agent | Tokens | Duration |
|---|---|---|
| backend-implementer | 155,559 | 19.5 min |
| frontend-implementer | 232,903 | 40.5 min |
| security-reviewer | pending | |
| qa-evaluator (UX checklist) | pending | |
