# T-M1.5 AC3 — SPA under the CSP in a browser

Built-in Chromium browser pane, against the running image (`podman run --read-only --tmpfs /tmp --network host --env-file .env englms:dev`), 2026-09-25.

## Round 1 (image from `2d3d6e1`): FAIL, 5 CSP violations
Visiting `/`, `/tutor` and `/student/x`, the console showed, 5 times:

```
[error] Applying inline style violates the following Content Security Policy directive 'style-src 'self''. Either the 'unsafe-inline' keyword,
a hash ('sha256-38RhXrc7EdReTKsOm23ZPOCUgniTUUcjky8QOOrQx6o='), or a nonce ('nonce-...') is required to enable inline execution. The action has been blocked.
```

Cause: the hash is that of the `<style id="react-aria-pressable-style">` element that React Aria's `usePress`
(react-aria 3.52.1, `dist/private/interactions/usePress.mjs`) injects into `<head>`. The `style="gap: …"` attributes set by React through the CSSOM
are allowed and applied (checked: the `Stack` div had its gap). The injection is skipped when `document.getElementById('react-aria-pressable-style')`
already exists (and when `NODE_ENV === 'test'`).

## Fix (DEC-052), no change to the CSP
- `web/index.html`: `<template id="react-aria-pressable-style"></template>` in `<head>` (inert element; React Aria sees the id and does not inject).
- `web/src/ui/global.css`: the same rule React Aria would inject, `:where([data-react-aria-pressable]) { touch-action: pan-x pan-y pinch-zoom; }`
  (zero specificity, like its anonymous layer). `web/src/ui/csp.test.tsx` pins both halves.

## Round 2 (image with the fix): PASS, no console messages
Fresh tab. Visited `/` (landing), `/tutor`, `/student/x` and `/does-not-exist` (the SPA's own not-found page), then on `/tutor` pressed "English":

```json
{ "heading": "Tutor workspace", "lang": "en", "marker": "TEMPLATE", "styles": 0, "touchAction": "manipulation" }
```

- `styles: 0`: no `<style>` element was injected; `touchAction` is Chrome's computed form of `pan-x pan-y pinch-zoom`; the language switch works.
- `read_console_messages` → **"No console logs."** (no CSP violations, no errors) across all of the above.
