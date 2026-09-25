# AC5 / AC9: live checks (2026-09-25, Vite dev server + T-M1.2 backend jar + podman postgres:18)

The backend ran with `ENGLMS_META_DISPLAY_NAME="Lớp tiếng Anh cô Lan"` (the Spring relaxed binding of `englms.meta.display-name`), so `displayName` differs from the app name.

| Check | Result |
|---|---|
| Horizontal overflow (`scrollWidth - innerWidth`) at **320 px** on `/`, `/tutor`, `/student`, `/dev/ui`, `/xyz` | `0` for all 5 (NFR-A11Y-03 reflow) |
| Horizontal overflow at 375 px (`/tutor`) and 1280 px (`/student`) | `0` |
| Keyboard: 2 × Tab on `/tutor` at 320 px | focus on the "Eng-LMS" home link (after the skip link), `outline: solid 2px rgb(47, 93, 140)` (= `--color-focus`) |
| Default language | `<html lang="vi">`, h1 "Không gian gia sư" |
| Switch to English, then a full page load of `/student` | `lang=en`, `localStorage["englms.locale"]="en"`, h1 "Student home", `aria-pressed`: Tiếng Việt=false, English=true |

Screenshots (headless Chromium `--window-size`, Vietnamese default): `screenshots/{landing,tutor,student,notfound}-{phone-small,tablet,laptop}.png`
at 360×740, 768×1024 and 1280×800.
