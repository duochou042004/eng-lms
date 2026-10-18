import { useEffect, useSyncExternalStore } from 'react'

/**
 * How many modal overlays (`ConfirmDialog`, `Sheet`) are open (T-M2.14 AC12 (a)): the toast region sits under a modal
 * (hidden, inert, timers paused) and comes back when the last one closes.
 */
let open = 0
const listeners = new Set<() => void>()
const notify = () => listeners.forEach((listener) => listener())

/** Counts this overlay as open while `isOpen`. */
export function useModalOpen(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return
    open += 1
    notify()
    return () => {
      open -= 1
      notify()
    }
  }, [isOpen])
}

/** Whether any modal overlay is open. */
export function useAnyModalOpen() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => open > 0,
  )
}
