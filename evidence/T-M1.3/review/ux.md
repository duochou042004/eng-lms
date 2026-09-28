# UX review record: T-M1.3 (PR #4)

> Backfilled on 2026-09-28 (T-M1.9 packet, DOCS-REVIEW F20). The review was posted as PR #4 comments by the LC on behalf of two fresh ux-reviewer
> agents (subagents could not write files then); this file copies those comments without changes, so the T-M1.9 packet's sources are in the repo.
> Round 1: https://github.com/duochou042004/eng-lms/pull/4#issuecomment-5832684384 (2026-09-25T12:52:49Z, at `16787bd`).
> Round 2: https://github.com/duochou042004/eng-lms/pull/4#issuecomment-5833053951 (2026-09-25T13:18:23Z, at `f113908`).
> Dispositions: DEC-043 (round 1), DEC-045 (round 2); the deferred items are T-M1.9.

## Round 1

UX-REVIEW T-M1.3: CHANGES REQUESTED

Independent ux-reviewer (fresh context), round 1 at `16787bd`. Recorded verbatim-in-substance by the LC, because subagents cannot write files. It will be committed as `evidence/T-M1.3/review/ux.md` on a non-implementation branch.

**Passed:** vi default and switch/persistence · no horizontal scroll at 320/360/768/1280 · skip link · 2 px focus ring · Enter/Space · hover, pressed, disabled, pending and invalid states · status never shown by colour alone · landmarks and names · tokens only, logical CSS · no §6 anti-patterns except F2.

| ID | Sev | Finding | Fix |
|---|---|---|---|
| F1 | S2 | `--size-control-md` is 40 px, but inputs and primary targets need ≥ 44 px (responsive-standards §3.4/§3.7, accessibility §1.7) | 2.75rem |
| F2 | S2 | The error-boundary title "Something went wrong" is a rejected pattern (design-system §6.9) | "This page couldn't be displayed" / "Không hiển thị được trang này" |
| F3 | S3 | Focus does not move to the h1 on route change, and `document.title` is the same on every route (accessibility §2, WCAG 2.4.2) | `useRouteFocus` + per-route titles |
| F4 | S3 | A lazy route shows a blank page on first load | `HydrateFallback` skeleton |
| F5 | S3 | Language switcher: the selected option looks like the button to press | A segmented `ui/` control (RAC ToggleButtonGroup), selected = accent-subtle + check icon |
| F6 | S3 | The header error state is a block alert inside a `<span>` and too big at 360 px; there's no evidence screenshot | A div wrapper, compact text + quiet retry, and a screenshot |
| F7 | S4 | The 404 and error pages have duplicate headings (a hidden h1 plus a visible h2 or title) | An `EmptyState` level-1 option; a visible h1 on the error page |
| F8 | S4 | Copy polish (vi skip link, tutor empty text, "Saving…", invalid-field error text) | As listed |
| F9 | S4 | A warning alert uses `role=alert`; no 150 ms skeleton delay; no icon on field errors | Warning → status; the rest optional |

**LC disposition:** F1, F2, F4, F6, F7, F8 and F9 (warning role) are fixed in the next commit. F3 and F5 are deferred to **T-M1.9** (DEC-043). The 150 ms delay and the field-error icon are optional and deferred to T-M1.9. A round-2 UX re-review is required.


## Round 2

UX-REVIEW T-M1.3: APPROVED

Round 2 (fresh ux-reviewer) at `f113908`:
- **Verified fixed:** F1 (all controls ≥ 44 px at 320/360/768/1280), F2, F4, F6, F7, F8, F9 (warning role).
- **Deferred, acceptable:** F3, F5 and the optional F9 items (T-M1.9, DEC-043).
- **Regressions:** none (no overflow at any width in any state; the skip link, focus ring and vi/en persistence work).
- **New findings, non-blocking (added to T-M1.9):**
  - N1 (S3): the 404 'go home' link is 20 px tall, below 44.
  - N2 (S4): the home and skip links need a 44 px minimum height.
  - N3 (S4): the `RouteLoading` `<output>` is inline, so the padding is lost.
  - N4 (S4): the error copy mentions a request ID when none is shown.
