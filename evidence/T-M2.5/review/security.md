# SEC-REVIEW T-M2.5 (PR #94; rounds 1–2; final APPROVED at `cec675b`)

Fresh security-reviewer subagent (resumed for round 2); recorded by the LC from the reviewer's returned text (the reviewer writes no files).

| Round | Head | Verdict | Findings → outcome |
|---|---|---|---|
| 1 | `24dda26` | APPROVED | S4-1 (https with userinfo), S4-2 (email check), S4-3 (forced `/change-password` blocked by the dirty-form dialog), S4-4 (bfcache restore shows the card) → AC12 (j), (k), (l), (m) (DEC-122) |
| 2 | `cec675b` | **APPROVED** | S4-1..S4-4 fixed; new S4-5 (the guard trusts `state.forced` for any target; input loss only) → T-M2.14 (DEC-123) |


## Round 2

SEC-REVIEW T-M2.5: APPROVED

All four round-1 findings are fixed correctly on cec675b. I found one new low-severity (S4) hardening point, which does not block merge. I posted no PR comment and wrote no files to the repository. The working tree is clean after the build.

**Round-1 findings**

| ID | Status | Location | Notes |
|---|---|---|---|
| S4-1 | Fixed | `web/src/features/students/model/contactHref.ts` (handle branch) | Links with a user name or password (`!url.username && !url.password`) are now refused. `contactHref.test.ts:59-60` covers `https://zalo.me@evil.example/` and `https://user:pw@evil.example/`, which now render as plain text with a Copy button. |
| S4-2 | Fixed | `contactHref.ts` (email branch) | Addresses with `:`, `/`, `<`, `>`, `"` or `\` are now refused, and the domain must contain a dot. Covered by tests (`a/b@c.d`, `<a@b.c>`). |
| S4-3 | Fixed | `web/src/app/guards.ts:127`, `AddStudentForm.tsx:131-136` | The forced redirect to `/change-password` now carries `state: { forced: true }`, and the unsaved-changes guard lets it through. Tested at `AddStudentPage.test.tsx:421`. |
| S4-4 | Fixed | `AddStudentPage.tsx` (`pagehide` + `flushSync(() => setCreated(null))`) | Leaving the page drops the card before the browser freezes it, so pressing Back shows an empty form. Tested at `AddStudentPage.test.tsx:520`. |

**Can `state.forced` be abused?** No privilege comes from it. A URL or an external page cannot set router history state; only app code can. `ChangePasswordPage.tsx:44` decides whether the change is forced from the session (`mustChangePassword`), not from the navigation state. So the most a crafted navigation can do is skip the "discard unsaved changes?" dialog. That dialog only protects the user from losing input; it is not a security control.

**New finding**

| ID | Sev | Location | Issue | Suggested fix |
|---|---|---|---|---|
| S4-5 | S4 | `web/src/features/students/components/AddStudentForm.tsx:136` | The guard trusts `forced === true` for any target path, not only `/change-password`. If later code navigates somewhere else with that state by mistake, the dirty form is dropped without asking. This loses user input but exposes nothing. | Add `nextLocation.pathname === '/change-password'` to that condition. Optional. |

**Re-checked on this head**
- **Temporary password**: still kept only in the page's state. The mutation still has `gcTime: 0` and is reset after the create. There is still no `console` output, browser storage, URL or history state involved, and no `dangerouslySetInnerHTML` or `innerHTML` in `features/students` or `ui/`. Change (f) removes the name from the copy message, which is still one plain i18n string.
- **Links built from student data**: still only the two `href`s in `ContactValue.tsx`, both from `contactHref`. The new `withIcon` option only adds a decorative icon with `aria-hidden`, and `target="_blank" rel="noopener noreferrer"` is unchanged.
- **Email line breaks (u)**: `EmailText` and `PhoneText` in `StudentsListPage.tsx:308-334` split the value into React text pieces separated by `<wbr />` or `nowrap` spans. No HTML comes from student data. The list shows no link or copy action there, and `<wbr>` contains no text, so a copied selection is still the plain address. `lineBreaks.ts` is pure string splitting.
- **List layout (q)–(t)**: the username is shown as escaped text, and the workspace link still uses the student's UUID id. The new `<col style>` widths are fixed values, not student data; React applies them through the DOM, which the CSP `style-src 'self'` allows.
- **Evidence screenshots**: I looked at all six regenerated `credentials-card-{en,vi}.png` files in `evidence/T-M2.5/impl/{laptop,phone-small,tablet}`, and the password is masked in each. `add-filled-vi.png` shows no password, and the masking in `e2e/tests/students.spec.ts:21` is unchanged. Searching the evidence text files found no filled-in "Temporary password:" lines.
- **Dependencies, CSP, secrets**: `package.json`, the lockfile and `backend/` are unchanged, and the diff contains no `.env`, `.data/**` or key files.
- **Tests**: `pnpm vitest run src/features/students src/ui src/app` passed (44 files, 445 tests), and `pnpm build` and `pnpm budget` passed (student 180.6 KB, tutor 180.8 KB).

**What I did not check**: I did not run the full gate or e2e suite, or look at commits between 24dda26 and cec675b one by one (only the final diff and current files). I did not view the regenerated `screenshots/` PNGs outside the credentials cards and the add form, and I did not test `pagehide` or the back/forward cache in a real browser (only the unit test).

## Round 1

SEC-REVIEW T-M2.5: APPROVED

I found no S1, S2 or S3 issues in PR #94 at 24dda26. There are four low-severity (S4) findings, none of which blocks merge. I posted no PR comment and wrote no files to the repository. The working tree is still clean after the build.

| ID | Sev | Location | Issue | Suggested fix |
|---|---|---|---|---|
| S4-1 | S4 | `web/src/features/students/model/contactHref.ts:28-29` | A handle `https://zalo.me@evil.example/` parses with hostname `evil.example` and username `zalo.me`, so it shows as an "Open Zalo link" link that goes to evil.example. `https://user:pw@evil.example/` behaves the same way. The visible link text is the raw value, the link opens with `noopener noreferrer`, and the tutor types the value themselves today. If students can edit their own contacts later, this becomes a way to phish the tutor, so I rate it S4 now and it should be fixed before then. | Also return `null` when `url.username !== '' \|\| url.password !== ''`, and add both forms to `contactHref.test.ts`. |
| S4-2 | S4 | `web/src/features/students/model/contactHref.ts:22-24` | The email check accepts `:`, `/`, `&`, `<`, `>`, `"` and so on in the local part (for example `a/b:c@d` becomes `mailto:a/b:c@d`). Because `?`, `#`, `%`, `,`, `;`, whitespace and control characters are rejected, no header injection or second recipient is possible. The worst case is a mail client opening with a malformed address. | Optionally restrict to `^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$` and also reject `:`, `/`, `<`, `>`, `"`, `\`. Cosmetic only. |
| S4-3 | S4 | `web/src/features/students/components/AddStudentForm.tsx:130-135`, together with `web/src/app/guards.ts` (the forced-change branch calls `router.navigate('/change-password')`) | The guard only lets `/login` and `/forbidden` through. If the tutor is forced to change password (for example an operator reset) while the form has unsaved changes, the redirect is blocked by the "Discard this student?" dialog. "Keep editing" keeps a page open whose API calls all fail. The server still enforces the change, so nothing is exposed. The packet deliberately blocks the user-chosen "Change password" link, but not a forced one. | Let `/change-password` through when it is not a user action (for example a router state flag set by the auth reaction), or record it as a known gap in a DEC. |
| S4-4 | S4 (informational) | `web/src/features/students/routes/AddStudentPage.tsx:121` | If the tutor leaves to another site in the same tab and presses Back, the browser can restore the old page from its back/forward cache with the credentials card and password still showing. The existing `pageshow` re-check only redirects if the session changed, and the person viewing is the same signed-in tutor, so this is acceptable for now. | Optional: clear `created` when the page is hidden (a `pagehide` listener), or send `Cache-Control: no-store` for the app page. |

**What I checked**
1. **Temporary password**
   - The create mutation has `gcTime: 0` and is reset right after the result moves into the page's state.
   - Nothing is copied into any query, the URL, history state or browser storage.
   - There is no `console` output anywhere in `features/students`, and the clipboard error path logs nothing.
   - The message to copy is built with a plain i18n string, no HTML.
   - Leaving the page or pressing "Add another student" drops the state. A sign-out, whether in this tab, from another tab, or from an expired session, goes to `/login`, which the guard lets through.
   - I looked at all six `credentials-card-*` screenshots under `evidence/T-M2.5/impl/{laptop,phone-small,tablet}`. The password is masked in each. Those files only entered git history after the masking commit fa7534f, so no earlier commit holds an unmasked copy.
   - I searched the logs, records and markdown under `evidence/T-M2.5/` and found no password values.
2. **Links built from student data**
   - The two `href`s in `ContactValue.tsx` are the only ones built from student data, and both come from `contactHref`.
   - Phone links keep only digits and `+`, and https links use `target="_blank" rel="noopener noreferrer"`.
   - The "Back to students" link passes the history-state value through `URLSearchParams` and only ever points at `/tutor/students?...`.
3. **Student-entered text**: there is no `dangerouslySetInnerHTML` or `innerHTML`. Names, the note, handles and labels all render as escaped React text.
4. **Unsaved-changes guard**: it matches the packet's rule. Session-expiry redirects go to `/login?next=…`, which the guard lets through.
5. **Route and bundle isolation**
   - The Students routes sit under the role-guarded `/tutor` route, and `guards.test.tsx:23` checks that a student is sent to `/forbidden`.
   - The bundle budget now fails if any `src/features/students/` module appears in the student's or tutor's first-visit chunks, and `pnpm budget` passes (student 180.5 KB, tutor 180.7 KB).
6. **URL parameters**: `page` must be 1 to 12 digits and is clamped. `sort` only accepts the two known values. Control characters are removed from `q` and it is trimmed. None of these are rendered as HTML.
7. **Dependencies, CSP, secrets**: `package.json` and the lockfile are unchanged, there are no backend or CSP changes (`SecurityHeaders.java` untouched), and no `.env`, `.data/**` or key files are in the diff.

**Tests run**: `pnpm vitest run src/features/students src/ui` passed (32 files, 220 tests), then `pnpm build` and `pnpm budget` passed.

**What I did not check**: I did not run the full `./scripts/gate.sh`, `mvnw verify` or the e2e suite (the backend is unchanged). I did not read the `/dev/ui` page changes beyond confirming the budget script keeps them out of production. I did not look at the `screenshots/` images other than the credentials cards (none of them show the card), and I did not test clipboard behaviour in a real browser.
