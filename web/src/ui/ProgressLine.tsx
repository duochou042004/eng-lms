import styles from './ProgressLine.module.css'

/**
 * A thin indeterminate progress line at the top edge of the viewport (T-M2.12, design-system §3): the page under it
 * stays visible and usable (fixed, no layout box, no pointer events). Decorative: hidden from the accessibility tree
 * and never focusable; the owner announces the state in its own status region. Reduced motion: a static line.
 */
export function ProgressLine() {
  return (
    <div className={styles.line} aria-hidden="true" data-testid="progress-line">
      <div className={styles.bar} />
    </div>
  )
}
