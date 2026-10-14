/**
 * Cross-tab sign-in/out (T-M2.12 scope 4, security.md T19): a same-origin `BroadcastChannel` carrying only
 * `{ type }`, never a user ID, name, role or anything else. Posting and listening share one channel instance, so a tab
 * never receives its own messages. Where `BroadcastChannel` does not exist, nothing happens (no fallback; every browser
 * of A-014 / NFR-COMPAT-01 has it).
 */
export type AuthMessage = { type: 'signed-in' } | { type: 'signed-out' }

export const AUTH_CHANNEL = 'englms-auth'

let channel: BroadcastChannel | null = null

function open() {
  if (!channel && typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel(AUTH_CHANNEL)
  return channel
}

/** Exactly `{ type: 'signed-in' }` or `{ type: 'signed-out' }`; anything else is ignored. */
function isAuthMessage(data: unknown): data is AuthMessage {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false
  const keys = Object.keys(data)
  const type = (data as { type?: unknown }).type
  return keys.length === 1 && (type === 'signed-in' || type === 'signed-out')
}

/** Tells the other tabs of this browser that this tab signed in or out. */
export function postAuthMessage(type: AuthMessage['type']) {
  open()?.postMessage({ type })
}

/** Calls `listener` for each valid message from another tab. The unsubscribe closes the channel. */
export function onAuthMessage(listener: (message: AuthMessage) => void) {
  const current = open()
  if (!current) return () => {}
  const handle = (event: MessageEvent) => {
    if (isAuthMessage(event.data)) listener({ type: event.data.type } as AuthMessage)
  }
  current.addEventListener('message', handle)
  return () => {
    current.removeEventListener('message', handle)
    if (channel === current) {
      current.close()
      channel = null
    }
  }
}
