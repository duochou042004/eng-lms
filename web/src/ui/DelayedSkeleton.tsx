import { useEffect, useState, type ReactNode } from 'react'
import styles from './DelayedSkeleton.module.css'

/** interaction-states §1: a skeleton appears only after 150 ms, so fast loads don't flash. */
export const SKELETON_DELAY_MS = 150

export interface DelayedSkeletonProps {
  /** The `Skeleton`s to reveal. */
  children: ReactNode
  delayMs?: number
}

/**
 * The shared skeleton delay (design-system §3). The skeletons are laid out from the first frame but stay invisible
 * (`visibility: hidden`) until the delay has passed, so the loading region keeps its final size: nothing shifts when the
 * skeletons or the data appear. The wrapper itself generates no box (`display: contents`). The owning region carries
 * `aria-busy` and its label from 0 ms.
 */
export function DelayedSkeleton({ children, delayMs = SKELETON_DELAY_MS }: DelayedSkeletonProps) {
  const [shown, setShown] = useState(delayMs <= 0)
  useEffect(() => {
    if (shown) return
    const timer = setTimeout(() => setShown(true), delayMs)
    return () => clearTimeout(timer)
  }, [shown, delayMs])
  return (
    <span
      className={styles.delayed}
      data-shown={shown || undefined}
      // Inline (not a class) so the hidden state is testable in jsdom; CSSOM styles are allowed by the CSP.
      style={shown ? undefined : { visibility: 'hidden' }}
    >
      {children}
    </span>
  )
}
