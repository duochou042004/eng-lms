export type Role = 'TUTOR' | 'STUDENT'

const HOME: Record<Role, string> = { TUTOR: '/tutor/today', STUDENT: '/student/home' }
const NAMESPACE: Record<Role, string> = { TUTOR: 'tutor', STUDENT: 'student' }

/** The landing route of a role (information-architecture §1, §3). */
export function roleHome(role: Role): string {
  return HOME[role]
}

// After the one decode: the app namespace exactly, or followed by `/`, `?` or `#`.
const APP_PATH = /^\/(tutor|student)(?:[/?#]|$)/
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i

/** A C0 control character or DEL. */
const hasControl = (s: string) => [...s].some((c) => c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f)

/** The structural checks of T18 on one form of the path (raw or decoded). */
function isStructurallySafe(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || hasControl(path)) return false
  const pathPart = path.split(/[?#]/, 1)[0]!
  if (pathPart.includes(':') || /\s/.test(pathPart)) return false
  return !pathPart.split('/').some((segment) => DOT_SEGMENT.test(segment))
}

/**
 * security.md T18: may `path` be used as a sign-in return target? Structural only (no role), so it also serves the
 * 401 redirect and anonymous visits. Accepted only when the path, raw and after exactly one `decodeURIComponent` (a
 * decode error refuses), starts with `/` but not `//` or `/\`, contains no scheme (`:`) or whitespace in the path part, backslash or
 * control character, has no `.` or `..` segment (raw or `%2e`-encoded), and its first segment is `tutor` or `student`.
 */
export function isSafeAppPath(path: string | null | undefined): path is string {
  if (!path) return false
  let decoded: string
  try {
    decoded = decodeURIComponent(path)
  } catch {
    return false
  }
  return isStructurallySafe(path) && isStructurallySafe(decoded) && APP_PATH.test(decoded)
}

/** Where to go after sign-in or a forced password change: a safe `next` inside the role's own namespace, else home. */
export function safeNext(next: string | null | undefined, role: Role): string {
  if (isSafeAppPath(next) && decodeURIComponent(next).split(/[/?#]/)[1] === NAMESPACE[role]) return next
  return roleHome(role)
}

/** `/login`, with `?next=` only when the return path passes `isSafeAppPath`. */
export function loginPath(returnTo: string): string {
  return isSafeAppPath(returnTo) ? `/login?next=${encodeURIComponent(returnTo)}` : '/login'
}

/** `/change-password`, with `?next=` only when it passes `isSafeAppPath`. */
export function changePasswordPath(next: string | null | undefined): string {
  return isSafeAppPath(next) ? `/change-password?next=${encodeURIComponent(next)}` : '/change-password'
}
