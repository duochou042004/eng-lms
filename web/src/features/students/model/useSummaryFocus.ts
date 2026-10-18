import { useEffect, useRef, useState, type RefObject } from 'react'

/**
 * Focuses the error summary once per failed submit (interaction-states §2.3): call the returned function on the failure; the
 * summary takes focus when it has entries.
 */
export function useSummaryFocus(ref: RefObject<HTMLElement | null>, hasSummary: boolean) {
  const [requested, setRequested] = useState(0)
  const focused = useRef(0)
  useEffect(() => {
    if (hasSummary && requested > focused.current) {
      focused.current = requested
      ref.current?.focus()
    }
  }, [ref, requested, hasSummary])
  return () => setRequested((n) => n + 1)
}
