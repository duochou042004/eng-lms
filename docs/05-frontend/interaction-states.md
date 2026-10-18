# Interaction and State Standards

> Trace: NFR-UX-03, NFR-OPS-05, SPEC §40. Every data-bound view and every form implements the states below. PRs are rejected if a state is missing
> (UX checklist). Use the provided components (`Skeleton`, `EmptyState`, `InlineAlert`, `SaveIndicator`, `ErrorSummary`, `Toast`).

## 1. Data view states

| State | When | Must show | Must not |
|---|---|---|---|
| **Loading (initial)** | No cached data | A `Skeleton` matching the final layout (same heights), after a 150 ms delay (avoids flashes) | Spinners on full pages; a layout shift when data arrives |
| **Loading (refetch)** | Cached data exists | The data, plus a subtle top progress line in the page header | Clearing the content |
| **Empty (first use)** | No data ever | What this area is for, one primary action, optional example text (never seeded data) | "No data" alone |
| **Empty (filtered)** | Filters exclude everything | "No results for …" + "Clear filters" | The first-use message |
| **Error (recoverable)** | Network or 5xx | An `InlineAlert` in the region (not the whole page): a human message + **Retry**; keeps stale data if present | Raw error text or stack traces; losing user input |
| **Error (not found / 404)** | Missing or not owned | A "This item doesn't exist or isn't available to you" page + a link back | Revealing whether the item exists |
| **Error (forbidden / 403)** | Role mismatch | The forbidden page + a link home | Auto-retry loops |
| **Offline** | `navigator.onLine=false` or a fetch fails with a network error | A global banner "You're offline, changes will be saved when you reconnect" (for autosave areas) | Silent failure |
| **Partial** | Some sections fail (dashboards) | Per-section errors; other sections render | Failing the whole page |
| **Populated** | Data | The content, with a visible primary action | — |

**Implemented (T-M2.12, DEC-116):** *navigation loading*: a client-side navigation (lazy route chunk, loaders) that takes longer than 150 ms
shows `ProgressLine` at the top edge and a polite "Loading the page" status, the current page staying visible and usable (no skeleton swap); a
faster one shows nothing (the first load keeps `RouteLoading`'s skeleton). *Chunk offline*: a route whose code cannot load shows the offline
page (offline, also for any route error while `navigator.onLine` is `false`) or the couldn't-load page (online), each with its own heading,
a primary **Retry** and the start-page link, never an endless busy state; the copy follows the connection while shown; Retry offline keeps the page and announces the message again, online it loads the URL in full. The global
offline banner for autosave areas is still to come (M5).

TanStack Query settings: `retry: 2` for GET (none for 4xx), `staleTime` 30 s by default and 0 for the Review queue and attempts, refetch on window focus
for Today and Home.

## 2. Forms

1. Labels are always visible (never placeholder-only). Required fields are marked "(required)" in text. Optional sections are collapsed rather than hidden.
2. Validation: client (Zod) on blur and on submit; server errors (`errors[]`) are mapped to fields by `field`; unknown field errors go to the `ErrorSummary`.
3. On a failed submit: show the `ErrorSummary` at the top (for forms with > 4 fields) listing the errors as links, and move focus to it. Otherwise focus the first invalid field.
4. Submit button: disabled only while submitting (with a spinner inside and the label "Saving…"); double submit prevented; idempotency key for commands.
5. Success: a toast ("Student created") **and** navigation or an in-place update. Never a success modal. **Exception (T-M2.5, DEC-120 (7)):**
   Add student's success feedback is the credentials card that replaces the form in place, its `h2` "Student created" taking focus (no toast
   until `Toast` ships with T-M2.14); the card shows the one-time temporary password, so it is the confirmation. **T-M2.14:** `Toast`
   ships (§4); Add student keeps the card as its feedback (DEC-120 (7)); Edit profile's Save closes the form, focuses **Edit profile** and
   toasts "Profile saved"; the status actions toast their result (Archive with **Undo**).
6. **Unsaved changes guard** on every form and editor: in-app navigation shows a ConfirmDialog; `beforeunload` for tab closing.
7. **Autosave** (builder, rich text editors, attempts): a debounced save (≤ 1 s for attempts, 10 s for drafts) plus save on blur and on route leave. The
   `SaveIndicator` shows `Saving… / Saved 19:04 / Offline, will retry / Couldn't save, Retry`. A local draft buffer (IndexedDB with a sessionStorage
   fallback) keeps unsent attempt responses until the server acknowledges them (NFR-OPS-05).
8. Conflicts (409 `STALE_VERSION`): a dialog "This was changed elsewhere" with **Reload** (discard mine) or **Copy my text** (for long text), then reload.
   **As built (T-M2.14, `features/students/components/ConflictDialog.tsx` on `ConfirmDialog`):** a stale profile save or status button opens
   it; **Reload** (primary) refetches the student and closes the form; **Cancel** keeps the form as typed; when the note was changed the
   dialog's content slot holds **Copy my note**. A failed **Undo** never opens it (an `InlineAlert` in the Account section instead).
9. Destructive actions: a `ConfirmDialog` that names the object ("Delete folder 'Listening'?"). The consequence is stated ("3 materials will move to
   'Library'"). The danger button repeats the verb ("Delete folder"). Archive needs no confirmation (it is reversible) and shows a toast with **Undo**.

## 3. Feedback timing

| Duration | Feedback |
|---|---|
| < 150 ms | None |
| 150 ms – 1 s | Button spinner / skeleton |
| 1 – 10 s | Skeleton / progress with a label |
| Uploads | Per-file progress bar, cancel, retry |
| > 10 s | Explain and allow leaving (upload continues in the background, with a toast when done) |

## 4. Toasts and alerts

A toast is for **confirmation of success** or for an undoable action. It auto-dismisses after 5 s (pausable; persistent if it contains an action). A toast is
never used for errors that need action (use an `InlineAlert` near the problem). Toasts sit in a `polite` live region, errors in `assertive`.

**Implemented (T-M2.14, `ui/Toast.tsx`, `ui/toastQueue.ts`):** one region in the tutor shell (React Aria's toast; an F6 landmark named
"Notifications"); `toast.success(message, {action?})` returns a key the caller can close. Without an action a toast closes after 5 s, paused
while the pointer is over the region or focus is inside it; with an action (Archive's **Undo**) it stays until closed, its action, a later
status success or reset on that student, or leaving the student's page. Each toast: `CircleCheck` icon, the message (`role="status"`,
polite), the action under it, a **Dismiss** button. At most 3 visible, newest last. Bottom centre below 768 px (width minus 16 px gutters, at
most `--size-reading-max`), bottom end at ≥ 768 px (24rem, `--size-toast`), `--z-toast`, 16 px + safe area from the bottom. While a toast
shows, the region publishes its height as `--toast-stack-size` (and `data-toasts`) on `:root`; the shell's `main` gets that much
`padding-block-end` and `:root` `scroll-padding-block-end`, so no toast hides the focused control or the page end (WCAG 2.2 SC 2.4.11).
Unmounting the shell (any sign-out) clears the queue. Errors stay `InlineAlert`s.
**AC12 (DEC-126):** while a modal dialog or sheet is open the region sits under its overlay (`--z-toast` 150 < `--z-overlay` 200), is
hidden and `inert`, and its timers wait; it returns when the last one closes. A timed toast pushed out of the 3 visible is closed at once
(never shown late); an action toast waits for a place. A toast landing on the focused control scrolls that control clear (the published
height is rounded up to whole pixels). The queue is also cleared when a region mounts. After **Undo**, focus left inside the region (or
on `body`) moves to the Account `h2`. With an action, the icon sits on the message's first line and the action under the message.

## 5. Attempt-specific states (student)

Not started (instructions, time limit, attempts left, Start) · In progress (timer with a 5-minute and 1-minute warning, announced politely) · Saving / offline ·
Time up (auto-submit message) · Submitted (auto-graded: score if the policy allows; otherwise "waiting for review") · Closed (past due without late allowance) ·
Excused or Withdrawn (explanation).
