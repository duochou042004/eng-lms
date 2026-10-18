import { UNSTABLE_ToastQueue as AriaToastQueue } from 'react-aria-components'

// shortcut: React Aria's toast is UNSTABLE_-prefixed; it is wrapped in toastQueue.ts and Toast.tsx only, so an API change
// touches these two files alone.

export interface ToastAction {
  /** The action's verb ("Undo"). */
  label: string
  onAction: () => void
}

export interface ToastValue {
  message: string
  action?: ToastAction
}

/** How long a toast without an action stays (interaction-states §4); paused while hovered or focused (React Aria). */
export const TOAST_TIMEOUT_MS = 5000
const MAX_VISIBLE = 3
/** The CSS variable the region publishes on `:root` while it holds a toast (its height), for the shell's padding. */
export const TOAST_STACK_VAR = '--toast-stack-size'

export const queue = new AriaToastQueue<ToastValue>({ maxVisibleToasts: MAX_VISIBLE })

/**
 * The toast queue (design-system §3, interaction-states §4): success confirmations and undoable actions only, never
 * errors. `success` returns the toast's key; a toast with an action stays until it is closed (by the user, its caller
 * or `clear`), one without closes after 5 s.
 */
export const toast = {
  success(message: string, options: { action?: ToastAction } = {}): string {
    return queue.add({ message, action: options.action }, options.action ? {} : { timeout: TOAST_TIMEOUT_MS })
  },
  close(key: string) {
    queue.close(key)
  },
  clear() {
    queue.clear()
  },
}
