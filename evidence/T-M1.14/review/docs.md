# DOCS-REVIEW record: T-M1.14 packet (PR #28)

> Recorded by the LC from the fresh docs-reviewer's returned reports (the harness blocks subagents from writing files). Scratch paths are the reviewer's session scratchpad.

| Round | Head | Verdict | Findings |
|---|---|---|---|
| 1 | `5106589` | **CHANGES REQUESTED** | F1 S3, F2–F8 S4 |
| 2 | `f0c85ff` | **PASS** | R2-1 S4 (fixed in the `progress.json`-only commit after `f0c85ff`: `approvals` entries) |

## Round 1 dispositions
| ID | Disposition |
|---|---|
| F1 | Fixed: the commands source `scripts/env.sh` (Testcontainers `DOCKER_HOST`), drop `dev-up.sh`, and tee the 50 runs to `evidence/T-M1.14/runs-50.log` |
| F2 | Fixed: the AC2 mutation targets `RequestIds.resolve` or the valve's fallback; the filter never runs for this path |
| F3 | Fixed: trace is T-M1.8 AC2 and api-conventions §5 + §7 |
| F4 | Fixed: the Jackson 3 `JsonMapper` (`tools.jackson.databind.json`), no new dependency |
| F5 | Not changed: `decisions.pendingPO` only accepts `OQ-nn`/`DEC-nnn` IDs (schema); the pending start signal is in `currentTask.entryGate`, the handoff and the prompt |
| F6 | Fixed: `navigator.sendBeacon` added to T-M1.16; dynamic keys and `Reflect.get` accepted as uncatchable (DEC-079) |
| F7 | Fixed: the handoff names both skills and when each applies |
| F8 | Fixed: `## Out of scope (explicit)` is its own heading |

## Round 1 report (`5106589`)

I'm returning the review here rather than writing `evidence/T-M1.14/review/docs.md`, because this review was read-only. The LC should record it.

**DOCS-REVIEW T-M1.14: PR #28, `docs/T-M1.14-packet` @ `5106589`**

**Checks run (read-only)**
- `./scripts/check-docs.sh`: PASS (152 markdown files, `progress.json` valid, sources intact, prompt within limit).
- `next-session-prompt.md` is 3341 chars (limit 4000).
- **Merged state matches develop and GitHub:**
  - PR #25 merged `625c8fc` at head `5c169fb` (2026-10-01T18:33:12Z); PR #26 merged `9a68eb7` at `dc42050` (18:25:14Z); PR #27 still open.
  - CI is 7/7 at both `3ff781c` and `5c169fb`.
  - Run 36905974878 is `backend` on PR #26 with `backend-coverage` at 294289 B.
  - Commits `6c8d1d4`, `3d7803d`, `d55d993` and `42d88f1` all exist.
  - PR #24 and #25 carry the recorded verdict comments, including the restated UX `APPROVED`.
  - The `progress.json` history times now match the commit and merge times in UTC (the old 2026-10-02T09:xx values were in the future).
- **Packet technical claims are correct:**
  - `Ids.newId()` sets the version nibble to `0x7000` and the top variant bits to `10`, so `UUID.version()==7`, `variant()==2`, and the variant nibble is 8–b.
  - The demo ID `01a0e646-0000-7bad-8bad-000000000bad` is a valid v7.
  - `/api/v1/a%2fb` is rejected by Tomcat before any filter runs. The valve uses `RequestIds.resolve`, so `bad<id>` (which fails `SAFE_ID`) gets a new ID.
  - The valve's body has a `Content-Length` and is plain JSON (`evidence/T-M1.8/curl-ac1-ac2.txt:31`), so `RawResponse.body()` parses without de-chunking. Jackson is on the classpath through the Boot starter.
  - In the line-202 sibling test, every `doesNotContain` token contains a non-hex character (`<`, `html`, `%2f`…), so scope 2's grep should come back "none found".
- **G0 content:** goal, trace, scope, out of scope, guardrails, ACs, test plan, evidence, docs, risks, estimate ≤ 0.5 day and commands are all present. The dependency is merged. The scope is test-only and forbids retry, quarantine and `src/main` changes. AC2 explicitly guards against weakening the test.
- **Bookkeeping cross-checks:**
  - DEC-079's S4 list matches QA F-1..F-4 (`qa/T-M1.13`), UX-1..4 and T-M1.15 F1/F2, and backlog T-M1.16 carries them all.
  - The T-M1.13 docs record says it is a reconstruction.
  - T-M1.15 review F3–F7 are addressed.

**Findings**

- **F1 (S3): `docs/tasks/T-M1.14-flaky-request-id-test.md:69-75`. The AC5 50-run command fails as written, and it produces no log.**
  - `ApplicationIntegrationTest` is `@Tag("container")` and uses Testcontainers. Every Bash call is a fresh shell, and `DOCKER_HOST` is unset (there is no `~/.testcontainers.properties`).
  - The loop never runs `source scripts/env.sh`, so it errors on the first run. `gate.sh` sources it; the loop does not. The T-M1.8 packet's commands do source it.
  - `./scripts/dev-up.sh` does not help: it is the compose database, which Testcontainers does not use.
  - The loop's `-q … || break` also writes nothing to a file, but AC5 and the evidence list both require "the 50-run log".
  - Suggested fix:
    `source ~/.sdkman/bin/sdkman-init.sh && source scripts/env.sh && (cd backend && for i in $(seq 1 50); do echo "run $i"; ./mvnw -B -q test -Dtest=ApplicationIntegrationTest || { echo "FAIL run $i"; break; }; done) 2>&1 | tee evidence/T-M1.14/runs-50.log`
    Drop `dev-up.sh` or mark it optional.
- **F2 (S4): `…T-M1.14…md:45-47` (AC2). "Making the valve **or filter** echo the incoming value" points at the wrong place for the filter.**
  - For `/api/v1/a%2fb`, Tomcat rejects the request before any filter runs, so a mutated `RequestIdFilter` cannot fail the new test. An implementer who picks "filter" gets a confusing demo.
  - Suggested fix: "make `RequestIds.resolve` (or the valve's fallback) return the incoming value".
- **F3 (S4): `…T-M1.14…md:11` (Trace). Two trace references are off.**
  - "T-M1.8 AC1" is the `:8081/actuator/env` 404. This test belongs to **AC2** (Tomcat-level rejections, `T-M1.8-backend-follow-ups.md:62`).
  - The valve and Problem Details `requestId` rules are in api-conventions **§5** (`docs/04-backend/api-conventions.md:67-72`). §7 only says every response carries `X-Request-Id`.
  - Suggested fix: "T-M1.8 AC2; api-conventions §5 (Tomcat-level rejections, `requestId`) and §7".
- **F4 (S4): `…T-M1.14…md:35`. Jackson 3 package name is ambiguous.**
  - "`ObjectMapper`/`JsonMapper`" does not say that Boot 4 brings Jackson 3 (`tools.jackson.databind.json.JsonMapper`). Importing `com.fasterxml.jackson.databind` may not resolve, or may pull in the wrong major version.
  - Suggested fix: name the package, or say "the Jackson 3 `JsonMapper` from the Boot test classpath; no new dependency".
- **F5 (S4): `progress.json` `decisions.pendingPO`. The T-M1.14 start signal is missing.**
  - The packet, `currentTask.entryGate`, HANDOFF and the prompt all say the start signal is pending, but `pendingPO` lists only OQ-03..14 and DEC-060.
  - Suggested fix: add `"T-M1.14 start"`, or note why it is left out.
- **F6 (S4): `docs/10-governance/decision-log.md` DEC-079. QA F-3 is only partly dispositioned.**
  - It carries "disable comments, `XMLHttpRequest`/`EventSource`; dynamic keys uncatchable".
  - The report's literal `Reflect.get(window, "fetch")` and `navigator.sendBeacon` are neither deferred nor accepted.
  - Suggested fix: add them to T-M1.16, or accept them explicitly in DEC-079.
- **F7 (S4): `docs/handoff/HANDOFF.md` "Files to read first" vs `next-session-prompt.md` START. The two name different skills.**
  - HANDOFF says the backend-module skill; the prompt says the qa-evaluation skill. The LC runs both roles, so this does not block anything.
  - Suggested fix: list both, or say which skill applies to which step.
- **F8 (S4): `…T-M1.14…md:27-28`. Out of scope is a bullet under Scope, not its own `## Out of scope (explicit)` heading as in the template.**
  - The content is complete, so G0 is met.
  - Suggested fix: optionally split it into its own heading.

I found no S1/S2 issues, no scope creep, no broken links and no conflict with develop. F1 needs fixing before the packet is usable without chat history. F2–F8 can be fixed in the same commit, and the verdicts re-posted for the new head.

DOCS-REVIEW T-M1.14: CHANGES REQUESTED

## Round 2 report (`f0c85ff`)

**DOCS-REVIEW T-M1.14, round 2: PASS.** Head `f0c85ff` fixes F1–F4 and F6–F8, and I accept the F5 disposition. The one new finding (R2-1) is a minor optional suggestion. Same rules as round 1: read-only, so the LC records this in `evidence/T-M1.14/review/docs.md`.

**Checks**
- `./scripts/check-docs.sh` passes (154 markdown files, `progress.json` valid, sources intact, prompt within limit). `next-session-prompt.md` is 3343 chars, under the 4000 limit.
- **Branch catch-up:** `e634a87` merges develop at `ac27fea`. PR #27 is MERGED at 2026-10-01T18:40:45Z, which matches the `progress.json` history entry, HANDOFF and the prompt. Against develop, the branch changes only docs, evidence and `progress.json`. The QA record and spec arrived through the develop merge, not as new changes on this branch.

**Round-1 findings**
- **F1 (S3), fixed.** The commands now source `scripts/env.sh` from the repo root, so Testcontainers gets `DOCKER_HOST`. `dev-up.sh` is gone. The loop writes `run i` and `FAIL run i` markers through `tee` to `evidence/T-M1.14/runs-50.log`, which the evidence list also names. The pipe hides the loop's exit code, but the `FAIL` marker shows a failure in the log, and AC5 is judged from the log.
- **F2, fixed.** AC2's mutation now targets `RequestIds.resolve` or the valve's fallback, and the packet explains why the filter is irrelevant for `/api/v1/a%2fb`. That matches the code: the valve falls back to `RequestIds.resolve(header, ids)` when no request attribute is set.
- **F3, fixed.** The trace now points to T-M1.8 AC2 and api-conventions §5 (lines 67–72) plus §7.
- **F4, fixed.** The packet names `tools.jackson.databind.json.JsonMapper`. `tech-stack.md:40` documents Jackson 3, and `tools.jackson.core:jackson-databind` 3.1.5 is in the local Maven repository.
- **F6, fixed.** DEC-079 and backlog row T-M1.16 now add `navigator.sendBeacon` (as `no-restricted-properties`). Dynamic keys and `Reflect.get` are explicitly accepted. The two documents agree.
- **F7, fixed.** HANDOFF names both skills (backend-module for the implementer brief, qa-evaluation for G3).
- **F8, fixed.** `## Out of scope (explicit)` is now its own heading.
- **F5, accepted.** I agree with your reason. `docs/09-harness/schemas/progress.schema.json:93` only allows `OQ-nn` or `DEC-nnn` in `pendingPO`. The pending start signal is stated in `currentTask.entryGate`, the packet status, HANDOFF and the prompt, so a fresh agent will see it.

**New finding**
- **R2-1 (S4, optional): use the `approvals` array in `progress.json` for the start signal.** The schema (lines 99–100) has an `approvals` array with `what`, `by`, `status`, `at` and `ref`. It was used for earlier PO start signals (T-M1.4, 5, 7 and 8, for example `{"what":"Start T-M1.8 …","by":"PO","status":"approved","ref":"DEC-068"}`).
  - Suggested fix: add `{"what":"Start T-M1.14 (flaky request-ID test)","by":"PO","status":"pending","at":null}`, then set it to approved with the DEC when the PO answers.
  - The T-M1.12, T-M1.13 and T-M1.15 start signals are also missing from that array. This is older drift; backfill it or drop the convention, at the LC's choice.

**Note for the record file**
- `evidence/T-M1.14/review/docs.md` currently ends with the round-1 line `DOCS-REVIEW T-M1.14: CHANGES REQUESTED`. Add round 2 to the table and append this verdict after it, so the file's last verdict is PASS.

DOCS-REVIEW T-M1.14: PASS
