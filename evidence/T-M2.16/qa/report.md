# QA Report: T-M2.16, a username change bumps the student version
Verdict: **PASS** · Build: code head `2c71ec3` (branch head `2b4a914`, PR #215) · Date: 2026-11-21 · Evaluator: fresh qa-evaluator subagent (tier M, QA only: no UI change, so the UX checklist does not apply). Recorded by the LC from the evaluator's returned text (L-06).

## Environment
- Checkout `/home/deb/App_sources/eng-lms` on `fix/T-M2.16-username-version`; `./scripts/dev-up.sh`, then `scripts/e2e-run.sh --project=laptop` with a non-matching grep to build the jar, recreate `englms_e2e` and run the global setup; the same packaged jar started on :8080/:8081 against `englms_e2e`. The PO's dev database was never touched.
- API checks: a Python `requests` client (scratchpad) with two tutor sessions and the CSRF handshake; rows read back from `app.audit_event`, `app.student`, `app.user_account` in `englms_e2e`.
- Browser: headless Chromium (qa/'s pinned Playwright) at 1280×800, two tabs of one tutor session (locale vi).
- App stopped at the end; `backend/target/e2e-cwd` removed; `git status --short` clean; no gate run needed.

## AC results
| AC | Scenario(s) | Result | Evidence |
|---|---|---|---|
| AC1 | v0; session 1 `{version:0, username:a.new}`, then session 2 `{version:0, username:b.new}` | PASS | 200 v1, `updatedAt` unchanged; second 409 `STALE_VERSION`; read back `a.new`, account version 1, 1 `USERNAME_CHANGED` row |
| AC2 | same username with spaces; equal-values profile PATCH; case-only rename (`qa2-x` → `QA2-x`) | PASS | same name: 200 v0, `updatedAt` unchanged, 0 audit; equal values: 200 v0, row unchanged; case-only: 200 v1, `QA2-…` stored, `updatedAt` unchanged, 1 audit; a case-only rename from the old v0 afterwards: 409 |
| AC3 | `{version:0, note:"x", username:c.new}` | PASS | 200 v1 (not 2), note x, `updatedAt` changed, 1 audit; rename + equal profile values → v1, `updatedAt` unchanged; rename + four changed fields from v1 → v2, one audit |
| AC4 | 20 rounds over HTTP, two sessions, a barrier, fresh students, two different username-only PATCHes from v0 | PASS | 20/20: exactly 200 + 409 `STALE_VERSION`; final username = the 200's; v1; one audit per round. `StudentUsernameRaceTest` run 20 times locally: 20/20 green (~25 s each) |
| AC5 | mutation runs | not re-run (white-box) | summary; LC ruling 2 binding |
| AC6 | taken username (exact, case-different), with/without a profile field; the renamed student's session | PASS | 409 `USERNAME_TAKEN`, `errors[0].field = username`; row, account, audit unchanged; a signed-in student kept a valid session through 5 renames, `/auth/session` showed the new username |
| AC7 | records | spot-checked | api-catalog row per DEC-187; web fake and comment not reviewed in depth |
| AC8 | gate / CI | not re-run | gate PASS on `2c71ec3` per the summary; CI is the LC's |

Negative inputs (nothing written, read back unchanged): invalid usernames (`a b`, empty, 200 characters, `Ünï`, `a@b`) → 422; rename + invalid email → 422 `INVALID_FORMAT` (email), rename not applied; future version v+5 → 409 `STALE_VERSION`; version -1 → 422 `INVALID_VALUE`; no version → 422 `REQUIRED`; username null → 422 `REQUIRED`.

## Exploratory charter (~25 min)
- Rename back and forth (`sq2` → `sq` → `SQ` → `sq` → `sq3`): versions 1–5, 5 audit rows; a status change with the returned v5 → 200 v6; a stale status change → 409.
- Password reset after a rename: 200, version stays 6 (unchanged, as specified); a rename with v6 afterwards → 200 v7.
- An identical PATCH repeated: old version → 409; returned version → 200, no change.
- Races, 20 rounds each over HTTP from v0: username-only vs profile-only 20/20 200 + 409 (v1, audit matches the winner); rename vs status PAUSED 20/20 200 + 409 (only the winner kept); rename + note vs rename + note 20/20 200 + 409 (winner's username and note, v1, 1 audit); rename vs password reset: both 200 every time, v1, rename kept (expected: no conflict).
- Same-username race (accepted, out of scope): this run gave 200 + 409, one of the two accepted outcomes.
- No 500s across ~760 requests; no ERROR lines; the only WARN is the existing startup `forward-headers-strategy` notice.
- Browser, two tabs at 1280 (screenshots local, not committed): both tabs opened "Sửa hồ sơ"; tab 1 renamed to `tab1-…` (PATCH 200); tab 2 renamed to `tab2-…` (PATCH 409) → modal "Đã có thay đổi ở nơi khác" with "Tải lại" / "Huỷ" (`t2-conflict.png`); Reload closed the form and showed `tab1-…` in the header and the username row, `tab2-…` nowhere (`t2-reloaded.png`). Single tab: rename, "Tạm nghỉ", rename → PATCH 200 v1, status 200 v2, PATCH 200 v3, no conflict dialog (the client sends each returned version).

## Findings
None (no S1–S4, no SCOPE). Not raised: the conflict dialog's initial focus on "Huỷ" is T-M2.14 behaviour, unchanged here.

## Accessibility
No UI change, no axe run; the conflict dialog is announced as a dialog and opens with focus on a button.

## Isolation and privacy
A signed-in STUDENT calling GET/PATCH `/tutor/students/{A}` and PATCH `/tutor/students/{B}` (own record): 403 each, nothing changed; no `SECRET-` marker in student responses (`SECRET-QA-note` planted in A's note); no new endpoint; student DTO unchanged.

## Scope
`git diff --stat 38fa45d..2b4a914` (read after the verdict draft): only the Design-notes files plus the `StudentVersionIncrement`/`Impl` fragment (LC ruling 1), tests, the api-catalog row and evidence. No OpenAPI, migration, identity, UI or i18n change.

## Could not check
AC5 mutations (white-box, LC ruling 2); "same clock instant" only approximated black-box (real clock moves; covered by `updatedAt`-unchanged checks); the en UI (tutor locale vi; en key `conflict.title` exists); 360/768 (packet: 1280 only); AC8 CI (LC).

## Re-test log
None (first round). Wall-clock ~18 min.

QA-VERDICT T-M2.16: PASS
