import { cx } from './cx'
import styles from './Skeleton.module.css'

export interface SkeletonProps {
  /** `text` matches a line of body text; `block` fills the given size. */
  shape?: 'text' | 'block' | 'circle'
  inlineSize?: string
  blockSize?: string
}

/**
 * Shape-matched loading placeholder. It is decorative: the loading region sets `aria-busy` and an accessible label.
 */
export function Skeleton({ shape = 'text', inlineSize, blockSize }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      data-testid="skeleton"
      className={cx(styles.skeleton, styles[shape])}
      style={{ inlineSize, blockSize }}
    />
  )
}
